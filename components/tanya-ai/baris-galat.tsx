import { Ikon, Tombol } from "@/components/ui";

/** K-15: baris error di bawah pertanyaan yang gagal (MSG-C04) + Coba lagi. Kuota tidak berkurang. */
export function BarisGalat({ pesan, onCobaLagi, labelCobaLagi }: { pesan: string; onCobaLagi: () => void; labelCobaLagi: string }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-body-medium text-error">
      <Ikon nama="error" ukuran={18} isi />
      <span>{pesan}</span>
      <Tombol varian="text" ukuran="sm" ikon="refresh" onClick={onCobaLagi}>
        {labelCobaLagi}
      </Tombol>
    </div>
  );
}
