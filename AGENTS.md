<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Aturan pengembangan Pahami (wajib dibaca semua kontributor & agent)

Pahami = Sistem Informasi Pembelajaran Mandiri Berbasis Dokumen PDF dengan Asisten AI (Capstone STSI4440 UT).

## Sumber kebenaran (urutan prioritas)
1. `docs/KEPUTUSAN-IMPLEMENTASI.md` (folder ini) — keputusan final yang mengalahkan dokumen lain.
2. `../docs/fitur/FT-xx-*/{analisis,database,ui-ux}.md` — detail per fitur.
3. `../docs/Breakdown-Proses-Bisnis-dan-Fitur.md` — BP, BR, S (layar), MSG (pesan), UC.
4. `../docs/Panduan-Standar-Tim.md` — standar kode, M3, database. `../docs/skema-database.dbml` — nama tabel.
Prototype lama di `../app/` HANYA acuan visual, bukan acuan logika.

## Stack & versi
- Next.js 16.4 App Router (baca `node_modules/next/dist/docs/` bila ragu). Middleware bernama **`proxy.ts`**.
  `cacheComponents` TIDAK aktif. `params`/`searchParams` adalah Promise (`await props.params`).
  Pakai tipe global `PageProps<"/rute/[id]">` dan `LayoutProps<"/rute">`.
- React 19, TypeScript strict (dilarang `any`), Tailwind v4 (token M3 di `app/globals.css`), Zod v4.
- Supabase: Postgres + pgvector + Auth + Storage + RLS. AI: OpenRouter via SDK `openai` (`lib/ai/client.ts`).

## Struktur & kepemilikan
```
app/(auth)/ (mahasiswa)/ (admin)/admin/   halaman per peran
app/api/<sumber-daya>/route.ts            Route Handler
components/ui/        komponen dasar M3 (JANGAN buat ulang di folder fitur)
components/shell/     kerangka navigasi mahasiswa & admin
components/<fitur>/   komponen per fitur
lib/config.ts         konstanta (tanpa angka ajaib)
lib/auth/sesi.ts      getPengguna(), wajibLogin(peran?), wajibLoginApi(peran?)
lib/api/respon.ts     ok(), gagal(), gagalValidasi(), gagalServer()
lib/supabase/         server.ts (sesi+RLS) · browser.ts · admin.ts (service role, server saja)
lib/ai/               klien, embedding, RAG, prompt, pencatatan pemakaian
lib/pdf/              ekstraksi teks PDF
lib/data/             akses data per domain (komponen tidak memanggil Supabase langsung)
lib/validasi/         skema Zod (form & API) · parseBody/parseSearchParams di lib/validasi/permintaan.ts (server saja)
lib/pesan.ts          katalog pesan MSG-xx (semua teks error/sukses dari sini)
types/database.ts     tipe Database Supabase
supabase/migrations/  YYYYMMDDHHMMSS_deskripsi.sql
```
Jangan mengubah file milik area lain. Bila butuh perubahan di file bersama, tulis di laporan akhir.

## Aturan kode
- Server Component default; `"use client"` hanya untuk bagian interaktif. Komponen ≤ ±200 baris.
- Route Handler: cek login (`wajibLoginApi`) → cek pemilik/peran → validasi Zod → proses → `ok()/gagal()`.
- 404 untuk data milik orang lain (jangan bocorkan keberadaannya). Kode HTTP sesuai Panduan §3.6.
- Teks UI bahasa Indonesia, ambil dari `lib/pesan.ts`. Komentar bahasa Indonesia, jelaskan *mengapa*, rujuk BR-xx.
- Penamaan: domain bahasa Indonesia (dokumen, topik, latihan, soal), teknis bahasa Inggris (get, create, handle).
  File kebab-case, komponen PascalCase.
- Warna/radius/tipografi HANYA lewat token M3 (class seperti `bg-primary`, `text-on-surface`, `rounded-md`,
  `text-title-medium`). Dilarang hex di komponen. Ikon: Material Symbols (`<Ikon nama="upload" />`).
- Rahasia hanya di env server. Jangan log isi dokumen pengguna.
- Sebelum selesai: `npx tsc --noEmit` dan `npx eslint <file-mu>` bersih. JANGAN jalankan `next build`/`next dev`
  bersamaan dengan agent lain (dikerjakan integrator).
- Jangan commit. Jangan menambahkan nama Claude/AI sebagai kontributor di mana pun.
