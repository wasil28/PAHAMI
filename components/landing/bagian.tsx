import { Ikon } from "@/components/ui/ikon";
import { NAMA_APLIKASI } from "@/lib/config";
import { cn } from "@/lib/tema/cn";

/** Judul bagian landing: overline + h2 + deskripsi, rata tengah. */
function JudulBagian({ id, overline, judul, deskripsi }: { id: string; overline: string; judul: string; deskripsi?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-label-large uppercase tracking-widest text-tertiary">{overline}</p>
      <h2 id={id} className="mt-2 text-headline-medium font-bold tracking-tight text-on-surface medium:text-headline-large">
        {judul}
      </h2>
      {deskripsi && <p className="mt-3 text-body-large text-on-surface-variant">{deskripsi}</p>}
    </div>
  );
}

const LANGKAH = [
  { ikon: "upload_file", judul: "Upload PDF", teks: "Pilih modul, buku, atau e-book berbasis teks yang sedang kamu pelajari." },
  { ikon: "account_tree", judul: "Jadi topik", teks: "Isinya disusun jadi topik berurutan, lengkap dengan ringkasan per topik." },
  { ikon: "quiz", judul: "Latihan", teks: "Kerjakan 5 soal pilihan ganda per topik dan baca pembahasannya." },
  { ikon: "forum", judul: "Tanya AI", teks: "Masih bingung? Tanyakan — jawabannya diambil dari halaman bukumu." },
] as const;

