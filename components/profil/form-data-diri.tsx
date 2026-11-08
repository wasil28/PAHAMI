"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Kartu, TextField, Tombol, useSnackbar } from "@/components/ui";
import { NAMA_MAX } from "@/lib/config";
import { LABEL, LABEL_KOLOM, PESAN, TEKS } from "@/lib/pesan";
import { pesanErrorPertama, skemaNama } from "@/lib/validasi";
import { kirimJson } from "./kirim";
import { TEKS_PROFIL as T } from "./teks";

/** Ubah nama (FT-08 K-07..K-10, BR-22). Email hanya-baca, bisa difokus & disalin (BR-36). */
export function FormDataDiri({ namaAwal, email }: { namaAwal: string; email: string }) {
  const router = useRouter();
  const { tampilkan } = useSnackbar();
  const [nama, setNama] = useState(namaAwal);
  const [tersimpan, setTersimpan] = useState(namaAwal);
  const [error, setError] = useState<string>();
  const [menyimpan, setMenyimpan] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const berubah = nama.trim().replace(/\s+/g, " ") !== tersimpan;

  function validasi(nilai: string): string | undefined {
    const hasil = skemaNama.safeParse(nilai);
    return hasil.success ? undefined : pesanErrorPertama(hasil.error);
  }

  async function simpan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const pesanError = validasi(nama);
    setError(pesanError);
    if (pesanError || !berubah) return;

    setMenyimpan(true);
    const hasil = await kirimJson<{ nama: string }>("/api/profil", "PATCH", { nama });
    setMenyimpan(false);
    if (hasil.ok) {
      setNama(hasil.data.nama);
      setTersimpan(hasil.data.nama);
      tampilkan(PESAN["MSG-P01"]);
      router.refresh(); // header profil & shell memakai nama baru
    } else if (hasil.error?.kode === "INPUT_TIDAK_VALID") {
      setError(hasil.error.pesan);
    } else {
      // Isian tetap di kolom agar bisa dicoba lagi (FT-08 §3A.4).
      tampilkan({ pesan: hasil.error?.pesan ?? PESAN["MSG-G01"], labelAksi: LABEL.cobaLagi, onAksi: () => formRef.current?.requestSubmit() });
    }
  }

  return (
    <Kartu as="section" radius="lg" className="expanded:p-6" aria-labelledby="judul-data-diri">
      <h2 id="judul-data-diri" className="mb-4 text-title-medium text-on-surface">
        {T.bagianDataDiri}
      </h2>
      <form ref={formRef} noValidate onSubmit={simpan} className="flex max-w-[480px] flex-col gap-4">
        <TextField
          label={LABEL_KOLOM.nama}
          name="nama"
          autoComplete="name"
          value={nama}
          maxLength={NAMA_MAX}
          penghitung
          required
          readOnly={menyimpan}
          error={error}
          onChange={(e) => {
            setNama(e.target.value);
            if (error) setError(undefined);
          }}
          onBlur={() => setError(validasi(nama))}
        />
        <TextField
          label={LABEL_KOLOM.email}
          name="email"
          type="email"
          value={email}
          readOnly
          ikonBelakang="lock"
          teksPendukung={TEKS.emailTidakDapatDiubah}
        />
        <div className="flex justify-end">
          <Tombol type="submit" disabled={!berubah} memuat={menyimpan} teksMemuat={TEKS.menyimpan}>
            {LABEL.simpan}
          </Tombol>
        </div>
      </form>
    </Kartu>
  );
}
