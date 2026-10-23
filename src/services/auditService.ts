import type { AuditEvent, AuditEventType, SimulatedLedgerEntry } from '../types';
import { sha256OfBytes } from './integrityService';

/**
 * Tahap 7 – Label tampilan bahasa Indonesia untuk setiap jenis peristiwa audit.
 */
export const AUDIT_EVENT_TYPE_LABELS: Record<AuditEventType, string> = {
  DocumentUploaded: 'Dokumen diunggah ke registri',
  DocumentRemoved: 'Dokumen dihapus dari registri aktif',
  RelationshipCreated: 'Hubungan antar dokumen dibuat',
  RelationshipUpdated: 'Hubungan antar dokumen diperbarui',
  RelationshipRemoved: 'Hubungan antar dokumen dihapus',
  CheckRun: 'Pemeriksaan konsistensi dijalankan',
  ProposalCreated: 'Usulan koreksi dibuat',
  ProposalEdited: 'Usulan koreksi diedit',
  ProposalApproved: 'Usulan koreksi disetujui',
  ProposalRejected: 'Usulan koreksi ditolak',
  ProposalCancelled: 'Usulan koreksi dibatalkan',
  ChangeApplied: 'Perubahan disetujui diterapkan',
  VersionCreated: 'Versi dokumen baru dibuat',
  IntegrityCheckRun: 'Verifikasi integritas dijalankan',
};

/**
 * Membuat ID peristiwa audit yang unik dalam sesi.
 */
export function createAuditEventId(): string {
  return `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Menambahkan satu peristiwa audit ke log secara TAMBAH-SAJA (append-only).
 * Mengembalikan array BARU (peristiwa terbaru di depan) tanpa pernah mengubah,
 * mengedit, atau menghapus peristiwa yang sudah ada.
 */
export function appendAuditEvent(
  events: AuditEvent[],
  partial: Omit<AuditEvent, 'id'>,
  id: string = createAuditEventId()
): AuditEvent[] {
  const event: AuditEvent = { ...partial, id };
  return [event, ...events];
}

/**
 * Tahap 7 – Buku besar BUKU SIMULASI.
 * Menghitung rantai blok simulasi secara deterministik dari urutan peristiwa audit:
 *   blockHash(n) = SHA-256(blockHash(n-1) | eventId | eventType | entityType | entityId | timestamp | summary)
 * Ini hanyalah simulasi visual rantai di memori browser – BUKAN blockchain nyata,
 * bukan jaringan publik/permissioned, dan bukan catatan yang immutable atau tahan manipulasi.
 */
const SIMULATED_GENESIS_MESSAGE = 'AKSARA-LEDGER-SIMULASI-GENESIS';

async function sha256OfText(text: string): Promise<string> {
  return sha256OfBytes(new TextEncoder().encode(text));
}

export async function computeSimulatedLedgerChain(
  events: AuditEvent[]
): Promise<SimulatedLedgerEntry[]> {
  // Urutan buku besar = kronologis (terlama di awal), tidak bergantung pada urutan input.
  const ordered = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  let previousHash = await sha256OfText(SIMULATED_GENESIS_MESSAGE);
  const entries: SimulatedLedgerEntry[] = [];
  for (const event of ordered) {
    const blockHash = await sha256OfText(
      `${previousHash}|${event.id}|${event.eventType}|${event.entityType}|${event.entityId}|${event.timestamp}|${event.summary}`
    );
    entries.push({
      sequence: entries.length + 1,
      eventId: event.id,
      previousBlockHash: previousHash,
      blockHash,
    });
    previousHash = blockHash;
  }
  return entries;
}

/**
 * Memeriksa apakah sebuah peristiwa audit terkait dengan dokumen tertentu.
 * Dipakai untuk filter dokumen pada log audit, termasuk dokumen yang sudah
 * dihapus dari registri aktif (riwayat audit tetap terlacak).
 */
export function eventMatchesDocument(event: AuditEvent, documentId: string): boolean {
  if (event.entityType === 'document' && event.entityId === documentId) return true;
  const m = event.metadata;
  if (!m) return false;
  if (m.documentId === documentId) return true;
  if (m.sourceDocumentId === documentId) return true;
  if (m.targetDocumentId === documentId) return true;
  if (typeof m.documentIds === 'string') {
    const ids = m.documentIds.split(',').map((s) => s.trim());
    if (ids.includes(documentId)) return true;
  }
  return false;
}
