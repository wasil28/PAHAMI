import type { IsiMateri } from "@/lib/materi/tipe";
import { KartuContoh, PoinPenting } from "./bagian-materi";
import { DaftarRujukan } from "./daftar-rujukan";
import { DiagramMateri } from "./diagram-materi";
import { PenjelasanMateri } from "./penjelasan-materi";
import { TEKS_BELAJAR } from "./teks";

/** Isi satu halaman materi: diagram (gambaran besar) → penjelasan → poin penting → contoh → rujukan (BR-10, BR-30). */
export function TampilanIsiMateri({ isi, judulDokumen }: { isi: IsiMateri; judulDokumen: string }) {
  return (
    <div className="animate-masuk text-on-surface">
      {isi.diagram && (
        <section aria-labelledby="judul-diagram" className="mb-8">
          <h2 id="judul-diagram" className="sr-only">
            {TEKS_BELAJAR.diagram}
          </h2>
          <DiagramMateri diagram={isi.diagram} />
        </section>
      )}
      <section aria-labelledby="judul-penjelasan" className="max-w-[70ch]">
        <h2 id="judul-penjelasan" className="sr-only">
          {TEKS_BELAJAR.penjelasan}
        </h2>
        <PenjelasanMateri teks={isi.penjelasan} />
      </section>


      <div className="max-w-[70ch]">
        <PoinPenting poin={isi.poinPenting} idPrefix="materi" />
        <KartuContoh contoh={isi.contoh} idPrefix="materi" />
        {isi.rujukan.length > 0 && <DaftarRujukan rujukan={isi.rujukan} judulDokumen={judulDokumen} />}
      </div>
    </div>
  );
}
