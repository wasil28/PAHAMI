import { EmptyState, TombolLink } from "@/components/ui";
import { LABEL, PESAN, isiPlaceholder } from "@/lib/pesan";
import { rute } from "@/lib/dokumen/tahap";
import { TEKS_DOKUMEN } from "@/components/dokumen/teks";

/** StateKosongBeranda (FT-03 K-11): MSG-E01; Upload PDF menjadi satu-satunya Filled. */
export function StateKosongBeranda({ maxUkuranMb }: { maxUkuranMb: number }) {
  return (
    <EmptyState
      ikon="picture_as_pdf"
      judul={PESAN["MSG-E01"]}
      teks={isiPlaceholder(TEKS_DOKUMEN.bantuanKosong, { mb: maxUkuranMb })}
      aksi={
        <TombolLink href={rute.upload} varian="filled" ikon="upload_file">
          {LABEL.uploadPdf}
        </TombolLink>
      }
    />
  );
}
