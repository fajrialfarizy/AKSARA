import type {
  IntegrityCheckResult,
  IntegrityVerificationStatus,
} from '../types';

const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/i;

/**
 * Memvalidasi bahwa sebuah nilai adalah hash SHA-256 heksadesimal yang valid (64 karakter).
 */
export function isValidSha256Hex(value: string | null | undefined): boolean {
  return typeof value === 'string' && SHA256_HEX_REGEX.test(value.trim());
}

/**
 * Menghitung SHA-256 dari byte SEBENARNYA menggunakan Web Crypto API.
 * Byte yang di-hash adalah isi berkas apa adanya – bukan nama, ukuran, teks terekstrak, atau metadata.
 * Urutan byte yang identik selalu menghasilkan hash yang identik.
 */
export async function sha256OfBytes(bytes: Uint8Array | ArrayBuffer): Promise<string> {
  // Salin ke array yang selalu berbasis ArrayBuffer agar kompatibel dengan BufferSource.
  const view = new Uint8Array(bytes);
  const hashBuffer = await crypto.subtle.digest('SHA-256', view);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Membandingkan hash referensi dengan hash hasil hitung ulang.
 * Mengembalikan UNAVAILABLE jika salah satu nilai bukan hash SHA-256 yang valid.
 */
export function compareIntegrityHashes(
  referenceHash: string | null | undefined,
  calculatedHash: string | null | undefined
): IntegrityVerificationStatus {
  if (!isValidSha256Hex(referenceHash) || !isValidSha256Hex(calculatedHash)) {
    return 'UNAVAILABLE';
  }
  const ref = (referenceHash as string).trim().toLowerCase();
  const calc = (calculatedHash as string).trim().toLowerCase();
  return ref === calc ? 'MATCH' : 'MISMATCH';
}

export interface IntegrityCheckInput {
  documentId: string;
  documentName: string;
  /** Hash referensi yang tercatat saat dokumen diunggah (boleh tidak valid) */
  referenceHash: string | null;
  /** Hash hasil hitung ulang dari byte berkas; null jika byte tidak tersedia */
  calculatedHash: string | null;
  fileSource: IntegrityCheckResult['fileSource'];
  checkedAt: string;
  resultId: string;
}

/**
 * Membangun hasil verifikasi integritas beserta penjelasannya.
 * Fungsi ini PURE dan tidak pernah mengubah hash referensi dokumen –
 * hash referensi asli wajib dipertahankan meskipun hasilnya MISMATCH.
 */
export function buildIntegrityCheckResult(input: IntegrityCheckInput): IntegrityCheckResult {
  const referenceValid = isValidSha256Hex(input.referenceHash);
  let status: IntegrityVerificationStatus;
  if (!input.calculatedHash || !referenceValid) {
    status = 'UNAVAILABLE';
  } else {
    status = compareIntegrityHashes(input.referenceHash, input.calculatedHash);
  }

  let explanation: string;
  if (status === 'MATCH') {
    explanation =
      'Hash SHA-256 yang dihitung dari byte berkas identik dengan hash referensi yang tercatat saat dokumen diunggah. ' +
      'Ini membuktikan isi byte berkas sama persis dengan byte yang di-hash saat unggahan. ' +
      'Hash yang cocok TIDAK membuktikan bahwa isi dokumen benar, akurat, atau sah secara akuntansi – hanya bahwa berkasnya tidak berubah byte-nya.';
  } else if (status === 'MISMATCH') {
    explanation =
      'Hash yang dihitung berbeda dari hash referensi, sehingga isi byte berkas ini TIDAK sama dengan byte yang di-hash saat unggahan. ' +
      'Perbedaan dapat terjadi karena file yang dipilih keliru, unggahan rusak, atau isi memang berubah. ' +
      'Ketidaksesuaian hash TIDAK otomatis membuktikan pemalsuan atau ketidakjujuran. ' +
      'Hash referensi asli TIDAK diubah oleh pemeriksaan ini dan tetap dipertahankan.';
  } else if (!referenceValid) {
    explanation =
      'Dokumen ini tidak memiliki hash referensi SHA-256 yang valid, sehingga verifikasi integritas tidak dapat dilakukan. ' +
      'Tanpa hash referensi dari unggahan awal, tidak ada acuan untuk membandingkan berkas.';
  } else {
    explanation =
      'Byte berkas asli tidak tersedia dalam sesi browser ini, sehingga perbandingan byte belum dapat dilakukan. ' +
      'Hasil verifikasi tidak dapat dinyatakan berhasil maupun gagal. ' +
      'Unggah kembali berkas dokumen untuk memverifikasi isinya terhadap hash referensi.';
  }

  return {
    id: input.resultId,
    documentId: input.documentId,
    documentName: input.documentName,
    status,
    referenceHash: input.referenceHash && referenceValid ? input.referenceHash.trim().toLowerCase() : input.referenceHash,
    calculatedHash: input.calculatedHash,
    fileSource: input.fileSource,
    checkedAt: input.checkedAt,
    explanation,
  };
}

/** Label tampilan status integritas dalam bahasa Indonesia */
export const INTEGRITY_STATUS_LABELS: Record<IntegrityVerificationStatus, string> = {
  MATCH: 'Sesuai (MATCH)',
  MISMATCH: 'Tidak Sesuai (MISMATCH)',
  UNAVAILABLE: 'Tidak Dapat Diverifikasi (UNAVAILABLE)',
};

/**
 * Mengambil hasil verifikasi terakhir untuk sebuah dokumen (daftar tersusun terbaru di depan).
 */
export function getLatestCheckForDocument(
  checks: IntegrityCheckResult[],
  documentId: string
): IntegrityCheckResult | undefined {
  return checks.find((c) => c.documentId === documentId);
}
