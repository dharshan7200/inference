/**
 * V-Inference Mastra Routes - Platform
 * Platform stats and health endpoints
 */

import { Router } from 'express';
import { getAllModels, getAllJobs, getActiveListings } from '../data';

export default (router: Router) => {
    // Root endpoint
    router.get('/', async (req, res) => {
        res.json({
            name: 'V-Inference API',
            version: '1.0.0',
            description: 'Decentralized AI Inference Network with ZKML Verification',
            docs: '/docs',
            status: 'online',
            endpoints: {
                users: '/api/users',
                models: '/api/models',
                inference: '/api/inference',
                marketplace: '/api/marketplace',
            },
        });
    });

    // Health check
    router.get('/health', async (req, res) => {
        res.json({
            status: 'healthy',
            service: 'v-inference-backend',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
        });
    });

    // Platform stats
    router.get('/api/stats', async (req, res) => {
        try {
            const models = await getAllModels();
            const jobs = await getAllJobs();
            const listings = await getActiveListings();

            const completedJobs = jobs.filter(j => j.status === 'completed');
            const verifiedJobs = jobs.filter(j => j.status === 'verified' || j.proof_hash);

            const stats = {
                platform: 'V-Inference',
                stats: {
                    total_models: models.length,
                    total_inferences: jobs.length,
                    completed_inferences: completedJobs.length,
                    verified_inferences: verifiedJobs.length,
                    active_listings: listings.length,
                    verification_rate: completedJobs.length > 0
                        ? Math.round((verifiedJobs.length / completedJobs.length) * 10000) / 100
                        : 0,
                },
                network: {
                    chain: 'Base Sepolia',
                    verifier_contract: '0x742d35Cc6634C0532925a3b844Bc9e7595f00000',
                    escrow_contract: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
                },
            };

            res.json(stats);
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });
};
