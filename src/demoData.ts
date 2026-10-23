import type { DocumentItem, ActivityItem, ConflictFinding, ProposalItem, GraphNode, GraphEdge, ChangeProposal, DocumentVersion, AuditEvent } from './types';

export const DEMO_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-001',
    name: 'Laporan_Laba_Rugi_Q3_2026.pdf',
    fileType: 'pdf',
    fileSize: '1.4 MB',
    uploadedAt: '2026-10-23 14:15',
    processingStatus: 'ready',
    integrityStatus: 'valid',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    originalHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    auditStatus: 'conflict',
    relationshipsCount: 2,
    category: 'Laporan Keuangan',
    extractedText: 'Laporan Laba Rugi Komprehensif Periode Q3 2026\nPendapatan Usaha: Rp850.000.000\nBeban Operasional: Rp125.000.000\nBeban Pemasaran: Rp45.000.000\nLaba Bersih Sebelum Pajak: Rp680.000.000',
    metadata: {
      pageCount: 3,
      period: 'Q3 2026',
      currency: 'IDR',
      notes: 'Laporan formal kuartalan diaudit internal.',
      rawMimeType: 'application/pdf',
    },
    previewRows: [
      { Akun: '5-100 Pendapatan Usaha', 'Nilai (IDR)': '850.000.000', Catatan: 'Diaudit' },
      { Akun: '6-200 Beban Operasional', 'Nilai (IDR)': '125.000.000', Catatan: 'Selisih temuan' },
      { Akun: '6-300 Beban Pemasaran', 'Nilai (IDR)': '45.000.000', Catatan: 'Sesuai' },
      { Akun: '8-100 Laba Bersih', 'Nilai (IDR)': '680.000.000', Catatan: 'Terdampak beban' },
    ]
  },
  {
    id: 'doc-002',
    name: 'Jurnal_Umum_September_2026.xlsx',
    fileType: 'xlsx',
    fileSize: '820 KB',
    uploadedAt: '2026-10-23 14:20',
    processingStatus: 'ready',
    integrityStatus: 'valid',
    sha256: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
    originalHash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
    auditStatus: 'conflict',
    relationshipsCount: 2,
    category: 'Jurnal Umum',
    extractedText: 'JU-09-01: Beban Sewa Kantor Rp80.000.000\nJU-09-02: Beban Utilitas Listrik & Air Rp25.000.000\nJU-09-03: Beban Pemeliharaan AC Rp15.000.000\nTotal Mutasi: Rp120.000.000',
    metadata: {
      sheetCount: 2,
      period: 'September 2026',
      currency: 'IDR',
      sheets: [
        { name: 'Jurnal September', rowCount: 4, columnCount: 4, headers: ['No. Bukti', 'Akun', 'Debit', 'Kredit'] },
        { name: 'Rekap Akun', rowCount: 3, columnCount: 2, headers: ['Kode', 'Total'] }
      ],
      rowCount: 4,
      columnCount: 4,
      headers: ['No. Bukti', 'Akun', 'Debit', 'Kredit'],
      rawMimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
    previewRows: [
      { 'No. Bukti': 'JU-09-01', Akun: '6-200 Beban Sewa', Debit: '80.000.000', Kredit: '0' },
      { 'No. Bukti': 'JU-09-02', Akun: '6-210 Beban Utilitas', Debit: '25.000.000', Kredit: '0' },
      { 'No. Bukti': 'JU-09-03', Akun: '6-220 Beban Pemeliharaan', Debit: '15.000.000', Kredit: '0' },
      { 'No. Bukti': 'TOTAL', Akun: 'Total Beban Terkait', Debit: '120.000.000', Kredit: '0' },
    ]
  },
  {
    id: 'doc-003',
    name: 'Invoice_Sewa_Gedung_Q3.pdf',
    fileType: 'pdf',
    fileSize: '512 KB',
    uploadedAt: '2026-10-23 14:28',
    processingStatus: 'ready',
    integrityStatus: 'valid',
    sha256: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    originalHash: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    auditStatus: 'verified',
    relationshipsCount: 1,
    category: 'Invoice Pendukung',
    extractedText: 'INVOICE TAGIHAN SEWA GEDUNG KANTOR\nItem: Sewa Kantor Lantai 4 (Jul-Sep 2026) = Rp80.000.000\nPPN 11% = Rp8.800.000\nTotal Terbayar Lunas',
    metadata: {
      pageCount: 1,
      period: 'Q3 2026',
      currency: 'IDR',
      notes: 'Faktur pajak dan kwitansi tanda terima terlampir.',
      rawMimeType: 'application/pdf',
    },
    previewRows: [
      { Item: 'Sewa Kantor Lantai 4', Periode: 'Jul-Sep 2026', Total: '80.000.000' },
      { Item: 'PPN 11%', Periode: 'Terbayar', Total: '8.800.000' }
    ]
  },
  {
    id: 'doc-004',
    name: 'Rekonsiliasi_Bank_Mandiri_Sep26.csv',
    fileType: 'csv',
    fileSize: '340 KB',
    uploadedAt: '2026-10-23 15:02',
    processingStatus: 'ready',
    integrityStatus: 'valid',
    sha256: 'cb23a763f350c38f4d96a60395781a74d3b84db555b769ea84c958de6f0d9129',
    originalHash: 'cb23a763f350c38f4d96a60395781a74d3b84db555b769ea84c958de6f0d9129',
    auditStatus: 'pending',
    relationshipsCount: 0,
    category: 'Rekonsiliasi Bank',
    extractedText: '2026-09-30 | Transfer Out Sewa Gedung | -80.000.000 | 1.420.000.000\n2026-09-30 | Biaya Utilitas PLN & Air | -25.000.000 | 1.395.000.000',
    metadata: {
      rowCount: 2,
      columnCount: 4,
      period: 'September 2026',
      currency: 'IDR',
      headers: ['Tanggal', 'Uraian', 'Mutasi', 'Saldo'],
      rawMimeType: 'text/csv',
    },
    previewRows: [
      { Tanggal: '2026-09-30', Uraian: 'Transfer Out Sewa Gedung', Mutasi: '-80.000.000', Saldo: '1.420.000.000' },
      { Tanggal: '2026-09-30', Uraian: 'Biaya Utilitas PLN & Air', Mutasi: '-25.000.000', Saldo: '1.395.000.000' },
    ]
  }
];

