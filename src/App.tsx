import { useState, useMemo } from 'react';
import { Navigation } from './components/Navigation';
import { DashboardView } from './views/DashboardView';
import { RegistryView } from './views/RegistryView';
import { WorkspaceView } from './views/WorkspaceView';
import { RelationshipView } from './views/RelationshipView';
import { ConsistencyView } from './views/ConsistencyView';
import { GraphRAGView } from './views/GraphRAGView';
import { AuditLogView } from './views/AuditLogView';
import { ApprovalView } from './views/ApprovalView';
import { AIWorkspaceView } from './views/AIWorkspaceView';
import type {
  NavigationTab,
  DocumentItem,
  ActivityItem,
  ConflictFinding,
  ProposalItem,
  GraphNode,
  GraphEdge,
  RelationshipType,
  ChangeProposal,
  DocumentVersion,
  AuditEvent,
  IntegrityCheckResult,
} from './types';
import {
  DEMO_DOCUMENTS,
  DEMO_NODES,
  DEMO_EDGES,
  DEMO_ACTIVITIES,
  DEMO_FINDINGS,
  DEMO_PROPOSALS,
  DEMO_CHANGE_PROPOSALS,
  DEMO_DOCUMENT_VERSIONS,
  DEMO_AUDIT_EVENTS,
} from './demoData';
import { processDocumentFile, calculateSHA256 } from './services/documentProcessor';
import { executeConsistencyEngine } from './services/consistencyRuleEngine';
import { validateProposalTransition } from './services/proposalService';
import { sha256OfBytes, buildIntegrityCheckResult } from './services/integrityService';
import {
  canCreateVersionFor,
  computeNextVersionNumber,
  buildDocumentVersionRecord,
  buildArtifactPayload,
  computeArtifactHash,
} from './services/versionService';
import { appendAuditEvent, createAuditEventId } from './services/auditService';

// ── Helper: ISO timestamp ───────────────────────────────────────────────────
function isoNow(): string {
  return new Date().toISOString();
}

// ── Helper: friendly timestamp for ActivityItem ─────────────────────────────
function friendlyTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;
}

