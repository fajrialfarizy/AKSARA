import type { ChangeProposal } from '../types';

/**
 * Tahap 8 – Validasi transisi peninjauan usulan koreksi.
 * Mencegah persetujuan ganda (duplikasi penerapan versi) dan tinjauan pada
 * status usulan yang sudah final. Hanya usulan berstatus 'Pending Review'
 * yang boleh disetujui, ditolak, atau dibatalkan.
 */
export type ProposalAction = 'approve' | 'reject' | 'cancel';

export interface ProposalTransitionCheck {
  allowed: boolean;
  /** Alasan dalam bahasa Indonesia jika transisi ditolak */
  reason?: string;
}

export function validateProposalTransition(
  status: ChangeProposal['status'],
  // Hasil validasi hanya bergantung pada status saat ini: semua tindakan tinjauan
  // pada usulan yang sudah final ditolak. Parameter dipertahankan untuk kejelasan API.
  _action: ProposalAction
): ProposalTransitionCheck {
  if (status === 'Pending Review') {
    return { allowed: true };
  }
  if (status === 'Approved') {
    return {
      allowed: false,
      reason:
        'Usulan ini sudah pernah disetujui dan perubahannya telah diterapkan. Persetujuan ganda dicegah agar tidak tercipta versi dokumen duplikat. Ajukan usulan baru jika diperlukan.',
    };
  }
  if (status === 'Rejected') {
    return {
      allowed: false,
      reason:
        'Usulan ini sudah ditolak dan tidak dapat ditinjau ulang. Dokumen sumber tidak berubah. Ajukan usulan baru jika diperlukan.',
    };
  }
  return {
    allowed: false,
    reason:
      'Usulan ini sudah dibatalkan dan tidak dapat ditinjau ulang. Dokumen sumber tidak berubah. Ajukan usulan baru jika diperlukan.',
  };
}
