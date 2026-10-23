import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ShieldCheck,
  Hash,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  FileText,
  ScrollText,
  Users,
  Clock,
  Filter,
  X,
} from 'lucide-react';
import type {
  DocumentItem,
  ChangeProposal,
  DocumentVersion,
  AuditEvent,
  AuditEventType,
  IntegrityCheckResult,
  IntegrityVerificationStatus,
  SimulatedLedgerEntry,
} from '../types';
import {
  AUDIT_EVENT_TYPE_LABELS,
  computeSimulatedLedgerChain,
  eventMatchesDocument,
} from '../services/auditService';
import { INTEGRITY_STATUS_LABELS, isValidSha256Hex } from '../services/integrityService';

interface AuditLogViewProps {
  documents: DocumentItem[];
  auditEvents: AuditEvent[];
  changeProposals: ChangeProposal[];
  documentVersions: DocumentVersion[];
  integrityChecks: IntegrityCheckResult[];
  retainedFileDocIds: string[];
  verifyingDocId: string | null;
  onVerifyIntegrity: (docId: string, reuploadedFile?: File) => Promise<void>;
}

type AuditSection = 'integrity' | 'versions' | 'events' | 'ledger';

/* ── Helper tampilan ─────────────────────────────────────────────────── */

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

const INTEGRITY_BADGE: Record<IntegrityVerificationStatus, string> = {
  MATCH: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MISMATCH: 'bg-red-50 text-red-700 border-red-200',
  UNAVAILABLE: 'bg-slate-100 text-slate-600 border-slate-200',
};

const PROPOSAL_STATUS_LABEL: Record<ChangeProposal['status'], string> = {
  'Pending Review': 'Menunggu Tinjauan',
  Approved: 'Disetujui',
  Rejected: 'Ditolak',
  Cancelled: 'Dibatalkan',
};

