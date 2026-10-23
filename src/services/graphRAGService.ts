import type { 
  DocumentItem, 
  GraphNode, 
  GraphEdge, 
  ConflictFinding, 
  RetrievedSnippet, 
  GraphRAGContext 
} from '../types';

/**
 * Ekstraksi token kata kunci penting dari pertanyaan pengguna
 */
export function extractKeywords(query: string): string[] {
  const stopWords = new Set([
    'apa', 'yang', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'pada', 'untuk', 
    'dengan', 'adalah', 'apakah', 'bagaimana', 'mana', 'tersebut', 'ada', 'atau',
    'bisa', 'tolong', 'jelaskan', 'berikan', 'berapa', 'seperti', 'dalam'
  ]);

  const clean = query.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
  const words = clean.split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));
  return Array.from(new Set(words));
}

/**
 * Scoring teks dokumen berdasarkan kemunculan kata kunci
 */
function scoreText(text: string, keywords: string[]): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      score += 3;
      // Bonus jika cocok dengan angka atau kode akun
      if (/\d/.test(kw)) score += 2;
    }
  }
  return score;
}

/**
 * Retrieval Berbasis Graph:
 * 1. Temukan dokumen awal (seed docs) yang paling relevan dengan kata kunci
 * 2. Telusuri graf relasi terkonfirmasi (1-2 hop traversal) untuk menemukan dokumen pendukung/rekonsiliasi
 * 3. Ambil cuplikan teks dan baris data relevan (tidak mengirim seluruh isi dokumen)
 */
