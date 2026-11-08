"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Banner, TextField, Tombol, TombolLink, useSnackbar } from "@/components/ui";
import { Ikon } from "@/components/ui/ikon";
import { LABEL, LABEL_KOLOM, PESAN, TEKS, pesan } from "@/lib/pesan";
import { skemaLupaSandi } from "@/lib/validasi";
import { JudulAuth } from "./judul-auth";
import { kirimJson } from "./kirim-json";
import { useFormKolom } from "./use-form-kolom";
import { JEDA_KIRIM_ULANG_DETIK } from "./rute";
import { TEKS_AUTH } from "./teks";
import type { ResponLupaSandi } from "@/app/api/auth/lupa-sandi/route";

const URUTAN = ["email"] as const;

/** Email tersamar "s***@ecampus.ut.ac.id" — hanya ketikan pengguna sendiri, tidak membocorkan apa pun. */
function samarkan(email: string): string {
  const [lokal, domain] = email.split("@");
  return domain ? `${lokal.slice(0, 1)}***@${domain}` : email;
}

function formatMundur(detik: number): string {
  return `${Math.floor(detik / 60)}:${String(detik % 60).padStart(2, "0")}`;
}

/** S-04 Lupa kata sandi. Selalu menampilkan MSG-A06 (tanpa enumerasi akun); kirim ulang tiap 60 dtk. */
export function FormLupaSandi({ emailAwal = "" }: { emailAwal?: string }) {
  const { tampilkan } = useSnackbar();
  const form = useFormKolom(skemaLupaSandi, { email: emailAwal }, URUTAN);
  const [terkirimKe, setTerkirimKe] = useState<string | null>(null);
  const [sisa, setSisa] = useState(0);
  const [memuat, setMemuat] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const judulRef = useRef<HTMLHeadingElement>(null);

  // Hitung mundur tombol Kirim ulang (BR-26, MSG-A04).
  useEffect(() => {
    if (sisa <= 0) return;
    const t = setTimeout(() => setSisa((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [sisa]);

  // Fokus program ke judul "Cek email kamu" saat state berganti (ui-ux S-04 K-07).
  useEffect(() => {
    if (terkirimKe) judulRef.current?.focus();
  }, [terkirimKe]);

  async function minta(email: string, ulang: boolean) {
    setMemuat(true);
    setErrorForm(null);
    const hasil = await kirimJson<ResponLupaSandi>("/api/auth/lupa-sandi", { email });
    setMemuat(false);
    if (hasil.jenis === "ok") {
      setTerkirimKe(email);
      setSisa(JEDA_KIRIM_ULANG_DETIK);
      if (ulang) tampilkan(TEKS.tautanBaruTerkirim);
      return;
    }
    if (hasil.jenis === "gagal" && hasil.status === 400) form.aturError("email", hasil.error.pesan);
    else setErrorForm(hasil.jenis === "gagal" ? hasil.error.pesan : PESAN["MSG-G01"]);
  }

  function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (memuat) return;
    const v = form.validasiSemua();
    if (v.data) void minta(v.data.email, false);
  }

  const kembali = (
    <TombolLink href="/masuk" varian="text" ikon="arrow_back" className="-ml-3 mb-4">
      {TEKS_AUTH.lupa.kembali}
    </TombolLink>
  );

  if (terkirimKe) {
    return (
      <div className="flex flex-col animate-masuk">
        {kembali}
        <div aria-hidden className="mb-4 grid size-20 place-items-center rounded-full bg-primary-container text-on-primary-container">
          <Ikon nama="mark_email_read" ukuran={48} />
        </div>
        <JudulAuth ref={judulRef} judul={TEKS_AUTH.lupa.judulTerkirim} />
        {errorForm && (
          <Banner nada="error" className="mb-4">
            {errorForm}
          </Banner>
        )}
        <Banner nada="info">
          <p>{PESAN["MSG-A06"]}</p>
          <p className="mt-2">
            {TEKS_AUTH.lupa.dikirimKe} <strong>{samarkan(terkirimKe)}</strong>
          </p>
          <p>{TEKS_AUTH.lupa.masaBerlaku}</p>
        </Banner>

        <div className="mt-6 flex flex-col gap-3">
          <TombolLink href="/masuk" lebarPenuh>
            {TEKS_AUTH.lupa.kembali}
          </TombolLink>
          <Tombol
            varian="outlined"
            lebarPenuh
            disabled={sisa > 0}
            memuat={memuat}
            teksMemuat={TEKS_AUTH.lupa.memuat}
            onClick={() => void minta(terkirimKe, true)}
          >
            {sisa > 0 ? `${LABEL.kirimUlang} (${formatMundur(sisa)})` : LABEL.kirimUlang}
          </Tombol>
          {sisa > 0 && (
            <p className="text-center text-body-small text-on-surface-variant">{pesan("MSG-A04", { detik: sisa })}</p>
          )}
          {/* Diumumkan sekali saat aktif, bukan tiap detik (ui-ux §5). */}
          <p className="sr-only" aria-live="polite">
            {sisa === 0 ? TEKS_AUTH.lupa.kirimUlangTersedia : ""}
          </p>
        </div>

        <p className="mt-4 flex flex-wrap items-center justify-center gap-x-1 text-body-medium text-on-surface-variant">
          <span>{TEKS_AUTH.lupa.salahEmail}</span>
          <Tombol
            varian="text"
            onClick={() => {
              setTerkirimKe(null);
              setTimeout(() => form.fokus("email"), 0);
            }}
          >
            {TEKS_AUTH.lupa.gantiEmail}
          </Tombol>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {kembali}
      <JudulAuth judul={TEKS_AUTH.lupa.judul} subjudul={TEKS_AUTH.lupa.subjudul} />
      <form onSubmit={kirim} noValidate aria-busy={memuat || undefined} className="flex flex-col gap-4">
        {errorForm && (
          <Banner nada="error" className="animate-masuk">
            {errorForm}
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
          onChange={(e) => form.ubah("email", e.target.value)}
          onBlur={() => form.blur("email")}
          error={form.error.email}
          readOnly={memuat}
        />
        <Tombol type="submit" lebarPenuh memuat={memuat} teksMemuat={TEKS_AUTH.lupa.memuat}>
          {LABEL.kirimTautanReset}
        </Tombol>
      </form>
    </div>
  );
}