/** Cara kerja: 4 langkah (Breakdown S-01). */
export function CaraKerja() {
  return (
    <section aria-labelledby="cara-kerja" className="bg-surface-container-low py-16 medium:py-20">
      <div className="mx-auto max-w-[1120px] px-4 medium:px-6">
        <JudulBagian
          id="cara-kerja"
          overline="Cara kerja"
          judul="Empat langkah, langsung belajar"
          deskripsi="Tidak perlu menyusun rencana belajar sendiri. Cukup unggah, sisanya kami bantu tata."
        />
        <ol className="mt-12 grid gap-4 medium:grid-cols-2 large:grid-cols-4">
          {LANGKAH.map((l, i) => (
            <li key={l.judul} className="relative rounded-lg bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="grid size-12 place-items-center rounded-md bg-primary-container text-on-primary-container">
                  <Ikon nama={l.ikon} />
                </span>
                <span className="text-headline-small font-bold text-outline-variant">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-title-medium text-on-surface">{l.judul}</h3>
              <p className="mt-1 text-body-medium text-on-surface-variant">{l.teks}</p>
              {i < LANGKAH.length - 1 && (
                <span
                  aria-hidden
                  className="absolute -right-3 top-1/2 z-10 hidden size-6 -translate-y-1/2 place-items-center rounded-full bg-primary text-on-primary large:grid"
                >
                  <Ikon nama="chevron_right" ukuran={18} />
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const FITUR = [
  { ikon: "auto_awesome_mosaic", nada: "primary", judul: "Topik otomatis", teks: "Bab yang panjang dipecah jadi topik kecil yang urut dari dasar ke lanjut." },
  { ikon: "summarize", nada: "tertiary", judul: "Ringkasan materi", teks: "Konsep inti, poin penting, dan contoh tiap topik — enak dibaca sebelum ujian." },
  { ikon: "task_alt", nada: "secondary", judul: "Latihan + pembahasan", teks: "Soal pilihan ganda dengan penjelasan kenapa jawabannya benar atau salah." },
  { ikon: "find_in_page", nada: "primary", judul: "Tanya AI bersumber halaman", teks: "Setiap jawaban menunjukkan halaman sumbernya, jadi mudah dicek ulang." },
  { ikon: "insights", nada: "tertiary", judul: "Dashboard progres", teks: "Lihat topik yang sudah selesai, yang perlu diulang, dan riwayat skormu." },
  { ikon: "shield_lock", nada: "secondary", judul: "Dokumen privat", teks: "PDF yang kamu unggah hanya bisa diakses olehmu sendiri — admin pun tidak." },
] as const;

const NADA: Record<(typeof FITUR)[number]["nada"], string> = {
  primary: "bg-primary-container text-on-primary-container",
  secondary: "bg-secondary-container text-on-secondary-container",
  tertiary: "bg-tertiary-container text-on-tertiary-container",
};

/** Fitur: 6 kartu (Breakdown S-01). */
export function FiturLanding() {
  return (
    <section aria-labelledby="fitur" className="py-16 medium:py-24">
      <div className="mx-auto max-w-[1120px] px-4 medium:px-6">
        <JudulBagian id="fitur" overline="Fitur" judul="Semua yang kamu butuhkan untuk paham, bukan sekadar hafal" />
        <div className="mt-12 grid gap-4 medium:grid-cols-2 expanded:grid-cols-3">
          {FITUR.map((f) => (
            <article key={f.judul} className="rounded-lg bg-surface-container-low p-6 transition-shadow duration-200 ease-standard hover:shadow-2">
              <span className={cn("grid size-12 place-items-center rounded-md", NADA[f.nada])}>
                <Ikon nama={f.ikon} />
              </span>
              <h3 className="mt-4 text-title-medium text-on-surface">{f.judul}</h3>
              <p className="mt-1.5 text-body-medium text-on-surface-variant">{f.teks}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const BEDA = [
  { aspek: "Sumber jawaban", umum: "Pengetahuan umum dari internet, belum tentu sesuai modulmu.", kami: "Hanya dari isi PDF yang kamu unggah." },
  { aspek: "Rujukan halaman", umum: "Tidak ada, sulit dicek kebenarannya.", kami: "Selalu disertai nomor halaman, misalnya hal. 12." },
  { aspek: "Bila tidak ada di buku", umum: "Sering tetap menjawab dengan yakin, padahal bisa keliru.", kami: "Jujur bilang materinya tidak ditemukan di dokumen." },
] as const;

/** Pembeda: AI umum vs Pahami (Breakdown S-01). */
export function PembedaLanding() {
  return (
    <section aria-labelledby="beda" className="px-4 pb-16 medium:px-6 medium:pb-24">
      <div className="mx-auto max-w-[960px] overflow-hidden rounded-xl bg-surface-container-low">
        <div className="px-6 pb-6 pt-10 medium:px-10">
          <JudulBagian
            id="beda"
            overline={`Kenapa ${NAMA_APLIKASI}?`}
            judul="Berbeda dengan AI biasa"
            deskripsi="Untuk belajar, yang penting bukan cuma jawaban cepat — tapi jawaban yang bisa dipercaya dan ditelusuri."
          />
        </div>
        <div className="hidden grid-cols-[1fr_1.3fr_1.3fr] gap-4 px-10 py-3 text-label-large uppercase tracking-wide text-on-surface-variant medium:grid">
          <span>Aspek</span>
          <span>AI umum</span>
          <span className="text-primary">{NAMA_APLIKASI}</span>
        </div>
        <dl className="divide-y divide-outline-variant pb-4">
          {BEDA.map((b) => (
            <div key={b.aspek} className="grid gap-3 px-6 py-5 medium:grid-cols-[1fr_1.3fr_1.3fr] medium:gap-4 medium:px-10">
              <dt className="text-title-small text-on-surface">{b.aspek}</dt>
              <dd className="flex gap-2 text-body-medium text-on-surface-variant">
                <Ikon nama="cancel" isi ukuran={20} className="shrink-0 text-error" />
                <span>
                  <span className="font-semibold text-on-surface medium:hidden">AI umum: </span>
                  {b.umum}
                </span>
              </dd>
              <dd className="flex gap-2 rounded-md bg-primary-container p-3 text-body-medium text-on-primary-container medium:-my-3">
                <Ikon nama="check_circle" isi ukuran={20} className="shrink-0" />
                <span>
                  <span className="font-semibold medium:hidden">{NAMA_APLIKASI}: </span>
                  {b.kami}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
