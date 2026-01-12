/**
 * V-Inference Mastra Routes - Inference
 * Inference execution endpoints
 */

import { Router } from 'express';
import { getJob, getUserJobs, getAllJobs } from '../data';
import { runInferenceWorkflow, verifyProofWorkflow } from '../workflows';
import { getProofByJob } from '../data';

export default (router: Router) => {
    // Run inference
    router.post('/api/inference/run', async (req, res) => {
        try {
            const { model_id, input_data, use_zkml = true, user_id } = req.body;

            if (!model_id || !input_data || !user_id) {
                return res.status(400).json({
                    success: false,
                    message: 'model_id, input_data, and user_id are required',
                });
            }

            const result = await runInferenceWorkflow.execute({
                modelId: model_id,
                userId: user_id,
                inputData: input_data,
                useZkml: use_zkml,
            });

            const job = await getJob(result.jobId);

            res.json({
                success: true,
                message: 'Inference completed successfully',
                data: {
                    job_id: result.jobId,
                    status: job?.status,
                    output: job?.output_data,
                    proof_hash: job?.proof_hash,
                    tx_hash: job?.tx_hash,
                    latency_ms: job?.latency_ms,
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Get job
    router.get('/api/inference/job/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const job = await getJob(id);
            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found',
                });
            }

            res.json({
                success: true,
                message: 'Job retrieved successfully',
                data: job,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // List jobs
    router.get('/api/inference/jobs', async (req, res) => {
        try {
            const { user_id, model_id, limit = 50 } = req.query;

            let jobs = user_id
                ? await getUserJobs(user_id as string)
                : await getAllJobs();

            if (model_id) {
                const { getModelJobs } = await import('../data');
                jobs = await getModelJobs(model_id as string);
            }

            jobs = jobs.slice(0, parseInt(limit as string));

            res.json({
                success: true,
                message: `Found ${jobs.length} jobs`,
                data: jobs,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Verify proof
    router.post('/api/inference/verify-proof/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const job = await getJob(id);
            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found',
                });
            }

            const proof = await getProofByJob(id);
            if (!proof) {
                return res.status(404).json({
                    success: false,
                    message: 'Proof not found',
                });
            }

            const result = await verifyProofWorkflow.execute({
                jobId: id,
                proofHash: proof.proof_hash,
                circuitHash: proof.circuit_hash,
                verificationKey: proof.verification_key,
            });

            res.json({
                success: true,
                message: 'Proof verification completed',
                data: {
                    is_valid: result.isValid,
                    job_status: job.status,
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Get sample inputs
    router.get('/api/inference/sample-inputs', async (req, res) => {
        try {
            const samples = {
                onnx_mnist: {
                    description: 'MNIST digit recognition (28x28 image)',
                    input: {
                        image: Array(784).fill(0).map(() => Math.random()),
                    },
                },
                pkl_iris: {
                    description: 'Iris flower classification',
                    input: {
                        features: [5.1, 3.5, 1.4, 0.2],
                    },
                },
                sentiment: {
                    description: 'Sentiment analysis',
                    input: {
                        text: 'This is a great product!',
                    },
                },
            };

            res.json({
                success: true,
                message: 'Sample inputs retrieved',
                data: samples,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
};
