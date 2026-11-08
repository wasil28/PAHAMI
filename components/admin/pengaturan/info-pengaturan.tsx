import { Ikon, Kartu } from "@/components/ui";
import type { PengaturanKuota } from "@/lib/data/admin";
import { formatTanggalWaktu } from "@/lib/format";

/** Panel info S-16: riwayat ubah terakhir (FT-10 K-03) + catatan BR-28 (K-11). */
export function InfoPengaturan({ terakhirDiubah }: { terakhirDiubah: PengaturanKuota["terakhirDiubah"] }) {
  return (
    <>
      <Kartu padding="md" className="flex items-start gap-3 text-body-medium text-on-surface-variant">
        <Ikon nama="history" ukuran={20} className="mt-0.5" />
        <p>
          {terakhirDiubah
            ? `Terakhir diubah oleh ${terakhirDiubah.oleh} · ${formatTanggalWaktu(terakhirDiubah.at)} WIB`
            : "Belum pernah diubah — memakai nilai default."}
        </p>
      </Kartu>
      <Kartu padding="md" className="flex items-start gap-3 text-body-medium text-on-surface-variant">
        <Ikon nama="info" ukuran={20} className="mt-0.5" />
        <p>Berlaku untuk aksi berikutnya. Dokumen yang sudah ada tidak berubah.</p>
      </Kartu>
    </>
  );
}
