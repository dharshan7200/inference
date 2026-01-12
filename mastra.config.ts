import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { config } from './src/mastra/config';

export const mastra = new Mastra({
    storage: new LibSQLStore({
        url: process.env.DATABASE_URL || 'file:./v-inference.db',
    }),
    logger: {
        level: process.env.LOG_LEVEL || 'info',
    },
});

export default mastra;
