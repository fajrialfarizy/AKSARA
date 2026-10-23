export type NavigationTab = 
  | 'dashboard'
  | 'registry'
  | 'workspace'
  | 'relationship'
  | 'consistency'
  | 'graphrag'
  | 'audit'
  | 'approval'
  | 'aiworkspace';

export type FileType = 'pdf' | 'csv' | 'xlsx';

export type ProcessingStatus = 'processing' | 'ready' | 'unreadable' | 'failed';

export type IntegrityStatus = 'valid' | 'tampered' | 'unverified';

export type AuditStatus = 'verified' | 'conflict' | 'pending';

export type RelationshipType = 
  | 'Mendukung'
  | 'Berasal dari'
  | 'Dirangkum ke'
  | 'Direkonsiliasi dengan'
  | 'Mengacu pada'
  | 'Perlu diverifikasi terhadap';

export const RELATIONSHIP_OPTIONS: { type: RelationshipType; description: string; symmetric?: boolean }[] = [
  { type: 'Mendukung', description: 'Dokumen sumber bertindak sebagai bukti pendukung bagi dokumen target.' },
  { type: 'Berasal dari', description: 'Angka/informasi dokumen target diturunkan langsung dari dokumen sumber.' },
  { type: 'Dirangkum ke', description: 'Rincian transaksi diikhtisarkan atau dijumlahkan ke dalam dokumen target.' },
  { type: 'Direkonsiliasi dengan', description: 'Kedua dokumen saling dicocokkan saldonya (relasi dua arah/setara).', symmetric: true },
  { type: 'Mengacu pada', description: 'Dokumen memberikan rujukan atau cross-reference normatif.' },
  { type: 'Perlu diverifikasi terhadap', description: 'Terdapat perbedaan atau dugaan yang membutuhkan klarifikasi silang.' },
];

export interface SheetInfo {
  name: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
}

export interface DocumentMetadata {
  pageCount?: number;
  sheetCount?: number;
  sheets?: SheetInfo[];
  rowCount?: number;
  columnCount?: number;
  headers?: string[];
  notes?: string;
  rawMimeType?: string;
  period?: string;
  currency?: string;
  entityScope?: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  fileType: FileType;
  fileSize: string;
  uploadedAt: string;
  processingStatus: ProcessingStatus;
  integrityStatus: IntegrityStatus;
  sha256: string;
  extractedText?: string;
  metadata: DocumentMetadata;
  category: 'Laporan Keuangan' | 'Jurnal Umum' | 'Invoice Pendukung' | 'Rekonsiliasi Bank' | 'Dokumen Lainnya';
  previewRows?: Array<Record<string, string | number>>;
  
  // Kompatibilitas untuk navigasi dan alur lainnya
  relationshipsCount: number;
  auditStatus: AuditStatus;
  originalHash: string;
}

/**
 * Model Data Relationship Mapping (PRD 9.3 & 9.4)
 */
export interface GraphNode {
  id: string;
  documentId: string;
  position: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: RelationshipType;
  isConfirmed: boolean;
  createdAt: string;
  notes?: string;
}

/**
 * Status Temuan Consistency Checker (Tahap 4)
 */
export type FindingStatus = 
  | 'Conflict'             // Bukti cukup bahwa dua informasi yang seharusnya konsisten ternyata berbeda
  | 'Needs Review'        // Terdapat indikasi masalah, namun bukti/konteks belum cukup untuk memastikan
  | 'Consistent'          // Nilai dan informasi sesuai berdasarkan aturan pemeriksaan
  | 'Not Comparable'      // Periode, mata uang, satuan, atau lingkup berbeda sehingga tidak dapat dibandingkan langsung
  | 'Insufficient Evidence'; // Data atau sumber yang diperlukan tidak tersedia atau tidak lengkap

export type FindingSeverity = 'High' | 'Medium' | 'Low' | 'Info';

export interface SourceReference {
  documentId: string;
  documentName: string;
  location: string;        // Nomor baris, sheet, atau halaman
  extractedSnippet?: string;
  field?: string;
}

export interface ComparisonValue {
  documentId: string;
  documentName: string;
  label: string;
  value: string | number;
  rawString?: string;
}

export interface ComparisonContext {
  accountOrItem?: string;
  period?: string;
  currency?: string;
  basis?: string;
  ruleType?: 'Value Equality' | 'Reconciliation Sum' | 'Period Match' | 'Completeness Check';
}

export interface ConflictFinding {
  id: string;
  ruleId: string;
  status: FindingStatus;
  severity: FindingSeverity;
  title: string;
  description: string;
  documentIds: string[];
  sourceReferences: SourceReference[];
  comparedValues?: ComparisonValue[];
  comparisonContext: ComparisonContext;
  difference?: string;
  reasoning: string;
  detectedAt: string;
  isDemoFinding?: boolean;
}

export type ConflictItem = ConflictFinding;

/**
 * Model Data GraphRAG Assistant (Tahap 5)
 */
