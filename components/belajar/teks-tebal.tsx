import { Fragment } from "react";

/**
 * Teks AI dengan **tebal** sederhana (FT-04 K-07, pertanyaan terbuka #5: hanya teks polos + tebal).
 * Tidak memakai HTML mentah sehingga aman dari isi dokumen yang berisi markup.
 */
export function TeksTebal({ teks }: { teks: string }) {
  const bagian = teks.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {bagian.map((b, i) =>
        b.startsWith("**") && b.endsWith("**") && b.length > 4 ? (
          <strong key={i} className="font-semibold">
            {b.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{b}</Fragment>
        ),
      )}
    </>
  );
}
