import { Kartu } from "@/components/ui";
import { formatRupiah } from "@/lib/format";

// Label fitur sesuai log_pemakaian_ai.fitur (KEPUTUSAN-IMPLEMENTASI §4).
const LABEL_FITUR: Record<string, string> = {
  indeks: "Indeks dokumen",
  topik: "Penyusunan topik",
  ringkasan: "Ringkasan topik",
  materi: "Materi detail & diagram",
  sampul: "Gambar sampul",
  soal: "Soal latihan",
  tanya_ai: "Tanya AI",
};

/** Rincian estimasi biaya per fitur AI dalam rentang terpilih (BR-27). */
export function RincianBiaya({ perFitur, hari }: { perFitur: Record<string, number>; hari: number }) {
  const entri = Object.entries(perFitur);
  const total = entri.reduce((s, [, v]) => s + v, 0);
  return (
    <Kartu as="section" padding="md" radius="lg" aria-labelledby="judul-rincian-biaya" className="flex flex-col gap-4">
      <h3 id="judul-rincian-biaya" className="text-title-medium">
        Biaya per fitur ({hari} hari)
      </h3>
      {total <= 0 ? (
        <p className="text-body-medium text-on-surface-variant">Belum ada biaya AI dalam {hari} hari terakhir.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entri.map(([fitur, biaya]) => {
            const persen = Math.round((biaya / total) * 100);
            return (
              <li key={fitur} className="flex flex-col gap-1">
                <div className="flex justify-between gap-2 text-body-medium">
                  <span>{LABEL_FITUR[fitur] ?? fitur}</span>
                  <span className="tabular-nums text-on-surface-variant">
                    {formatRupiah(biaya)} · {persen}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-container-highest" aria-hidden>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${persen}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Kartu>
  );
}
