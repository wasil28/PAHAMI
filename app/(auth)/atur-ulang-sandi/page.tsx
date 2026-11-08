import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { FormAturUlangSandi } from "@/components/auth/form-atur-ulang-sandi";
import { TautanTidakBerlaku } from "@/components/auth/tautan-tidak-berlaku";
import { verifikasiTokenPemulihan } from "@/lib/auth/pemulihan";
import { COOKIE_PEMULIHAN, PARAM } from "@/components/auth/rute";
import { TEKS_AUTH } from "@/components/auth/teks";

export const metadata: Metadata = { title: TEKS_AUTH.atur.judul };

/**
 * S-05 Atur ulang kata sandi — hanya dari tautan email lewat /auth/konfirmasi (BR-26).
 * Valid bila ada sesi DAN cookie penanda pemulihan (bertanda tangan, belum kedaluwarsa) milik user yang sama; selain itu, atau
 * ?status=tidak-berlaku dari /auth/konfirmasi, tampil state MSG-A08.
 */
export default async function HalamanAturUlangSandi(props: PageProps<"/atur-ulang-sandi">) {
  const sp = await props.searchParams;
  if (sp[PARAM.status] === "tidak-berlaku") return <TautanTidakBerlaku />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const penanda = (await cookies()).get(COOKIE_PEMULIHAN)?.value;
  if (!user || !verifikasiTokenPemulihan(penanda, user.id)) return <TautanTidakBerlaku />;

  return <FormAturUlangSandi email={user.email} />;
}
