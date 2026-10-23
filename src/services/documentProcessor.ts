import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import type { FileType, ProcessingStatus, DocumentMetadata } from '../types';
import { sha256OfBytes } from './integrityService';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface FileProcessingResult {
  fileType: FileType;
  fileSizeFormatted: string;
  sha256: string;
  processingStatus: ProcessingStatus;
  extractedText: string;
  metadata: DocumentMetadata;
  previewRows?: Array<Record<string, string | number>>;
  errorMessage?: string;
}

/**
 * Menghitung hash SHA-256 dari byte asli file menggunakan browser Web Crypto API
 */
export async function calculateSHA256(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  return sha256OfBytes(arrayBuffer);
}

/**
 * Format ukuran file ke representasi yang mudah dibaca (KB / MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Deteksi tipe file yang didukung AKSARA
 */
export function detectFileType(file: File): FileType | null {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.csv')) return 'csv';
  if (name.endsWith('.xlsx')) return 'xlsx';
  return null;
}

/**
 * Memproses dan mengekstrak isi teks/tabel dari file
 */
export async function processDocumentFile(file: File): Promise<FileProcessingResult> {
  const fileType = detectFileType(file);
  const fileSizeFormatted = formatFileSize(file.size);

  if (!fileType) {
    throw new Error(`Format file "${file.name}" tidak didukung. AKSARA hanya mendukung PDF, CSV, dan XLSX.`);
  }

  // 1. Hitung SHA-256
  const sha256 = await calculateSHA256(file);

  // 2. Ekstraksi spesifik per format
  if (fileType === 'csv') {
    return new Promise((resolve) => {
      Papa.parse<Record<string, string | number>>(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data || [];
          const headers = results.meta.fields || [];
          
          resolve({
            fileType: 'csv',
            fileSizeFormatted,
            sha256,
            processingStatus: 'ready',
            extractedText: rows.slice(0, 50).map((r) => Object.values(r).join(' | ')).join('\n'),
            metadata: {
              rowCount: rows.length,
              columnCount: headers.length,
              headers,
              rawMimeType: file.type || 'text/csv',
            },
            previewRows: rows.slice(0, 15),
          });
        },
        error: (err) => {
          resolve({
            fileType: 'csv',
            fileSizeFormatted,
            sha256,
            processingStatus: 'failed',
            extractedText: '',
            metadata: { notes: `Gagal membaca CSV: ${err.message}` },
            errorMessage: err.message,
          });
        },
      });
    });
  }

  if (fileType === 'xlsx') {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      const sheetNames = workbook.SheetNames;
      const sheetsInfo = sheetNames.map((name) => {
        const worksheet = workbook.Sheets[name];
        const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });
        const headers = Array.isArray(rawRows[0]) ? rawRows[0].map(String) : [];
        return {
          name,
          rowCount: Math.max(0, rawRows.length - 1),
          columnCount: headers.length,
          headers,
        };
      });

      // Ambil sheet pertama untuk pratinjau tabel
      const firstSheet = workbook.Sheets[sheetNames[0]];
      const previewRows = XLSX.utils.sheet_to_json<Record<string, string | number>>(firstSheet, { defval: '' });
      const firstHeaders = sheetsInfo[0]?.headers || [];

      return {
        fileType: 'xlsx',
        fileSizeFormatted,
        sha256,
        processingStatus: 'ready',
        extractedText: previewRows.slice(0, 50).map((r) => Object.values(r).join(' | ')).join('\n'),
        metadata: {
          sheetCount: sheetNames.length,
          sheets: sheetsInfo,
          rowCount: previewRows.length,
          columnCount: firstHeaders.length,
          headers: firstHeaders,
          rawMimeType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        previewRows: previewRows.slice(0, 15),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal membaca format XLSX.';
      return {
        fileType: 'xlsx',
        fileSizeFormatted,
        sha256,
        processingStatus: 'failed',
        extractedText: '',
        metadata: { notes: `Gagal memproses XLSX: ${message}` },
        errorMessage: message,
      };
    }
  }

  // PDF Processing dengan PDF.js
  if (fileType === 'pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      let fullText = '';
      const extractedLines: string[] = [];

      for (let pageNum = 1; pageNum <= Math.min(numPages, 20); pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageStrings = textContent.items
          .map((item) => ('str' in item ? (item.str as string) : ''))
          .filter((str) => str.trim().length > 0);

        if (pageStrings.length > 0) {
          extractedLines.push(...pageStrings);
          fullText += `[Halaman ${pageNum}]\n` + pageStrings.join(' ') + '\n\n';
        }
      }

      const trimmedText = fullText.trim();
      const hasReadableText = trimmedText.length > 20;

      // Jika PDF tidak memiliki teks yang bisa diekstrak (hasil scan gambar murni)
      if (!hasReadableText) {
        return {
          fileType: 'pdf',
          fileSizeFormatted,
          sha256,
          processingStatus: 'unreadable',
          extractedText: '',
          metadata: {
            pageCount: numPages,
            notes: 'PDF ini kemungkinan berupa hasil scan gambar atau tidak memuat layer teks digital.',
            rawMimeType: file.type || 'application/pdf',
          },
          previewRows: [],
        };
      }

      // Buat struktur preview baris sederhana dari baris teks
      const previewRows: Array<Record<string, string | number>> = extractedLines.slice(0, 10).map((line, idx) => ({
        Baris: idx + 1,
        'Konten Teks Terekstrak': line,
      }));

      return {
        fileType: 'pdf',
        fileSizeFormatted,
        sha256,
        processingStatus: 'ready',
        extractedText: trimmedText,
        metadata: {
          pageCount: numPages,
          notes: `Berhasil mengekstrak teks dari ${numPages} halaman.`,
          rawMimeType: file.type || 'application/pdf',
        },
        previewRows,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal membaca format PDF.';
      return {
        fileType: 'pdf',
        fileSizeFormatted,
        sha256,
        processingStatus: 'failed',
        extractedText: '',
        metadata: { notes: `Gagal memproses PDF: ${message}` },
        errorMessage: message,
      };
    }
  }

  throw new Error('Format file tidak didukung.');
}
