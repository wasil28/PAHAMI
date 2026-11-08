#!/usr/bin/env bash
# Salin variabel lingkungan dari .env.local ke Vercel (production), lalu deploy.
# Nilai rahasia dibaca langsung dari file — tidak dicetak ke layar.
#   bash scripts/vercel-env.sh https://pahami-self.vercel.app
set -euo pipefail
cd "$(dirname "$0")/.."

SITE_URL="${1:?Isi URL produksi, mis. https://pahami-self.vercel.app}"
KUNCI=(NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY
       OPENROUTER_API_KEY OPENROUTER_BASE_URL AI_MODEL AI_MODEL_PRO AI_EMBED_MODEL AI_EMBED_DIM KURS_USD_IDR)

ambil() { grep -E "^$1=" .env.local | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }

for k in "${KUNCI[@]}"; do
  v="$(ambil "$k")"
  if [ -z "$v" ]; then echo "lewati $k (kosong)"; continue; fi
  printf '%s' "$v" | vercel env add "$k" production --force >/dev/null && echo "OK  $k"
done
# Rahasia cookie pemulihan baru khusus produksi (beda dari lokal).
openssl rand -base64 48 | tr -d '\n' | vercel env add PEMULIHAN_SECRET production --force >/dev/null && echo "OK  PEMULIHAN_SECRET (baru)"
printf '%s' "${SITE_URL%/}" | vercel env add NEXT_PUBLIC_SITE_URL production --force >/dev/null && echo "OK  NEXT_PUBLIC_SITE_URL=${SITE_URL%/}"

echo "Deploy produksi…"
vercel deploy --prod --yes
