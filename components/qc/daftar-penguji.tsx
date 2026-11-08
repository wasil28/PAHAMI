"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Badge, EmptyState, Kartu, TextField, Tombol, useSnackbar } from "@/components/ui";
import { formatAngka } from "@/lib/format";
import { PESAN } from "@/lib/pesan";
import type { Penguji } from "@/lib/qc/tipe";
import { TEKS_QC, isi } from "./teks";

type Respons = { data?: Penguji | null; error?: { kode?: string; pesan?: string } };

/** Kelola penguji: tambah lewat email terdaftar, hapus per baris (POST /api/admin/penguji). */
export function DaftarPenguji({ penguji }: { penguji: Penguji[] }) {
  const router = useRouter();
  const { tampilkan } = useSnackbar();
  const [email, setEmail] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState<string | null>(null); // "tambah" | email yang sedang dihapus

  async function ubah(target: string, jadiPenguji: boolean): Promise<Respons | null> {
    let res: Response;
    try {
      res = await fetch("/api/admin/penguji", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target, penguji: jadiPenguji }),
      });
    } catch {
      throw new Error(PESAN["MSG-G01"]);
    }
    const json = (await res.json().catch(() => ({}))) as Respons;
    if (res.ok) return json;
    if (res.status === 404) throw new Error(TEKS_QC.emailBelumTerdaftar);
    throw new Error(json.error?.pesan ?? PESAN["MSG-G01"]);
  }

  async function tambah(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const target = email.trim().toLowerCase();
    if (!target) return;
    setGalat(null);
    setMemuat("tambah");
    try {
      const json = await ubah(target, true);
      tampilkan(isi(TEKS_QC.pengujiDitambah, { nama: json?.data?.nama ?? target }));
      setEmail("");
      router.refresh();
    } catch (err) {
      setGalat(err instanceof Error ? err.message : PESAN["MSG-G01"]);
    } finally {
      setMemuat(null);
    }
  }

  async function hapus(p: Penguji) {
    setMemuat(p.email);
    try {
      await ubah(p.email, false);
      tampilkan(isi(TEKS_QC.pengujiDihapus, { nama: p.nama }));
      router.refresh();
    } catch (err) {
      tampilkan({ pesan: err instanceof Error ? err.message : PESAN["MSG-G01"], bisaDitutup: true });
    } finally {
      setMemuat(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={tambah} noValidate className="flex flex-col gap-2 medium:flex-row medium:items-start">
        <TextField
          label={TEKS_QC.emailPenguji}
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder={TEKS_QC.phEmail}
          ikonDepan="mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={galat}
          disabled={memuat === "tambah"}
          className="medium:max-w-[400px]"
        />
        {/* Label field ±20px di atas kolom → tombol diturunkan agar sejajar kolom input */}
        <Tombol type="submit" varian="tonal" ikon="person_add" memuat={memuat === "tambah"} disabled={!email.trim()} className="medium:mt-[30px]">
          {TEKS_QC.tambahPenguji}
        </Tombol>
      </form>

      {penguji.length === 0 ? (
        <EmptyState ringkas ikon="group_add" judul={TEKS_QC.belumAdaPenguji} teks={TEKS_QC.teksBelumAdaPenguji} />
      ) : (
        <ul role="list" aria-label={TEKS_QC.penguji} className="flex flex-col gap-2">
          {penguji.map((p) => (
            <li key={p.id}>
              <Kartu padding="sm" className="flex items-center gap-3">
                <Avatar nama={p.nama} dekoratif />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-title-small text-on-surface">
                    <span className="truncate">{p.nama}</span>
                    <Badge nada={p.peran === "admin" ? "tertiary" : "neutral"}>{p.peran === "admin" ? TEKS_QC.admin : TEKS_QC.mahasiswa}</Badge>
                  </p>
                  <p className="truncate text-body-small text-on-surface-variant">
                    {p.email} · {isi(TEKS_QC.jumlahLaporan, { jumlah: formatAngka(p.jumlahLaporan) })}
                  </p>
                </div>
                <Tombol
                  varian="text"
                  ukuran="sm"
                  ikon="person_remove"
                  onClick={() => hapus(p)}
                  memuat={memuat === p.email}
                  disabled={memuat !== null && memuat !== p.email}
                  aria-label={isi(TEKS_QC.hapusPengujiDari, { nama: p.nama })}
                >
                  {TEKS_QC.hapusPenguji}
                </Tombol>
              </Kartu>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
