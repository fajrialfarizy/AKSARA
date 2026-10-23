import { 
  Files, 
  Network, 
  AlertTriangle, 
  CheckSquare, 
  ArrowRight, 
  Clock, 
  FileText, 
  Layers, 
  ShieldAlert, 
  HelpCircle, 
  ExternalLink 
} from 'lucide-react';
import type { DocumentItem, ActivityItem, ConflictFinding, ProposalItem, NavigationTab } from '../types';

interface DashboardViewProps {
  documents: DocumentItem[];
  activities: ActivityItem[];
  conflicts: ConflictFinding[];
  proposals: ProposalItem[];
  onNavigate: (tab: NavigationTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  documents,
  activities,
  conflicts,
  proposals,
  onNavigate,
}) => {
  const totalRelationships = documents.reduce((acc, doc) => acc + doc.relationshipsCount, 0);
  const confirmedConflicts = conflicts.filter((c) => c.status === 'Conflict');

  return (
    <div className="space-y-6">
      {/* Session Context Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-800 rounded-xl p-6 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-blue-600/60 text-blue-100 text-xs font-medium mb-2 border border-blue-400/30">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Simulasi Sesi In-Memory (Non-Persistent)</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Accounting Audit & Assurance Overview</h1>
            <p className="text-blue-100 text-sm mt-1 max-w-2xl">
              Telusuri asal angka dokumen akuntansi, petakan hubungan bukti, dan validasi konsistensi secara terstruktur dengan kendali manusia penuh.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('workspace')}
              className="bg-white text-blue-700 hover:bg-blue-50 font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center space-x-1.5 shadow-xs"
            >
              <span>Buka Accounting Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('relationship')}
              className="bg-blue-600/70 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-lg text-sm border border-blue-400/40 transition-colors flex items-center space-x-1.5"
            >
              <span>Relationship Canvas</span>
              <Layers className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Real Metric Cards based on PRD Section 7.1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div 
          onClick={() => onNavigate('registry')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dokumen Aktif</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg group-hover:bg-blue-100 transition">
              <Files className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-slate-900">{documents.length}</span>
            <span className="text-xs text-slate-500 ml-1.5">dokumen aktif</span>
          </div>
          <div className="mt-2 flex items-center text-xs text-blue-700 font-medium">
            <span>Kelola di Registry</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition" />
          </div>
        </div>

        {/* Metric 2 */}
        <div 
          onClick={() => onNavigate('relationship')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hubungan Dibuat</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg group-hover:bg-blue-100 transition">
              <Network className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-slate-900">{totalRelationships}</span>
            <span className="text-xs text-slate-500 ml-1.5">koneksi terpetakan</span>
          </div>
          <div className="mt-2 flex items-center text-xs text-blue-700 font-medium">
            <span>Buka Canvas Graf</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition" />
          </div>
        </div>

        {/* Metric 3 */}
        <div 
          onClick={() => onNavigate('consistency')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-red-300 hover:shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Konflik Terdeteksi</span>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-100 transition">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-red-600">{confirmedConflicts.length}</span>
            <span className="text-xs text-slate-500 ml-1.5">perlu verifikasi</span>
          </div>
          <div className="mt-2 flex items-center text-xs text-red-600 font-medium">
            <span>Periksa Temuan</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition" />
          </div>
        </div>

        {/* Metric 4 */}
        <div 
          onClick={() => onNavigate('approval')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Usulan Review</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg group-hover:bg-blue-100 transition">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold text-slate-900">{proposals.length}</span>
            <span className="text-xs text-slate-500 ml-1.5">menunggu persetujuan</span>
          </div>
          <div className="mt-2 flex items-center text-xs text-blue-700 font-medium">
            <span>Approval Center</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition" />
          </div>
        </div>
      </div>

      {/* Main Grid: Active Conflict Snapshot & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quick Audit Insights */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Perhatian Utama Pemeriksaan</h2>
                <p className="text-xs text-slate-500">Temuan inkonsistensi yang memenuhi kriteria aturan relasi akuntansi</p>
              </div>
              <button 
                onClick={() => onNavigate('consistency')}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center"
              >
                <span>Lihat Semua</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </button>
            </div>

            {confirmedConflicts.slice(0, 2).map((conflict) => {
              const valA = conflict.comparedValues?.[0];
              const valB = conflict.comparedValues?.[1];
              return (
                <div 
                  key={conflict.id}
                  className="p-4 rounded-lg bg-red-50/70 border border-red-200 space-y-3 mb-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-600 text-white uppercase tracking-wider">
                        Konflik Terkonfirmasi
                      </span>
                      <span className="text-xs font-semibold text-slate-800">{conflict.title}</span>
                    </div>
                    {conflict.difference && (
                      <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                        Selisih: {conflict.difference}
                      </span>
                    )}
                  </div>

                  {valA && valB && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-2.5 rounded border border-red-100">
                        <span className="text-slate-400 block text-[10px] font-medium uppercase">{valA.label}</span>
                        <span className="font-semibold text-slate-800 block truncate">{valA.documentName}</span>
                        <span className="text-blue-700 font-bold mt-1 block">{String(valA.value)}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded border border-red-100">
                        <span className="text-slate-400 block text-[10px] font-medium uppercase">{valB.label}</span>
                        <span className="font-semibold text-slate-800 block truncate">{valB.documentName}</span>
                        <span className="text-slate-800 font-bold mt-1 block">{String(valB.value)}</span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-slate-600 bg-white/70 p-2.5 rounded border border-red-100/60 leading-relaxed">
                    <strong className="text-slate-800">Alasan & Bukti:</strong> {conflict.reasoning}
                  </p>

                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button 
                      onClick={() => onNavigate('workspace')}
                      className="text-xs bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded font-medium"
                    >
                      Buka di Workspace
                    </button>
                    <button 
                      onClick={() => onNavigate('approval')}
                      className="text-xs bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded font-medium"
                    >
                      Tinjau Usulan Koreksi
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Document Summary Quick Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900">Dokumen dalam Sesi Pemeriksaan</h2>
              <button 
                onClick={() => onNavigate('registry')}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800"
              >
                Lihat di Registry
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Nama Dokumen</th>
                    <th className="py-2.5 px-3">Tipe</th>
                    <th className="py-2.5 px-3">Status Audit</th>
                    <th className="py-2.5 px-3">Relasi</th>
                    <th className="py-2.5 px-3 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-medium text-slate-900 flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="truncate max-w-[200px]">{doc.name}</span>
                      </td>
                      <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-slate-500">{doc.fileType}</td>
                      <td className="py-2.5 px-3">
                        {doc.auditStatus === 'conflict' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
                            Konflik
                          </span>
                        ) : doc.auditStatus === 'verified' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                            Terverifikasi
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                            Belum Terhubung
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700">{doc.relationshipsCount} relasi</td>
                      <td className="py-2.5 px-3 text-right">
                        <button 
                          onClick={() => onNavigate('workspace')}
                          className="text-blue-700 hover:bg-blue-50 px-2 py-1 rounded font-medium"
                        >
                          Periksa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Activity Log & Guidance */}
        <div className="space-y-4">
          {/* Quick Flow Guide based on PRD Section 17 */}
          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center space-x-1.5 text-blue-800 font-bold">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>Alur Kerja AKSARA (PRD Sesuai Acuan)</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-[11px] leading-relaxed">
              <li>Unggah dokumen ke <strong>Document Registry</strong>.</li>
              <li>Pilih dokumen untuk ditarik ke <strong>Relationship Mapping</strong>.</li>
              <li>Buat koneksi berarah & tentukan tipe relasi akuntansi.</li>
              <li>Jalankan <strong>Consistency Checker</strong> untuk memvalidasi angka.</li>
              <li>Gunakan <strong>Accounting Workspace</strong> untuk menelusuri rute bukti.</li>
              <li>Tinjau usulan koreksi di <strong>Approval Center</strong>.</li>
            </ol>
          </div>

          {/* Recent Activity Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Aktivitas Terkini Sesi</h2>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>

            <div className="relative pl-4 space-y-4 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {activities.map((act) => (
                <div key={act.id} className="relative text-xs">
                  <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white bg-blue-600"></div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{act.actor}</span>
                    <span className="text-[10px] text-slate-400">{act.timestamp}</span>
                  </div>
                  <p className="text-slate-600 mt-0.5">{act.action}:</p>
                  <p className="text-slate-900 font-medium truncate">{act.target}</p>
                </div>
              ))}
            </div>

            <button 
              onClick={() => onNavigate('audit')}
              className="w-full mt-4 text-center text-xs text-blue-700 hover:text-blue-900 font-medium py-1.5 bg-slate-50 hover:bg-slate-100 rounded-md transition"
            >
              Lihat Seluruh Log Audit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
