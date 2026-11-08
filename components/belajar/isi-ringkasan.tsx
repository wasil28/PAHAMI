import type { RingkasanTopik } from "@/lib/data/topik";
import { KartuContoh, PoinPenting } from "./bagian-materi";
import { DaftarRujukan } from "./daftar-rujukan";
import { TeksTebal } from "./teks-tebal";
import { TEKS_BELAJAR } from "./teks";

/**
 * K-06…K-09: konsep inti (ditampilkan sebagai "Tentang topik ini"), poin penting (checklist dua
 * kolom), contoh sehari-hari, rujukan halaman (BR-10, BR-30). Teks Body Large, lebar ±70 karakter.
 */
export function IsiRingkasan({ ringkasan, judulDokumen }: { ringkasan: RingkasanTopik; judulDokumen: string }) {
  return (
    <div className="max-w-[70ch] animate-masuk text-on-surface">
      <section aria-labelledby="judul-konsep">
        <h2 id="judul-konsep" className="mb-2 text-title-large">
          {TEKS_BELAJAR.tentangTopik}
        </h2>
        <p className="text-body-large text-on-surface-variant">
          <TeksTebal teks={ringkasan.konsepInti} />
        </p>
      </section>

      <PoinPenting poin={ringkasan.poinPenting} idPrefix="ringkasan" />
      <KartuContoh contoh={ringkasan.contoh} idPrefix="ringkasan" />

      {ringkasan.rujukan.length > 0 && <DaftarRujukan rujukan={ringkasan.rujukan} judulDokumen={judulDokumen} />}
    </div>
  );
}