export function retrieveGraphContext(
  query: string,
  documents: DocumentItem[],
  graphNodes: GraphNode[],
  graphEdges: GraphEdge[],
  findings: ConflictFinding[]
): GraphRAGContext {
  const keywords = extractKeywords(query);
  const snippets: RetrievedSnippet[] = [];
  const processedSnippetKeys = new Set<string>();

  // 1. Scoring awal setiap dokumen
  const docScores = new Map<string, number>();

  for (const doc of documents) {
    let score = 0;
    // Score nama & kategori
    score += scoreText(doc.name, keywords) * 2;
    score += scoreText(doc.category, keywords);
    
    // Score previewRows
    if (doc.previewRows) {
      for (const row of doc.previewRows) {
        const rowStr = Object.values(row).join(' ');
        score += scoreText(rowStr, keywords);
      }
    }

    // Score cuplikan teks
    if (doc.extractedText) {
      score += scoreText(doc.extractedText, keywords);
    }

    if (score > 0) {
      docScores.set(doc.id, score);
    }
  }

  // Ambil dokumen dengan skor tertinggi sebagai seed dokumen
  const seedDocs = documents
    .filter((d) => (docScores.get(d.id) || 0) > 0)
    .sort((a, b) => (docScores.get(b.id) || 0) - (docScores.get(a.id) || 0));

  // Tahap 8: Jika ada kata kunci namun tidak ada dokumen yang cocok sama sekali,
  // kembalikan konteks kosong agar asisten menjawab dengan status "bukti tidak
  // cukup" – jangan menyertakan dokumen yang tidak relevan secara paksa.
  // Fallback ke dokumen awal hanya berlaku ketika pertanyaan sama sekali tidak
  // memuat kata kunci yang bisa dicari.
  const primaryDocs =
    seedDocs.length > 0
      ? seedDocs.slice(0, 3)
      : keywords.length === 0
      ? documents.slice(0, 2)
      : [];

  if (primaryDocs.length === 0) {
    return { query, snippets: [], relatedFindings: [], confirmedRelations: [] };
  }

  // 2. Traversal Graph: Perluas pencarian ke dokumen yang terhubung melalui relasi terkonfirmasi
  const expandedDocIds = new Set<string>(primaryDocs.map((d) => d.id));
  const graphContextPaths = new Map<string, string>();
  const confirmedEdgeDocs: Array<{
    edge: GraphEdge;
    sourceDoc: DocumentItem;
    targetDoc: DocumentItem;
  }> = [];

  for (const edge of graphEdges) {
    if (!edge.isConfirmed) continue; // Aturan PRD: Abaikan edge yang belum dikonfirmasi

    const sourceNode = graphNodes.find((n) => n.id === edge.sourceNodeId);
    const targetNode = graphNodes.find((n) => n.id === edge.targetNodeId);
    if (!sourceNode || !targetNode) continue;

    const sourceDoc = documents.find((d) => d.id === sourceNode.documentId);
    const targetDoc = documents.find((d) => d.id === targetNode.documentId);
    if (!sourceDoc || !targetDoc) continue;

    confirmedEdgeDocs.push({ edge, sourceDoc, targetDoc });

    // Jika salah satu dokumen ada di primaryDocs, masukkan dokumen pasangannya
    if (expandedDocIds.has(sourceDoc.id) && !expandedDocIds.has(targetDoc.id)) {
      expandedDocIds.add(targetDoc.id);
      graphContextPaths.set(
        targetDoc.id, 
        `Terhubung via [${edge.relationshipType}] dari "${sourceDoc.name}"`
      );
    } else if (expandedDocIds.has(targetDoc.id) && !expandedDocIds.has(sourceDoc.id)) {
      expandedDocIds.add(sourceDoc.id);
      graphContextPaths.set(
        sourceDoc.id, 
        `Terhubung via [${edge.relationshipType}] ke "${targetDoc.name}"`
      );
    }
  }

  // Tahap 8: hanya laporkan relasi terkonfirmasi yang benar-benar relevan
  // dengan dokumen hasil penelusuran (salah satu ujungnya ikut terambil).
  const confirmedRelations = confirmedEdgeDocs
    .filter(({ sourceDoc, targetDoc }) =>
      expandedDocIds.has(sourceDoc.id) || expandedDocIds.has(targetDoc.id)
    )
    .map(({ edge, sourceDoc, targetDoc }) => ({
      sourceName: sourceDoc.name,
      targetName: targetDoc.name,
      relationshipType: edge.relationshipType,
    }));

  // 3. Kumpulkan cuplikan teks spesifik dari dokumen-dokumen terpilih (maks 4-5 cuplikan)
  for (const docId of expandedDocIds) {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) continue;

    const isViaGraph = graphContextPaths.has(docId);
    const graphPath = graphContextPaths.get(docId);

    // Ambil baris-baris tabel yang relevan
    if (doc.previewRows && doc.previewRows.length > 0) {
      const relevantRows = doc.previewRows.filter((r) => {
        if (keywords.length === 0) return true;
        const str = Object.values(r).join(' ').toLowerCase();
        return keywords.some((kw) => str.includes(kw));
      });

      const rowsToUse = relevantRows.length > 0 ? relevantRows.slice(0, 3) : doc.previewRows.slice(0, 2);

      rowsToUse.forEach((r, idx) => {
        const snippetText = Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(' | ');
        const key = `${doc.id}::row::${snippetText}`;
        if (!processedSnippetKeys.has(key)) {
          processedSnippetKeys.add(key);
          snippets.push({
            documentId: doc.id,
            documentName: doc.name,
            location: `Baris ${idx + 1} (${doc.category})`,
            snippet: snippetText,
            relevanceScore: docScores.get(doc.id) || 1,
            isViaGraph,
            graphPath,
          });
        }
      });
    } else if (doc.extractedText) {
      // Ambil potongan teks maksimal 250 karakter
      const lines = doc.extractedText.split('\n').filter((l) => l.trim().length > 0);
      const relevantLines = lines.filter((l) => {
        const lower = l.toLowerCase();
        return keywords.some((kw) => lower.includes(kw));
      });

      const selectedLines = relevantLines.length > 0 ? relevantLines.slice(0, 2) : lines.slice(0, 2);
      selectedLines.forEach((line) => {
        const snippetText = line.substring(0, 250);
        const key = `${doc.id}::line::${snippetText}`;
        if (!processedSnippetKeys.has(key)) {
          processedSnippetKeys.add(key);
          snippets.push({
            documentId: doc.id,
            documentName: doc.name,
            location: 'Teks Terekstrak',
            snippet: snippetText,
            relevanceScore: docScores.get(doc.id) || 1,
            isViaGraph,
            graphPath,
          });
        }
      });
    }
  }

  // 4. Integrasi Temuan Consistency Checker yang Relevan (PRD 6)
  const relatedFindings = findings.filter((f) => {
    // Cocokkan apakah dokumen temuan termasuk dalam dokumen yang diambil
    const docOverlap = f.documentIds.some((id) => expandedDocIds.has(id));
    if (!docOverlap) return false;

    // Atau jika ada kata kunci yang berhubungan dengan temuan/aturan
    if (keywords.length === 0) return true;
    const findStr = `${f.title} ${f.description} ${f.ruleId} ${f.status}`.toLowerCase();
    return keywords.some((kw) => findStr.includes(kw)) || docOverlap;
  });

  return {
    query,
    snippets: snippets.slice(0, 6), // Batasi panjang token konteks (PRD 4 & 7)
    relatedFindings: relatedFindings.slice(0, 3),
    confirmedRelations,
  };
}

