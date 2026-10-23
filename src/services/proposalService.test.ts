import { describe, it, expect } from 'vitest';
import { validateProposalTransition } from './proposalService';

describe('Proposal Service – Validasi Transisi Peninjauan', () => {
  it('mengizinkan persetujuan, penolakan, dan pembatalan hanya untuk Pending Review', () => {
    expect(validateProposalTransition('Pending Review', 'approve').allowed).toBe(true);
    expect(validateProposalTransition('Pending Review', 'reject').allowed).toBe(true);
    expect(validateProposalTransition('Pending Review', 'cancel').allowed).toBe(true);
  });

  it('menolak persetujuan ganda pada usulan yang sudah disetujui (mencegah versi duplikat)', () => {
    const check = validateProposalTransition('Approved', 'approve');
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('disetujui');
    expect(check.reason).toContain('duplikat');
  });

  it('menolak tinjauan ulang pada usulan yang sudah ditolak atau dibatalkan', () => {
    const rejected = validateProposalTransition('Rejected', 'approve');
    expect(rejected.allowed).toBe(false);
    expect(rejected.reason).toContain('ditolak');

    const cancelled = validateProposalTransition('Cancelled', 'cancel');
    expect(cancelled.allowed).toBe(false);
    expect(cancelled.reason).toContain('dibatalkan');

    const rejectedCancel = validateProposalTransition('Rejected', 'reject');
    expect(rejectedCancel.allowed).toBe(false);
  });

  it('setiap penolakan transisi menyertakan alasan dalam bahasa Indonesia', () => {
    for (const status of ['Approved', 'Rejected', 'Cancelled'] as const) {
      for (const action of ['approve', 'reject', 'cancel'] as const) {
        const check = validateProposalTransition(status, action);
        expect(check.allowed).toBe(false);
        expect(check.reason).toBeTruthy();
        expect(check.reason!.length).toBeGreaterThan(20);
      }
    }
  });
});
