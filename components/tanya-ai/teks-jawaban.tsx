"use client";

import { memo } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Jawaban AI dirender sebagai markdown terbatas (FT-06 ui-ux §7): tebal, miring, daftar, tabel GFM.
// HTML mentah tidak dirender (react-markdown tanpa rehype-raw) dan tautan TIDAK aktif — teks
// berasal dari dokumen pengguna + model, jadi diperlakukan sebagai data, bukan navigasi.

const komponen: Components = {
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  a: ({ children }) => <span className="underline decoration-dotted">{children}</span>,
  h1: ({ children }) => <p className="my-2 text-title-medium">{children}</p>,
  h2: ({ children }) => <p className="my-2 text-title-medium">{children}</p>,
  h3: ({ children }) => <p className="my-2 text-title-small">{children}</p>,
  h4: ({ children }) => <p className="my-2 text-title-small">{children}</p>,
  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-outline-variant pl-3 italic">{children}</blockquote>,
  code: ({ children }) => <code className="rounded-xs bg-surface-container-highest px-1 text-body-medium">{children}</code>,
  pre: ({ children }) => <pre className="scrollbar-tipis my-2 overflow-x-auto rounded-sm bg-surface-container-highest p-2">{children}</pre>,
  table: ({ children }) => (
    <div className="scrollbar-tipis my-2 overflow-x-auto">
      <table className="w-full border-collapse text-body-medium">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-outline-variant px-2 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-outline-variant px-2 py-1 align-top">{children}</td>,
};

/** Di-memo agar riwayat panjang tidak diparse ulang setiap token streaming. */
export const TeksJawaban = memo(function TeksJawaban({ teks }: { teks: string }) {
  return (
    <div className="break-words text-body-large">
      <Markdown remarkPlugins={[remarkGfm]} components={komponen} disallowedElements={["img"]} unwrapDisallowed>
        {teks}
      </Markdown>
    </div>
  );
});
