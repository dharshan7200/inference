/**
 * V-Inference Data Layer - Proofs
 * Mastra KV storage operations for ZK proofs
 */

import { mastra } from '../../../mastra.config';
import { ZKProof } from '../types';
import { v4 as uuidv4 } from 'uuid';

const PROOFS_PREFIX = 'proofs:';
const PROOFS_BY_JOB_PREFIX = 'proofs:job:';

export async function createProof(proofData: {
    job_id: string;
    proof_hash: string;
    circuit_hash: string;
    verification_key: string;
    is_valid: boolean;
    tx_hash?: string;
}): Promise<ZKProof> {
    const proof: ZKProof = {
        id: uuidv4(),
        job_id: proofData.job_id,
        proof_hash: proofData.proof_hash,
        circuit_hash: proofData.circuit_hash,
        verification_key: proofData.verification_key,
        is_valid: proofData.is_valid,
        tx_hash: proofData.tx_hash,
        generated_at: new Date().toISOString(),
    };

    // Store proof by ID
    await mastra.storage?.set(`${PROOFS_PREFIX}${proof.id}`, JSON.stringify(proof));

    // Store job -> proof mapping
    await mastra.storage?.set(`${PROOFS_BY_JOB_PREFIX}${proof.job_id}`, proof.id);

    return proof;
}

export async function getProof(proofId: string): Promise<ZKProof | null> {
    const data = await mastra.storage?.get(`${PROOFS_PREFIX}${proofId}`);
    return data ? JSON.parse(data) : null;
}

export async function getProofByJob(jobId: string): Promise<ZKProof | null> {
    const proofId = await mastra.storage?.get(`${PROOFS_BY_JOB_PREFIX}${jobId}`);
    if (!proofId) return null;
    return getProof(proofId);
}

export async function updateProof(proofId: string, updates: Partial<ZKProof>): Promise<ZKProof | null> {
    const proof = await getProof(proofId);
    if (!proof) return null;

    const updated = { ...proof, ...updates };
    await mastra.storage?.set(`${PROOFS_PREFIX}${proofId}`, JSON.stringify(updated));

    return updated;
}