const PROPOSAL_STATUS_BADGE: Record<ChangeProposal['status'], string> = {
  'Pending Review': 'bg-amber-100 text-amber-800 border-amber-200',
  Approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Rejected: 'bg-red-100 text-red-800 border-red-200',
  Cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

const CHANGE_TYPE_LABEL: Record<ChangeProposal['changeType'], string> = {
  value: 'Nilai Akuntansi',
  metadata: 'Metadata',
  structure: 'Struktur',
};

const FILE_SOURCE_LABEL: Record<IntegrityCheckResult['fileSource'], string> = {
  retained: 'Dihitung dari byte berkas asli yang tersimpan di memori sesi',
  reupload: 'Dihitung dari byte berkas yang diunggah ulang oleh pengguna',
  none: 'Tidak ada byte berkas yang tersedia untuk dihitung',
};

/** Aktor simulasi untuk progres kuorum – bukan validator blockchain independen. */
const SIMULATED_QUORUM_PARTICIPANTS = [
  'Supervisor Akuntansi (simulasi)',
  'Manajer Keuangan (simulasi)',
  'Kepala Bagian Akuntansi (simulasi)',
];

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  documents,
  auditEvents,
  changeProposals,
  documentVersions,
  integrityChecks,
  retainedFileDocIds,
  verifyingDocId,
  onVerifyIntegrity,
}) => {
  const [section, setSection] = useState<AuditSection>('integrity');

  // ── State: Verifikasi Integritas ───────────────────────────────────────
  const [selectedResultDocId, setSelectedResultDocId] = useState<string | null>(null);
  const [pendingVerifyDocId, setPendingVerifyDocId] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── State: Riwayat Versi ──────────────────────────────────────────────
  const [versionDocId, setVersionDocId] = useState<string>(documents[0]?.id ?? '');
  const [selectedVersionKey, setSelectedVersionKey] = useState<string>('original');

  // ── State: Log Audit ──────────────────────────────────────────────────
  const [typeFilter, setTypeFilter] = useState<AuditEventType | 'all'>('all');
  const [docFilter, setDocFilter] = useState<string>('all');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // ── State: Buku Besar Simulasi ────────────────────────────────────────
  const [ledgerEntries, setLedgerEntries] = useState<SimulatedLedgerEntry[]>([]);

  /* ── Turunan: Verifikasi Integritas ─────────────────────────────────── */
  const retainedSet = useMemo(() => new Set(retainedFileDocIds), [retainedFileDocIds]);

  const latestCheckByDoc = useMemo(() => {
    const map = new Map<string, IntegrityCheckResult>();
    for (const check of integrityChecks) {
      if (!map.has(check.documentId)) map.set(check.documentId, check);
    }
    return map;
  }, [integrityChecks]);

  const integritySummary = useMemo(() => {
    const summary = {
      total: documents.length,
      withReference: 0,
      match: 0,
      mismatch: 0,
      unavailable: 0,
      unchecked: 0,
    };
    for (const doc of documents) {
      if (isValidSha256Hex(doc.originalHash)) summary.withReference += 1;
      const latest = latestCheckByDoc.get(doc.id);
      if (!latest) summary.unchecked += 1;
      else if (latest.status === 'MATCH') summary.match += 1;
      else if (latest.status === 'MISMATCH') summary.mismatch += 1;
      else summary.unavailable += 1;
    }
    return summary;
  }, [documents, latestCheckByDoc]);

  const selectedResultDoc =
    documents.find((d) => d.id === selectedResultDocId) ?? null;
  const selectedResult = selectedResultDoc
    ? latestCheckByDoc.get(selectedResultDoc.id)
    : undefined;

  /* ── Turunan: Riwayat Versi ─────────────────────────────────────────── */
  const selectedVersionDoc = documents.find((d) => d.id === versionDocId) ?? documents[0];

  const derivedVersions = useMemo(() => {
    if (!selectedVersionDoc) return [];
    return documentVersions
      .filter((v) => v.documentId === selectedVersionDoc.id)
      .sort((a, b) => a.versionNumber - b.versionNumber);
  }, [documentVersions, selectedVersionDoc]);

  const selectedDerivedVersion =
    derivedVersions.find((v) => v.id === selectedVersionKey) ?? null;

  const relatedEventsFor = (entityIds: string[]) =>
    auditEvents
      .filter((e) => entityIds.includes(e.entityId))
      .sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

  /* ── Turunan: Log Audit ─────────────────────────────────────────────── */
  const presentEventTypes = useMemo(() => {
    const present = new Set(auditEvents.map((e) => e.eventType));
    return (Object.keys(AUDIT_EVENT_TYPE_LABELS) as AuditEventType[]).filter((t) =>
      present.has(t)
    );
  }, [auditEvents]);

  const documentFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const doc of documents) map.set(doc.id, doc.name);
    for (const ev of auditEvents) {
      const m = ev.metadata;
      if (!m) continue;
      const pairs: Array<[unknown, unknown]> = [
        [m.documentId, m.documentName],
        [m.sourceDocumentId, m.sourceDocumentName],
        [m.targetDocumentId, m.targetDocumentName],
      ];
      for (const [id, name] of pairs) {
        if (typeof id === 'string' && id && !map.has(id)) {
          map.set(id, typeof name === 'string' && name ? name : id);
        }
      }
      if (typeof m.documentIds === 'string') {
        for (const raw of m.documentIds.split(',')) {
          const id = raw.trim();
          if (id && !map.has(id)) map.set(id, id);
        }
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [documents, auditEvents]);

  const filteredEvents = useMemo(
    () =>
      auditEvents.filter((ev) => {
        if (typeFilter !== 'all' && ev.eventType !== typeFilter) return false;
        if (docFilter !== 'all' && !eventMatchesDocument(ev, docFilter)) return false;
        return true;
      }),
    [auditEvents, typeFilter, docFilter]
  );

  const selectedEvent =
    filteredEvents.find((e) => e.id === selectedEventId) ?? filteredEvents[0] ?? null;

  /* ── Turunan: Buku Besar Simulasi ───────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    computeSimulatedLedgerChain(auditEvents)
      .then((entries) => {
        if (!cancelled) setLedgerEntries(entries);
      })
      .catch(() => {
        if (!cancelled) setLedgerEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [auditEvents]);

  const eventById = useMemo(
    () => new Map(auditEvents.map((e) => [e.id, e])),
    [auditEvents]
  );

  /* ── Aksi verifikasi ────────────────────────────────────────────────── */
  const runVerify = async (docId: string, file?: File) => {
    setVerifyError(null);
    try {
      await onVerifyIntegrity(docId, file);
    } catch (err) {
      setVerifyError(
        err instanceof Error
          ? err.message
          : 'Verifikasi integritas gagal dijalankan. Silakan coba lagi.'
      );
    }
  };

  const handleVerifyClick = (docId: string) => {
    setSelectedResultDocId(docId);
    if (retainedSet.has(docId)) {
      void runVerify(docId);
    } else {
      setPendingVerifyDocId(docId);
      fileInputRef.current?.click();
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !pendingVerifyDocId) return;
    const docId = pendingVerifyDocId;
    setPendingVerifyDocId(null);
    void runVerify(docId, file);
  };

  /* ── Turunan: partisipan & keputusan kuorum simulasi ────────────────── */
  const quorumParticipants = (p: ChangeProposal) => {
    const required = Math.max(1, p.approvalsRequired ?? 2);
    const received = Math.min(p.approvalsReceived ?? 0, required);
    return Array.from({ length: required }, (_, i) => ({
      name: SIMULATED_QUORUM_PARTICIPANTS[i] ?? `Peninjau ${i + 1} (simulasi)`,
      approved: i < received,
    }));
  };

  const quorumDecisionText = (p: ChangeProposal): string => {
    const required = Math.max(1, p.approvalsRequired ?? 2);
    const received = Math.min(p.approvalsReceived ?? 0, required);
    if (p.status === 'Approved') {
      return `Kuorum ${received}/${required} terpenuhi – keputusan pada Approval Center: disetujui.`;
    }
    if (p.status === 'Pending Review') {
      return `Kuorum ${received}/${required} – menunggu tinjauan, usulan belum disetujui.`;
    }
    if (p.status === 'Rejected') {
      return `Usulan ditolak sebelum kuorum ${required} tercapai (${received}/${required}).`;
    }
    return `Usulan dibatalkan – pengambilan keputusan dihentikan (${received}/${required}).`;
  };

  const docName = (docId: string) =>
    documents.find((d) => d.id === docId)?.name ?? docId;

  const SECTION_TABS: Array<{ id: AuditSection; label: string; icon: React.ReactNode }> = [
    { id: 'integrity', label: 'Verifikasi Integritas', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'versions', label: 'Riwayat Versi', icon: <Layers className="w-4 h-4" /> },
    { id: 'events', label: 'Log Audit', icon: <ScrollText className="w-4 h-4" /> },
    { id: 'ledger', label: 'Buku Besar Simulasi', icon: <Filter className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* File input tersembunyi untuk unggah-ulang verifikasi */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv,.xlsx"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-700 text-white rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">Integrity &amp; Audit Log</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold border border-blue-200">
                Tahap 7 • FR-08 &amp; FR-09
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Verifikasi hash SHA-256 berkas dokumen, riwayat versi, log audit tambah-saja,
              dan simulasi buku besar dengan kuorum persetujuan.
            </p>
          </div>
        </div>
      </div>

      {/* ── Batasan prototipe ───────────────────────────────────────────── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 flex items-start space-x-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-slate-800">Batasan Prototipe:</span>
          <p className="text-[11px] leading-relaxed">
            Seluruh data tersimpan hanya di memori browser selama sesi berlangsung – tanpa
            backend dan tanpa penyimpanan permanen. Log audit bersifat tambah-saja melalui
            antarmuka aplikasi, tetapi BUKAN catatan permanen, immutable, atau tahan
            manipulasi. Buku besar dan kuorum pada halaman ini adalah SIMULASI visual, bukan
            blockchain publik maupun permissioned. Hash SHA-256 membuktikan kesamaan isi byte
            berkas dengan referensi tertentu – bukan kebenaran isi dokumen.
          </p>
        </div>
      </div>

      {/* ── Navigasi bagian internal ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-2 flex flex-wrap gap-2">
        {SECTION_TABS.map((tab) => {
          const isActive = section === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSection(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                isActive
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-blue-50/80 hover:text-blue-700'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-slate-400'}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.id === 'events' && auditEvents.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {auditEvents.length}
                </span>
              )}
              {tab.id === 'ledger' && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  Simulasi
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══ BAGIAN A: VERIFIKASI INTEGRITAS ═════════════════════════════ */}
      {section === 'integrity' && (
        <div className="space-y-6">
          {/* Ringkasan hasil */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">
                Dokumen Terdaftar
              </div>
              <div className="text-2xl font-bold text-slate-800 mt-1">{integritySummary.total}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">
                Hash Referensi Tersedia
              </div>
              <div className="text-2xl font-bold text-blue-700 mt-1">{integritySummary.withReference}</div>
            </div>
            <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-emerald-600 tracking-wide">
                Sesuai
              </div>
              <div className="text-2xl font-bold text-emerald-700 mt-1">{integritySummary.match}</div>
            </div>
            <div className="bg-white rounded-xl border border-red-200 p-4 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-red-600 tracking-wide">
                Tidak Sesuai
              </div>
              <div className="text-2xl font-bold text-red-700 mt-1">{integritySummary.mismatch}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">
                Belum / Tidak Dapat Diverifikasi
              </div>
              <div className="text-2xl font-bold text-slate-600 mt-1">
                {integritySummary.unchecked + integritySummary.unavailable}
              </div>
            </div>
          </div>

          {/* Daftar dokumen */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Hash className="w-4 h-4 text-blue-700" />
                <h2 className="text-sm font-bold text-slate-900">
                  Daftar Dokumen yang Dapat Diverifikasi
                </h2>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">
                {documents.length} dokumen
              </span>
            </div>
            <p className="text-[11px] text-slate-500 -mt-1">
              Pemeriksaan membandingkan byte berkas dengan hash referensi SHA-256 yang dicatat
              saat unggahan. Nama file, ukuran, dan metadata tidak ikut diperhitungkan dalam
              hash – hanya isi byte berkas.
            </p>

            {documents.length === 0 && (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                Belum ada dokumen dalam sesi ini. Unggah dokumen melalui Document Registry terlebih dahulu.
              </p>
            )}

            {documents.map((doc) => {
              const latest = latestCheckByDoc.get(doc.id);
              const hasBytes = retainedSet.has(doc.id);
              const isSelected = selectedResultDocId === doc.id;
              const isVerifying = verifyingDocId === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedResultDocId(doc.id)}
                  className={`p-3 rounded-lg border transition cursor-pointer ${
                    isSelected
                      ? 'border-blue-300 bg-blue-50/40'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 truncate">{doc.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {doc.category} • {doc.fileSize} • Diunggah {doc.uploadedAt}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 break-all bg-white border border-slate-200 rounded px-2 py-1">
                        <span className="text-slate-400 select-none">Hash referensi: </span>
                        {isValidSha256Hex(doc.originalHash)
                          ? doc.originalHash
                          : `${doc.originalHash || '(kosong)'} — tidak valid`}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                        {hasBytes ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Berkas asli tersimpan di sesi – dapat diverifikasi langsung.</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>
                              Berkas asli tidak tersedia di sesi – unggah ulang berkas untuk
                              memverifikasi.
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2 shrink-0">
                      {latest ? (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center space-x-1 ${
                            INTEGRITY_BADGE[latest.status]
                          }`}
                        >
                          {latest.status === 'MATCH' && <CheckCircle2 className="w-3 h-3" />}
                          {latest.status === 'MISMATCH' && <AlertTriangle className="w-3 h-3" />}
                          {latest.status === 'UNAVAILABLE' && <Info className="w-3 h-3" />}
                          <span>{INTEGRITY_STATUS_LABELS[latest.status]}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                          Belum diverifikasi
                        </span>
                      )}
                      <button
                        disabled={isVerifying}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVerifyClick(doc.id);
                        }}
                        className="flex items-center space-x-1.5 px-3 py-1.5 text-[11px] font-semibold bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white rounded-lg shadow-xs transition"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>
                          {isVerifying
                            ? 'Menghitung hash…'
                            : hasBytes
                            ? 'Verifikasi Integritas'
                            : 'Unggah Ulang untuk Verifikasi'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Panel hasil */}
          {verifyError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-xs font-semibold flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{verifyError}</span>
            </div>
          )}

          {selectedResultDoc ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                <span>Hasil Verifikasi — {selectedResultDoc.name}</span>
              </h2>

              {selectedResult ? (
                <>
                  {/* Banner status */}
                  <div
                    className={`border rounded-lg p-4 text-xs space-y-1 flex items-start space-x-3 ${
                      selectedResult.status === 'MATCH'
                        ? 'bg-emerald-50 border-emerald-200'
                        : selectedResult.status === 'MISMATCH'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {selectedResult.status === 'MATCH' && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                    {selectedResult.status === 'MISMATCH' && (
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                    )}
                    {selectedResult.status === 'UNAVAILABLE' && (
                      <Info className="w-5 h-5 text-slate-500 shrink-0" />
                    )}
                    <div>
                      <span
                        className={`font-bold ${
                          selectedResult.status === 'MATCH'
                            ? 'text-emerald-800'
                            : selectedResult.status === 'MISMATCH'
                            ? 'text-red-800'
                            : 'text-slate-700'
                        }`}
                      >
                        Status: {INTEGRITY_STATUS_LABELS[selectedResult.status]}
                      </span>
                      {selectedResult.status === 'MISMATCH' && (
                        <p className="text-red-700 mt-1 font-semibold">
                          Ketidaksesuaian hash menunjukkan perbedaan isi byte, dan TIDAK
                          otomatis membuktikan pemalsuan, manipasi, atau kesalahan nilai
                          akuntansi.
                        </p>
                      )}
                      {selectedResult.status === 'UNAVAILABLE' && (
                        <p className="text-slate-600 mt-1">
                          {!isValidSha256Hex(selectedResult.referenceHash)
                            ? 'Dokumen ini tidak memiliki hash referensi SHA-256 yang valid, sehingga tidak ada acuan perbandingan.'
                            : 'Byte berkas asli tidak tersedia, sehingga perbandingan belum dapat dilakukan. Unggah ulang berkasnya untuk memverifikasi.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Perbandingan hash */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-500">
                        Hash Referensi (saat unggahan)
                      </div>
                      <div className="font-mono text-[10px] text-slate-700 break-all">
                        {isValidSha256Hex(selectedResult.referenceHash)
                          ? selectedResult.referenceHash
                          : `${selectedResult.referenceHash || '(kosong)'} — tidak valid`}
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-500">
                        Hash Hasil Hitung Ulang
                      </div>
                      <div className="font-mono text-[10px] text-slate-700 break-all">
                        {selectedResult.calculatedHash ?? 'Tidak tersedia — byte berkas tidak ada'}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-0.5">
                    <div>Waktu pemeriksaan: {formatTimestamp(selectedResult.checkedAt)}</div>
                    <div>Sumber byte: {FILE_SOURCE_LABEL[selectedResult.fileSource]}</div>
                  </div>

                  {/* Penjelasan */}
                  <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-4 text-[11px] text-slate-700 space-y-1">
                    <span className="font-semibold text-blue-900">Penjelasan hasil:</span>
                    <p className="leading-relaxed">{selectedResult.explanation}</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-4 text-[11px] text-slate-600 space-y-1">
                    <span className="font-semibold text-slate-800">
                      Apa yang hasil ini TIDAK buktikan:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 leading-relaxed">
                      <li>
                        Hash sesuai hanya membuktikan byte berkas sama dengan byte yang di-hash
                        saat unggahan – bukan kebenaran, keakuratan, atau keabsahan isi dokumen.
                      </li>
                      <li>
                        Hash tidak sesuai membuktikan perbedaan byte – bukan bukti fraud atau
                        kesalahan nilai akuntansi. Temuan Consistency Checker tidak berubah
                        hanya karena hasil verifikasi ini.
                      </li>
                      <li>
                        Nama file yang sama tidak membuktikan apa pun – yang dibandingkan hanya
                        isi byte berkas.
                      </li>
                      <li>Hash referensi asli tidak pernah diubah oleh pemeriksaan ini.</li>
                    </ul>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400 italic py-4">
                  Dokumen ini belum diverifikasi dalam sesi ini. Jalankan verifikasi untuk
                  membandingkan byte berkas dengan hash referensi.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border-dashed border-slate-300 p-8 text-center text-xs text-slate-400">
              Pilih salah satu dokumen di atas untuk melihat hasil verifikasi integritasnya.
            </div>
          )}
        </div>
      )}

      {/* ══ BAGIAN B: RIWAYAT VERSI ═════════════════════════════════════ */}
      {section === 'versions' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm font-bold text-slate-900">Riwayat Versi Dokumen</h2>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <label htmlFor="version-doc-select" className="text-slate-500 font-semibold">
                Dokumen:
              </label>
              <select
                id="version-doc-select"
                value={selectedVersionDoc?.id ?? ''}
                onChange={(e) => {
                  setVersionDocId(e.target.value);
                  setSelectedVersionKey('original');
                }}
                className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none max-w-[280px] truncate"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Versi 1 adalah berkas asli unggahan dan tidak pernah dihapus atau ditimpa. Versi
            berikutnya hanya dibuat ketika sebuah usulan koreksi disetujui dan perubahan benar-
            benar diterapkan; usulan yang ditolak atau dibatalkan tidak menghasilkan versi baru.
            Versi turunan adalah representasi terstruktur perubahan – bukan berkas asli baru.
          </p>

          {selectedVersionDoc ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Timeline versi */}
              <div className="space-y-3">
                {/* Entri versi 1 (berkas asli) */}
                <button
                  onClick={() => setSelectedVersionKey('original')}
                  className={`w-full text-left p-4 rounded-lg border transition ${
                    selectedVersionKey === 'original'
                      ? 'border-blue-300 bg-blue-50/40'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      v1 — Berkas Asli (Unggahan Awal)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
                      Berkas Asli
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Diunggah {selectedVersionDoc.uploadedAt} • Sumber: Document Registry
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 break-all bg-white border border-slate-200 rounded px-2 py-1 mt-2">
                    <span className="text-slate-400 select-none">Hash SHA-256 berkas asli: </span>
                    {isValidSha256Hex(selectedVersionDoc.originalHash)
                      ? selectedVersionDoc.originalHash
                      : `${selectedVersionDoc.originalHash || '(kosong)'} — tidak valid`}
                  </div>
                </button>

                {/* Versi turunan */}
                {derivedVersions.map((ver) => (
                  <button
                    key={ver.id}
                    onClick={() => setSelectedVersionKey(ver.id)}
                    className={`w-full text-left p-4 rounded-lg border transition ${
                      selectedVersionKey === ver.id
                        ? 'border-blue-300 bg-blue-50/40'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        v{ver.versionNumber} — {ver.fieldChanged}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                        Representasi Terstruktur
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {formatTimestamp(ver.appliedAt)} • Sumber: usulan {ver.proposalId} disetujui
                      • {ver.changedBy}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1">
                      {ver.valueBefore} <span className="text-slate-300">→</span>{' '}
                      <span className="font-semibold text-slate-700">{ver.valueAfter}</span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-500 break-all bg-white border border-slate-200 rounded px-2 py-1 mt-2">
                      <span className="text-slate-400 select-none">Hash artefak: </span>
                      {ver.artifactHash}
                    </div>
                  </button>
                ))}

                {derivedVersions.length === 0 && (
                  <p className="text-[11px] text-slate-400 italic px-1">
                    Belum ada versi turunan untuk dokumen ini. Versi baru hanya dibuat setelah
                    sebuah usulan koreksi disetujui dan diterapkan melalui Approval Center.
                  </p>
                )}
              </div>

              {/* Panel detail versi */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-lg p-4 text-xs space-y-4 h-fit lg:sticky lg:top-28">
                {selectedVersionKey === 'original' || !selectedDerivedVersion ? (
                  <>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-700">
                        Detail Versi 1 — Berkas Asli
                      </span>
                      <div className="text-sm font-bold text-slate-800 mt-1">
                        {selectedVersionDoc.name}
                      </div>
                    </div>
                    <div className="space-y-1 text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-700">ID versi:</span>{' '}
                        <span className="font-mono">{selectedVersionDoc.id} (v1)</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Waktu dibuat:</span>{' '}
                        {selectedVersionDoc.uploadedAt}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Sumber perubahan:</span>{' '}
                        Unggahan awal melalui Document Registry
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Status versi:</span>{' '}
                        Berkas asli – dijaga sebagai acuan (tidak pernah dimodifikasi)
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded p-3 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-500">
                        Hash SHA-256 berkas asli
                      </div>
                      <div className="font-mono text-[10px] text-slate-700 break-all">
                        {isValidSha256Hex(selectedVersionDoc.originalHash)
                          ? selectedVersionDoc.originalHash
                          : `${selectedVersionDoc.originalHash || '(kosong)'} — tidak valid`}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Hash ini dihitung dari byte berkas saat diunggah dan menjadi referensi
                      untuk setiap pemeriksaan integritas. Berkas asli membedakan dirinya dari
                      versi turunan, yang hanya mewakili perubahan terstruktur.
                    </p>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-700">
                        Detail Versi {selectedDerivedVersion.versionNumber}
                      </span>
                      <div className="text-sm font-bold text-slate-800 mt-1">
                        {selectedDerivedVersion.fieldChanged}
                      </div>
                    </div>
                    <div className="space-y-1 text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-700">ID versi:</span>{' '}
                        <span className="font-mono">{selectedDerivedVersion.id}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Waktu dibuat:</span>{' '}
                        {formatTimestamp(selectedDerivedVersion.appliedAt)}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Sumber perubahan:</span>{' '}
                        Usulan koreksi {selectedDerivedVersion.proposalId} (disetujui &amp;
                        diterapkan)
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Diterapkan oleh:</span>{' '}
                        {selectedDerivedVersion.changedBy}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Jenis perubahan:</span>{' '}
                        {CHANGE_TYPE_LABEL[selectedDerivedVersion.changeType]}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white border border-slate-200 rounded p-2">
                        <div className="text-[10px] font-bold text-slate-500 mb-0.5">
                          Nilai Sebelumnya
                        </div>
                        <div className="font-semibold text-slate-700">
                          {selectedDerivedVersion.valueBefore}
                        </div>
                      </div>
                      <div className="bg-white border border-slate-200 rounded p-2">
                        <div className="text-[10px] font-bold text-slate-500 mb-0.5">
                          Nilai Sesudah
                        </div>
                        <div className="font-semibold text-slate-700">
                          {selectedDerivedVersion.valueAfter}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-slate-600">
                      <div>
                        <span className="font-semibold text-slate-700">Alasan perubahan:</span>{' '}
                        {selectedDerivedVersion.rationale}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Referensi bukti:</span>{' '}
                        {selectedDerivedVersion.evidenceReferences}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded p-3 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-500">
                        Hash artefak representasi terstruktur
                      </div>
                      <div className="font-mono text-[10px] text-slate-700 break-all">
                        {selectedDerivedVersion.artifactHash}
                      </div>
                      <p className="text-[10px] text-amber-700 pt-1 border-t border-slate-100">
                        {selectedDerivedVersion.note}
                      </p>
                    </div>

                    {/* Tautan ke proposal & keputusan */}
                    {(() => {
                      const proposal = changeProposals.find(
                        (p) => p.id === selectedDerivedVersion.proposalId
                      );
                      const events = relatedEventsFor([
                        selectedDerivedVersion.id,
                        selectedDerivedVersion.proposalId,
                      ]);
                      return (
                        <div className="space-y-2 pt-1 border-t border-slate-200">
                          <div className="text-[10px] uppercase font-bold text-slate-500">
                            Tautan terkait
                          </div>
                          {proposal ? (
                            <div className="flex items-center justify-between bg-white border border-slate-200 rounded p-2">
                              <span className="font-mono text-[10px] text-slate-600">
                                Usulan {proposal.id}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  PROPOSAL_STATUS_BADGE[proposal.status]
                                }`}
                              >
                                {PROPOSAL_STATUS_LABEL[proposal.status]}
                              </span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">
                              Usulan terkait tidak lagi tersedia dalam sesi ini.
                            </p>
                          )}
                          {events.length > 0 ? (
                            <div className="space-y-1.5">
                              {events.map((ev) => (
                                <div key={ev.id} className="flex items-start space-x-2">
                                  <Clock className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                                  <span className="text-[11px] text-slate-600">
                                    <span className="text-slate-400">
                                      {formatTimestamp(ev.timestamp)} •{' '}
                                    </span>
                                    <strong>
                                      {AUDIT_EVENT_TYPE_LABELS[ev.eventType] ?? ev.eventType}
                                    </strong>
                                    {' – '}
                                    {ev.summary}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">
                              Belum ada peristiwa audit terkait yang tercatat.
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-6 text-center">
              Belum ada dokumen dalam sesi ini untuk menampilkan riwayat versinya.
            </p>
          )}
        </div>
      )}

      {/* ══ BAGIAN C: LOG AUDIT ═════════════════════════════════════════ */}
      {section === 'events' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-500">Jenis peristiwa:</span>
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                  typeFilter === 'all'
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Semua
              </button>
              {presentEventTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                    typeFilter === t
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {AUDIT_EVENT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="flex items-center space-x-2 text-xs flex-wrap">
              <label htmlFor="audit-doc-filter" className="text-slate-500 font-semibold">
                Dokumen:
              </label>
              <select
                id="audit-doc-filter"
                value={docFilter}
                onChange={(e) => setDocFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none max-w-[320px]"
              >
                <option value="all">Semua dokumen</option>
                {documentFilterOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              {docFilter !== 'all' && (
                <button
                  onClick={() => setDocFilter('all')}
                  className="flex items-center space-x-1 text-[11px] text-slate-500 hover:text-blue-700 font-semibold"
                >
                  <X className="w-3 h-3" />
                  <span>Hapus saringan</span>
                </button>
              )}
              <span className="text-[11px] text-slate-400 ml-auto">
                {filteredEvents.length} peristiwa ditampilkan
              </span>
            </div>
            <p className="text-[10px] text-slate-400 flex items-start space-x-1">
              <Info className="w-3 h-3 shrink-0 mt-0.5" />
              <span>
                Log ini bersifat tambah-saja (append-only) selama sesi berlangsung – tersedia
                hanya untuk membaca, tanpa aksi ubah atau hapus peristiwa. Riwayat peristiwa
                dokumen yang dihapus dari registri aktif tetap dipertahankan di sini.
              </span>
            </p>
          </div>

          {/* Daftar + detail */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-2 max-h-[70vh] overflow-y-auto">
              {filteredEvents.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-8 text-center">
                  Tidak ada peristiwa audit yang cocok dengan saringan ini.
                </p>
              ) : (
                filteredEvents.map((ev) => {
                  const isSelected = selectedEvent?.id === ev.id;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setSelectedEventId(ev.id)}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        isSelected
                          ? 'border-blue-300 bg-blue-50/40'
                          : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                          {AUDIT_EVENT_TYPE_LABELS[ev.eventType] ?? ev.eventType}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatTimestamp(ev.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 mt-1 line-clamp-2">{ev.summary}</p>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-2 flex-wrap">
                        <span>
                          {ev.actor}
                          {ev.actorRole ? ` (${ev.actorRole})` : ''}
                        </span>
                        <span>•</span>
                        <span className="font-mono">{ev.id}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="lg:col-span-2">
              {selectedEvent ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 text-xs space-y-3 h-fit lg:sticky lg:top-28">
                  <div className="font-bold text-sm text-slate-800">
                    {AUDIT_EVENT_TYPE_LABELS[selectedEvent.eventType] ?? selectedEvent.eventType}
                  </div>
                  <div className="space-y-1 text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-700">ID peristiwa:</span>{' '}
                      <span className="font-mono">{selectedEvent.id}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Jenis:</span>{' '}
                      <span className="font-mono">{selectedEvent.eventType}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Waktu:</span>{' '}
                      {formatTimestamp(selectedEvent.timestamp)}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Pelaku:</span>{' '}
                      {selectedEvent.actor}
                      {selectedEvent.actorRole ? ` — peran: ${selectedEvent.actorRole}` : ''}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Entitas:</span>{' '}
                      {selectedEvent.entityType} (
                      <span className="font-mono">{selectedEvent.entityId}</span>)
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded p-3 text-slate-700 leading-relaxed">
                    {selectedEvent.summary}
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-500">
                      Metadata peristiwa
                    </div>
                    {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 ? (
                      <div className="space-y-0.5">
                        {Object.entries(selectedEvent.metadata).map(([key, value]) => (
                          <div key={key} className="flex items-start space-x-2">
                            <span className="font-mono text-[10px] text-slate-500 shrink-0">
                              {key}
                            </span>
                            <span className="text-slate-700 break-all">: {String(value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        Tidak ada metadata tambahan untuk peristiwa ini.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border-dashed border-slate-300 p-8 text-center text-xs text-slate-400">
                  Pilih sebuah peristiwa untuk melihat detailnya.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ BAGIAN D: BUKU BESAR SIMULASI ═══════════════════════════════ */}
      {section === 'ledger' && (
        <div className="space-y-6">
          {/* Banner simulasi */}
          <div className="bg-blue-50/70 border-2 border-blue-300 rounded-xl p-4 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-blue-700 shrink-0" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black text-blue-900 uppercase tracking-wider">
                  Simulasi
                </span>
                <span className="text-xs font-bold text-blue-900">
                  Buku Besar &amp; Kuorum Persetujuan (Simulasi)
                </span>
              </div>
              <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">
                Modul ini HANYA SIMULASI untuk keperluan demonstrasi. Peristiwa ditautkan ke
                rantai blok simulasi yang dihitung di memori browser – bukan blockchain publik
                maupun permissioned, dan bukan catatan permanen, immutable, atau tahan
                manipulasi. Partisipan kuorum di bawah adalah aktor simulasi dalam prototipe –
                BUKAN validator blockchain independen. Simulasi ini tidak memengaruhi hasil
                verifikasi integritas dan tidak mengubah status persetujuan usulan di Approval
                Center.
              </p>
            </div>
          </div>

          {/* Status pencatatan peristiwa */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <ScrollText className="w-4 h-4 text-blue-700" />
                <h2 className="text-sm font-bold text-slate-900">
                  Status Pencatatan Peristiwa (Simulasi)
                </h2>
              </div>
              <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-semibold">
                {ledgerEntries.length} blok simulasi
              </span>
            </div>

            {ledgerEntries.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                Belum ada peristiwa audit untuk dicatat dalam buku besar simulasi.
              </p>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {ledgerEntries.map((entry) => {
                  const event = eventById.get(entry.eventId);
                  return (
                    <div
                      key={entry.eventId}
                      className="flex items-start space-x-3 p-3 rounded-lg border border-slate-100 bg-slate-50/40 text-xs"
                    >
                      <span className="font-mono text-slate-400 shrink-0 mt-0.5">
                        #{entry.sequence}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-800 truncate">
                            {event
                              ? AUDIT_EVENT_TYPE_LABELS[event.eventType] ?? event.eventType
                              : entry.eventId}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shrink-0">
                            Tercatat (Simulasi)
                          </span>
                        </div>
                        {event && (
                          <>
                            <p className="text-slate-600 mt-0.5 line-clamp-2">{event.summary}</p>
                            <div className="text-[10px] text-slate-400 mt-1">
                              {formatTimestamp(event.timestamp)} • {event.actor}
                            </div>
                          </>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1 font-mono break-all">
                          Hash blok simulasi: {entry.blockHash.slice(0, 24)}…
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Setiap blok simulasi dihitung secara berantai dari SHA-256 blok sebelumnya
              ditulang punggung isi peristiwa, untuk mendemonstrasikan konsep rantai – seluruh
              proses berjalan murni di browser dan tidak dikirim ke jaringan mana pun.
            </p>
          </div>

          {/* Kuorum */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
              <Users className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm font-bold text-slate-900">
                Kuorum Persetujuan Usulan (Simulasi)
              </h2>
            </div>

            {changeProposals.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                Belum ada usulan koreksi dalam sesi ini.
              </p>
            ) : (
              changeProposals.map((p) => {
                const required = Math.max(1, p.approvalsRequired ?? 2);
                const received = Math.min(p.approvalsReceived ?? 0, required);
                return (
                  <div
                    key={p.id}
                    className="p-4 rounded-lg border border-slate-200 bg-slate-50/40 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-xs">
                        <span className="font-bold text-blue-700">#{p.id}</span>{' '}
                        <span className="text-slate-600 font-medium">— {docName(p.documentId)}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          PROPOSAL_STATUS_BADGE[p.status]
                        }`}
                      >
                        {PROPOSAL_STATUS_LABEL[p.status]}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span>Persetujuan terkumpul</span>
                        <span className="font-semibold text-slate-700">
                          {received} / {required}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${(received / required) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {quorumParticipants(p).map((part) => (
                        <div
                          key={part.name}
                          className="flex items-center space-x-2 text-[11px] bg-white border border-slate-200 rounded px-2 py-1.5"
                        >
                          {part.approved ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span
                            className={
                              part.approved ? 'text-slate-800 font-semibold' : 'text-slate-500'
                            }
                          >
                            {part.name}
                          </span>
                          <span className="ml-auto text-[10px] text-slate-400 shrink-0">
                            {part.approved ? 'Menyetujui (simulasi)' : 'Belum bersuara'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] text-slate-600">{quorumDecisionText(p)}</p>
                  </div>
                );
              })
            )}
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Progres di atas hanya menampilkan salinan keputusan yang berasal dari Approval
              Center; modul simulasi ini tidak memiliki aksi untuk menyetujui atau mengubah
              usulan. Sebuah usulan baru dianggap disetujui ketika jumlah persetujuan simulasi
              memenuhi kuorum yang dipersyaratkan.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
