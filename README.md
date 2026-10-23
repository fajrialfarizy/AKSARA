# AKSARA — Accounting Knowledge & Secure Audit Record Assurance

Prototipe aplikasi web untuk penelusuran asal angka dokumen akuntansi, pemetaan hubungan bukti,
pemeriksaan konsistensi antardokumen, usulan koreksi berbasis AI dengan persetujuan manusia
(Human-in-the-Loop), serta verifikasi integritas SHA-256 dan log audit tambah-saja.

Seluruh antarmuka menggunakan bahasa Indonesia. Data sesi hanya tersimpan **di memori browser**
(tanpa database, tanpa backend persisten) dan hilang saat halaman dimuat ulang.

## Modul Aplikasi

| Modul | Halaman | Keterangan |
| --- | --- | --- |
| Document Registry | `src/views/RegistryView.tsx` | Unggah PDF/CSV/XLSX, hash SHA-256 dihitung dari byte berkas asli via Web Crypto |
| Accounting Workspace | `src/views/WorkspaceView.tsx` | Penelusuran nilai dalam tabel pratinjau + jalur relasi nyata |
| Relationship Mapping | `src/views/RelationshipView.tsx` | Graf relasi antardokumen (React Flow) |
| Consistency Checker | `src/views/ConsistencyView.tsx` | Rule engine antardokumen (Conflict / Needs Review / Consistent / Not Comparable / Insufficient Evidence) |
| GraphRAG Assistant | `src/views/GraphRAGView.tsx` | Tanya-jawab berbasis retrieval graf + sitasi sumber |
| AI-Assisted Workspace | `src/views/AIWorkspaceView.tsx` | Usulan koreksi berbasis temuan (selalu berstatus usulan) |
| Approval Center | `src/views/ApprovalView.tsx` | Tinjau/setujui/tolak usulan; persetujuan membuat versi dokumen baru |
| Integrity & Audit Log | `src/views/AuditLogView.tsx` | Verifikasi integritas, riwayat versi, log audit append-only, buku besar & kuorum simulasi |

Logika inti dipisahkan ke `src/services/` (documentProcessor, consistencyRuleEngine,
graphRAGService, integrityService, versionService, auditService, proposalService) dan
diuji dengan Vitest.

## Perintah Pengembangan

```bash
npm install        # instal dependensi
npm run dev        # server pengembangan Vite
npm test           # jalankan seluruh unit test (Vitest)
npm run lint       # lint dengan Oxlint
npm run build      # build produksi: tsc -b && vite build -> dist/
```

## Penerapan ke Netlify

Konfigurasi build sudah tersedia di `netlify.toml`:

- Build command: `npm run build`
- Publish directory: `dist`
- Redirect SPA `/* -> /index.html` (aplikasi single-page tanpa router sisi server)
- Redirect `/api/* -> /.netlify/functions/:splat` untuk function GraphRAG

### Variabel Environment yang Dibutuhkan

Function Netlify `netlify/functions/askAI.ts` membaca API key **hanya dari environment
variable server** (tidak pernah dikirim ke browser):

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `AI_API_KEY` (atau `GEMINI_API_KEY` / `OPENAI_API_KEY`) | Opsional | API key penyedia AI. Tanpa ini, aplikasi tetap berjalan penuh dengan mode fallback lokal berbasis graf. |
| `AI_API_URL` | Opsional | Endpoint chat-completions kompatibel OpenAI. Default: `https://api.openai.com/v1/chat/completions`. |
| `AI_MODEL` | Opsional | Nama model yang dipakai. Default: `gpt-4o-mini`. |

Jika variabel AI belum diisi, GraphRAG Assistant otomatis memakai mesin ekstraksi lokal
berbasis graf (status "Fallback Mode" ditampilkan pada jawaban) — bukan error.

Jangan pernah menaruh API key di kode sisi klien (`src/`), `.env` yang ikut ter-bundle,
atau variabel dengan prefiks `VITE_`.

## Batasan Prototipe (Jujur dan Disengaja)

- **Sesi browser saja**: seluruh dokumen, graf, temuan, usulan, versi, dan log audit hidup di
  memori React selama sesi. Muat ulang halaman mengembalikan data demo awal. Tidak ada
  penyimpanan permanen.
- **Log audit bersifat tambah-saja** melalui antarmuka aplikasi, tetapi bukan catatan yang
  immutable atau tahan manipulasi.
- **Buku besar & kuorum pada halaman Integrity & Audit Log adalah simulasi visual** — bukan
  blockchain publik/permissioned, dan partisipan kuorum bukan validator independen.
- **Hash SHA-256** membuktikan kesamaan byte berkas dengan referensi tertentu, bukan kebenaran
  isi dokumen. Ketidaksesuaian hash bukan bukti fraud.
- **AI tidak menerapkan perubahan**: setiap koreksi tetap berstatus usulan sampai manusia
  menyetujui di Approval Center.
- Belum ada autentikasi/otorisasi produksi, basis data, atau jaringan blockchain nyata.

## Teknologi

React 19 + TypeScript + Vite, Tailwind CSS v4, React Flow (`@xyflow/react`), PDF.js, PapaParse,
SheetJS (xlsx), Lucide icons, Vitest, Oxlint.
