// Siapa yang boleh melapor (fitur Laporan QC): akun bertanda penguji (mahasiswa/admin) + semua admin.
// Server tetap menegakkan aturan yang sama di POST /api/qc (403 BUKAN_PENGUJI).
export function bolehLaporQc(p: { isPenguji: boolean; peran: "mahasiswa" | "admin" }): boolean {
  return p.isPenguji || p.peran === "admin";
}
