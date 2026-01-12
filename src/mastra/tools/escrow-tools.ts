/**
 * V-Inference Mastra Tools - Escrow Tools
 * Tools for managing escrow operations in the marketplace
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { EscrowStatus } from '../types';
import { updatePurchase, getPurchase } from '../data';
import { updateUserBalance, getUser } from '../data';

// Escrow Lock Tool
export const escrowLockTool = createTool({
    id: 'escrow-lock',
    description: 'Lock funds in escrow for a marketplace purchase',
    inputSchema: z.object({
        purchaseId: z.string().describe('Purchase ID'),
        userId: z.string().describe('User ID'),
        amount: z.number().describe('Amount to lock'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        escrowStatus: z.string(),
        newBalance: z.number(),
    }),
    execute: async ({ context }) => {
        const { purchaseId, userId, amount } = context;

        try {
            // Get user
            const user = await getUser(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Check balance
            if (user.balance < amount) {
                throw new Error('Insufficient balance');
            }

            // Deduct from user balance
            const newBalance = user.balance - amount;
            await updateUserBalance(userId, newBalance);

            // Update purchase escrow status
            await updatePurchase(purchaseId, {
                escrow_status: EscrowStatus.LOCKED,
            });

            return {
                success: true,
                escrowStatus: EscrowStatus.LOCKED,
                newBalance,
            };
        } catch (error) {
            throw new Error(`Escrow lock failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },
});

// Escrow Release Tool
export const escrowReleaseTool = createTool({
    id: 'escrow-release',
    description: 'Release escrow funds to the seller after successful verification',
    inputSchema: z.object({
        purchaseId: z.string().describe('Purchase ID'),
        sellerId: z.string().describe('Seller user ID'),
        amount: z.number().describe('Amount to release'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        escrowStatus: z.string(),
        sellerNewBalance: z.number(),
    }),
    execute: async ({ context }) => {
        const { purchaseId, sellerId, amount } = context;

        try {
            // Get seller
            const seller = await getUser(sellerId);
            if (!seller) {
                throw new Error('Seller not found');
            }

            // Add to seller balance
            const newBalance = seller.balance + amount;
            await updateUserBalance(sellerId, newBalance);

            // Update purchase escrow status
            await updatePurchase(purchaseId, {
                escrow_status: EscrowStatus.RELEASED,
            });

            return {
                success: true,
                escrowStatus: EscrowStatus.RELEASED,
                sellerNewBalance: newBalance,
            };
        } catch (error) {
            throw new Error(`Escrow release failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },
});

// Escrow Refund Tool
export const escrowRefundTool = createTool({
    id: 'escrow-refund',
    description: 'Refund escrow funds to the buyer if verification fails',
    inputSchema: z.object({
        purchaseId: z.string().describe('Purchase ID'),
        buyerId: z.string().describe('Buyer user ID'),
        amount: z.number().describe('Amount to refund'),
    }),
    outputSchema: z.object({
        success: z.boolean(),
        escrowStatus: z.string(),
        buyerNewBalance: z.number(),
    }),
    execute: async ({ context }) => {
        const { purchaseId, buyerId, amount } = context;

        try {
            // Get buyer
            const buyer = await getUser(buyerId);
            if (!buyer) {
                throw new Error('Buyer not found');
            }

            // Refund to buyer balance
            const newBalance = buyer.balance + amount;
            await updateUserBalance(buyerId, newBalance);

            // Update purchase escrow status
            await updatePurchase(purchaseId, {
                escrow_status: EscrowStatus.REFUNDED,
            });

            return {
                success: true,
                escrowStatus: EscrowStatus.REFUNDED,
                buyerNewBalance: newBalance,
            };
        } catch (error) {
            throw new Error(`Escrow refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },
});
