// DEV ONLY — showcase komponen M3 untuk review tim (light & dark). Tidak tersedia di production.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  Avatar,
  Badge,
  BadgeAngka,
  BadgeSkor,
  BadgeStatus,
  Banner,
  Checkbox,
  Chip,
  DataTable,
  Divider,
  EmptyState,
  ErrorState,
  IconButton,
  Ikon,
  Kartu,
  ListItem,
  OpsiJawaban,
  PageHeader,
  ProgressCircular,
  ProgressLinear,
  ProgressSteps,
  Radio,
  RadioGroup,
  Select,
  Skeleton,
  SkeletonKartu,
  StatCard,
  Switch,
  TextField,
  Textarea,
  Tombol,
  TombolLink,
  Tooltip,
  TopAppBar,
} from "@/components/ui";
import { DiagramMateri } from "@/components/belajar/diagram-materi";
import { CONTOH_DIAGRAM } from "./contoh-diagram";
import { DemoInteraktif } from "./demo-interaktif";

export const metadata: Metadata = { title: "Komponen" };

function Bagian({ judul, children }: { judul: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-title-large text-on-surface">{judul}</h2>
      {children}
    </section>
  );
}

type Pengguna = { id: string; nama: string; email: string; aktif: boolean; dokumen: number };
const PENGGUNA: Pengguna[] = [
  { id: "1", nama: "Siti Rahma", email: "siti@ecampus.ut.ac.id", aktif: true, dokumen: 3 },
  { id: "2", nama: "Budi Santoso", email: "budi@ecampus.ut.ac.id", aktif: false, dokumen: 1 },
];

