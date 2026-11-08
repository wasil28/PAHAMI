"use client";

import { Dialog, Tombol } from "@/components/ui";
import type { RujukanChat } from "@/lib/chat/tipe";
import { isiPlaceholder, LABEL, TEKS } from "@/lib/pesan";
import { TEKS_TANYA } from "./teks";

/**
 * Lembar kutipan rujukan (KEPUTUSAN C6, ui-ux K-12): kutipan asli t_chat_rujukan + nomor halaman.
 * Dialog native (top layer) sehingga tetap benar walau panel sendiri berada di dalam Dialog (B6).
 */
export function DialogKutipan({ rujukan, onTutup }: { rujukan: RujukanChat | null; onTutup: () => void }) {
  return (
    <Dialog
      terbuka={rujukan !== null}
      onTutup={onTutup}
      judul={rujukan ? isiPlaceholder(TEKS_TANYA.kutipanHal, { halaman: rujukan.halaman }) : ""}
      aksi={
        <Tombol varian="text" onClick={onTutup}>
          {LABEL.tutup}
        </Tombol>
      }
    >
      {rujukan && (
        <figure className="border-l-[3px] border-primary bg-surface-container px-4 py-3">
          <blockquote className="text-body-medium italic text-on-surface">“{rujukan.kutipan}”</blockquote>
          <figcaption className="mt-2 text-label-medium text-on-surface-variant">{TEKS.diambilDariBuku}</figcaption>
        </figure>
      )}
    </Dialog>
  );
}
