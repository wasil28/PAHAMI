"use client";

import { useCallback, useEffect, useState } from "react";
import type { KuotaTanyaAi, PesanChat } from "@/lib/chat/tipe";
import { ambilRiwayat } from "./api";

export type StatusMuat = "memuat" | "gagal" | "siap";

/** Pesan di layar; `isBelumTersimpan` = jawaban tampil tetapi fn_simpan_chat gagal. */
export type PesanTampil = PesanChat & { isBelumTersimpan?: boolean };

/** Riwayat per dokumen (BR-19) + kuota header (BR-17). Halaman lama dimuat lewat kursor. */
export function useRiwayatChat(dokumenId: number) {
  const [pesan, setPesan] = useState<PesanTampil[]>([]);
  const [status, setStatus] = useState<StatusMuat>("memuat");
  const [adaSebelumnya, setAdaSebelumnya] = useState(false);
  const [memuatLama, setMemuatLama] = useState(false);
  const [galatLama, setGalatLama] = useState(false);
  const [kuota, setKuota] = useState<KuotaTanyaAi | null>(null);
  const [versi, setVersi] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    ambilRiwayat(dokumenId, undefined, ac.signal)
      .then((h) => {
        setPesan(h.pesan);
        setAdaSebelumnya(h.adaSebelumnya);
        setKuota(h.kuota);
        setStatus("siap");
      })
      .catch(() => {
        if (!ac.signal.aborted) setStatus("gagal");
      });
    return () => ac.abort();
  }, [dokumenId, versi]);

  const muatUlang = useCallback(() => {
    setStatus("memuat");
    setVersi((v) => v + 1);
  }, []);

  const muatSebelumnya = useCallback(async () => {
    const teratas = pesan.find((p) => p.id > 0);
    if (!teratas || memuatLama) return;
    setMemuatLama(true);
    setGalatLama(false);
    try {
      const h = await ambilRiwayat(dokumenId, { sebelum: teratas.createdAt, sebelumId: teratas.id });
      setPesan((lama) => {
        const ada = new Set(lama.map((p) => p.id));
        return [...h.pesan.filter((p) => !ada.has(p.id)), ...lama];
      });
      setAdaSebelumnya(h.adaSebelumnya);
    } catch {
      setGalatLama(true);
    } finally {
      setMemuatLama(false);
    }
  }, [dokumenId, memuatLama, pesan]);

  // K-16: kuota habis aktif lagi setelah 00.00 WIB — periksa ulang saat panel/tab kembali difokus.
  useEffect(() => {
    if (!kuota || kuota.sisa > 0) return;
    const periksa = () => {
      if (document.visibilityState !== "visible" || Date.now() < Date.parse(kuota.resetAt)) return;
      ambilRiwayat(dokumenId)
        .then((h) => setKuota(h.kuota))
        .catch(() => undefined);
    };
    window.addEventListener("focus", periksa);
    document.addEventListener("visibilitychange", periksa);
    return () => {
      window.removeEventListener("focus", periksa);
      document.removeEventListener("visibilitychange", periksa);
    };
  }, [dokumenId, kuota]);

  return { pesan, setPesan, status, adaSebelumnya, memuatLama, galatLama, kuota, setKuota, muatUlang, muatSebelumnya };
}