export const DEMO_NODES: GraphNode[] = [
  {
    id: 'node-doc-003',
    documentId: 'doc-003',
    position: { x: 180, y: 360 },
  },
  {
    id: 'node-doc-002',
    documentId: 'doc-002',
    position: { x: 180, y: 190 },
  },
  {
    id: 'node-doc-001',
    documentId: 'doc-001',
    position: { x: 180, y: 20 },
  },
];

export const DEMO_EDGES: GraphEdge[] = [
  {
    id: 'edge-01',
    sourceNodeId: 'node-doc-003',
    targetNodeId: 'node-doc-002',
    relationshipType: 'Mendukung',
    isConfirmed: true,
    createdAt: '2026-10-23 14:30',
    notes: 'Invoice sewa gedung mendukung pencatatan pada Jurnal Umum September akun 6-200.',
  },
  {
    id: 'edge-02',
    sourceNodeId: 'node-doc-002',
    targetNodeId: 'node-doc-001',
    relationshipType: 'Direkonsiliasi dengan',
    isConfirmed: true,
    createdAt: '2026-10-23 14:32',
    notes: 'Total jurnal operasional direkonsiliasi dengan beban operasional pada Laporan Laba Rugi.',
  },
];

/**
 * Dataset Demo Terkontrol untuk Pengujian 5 Skenario PRD Tahap 4:
 * 1. Konflik nilai terkonfirmasi (Selisih Beban Operasional)
 * 2. Nilai konsisten (Invoice Sewa vs Jurnal Sewa)
 * 3. Perbedaan periode pelaporan (Not Comparable)
 * 4. Rekapitulasi dengan rincian data belum lengkap (Needs Review / Insufficient)
 * 5. Dokumen bukti tidak memadai (Scan / Insufficient Evidence)
 */
