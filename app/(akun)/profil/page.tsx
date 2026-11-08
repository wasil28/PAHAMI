import type { Metadata } from "next";
import { TombolKeluar } from "@/components/shell";
import { Kartu, PageHeader } from "@/components/ui";
import { FormDataDiri } from "@/components/profil/form-data-diri";
import { FormUbahSandi } from "@/components/profil/form-ubah-sandi";
import { HeaderProfil } from "@/components/profil/header-profil";
import { KartuInfoAkun } from "@/components/profil/kartu-info-akun";
import { KartuKuota } from "@/components/profil/kartu-kuota";
import { TEKS_PROFIL as T } from "@/components/profil/teks";
import { wajibLogin } from "@/lib/auth/sesi";
import { PERAN } from "@/lib/config";
import { getDetailProfil, getKuotaPengguna } from "@/lib/data/profil";

export const metadata: Metadata = { title: T.judul };

/**
 * S-13 Profil (FT-08, BP-10) untuk mahasiswa & admin. Admin tidak punya kartu kuota.
 * Compact: kuota → data diri → sandi → info → Keluar. Expanded: kiri (7) formulir | kanan (5) kuota + info.
 */
export default async function HalamanProfil() {
  const pengguna = await wajibLogin();
  const mahasiswa = pengguna.peran === PERAN.MAHASISWA;
  const [detail, kuota] = await Promise.all([
    getDetailProfil(pengguna.id),
    mahasiswa ? getKuotaPengguna() : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader judul={T.judul} className="mb-4" />
      <HeaderProfil nama={pengguna.nama} email={pengguna.email} peran={pengguna.peran} />

      {/* Kolom memakai `contents` di compact agar urutan bisa diatur dengan `order` (FT-08 §4). */}
      <div className="flex flex-col gap-4 expanded:grid expanded:grid-cols-12 expanded:items-start expanded:gap-6">
        <div className="contents expanded:col-span-7 expanded:flex expanded:flex-col expanded:gap-6">
          <div className="order-2 expanded:order-none">
            <FormDataDiri namaAwal={pengguna.nama} email={pengguna.email} />
          </div>
          <div className="order-3 expanded:order-none">
            <FormUbahSandi />
          </div>
        </div>
        <div className="contents expanded:col-span-5 expanded:flex expanded:flex-col expanded:gap-6">
          {mahasiswa && (
            <div className="order-1 expanded:order-none">
              <KartuKuota kuota={kuota} />
            </div>
          )}
          <div className="order-4 expanded:order-none">
            <KartuInfoAkun peran={pengguna.peran} bergabungAt={detail.bergabungAt} isActive={pengguna.isActive} />
          </div>
        </div>
        {/* KEPUTUSAN C1: Keluar juga ada di Profil (compact/medium); di expanded sudah ada di drawer. */}
        <Kartu varian="outlined" padding="sm" className="order-5 expanded:hidden">
          <TombolKeluar gaya="drawer" />
        </Kartu>
      </div>
    </>
  );
}
