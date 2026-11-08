import { ProgressCircular } from "@/components/ui";
import { TEKS_AUTH } from "@/components/auth/teks";

/** S-05 K-15: state "Memeriksa tautan…" selama sesi pemulihan diperiksa di server. */
export default function MemeriksaTautan() {
  return (
    <div role="status" className="flex flex-col items-center gap-4 py-12 text-body-medium text-on-surface-variant">
      <ProgressCircular />
      <p>{TEKS_AUTH.atur.memeriksa}</p>
    </div>
  );
}
