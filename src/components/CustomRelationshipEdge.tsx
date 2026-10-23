import { 
  BaseEdge, 
  EdgeLabelRenderer, 
  getSmoothStepPath, 
  type EdgeProps 
} from '@xyflow/react';
import { X } from 'lucide-react';
import type { RelationshipType } from '../types';

export interface CustomEdgeData {
  relationshipType: RelationshipType;
  isConfirmed: boolean;
  onSelectEdge?: (edgeId: string) => void;
  onDeleteEdge?: (edgeId: string) => void;
  [key: string]: unknown;
}

export function CustomRelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as CustomEdgeData | undefined;
  const relationshipType = edgeData?.relationshipType || 'Mendukung';
  const isConfirmed = edgeData?.isConfirmed ?? true;
  const isSymmetric = relationshipType === 'Direkonsiliasi dengan';

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={isSymmetric ? undefined : markerEnd}
        style={{
          ...style,
          stroke: selected ? '#1D4ED8' : isConfirmed ? '#3B82F6' : '#94A3B8',
          strokeWidth: selected ? 2.5 : 2,
          strokeDasharray: isConfirmed ? undefined : '5,5',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              edgeData?.onSelectEdge?.(id);
            }}
            className={`group inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border shadow-xs transition cursor-pointer select-none ${
              selected
                ? 'bg-blue-700 text-white border-blue-800 ring-2 ring-blue-300'
                : isConfirmed
                ? 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                : 'bg-slate-100 text-slate-600 border-slate-300'
            }`}
          >
            <span>{relationshipType}</span>
            {edgeData?.onDeleteEdge && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  edgeData.onDeleteEdge?.(id);
                }}
                title="Hapus relasi ini"
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-red-100 hover:text-red-700 transition ml-1"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
