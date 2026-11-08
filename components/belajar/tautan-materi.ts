// Dipisah dari komponen klien agar bisa dipanggil di Server Component juga.
export function hrefMateri(dokumenId: number, topikId: number, materiId: number): string {
  return `/dokumen/${dokumenId}/topik/${topikId}/materi/${materiId}`;
}

export function hrefTopik(dokumenId: number, topikId: number): string {
  return `/dokumen/${dokumenId}/topik/${topikId}`;
}
