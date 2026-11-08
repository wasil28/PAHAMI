import { Fragment } from "react";
import { Ikon } from "@/components/ui";
import { cn } from "@/lib/tema/cn";
import { TEKS_BELAJAR } from "./teks";

// Diagram "alur" & "siklus" (KEPUTUSAN §4): digambar dari data dengan flex/grid + SVG seperlunya,
// warna hanya lewat token sehingga ikut tema terang/gelap. Responsif lewat container query
// (@container di DiagramMateri) karena lebar kolom materi berbeda dengan lebar layar.

export type Simpul = { label: string; keterangan?: string };

function Nomor({ n, kecil = false }: { n: number; kecil?: boolean }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-primary text-on-primary",
        kecil ? "size-6 text-label-medium" : "size-7 text-label-large",
      )}
    >
      {n}
    </span>
  );
}

function KotakLangkah({ s, n, className }: { s: Simpul; n: number; className?: string }) {
  return (
    <div className={cn("flex gap-3 rounded-md bg-surface-container-high p-3", className)}>
      <Nomor n={n} />
      <div className="min-w-0">
        <p className="text-title-small text-on-surface">{s.label}</p>
        {s.keterangan && <p className="mt-0.5 text-body-small text-on-surface-variant">{s.keterangan}</p>}
      </div>
    </div>
  );
}

/** Langkah vertikal dengan panah ke bawah; `siklus` menambah baris "kembali ke langkah 1". */
function LangkahVertikal({ langkah, siklus = false, className }: { langkah: Simpul[]; siklus?: boolean; className?: string }) {
  return (
    <ol className={cn("flex flex-col", siklus && "border-l-2 border-dashed border-primary pl-3", className)}>
      {langkah.map((s, i) => (
        <li key={i}>
          {i > 0 && <Ikon nama="arrow_downward" ukuran={20} className="my-1 ml-[18px] text-primary" />}
          <KotakLangkah s={s} n={i + 1} />
        </li>
      ))}
      {siklus && (
        <li className="mt-2 flex items-center gap-2 text-label-large text-primary">
          <Ikon nama="replay" ukuran={20} />
          {TEKS_BELAJAR.kembaliKeAwal}
        </li>
      )}
    </ol>
  );
}

export function DiagramAlur({ langkah }: { langkah: Simpul[] }) {
  // ≤ 4 langkah muat mendatar di kolom lebar; lebih dari itu selalu vertikal agar tetap terbaca.
  const bisaMendatar = langkah.length <= 4;
  const mendatar = langkah.length <= 3 ? "@xl:flex" : "@2xl:flex";
  const sembunyi = langkah.length <= 3 ? "@xl:hidden" : "@2xl:hidden";
  return (
    <>
      {bisaMendatar && (
        <ol className={cn("hidden items-stretch gap-2", mendatar)}>
          {langkah.map((s, i) => (
            <Fragment key={i}>
              {i > 0 && (
                <li aria-hidden className="flex items-center">
                  <Ikon nama="arrow_forward" className="text-primary" />
                </li>
              )}
              <li className="flex min-w-0 flex-1">
                <div className="flex w-full flex-col gap-2 rounded-md border-t-4 border-primary bg-surface-container-high p-3">
                  <Nomor n={i + 1} />
                  <p className="text-title-small text-on-surface">{s.label}</p>
                  {s.keterangan && <p className="text-body-small text-on-surface-variant">{s.keterangan}</p>}
                </div>
              </li>
            </Fragment>
          ))}
        </ol>
      )}
      <LangkahVertikal langkah={langkah} className={bisaMendatar ? sembunyi : undefined} />
    </>
  );
}

const RX = 38; // jari-jari elips dalam satuan viewBox (lebar 100)
const RY = 30; // tinggi viewBox 75 (rasio 4:3)
const PUSAT_Y = 37.5;

function titik(sudut: number): [number, number] {
  return [50 + RX * Math.cos(sudut), PUSAT_Y + RY * Math.sin(sudut)];
}

const fmt = (v: number) => v.toFixed(2);

