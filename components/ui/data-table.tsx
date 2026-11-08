import type { ReactNode } from "react";
import { cn } from "@/lib/tema/cn";

export type KolomTabel<T> = {
  kunci: string;
  judul: ReactNode;
  /** Isi sel; default `String(baris[kunci])`. */
  render?: (baris: T) => ReactNode;
  rata?: "kiri" | "kanan" | "tengah";
  /** Kelas tambahan sel (mis. lebar). */
  className?: string;
};

export type DataTableProps<T> = {
  kolom: KolomTabel<T>[];
  data: T[];
  kunciBaris: (baris: T) => string;
  /** Judul tabel untuk pembaca layar (caption). */
  keterangan: string;
  /**
   * Tampilan kartu per baris untuk layar compact (< 600px). Bila tidak diisi,
   * tabel tetap tampil dengan gulir horizontal.
   */
  kartuCompact?: (baris: T) => ReactNode;
  /** Isi saat data kosong (mis. <EmptyState ringkas …/>). */
  kosong?: ReactNode;
  className?: string;
};

const rataKelas = { kiri: "text-left", kanan: "text-right", tengah: "text-center" } as const;

/** Data table M3 di dalam kartu; di compact berganti daftar kartu (Panduan §1.8). */
export function DataTable<T>({ kolom, data, kunciBaris, keterangan, kartuCompact, kosong, className }: DataTableProps<T>) {
  if (data.length === 0 && kosong) return <div className={className}>{kosong}</div>;
  return (
    <div className={className}>
      {kartuCompact && (
        <ul role="list" aria-label={keterangan} className="flex flex-col gap-3 medium:hidden">
          {data.map((b) => (
            <li key={kunciBaris(b)}>{kartuCompact(b)}</li>
          ))}
        </ul>
      )}
      <div className={cn("scrollbar-tipis overflow-x-auto rounded-md border border-outline-variant bg-surface", kartuCompact && "hidden medium:block")}>
        <table className="w-full border-collapse text-body-medium">
          <caption className="sr-only">{keterangan}</caption>
          <thead className="bg-surface-container">
            <tr>
              {kolom.map((k) => (
                <th key={k.kunci} scope="col" className={cn("h-12 px-4 text-title-small whitespace-nowrap text-on-surface-variant", rataKelas[k.rata ?? "kiri"], k.className)}>
                  {k.judul}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((b) => (
              <tr key={kunciBaris(b)} className="border-t border-outline-variant transition-colors hover:bg-on-surface/4">
                {kolom.map((k) => (
                  <td key={k.kunci} className={cn("h-13 px-4 py-2 text-on-surface", rataKelas[k.rata ?? "kiri"], k.className)}>
                    {k.render ? k.render(b) : String((b as Record<string, unknown>)[k.kunci] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