export const DEMO_FINDINGS: ConflictFinding[] = [
  // 1. Skenario: Konflik nilai terkonfirmasi
  {
    id: 'demo-finding-01',
    ruleId: 'RULE-RECONCILIATION-SUM',
    status: 'Conflict',
    severity: 'High',
    title: 'Selisih Total Beban Operasional',
    description: 'Total beban operasional pada Laporan Laba Rugi (Rp125.000.000) berbeda dari akumulasi rincian mutasi Jurnal Umum September (Rp120.000.000).',
    documentIds: ['doc-001', 'doc-002'],
    comparedValues: [
      {
        documentId: 'doc-001',
        documentName: 'Laporan_Laba_Rugi_Q3_2026.pdf',
        label: 'Nilai Tercatat di Laporan Laba Rugi',
        value: 'Rp125.000.000',
      },
      {
        documentId: 'doc-002',
        documentName: 'Jurnal_Umum_September_2026.xlsx',
        label: 'Total Akumulasi Debit Jurnal Beban Terkait',
        value: 'Rp120.000.000',
      },
    ],
    difference: 'Rp5.000.000',
    sourceReferences: [
      {
        documentId: 'doc-001',
        documentName: 'Laporan_Laba_Rugi_Q3_2026.pdf',
        location: 'Tabel Laba Rugi, Baris 2: Akun 6-200 Beban Operasional',
        extractedSnippet: 'Akun: 6-200 Beban Operasional | Nilai (IDR): 125.000.000',
        field: 'Nilai (IDR)',
      },
      {
        documentId: 'doc-002',
        documentName: 'Jurnal_Umum_September_2026.xlsx',
        location: 'Sheet: Jurnal September, Baris 1-3 (JU-09-01 s/d JU-09-03)',
        extractedSnippet: 'JU-09-01 (80jt) + JU-09-02 (25jt) + JU-09-03 (15jt) = 120.000.000',
        field: 'Debit',
      },
    ],
    comparisonContext: {
      accountOrItem: 'Beban Operasional',
      period: 'Q3 2026 (Juli - September)',
      currency: 'IDR',
      ruleType: 'Reconciliation Sum',
    },
    reasoning: 'Rincian jurnal yang terhubung berjumlah Rp120.000.000. Terdapat selisih Rp5.000.000 lebih tinggi pada Laporan Laba Rugi yang belum memiliki bukti transaksi pendukung.',
    detectedAt: '2026-10-23 14:35',
    isDemoFinding: true,
  },

  // 2. Skenario: Nilai yang konsisten
  {
    id: 'demo-finding-02',
    ruleId: 'RULE-VALUE-EQUALITY',
    status: 'Consistent',
    severity: 'Info',
    title: 'Kesesuaian Nilai Invoice Sewa Gedung',
    description: 'Nilai pokok tagihan pada Invoice Sewa Gedung sesuai dengan nilai pencatatan debit pada Jurnal Umum September akun 6-200.',
    documentIds: ['doc-003', 'doc-002'],
    comparedValues: [
      {
        documentId: 'doc-003',
        documentName: 'Invoice_Sewa_Gedung_Q3.pdf',
        label: 'Nilai Invoice Pokok',
        value: 'Rp80.000.000',
      },
      {
        documentId: 'doc-002',
        documentName: 'Jurnal_Umum_September_2026.xlsx',
        label: 'Nilai Debit Jurnal (JU-09-01)',
        value: 'Rp80.000.000',
      },
    ],
    sourceReferences: [
      {
        documentId: 'doc-003',
        documentName: 'Invoice_Sewa_Gedung_Q3.pdf',
        location: 'Baris 1: Sewa Kantor Lantai 4 (Jul-Sep 2026)',
        extractedSnippet: 'Sewa Kantor Lantai 4 | Total: 80.000.000',
      },
      {
        documentId: 'doc-002',
        documentName: 'Jurnal_Umum_September_2026.xlsx',
        location: 'Sheet: Jurnal September, Baris 1: JU-09-01',
        extractedSnippet: 'JU-09-01 | Akun: 6-200 Beban Sewa | Debit: 80.000.000',
      },
    ],
    comparisonContext: {
      accountOrItem: 'Beban Sewa Kantor',
      period: 'Q3 2026',
      currency: 'IDR',
      ruleType: 'Value Equality',
    },
    reasoning: 'Nilai transaksi pada bukti faktur pendukung sesuai 100% dengan pencatatan jurnal umum yang terhubung di canvas.',
    detectedAt: '2026-10-23 14:40',
    isDemoFinding: true,
  },

  // 3. Skenario: Perbedaan periode pelaporan (Not Comparable)
  {
    id: 'demo-finding-03',
    ruleId: 'RULE-PERIOD-CONTEXT',
    status: 'Not Comparable',
    severity: 'Low',
    title: 'Perbedaan Periode Rekonsiliasi Fiskal',
    description: 'Dokumen Pajak Tahunan 2025 dan Laporan Operasional Q3 2026 memiliki basis periode yang berbeda.',
    documentIds: ['doc-001'],
    sourceReferences: [
      {
        documentId: 'doc-001',
        documentName: 'Laporan_Laba_Rugi_Q3_2026.pdf',
        location: 'Header Dokumen: Periode Q3 2026',
        extractedSnippet: 'Periode Berjalan: Kuartal 3 Tahun 2026',
      },
    ],
    comparisonContext: {
      period: 'Tahunan 2025 vs Kuartal 3 2026',
      ruleType: 'Period Match',
    },
    reasoning: 'Perbedaan rentang waktu pelaporan bukan merupakan konflik nilai akuntansi, melainkan batas kelayakan perbandingan (Not Comparable).',
    detectedAt: '2026-10-23 14:45',
    isDemoFinding: true,
  },

  // 4. Skenario: Rincian transaksi belum lengkap (Needs Review)
  {
    id: 'demo-finding-04',
    ruleId: 'RULE-COMPLETENESS-DETAIL',
    status: 'Needs Review',
    severity: 'Medium',
    title: 'Rincian Bukti Transaksi Pemeliharaan Belum Lengkap',
    description: 'Jurnal JU-09-03 mencatat Beban Pemeliharaan Rp15.000.000 namun belum terhubung dengan bukti invoice vendor di Relationship Canvas.',
    documentIds: ['doc-002'],
    comparedValues: [
      {
        documentId: 'doc-002',
        documentName: 'Jurnal_Umum_September_2026.xlsx',
        label: 'Debit Jurnal Beban Pemeliharaan',
        value: 'Rp15.000.000',
      },
      {
        documentId: 'none',
        documentName: 'Invoice Vendor Terkait',
        label: 'Bukti Invoice Terhubung',
        value: 'Belum Terpetakan',
      },
    ],
    sourceReferences: [
      {
        documentId: 'doc-002',
        documentName: 'Jurnal_Umum_September_2026.xlsx',
        location: 'Sheet: Jurnal September, Baris 3: JU-09-03',
        extractedSnippet: 'JU-09-03 | Akun: 6-220 Beban Pemeliharaan | Debit: 15.000.000',
      },
    ],
    comparisonContext: {
      accountOrItem: 'Beban Pemeliharaan',
      ruleType: 'Completeness Check',
    },
    reasoning: 'Data transaksi ada di jurnal namun bukti pendukung belum dihubungkan pada canvas. Memerlukan tinjauan auditor dan tidak dapat langsung dinyatakan sebagai konflik.',
    detectedAt: '2026-10-23 14:48',
    isDemoFinding: true,
  },

  // 5. Skenario: Bukti tidak memadai (Insufficient Evidence)
  {
    id: 'demo-finding-05',
    ruleId: 'RULE-DATA-COMPLETENESS',
    status: 'Insufficient Evidence',
    severity: 'Low',
    title: 'Dokumen Scan Fisik Tidak Memuat Layer Teks',
    description: 'Arsip lampiran bukti rekening koran hasil pemindaian scanner fisik tidak memuat karakter digital yang dapat diekstraksi.',
    documentIds: ['doc-004'],
    sourceReferences: [
      {
        documentId: 'doc-004',
        documentName: 'Rekonsiliasi_Bank_Mandiri_Sep26.csv',
        location: 'Ekstraksi Parsial Baris Mutasi',
        extractedSnippet: 'Lampiran slip setoran fisik berformat bitmap tidak terbaca.',
      },
    ],
    comparisonContext: {
      ruleType: 'Completeness Check',
    },
    reasoning: 'Data yang diperlukan untuk memvalidasi nomor referensi transfer tidak memadai. Sistem menolak mengarang isi dokumen.',
    detectedAt: '2026-10-23 14:50',
    isDemoFinding: true,
  },
];

