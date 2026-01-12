/**
 * V-Inference Mastra Workflows - Model Workflows
 * Workflows for model upload and management
 */

import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { fileUploadTool } from '../tools';
import { createModel, updateModel } from '../data';
import { ModelType } from '../types';

// Upload Model Workflow
export const uploadModelWorkflow = createWorkflow({
    name: 'upload-model',
    triggerSchema: z.object({
        name: z.string(),
        description: z.string().optional(),
        modelType: z.nativeEnum(ModelType),
        isPublic: z.boolean(),
        ownerId: z.string(),
        fileName: z.string(),
        fileBuffer: z.instanceof(Buffer),
        fileExtension: z.string(),
    }),
})
    .then(
        createStep({
            id: 'create-model-record',
            inputSchema: z.object({
                name: z.string(),
                description: z.string().optional(),
                modelType: z.nativeEnum(ModelType),
                isPublic: z.boolean(),
                ownerId: z.string(),
            }),
            outputSchema: z.object({
                modelId: z.string(),
            }),
            execute: async ({ inputData }) => {
                const model = await createModel({
                    name: inputData.name,
                    description: inputData.description,
                    model_type: inputData.modelType,
                    is_public: inputData.isPublic,
                    owner_id: inputData.ownerId,
                });
                return { modelId: model.id };
            },
        })
    )
    .then(
        createStep({
            id: 'upload-file',
            inputSchema: z.object({
                modelId: z.string(),
                fileName: z.string(),
                fileBuffer: z.instanceof(Buffer),
                fileExtension: z.string(),
            }),
            outputSchema: z.object({
                filePath: z.string(),
                fileSize: z.number(),
            }),
            execute: async ({ inputData, runTool }) => {
                const result = await runTool(fileUploadTool, {
                    modelId: inputData.modelId,
                    fileName: inputData.fileName,
                    fileBuffer: inputData.fileBuffer,
                    fileExtension: inputData.fileExtension,
                });
                return result;
            },
        })
    )
    .then(
        createStep({
            id: 'update-model-with-file',
            inputSchema: z.object({
                modelId: z.string(),
                filePath: z.string(),
                fileSize: z.number(),
            }),
            outputSchema: z.object({
                success: z.boolean(),
                model: z.any(),
            }),
            execute: async ({ inputData }) => {
                const model = await updateModel(inputData.modelId, {
                    file_path: inputData.filePath,
                    metadata: {
                        file_size: inputData.fileSize,
                        file_size_mb: parseFloat((inputData.fileSize / (1024 * 1024)).toFixed(2)),
                    },
                });
                return { success: true, model };
            },
        })
    );
