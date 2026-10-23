import { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet,
  X,
  FileCheck,
  HardDrive,
  Eye,
  Hash,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import type { DocumentItem, FileType, ProcessingStatus, NavigationTab } from '../types';

interface RegistryViewProps {
  documents: DocumentItem[];
  onUploadFile: (file: File) => Promise<void>;
  onDeleteDocument: (docId: string) => void;
  onOpenWorkspace: (docId: string) => void;
  onNavigate: (tab: NavigationTab) => void;
  isProcessing: boolean;
  processingProgress: string | null;
  errorMessage: string | null;
  onClearError: () => void;
}

export const RegistryView: React.FC<RegistryViewProps> = ({
  documents,
  onUploadFile,
  onDeleteDocument,
  onOpenWorkspace,
  isProcessing,
  processingProgress,
  errorMessage,
  onClearError,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | FileType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ProcessingStatus>('all');
  const [isDragOver, setIsDragOver] = useState(false);
  const [detailModalDoc, setDetailModalDoc] = useState<DocumentItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxCapacity = 5;
  const isAtCapacity = documents.length >= maxCapacity;

  // Filter & Search Logic
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.fileType === typeFilter;
    const matchesStatus = statusFilter === 'all' || doc.processingStatus === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    onUploadFile(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Capacity status */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900">Document Registry</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              PRD 7.2 & FR-01
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Pusat penyimpanan dokumen aktif dalam sesi. Dokumen yang diunggah disimpan di Document Registry terlebih dahulu dan tidak otomatis masuk ke canvas.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf,.csv,.xlsx"
            onChange={(e) => handleFileSelect(e.target.files)}
            disabled={isProcessing || isAtCapacity}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || isAtCapacity}
            className={`font-semibold px-4 py-2.5 rounded-lg text-xs flex items-center space-x-2 shadow-xs transition ${
              isAtCapacity
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : isProcessing
                ? 'bg-blue-400 text-white cursor-wait'
                : 'bg-blue-700 hover:bg-blue-800 text-white'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>{isProcessing ? 'Memproses File...' : 'Pilih File untuk Diunggah'}</span>
          </button>
        </div>
      </div>

      {/* Capacity Warning Banner (Only shown if at capacity or error) */}
      {isAtCapacity && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start space-x-3 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Batas Kapasitas Sesi Aktif Tercapai</span>
            <p className="text-amber-800 leading-relaxed">
              Sesi browser saat ini tidak dapat menampung dokumen baru. Untuk mengunggah dokumen lain, silakan hapus salah satu dokumen yang sudah tidak diperlukan dari tabel di bawah.
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-900 flex items-start justify-between shadow-xs">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Gagal Memproses Dokumen:</span>
              <p className="text-red-700 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button 
            onClick={onClearError}
            className="text-red-500 hover:text-red-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Processing Loader Banner */}
      {isProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-center space-x-3 shadow-xs animate-pulse">
          <RotateCcw className="w-4 h-4 text-blue-700 animate-spin shrink-0" />
          <div>
            <span className="font-bold">Sedang memproses & menghitung hash dokumen...</span>
            <p className="text-blue-700 text-[11px] mt-0.5">{processingProgress || 'Mengekstrak metadata dan teks.'}</p>
          </div>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      {!isAtCapacity && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
            isDragOver 
              ? 'border-blue-600 bg-blue-50/70' 
              : 'border-slate-300 bg-white hover:bg-slate-50/70'
          }`}
        >
          <div className="max-w-md mx-auto flex flex-col items-center space-y-2">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-full">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                Tarik & letakkan file di sini, atau <span className="text-blue-700 underline">klik untuk mencari</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Format didukung: <strong>PDF</strong> (dengan teks dapat dibaca), <strong>CSV</strong> (pemisah koma/titik-koma), dan <strong>XLSX</strong>.
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-1 text-[10px] text-slate-400">
              <span>Keamanan: SHA-256 dihitung di browser (In-Memory)</span>
            </div>
          </div>
        </div>
      )}

      {/* Search, Filter & Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama file..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* File Type Filter */}
          <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 p-1 rounded-md text-xs">
            <span className="text-slate-400 text-[11px] px-1 font-medium">Tipe:</span>
            {(['all', 'pdf', 'csv', 'xlsx'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                  typeFilter === t
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t === 'all' ? 'Semua' : t.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 p-1 rounded-md text-xs">
            <span className="text-slate-400 text-[11px] px-1 font-medium">Status:</span>
            {(['all', 'ready', 'unreadable', 'failed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                  statusFilter === s
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s === 'all' ? 'Semua' : s === 'ready' ? 'Siap' : s === 'unreadable' ? 'Scan/Tak Terbaca' : 'Gagal'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Documents Table or Empty State */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {filteredDocs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nama Dokumen</th>
                  <th className="py-3 px-4">Tipe</th>
                  <th className="py-3 px-4">Ukuran</th>
                  <th className="py-3 px-4">Waktu Upload</th>
                  <th className="py-3 px-4">Status Pemrosesan</th>
                  <th className="py-3 px-4">Integritas (SHA-256)</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc) => {
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 bg-blue-50 text-blue-700 rounded-md shrink-0">
                            {doc.fileType === 'pdf' ? (
                              <FileText className="w-4 h-4" />
                            ) : (
                              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <span className="font-semibold block text-slate-900 truncate max-w-[220px]" title={doc.name}>
                              {doc.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              ID: {doc.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {doc.fileType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {doc.fileSize}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {doc.uploadedAt}
                      </td>
                      <td className="py-3 px-4">
                        {doc.processingStatus === 'ready' ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Siap Dianalisis</span>
                          </span>
                        ) : doc.processingStatus === 'unreadable' ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Teks Belum Terbaca (Scan)</span>
                          </span>
                        ) : doc.processingStatus === 'processing' ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                            <span>Memproses...</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Gagal</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                        <div className="flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="truncate max-w-[120px]" title={doc.sha256}>
                            {doc.sha256.substring(0, 14)}...
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => setDetailModalDoc(doc)}
                            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition flex items-center space-x-1"
                            title="Lihat Detail & Metadata"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span className="hidden sm:inline">Detail</span>
                          </button>
                          <button
                            onClick={() => onOpenWorkspace(doc.id)}
                            className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-medium transition"
                            title="Buka Dokumen di Workspace"
                          >
                            Buka
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Hapus "${doc.name}" dari sesi kerja aktif?`)) {
                                onDeleteDocument(doc.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded transition"
                            title="Hapus dari sesi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 px-4 text-center">
            <div className="p-3 bg-slate-100 text-slate-400 rounded-full inline-flex mb-3">
              <HardDrive className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {documents.length === 0 ? 'Belum Ada Dokumen dalam Sesi' : 'Tidak Ada Dokumen yang Cocok'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {documents.length === 0 
                ? 'Unggah file PDF, CSV, atau XLSX untuk memulai sesi pemeriksaan akuntansi Anda.'
                : 'Coba ubah kata kunci pencarian atau sesuaikan filter tipe dan status dokumen.'}
            </p>
          </div>
        )}
      </div>

      {/* DETAIL MODAL (Menampilkan metadata ekstraksi & SHA-256 lengkap) */}
      {detailModalDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 truncate max-w-md">{detailModalDoc.name}</h3>
                  <p className="text-xs text-slate-500">ID: {detailModalDoc.id} • Tipe: {detailModalDoc.fileType.toUpperCase()}</p>
                </div>
              </div>
              <button 
                onClick={() => setDetailModalDoc(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto space-y-4 text-xs pr-1 flex-1">
              {/* Hash Info */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center space-x-1">
                  <Hash className="w-3.5 h-3.5 text-blue-700" />
                  <span>Kriptografis SHA-256 (Web Crypto API)</span>
                </span>
                <p className="font-mono text-slate-800 break-all bg-white p-2 rounded border border-slate-200 text-[11px]">
                  {detailModalDoc.sha256}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-semibold block">UKURAN FILE</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block">{detailModalDoc.fileSize}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-semibold block">WAKTU UPLOAD</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block">{detailModalDoc.uploadedAt}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-semibold block">STATUS EKSTRAKSI</span>
                  <span className="font-bold text-emerald-700 text-xs mt-0.5 block capitalize">{detailModalDoc.processingStatus}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-semibold block">STATUS INTEGRITAS</span>
                  <span className="font-bold text-blue-700 text-xs mt-0.5 block capitalize">{detailModalDoc.integrityStatus}</span>
                </div>
              </div>

              {/* Specific Sheet / Page Info */}
              {detailModalDoc.metadata && (
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Metadata Struktur Dokumen:</span>
                  <div className="text-[11px] space-y-1 text-slate-700">
                    {detailModalDoc.metadata.pageCount !== undefined && (
                      <p>• Jumlah Halaman: <strong>{detailModalDoc.metadata.pageCount} halaman</strong></p>
                    )}
                    {detailModalDoc.metadata.sheetCount !== undefined && (
                      <p>• Jumlah Sheet Excel: <strong>{detailModalDoc.metadata.sheetCount} sheet</strong></p>
                    )}
                    {detailModalDoc.metadata.rowCount !== undefined && (
                      <p>• Baris Data Terbaca: <strong>{detailModalDoc.metadata.rowCount} baris</strong></p>
                    )}
                    {detailModalDoc.metadata.headers && detailModalDoc.metadata.headers.length > 0 && (
                      <p>• Kolom/Header Terdeteksi: <span className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">{detailModalDoc.metadata.headers.join(', ')}</span></p>
                    )}
                    {detailModalDoc.metadata.notes && (
                      <p className="text-slate-500 italic mt-1">{detailModalDoc.metadata.notes}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Text Extract Snippet */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Cuplikan Ekstraksi Teks (Preview In-Memory):
                </span>
                <div className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {detailModalDoc.extractedText ? (
                    detailModalDoc.extractedText
                  ) : detailModalDoc.processingStatus === 'unreadable' ? (
                    <span className="text-amber-400">PDF hasil scan (tidak memuat teks digital yang dapat diekstrak oleh parser dasar). Tidak ada teks tiruan yang dikarang.</span>
                  ) : (
                    <span className="text-slate-400">Belum ada konten teks yang diekstrak.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Sesi Browser Sementara (Non-Persistent)</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const id = detailModalDoc.id;
                    setDetailModalDoc(null);
                    onOpenWorkspace(id);
                  }}
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold"
                >
                  Buka di Workspace
                </button>
                <button
                  onClick={() => setDetailModalDoc(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
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
