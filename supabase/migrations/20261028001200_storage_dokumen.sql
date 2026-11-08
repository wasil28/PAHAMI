-- =====================================================================
-- Storage bucket `dokumen` (privat) + policy storage.objects.
-- Path file: {auth.uid()}/{kode}.pdf (KEPUTUSAN §3). Hanya pemilik folder (BR-06);
-- admin tidak punya policy. Batas fisik bucket = nilai maksimum rentang BR-29 (100 MB);
-- batas efektif (max_ukuran_mb) dicek di API & fn_buat_dokumen.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('dokumen', 'dokumen', false, 104857600, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Baca (mis. membuka PDF asli di halaman rujukan / signed URL dari sesi pengguna).
CREATE POLICY storage_dokumen_select_pemilik ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'dokumen'
         AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
         AND (SELECT public.fn_current_user_id()) IS NOT NULL);          -- akun nonaktif ditolak (BR-23)

-- Unggah: hanya ke path yang sudah dipesan fn_buat_dokumen (baris t_dokumen `diproses`
-- milik sendiri). Mencegah file liar / nama buatan sendiri yang bentrok dengan sequence.
-- (Signed upload URL dari server tetap bekerja tanpa bergantung pada policy ini.)
CREATE POLICY storage_dokumen_insert_pemilik ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dokumen'
              AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
              AND EXISTS (SELECT 1 FROM public.t_dokumen d
                           WHERE d.path_file = storage.objects.name
                             AND d.user_id = (SELECT public.fn_current_user_id())
                             AND d.status = 'diproses'));

-- Hapus: file di folder sendiri (FT-03 hapus dokumen, A9 pembersihan dokumen gagal).
CREATE POLICY storage_dokumen_delete_pemilik ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'dokumen'
         AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
         AND (SELECT public.fn_current_user_id()) IS NOT NULL);
-- Tidak ada policy UPDATE: file tidak boleh ditimpa (upsert) setelah diunggah.
