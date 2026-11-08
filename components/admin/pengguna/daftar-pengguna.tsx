"use client";

import { useState, type ReactNode } from "react";
import { Avatar, Badge, BadgeStatus, DataTable, Ikon, Kartu, type KolomTabel } from "@/components/ui";
import type { PenggunaBaris } from "@/lib/data/admin";
import { formatAngka, formatTanggal, formatTanggalWaktu } from "@/lib/format";
import { LABEL_PERAN, PESAN, TEKS } from "@/lib/pesan";
import { DialogUbahStatus } from "./dialog-ubah-status";
import { bisaDiubah, TombolStatusPengguna, type AksiStatus } from "./tombol-status-pengguna";

type Target = { pengguna: PenggunaBaris; aksi: AksiStatus };

function BadgePeran({ peran }: { peran: PenggunaBaris["peran"] }) {
  if (peran === "admin") return <Badge nada="tertiary" ikon="shield_person">{LABEL_PERAN.admin}</Badge>;
  return <span className="text-label-medium text-on-surface-variant">{LABEL_PERAN.mahasiswa}</span>;
}

const terakhirAktif = (p: PenggunaBaris) => (p.terakhirAktifAt ? formatTanggalWaktu(p.terakhirAktifAt) : TEKS.belumPernah);
// BR-06: hanya jumlah dokumen; admin tidak punya dokumen → "—".
const jumlahDok = (p: PenggunaBaris) => (p.peran === "admin" ? TEKS.kosong : formatAngka(p.jumlahDokumen));

/**
 * Daftar pengguna S-15: data table (≥ 600 dp) atau kartu (compact), plus dialog ubah status.
 * Kolom hanya data akun & jumlah dokumen — tidak ada judul/isi dokumen (BR-06).
 */
export function DaftarPengguna({ baris, idSaya, keterangan }: { baris: PenggunaBaris[]; idSaya: number; keterangan: string }) {
  const [target, setTarget] = useState<Target | null>(null);

  const aksi = (p: PenggunaBaris): ReactNode => (
    <TombolStatusPengguna pengguna={p} terkunci={!bisaDiubah(p, idSaya)} onKlik={(a) => setTarget({ pengguna: p, aksi: a })} />
  );

  const kolom: KolomTabel<PenggunaBaris>[] = [
    {
      kunci: "nama",
      judul: "Nama",
      render: (p) => (
        <span className="font-medium">
          {p.nama}
          {p.id === idSaya && <span className="ml-1 text-on-surface-variant">{TEKS.akunSendiri}</span>}
        </span>
      ),
    },
    { kunci: "email", judul: "Email", render: (p) => <span className="break-all text-on-surface-variant">{p.email}</span> },
    { kunci: "peran", judul: "Peran", render: (p) => <BadgePeran peran={p.peran} /> },
    { kunci: "dokumen", judul: "Dokumen", rata: "kanan", render: (p) => <span className="tabular-nums">{jumlahDok(p)}</span> },
    { kunci: "bergabung", judul: "Bergabung", className: "whitespace-nowrap", render: (p) => formatTanggal(p.bergabungAt) },
    { kunci: "aktif", judul: "Terakhir aktif", className: "whitespace-nowrap", render: terakhirAktif },
    { kunci: "status", judul: "Status", render: (p) => <BadgeStatus status={p.isActive ? "aktif" : "nonaktif"} /> },
    { kunci: "aksi", judul: <span className="sr-only">Aksi</span>, rata: "kanan", render: aksi },
  ];

  return (
    <>
      <DataTable
        keterangan={keterangan}
        data={baris}
        kunciBaris={(p) => String(p.id)}
        kolom={kolom}
        kartuCompact={(p) => (
          <Kartu varian="outlined" padding="md" className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <Avatar nama={p.nama} ukuran="sm" dekoratif />
              <p className="min-w-0 flex-1 truncate text-title-medium">
                {p.nama}
                {p.id === idSaya && <span className="ml-1 text-body-medium text-on-surface-variant">{TEKS.akunSendiri}</span>}
              </p>
              <BadgeStatus status={p.isActive ? "aktif" : "nonaktif"} />
            </div>
            <p className="break-all text-body-medium text-on-surface-variant">{p.email}</p>
            <p className="flex items-center gap-2 text-body-small text-on-surface-variant">
              <BadgePeran peran={p.peran} />
              {p.peran === "mahasiswa" && <span>· {formatAngka(p.jumlahDokumen)} dokumen</span>}
            </p>
            <p className="text-body-small text-on-surface-variant">Bergabung {formatTanggal(p.bergabungAt)}</p>
            <p className="text-body-small text-on-surface-variant">Terakhir aktif {terakhirAktif(p)}</p>
            {bisaDiubah(p, idSaya) ? (
              <div className="mt-2 flex justify-end">{aksi(p)}</div>
            ) : (
              <p className="mt-2 flex items-center gap-1 text-body-small text-on-surface-variant">
                <Ikon nama="info" ukuran={16} /> {PESAN["MSG-M05"]}
              </p>
            )}
          </Kartu>
        )}
      />
      <DialogUbahStatus target={target} onTutup={() => setTarget(null)} />
    </>
  );
}