function Galeri({ id }: { id: string }) {
  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-10 px-4 py-8 medium:px-6">
      <PageHeader
        overline="Pahami · Design system"
        judul="Komponen M3"
        deskripsi="Tema Hijau Teal (seed #1F6F5C), Plus Jakarta Sans, gaya Tonal Lembut."
        badge={<BadgeStatus status="siap" />}
        aksi={
          <>
            <TombolLink href="/komponen/shell" varian="tonal" ikon="view_quilt">
              Lihat shell
            </TombolLink>
          </>
        }
      />

      <Bagian judul="Warna">
        <div className="grid grid-cols-2 gap-2 medium:grid-cols-4">
          {[
            ["bg-primary text-on-primary", "primary"],
            ["bg-primary-container text-on-primary-container", "primary-container"],
            ["bg-secondary-container text-on-secondary-container", "secondary-container"],
            ["bg-tertiary-container text-on-tertiary-container", "tertiary-container"],
            ["bg-success-container text-on-success-container", "success-container"],
            ["bg-warning-container text-on-warning-container", "warning-container"],
            ["bg-error-container text-on-error-container", "error-container"],
            ["bg-inverse-surface text-inverse-on-surface", "inverse-surface"],
            ["bg-surface-container-lowest text-on-surface border border-outline-variant", "surface-container-lowest"],
            ["bg-surface-container-low text-on-surface", "surface-container-low"],
            ["bg-surface-container text-on-surface", "surface-container"],
            ["bg-surface-container-highest text-on-surface-variant", "surface-container-highest"],
          ].map(([k, n]) => (
            <div key={n} className={`flex h-16 items-end rounded-md p-2 text-label-medium ${k}`}>
              {n}
            </div>
          ))}
        </div>
      </Bagian>

      <Bagian judul="Tipografi">
        <div className="flex flex-col gap-1">
          <p className="text-display-medium">87</p>
          <p className="text-headline-medium">Headline medium — judul halaman</p>
          <p className="text-headline-small">Headline small — judul topik</p>
          <p className="text-title-large">Title large — judul dialog</p>
          <p className="text-title-medium">Title medium — judul kartu</p>
          <p className="text-body-large">Body large — teks materi yang nyaman dibaca lama.</p>
          <p className="text-body-medium text-on-surface-variant">Body medium — teks umum, isi tabel.</p>
          <p className="text-label-large">Label large — teks tombol</p>
          <p className="text-label-small text-on-surface-variant">Label small — label navigasi</p>
        </div>
      </Bagian>

      <Bagian judul="Tombol">
        <div className="flex flex-wrap items-center gap-3">
          <Tombol ikon="play_arrow">Mulai latihan</Tombol>
          <Tombol varian="tonal">Latihan</Tombol>
          <Tombol varian="outlined">Batal</Tombol>
          <Tombol varian="text">Lihat semua</Tombol>
          <Tombol varian="elevated" ikon="add">Elevated</Tombol>
          <Tombol varian="danger" ikon="delete">Hapus permanen</Tombol>
          <Tombol memuat teksMemuat="Sedang masuk…">Masuk</Tombol>
          <Tombol disabled>Nonaktif</Tombol>
          <Tombol varian="outlined" disabled>Nonaktif</Tombol>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Tombol ukuran="sm" varian="tonal">Kecil</Tombol>
          <Tombol ukuran="lg" ikon="upload">Upload PDF</Tombol>
          <IconButton ikon="more_vert" label="Opsi" />
          <IconButton ikon="edit" label="Ubah" varian="filled" />
          <IconButton ikon="bookmark" label="Simpan" varian="tonal" />
          <IconButton ikon="share" label="Bagikan" varian="outlined" />
          <IconButton ikon="visibility" label="Tampilkan" terpilih />
          <Tooltip teks="Tooltip polos">
            <IconButton ikon="info" label="Info" />
          </Tooltip>
        </div>
        <Tombol lebarPenuh>Lebar penuh</Tombol>
      </Bagian>

      <Bagian judul="Kartu">
        <div className="grid gap-4 medium:grid-cols-3">
          <Kartu>
            <p className="text-title-medium">Filled</p>
            <p className="text-body-medium text-on-surface-variant">surface-container-low (default G1)</p>
          </Kartu>
          <Kartu varian="outlined">
            <p className="text-title-medium">Outlined</p>
            <p className="text-body-medium text-on-surface-variant">border outline-variant</p>
          </Kartu>
          <Kartu varian="elevated" href="/komponen">
            <p className="text-title-medium">Elevated + href</p>
            <p className="text-body-medium text-on-surface-variant">seluruh kartu bisa diklik</p>
          </Kartu>
        </div>
        <div className="grid gap-4 medium:grid-cols-3">
          <StatCard label="Dokumen" nilai="3" ikon="description" keterangan="dari 5 kuota" />
          <StatCard label="Topik selesai" nilai="33%" ikon="task_alt" nada="success">
            <ProgressLinear nilai={33} label="Topik selesai" nada="success" />
          </StatCard>
          <StatCard label="Biaya AI bulan ini" nilai="Rp18.500" ikon="payments" nada="tertiary" />
        </div>
      </Bagian>

      <Bagian judul="Input">
        <div className="grid gap-4 medium:grid-cols-2">
          <TextField label="Email" type="email" ikonDepan="mail" placeholder="nama@ecampus.ut.ac.id" teksPendukung="Pakai email kampus." />
          <TextField label="Kata sandi" type="password" ikonDepan="lock" required />
          <TextField label="Nama lengkap" ikonDepan="person" maxLength={60} penghitung defaultValue="Siti Rahma" />
          <TextField label="Email" type="email" defaultValue="siti@" error="Format email belum benar. Contoh: nama@ecampus.ut.ac.id" />
          <TextField label="Filled" varian="filled" placeholder="Varian filled" />
          <Select label="Dokumen" placeholder="Pilih dokumen" opsi={[{ nilai: "1", label: "Modul Basis Data" }, { nilai: "2", label: "Statistika" }]} />
          <Textarea label="Pertanyaan" maxLength={500} penghitung placeholder="Tanyakan isi dokumen…" className="medium:col-span-2" />
        </div>
        <div className="grid gap-2 medium:grid-cols-3">
          <div>
            <Checkbox label="Ingat saya" defaultChecked />
            <Checkbox label="Setuju syarat" deskripsi="Wajib dicentang." />
          </div>
          <div>
            <Radio name={`r-${id}`} label="Pilihan 1" defaultChecked />
            <Radio name={`r-${id}`} label="Pilihan 2" />
          </div>
          <div>
            <Switch label="Mode ringkas" defaultChecked />
            <Switch label="Notifikasi" />
          </div>
        </div>
      </Bagian>

      <Bagian judul="Opsi jawaban (latihan)">
        <div className="grid gap-6 medium:grid-cols-2">
          <RadioGroup legend="1. Apa kepanjangan DBMS?">
            <OpsiJawaban name={`s1-${id}`} huruf="A" value="a" label="Database Management System" defaultChecked />
            <OpsiJawaban name={`s1-${id}`} huruf="B" value="b" label="Data Backup Method" />
            <OpsiJawaban name={`s1-${id}`} huruf="C" value="c" label="Digital Base System" />
          </RadioGroup>
          <RadioGroup legend="Setelah diperiksa">
            <OpsiJawaban name={`s2-${id}`} huruf="A" value="a" label="Opsi netral" status="netral" disabled />
            <OpsiJawaban name={`s2-${id}`} huruf="B" value="b" label="Jawaban kamu (salah)" status="salah" defaultChecked disabled />
            <OpsiJawaban name={`s2-${id}`} huruf="C" value="c" label="Jawaban yang benar" status="kunci" disabled />
            <OpsiJawaban name={`s3-${id}`} huruf="D" value="d" label="Dipilih & benar" status="benar" defaultChecked disabled />
          </RadioGroup>
        </div>
      </Bagian>

      <Bagian judul="Chip, badge, avatar">
        <div className="flex flex-wrap items-center gap-2">
          <Chip label="Apa itu normalisasi?" ikon="auto_awesome" />
          <Chip varian="filter" label="Aktif" terpilih />
          <Chip varian="filter" label="Nonaktif" />
          <Chip varian="info" ikon="menu_book" label="hal. 12–18" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["siap", "diproses", "gagal", "selesai", "lemah", "belum", "aktif", "nonaktif"] as const).map((s) => (
            <BadgeStatus key={s} status={s} />
          ))}
          <BadgeSkor skor={85} />
          <BadgeSkor skor={65} tampilLabel />
          <BadgeSkor skor={40} />
          <Badge nada="tertiary" ikon="shield_person">Admin</Badge>
          <BadgeAngka jumlah={3} label="3 notifikasi" />
          <Avatar nama="Siti Rahma" ukuran="sm" />
          <Avatar nama="Budi Santoso" />
          <Avatar nama="Wasil" ukuran="lg" />
        </div>
      </Bagian>

      <Bagian judul="Banner">
        <Banner nada="info">Dokumen sedang diproses. Kamu boleh meninggalkan halaman ini.</Banner>
        <Banner nada="success" judul="Akun berhasil dibuat">Silakan masuk.</Banner>
        <Banner nada="warning" aksi={<Tombol varian="text" ukuran="sm">Lihat kuota</Tombol>}>
          Kuota pertanyaan hari ini tinggal 5.
        </Banner>
        <Banner nada="error">Email atau kata sandi salah. Periksa kembali lalu coba lagi.</Banner>
      </Bagian>

      <Bagian judul="Progres">
        <ProgressLinear nilai={60} label="Progres dokumen" />
        <ProgressLinear label="Memproses" />
        <div className="flex items-center gap-4">
          <ProgressCircular label="Memuat" />
          <ProgressCircular nilai={72} label="Skor" ukuran={56} tebal={6} />
          <ProgressCircular ukuran={24} tebal={3} label="Memuat" />
        </div>
        <div className="grid gap-6 medium:grid-cols-2">
          <ProgressSteps
            label="Tahap pengolahan"
            aktif={2}
            langkah={[
              { label: "Mengunggah file", keterangan: "2,4 MB" },
              { label: "Membaca teks", keterangan: "124 halaman" },
              { label: "Menyusun topik", keterangan: "Biasanya < 1 menit" },
              { label: "Siap dipelajari" },
            ]}
          />
          <ProgressSteps
            label="Tahap gagal"
            orientasi="horizontal"
            aktif={1}
            status="gagal"
            langkah={[{ label: "Unggah" }, { label: "Baca teks" }, { label: "Topik" }]}
          />
        </div>
      </Bagian>

      <Bagian judul="List & tabel">
        <Kartu padding="none" className="overflow-hidden">
          <ul role="list">
            <li>
              <ListItem depan="description" judul="Modul Basis Data" deskripsi="124 halaman · 8 topik" belakang={<BadgeStatus status="siap" />} href="/komponen" pemisah />
            </li>
            <li>
              <ListItem depan={<Avatar nama="Budi Santoso" dekoratif />} overline="Mahasiswa" judul="Budi Santoso" deskripsi="budi@ecampus.ut.ac.id" belakang="8 Okt 2026" />
            </li>
          </ul>
        </Kartu>
        <DataTable
          keterangan="Daftar pengguna"
          data={PENGGUNA}
          kunciBaris={(p) => p.id}
          kolom={[
            { kunci: "nama", judul: "Nama" },
            { kunci: "email", judul: "Email" },
            { kunci: "dokumen", judul: "Dokumen", rata: "kanan" },
            { kunci: "status", judul: "Status", render: (p) => <BadgeStatus status={p.aktif ? "aktif" : "nonaktif"} /> },
          ]}
          kartuCompact={(p) => (
            <Kartu varian="outlined">
              <p className="text-title-medium">{p.nama}</p>
              <p className="text-body-small text-on-surface-variant">{p.email}</p>
            </Kartu>
          )}
        />
      </Bagian>

      <Bagian judul="Interaktif">
        <DemoInteraktif />
      </Bagian>

      <Bagian judul="State">
        <div className="grid gap-4 medium:grid-cols-2">
          <Kartu>
            <EmptyState ringkas ikon="upload_file" judul="Belum ada dokumen" teks="Unggah modul PDF pertamamu untuk mulai belajar." aksi={<TombolLink href="/upload" ikon="upload">Upload PDF</TombolLink>} />
          </Kartu>
          <Kartu>
            <ErrorState ringkas teks="Periksa koneksi internet kamu lalu coba lagi." aksi={<TombolLink href="/komponen" varian="tonal" ikon="refresh">Coba lagi</TombolLink>} />
          </Kartu>
        </div>
        <div className="grid gap-4 medium:grid-cols-3">
          <SkeletonKartu jumlah={2} />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </Bagian>

      <Bagian judul="Diagram materi">
        <div className="grid gap-4">
          {CONTOH_DIAGRAM.map((d) => (
            <DiagramMateri key={d.jenis} diagram={d} />
          ))}
        </div>
        {/* Lebar sempit (≈ kolom ponsel) untuk memeriksa tata letak cadangan container query. */}
        <div className="grid max-w-[360px] gap-4">
          {CONTOH_DIAGRAM.map((d) => (
            <DiagramMateri key={d.jenis} diagram={d} />
          ))}
        </div>
      </Bagian>

      <Bagian judul="Top app bar & divider">
        <Kartu padding="none" className="overflow-hidden">
          <TopAppBar judul="Topik 2: Normalisasi" kembaliHref="/komponen" lengket={false} aksi={<IconButton ikon="more_vert" label="Opsi" />} />
          <Divider />
          <TopAppBar judul="Profil" varian="center" lengket={false} />
        </Kartu>
        <p className="flex items-center gap-2 text-body-medium text-on-surface-variant">
          <Ikon nama="check_circle" isi className="text-success" /> Ikon terisi · <Ikon nama="check_circle" /> outlined
        </p>
      </Bagian>
    </div>
  );
}

export default function HalamanKomponen() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <>
      <div className="tema-terang bg-surface text-on-surface">
        <Galeri id="terang" />
      </div>
      <div className="tema-gelap bg-surface text-on-surface">
        <Galeri id="gelap" />
      </div>
    </>
  );
}
