import { Ikon } from "@/components/ui/ikon";
import { cn } from "@/lib/tema/cn";

const TOPIK = [
  { no: 1, judul: "Konsep Dasar Sistem Informasi", status: "Selesai", kelas: "bg-success-container text-on-success-container" },
  { no: 2, judul: "Komponen & Siklus Data", status: "Perlu diulang", kelas: "bg-warning-container text-on-warning-container" },
  { no: 3, judul: "Basis Data Relasional", status: "Belum", kelas: "bg-surface-container-highest text-on-surface-variant" },
] as const;

/**
 * Ilustrasi dekoratif murni CSS: PDF → topik berurutan → jawaban AI dengan rujukan halaman.
 * Dipakai hero landing (S-01) dan panel merek layar auth. `aria-hidden` karena isinya contoh.
 */
export function IlustrasiBelajar({ ringkas = false, className }: { ringkas?: boolean; className?: string }) {
  return (
    <div aria-hidden className={cn("relative w-full select-none", className)}>
      <div className="grid grid-cols-[auto_1fr] items-start gap-3 medium:gap-5">
        {/* Dokumen PDF */}
        <div className={cn("relative mt-6 -rotate-3", ringkas ? "w-20" : "w-24 medium:w-32")}>
          <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-md bg-surface-container-highest" />
          <div className="relative rounded-md bg-surface-container-lowest p-3 shadow-2">
            <div className="mb-2 flex items-center justify-between gap-1">
              <span className="rounded-xs bg-error px-1.5 py-0.5 text-label-small text-on-error">PDF</span>
              {!ringkas && <span className="text-label-small text-on-surface-variant">248 hal.</span>}
            </div>
            <div className="space-y-1.5">
              {["w-full", "w-4/5", "w-full", "w-3/5", "w-full", "w-2/3"].map((w, i) => (
                <div key={i} className={cn("h-1.5 rounded-full bg-outline-variant", w)} />
              ))}
            </div>
            {!ringkas && <p className="mt-3 text-label-small text-on-surface">Modul SI · UT</p>}
          </div>
          <div className="mt-5 hidden items-center justify-center gap-1 text-primary medium:flex">
            <span className="h-px w-5 bg-primary/38" />
            <Ikon nama="arrow_forward" ukuran={16} />
          </div>
        </div>

        <div className="min-w-0 space-y-3">
          {/* Jalur topik */}
          <div className="rounded-lg bg-surface-container-lowest p-3 shadow-1 medium:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-label-medium uppercase tracking-wide text-on-surface-variant">Topik</p>
              <span className="text-label-medium text-primary">1 dari 12 selesai</span>
            </div>
            <ul className="space-y-2">
              {TOPIK.map((t) => (
                <li key={t.no} className="flex items-center gap-2.5 rounded-md bg-surface-container-low px-2.5 py-2">
                  <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-primary-container text-label-medium text-on-primary-container">
                    {t.no}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-label-large text-on-surface">{t.judul}</span>
                  {!ringkas && (
                    <span className={cn("hidden shrink-0 rounded-full px-2 py-0.5 text-label-small large:inline", t.kelas)}>
                      {t.status}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Jawaban Tanya AI dengan rujukan halaman */}
          <div className="ml-2 rounded-lg rounded-tl-xs bg-surface-container-lowest p-3 shadow-1 medium:ml-6 medium:p-4">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-primary text-on-primary">
                <Ikon nama="auto_awesome" isi ukuran={14} />
              </span>
              <span className="text-label-large text-on-surface">
                Tanya AI <span className="text-on-surface-variant">· dari bukumu</span>
              </span>
            </div>
            <p className="text-body-small text-on-surface medium:text-body-medium">
              Sistem informasi adalah gabungan orang, data, prosedur, dan teknologi yang bekerja sama menghasilkan informasi.
            </p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-sm bg-secondary-container px-2 py-1 text-label-medium text-on-secondary-container">
              <Ikon nama="description" ukuran={14} />
              hal. 12
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
