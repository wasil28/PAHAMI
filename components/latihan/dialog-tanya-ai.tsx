"use client";

import { Dialog, Tombol } from "@/components/ui";
import { PanelTanyaAI } from "@/components/tanya-ai/panel-tanya-ai";
import { LABEL } from "@/lib/pesan";

type Props = {
  terbuka: boolean;
  onTutup: () => void;
  dokumenId: number;
  topikId: number;
  judulTopik: string;
  saranPertanyaan: string[];
};

/**
 * KEPUTUSAN B6: "Masih bingung? Tanya AI" membuka panel di atas latihan — sesi latihan tidak
 * ditinggalkan sehingga jawaban tidak hilang (BR-33). Panel hanya dipasang saat dialog terbuka
 * agar riwayat chat tidak dimuat bila tidak dipakai.
 */
export function DialogTanyaAI({ terbuka, onTutup, dokumenId, topikId, judulTopik, saranPertanyaan }: Props) {
  return (
    <Dialog
      terbuka={terbuka}
      onTutup={onTutup}
      lebar="md"
      judul={LABEL.tanyaAi}
      aksi={
        <Tombol varian="text" onClick={onTutup}>
          {LABEL.tutup}
        </Tombol>
      }
    >
      {terbuka && (
        <div className="flex h-[60dvh] min-h-[360px] flex-col">
          <PanelTanyaAI dokumenId={dokumenId} topikId={topikId} judulTopik={judulTopik} saranPertanyaan={saranPertanyaan} />
        </div>
      )}
    </Dialog>
  );
}