/**
 * Fallback Generator Cerdas:
 * Digunakan jika Netlify Function / API Key eksternal belum dikonfigurasi.
 * Menghasilkan jawaban berdasar grounding bukti riil tanpa mengarang.
 */
export function generateLocalFallbackResponse(context: GraphRAGContext): {
  answer: string;
  citations: Array<{ id: string; documentId: string; documentName: string; location: string; snippet: string; connectionContext?: string }>;
  evidenceStatus: 'sufficient' | 'partial' | 'insufficient';
} {
  const { query, snippets, relatedFindings, confirmedRelations } = context;

  if (snippets.length === 0) {
    return {
      answer: `Informasi yang dapat menjawab pertanyaan "${query}" belum ditemukan pada dokumen yang tersedia dalam sesi kerja saat ini. Sistem menolak mengarang informasi tanpa bukti dokumen tertulis.`,
      citations: [],
      evidenceStatus: 'insufficient',
    };
  }

  const citations = snippets.map((s, idx) => ({
    id: `cite-${idx + 1}`,
    documentId: s.documentId,
    documentName: s.documentName,
    location: s.location,
    snippet: s.snippet,
    connectionContext: s.graphPath,
  }));

  // Buat ringkasan terstruktur berbasis bukti nyata
  let answer = `Berdasarkan penelusuran dokumen dan hubungan graf yang terkonfirmasi:\n\n`;

  // Cantumkan fakta dokumen
  answer += `**Fakta Dokumen yang Ditemukan:**\n`;
  snippets.forEach((s) => {
    answer += `• Dari **${s.documentName}** (${s.location}): "${s.snippet}"\n`;
  });

  // Cantumkan relasi graf jika ada
  if (confirmedRelations.length > 0) {
    answer += `\n**Konteks Hubungan Graf (Relationship Mapping):**\n`;
    confirmedRelations.forEach((r) => {
      answer += `• "${r.sourceName}" → [${r.relationshipType}] → "${r.targetName}"\n`;
    });
  }

  // Cantumkan temuan consistency checker jika ada
  if (relatedFindings.length > 0) {
    answer += `\n**Temuan Terkait (Consistency Checker):**\n`;
    relatedFindings.forEach((f) => {
      answer += `• **[Status: ${f.status}]** ${f.title}: ${f.description}\n`;
    });
  }

  answer += `\n> *Catatan Sistem: Jawaban ini disusun menggunakan mesin ekstraksi lokal ter-grounding (Netlify Fallback Mode). Setiap angka dan kutipan mengacu langsung pada bukti sumber di atas.*`;

  return {
    answer,
    citations,
    evidenceStatus: 'sufficient',
  };
}
