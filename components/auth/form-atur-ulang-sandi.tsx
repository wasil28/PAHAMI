"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner, TextField, Tombol } from "@/components/ui";
import { LABEL, LABEL_KOLOM, PESAN } from "@/lib/pesan";
import { skemaAturUlangSandi } from "@/lib/validasi";
import { IndikatorKekuatanSandi } from "./indikator-kekuatan-sandi";
import { JudulAuth } from "./judul-auth";
import { kirimJson, kolomDariError } from "./kirim-json";
import { TautanTidakBerlaku } from "./tautan-tidak-berlaku";
import { useFormKolom } from "./use-form-kolom";
import { TEKS_AUTH } from "./teks";
import type { ResponAturUlangSandi } from "@/app/api/auth/atur-ulang-sandi/route";

const URUTAN = ["sandi", "konfirmasiSandi"] as const;

/** S-05 Atur ulang kata sandi. Validitas tautan sudah dicek halaman; dicek ulang saat menyimpan. */
export function FormAturUlangSandi({ email }: { email?: string }) {
  const router = useRouter();
  const form = useFormKolom(skemaAturUlangSandi, { sandi: "", konfirmasiSandi: "" }, URUTAN, { wajibSaatBlur: true });
  const [tidakBerlaku, setTidakBerlaku] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  if (tidakBerlaku) return <TautanTidakBerlaku />;

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (memuat) return;
    const v = form.validasiSemua();
    if (!v.data) return;
    setErrorForm(null);
    setMemuat(true);
    const hasil = await kirimJson<ResponAturUlangSandi>("/api/auth/atur-ulang-sandi", form.nilai);

    if (hasil.jenis === "ok") {
      router.replace(hasil.data.tujuan);
      router.refresh();
      return;
    }
    setMemuat(false);
    if (hasil.jenis === "jaringan") {
      setErrorForm(PESAN["MSG-G01"]);
      return;
    }
    if (hasil.error.kode === "TAUTAN_TIDAK_BERLAKU") {
      setTidakBerlaku(true);
      return;
    }
    const kolom = kolomDariError(hasil.error);
    if (kolom === "sandi" || kolom === "konfirmasiSandi") form.aturError(kolom, hasil.error.pesan);
    else setErrorForm(hasil.error.pesan);
  }

  return (
    <>
      <JudulAuth judul={TEKS_AUTH.atur.judul} subjudul={TEKS_AUTH.atur.subjudul} />
      <form onSubmit={kirim} noValidate aria-busy={memuat || undefined} className="flex flex-col gap-4">
        {errorForm && (
          <Banner nada="error" className="animate-masuk">
            {errorForm}
          </Banner>
        )}
        {/* Kolom email tersembunyi membantu pengelola sandi mengaitkan sandi baru dengan akunnya. */}
        {email && <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />}
        <div className="flex flex-col gap-2">
          <TextField
            ref={form.daftarRef("sandi")}
            label={LABEL_KOLOM.sandiBaru}
            name="sandi"
            type="password"
            autoComplete="new-password"
            ikonDepan="lock"
            value={form.nilai.sandi}
            onChange={(e) => form.ubah("sandi", e.target.value, ["konfirmasiSandi"])}
            onBlur={() => form.blur("sandi")}
            error={form.error.sandi}
            readOnly={memuat}
          />
          <IndikatorKekuatanSandi sandi={form.nilai.sandi} />
        </div>
        <TextField
          ref={form.daftarRef("konfirmasiSandi")}
          label={LABEL_KOLOM.konfirmasiSandi}
          name="konfirmasiSandi"
          type="password"
          autoComplete="new-password"
          ikonDepan="lock"
          value={form.nilai.konfirmasiSandi}
          onChange={(e) => form.ubah("konfirmasiSandi", e.target.value)}
          onBlur={() => form.blur("konfirmasiSandi")}
          error={form.error.konfirmasiSandi}
          readOnly={memuat}
        />
        <Tombol type="submit" lebarPenuh memuat={memuat} teksMemuat={TEKS_AUTH.atur.memuat} className="mt-2">
          {LABEL.simpanKataSandi}
        </Tombol>
      </form>
    </>
  );
}
