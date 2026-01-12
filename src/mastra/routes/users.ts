/**
 * V-Inference Mastra Routes - Users
 * User management endpoints
 */

import { Router } from 'express';
import { getOrCreateUser, getUser, getUserModelsData, getUserJobs, getUserPurchases } from '../data';

export default (router: Router) => {
    // Connect wallet
    router.post('/api/users/connect', async (req, res) => {
        try {
            const { wallet_address } = req.body;

            if (!wallet_address) {
                return res.status(400).json({
                    success: false,
                    message: 'Wallet address is required',
                });
            }

            const user = await getOrCreateUser(wallet_address);

            res.json({
                success: true,
                message: 'User connected successfully',
                data: user,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Get user dashboard
    router.get('/api/users/:id/dashboard', async (req, res) => {
        try {
            const { id } = req.params;

            const user = await getUser(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
            }

            const models = await getUserModelsData(id);
            const jobs = await getUserJobs(id);
            const purchases = await getUserPurchases(id);

            res.json({
                success: true,
                message: 'Dashboard data retrieved',
                data: {
                    user,
                    models,
                    recentJobs: jobs.slice(0, 10),
                    purchases,
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
};