export const DEMO_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    timestamp: '15:10 WIB',
    actor: 'Fajri (Auditor)',
    action: 'Membuka penelusuran hubungan',
    target: 'Laporan_Laba_Rugi_Q3_2026.pdf',
    type: 'relation'
  },
  {
    id: 'act-2',
    timestamp: '14:35 WIB',
    actor: 'Sistem AKSARA',
    action: 'Menjalankan Consistency Checker',
    target: 'Aturan Rekonsiliasi Jurnal ke Laporan',
    type: 'conflict'
  },
  {
    id: 'act-3',
    timestamp: '14:28 WIB',
    actor: 'Fajri (Auditor)',
    action: 'Mengunggah dokumen pendukung',
    target: 'Invoice_Sewa_Gedung_Q3.pdf',
    type: 'upload'
  },
  {
    id: 'act-4',
    timestamp: '14:20 WIB',
    actor: 'Fajri (Auditor)',
    action: 'Mengunggah jurnal umum',
    target: 'Jurnal_Umum_September_2026.xlsx',
    type: 'upload'
  }
];

export const DEMO_PROPOSALS: ProposalItem[] = [
  {
    id: 'prop-01',
    document: 'Laporan_Laba_Rugi_Q3_2026.pdf',
    location: 'Akun 6-200 (Beban Operasional)',
    originalValue: 'Rp125.000.000',
    proposedValue: 'Rp120.000.000',
    reason: 'Koreksi penyesuaian nilai sesuai total mutasi jurnal September yang telah dikonfirmasi invoice.',
    evidence: 'Ref: Jurnal_Umum_September_2026.xlsx baris 2-4 & Invoice_Sewa_Gedung_Q3.pdf',
    status: 'Menunggu Review',
    approvalsReceived: 1,
    approvalsRequired: 2
  }
];

