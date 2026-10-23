import { describe, it, expect } from 'vitest';
import {
  canCreateVersionFor,
  computeNextVersionNumber,
  buildDocumentVersionRecord,
  buildArtifactPayload,
  computeArtifactHash,
} from './versionService';
import type { ChangeProposal, DocumentVersion } from '../types';

const BASE_PROPOSAL: ChangeProposal = {
  id: 'cp-test',
  documentId: 'doc-1',
  proposedBy: 'Fajri (Auditor)',
  changeType: 'value',
  originalValue: 'Rp125.000.000',
  proposedValue: 'Rp120.000.000',
  rationale: 'Alasan uji.',
  evidenceReferences: 'Bukti uji.',
  status: 'Approved',
  approvalsReceived: 2,
  approvalsRequired: 2,
  createdAt: '2026-10-23T14:55:00+07:00',
};

const EXISTING_VERSION: DocumentVersion = {
  id: 'ver-001',
  documentId: 'doc-1',
  versionNumber: 2,
  proposalId: 'cp-002',
  changedBy: 'Fajri (Auditor)',
  appliedAt: '2026-10-23T15:30:00+07:00',
  changeType: 'metadata',
  fieldChanged: 'Metadata: Status Bukti',
  valueBefore: 'Belum Terpetakan',
  valueAfter: 'Perlu Lampiran',
  rationale: 'Rasio.',
  evidenceReferences: 'Bukti.',
  artifactHash: 'f'.repeat(64),
  note: 'Catatan versi.',
};

describe('Version Service – Kebijakan Pembuatan Versi', () => {
  it('hanya status Approved yang boleh membuat versi baru', () => {
    expect(canCreateVersionFor('Approved')).toBe(true);
    expect(canCreateVersionFor('Pending Review')).toBe(false);
    expect(canCreateVersionFor('Rejected')).toBe(false);
    expect(canCreateVersionFor('Cancelled')).toBe(false);
  });

  it('versi turunan pertama dimulai dari nomor 2 (versi 1 = berkas asli)', () => {
    expect(computeNextVersionNumber([], 'doc-1')).toBe(2);
  });

  it('nomor versi berikutnya naik dan tidak menimpa versi sejarah', () => {
    const existing = [EXISTING_VERSION];
    expect(computeNextVersionNumber(existing, 'doc-1')).toBe(3);
    // Riwayat lama tidak berubah setelah perhitungan
    expect(existing).toHaveLength(1);
    expect(existing[0].versionNumber).toBe(2);
  });

  it('menghitung nomor versi per dokumen, bukan global', () => {
    const other: DocumentVersion = { ...EXISTING_VERSION, id: 'ver-002', documentId: 'doc-2', versionNumber: 5 };
    expect(computeNextVersionNumber([EXISTING_VERSION, other], 'doc-1')).toBe(3);
    expect(computeNextVersionNumber([EXISTING_VERSION, other], 'doc-2')).toBe(6);
    expect(computeNextVersionNumber([other], 'doc-3')).toBe(2);
  });
});

describe('Version Service – Pembangun Catatan Versi', () => {
  it('membangun catatan versi dari usulan yang disetujui tanpa mengubah riwayat yang ada', () => {
    const history: DocumentVersion[] = [EXISTING_VERSION];
    const record = buildDocumentVersionRecord({
      proposal: BASE_PROPOSAL,
      versionId: 'ver-999',
      versionNumber: 3,
      appliedAt: '2026-10-23T16:00:00+07:00',
      artifactHash: 'a'.repeat(64),
    });

    expect(record.id).toBe('ver-999');
    expect(record.documentId).toBe('doc-1');
    expect(record.versionNumber).toBe(3);
    expect(record.proposalId).toBe('cp-test');
    expect(record.valueBefore).toBe('Rp125.000.000');
    expect(record.valueAfter).toBe('Rp120.000.000');
    expect(record.note).toContain('Dokumen asli tidak dimodifikasi');

    // Riwayat tidak dimutasi (append-only)
    expect(history).toHaveLength(1);
    expect(history[0]).toEqual(EXISTING_VERSION);
  });

  it('hash artefak deterministik: payload identik menghasilkan hash identik', async () => {
    const payloadA = buildArtifactPayload({
      versionId: 'ver-1',
      proposalId: 'cp-1',
      documentId: 'doc-1',
      fieldChanged: 'Nilai Akuntansi',
      valueBefore: 'Rp100',
      valueAfter: 'Rp200',
      approvedAt: '2026-10-23T16:00:00+07:00',
    });
    const payloadB = buildArtifactPayload({
      versionId: 'ver-1',
      proposalId: 'cp-1',
      documentId: 'doc-1',
      fieldChanged: 'Nilai Akuntansi',
      valueBefore: 'Rp100',
      valueAfter: 'Rp200',
      approvedAt: '2026-10-23T16:00:00+07:00',
    });
    const payloadC = buildArtifactPayload({
      versionId: 'ver-1',
      proposalId: 'cp-1',
      documentId: 'doc-1',
      fieldChanged: 'Nilai Akuntansi',
      valueBefore: 'Rp100',
      valueAfter: 'Rp201',
      approvedAt: '2026-10-23T16:00:00+07:00',
    });

    const hashA = await computeArtifactHash(payloadA);
    const hashB = await computeArtifactHash(payloadB);
    const hashC = await computeArtifactHash(payloadC);

    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(hashC);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/);
  });
});
