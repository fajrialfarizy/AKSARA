import { describe, it, expect } from 'vitest';
import { 
  parseAccountingNumber, 
  formatIDR, 
  runConsistencyRules, 
  executeConsistencyEngine 
} from '../services/consistencyRuleEngine';
import type { DocumentItem, GraphEdge } from '../types';

describe('Consistency Rule Engine Unit Tests', () => {
  it('dapat mem-parse string nilai akuntansi Indonesia ke tipe number', () => {
    expect(parseAccountingNumber('Rp125.000.000')).toBe(125000000);
    expect(parseAccountingNumber('120.000.000')).toBe(120000000);
    expect(parseAccountingNumber('-80.000.000')).toBe(-80000000);
    expect(parseAccountingNumber('null')).toBeNull();
  });

  it('dapat memformat angka ke format Rupiah standar', () => {
    const formatted = formatIDR(5000000);
    expect(formatted).toContain('5.000.000');
  });

  it('mendeteksi status Conflict pada ketidaksesuaian jumlah beban operasional vs jurnal', () => {
    const docReport: DocumentItem = {
      id: 'doc-report',
      name: 'Laporan_Keuangan.pdf',
      fileType: 'pdf',
      fileSize: '1 MB',
      uploadedAt: '2026-10-23',
      processingStatus: 'ready',
      integrityStatus: 'valid',
      sha256: 'hash1',
      originalHash: 'hash1',
      category: 'Laporan Keuangan',
      relationshipsCount: 1,
      auditStatus: 'conflict',
      metadata: { period: 'Q3 2026' },
      previewRows: [
        { Akun: '6-200 Beban Operasional', 'Nilai (IDR)': '125.000.000' }
      ]
    };

    const docJournal: DocumentItem = {
      id: 'doc-journal',
      name: 'Jurnal_Umum.xlsx',
      fileType: 'xlsx',
      fileSize: '500 KB',
      uploadedAt: '2026-10-23',
      processingStatus: 'ready',
      integrityStatus: 'valid',
      sha256: 'hash2',
      originalHash: 'hash2',
      category: 'Jurnal Umum',
      relationshipsCount: 1,
      auditStatus: 'conflict',
      metadata: { period: 'September 2026' },
      previewRows: [
        { 'No. Bukti': 'JU-01', Akun: '6-200 Beban Sewa', Debit: '80.000.000' },
        { 'No. Bukti': 'JU-02', Akun: '6-210 Beban Utilitas', Debit: '25.000.000' },
        { 'No. Bukti': 'JU-03', Akun: '6-220 Beban Pemeliharaan', Debit: '15.000.000' }
      ]
    };

    const edge: GraphEdge = {
      id: 'edge-test',
      sourceNodeId: 'node-journal',
      targetNodeId: 'node-report',
      relationshipType: 'Direkonsiliasi dengan',
      isConfirmed: true,
      createdAt: '2026-10-23',
    };

    const findings = runConsistencyRules(docReport, docJournal, edge);
    expect(findings.length).toBeGreaterThan(0);
    const conflict = findings.find((f) => f.status === 'Conflict');
    expect(conflict).toBeDefined();
    expect(conflict?.difference).toContain('5.000.000');
    expect(conflict?.title).toContain('Beban Operasional');
  });

  it('mendeteksi status Consistent saat nilai invoice sewa sama persis dengan jurnal', () => {
    const docInvoice: DocumentItem = {
      id: 'doc-inv',
      name: 'Invoice.pdf',
      fileType: 'pdf',
      fileSize: '300 KB',
      uploadedAt: '2026-10-23',
      processingStatus: 'ready',
      integrityStatus: 'valid',
      sha256: 'hash3',
      originalHash: 'hash3',
      category: 'Invoice Pendukung',
      relationshipsCount: 1,
      auditStatus: 'verified',
      metadata: { period: 'Q3 2026' },
      previewRows: [
        { Item: 'Sewa Kantor Lantai 4', Total: '80.000.000' }
      ]
    };

    const docJournal: DocumentItem = {
      id: 'doc-jour',
      name: 'Jurnal.xlsx',
      fileType: 'xlsx',
      fileSize: '400 KB',
      uploadedAt: '2026-10-23',
      processingStatus: 'ready',
      integrityStatus: 'valid',
      sha256: 'hash4',
      originalHash: 'hash4',
      category: 'Jurnal Umum',
      relationshipsCount: 1,
      auditStatus: 'verified',
      metadata: { period: 'September 2026' },
      previewRows: [
        { 'No. Bukti': 'JU-01', Akun: '6-200 Beban Sewa', Debit: '80.000.000' }
      ]
    };

    const findings = runConsistencyRules(docInvoice, docJournal);
    const consistentFinding = findings.find((f) => f.status === 'Consistent');
    expect(consistentFinding).toBeDefined();
    expect(consistentFinding?.ruleId).toBe('RULE-VALUE-EQUALITY');
  });

  it('menandai Insufficient Evidence jika dokumen berstatus scan unreadable', () => {
    const docScan: DocumentItem = {
      id: 'doc-scan',
      name: 'Scan_Dokumen_Fisik.pdf',
      fileType: 'pdf',
      fileSize: '2 MB',
      uploadedAt: '2026-10-23',
      processingStatus: 'unreadable',
      integrityStatus: 'valid',
      sha256: 'hash5',
      originalHash: 'hash5',
      category: 'Dokumen Lainnya',
      relationshipsCount: 0,
      auditStatus: 'pending',
      metadata: { notes: 'Scan murni tanpa teks' },
    };

    const docValid: DocumentItem = {
      id: 'doc-valid',
      name: 'Jurnal.xlsx',
      fileType: 'xlsx',
      fileSize: '400 KB',
      uploadedAt: '2026-10-23',
      processingStatus: 'ready',
      integrityStatus: 'valid',
      sha256: 'hash6',
      originalHash: 'hash6',
      category: 'Jurnal Umum',
      relationshipsCount: 0,
      auditStatus: 'pending',
      metadata: {},
      previewRows: [{ Col: '100' }],
    };

    const findings = runConsistencyRules(docScan, docValid);
    expect(findings.length).toBe(1);
    expect(findings[0].status).toBe('Insufficient Evidence');
    expect(findings[0].reasoning).toContain('tidak tersedia');
  });

  it('mampu mengeksekusi engine consistency pada dokumen terpilih', () => {
    const doc1: DocumentItem = {
      id: 'd1',
      name: 'Laba_Rugi.pdf',
      fileType: 'pdf',
      fileSize: '1 MB',
      uploadedAt: '2026-10-23',
      processingStatus: 'ready',
      integrityStatus: 'valid',
      sha256: 'h1',
      originalHash: 'h1',
      category: 'Laporan Keuangan',
      relationshipsCount: 0,
      auditStatus: 'pending',
      metadata: {},
      previewRows: [{ Akun: '6-200 Beban Operasional', 'Nilai (IDR)': '100.000.000' }]
    };

    const doc2: DocumentItem = {
      id: 'd2',
      name: 'Jurnal.xlsx',
      fileType: 'xlsx',
      fileSize: '1 MB',
      uploadedAt: '2026-10-23',
      processingStatus: 'ready',
      integrityStatus: 'valid',
      sha256: 'h2',
      originalHash: 'h2',
      category: 'Jurnal Umum',
      relationshipsCount: 0,
      auditStatus: 'pending',
      metadata: {},
      previewRows: [{ Akun: 'Beban Sewa', Debit: '100.000.000' }]
    };

    const results = executeConsistencyEngine(['d1', 'd2'], [doc1, doc2], [], []);
    expect(results.length).toBeGreaterThan(0);
  });
});
