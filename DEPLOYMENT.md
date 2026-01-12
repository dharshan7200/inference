# V-Inference Mastra Backend - Deployment Guide

## Quick Start (Local Development)

### 1. Install Dependencies

```bash
npm install
```

This will install all required packages:
- `@mastra/core` - Mastra framework
- `@mastra/libsql` - LibSQL storage adapter
- `hono` - HTTP server
- `onnxruntime-node` - ONNX inference
- `@xenova/transformers` - NLP models
- `ethers` - Blockchain interaction

### 2. Set Up Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL=file:./v-inference.db
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 3. Run the Development Server

```bash
npm run dev
```

The Mastra backend will start on `http://localhost:3001`

### 4. Update Frontend API URL

Edit `frontend/src/lib/api.ts`:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
```

### 5. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at `http://localhost:3000`

---

## Production Deployment

### Option 1: Deploy to Vercel (Recommended for Mastra)

Mastra works seamlessly with Vercel's serverless platform.

#### Steps:

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Configure for Vercel**
   
   Create `vercel.json`:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "framework": null,
     "rewrites": [
       { "source": "/(.*)", "destination": "/api" }
     ]
   }
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables in Vercel Dashboard**
   - `DATABASE_URL` - Use Turso (LibSQL cloud) or PostgreSQL
   - `FRONTEND_URL` - Your frontend URL
   - `SEPOLIA_RPC_URL` - Infura/Alchemy endpoint
   - `PRIVATE_KEY` - Wallet private key (use Vercel secrets)

### Option 2: Deploy to Railway

Railway provides easy deployment with PostgreSQL database.

#### Steps:

1. **Install Railway CLI**
   ```bash
   npm i -g @railway/cli
   ```

2. **Initialize Railway Project**
   ```bash
   railway init
   ```

3. **Add PostgreSQL Database**
   ```bash
   railway add
   # Select PostgreSQL
   ```

4. **Update Storage Configuration**
   
   Install PostgreSQL adapter:
   ```bash
   npm install @mastra/postgres
   ```
   
   Update `mastra.config.ts`:
   ```typescript
   import { PostgresStore } from '@mastra/postgres';
   
   export const mastra = new Mastra({
     storage: new PostgresStore({
       connectionString: process.env.DATABASE_URL,
     }),
   });
   ```

5. **Deploy**
   ```bash
   railway up
   ```

### Option 3: Deploy to Render

1. **Create `render.yaml`**:
   ```yaml
   services:
     - type: web
       name: v-inference-backend
       env: node
       buildCommand: npm install && npm run build
       startCommand: npm start
       envVars:
         - key: DATABASE_URL
           sync: false
         - key: NODE_ENV
           value: production
   ```

2. **Connect GitHub Repository**
   - Go to Render dashboard
   - Connect your repository
   - Render will auto-deploy on push

### Option 4: Self-Hosted (VPS/Cloud)

For AWS EC2, DigitalOcean, or any VPS:

1. **Install Node.js 18+**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Clone Repository**
   ```bash
   git clone <your-repo>
   cd V-Inference-Verifiable-Inference-Network--main
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Build**
   ```bash
   npm run build
   ```

5. **Set Up PM2 (Process Manager)**
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name v-inference
   pm2 save
   pm2 startup
   ```

6. **Configure Nginx (Reverse Proxy)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## Database Options

### Local Development: LibSQL (SQLite)
```typescript
new LibSQLStore({ url: 'file:./v-inference.db' })
```

### Production Option 1: Turso (LibSQL Cloud)
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create database
turso db create v-inference

# Get connection URL
turso db show v-inference --url
```

Update `.env`:
```env
DATABASE_URL=libsql://your-db.turso.io?authToken=your-token
```

### Production Option 2: PostgreSQL
```bash
npm install @mastra/postgres
```

Update `mastra.config.ts`:
```typescript
import { PostgresStore } from '@mastra/postgres';

new PostgresStore({
  connectionString: process.env.DATABASE_URL
})
```

### Production Option 3: Upstash (Redis-compatible)
```bash
npm install @mastra/upstash
```

```typescript
import { UpstashStore } from '@mastra/upstash';

new UpstashStore({
  url: process.env.UPSTASH_URL,
  token: process.env.UPSTASH_TOKEN
})
```

---

## Environment Variables Reference

### Required
- `DATABASE_URL` - Database connection string
- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS

### Optional (Blockchain)
- `SEPOLIA_RPC_URL` - Sepolia testnet RPC endpoint
- `PRIVATE_KEY` - Wallet private key for transactions
- `VERIFIER_CONTRACT` - ZK verifier contract address
- `ESCROW_CONTRACT` - Escrow contract address

### Optional (Storage)
- `MODELS_STORAGE_PATH` - Path for model files (default: ./storage/models)

---

## Monitoring & Observability

Mastra includes built-in observability. To enable:

```typescript
// In mastra.config.ts
export const mastra = new Mastra({
  storage: new LibSQLStore({ url: process.env.DATABASE_URL }),
  logger: {
    level: 'info', // 'debug' | 'info' | 'warn' | 'error'
  },
  telemetry: {
    enabled: true,
  },
});
```

---

## Testing

### Run Tests
```bash
npm test
```

### Test Specific Components
```bash
npm run test:tools      # Test tools
npm run test:workflows  # Test workflows
npm run test:api        # Test API routes
```

---

## Troubleshooting

### Issue: "Cannot find module '@mastra/core'"
**Solution**: Run `npm install`

### Issue: "ONNX Runtime not found"
**Solution**: Install platform-specific ONNX runtime:
```bash
npm install onnxruntime-node
```

### Issue: "Database connection failed"
**Solution**: Check `DATABASE_URL` in `.env`

### Issue: "Port 3001 already in use"
**Solution**: Change `PORT` in `.env` or kill the process:
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

---

## Next Steps

1. ✅ Complete the remaining Mastra components (workflows, routes, server)
2. ✅ Test locally with `npm run dev`
3. ✅ Update frontend API URL
4. ✅ Choose a deployment platform
5. ✅ Set up production database
6. ✅ Deploy!

---

## Support

- **Mastra Docs**: https://mastra.ai/docs
- **Mastra Discord**: https://discord.gg/mastra
- **GitHub Issues**: Create an issue in your repository
