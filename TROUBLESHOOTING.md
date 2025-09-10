# Troubleshooting Guide

## Current Issue: 403 Forbidden Responses

All requests are returning 403 status codes, which indicates the server is running but something is blocking the requests.

## Step-by-Step Debugging

### Step 1: Check if Server is Running
```bash
cd backend
node simple-test.js
```

### Step 2: Test with Minimal Server
If the main server isn't working, test with the minimal server:
```bash
cd backend
node minimal-server.js
```

Then in another terminal:
```bash
node simple-test.js
```

### Step 3: Check Server Logs
When you run `npm run dev`, look for:
- Any error messages
- Database connection issues
- Missing environment variables

### Step 4: Verify Environment File
Make sure you have a `.env` file in the `backend` directory with:
```env
PORT=5001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DATABASE_URL=postgresql://username:password@localhost:5432/pos_system
```

## Quick Fixes

### Fix 1: Use Minimal Server (Temporary)
```bash
cd backend
node minimal-server.js
```

### Fix 2: Use Frontend Proxy (Recommended)
Since we've already set up the Next.js proxy, use it:

1. **Update your frontend code** to use relative URLs:
   ```javascript
   // Instead of: fetch('http://localhost:5000/api/auth/login')
   fetch('/api/auth/login')
   ```

2. **Restart your frontend server**

3. **The proxy will handle CORS automatically**

### Fix 3: Disable Authentication Temporarily
If you want to test the main server, temporarily comment out the auth middleware in `backend/src/routes/index.js`:

```javascript
// Comment out this line temporarily:
// router.use(authRequired);
```

## Expected Results

### With Minimal Server:
- ✅ Health endpoint: 200 OK
- ✅ CORS headers present
- ✅ OPTIONS requests work

### With Frontend Proxy:
- ✅ No CORS errors in browser
- ✅ Requests work from frontend
- ✅ Backend receives requests properly

## Common Issues

1. **Server not running**: Check if port 5000 is in use
2. **Missing .env file**: Create one with required variables
3. **Database connection**: Server works without database for testing
4. **Authentication middleware**: Blocks requests without tokens

## Next Steps

1. Try the minimal server first to verify CORS works
2. Use the frontend proxy for immediate solution
3. Debug the main server issues separately
4. Once main server works, switch back to it

## Testing Commands

```bash
# Test minimal server
node minimal-server.js

# Test connectivity
node simple-test.js

# Test CORS
node test-cors.js

# Test with curl
curl http://localhost:5001/health
```
