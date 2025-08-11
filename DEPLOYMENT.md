# HRmageddon Deployment Guide

## Quick Deploy to Render

### 1. Environment Files Setup

**Rename the environment files:**
```bash
# In client directory
mv env.development .env.development
mv env.production .env.production
```

### 2. Render Blueprint Deployment

1. **Push to GitHub**: Ensure all changes are committed and pushed to your main branch
2. **Go to Render**: Visit [render.com](https://render.com) and sign in
3. **New Blueprint**: Click "New" → "Blueprint"
4. **Connect Repository**: Select your HRmageddon repository
5. **Deploy**: Render will automatically create both services:
   - **hrmageddon-api** (Web service)
   - **hrmageddon-client** (Static site)

### 3. Environment Variables (if manual setup)

If you need to set up services manually:

**API Service (`hrmageddon-api`):**
- `NODE_VERSION`: `20`
- `CLIENT_ORIGIN`: `https://hrmageddon-client.onrender.com`

**Static Site (`hrmageddon-client`):**
- `VITE_API_URL`: `https://hrmageddon-api.onrender.com`
- `VITE_SOCKET_URL`: `wss://hrmageddon-api.onrender.com`

### 4. Verify Deployment

**API Health Check:**
```bash
curl https://hrmageddon-api.onrender.com/api/health
# Should return: {"status":"ok"}
```

**Client Site:**
- Visit `https://hrmageddon-client.onrender.com`
- Check browser console for WebSocket connections
- Verify no CORS errors

### 5. Local Development

**Start both services:**
```bash
npm run dev
```

**Access URLs:**
- **Client**: http://localhost:5178
- **Server**: http://localhost:4001
- **Health Check**: http://localhost:4001/api/health

## Troubleshooting

### CORS Issues
- Ensure `CLIENT_ORIGIN` matches your static site URL exactly
- No trailing slashes in environment variables
- Check browser console for CORS error details

### WebSocket Connection Issues
- Verify `VITE_SOCKET_URL` uses `wss://` in production
- Check that `CLIENT_ORIGIN` includes the correct protocol (https://)
- Ensure both services are deployed and running

### Build Failures
- Check Node.js version (requires 20+)
- Verify all dependencies are in package.json
- Check build logs for specific error messages
