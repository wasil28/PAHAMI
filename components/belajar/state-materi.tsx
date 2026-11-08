import { Ikon, ProgressLinear, Skeleton, Tombol, TombolLink } from "@/components/ui";
import { LABEL, PESAN } from "@/lib/pesan";
import { TEKS_BELAJAR } from "./teks";

/** K-12: menyiapkan ringkasan pertama kali (MSG-B02) — linear indeterminate + kerangka (Panduan §1.8). */
export function StateMenyiapkanMateri() {
  return (
    <div className="max-w-[70ch]">
      <div className="rounded-md bg-surface-container p-4">
        <ProgressLinear label={PESAN["MSG-B02"]} />
        <p className="mt-3 text-body-medium text-on-surface-variant">{PESAN["MSG-B02"]}</p>
      </div>
      <div aria-hidden className="mt-6 flex flex-col gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="mt-4 h-5 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <p className="mt-6 text-body-medium text-on-surface-variant expanded:hidden">{TEKS_BELAJAR.tungguTanya}</p>
    </div>
  );
}

/**
 * K-13: pembuatan gagal (MSG-B01). Filled tetap satu (Coba lagi); latihan menjadi Outlined
 * karena latihan tidak bergantung pada ringkasan.
 */
export function StateGagalMateri({ onCobaLagi, hrefLatihan }: { onCobaLagi: () => void; hrefLatihan: string }) {
  return (
    <div className="max-w-[70ch]">
      <div role="alert" className="flex flex-col items-center gap-3 rounded-md bg-error-container p-6 text-center text-on-error-container">
        <Ikon nama="error" ukuran={48} />
        <p className="text-body-large">{PESAN["MSG-B01"]}</p>
        <Tombol ikon="refresh" onClick={onCobaLagi}>
          {LABEL.cobaLagi}
        </Tombol>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="text-body-medium text-on-surface-variant">{TEKS_BELAJAR.bantuGagal}</p>
        <TombolLink varian="outlined" href={hrefLatihan} ikon="quiz">
          {LABEL.latihan}
        </TombolLink>
      </div>
    </div>
  );
}
