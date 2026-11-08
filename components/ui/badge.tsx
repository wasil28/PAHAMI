import type { ReactNode } from "react";
import { SKOR_PERTAHANKAN, SKOR_SELESAI } from "@/lib/config";
import { cn } from "@/lib/tema/cn";
import { Ikon } from "./ikon";

export type NadaBadge = "success" | "warning" | "error" | "info" | "neutral" | "primary" | "tertiary";

const nadaKelas: Record<NadaBadge, string> = {
  success: "bg-success-container text-on-success-container",
  warning: "bg-warning-container text-on-warning-container",
  error: "bg-error-container text-on-error-container",
  info: "bg-secondary-container text-on-secondary-container",
  neutral: "bg-surface-container-highest text-on-surface-variant",
  primary: "bg-primary-container text-on-primary-container",
  tertiary: "bg-tertiary-container text-on-tertiary-container",
};

export type BadgeProps = {
  nada?: NadaBadge;
  ikon?: string;
  /** Ikon berputar (mis. status diproses). */
  ikonBerputar?: boolean;
  children: ReactNode;
  className?: string;
};

/** Label status kecil (radius xs, Label Medium). Selalu sertakan teks, bukan warna saja. */
export function Badge({ nada = "neutral", ikon, ikonBerputar, children, className }: BadgeProps) {
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1 rounded-xs px-2 text-label-medium whitespace-nowrap", nadaKelas[nada], className)}>
      {ikon && <Ikon nama={ikon} ukuran={16} isi={!ikonBerputar} className={ikonBerputar ? "animate-spin" : undefined} />}
      {children}
    </span>
  );
}

/** Status yang dipakai lintas fitur (FT-03 §1, FT-07, FT-09). */
export type StatusBadge = "siap" | "diproses" | "gagal" | "selesai" | "lemah" | "belum" | "aktif" | "nonaktif";

const STATUS: Record<StatusBadge, { label: string; ikon: string; nada: NadaBadge }> = {
  siap: { label: "Siap dipelajari", ikon: "check_circle", nada: "success" },
  diproses: { label: "Sedang diproses", ikon: "progress_activity", nada: "info" },
  gagal: { label: "Gagal diproses", ikon: "error", nada: "error" },
  selesai: { label: "Selesai", ikon: "check_circle", nada: "success" },
  lemah: { label: "Perlu diulang", ikon: "replay", nada: "warning" },
  belum: { label: "Belum dipelajari", ikon: "radio_button_unchecked", nada: "neutral" },
  aktif: { label: "Aktif", ikon: "check_circle", nada: "success" },
  nonaktif: { label: "Nonaktif", ikon: "block", nada: "neutral" },
};

/** Badge status siap pakai: dokumen (siap/diproses/gagal), topik (selesai/lemah/belum), akun (aktif/nonaktif). */
export function BadgeStatus({ status, label, className }: { status: StatusBadge; label?: string; className?: string }) {
  const s = STATUS[status];
  return (
    <Badge nada={s.nada} ikon={s.ikon} ikonBerputar={status === "diproses"} className={className}>
      {label ?? s.label}
    </Badge>
  );
}

/** Tingkat skor latihan (FT-07): ≥ SKOR_SELESAI "Baik", ≥ SKOR_PERTAHANKAN "Hampir", lainnya "Perlu diulang". */
export function tingkatSkor(skor: number): { label: string; ikon: string; nada: NadaBadge } {
  if (skor >= SKOR_SELESAI) return { label: "Baik", ikon: "check_circle", nada: "success" };
  if (skor >= SKOR_PERTAHANKAN) return { label: "Hampir", ikon: "error", nada: "warning" };
  return { label: "Perlu diulang", ikon: "replay", nada: "error" };
}

/** Badge skor: ikon + angka, tingkat dibacakan pembaca layar. */
export function BadgeSkor({ skor, tampilLabel, className }: { skor: number; tampilLabel?: boolean; className?: string }) {
  const t = tingkatSkor(skor);
  return (
    <Badge nada={t.nada} ikon={t.ikon} className={cn("tabular-nums", className)}>
      {skor}
      {tampilLabel ? <span> · {t.label}</span> : <span className="sr-only"> ({t.label})</span>}
    </Badge>
  );
}

/** Titik/angka notifikasi kecil (mis. di ikon navigasi). */
export function BadgeAngka({ jumlah, label }: { jumlah?: number; label?: string }) {
  if (jumlah === undefined) return <span className="block size-1.5 rounded-full bg-error" aria-label={label} />;
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-label-small text-on-error" aria-label={label}>
      {jumlah > 999 ? "999+" : jumlah}
    </span>
  );
}
