/**
 * V-Inference Mastra Workflows - Inference Workflows
 * Workflows for running inference with ZK proof generation
 */

import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import {
    onnxExecutionTool,
    pklExecutionTool,
    sentimentAnalysisTool,
    zkProofGeneratorTool,
    blockchainAnchorTool,
} from '../tools';
import { createJob, updateJob, getModel } from '../data';
import { JobStatus, ModelType } from '../types';

// Run Inference Workflow
export const runInferenceWorkflow = createWorkflow({
    name: 'run-inference',
    triggerSchema: z.object({
        modelId: z.string(),
        userId: z.string(),
        inputData: z.record(z.any()),
        useZkml: z.boolean().default(true),
    }),
})
    .then(
        createStep({
            id: 'create-job',
            inputSchema: z.object({
                modelId: z.string(),
                userId: z.string(),
                inputData: z.record(z.any()),
            }),
            outputSchema: z.object({
                jobId: z.string(),
            }),
            execute: async ({ inputData }) => {
                const job = await createJob({
                    model_id: inputData.modelId,
                    user_id: inputData.userId,
                    input_data: inputData.inputData,
                });
                await updateJob(job.id, { status: JobStatus.PROCESSING });
                return { jobId: job.id };
            },
        })
    )
    .then(
        createStep({
            id: 'run-inference',
            inputSchema: z.object({
                jobId: z.string(),
                modelId: z.string(),
                inputData: z.record(z.any()),
            }),
            outputSchema: z.object({
                output: z.record(z.any()),
                latencyMs: z.number(),
            }),
            execute: async ({ inputData, runTool }) => {
                const model = await getModel(inputData.modelId);
                if (!model) throw new Error('Model not found');

                let result;

                if (model.model_type === ModelType.ONNX && model.file_path) {
                    result = await runTool(onnxExecutionTool, {
                        modelPath: model.file_path,
                        inputData: inputData.inputData,
                    });
                } else if (model.model_type === ModelType.CUSTOM && model.file_path?.endsWith('.pkl')) {
                    result = await runTool(pklExecutionTool, {
                        modelPath: model.file_path,
                        inputData: inputData.inputData,
                    });
                } else if (inputData.inputData.text) {
                    result = await runTool(sentimentAnalysisTool, {
                        text: inputData.inputData.text,
                    });
                } else {
                    throw new Error('Unsupported model type or input format');
                }

                return result;
            },
        })
    )
    .then(
        createStep({
            id: 'generate-zk-proof',
            inputSchema: z.object({
                jobId: z.string(),
                modelId: z.string(),
                inputData: z.record(z.any()),
                output: z.record(z.any()),
                useZkml: z.boolean(),
            }),
            outputSchema: z.object({
                proofHash: z.string().optional(),
                txHash: z.string().optional(),
            }),
            execute: async ({ inputData, runTool }) => {
                if (!inputData.useZkml) {
                    return { proofHash: undefined, txHash: undefined };
                }

                const proofResult = await runTool(zkProofGeneratorTool, {
                    jobId: inputData.jobId,
                    modelId: inputData.modelId,
                    inputData: inputData.inputData,
                    outputData: inputData.output,
                });

                const anchorResult = await runTool(blockchainAnchorTool, {
                    jobId: inputData.jobId,
                    proofHash: proofResult.proofHash,
                });

                return {
                    proofHash: proofResult.proofHash,
                    txHash: anchorResult.txHash,
                };
            },
        })
    )
    .then(
        createStep({
            id: 'update-job-complete',
            inputSchema: z.object({
                jobId: z.string(),
                output: z.record(z.any()),
                latencyMs: z.number(),
                proofHash: z.string().optional(),
                txHash: z.string().optional(),
            }),
            outputSchema: z.object({
                success: z.boolean(),
            }),
            execute: async ({ inputData }) => {
                await updateJob(inputData.jobId, {
                    status: JobStatus.COMPLETED,
                    output_data: inputData.output,
                    latency_ms: inputData.latencyMs,
                    proof_hash: inputData.proofHash,
                    tx_hash: inputData.txHash,
                    completed_at: new Date().toISOString(),
                });
                return { success: true };
            },
        })
    );

// Verify Proof Workflow
export const verifyProofWorkflow = createWorkflow({
    name: 'verify-proof',
    triggerSchema: z.object({
        jobId: z.string(),
        proofHash: z.string(),
        circuitHash: z.string(),
        verificationKey: z.string(),
    }),
})
    .then(
        createStep({
            id: 'verify-proof',
            inputSchema: z.object({
                proofHash: z.string(),
                circuitHash: z.string(),
                verificationKey: z.string(),
            }),
            outputSchema: z.object({
                isValid: z.boolean(),
                message: z.string(),
            }),
            execute: async ({ inputData, runTool }) => {
                const { zkProofVerifierTool } = await import('../tools');
                return await runTool(zkProofVerifierTool, inputData);
            },
        })
    )
    .then(
        createStep({
            id: 'update-job-verified',
            inputSchema: z.object({
                jobId: z.string(),
                isValid: z.boolean(),
            }),
            outputSchema: z.object({
                success: z.boolean(),
            }),
            execute: async ({ inputData }) => {
                await updateJob(inputData.jobId, {
                    status: inputData.isValid ? JobStatus.VERIFIED : JobStatus.FAILED,
                    verification_status: inputData.isValid ? 'verified' : 'failed',
                });
                return { success: true };
            },
        })
    );
