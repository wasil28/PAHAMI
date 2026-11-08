import type { Ref } from "react";
import { Chip, Ikon, Tombol } from "@/components/ui";
import { TEKS, isiPlaceholder } from "@/lib/pesan";
import { cn } from "@/lib/tema/cn";
import { TEKS_LATIHAN } from "./teks";

type Props = {
  isBenar: boolean;
  /** Huruf jawaban benar sesuai posisi TAMPIL (yang dilihat pengguna). */
  hurufBenar: string;
  pembahasan: string;
  halamanRujukan: number;
  onTanyaAI: () => void;
  refJudul: Ref<HTMLParagraphElement>;
};

/** K-06 (+ K-08 bila salah): kepala benar/salah, pembahasan, chip halaman rujukan. aria-live polite. */
export function UmpanBalikJawaban({ isBenar, hurufBenar, pembahasan, halamanRujukan, onTanyaAI, refJudul }: Props) {
  return (
    <div aria-live="polite" className="mt-6 animate-masuk overflow-hidden rounded-md">
      <p
        ref={refJudul}
        tabIndex={-1}
        className={cn(
          "flex items-center gap-2 px-4 py-3 text-title-medium outline-none",
          isBenar ? "bg-success-container text-on-success-container" : "bg-error-container text-on-error-container",
        )}
      >
        <Ikon nama={isBenar ? "check_circle" : "cancel"} isi />
        {isBenar ? TEKS.benar : isiPlaceholder(TEKS.belumTepat, { huruf: hurufBenar })}
      </p>
      <div className="bg-surface-container-low px-4 py-3 text-on-surface">
        <p className="text-title-small">{TEKS_LATIHAN.pembahasan}</p>
        <p className="mt-1 text-body-large">{pembahasan}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip varian="info" ikon="menu_book" label={`hal. ${halamanRujukan}`} />
          {!isBenar && (
            <Tombol varian="text" ikon="forum" onClick={onTanyaAI}>
              {TEKS_LATIHAN.masihBingung}
            </Tombol>
          )}
        </div>
      </div>
    </div>
  );
}
