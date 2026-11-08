"use client";

import { useEffect, useRef } from "react";
import { Banner, TombolLink } from "@/components/ui";
import { Ikon } from "@/components/ui/ikon";
import { PESAN } from "@/lib/pesan";
import { JudulAuth } from "./judul-auth";
import { TEKS_AUTH } from "./teks";

/** S-05 state "Tautan tidak berlaku" (BR-26, MSG-A08): K-08..K-12. */
export function TautanTidakBerlaku() {
  const judulRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    judulRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col animate-masuk">
      <div aria-hidden className="mb-4 grid size-20 place-items-center rounded-full bg-error-container text-on-error-container">
        <Ikon nama="link_off" ukuran={48} />
      </div>
      <JudulAuth ref={judulRef} judul={TEKS_AUTH.atur.judulTidakBerlaku} />
      <Banner nada="error">{PESAN["MSG-A08"]}</Banner>
      <div className="mt-6 flex flex-col gap-2">
        <TombolLink href="/lupa-sandi" lebarPenuh>
          {TEKS_AUTH.atur.mintaTautanBaru}
        </TombolLink>
        <TombolLink href="/masuk" varian="text" lebarPenuh>
          {TEKS_AUTH.lupa.kembali}
        </TombolLink>
      </div>
    </div>
  );
}
