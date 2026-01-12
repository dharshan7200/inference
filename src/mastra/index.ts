/**
 * V-Inference Mastra Entry Point
 * Required by Mastra Cloud for deployment
 */

import { Mastra } from '@mastra/core';
import { LibSQLStore } from '@mastra/libsql';

// Create and export Mastra instance
const mastra = new Mastra({
    storage: new LibSQLStore({
        url: process.env.DATABASE_URL || 'file:./v-inference.db',
    }),
    logger: {
        level: (process.env.LOG_LEVEL as any) || 'info',
    },
    bundler: {
        externals: ['bufferutil', 'utf-8-validate'],
    },
});

// Export as both default and named export
export { mastra };
export default mastra;

