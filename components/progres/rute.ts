// Tautan ke layar milik fitur lain, dikumpulkan di satu tempat agar mudah diselaraskan.
// Mengikuti rute yang sudah dibuat FT-04: `dokumen/[id]/topik/[topikId]` (+ `/latihan` FT-05).

export function hrefDokumen(dokumenId: number): string {
  return `/dokumen/${dokumenId}`;
}

/** S-08 Belajar topik ("Pelajari lagi"). */
export function hrefTopik(dokumenId: number, topikId: number): string {
  return `${hrefDokumen(dokumenId)}/topik/${topikId}`;
}

/** S-09 Latihan ("Ulangi latihan"). */
export function hrefLatihan(dokumenId: number, topikId: number): string {
  return `${hrefTopik(dokumenId, topikId)}/latihan`;
}
