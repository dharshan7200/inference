/**
 * V-Inference Data Layer - Models
 * Mastra KV storage operations for AI models
 */

import { mastra } from '../../../mastra.config';
import { AIModel, ModelType } from '../types';
import { v4 as uuidv4 } from 'uuid';

const MODELS_PREFIX = 'models:';
const MODELS_BY_OWNER_PREFIX = 'models:owner:';
const ALL_MODELS_KEY = 'models:all';

export async function createModel(modelData: {
    name: string;
    description?: string;
    model_type: ModelType;
    is_public: boolean;
    owner_id: string;
    metadata?: Record<string, any>;
}): Promise<AIModel> {
    const model: AIModel = {
        id: uuidv4(),
        name: modelData.name,
        description: modelData.description,
        model_type: modelData.model_type,
        is_public: modelData.is_public,
        owner_id: modelData.owner_id,
        metadata: modelData.metadata || {},
        created_at: new Date().toISOString(),
        total_inferences: 0,
        average_latency_ms: 0,
    };

    // Store model by ID
    await mastra.storage?.set(`${MODELS_PREFIX}${model.id}`, JSON.stringify(model));

    // Add to owner's models list
    const ownerModels = await getUserModels(model.owner_id);
    ownerModels.push(model.id);
    await mastra.storage?.set(`${MODELS_BY_OWNER_PREFIX}${model.owner_id}`, JSON.stringify(ownerModels));

    // Add to all models list
    const allModels = await getAllModelIds();
    allModels.push(model.id);
    await mastra.storage?.set(ALL_MODELS_KEY, JSON.stringify(allModels));

    return model;
}

export async function getModel(modelId: string): Promise<AIModel | null> {
    const data = await mastra.storage?.get(`${MODELS_PREFIX}${modelId}`);
    return data ? JSON.parse(data) : null;
}

async function getUserModels(userId: string): Promise<string[]> {
    const data = await mastra.storage?.get(`${MODELS_BY_OWNER_PREFIX}${userId}`);
    return data ? JSON.parse(data) : [];
}

export async function getUserModelsData(userId: string): Promise<AIModel[]> {
    const modelIds = await getUserModels(userId);
    const models = await Promise.all(modelIds.map(id => getModel(id)));
    return models.filter((m): m is AIModel => m !== null);
}

async function getAllModelIds(): Promise<string[]> {
    const data = await mastra.storage?.get(ALL_MODELS_KEY);
    return data ? JSON.parse(data) : [];
}

export async function getAllModels(): Promise<AIModel[]> {
    const modelIds = await getAllModelIds();
    const models = await Promise.all(modelIds.map(id => getModel(id)));
    return models.filter((m): m is AIModel => m !== null);
}

export async function updateModel(modelId: string, updates: Partial<AIModel>): Promise<AIModel | null> {
    const model = await getModel(modelId);
    if (!model) return null;

    const updated = { ...model, ...updates };
    await mastra.storage?.set(`${MODELS_PREFIX}${modelId}`, JSON.stringify(updated));

    return updated;
}

export async function deleteModel(modelId: string): Promise<boolean> {
    const model = await getModel(modelId);
    if (!model) return false;

    // Remove from storage
    await mastra.storage?.delete(`${MODELS_PREFIX}${modelId}`);

    // Remove from owner's list
    const ownerModels = await getUserModels(model.owner_id);
    const filtered = ownerModels.filter(id => id !== modelId);
    await mastra.storage?.set(`${MODELS_BY_OWNER_PREFIX}${model.owner_id}`, JSON.stringify(filtered));

    // Remove from all models list
    const allModels = await getAllModelIds();
    const filteredAll = allModels.filter(id => id !== modelId);
    await mastra.storage?.set(ALL_MODELS_KEY, JSON.stringify(filteredAll));

    return true;
}
