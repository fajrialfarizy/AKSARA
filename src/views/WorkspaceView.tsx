import { useMemo, useState } from 'react';
import { 
  FileText, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  FileSpreadsheet, 
  Layers, 
  ArrowRight, 
  Bot
} from 'lucide-react';
import type { DocumentItem, ConflictFinding, ProposalItem, NavigationTab, GraphNode, GraphEdge } from '../types';

interface WorkspaceViewProps {
  documents: DocumentItem[];
  conflicts: ConflictFinding[];
  proposals: ProposalItem[];
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  activeDocId: string;
  onSelectDoc: (id: string) => void;
  onNavigate: (tab: NavigationTab) => void;
}

/** Normalisasi angka sederhana untuk membandingkan nilai terformat (Rp, titik) */
const normalizeNumeric = (value: string): string => value.replace(/[^\d]/g, '');

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  documents,
  conflicts,
  graphNodes,
  graphEdges,
  activeDocId,
  onSelectDoc,
  onNavigate,
}) => {
  const [activeTabMobile, setActiveTabMobile] = useState<'explorer' | 'viewer' | 'inspection'>('viewer');
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: string; value: string } | null>(null);
  const [explorerSearch, setExplorerSearch] = useState('');

  const activeDoc = documents.find((d) => d.id === activeDocId) || documents[0];
  const activeDocIdSafe = activeDoc?.id ?? '';

  // Tahap 8: sorotan nilai konflik diturunkan dari temuan Conflict NYATA yang
  // melibatkan dokumen aktif – bukan teks hardcoded tertentu.
  const conflictNumericValues = useMemo(() => {
    const values = new Set<string>();
    if (!activeDocIdSafe) return values;
    for (const c of conflicts) {
      if (c.status !== 'Conflict') continue;
      if (!c.documentIds.includes(activeDocIdSafe)) continue;
      for (const cv of c.comparedValues ?? []) {
        const num = normalizeNumeric(String(cv.value));
        if (num.length >= 3) values.add(num);
      }
    }
    return values;
  }, [conflicts, activeDocIdSafe]);

  // Tahap 8: jalur penelusuran diturunkan dari graf relasi NYATA dokumen aktif
  const relatedEdges = useMemo(() => {
    return graphEdges
      .map((edge) => {
        const sourceDocId = graphNodes.find((n) => n.id === edge.sourceNodeId)?.documentId;
        const targetDocId = graphNodes.find((n) => n.id === edge.targetNodeId)?.documentId;
        return {
          edge,
          sourceDoc: documents.find((d) => d.id === sourceDocId),
          targetDoc: documents.find((d) => d.id === targetDocId),
        };
      })
      .filter(
        (r) => r.sourceDoc?.id === activeDocIdSafe || r.targetDoc?.id === activeDocIdSafe
      );
  }, [graphEdges, graphNodes, documents, activeDocIdSafe]);

  const visibleDocuments = useMemo(() => {
    const q = explorerSearch.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((d) => d.name.toLowerCase().includes(q));
  }, [documents, explorerSearch]);

  const relatedConflict = activeDoc
    ? conflicts.find(
        (c) =>
          c.status === 'Conflict' &&
          (c.documentIds.includes(activeDoc.id) ||
            c.sourceReferences.some((s) => s.documentName === activeDoc.name))
      )
    : undefined;

  // Tahap 8: keadaan aman ketika seluruh dokumen telah dihapus dari sesi
  // (difungsikan setelah semua hook agar jumlah hook tetap stabil).
  if (!activeDoc) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-12 text-center space-y-3">
        <FileText className="w-10 h-10 text-slate-300 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Belum Ada Dokumen dalam Sesi</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          Accounting Workspace membutuhkan minimal satu dokumen aktif. Unggah dokumen melalui
          Document Registry untuk mulai menelusuri isi dan bukti akuntansi.
        </p>
        <button
          onClick={() => onNavigate('registry')}
          className="inline-flex items-center space-x-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition"
        >
          <span>Buka Document Registry</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Workspace Header Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-700 text-white rounded-lg">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-slate-900">Accounting Workspace</h1>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                Pola Editor Tiga Panel (PRD 7.3)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Dokumen Aktif: <strong className="text-slate-800">{activeDoc.name}</strong> • Hash: <span className="font-mono text-[10px]">{activeDoc.originalHash.substring(0, 16)}...</span>
            </p>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden bg-slate-100 p-1 rounded-lg text-xs">
          <button
            onClick={() => setActiveTabMobile('explorer')}
            className={`flex-1 py-1.5 px-2 rounded-md font-medium transition ${
              activeTabMobile === 'explorer' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Explorer
          </button>
          <button
            onClick={() => setActiveTabMobile('viewer')}
            className={`flex-1 py-1.5 px-2 rounded-md font-medium transition ${
              activeTabMobile === 'viewer' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Viewer
          </button>
          <button
            onClick={() => setActiveTabMobile('inspection')}
            className={`flex-1 py-1.5 px-2 rounded-md font-medium transition ${
              activeTabMobile === 'inspection' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Inspeksi
          </button>
        </div>
      </div>

      {/* 3-Panel Desktop Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start min-h-[600px]">
        
        {/* PANEL KIRI: Document Explorer (PRD 7.3) */}
        <div className={`md:col-span-3 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4 ${
          activeTabMobile !== 'explorer' ? 'hidden md:block' : 'block'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Document Explorer</span>
              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-semibold text-slate-600">
                {documents.length} File
              </span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input 
                type="text" 
                placeholder="Cari dalam explorer..." 
                aria-label="Cari nama dokumen dalam explorer"
                value={explorerSearch}
                onChange={(e) => setExplorerSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            {visibleDocuments.length === 0 && (
              <p className="text-[11px] text-slate-400 italic text-center py-3">
                Tidak ada dokumen yang cocok dengan pencarian.
              </p>
            )}
            {visibleDocuments.map((doc) => {
              const isActive = doc.id === activeDoc.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => {
                    onSelectDoc(doc.id);
                    setActiveTabMobile('viewer');
                  }}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition flex items-start space-x-2.5 ${
                    isActive
                      ? 'bg-blue-50/80 border border-blue-200 text-blue-900 font-semibold'
                      : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                  }`}
                >
                  <FileText className={`w-4 h-4 shrink-0 mt-0.5 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                  <div className="overflow-hidden flex-1">
                    <p className="truncate">{doc.name}</p>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-normal mt-0.5">
                      <span className="uppercase">{doc.fileType}</span>
                      <span>•</span>
                      <span>{doc.relationshipsCount} relasi</span>
                    </div>
                  </div>
                  {doc.auditStatus === 'conflict' && (
                    <span className="w-2 h-2 rounded-full bg-red-600 shrink-0 mt-1.5" title="Ada konflik" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigate('relationship')}
              className="w-full py-2 px-3 rounded-lg border border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 text-blue-700 text-xs font-medium flex items-center justify-center space-x-1.5 transition"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Buka Relationship Canvas</span>
            </button>
          </div>
        </div>

        {/* PANEL TENGAH: Document Viewer (PRD 7.3) */}
        <div className={`md:col-span-6 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col ${
          activeTabMobile !== 'viewer' ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Viewer Toolbar */}
          <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 rounded-t-xl">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-800">{activeDoc.name}</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                {activeDoc.fileType}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <span className="hidden sm:inline">Klik angka untuk menelusuri sumber</span>
            </div>
          </div>

          {/* Viewer Content / Extracted Table */}
          <div className="p-4 overflow-x-auto min-h-[460px]">
            {activeDoc.previewRows && activeDoc.previewRows.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      {Object.keys(activeDoc.previewRows[0]).map((header) => (
                        <th key={header} className="py-2.5 px-3 uppercase text-[10px] tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeDoc.previewRows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-blue-50/30 transition">
                        {Object.entries(row).map(([key, val]) => {
                          const isHighlighted = 
                            selectedCell?.row === rowIdx && selectedCell?.col === key;
                          // Tahap 8: sorot merah hanya untuk nilai yang menjadi bagian
                          // temuan Conflict NYATA pada dokumen ini (bukan teks hardcoded).
                          const valNumeric = normalizeNumeric(String(val));
                          const isConflictValue =
                            valNumeric.length >= 3 && conflictNumericValues.has(valNumeric);
                          return (
                            <td 
                              key={key} 
                              onClick={() => setSelectedCell({ row: rowIdx, col: key, value: String(val) })}
                              className={`py-3 px-3 cursor-pointer select-none transition ${
                                isConflictValue 
                                  ? 'bg-red-50 text-red-700 font-bold border-l-2 border-red-600' 
                                  : isHighlighted
                                  ? 'bg-blue-100/70 text-blue-900 font-semibold ring-1 ring-blue-500'
                                  : 'text-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{String(val)}</span>
                                {isConflictValue && (
                                  <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded font-semibold ml-2">
                                    Temuan
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
                <FileText className="w-8 h-8 mb-2 opacity-50" />
                <p>Pratinjau konten dokumen belum diekstrak.</p>
              </div>
            )}

            {/* Selected Value Indicator */}
            {selectedCell && (
              <div className="mt-4 p-3 bg-blue-50/60 rounded-lg border border-blue-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Nilai Dipilih:</span>{' '}
                  <strong className="text-blue-900 font-bold">{selectedCell.value}</strong>{' '}
                  <span className="text-slate-400">({selectedCell.col})</span>
                </div>
                <button
                  onClick={() => setActiveTabMobile('inspection')}
                  className="text-blue-700 hover:text-blue-900 font-semibold flex items-center space-x-1"
                >
                  <span>Telusuri Sumber</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PANEL KANAN: Inspection Panel (PRD 7.3) */}
        <div className={`md:col-span-3 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4 ${
          activeTabMobile !== 'inspection' ? 'hidden md:block' : 'block'
        }`}>
          <div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Inspection Panel</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Analisis hubungan, temuan konflik, dan referensi sumber</p>
          </div>

          {/* Finding card */}
          {relatedConflict ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3.5 space-y-2.5">
              <div className="flex items-center space-x-1.5 text-red-700 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Konflik Terkonfirmasi</span>
              </div>
              <p className="text-xs font-semibold text-slate-800">{relatedConflict.title}</p>
              
              {relatedConflict.comparedValues && relatedConflict.comparedValues.length >= 2 && (
                <div className="text-[11px] space-y-1.5 text-slate-600 bg-white/80 p-2.5 rounded border border-red-100">
                  <div>
                    <span className="text-slate-400 font-medium">{relatedConflict.comparedValues[0].label}:</span>{' '}
                    <strong className="text-red-700">{String(relatedConflict.comparedValues[0].value)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">{relatedConflict.comparedValues[1].label}:</span>{' '}
                    <strong className="text-slate-800">{String(relatedConflict.comparedValues[1].value)}</strong>
                  </div>
                  {relatedConflict.difference && (
                    <div>
                      <span className="text-slate-400 font-medium">Selisih:</span>{' '}
                      <strong className="text-red-700">{relatedConflict.difference}</strong>
                    </div>
                  )}
                </div>
              )}

              <div className="text-[11px] text-slate-600 leading-relaxed">
                <strong>Alasan Pemeriksaan:</strong> {relatedConflict.reasoning}
              </div>

              <button
                onClick={() => onNavigate('approval')}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold py-2 px-3 rounded-md transition shadow-xs flex items-center justify-center space-x-1"
              >
                <span>Lihat Usulan di Approval Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-500">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
              <p className="font-semibold text-slate-700">Tidak ada konflik pada dokumen ini</p>
              <p className="text-[11px] text-slate-400 mt-1">Nilai telah sesuai dengan dokumen pendukung yang terhubung.</p>
            </div>
          )}

          {/* Traceability Route – diturunkan dari graf relasi nyata dokumen aktif */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
            <span className="font-semibold text-slate-800 block text-[11px]">Jalur Penelusuran (Traceability)</span>
            {relatedEdges.length > 0 ? (
              <div className="space-y-2 text-[11px]">
                {relatedEdges.map((r) => (
                  <div key={r.edge.id} className="bg-white border border-slate-200 rounded p-2 space-y-1">
                    <div
                      className={`flex items-center space-x-2 ${
                        r.sourceDoc?.id === activeDoc.id ? 'text-slate-900 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          r.sourceDoc?.id === activeDoc.id ? 'bg-blue-700' : 'bg-blue-600'
                        }`}
                      ></span>
                      <span className="truncate">{r.sourceDoc?.name ?? 'Dokumen sumber'}</span>
                    </div>
                    <div className="pl-3 text-[10px] text-slate-400">↓ {r.edge.relationshipType}</div>
                    <div
                      className={`flex items-center space-x-2 ${
                        r.targetDoc?.id === activeDoc.id
                          ? relatedConflict
                            ? 'text-slate-900 font-bold'
                            : 'text-slate-900 font-bold'
                          : 'text-slate-700'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          r.targetDoc?.id === activeDoc.id && relatedConflict
                            ? 'bg-red-600'
                            : 'bg-blue-600'
                        }`}
                      ></span>
                      <span className="truncate">{r.targetDoc?.name ?? 'Dokumen target'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                Dokumen ini belum memiliki relasi di Relationship Canvas. Tambahkan hubungan
                antardokumen untuk membangun jalur penelusuran bukti.
              </p>
            )}
          </div>

          {/* Pintasan GraphRAG Assistant (Tahap 5 – sudah tersedia) */}
          <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3 text-xs text-slate-600 space-y-1.5">
            <span className="font-semibold text-blue-900 block text-[11px]">GraphRAG Assistant</span>
            <p className="text-[11px] leading-relaxed">
              Ajukan pertanyaan tentang asal angka dan bukti dokumen ini langsung kepada
              asisten berbasis graf relasi terkonfirmasi.
            </p>
            <button
              onClick={() => onNavigate('graphrag')}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold py-1.5 px-3 rounded-md transition shadow-xs flex items-center justify-center space-x-1"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Tanya GraphRAG Assistant</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
