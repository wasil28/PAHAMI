#!/usr/bin/env node
/**
 * Generator token warna M3 Pahami.
 *
 * Menghasilkan skema terang & gelap dari seed #1F6F5C (KEPUTUSAN §2, Opsi A)
 * dengan Material Color Utilities (algoritma resmi M3, varian Tonal Spot =
 * default Material Theme Builder), plus custom color `success` & `warning`
 * yang di-harmonisasi ke seed agar senada.
 *
 * Hasil ditulis ke app/globals.css di antara penanda TEMA:MULAI / TEMA:SELESAI.
 * Jalankan: `node scripts/generate-tema.mjs`
 */
import { register } from "node:module";
import { readFile, writeFile } from "node:fs/promises";

// Paket ESM material-color-utilities memakai import tanpa ekstensi `.js`,
// sehingga gagal di resolver ESM Node. Hook kecil ini menambahkan `.js`
// agar tidak perlu bundler.
const hook = `
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (err) {
    if (specifier.startsWith(".") && !specifier.endsWith(".js")) {
      return next(specifier + ".js", context);
    }
    throw err;
  }
}`;
register("data:text/javascript," + encodeURIComponent(hook), import.meta.url);

const {
  argbFromHex,
  hexFromArgb,
  Hct,
  SchemeTonalSpot,
  MaterialDynamicColors,
  customColor,
} = await import("@material/material-color-utilities");

const SEED = "#1F6F5C";
const CUSTOM = [
  { name: "success", value: argbFromHex("#2E7D32"), blend: true },
  { name: "warning", value: argbFromHex("#B26A00"), blend: true },
];

// Nama peran CSS (kebab-case) → properti MaterialDynamicColors.
const ROLES = [
  "primary", "onPrimary", "primaryContainer", "onPrimaryContainer", "inversePrimary",
  "secondary", "onSecondary", "secondaryContainer", "onSecondaryContainer",
  "tertiary", "onTertiary", "tertiaryContainer", "onTertiaryContainer",
  "error", "onError", "errorContainer", "onErrorContainer",
  "background", "onBackground",
  "surface", "onSurface", "surfaceVariant", "onSurfaceVariant",
  "surfaceDim", "surfaceBright",
  "surfaceContainerLowest", "surfaceContainerLow", "surfaceContainer",
  "surfaceContainerHigh", "surfaceContainerHighest",
  "inverseSurface", "inverseOnSurface",
  "outline", "outlineVariant", "shadow", "scrim", "surfaceTint",
];

const kebab = (s) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

function skema(isDark) {
  const scheme = new SchemeTonalSpot(Hct.fromInt(argbFromHex(SEED)), isDark, 0);
  const out = {};
  for (const role of ROLES) {
    out[kebab(role)] = hexFromArgb(MaterialDynamicColors[role].getArgb(scheme));
  }
  for (const c of CUSTOM) {
    const g = customColor(argbFromHex(SEED), c)[isDark ? "dark" : "light"];
    out[c.name] = hexFromArgb(g.color);
    out[`on-${c.name}`] = hexFromArgb(g.onColor);
    out[`${c.name}-container`] = hexFromArgb(g.colorContainer);
    out[`on-${c.name}-container`] = hexFromArgb(g.onColorContainer);
  }
  return out;
}

const vars = (obj, indent) =>
  Object.entries(obj)
    .map(([k, v]) => `${indent}--md-${k}: ${v};`)
    .join("\n");

const terang = skema(false);
const gelap = skema(true);
const names = Object.keys(terang);

const css = `/* TEMA:MULAI — dibuat otomatis oleh scripts/generate-tema.mjs (seed ${SEED}). Jangan edit manual. */
:root {
  color-scheme: light;
${vars(terang, "  ")}
}

@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    color-scheme: dark;
${vars(gelap, "    ")}
  }
}

:root.dark {
  color-scheme: dark;
${vars(gelap, "  ")}
}

/* Mode terang paksa (mis. di halaman showcase) */
:root.light,
.tema-terang {
  color-scheme: light;
${vars(terang, "  ")}
}

.tema-gelap {
  color-scheme: dark;
${vars(gelap, "  ")}
}

@theme inline {
${names.map((n) => `  --color-${n}: var(--md-${n});`).join("\n")}
}
/* TEMA:SELESAI */`;

const target = new URL("../app/globals.css", import.meta.url);
const sekarang = await readFile(target, "utf8");
const pola = /\/\* TEMA:MULAI[\s\S]*?\/\* TEMA:SELESAI \*\//;
if (!pola.test(sekarang)) {
  console.error("Penanda TEMA:MULAI/TEMA:SELESAI tidak ditemukan di app/globals.css");
  process.exit(1);
}
await writeFile(target, sekarang.replace(pola, css));
console.log(`Token tema ditulis ke app/globals.css (${names.length} peran × terang/gelap).`);
