import type { Metadata } from "next";
import { FormPengaturan } from "@/components/admin/pengaturan/form-pengaturan";
import { InfoPengaturan } from "@/components/admin/pengaturan/info-pengaturan";
import { PageHeader } from "@/components/ui";
import { wajibLogin } from "@/lib/auth/sesi";
import { getEstimasiBiaya, getPengaturanKuota } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Pengaturan kuota" };

/** S-16 Pengaturan Kuota (FT-10, BP-12). Hanya 4 kode is_tampil (ambang_relevansi disembunyikan, A6). */
export default async function HalamanPengaturanKuota() {
  await wajibLogin("admin");
  const [pengaturan, estimasi] = await Promise.all([getPengaturanKuota(), getEstimasiBiaya()]);
  if (!pengaturan.ok) throw new Error("Pengaturan kuota gagal dimuat");
  const { item, versi, terakhirDiubah } = pengaturan.data;

  return (
    <div className="flex flex-col gap-2">
      <PageHeader
        judul="Pengaturan kuota"
        deskripsi="Atur batas pemakaian untuk semua mahasiswa. Perubahan berlaku untuk aksi berikutnya."
      />
      {/* key = versi: setelah simpan/muat ulang, form dipasang ulang dengan nilai server terbaru. */}
      <FormPengaturan
        key={versi ?? "awal"}
        item={item}
        versi={versi}
        estimasi={estimasi.ok ? estimasi.data : null}
        panel={<InfoPengaturan terakhirDiubah={terakhirDiubah} />}
      />
    </div>
  );
}
