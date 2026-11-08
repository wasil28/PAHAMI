import type { ReactNode } from "react";
import { Banner, Divider, Ikon, Kartu, ProgressLinear, TombolLink } from "@/components/ui";
import { PERINGATAN_KUOTA_PERSEN, RUTE_AWAL } from "@/lib/config";
import type { KuotaPengguna } from "@/lib/data/profil";
import { formatPersen, hitungPersen } from "@/lib/format";
import { isiPlaceholder, pesan, PESAN, TEKS } from "@/lib/pesan";
import { TEKS_PROFIL as T } from "./teks";

type Tingkat = "normal" | "hampir" | "penuh";

/** < 80% normal · ≥ 80% hampir (MSG-Q01) · ≥ 100% penuh (MSG-U03 / MSG-C02). */
function tingkatKuota(terpakai: number, maks: number): Tingkat {
  const persen = hitungPersen(terpakai, maks);
  if (terpakai >= maks) return "penuh";
  return persen >= PERINGATAN_KUOTA_PERSEN ? "hampir" : "normal";
}

const NADA_PROGRESS = { normal: "primary", hampir: "warning", penuh: "error" } as const;

type BarisKuotaProps = {
  ikon: string;
  label: string;
  teks: string;
  terpakai: number;
  maks: number;
  peringatan?: ReactNode;
  keterangan?: ReactNode;
};

function BarisKuota({ ikon, label, teks, terpakai, maks, peringatan, keterangan }: BarisKuotaProps) {
  const persen = hitungPersen(terpakai, maks);
  const tingkat = tingkatKuota(terpakai, maks);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-on-surface">
        <Ikon nama={ikon} ukuran={20} className="text-on-surface-variant" />
        <h3 className="text-title-small">{label}</h3>
      </div>
      {/* "6 dari 5" tampil apa adanya bila admin menurunkan kuota (KEPUTUSAN B13). */}
      <p className="text-body-medium text-on-surface">{teks}</p>
      <div className="flex items-center gap-3">
        <ProgressLinear nilai={persen} label={teks} nada={NADA_PROGRESS[tingkat]} className="flex-1" />
        <span className="text-label-large tabular-nums text-on-surface">{formatPersen(Math.min(persen, 100))}</span>
      </div>
      {keterangan}
      {tingkat !== "normal" && peringatan}
    </div>
  );
}

/** Kartu kuota mahasiswa (FT-08 K-03..K-06). Hanya dirender untuk peran mahasiswa. */
export function KartuKuota({ kuota }: { kuota: KuotaPengguna | null }) {
  return (
    <Kartu as="section" radius="lg" className="flex scroll-mt-20 flex-col gap-4 expanded:p-6" id="kuota" aria-labelledby="judul-kuota">
      <h2 id="judul-kuota" className="text-title-medium text-on-surface">
        {T.bagianKuota}
      </h2>
      {kuota === null ? (
        <p role="status" className="text-body-medium text-on-surface-variant">
          {PESAN["MSG-G02"]}
        </p>
      ) : (
        <>
          <BarisKuota
            ikon="description"
            label={T.kuotaDokumen}
            teks={isiPlaceholder(TEKS.kuotaDokumen, { n: kuota.dokumen.terpakai, maks: kuota.dokumen.maks })}
            terpakai={kuota.dokumen.terpakai}
            maks={kuota.dokumen.maks}
            keterangan={
              <p className="text-body-small text-on-surface-variant">
                {isiPlaceholder(T.batasUnggah, { mb: kuota.maxUkuranMb, halaman: kuota.maxHalaman })}
              </p>
            }
            peringatan={
              <Banner
                nada={kuota.dokumen.terpakai >= kuota.dokumen.maks ? "error" : "warning"}
                aksi={
                  <TombolLink href={RUTE_AWAL.mahasiswa} varian="text" ukuran="sm">
                    {T.kelolaDokumen}
                  </TombolLink>
                }
              >
                {kuota.dokumen.terpakai >= kuota.dokumen.maks
                  ? pesan("MSG-U03", { maks: kuota.dokumen.maks })
                  : pesan("MSG-Q01", { jenis: T.jenisDokumen, n: kuota.dokumen.terpakai, maks: kuota.dokumen.maks })}
              </Banner>
            }
          />
          <Divider />
          <BarisKuota
            ikon="forum"
            label={T.kuotaTanya}
            teks={isiPlaceholder(T.pertanyaanDari, { n: kuota.tanya.terpakai, maks: kuota.tanya.maks })}
            terpakai={kuota.tanya.terpakai}
            maks={kuota.tanya.maks}
            // BR-17: hitungan harian WIB, terisi lagi 00.00 WIB (reset_at dari fn_sisa_kuota_tanya).
            keterangan={
              <p className="flex items-center gap-1 text-body-small text-on-surface-variant">
                <Ikon nama="schedule" ukuran={16} />
                <time dateTime={kuota.tanya.resetAt}>{TEKS.resetKuota}</time>
              </p>
            }
            peringatan={
              <Banner nada={kuota.tanya.sisa <= 0 ? "error" : "warning"}>
                {kuota.tanya.sisa <= 0
                  ? pesan("MSG-C02", { maks: kuota.tanya.maks })
                  : pesan("MSG-Q01", { jenis: T.jenisTanya, n: kuota.tanya.terpakai, maks: kuota.tanya.maks })}
              </Banner>
            }
          />
        </>
      )}
    </Kartu>
  );
}
