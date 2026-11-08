import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Penjelasan materi = markdown terbatas dari AI (lib/materi/tipe.ts): sub-judul ###, paragraf,
// daftar, **tebal**. Pola sama dengan TeksJawaban (Tanya AI): tanpa rehype-raw sehingga HTML
// mentah tidak dirender, gambar dibuang, tautan tidak aktif — isi berasal dari dokumen pengguna.
// Judul markdown diturunkan ke h3/h4 karena h2 dipakai untuk bagian halaman.

const komponen: Components = {
  p: ({ children }) => <p className="my-4 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-4 list-disc space-y-2 pl-6 marker:text-primary">{children}</ul>,
  ol: ({ children }) => <ol className="my-4 list-decimal space-y-2 pl-6 marker:text-primary">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-on-surface">{children}</strong>,
  a: ({ children }) => <span className="underline decoration-dotted">{children}</span>,
  h1: ({ children }) => <h3 className="mt-8 mb-3 text-title-large text-on-surface first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-8 mb-3 text-title-large text-on-surface first:mt-0">{children}</h3>,
  h3: ({ children }) => <h3 className="mt-8 mb-3 text-title-large text-on-surface first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="mt-6 mb-2 text-title-medium text-on-surface first:mt-0">{children}</h4>,
  blockquote: ({ children }) => <blockquote className="my-4 border-l-2 border-primary pl-4 italic">{children}</blockquote>,
  code: ({ children }) => <code className="rounded-xs bg-surface-container-highest px-1 text-body-medium">{children}</code>,
  pre: ({ children }) => <pre className="scrollbar-tipis my-4 overflow-x-auto rounded-sm bg-surface-container-highest p-3">{children}</pre>,
  table: ({ children }) => (
    <div className="scrollbar-tipis my-4 overflow-x-auto">
      <table className="w-full border-collapse text-body-medium">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-outline-variant bg-surface-container px-3 py-2 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-outline-variant px-3 py-2 align-top">{children}</td>,
  hr: () => <hr className="my-6 border-outline-variant" />,
};

export function PenjelasanMateri({ teks }: { teks: string }) {
  return (
    <div className="break-words text-body-large text-on-surface-variant">
      <Markdown remarkPlugins={[remarkGfm]} components={komponen} disallowedElements={["img"]} unwrapDisallowed>
        {teks}
      </Markdown>
    </div>
  );
}
