import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler from '../netlify/functions/askAI';

const validBody = {
  query: 'Berapa beban sewa pada jurnal?',
  snippets: [
    {
      documentId: 'doc-002',
      documentName: 'Jurnal_Umum_September_2026.xlsx',
      location: 'Baris 1',
      snippet: 'JU-09-01 | Akun: 6-200 Beban Sewa | Debit: 80.000.000',
    },
  ],
  relatedFindings: [],
  confirmedRelations: [
    {
      sourceName: 'Invoice_Sewa_Gedung_Q3.pdf',
      targetName: 'Jurnal_Umum_September_2026.xlsx',
      relationshipType: 'Mendukung',
    },
  ],
};

const ENV_KEYS = ['AI_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY', 'AI_API_URL', 'AI_MODEL'] as const;
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  for (const key of ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  vi.unstubAllGlobals();
});

const post = (body: unknown) =>
  handler(
    new Request('http://localhost/api/askAI', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  );

describe('askAI Netlify Function', () => {
  it('menolak metode selain POST dengan status 405', async () => {
    const res = await handler(new Request('http://localhost/api/askAI', { method: 'GET' }));
    expect(res.status).toBe(405);
  });

  it('mengembalikan fallback berbahasa Indonesia untuk body yang bukan JSON', async () => {
    const res = await post('bukan-json{');
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.fallback).toBe(true);
    expect(data.message).toContain('lokal');
  });

  it('menolak pertanyaan kosong', async () => {
    const res = await post({ ...validBody, query: '   ' });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.fallback).toBe(true);
  });

  it('memberi tanda fallback jika API key belum dikonfigurasi', async () => {
    const res = await post(validBody);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.fallback).toBe(true);
    expect(data.message).toContain('belum dikonfigurasi');
  });

  it('memanggil penyedia AI kompatibel OpenAI dari sisi server dengan key dari env', async () => {
    process.env.AI_API_KEY = 'kunci-rahasia-server';
    process.env.AI_API_URL = 'https://provider.example/v1/chat/completions';
    process.env.AI_MODEL = 'model-uji';

    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Beban sewa tercatat Rp80.000.000 [1].' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await post(validBody);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.fallback).toBe(false);
    expect(data.answer).toContain('Rp80.000.000');

    // Key dikirim sebagai header Authorization di sisi server, bukan di body
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://provider.example/v1/chat/completions');
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer kunci-rahasia-server');
    const requestBody = String(init?.body);
    expect(requestBody).toContain('model-uji');
    expect(requestBody).toContain('JU-09-01'); // potongan bukti dikirim sebagai konteks

    // Key tidak pernah bocor ke respons klien
    const rawText = JSON.stringify(data);
    expect(rawText).not.toContain('kunci-rahasia-server');
  });

  it('mengembalikan fallback ketika penyedia AI gagal dihubungi', async () => {
    process.env.AI_API_KEY = 'kunci-rahasia-server';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('internal', { status: 500 }))
    );

    const res = await post(validBody);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.fallback).toBe(true);
    expect(data.message).toContain('fallback');
  });
});