/**
 * Segitiga kepala panah di ujung busur, searah garis singgung elips. Digambar manual (bukan
 * <marker>) agar tidak butuh id unik — diagram bisa muncul lebih dari sekali di satu halaman.
 */
function kepalaPanah(sudutAkhir: number): string {
  const [x, y] = titik(sudutAkhir);
  const dx = -RX * Math.sin(sudutAkhir);
  const dy = RY * Math.cos(sudutAkhir);
  const pjg = Math.hypot(dx, dy);
  const [ux, uy] = [dx / pjg, dy / pjg];
  const PANJANG = 2.4;
  const LEBAR = 1.4;
  const ujung = [x + ux * PANJANG * 0.5, y + uy * PANJANG * 0.5];
  const dasar = [x - ux * PANJANG * 0.5, y - uy * PANJANG * 0.5];
  const kiri = [dasar[0] - uy * LEBAR, dasar[1] + ux * LEBAR];
  const kanan = [dasar[0] + uy * LEBAR, dasar[1] - ux * LEBAR];
  return `M${fmt(ujung[0])} ${fmt(ujung[1])} L${fmt(kiri[0])} ${fmt(kiri[1])} L${fmt(kanan[0])} ${fmt(kanan[1])} Z`;
}

export function DiagramSiklus({ langkah }: { langkah: Simpul[] }) {
  const n = langkah.length;
  const langkahSudut = (2 * Math.PI) / n;
  const sudut = (i: number) => -Math.PI / 2 + i * langkahSudut;
  // Celah busur di sekitar kotak supaya kepala panah tidak tertutup kotak berikutnya.
  const celah = langkahSudut * (n >= 5 ? 0.38 : 0.3);
  const adaKeterangan = langkah.some((s) => s.keterangan);

  return (
    <>
      <div className="hidden @xl:block">
        <div className="relative mx-auto aspect-[4/3] w-full max-w-[560px]">
          <svg viewBox="0 0 100 75" className="absolute inset-0 size-full text-primary" fill="none">
            {langkah.map((_, i) => {
              const [x1, y1] = titik(sudut(i) + celah);
              const akhir = sudut(i + 1) - celah;
              const [x2, y2] = titik(akhir);
              return (
                <g key={i}>
                  <path
                    d={`M${fmt(x1)} ${fmt(y1)} A${RX} ${RY} 0 0 1 ${fmt(x2)} ${fmt(y2)}`}
                    stroke="currentColor"
                    strokeWidth={0.6}
                    strokeLinecap="round"
                  />
                  <path d={kepalaPanah(akhir)} fill="currentColor" />
                </g>
              );
            })}
          </svg>
          <div className="absolute top-1/2 left-1/2 grid -translate-1/2 place-items-center text-primary">
            <Ikon nama="autorenew" ukuran={40} />
          </div>
          {langkah.map((s, i) => {
            const [x, y] = titik(sudut(i));
            return (
              <div
                key={i}
                className={cn(
                  "absolute flex -translate-1/2 flex-col items-center gap-1 rounded-md bg-surface-container-high px-2 py-2 text-center shadow-1",
                  n >= 5 ? "w-[24%]" : "w-[30%]",
                )}
                // Dibulatkan agar hasil SSR & klien identik (hindari selisih hidrasi).
                style={{ left: `${fmt(x)}%`, top: `${fmt((y / 75) * 100)}%` }}
              >
                <Nomor n={i + 1} kecil />
                <p className="line-clamp-3 text-title-small text-on-surface">{s.label}</p>
              </div>
            );
          })}
        </div>
        {adaKeterangan && (
          <ol className="mt-4 grid gap-x-6 gap-y-2 @2xl:grid-cols-2">
            {langkah.map((s, i) =>
              s.keterangan ? (
                <li key={i} className="flex gap-2 text-body-small text-on-surface-variant">
                  <Nomor n={i + 1} kecil />
                  <span className="pt-1">
                    <span className="font-semibold text-on-surface">{s.label}:</span> {s.keterangan}
                  </span>
                </li>
              ) : null,
            )}
          </ol>
        )}
      </div>
      <LangkahVertikal langkah={langkah} siklus className="@xl:hidden" />
    </>
  );
}
