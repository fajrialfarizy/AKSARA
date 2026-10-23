import { useState, useMemo } from 'react';
import {
  CheckSquare,
  Check,
  X,
  Edit3,
  Users,
  FileText,
  ShieldCheck,
  Info,
  AlertTriangle,
  Clock,
  Filter,
  ChevronDown,
  ChevronRight,
  History,
  CircleCheck,
  Ban,
  Layers,
} from 'lucide-react';
import type { ChangeProposal, DocumentItem, DocumentVersion, AuditEvent } from '../types';
import { AUDIT_EVENT_TYPE_LABELS } from '../services/auditService';

interface ApprovalViewProps {
  proposals: ChangeProposal[];
  documents: DocumentItem[];
  documentVersions: DocumentVersion[];
  auditEvents: AuditEvent[];
  onApprove: (id: string, reviewerNote: string) => void;
  onReject: (id: string, reviewerNote: string) => void;
  onCancel: (id: string) => void;
  onEdit: (updated: ChangeProposal) => void;
}

type StatusFilter = 'All' | ChangeProposal['status'];

const STATUS_BADGE: Record<string, string> = {
  'Pending Review': 'bg-amber-100 text-amber-800 border-amber-200',
  Approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Rejected: 'bg-red-100 text-red-800 border-red-200',
  Cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
};

const CHANGETYPE_LABEL: Record<string, string> = {
  value: '💰 Nilai Akuntansi',
  metadata: '📋 Metadata',
  structure: '🏗 Struktur',
};

