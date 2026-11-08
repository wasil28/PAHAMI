import { Badge, type NadaBadge } from "@/components/ui";
import { KATEGORI_QC, PRIORITAS_QC, STATUS_QC, type KategoriQc, type PrioritasQc, type StatusQc } from "@/lib/qc/tipe";

// Warna selalu disertai teks + ikon (bukan warna saja — aksesibilitas Panduan §1).
export const GAYA_STATUS_QC: Record<StatusQc, { nada: NadaBadge; ikon: string }> = {
  baru: { nada: "primary", ikon: "fiber_new" },
  dikerjakan: { nada: "tertiary", ikon: "construction" },
  selesai: { nada: "success", ikon: "check_circle" },
  ditolak: { nada: "neutral", ikon: "block" },
};

const GAYA_PRIORITAS: Record<PrioritasQc, { nada: NadaBadge; ikon: string }> = {
  rendah: { nada: "neutral", ikon: "keyboard_double_arrow_down" },
  sedang: { nada: "info", ikon: "drag_handle" },
  tinggi: { nada: "warning", ikon: "keyboard_double_arrow_up" },
  kritis: { nada: "error", ikon: "priority_high" },
};

export const IKON_KATEGORI_QC: Record<KategoriQc, string> = {
  bug: "bug_report",
  tampilan: "palette",
  konten_ai: "auto_awesome",
  teks: "spellcheck",
  saran: "lightbulb",
};

export function BadgeStatusQc({ status }: { status: StatusQc }) {
  const g = GAYA_STATUS_QC[status];
  return (
    <Badge nada={g.nada} ikon={g.ikon}>
      {STATUS_QC[status]}
    </Badge>
  );
}

export function BadgePrioritasQc({ prioritas }: { prioritas: PrioritasQc }) {
  const g = GAYA_PRIORITAS[prioritas];
  return (
    <Badge nada={g.nada} ikon={g.ikon}>
      <span className="sr-only">Prioritas </span>
      {PRIORITAS_QC[prioritas]}
    </Badge>
  );
}

export function BadgeKategoriQc({ kategori }: { kategori: KategoriQc }) {
  return (
    <Badge nada="neutral" ikon={IKON_KATEGORI_QC[kategori]} className="bg-surface-container-high">
      {KATEGORI_QC[kategori]}
    </Badge>
  );
}
