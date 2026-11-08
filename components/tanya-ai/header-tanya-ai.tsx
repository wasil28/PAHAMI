import { Ikon } from "@/components/ui";
import { PERINGATAN_KUOTA_PERSEN } from "@/lib/config";
import type { KuotaTanyaAi } from "@/lib/chat/tipe";
import { hitungPersen } from "@/lib/format";
import { isiPlaceholder, LABEL, pesan, TEKS } from "@/lib/pesan";
import { cn } from "@/lib/tema/cn";
import { TEKS_TANYA } from "./teks";

export type NadaKuota = "normal" | "peringatan" | "habis";

/** BR-17 + MSG-Q01: terpakai ≥ 80% → peringatan; sisa 0 → habis. */
export function nadaKuota(k: KuotaTanyaAi): NadaKuota {
  if (k.sisa <= 0) return "habis";
  return hitungPersen(k.terpakai, k.maks) >= PERINGATAN_KUOTA_PERSEN ? "peringatan" : "normal";
}

/** K-03: "Sisa n dari maks hari ini" — gaya ikut sisa kuota. */
function LabelKuota({ kuota }: { kuota: KuotaTanyaAi }) {
  const nada = nadaKuota(kuota);
  const teks = isiPlaceholder(TEKS.sisaKuotaTanya, { n: kuota.sisa, maks: kuota.maks });
  const peringatan =
    nada === "peringatan" ? pesan("MSG-Q01", { jenis: TEKS_TANYA.jenisKuota, n: kuota.terpakai, maks: kuota.maks }) : undefined;
  return (
    <span
      title={peringatan}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-0.5 text-label-medium tabular-nums",
        nada === "normal" && "text-on-surface-variant",
        nada === "peringatan" && "bg-warning-container text-on-warning-container",
        nada === "habis" && "bg-error-container text-on-error-container",
      )}
    >
      {nada !== "normal" && <Ikon nama={nada === "habis" ? "hourglass_disabled" : "warning"} ukuran={16} />}
      {teks}
      {peringatan && <span className="sr-only">. {peringatan}</span>}
    </span>
  );
}

/** K-02: judul + catatan sumber + kuota. Tetap di atas, riwayat yang bergulir. */
export function HeaderTanyaAI({ kuota }: { kuota: KuotaTanyaAi | null }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-outline-variant px-4 py-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-title-medium text-on-surface">
          <Ikon nama="auto_awesome" ukuran={20} className="text-primary" />
          {LABEL.tanyaAi}
        </h2>
        <p className="mt-0.5 flex items-center gap-1 text-body-small text-on-surface-variant">
          <Ikon nama="lock" ukuran={14} />
          {TEKS.jawabanHanyaDariDokumen}
        </p>
      </div>
      {kuota && <LabelKuota kuota={kuota} />}
    </header>
  );
}
