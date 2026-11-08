"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KuotaTanyaAi, MetaJawaban, PesanChat } from "@/lib/chat/tipe";
import { pertanyaanValid } from "@/lib/validasi";
import { kirimPertanyaan } from "./api";
import { TEKS_TANYA } from "./teks";
import { useRiwayatChat, type PesanTampil } from "./use-riwayat-chat";

/** Pertanyaan yang sedang dijawab: menunggu (teks kosong) lalu streaming. */
export interface JawabanAktif {
  pertanyaan: string;
  teks: string;
  createdAt: string;
}

/** Pertanyaan yang gagal (MSG-C04 dll.) — ditampilkan "Belum terkirim" + Coba lagi (K-15). */
export interface GalatKirim {
  pertanyaan: string;
  pesan: string;
}

let idLokal = 0;
/** id negatif untuk pesan yang belum punya id server (mis. gagal simpan / koneksi putus). */
const buatIdLokal = () => --idLokal;

function kurangiKuota(k: KuotaTanyaAi | null): KuotaTanyaAi | null {
  return k ? { ...k, terpakai: k.terpakai + 1, sisa: Math.max(0, k.sisa - 1) } : k;
}

export function useTanyaAI(dokumenId: number, topikId: number) {
  const riwayat = useRiwayatChat(dokumenId);
  const { setPesan, setKuota } = riwayat;
  const [input, setInput] = useState("");
  const [aktif, setAktif] = useState<JawabanAktif | null>(null);
  const [galat, setGalat] = useState<GalatKirim | null>(null);
  const [galatInput, setGalatInput] = useState<string | null>(null);
  const [pengumuman, setPengumuman] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  /** Tambahkan pasangan tanya-jawab ke riwayat setelah jawaban selesai/terputus. */
  const tambahPasangan = useCallback(
    (j: JawabanAktif, teks: string, meta: MetaJawaban | null, isTerputus: boolean) => {
      const createdAt = meta?.createdAt ?? new Date().toISOString();
      const dasar = { topikId, createdAt, isTidakDitemukan: false, isTerputus: false, rujukan: [] };
      const user: PesanChat = { ...dasar, id: meta?.chatUserId ?? buatIdLokal(), peran: "user", isi: j.pertanyaan, createdAt: j.createdAt };
      const ai: PesanTampil = {
        ...dasar,
        id: meta?.chatAiId ?? buatIdLokal(),
        peran: "ai",
        isi: teks,
        isTidakDitemukan: meta?.isTidakDitemukan ?? false,
        isTerputus: meta?.isTerputus ?? isTerputus,
        rujukan: meta?.rujukan ?? [],
        isBelumTersimpan: meta?.status === "gagal_simpan",
      };
      setPesan((lama) => [...lama, user, ai]);
    },
    [setPesan, topikId],
  );

  const kirim = useCallback(
    async (teksMentah: string) => {
      const pertanyaan = teksMentah.trim();
      if (aktif || (riwayat.kuota && riwayat.kuota.sisa <= 0)) return;
      if (!pertanyaanValid(pertanyaan)) return; // BR-18: tombol kirim nonaktif, tanpa pesan untuk input kosong
      const j: JawabanAktif = { pertanyaan, teks: "", createdAt: new Date().toISOString() };
      setAktif(j);
      setGalat(null);
      setGalatInput(null);
      setInput("");
      setPengumuman(TEKS_TANYA.pertanyaanTerkirim);

      const ac = new AbortController();
      abortRef.current = ac;
      const hasil = await kirimPertanyaan(dokumenId, { pertanyaan, topikId }, ac.signal, (teks) =>
        setAktif((a) => (a ? { ...a, teks } : a)),
      );
      abortRef.current = null;
      setAktif(null);

      if (hasil.jenis === "galat") {
        setInput(pertanyaan); // pertanyaan kembali ke kotak input (S-08, L-E1)
        if (hasil.status === 429) {
          setKuota((k) => hasil.kuota ?? (k ? { ...k, sisa: 0, terpakai: k.maks } : k));
          return;
        }
        if (hasil.status === 400) {
          setGalatInput(hasil.pesan);
          return;
        }
        setGalat({ pertanyaan, pesan: hasil.pesan });
        return;
      }
      if (!hasil.teks.trim()) {
        // Dibatalkan sebelum token pertama: tidak tersimpan & tidak mengurangi kuota.
        setInput(pertanyaan);
        return;
      }
      if (hasil.jenis === "dibatalkan") {
        // B9: server menyimpan bagian yang sudah tampil + tanda terputus, tetap dihitung 1.
        tambahPasangan(j, hasil.teks, null, true);
        setKuota(kurangiKuota);
      } else {
        tambahPasangan(j, hasil.teks, hasil.meta, hasil.meta === null);
        if (hasil.meta?.kuota) setKuota(hasil.meta.kuota);
        else if (hasil.meta?.status !== "gagal_simpan") setKuota(kurangiKuota);
      }
      setPengumuman(TEKS_TANYA.jawabanSelesai);
    },
    [aktif, dokumenId, riwayat.kuota, setKuota, tambahPasangan, topikId],
  );

  const hentikan = useCallback(() => abortRef.current?.abort(), []);

  const ubahInput = useCallback((nilai: string) => {
    setInput(nilai);
    setGalatInput(null);
  }, []);

  /** Coba lagi (K-15) = kirim ulang isi input (berisi pertanyaan yang gagal). */
  const cobaLagi = useCallback(() => {
    void kirim(input.trim() ? input : (galat?.pertanyaan ?? ""));
  }, [galat, input, kirim]);

  return { ...riwayat, input, ubahInput, galatInput, setGalatInput, aktif, galat, pengumuman, kirim, hentikan, cobaLagi };
}
