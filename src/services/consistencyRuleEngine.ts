import type { 
  DocumentItem, 
  GraphNode, 
  GraphEdge, 
  ConflictFinding 
} from '../types';

/**
 * Normalisasi angka dari format teks akuntansi (Rp, titik, koma)
 */
export function parseAccountingNumber(val: unknown): number | null {
  if (typeof val === 'number') return val;
  if (!val || typeof val !== 'string') return null;
  
  // Bersihkan karakter selain digit, minus, titik, dan koma
  const clean = val.replace(/[^0-9,-]/g, '');
  if (!clean) return null;
  
  // Tangani format ribuan titik khas Indonesia/Eropa (mis: 125.000.000 atau 120.000.000)
  const standardized = clean.replace(/\./g, '').replace(/,/g, '.');
  const parsed = parseFloat(standardized);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Format angka ke format mata uang Rupiah standar
 */
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export interface RuleCheckResult {
  ruleId: string;
  finding: ConflictFinding;
}

/**
 * Eksekusi aturan Consistency Checker pada sepasang dokumen atau grup dokumen
 */
export function runConsistencyRules(
  docA: DocumentItem,
  docB: DocumentItem,
  edge?: GraphEdge
): ConflictFinding[] {
  const findings: ConflictFinding[] = [];
  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // 1. ATURAN D: Pemeriksaan Kelengkapan Bukti & Keterbacaan
  if (docA.processingStatus === 'unreadable' || docB.processingStatus === 'unreadable') {
    const unreadableDoc = docA.processingStatus === 'unreadable' ? docA : docB;
    findings.push({
      id: `chk-insufficient-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
      ruleId: 'RULE-DATA-COMPLETENESS',
      status: 'Insufficient Evidence',
      severity: 'Low',
      title: `Bukti Tidak Lengkap: ${unreadableDoc.name}`,
      description: `Dokumen "${unreadableDoc.name}" berupa scan atau tidak memuat layer teks digital yang dapat diekstrak oleh parser.`,
      documentIds: [docA.id, docB.id],
      sourceReferences: [
        {
          documentId: unreadableDoc.id,
          documentName: unreadableDoc.name,
          location: 'File Asli',
          extractedSnippet: unreadableDoc.metadata.notes || 'Teks digital tidak terdeteksi.',
        },
      ],
      comparisonContext: {
        ruleType: 'Completeness Check',
        period: 'Tidak terverifikasi',
      },
      reasoning: 'Data teks yang diperlukan untuk membandingkan angka tidak tersedia pada dokumen hasil scan. Sistem tidak mengarang nilai.',
      detectedAt: timeStr,
    });
    return findings;
  }

  // Cek apakah data tabel / previewRows tersedia
  const rowsA = docA.previewRows || [];
  const rowsB = docB.previewRows || [];

  if (rowsA.length === 0 || rowsB.length === 0) {
    findings.push({
      id: `chk-insufficient-rows-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
      ruleId: 'RULE-DATA-AVAILABILITY',
      status: 'Insufficient Evidence',
      severity: 'Info',
      title: `Rincian Tabel Belum Lengkap`,
      description: `Salah satu dokumen (${rowsA.length === 0 ? docA.name : docB.name}) tidak memiliki baris data tabular yang dapat diuraikan.`,
      documentIds: [docA.id, docB.id],
      sourceReferences: [
        {
          documentId: docA.id,
          documentName: docA.name,
          location: `Total baris: ${rowsA.length}`,
        },
        {
          documentId: docB.id,
          documentName: docB.name,
          location: `Total baris: ${rowsB.length}`,
        },
      ],
      comparisonContext: {
        ruleType: 'Completeness Check',
      },
      reasoning: 'Diperlukan struktur baris dan kolom yang valid pada kedua dokumen agar perbandingan angka dapat dilakukan secara akurat.',
      detectedAt: timeStr,
    });
    return findings;
  }

  // 2. ATURAN C: Pemeriksaan Kesesuaian Periode & Konteks Metadata
  const periodA = docA.metadata.period || extractPeriodFromName(docA.name);
  const periodB = docB.metadata.period || extractPeriodFromName(docB.name);

  if (periodA && periodB && periodA !== periodB && !isPeriodCompatible(periodA, periodB)) {
    findings.push({
      id: `chk-period-mismatch-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
      ruleId: 'RULE-PERIOD-CONTEXT',
      status: 'Not Comparable',
      severity: 'Low',
      title: `Ketidaksesuaian Periode Pelaporan`,
      description: `Dokumen "${docA.name}" (${periodA}) dan "${docB.name}" (${periodB}) memiliki rentang periode yang berbeda.`,
      documentIds: [docA.id, docB.id],
      sourceReferences: [
        {
          documentId: docA.id,
          documentName: docA.name,
          location: 'Metadata Nama/Header Dokumen',
          extractedSnippet: `Periode: ${periodA}`,
        },
        {
          documentId: docB.id,
          documentName: docB.name,
          location: 'Metadata Nama/Header Dokumen',
          extractedSnippet: `Periode: ${periodB}`,
        },
      ],
      comparisonContext: {
        period: `${periodA} vs ${periodB}`,
        ruleType: 'Period Match',
      },
      reasoning: 'Perbedaan periode bukan merupakan konflik nilai akuntansi, melainkan ketidaksesuaian konteks perbandingan (Not Comparable).',
      detectedAt: timeStr,
    });
  }

  // 3. ATURAN B & A: Rekonsiliasi Jurnal ke Laporan atau Invoice ke Jurnal
  // Kasus: Laporan Laba Rugi vs Jurnal Umum (Relasi: Direkonsiliasi dengan / Berasal dari)
  const isReportAndJournal = 
    (docA.category === 'Laporan Keuangan' && docB.category === 'Jurnal Umum') ||
    (docB.category === 'Laporan Keuangan' && docA.category === 'Jurnal Umum');

  if (isReportAndJournal) {
    const reportDoc = docA.category === 'Laporan Keuangan' ? docA : docB;
    const journalDoc = docA.category === 'Jurnal Umum' ? docA : docB;

    // Cari baris beban operasional pada laporan
    const reportRow = reportDoc.previewRows?.find((r) => 
      String(r['Akun'] || '').toLowerCase().includes('beban operasional')
    );

    // Hitung total mutasi beban debit pada jurnal (baris JU)
    const journalExpenseRows = (journalDoc.previewRows || []).filter((r) => 
      String(r['Akun'] || '').toLowerCase().includes('beban') && 
      !String(r['No. Bukti'] || '').toUpperCase().includes('TOTAL')
    );

    if (reportRow && journalExpenseRows.length > 0) {
      const reportValue = parseAccountingNumber(reportRow['Nilai (IDR)'] || reportRow['Total'] || reportRow['Debit']);
      
      const sumJournal = journalExpenseRows.reduce((acc, row) => {
        const val = parseAccountingNumber(row['Debit'] || row['Nilai (IDR)']);
        return acc + (val || 0);
      }, 0);

      if (reportValue !== null) {
        const diff = Math.abs(reportValue - sumJournal);

        if (diff > 0) {
          // Konflik Terkonfirmasi (PRD FR-04: Merah hanya untuk konflik terkonfirmasi berbasis aturan)
          findings.push({
            id: `chk-conflict-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
            ruleId: 'RULE-RECONCILIATION-SUM',
            status: 'Conflict',
            severity: 'High',
            title: 'Selisih Total Beban Operasional',
            description: `Total beban operasional pada laporan (${formatIDR(reportValue)}) berbeda dari jumlah mutasi jurnal pendukung (${formatIDR(sumJournal)}).`,
            documentIds: [reportDoc.id, journalDoc.id],
            comparedValues: [
              {
                documentId: reportDoc.id,
                documentName: reportDoc.name,
                label: 'Beban Operasional (Laporan)',
                value: formatIDR(reportValue),
              },
              {
                documentId: journalDoc.id,
                documentName: journalDoc.name,
                label: `Total ${journalExpenseRows.length} Mutasi Jurnal`,
                value: formatIDR(sumJournal),
              },
            ],
            difference: formatIDR(diff),
            sourceReferences: [
              {
                documentId: reportDoc.id,
                documentName: reportDoc.name,
                location: 'Baris: 6-200 Beban Operasional',
                extractedSnippet: `${reportRow['Akun']} : ${reportRow['Nilai (IDR)']}`,
                field: 'Nilai (IDR)',
              },
              {
                documentId: journalDoc.id,
                documentName: journalDoc.name,
                location: `Sheet: Jurnal September, Baris 1-${journalExpenseRows.length}`,
                extractedSnippet: journalExpenseRows.map((r) => `${r['No. Bukti']} - ${r['Akun']}: ${r['Debit']}`).join('; '),
                field: 'Debit',
              },
            ],
            comparisonContext: {
              accountOrItem: 'Beban Operasional',
              period: 'Q3 2026 / September 2026',
              currency: 'IDR',
              ruleType: 'Reconciliation Sum',
            },
            reasoning: `Penjumlahan rincian jurnal (${formatIDR(sumJournal)}) memiliki selisih ${formatIDR(diff)} lebih rendah dari nilai tercatat pada Laporan Laba Rugi (${formatIDR(reportValue)}). Terdapat bukti dokumen pendukung yang belum tercakup atau entri belum dibukukan.`,
            detectedAt: timeStr,
          });
        } else {
          // Konsisten Sesuai Aturan
          findings.push({
            id: `chk-consistent-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
            ruleId: 'RULE-RECONCILIATION-SUM',
            status: 'Consistent',
            severity: 'Info',
            title: 'Beban Operasional Terekonsiliasi Konsisten',
            description: `Total beban operasional pada laporan (${formatIDR(reportValue)}) sesuai secara matematis dengan jurnal umum.`,
            documentIds: [reportDoc.id, journalDoc.id],
            comparedValues: [
              {
                documentId: reportDoc.id,
                documentName: reportDoc.name,
                label: 'Laporan Laba Rugi',
                value: formatIDR(reportValue),
              },
              {
                documentId: journalDoc.id,
                documentName: journalDoc.name,
                label: 'Jurnal Umum September',
                value: formatIDR(sumJournal),
              },
            ],
            sourceReferences: [
              {
                documentId: reportDoc.id,
                documentName: reportDoc.name,
                location: 'Baris: 6-200 Beban Operasional',
              },
            ],
            comparisonContext: {
              accountOrItem: 'Beban Operasional',
              currency: 'IDR',
              ruleType: 'Reconciliation Sum',
            },
            reasoning: 'Jumlah mutasi jurnal cocok 100% dengan total yang dilaporkan pada laporan keuangan.',
            detectedAt: timeStr,
          });
        }
      }
    }
  }

  // Kasus: Invoice Pendukung vs Jurnal Umum (Relasi: Mendukung / Supporting)
  const isInvoiceAndJournal = 
    (docA.category === 'Invoice Pendukung' && docB.category === 'Jurnal Umum') ||
    (docB.category === 'Invoice Pendukung' && docA.category === 'Jurnal Umum');

  if (isInvoiceAndJournal) {
    const invoiceDoc = docA.category === 'Invoice Pendukung' ? docA : docB;
    const journalDoc = docA.category === 'Jurnal Umum' ? docA : docB;

    // Cari invoice sewa dan jurnal sewa
    const invoiceRow = invoiceDoc.previewRows?.find((r) => 
      String(r['Item'] || '').toLowerCase().includes('sewa')
    );
    const journalRentRow = journalDoc.previewRows?.find((r) => 
      String(r['Akun'] || '').toLowerCase().includes('sewa')
    );

    if (invoiceRow && journalRentRow) {
      const invVal = parseAccountingNumber(invoiceRow['Total'] || invoiceRow['Nilai (IDR)']);
      const jourVal = parseAccountingNumber(journalRentRow['Debit']);

      if (invVal !== null && jourVal !== null) {
        if (invVal === jourVal) {
          findings.push({
            id: `chk-invoice-match-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
            ruleId: 'RULE-VALUE-EQUALITY',
            status: 'Consistent',
            severity: 'Info',
            title: 'Kesesuaian Nilai Invoice Sewa & Jurnal',
            description: `Nilai pokok invoice sewa gedung (${formatIDR(invVal)}) cocok dengan debit jurnal akun 6-200.`,
            documentIds: [invoiceDoc.id, journalDoc.id],
            comparedValues: [
              {
                documentId: invoiceDoc.id,
                documentName: invoiceDoc.name,
                label: 'Nilai Pokok Invoice',
                value: formatIDR(invVal),
              },
              {
                documentId: journalDoc.id,
                documentName: journalDoc.name,
                label: 'Debit Jurnal Beban Sewa',
                value: formatIDR(jourVal),
              },
            ],
            sourceReferences: [
              {
                documentId: invoiceDoc.id,
                documentName: invoiceDoc.name,
                location: 'Baris 1: Sewa Kantor Lantai 4',
                extractedSnippet: `${invoiceRow['Item']} = ${invoiceRow['Total']}`,
              },
              {
                documentId: journalDoc.id,
                documentName: journalDoc.name,
                location: 'Baris JU-09-01: Akun 6-200 Beban Sewa',
                extractedSnippet: `JU-09-01 Debit: ${journalRentRow['Debit']}`,
              },
            ],
            comparisonContext: {
              accountOrItem: 'Beban Sewa Kantor',
              period: 'Q3 2026',
              currency: 'IDR',
              ruleType: 'Value Equality',
            },
            reasoning: 'Nilai transaksi pada invoice pendukung sesuai dengan pencatatan jurnal umum.',
            detectedAt: timeStr,
          });
        } else {
          findings.push({
            id: `chk-invoice-diff-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
            ruleId: 'RULE-VALUE-EQUALITY',
            status: 'Conflict',
            severity: 'High',
            title: 'Perbedaan Nilai Invoice dan Jurnal',
            description: `Nilai invoice (${formatIDR(invVal)}) berbeda dengan debit jurnal (${formatIDR(jourVal)}).`,
            documentIds: [invoiceDoc.id, journalDoc.id],
            difference: formatIDR(Math.abs(invVal - jourVal)),
            comparedValues: [
              {
                documentId: invoiceDoc.id,
                documentName: invoiceDoc.name,
                label: 'Invoice',
                value: formatIDR(invVal),
              },
              {
                documentId: journalDoc.id,
                documentName: journalDoc.name,
                label: 'Jurnal',
                value: formatIDR(jourVal),
              },
            ],
            sourceReferences: [
              {
                documentId: invoiceDoc.id,
                documentName: invoiceDoc.name,
                location: 'Baris 1',
              },
              {
                documentId: journalDoc.id,
                documentName: journalDoc.name,
                location: 'Baris JU-09-01',
              },
            ],
            comparisonContext: {
              accountOrItem: 'Beban Sewa Kantor',
              ruleType: 'Value Equality',
            },
            reasoning: 'Terdapat perbedaan nominal antara bukti transaksi faktur dengan pembukuan jurnal.',
            detectedAt: timeStr,
          });
        }
      }
    }
  }

  // Jika tidak ada aturan yang terpicu sama sekali untuk pasangan dokumen ini
  if (findings.length === 0) {
    findings.push({
      id: `chk-needs-review-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
      ruleId: 'RULE-GENERIC-VERIFICATION',
      status: 'Needs Review',
      severity: 'Low',
      title: `Memerlukan Verifikasi Manual Antardokumen`,
      description: `Dokumen "${docA.name}" dan "${docB.name}" ${edge ? `terhubung dengan relasi [${edge.relationshipType}]` : 'dipilih untuk dibandingkan'}, namun belum memiliki pemetaan akun otomatis yang spesifik.`,
      documentIds: [docA.id, docB.id],
      sourceReferences: [
        {
          documentId: docA.id,
          documentName: docA.name,
          location: 'File Content',
        },
        {
          documentId: docB.id,
          documentName: docB.name,
          location: 'File Content',
        },
      ],
      comparisonContext: {
        ruleType: 'Completeness Check',
      },
      reasoning: 'Indikasi akun atau pos yang sebanding belum dapat dipastikan secara otomatis. Disarankan peninjauan auditor pada Accounting Workspace.',
      detectedAt: timeStr,
    });
  }

  return findings;
}

/**
 * Eksekusi pemeriksaan penuh untuk seluruh pasangan dokumen yang terhubung di Relationship Canvas
 * atau pasangan dokumen terpilih.
 */
export function executeConsistencyEngine(
  selectedDocIds: string[],
  allDocs: DocumentItem[],
  graphNodes: GraphNode[],
  graphEdges: GraphEdge[]
): ConflictFinding[] {
  const allFindings: ConflictFinding[] = [];
  const processedPairs = new Set<string>();

  // Filter dokumen yang dipilih pengguna
  const targetDocs = allDocs.filter((d) => selectedDocIds.includes(d.id));
  if (targetDocs.length < 2) return [];

  // 1. Prioritaskan pasangan dokumen yang memiliki hubungan terkonfirmasi di canvas
  for (const edge of graphEdges) {
    if (!edge.isConfirmed) continue;

    const sourceNode = graphNodes.find((n) => n.id === edge.sourceNodeId);
    const targetNode = graphNodes.find((n) => n.id === edge.targetNodeId);
    if (!sourceNode || !targetNode) continue;

    const docA = targetDocs.find((d) => d.id === sourceNode.documentId);
    const docB = targetDocs.find((d) => d.id === targetNode.documentId);

    if (docA && docB && docA.id !== docB.id) {
      const pairKey = [docA.id, docB.id].sort().join(':::');
      if (!processedPairs.has(pairKey)) {
        processedPairs.add(pairKey);
        const results = runConsistencyRules(docA, docB, edge);
        allFindings.push(...results);
      }
    }
  }

  // 2. Periksa sisa pasangan dokumen yang dipilih secara manual meskipun belum memiliki edge di canvas
  for (let i = 0; i < targetDocs.length; i++) {
    for (let j = i + 1; j < targetDocs.length; j++) {
      const docA = targetDocs[i];
      const docB = targetDocs[j];
      const pairKey = [docA.id, docB.id].sort().join(':::');

      if (!processedPairs.has(pairKey)) {
        processedPairs.add(pairKey);
        const results = runConsistencyRules(docA, docB);
        allFindings.push(...results);
      }
    }
  }

  return allFindings;
}

function extractPeriodFromName(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.includes('q3')) return 'Q3 2026';
  if (lower.includes('q2')) return 'Q2 2026';
  if (lower.includes('q1')) return 'Q1 2026';
  if (lower.includes('q4')) return 'Q4 2026';
  if (lower.includes('sep') || lower.includes('september')) return 'September 2026';
  if (lower.includes('okt') || lower.includes('oktober')) return 'Oktober 2026';
  if (lower.includes('agu') || lower.includes('agustus')) return 'Agustus 2026';
  return null;
}

function isPeriodCompatible(periodA: string, periodB: string): boolean {
  // Q3 2026 mencakup Juli, Agustus, September 2026
  if (periodA === 'Q3 2026' && periodB === 'September 2026') return true;
  if (periodB === 'Q3 2026' && periodA === 'September 2026') return true;
  return false;
}
