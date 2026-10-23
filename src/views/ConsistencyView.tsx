import { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  ShieldAlert, 
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  FileText,
  X,
  SlidersHorizontal,
  ExternalLink,
  ChevronRight,
  Database,
  Search,
  Sparkles
} from 'lucide-react';
import type { 
  ConflictFinding, 
  FindingStatus, 
  DocumentItem, 
  GraphEdge, 
  NavigationTab 
} from '../types';

interface ConsistencyViewProps {
  findings: ConflictFinding[];
  documents: DocumentItem[];
  graphEdges: GraphEdge[];
  onRunCheck: (selectedDocIds: string[]) => void;
  onNavigate: (tab: NavigationTab) => void;
  onOpenWorkspace: (docId: string) => void;
  isChecking: boolean;
}

export const ConsistencyView: React.FC<ConsistencyViewProps> = ({
  findings,
  documents,
  graphEdges,
  onRunCheck,
  onNavigate,
  onOpenWorkspace,
  isChecking,
}) => {
  // Status filter state
  const [statusFilter, setStatusFilter] = useState<'All' | FindingStatus>('All');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'demo' | 'live'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection of documents to check
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(documents.map((d) => d.id));

  // Tahap 8: seleksi yang tampil selalu dipadukan dengan dokumen yang benar-benar
  // masih ada di registri (ID dokumen yang sudah dihapus diabaikan secara turunan).
  const documentIdSet = useMemo(() => new Set(documents.map((d) => d.id)), [documents]);
  const effectiveSelectedDocIds = useMemo(
    () => selectedDocIds.filter((id) => documentIdSet.has(id)),
    [selectedDocIds, documentIdSet]
  );

  // Detail Modal inspection
  const [inspectedFinding, setInspectedFinding] = useState<ConflictFinding | null>(null);

  // Group status counts
  const statusCounts = useMemo(() => {
    return {
      all: findings.length,
      conflict: findings.filter((f) => f.status === 'Conflict').length,
      needsReview: findings.filter((f) => f.status === 'Needs Review').length,
      consistent: findings.filter((f) => f.status === 'Consistent').length,
      notComparable: findings.filter((f) => f.status === 'Not Comparable').length,
      insufficient: findings.filter((f) => f.status === 'Insufficient Evidence').length,
    };
  }, [findings]);

  // Filter findings
  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      const matchStatus = statusFilter === 'All' || f.status === statusFilter;
      const matchSource = 
        sourceFilter === 'all' || 
        (sourceFilter === 'demo' && f.isDemoFinding) || 
        (sourceFilter === 'live' && !f.isDemoFinding);
      const matchSearch = 
        f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.ruleId.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchSource && matchSearch;
    });
  }, [findings, statusFilter, sourceFilter, searchTerm]);

  // Hubungan terkonfirmasi di canvas untuk konteks rekomendasi
  const confirmedEdgeCount = graphEdges.filter((e) => e.isConfirmed).length;

  const handleToggleDocSelection = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const handleSelectAllDocs = () => {
    if (effectiveSelectedDocIds.length === documents.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(documents.map((d) => d.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900">Consistency Checker</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              PRD 7.5 & FR-04 (Rule Engine)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Membandingkan informasi antardokumen akuntansi berbasis graf relasi dan aturan terstruktur untuk mendeteksi ketidaksesuaian nilai secara objektif.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onRunCheck(effectiveSelectedDocIds)}
            disabled={isChecking || effectiveSelectedDocIds.length < 2}
            className={`font-semibold px-4 py-2.5 rounded-lg text-xs flex items-center space-x-2 shadow-xs transition $              {effectiveSelectedDocIds.length < 2
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : isChecking
                ? 'bg-blue-400 text-white cursor-wait'
                : 'bg-blue-700 hover:bg-blue-800 text-white'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Menjalankan Aturan...' : 'Jalankan Pemeriksaan (Run Check)'}</span>
          </button>
        </div>
      </div>

      {/* PRD Principle Notice (Visual rules & fraud disclaimer) */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-slate-700 flex items-start space-x-3 shadow-xs">
        <ShieldAlert className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-blue-950">Prinsip Pemeriksaan & Aturan Visual (PRD FR-04):</span>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Warna merah <strong>hanya digunakan untuk konflik nilai yang telah terkonfirmasi</strong> dengan bukti matematis/pos yang jelas. 
            Temuan Conflict <strong>bukan merupakan bukti kecurangan atau fraud</strong>. Perbedaan konteks (periode/mata uang) ditandai secara netral sebagai <em>Not Comparable</em>.
          </p>
        </div>
      </div>

      {/* Document Selection Strip for Checking Scope */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Cakupan Dokumen yang Diperiksa</span>
            <span className="text-[11px] text-slate-500">
              ({effectiveSelectedDocIds.length} dari {documents.length} dokumen dipilih)
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="text-slate-500 text-[11px] hidden sm:inline">
              Prioritas pemeriksaan mengikuti <strong>{confirmedEdgeCount} relasi terkonfirmasi</strong> di Relationship Canvas.
            </span>
            <button
              onClick={handleSelectAllDocs}
              className="text-blue-700 hover:text-blue-900 font-semibold"
            >
              {effectiveSelectedDocIds.length === documents.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
            </button>
          </div>
        </div>

        {/* Document Chips Selection */}
        <div className="flex flex-wrap gap-2 pt-1">
          {documents.map((doc) => {
            const isSelected = effectiveSelectedDocIds.includes(doc.id);
            return (
              <button
                key={doc.id}
                onClick={() => handleToggleDocSelection(doc.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center space-x-2 ${
                  isSelected
                    ? 'bg-blue-50 border-blue-600 text-blue-900 ring-1 ring-blue-500'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-600' : 'bg-slate-300'}`} />
                <span className="truncate max-w-[180px]">{doc.name}</span>
                <span className="text-[10px] text-slate-400 uppercase">({doc.fileType})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* All */}
        <button
          onClick={() => setStatusFilter('All')}
          className={`p-3 rounded-xl border text-left transition ${
            statusFilter === 'All'
              ? 'bg-blue-700 text-white border-blue-800 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
          }`}
        >
          <span className={`text-[10px] uppercase font-bold block ${statusFilter === 'All' ? 'text-blue-200' : 'text-slate-400'}`}>
            Semua Temuan
          </span>
          <span className="text-2xl font-bold mt-1 block">{statusCounts.all}</span>
        </button>

        {/* Conflict */}
        <button
          onClick={() => setStatusFilter('Conflict')}
          className={`p-3 rounded-xl border text-left transition ${
            statusFilter === 'Conflict'
              ? 'bg-red-600 text-white border-red-700 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-red-300'
          }`}
        >
          <span className={`text-[10px] uppercase font-bold block ${statusFilter === 'Conflict' ? 'text-red-100' : 'text-red-600'}`}>
            Conflict (Konflik)
          </span>
          <span className="text-2xl font-bold mt-1 block text-red-600 group-hover:text-red-700">
            {statusFilter === 'Conflict' ? statusCounts.conflict : <span className="text-red-600">{statusCounts.conflict}</span>}
          </span>
        </button>

        {/* Needs Review */}
        <button
          onClick={() => setStatusFilter('Needs Review')}
          className={`p-3 rounded-xl border text-left transition ${
            statusFilter === 'Needs Review'
              ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
          }`}
        >
          <span className={`text-[10px] uppercase font-bold block ${statusFilter === 'Needs Review' ? 'text-amber-100' : 'text-amber-700'}`}>
            Needs Review
          </span>
          <span className="text-2xl font-bold mt-1 block">{statusCounts.needsReview}</span>
        </button>

        {/* Consistent */}
        <button
          onClick={() => setStatusFilter('Consistent')}
          className={`p-3 rounded-xl border text-left transition ${
            statusFilter === 'Consistent'
              ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
          }`}
        >
          <span className={`text-[10px] uppercase font-bold block ${statusFilter === 'Consistent' ? 'text-emerald-100' : 'text-emerald-700'}`}>
            Consistent
          </span>
          <span className="text-2xl font-bold mt-1 block">{statusCounts.consistent}</span>
        </button>

        {/* Not Comparable */}
        <button
          onClick={() => setStatusFilter('Not Comparable')}
          className={`p-3 rounded-xl border text-left transition ${
            statusFilter === 'Not Comparable'
              ? 'bg-slate-700 text-white border-slate-800 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
          }`}
        >
          <span className={`text-[10px] uppercase font-bold block ${statusFilter === 'Not Comparable' ? 'text-slate-200' : 'text-slate-600'}`}>
            Not Comparable
          </span>
          <span className="text-2xl font-bold mt-1 block">{statusCounts.notComparable}</span>
        </button>

        {/* Insufficient Evidence */}
        <button
          onClick={() => setStatusFilter('Insufficient Evidence')}
          className={`p-3 rounded-xl border text-left transition ${
            statusFilter === 'Insufficient Evidence'
              ? 'bg-slate-600 text-white border-slate-700 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
          }`}
        >
          <span className={`text-[10px] uppercase font-bold block ${statusFilter === 'Insufficient Evidence' ? 'text-slate-200' : 'text-slate-500'}`}>
            Kurang Bukti
          </span>
          <span className="text-2xl font-bold mt-1 block">{statusCounts.insufficient}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari judul temuan atau aturan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Source Filter (Demo vs Live Hasil Pemeriksaan) */}
        <div className="flex items-center space-x-2 w-full md:w-auto text-xs">
          <span className="text-slate-400 font-medium">Dataset:</span>
          <div className="flex items-center bg-slate-50 border border-slate-200 p-1 rounded-md">
            <button
              onClick={() => setSourceFilter('all')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition ${
                sourceFilter === 'all' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({findings.length})
            </button>
            <button
              onClick={() => setSourceFilter('demo')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition flex items-center space-x-1 ${
                sourceFilter === 'demo' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3 h-3" />
              <span>Dataset Demo (5 Kasus)</span>
            </button>
            <button
              onClick={() => setSourceFilter('live')}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition flex items-center space-x-1 ${
                sourceFilter === 'live' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Hasil Rule Engine</span>
            </button>
          </div>
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {filteredFindings.length > 0 ? (
          filteredFindings.map((finding) => {
            const isConflict = finding.status === 'Conflict';
            const isConsistent = finding.status === 'Consistent';
            const isReview = finding.status === 'Needs Review';

            return (
              <div
                key={finding.id}
                className={`bg-white rounded-xl border transition p-5 shadow-xs space-y-4 ${
                  isConflict
                    ? 'border-2 border-red-400 bg-red-50/20'
                    : isConsistent
                    ? 'border-emerald-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Header row of card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`p-2 rounded-lg text-white shrink-0 mt-0.5 ${
                        isConflict
                          ? 'bg-red-600'
                          : isConsistent
                          ? 'bg-emerald-600'
                          : isReview
                          ? 'bg-amber-600'
                          : 'bg-slate-600'
                      }`}
                    >
                      {isConflict ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : isConsistent ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <HelpCircle className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                            isConflict
                              ? 'bg-red-600 text-white'
                              : isConsistent
                              ? 'bg-emerald-100 text-emerald-800'
                              : isReview
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {finding.status}
                        </span>

                        {finding.isDemoFinding && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Dataset Demo Terkontrol
                          </span>
                        )}

                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-mono text-slate-500">{finding.ruleId}</span>
                      </div>
                      <h2 className="text-sm font-bold text-slate-900 mt-1">{finding.title}</h2>
                    </div>
                  </div>

                  {finding.difference && (
                    <div className="flex items-center space-x-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 shrink-0">
                      <span>Selisih: {finding.difference}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed">
                  {finding.description}
                </p>

                {/* Compared Values (if available) */}
                {finding.comparedValues && finding.comparedValues.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {finding.comparedValues.map((cv, idx) => (
                      <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
                          {cv.label}
                        </span>
                        <span className="font-semibold text-slate-800 block text-xs mt-0.5 truncate">
                          {cv.documentName}
                        </span>
                        <span className={`text-sm font-bold block mt-1 ${isConflict ? 'text-red-700' : 'text-blue-900'}`}>
                          {String(cv.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reasoning summary */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
                  <span className="font-bold text-slate-900 block text-[11px]">Penjelasan Logika Temuan:</span>
                  <p className="text-[11px] leading-relaxed text-slate-600">{finding.reasoning}</p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] text-slate-400 font-mono">Terdeteksi: {finding.detectedAt}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setInspectedFinding(finding)}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition flex items-center space-x-1"
                    >
                      <span>Lihat Bukti Sumber</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    {isConflict && (
                      <button
                        onClick={() => onNavigate('approval')}
                        className="px-3 py-1.5 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-md shadow-xs transition flex items-center space-x-1"
                      >
                        <span>Tinjau Koreksi</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto opacity-70" />
            <h3 className="text-sm font-bold text-slate-900">Tidak Ada Temuan dengan Filter Saat Ini</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tidak ditemukan konflik atau catatan verifikasi yang cocok dengan status atau pencarian yang Anda pilih.
            </p>
            <button
              onClick={() => {
                setStatusFilter('All');
                setSourceFilter('all');
                setSearchTerm('');
              }}
              className="text-xs text-blue-700 font-semibold underline"
            >
              Reset Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* DETAIL MODAL: Menampilkan Sumber, Konteks, Aturan & Bukti Lengkap */}
      {inspectedFinding && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2.5 rounded-lg text-white ${
                    inspectedFinding.status === 'Conflict'
                      ? 'bg-red-600'
                      : inspectedFinding.status === 'Consistent'
                      ? 'bg-emerald-600'
                      : 'bg-slate-700'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        inspectedFinding.status === 'Conflict'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {inspectedFinding.status}
                    </span>
                    <span className="text-xs font-mono text-slate-400">#{inspectedFinding.id}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">{inspectedFinding.title}</h3>
                </div>
              </div>
              <button 
                onClick={() => setInspectedFinding(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto space-y-4 text-xs pr-1 flex-1">
              {/* Context bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Aturan Pemeriksaan</span>
                  <span className="font-bold text-slate-800 text-xs block">{inspectedFinding.ruleId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tipe Aturan</span>
                  <span className="font-bold text-slate-800 text-xs block">{inspectedFinding.comparisonContext.ruleType || 'General'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Periode / Basis</span>
                  <span className="font-bold text-slate-800 text-xs block">{inspectedFinding.comparisonContext.period || 'Sesuai Sesi'}</span>
                </div>
              </div>

              {/* Source References */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-2">
                  Referensi & Bukti Kutipan Dokumen Asli (Audit Trail):
                </span>
                <div className="space-y-2">
                  {inspectedFinding.sourceReferences.map((ref, idx) => (
                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 text-blue-900 font-bold">
                          <FileText className="w-3.5 h-3.5 text-blue-700" />
                          <span>{ref.documentName}</span>
                        </div>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                          Lokasi: {ref.location}
                        </span>
                      </div>
                      {ref.extractedSnippet && (
                        <p className="bg-slate-50 p-2 rounded text-[11px] font-mono text-slate-700 border border-slate-100 mt-1">
                          "{ref.extractedSnippet}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Reasoning */}
              <div className="bg-blue-50/60 p-3.5 rounded-lg border border-blue-200 space-y-1">
                <span className="font-bold text-blue-950 block">Alasan & Rekomendasi Audit:</span>
                <p className="leading-relaxed text-slate-700">{inspectedFinding.reasoning}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Rule Engine Konsistensi AKSARA v1.0</span>
              <div className="flex items-center space-x-2">
                {inspectedFinding.documentIds[0] && (
                  <button
                    onClick={() => {
                      const docId = inspectedFinding.documentIds[0];
                      setInspectedFinding(null);
                      onOpenWorkspace(docId);
                    }}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold flex items-center space-x-1"
                  >
                    <span>Buka Sumber di Workspace</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setInspectedFinding(null)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
                >
                  Tutup
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