export function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('consistency');
  const [documents, setDocuments] = useState<DocumentItem[]>(DEMO_DOCUMENTS);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>(DEMO_NODES);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>(DEMO_EDGES);

  const [activities, setActivities] = useState<ActivityItem[]>(DEMO_ACTIVITIES);
  const [findings, setFindings] = useState<ConflictFinding[]>(DEMO_FINDINGS);

  // ── Legacy ProposalItem kept for DashboardView / WorkspaceView ────────────
  const [proposals] = useState<ProposalItem[]>(DEMO_PROPOSALS);

  // ── Tahap 6: ChangeProposal, DocumentVersion, AuditEvent ─────────────────
  const [changeProposals, setChangeProposals] = useState<ChangeProposal[]>(DEMO_CHANGE_PROPOSALS);
  const [documentVersions, setDocumentVersions] = useState<DocumentVersion[]>(DEMO_DOCUMENT_VERSIONS);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(DEMO_AUDIT_EVENTS);

  // ── Tahap 7: Verifikasi integritas SHA-256 & byte berkas sesi ─────────────
  const [integrityChecks, setIntegrityChecks] = useState<IntegrityCheckResult[]>([]);
  // Byte berkas asli dokumen yang diunggah selama sesi berlangsung (hanya di memori browser).
  // Jika tidak tersedia (mis. dokumen contoh), verifikasi meminta unggah-ulang berkas.
  const [fileBytes, setFileBytes] = useState<Record<string, Uint8Array>>({});
  const [verifyingDocId, setVerifyingDocId] = useState<string | null>(null);

  const [activeWorkspaceDocId, setActiveWorkspaceDocId] = useState<string>(
    DEMO_DOCUMENTS[0]?.id || ''
  );

  // File processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Consistency checker indicator
  const [isCheckingRules, setIsCheckingRules] = useState(false);

  // ── Active relations count per document ──────────────────────────────────
  const documentsWithActiveRelations = useMemo(() => {
    return documents.map((doc) => {
      const matchingNodes = graphNodes.filter((n) => n.documentId === doc.id);
      const nodeIds = new Set(matchingNodes.map((n) => n.id));
      const activeRelationsCount = graphEdges.filter(
        (e) => nodeIds.has(e.sourceNodeId) || nodeIds.has(e.targetNodeId)
      ).length;
      return { ...doc, relationshipsCount: activeRelationsCount };
    });
  }, [documents, graphNodes, graphEdges]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const addAuditEvent = (event: Omit<AuditEvent, 'id'>) => {
    setAuditEvents((prev) => appendAuditEvent(prev, event, createAuditEventId()));
  };

  const addActivity = (
    action: string,
    target: string,
    type: ActivityItem['type']
  ) => {
    const act: ActivityItem = {
      id: `act-${Date.now().toString().slice(-4)}`,
      timestamp: friendlyTime(),
      actor: 'Pengguna Sesi',
      action,
      target,
      type,
    };
    setActivities((prev) => [act, ...prev]);
  };

  // ── Workspace navigation ──────────────────────────────────────────────────
  const handleOpenWorkspace = (docId: string) => {
    setActiveWorkspaceDocId(docId);
    setCurrentTab('workspace');
  };

  // ── Consistency Check ─────────────────────────────────────────────────────
  /**
   * Tahap 8: Menjalankan ulang pemeriksaan konsistensi HANYA pada dokumen yang
   * benar-benar masih ada di registri (mencegah pemeriksaan pada ID usang).
   */
  const handleRunConsistencyCheck = (requestedDocIds: string[]) => {
    const validDocIds = requestedDocIds.filter((id) =>
      documents.some((d) => d.id === id)
    );
    if (validDocIds.length < 2) return;
    setIsCheckingRules(true);
    setTimeout(() => {
      const newLiveFindings = executeConsistencyEngine(
        validDocIds,
        documents,
        graphNodes,
        graphEdges
      );
      setFindings((prev) => {
        const demoOnes = prev.filter((f) => f.isDemoFinding);
        const formattedLive = newLiveFindings.map((f) => ({ ...f, isDemoFinding: false }));
        return [...formattedLive, ...demoOnes];
      });
      addActivity(
        `Menjalankan Consistency Checker pada ${validDocIds.length} dokumen`,
        `${newLiveFindings.length} temuan dievaluasi`,
        'conflict'
      );
      addAuditEvent({
        eventType: 'CheckRun',
        timestamp: isoNow(),
        actor: 'Pengguna Sesi',
        actorRole: 'Auditor',
        entityId: validDocIds.join(','),
        entityType: 'document',
        summary: `Pemeriksaan konsistensi dijalankan pada ${validDocIds.length} dokumen. ${newLiveFindings.length} temuan baru dievaluasi.`,
        metadata: { documentIds: validDocIds.join(','), findingsEvaluated: newLiveFindings.length },
      });
      setIsCheckingRules(false);
    }, 400);
  };

  /**
   * Tahap 8: Menyegarkan temuan rule-engine (non-demo) yang terdampak oleh
   * perubahan graf relasi, agar hasil pemeriksaan tidak tetap menampilkan
   * temuan lama yang sudah tidak relevan dengan relasi saat ini.
   */
  const refreshLiveFindingsForDocs = (changedDocIds: string[]) => {
    const affected = new Set(changedDocIds.filter((id) => documents.some((d) => d.id === id)));
    if (affected.size === 0) return;
    // Sertakan tetangga graf agar pasangan terdampak ikut diperiksa ulang
    for (const edge of graphEdges) {
      const sourceDocId = graphNodes.find((n) => n.id === edge.sourceNodeId)?.documentId;
      const targetDocId = graphNodes.find((n) => n.id === edge.targetNodeId)?.documentId;
      if (sourceDocId && affected.has(sourceDocId) && targetDocId) affected.add(targetDocId);
      if (targetDocId && affected.has(targetDocId) && sourceDocId) affected.add(sourceDocId);
    }
    setFindings((prev) => {
      const demoOnes = prev.filter((f) => f.isDemoFinding);
      const keptLive = prev.filter(
        (f) => !f.isDemoFinding && !f.documentIds.some((id) => affected.has(id))
      );
      const refreshed = executeConsistencyEngine(
        Array.from(affected),
        documents,
        graphNodes,
        graphEdges
      ).map((f) => ({ ...f, isDemoFinding: false }));
      return [...refreshed, ...keptLive, ...demoOnes];
    });
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUploadFile = async (file: File) => {
    setErrorMessage(null);
    if (documents.length >= 5) {
      setErrorMessage('Batas kapasitas sesi aktif telah tercapai. Silakan hapus dokumen yang sudah tidak diperlukan sebelum mengunggah yang baru.');
      return;
    }
    if (documents.some((d) => d.name.toLowerCase() === file.name.toLowerCase())) {
      setErrorMessage(`Dokumen dengan nama "${file.name}" sudah ada dalam sesi Document Registry.`);
      return;
    }
    try {
      setIsProcessing(true);
      setProcessingProgress(`Membaca dan memverifikasi "${file.name}"...`);
      // Simpan byte asli berkas di memori sesi untuk verifikasi integritas tanpa unggah ulang.
      const originalBytes = new Uint8Array(await file.arrayBuffer());
      const result = await processDocumentFile(file);
      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      let category: DocumentItem['category'] = 'Dokumen Lainnya';
      const lower = file.name.toLowerCase();
      if (lower.includes('laba') || lower.includes('posisi') || lower.includes('report') || lower.includes('laporan')) category = 'Laporan Keuangan';
      else if (lower.includes('jurnal') || lower.includes('journal') || lower.includes('ledger')) category = 'Jurnal Umum';
      else if (lower.includes('invoice') || lower.includes('faktur') || lower.includes('kwitansi')) category = 'Invoice Pendukung';
      else if (lower.includes('rekonsiliasi') || lower.includes('bank')) category = 'Rekonsiliasi Bank';

      const newDoc: DocumentItem = {
        id: `doc-${Date.now().toString().slice(-4)}`,
        name: file.name,
        fileType: result.fileType,
        fileSize: result.fileSizeFormatted,
        uploadedAt: timeStr,
        processingStatus: result.processingStatus,
        integrityStatus: 'valid',
        sha256: result.sha256,
        originalHash: result.sha256,
        extractedText: result.extractedText,
        metadata: result.metadata,
        category,
        previewRows: result.previewRows,
        relationshipsCount: 0,
        auditStatus: 'pending',
      };
      setDocuments((prev) => [newDoc, ...prev]);
      setFileBytes((prev) => ({ ...prev, [newDoc.id]: originalBytes }));
      addActivity('Mengunggah & memproses dokumen ke Registry', file.name, 'upload');
      addAuditEvent({
        eventType: 'DocumentUploaded',
        timestamp: isoNow(),
        actor: 'Pengguna Sesi',
        actorRole: 'Auditor',
        entityId: newDoc.id,
        entityType: 'document',
        summary: `Dokumen "${file.name}" diunggah dan terdaftar di Document Registry. Hash referensi SHA-256 dicatat saat unggahan.`,
        metadata: {
          documentId: newDoc.id,
          documentName: file.name,
          category,
          fileSize: result.fileSizeFormatted,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kegagalan saat membaca file.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(null);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDeleteDocument = (docId: string) => {
    const docToDelete = documents.find((d) => d.id === docId);
    if (!docToDelete) return;
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    const affectedNodeIds = new Set(
      graphNodes.filter((n) => n.documentId === docId).map((n) => n.id)
    );
    if (affectedNodeIds.size > 0) {
      setGraphNodes((prev) => prev.filter((n) => !affectedNodeIds.has(n.id)));
      setGraphEdges((prev) =>
        prev.filter((e) => !affectedNodeIds.has(e.sourceNodeId) && !affectedNodeIds.has(e.targetNodeId))
      );
    }
    setFindings((prev) => prev.filter((f) => !f.documentIds.includes(docId)));
    if (activeWorkspaceDocId === docId) {
      const remaining = documents.filter((d) => d.id !== docId);
      if (remaining.length > 0) setActiveWorkspaceDocId(remaining[0].id);
    }
    addActivity('Menghapus dokumen dari sesi', docToDelete.name, 'upload');
    // Tahap 7: byte berkas dihapus dari memori sesi, tetapi riwayat audit TIDAK dihapus.
    setFileBytes((prev) => {
      const next = { ...prev };
      delete next[docId];
      return next;
    });
    addAuditEvent({
      eventType: 'DocumentRemoved',
      timestamp: isoNow(),
      actor: 'Pengguna Sesi',
      actorRole: 'Auditor',
      entityId: docId,
      entityType: 'document',
      summary: `Dokumen "${docToDelete.name}" dihapus dari registri aktif. Riwayat peristiwa audit dan versi yang telah tercatat tetap dipertahankan.`,
      metadata: { documentId: docId, documentName: docToDelete.name, category: docToDelete.category },
    });
  };

  // ── Relationship Mapping ──────────────────────────────────────────────────
  const handleAddNodeToCanvas = (documentId: string, position?: { x: number; y: number }) => {
    if (graphNodes.some((n) => n.documentId === documentId)) {
      alert('Dokumen ini sudah ada di canvas.');
      return;
    }
    const defaultPos = position || {
      x: 100 + (graphNodes.length % 3) * 260,
      y: 100 + Math.floor(graphNodes.length / 3) * 160,
    };
    const newNode: GraphNode = { id: `node-${documentId}`, documentId, position: defaultPos };
    setGraphNodes((prev) => [...prev, newNode]);
    const doc = documents.find((d) => d.id === documentId);
    if (doc) addActivity('Menambahkan dokumen ke Relationship Canvas', doc.name, 'relation');
  };

  const handleRemoveNodeFromCanvas = (nodeId: string) => {
    const removedDocId = graphNodes.find((n) => n.id === nodeId)?.documentId ?? '';
    setGraphNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setGraphEdges((prev) => prev.filter((e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId));
    // Tahap 8: segarkan temuan rule-engine yang terdampak pengeluaran dokumen dari canvas
    refreshLiveFindingsForDocs([removedDocId]);
  };

  const handleUpdateNodePosition = (nodeId: string, position: { x: number; y: number }) => {
    setGraphNodes((prev) => prev.map((n) => (n.id === nodeId ? { ...n, position } : n)));
  };

  const handleAddEdge = (sourceNodeId: string, targetNodeId: string, relationshipType: RelationshipType) => {
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newEdge: GraphEdge = {
      id: `edge-${Date.now().toString().slice(-4)}`,
      sourceNodeId,
      targetNodeId,
      relationshipType,
      isConfirmed: true,
      createdAt: timeStr,
    };
    setGraphEdges((prev) => [...prev, newEdge]);
    const sourceDoc = documents.find((d) => d.id === graphNodes.find((n) => n.id === sourceNodeId)?.documentId);
    const targetDoc = documents.find((d) => d.id === graphNodes.find((n) => n.id === targetNodeId)?.documentId);
    addActivity(
      `Membuat hubungan [${relationshipType}]`,
      `${sourceDoc?.name || 'Dokumen'} → ${targetDoc?.name || 'Dokumen'}`,
      'relation'
    );
    addAuditEvent({
      eventType: 'RelationshipCreated',
      timestamp: isoNow(),
      actor: 'Pengguna Sesi',
      actorRole: 'Auditor',
      entityId: newEdge.id,
      entityType: 'relationship',
      summary: `Hubungan [${relationshipType}] dibuat antara "${sourceDoc?.name || 'Dokumen'}" dan "${targetDoc?.name || 'Dokumen'}".`,
      metadata: {
        relationshipType,
        sourceDocumentId: sourceDoc?.id ?? '',
        targetDocumentId: targetDoc?.id ?? '',
        sourceDocumentName: sourceDoc?.name ?? '',
        targetDocumentName: targetDoc?.name ?? '',
      },
    });
    // Tahap 8: segarkan temuan rule-engine yang terdampak relasi baru ini
    refreshLiveFindingsForDocs([sourceDoc?.id ?? '', targetDoc?.id ?? '']);
  };

  const handleUpdateEdgeType = (edgeId: string, newType: RelationshipType) => {
    const edge = graphEdges.find((e) => e.id === edgeId);
    if (!edge || edge.relationshipType === newType) return;
    setGraphEdges((prev) => prev.map((e) => (e.id === edgeId ? { ...e, relationshipType: newType } : e)));
    const sourceDoc = documents.find(
      (d) => d.id === graphNodes.find((n) => n.id === edge.sourceNodeId)?.documentId
    );
    const targetDoc = documents.find(
      (d) => d.id === graphNodes.find((n) => n.id === edge.targetNodeId)?.documentId
    );
    addAuditEvent({
      eventType: 'RelationshipUpdated',
      timestamp: isoNow(),
      actor: 'Pengguna Sesi',
      actorRole: 'Auditor',
      entityId: edgeId,
      entityType: 'relationship',
      summary: `Jenis hubungan diperbarui dari [${edge.relationshipType}] menjadi [${newType}] antara "${sourceDoc?.name || 'Dokumen'}" dan "${targetDoc?.name || 'Dokumen'}".`,
      metadata: {
        relationshipType: newType,
        previousRelationshipType: edge.relationshipType,
        sourceDocumentId: sourceDoc?.id ?? '',
        targetDocumentId: targetDoc?.id ?? '',
        sourceDocumentName: sourceDoc?.name ?? '',
        targetDocumentName: targetDoc?.name ?? '',
      },
    });
    // Tahap 8: segarkan temuan rule-engine yang terdampak perubahan relasi
    refreshLiveFindingsForDocs([sourceDoc?.id ?? '', targetDoc?.id ?? '']);
  };

  const handleRemoveEdge = (edgeId: string) => {
    const edge = graphEdges.find((e) => e.id === edgeId);
    setGraphEdges((prev) => prev.filter((e) => e.id !== edgeId));
    if (!edge) return;
    const sourceDoc = documents.find(
      (d) => d.id === graphNodes.find((n) => n.id === edge.sourceNodeId)?.documentId
    );
    const targetDoc = documents.find(
      (d) => d.id === graphNodes.find((n) => n.id === edge.targetNodeId)?.documentId
    );
    addAuditEvent({
      eventType: 'RelationshipRemoved',
      timestamp: isoNow(),
      actor: 'Pengguna Sesi',
      actorRole: 'Auditor',
      entityId: edgeId,
      entityType: 'relationship',
      summary: `Hubungan [${edge.relationshipType}] dihapus antara "${sourceDoc?.name || 'Dokumen'}" dan "${targetDoc?.name || 'Dokumen'}".`,
      metadata: {
        relationshipType: edge.relationshipType,
        sourceDocumentId: sourceDoc?.id ?? '',
        targetDocumentId: targetDoc?.id ?? '',
        sourceDocumentName: sourceDoc?.name ?? '',
        targetDocumentName: targetDoc?.name ?? '',
      },
    });
    // Tahap 8: segarkan temuan rule-engine yang terdampak relasi yang dihapus
    refreshLiveFindingsForDocs([sourceDoc?.id ?? '', targetDoc?.id ?? '']);
  };

  // ── Tahap 6: ChangeProposal Handlers ─────────────────────────────────────

  const handleCreateProposal = (proposalData: Omit<ChangeProposal, 'id' | 'createdAt' | 'status'>) => {
    // Tahap 8: tolak usulan untuk dokumen yang sudah tidak ada di registri
    if (!documents.some((d) => d.id === proposalData.documentId)) {
      setErrorMessage('Dokumen yang dimaksud tidak ditemukan dalam sesi aktif. Usulan tidak dibuat.');
      return;
    }
    const newProposal: ChangeProposal = {
      ...proposalData,
      id: `cp-${Date.now().toString().slice(-4)}`,
      status: 'Pending Review',
      createdAt: isoNow(),
      approvalsReceived: 0,
      approvalsRequired: 2,
    };
    setChangeProposals((prev) => [newProposal, ...prev]);
    addActivity('Membuat usulan koreksi baru', `Dokumen: ${proposalData.documentId}`, 'proposal');
    addAuditEvent({
      eventType: 'ProposalCreated',
      timestamp: isoNow(),
      actor: proposalData.proposedBy,
      actorRole: 'Auditor',
      entityId: newProposal.id,
      entityType: 'proposal',
      summary: `Usulan koreksi [${newProposal.id}] dibuat oleh ${proposalData.proposedBy} untuk dokumen "${documents.find((d) => d.id === proposalData.documentId)?.name ?? proposalData.documentId}".`,
      metadata: {
        changeType: proposalData.changeType,
        documentId: proposalData.documentId,
        documentName: documents.find((d) => d.id === proposalData.documentId)?.name ?? '',
        sourceFindingId: proposalData.sourceFindingId ?? '',
      },
    });
  };

  const handleApproveProposal = (id: string, reviewerNote: string) => {
    const proposal = changeProposals.find((p) => p.id === id);
    if (!proposal) return;

    // Tahap 8: cegah persetujuan ganda / tinjauan pada status usang
    const transition = validateProposalTransition(proposal.status, 'approve');
    if (!transition.allowed) {
      console.warn(`Persetujuan ditolak: ${transition.reason}`);
      return;
    }

    const reviewedAt = isoNow();
    const approvedStatus: ChangeProposal['status'] = 'Approved';
    setChangeProposals((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: approvedStatus,
              approvalsReceived: (p.approvalsRequired ?? 2),
              reviewedAt,
              reviewerNote: reviewerNote || 'Disetujui oleh Supervisor (Simulasi).',
            }
          : p
      )
    );

    const docName = documents.find((d) => d.id === proposal.documentId)?.name ?? proposal.documentId;

    // Tahap 7: versi baru hanya dibuat jika kebijakan mengizinkan (usulan Approved)
    // dan perubahan benar-benar diterapkan. Riwayat versi sebelumnya tidak ditimpa.
    if (canCreateVersionFor(approvedStatus)) {
      const versionId = `ver-${Date.now().toString().slice(-4)}`;
      const nextVersionNumber = computeNextVersionNumber(documentVersions, proposal.documentId);

      const artifactPayload = buildArtifactPayload({
        versionId,
        proposalId: id,
        documentId: proposal.documentId,
        fieldChanged: proposal.changeType,
        valueBefore: proposal.originalValue,
        valueAfter: proposal.proposedValue,
        approvedAt: reviewedAt,
      });

      // Hash artefak dihitung secara async, lalu versi & peristiwa terkait dicatat.
      computeArtifactHash(artifactPayload).then((hash) => {
        const newVersion = buildDocumentVersionRecord({
          proposal,
          versionId,
          versionNumber: nextVersionNumber,
          appliedAt: reviewedAt,
          artifactHash: hash,
        });
        setDocumentVersions((prev) => [...prev, newVersion]);

        addAuditEvent({
          eventType: 'VersionCreated',
          timestamp: isoNow(),
          actor: 'Sistem AKSARA',
          actorRole: 'Sistem',
          entityId: versionId,
          entityType: 'version',
          summary: `Versi ${nextVersionNumber} dokumen "${docName}" dibuat sebagai representasi terstruktur perubahan yang disetujui (usulan ${id}). Berkas asli tidak dimodifikasi.`,
          metadata: { versionNumber: nextVersionNumber, proposalId: id, documentId: proposal.documentId, documentName: docName },
        });

        addAuditEvent({
          eventType: 'ChangeApplied',
          timestamp: isoNow(),
          actor: proposal.proposedBy,
          actorRole: 'Auditor',
          entityId: id,
          entityType: 'proposal',
          summary: `Perubahan dari usulan [${id}] diterapkan ke representasi terstruktur dokumen "${docName}". Nilai: ${proposal.originalValue} → ${proposal.proposedValue}.`,
          metadata: { documentId: proposal.documentId, documentName: docName, proposalId: id },
        });
      }).catch((err: unknown) => {
        // Tahap 8: kegagalan hashing tidak boleh menjadi rejection tak tertangani.
        // Persetujuan tetap sah; versi tidak dicatat karena artefak gagal di-hash.
        console.error('Gagal menghitung hash artefak versi dokumen:', err);
      });
    }

    addAuditEvent({
      eventType: 'ProposalApproved',
      timestamp: reviewedAt,
      actor: 'Supervisor (Simulasi)',
      actorRole: 'Supervisor',
      entityId: id,
      entityType: 'proposal',
      summary: `Usulan [${id}] disetujui (kuorum persetujuan terpenuhi). Catatan: ${reviewerNote}`,
      metadata: {
        documentId: proposal.documentId,
        documentName: docName,
        approvalsReceived: proposal.approvalsRequired ?? 2,
        approvalsRequired: proposal.approvalsRequired ?? 2,
      },
    });

    addActivity(`Menyetujui usulan koreksi [${id}]`, proposal.documentId, 'proposal');
  };

  const handleRejectProposal = (id: string, reviewerNote: string) => {
    const proposal = changeProposals.find((p) => p.id === id);
    if (!proposal) return;

    const transition = validateProposalTransition(proposal.status, 'reject');
    if (!transition.allowed) {
      console.warn(`Penolakan ditolak: ${transition.reason}`);
      return;
    }

    const reviewedAt = isoNow();
    setChangeProposals((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'Rejected',
              reviewedAt,
              reviewerNote: reviewerNote || 'Ditolak oleh Peninjau (Simulasi).',
            }
          : p
      )
    );
    addAuditEvent({
      eventType: 'ProposalRejected',
      timestamp: reviewedAt,
      actor: 'Peninjau (Simulasi)',
      actorRole: 'Peninjau',
      entityId: id,
      entityType: 'proposal',
      summary: `Usulan [${id}] ditolak. Tidak ada perubahan yang diterapkan dan tidak ada versi dokumen yang dibuat. Catatan: ${reviewerNote}`,
      metadata: {
        documentId: proposal.documentId,
        documentName: documents.find((d) => d.id === proposal.documentId)?.name ?? '',
      },
    });
    addActivity(`Menolak usulan koreksi [${id}]`, proposal.documentId, 'proposal');
  };

  const handleCancelProposal = (id: string) => {
    const proposal = changeProposals.find((p) => p.id === id);
    if (!proposal) return;

    const transition = validateProposalTransition(proposal.status, 'cancel');
    if (!transition.allowed) {
      console.warn(`Pembatalan ditolak: ${transition.reason}`);
      return;
    }

    setChangeProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'Cancelled' } : p))
    );
    addAuditEvent({
      eventType: 'ProposalCancelled',
      timestamp: isoNow(),
      actor: 'Pengguna Sesi',
      actorRole: 'Auditor',
      entityId: id,
      entityType: 'proposal',
      summary: `Usulan [${id}] dibatalkan oleh pengusul. Tidak ada perubahan yang diterapkan dan tidak ada versi dokumen yang dibuat.`,
      metadata: {
        documentId: proposal.documentId,
        documentName: documents.find((d) => d.id === proposal.documentId)?.name ?? '',
      },
    });
    addActivity(`Membatalkan usulan koreksi [${id}]`, proposal.documentId, 'proposal');
  };

  const handleEditProposal = (updated: ChangeProposal) => {
    setChangeProposals((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    addAuditEvent({
      eventType: 'ProposalEdited',
      timestamp: isoNow(),
      actor: updated.proposedBy,
      actorRole: 'Auditor',
      entityId: updated.id,
      entityType: 'proposal',
      summary: `Usulan [${updated.id}] diedit. Status dikembalikan ke Pending Review. Persetujuan ulang diperlukan.`,
      metadata: {
        documentId: updated.documentId,
        documentName: documents.find((d) => d.id === updated.documentId)?.name ?? '',
      },
    });
    addActivity(`Mengedit usulan koreksi [${updated.id}]`, updated.documentId, 'proposal');
  };

  // ── Tahap 7: Verifikasi Integritas SHA-256 ───────────────────────────────
  /**
   * Memverifikasi byte berkas terhadap hash referensi yang tercatat saat unggahan.
   * Jika byte berkas asli tidak tersedia di sesi, pengguna harus mengunggah ulang
   * berkasnya. Pemeriksaan ini TIDAK PERNAH mengubah hash referensi dokumen.
   */
  const handleVerifyIntegrity = async (docId: string, reuploadedFile?: File) => {
    const doc = documents.find((d) => d.id === docId);
    if (!doc) {
      throw new Error('Dokumen tidak ditemukan dalam sesi ini.');
    }
    setVerifyingDocId(docId);
    try {
      let calculatedHash: string | null = null;
      let fileSource: IntegrityCheckResult['fileSource'] = 'none';

      if (reuploadedFile) {
        // Unggah-ulang: hash dihitung dari byte berkas yang diberikan pengguna
        calculatedHash = await calculateSHA256(reuploadedFile);
        fileSource = 'reupload';
      } else {
        const bytes = fileBytes[docId];
        if (bytes) {
          calculatedHash = await sha256OfBytes(bytes);
          fileSource = 'retained';
        }
      }

      const result = buildIntegrityCheckResult({
        resultId: `chk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        documentId: docId,
        documentName: doc.name,
        referenceHash: doc.originalHash,
        calculatedHash,
        fileSource,
        checkedAt: isoNow(),
      });
      setIntegrityChecks((prev) => [result, ...prev]);

      // Peristiwa audit hanya dicatat jika perbandingan byte benar-benar terjadi.
      // Hasil UNAVAILABLE berarti verifikasi tidak dapat dilakukan (bukan keberhasilan).
      if (result.status !== 'UNAVAILABLE') {
        addAuditEvent({
          eventType: 'IntegrityCheckRun',
          timestamp: isoNow(),
          actor: 'Pengguna Sesi',
          actorRole: 'Auditor',
          entityId: docId,
          entityType: 'document',
          summary:
            result.status === 'MATCH'
              ? `Verifikasi integritas dokumen "${doc.name}": hash SHA-256 berkas SESUAI dengan hash referensi unggahan.`
              : `Verifikasi integritas dokumen "${doc.name}": hash SHA-256 berkas TIDAK SESUAI dengan hash referensi. Hash referensi asli dipertahankan.`,
          metadata: {
            documentId: docId,
            documentName: doc.name,
            result: result.status,
            fileSource,
          },
        });
      }
    } finally {
      setVerifyingDocId(null);
    }
  };

  // ── Metrics ───────────────────────────────────────────────────────────────
  const confirmedConflictsCount = findings.filter((f) => f.status === 'Conflict').length;
  const pendingProposalsCount = changeProposals.filter((p) => p.status === 'Pending Review').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Navigation */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        metrics={{
          documents: documentsWithActiveRelations.length,
          relationships: graphEdges.length,
          conflicts: confirmedConflictsCount,
          proposals: pendingProposalsCount,
        }}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            documents={documentsWithActiveRelations}
            activities={activities}
            conflicts={findings}
            proposals={proposals}
            onNavigate={setCurrentTab}
          />
        )}

        {currentTab === 'registry' && (
          <RegistryView
            documents={documentsWithActiveRelations}
            onUploadFile={handleUploadFile}
            onDeleteDocument={handleDeleteDocument}
            onOpenWorkspace={handleOpenWorkspace}
            onNavigate={setCurrentTab}
            isProcessing={isProcessing}
            processingProgress={processingProgress}
            errorMessage={errorMessage}
            onClearError={() => setErrorMessage(null)}
          />
        )}

        {currentTab === 'workspace' && (
          <WorkspaceView
            documents={documentsWithActiveRelations}
            conflicts={findings}
            proposals={proposals}
            graphNodes={graphNodes}
            graphEdges={graphEdges}
            activeDocId={activeWorkspaceDocId}
            onSelectDoc={setActiveWorkspaceDocId}
            onNavigate={setCurrentTab}
          />
        )}

        {currentTab === 'relationship' && (
          <RelationshipView
            documents={documentsWithActiveRelations}
            graphNodes={graphNodes}
            graphEdges={graphEdges}
            onAddNode={handleAddNodeToCanvas}
            onRemoveNode={handleRemoveNodeFromCanvas}
            onUpdateNodePosition={handleUpdateNodePosition}
            onAddEdge={handleAddEdge}
            onUpdateEdgeType={handleUpdateEdgeType}
            onRemoveEdge={handleRemoveEdge}
            onOpenWorkspace={handleOpenWorkspace}
          />
        )}

        {currentTab === 'consistency' && (
          <ConsistencyView
            findings={findings}
            documents={documentsWithActiveRelations}
            graphEdges={graphEdges}
            onRunCheck={handleRunConsistencyCheck}
            onNavigate={setCurrentTab}
            onOpenWorkspace={handleOpenWorkspace}
            isChecking={isCheckingRules}
          />
        )}

        {currentTab === 'graphrag' && (
          <GraphRAGView
            documents={documentsWithActiveRelations}
            graphNodes={graphNodes}
            graphEdges={graphEdges}
            findings={findings}
            onNavigate={setCurrentTab}
            onOpenWorkspace={handleOpenWorkspace}
          />
        )}

        {currentTab === 'aiworkspace' && (
          <AIWorkspaceView
            documents={documentsWithActiveRelations}
            findings={findings}
            proposals={changeProposals}
            onCreateProposal={handleCreateProposal}
            onNavigate={setCurrentTab}
          />
        )}

        {currentTab === 'audit' && (
          <AuditLogView
            documents={documentsWithActiveRelations}
            auditEvents={auditEvents}
            changeProposals={changeProposals}
            documentVersions={documentVersions}
            integrityChecks={integrityChecks}
            retainedFileDocIds={Object.keys(fileBytes)}
            verifyingDocId={verifyingDocId}
            onVerifyIntegrity={handleVerifyIntegrity}
          />
        )}

        {currentTab === 'approval' && (
          <ApprovalView
            proposals={changeProposals}
            documents={documentsWithActiveRelations}
            documentVersions={documentVersions}
            auditEvents={auditEvents}
            onApprove={handleApproveProposal}
            onReject={handleRejectProposal}
            onCancel={handleCancelProposal}
            onEdit={handleEditProposal}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">AKSARA</span>
            <span>•</span>
            <span>Accounting Knowledge & Secure Audit Record Assurance</span>
          </div>
          <div>
            <span>Tahap 7: Verifikasi Integritas, Riwayat Versi & Log Audit • Netlify Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
