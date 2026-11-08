"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dialog, Divider, Select, Textarea, Tombol, useSnackbar } from "@/components/ui";
import { formatTanggalWaktu } from "@/lib/format";
import { LABEL, PESAN } from "@/lib/pesan";
import { CATATAN_QC_MAX, PRIORITAS_QC, STATUS_QC, type LaporanQc, type PrioritasQc, type StatusQc } from "@/lib/qc/tipe";
import { BadgeKategoriQc, BadgePrioritasQc, BadgeStatusQc } from "./badge-qc";
import { TEKS_QC, isi } from "./teks";

const OPSI_STATUS = Object.entries(STATUS_QC).map(([nilai, label]) => ({ nilai, label }));
const OPSI_PRIORITAS = Object.entries(PRIORITAS_QC).map(([nilai, label]) => ({ nilai, label }));

/** Detail laporan + form tindak lanjut admin (PATCH /api/qc/[id]). */
export function DialogDetailQc({ laporan, onTutup }: { laporan: LaporanQc | null; onTutup: () => void }) {
  const [memuat, setMemuat] = useState(false);
  return (
    <Dialog
      terbuka={laporan !== null}
      onTutup={onTutup}
      judul={laporan ? `${laporan.kode} · ${laporan.judul}` : TEKS_QC.detail}
      lebar="md"
      kunci={memuat}
      aksi={
        <Tombol varian="text" onClick={onTutup} disabled={memuat}>
          {LABEL.tutup}
        </Tombol>
      }
    >
      {/* key: form diisi ulang dari data terbaru setiap laporan berganti/diperbarui */}
      {laporan && <IsiDetail key={`${laporan.id}-${laporan.updatedAt}`} laporan={laporan} memuat={memuat} setMemuat={setMemuat} />}
    </Dialog>
  );
}

function IsiDetail({ laporan: l, memuat, setMemuat }: { laporan: LaporanQc; memuat: boolean; setMemuat: (v: boolean) => void }) {
  const router = useRouter();
  const { tampilkan } = useSnackbar();
  const [status, setStatus] = useState<StatusQc>(l.status);
  const [prioritas, setPrioritas] = useState<PrioritasQc>(l.prioritas);
  const [catatan, setCatatan] = useState(l.catatanTim ?? "");
  const [galat, setGalat] = useState<string | null>(null);
  const berubah = status !== l.status || prioritas !== l.prioritas || catatan.trim() !== (l.catatanTim ?? "");

  async function simpan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGalat(null);
    setMemuat(true);
    try {
      const res = await fetch(`/api/qc/${l.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, prioritas, catatanTim: catatan.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: { pesan?: string } };
      if (res.ok) {
        tampilkan(isi(TEKS_QC.tersimpan, { kode: l.kode }));
        router.refresh();
      } else {
        setGalat(json.error?.pesan ?? PESAN["MSG-G01"]);
      }
    } catch {
      setGalat(PESAN["MSG-G01"]);
    } finally {
      setMemuat(false);
    }
  }

  const info = l.infoPerangkat;
  return (
    <div className="flex flex-col gap-4 pb-1 text-on-surface">
      <div className="flex flex-wrap gap-2">
        <BadgeStatusQc status={l.status} />
        <BadgeKategoriQc kategori={l.kategori} />
        <BadgePrioritasQc prioritas={l.prioritas} />
      </div>
      <p className="text-body-small text-on-surface-variant">
        {isi(TEKS_QC.dilaporkan, { tanggal: formatTanggalWaktu(l.createdAt) })} · {isi(TEKS_QC.oleh, { nama: l.pelapor.nama })} ({l.pelapor.email})
        {l.ditanganiOleh && <> · {isi(TEKS_QC.ditanganiOleh, { nama: l.ditanganiOleh })}</>}
      </p>

      <Bagian judul={TEKS_QC.deskripsi}>
        <p className="text-body-medium break-words whitespace-pre-wrap">{l.deskripsi}</p>
      </Bagian>

      <Bagian judul={TEKS_QC.halaman}>
        {/* Hanya path internal yang dijadikan tautan — nilai berasal dari klien (cegah javascript:/situs luar). */}
        {!jalurInternal(l.urlHalaman) ? (
          <p className="text-body-medium break-all">{l.urlHalaman}</p>
        ) : (
        <a
          href={l.urlHalaman}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-start gap-1 text-body-medium break-all text-primary underline"
          aria-label={`${l.urlHalaman} — ${TEKS_QC.bukaHalaman}`}
        >
          {l.urlHalaman}
        </a>
        )}
      </Bagian>

      <Bagian judul={TEKS_QC.perangkat}>
        {info ? (
          <>
            <p className="text-body-medium">{isi(TEKS_QC.layar, { lebar: info.lebarLayar, tinggi: info.tinggiLayar, tema: info.tema })}</p>
            <p className="text-body-small break-all text-on-surface-variant">{info.userAgent}</p>
          </>
        ) : (
          <p className="text-body-medium text-on-surface-variant">{TEKS_QC.tidakAdaInfo}</p>
        )}
      </Bagian>

      {l.lampiranUrl && (
        <Bagian judul={TEKS_QC.screenshotJudul}>
          <a href={l.lampiranUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-sm border border-outline-variant">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed URL Supabase berumur pendek */}
            <img src={l.lampiranUrl} alt={isi(TEKS_QC.screenshotDari, { kode: l.kode })} className="max-h-80 w-full bg-surface-container object-contain" />
          </a>
        </Bagian>
      )}

      <Divider />
      <form onSubmit={simpan} className="flex flex-col gap-4" aria-label={TEKS_QC.tindakLanjut}>
        <h3 className="text-title-medium">{TEKS_QC.tindakLanjut}</h3>
        <div className="grid gap-4 medium:grid-cols-2">
          <Select label={TEKS_QC.status} opsi={OPSI_STATUS} value={status} onChange={(e) => setStatus(e.target.value as StatusQc)} disabled={memuat} />
          <Select label={TEKS_QC.prioritas} opsi={OPSI_PRIORITAS} value={prioritas} onChange={(e) => setPrioritas(e.target.value as PrioritasQc)} disabled={memuat} />
        </div>
        <Textarea
          label={TEKS_QC.catatanTim}
          placeholder={TEKS_QC.phCatatan}
          rows={3}
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          maxLength={CATATAN_QC_MAX}
          penghitung
          disabled={memuat}
        />
        {galat && (
          <p role="alert" className="text-body-medium text-error">
            {galat}
          </p>
        )}
        <div className="flex justify-end">
          <Tombol type="submit" ikon="save" memuat={memuat} teksMemuat={TEKS_QC.menyimpan} disabled={!berubah}>
            {TEKS_QC.simpan}
          </Tombol>
        </div>
      </form>
    </div>
  );
}

function jalurInternal(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\");
}

function Bagian({ judul, children }: { judul: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-label-large text-on-surface-variant">{judul}</h3>
      {children}
    </section>
  );
}
