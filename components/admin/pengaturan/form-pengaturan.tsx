"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Banner, ConfirmDialog, Tombol, useSnackbar } from "@/components/ui";
import type { EstimasiBiaya, ItemPengaturan } from "@/lib/data/admin";
import { LABEL, PESAN, TEKS, pesan } from "@/lib/pesan";
import { skemaNilaiPengaturan, type KodePengaturan } from "@/lib/validasi/admin";
import { idKolom, KolomKuota } from "./kolom-kuota";
import { KartuEstimasiBiaya } from "./kartu-estimasi-biaya";
import { PenjagaPerubahan } from "./penjaga-perubahan";

type Nilai = Partial<Record<KodePengaturan, string>>;
type Galat = Partial<Record<KodePengaturan, string>>;
type ResponsSimpan = { data?: { versi: string | null }; error?: { kode: string; pesan: string; detail?: { kolom?: Galat } } };

const GRUP: { judul: string; kode: KodePengaturan[] }[] = [
  { judul: "Dokumen & file", kode: ["max_dokumen", "max_halaman", "max_ukuran_mb"] },
  { judul: "Asisten AI", kode: ["max_pertanyaan_harian"] },
];

function cekKolom(kode: KodePengaturan, v: string): string | undefined {
  const h = skemaNilaiPengaturan(kode).safeParse(v);
  return h.success ? undefined : h.error.issues[0]?.message;
}

export type FormPengaturanProps = { item: ItemPengaturan[]; versi: string | null; estimasi: EstimasiBiaya | null; panel: ReactNode };

/**
 * Form S-16 (FT-10). Hanya kolom yang berubah dikirim bersama `versi` (B14 → 409 MSG-K05).
 * BR-28: nilai baru berlaku untuk aksi berikutnya. Setelah simpan, halaman dimuat ulang dari server.
 */
export function FormPengaturan({ item, versi, estimasi, panel }: FormPengaturanProps) {
  const router = useRouter();
  const { tampilkan } = useSnackbar();
  const tersimpan = Object.fromEntries(item.map((i) => [i.kode, i.nilai])) as Record<KodePengaturan, number>;
  const [nilai, setNilai] = useState<Nilai>(() => Object.fromEntries(item.map((i) => [i.kode, String(i.nilai)])));
  const [galat, setGalat] = useState<Galat>({});
  const [menyimpan, setMenyimpan] = useState(false);
  const [konflik, setKonflik] = useState(false);
  const [dialogDefault, setDialogDefault] = useState(false);
  const [pengumuman, setPengumuman] = useState("");

  const berubah = item.filter((i) => (nilai[i.kode] ?? "").trim() !== String(i.nilai));
  const semuaDefault = item.every((i) => nilai[i.kode] === String(i.nilaiDefault));
  const nilaiDefault = Object.fromEntries(item.map((i) => [i.kode, i.nilaiDefault])) as Record<KodePengaturan, number>;

  async function simpan() {
    const semuaGalat: Galat = {};
    for (const i of item) semuaGalat[i.kode] = cekKolom(i.kode, nilai[i.kode] ?? "");
    setGalat(semuaGalat);
    const pertama = item.find((i) => semuaGalat[i.kode]);
    if (pertama) {
      document.getElementById(idKolom(pertama.kode))?.focus();
      return;
    }
    setMenyimpan(true);
    try {
      const res = await fetch("/api/admin/pengaturan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nilai: Object.fromEntries(berubah.map((i) => [i.kode, Number(nilai[i.kode])])), versi }),
      });
      const json = (await res.json().catch(() => ({}))) as ResponsSimpan;
      if (res.ok) {
        tampilkan(PESAN["MSG-K01"]);
        router.refresh(); // form dipasang ulang dengan nilai & versi terbaru (key = versi)
      } else if (res.status === 409) {
        setKonflik(true);
      } else if (res.status === 400 && json.error?.detail?.kolom) {
        setGalat(json.error.detail.kolom);
      } else {
        tampilkan({ pesan: json.error?.pesan ?? PESAN["MSG-G01"], labelAksi: LABEL.cobaLagi, onAksi: simpan });
      }
    } catch {
      tampilkan({ pesan: PESAN["MSG-G01"], labelAksi: LABEL.cobaLagi, onAksi: simpan });
    } finally {
      setMenyimpan(false);
    }
  }

  function kembalikanDefault() {
    setNilai(Object.fromEntries(item.map((i) => [i.kode, String(i.nilaiDefault)])));
    setGalat({});
    setDialogDefault(false);
    setPengumuman("Nilai default diisi. Tekan Simpan perubahan untuk menyimpan.");
  }

  return (
    <div className="grid grid-cols-1 gap-6 expanded:grid-cols-12">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void simpan();
        }}
        className="flex flex-col gap-6 expanded:col-span-7"
      >
        {konflik && (
          <Banner nada="warning" aksi={<Tombol varian="text" ikon="refresh" onClick={() => router.refresh()}>Muat ulang</Tombol>}>
            {PESAN["MSG-K05"]}
          </Banner>
        )}
        {GRUP.map((g) => (
          <fieldset key={g.judul} className="flex flex-col gap-5">
            <legend className="mb-4 text-title-medium text-on-surface">{g.judul}</legend>
            {g.kode.flatMap((kode) => {
              const it = item.find((i) => i.kode === kode);
              if (!it) return [];
              return [
                <KolomKuota
                  key={kode}
                  item={it}
                  nilai={nilai[kode] ?? ""}
                  tersimpan={it.nilai}
                  error={galat[kode]}
                  readOnly={menyimpan}
                  onUbah={(v) => {
                    setNilai((n) => ({ ...n, [kode]: v }));
                    if (galat[kode]) setGalat((x) => ({ ...x, [kode]: cekKolom(kode, v) }));
                  }}
                  onBlur={() => setGalat((x) => ({ ...x, [kode]: cekKolom(kode, nilai[kode] ?? "") }))}
                />,
              ];
            })}
          </fieldset>
        ))}
        <p className="sr-only" aria-live="polite">
          {pengumuman}
        </p>
        <div className="sticky bottom-20 z-10 -mx-4 flex flex-wrap justify-end gap-2 bg-surface px-4 py-3 medium:static medium:mx-0 medium:bg-transparent medium:px-0">
          <Tombol varian="outlined" ikon="settings_backup_restore" disabled={semuaDefault || menyimpan} onClick={() => setDialogDefault(true)}>
            {LABEL.kembalikanDefault}
          </Tombol>
          <Tombol type="submit" disabled={berubah.length === 0 || konflik} memuat={menyimpan} teksMemuat={TEKS.menyimpan}>
            {LABEL.simpanPerubahan}
          </Tombol>
        </div>
      </form>

      <aside className="flex flex-col gap-4 expanded:col-span-5">
        <KartuEstimasiBiaya maxPertanyaan={nilai.max_pertanyaan_harian ?? ""} tersimpan={tersimpan.max_pertanyaan_harian} awal={estimasi} />
        {panel}
      </aside>

      <ConfirmDialog
        terbuka={dialogDefault}
        onTutup={() => setDialogDefault(false)}
        onKonfirmasi={kembalikanDefault}
        judul="Kembalikan ke nilai default?"
        ikon="settings_backup_restore"
        pesan={pesan("MSG-K03", nilaiDefault)}
        labelKonfirmasi={LABEL.kembalikanDefault}
      />
      <PenjagaPerubahan aktif={berubah.length > 0 && !menyimpan} />
    </div>
  );
}
