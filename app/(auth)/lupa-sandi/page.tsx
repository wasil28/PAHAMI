import type { Metadata } from "next";
import { FormLupaSandi } from "@/components/auth/form-lupa-sandi";
import { PARAM } from "@/components/auth/rute";
import { TEKS_AUTH } from "@/components/auth/teks";

export const metadata: Metadata = { title: TEKS_AUTH.lupa.judul.replace("?", "") };

/** S-04 Lupa kata sandi. ?email=… diisi dari S-02 agar tidak mengetik ulang (ui-ux K-06). */
export default async function HalamanLupaSandi(props: PageProps<"/lupa-sandi">) {
  const sp = await props.searchParams;
  const mentah = sp[PARAM.email];
  const email = (Array.isArray(mentah) ? mentah[0] : mentah)?.slice(0, 255) ?? "";
  return <FormLupaSandi emailAwal={email} />;
}
