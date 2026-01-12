/**
 * V-Inference Mastra Routes - Models
 * Model management endpoints
 */

import { Router } from 'express';
import multer from 'multer';
import { getModel, getAllModels, getUserModelsData, updateModel, deleteModel, getModelJobs } from '../data';
import { uploadModelWorkflow } from '../workflows';
import { ModelType } from '../types';

const upload = multer({ storage: multer.memoryStorage() });

export default (router: Router) => {
    // Upload model
    router.post('/api/models/upload', upload.single('file'), async (req, res) => {
        try {
            const { name, description, model_type, is_public, owner_id } = req.body;
            const file = req.file;

            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: 'File is required',
                });
            }

            const fileExtension = '.' + file.originalname.split('.').pop();

            // Run upload workflow
            const result = await uploadModelWorkflow.execute({
                name,
                description,
                modelType: model_type as ModelType,
                isPublic: is_public === 'true',
                ownerId: owner_id,
                fileName: file.originalname,
                fileBuffer: file.buffer,
                fileExtension,
            });

            res.json({
                success: true,
                message: 'Model uploaded successfully',
                data: result.model,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // List models
    router.get('/api/models', async (req, res) => {
        try {
            const { owner_id } = req.query;

            const models = owner_id
                ? await getUserModelsData(owner_id as string)
                : await getAllModels();

            res.json({
                success: true,
                message: `Found ${models.length} models`,
                data: models,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Get model
    router.get('/api/models/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const model = await getModel(id);
            if (!model) {
                return res.status(404).json({
                    success: false,
                    message: 'Model not found',
                });
            }

            res.json({
                success: true,
                message: 'Model retrieved successfully',
                data: model,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Update model
    router.put('/api/models/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description, is_public } = req.body;

            const model = await getModel(id);
            if (!model) {
                return res.status(404).json({
                    success: false,
                    message: 'Model not found',
                });
            }

            const updates: any = {};
            if (name !== undefined) updates.name = name;
            if (description !== undefined) updates.description = description;
            if (is_public !== undefined) updates.is_public = is_public;

            const updated = await updateModel(id, updates);

            res.json({
                success: true,
                message: 'Model updated successfully',
                data: updated,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Delete model
    router.delete('/api/models/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { owner_id } = req.query;

            const model = await getModel(id);
            if (!model) {
                return res.status(404).json({
                    success: false,
                    message: 'Model not found',
                });
            }

            if (model.owner_id !== owner_id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to delete this model',
                });
            }

            // Delete file if exists
            if (model.file_path) {
                const { fileDeleteTool } = await import('../tools');
                await fileDeleteTool.execute({ context: { filePath: model.file_path } } as any);
            }

            await deleteModel(id);

            res.json({
                success: true,
                message: 'Model deleted successfully',
                data: null,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Get model stats
    router.get('/api/models/:id/stats', async (req, res) => {
        try {
            const { id } = req.params;

            const model = await getModel(id);
            if (!model) {
                return res.status(404).json({
                    success: false,
                    message: 'Model not found',
                });
            }

            const jobs = await getModelJobs(id);
            const completedJobs = jobs.filter(j => j.status === 'completed');

            const avgLatency = completedJobs.length > 0
                ? completedJobs.reduce((sum, j) => sum + (j.latency_ms || 0), 0) / completedJobs.length
                : 0;

            const stats = {
                model_id: id,
                total_inferences: jobs.length,
                successful_inferences: completedJobs.length,
                failed_inferences: jobs.filter(j => j.status === 'failed').length,
                average_latency_ms: Math.round(avgLatency * 100) / 100,
                success_rate: jobs.length > 0 ? Math.round((completedJobs.length / jobs.length) * 10000) / 100 : 0,
            };

            res.json({
                success: true,
                message: 'Model statistics retrieved',
                data: stats,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
};
