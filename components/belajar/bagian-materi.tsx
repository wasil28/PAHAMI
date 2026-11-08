import { Ikon } from "@/components/ui";
import { TeksTebal } from "./teks-tebal";
import { TEKS_BELAJAR } from "./teks";

/**
 * Bagian bersama ringkasan topik (S-08) dan halaman materi: poin penting sebagai checklist dua
 * kolom (gaya "Key points" kursus daring) dan kartu contoh. H2 per bagian agar pembaca layar bisa
 * melompat antarbagian; id dibuat unik per pemakaian lewat `idPrefix`.
 */
export function PoinPenting({ poin, idPrefix }: { poin: string[]; idPrefix: string }) {
  if (poin.length === 0) return null;
  const idJudul = `${idPrefix}-poin`;
  return (
    <section aria-labelledby={idJudul} className="mt-8 rounded-lg border border-outline-variant p-4 medium:p-6">
      <h2 id={idJudul} className="mb-4 text-title-medium text-on-surface">
        {TEKS_BELAJAR.poinPenting}
      </h2>
      <ul className="grid gap-x-6 gap-y-3 medium:grid-cols-2">
        {poin.map((p, i) => (
          <li key={i} className="flex gap-3 text-body-medium text-on-surface">
            <Ikon nama="check_circle" isi ukuran={20} className="mt-px shrink-0 text-primary" />
            <span>
              <TeksTebal teks={p} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function KartuContoh({ contoh, idPrefix }: { contoh: string; idPrefix: string }) {
  if (!contoh.trim()) return null;
  const idJudul = `${idPrefix}-contoh`;
  return (
    <section aria-labelledby={idJudul} className="mt-8 rounded-lg bg-tertiary-container p-4 text-on-tertiary-container medium:p-6">
      <h2 id={idJudul} className="mb-2 flex items-center gap-2 text-title-small">
        <Ikon nama="lightbulb" ukuran={20} />
        {TEKS_BELAJAR.contoh}
      </h2>
      <p className="text-body-large">
        <TeksTebal teks={contoh} />
      </p>
    </section>
  );
}
