"use client";

import { GalatHalaman } from "@/components/dokumen/galat-halaman";

export default function GalatUpload(props: { error: unknown; retry: () => void }) {
  return <GalatHalaman {...props} />;
}
