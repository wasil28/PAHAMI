import { BadgeStatus, Kartu } from "@/components/ui";
import type { Peran } from "@/lib/config";
import { formatTanggal } from "@/lib/format";
import { LABEL_PERAN } from "@/lib/pesan";
import { TEKS_PROFIL as T } from "./teks";

/** Info akun hanya-baca (FT-08 K-16). Akun yang bisa membuka halaman ini pasti aktif (BR-23). */
export function KartuInfoAkun({ peran, bergabungAt, isActive }: { peran: Peran; bergabungAt: string; isActive: boolean }) {
  return (
    <Kartu as="section" radius="lg" className="flex flex-col gap-3 expanded:p-6" aria-labelledby="judul-info-akun">
      <h2 id="judul-info-akun" className="text-title-medium text-on-surface">
        {T.bagianInfo}
      </h2>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-2">
        <dt className="text-body-medium text-on-surface-variant">{T.infoPeran}</dt>
        <dd className="text-title-small text-on-surface">{LABEL_PERAN[peran]}</dd>
        <dt className="text-body-medium text-on-surface-variant">{T.infoBergabung}</dt>
        <dd className="text-title-small text-on-surface">
          <time dateTime={bergabungAt}>{formatTanggal(bergabungAt)}</time>
        </dd>
        <dt className="text-body-medium text-on-surface-variant">{T.infoStatus}</dt>
        <dd>
          <BadgeStatus status={isActive ? "aktif" : "nonaktif"} />
        </dd>
      </dl>
    </Kartu>
  );
}