/**
 * DEMO_CHANGE_PROPOSALS – dataset usulan koreksi berbasis ChangeProposal untuk Tahap 6.
 * Status mencerminkan skenario pengujian PRD: Pending Review, Approved, Rejected.
 */
export const DEMO_CHANGE_PROPOSALS: ChangeProposal[] = [
  {
    id: 'cp-001',
    documentId: 'doc-001',
    sourceFindingId: 'demo-finding-01',
    proposedBy: 'Fajri (Auditor)',
    changeType: 'value',
    originalValue: 'Rp125.000.000',
    proposedValue: 'Rp120.000.000',
    rationale: 'Total akumulasi debit pada Jurnal Umum September 2026 hanya Rp120.000.000. Selisih Rp5.000.000 pada Laporan Laba Rugi belum didukung bukti transaksi. Usulan ini mengkoreksi nilai beban operasional agar sesuai bukti yang tersedia.',
    evidenceReferences: 'Jurnal_Umum_September_2026.xlsx – Sheet: Jurnal September, JU-09-01 s/d JU-09-03 (Rp80jt + Rp25jt + Rp15jt = Rp120jt). Invoice_Sewa_Gedung_Q3.pdf – Baris 1 (Rp80.000.000 terbayar lunas). Temuan: demo-finding-01 (Selisih Total Beban Operasional).',
    status: 'Pending Review',
    approvalsReceived: 0,
    approvalsRequired: 2,
    createdAt: '2026-10-23T14:55:00+07:00',
  },
  {
    id: 'cp-002',
    documentId: 'doc-002',
    sourceFindingId: 'demo-finding-04',
    proposedBy: 'Fajri (Auditor)',
    changeType: 'metadata',
    originalValue: 'Status Bukti: Belum Terpetakan',
    proposedValue: 'Status Bukti: Perlu Lampiran Invoice Pemeliharaan',
    rationale: 'JU-09-03 (Beban Pemeliharaan Rp15.000.000) belum memiliki invoice pendukung di Relationship Canvas. Catatan metadata ini menandai kebutuhan bukti tanpa mengubah nilai transaksi.',
    evidenceReferences: 'Jurnal_Umum_September_2026.xlsx – Sheet: Jurnal September, Baris 3: JU-09-03. Temuan: demo-finding-04 (Rincian Bukti Transaksi Pemeliharaan Belum Lengkap).',
    status: 'Approved',
    approvalsReceived: 2,
    approvalsRequired: 2,
    createdAt: '2026-10-23T15:05:00+07:00',
    reviewedAt: '2026-10-23T15:30:00+07:00',
    reviewerNote: 'Disetujui oleh Supervisor. Metadata dokumen diperbarui. Invoice pemeliharaan wajib dilampirkan sebelum penutupan buku.',
  },
  {
    id: 'cp-003',
    documentId: 'doc-001',
    proposedBy: 'Fajri (Auditor)',
    changeType: 'value',
    originalValue: 'Rp45.000.000',
    proposedValue: 'Rp42.500.000',
    rationale: 'Usulan koreksi manual beban pemasaran berdasarkan rekonsiliasi parsial dengan catatan internal. Bukti pendukung belum seluruhnya tersedia – usulan ini bersifat indikatif dan memerlukan verifikasi lanjutan.',
    evidenceReferences: 'Catatan internal meeting Q3 – estimasi beban pemasaran aktual setelah penyesuaian diskon vendor. [PERINGATAN: Bukti belum diverifikasi penuh].',
    status: 'Rejected',
    approvalsReceived: 0,
    approvalsRequired: 2,
    createdAt: '2026-10-23T15:10:00+07:00',
    reviewedAt: '2026-10-23T15:45:00+07:00',
    reviewerNote: 'Ditolak. Bukti pendukung tidak memadai. Catatan internal bukan bukti akuntansi yang valid tanpa dokumen resmi.',
  },
];

