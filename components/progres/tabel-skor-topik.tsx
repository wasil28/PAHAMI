import { BadgeStatus } from "@/components/ui";
import { TEKS } from "@/lib/pesan";
import type { SkorTopik } from "@/lib/data/progres";
import { TEKS_PROGRES as T } from "./teks";

/** Alternatif teks grafik (FT-07 K-10, aksesibilitas): Topik · Skor terakhir · Status · Jumlah latihan. */
export function TabelSkorTopik({ topik, judulDokumen }: { topik: SkorTopik[]; judulDokumen: string }) {
  return (
    <div className="overflow-x-auto rounded-md bg-surface">
      <table className="w-full text-left text-body-medium text-on-surface">
        <caption className="sr-only">{`${T.bagianGrafik} — ${judulDokumen}`}</caption>
        <thead className="bg-surface-container text-title-small">
          <tr>
            <th scope="col" className="px-3 py-2">{T.kolomTopik}</th>
            <th scope="col" className="px-3 py-2 text-right">{T.kolomSkor}</th>
            <th scope="col" className="px-3 py-2">{T.kolomStatus}</th>
            <th scope="col" className="px-3 py-2 text-right">{T.kolomJumlah}</th>
          </tr>
        </thead>
        <tbody>
          {topik.map((t) => (
            <tr key={t.topikId} className="border-t border-outline-variant">
              <td className="px-3 py-2">
                {t.urutan}. {t.judul}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{t.skorTerakhir ?? TEKS.kosong}</td>
              <td className="px-3 py-2">
                <BadgeStatus status={t.status} />
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{t.jumlahLatihan}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
