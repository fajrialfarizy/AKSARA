import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileText, FileSpreadsheet, CheckCircle2, AlertCircle, X } from 'lucide-react';
import type { DocumentItem } from '../types';

export interface DocumentNodeData {
  document: DocumentItem;
  onRemoveNode?: (nodeId: string) => void;
  nodeId: string;
}

export const DocumentNode = memo(({ data, selected }: { data: DocumentNodeData; selected?: boolean }) => {
  const { document: doc, onRemoveNode, nodeId } = data;

  return (
    <div
      className={`relative w-64 bg-white rounded-xl border-2 transition-all shadow-sm ${
        selected
          ? 'border-blue-600 shadow-md ring-2 ring-blue-100'
          : 'border-slate-200 hover:border-blue-300'
      }`}
    >
      {/* Target Handle (Top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white cursor-crosshair transition hover:!scale-125"
      />

      {/* Header of Node */}
      <div className="p-3 border-b border-slate-100 flex items-start justify-between bg-slate-50/70 rounded-t-xl">
        <div className="flex items-center space-x-2 overflow-hidden">
          <div className="p-1.5 bg-blue-50 text-blue-700 rounded-md shrink-0">
            {doc.fileType === 'pdf' ? (
              <FileText className="w-4 h-4" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div className="overflow-hidden">
            <span className="font-semibold text-xs text-slate-900 block truncate" title={doc.name}>
              {doc.name}
            </span>
            <span className="text-[10px] text-slate-400 uppercase font-mono">
              {doc.fileType} • {doc.fileSize}
            </span>
          </div>
        </div>

        {onRemoveNode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveNode(nodeId);
            }}
            title="Keluarkan dari Canvas (Tetap ada di Registry)"
            className="text-slate-400 hover:text-red-600 p-0.5 rounded transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Body of Node */}
      <div className="p-3 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Status Pemrosesan</span>
          {doc.processingStatus === 'ready' ? (
            <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              <span>Siap Dianalisis</span>
            </span>
          ) : doc.processingStatus === 'unreadable' ? (
            <span className="inline-flex items-center space-x-1 text-[10px] text-amber-700 font-medium bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
              <AlertCircle className="w-3 h-3" />
              <span>Scan / Non-Teks</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 text-[10px] text-slate-600 font-medium bg-slate-100 px-1.5 py-0.2 rounded">
              <span>{doc.processingStatus}</span>
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>Kategori:</span>
          <span className="font-medium text-slate-700 truncate max-w-[120px]">{doc.category}</span>
        </div>
      </div>

      {/* Source Handle (Bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white cursor-crosshair transition hover:!scale-125"
      />
    </div>
  );
});

DocumentNode.displayName = 'DocumentNode';
