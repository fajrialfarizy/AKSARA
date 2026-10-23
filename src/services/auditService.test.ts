import { describe, it, expect } from 'vitest';
import {
  appendAuditEvent,
  createAuditEventId,
  computeSimulatedLedgerChain,
  eventMatchesDocument,
  AUDIT_EVENT_TYPE_LABELS,
} from './auditService';
import type { AuditEvent } from '../types';

const makeEvent = (id: string, overrides: Partial<AuditEvent> = {}): AuditEvent => ({
  id,
  eventType: 'DocumentUploaded',
  timestamp: '2026-10-23T14:15:00+07:00',
  actor: 'Fajri (Auditor)',
  actorRole: 'Auditor',
  entityId: 'doc-001',
  entityType: 'document',
  summary: 'Dokumen diunggah ke registri.',
  metadata: { documentId: 'doc-001', documentName: 'Laporan.pdf' },
  ...overrides,
});

describe('Audit Service – Pencatatan Peristiwa (Append-Only)', () => {
  it('menambahkan peristiwa sebagai array baru tanpa mengubah array lama', () => {
    const original: AuditEvent[] = [makeEvent('ev-1')];
    const frozen = [...original];
    const next = appendAuditEvent(original, {
      eventType: 'DocumentRemoved',
      timestamp: '2026-10-23T15:00:00+07:00',
      actor: 'Pengguna Sesi',
      entityId: 'doc-001',
      entityType: 'document',
      summary: 'Dokumen dihapus.',
    }, 'ev-2');

    expect(original).toEqual(frozen); // tidak dimutasi
    expect(original).toHaveLength(1);
    expect(next).toHaveLength(2);
    expect(next[0].id).toBe('ev-2'); // terbaru di depan
    expect(next[1].id).toBe('ev-1'); // riwayat lama tetap utuh
  });

  it('setiap peristiwa memiliki field wajib dan ID unik', () => {
    let events: AuditEvent[] = [];
    const ids = new Set<string>();
    for (let i = 0; i < 25; i++) {
      const id = createAuditEventId();
      expect(ids.has(id)).toBe(false);
      ids.add(id);
      events = appendAuditEvent(events, {
        eventType: 'IntegrityCheckRun',
        timestamp: new Date().toISOString(),
        actor: 'Pengguna Sesi',
        entityId: `doc-${i}`,
        entityType: 'document',
        summary: 'Verifikasi integritas dijalankan.',
      });
    }
    expect(events).toHaveLength(25);
    for (const ev of events) {
      expect(ev.id).toBeTruthy();
      expect(ev.eventType).toBeTruthy();
      expect(ev.timestamp).toBeTruthy();
      expect(ev.entityType).toBeTruthy();
      expect(ev.entityId).toBeTruthy();
      expect(ev.summary).toBeTruthy();
    }
  });

  it('label bahasa Indonesia tersedia untuk setiap jenis peristiwa yang didukung', () => {
    const requiredTypes = [
      'DocumentUploaded', 'DocumentRemoved', 'RelationshipCreated', 'RelationshipUpdated',
      'RelationshipRemoved', 'CheckRun', 'ProposalCreated', 'ProposalEdited',
      'ProposalApproved', 'ProposalRejected', 'ProposalCancelled', 'ChangeApplied',
      'VersionCreated', 'IntegrityCheckRun',
    ] as const;
    for (const t of requiredTypes) {
      const label = AUDIT_EVENT_TYPE_LABELS[t];
      expect(label).toBeTruthy();
      expect(label).not.toBe(t); // label deskriptif bahasa Indonesia, bukan nama teknis
      expect(label).toContain(' '); // berupa frasa, bukan istilah tunggal teknis
    }
  });
});

describe('Audit Service – Buku Besar Simulasi', () => {
  const ev1 = makeEvent('ev-1', { timestamp: '2026-10-23T14:15:00+07:00' });
  const ev2 = makeEvent('ev-2', { timestamp: '2026-10-23T14:20:00+07:00' });

  it('rantai blok simulasi deterministik dan sejumlah peristiwa', async () => {
    const events = [ev2, ev1]; // terbaru-di-depan
    const chain1 = await computeSimulatedLedgerChain(events);
    const chain2 = await computeSimulatedLedgerChain(events);

    expect(chain1).toHaveLength(2);
    expect(chain1.map((e) => e.sequence)).toEqual([1, 2]); // kronologis: terlama lebih dulu
    expect(chain1.map((e) => e.eventId)).toEqual(['ev-1', 'ev-2']);
    expect(chain1).toEqual(chain2); // deterministik

    // Rantai saling terkait: blok sebelumnya = hash blok berikutnya
    expect(chain1[1].previousBlockHash).toBe(chain1[0].blockHash);
    expect(chain1[0].blockHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('perubahan satu peristiwa mengubah rantai simulasi', async () => {
    const base = [ev2, ev1];
    const changed = [ev2, makeEvent('ev-1', { timestamp: '2026-10-23T14:15:00+07:00', summary: 'Ringkasan lain.' })];
    const chainA = await computeSimulatedLedgerChain(base);
    const chainB = await computeSimulatedLedgerChain(changed);
    expect(chainB[0].blockHash).not.toBe(chainA[0].blockHash);
  });

  it('rantai simulasi tidak terpengaruh urutan input daftar (selalu kronologis)', async () => {
    const a = await computeSimulatedLedgerChain([ev2, ev1]);
    const b = await computeSimulatedLedgerChain([ev1, ev2]);
    expect(a).toEqual(b);
  });
});

describe('Audit Service – Asosiasi Peristiwa dengan Dokumen', () => {
  it('mengenali peristiwa dokumen, relasi, dan daftar ID', () => {
    const docEvent = makeEvent('ev-1');
    expect(eventMatchesDocument(docEvent, 'doc-001')).toBe(true);
    expect(eventMatchesDocument(docEvent, 'doc-999')).toBe(false);

    const relEvent = makeEvent('ev-2', {
      eventType: 'RelationshipCreated',
      entityType: 'relationship',
      entityId: 'edge-01',
      metadata: {
        relationshipType: 'Mendukung',
        sourceDocumentId: 'doc-003',
        targetDocumentId: 'doc-002',
        sourceDocumentName: 'Invoice.pdf',
        targetDocumentName: 'Jurnal.xlsx',
      },
    });
    expect(eventMatchesDocument(relEvent, 'doc-003')).toBe(true);
    expect(eventMatchesDocument(relEvent, 'doc-002')).toBe(true);
    expect(eventMatchesDocument(relEvent, 'doc-001')).toBe(false);

    const checkEvent = makeEvent('ev-3', {
      eventType: 'CheckRun',
      entityId: 'doc-001,doc-002',
      metadata: { documentIds: 'doc-001,doc-002' },
    });
    expect(eventMatchesDocument(checkEvent, 'doc-002')).toBe(true);
  });
});
