import { Ikon, ProgressLinear, Skeleton, Tombol, TombolLink } from "@/components/ui";
import { LABEL, PESAN } from "@/lib/pesan";

/** K-09: menyiapkan 5 soal pertama kali (MSG-L01) — bisa > 10 detik. */
export function StateMenyiapkanSoal() {
  return (
    <div aria-busy>
      <ProgressLinear label={PESAN["MSG-L01"]} />
      <p className="mt-3 text-body-large text-on-surface-variant" aria-live="polite">
        {PESAN["MSG-L01"]}
      </p>
      <div aria-hidden className="mt-6 flex flex-col gap-3">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-2/3" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

/** K-10: pembuatan soal gagal (MSG-L02) + Coba lagi + Kembali ke materi. */
export function StateGagalSoal({ onCobaLagi, hrefMateri }: { onCobaLagi: () => void; hrefMateri: string }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
      <Ikon nama="error" ukuran={48} className="text-error" />
      <p className="text-body-large text-on-surface">{PESAN["MSG-L02"]}</p>
      <Tombol ikon="refresh" onClick={onCobaLagi}>
        {LABEL.cobaLagi}
      </Tombol>
      <TombolLink varian="text" href={hrefMateri}>
        {LABEL.kembaliKeMateri}
      </TombolLink>
    </div>
  );
}
