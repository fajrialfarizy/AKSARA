import { describe, it, expect } from 'vitest';
import {
  isValidSha256Hex,
  sha256OfBytes,
  compareIntegrityHashes,
  buildIntegrityCheckResult,
} from './integrityService';

const enc = (s: string) => new TextEncoder().encode(s);

describe('Integrity Service – Hash SHA-256', () => {
  it('menghasilkan hash yang identik untuk byte yang identik (vector NIST diketahui)', async () => {
    const empty = await sha256OfBytes(new Uint8Array(0));
    expect(empty).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

    const abc = await sha256OfBytes(enc('abc'));
    expect(abc).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');

    // Byte yang identik selalu menghasilkan hash yang identik
    const abcLagi = await sha256OfBytes(enc('abc'));
    expect(abcLagi).toBe(abc);
  });

  it('menghasilkan hash yang berbeda untuk byte yang berbeda', async () => {
    const a = await sha256OfBytes(enc('konten dokumen A'));
    const b = await sha256OfBytes(enc('konten dokumen B'));
    expect(a).not.toBe(b);

    // Perbedaan satu byte pun mengubah hash
    const a1 = await sha256OfBytes(enc('konten dokumen A'));
    const a2 = await sha256OfBytes(enc('konten dokumen a'));
    expect(a1).not.toBe(a2);
  });

  it('validasi hash SHA-256 heksadesimal', () => {
    expect(isValidSha256Hex('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')).toBe(true);
    expect(isValidSha256Hex('hash1')).toBe(false);
    expect(isValidSha256Hex('')).toBe(false);
    expect(isValidSha256Hex(null)).toBe(false);
    expect(isValidSha256Hex(undefined)).toBe(false);
  });
});

describe('Integrity Service – Perbandingan & Status', () => {
  it('hash yang sama menghasilkan MATCH, hash berbeda menghasilkan MISMATCH', () => {
    const ref = 'a'.repeat(64);
    expect(compareIntegrityHashes(ref, 'a'.repeat(64))).toBe('MATCH');
    expect(compareIntegrityHashes(ref, 'b'.repeat(64))).toBe('MISMATCH');
  });

  it('tanpa hash referensi yang valid, hasilnya UNAVAILABLE', () => {
    expect(compareIntegrityHashes('', 'a'.repeat(64))).toBe('UNAVAILABLE');
    expect(compareIntegrityHashes('bukan-hash', 'a'.repeat(64))).toBe('UNAVAILABLE');
    expect(compareIntegrityHashes(null, 'a'.repeat(64))).toBe('UNAVAILABLE');
  });

  it('tanpa byte berkas (calculatedHash null), hasilnya UNAVAILABLE meskipun referensi ada', () => {
    expect(
      buildIntegrityCheckResult({
        documentId: 'doc-1',
        documentName: 'Dokumen.pdf',
        referenceHash: 'a'.repeat(64),
        calculatedHash: null,
        fileSource: 'none',
        checkedAt: '2026-10-23T16:00:00+07:00',
        resultId: 'chk-1',
      }).status
    ).toBe('UNAVAILABLE');
  });

  it('dokumen tanpa hash referensi valid menghasilkan UNAVAILABLE meskipun byte tersedia', () => {
    const result = buildIntegrityCheckResult({
      documentId: 'doc-2',
      documentName: 'TanpaReferensi.csv',
      referenceHash: 'hash-tidak-valid',
      calculatedHash: 'a'.repeat(64),
      fileSource: 'reupload',
      checkedAt: '2026-10-23T16:00:00+07:00',
      resultId: 'chk-2',
    });
    expect(result.status).toBe('UNAVAILABLE');
  });

  it('hasil MISMATCH TIDAK mengubah hash referensi (referensi asli dipertahankan)', async () => {
    const originalReference = 'a'.repeat(64);
    const result = buildIntegrityCheckResult({
      documentId: 'doc-3',
      documentName: 'Dimanipulasi.pdf',
      referenceHash: originalReference,
      calculatedHash: await sha256OfBytes(enc('isi berkas yang berbeda')),
      fileSource: 'reupload',
      checkedAt: '2026-10-23T16:00:00+07:00',
      resultId: 'chk-3',
    });
    expect(result.status).toBe('MISMATCH');
    expect(result.referenceHash).toBe(originalReference);
    expect(result.referenceHash).not.toBe(result.calculatedHash);
    expect(result.explanation).toContain('TIDAK otomatis membuktikan pemalsuan');
  });

  it('hasil MATCH hanya membuktikan kesamaan byte dengan referensi tertentu, bukan kebenaran isi', () => {
    const ref = 'c'.repeat(64);
    const result = buildIntegrityCheckResult({
      documentId: 'doc-4',
      documentName: 'Sah.pdf',
      referenceHash: ref,
      calculatedHash: ref,
      fileSource: 'retained',
      checkedAt: '2026-10-23T16:00:00+07:00',
      resultId: 'chk-4',
    });
    expect(result.status).toBe('MATCH');
    expect(result.explanation).toContain('TIDAK membuktikan bahwa isi dokumen benar');
  });
});
