import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';

// Import tools
import * as tools from './src/mastra/tools';

// Import workflows (will be created)
import * as workflows from './src/mastra/workflows';

// Import routes (will be created)
import * as routes from './src/mastra/routes';

export const mastra = new Mastra({
    storage: new LibSQLStore({
        url: process.env.DATABASE_URL || 'file:./v-inference.db',
    }),
    bundler: {
        externals: [
            'bufferutil',
            'utf-8-validate',
            'ethers',
            'onnxruntime-node',
            '@xenova/transformers',
            'express',
            'cors',
            'multer',
        ],
    },
});

// Export all required components for Mastra Cloud
export const agents = []; // No agents in this project, using workflows instead

export const allWorkflows = Object.values(workflows);

export const allTools = Object.values(tools);

export const allRoutes = Object.values(routes);

export default mastra;
