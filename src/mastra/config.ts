/**
 * V-Inference Mastra Configuration
 * Central configuration for the Mastra backend
 */

export const config = {
    server: {
        port: parseInt(process.env.PORT || '3001'),
        host: process.env.HOST || '0.0.0.0',
        corsOrigins: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000'],
    },

    database: {
        url: process.env.DATABASE_URL || 'file:./v-inference.db',
    },

    storage: {
        modelsPath: process.env.MODELS_STORAGE_PATH || './storage/models',
    },

    blockchain: {
        sepoliaRpcUrl: process.env.SEPOLIA_RPC_URL || '',
        privateKey: process.env.PRIVATE_KEY || '',
        verifierContract: process.env.VERIFIER_CONTRACT || '0x742d35Cc6634C0532925a3b844Bc9e7595f00000',
        escrowContract: process.env.ESCROW_CONTRACT || '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    },

    zkml: {
        proofVersion: 'zkml-v1.0',
        modelVersion: 'v-inference-v1.0.0',
    },
} as const;

export type Config = typeof config;
