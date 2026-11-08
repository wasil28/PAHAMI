"use client";

import { useState } from "react";
import Link from "next/link";
import { Ikon, ProgressLinear, Skeleton, Tombol } from "@/components/ui";
import { formatRentangHalaman } from "@/lib/format";
import type { MateriRingkas } from "@/lib/materi/tipe";
import { LABEL, isiPlaceholder } from "@/lib/pesan";
import { cn } from "@/lib/tema/cn";
import { useDaftarMateri } from "./konteks-materi";
import { hrefMateri } from "./tautan-materi";
import { TEKS_BELAJAR } from "./teks";
import { useExpanded } from "./use-expanded";

const JUMLAH_KERANGKA = 4;

function LencanaMateri({ m, aktif }: { m: MateriRingkas; aktif: boolean }) {
  if (m.sudahDibaca && !aktif) {
    return <Ikon nama="check_circle" isi ukuran={28} className="shrink-0 text-primary" />;
  }
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full text-label-large",
        aktif ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface-variant",
      )}
    >
      {m.urutan}
    </span>
  );
}

function DaftarIsi() {
  const { status, materi, aktifId, dokumenId, topikId, cobaLagi } = useDaftarMateri();

  if (status === "menyiapkan") {
    return (
      <div className="px-4 pb-4">
        <p role="status" className="mb-3 flex items-center gap-2 text-body-medium text-on-surface-variant">
          <Ikon nama="auto_awesome" ukuran={18} className="text-primary" />
          {TEKS_BELAJAR.menyusunMateri}
        </p>
        <div aria-hidden className="flex flex-col gap-3">
          {Array.from({ length: JUMLAH_KERANGKA }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton bulat className="size-7 shrink-0" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (status === "gagal") {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2 px-4 pb-4 text-body-medium text-on-surface-variant">
        <Ikon nama="error" ukuran={18} className="text-error" />
        <span className="flex-1">{TEKS_BELAJAR.gagalMenyusunMateri}</span>
        <Tombol varian="text" ukuran="sm" ikon="refresh" onClick={cobaLagi}>
          {LABEL.cobaLagi}
        </Tombol>
      </div>
    );
  }

  return (
    <ol className="scrollbar-tipis min-h-0 overflow-y-auto px-2 pb-2">
      {materi.map((m) => {
        const aktif = m.id === aktifId;
        const status = aktif ? TEKS_BELAJAR.sedangDibuka : m.sudahDibaca ? TEKS_BELAJAR.sudahDibaca : null;
        return (
          <li key={m.id}>
            <Link
              href={hrefMateri(dokumenId, topikId, m.id)}
              aria-current={aktif ? "page" : undefined}
              className={cn(
                "state-layer relative flex items-start gap-3 rounded-md px-2 py-2",
                aktif && "bg-secondary-container text-on-secondary-container",
              )}
            >
              <LencanaMateri m={m} aktif={aktif} />
              <span className="min-w-0 flex-1">
                <span className={cn("line-clamp-2 text-title-small", aktif ? "text-on-secondary-container" : "text-on-surface")}>
                  {m.judul}
                </span>
                <span className="mt-0.5 block text-body-small text-on-surface-variant">
                  {formatRentangHalaman(m.halamanAwal, m.halamanAkhir)}
                  {status && <span className="sr-only">, {status}</span>}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function RingkasanJumlah() {
  const { status, materi } = useDaftarMateri();
  if (status !== "siap") return null;
  const dibaca = materi.filter((m) => m.sudahDibaca).length;
  const teks = isiPlaceholder(TEKS_BELAJAR.jumlahMateri, { jumlah: materi.length, dibaca });
  return (
    <>
      <p className="mt-0.5 text-body-small text-on-surface-variant">{teks}</p>
      <ProgressLinear nilai={(dibaca / materi.length) * 100} label={teks} className="mt-3" />
    </>
  );
}

/**
 * Kartu "Isi topik": daftar materi (sub-bab) berurutan, materi aktif disorot, yang sudah dibaca
 * bercentang. `lipatDiPonsel` → di Compact/Medium tampil sebagai <details> tertutup agar isi
 * materi tidak terdorong ke bawah (halaman materi).
 */
export function IsiTopik({ lipatDiPonsel = false, className }: { lipatDiPonsel?: boolean; className?: string }) {
  const expanded = useExpanded();
  const kelas = cn("flex min-h-0 flex-col rounded-lg bg-surface-container-low text-on-surface", className);

  if (lipatDiPonsel && !expanded) {
    return (
      <details className={cn(kelas, "group")}>
        <summary className="state-layer relative flex cursor-pointer list-none items-center gap-3 rounded-lg p-4 [&::-webkit-details-marker]:hidden">
          <Ikon nama="format_list_numbered" className="text-primary" />
          <span className="flex-1">
            <span className="block text-title-medium">{TEKS_BELAJAR.isiTopik}</span>
            <RingkasanJumlah />
          </span>
          <Ikon nama="expand_more" className="transition-transform group-open:rotate-180" />
        </summary>
        <DaftarIsi />
      </details>
    );
  }

  if (expanded) return <IsiTopikLipat kelas={kelas} />;

  return (
    <section aria-labelledby="judul-isi-topik" className={kelas}>
      <div className="shrink-0 px-4 pt-4 pb-3">
        <h2 id="judul-isi-topik" className="flex items-center gap-2 text-title-medium">
          <Ikon nama="format_list_numbered" ukuran={20} className="text-primary" />
          {TEKS_BELAJAR.isiTopik}
        </h2>
        <RingkasanJumlah />
      </div>
      <DaftarIsi />
    </section>
  );
}

const KUNCI_TERBUKA = "pahami:isi-topik-terbuka";

/** Versi kolom kanan (Expanded): kepala bisa diklik untuk melipat agar Tanya AI mendapat ruang lebih. */
function IsiTopikLipat({ kelas }: { kelas: string }) {
  // Hanya dirender di klien setelah lebar layar diketahui (useExpanded), jadi aman membaca
  // localStorage saat inisialisasi. Gagal baca → tetap terbuka.
  const [terbuka, setTerbuka] = useState(() => {
    try {
      return localStorage.getItem(KUNCI_TERBUKA) !== "0";
    } catch {
      return true;
    }
  });
  const ubah = () => {
    const baru = !terbuka;
    setTerbuka(baru);
    try {
      localStorage.setItem(KUNCI_TERBUKA, baru ? "1" : "0");
    } catch {}
  };
  return (
    <section aria-labelledby="judul-isi-topik" className={kelas}>
      <h2 id="judul-isi-topik" className="shrink-0">
        <button
          type="button"
          onClick={ubah}
          aria-expanded={terbuka}
          aria-controls="daftar-isi-topik"
          className="state-layer relative flex w-full items-center gap-2 rounded-lg px-4 pt-3 pb-2 text-left"
        >
          <Ikon nama="format_list_numbered" ukuran={20} className="text-primary" />
          <span className="flex-1 text-title-medium">{TEKS_BELAJAR.isiTopik}</span>
          <Ikon nama="expand_more" className={cn("transition-transform", terbuka && "rotate-180")} />
        </button>
      </h2>
      <div className="shrink-0 px-4 pb-2">
        <RingkasanJumlah />
      </div>
      {terbuka && (
        <div id="daftar-isi-topik" className="flex min-h-0 flex-col">
          <DaftarIsi />
        </div>
      )}
    </section>
  );
}
