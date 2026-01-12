/**
 * V-Inference Type Definitions
 * Shared types for the Mastra backend
 */

export enum ModelType {
    ONNX = 'onnx',
    PYTORCH = 'pytorch',
    TENSORFLOW = 'tensorflow',
    CUSTOM = 'custom',
}

export enum JobStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    VERIFIED = 'verified',
}

export enum EscrowStatus {
    LOCKED = 'locked',
    RELEASED = 'released',
    REFUNDED = 'refunded',
}

export interface User {
    id: string;
    wallet_address: string;
    username?: string;
    balance: number;
    created_at: string;
}

export interface AIModel {
    id: string;
    name: string;
    description?: string;
    model_type: ModelType;
    is_public: boolean;
    owner_id: string;
    file_path?: string;
    metadata: Record<string, any>;
    created_at: string;
    total_inferences: number;
    average_latency_ms: number;
}

export interface InferenceJob {
    id: string;
    model_id: string;
    user_id: string;
    input_data: Record<string, any>;
    output_data?: Record<string, any>;
    status: JobStatus;
    proof_hash?: string;
    verification_status?: string;
    tx_hash?: string;
    created_at: string;
    completed_at?: string;
    latency_ms?: number;
}

export interface MarketplaceListing {
    id: string;
    model_id: string;
    owner_id: string;
    model_name: string;
    description: string;
    price_per_inference: number;
    is_active: boolean;
    total_inferences: number;
    total_revenue: number;
    rating: number;
    category: string;
    tags: string[];
    created_at: string;
}

export interface Purchase {
    id: string;
    user_id: string;
    listing_id: string;
    model_id: string;
    inferences_bought: number;
    inferences_remaining: number;
    total_paid: number;
    escrow_status: EscrowStatus;
    created_at: string;
}

export interface ZKProof {
    id: string;
    job_id: string;
    proof_hash: string;
    circuit_hash: string;
    verification_key: string;
    is_valid: boolean;
    generated_at: string;
    verified_at?: string;
    tx_hash?: string;
}

export interface APIResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
}
