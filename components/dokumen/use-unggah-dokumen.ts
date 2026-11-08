"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TIPE_FILE_DIIZINKAN } from "@/lib/config";
import { PESAN } from "@/lib/pesan";
import { hapusDokumen, panggilApi, type HasilBuatDokumen } from "@/lib/dokumen/klien";
import type { StatusDokumenApi } from "@/lib/dokumen/tipe";

// Alur unggah S-11 (KEPUTUSAN §3): POST /api/dokumen → PUT file ke signed upload URL Storage
// (XHR agar persen unggah bisa ditampilkan — uploadToSignedUrl supabase-js tidak punya
// progres) → POST /api/dokumen/[id]/proses. Gagal/batal → baris `diproses` dihapus (NF-04).

export type FaseUnggah =
  | { jenis: "pilih" }
  | { jenis: "mengunggah"; judul: string; terkirim: number; total: number }
  | { jenis: "terputus" }
  | { jenis: "memproses"; dokumen: StatusDokumenApi };

type HasilMulai = { ok: true } | { ok: false; pesan: string; kuotaPenuh: boolean };

function putKeStorage(url: string, file: File, onProgres: (terkirim: number) => void, xhrRef: { current: XMLHttpRequest | null }) {
  return new Promise<boolean>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", TIPE_FILE_DIIZINKAN);
    xhr.setRequestHeader("x-upsert", "false"); // file tidak boleh ditimpa (policy Storage)
    xhr.upload.onprogress = (e) => onProgres(e.loaded);
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.onabort = () => resolve(false);
    xhr.send(file);
  });
}

/** `awal`: dokumen yang sedang diproses saat S-11 dibuka lewat /upload?dokumen={id}. */
export function useUnggahDokumen(awal?: StatusDokumenApi | null) {
  const [fase, setFase] = useState<FaseUnggah>(awal ? { jenis: "memproses", dokumen: awal } : { jenis: "pilih" });
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const idRef = useRef<number | null>(null);
  const dibatalkanRef = useRef(false);

  // Peringatan bawaan browser bila tab ditutup saat mengunggah (FT-02 K-10).
  useEffect(() => {
    if (fase.jenis !== "mengunggah") return;
    const cegah = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", cegah);
    return () => window.removeEventListener("beforeunload", cegah);
  }, [fase.jenis]);

  const mulai = useCallback(async (file: File, judul: string): Promise<HasilMulai> => {
    dibatalkanRef.current = false;
    setFase({ jenis: "mengunggah", judul: judul || file.name, terkirim: 0, total: file.size });

    const buat = await panggilApi<HasilBuatDokumen>("/api/dokumen", {
      method: "POST",
      body: JSON.stringify({ judul: judul || undefined, namaFile: file.name, tipe: file.type, ukuranByte: file.size }),
    });
    if (!buat.ok) {
      setFase({ jenis: "pilih" });
      return { ok: false, pesan: buat.pesan, kuotaPenuh: buat.status === 429 };
    }
    const { dokumen, unggah } = buat.data;
    if (dibatalkanRef.current) {
      await hapusDokumen(dokumen.id); // dibatalkan sebelum catatan selesai dibuat
      return { ok: true };
    }
    idRef.current = dokumen.id;
    setFase({ jenis: "mengunggah", judul: dokumen.judul, terkirim: 0, total: file.size });

    const berhasil = await putKeStorage(
      unggah.signedUrl,
      file,
      (terkirim) => setFase((f) => (f.jenis === "mengunggah" ? { ...f, terkirim } : f)),
      xhrRef,
    );
    xhrRef.current = null;
    if (dibatalkanRef.current) return { ok: true }; // batal() sudah membereskan
    if (!berhasil) {
      await hapusDokumen(dokumen.id); // tidak ada catatan yang tersisa (NF-04)
      idRef.current = null;
      setFase({ jenis: "terputus" });
      return { ok: false, pesan: PESAN["MSG-U05"], kuotaPenuh: false };
    }

    const proses = await panggilApi<{ id: number; status: StatusDokumenApi["status"]; tahap: StatusDokumenApi["tahap"] }>(
      `/api/dokumen/${dokumen.id}/proses`,
      { method: "POST" },
    );
    idRef.current = null;
    if (!proses.ok && proses.status !== 0) {
      // File tidak terbaca server / galat lain: catatan dibersihkan agar kuota kembali.
      await hapusDokumen(dokumen.id);
      setFase({ jenis: "terputus" });
      return { ok: false, pesan: proses.pesan, kuotaPenuh: false };
    }
    // Galat jaringan saat memicu proses: dokumen tetap ada; polling akan menunjukkan statusnya
    // (bila pipeline tak pernah mulai, A8 menandainya gagal setelah 15 menit).
    setFase({
      jenis: "memproses",
      dokumen: {
        id: dokumen.id,
        kode: dokumen.kode,
        judul: dokumen.judul,
        status: proses.ok ? proses.data.status : "diproses",
        tahap: proses.ok ? proses.data.tahap : "membaca",
        pesanGagal: null,
        jumlahHalaman: null,
        jumlahTopik: null,
      },
    });
    return { ok: true };
  }, []);

  /** "Batalkan unggahan" (FT-02 K-10): hentikan PUT dan hapus catatan `diproses`. */
  const batal = useCallback(async () => {
    dibatalkanRef.current = true;
    xhrRef.current?.abort();
    const id = idRef.current;
    idRef.current = null;
    setFase({ jenis: "pilih" });
    if (id !== null) await hapusDokumen(id);
  }, []);

  const ulang = useCallback(() => setFase({ jenis: "pilih" }), []);

  return { fase, mulai, batal, ulang };
}
