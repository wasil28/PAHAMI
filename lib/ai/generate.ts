import "server-only";

// Pintu masuk tingkat tinggi untuk route fitur. Implementasi dipecah per fitur agar tiap file
// kecil & mudah diuji; lihat docs/AI-RAG.md untuk alur pemanggilan.

export { susunTopik, type TopikBaru } from "@/lib/ai/topik";
export { buatRingkasan, type HasilRingkasan } from "@/lib/ai/ringkasan";
export { buatSoal, type SoalBaru, type KunciSoal } from "@/lib/ai/soal";
export {
  jawabPertanyaanStream,
  susunPertanyaanMandiri,
  JAWABAN_TIDAK_DITEMUKAN,
  type AliranJawaban,
  type HasilJawaban,
  type OpsiJawab,
} from "@/lib/ai/jawab";
export { pilihChunkRelevan, RPC_CARI_CHUNK, type HasilPilihChunk, type OpsiPilihChunk } from "@/lib/ai/cari";
export { embedTeks, embedPertanyaan, keVektorPg } from "@/lib/ai/embedding";
export { buatChunk, type ChunkBaru } from "@/lib/ai/chunk";
export { catatPemakaianAI, keBarisLog, type FiturAI } from "@/lib/ai/pemakaian";
export { gabungPemakaian, pemakaianKosong } from "@/lib/ai/biaya";
export { AiGagalError } from "@/lib/ai/panggil";
export { AiFormatError } from "@/lib/ai/json";
export type { ChunkSumber, ChunkRelevan, HalamanTeks, Pemakaian, PesanRiwayat, Rujukan, TopikRentang } from "@/lib/ai/tipe";
