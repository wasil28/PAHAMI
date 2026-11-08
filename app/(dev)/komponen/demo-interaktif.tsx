"use client";

// DEV ONLY — bagian interaktif halaman showcase /komponen.
import { useState } from "react";
import {
  Chip,
  ConfirmDialog,
  Dialog,
  FileDropZone,
  Menu,
  Pagination,
  SegmentedButton,
  Tabs,
  TextField,
  Tombol,
  useSnackbar,
} from "@/components/ui";

export function DemoInteraktif() {
  const { tampilkan } = useSnackbar();
  const [dialog, setDialog] = useState(false);
  const [hapus, setHapus] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [filter, setFilter] = useState("semua");
  const [halaman, setHalaman] = useState(3);
  const [saran, setSaran] = useState(["Apa itu basis data?", "Jelaskan normalisasi"]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <Tombol varian="tonal" ikon="open_in_new" onClick={() => setDialog(true)}>
          Buka dialog
        </Tombol>
        <Tombol varian="outlined" ikon="delete" onClick={() => setHapus(true)}>
          Dialog hapus
        </Tombol>
        <Tombol varian="text" onClick={() => tampilkan("Profil berhasil disimpan.")}>
          Snackbar
        </Tombol>
        <Tombol
          varian="text"
          onClick={() => tampilkan({ pesan: "Dokumen dihapus.", labelAksi: "Urungkan", onAksi: () => tampilkan("Dibatalkan.") })}
        >
          Snackbar + aksi
        </Tombol>
        <Menu
          label="Opsi dokumen"
          item={[
            { label: "Ganti nama", ikon: "edit", onPilih: () => tampilkan("Ganti nama dipilih") },
            { label: "Unduh", ikon: "download", nonaktif: true },
            { label: "Hapus", ikon: "delete", berbahaya: true, onPilih: () => setHapus(true) },
          ]}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {["semua", "aktif", "nonaktif"].map((f) => (
          <Chip key={f} varian="filter" label={f[0].toUpperCase() + f.slice(1)} terpilih={filter === f} onClick={() => setFilter(f)} />
        ))}
        {saran.map((s) => (
          <Chip key={s} varian="input" label={s} onHapus={() => setSaran((x) => x.filter((y) => y !== s))} />
        ))}
      </div>

      <SegmentedButton
        label="Rentang waktu"
        nilai={filter === "semua" ? "7" : "30"}
        onUbah={(v) => setFilter(v === "7" ? "semua" : "aktif")}
        opsi={[
          { nilai: "7", label: "7 hari" },
          { nilai: "30", label: "30 hari" },
          { nilai: "semua", label: "Semua" },
        ]}
      />

      <Tabs
        label="Konten topik"
        tab={[
          { id: "materi", label: "Materi", ikon: "menu_book", konten: <p className="py-4 text-body-large">Isi ringkasan materi…</p> },
          { id: "tanya", label: "Tanya AI", ikon: "forum", konten: <p className="py-4 text-body-large">Panel Tanya AI…</p> },
        ]}
      />

      <FileDropZone teksBantuan="PDF berteks, maks. 20 MB · 300 halaman" />

      <Pagination halaman={halaman} totalHalaman={9} onUbah={setHalaman} />

      <Dialog
        terbuka={dialog}
        onTutup={() => setDialog(false)}
        judul="Ganti nama dokumen"
        lebar="md"
        aksi={
          <>
            <Tombol varian="text" onClick={() => setDialog(false)}>
              Batal
            </Tombol>
            <Tombol onClick={() => setDialog(false)}>Simpan</Tombol>
          </>
        }
      >
        <TextField label="Judul dokumen" defaultValue="Modul Basis Data" maxLength={100} penghitung className="pt-1" />
      </Dialog>

      <ConfirmDialog
        terbuka={hapus}
        onTutup={() => setHapus(false)}
        berbahaya
        judul="Hapus dokumen ini?"
        pesan="Dokumen, topik, latihan, dan riwayat tanya AI akan dihapus permanen."
        labelKonfirmasi="Hapus permanen"
        memuat={memuat}
        teksMemuat="Menghapus…"
        onKonfirmasi={() => {
          setMemuat(true);
          setTimeout(() => {
            setMemuat(false);
            setHapus(false);
            tampilkan("Dokumen dihapus.");
          }, 1200);
        }}
      />
    </div>
  );
}
