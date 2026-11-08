import Link from "next/link";
import { Ikon } from "@/components/ui";
import { LABEL, isiPlaceholder } from "@/lib/pesan";
import { TEKS_BELAJAR } from "./teks";

const MAKS_JUDUL_BREADCRUMB = 40; // FT-04 K-02: judul panjang dipotong

function potong(teks: string): string {
  return teks.length > MAKS_JUDUL_BREADCRUMB ? `${teks.slice(0, MAKS_JUDUL_BREADCRUMB - 1)}…` : teks;
}

type Props = {
  dokumenId: number;
  judulDokumen: string;
  urutanTopik: number;
  /** Item tambahan setelah topik (mis. "Hasil latihan" di S-10). */
  ekor?: string;
  /** href topik bila ada ekor (topik menjadi tautan). */
  hrefTopik?: string;
};

/**
 * Compact/Medium: tautan kembali ke dokumen (K-01). Expanded: breadcrumb
 * "Beranda / {judul dokumen} / Topik {n}" (K-02) dengan aria-current di item terakhir.
 */
export function BreadcrumbTopik({ dokumenId, judulDokumen, urutanTopik, ekor, hrefTopik }: Props) {
  const hrefDokumen = `/dokumen/${dokumenId}`;
  const labelTopik = isiPlaceholder(TEKS_BELAJAR.topikN, { n: urutanTopik });
  const item: { label: string; href?: string }[] = [
    { label: TEKS_BELAJAR.beranda, href: "/beranda" },
    { label: potong(judulDokumen), href: hrefDokumen },
    { label: labelTopik, href: ekor ? hrefTopik : undefined },
    ...(ekor ? [{ label: ekor }] : []),
  ];
  return (
    <div className="mb-4">
      <Link
        href={ekor && hrefTopik ? hrefTopik : hrefDokumen}
        className="state-layer relative -ml-3 inline-flex h-10 items-center gap-1 rounded-full pr-4 pl-2 text-label-large text-primary expanded:hidden"
      >
        <Ikon nama="arrow_back" ukuran={20} />
        {ekor ? labelTopik : LABEL.kembaliKeDokumen}
      </Link>
      <nav aria-label={TEKS_BELAJAR.breadcrumb} className="hidden expanded:block">
        <ol className="flex flex-wrap items-center gap-1 text-body-medium">
          {item.map((it, i) => {
            const terakhir = i === item.length - 1;
            return (
              <li key={i} className="flex items-center gap-1">
                {it.href && !terakhir ? (
                  <Link href={it.href} className="rounded-xs text-primary hover:underline">
                    {it.label}
                  </Link>
                ) : (
                  <span aria-current={terakhir ? "page" : undefined} className="text-on-surface-variant">
                    {it.label}
                  </span>
                )}
                {!terakhir && <Ikon nama="chevron_right" ukuran={18} className="text-on-surface-variant" />}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
