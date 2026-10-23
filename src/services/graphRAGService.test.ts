import { describe, it, expect } from 'vitest';
import { extractKeywords, retrieveGraphContext, generateLocalFallbackResponse } from './graphRAGService';
import type { DocumentItem, GraphNode, GraphEdge, ConflictFinding } from '../types';

const makeDoc = (overrides: Partial<DocumentItem>): DocumentItem => ({
  id: 'doc-x',
  name: 'Dokumen.pdf',
  fileType: 'pdf',
  fileSize: '1 MB',
  uploadedAt: '2026-10-23',
  processingStatus: 'ready',
  integrityStatus: 'valid',
  sha256: 'a'.repeat(64),
  originalHash: 'a'.repeat(64),
  category: 'Dokumen Lainnya',
  relationshipsCount: 0,
  auditStatus: 'pending',
  metadata: {},
  ...overrides,
});

const docJournal = makeDoc({
  id: 'doc-journal',
  name: 'Jurnal_Umum.xlsx',
  fileType: 'xlsx',
  category: 'Jurnal Umum',
  relationshipsCount: 1,
  previewRows: [
    { 'No. Bukti': 'JU-01', Akun: '6-200 Beban Sewa', Debit: '80.000.000' },
    { 'No. Bukti': 'JU-02', Akun: '6-210 Beban Utilitas', Debit: '25.000.000' },
  ],
});

const docInvoice = makeDoc({
  id: 'doc-invoice',
  name: 'Invoice_Sewa.pdf',
  fileType: 'pdf',
  category: 'Invoice Pendukung',
  relationshipsCount: 1,
  extractedText: 'INVOICE SEWA KANTOR\nSewa Kantor Lantai 4: Rp80.000.000',
});

const docUnrelated = makeDoc({
  id: 'doc-other',
  name: 'Catatan_Rapat.txt.pdf',
  category: 'Dokumen Lainnya',
  extractedText: 'Catatan rapat internal tahunan manajemen.',
});

const nodeJournal: GraphNode = { id: 'n-journal', documentId: 'doc-journal', position: { x: 0, y: 0 } };
const nodeInvoice: GraphNode = { id: 'n-invoice', documentId: 'doc-invoice', position: { x: 0, y: 100 } };

const confirmedEdge: GraphEdge = {
  id: 'e-1',
  sourceNodeId: 'n-invoice',
  targetNodeId: 'n-journal',
  relationshipType: 'Mendukung',
  isConfirmed: true,
  createdAt: '2026-10-23',
};

const unconfirmedEdge: GraphEdge = {
  id: 'e-2',
  sourceNodeId: 'n-invoice',
  targetNodeId: 'n-journal',
  relationshipType: 'Mengacu pada',
  isConfirmed: false,
  createdAt: '2026-10-23',
};

describe('GraphRAG Service – Ekstraksi Kata Kunci', () => {
  it('membersihkan kata umum, menurunkan huruf, dan menghilangkan duplikat', () => {
    const keywords = extractKeywords('Apa dasar angka beban operasional pada laporan ini? beban');
    expect(keywords).toContain('dasar');
    expect(keywords).toContain('angka');
    expect(keywords.some((k) => k.includes('beban'))).toBe(true);
    expect(keywords).not.toContain('apa'); // stopword
    expect(keywords).not.toContain('ini'); // stopword
    expect(keywords.filter((k) => k === 'beban')).toHaveLength(1); // dedupe
  });
});

