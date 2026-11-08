import { Ikon } from "@/components/ui";
import { SKOR_PERTAHANKAN, SKOR_SELESAI } from "@/lib/config";
import { PESAN } from "@/lib/pesan";
import { cn } from "@/lib/tema/cn";

/**
 * K-03: pesan menurut skor KALI INI (MSG-L04/L05/L06). MSG-L05 memakai teks KEPUTUSAN A3 sehingga
 * tidak bertentangan bila status topik tetap "Selesai". 60–69 & < 60 memakai warning, bukan error.
 */
export function PesanTingkatSkor({ skor }: { skor: number }) {
  const tingkat =
    skor >= SKOR_SELESAI
      ? { ikon: "celebration", teks: PESAN["MSG-L04"], kelas: "bg-success-container text-on-success-container" }
      : skor >= SKOR_PERTAHANKAN
        ? { ikon: "trending_up", teks: PESAN["MSG-L05"], kelas: "bg-warning-container text-on-warning-container" }
        : { ikon: "replay", teks: PESAN["MSG-L06"], kelas: "bg-warning-container text-on-warning-container" };
  return (
    <div role="status" className={cn("flex items-start gap-3 rounded-md p-4", tingkat.kelas)}>
      <Ikon nama={tingkat.ikon} isi className="mt-0.5" />
      <p className="text-title-medium">{tingkat.teks}</p>
    </div>
  );
}
