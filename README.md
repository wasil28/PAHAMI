# Pahami

Sistem Informasi Pembelajaran Mandiri Berbasis Dokumen PDF dengan Asisten AI — Capstone Project STSI4440, Universitas Terbuka 2026.

Mahasiswa mengunggah PDF → aplikasi menyusun topik, ringkasan, latihan soal, dan Tanya AI yang menjawab dari isi dokumen beserta nomor halamannya. Admin mengelola pengguna, kuota, dan memantau statistik & biaya AI.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 (Material Design 3) · Supabase (Postgres + pgvector + Auth + Storage + RLS) · OpenRouter (LLM & embedding) · Vercel.

## Mulai cepat
Lihat **[docs/SETUP.md](docs/SETUP.md)**. Ringkasnya:
```bash
nvm use            # Node 24 (.nvmrc)
npm install
cp .env.example .env.local   # isi kunci Supabase & OpenRouter
npx supabase link --project-ref <ref> && npx supabase db push --include-seed
npm run dev
```

## Dokumentasi
| File | Isi |
|---|---|
| [AGENTS.md](AGENTS.md) | Aturan kode & struktur folder (wajib dibaca) |
| [docs/KEPUTUSAN-IMPLEMENTASI.md](docs/KEPUTUSAN-IMPLEMENTASI.md) | Keputusan final teknis & bisnis |
| [docs/SETUP.md](docs/SETUP.md) | Menyiapkan Supabase, OpenRouter, menjalankan & deploy |
| [docs/DATABASE.md](docs/DATABASE.md) | Migrasi, tabel, RPC, RLS, uji database lokal |
| [docs/AI-RAG.md](docs/AI-RAG.md) | Pipeline PDF → chunk → embedding → topik/ringkasan/soal/jawaban |
| [docs/KOMPONEN-UI.md](docs/KOMPONEN-UI.md) | Token M3 & komponen UI |
| [docs/PESAN-DAN-VALIDASI.md](docs/PESAN-DAN-VALIDASI.md) | Katalog pesan MSG-xx & skema validasi |

Spesifikasi lengkap ada di folder `../docs/` (Breakdown proses bisnis, detail per fitur FT-01–FT-11).

## Perintah
| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan (http://localhost:3000) |
| `npm run build` | Build produksi |
| `npm run lint` · `npx tsc --noEmit` | Wajib bersih sebelum PR |
| `npm test` | Uji unit (chunk, validasi, protokol chat, pipeline) |
| `npm run test:db` | Uji migrasi + RLS di Postgres lokal (butuh Postgres 16 + pgvector) |
