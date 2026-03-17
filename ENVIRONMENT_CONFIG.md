# Environment Configuration Guide

This document explains how to configure environment variables for different deployment scenarios.

## Environment Files Structure

The project includes environment configuration files for different build modes:

- **`src/environments/environment.ts`** - Development environment configuration
- **`src/environments/environment.prod.ts`** - Production environment configuration
- **`.env`** - Local environment variables (for local development)
- **`.env.example`** - Example environment variables template

## Configuration Variables

### API Configuration

- **`API_BASE_URL`**: The base URL for API endpoints
  - Development: `http://localhost:8080`
  - Production: Change to your production API server URL

### Socket.IO Configuration

- **`SOCKET_URL`**: The Socket.IO server URL for real-time communication
  - Development: `http://localhost:3000`
  - Production: Change to your production Socket.IO server URL

## Setup Instructions

### Local Development

1. Copy `.env.example` to `.env` if not already present:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your local development URLs:
   ```env
   API_BASE_URL=http://localhost:8080
   SOCKET_URL=http://localhost:3000
   NODE_ENV=development
   ```

3. Start the development server:
   ```bash
   npm start
   ```

### Production Build

1. Update `src/environments/environment.prod.ts` with production URLs:
   ```typescript
   export const environment = {
     production: true,
     apiBaseUrl: 'https://your-production-api.com',
     socket: {
       url: 'https://your-production-socket.com',
     },
   };
   ```

2. Build for production:
   ```bash
   ng build --configuration production
   ```

### Environment Variables in Production

For production deployments using environment variables, the `environment.prod.ts` file reads from `process.env`:

```typescript
apiBaseUrl: process.env['API_BASE_URL'] || 'https://api.example.com',
socket: {
  url: process.env['SOCKET_URL'] || 'https://socket.example.com',
}
```

You can set these environment variables before running the application:

**Docker Example:**
```dockerfile
ENV API_BASE_URL=https://api.production.com
ENV SOCKET_URL=https://socket.production.com
```

**Unix/Linux Shell:**
```bash
export API_BASE_URL=https://api.production.com
export SOCKET_URL=https://socket.production.com
npm run build
```

**Windows PowerShell:**
```powershell
$env:API_BASE_URL = "https://api.production.com"
$env:SOCKET_URL = "https://socket.production.com"
npm run build
```

## API Endpoints

The application communicates with the following API endpoints:

| Endpoint | Path | Purpose |
|----------|------|---------|
| Auth | `/api/auth` | Authentication and login |
| Courses | `/api/courses` | Course management |
| Lessons | `/api/lessons` | Lesson management |
| Videos | `/api/videos` | Video upload and metadata |

All endpoints are constructed using:
```
${environment.apiBaseUrl}${environment.apiEndpoints.<endpoint>}
```

## Deployment Checklist

- [ ] Update API URLs in `environment.prod.ts`
- [ ] Update Socket.IO URL in `environment.prod.ts`
- [ ] Set environment variables in deployment platform
- [ ] Run `npm run build --configuration production`
- [ ] Test API connectivity after deployment
- [ ] Verify Socket.IO connection in browser console
- [ ] Check CORS configuration on backend API server

## Troubleshooting

### API Connection Issues

Check the browser's Network tab to verify correct API URLs are being used.

### Socket.IO Connection Issues

Check the browser console for WebSocket connection errors. Ensure the Socket.IO URL is accessible and CORS is properly configured.

### Build Configuration

To verify which environment file is being used, check the build output or inspect the global `environment` object in the browser console:
```javascript
import { environment } from './environments/environment';
console.log(environment);
```
