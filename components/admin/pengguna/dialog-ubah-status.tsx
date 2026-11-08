"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog, useSnackbar } from "@/components/ui";
import type { PenggunaBaris } from "@/lib/data/admin";
import { LABEL, PESAN, TEKS, pesan } from "@/lib/pesan";
import type { AksiStatus } from "./tombol-status-pengguna";

type ResponsUbah = {
  data?: { nama: string; isActive: boolean; peringatan?: string };
  error?: { kode: string; pesan: string };
};

/**
 * Konfirmasi nonaktifkan (MSG-M01) / aktifkan (MSG-M04) akun — FT-09 K-10.
 * Gagal koneksi → dialog tetap terbuka dengan MSG-G01; target admin (403) → tutup + MSG-M05.
 */
export function DialogUbahStatus({ target, onTutup }: { target: { pengguna: PenggunaBaris; aksi: AksiStatus } | null; onTutup: () => void }) {
  const router = useRouter();
  const { tampilkan } = useSnackbar();
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const nonaktif = target?.aksi === "nonaktifkan";
  const nama = target?.pengguna.nama ?? "";

  function tutup() {
    setGalat(null);
    onTutup();
  }

  async function konfirmasi() {
    if (!target) return;
    setMemuat(true);
    setGalat(null);
    try {
      const res = await fetch(`/api/admin/pengguna/${target.pengguna.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !nonaktif }),
      });
      const json = (await res.json().catch(() => ({}))) as ResponsUbah;
      if (res.ok && json.data) {
        tampilkan(pesan(json.data.isActive ? "MSG-M03" : "MSG-M02", { nama: json.data.nama }));
        // Ban Auth gagal setelah DB sukses → status tetap tersimpan, admin diminta mengulang (B1).
        if (json.data.peringatan) tampilkan({ pesan: json.data.peringatan, durasi: 8000, bisaDitutup: true });
        tutup();
        router.refresh();
      } else if (res.status === 403 && json.error?.kode === "TARGET_ADMIN") {
        tampilkan(PESAN["MSG-M05"]);
        tutup();
        router.refresh();
      } else {
        setGalat(json.error?.pesan ?? PESAN["MSG-G01"]);
      }
    } catch {
      setGalat(PESAN["MSG-G01"]);
    } finally {
      setMemuat(false);
    }
  }

  return (
    <ConfirmDialog
      terbuka={target !== null}
      onTutup={tutup}
      onKonfirmasi={konfirmasi}
      judul={nonaktif ? "Nonaktifkan akun?" : "Aktifkan akun?"}
      ikon={nonaktif ? "person_off" : "person_check"}
      berbahaya={nonaktif}
      labelKonfirmasi={nonaktif ? LABEL.nonaktifkan : LABEL.aktifkan}
      memuat={memuat}
      teksMemuat={TEKS.memproses}
      pesan={
        <>
          <p>{pesan(nonaktif ? "MSG-M01" : "MSG-M04", { nama })}</p>
          {galat && (
            <p role="alert" className="mt-3 text-body-medium text-error">
              {galat}
            </p>
          )}
        </>
      }
    />
  );
}
