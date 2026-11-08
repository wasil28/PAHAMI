import { Ikon, Kartu } from "@/components/ui";
import { isiPlaceholder } from "@/lib/pesan";
import { TEKS_DOKUMEN } from "./teks";

/** KartuAturanUnggah (FT-02 K-06): nilai dari m_pengaturan_sistem (BR-02, BR-03, BR-05, BR-06). */
export function KartuAturanUnggah({ maxHalaman, maxUkuranMb, className }: { maxHalaman: number; maxUkuranMb: number; className?: string }) {
  const item = [
    { ikon: "description", teks: TEKS_DOKUMEN.aturanTeks },
    { ikon: "menu_book", teks: isiPlaceholder(TEKS_DOKUMEN.aturanHalaman, { n: maxHalaman }) },
    { ikon: "scale", teks: isiPlaceholder(TEKS_DOKUMEN.aturanUkuran, { n: maxUkuranMb }) },
    { ikon: "lock", teks: TEKS_DOKUMEN.aturanPrivat },
  ];
  return (
    <Kartu className={className}>
      <h2 className="mb-3 text-title-small text-on-surface">{TEKS_DOKUMEN.sebelumMengunggah}</h2>
      <ul className="flex flex-col gap-3">
        {item.map((i) => (
          <li key={i.ikon} className="flex items-start gap-3 text-body-medium text-on-surface">
            <Ikon nama={i.ikon} ukuran={20} className="mt-0.5 shrink-0 text-primary" />
            <span>{i.teks}</span>
          </li>
        ))}
      </ul>
    </Kartu>
  );
}
