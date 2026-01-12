/**
 * V-Inference Mastra Entry Point
 * Required by Mastra Cloud for deployment
 */

import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';

// Import all tools
import * as tools from './tools';

// Import all workflows
import * as workflows from './workflows';

// Create Mastra instance
export const mastra = new Mastra({
    storage: new LibSQLStore({
        url: process.env.DATABASE_URL || 'file:./v-inference.db',
    }),
    logger: {
        level: (process.env.LOG_LEVEL as any) || 'info',
    },
    bundler: {
        externals: ['bufferutil', 'utf-8-validate'], // Exclude optional ethers dependencies
    },
});

// Export all components for Mastra Cloud
export const allTools = Object.values(tools);
export const allWorkflows = Object.values(workflows);
export const agents = []; // No agents in this project

export default mastra;
