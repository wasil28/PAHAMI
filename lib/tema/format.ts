// Format tampilan gaya Indonesia (Panduan §2): "2,4 MB". Aman dipakai di server & client.

/** Ukuran file: "820 KB", "2,4 MB". */
export function formatUkuranFile(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`;
}