export const ApprovalView: React.FC<ApprovalViewProps> = ({
  proposals,
  documents,
  documentVersions,
  auditEvents,
  onApprove,
  onReject,
  onCancel,
  onEdit,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    type: 'approve' | 'reject' | 'cancel';
  } | null>(null);
  const [confirmNote, setConfirmNote] = useState('');
  const [editingProposal, setEditingProposal] = useState<ChangeProposal | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<ChangeProposal>>({});
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const filtered = useMemo(() => {
    if (statusFilter === 'All') return proposals;
    return proposals.filter((p) => p.status === statusFilter);
  }, [proposals, statusFilter]);

  const getDocName = (docId: string) =>
    documents.find((d) => d.id === docId)?.name ?? docId;

  const getVersionsForProposal = (proposalId: string) =>
    documentVersions.filter((v) => v.proposalId === proposalId);

  const getEventsForProposal = (proposalId: string) =>
    auditEvents.filter((e) => e.entityId === proposalId);

  const notify = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 5000);
  };

  /* ── Confirm Action ─────────────────────────────────────────────── */
  const handleConfirm = () => {
    if (!confirmAction) return;
    const { id, type } = confirmAction;
    if (type === 'approve') {
      onApprove(id, confirmNote || 'Disetujui oleh Supervisor (Simulasi).');
      notify('✅ Persetujuan dicatat. Versi baru dokumen dihasilkan dalam memori audit.');
    } else if (type === 'reject') {
      onReject(id, confirmNote || 'Ditolak oleh Peninjau (Simulasi).');
      notify('❌ Usulan ditolak. Tidak ada perubahan yang diterapkan.');
    } else {
      onCancel(id);
      notify('🚫 Usulan dibatalkan.');
    }
    setConfirmAction(null);
    setConfirmNote('');
  };

  /* ── Edit Proposal ──────────────────────────────────────────────── */
  const openEdit = (p: ChangeProposal) => {
    setEditingProposal(p);
    setEditDraft({ ...p });
  };

  const handleSaveEdit = () => {
    if (!editingProposal || !editDraft) return;
    const updated: ChangeProposal = {
      ...editingProposal,
      ...editDraft,
      // After editing a reviewed proposal, reset to Pending Review for re-approval
      status:
        editingProposal.status === 'Approved' || editingProposal.status === 'Rejected'
          ? 'Pending Review'
          : editingProposal.status,
      reviewedAt: undefined,
      reviewerNote: undefined,
    } as ChangeProposal;
    onEdit(updated);
    setEditingProposal(null);
    setEditDraft({});
    notify(
      '✏️ Usulan diperbarui. Status dikembalikan ke Pending Review dan memerlukan persetujuan ulang.'
    );
  };

  const counts = useMemo(
    () => ({
      All: proposals.length,
      'Pending Review': proposals.filter((p) => p.status === 'Pending Review').length,
      Approved: proposals.filter((p) => p.status === 'Approved').length,
      Rejected: proposals.filter((p) => p.status === 'Rejected').length,
      Cancelled: proposals.filter((p) => p.status === 'Cancelled').length,
    }),
    [proposals]
  );

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-700 text-white rounded-lg">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900">Approval Center</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold border border-blue-200">
                  PRD Tahap 6
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tinjau, setujui, atau tolak usulan koreksi. Semua perubahan memerlukan persetujuan eksplisit manusia.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition"
          >
            <History className="w-4 h-4" />
            <span>{showVersionHistory ? 'Sembunyikan' : 'Riwayat Versi'}</span>
          </button>
        </div>
      </div>

      {/* ── Action Notice ──────────────────────────────────────────────── */}
      {actionNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-xs font-semibold flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* ── HITL Disclaimer ───────────────────────────────────────────── */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-slate-700 flex items-start space-x-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-blue-900">Aturan Human-in-the-Loop (PRD 6.5):</span>
          <p className="mt-1 leading-relaxed">
            Hanya usulan berstatus <strong>Approved</strong> yang dapat masuk ke alur penerapan. Usulan yang ditolak atau
            dibatalkan tidak diterapkan. Membuka atau melihat usulan tidak berarti menyetujuinya. Persetujuan mencatat
            identitas peran dan waktu keputusan. Jika usulan diedit setelah ditinjau, persetujuan ulang diperlukan.
          </p>
        </div>
      </div>

      {/* ── Version History Panel ─────────────────────────────────────── */}
      {showVersionHistory && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Riwayat Versi Dokumen</span>
          </h2>
          {documentVersions.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Belum ada versi yang dihasilkan dalam sesi ini.</p>
          ) : (
            <div className="space-y-3">
              {documentVersions.map((ver) => (
                <div
                  key={ver.id}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      {getDocName(ver.documentId)}{' '}
                      <span className="text-blue-700">– Versi {ver.versionNumber}</span>
                    </span>
                    <span className="text-slate-500">{ver.appliedAt}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-red-50 border border-red-100 rounded p-2">
                      <div className="text-[10px] font-bold text-red-700 mb-1">SEBELUM</div>
                      <div className="font-semibold text-red-800">{ver.valueBefore}</div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded p-2">
                      <div className="text-[10px] font-bold text-emerald-700 mb-1">SESUDAH</div>
                      <div className="font-semibold text-emerald-800">{ver.valueAfter}</div>
                    </div>
                  </div>
                  <div className="text-slate-600">{ver.rationale}</div>
                  <div className="text-slate-500 font-mono text-[10px] break-all">
                    Artifact Hash: {ver.artifactHash}
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded p-2 text-amber-800 text-[10px]">
                    <strong>Catatan:</strong> {ver.note}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Filter Bar ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {(['All', 'Pending Review', 'Approved', 'Rejected', 'Cancelled'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                statusFilter === s
                  ? s === 'All'
                    ? 'bg-blue-700 text-white border-blue-700'
                    : STATUS_BADGE[s] ?? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {s === 'All' ? 'Semua' : s}{' '}
              <span className="ml-1 opacity-70">
                ({counts[s as keyof typeof counts] ?? 0})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Proposals List ────────────────────────────────────────────── */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm shadow-xs">
            Tidak ada usulan dengan status ini.
          </div>
        )}

        {filtered.map((item) => {
          const isExpanded = expandedId === item.id;
          const versions = getVersionsForProposal(item.id);
          const events = getEventsForProposal(item.id);
          const docName = getDocName(item.documentId);

          return (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
            >
              {/* ── Proposal Summary Row ── */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left"
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                        #{item.id}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        {CHANGETYPE_LABEL[item.changeType]}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          STATUS_BADGE[item.status] ?? ''
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-700">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold">{docName}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.originalValue}{' '}
                      <span className="text-slate-300 mx-1">→</span>{' '}
                      <span className="font-semibold text-slate-700">{item.proposedValue}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      <strong>{item.approvalsReceived ?? 0}</strong> / {item.approvalsRequired ?? 2}
                    </span>
                  </div>
                </div>
              </button>

              {/* ── Expanded Detail ── */}
              {isExpanded && (
                <div className="border-t border-slate-100 px-5 py-5 space-y-5 bg-slate-50/30">
                  {/* Before / After */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-red-50/60 border border-red-200 rounded-lg p-4 text-xs space-y-1">
                      <span className="text-[10px] uppercase font-bold text-red-700">Nilai Sebelumnya</span>
                      <div className="text-xl font-bold text-red-700">{item.originalValue}</div>
                    </div>
                    <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-4 text-xs space-y-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-700">Nilai Diusulkan</span>
                      <div className="text-xl font-bold text-emerald-700">{item.proposedValue}</div>
                    </div>
                  </div>

                  {/* Rationale & Evidence */}
                  <div className="bg-white border border-slate-200 rounded-lg p-4 text-xs space-y-3">
                    <div>
                      <span className="font-semibold text-slate-800">Alasan Perubahan:</span>
                      <p className="mt-1 text-slate-600 leading-relaxed">{item.rationale}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800">Referensi Bukti:</span>
                      <p className="mt-1 text-slate-600 leading-relaxed">{item.evidenceReferences}</p>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-100">
                      <span>Diajukan oleh: <strong className="text-slate-700">{item.proposedBy}</strong></span>
                      <span>{new Date(item.createdAt).toLocaleString('id-ID')}</span>
                    </div>
                    {item.sourceFindingId && (
                      <div className="text-[10px] text-blue-600 font-medium">
                        Berdasarkan temuan: {item.sourceFindingId}
                      </div>
                    )}
                  </div>

                  {/* Review Decision Record */}
                  {item.reviewedAt && (
                    <div
                      className={`border rounded-lg p-4 text-xs space-y-1 ${
                        item.status === 'Approved'
                          ? 'bg-emerald-50 border-emerald-200'
                          : item.status === 'Rejected'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {item.status === 'Approved' ? (
                          <CircleCheck className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Ban className="w-4 h-4 text-red-600" />
                        )}
                        <span className="font-semibold text-slate-800">
                          Keputusan: {item.status}
                        </span>
                        <span className="text-slate-500">
                          – {new Date(item.reviewedAt).toLocaleString('id-ID')}
                        </span>
                      </div>
                      {item.reviewerNote && (
                        <p className="text-slate-600 mt-1">{item.reviewerNote}</p>
                      )}
                    </div>
                  )}

                  {/* Version artifacts for this proposal */}
                  {versions.length > 0 && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs space-y-2">
                      <div className="flex items-center space-x-2 font-semibold text-blue-800">
                        <Layers className="w-4 h-4" />
                        <span>Versi Dokumen yang Dihasilkan</span>
                      </div>
                      {versions.map((v) => (
                        <div key={v.id} className="text-slate-700 space-y-0.5">
                          <div>
                            Versi {v.versionNumber} – {v.fieldChanged}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500 break-all">
                            Hash Artefak: {v.artifactHash}
                          </div>
                          <div className="text-[10px] italic text-amber-700">{v.note}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Audit Events */}
                  {events.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs space-y-2">
                      <div className="flex items-center space-x-2 font-semibold text-slate-700">
                        <Clock className="w-4 h-4" />
                        <span>Riwayat Audit Event</span>
                      </div>
                      {events.map((ev) => (
                        <div key={ev.id} className="flex items-start space-x-2 text-slate-600">
                          <span className="text-slate-400 shrink-0">
                            {new Date(ev.timestamp).toLocaleString('id-ID')}
                          </span>
                          <span>
                            <strong>{AUDIT_EVENT_TYPE_LABELS[ev.eventType] ?? ev.eventType}</strong> – {ev.summary}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Action Buttons ── */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-3">
                    <div className="flex items-center space-x-2">
                      {/* Edit – selalu tersedia kecuali sudah Approved dan tidak ada re-edit */}
                      {item.status !== 'Approved' && item.status !== 'Cancelled' && (
                        <button
                          onClick={() => openEdit(item)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Usulan</span>
                        </button>
                      )}
                      {item.status === 'Approved' && (
                        <button
                          onClick={() => openEdit(item)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold border border-amber-300 rounded-lg hover:bg-amber-50 text-amber-700 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit & Ajukan Ulang</span>
                        </button>
                      )}
                      {/* Cancel – hanya jika Pending Review */}
                      {item.status === 'Pending Review' && (
                        <button
                          onClick={() => setConfirmAction({ id: item.id, type: 'cancel' })}
                          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-500 transition"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Batalkan</span>
                        </button>
                      )}
                    </div>

                    {/* Approve / Reject – hanya Pending Review */}
                    {item.status === 'Pending Review' && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setConfirmAction({ id: item.id, type: 'reject' })}
                          className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold border border-red-200 rounded-lg text-red-700 hover:bg-red-50 transition"
                        >
                          <X className="w-4 h-4" />
                          <span>Tolak</span>
                        </button>
                        <button
                          onClick={() => setConfirmAction({ id: item.id, type: 'approve' })}
                          className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-xs transition"
                        >
                          <Check className="w-4 h-4" />
                          <span>Setujui (Simulasi Supervisor)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Confirmation Modal ────────────────────────────────────────── */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center space-x-3">
              {confirmAction.type === 'approve' ? (
                <CircleCheck className="w-6 h-6 text-emerald-600" />
              ) : confirmAction.type === 'reject' ? (
                <AlertTriangle className="w-6 h-6 text-red-600" />
              ) : (
                <Ban className="w-6 h-6 text-slate-500" />
              )}
              <h3 className="text-base font-bold text-slate-900">
                {confirmAction.type === 'approve'
                  ? 'Konfirmasi Persetujuan'
                  : confirmAction.type === 'reject'
                  ? 'Konfirmasi Penolakan'
                  : 'Konfirmasi Pembatalan'}
              </h3>
            </div>

            <p className="text-sm text-slate-600">
              {confirmAction.type === 'approve'
                ? 'Usulan ini akan disetujui dan versi baru dokumen akan dibuat dalam memori audit. Dokumen asli tidak dimodifikasi.'
                : confirmAction.type === 'reject'
                ? 'Usulan ini akan ditolak dan tidak diterapkan. Riwayat usulan tetap tersimpan di audit log.'
                : 'Usulan ini akan dibatalkan. Tidak ada perubahan yang diterapkan.'}
            </p>

            {confirmAction.type !== 'cancel' && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Catatan Peninjau (opsional)
                </label>
                <textarea
                  rows={3}
                  value={confirmNote}
                  onChange={(e) => setConfirmNote(e.target.value)}
                  placeholder={
                    confirmAction.type === 'approve'
                      ? 'Catatan persetujuan…'
                      : 'Alasan penolakan…'
                  }
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => {
                  setConfirmAction(null);
                  setConfirmNote('');
                }}
                className="px-4 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition"
              >
                Kembali
              </button>
              <button
                onClick={handleConfirm}
                className={`px-5 py-2 text-xs font-semibold rounded-lg shadow-xs transition ${
                  confirmAction.type === 'approve'
                    ? 'bg-blue-700 hover:bg-blue-800 text-white'
                    : confirmAction.type === 'reject'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-slate-600 hover:bg-slate-700 text-white'
                }`}
              >
                {confirmAction.type === 'approve'
                  ? '✓ Konfirmasi Setujui'
                  : confirmAction.type === 'reject'
                  ? '✕ Konfirmasi Tolak'
                  : '🚫 Konfirmasi Batalkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ───────────────────────────────────────────────── */}
      {editingProposal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-blue-700" />
                <span>Edit Usulan #{editingProposal.id}</span>
              </h3>
              <button
                onClick={() => setEditingProposal(null)}
                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(editingProposal.status === 'Approved' || editingProposal.status === 'Rejected') && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Usulan ini pernah ditinjau. Menyimpan perubahan akan mengembalikan status ke{' '}
                  <strong>Pending Review</strong> dan memerlukan persetujuan ulang.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Nilai Sebelumnya</label>
                <input
                  type="text"
                  value={editDraft.originalValue ?? ''}
                  onChange={(e) => setEditDraft({ ...editDraft, originalValue: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Nilai Diusulkan</label>
                <input
                  type="text"
                  value={editDraft.proposedValue ?? ''}
                  onChange={(e) => setEditDraft({ ...editDraft, proposedValue: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Alasan Perubahan</label>
                <textarea
                  rows={4}
                  value={editDraft.rationale ?? ''}
                  onChange={(e) => setEditDraft({ ...editDraft, rationale: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Referensi Bukti</label>
                <textarea
                  rows={3}
                  value={editDraft.evidenceReferences ?? ''}
                  onChange={(e) =>
                    setEditDraft({ ...editDraft, evidenceReferences: e.target.value })
                  }
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingProposal(null)}
                className="px-4 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition"
              >
                Batalkan
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-xs transition"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
