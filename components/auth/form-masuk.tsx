"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Banner, TextField, Tombol, kelasTombol } from "@/components/ui";
import { LABEL, LABEL_KOLOM, PESAN, TEKS } from "@/lib/pesan";
import { skemaMasuk } from "@/lib/validasi";
import { kirimJson, kolomDariError } from "./kirim-json";
import { useFormKolom } from "./use-form-kolom";
import { PARAM } from "./rute";
import { TEKS_AUTH } from "./teks";
import type { ResponMasuk } from "@/app/api/auth/masuk/route";

export type PesanAwalMasuk = "nonaktif" | "sesi-habis" | "sandi-diubah";
type BannerForm = { nada: "error" | "success" | "info"; teks: string; lengket?: boolean };

const BANNER_AWAL: Record<PesanAwalMasuk, BannerForm> = {
  nonaktif: { nada: "error", teks: PESAN["MSG-A02"], lengket: true },
  "sesi-habis": { nada: "info", teks: PESAN["MSG-A03"] },
  "sandi-diubah": { nada: "success", teks: PESAN["MSG-A07"] },
};

const URUTAN = ["email", "sandi"] as const;

/** S-02 Masuk. Memanggil POST /api/auth/masuk lalu pindah ke halaman sesuai peran (BR-31). */
export function FormMasuk({ pesanAwal, lanjut }: { pesanAwal?: PesanAwalMasuk; lanjut?: string }) {
  const router = useRouter();
  const form = useFormKolom(skemaMasuk, { email: "", sandi: "" }, URUTAN);
  const [banner, setBanner] = useState<BannerForm | null>(pesanAwal ? BANNER_AWAL[pesanAwal] : null);
  const [memuat, setMemuat] = useState(false);

  // K-03 hilang saat mulai mengetik ulang, kecuali MSG-A02 (tetap sampai submit berikutnya).
  const ketik = (nama: (typeof URUTAN)[number], isi: string) => {
    form.ubah(nama, isi);
    if (banner && !banner.lengket) setBanner(null);
  };

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (memuat) return;
    const v = form.validasiSemua();
    if (!v.data) return;

    setBanner(null);
    setMemuat(true);
    const qs = lanjut ? `?${PARAM.lanjut}=${encodeURIComponent(lanjut)}` : "";
    const hasil = await kirimJson<ResponMasuk>(`/api/auth/masuk${qs}`, v.data);

    if (hasil.jenis === "ok") {
      // Tetap memuat sampai halaman tujuan tampil.
      router.replace(hasil.data.tujuan);
      router.refresh();
      return;
    }
    setMemuat(false);
    if (hasil.jenis === "jaringan") {
      setBanner({ nada: "error", teks: PESAN["MSG-G01"] });
      return;
    }
    const { error } = hasil;
    if (error.kode === "KREDENSIAL_SALAH") {
      // Email tetap; sandi dikosongkan & difokus (ui-ux S-02 §3.4).
      form.setNilai((n) => ({ ...n, sandi: "" }));
      setBanner({ nada: "error", teks: error.pesan });
      form.fokus("sandi");
    } else if (error.kode === "AKUN_NONAKTIF") {
      setBanner({ nada: "error", teks: error.pesan, lengket: true });
    } else {
      const kolom = kolomDariError(error);
      if (kolom === "email" || kolom === "sandi") form.aturError(kolom, error.pesan);
      else setBanner({ nada: "error", teks: error.pesan });
    }
  }

  const hrefLupa = form.nilai.email
    ? `/lupa-sandi?${PARAM.email}=${encodeURIComponent(form.nilai.email.trim())}`
    : "/lupa-sandi";

  return (
    <form onSubmit={kirim} noValidate aria-busy={memuat || undefined} className="flex flex-col gap-4">
      {banner && (
        <Banner nada={banner.nada} className="animate-masuk">
          {banner.teks}
        </Banner>
      )}

      <TextField
        ref={form.daftarRef("email")}
        label={LABEL_KOLOM.email}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="nama@ecampus.ut.ac.id"
        ikonDepan="mail"
        value={form.nilai.email}
        onChange={(e) => ketik("email", e.target.value)}
        onBlur={() => form.blur("email")}
        error={form.error.email}
        readOnly={memuat}
      />

      <div>
        <TextField
          ref={form.daftarRef("sandi")}
          label={LABEL_KOLOM.sandi}
          name="sandi"
          type="password"
          autoComplete="current-password"
          ikonDepan="lock"
          value={form.nilai.sandi}
          onChange={(e) => ketik("sandi", e.target.value)}
          error={form.error.sandi}
          readOnly={memuat}
        />
        <div className="mt-1 flex justify-end">
          <Link href={hrefLupa} className={kelasTombol({ varian: "text", ukuran: "md" })}>
            {TEKS_AUTH.masuk.lupaSandi}
          </Link>
        </div>
      </div>

      <Tombol type="submit" lebarPenuh memuat={memuat} teksMemuat={TEKS.sedangMasuk}>
        {LABEL.masuk}
      </Tombol>
    </form>
  );
}
