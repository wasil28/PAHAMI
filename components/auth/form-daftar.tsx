"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner, TextField, Tombol, useSnackbar } from "@/components/ui";
import { LABEL, LABEL_KOLOM, PESAN, isiPlaceholder } from "@/lib/pesan";
import { NAMA_MAX } from "@/lib/config";
import { skemaDaftar } from "@/lib/validasi";
import { IndikatorKekuatanSandi } from "./indikator-kekuatan-sandi";
import { kirimJson, kolomDariError } from "./kirim-json";
import { useFormKolom } from "./use-form-kolom";
import { TEKS_AUTH } from "./teks";
import type { ResponDaftar } from "@/app/api/auth/daftar/route";

const URUTAN = ["nama", "email", "sandi", "konfirmasiSandi"] as const;
type Kolom = (typeof URUTAN)[number];

/** S-03 Daftar (BR-22, BR-25). Sukses → sesi aktif → Beranda state kosong. */
export function FormDaftar() {
  const router = useRouter();
  const { tampilkan } = useSnackbar();
  const form = useFormKolom(skemaDaftar, { nama: "", email: "", sandi: "", konfirmasiSandi: "" }, URUTAN, {
    wajibSaatBlur: true,
  });
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [ringkasan, setRingkasan] = useState("");
  const [memuat, setMemuat] = useState(false);

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (memuat) return;
    const v = form.validasiSemua();
    if (!v.data) {
      setRingkasan(isiPlaceholder(TEKS_AUTH.daftar.ringkasanError, { n: v.jumlah }));
      return;
    }
    setRingkasan("");
    setErrorForm(null);
    setMemuat(true);
    // Kirim isi mentah (bukan hasil transform) — server memvalidasi ulang dengan skema yang sama.
    const hasil = await kirimJson<ResponDaftar>("/api/auth/daftar", form.nilai);

    if (hasil.jenis === "ok") {
      if (hasil.data.tujuan !== "/masuk") tampilkan(TEKS_AUTH.daftar.selamatDatang);
      router.replace(hasil.data.tujuan);
      router.refresh();
      return;
    }
    setMemuat(false);
    if (hasil.jenis === "jaringan") {
      // Isi form tetap utuh (BP-01 pengecualian).
      setErrorForm(PESAN["MSG-G01"]);
      return;
    }
    const kolom = kolomDariError(hasil.error) as Kolom | null;
    if (kolom && (URUTAN as readonly string[]).includes(kolom)) form.aturError(kolom, hasil.error.pesan);
    else setErrorForm(hasil.error.pesan);
  }

  const props = (nama: Kolom) => ({
    ref: form.daftarRef(nama),
    name: nama,
    value: form.nilai[nama],
    onBlur: () => form.blur(nama),
    error: form.error[nama],
    readOnly: memuat,
  });

  return (
    <form onSubmit={kirim} noValidate aria-busy={memuat || undefined} className="flex flex-col gap-4">
      <p className="sr-only" aria-live="assertive">
        {ringkasan}
      </p>
      {errorForm && (
        <Banner nada="error" className="animate-masuk">
          {errorForm}
        </Banner>
      )}

      <TextField
        {...props("nama")}
        label={LABEL_KOLOM.nama}
        autoComplete="name"
        ikonDepan="person"
        maxLength={NAMA_MAX}
        penghitung
        onChange={(e) => form.ubah("nama", e.target.value)}
      />
      <TextField
        {...props("email")}
        label={LABEL_KOLOM.email}
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="nama@ecampus.ut.ac.id"
        ikonDepan="mail"
        onChange={(e) => form.ubah("email", e.target.value)}
      />
      <div className="flex flex-col gap-2">
        <TextField
          {...props("sandi")}
          label={LABEL_KOLOM.sandi}
          type="password"
          autoComplete="new-password"
          ikonDepan="lock"
          onChange={(e) => form.ubah("sandi", e.target.value, ["konfirmasiSandi"])}
        />
        <IndikatorKekuatanSandi sandi={form.nilai.sandi} />
      </div>
      <TextField
        {...props("konfirmasiSandi")}
        label={LABEL_KOLOM.konfirmasiSandi}
        type="password"
        autoComplete="new-password"
        ikonDepan="lock"
        onChange={(e) => form.ubah("konfirmasiSandi", e.target.value)}
      />

      <Tombol type="submit" lebarPenuh memuat={memuat} teksMemuat={TEKS_AUTH.daftar.memuat} className="mt-2">
        {LABEL.daftar}
      </Tombol>
    </form>
  );
}
