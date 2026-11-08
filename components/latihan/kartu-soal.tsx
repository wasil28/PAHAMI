import type { Ref } from "react";
import { OpsiJawaban, RadioGroup, type StatusOpsi } from "@/components/ui";
import type { HasilPeriksa, SoalLatihan } from "@/lib/data/latihan";
import { HURUF_TAMPIL } from "./acak";
import { TEKS_LATIHAN } from "./teks";

type Props = {
  soal: SoalLatihan;
  /** Indeks asli per posisi tampil (BR-11: diacak). */
  urutan: number[];
  dipilih: number | undefined;
  hasil: HasilPeriksa | undefined;
  terkunci: boolean;
  onPilih: (indeksAsli: number) => void;
  refJudul: Ref<HTMLHeadingElement>;
};

function statusOpsi(asli: number, dipilih: number | undefined, hasil: HasilPeriksa | undefined): StatusOpsi | "redup" {
  if (!hasil) return "netral";
  if (asli === dipilih) return hasil.isBenar ? "benar" : "salah";
  if (asli === hasil.kunci) return "kunci";
  return "redup";
}

/**
 * K-03 + K-04: teks soal (heading, menerima fokus saat soal baru tampil) + radio group kartu pilihan.
 * Radio native → panah ↑/↓ & Space bekerja; status benar/salah = ikon + teks, bukan warna saja.
 */
export function KartuSoal({ soal, urutan, dipilih, hasil, terkunci, onPilih, refJudul }: Props) {
  const idJudul = `soal-${soal.id}`;
  return (
    <div>
      <h2 id={idJudul} ref={refJudul} tabIndex={-1} className="mb-4 text-title-medium text-on-surface outline-none expanded:text-title-large">
        {soal.pertanyaan}
      </h2>
      <RadioGroup legend={soal.pertanyaan} legendTersembunyi aria-labelledby={idJudul}>
        {urutan.map((asli, posisi) => {
          const status = statusOpsi(asli, dipilih, hasil);
          const penanda =
            status === "benar" || status === "kunci" ? TEKS_LATIHAN.jawabanBenar : status === "salah" ? TEKS_LATIHAN.jawabanmu : null;
          return (
            <OpsiJawaban
              key={asli}
              name={`soal-${soal.id}`}
              value={String(asli)}
              huruf={HURUF_TAMPIL[posisi]}
              checked={dipilih === asli}
              onChange={() => onPilih(asli)}
              disabled={terkunci}
              aria-disabled={hasil ? true : undefined}
              status={status === "redup" ? "netral" : status}
              className={status === "redup" ? "opacity-38" : undefined}
              label={
                <>
                  {soal.pilihan[asli]}
                  {penanda && (
                    <span aria-hidden className="mt-0.5 block text-label-medium">
                      {penanda}
                    </span>
                  )}
                </>
              }
            />
          );
        })}
      </RadioGroup>
    </div>
  );
}
