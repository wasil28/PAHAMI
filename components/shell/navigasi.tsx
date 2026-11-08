"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ikon } from "@/components/ui/ikon";
import { cn } from "@/lib/tema/cn";
import { isAktif, type ItemNav } from "./menu";

/*
 * Bagian client terkecil dari shell: hanya membaca pathname untuk menandai menu aktif.
 * Satu komponen, tiga gaya sesuai window size class M3 (Panduan §1.7):
 * - bar    : navigation bar bawah (compact < 600)
 * - rail   : navigation rail (medium 600–839)
 * - drawer : navigation drawer (expanded ≥ 840)
 */
export type GayaNav = "bar" | "rail" | "drawer";

export function NavItems({ menu, gaya }: { menu: ItemNav[]; gaya: GayaNav }) {
  const pathname = usePathname();
  return (
    <ul role="list" className={cn(gaya === "bar" ? "grid h-full auto-cols-fr grid-flow-col" : "flex flex-col", gaya === "rail" ? "gap-3" : "")}>
      {menu.map((item) => {
        const aktif = isAktif(pathname, item);
        return (
          <li key={item.href} className={gaya === "drawer" ? "" : "flex justify-center"}>
            <Link
              href={item.href}
              aria-label={gaya !== "drawer" && item.labelPendek ? item.label : undefined}
              aria-current={aktif ? "page" : undefined}
              className={cn(
                "group flex text-on-surface-variant outline-none",
                gaya === "drawer"
                  ? cn(
                      "state-layer relative h-14 items-center gap-3 rounded-full px-4 text-label-large focus-visible:outline-3 focus-visible:outline-secondary",
                      aktif ? "bg-secondary-container text-on-secondary-container" : "hover:text-on-surface",
                    )
                  : cn("w-full flex-col items-center gap-1", gaya === "bar" ? "h-full justify-center pt-3 pb-4" : "py-1", aktif && "text-on-surface"),
              )}
            >
              {gaya === "drawer" ? (
                <>
                  <Ikon nama={item.ikon} isi={aktif} />
                  <span className="truncate">{item.label}</span>
                </>
              ) : (
                <>
                  {/* Indikator pil 56/64×32; state layer & cincin fokus ada di indikator */}
                  <span
                    className={cn(
                      "state-layer relative grid h-8 place-items-center rounded-full transition-colors",
                      gaya === "bar" ? "w-16" : "w-14",
                      "group-focus-visible:outline-3 group-focus-visible:outline-offset-2 group-focus-visible:outline-secondary group-hover:before:opacity-8",
                      aktif && "bg-secondary-container text-on-secondary-container",
                    )}
                  >
                    <Ikon nama={item.ikon} isi={aktif} />
                  </span>
                  <span className={cn("text-label-medium", aktif && "font-bold")}>{item.labelPendek ?? item.label}</span>
                </>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
