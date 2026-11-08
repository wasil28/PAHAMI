import { Ikon } from "@/components/ui";
import { cn } from "@/lib/tema/cn";
import type { Simpul } from "./diagram-alur";

// Diagram "hierarki", "perbandingan", "komponen" — lihat catatan di diagram-alur.tsx.

type Cabang = { label: string; anak?: string[] };

function Anak({ anak, rata = "tengah" }: { anak?: string[]; rata?: "tengah" | "kiri" }) {
  if (!anak?.length) return null;
  return (
    <ul className={cn("mt-2 flex flex-wrap gap-1.5", rata === "tengah" && "justify-center")}>
      {anak.map((a, i) => (
        <li key={i} className="rounded-sm bg-surface-container-highest px-2 py-1 text-body-small text-on-surface">
          {a}
        </li>
      ))}
    </ul>
  );
}

export function DiagramHierarki({ akar, cabang }: { akar: string; cabang: Cabang[] }) {
  // Pohon mendatar butuh ruang per cabang; ≤ 3 cabang cukup @lg, lebih banyak @2xl.
  const lebar = cabang.length <= 3 ? "@lg:block" : "@2xl:block";
  const sempit = cabang.length <= 3 ? "@lg:hidden" : "@2xl:hidden";
  return (
    <>
      <div className={cn("hidden", lebar)}>
        <div className="mx-auto w-fit max-w-full rounded-md bg-primary px-5 py-2.5 text-center text-title-medium text-on-primary">
          {akar}
        </div>
        <div className="mx-auto h-5 w-0.5 bg-outline-variant" />
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${cabang.length}, minmax(0, 1fr))` }}>
          {cabang.map((c, i) => (
            <li
              key={i}
              className={cn(
                "relative px-1.5 pt-5",
                // Garis penghubung: tegak ke tiap cabang + mendatar antarcabang (tanpa celah grid).
                "before:absolute before:top-0 before:left-1/2 before:h-5 before:w-0.5 before:-translate-x-1/2 before:bg-outline-variant",
                "after:absolute after:top-0 after:h-0.5 after:bg-outline-variant",
                i === 0 ? "after:left-1/2" : "after:left-0",
                i === cabang.length - 1 ? "after:right-1/2" : "after:right-0",
              )}
            >
              <div className="rounded-md bg-secondary-container px-3 py-2 text-center text-title-small text-on-secondary-container">
                {c.label}
              </div>
              <Anak anak={c.anak} />
            </li>
          ))}
        </ul>
      </div>

      <div className={sempit}>
        <div className="w-fit max-w-full rounded-md bg-primary px-4 py-2 text-title-medium text-on-primary">{akar}</div>
        <ul className="ml-4 border-l-2 border-outline-variant">
          {cabang.map((c, i) => (
            <li key={i} className="relative pt-3 pl-5 before:absolute before:top-[30px] before:left-0 before:h-0.5 before:w-4 before:bg-outline-variant">
              <div className="w-fit max-w-full rounded-md bg-secondary-container px-3 py-2 text-title-small text-on-secondary-container">
                {c.label}
              </div>
              <Anak anak={c.anak} rata="kiri" />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

const AKSEN_KOLOM = [
  "bg-primary-container text-on-primary-container",
  "bg-secondary-container text-on-secondary-container",
  "bg-tertiary-container text-on-tertiary-container",
  "bg-surface-container-highest text-on-surface",
] as const;

export function DiagramPerbandingan({ kolom }: { kolom: { label: string; butir: string[] }[] }) {
  const grid =
    kolom.length === 2 ? "@lg:grid-cols-2" : kolom.length === 3 ? "@lg:grid-cols-2 @2xl:grid-cols-3" : "@lg:grid-cols-2 @4xl:grid-cols-4";
  return (
    <ul className={cn("grid gap-3", grid)}>
      {kolom.map((k, i) => (
        <li key={i} className="flex flex-col overflow-hidden rounded-md bg-surface-container-high">
          <p className={cn("px-4 py-2.5 text-title-small", AKSEN_KOLOM[i % AKSEN_KOLOM.length])}>{k.label}</p>
          <ul className="flex flex-col gap-2 p-4">
            {k.butir.map((b, j) => (
              <li key={j} className="flex gap-2 text-body-medium text-on-surface">
                <Ikon nama="check" ukuran={18} className="mt-px shrink-0 text-primary" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

// Sel 3×3 (baris, kolom) yang ditempati bagian di sekitar pusat, dipilih agar seimbang.
type Sel = readonly [number, number];
const N: Sel = [1, 2], NE: Sel = [1, 3], E: Sel = [2, 3], SE: Sel = [3, 3];
const S: Sel = [3, 2], SW: Sel = [3, 1], W: Sel = [2, 1], NW: Sel = [1, 1];
const TATA_SEL: Record<number, readonly Sel[]> = {
  3: [N, SE, SW],
  4: [N, E, S, W],
  5: [N, E, SE, SW, W],
  6: [NW, NE, E, SE, SW, W],
  7: [NW, N, NE, E, SE, SW, W],
  8: [NW, N, NE, E, SE, S, SW, W],
};

export function DiagramKomponen({ pusat, bagian }: { pusat: string; bagian: Simpul[] }) {
  const sel = TATA_SEL[bagian.length] ?? TATA_SEL[8];
  const tampil = bagian.slice(0, sel.length);
  return (
    <>
      <div className="relative hidden grid-cols-3 grid-rows-3 gap-3 @2xl:grid">
        {/* Garis dari pusat ke tiap bagian; viewBox tak proporsional + non-scaling-stroke agar tetap lurus & tipis. */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full text-outline-variant">
          {tampil.map((_, i) => (
            <line
              key={i}
              x1={50}
              y1={50}
              x2={((sel[i][1] - 0.5) / 3) * 100}
              y2={((sel[i][0] - 0.5) / 3) * 100}
              stroke="currentColor"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <div className="relative col-start-2 row-start-2 grid min-w-3/5 place-items-center self-center justify-self-center rounded-xl bg-primary px-6 py-4 text-center ring-4 ring-primary-container text-title-medium text-on-primary shadow-1">
          {pusat}
        </div>
        {tampil.map((b, i) => (
          <div
            key={i}
            className="relative self-center rounded-md border border-outline-variant bg-surface-container-high p-3"
            style={{ gridRow: sel[i][0], gridColumn: sel[i][1] }}
          >
            <p className="text-title-small text-on-surface">{b.label}</p>
            {b.keterangan && <p className="mt-0.5 line-clamp-3 text-body-small text-on-surface-variant">{b.keterangan}</p>}
          </div>
        ))}
      </div>

      <div className="@2xl:hidden">
        <div className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-title-medium text-on-primary">
          <Ikon nama="hub" ukuran={20} />
          {pusat}
        </div>
        <ul className="mt-3 grid gap-2 @md:grid-cols-2">
          {bagian.map((b, i) => (
            <li key={i} className="flex gap-2 rounded-md bg-surface-container-high p-3">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
              <span className="min-w-0">
                <span className="block text-title-small text-on-surface">{b.label}</span>
                {b.keterangan && <span className="mt-0.5 block text-body-small text-on-surface-variant">{b.keterangan}</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
