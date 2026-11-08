#!/usr/bin/env bash
# Uji lokal migrasi Pahami di Postgres 16 + pgvector (tanpa Docker/Supabase CLI).
# Pemakaian:  bash supabase/tests/jalankan.sh [nama_db]   (default: pahami_uji)
# DB uji dibuat ulang setiap kali dijalankan, lalu DIHAPUS bila semua uji lulus
# (set SIMPAN_DB=1 untuk mempertahankannya).
set -euo pipefail
DB="${1:-pahami_uji}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -d "$DB")

dropdb --if-exists "$DB"
createdb "$DB"
"${PSQL[@]}" -f "$DIR/tests/00_shim_supabase.sql"
for f in "$DIR"/migrations/*.sql; do
  echo "→ migrasi $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
echo "→ seed.sql"
"${PSQL[@]}" -f "$DIR/seed.sql"
echo "→ 01_uji_rls.sql"
"${PSQL[@]}" -f "$DIR/tests/01_uji_rls.sql"
if [ "${SIMPAN_DB:-0}" != "1" ]; then dropdb "$DB"; echo "DB $DB dihapus."; fi
echo "SEMUA UJI LULUS"
