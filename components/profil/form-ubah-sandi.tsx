"use client";

import { useRef, useState, type FormEvent } from "react";
import { Kartu, TextField, Tombol, useSnackbar } from "@/components/ui";
import { LABEL, LABEL_KOLOM, PESAN, TEKS } from "@/lib/pesan";
import { errorPerKolom, skemaUbahSandi } from "@/lib/validasi";
import { kirimJson, kolomError } from "./kirim";
import { TEKS_PROFIL as T } from "./teks";

type Kolom = "sandiLama" | "sandiBaru" | "konfirmasiSandi";
const KOSONG: Record<Kolom, string> = { sandiLama: "", sandiBaru: "", konfirmasiSandi: "" };
const URUTAN: Kolom[] = ["sandiLama", "sandiBaru", "konfirmasiSandi"];

/** Ubah kata sandi (FT-08 K-11..K-15, BR-22). Sandi lama diverifikasi server → MSG-P03 bila salah. */
export function FormUbahSandi() {
  const { tampilkan } = useSnackbar();
  const [nilai, setNilai] = useState(KOSONG);
  const [error, setError] = useState<Partial<Record<Kolom, string>>>({});
  const [memproses, setMemproses] = useState(false);
  const refs = useRef<Partial<Record<Kolom, HTMLInputElement | null>>>({});

  const lengkap = URUTAN.every((k) => nilai[k] !== "");

  function fokus(k: Kolom) {
    refs.current[k]?.focus();
  }

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cek = skemaUbahSandi.safeParse(nilai);
    if (!cek.success) {
      const perKolom = errorPerKolom(cek.error) as Partial<Record<Kolom, string>>;
      setError(perKolom);
      const pertama = URUTAN.find((k) => perKolom[k]);
      if (pertama) fokus(pertama);
      return;
    }
    setError({});
    setMemproses(true);
    const hasil = await kirimJson<{ berhasil: true }>("/api/profil/kata-sandi", "POST", cek.data);
    setMemproses(false);

    if (hasil.ok) {
      setNilai(KOSONG);
      tampilkan(PESAN["MSG-P02"]);
      return;
    }
    const kolom = hasil.error ? kolomError(hasil.error) : undefined;
    if (hasil.error && kolom && URUTAN.includes(kolom as Kolom)) {
      const k = kolom as Kolom;
      setError({ [k]: hasil.error.pesan });
      // Sandi lama salah → kolom itu dikosongkan, kolom lain tetap (FT-08 §3A.4).
      if (k === "sandiLama") setNilai((n) => ({ ...n, sandiLama: "" }));
      fokus(k);
      return;
    }
    tampilkan(hasil.error?.pesan ?? PESAN["MSG-G01"]);
  }

  const bidang: { k: Kolom; label: string; auto: string; bantuan?: string }[] = [
    { k: "sandiLama", label: LABEL_KOLOM.sandiLama, auto: "current-password" },
    { k: "sandiBaru", label: LABEL_KOLOM.sandiBaru, auto: "new-password", bantuan: T.bantuanSandiBaru },
    { k: "konfirmasiSandi", label: LABEL_KOLOM.konfirmasiSandi, auto: "new-password" },
  ];

  return (
    <Kartu as="section" radius="lg" className="expanded:p-6" aria-labelledby="judul-ubah-sandi">
      <h2 id="judul-ubah-sandi" className="mb-4 text-title-medium text-on-surface">
        {T.bagianSandi}
      </h2>
      <form noValidate onSubmit={kirim} className="flex max-w-[480px] flex-col gap-4">
        {bidang.map(({ k, label, auto, bantuan }) => (
          <TextField
            key={k}
            ref={(el) => {
              refs.current[k] = el;
            }}
            type="password"
            name={k}
            label={label}
            autoComplete={auto}
            required
            readOnly={memproses}
            value={nilai[k]}
            teksPendukung={bantuan}
            error={error[k]}
            onChange={(e) => {
              setNilai((n) => ({ ...n, [k]: e.target.value }));
              if (error[k]) setError((er) => ({ ...er, [k]: undefined }));
            }}
          />
        ))}
        <div className="flex justify-end">
          <Tombol type="submit" varian="tonal" disabled={!lengkap} memuat={memproses} teksMemuat={TEKS.memproses}>
            {LABEL.ubahKataSandi}
          </Tombol>
        </div>
      </form>
    </Kartu>
  );
}
