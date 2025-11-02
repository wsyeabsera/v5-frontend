# Frontend Deployment

## Option 1: Vercel (Recommended)

### Why Vercel?
- Next.js optimized (made by the same team)
- Free tier
- Automatic deployments from Git
- Edge network globally

### Steps

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Login**
```bash
vercel login
```

3. **Deploy**
```bash
vercel
```

4. **Set Environment Variable**
```bash
vercel env add NEXT_PUBLIC_BACKEND_URL
# Enter: https://your-backend.railway.app
```

5. **Deploy to Production**
```bash
vercel --prod
```

### GitHub Integration

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your repo
5. Add environment variable: `NEXT_PUBLIC_BACKEND_URL`
6. Deploy!

Every push to `main` auto-deploys.

## Option 2: Netlify

### Steps

1. **Build Command:** `npm run build`
2. **Publish Directory:** `.next`
3. **Environment Variables:**
   - `NEXT_PUBLIC_BACKEND_URL`

## Option 3: Self-Hosted

### Build

```bash
npm run build
```

### Serve with Node

```bash
npm start
```

### Or with Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

## Environment Variables

**Required:**
- `NEXT_PUBLIC_BACKEND_URL` - Your backend URL

**Format:**
```env
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
```

## Build Optimization

Add to `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // For Docker/self-hosting
  compress: true,
  poweredByHeader: false,
};

module.exports = nextConfig;
```

## Docker (Optional)

Create `Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

Build & Run:
```bash
docker build -t mcp-frontend .
docker run -p 3000:3000 -e NEXT_PUBLIC_BACKEND_URL=http://backend:3000 mcp-frontend
```

## Complete!

You now have:
- ✅ Backend (MCP Gateway)
- ✅ Frontend (Chat Interface)
- ✅ Both deployed

## Test Full Stack

1. Open frontend: `https://your-app.vercel.app`
2. Go to Settings
3. Add your Anthropic API key
4. Go to Chat
5. Ask: "List all facilities"
6. Should see AI call MCP tools and respond!

## Next Steps

- Add more UI components
- Improve dashboard visualizations
- Add authentication
- Add tool execution history
- Build mobile apps

**You're done! 🎉**

