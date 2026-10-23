interface NetlifyContext {
  query: string;
  snippets: Array<{
    documentId: string;
    documentName: string;
    location: string;
    snippet: string;
    graphPath?: string;
  }>;
  relatedFindings: Array<{
    title: string;
    status: string;
    description: string;
  }>;
  confirmedRelations: Array<{
    sourceName: string;
    targetName: string;
    relationshipType: string;
  }>;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * Netlify Function GraphRAG AKSARA (Tahap 8).
 *
 * API key penyedia AI HANYA dibaca dari environment variable server Netlify
 * (AI_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY) dan tidak pernah dikirim ke
 * browser. Konfigurasi opsional:
 *   - AI_API_URL : endpoint chat-completions kompatibel OpenAI
 *                  (default: https://api.openai.com/v1/chat/completions)
 *   - AI_MODEL   : nama model (default: gpt-4o-mini)
 *
 * Jika API key belum dikonfigurasi atau penyedia gagal dihubungi, fungsi ini
 * mengembalikan { fallback: true } agar klien beralih ke mesin ekstraksi
 * lokal berbasis graf (lihat graphRAGService.generateLocalFallbackResponse).
 */
export default async (req: Request) => {
  // Hanya menerima metode POST
  if (req.method !== 'POST') {
    return json({ error: 'Metode request tidak diizinkan. Gunakan POST.' }, 405);
  }

  try {
    let body: NetlifyContext;
    try {
      body = (await req.json()) as NetlifyContext;
    } catch {
      return json(
        {
          fallback: true,
          message: 'Bukan JSON yang valid. Beralih ke pencarian lokal berbasis graf.',
        },
        400
      );
    }

    const { query, snippets, relatedFindings, confirmedRelations } = body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return json(
        {
          fallback: true,
          message: 'Pertanyaan kosong. Beralih ke pencarian lokal berbasis graf.',
        },
        400
      );
    }

    // Periksa API key di environment variable server (PRD 4: Tidak boleh ada di frontend)
    const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Kembalikan respons yang menginstruksikan client untuk beralih ke Fallback Mode
      return json({
        fallback: true,
        message:
          'AI_API_KEY belum dikonfigurasi di environment variable Netlify. Menggunakan mesin pencarian dan ekstraksi lokal berbasis graf.',
      });
    }

    const providerUrl =
      process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
    const model = process.env.AI_MODEL || 'gpt-4o-mini';

    const prompt = `Anda adalah GraphRAG Assistant untuk AKSARA (Accounting Knowledge & Secure Audit Record Assurance).
Jawablah pertanyaan pengguna HANYA berdasarkan bukti potongan teks dan hubungan graf berikut.
Jangan mengarang angka, akun, atau transaksi yang tidak ada dalam sumber.
Jika bukti tidak cukup untuk menjawab, katakan terus terang bahwa informasi belum tersedia dalam dokumen sesi ini.

KONTEKS DOKUMEN:
${snippets.map((s, i) => `[${i + 1}] ${s.documentName} (${s.location}): "${s.snippet}" ${s.graphPath ? `[${s.graphPath}]` : ''}`).join('\n') || '(tidak ada potongan bukti yang relevan)'}

HUBUNGAN GRAF TERKONFIRMASI:
${confirmedRelations.map((r) => `- "${r.sourceName}" [${r.relationshipType}] "${r.targetName}"`).join('\n') || '(tidak ada relasi terkonfirmasi)'}

TEMUAN KONSISTENSI TERKAIT:
${relatedFindings.map((f) => `- [${f.status}] ${f.title}: ${f.description}`).join('\n') || '(tidak ada temuan terkait)'}

PERTANYAAN PENGGUNA: "${query}"

Berikan jawaban terstruktur dalam bahasa Indonesia yang menyertakan referensi sumber [1], [2], dst.`;

    // Panggilan nyata ke penyedia AI kompatibel OpenAI dari sisi server.
    const aiResponse = await fetch(providerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'Anda adalah asisten audit akuntansi yang hanya menjawab berdasarkan bukti dokumen yang diberikan, dalam bahasa Indonesia, tanpa mengarang informasi.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`Penyedia AI merespons dengan status ${aiResponse.status}`);
    }

    const aiData = (await aiResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const answer = aiData.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      throw new Error('Respons penyedia AI tidak memuat jawaban.');
    }

    return json({
      fallback: false,
      answer,
      evidenceStatus: 'sufficient',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    return json({
      fallback: true,
      error: errorMsg,
      message: 'Gagal menghubungi penyedia AI. Beralih ke fallback grounding lokal.',
    });
  }
};
