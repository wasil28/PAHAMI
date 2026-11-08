"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Tombol, useSnackbar, type ItemMenu } from "@/components/ui";
import { LABEL, PESAN, type StatusDokumen } from "@/lib/pesan";
import { rute } from "@/lib/dokumen/tahap";
import { DialogGantiNama } from "./dialog-ganti-nama";
import { DialogHapusDokumen } from "./dialog-hapus-dokumen";
import { TEKS_DOKUMEN } from "./teks";

type Dok = { id: number; judul: string; status: StatusDokumen };
/** `refresh`: tetap di halaman (S-06). `beranda`: pindah ke S-06 setelah hapus (S-07). */
type SetelahHapus = "refresh" | "beranda";

function useAksiDokumen(dokumen: Dok, setelahHapus: SetelahHapus) {
  const router = useRouter();
  const { tampilkan } = useSnackbar();
  const [dialog, setDialog] = useState<"nama" | "hapus" | null>(null);
  const [versi, setVersi] = useState(0); // reset isi dialog ganti nama tiap dibuka

  const elemen = (
    <>
      <DialogGantiNama
        key={versi}
        terbuka={dialog === "nama"}
        dokumenId={dokumen.id}
        judulSekarang={dokumen.judul}
        onTutup={() => setDialog(null)}
        onSukses={() => {
          setDialog(null);
          tampilkan(PESAN["MSG-D01"]);
          router.refresh();
        }}
      />
      <DialogHapusDokumen
        terbuka={dialog === "hapus"}
        dokumenId={dokumen.id}
        judul={dokumen.judul}
        onTutup={() => setDialog(null)}
        onSukses={() => {
          setDialog(null);
          tampilkan(PESAN["MSG-D03"]);
          if (setelahHapus === "beranda") router.push(rute.beranda);
          else router.refresh();
        }}
      />
    </>
  );
  const bukaNama = () => {
    setVersi((v) => v + 1);
    setDialog("nama");
  };
  return { elemen, bukaNama, bukaHapus: () => setDialog("hapus") };
}

/**
 * Menu ⋮ dokumen (FT-03 K-09 / S-07 K-03). `siap`: Ganti nama + Hapus; `gagal`: hanya Hapus;
 * `diproses`: tidak dirender (BR-07).
 */
export function MenuDokumen({ dokumen, setelahHapus = "refresh", className }: { dokumen: Dok; setelahHapus?: SetelahHapus; className?: string }) {
  const { elemen, bukaNama, bukaHapus } = useAksiDokumen(dokumen, setelahHapus);
  if (dokumen.status === "diproses") return null;
  const item: ItemMenu[] = [
    ...(dokumen.status === "siap" ? [{ label: LABEL.gantiNama, ikon: "edit", onPilih: bukaNama }] : []),
    { label: LABEL.hapus, ikon: "delete", onPilih: bukaHapus, berbahaya: true },
  ];
  return (
    <div className={className}>
      <Menu item={item} label={TEKS_DOKUMEN.opsiDokumen} />
      {elemen}
    </div>
  );
}

/** Tombol "Hapus" pada kartu/panel dokumen gagal (FT-03 K-08c, S-07 K-09). */
export function TombolHapusDokumen({
  dokumen,
  setelahHapus = "refresh",
  label = LABEL.hapus,
  className,
}: {
  dokumen: Dok;
  setelahHapus?: SetelahHapus;
  label?: string;
  className?: string;
}) {
  const { elemen, bukaHapus } = useAksiDokumen(dokumen, setelahHapus);
  // Varian outlined berwarna error (FT-03 K-08c); `!` karena cn() tidak menyelesaikan konflik kelas.
  return (
    <>
      <Tombol varian="outlined" ikon="delete" onClick={bukaHapus} className={`border-error! text-error! ${className ?? ""}`}>
        {label}
      </Tombol>
      {elemen}
    </>
  );
}
