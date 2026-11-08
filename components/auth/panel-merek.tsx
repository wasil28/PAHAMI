"use client";

import { usePathname } from "next/navigation";
import { Ikon } from "@/components/ui/ikon";
import { Logo } from "@/components/shell/logo";
import { IlustrasiBelajar } from "@/components/landing/ilustrasi-belajar";
import { cn } from "@/lib/tema/cn";
import { TEKS_AUTH } from "./teks";

type Varian = "masuk" | "daftar" | "reset";

function varianDariPath(pathname: string): Varian {
  if (pathname.startsWith("/daftar")) return "daftar";
  if (pathname.startsWith("/lupa-sandi") || pathname.startsWith("/atur-ulang-sandi")) return "reset";
  return "masuk";
}

/**
 * Panel merek K-09/K-11/K-12/K-13 (Expanded saja, latar primary-container). Layout (auth) dipakai
 * bersama, jadi varian dipilih dari path. Dekoratif kecuali logo (→ S-01).
 */
export function PanelMerek({ className }: { className?: string }) {
  const varian = varianDariPath(usePathname());
  const p = TEKS_AUTH.panel;

  return (
    <aside className={cn("relative flex-col overflow-hidden bg-primary-container px-12 py-10 text-on-primary-container large:px-16", className)}>
      {/* Bentuk dekoratif lembut */}
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-primary/10" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-tertiary-container/60" />

      <Logo className="relative self-start" />

      <div className="relative my-auto max-w-[480px] py-10">
        <p className="text-headline-medium font-semibold">{p[varian]}</p>

        {varian === "daftar" ? (
          <ol className="mt-8 space-y-4">
            {p.langkah.map((l, i) => (
              <li key={l} className="flex items-center gap-4 text-body-large">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-label-large text-on-primary">
                  {i + 1}
                </span>
                {l}
              </li>
            ))}
          </ol>
        ) : (
          <ul className="mt-8 space-y-3">
            {p.keunggulan.map((k) => (
              <li key={k} className="flex items-center gap-3 text-body-large">
                <Ikon nama="check_circle" isi className="text-primary" />
                {k}
              </li>
            ))}
          </ul>
        )}

        {varian !== "reset" && <IlustrasiBelajar ringkas className="mt-10" />}
        {varian === "reset" && (
          <div aria-hidden className="mt-10 grid size-28 place-items-center rounded-full bg-surface-container-lowest/70 text-primary">
            <Ikon nama="lock_reset" ukuran={56} />
          </div>
        )}
      </div>
    </aside>
  );
}