/**
 * DEMO_DOCUMENT_VERSIONS – versi dokumen terstruktur setelah proposal cp-002 disetujui.
 * Hash merujuk pada artefak JSON perubahan ini, bukan file dokumen asli.
 */
export const DEMO_DOCUMENT_VERSIONS: DocumentVersion[] = [
  {
    id: 'ver-001',
    documentId: 'doc-002',
    versionNumber: 2,
    proposalId: 'cp-002',
    changedBy: 'Fajri (Auditor)',
    appliedAt: '2026-10-23T15:30:00+07:00',
    changeType: 'metadata',
    fieldChanged: 'Metadata: Status Bukti Pendukung JU-09-03',
    valueBefore: 'Status Bukti: Belum Terpetakan',
    valueAfter: 'Status Bukti: Perlu Lampiran Invoice Pemeliharaan',
    rationale: 'Menandai kebutuhan bukti pendukung untuk JU-09-03 tanpa mengubah nilai akuntansi.',
    evidenceReferences: 'Temuan demo-finding-04. Jurnal JU-09-03.',
    artifactHash: 'bf67e3a2d71c9f4b8ea5c1d3f2a6b9e8c5d4f1a0e7b2c9d6f3a8e5b1c4d7f0a',
    note: 'Versi ini adalah representasi terstruktur perubahan metadata. Dokumen asli tidak dimodifikasi. Hash merujuk pada artefak JSON perubahan ini, bukan file XLSX asli.',
  },
];

/**
 * DEMO_AUDIT_EVENTS – riwayat peristiwa audit sesi demo (Tahap 6 & 7).
 * Disusun terbaru-di-depan, konsisten dengan dokumen, relasi, usulan, dan versi demo di atas.
 * Peristiwa baru di sesi berjalan ditambahkan dengan pola yang sama (append-only).
 */
