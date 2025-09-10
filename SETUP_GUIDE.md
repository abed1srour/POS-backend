# Backend Setup Guide

## Quick Fix for CORS Issues

### Step 1: Create Environment File
Create a `.env` file in the `backend` directory with the following content:

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/pos_system

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
```

### Step 2: Install Dependencies
```bash
cd backend
npm install
```

### Step 3: Start the Server
```bash
npm run dev
```

### Step 4: Test the Server
```bash
node test-server.js
```

## Troubleshooting

### If the server won't start:
1. Check if port 5000 is already in use
2. Make sure you have a `.env` file
3. Verify database connection (if using PostgreSQL)

### If CORS still doesn't work:
1. Make sure the server is running on port 5000
2. Check that your frontend is running on port 3000
3. Use the Next.js proxy configuration (already set up)

### Alternative: Use Frontend Proxy
If backend CORS continues to be problematic, use the Next.js proxy:

1. Make sure `frontend/next.config.mjs` has the proxy configuration
2. In your frontend code, use relative URLs:
   ```javascript
   // Instead of: fetch('http://localhost:5000/api/auth/login')
   fetch('/api/auth/login')
   ```
3. Restart your frontend server

## Testing Commands

```bash
# Test server connectivity
node test-server.js

# Test CORS configuration
node test-cors.js

# Test health endpoint
curl http://localhost:5000/health

# Test OPTIONS preflight
curl -X OPTIONS -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  http://localhost:5000/api/auth/login
```
