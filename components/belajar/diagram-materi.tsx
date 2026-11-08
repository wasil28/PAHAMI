import { Ikon } from "@/components/ui";
import type { Diagram, JenisDiagram } from "@/lib/materi/tipe";
import { cn } from "@/lib/tema/cn";
import { DiagramAlur, DiagramSiklus } from "./diagram-alur";
import { DiagramHierarki, DiagramKomponen, DiagramPerbandingan } from "./diagram-struktur";
import { TEKS_BELAJAR } from "./teks";

const IKON: Record<JenisDiagram, string> = {
  alur: "conversion_path",
  siklus: "autorenew",
  hierarki: "account_tree",
  perbandingan: "compare",
  komponen: "hub",
};

function teksSimpul(s: { label: string; keterangan?: string }): string {
  return s.keterangan ? `${s.label}: ${s.keterangan}` : s.label;
}

/** Padanan teks untuk pembaca layar; visual diagram sendiri aria-hidden. */
function TeksAlternatif({ diagram }: { diagram: Diagram }) {
  switch (diagram.jenis) {
    case "alur":
    case "siklus":
      return (
        <>
          <ol>
            {diagram.langkah.map((s, i) => (
              <li key={i}>{teksSimpul(s)}</li>
            ))}
          </ol>
          {diagram.jenis === "siklus" && <p>{TEKS_BELAJAR.urutanSiklus}</p>}
        </>
      );
    case "hierarki":
      return (
        <>
          <p>{diagram.akar}</p>
          <ul>
            {diagram.cabang.map((c, i) => (
              <li key={i}>
                {c.label}
                {c.anak?.length ? <ul>{c.anak.map((a, j) => <li key={j}>{a}</li>)}</ul> : null}
              </li>
            ))}
          </ul>
        </>
      );
    case "perbandingan":
      return (
        <ul>
          {diagram.kolom.map((k, i) => (
            <li key={i}>
              {k.label}
              <ul>{k.butir.map((b, j) => <li key={j}>{b}</li>)}</ul>
            </li>
          ))}
        </ul>
      );
    case "komponen":
      return (
        <>
          <p>{diagram.pusat}</p>
          <ul>
            {diagram.bagian.map((b, i) => (
              <li key={i}>{teksSimpul(b)}</li>
            ))}
          </ul>
        </>
      );
  }
}

function Visual({ diagram }: { diagram: Diagram }) {
  switch (diagram.jenis) {
    case "alur":
      return <DiagramAlur langkah={diagram.langkah} />;
    case "siklus":
      return <DiagramSiklus langkah={diagram.langkah} />;
    case "hierarki":
      return <DiagramHierarki akar={diagram.akar} cabang={diagram.cabang} />;
    case "perbandingan":
      return <DiagramPerbandingan kolom={diagram.kolom} />;
    case "komponen":
      return <DiagramKomponen pusat={diagram.pusat} bagian={diagram.bagian} />;
  }
}

/**
 * Diagram materi (KEPUTUSAN §4): digambar aplikasi dari data terstruktur (bukan gambar AI),
 * murni HTML/CSS + SVG seperlunya, tanpa pustaka tambahan. Server-renderable. `@container`
 * membuat tata letak mengikuti lebar kartu, bukan lebar layar (kolom materi menyempit di
 * Expanded karena ada kolom kanan).
 */
export function DiagramMateri({ diagram, className }: { diagram: Diagram; className?: string }) {
  return (
    <figure className={cn("@container rounded-lg bg-surface-container-low p-4 text-on-surface medium:p-6", className)}>
      <figcaption className="mb-5 flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-container text-on-primary-container">
          <Ikon nama={IKON[diagram.jenis]} ukuran={22} />
        </span>
        <span className="min-w-0">
          <span className="block text-label-medium text-on-surface-variant">{TEKS_BELAJAR.jenisDiagram[diagram.jenis]}</span>
          <span className="block text-title-medium">{diagram.judul}</span>
        </span>
      </figcaption>
      <div aria-hidden>
        <Visual diagram={diagram} />
      </div>
      <div className="sr-only">
        <TeksAlternatif diagram={diagram} />
      </div>
    </figure>
  );
}
