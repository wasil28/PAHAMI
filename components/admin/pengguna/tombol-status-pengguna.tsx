import { Tombol, Tooltip } from "@/components/ui";
import type { PenggunaBaris } from "@/lib/data/admin";
import { LABEL, PESAN } from "@/lib/pesan";

export type AksiStatus = "nonaktifkan" | "aktifkan";

/** BR-24: akun admin (termasuk diri sendiri) tidak dapat diubah statusnya. */
export function bisaDiubah(p: PenggunaBaris, idSaya: number): boolean {
  return p.peran === "mahasiswa" && p.id !== idSaya;
}

/**
 * Tombol aksi baris (FT-09 K-08). Akun terkunci memakai aria-disabled (tetap bisa difokus)
 * + tooltip MSG-M05 agar alasannya terbaca pembaca layar.
 */
export function TombolStatusPengguna({ pengguna, terkunci, onKlik }: { pengguna: PenggunaBaris; terkunci: boolean; onKlik: (aksi: AksiStatus) => void }) {
  if (terkunci) {
    return (
      <Tooltip teks={PESAN["MSG-M05"]}>
        <Tombol varian="outlined" ukuran="sm" ikon="person_off" aria-disabled="true" aria-label={`${LABEL.nonaktifkan} akun ${pengguna.nama} (tidak tersedia)`}>
          {LABEL.nonaktifkan}
        </Tombol>
      </Tooltip>
    );
  }
  if (pengguna.isActive) {
    return (
      <Tombol varian="outlined" ukuran="sm" ikon="person_off" aria-label={`${LABEL.nonaktifkan} akun ${pengguna.nama}`} onClick={() => onKlik("nonaktifkan")}>
        {LABEL.nonaktifkan}
      </Tombol>
    );
  }
  return (
    <Tombol varian="tonal" ukuran="sm" ikon="person_check" aria-label={`${LABEL.aktifkan} akun ${pengguna.nama}`} onClick={() => onKlik("aktifkan")}>
      {LABEL.aktifkan}
    </Tombol>
  );
}
