import { BadgeStatus, Ikon, Kartu, KartuTautan, ProgressLinear, TombolLink } from "@/components/ui";
import { LABEL, TAHAP_DOKUMEN, TEKS, isiPlaceholder } from "@/lib/pesan";
import { formatRelatif } from "@/lib/format";
import { JUMLAH_TAHAP, indeksTahap, persenTahap, rute } from "@/lib/dokumen/tahap";
import type { RingkasanDokumen } from "@/lib/dokumen/tipe";
import { MenuDokumen, TombolHapusDokumen } from "./aksi-dokumen";
import { TEKS_DOKUMEN } from "./teks";

/** Baris "Mengindeks… (4 dari 5)" (FT-02 LabelTahap). */
function LabelTahap({ dokumen }: { dokumen: RingkasanDokumen }) {
  const label = TAHAP_DOKUMEN[dokumen.tahap ?? "membaca"];
  return (
    <p className="text-body-small text-on-surface-variant">
      {label}… ({indeksTahap(dokumen.tahap) + 1} dari {JUMLAH_TAHAP})
    </p>
  );
}

/**
 * KartuDokumen S-06 (FT-03 K-08a/b/c). Seluruh kartu menuju S-07 (stretched link);
 * menu ⋮ & tombol berada di atas tautan (`relative z-10`).
 */
export function KartuDokumen({ dokumen }: { dokumen: RingkasanDokumen }) {
  const { status } = dokumen;
  const meta = [dokumen.namaFile, dokumen.jumlahHalaman ? isiPlaceholder(TEKS_DOKUMEN.halamanTerbaca, { n: dokumen.jumlahHalaman }) : null]
    .filter(Boolean)
    .join(" · ");
  const aktivitas = dokumen.aktivitasTerakhirAt ?? dokumen.createdAt;
  const ringkas = { id: dokumen.id, judul: dokumen.judul, status }; // props minimal untuk komponen klien

  return (
    <Kartu as="li" className="state-layer relative flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-container text-on-primary-container">
          <Ikon nama="picture_as_pdf" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-title-medium text-on-surface">
            <KartuTautan href={rute.dokumen(dokumen.id)}>{dokumen.judul}</KartuTautan>
          </h3>
          <p className="truncate text-body-small text-on-surface-variant" title={dokumen.namaFile}>
            {meta}
          </p>
        </div>
        {status === "siap" && <MenuDokumen dokumen={ringkas} className="relative z-10 -mt-1 -mr-2" />}
      </div>

      <BadgeStatus status={status} className="self-start" />

      {status === "siap" && (
        <div className="flex flex-col gap-1.5">
          <ProgressLinear nilai={dokumen.persenSelesai} label={TEKS_DOKUMEN.progresBelajar} />
          <p className="flex justify-between gap-2 text-body-small text-on-surface-variant">
            <span>{isiPlaceholder(TEKS_DOKUMEN.topikSelesaiDari, { x: dokumen.topikSelesai, y: dokumen.totalTopik })}</span>
            <span>{formatRelatif(aktivitas)}</span>
          </p>
        </div>
      )}

      {status === "diproses" && (
        <div className="flex flex-col gap-1.5" aria-live="polite">
          <LabelTahap dokumen={dokumen} />
          <ProgressLinear nilai={persenTahap(status, dokumen.tahap)} label={TEKS_DOKUMEN.progresPemrosesan} />
        </div>
      )}

      {status === "gagal" && (
        <>
          <p className="line-clamp-3 text-body-small text-error">{dokumen.pesanGagal ?? TEKS.kosong}</p>
          {/* BR-07: dokumen gagal hanya bisa diunggah ulang atau dihapus. */}
          <div className="relative z-10 flex flex-wrap gap-2">
            <TombolLink href={rute.upload} varian="tonal" ikon="upload_file" ukuran="sm">
              {LABEL.unggahUlang}
            </TombolLink>
            <TombolHapusDokumen dokumen={ringkas} />
          </div>
        </>
      )}
    </Kartu>
  );
}
