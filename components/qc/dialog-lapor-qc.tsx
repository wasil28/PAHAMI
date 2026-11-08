"use client";

import { useId, useState, type ClipboardEvent, type FormEvent } from "react";
import { Dialog, Select, TextField, Textarea, Tombol, useSnackbar } from "@/components/ui";
import { LABEL, PESAN, pesanWajib } from "@/lib/pesan";
import {
  DESKRIPSI_QC_MAX,
  JUDUL_QC_MAX,
  JUDUL_QC_MIN,
  KATEGORI_QC,
  PRIORITAS_QC,
  type KategoriQc,
  type PrioritasQc,
} from "@/lib/qc/tipe";
import { ambilInfoPerangkat, cekLampiran } from "./perangkat";
import { FieldScreenshot } from "./field-screenshot";
import { TEKS_QC, isi } from "./teks";

type Field = "judul" | "kategori" | "prioritas" | "deskripsi" | "lampiran";
type GalatField = Partial<Record<Field, string>>;
type Respons = { data?: { id: number; kode: string }; error?: { kode: string; pesan: string; detail?: { field?: string } } };

const OPSI_KATEGORI = Object.entries(KATEGORI_QC).map(([nilai, label]) => ({ nilai, label }));
const OPSI_PRIORITAS = Object.entries(PRIORITAS_QC).map(([nilai, label]) => ({ nilai, label }));
const FIELD: readonly Field[] = ["judul", "kategori", "prioritas", "deskripsi", "lampiran"];
const PRIORITAS_AWAL: PrioritasQc = "sedang";
// Batas panjang urlHalaman di skema server (lib/validasi/qc.ts); lebih dari itu server menggantinya "/".
const URL_HALAMAN_MAKS = 500;

type Props = {
  terbuka: boolean;
  onTutup: () => void;
  /** Path + query halaman yang dilaporkan (ditangkap saat dialog dibuka). */
  urlHalaman: string;
};

/**
 * Form laporan QC dalam dialog. Draf tetap tersimpan bila dialog ditutup tanpa sengaja,
 * dan dikosongkan setelah terkirim. Tempel gambar (Ctrl/⌘+V) di mana pun dalam dialog → lampiran.
 */
