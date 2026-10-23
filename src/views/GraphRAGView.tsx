import { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Network, 
  FileText, 
  ExternalLink, 
  ShieldAlert, 
  ChevronRight, 
  RotateCcw,
  AlertTriangle,
  X
} from 'lucide-react';
import type { 
  DocumentItem, 
  GraphNode, 
  GraphEdge, 
  ConflictFinding, 
  ChatMessage, 
  CitationItem, 
  NavigationTab 
} from '../types';
import { retrieveGraphContext, generateLocalFallbackResponse } from '../services/graphRAGService';

interface GraphRAGViewProps {
  documents: DocumentItem[];
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  findings: ConflictFinding[];
  onNavigate: (tab: NavigationTab) => void;
  onOpenWorkspace: (docId: string) => void;
}

export const GraphRAGView: React.FC<GraphRAGViewProps> = ({
  documents,
  graphNodes,
  graphEdges,
  findings,
  onNavigate,
  onOpenWorkspace,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'assistant',
      content: 'Halo! Saya **GraphRAG Assistant AKSARA**. Saya siap membantu menelusuri asal angka, mengidentifikasi dokumen pendukung melalui graf relasi, dan menjelaskan temuan pemeriksaan akuntansi. Apa yang ingin Anda tanyakan?',
      timestamp: 'Sesi Aktif',
      evidenceStatus: 'sufficient',
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<CitationItem | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ke pesan terbaru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Contoh pertanyaan yang disediakan sesuai PRD Bab 2
  const exampleQuestions = [
    'Apa dasar angka beban operasional Rp125.000.000 pada laporan ini?',
    'Dokumen mana yang mendukung nilai sewa gedung pada jurnal?',
    'Bagaimana hubungan Laporan Laba Rugi dengan Jurnal Umum?',
    'Apakah ada temuan Consistency Checker yang relevan dengan beban operasional?',
  ];

  const handleSendMessage = async (queryToSend?: string) => {
    const query = (queryToSend || inputQuery).trim();
    if (!query || isLoading) return;

    setInputQuery('');

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      content: query,
      timestamp: timeStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // 1. Jalankan Graph-based Retrieval di client
      const context = retrieveGraphContext(query, documents, graphNodes, graphEdges, findings);

      let assistantAnswer = '';
      let citations: CitationItem[] = [];
      let isFallback = true;
      let evidenceStatus: 'sufficient' | 'partial' | 'insufficient' = 'sufficient';

      // 2. Coba panggil Netlify Serverless Function (jika server tersedia)
      try {
        const response = await fetch('/api/askAI', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(context),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.fallback === false && data.answer) {
            assistantAnswer = data.answer;
            isFallback = false;
            evidenceStatus = data.evidenceStatus || 'sufficient';
            citations = context.snippets.map((s, i) => ({
              id: `cite-${i + 1}`,
              documentId: s.documentId,
              documentName: s.documentName,
              location: s.location,
              snippet: s.snippet,
              connectionContext: s.graphPath,
            }));
          }
        }
      } catch {
        // Abaikan kegagalan jaringan backend dan langsung gunakan fallback grounding lokal
      }

      // 3. Fallback Grounding Cerdas (Pencarian lokal berbasis graf jika backend/API key belum aktif)
      if (isFallback || !assistantAnswer) {
        const fallbackRes = generateLocalFallbackResponse(context);
        assistantAnswer = fallbackRes.answer;
        citations = fallbackRes.citations;
        evidenceStatus = fallbackRes.evidenceStatus;
      }

      const assistantMsg: ChatMessage = {
        id: `msg-asst-${Date.now()}`,
        sender: 'assistant',
        content: assistantAnswer,
        timestamp: timeStr,
        citations,
        relatedFindings: context.relatedFindings,
        isFallback,
        evidenceStatus,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'assistant',
        content: 'Terjadi kendala saat memproses pertanyaan. Silakan periksa koneksi dokumen Anda.',
        timestamp: timeStr,
        evidenceStatus: 'insufficient',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-700 text-white rounded-lg shadow-xs">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-slate-900">GraphRAG Assistant</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                PRD 7.6 & FR-03 (Graph + Document Context)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Menjawab pertanyaan berbasis isi teks dokumen dan graf hubungan terkonfirmasi. Setiap angka menyertakan referensi sumber.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600">
            <Network className="w-3.5 h-3.5 text-blue-600" />
            <span>Konteks Graf: <strong>{graphEdges.filter((e) => e.isConfirmed).length} Relasi</strong></span>
          </span>
        </div>
      </div>

      {/* Main Grid: Chat Area + Sidebar Citations & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-h-[600px]">
        
        {/* Chat Conversation Column */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[640px] overflow-hidden">
          
          {/* Top Info Banner */}
          <div className="p-3 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Grounding Aktif: AI tidak mengarang angka dan mengacu pada potongan bukti dokumen yang diekstrak.</span>
            </div>
            <button
              onClick={() => onNavigate('relationship')}
              className="text-blue-700 hover:underline font-semibold flex items-center shrink-0 ml-2"
            >
              <span>Lihat Graf</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isUser ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {isUser ? <span className="text-xs font-bold">U</span> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`max-w-[85%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${
                        isUser
                          ? 'bg-blue-700 text-white rounded-tr-none'
                          : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-200'
                      }`}
                    >
                      {msg.content}

                      {/* Display related findings if any */}
                      {!isUser && msg.relatedFindings && msg.relatedFindings.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-1.5">
                          <span className="font-bold text-slate-700 block text-[11px] flex items-center space-x-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                            <span>Temuan Konsistensi yang Terkait:</span>
                          </span>
                          {msg.relatedFindings.map((f) => (
                            <div key={f.id} className="p-2 rounded bg-white border border-slate-200 text-[11px]">
                              <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] mr-1.5 ${
                                f.status === 'Conflict' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {f.status}
                              </span>
                              <strong className="text-slate-800">{f.title}:</strong> {f.description}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Citations badges inside message */}
                      {!isUser && msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200/80">
                          <span className="font-bold text-slate-700 block text-[11px] mb-1.5">
                            Kutipan Sumber yang Digunakan ({msg.citations.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.citations.map((cite) => (
                              <button
                                key={cite.id}
                                onClick={() => setSelectedCitation(cite)}
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 transition flex items-center space-x-1 shadow-2xs"
                              >
                                <FileText className="w-3 h-3 text-blue-600" />
                                <span className="truncate max-w-[140px]">{cite.documentName}</span>
                                <span className="text-[10px] text-slate-400">({cite.location})</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] text-slate-400 block px-1">
                      {msg.timestamp} {msg.isFallback && '• Fallback Mode'}
                    </span>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl rounded-tl-none text-xs text-slate-600 space-y-2 max-w-sm">
                  <div className="flex items-center space-x-2">
                    <RotateCcw className="w-3.5 h-3.5 text-blue-700 animate-spin" />
                    <span className="font-semibold text-slate-800">Menelusuri graf & mengekstrak bukti...</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Memeriksa kecocokan kata kunci dan hubungan antardokumen di Relationship Canvas.
                  </p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Suggestions */}
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Contoh:</span>
            {exampleQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-300 text-[11px] whitespace-nowrap transition shrink-0 shadow-2xs"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 border-t border-slate-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                placeholder="Tanyakan angka, dokumen pendukung, atau temuan rekonsiliasi..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                disabled={isLoading}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isLoading}
                className={`p-2.5 rounded-lg text-white font-semibold transition shadow-xs ${
                  !inputQuery.trim() || isLoading
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-blue-700 hover:bg-blue-800'
                }`}
                title="Kirim pertanyaan"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Sidebar: Citation Details & Transparency Panel */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Active Citation Card */}
          {selectedCitation ? (
            <div className="bg-white rounded-xl border-2 border-blue-400 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-blue-900 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-blue-700" />
                  <span>Detail Bukti Sitasi</span>
                </span>
                <button
                  onClick={() => setSelectedCitation(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Nama Dokumen:</span>
                  <span className="font-bold text-slate-800">{selectedCitation.documentName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block uppercase">Lokasi Sumber:</span>
                  <span className="font-medium text-slate-700">{selectedCitation.location}</span>
                </div>
                {selectedCitation.connectionContext && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Jalur Hubungan Graf:</span>
                    <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] block mt-0.5">
                      {selectedCitation.connectionContext}
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Potongan Teks Asli:</span>
                <p className="font-mono text-[11px] text-slate-800 leading-relaxed bg-white p-2 rounded border border-slate-200">
                  "{selectedCitation.snippet}"
                </p>
              </div>

              <button
                onClick={() => onOpenWorkspace(selectedCitation.documentId)}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs py-2 px-3 rounded-lg shadow-xs transition flex items-center justify-center space-x-1.5"
              >
                <span>Buka Dokumen di Accounting Workspace</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-xs text-slate-500 space-y-2">
              <span className="font-bold text-slate-800 block text-xs">Panel Sitasi Sumber</span>
              <p className="text-[11px] leading-relaxed">
                Klik salah satu lencana sitasi dokumen pada jawaban asisten untuk memeriksa rincian teks dan membuka lokasi dokumen di Accounting Workspace.
              </p>
            </div>
          )}

          {/* Graph Context Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3 text-xs">
            <span className="font-bold text-slate-900 block uppercase tracking-wider text-[11px]">
              Konteks Graf yang Aktif (PRD 10.2)
            </span>
            <p className="text-[11px] text-slate-500">
              GraphRAG menggunakan hubungan yang telah dikonfirmasi pengguna pada canvas sebagai pemandu penelusuran bukti.
            </p>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {graphEdges.filter((e) => e.isConfirmed).length > 0 ? (
                graphEdges
                  .filter((e) => e.isConfirmed)
                  .map((edge) => {
                    const sourceNode = graphNodes.find((n) => n.id === edge.sourceNodeId);
                    const targetNode = graphNodes.find((n) => n.id === edge.targetNodeId);
                    const sDoc = documents.find((d) => d.id === sourceNode?.documentId);
                    const tDoc = documents.find((d) => d.id === targetNode?.documentId);

                    return (
                      <div key={edge.id} className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px] space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-700 truncate max-w-[120px]">{sDoc?.name || 'Dokumen'}</span>
                          <span className="text-[10px] bg-white px-1.5 py-0.2 rounded border border-slate-200 font-medium">
                            {edge.relationshipType}
                          </span>
                        </div>
                        <div className="text-slate-600 truncate">→ {tDoc?.name || 'Dokumen'}</div>
                      </div>
                    );
                  })
              ) : (
                <div className="p-3 bg-slate-50 rounded text-slate-400 text-center text-[11px]">
                  Belum ada relasi terkonfirmasi di canvas.
                </div>
              )}
            </div>

            <button
              onClick={() => onNavigate('relationship')}
              className="w-full text-center text-xs font-semibold text-blue-700 hover:text-blue-900 py-1.5 bg-blue-50/70 hover:bg-blue-100 rounded-md transition"
            >
              Atur Graf di Relationship Canvas
            </button>
          </div>

          {/* Privacy & Grounding Disclaimer */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1.5">
            <span className="font-bold text-slate-800 flex items-center space-x-1">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
              <span>Privasi & Batasan AI (PRD 8 & 12.3):</span>
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              API key server tersimpan aman di environment variable dan tidak pernah diekspos ke browser. File biner mentah tidak pernah dikirim ke server penyedia AI; hanya potongan teks relevan yang diproses.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
