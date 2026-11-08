import { Avatar, Badge } from "@/components/ui";
import type { Peran } from "@/lib/config";
import { LABEL_PERAN } from "@/lib/pesan";

/** Header S-13 (FT-08 K-02): avatar inisial + nama + email + badge peran. */
export function HeaderProfil({ nama, email, peran }: { nama: string; email: string; peran: Peran }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <Avatar nama={nama} ukuran="lg" dekoratif />
      <div className="min-w-0">
        <p className="truncate text-title-large text-on-surface">{nama}</p>
        <p className="truncate text-body-medium text-on-surface-variant">{email}</p>
        <Badge nada="info" className="mt-1">
          {LABEL_PERAN[peran]}
        </Badge>
      </div>
    </div>
  );
}
