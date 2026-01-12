/**
 * V-Inference Mastra Workflows - Marketplace Workflows
 * Workflows for marketplace purchases and usage
 */

import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { escrowLockTool, escrowReleaseTool } from '../tools';
import { createPurchase, createListing, getListing, updatePurchase, getModel } from '../data';

// Purchase Inference Workflow
export const purchaseInferenceWorkflow = createWorkflow({
    name: 'purchase-inference',
    triggerSchema: z.object({
        userId: z.string(),
        listingId: z.string(),
        inferencesCount: z.number(),
    }),
})
    .then(
        createStep({
            id: 'get-listing',
            inputSchema: z.object({
                listingId: z.string(),
            }),
            outputSchema: z.object({
                listing: z.any(),
                totalCost: z.number(),
            }),
            execute: async ({ inputData }) => {
                const listing = await getListing(inputData.listingId);
                if (!listing) throw new Error('Listing not found');

                const totalCost = listing.price_per_inference * inputData.inferencesCount;
                return { listing, totalCost };
            },
        })
    )
    .then(
        createStep({
            id: 'create-purchase',
            inputSchema: z.object({
                userId: z.string(),
                listingId: z.string(),
                listing: z.any(),
                inferencesCount: z.number(),
                totalCost: z.number(),
            }),
            outputSchema: z.object({
                purchaseId: z.string(),
            }),
            execute: async ({ inputData }) => {
                const purchase = await createPurchase({
                    user_id: inputData.userId,
                    listing_id: inputData.listingId,
                    model_id: inputData.listing.model_id,
                    inferences_bought: inputData.inferencesCount,
                    total_paid: inputData.totalCost,
                });
                return { purchaseId: purchase.id };
            },
        })
    )
    .then(
        createStep({
            id: 'lock-escrow',
            inputSchema: z.object({
                purchaseId: z.string(),
                userId: z.string(),
                totalCost: z.number(),
            }),
            outputSchema: z.object({
                success: z.boolean(),
            }),
            execute: async ({ inputData, runTool }) => {
                await runTool(escrowLockTool, {
                    purchaseId: inputData.purchaseId,
                    userId: inputData.userId,
                    amount: inputData.totalCost,
                });
                return { success: true };
            },
        })
    );

// Use Marketplace Inference Workflow
export const useMarketplaceInferenceWorkflow = createWorkflow({
    name: 'use-marketplace-inference',
    triggerSchema: z.object({
        purchaseId: z.string(),
        inputData: z.record(z.any()),
    }),
})
    .then(
        createStep({
            id: 'validate-purchase',
            inputSchema: z.object({
                purchaseId: z.string(),
            }),
            outputSchema: z.object({
                purchase: z.any(),
                modelId: z.string(),
            }),
            execute: async ({ inputData }) => {
                const { getPurchase } = await import('../data');
                const purchase = await getPurchase(inputData.purchaseId);
                if (!purchase) throw new Error('Purchase not found');
                if (purchase.inferences_remaining <= 0) throw new Error('No inferences remaining');

                return { purchase, modelId: purchase.model_id };
            },
        })
    )
    .then(
        createStep({
            id: 'run-inference',
            inputSchema: z.object({
                modelId: z.string(),
                purchase: z.any(),
                inputData: z.record(z.any()),
            }),
            outputSchema: z.object({
                output: z.record(z.any()),
                jobId: z.string(),
            }),
            execute: async ({ inputData, runWorkflow }) => {
                const { runInferenceWorkflow } = await import('./inference-workflows');
                const result = await runWorkflow(runInferenceWorkflow, {
                    modelId: inputData.modelId,
                    userId: inputData.purchase.user_id,
                    inputData: inputData.inputData,
                    useZkml: true,
                });
                return result;
            },
        })
    )
    .then(
        createStep({
            id: 'decrement-credits',
            inputSchema: z.object({
                purchaseId: z.string(),
                purchase: z.any(),
            }),
            outputSchema: z.object({
                success: z.boolean(),
            }),
            execute: async ({ inputData }) => {
                await updatePurchase(inputData.purchaseId, {
                    inferences_remaining: inputData.purchase.inferences_remaining - 1,
                });
                return { success: true };
            },
        })
    );
