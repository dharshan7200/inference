/**
 * V-Inference Mastra Tools - Storage Tools
 * Tools for file upload and storage operations
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { config } from '../config';

// Ensure storage directory exists
const storageDir = config.storage.modelsPath;
if (!existsSync(storageDir)) {
    mkdirSync(storageDir, { recursive: true });
}

// File Upload Tool
export const fileUploadTool = createTool({
    id: 'file-upload',
    description: 'Upload and save a model file to storage',
    inputSchema: z.object({
        modelId: z.string().describe('Model ID'),
        fileName: z.string().describe('Original file name'),
        fileBuffer: z.instanceof(Buffer).describe('File buffer'),
        fileExtension: z.string().describe('File extension'),
    }),
    outputSchema: z.object({
        filePath: z.string(),
        fileSize: z.number(),
        fileSizeMb: z.number(),
    }),
    execute: async ({ context }) => {
        const { modelId, fileName, fileBuffer, fileExtension } = context;

        try {
            // Create file path
            const filePath = join(storageDir, `${modelId}${fileExtension}`);

            // Save file
            writeFileSync(filePath, fileBuffer);

            // Get file size
            const fileSize = fileBuffer.length;
            const fileSizeMb = parseFloat((fileSize / (1024 * 1024)).toFixed(2));

            return {
                filePath,
                fileSize,
                fileSizeMb,
            };
        } catch (error) {
            throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },
});

// File Delete Tool
export const fileDeleteTool = createTool({
    id: 'file-delete',
    description: 'Delete a model file from storage',
    inputSchema: z.object({
        filePath: z.string().describe('Path to the file to delete'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
    }),
    execute: async ({ context }) => {
        const { filePath } = context;

        try {
            if (!existsSync(filePath)) {
                return {
                    success: false,
                    message: 'File not found',
                };
            }

            unlinkSync(filePath);

            return {
                success: true,
                message: 'File deleted successfully',
            };
        } catch (error) {
            throw new Error(`File deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },
});
