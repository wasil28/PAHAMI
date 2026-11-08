// Penggabung class sederhana (tanpa dependensi). Nilai falsy diabaikan.
// Catatan: tidak ada deduplikasi konflik class — `className` dari luar sebaiknya
// hanya untuk tata letak (margin, lebar, grid), bukan menimpa warna/radius komponen.
export type NilaiKelas = string | boolean | number | bigint | null | undefined;

export function cn(...kelas: NilaiKelas[]): string {
  return kelas.filter((k): k is string => typeof k === "string" && k !== "").join(" ");
}
