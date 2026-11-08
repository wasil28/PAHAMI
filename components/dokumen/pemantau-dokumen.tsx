"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSnackbar } from "@/components/ui";
import { isiPlaceholder, pesan } from "@/lib/pesan";
import { ambilStatusDokumen } from "@/lib/dokumen/klien";
import { INTERVAL_POLLING_MS, rute } from "@/lib/dokumen/tahap";
import type { TahapDokumen } from "@/lib/dokumen/tipe";
import { TEKS_DOKUMEN } from "./teks";

type Dipantau = { id: number; tahap: TahapDokumen | null };

/**
 * Pemantau kartu `diproses` di S-06 (FT-03 §3.4): polling tiap dokumen; tahap berubah →
 * router.refresh() (kartu digambar ulang server); selesai → snackbar MSG-U08 + "Buka" (10 dtk)
 * atau "{judul} gagal diproses." + "Lihat". Tidak merender apa pun.
 */
export function PemantauDokumen({ dokumen }: { dokumen: Dipantau[] }) {
  const router = useRouter();
  const { tampilkan } = useSnackbar();
  const kunci = dokumen.map((d) => `${d.id}:${d.tahap}`).join(",");
  // Keadaan terakhir yang sudah ditangani per id — mencegah snackbar ganda bila refresh lambat.
  const terakhir = useRef(new Map<number, string>());

  useEffect(() => {
    if (dokumen.length === 0) return;
    let batal = false;
    let timer: ReturnType<typeof setTimeout>;
    const putar = async () => {
      const hasil = await Promise.all(dokumen.map((d) => ambilStatusDokumen(d.id)));
      if (batal) return;
      let berubah = false;
      hasil.forEach((h, i) => {
        const id = dokumen[i].id;
        const sebelum = terakhir.current.get(id) ?? `diproses:${dokumen[i].tahap}`;
        const sekarang = h.ok ? `${h.data.status}:${h.data.tahap}` : h.status === 404 ? "hilang" : sebelum;
        if (sekarang === sebelum) return;
        terakhir.current.set(id, sekarang);
        berubah = true;
        if (!h.ok) return; // dihapus dari tab lain
        const d = h.data;
        if (d.status === "siap") {
          tampilkan({
            pesan: pesan("MSG-U08", { judul: d.judul, jumlah: d.jumlahTopik ?? 0 }),
            labelAksi: TEKS_DOKUMEN.buka,
            onAksi: () => router.push(rute.dokumen(d.id)),
            durasi: 10_000,
          });
        } else if (d.status === "gagal") {
          tampilkan({
            pesan: isiPlaceholder(TEKS_DOKUMEN.gagalDiprosesSnackbar, { judul: d.judul }),
            labelAksi: TEKS_DOKUMEN.lihat,
            onAksi: () => router.push(rute.dokumen(d.id)),
            durasi: 10_000,
          });
        }
      });
      if (berubah) router.refresh(); // props baru → efek dipasang ulang dengan daftar terbaru
      timer = setTimeout(putar, INTERVAL_POLLING_MS);
    };
    timer = setTimeout(putar, INTERVAL_POLLING_MS);
    return () => {
      batal = true;
      clearTimeout(timer);
    };
    // `kunci` mewakili isi `dokumen`; array baru tiap render tidak perlu memicu ulang.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunci, router, tampilkan]);

  return null;
}