export interface CitationItem {
  id: string;
  documentId: string;
  documentName: string;
  location: string;
  snippet: string;
  connectionContext?: string; // Menjelaskan relasi jika ditemukan via traversal graf
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: CitationItem[];
  relatedFindings?: ConflictFinding[];
  isFallback?: boolean;
  evidenceStatus?: 'sufficient' | 'partial' | 'insufficient';
}

export interface RetrievedSnippet {
  documentId: string;
  documentName: string;
  location: string;
  snippet: string;
  relevanceScore: number;
  isViaGraph: boolean;
  graphPath?: string;
}

export interface GraphRAGContext {
  query: string;
  snippets: RetrievedSnippet[];
  relatedFindings: ConflictFinding[];
  confirmedRelations: Array<{ sourceName: string; targetName: string; relationshipType: string }>;
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  type: 'upload' | 'relation' | 'conflict' | 'proposal' | 'version';
}

export interface ChangeProposal {
  id: string;
  documentId: string; // ID of the document to be changed
  sourceFindingId?: string; // Optional link to a ConflictFinding id
  proposedBy: string; // Simulated user name
  changeType: 'value' | 'metadata' | 'structure';
  originalValue: string;
  proposedValue: string;
  rationale: string;
  evidenceReferences: string; // Could be formatted text with links
  status: 'Pending Review' | 'Approved' | 'Rejected' | 'Cancelled';
  approvalsReceived?: number;
  approvalsRequired?: number;
  createdAt: string;
  reviewedAt?: string;
  reviewerNote?: string;
}

// Keep original ProposalItem for backward compatibility
export interface ProposalItem {
  id: string;
  document: string;
  location: string;
  originalValue: string;
  proposedValue: string;
  reason: string;
  evidence: string;
  status: 'Menunggu Review' | 'Disetujui' | 'Ditolak';
  approvalsReceived: number;
  approvalsRequired: number;
}

/**
 * Versioning – Representasi dokumen terstruktur setelah perubahan disetujui (PRD Tahap 6.6)
 * Tidak menimpa dokumen asli. Hash merujuk pada artefak yang di-hash, bukan dokumen asli.
 */
export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  proposalId: string;
  changedBy: string;
  appliedAt: string;
  changeType: ChangeProposal['changeType'];
  fieldChanged: string;
  valueBefore: string;
  valueAfter: string;
  rationale: string;
  evidenceReferences: string;
  /** SHA-256 dari representasi JSON artefak perubahan ini (bukan file dokumen asli) */
  artifactHash: string;
  note: string;
}

/**
 * Audit event types (PRD Tahap 6.8 & Tahap 7)
 */
export type AuditEventType =
  | 'DocumentUploaded'
  | 'DocumentRemoved'
  | 'RelationshipCreated'
  | 'RelationshipUpdated'
  | 'RelationshipRemoved'
  | 'CheckRun'
  | 'ProposalCreated'
  | 'ProposalEdited'
  | 'ProposalApproved'
  | 'ProposalRejected'
  | 'ProposalCancelled'
  | 'ChangeApplied'
  | 'VersionCreated'
  | 'IntegrityCheckRun';

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  timestamp: string;
  actor: string;
  actorRole?: string;
  entityId: string;          // proposalId, documentId, edgeId, versionId, dll.
  entityType: 'proposal' | 'document' | 'finding' | 'version' | 'relationship';
  summary: string;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * Tahap 7 – Hasil verifikasi integritas berkas terhadap hash referensi SHA-256.
 * MATCH      : byte berkas identik dengan byte yang di-hash saat unggahan.
 * MISMATCH   : byte berkas berbeda dari hash referensi (bukti ketidaksamaan, bukan bukti fraud).
 * UNAVAILABLE: byte berkas atau hash referensi tidak tersedia sehingga perbandingan tidak dapat dilakukan.
 */
export type IntegrityVerificationStatus = 'MATCH' | 'MISMATCH' | 'UNAVAILABLE';

export interface IntegrityCheckResult {
  id: string;
  documentId: string;
  documentName: string;
  status: IntegrityVerificationStatus;
  /** Hash referensi yang tercatat saat unggahan (tidak pernah diubah oleh pemeriksaan) */
  referenceHash: string | null;
  /** Hash SHA-256 yang dihitung ulang dari byte berkas (null jika byte tidak tersedia) */
  calculatedHash: string | null;
  /** Asal byte yang di-hash: berkas tersimpan di sesi, unggah ulang, atau tidak ada */
  fileSource: 'retained' | 'reupload' | 'none';
  checkedAt: string;
  /** Penjelasan hasil dalam bahasa Indonesia */
  explanation: string;
}

/**
 * Tahap 7 – Entri buku besar simulasi (bukan blockchain nyata).
 */
export interface SimulatedLedgerEntry {
  sequence: number;
  eventId: string;
  previousBlockHash: string;
  blockHash: string;
}

