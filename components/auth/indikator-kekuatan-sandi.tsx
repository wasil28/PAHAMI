import { Ikon } from "@/components/ui/ikon";
import { cn } from "@/lib/tema/cn";
import { SANDI_MIN } from "@/lib/config";
import { sandiMemenuhiAturan } from "@/lib/validasi";
import { TEKS_AUTH } from "./teks";

type Tingkat = "lemah" | "sedang" | "kuat";

/**
 * Tingkat hanya petunjuk, TIDAK menahan pendaftaran (ui-ux Pertanyaan terbuka #1):
 * lemah = belum memenuhi BR-22 · sedang = memenuhi BR-22 · kuat = ≥ 12 karakter + huruf besar/kecil atau simbol.
 */
export function tingkatSandi(sandi: string): Tingkat {
  if (!sandiMemenuhiAturan(sandi)) return "lemah";
  const variasi = (/\p{Lu}/u.test(sandi) && /\p{Ll}/u.test(sandi)) || /[^\p{L}\p{Nd}\s]/u.test(sandi);
  return sandi.length >= 12 && variasi ? "kuat" : "sedang";
}

const gaya: Record<Tingkat, { isi: string; segmen: number }> = {
  lemah: { isi: "bg-error", segmen: 1 },
  sedang: { isi: "bg-warning", segmen: 2 },
  kuat: { isi: "bg-success", segmen: 3 },
};

/** S-03 K-07 / S-05 K-05: bar 3 segmen + label tingkat + daftar syarat ber-ikon (tidak hanya warna). */
export function IndikatorKekuatanSandi({ sandi, className }: { sandi: string; className?: string }) {
  if (!sandi) return null;
  const tingkat = tingkatSandi(sandi);
  const g = gaya[tingkat];
  const syarat = [
    { ok: sandi.length >= SANDI_MIN, label: TEKS_AUTH.kekuatan.syaratPanjang },
    { ok: /\p{L}/u.test(sandi), label: TEKS_AUTH.kekuatan.syaratHuruf },
    { ok: /\p{Nd}/u.test(sandi), label: TEKS_AUTH.kekuatan.syaratAngka },
  ];

  return (
    <div className={cn("px-1", className)}>
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden>
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-150 ease-standard",
                i <= g.segmen ? g.isi : "bg-surface-container-highest",
              )}
            />
          ))}
        </div>
        {/* Hanya perubahan tingkat yang diumumkan, bukan tiap ketikan (ui-ux §5). */}
        <p className="text-label-medium text-on-surface-variant" aria-live="polite">
          <span className="sr-only">{TEKS_AUTH.kekuatan.label}: </span>
          {TEKS_AUTH.kekuatan[tingkat]}
        </p>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-body-small text-on-surface-variant">
        {syarat.map((s) => (
          <li key={s.label} className="flex items-center gap-1">
            <Ikon nama={s.ok ? "check_circle" : "cancel"} isi ukuran={16} className={s.ok ? "text-success" : "text-on-surface-variant"} />
            <span>
              <span className="sr-only">{s.ok ? "Terpenuhi: " : "Belum terpenuhi: "}</span>
              {s.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
