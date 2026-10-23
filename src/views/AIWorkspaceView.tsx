import { useState, useMemo } from 'react';
import {
  Bot,
  FileText,
  AlertTriangle,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Search,
  Info,
  Pencil,
  ArrowRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import type { DocumentItem, ConflictFinding, ChangeProposal, NavigationTab } from '../types';

interface AIWorkspaceViewProps {
  documents: DocumentItem[];
  findings: ConflictFinding[];
  proposals: ChangeProposal[];
  onCreateProposal: (proposal: Omit<ChangeProposal, 'id' | 'createdAt' | 'status'>) => void;
  onNavigate: (tab: NavigationTab) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-blue-100 text-blue-700 border-blue-200',
  Info: 'bg-slate-100 text-slate-600 border-slate-200',
};

const STATUS_COLORS: Record<string, string> = {
  Conflict: 'bg-red-100 text-red-700',
  'Needs Review': 'bg-amber-100 text-amber-700',
  Consistent: 'bg-emerald-100 text-emerald-700',
  'Not Comparable': 'bg-slate-100 text-slate-600',
  'Insufficient Evidence': 'bg-purple-100 text-purple-700',
};

interface ProposalForm {
  documentId: string;
  changeType: ChangeProposal['changeType'];
  originalValue: string;
  proposedValue: string;
  rationale: string;
  evidenceReferences: string;
  proposedBy: string;
  sourceFindingId?: string;
}

const EMPTY_FORM: ProposalForm = {
  documentId: '',
  changeType: 'value',
  originalValue: '',
  proposedValue: '',
  rationale: '',
  evidenceReferences: '',
  proposedBy: 'Fajri (Auditor)',
};

export const AIWorkspaceView: React.FC<AIWorkspaceViewProps> = ({
  documents,
  findings,
  proposals,
  onCreateProposal,
  onNavigate,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id ?? '');
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProposalForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProposalForm, string>>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  // Temuan yang terkait dengan dokumen terpilih
  const relatedFindings = useMemo(() => {
    return findings.filter((f) =>
      f.documentIds.includes(selectedDocId) || selectedDocId === ''
    );
  }, [findings, selectedDocId]);

  // Filter berdasarkan pencarian
  const filteredFindings = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return relatedFindings;
    return relatedFindings.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q)
    );
  }, [relatedFindings, searchQuery]);

  // Jumlah proposal yang sudah dibuat dari workspace ini
  const workspaceProposals = useMemo(
    () => proposals.filter((p) => p.documentId === selectedDocId),
    [proposals, selectedDocId]
  );

  const openFormFromFinding = (finding: ConflictFinding) => {
    const docId = finding.documentIds[0] ?? selectedDocId;
    const doc = documents.find((d) => d.id === docId);
    const valueFrom = finding.comparedValues?.[0];
    setForm({
      ...EMPTY_FORM,
      documentId: docId,
      sourceFindingId: finding.id,
      originalValue: valueFrom ? String(valueFrom.value) : '',
      evidenceReferences: `Temuan: ${finding.title}. Referensi: ${finding.sourceReferences
        .map((r) => `${r.documentName} – ${r.location}`)
        .join('; ')}`,
    });
    setFormErrors({});
    setShowForm(true);
    setExpandedFindingId(null);
    // Auto-scroll ke form
    setTimeout(() => {
      document.getElementById('proposal-form-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    void doc; // suppress unused warning
  };

  const openManualForm = () => {
    setForm({ ...EMPTY_FORM, documentId: selectedDocId });
    setFormErrors({});
    setShowForm(true);
    setTimeout(() => {
      document.getElementById('proposal-form-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const validateForm = (): boolean => {
    const errs: typeof formErrors = {};
    if (!form.documentId) errs.documentId = 'Pilih dokumen yang akan diubah.';
    if (!form.originalValue.trim()) errs.originalValue = 'Masukkan nilai atau isi sebelumnya.';
    if (!form.proposedValue.trim()) errs.proposedValue = 'Masukkan nilai atau isi yang diusulkan.';
    if (!form.rationale.trim() || form.rationale.trim().length < 20)
      errs.rationale = 'Alasan minimal 20 karakter dan harus jelas.';
    if (!form.evidenceReferences.trim())
      errs.evidenceReferences = 'Sertakan referensi bukti sumber.';
    if (!form.proposedBy.trim()) errs.proposedBy = 'Masukkan nama pengusul.';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    onCreateProposal({
      documentId: form.documentId,
      sourceFindingId: form.sourceFindingId,
      proposedBy: form.proposedBy,
      changeType: form.changeType,
      originalValue: form.originalValue,
      proposedValue: form.proposedValue,
      rationale: form.rationale,
      evidenceReferences: form.evidenceReferences,
    });
    setShowForm(false);
    setForm(EMPTY_FORM);
    setSuccessMsg(
      'Usulan koreksi berhasil dikirim ke Approval Center. AI tidak menerapkan perubahan secara otomatis.'
    );
    setTimeout(() => setSuccessMsg(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-700 text-white rounded-lg">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900">AI‑Assisted Workspace</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold border border-blue-200">
                  PRD Tahap 6
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tinjau temuan, minta penjelasan AI, dan buat usulan koreksi berbasis bukti. Semua perubahan memerlukan persetujuan manusia.
              </p>
            </div>
          </div>
          <button
            onClick={openManualForm}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Usulan Manual</span>
          </button>
        </div>
      </div>

      {/* ── Human-in-the-Loop Notice ────────────────────────────────── */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-slate-700 flex items-start space-x-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-blue-900">Aturan Human-in-the-Loop (PRD 6.5):</span>
          <p className="mt-1 leading-relaxed">
            AI tidak menulis perubahan ke dokumen asli secara otomatis. Membuka atau melihat usulan tidak berarti menyetujuinya.
            Hanya usulan berstatus <strong>Approved</strong> yang dapat masuk ke alur penerapan perubahan.
            Persetujuan mencatat identitas peran dan waktu keputusan. Dokumen asli tidak pernah dimodifikasi langsung.
          </p>
        </div>
      </div>

      {/* ── Success notification ─────────────────────────────────────── */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── Main Layout ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Document Selector + Info */}
        <div className="space-y-4">
          {/* Document Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Pilih Dokumen</span>
            </h2>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">— Semua Dokumen —</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            {selectedDoc && (
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Tipe</span>
                  <span className="font-semibold uppercase text-slate-800">{selectedDoc.fileType}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Kategori</span>
                  <span className="font-semibold text-slate-800">{selectedDoc.category}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Periode</span>
                  <span className="font-semibold text-slate-800">{selectedDoc.metadata.period ?? '—'}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Integritas</span>
                  <span
                    className={`font-semibold ${
                      selectedDoc.integrityStatus === 'valid'
                        ? 'text-emerald-700'
                        : selectedDoc.integrityStatus === 'tampered'
                        ? 'text-red-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {selectedDoc.integrityStatus}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Extracted Text Preview */}
          {selectedDoc?.extractedText && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Teks Sumber (Ekstrak)</span>
              </h2>
              <pre className="text-[10px] text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-100 leading-relaxed max-h-40 overflow-y-auto">
                {selectedDoc.extractedText}
              </pre>
            </div>
          )}

          {/* Workspace Proposals Summary */}
          {workspaceProposals.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Usulan dari Dokumen Ini</span>
              </h2>
              <div className="space-y-2">
                {workspaceProposals.map((p) => (
                  <div
                    key={p.id}
                    className="text-xs flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-100"
                  >
                    <span className="text-slate-700 font-medium truncate max-w-[60%]">
                      {p.changeType === 'value' ? '💰' : p.changeType === 'metadata' ? '📋' : '🏗'}{' '}
                      {p.originalValue} → {p.proposedValue}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : p.status === 'Rejected'
                          ? 'bg-red-100 text-red-700'
                          : p.status === 'Cancelled'
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => onNavigate('approval')}
                className="mt-3 w-full text-xs text-blue-700 font-semibold hover:underline flex items-center justify-center space-x-1"
              >
                <span>Lihat Semua di Approval Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: Findings Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari temuan…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Findings List */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center space-x-2 px-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>
                Temuan Consistency Checker
                {selectedDocId ? ` – ${selectedDoc?.name ?? ''}` : ' – Semua Dokumen'}
              </span>
              <span className="text-slate-400 font-normal text-xs">({filteredFindings.length})</span>
            </h2>

            {filteredFindings.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm shadow-xs">
                Tidak ada temuan untuk dokumen ini.
                <br />
                <span className="text-xs">Jalankan Consistency Checker atau pilih dokumen lain.</span>
              </div>
            )}

            {filteredFindings.map((finding) => {
              const isExpanded = expandedFindingId === finding.id;
              return (
                <div
                  key={finding.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
                >
                  {/* Finding header */}
                  {/* Tahap 8: baris ringkasan berupa div berperan sebagai tombol
                      (bukan <button> bersarung) agar valid secara HTML & dapat
                      diakses lewat papan ketik. */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setExpandedFindingId(isExpanded ? null : finding.id)
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedFindingId(isExpanded ? null : finding.id);
                      }
                    }}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:-outline-offset-2 rounded-lg"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-0.5">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="text-sm font-semibold text-slate-800">
                            {finding.title}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              STATUS_COLORS[finding.status] ?? 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {finding.status}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              SEVERITY_COLORS[finding.severity] ?? ''
                            }`}
                          >
                            {finding.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-xl">
                          {finding.description}
                        </p>
                      </div>
                    </div>
                    {(finding.status === 'Conflict' || finding.status === 'Needs Review') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openFormFromFinding(finding);
                        }}
                        className="ml-4 flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-xs transition shrink-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Buat Usulan</span>
                      </button>
                    )}
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-5 py-4 space-y-4 bg-slate-50/40">
                      {/* Compared Values */}
                      {finding.comparedValues && finding.comparedValues.length > 0 && (
                        <div>
                          <p className="text-[11px] uppercase font-bold text-slate-500 mb-2">
                            Perbandingan Nilai
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {finding.comparedValues.map((cv, i) => (
                              <div
                                key={i}
                                className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-1"
                              >
                                <div className="font-semibold text-slate-700 truncate">
                                  {cv.documentName}
                                </div>
                                <div className="text-slate-500">{cv.label}</div>
                                <div className="text-lg font-bold text-slate-900">{cv.value}</div>
                              </div>
                            ))}
                          </div>
                          {finding.difference && (
                            <p className="mt-2 text-xs text-red-700 font-semibold">
                              Selisih terdeteksi: {finding.difference}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Source References */}
                      <div>
                        <p className="text-[11px] uppercase font-bold text-slate-500 mb-2">
                          Referensi Sumber
                        </p>
                        <div className="space-y-2">
                          {finding.sourceReferences.map((ref, i) => (
                            <div
                              key={i}
                              className="bg-white border border-slate-100 rounded-lg p-3 text-[11px] text-slate-600 space-y-0.5"
                            >
                              <div className="font-semibold text-slate-800">{ref.documentName}</div>
                              <div>{ref.location}</div>
                              {ref.extractedSnippet && (
                                <div className="italic text-slate-500">"{ref.extractedSnippet}"</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Reasoning */}
                      <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-3 text-xs text-slate-700">
                        <span className="font-semibold text-blue-900">Penalaran Pemeriksaan: </span>
                        {finding.reasoning}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-3">
                        {(finding.status === 'Conflict' || finding.status === 'Needs Review') && (
                          <button
                            onClick={() => openFormFromFinding(finding)}
                            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Buat Usulan dari Temuan Ini</span>
                          </button>
                        )}
                        <button
                          onClick={() => onNavigate('graphrag')}
                          className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition"
                        >
                          <Bot className="w-3.5 h-3.5" />
                          <span>Tanya GraphRAG Assistant</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Proposal Form ─────────────────────────────────────────────── */}
      {showForm && (
        <div
          id="proposal-form-section"
          className="bg-white rounded-xl border border-blue-300 shadow-lg p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Pencil className="w-5 h-5 text-blue-700" />
              <h2 className="text-base font-bold text-slate-900">
                Form Usulan Koreksi
              </h2>
              {form.sourceFindingId && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                  dari Temuan: {form.sourceFindingId}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start space-x-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Usulan ini akan dikirim ke Approval Center dan{' '}
              <strong>tidak diterapkan secara otomatis</strong>. Sertakan
              bukti yang memadai. Jika bukti tidak cukup, tandai di kolom
              keterbatasan pada alasan.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Document */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Dokumen yang Diubah <span className="text-red-500">*</span>
              </label>
              <select
                value={form.documentId}
                onChange={(e) => setForm({ ...form, documentId: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">— Pilih dokumen —</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {formErrors.documentId && (
                <p className="text-red-500 text-[10px]">{formErrors.documentId}</p>
              )}
            </div>

            {/* Change Type */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Jenis Perubahan <span className="text-red-500">*</span>
              </label>
              <select
                value={form.changeType}
                onChange={(e) =>
                  setForm({ ...form, changeType: e.target.value as ChangeProposal['changeType'] })
                }
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="value">💰 Nilai Akuntansi</option>
                <option value="metadata">📋 Metadata Dokumen</option>
                <option value="structure">🏗 Struktur / Kode Akun</option>
              </select>
            </div>

            {/* Original Value */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Nilai / Isi Sebelumnya <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.originalValue}
                onChange={(e) => setForm({ ...form, originalValue: e.target.value })}
                placeholder="mis. Rp125.000.000"
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {formErrors.originalValue && (
                <p className="text-red-500 text-[10px]">{formErrors.originalValue}</p>
              )}
            </div>

            {/* Proposed Value */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Nilai / Isi yang Diusulkan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.proposedValue}
                onChange={(e) => setForm({ ...form, proposedValue: e.target.value })}
                placeholder="mis. Rp120.000.000"
                className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {formErrors.proposedValue && (
                <p className="text-red-500 text-[10px]">{formErrors.proposedValue}</p>
              )}
            </div>
          </div>

          {/* Before vs After Preview */}
          {(form.originalValue || form.proposedValue) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-red-50/60 border border-red-200 rounded-lg p-3 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-red-700">Sebelum</span>
                <div className="text-lg font-bold text-red-700">
                  {form.originalValue || '—'}
                </div>
              </div>
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-700">Diusulkan</span>
                <div className="text-lg font-bold text-emerald-700">
                  {form.proposedValue || '—'}
                </div>
              </div>
            </div>
          )}

          {/* Rationale */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Alasan Perubahan & Keterbatasan <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={form.rationale}
              onChange={(e) => setForm({ ...form, rationale: e.target.value })}
              placeholder="Jelaskan mengapa perubahan ini diperlukan, asumsi yang digunakan, dan keterbatasan atau informasi yang belum terverifikasi…"
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
            {formErrors.rationale && (
              <p className="text-red-500 text-[10px]">{formErrors.rationale}</p>
            )}
          </div>

          {/* Evidence */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Referensi Bukti Sumber <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={form.evidenceReferences}
              onChange={(e) => setForm({ ...form, evidenceReferences: e.target.value })}
              placeholder="Sebutkan nama dokumen, nomor baris, sheet, halaman, atau temuan yang mendukung usulan ini…"
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
            {formErrors.evidenceReferences && (
              <p className="text-red-500 text-[10px]">{formErrors.evidenceReferences}</p>
            )}
          </div>

          {/* Proposed By */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Diajukan oleh (Simulasi) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.proposedBy}
              onChange={(e) => setForm({ ...form, proposedBy: e.target.value })}
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {formErrors.proposedBy && (
              <p className="text-red-500 text-[10px]">{formErrors.proposedBy}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition"
            >
              Batalkan
            </button>
            <button
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-xs transition flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Kirim ke Approval Center</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