export function DialogLaporQc({ terbuka, onTutup, urlHalaman }: Props) {
  const idForm = useId();
  const { tampilkan } = useSnackbar();
  const [judul, setJudul] = useState("");
  const [kategori, setKategori] = useState<KategoriQc | "">("");
  const [prioritas, setPrioritas] = useState<PrioritasQc>(PRIORITAS_AWAL);
  const [deskripsi, setDeskripsi] = useState<string>(TEKS_QC.templateDeskripsi);
  const [lampiran, setLampiran] = useState<File | null>(null);
  const [galat, setGalat] = useState<GalatField>({});
  const [galatUmum, setGalatUmum] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  function reset() {
    setJudul("");
    setKategori("");
    setPrioritas(PRIORITAS_AWAL);
    setDeskripsi(TEKS_QC.templateDeskripsi);
    setLampiran(null);
    setGalat({});
    setGalatUmum(null);
  }

  function pilihLampiran(file: File | null) {
    const pesanGalat = file ? cekLampiran(file) : null;
    setGalat((g) => ({ ...g, lampiran: pesanGalat ?? undefined }));
    if (!pesanGalat) setLampiran(file);
  }

  function tanganiTempel(e: ClipboardEvent<HTMLFormElement>) {
    const gambar = Array.from(e.clipboardData.items).find((it) => it.kind === "file" && it.type.startsWith("image/"));
    const file = gambar?.getAsFile();
    if (!file) return; // teks biasa → biarkan ditempel ke kolom yang fokus
    e.preventDefault();
    pilihLampiran(file);
  }

  function validasi(): GalatField {
    const g: GalatField = {};
    if (judul.trim().length < JUDUL_QC_MIN) g.judul = isi(TEKS_QC.judulTerlaluPendek, { min: JUDUL_QC_MIN });
    if (!kategori) g.kategori = pesanWajib(TEKS_QC.kategori);
    if (!deskripsi.trim()) g.deskripsi = pesanWajib(TEKS_QC.deskripsi);
    return g;
  }

  async function kirim(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const g = validasi();
    setGalat(g);
    setGalatUmum(null);
    if (Object.keys(g).length > 0) return;

    const fd = new FormData();
    fd.set("judul", judul.trim());
    fd.set("deskripsi", deskripsi.trim());
    fd.set("kategori", kategori);
    fd.set("prioritas", prioritas);
    fd.set("urlHalaman", urlHalaman.slice(0, URL_HALAMAN_MAKS));
    fd.set("infoPerangkat", JSON.stringify(ambilInfoPerangkat()));
    if (lampiran) fd.set("lampiran", lampiran, lampiran.name || "screenshot.png");

    setMemuat(true);
    try {
      const res = await fetch("/api/qc", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as Respons;
      if (res.ok && json.data) {
        tampilkan(isi(TEKS_QC.terkirim, { kode: json.data.kode }));
        reset();
        onTutup();
      } else if (res.status === 403) {
        setGalatUmum(json.error?.pesan ?? TEKS_QC.bukanPenguji);
      } else {
        const field = json.error?.detail?.field?.split(".")[0];
        const pesanGalat = json.error?.pesan ?? PESAN["MSG-G01"];
        if (field && (FIELD as readonly string[]).includes(field)) setGalat({ [field]: pesanGalat });
        else setGalatUmum(pesanGalat);
      }
    } catch {
      setGalatUmum(PESAN["MSG-G01"]);
    } finally {
      setMemuat(false);
    }
  }

  return (
    <Dialog
      terbuka={terbuka}
      onTutup={onTutup}
      judul={TEKS_QC.judulDialog}
      lebar="md"
      kunci={memuat}
      aksi={
        <>
          <Tombol varian="text" onClick={onTutup} disabled={memuat}>
            {LABEL.batal}
          </Tombol>
          <Tombol type="submit" form={idForm} ikon="send" memuat={memuat} teksMemuat={TEKS_QC.mengirim}>
            {TEKS_QC.kirim}
          </Tombol>
        </>
      }
    >
      <form id={idForm} noValidate onSubmit={kirim} onPaste={tanganiTempel} className="flex flex-col gap-4 pt-1 pb-1">
        <p className="flex items-start gap-2 rounded-sm bg-surface-container px-3 py-2 text-body-small text-on-surface-variant">
          <span className="shrink-0 font-semibold text-on-surface">{TEKS_QC.halaman}:</span>
          <code className="min-w-0 break-all">{urlHalaman}</code>
        </p>
        <TextField
          label={TEKS_QC.judul}
          placeholder={TEKS_QC.phJudul}
          required
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
          minLength={JUDUL_QC_MIN}
          maxLength={JUDUL_QC_MAX}
          penghitung
          error={galat.judul}
          disabled={memuat}
        />
        <div className="grid gap-4 medium:grid-cols-2">
          <Select
            label={TEKS_QC.kategori}
            required
            placeholder={TEKS_QC.pilihKategori}
            opsi={OPSI_KATEGORI}
            value={kategori}
            onChange={(e) => setKategori(e.target.value as KategoriQc | "")}
            error={galat.kategori}
            disabled={memuat}
          />
          <Select
            label={TEKS_QC.prioritas}
            opsi={OPSI_PRIORITAS}
            value={prioritas}
            onChange={(e) => setPrioritas(e.target.value as PrioritasQc)}
            error={galat.prioritas}
            disabled={memuat}
          />
        </div>
        <Textarea
          label={TEKS_QC.deskripsi}
          required
          rows={8}
          value={deskripsi}
          onChange={(e) => setDeskripsi(e.target.value)}
          maxLength={DESKRIPSI_QC_MAX}
          penghitung
          error={galat.deskripsi}
          disabled={memuat}
        />
        <FieldScreenshot file={lampiran} onUbah={pilihLampiran} error={galat.lampiran} disabled={memuat} />
        <p className="text-body-small text-on-surface-variant">{TEKS_QC.infoOtomatis}</p>
        {galatUmum && (
          <p role="alert" className="text-body-medium text-error">
            {galatUmum}
          </p>
        )}
      </form>
    </Dialog>
  );
}
