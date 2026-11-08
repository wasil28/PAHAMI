import type { ReactNode, Ref } from "react";

/** K-02: judul + sub-judul layar auth. Satu-satunya h1 halaman. */
export function JudulAuth({
  judul,
  subjudul,
  ref,
}: {
  judul: ReactNode;
  subjudul?: ReactNode;
  /** Untuk memindahkan fokus program saat state berganti (S-04 terkirim, S-05 tidak berlaku). */
  ref?: Ref<HTMLHeadingElement>;
}) {
  return (
    <div className="mb-6">
      <h1 ref={ref} tabIndex={ref ? -1 : undefined} className="text-headline-small text-on-surface outline-none expanded:text-headline-medium">
        {judul}
      </h1>
      {subjudul && <p className="mt-2 text-body-medium text-on-surface-variant">{subjudul}</p>}
    </div>
  );
}

/** Baris tautan bawah, mis. "Belum punya akun? Daftar" (K-08/K-10). */
export function BarisTautan({ teks, children }: { teks: ReactNode; children: ReactNode }) {
  return (
    <p className="mt-6 flex flex-wrap items-center justify-center gap-x-1 text-body-medium text-on-surface-variant">
      <span>{teks}</span>
      {children}
    </p>
  );
}
