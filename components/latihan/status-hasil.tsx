import { BadgeStatus } from "@/components/ui";
import { STATUS_TOPIK, isiPlaceholder } from "@/lib/pesan";
import type { StatusTopik } from "@/types/database";
import { TEKS_LATIHAN } from "./teks";

/** K-04: status topik BR-13 (bukan hanya skor kali ini) + "sebelumnya: …" bila berubah. */
export function StatusHasil({ statusBaru, statusLama }: { statusBaru: StatusTopik; statusLama: StatusTopik | null }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="flex flex-wrap items-center gap-2 text-body-medium text-on-surface">
        {TEKS_LATIHAN.statusTopik}
        <BadgeStatus status={statusBaru} />
      </p>
      {statusLama && statusLama !== statusBaru && (
        <p className="text-body-small text-on-surface-variant">
          {isiPlaceholder(TEKS_LATIHAN.sebelumnya, { status: STATUS_TOPIK[statusLama] })}
        </p>
      )}
    </div>
  );
}