describe('GraphRAG Service – Retrieval Berbasis Graf', () => {
  it('menemukan cuplikan dari dokumen yang cocok dengan kata kunci', () => {
    const context = retrieveGraphContext(
      'berapa beban sewa pada jurnal?',
      [docJournal, docInvoice, docUnrelated],
      [nodeJournal, nodeInvoice],
      [confirmedEdge],
      []
    );
    expect(context.snippets.length).toBeGreaterThan(0);
    expect(context.snippets.some((s) => s.documentId === 'doc-journal')).toBe(true);
    // Dokumen yang sama sekali tidak relevan tidak dipaksakan masuk
    expect(context.snippets.some((s) => s.documentId === 'doc-other')).toBe(false);
  });

  it('memperluas penelusuran lewat relasi terkonfirmasi dengan jalur graf', () => {
    // Kata kunci hanya cocok dengan invoice; jurnal hanya bisa dijangkau via graf
    const context = retrieveGraphContext(
      'tagihan kantor lantai',
      [docJournal, docInvoice],
      [nodeJournal, nodeInvoice],
      [confirmedEdge],
      []
    );
    const viaGraph = context.snippets.find((s) => s.documentId === 'doc-journal' && s.isViaGraph);
    expect(viaGraph).toBeDefined();
    expect(viaGraph?.graphPath).toContain('Mendukung');
    expect(context.confirmedRelations).toHaveLength(1);
    expect(context.confirmedRelations[0].relationshipType).toBe('Mendukung');
  });

  it('mengabaikan relasi yang belum dikonfirmasi', () => {
    const context = retrieveGraphContext(
      'beban sewa kantor pada invoice',
      [docJournal, docInvoice],
      [nodeJournal, nodeInvoice],
      [unconfirmedEdge],
      []
    );
    expect(context.confirmedRelations).toHaveLength(0);
  });

  it('mengembalikan konteks kosong untuk pertanyaan yang tidak cocok dengan dokumen mana pun', () => {
    const context = retrieveGraphContext(
      'siapa presiden direktur perusahaan',
      [docJournal, docInvoice, docUnrelated],
      [nodeJournal, nodeInvoice],
      [confirmedEdge],
      []
    );
    expect(context.snippets).toHaveLength(0);
    expect(context.confirmedRelations).toHaveLength(0);
    expect(context.relatedFindings).toHaveLength(0);
  });

  it('menyertakan temuan konsistensi yang relevan dengan dokumen hasil penelusuran', () => {
    const finding: ConflictFinding = {
      id: 'f-1',
      ruleId: 'RULE-VALUE-EQUALITY',
      status: 'Conflict',
      severity: 'High',
      title: 'Selisih Beban Sewa',
      description: 'Nilai invoice berbeda dengan jurnal.',
      documentIds: ['doc-invoice', 'doc-journal'],
      sourceReferences: [],
      comparisonContext: {},
      reasoning: 'Uji',
      detectedAt: '2026-10-23',
    };
    const context = retrieveGraphContext(
      'beban sewa kantor',
      [docJournal, docInvoice],
      [nodeJournal, nodeInvoice],
      [confirmedEdge],
      [finding]
    );
    expect(context.relatedFindings.length).toBeGreaterThan(0);
  });
});

describe('GraphRAG Service – Respons Fallback Lokal', () => {
  it('menyatakan bukti tidak cukup ketika tidak ada cuplikan sama sekali', () => {
    const result = generateLocalFallbackResponse({
      query: 'pertanyaan tanpa bukti',
      snippets: [],
      relatedFindings: [],
      confirmedRelations: [],
    });
    expect(result.evidenceStatus).toBe('insufficient');
    expect(result.citations).toHaveLength(0);
    expect(result.answer).toContain('menolak mengarang');
  });

  it('menyertakan sitasi nyata dari cuplikan yang ditemukan', () => {
    const context = retrieveGraphContext(
      'beban sewa kantor',
      [docJournal, docInvoice],
      [nodeJournal, nodeInvoice],
      [confirmedEdge],
      []
    );
    const result = generateLocalFallbackResponse(context);
    expect(result.evidenceStatus).toBe('sufficient');
    expect(result.citations.length).toBeGreaterThan(0);
    for (const cite of result.citations) {
      expect(cite.documentId).toBeTruthy();
      expect(cite.snippet).toBeTruthy();
      expect(cite.location).toBeTruthy();
    }
    // Setiap kutipan berasal dari cuplikan retrieval yang nyata
    const sourceKeys = new Set(context.snippets.map((s) => `${s.documentId}::${s.snippet}`));
    for (const cite of result.citations) {
      expect(sourceKeys.has(`${cite.documentId}::${cite.snippet}`)).toBe(true);
    }
  });
});
