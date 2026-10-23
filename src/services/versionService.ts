import type { ChangeProposal, DocumentVersion } from '../types';
import { sha256OfBytes } from './integrityService';

/**
 * Tahap 7 – Kebijakan pembuatan versi dokumen.
 * Versi baru hanya dibuat ketika sebuah usulan berstatus Approved DAN perubahan
 * benar-benar berhasil diterapkan. Usulan yang ditolak atau dibatalkan TIDAK
 * pernah menghasilkan versi baru. Versi sejarah tidak pernah dihapus/ditimpa.
 */
export function canCreateVersionFor(status: ChangeProposal['status']): boolean {
  return status === 'Approved';
}

/**
 * Menghitung nomor versi berikutnya untuk sebuah dokumen.
 * Versi 1 selalu menyimpan berkas unggahan asli (dibuat oleh Registry),
 * sehingga versi turunan pertama dimulai dari nomor 2.
 */
export function computeNextVersionNumber(
  versions: DocumentVersion[],
  documentId: string
): number {
  const existing = versions
    .filter((v) => v.documentId === documentId)
    .map((v) => v.versionNumber);
  return existing.length > 0 ? Math.max(...existing) + 1 : 2;
}

export interface BuildVersionInput {
  proposal: ChangeProposal;
  versionId: string;
  versionNumber: number;
  appliedAt: string;
  /** SHA-256 dari representasi JSON artefak perubahan (bukan berkas dokumen asli) */
  artifactHash: string;
}

/** Label bidang yang berubah, dalam bahasa Indonesia */
const CHANGE_TYPE_FIELD_LABEL: Record<ChangeProposal['changeType'], string> = {
  value: 'Nilai Akuntansi',
  metadata: 'Metadata',
  structure: 'Struktur',
};

export const VERSION_ARTIFACT_NOTE =
  'Versi ini adalah representasi terstruktur perubahan yang disetujui. Dokumen asli tidak dimodifikasi dan berkas asli tetap tersimpan sebagai Versi 1. ' +
  'Hash merujuk pada artefak JSON perubahan ini, bukan pada berkas dokumen asli.';

/**
 * Membangun catatan versi dokumen dari usulan yang SUDAH disetujui dan diterapkan.
 * Fungsi ini PURE dan tidak mengubah riwayat versi yang ada.
 */
export function buildDocumentVersionRecord(input: BuildVersionInput): DocumentVersion {
  const { proposal, versionId, versionNumber, appliedAt, artifactHash } = input;
  return {
    id: versionId,
    documentId: proposal.documentId,
    versionNumber,
    proposalId: proposal.id,
    changedBy: proposal.proposedBy,
    appliedAt,
    changeType: proposal.changeType,
    fieldChanged: `${CHANGE_TYPE_FIELD_LABEL[proposal.changeType]}: ${proposal.originalValue}`,
    valueBefore: proposal.originalValue,
    valueAfter: proposal.proposedValue,
    rationale: proposal.rationale,
    evidenceReferences: proposal.evidenceReferences,
    artifactHash,
    note: VERSION_ARTIFACT_NOTE,
  };
}

/**
 * Payload JSON yang di-hash menjadi artefak versi.
 */
export function buildArtifactPayload(params: {
  versionId: string;
  proposalId: string;
  documentId: string;
  fieldChanged: string;
  valueBefore: string;
  valueAfter: string;
  approvedAt: string;
}): string {
  return JSON.stringify({ ...params });
}

/**
 * Menghitung SHA-256 dari payload artefak (byte teks JSON) via Web Crypto API.
 */
export async function computeArtifactHash(payload: string): Promise<string> {
  return sha256OfBytes(new TextEncoder().encode(payload));
}
