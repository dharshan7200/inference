/**
 * V-Inference Mastra Server
 * Main server entry point using Mastra runtime
 */

import express from 'express';
import cors from 'cors';
import { mastra } from '../mastra.config';
import { config } from './mastra/config';

// Import all routes
import usersRoutes from './mastra/routes/users';
import modelsRoutes from './mastra/routes/models';
import inferenceRoutes from './mastra/routes/inference';
import marketplaceRoutes from './mastra/routes/marketplace';
import platformRoutes from './mastra/routes/platform';

const app = express();

// Middleware
app.use(cors({
    origin: config.server.corsOrigins,
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create router
const router = express.Router();

// Register all routes
platformRoutes(router);
usersRoutes(router);
modelsRoutes(router);
inferenceRoutes(router);
marketplaceRoutes(router);

// Mount router
app.use(router);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: err.message || 'Internal server error',
    });
});

// Start server
const PORT = config.server.port;
const HOST = config.server.host;

app.listen(PORT, HOST, () => {
    console.log('🚀 V-Inference Backend Starting...');
    console.log(`✅ Server running on http://${HOST}:${PORT}`);
    console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
    console.log(`📚 API docs: http://${HOST}:${PORT}/docs`);
    console.log('⚡ ZKML Simulator ready');
    console.log('🔗 Mastra backend initialized');
});

export default app;
