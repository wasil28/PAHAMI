"use client";

import { GalatHalaman } from "@/components/dokumen/galat-halaman";

export default function GalatDetailDokumen(props: { error: unknown; retry: () => void }) {
  return <GalatHalaman {...props} />;
}
