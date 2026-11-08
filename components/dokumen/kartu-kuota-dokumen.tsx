import { Ikon, Kartu, ProgressLinear } from "@/components/ui";
import { cn } from "@/lib/tema/cn";
import { isiPlaceholder, TEKS } from "@/lib/pesan";
import { hitungPersen } from "@/lib/format";
import type { KuotaDokumen } from "@/lib/dokumen/tipe";
import { isKuotaPenuh } from "@/lib/dokumen/tipe";

/** KartuKuotaDokumen (FT-02 K-07): "{n} dari {maks} dokumen terpakai" (BR-04, B13: bisa > maks). */
export function KartuKuotaDokumen({ kuota, className }: { kuota: KuotaDokumen; className?: string }) {
  const penuh = isKuotaPenuh(kuota);
  const teks = isiPlaceholder(TEKS.kuotaDokumen, { n: kuota.terpakai, maks: kuota.maks });
  return (
    <Kartu className={cn(penuh && "bg-error-container text-on-error-container", className)}>
      <p className="mb-3 flex items-center gap-2 text-title-small">
        <Ikon nama={penuh ? "block" : "folder"} ukuran={20} className={penuh ? "" : "text-primary"} />
        {teks}
      </p>
      <ProgressLinear nilai={hitungPersen(kuota.terpakai, kuota.maks)} label={teks} nada={penuh ? "error" : "primary"} />
    </Kartu>
  );
}
