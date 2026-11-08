// Uji tenggat permintaan (lib/ai/tenggat.ts). Jalankan:
//   npx tsx --conditions=react-server --test lib/ai/__tests__/*.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buatTenggat, keOpsiSdk } from "@/lib/ai/tenggat";

test("permintaan: timeout tidak melewati sisa tenggat", () => {
  const t = buatTenggat(5_000);
  const p = t.permintaan(60_000, 0);
  assert.ok(p.timeoutMs !== undefined && p.timeoutMs <= 5_000 && p.timeoutMs > 0);
  assert.equal(p.maksCobaUlang, 0);
  assert.equal(p.signal, t.signal);
  assert.equal(t.permintaan(1_000, 1).timeoutMs, 1_000);
  t.hentikan();
});

test("tenggat habis → sinyal batal", async () => {
  const t = buatTenggat(10);
  await new Promise((r) => setTimeout(r, 30));
  assert.ok(t.signal.aborted);
  assert.ok(t.habis());
  assert.equal(t.permintaan(1_000, 0).timeoutMs, 1); // minimal 1 ms (SDK menolak 0)
});

test("keOpsiSdk hanya mengirim kunci yang diisi", () => {
  assert.deepEqual(keOpsiSdk(), {});
  assert.deepEqual(keOpsiSdk({ timeoutMs: 10, maksCobaUlang: 0 }), { timeout: 10, maxRetries: 0 });
});
