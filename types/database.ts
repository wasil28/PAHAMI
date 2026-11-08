// Tipe Database Supabase untuk Pahami — ditulis tangan mengikuti bentuk keluaran
// `npx supabase gen types typescript` agar createClient<Database>() memberi tipe .from()/.rpc().
// Sumber: supabase/migrations/*.sql. Setelah project cloud tersedia, file ini boleh diganti hasil:
//   npx supabase gen types typescript --linked > types/database.ts   (lalu salin alias di bagian bawah)
// Kolom embedding (vector(768)) bertipe string: kirim '[0.01,-0.02,...]'.
// Catatan: kolom t_soal.kunci/pembahasan/halaman_rujukan TIDAK bisa dibaca klien sesi (hak kolom);
// pilih kolom eksplisit, jangan select('*') pada t_soal.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      log_pemakaian_ai: {
        Row: {
          id: number;
          user_id: number;
          dokumen_id: number | null;
          fitur: string;
          model: string;
          token_masuk: number;
          token_keluar: number;
          biaya_rp: number;
          durasi_ms: number | null;
          is_sukses: boolean;
          created_at: string;
        };
        Insert: {
          id?: never;
          user_id: number;
          dokumen_id?: number | null;
          fitur: string;
          model: string;
          token_masuk?: number;
          token_keluar?: number;
          biaya_rp?: number;
          durasi_ms?: number | null;
          is_sukses?: boolean;
          created_at?: string;
        };
        Update: {
          id?: never;
          user_id?: number;
          dokumen_id?: number | null;
          fitur?: string;
          model?: string;
          token_masuk?: number;
          token_keluar?: number;
          biaya_rp?: number;
          durasi_ms?: number | null;
          is_sukses?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_pemakaian_dokumen";
            columns: ["dokumen_id"];
            isOneToOne: false;
            referencedRelation: "t_dokumen";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_pemakaian_user";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "m_users";
            referencedColumns: ["id"];
          },
        ];
      };
      log_system: {
        Row: {
          id: number;
          user_id: number | null;
          action: string;
          modul: string;
          target_id: string | null;
          detail: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          user_id?: number | null;
          action: string;
          modul: string;
          target_id?: string | null;
          detail?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: never;
          user_id?: number | null;
          action?: string;
          modul?: string;
          target_id?: string | null;
          detail?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_log_system_user";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "m_users";
            referencedColumns: ["id"];
          },
        ];
      };
      m_menu: {
        Row: {
          id: number;
          parent_id: number | null;
          kode: string;
          nama: string;
          ikon: string | null;
          route_path: string | null;
          urutan: number;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: never;
          parent_id?: number | null;
          kode: string;
          nama: string;
          ikon?: string | null;
          route_path?: string | null;
          urutan?: number;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: never;
          parent_id?: number | null;
          kode?: string;
          nama?: string;
          ikon?: string | null;
          route_path?: string | null;
          urutan?: number;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_menu_parent";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "m_menu";
            referencedColumns: ["id"];
          },
        ];
      };
      m_otorisasi_menu: {
        Row: {
          id: number;
          role_id: number;
          menu_id: number;
          allow_view: boolean;
          allow_new: boolean;
          allow_edit: boolean;
          allow_delete: boolean;
          created_by: string | null;
          created_at: string;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: never;
          role_id: number;
          menu_id: number;
          allow_view?: boolean;
          allow_new?: boolean;
          allow_edit?: boolean;
          allow_delete?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: never;
          role_id?: number;
          menu_id?: number;
          allow_view?: boolean;
          allow_new?: boolean;
          allow_edit?: boolean;
          allow_delete?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_otorisasi_menu";
            columns: ["menu_id"];
            isOneToOne: false;
            referencedRelation: "m_menu";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_otorisasi_role";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "m_role";
            referencedColumns: ["id"];
          },
        ];
      };
      m_pengaturan_sistem: {
        Row: {
          id: number;
          kode: string;
          nilai: string;
          nilai_default: string;
          nilai_min: number | null;
          nilai_max: number | null;
          tipe_nilai: string;
          satuan: string | null;
          is_tampil: boolean;
          keterangan: string | null;
          created_by: string | null;
          created_at: string;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: never;
          kode: string;
          nilai: string;
          nilai_default: string;
          nilai_min?: number | null;
          nilai_max?: number | null;
          tipe_nilai?: string;
          satuan?: string | null;
          is_tampil?: boolean;
          keterangan?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: never;
          kode?: string;
          nilai?: string;
          nilai_default?: string;
          nilai_min?: number | null;
          nilai_max?: number | null;
          tipe_nilai?: string;
          satuan?: string | null;
          is_tampil?: boolean;
          keterangan?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      m_role: {
        Row: {
          id: number;
          kode: string;
          nama: string;
          deskripsi: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: never;
          kode: string;
          nama: string;
          deskripsi?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: never;
          kode?: string;
          nama?: string;
          deskripsi?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      m_user_role: {
        Row: {
          id: number;
          user_id: number;
          role_id: number;
          created_at: string;
        };
        Insert: {
          id?: never;
          user_id: number;
          role_id: number;
          created_at?: string;
        };
        Update: {
          id?: never;
          user_id?: number;
          role_id?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_user_role_role";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "m_role";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_user_role_user";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "m_users";
            referencedColumns: ["id"];
          },
        ];
      };
      m_users: {
        Row: {
          id: number;
          auth_id: string;
          email: string;
          nama: string;
          is_active: boolean;
          is_penguji: boolean;
          last_active_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_by: string | null;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: never;
          auth_id: string;
          email: string;
          nama: string;
          is_active?: boolean;
          is_penguji?: boolean;
          last_active_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_by?: string | null;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: never;
          auth_id?: string;
          email?: string;
          nama?: string;
          is_active?: boolean;
          is_penguji?: boolean;
          last_active_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_by?: string | null;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      t_chat: {
        Row: {
          id: number;
          user_id: number;
          dokumen_id: number;
          topik_id: number | null;
          peran: string;
          isi: string;
          is_tidak_ditemukan: boolean;
          is_terputus: boolean;
          skor_relevansi: number | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          user_id: number;
          dokumen_id: number;
          topik_id?: number | null;
          peran: string;
          isi: string;
          is_tidak_ditemukan?: boolean;
          is_terputus?: boolean;
          skor_relevansi?: number | null;
          created_at?: string;
        };
        Update: {
          id?: never;
          user_id?: number;
          dokumen_id?: number;
          topik_id?: number | null;
          peran?: string;
          isi?: string;
          is_tidak_ditemukan?: boolean;
          is_terputus?: boolean;
          skor_relevansi?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_chat_dokumen";
            columns: ["dokumen_id"];
            isOneToOne: false;
            referencedRelation: "t_dokumen";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_chat_topik";
            columns: ["topik_id"];
            isOneToOne: false;
            referencedRelation: "t_topik";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_chat_user";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "m_users";
            referencedColumns: ["id"];
          },
        ];
      };
      t_chat_rujukan: {
        Row: {
          id: number;
          chat_id: number;
          chunk_id: number | null;
          halaman: number;
          kutipan: string;
          created_at: string;
        };
        Insert: {
          id?: never;
          chat_id: number;
          chunk_id?: number | null;
          halaman: number;
          kutipan: string;
          created_at?: string;
        };
        Update: {
          id?: never;
          chat_id?: number;
          chunk_id?: number | null;
          halaman?: number;
          kutipan?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_chat_rujukan_chat";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "t_chat";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_chat_rujukan_chunk";
            columns: ["chunk_id"];
            isOneToOne: false;
            referencedRelation: "t_chunk";
            referencedColumns: ["id"];
          },
        ];
      };
      t_chunk: {
        Row: {
          id: number;
          dokumen_id: number;
          urutan: number;
          halaman_awal: number;
          halaman_akhir: number;
          judul_bagian: string | null;
          isi: string;
          jumlah_token: number | null;
          embedding: string;
          created_at: string;
        };
        Insert: {
          id?: never;
          dokumen_id: number;
          urutan: number;
          halaman_awal: number;
          halaman_akhir: number;
          judul_bagian?: string | null;
          isi: string;
          jumlah_token?: number | null;
          embedding: string;
          created_at?: string;
        };
        Update: {
          id?: never;
          dokumen_id?: number;
          urutan?: number;
          halaman_awal?: number;
          halaman_akhir?: number;
          judul_bagian?: string | null;
          isi?: string;
          jumlah_token?: number | null;
          embedding?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_chunk_dokumen";
            columns: ["dokumen_id"];
            isOneToOne: false;
            referencedRelation: "t_dokumen";
            referencedColumns: ["id"];
          },
        ];
      };
      t_dokumen: {
        Row: {
          id: number;
          kode: string;
          user_id: number;
          judul: string;
          nama_file: string;
          path_file: string;
          ukuran_byte: number;
          jumlah_halaman: number | null;
          jumlah_topik: number | null;
          status: string;
          tahap: string | null;
          pesan_gagal: string | null;
          selesai_diproses_at: string | null;
          aktivitas_terakhir_at: string | null;
          topik_terakhir_id: number | null;
          created_by: string | null;
          created_at: string;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: never;
          kode: string;
          user_id: number;
          judul: string;
          nama_file: string;
          path_file: string;
          ukuran_byte: number;
          jumlah_halaman?: number | null;
          jumlah_topik?: number | null;
          status?: string;
          tahap?: string | null;
          pesan_gagal?: string | null;
          selesai_diproses_at?: string | null;
          aktivitas_terakhir_at?: string | null;
          topik_terakhir_id?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: never;
          kode?: string;
          user_id?: number;
          judul?: string;
          nama_file?: string;
          path_file?: string;
          ukuran_byte?: number;
          jumlah_halaman?: number | null;
          jumlah_topik?: number | null;
          status?: string;
          tahap?: string | null;
          pesan_gagal?: string | null;
          selesai_diproses_at?: string | null;
          aktivitas_terakhir_at?: string | null;
          topik_terakhir_id?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_dokumen_topik_terakhir";
            columns: ["topik_terakhir_id"];
            isOneToOne: false;
            referencedRelation: "t_topik";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_dokumen_user";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "m_users";
            referencedColumns: ["id"];
          },
        ];
      };
      t_latihan: {
        Row: {
          id: number;
          user_id: number;
          topik_id: number;
          skor: number;
          jumlah_benar: number;
          jumlah_soal: number;
          snapshot_judul_topik: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          user_id: number;
          topik_id: number;
          skor: number;
          jumlah_benar: number;
          jumlah_soal: number;
          snapshot_judul_topik: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: never;
          user_id?: number;
          topik_id?: number;
          skor?: number;
          jumlah_benar?: number;
          jumlah_soal?: number;
          snapshot_judul_topik?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_latihan_topik";
            columns: ["topik_id"];
            isOneToOne: false;
            referencedRelation: "t_topik";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_latihan_user";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "m_users";
            referencedColumns: ["id"];
          },
        ];
      };
      t_latihan_jawaban: {
        Row: {
          id: number;
          latihan_id: number;
          soal_id: number;
          dipilih: string;
          is_benar: boolean;
          created_at: string;
        };
        Insert: {
          id?: never;
          latihan_id: number;
          soal_id: number;
          dipilih: string;
          is_benar: boolean;
          created_at?: string;
        };
        Update: {
          id?: never;
          latihan_id?: number;
          soal_id?: number;
          dipilih?: string;
          is_benar?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_latihan_jawaban_latihan";
            columns: ["latihan_id"];
            isOneToOne: false;
            referencedRelation: "t_latihan";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_latihan_jawaban_soal";
            columns: ["soal_id"];
            isOneToOne: false;
            referencedRelation: "t_soal";
            referencedColumns: ["id"];
          },
        ];
      };
      t_reservasi_tanya: {
        Row: {
          id: number;
          user_id: number;
          created_at: string;
        };
        Insert: {
          id?: never;
          user_id: number;
          created_at?: string;
        };
        Update: {
          id?: never;
          user_id?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_reservasi_tanya_user";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "m_users";
            referencedColumns: ["id"];
          },
        ];
      };
      t_soal: {
        Row: {
          id: number;
          topik_id: number;
          urutan: number;
          pertanyaan: string;
          pilihan_a: string;
          pilihan_b: string;
          pilihan_c: string;
          pilihan_d: string;
          kunci: string;
          pembahasan: string;
          halaman_rujukan: number;
          created_at: string;
        };
        Insert: {
          id?: never;
          topik_id: number;
          urutan: number;
          pertanyaan: string;
          pilihan_a: string;
          pilihan_b: string;
          pilihan_c: string;
          pilihan_d: string;
          kunci: string;
          pembahasan: string;
          halaman_rujukan: number;
          created_at?: string;
        };
        Update: {
          id?: never;
          topik_id?: number;
          urutan?: number;
          pertanyaan?: string;
          pilihan_a?: string;
          pilihan_b?: string;
          pilihan_c?: string;
          pilihan_d?: string;
          kunci?: string;
          pembahasan?: string;
          halaman_rujukan?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_soal_topik";
            columns: ["topik_id"];
            isOneToOne: false;
            referencedRelation: "t_topik";
            referencedColumns: ["id"];
          },
        ];
      };
      t_laporan_qc: {
        Row: {
          id: number;
          pelapor_id: number;
          judul: string;
          deskripsi: string;
          kategori: string;
          prioritas: string;
          status: string;
          url_halaman: string;
          info_perangkat: Json | null;
          lampiran_path: string | null;
          catatan_tim: string | null;
          ditangani_oleh: number | null;
          selesai_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: never;
          pelapor_id: number;
          judul: string;
          deskripsi: string;
          kategori: string;
          prioritas?: string;
          status?: string;
          url_halaman: string;
          info_perangkat?: Json | null;
          lampiran_path?: string | null;
          catatan_tim?: string | null;
          ditangani_oleh?: number | null;
          selesai_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: never;
          pelapor_id?: number;
          judul?: string;
          deskripsi?: string;
          kategori?: string;
          prioritas?: string;
          status?: string;
          url_halaman?: string;
          info_perangkat?: Json | null;
          lampiran_path?: string | null;
          catatan_tim?: string | null;
          ditangani_oleh?: number | null;
          selesai_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_qc_pelapor";
            columns: ["pelapor_id"];
            isOneToOne: false;
            referencedRelation: "m_users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_qc_penangan";
            columns: ["ditangani_oleh"];
            isOneToOne: false;
            referencedRelation: "m_users";
            referencedColumns: ["id"];
          },
        ];
      };
      t_materi: {
        Row: {
          id: number;
          topik_id: number;
          urutan: number;
          judul: string;
          halaman_awal: number;
          halaman_akhir: number;
          penjelasan: string | null;
          poin_penting: Json | null;
          contoh: string | null;
          diagram: Json | null;
          isi_dibuat_at: string | null;
          isi_diklaim_at: string | null;
          dibaca_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: never;
          topik_id: number;
          urutan: number;
          judul: string;
          halaman_awal: number;
          halaman_akhir: number;
          penjelasan?: string | null;
          poin_penting?: Json | null;
          contoh?: string | null;
          diagram?: Json | null;
          isi_dibuat_at?: string | null;
          isi_diklaim_at?: string | null;
          dibaca_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: never;
          topik_id?: number;
          urutan?: number;
          judul?: string;
          halaman_awal?: number;
          halaman_akhir?: number;
          penjelasan?: string | null;
          poin_penting?: Json | null;
          contoh?: string | null;
          diagram?: Json | null;
          isi_dibuat_at?: string | null;
          isi_diklaim_at?: string | null;
          dibaca_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_materi_topik";
            columns: ["topik_id"];
            isOneToOne: false;
            referencedRelation: "t_topik";
            referencedColumns: ["id"];
          },
        ];
      };
      t_materi_rujukan: {
        Row: {
          id: number;
          materi_id: number;
          chunk_id: number | null;
          halaman: number;
          kutipan: string;
          urutan: number;
          created_at: string;
        };
        Insert: {
          id?: never;
          materi_id: number;
          chunk_id?: number | null;
          halaman: number;
          kutipan: string;
          urutan?: number;
          created_at?: string;
        };
        Update: {
          id?: never;
          materi_id?: number;
          chunk_id?: number | null;
          halaman?: number;
          kutipan?: string;
          urutan?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_materi_rujukan_chunk";
            columns: ["chunk_id"];
            isOneToOne: false;
            referencedRelation: "t_chunk";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_materi_rujukan_materi";
            columns: ["materi_id"];
            isOneToOne: false;
            referencedRelation: "t_materi";
            referencedColumns: ["id"];
          },
        ];
      };
      t_topik: {
        Row: {
          id: number;
          dokumen_id: number;
          urutan: number;
          judul: string;
          halaman_awal: number;
          halaman_akhir: number;
          konsep_inti: string | null;
          poin_penting: Json | null;
          contoh: string | null;
          ringkasan_dibuat_at: string | null;
          ringkasan_diklaim_at: string | null;
          soal_diklaim_at: string | null;
          materi_dibuat_at: string | null;
          materi_diklaim_at: string | null;
          sampul_path: string | null;
          sampul_diklaim_at: string | null;
          sampul_gagal_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: never;
          dokumen_id: number;
          urutan: number;
          judul: string;
          halaman_awal: number;
          halaman_akhir: number;
          konsep_inti?: string | null;
          poin_penting?: Json | null;
          contoh?: string | null;
          ringkasan_dibuat_at?: string | null;
          ringkasan_diklaim_at?: string | null;
          soal_diklaim_at?: string | null;
          materi_dibuat_at?: string | null;
          materi_diklaim_at?: string | null;
          sampul_path?: string | null;
          sampul_diklaim_at?: string | null;
          sampul_gagal_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: never;
          dokumen_id?: number;
          urutan?: number;
          judul?: string;
          halaman_awal?: number;
          halaman_akhir?: number;
          konsep_inti?: string | null;
          poin_penting?: Json | null;
          contoh?: string | null;
          ringkasan_dibuat_at?: string | null;
          ringkasan_diklaim_at?: string | null;
          soal_diklaim_at?: string | null;
          materi_dibuat_at?: string | null;
          materi_diklaim_at?: string | null;
          sampul_path?: string | null;
          sampul_diklaim_at?: string | null;
          sampul_gagal_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_topik_dokumen";
            columns: ["dokumen_id"];
            isOneToOne: false;
            referencedRelation: "t_dokumen";
            referencedColumns: ["id"];
          },
        ];
      };
      t_topik_rujukan: {
        Row: {
          id: number;
          topik_id: number;
          chunk_id: number | null;
          halaman: number;
          kutipan: string;
          urutan: number;
          created_at: string;
        };
        Insert: {
          id?: never;
          topik_id: number;
          chunk_id?: number | null;
          halaman: number;
          kutipan: string;
          urutan?: number;
          created_at?: string;
        };
        Update: {
          id?: never;
          topik_id?: number;
          chunk_id?: number | null;
          halaman?: number;
          kutipan?: string;
          urutan?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_topik_rujukan_chunk";
            columns: ["chunk_id"];
            isOneToOne: false;
            referencedRelation: "t_chunk";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_topik_rujukan_topik";
            columns: ["topik_id"];
            isOneToOne: false;
            referencedRelation: "t_topik";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      v_progres_dokumen: {
        Row: {
          user_id: number | null;
          dokumen_id: number | null;
          judul_dokumen: string | null;
          total_topik: number | null;
          topik_selesai: number | null;
          topik_lemah: number | null;
          topik_belum: number | null;
          persen_selesai: number | null;
          rata_rata_skor: number | null;
          jumlah_latihan: number | null;
          latihan_terakhir_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_dokumen_user";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "m_users";
            referencedColumns: ["id"];
          },
        ];
      };
      v_progres_topik: {
        Row: {
          user_id: number | null;
          dokumen_id: number | null;
          judul_dokumen: string | null;
          topik_id: number | null;
          urutan: number | null;
          judul_topik: string | null;
          halaman_awal: number | null;
          halaman_akhir: number | null;
          jumlah_latihan: number | null;
          skor_terakhir: number | null;
          skor_tertinggi: number | null;
          latihan_terakhir_at: string | null;
          status: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_dokumen_user";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "m_users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      fn_bersihkan_dokumen_gagal: {
        Args: {
          p_user_id?: number;
        };
        Returns: {
          dokumen_id: number;
          path_file: string;
        }[];
      };
      fn_buat_dokumen: {
        Args: {
          p_judul: string;
          p_nama_file: string;
          p_ukuran_byte: number;
        };
        Returns: {
          id: number;
          kode: string;
          path_file: string;
          status: string;
          tahap: string;
        }[];
      };
      fn_cari_chunk: {
        Args: {
          p_dokumen_id: number;
          p_embedding: string;
          p_k?: number;
          p_ambang?: number;
        };
        Returns: {
          chunk_id: number;
          urutan: number;
          halaman_awal: number;
          halaman_akhir: number;
          judul_bagian: string;
          isi: string;
          skor: number;
          lolos_ambang: boolean;
        }[];
      };
      fn_boleh_lapor_qc: {
        Args: never;
        Returns: boolean;
      };
      fn_buat_laporan_qc: {
        Args: { p_judul: string; p_deskripsi: string; p_kategori: string; p_prioritas: string; p_url: string; p_info: Json | null };
        Returns: number;
      };
      fn_ubah_laporan_qc: {
        Args: { p_id: number; p_status?: string | null; p_prioritas?: string | null; p_catatan?: string | null };
        Returns: undefined;
      };
      fn_atur_penguji: {
        Args: { p_email: string; p_penguji: boolean };
        Returns: number | null;
      };
      fn_daftar_penguji: {
        Args: never;
        Returns: { id: number; nama: string; email: string; peran: string; jumlah_laporan: number }[];
      };
      fn_catat_baca_materi: {
        Args: { p_materi_id: number };
        Returns: undefined;
      };
      fn_klaim_materi: {
        Args: { p_materi_id: number };
        Returns: boolean;
      };
      fn_lepas_klaim_materi: {
        Args: { p_materi_id: number };
        Returns: undefined;
      };
      fn_simpan_kerangka_materi: {
        Args: { p_topik_id: number; p_materi: Json };
        Returns: boolean;
      };
      fn_simpan_isi_materi: {
        Args: {
          p_materi_id: number;
          p_penjelasan: string;
          p_poin_penting: Json;
          p_contoh: string;
          p_diagram: Json | null;
          p_rujukan: Json;
        };
        Returns: boolean;
      };
      fn_simpan_sampul_topik: {
        Args: { p_topik_id: number; p_path: string };
        Returns: undefined;
      };
      fn_catat_buka_topik: {
        Args: {
          p_topik_id: number;
        };
        Returns: undefined;
      };
      fn_current_user_id: {
        Args: never;
        Returns: number;
      };
      fn_daftar_pengguna: {
        Args: {
          p_cari?: string;
          p_status?: string;
          p_halaman?: number;
          p_per_halaman?: number;
        };
        Returns: {
          id: number;
          nama: string;
          email: string;
          peran: string;
          is_admin: boolean;
          jumlah_dokumen: number;
          created_at: string;
          last_active_at: string | null;
          is_active: boolean;
          total_baris: number;
        }[];
      };
      fn_estimasi_biaya_kuota: {
        Args: {
          p_max_pertanyaan?: number;
        };
        Returns: {
          mahasiswa_aktif: number;
          rata_biaya_per_pertanyaan: number;
          estimasi_harian_maks_rp: number;
        }[];
      };
      fn_gagalkan_dokumen: {
        Args: {
          p_dokumen_id: number;
          p_pesan: string;
        };
        Returns: boolean;
      };
      fn_hapus_dokumen: {
        Args: {
          p_dokumen_id: number;
        };
        Returns: {
          path_file: string;
        }[];
      };
      fn_hasil_latihan: {
        Args: {
          p_latihan_id: number;
        };
        Returns: {
          urutan: number;
          soal_id: number;
          pertanyaan: string;
          pilihan_a: string;
          pilihan_b: string;
          pilihan_c: string;
          pilihan_d: string;
          dipilih: string;
          kunci: string;
          is_benar: boolean;
          pembahasan: string;
          halaman_rujukan: number;
          skor: number;
          jumlah_benar: number;
          jumlah_soal: number;
          topik_id: number;
          snapshot_judul_topik: string;
          created_at: string;
        }[];
      };
      fn_is_admin: {
        Args: never;
        Returns: boolean;
      };
      fn_hitung_tanya_hari_ini: {
        Args: {
          p_user_id: number;
        };
        Returns: number;
      };
      fn_klaim_topik: {
        Args: {
          p_topik_id: number;
          p_jenis: string;
        };
        Returns: boolean;
      };
      fn_klaim_kuota_tanya: {
        Args: {
          p_user_id: number;
        };
        Returns: {
          reservasi_id: number | null;
          terpakai: number;
          maks: number;
          sisa: number;
          reset_at: string;
        }[];
      };
      fn_kode_dokumen: {
        Args: never;
        Returns: string;
      };
      fn_kuota_dokumen: {
        Args: {
          p_user_id?: number;
        };
        Returns: {
          terpakai: number;
          maks: number;
          sisa: number;
        }[];
      };
      fn_lanjutkan_belajar: {
        Args: never;
        Returns: {
          dokumen_id: number;
          judul_dokumen: string;
          topik_id: number;
          urutan: number;
          judul_topik: string;
          halaman_awal: number;
          halaman_akhir: number;
          skor_terakhir: number;
          status_topik: string;
          aktivitas_at: string;
        }[];
      };
      fn_lepas_kuota_tanya: {
        Args: {
          p_reservasi_id: number;
        };
        Returns: boolean;
      };
      fn_lepas_klaim_topik: {
        Args: {
          p_topik_id: number;
          p_jenis: string;
        };
        Returns: undefined;
      };
      fn_pengaturan: {
        Args: {
          p_kode: string;
        };
        Returns: string;
      };
      fn_pengaturan_int: {
        Args: {
          p_kode: string;
        };
        Returns: number;
      };
      fn_pengaturan_numeric: {
        Args: {
          p_kode: string;
        };
        Returns: number;
      };
      fn_pengguna_sasaran: {
        Args: {
          p_user_id: number;
        };
        Returns: number;
      };
      fn_pengguna_terbaru: {
        Args: {
          p_limit?: number;
        };
        Returns: {
          id: number;
          nama: string;
          created_at: string;
          jumlah_dokumen: number;
          is_active: boolean;
        }[];
      };
      fn_periksa_file_dokumen: {
        Args: {
          p_dokumen_id: number;
        };
        Returns: {
          ada: boolean;
          ukuran_byte: number | null;
          maks_byte: number;
          is_terlalu_besar: boolean;
        }[];
      };
      fn_perbarui_aktif: {
        Args: { p_paksa?: boolean };
        Returns: boolean;
      };
      fn_periksa_jawaban: {
        Args: {
          p_soal_id: number;
          p_dipilih: string;
        };
        Returns: {
          is_benar: boolean;
          kunci: string;
          pembahasan: string;
          halaman_rujukan: number;
        }[];
      };
      fn_ringkasan_pengguna: {
        Args: never;
        Returns: {
          total: number;
          aktif: number;
          nonaktif: number;
        }[];
      };
      fn_selesaikan_dokumen: {
        Args: {
          p_dokumen_id: number;
          p_topik: Json;
        };
        Returns: {
          jumlah_topik: number;
          judul: string;
        }[];
      };
      fn_seri_pertanyaan_harian: {
        Args: {
          p_rentang_hari?: number;
        };
        Returns: {
          tanggal: string;
          jumlah_pertanyaan: number;
          biaya_tanya_ai_rp: number;
        }[];
      };
      fn_simpan_chat: {
        Args: {
          p_user_id: number;
          p_dokumen_id: number;
          p_topik_id: number | null;
          p_pertanyaan: string;
          p_jawaban: string;
          p_is_tidak_ditemukan: boolean;
          p_skor_relevansi: number | null;
          p_rujukan: Json;
          p_log: Json;
          p_is_terputus?: boolean;
          p_reservasi_id?: number | null;
        };
        Returns: {
          chat_user_id: number;
          chat_ai_id: number;
        }[];
      };
      fn_simpan_chunk: {
        Args: {
          p_dokumen_id: number;
          p_chunk: Json;
        };
        Returns: boolean;
      };
      fn_simpan_latihan: {
        Args: {
          p_topik_id: number;
          p_jawaban: Json;
        };
        Returns: {
          latihan_id: number;
          skor: number;
          jumlah_benar: number;
          jumlah_soal: number;
          status_topik: string;
        }[];
      };
      fn_simpan_ringkasan_topik: {
        Args: {
          p_topik_id: number;
          p_konsep_inti: string;
          p_poin_penting: Json;
          p_contoh: string;
          p_rujukan: Json;
        };
        Returns: {
          is_baru: boolean;
          ringkasan_dibuat_at: string;
        }[];
      };
      fn_simpan_soal_topik: {
        Args: {
          p_topik_id: number;
          p_soal: Json;
        };
        Returns: boolean;
      };
      fn_sisa_kuota_tanya: {
        Args: {
          p_user_id?: number;
        };
        Returns: {
          terpakai: number;
          maks: number;
          sisa: number;
          reset_at: string;
        }[];
      };
      fn_statistik_dashboard: {
        Args: {
          p_rentang_hari?: number;
        };
        Returns: Json;
      };
      fn_tandai_dokumen_macet: {
        Args: {
          p_user_id?: number;
        };
        Returns: number;
      };
      fn_ubah_pengaturan: {
        Args: {
          p_nilai: Json;
          p_ip?: string;
          p_versi?: string;
        };
        Returns: {
          kode: string;
          nilai: string;
          nilai_default: string;
          updated_by: string;
          updated_at: string;
        }[];
      };
      fn_ubah_profil: {
        Args: {
          p_nama: string;
          p_ip?: string;
        };
        Returns: {
          id: number;
          nama: string;
          email: string;
          updated_at: string;
        }[];
      };
      fn_ubah_status_pengguna: {
        Args: {
          p_user_id: number;
          p_is_active: boolean;
          p_ip?: string;
        };
        Returns: {
          id: number;
          nama: string;
          auth_id: string;
          is_active: boolean;
          is_berubah: boolean;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type SkemaPublik = Database["public"];

// ── Alias generik (setara helper bawaan supabase gen types, khusus skema public) ──
export type Tables<T extends keyof SkemaPublik["Tables"]> = SkemaPublik["Tables"][T]["Row"];
export type TablesInsert<T extends keyof SkemaPublik["Tables"]> = SkemaPublik["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof SkemaPublik["Tables"]> = SkemaPublik["Tables"][T]["Update"];
export type Views<T extends keyof SkemaPublik["Views"]> = SkemaPublik["Views"][T]["Row"];
export type FungsiArgs<T extends keyof SkemaPublik["Functions"]> = SkemaPublik["Functions"][T]["Args"];
export type FungsiHasil<T extends keyof SkemaPublik["Functions"]> = SkemaPublik["Functions"][T]["Returns"];

// ── Alias bernama per domain ──
export type Pengguna = Tables<"m_users">;
export type Peran = Tables<"m_role">;
export type Menu = Tables<"m_menu">;
export type PengaturanSistem = Tables<"m_pengaturan_sistem">;
export type Dokumen = Tables<"t_dokumen">;
export type Chunk = Tables<"t_chunk">;
export type Topik = Tables<"t_topik">;
export type TopikRujukan = Tables<"t_topik_rujukan">;
export type Soal = Tables<"t_soal">;
export type Latihan = Tables<"t_latihan">;
export type LatihanJawaban = Tables<"t_latihan_jawaban">;
export type Chat = Tables<"t_chat">;
export type ChatRujukan = Tables<"t_chat_rujukan">;
export type LogPemakaianAi = Tables<"log_pemakaian_ai">;
export type LogSystem = Tables<"log_system">;
/** Soal tanpa kunci — bentuk yang boleh dibaca klien sesi sebelum dijawab. */
export type SoalTanpaKunci = Omit<Soal, "kunci" | "pembahasan" | "halaman_rujukan">;
export type ProgresTopik = Views<"v_progres_topik">;
export type ProgresDokumen = Views<"v_progres_dokumen">;
export type HasilCariChunk = FungsiHasil<"fn_cari_chunk">[number];
export type KuotaDokumen = FungsiHasil<"fn_kuota_dokumen">[number];
export type KuotaTanya = FungsiHasil<"fn_sisa_kuota_tanya">[number];

// ── Nilai baku kolom status (CHECK di database) ──
export type StatusDokumen = "diproses" | "siap" | "gagal";
export type TahapDokumen = "membaca" | "mengekstrak" | "memotong" | "mengindeks" | "menyusun_topik";
export type StatusTopik = "belum" | "selesai" | "lemah";
export type PeranChat = "user" | "ai";
export type FiturAi = "indeks" | "topik" | "ringkasan" | "soal" | "tanya_ai" | "materi" | "sampul";
export type AksiLogSystem = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "ACTIVATE" | "DEACTIVATE";
export type ModulLogSystem = "auth" | "users" | "dokumen" | "pengaturan";
export type KodePengaturan = "max_dokumen" | "max_halaman" | "max_ukuran_mb" | "max_pertanyaan_harian" | "ambang_relevansi";
export type JenisKlaimTopik = "ringkasan" | "soal" | "materi" | "sampul";
