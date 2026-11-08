import { Avatar, BadgeStatus, EmptyState, ErrorState, Kartu, TombolLink } from "@/components/ui";
import type { PenggunaTerbaru } from "@/lib/data/admin";
import { formatAngka, formatTanggal } from "@/lib/format";
import { PESAN } from "@/lib/pesan";

/** 5 mahasiswa terbaru (FT-11 K-10..K-12). Hanya jumlah dokumen, tanpa judul (BR-06). */
export function DaftarPenggunaTerbaru({ pengguna }: { pengguna: PenggunaTerbaru[] | null }) {
  return (
    <Kartu as="section" padding="md" radius="lg" aria-labelledby="judul-pengguna-terbaru" className="flex flex-col gap-2">
      <h2 id="judul-pengguna-terbaru" className="text-title-large">
        Pengguna terbaru
      </h2>
      {pengguna === null ? (
        <ErrorState ringkas judul={PESAN["MSG-G02"]} />
      ) : pengguna.length === 0 ? (
        <EmptyState ringkas ikon="group_add" judul={PESAN["MSG-E06"]} />
      ) : (
        <ul className="flex flex-col">
          {pengguna.map((u) => (
            <li key={u.id} className="flex items-center gap-3 py-2">
              <Avatar nama={u.nama} ukuran="sm" dekoratif />
              <div className="min-w-0 flex-1">
                <p className="truncate text-title-small text-on-surface">{u.nama}</p>
                <p className="text-body-small text-on-surface-variant">
                  Bergabung {formatTanggal(u.bergabungAt)} · {formatAngka(u.jumlahDokumen)} dokumen
                </p>
              </div>
              <BadgeStatus status={u.isActive ? "aktif" : "nonaktif"} />
            </li>
          ))}
        </ul>
      )}
      <TombolLink href="/admin/pengguna" varian="text" ikonKanan="chevron_right" className="self-end">
        Lihat semua pengguna
      </TombolLink>
    </Kartu>
  );
}
