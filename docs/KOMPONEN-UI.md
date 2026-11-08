# Referensi Komponen UI (components/ui & components/shell)

`import { … } from "@/components/ui"` · `import { ShellMahasiswa, ShellAdmin, TombolKeluar } from "@/components/shell"`.
Showcase (dev): `/komponen`, `/komponen/shell?peran=admin`.

## Token (app/globals.css)
- Palet Tailwind bawaan DIMATIKAN (`bg-white`, `bg-red-500` tidak jalan). Pakai token M3 saja.
- Warna: primary/secondary/tertiary (+ on-, -container, on-…-container), error…, surface, on-surface, surface-variant,
  on-surface-variant, surface-container-lowest|low|(polos)|high|highest, inverse-surface, outline, outline-variant,
  success/warning (+ on-, -container, on-…-container). Modifier opacity `/38` jalan.
- Tipe: `text-display-*`, `text-headline-*`, `text-title-*`, `text-body-*`, `text-label-*` (large|medium|small).
- Radius: `rounded-xs 4 · sm 8 · md 12 · lg 16 · xl 28 · full`. Elevasi: `shadow-1..4`.
- Breakpoint window size class: `medium:` ≥600, `expanded:` ≥840, `large:` ≥1200 (JANGAN `sm:`/`md:`).
- Utilitas: `.state-layer`, `.ikon`, `scrollbar-tipis`, `animate-masuk`. Fokus global sudah ada.
- `cn()` di `lib/tema/cn.ts` hanya menggabung kelas — pakai `className` untuk layout saja (margin/lebar/grid).
- `SnackbarProvider` sudah terpasang di root layout → `useSnackbar()` di mana saja.

## Komponen
| Komponen | Props utama |
|---|---|
| `Ikon` | `nama, isi?, ukuran?=24, label?` |
| `Tombol` | `varian: filled\|tonal\|outlined\|text\|elevated\|danger, ukuran: sm\|md\|lg, ikon?, ikonKanan?, lebarPenuh?, memuat?, teksMemuat?` (default type="button") |
| `TombolLink` | sama + `href, nonaktif?` · `kelasTombol(opsi)` → string kelas |
| `IconButton` / `IconButtonLink` | `ikon, label (wajib), varian?: standard\|filled\|tonal\|outlined, terpilih?` |
| `Kartu` | `varian?: filled\|outlined\|elevated, padding?: none\|sm\|md\|lg, radius?: md\|lg, href?, as?` |
| `KartuTautan` | `href` — tautan membentang di kartu (induk `relative state-layer`, tombol dalam `relative z-10`) |
| `StatCard` | `label, nilai, ikon?, nada?, keterangan?` |
| `TextField` (client) | input props + `label, varian?, teksPendukung?, error?, penghitung?, ikonDepan?, ikonBelakang?` (password → toggle lihat) |
| `Textarea` (client) | `label, labelTersembunyi?, teksPendukung?, error?, penghitung?, otomatis?` |
| `Select` | `label, opsi: {nilai,label,nonaktif?}[], placeholder?, error?` |
| `Checkbox` / `Radio` / `Switch` | `label, deskripsi?` + props input |
| `RadioGroup` | `legend, legendTersembunyi?, error?` |
| `OpsiJawaban` | `huruf, label, status?: netral\|benar\|salah\|kunci, name, value, checked, onChange, disabled` |
| `FileDropZone` (client) | `accept?, name?, judul?, teksBantuan?, onPilih?(file\|null), error?, nonaktif?` |
| `Chip` | `varian?: assist\|suggestion\|filter\|input\|info, label, ikon?, terpilih?, href?, onHapus?` |
| `Badge` | `nada?: success\|warning\|error\|info\|neutral\|primary\|tertiary, ikon?` |
| `BadgeStatus` | `status: siap\|diproses\|gagal\|selesai\|lemah\|belum\|aktif\|nonaktif, label?` |
| `BadgeSkor` | `skor, tampilLabel?` · `tingkatSkor(skor)` |
| `ProgressLinear` | `label, nilai? (kosong = indeterminate), nada?` |
| `ProgressCircular` | `nilai?, ukuran?, tebal?, label?, nada?` |
| `ProgressSteps` | `langkah: {label,keterangan?}[], aktif, status?: berjalan\|gagal\|selesai, label, orientasi?` |
| `Dialog` (client) | `terbuka, onTutup, judul, ikon?, children, aksi, lebar?, kunci?` |
| `ConfirmDialog` (client) | `terbuka, onTutup, onKonfirmasi, judul, pesan, labelKonfirmasi, berbahaya?, memuat?` |
| `useSnackbar()` | `tampilkan(pesan \| {pesan, labelAksi?, onAksi?, durasi?})` |
| `Tabs` (client) | `tab: {id,label,ikon?,konten}[], label, awal?, aktif?, onUbah?` (panel nonaktif hanya disembunyikan) |
| `Menu` (client) | `item: {label, ikon?, onPilih?, href?, berbahaya?}[], label, ikonPemicu?` |
| `Tooltip` | `teks, posisi?` |
| `ListItem` | `judul, deskripsi?, overline?, depan?, belakang?, href?, onClick?` |
| `DataTable<T>` | `kolom: {kunci,judul,render?,rata?}[], data, kunciBaris, keterangan, kartuCompact?(row), kosong?` |
| `Pagination` | `halaman, totalHalaman, buatHref?(n) \| onUbah?(n)` |
| `SegmentedButton` | `label, opsi: {nilai,label,ikon?}[], name?, nilai?, nilaiAwal?, onUbah?` (radio native; jalan di form GET) |
| `PageHeader` | `judul, deskripsi?, overline?, kembali?: {href,label}, aksi?, badge?` — satu-satunya `h1` halaman |
| `TopAppBar`, `Divider`, `Avatar` (`nama, ukuran?`) | |
| `Skeleton`, `SkeletonKartu`, `EmptyState` (`ikon, judul, teks?, aksi?`), `ErrorState` (`judul?, teks?, onCobaLagi?`), `Banner` (`nada?, judul?, aksi?`) | |

## Shell
`<ShellMahasiswa pengguna={{ nama, email, peran }}>{children}</ShellMahasiswa>` (sama untuk `ShellAdmin`).
HP: bar bawah · tablet: rail · laptop: drawer 280px. Konten maks 1040px. Tombol Keluar = form POST `/api/auth/keluar`.
`/profil` dipakai kedua peran → halaman profil memilih shell berdasarkan `pengguna.peran`.
