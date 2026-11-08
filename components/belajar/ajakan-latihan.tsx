import { TombolLink } from "@/components/ui";
import { JUMLAH_SOAL } from "@/lib/config";
import { LABEL, isiPlaceholder } from "@/lib/pesan";
import type { StatusTopik } from "@/types/database";
import { TEKS_BELAJAR } from "./teks";

/** K-10: satu-satunya Filled di kolom materi. Topik selesai → teks versi ulang, label tombol tetap. */
export function AjakanLatihan({ hrefLatihan, status }: { hrefLatihan: string; status: StatusTopik }) {
  const teks = status === "selesai" ? TEKS_BELAJAR.ajakanUlang : isiPlaceholder(TEKS_BELAJAR.ajakanLatihan, { jumlah: JUMLAH_SOAL });
  return (
    <div className="mt-8 flex max-w-[70ch] flex-col gap-4 rounded-md bg-surface-container p-4 medium:flex-row medium:items-center medium:justify-between">
      <p className="text-title-medium text-on-surface">{teks}</p>
      <TombolLink href={hrefLatihan} ikon="quiz" className="w-full medium:w-auto">
        {LABEL.mulaiLatihan}
      </TombolLink>
    </div>
  );
}
