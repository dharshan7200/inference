/**
 * V-Inference Data Layer - Jobs
 * Mastra KV storage operations for inference jobs
 */

import { mastra } from '../../../mastra.config';
import { InferenceJob, JobStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

const JOBS_PREFIX = 'jobs:';
const JOBS_BY_USER_PREFIX = 'jobs:user:';
const JOBS_BY_MODEL_PREFIX = 'jobs:model:';
const ALL_JOBS_KEY = 'jobs:all';

export async function createJob(jobData: {
    model_id: string;
    user_id: string;
    input_data: Record<string, any>;
}): Promise<InferenceJob> {
    const job: InferenceJob = {
        id: uuidv4(),
        model_id: jobData.model_id,
        user_id: jobData.user_id,
        input_data: jobData.input_data,
        status: JobStatus.PENDING,
        created_at: new Date().toISOString(),
    };

    // Store job by ID
    await mastra.storage?.set(`${JOBS_PREFIX}${job.id}`, JSON.stringify(job));

    // Add to user's jobs list
    const userJobs = await getUserJobIds(job.user_id);
    userJobs.push(job.id);
    await mastra.storage?.set(`${JOBS_BY_USER_PREFIX}${job.user_id}`, JSON.stringify(userJobs));

    // Add to model's jobs list
    const modelJobs = await getModelJobIds(job.model_id);
    modelJobs.push(job.id);
    await mastra.storage?.set(`${JOBS_BY_MODEL_PREFIX}${job.model_id}`, JSON.stringify(modelJobs));

    // Add to all jobs list
    const allJobs = await getAllJobIds();
    allJobs.push(job.id);
    await mastra.storage?.set(ALL_JOBS_KEY, JSON.stringify(allJobs));

    return job;
}

export async function getJob(jobId: string): Promise<InferenceJob | null> {
    const data = await mastra.storage?.get(`${JOBS_PREFIX}${jobId}`);
    return data ? JSON.parse(data) : null;
}

async function getUserJobIds(userId: string): Promise<string[]> {
    const data = await mastra.storage?.get(`${JOBS_BY_USER_PREFIX}${userId}`);
    return data ? JSON.parse(data) : [];
}

export async function getUserJobs(userId: string): Promise<InferenceJob[]> {
    const jobIds = await getUserJobIds(userId);
    const jobs = await Promise.all(jobIds.map(id => getJob(id)));
    return jobs.filter((j): j is InferenceJob => j !== null);
}

async function getModelJobIds(modelId: string): Promise<string[]> {
    const data = await mastra.storage?.get(`${JOBS_BY_MODEL_PREFIX}${modelId}`);
    return data ? JSON.parse(data) : [];
}

export async function getModelJobs(modelId: string): Promise<InferenceJob[]> {
    const jobIds = await getModelJobIds(modelId);
    const jobs = await Promise.all(jobIds.map(id => getJob(id)));
    return jobs.filter((j): j is InferenceJob => j !== null);
}

async function getAllJobIds(): Promise<string[]> {
    const data = await mastra.storage?.get(ALL_JOBS_KEY);
    return data ? JSON.parse(data) : [];
}

export async function getAllJobs(): Promise<InferenceJob[]> {
    const jobIds = await getAllJobIds();
    const jobs = await Promise.all(jobIds.map(id => getJob(id)));
    return jobs.filter((j): j is InferenceJob => j !== null);
}

export async function updateJob(jobId: string, updates: Partial<InferenceJob>): Promise<InferenceJob | null> {
    const job = await getJob(jobId);
    if (!job) return null;

    const updated = { ...job, ...updates };
    await mastra.storage?.set(`${JOBS_PREFIX}${jobId}`, JSON.stringify(updated));

    return updated;
}
