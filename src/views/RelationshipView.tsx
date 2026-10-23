import { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { 
  Plus, 
  Trash2, 
  HelpCircle, 
  FileText, 
  FileSpreadsheet, 
  Check, 
  X, 
  Layers, 
  Info,
  Link as LinkIcon
} from 'lucide-react';

import type { DocumentItem, GraphNode, GraphEdge, RelationshipType } from '../types';
import { RELATIONSHIP_OPTIONS } from '../types';
import { DocumentNode } from '../components/DocumentNode';
import { CustomRelationshipEdge } from '../components/CustomRelationshipEdge';

interface RelationshipViewProps {
  documents: DocumentItem[];
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  onAddNode: (documentId: string, position?: { x: number; y: number }) => void;
  onRemoveNode: (nodeId: string) => void;
  onUpdateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  onAddEdge: (sourceNodeId: string, targetNodeId: string, relationshipType: RelationshipType) => void;
  onUpdateEdgeType: (edgeId: string, newType: RelationshipType) => void;
  onRemoveEdge: (edgeId: string) => void;
  onOpenWorkspace: (docId: string) => void;
}

export const RelationshipView: React.FC<RelationshipViewProps> = ({
  documents,
  graphNodes,
  graphEdges,
  onAddNode,
  onRemoveNode,
  onUpdateNodePosition,
  onAddEdge,
  onUpdateEdgeType,
  onRemoveEdge,
  onOpenWorkspace,
}) => {
  // Modal state untuk memilih dokumen dari Registry ke Canvas
  const [isSelectDocModalOpen, setIsSelectDocModalOpen] = useState(false);

  // Dialog pemilihan jenis hubungan setelah koneksi dibuat
  const [pendingConnection, setPendingConnection] = useState<{ source: string; target: string } | null>(null);
  const [selectedRelationType, setSelectedRelationType] = useState<RelationshipType>('Mendukung');

  // State inspeksi: Node atau Edge yang sedang dipilih pengguna
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Filter dokumen yang belum ada di canvas
  const documentsNotInCanvas = useMemo(() => {
    const nodeDocIds = new Set(graphNodes.map((n) => n.documentId));
    return documents.filter((d) => !nodeDocIds.has(d.id));
  }, [documents, graphNodes]);

  // Node types registration untuk React Flow
  const nodeTypes = useMemo(() => ({ documentNode: DocumentNode }), []);
  const edgeTypes = useMemo(() => ({ relationshipEdge: CustomRelationshipEdge }), []);

  // Map graphNodes ke React Flow Node model
  const flowNodes: Node[] = useMemo(() => {
    return graphNodes.map((gn) => {
      const doc = documents.find((d) => d.id === gn.documentId);
      if (!doc) {
        return {
          id: gn.id,
          position: gn.position,
          data: { label: 'Dokumen tidak ditemukan' },
        };
      }
      return {
        id: gn.id,
        type: 'documentNode',
        position: gn.position,
        selected: selectedNodeId === gn.id,
        data: {
          document: doc,
          nodeId: gn.id,
          onRemoveNode: () => onRemoveNode(gn.id),
        },
      };
    });
  }, [graphNodes, documents, selectedNodeId, onRemoveNode]);

  // Map graphEdges ke React Flow Edge model
  const flowEdges: Edge[] = useMemo(() => {
    return graphEdges.map((ge) => ({
      id: ge.id,
      source: ge.sourceNodeId,
      target: ge.targetNodeId,
      type: 'relationshipEdge',
      selected: selectedEdgeId === ge.id,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: selectedEdgeId === ge.id ? '#1D4ED8' : '#3B82F6',
        width: 16,
        height: 16,
      },
      data: {
        relationshipType: ge.relationshipType,
        isConfirmed: ge.isConfirmed,
        onSelectEdge: (id: string) => {
          setSelectedEdgeId(id);
          setSelectedNodeId(null);
        },
        onDeleteEdge: (id: string) => onRemoveEdge(id),
      },
    }));
  }, [graphEdges, selectedEdgeId, onRemoveEdge]);

  // React Flow Handlers
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Tangani perpindahan posisi node
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          onUpdateNodePosition(change.id, change.position);
        }
      });
      // Sinkronkan state lokal React Flow
      applyNodeChanges(changes, flowNodes);
    },
    [flowNodes, onUpdateNodePosition]
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      changes.forEach((change) => {
        if (change.type === 'remove') {
          onRemoveEdge(change.id);
        }
      });
      applyEdgeChanges(changes, flowEdges);
    },
    [flowEdges, onRemoveEdge]
  );

  // Ketika pengguna menarik konektor dari satu node ke node lainnya
  const handleConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      if (connection.source === connection.target) {
        alert('Dokumen tidak dapat dihubungkan ke dirinya sendiri.');
        return;
      }

      // Cek apakah koneksi ini sudah ada
      const existing = graphEdges.some(
        (e) => (e.sourceNodeId === connection.source && e.targetNodeId === connection.target) ||
               (e.sourceNodeId === connection.target && e.targetNodeId === connection.source)
      );
      if (existing) {
        alert('Hubungan antara kedua dokumen ini sudah ada di canvas.');
        return;
      }

      // Buka dialog untuk memilih jenis hubungan
      setPendingConnection({ source: connection.source, target: connection.target });
      setSelectedRelationType('Mendukung');
    },
    [graphEdges]
  );

  const handleConfirmConnection = () => {
    if (!pendingConnection) return;
    onAddEdge(pendingConnection.source, pendingConnection.target, selectedRelationType);
    setPendingConnection(null);
  };

  // Objek yang sedang diinspeksi di panel kanan
  const inspectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    const gn = graphNodes.find((n) => n.id === selectedNodeId);
    if (!gn) return null;
    const doc = documents.find((d) => d.id === gn.documentId);
    return { graphNode: gn, document: doc };
  }, [selectedNodeId, graphNodes, documents]);

  const inspectedEdge = useMemo(() => {
    if (!selectedEdgeId) return null;
    const ge = graphEdges.find((e) => e.id === selectedEdgeId);
    if (!ge) return null;
    const sourceNode = graphNodes.find((n) => n.id === ge.sourceNodeId);
    const targetNode = graphNodes.find((n) => n.id === ge.targetNodeId);
    const sourceDoc = documents.find((d) => d.id === sourceNode?.documentId);
    const targetDoc = documents.find((d) => d.id === targetNode?.documentId);
    return { edge: ge, sourceDoc, targetDoc };
  }, [selectedEdgeId, graphEdges, graphNodes, documents]);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base font-bold text-slate-900">Relationship Mapping Canvas</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              PRD 7.4 & FR-02 (React Flow)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Petakan graf relasi berarah antar dokumen akuntansi. Tarik garis antar node untuk menentukan jenis hubungan.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
            <span className="font-semibold text-blue-700">{graphNodes.length}</span> Dokumen di Canvas
            <span className="text-slate-300">•</span>
            <span className="font-semibold text-blue-700">{graphEdges.length}</span> Relasi Terkonfirmasi
          </div>
          <button
            onClick={() => setIsSelectDocModalOpen(true)}
            disabled={documentsNotInCanvas.length === 0}
            className={`font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 shadow-xs transition ${
              documentsNotInCanvas.length === 0
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-blue-700 hover:bg-blue-800 text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Dokumen ke Canvas</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-h-[600px]">
        
        {/* Left Sidebar: Document Registry Palette */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Document Palette</span>
            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">
              Registry ({documents.length})
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Dokumen dari Document Registry yang belum ditempatkan di canvas dapat ditambahkan di bawah ini:
          </p>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {documents.map((doc) => {
              const isAlreadyInCanvas = graphNodes.some((n) => n.documentId === doc.id);
              return (
                <div
                  key={doc.id}
                  className={`p-2.5 rounded-lg border text-xs transition flex items-center justify-between ${
                    isAlreadyInCanvas
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center space-x-2 overflow-hidden flex-1 mr-2">
                    {doc.fileType === 'pdf' ? (
                      <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <div className="overflow-hidden">
                      <span className="font-semibold block text-slate-800 truncate" title={doc.name}>
                        {doc.name}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize">{doc.category}</span>
                    </div>
                  </div>

                  {isAlreadyInCanvas ? (
                    <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 bg-slate-200 rounded shrink-0">
                      Di Canvas
                    </span>
                  ) : (
                    <button
                      onClick={() => onAddNode(doc.id)}
                      className="px-2 py-1 text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-semibold transition shrink-0"
                    >
                      + Tambah
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-slate-700 text-[11px] space-y-1">
            <span className="font-bold text-blue-900 block flex items-center space-x-1">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span>Prinsip Hubungan (PRD 10.3):</span>
            </span>
            <p className="text-slate-600 leading-relaxed">
              Memindahkan posisi node tidak mengubah makna hubungan. Garis koneksi merepresentasikan konteks penelusuran akuntansi bagi GraphRAG.
            </p>
          </div>
        </div>

        {/* Central Canvas: React Flow Interactive Workspace */}
        <div className="lg:col-span-6 bg-slate-50 rounded-xl border border-slate-200 shadow-inner relative min-h-[600px] h-[640px] flex flex-col overflow-hidden">
          
          {/* React Flow Container */}
          <div className="flex-1 w-full h-full relative">
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onConnect={handleConnect}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              attributionPosition="bottom-left"
              onNodeClick={(_, node) => {
                setSelectedNodeId(node.id);
                setSelectedEdgeId(null);
              }}
              onEdgeClick={(_, edge) => {
                setSelectedEdgeId(edge.id);
                setSelectedNodeId(null);
              }}
              onPaneClick={() => {
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
              }}
            >
              <Background color="#cbd5e1" gap={16} size={1} />
              <Controls position="top-right" showInteractive={false} />
            </ReactFlow>

            {/* Empty State Banner (PRD 3: "Mulai petakan hubungan dokumenmu") */}
            {graphNodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center z-10">
                <div className="p-4 bg-white/90 backdrop-blur-xs rounded-2xl border border-slate-200 shadow-lg max-w-md pointer-events-auto space-y-3">
                  <div className="p-3 bg-blue-50 text-blue-700 rounded-full inline-flex">
                    <Layers className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Mulai petakan hubungan dokumenmu</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Tambahkan dokumen dari Document Registry ke canvas, kemudian tarik konektor dari titik bawah satu dokumen ke titik atas dokumen lain untuk membuat hubungan akuntansi.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsSelectDocModalOpen(true)}
                    className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition"
                  >
                    Pilih Dokumen dari Registry
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom status bar */}
          <div className="bg-white/90 backdrop-blur-xs px-4 py-2 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between z-10">
            <span>Tarik titik biru pada node untuk menghubungkan dokumen. Klik garis untuk mengedit atau menghapus.</span>
            <span className="font-semibold text-blue-700">PRD FR-02</span>
          </div>
        </div>

        {/* Right Panel: Selected Node or Edge Properties */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
          <div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Panel Properti</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Pilih node atau garis hubungan untuk melihat & mengubah detail</p>
          </div>

          {/* If Edge Selected */}
          {inspectedEdge ? (
            <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center space-x-1">
                  <LinkIcon className="w-3.5 h-3.5 text-blue-700" />
                  <span>Relasi Terpilih</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                  <Check className="w-3 h-3" />
                  <span>Terkonfirmasi</span>
                </span>
              </div>

              <div className="text-[11px] space-y-2 text-slate-700 bg-white p-2.5 rounded border border-blue-100">
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Dokumen Sumber:</span>
                  <span className="font-bold text-slate-800 block truncate">{inspectedEdge.sourceDoc?.name || 'Dokumen'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Dokumen Target:</span>
                  <span className="font-bold text-slate-800 block truncate">{inspectedEdge.targetDoc?.name || 'Dokumen'}</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Ubah Jenis Hubungan:</label>
                <select
                  value={inspectedEdge.edge.relationshipType}
                  onChange={(e) => onUpdateEdgeType(inspectedEdge.edge.id, e.target.value as RelationshipType)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-md p-2 font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  {RELATIONSHIP_OPTIONS.map((opt) => (
                    <option key={opt.type} value={opt.type}>
                      {opt.type}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1 italic">
                  {RELATIONSHIP_OPTIONS.find((o) => o.type === inspectedEdge.edge.relationshipType)?.description}
                </p>
              </div>

              <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between">
                <button
                  onClick={() => onRemoveEdge(inspectedEdge.edge.id)}
                  className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center space-x-1 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Relasi</span>
                </button>
                <button
                  onClick={() => setSelectedEdgeId(null)}
                  className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                >
                  Tutup
                </button>
              </div>
            </div>
          ) : inspectedNode ? (
            /* If Node Selected */
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {inspectedNode.document?.name || 'Dokumen'}
                </span>
                <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                  {inspectedNode.document?.fileType}
                </span>
              </div>

              <div className="text-[11px] space-y-1.5 text-slate-600 bg-white p-2.5 rounded border border-slate-200">
                <p>• Kategori: <strong>{inspectedNode.document?.category}</strong></p>
                <p>• Ukuran File: <strong>{inspectedNode.document?.fileSize}</strong></p>
                <p>• Status: <strong className="text-emerald-700 capitalize">{inspectedNode.document?.processingStatus}</strong></p>
                <p>• SHA-256: <span className="font-mono text-[10px] block truncate text-slate-400">{inspectedNode.document?.sha256}</span></p>
              </div>

              <div className="pt-2 flex flex-col space-y-2">
                <button
                  onClick={() => inspectedNode.document && onOpenWorkspace(inspectedNode.document.id)}
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold py-1.5 px-3 rounded-md transition shadow-xs text-center"
                >
                  Buka Dokumen di Workspace
                </button>
                <button
                  onClick={() => onRemoveNode(inspectedNode.graphNode.id)}
                  className="w-full bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 text-xs font-medium py-1.5 px-3 rounded-md transition flex items-center justify-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Keluarkan dari Canvas</span>
                </button>
              </div>
            </div>
          ) : (
            /* Empty state for inspection */
            <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-400 space-y-2">
              <HelpCircle className="w-6 h-6 mx-auto text-slate-300" />
              <p>Klik salah satu node atau garis relasi untuk melihat detail dan konfigurasinya.</p>
            </div>
          )}

          {/* Quick relation types guide */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1.5">
            <span className="font-semibold text-slate-800 block">Daftar Jenis Relasi Akuntansi:</span>
            <ul className="space-y-1 text-slate-600">
              {RELATIONSHIP_OPTIONS.map((opt) => (
                <li key={opt.type} className="leading-snug">
                  <strong className="text-slate-800">• {opt.type}:</strong> {opt.description}
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>

      {/* MODAL 1: Dialog Pemilihan Jenis Hubungan setelah Drag-and-Connect */}
      {pendingConnection && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                  <LinkIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tentukan Jenis Hubungan Dokumen</h3>
                  <p className="text-xs text-slate-500">Pilih makna relasi akuntansi antara kedua dokumen</p>
                </div>
              </div>
              <button 
                onClick={() => setPendingConnection(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {RELATIONSHIP_OPTIONS.map((opt) => (
                <label
                  key={opt.type}
                  onClick={() => setSelectedRelationType(opt.type)}
                  className={`p-3 rounded-lg border text-xs flex items-start space-x-3 cursor-pointer transition ${
                    selectedRelationType === opt.type
                      ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-600'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="relationshipType"
                    checked={selectedRelationType === opt.type}
                    onChange={() => setSelectedRelationType(opt.type)}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">{opt.type}</span>
                    <span className="text-[11px] text-slate-500">{opt.description}</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
              <button
                onClick={() => setPendingConnection(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmConnection}
                className="px-4 py-2 text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded-lg shadow-xs transition"
              >
                Konfirmasi Hubungan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Dialog Memilih Dokumen dari Registry ke Canvas */}
      {isSelectDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pilih Dokumen dari Document Registry</h3>
                <p className="text-xs text-slate-500">Tambahkan dokumen ke canvas Relationship Mapping</p>
              </div>
              <button 
                onClick={() => setIsSelectDocModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {documentsNotInCanvas.length > 0 ? (
                documentsNotInCanvas.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 transition flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden mr-3">
                      {doc.fileType === 'pdf' ? (
                        <FileText className="w-5 h-5 text-blue-700 shrink-0" />
                      ) : (
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      <div className="overflow-hidden">
                        <span className="font-bold text-xs text-slate-900 block truncate" title={doc.name}>
                          {doc.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {doc.category} • {doc.fileSize}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onAddNode(doc.id);
                        setIsSelectDocModalOpen(false);
                      }}
                      className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold shrink-0 transition"
                    >
                      Pilih ke Canvas
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  Semua dokumen dari Registry sudah berada di canvas.
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end border-t border-slate-100">
              <button
                onClick={() => setIsSelectDocModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