export const DEMO_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'ev-demo-14',
    eventType: 'ProposalRejected',
    timestamp: '2026-10-23T15:45:00+07:00',
    actor: 'Supervisor (Simulasi)',
    actorRole: 'Supervisor',
    entityId: 'cp-003',
    entityType: 'proposal',
    summary: 'Usulan koreksi cp-003 ditolak karena bukti pendukung tidak memadai. Tidak ada perubahan yang diterapkan dan tidak ada versi dokumen yang dibuat.',
    metadata: { documentId: 'doc-001', documentName: 'Laporan_Laba_Rugi_Q3_2026.pdf' },
  },
  {
    id: 'ev-demo-13',
    eventType: 'VersionCreated',
    timestamp: '2026-10-23T15:30:00+07:00',
    actor: 'Sistem AKSARA',
    actorRole: 'Sistem',
    entityId: 'ver-001',
    entityType: 'version',
    summary: 'Versi 2 dokumen Jurnal_Umum_September_2026.xlsx dibuat sebagai representasi terstruktur perubahan yang disetujui (usulan cp-002). Berkas asli tidak dimodifikasi.',
    metadata: { documentId: 'doc-002', documentName: 'Jurnal_Umum_September_2026.xlsx', versionNumber: 2, proposalId: 'cp-002' },
  },
  {
    id: 'ev-demo-12',
    eventType: 'ChangeApplied',
    timestamp: '2026-10-23T15:30:00+07:00',
    actor: 'Fajri (Auditor)',
    actorRole: 'Auditor',
    entityId: 'cp-002',
    entityType: 'proposal',
    summary: 'Perubahan dari usulan cp-002 diterapkan ke representasi terstruktur dokumen Jurnal_Umum_September_2026.xlsx setelah persetujuan tercapai.',
    metadata: { documentId: 'doc-002', documentName: 'Jurnal_Umum_September_2026.xlsx', proposalId: 'cp-002' },
  },
  {
    id: 'ev-demo-11',
    eventType: 'ProposalApproved',
    timestamp: '2026-10-23T15:30:00+07:00',
    actor: 'Supervisor (Simulasi)',
    actorRole: 'Supervisor',
    entityId: 'cp-002',
    entityType: 'proposal',
    summary: 'Usulan koreksi cp-002 disetujui (kuorum 2/2 terpenuhi). Persetujuan memicu penerapan perubahan dan pembuatan versi dokumen baru.',
    metadata: { documentId: 'doc-002', documentName: 'Jurnal_Umum_September_2026.xlsx' },
  },
  {
    id: 'ev-demo-10',
    eventType: 'ProposalCreated',
    timestamp: '2026-10-23T15:10:00+07:00',
    actor: 'Fajri (Auditor)',
    actorRole: 'Auditor',
    entityId: 'cp-003',
    entityType: 'proposal',
    summary: 'Usulan koreksi cp-003 dibuat untuk dokumen Laporan_Laba_Rugi_Q3_2026.pdf (jenis: nilai akuntansi).',
    metadata: { documentId: 'doc-001', documentName: 'Laporan_Laba_Rugi_Q3_2026.pdf', changeType: 'value' },
  },
  {
    id: 'ev-demo-09',
    eventType: 'ProposalCreated',
    timestamp: '2026-10-23T15:05:00+07:00',
    actor: 'Fajri (Auditor)',
    actorRole: 'Auditor',
    entityId: 'cp-002',
    entityType: 'proposal',
    summary: 'Usulan koreksi cp-002 dibuat untuk dokumen Jurnal_Umum_September_2026.xlsx (jenis: metadata).',
    metadata: { documentId: 'doc-002', documentName: 'Jurnal_Umum_September_2026.xlsx', changeType: 'metadata' },
  },
  {
    id: 'ev-demo-08',
    eventType: 'DocumentUploaded',
    timestamp: '2026-10-23T15:02:00+07:00',
    actor: 'Fajri (Auditor)',
    actorRole: 'Auditor',
    entityId: 'doc-004',
    entityType: 'document',
    summary: 'Dokumen Rekonsiliasi_Bank_Mandiri_Sep26.csv diunggah dan terdaftar di Document Registry. Hash referensi SHA-256 dicatat saat unggahan.',
    metadata: { documentId: 'doc-004', documentName: 'Rekonsiliasi_Bank_Mandiri_Sep26.csv', category: 'Rekonsiliasi Bank' },
  },
  {
    id: 'ev-demo-07',
    eventType: 'ProposalCreated',
    timestamp: '2026-10-23T14:55:00+07:00',
    actor: 'Fajri (Auditor)',
    actorRole: 'Auditor',
    entityId: 'cp-001',
    entityType: 'proposal',
    summary: 'Usulan koreksi cp-001 dibuat untuk dokumen Laporan_Laba_Rugi_Q3_2026.pdf (jenis: nilai akuntansi).',
    metadata: { documentId: 'doc-001', documentName: 'Laporan_Laba_Rugi_Q3_2026.pdf', changeType: 'value' },
  },
  {
    id: 'ev-demo-06',
    eventType: 'CheckRun',
    timestamp: '2026-10-23T14:35:00+07:00',
    actor: 'Sistem AKSARA',
    actorRole: 'Sistem',
    entityId: 'doc-001,doc-002',
    entityType: 'document',
    summary: 'Pemeriksaan konsistensi dijalankan pada 2 dokumen. 5 temuan dievaluasi, termasuk 1 konflik nilai terkonfirmasi.',
    metadata: { documentIds: 'doc-001,doc-002', findingsEvaluated: 5 },
  },
  {
    id: 'ev-demo-05',
    eventType: 'RelationshipCreated',
    timestamp: '2026-10-23T14:32:00+07:00',
    actor: 'Fajri (Auditor)',
    actorRole: 'Auditor',
    entityId: 'edge-02',
    entityType: 'relationship',
    summary: 'Hubungan [Direkonsiliasi dengan] dibuat antara Jurnal_Umum_September_2026.xlsx dan Laporan_Laba_Rugi_Q3_2026.pdf.',
    metadata: {
      relationshipType: 'Direkonsiliasi dengan',
      sourceDocumentId: 'doc-002',
      targetDocumentId: 'doc-001',
      sourceDocumentName: 'Jurnal_Umum_September_2026.xlsx',
      targetDocumentName: 'Laporan_Laba_Rugi_Q3_2026.pdf',
    },
  },
  {
    id: 'ev-demo-04',
    eventType: 'RelationshipCreated',
    timestamp: '2026-10-23T14:30:00+07:00',
    actor: 'Fajri (Auditor)',
    actorRole: 'Auditor',
    entityId: 'edge-01',
    entityType: 'relationship',
    summary: 'Hubungan [Mendukung] dibuat antara Invoice_Sewa_Gedung_Q3.pdf dan Jurnal_Umum_September_2026.xlsx.',
    metadata: {
      relationshipType: 'Mendukung',
      sourceDocumentId: 'doc-003',
      targetDocumentId: 'doc-002',
      sourceDocumentName: 'Invoice_Sewa_Gedung_Q3.pdf',
      targetDocumentName: 'Jurnal_Umum_September_2026.xlsx',
    },
  },
  {
    id: 'ev-demo-03',
    eventType: 'DocumentUploaded',
    timestamp: '2026-10-23T14:28:00+07:00',
    actor: 'Fajri (Auditor)',
    actorRole: 'Auditor',
    entityId: 'doc-003',
    entityType: 'document',
    summary: 'Dokumen Invoice_Sewa_Gedung_Q3.pdf diunggah dan terdaftar di Document Registry. Hash referensi SHA-256 dicatat saat unggahan.',
    metadata: { documentId: 'doc-003', documentName: 'Invoice_Sewa_Gedung_Q3.pdf', category: 'Invoice Pendukung' },
  },
  {
    id: 'ev-demo-02',
    eventType: 'DocumentUploaded',
    timestamp: '2026-10-23T14:20:00+07:00',
    actor: 'Fajri (Auditor)',
    actorRole: 'Auditor',
    entityId: 'doc-002',
    entityType: 'document',
    summary: 'Dokumen Jurnal_Umum_September_2026.xlsx diunggah dan terdaftar di Document Registry. Hash referensi SHA-256 dicatat saat unggahan.',
    metadata: { documentId: 'doc-002', documentName: 'Jurnal_Umum_September_2026.xlsx', category: 'Jurnal Umum' },
  },
  {
    id: 'ev-demo-01',
    eventType: 'DocumentUploaded',
    timestamp: '2026-10-23T14:15:00+07:00',
    actor: 'Fajri (Auditor)',
    actorRole: 'Auditor',
    entityId: 'doc-001',
    entityType: 'document',
    summary: 'Dokumen Laporan_Laba_Rugi_Q3_2026.pdf diunggah dan terdaftar di Document Registry. Hash referensi SHA-256 dicatat saat unggahan.',
    metadata: { documentId: 'doc-001', documentName: 'Laporan_Laba_Rugi_Q3_2026.pdf', category: 'Laporan Keuangan' },
  },
];

