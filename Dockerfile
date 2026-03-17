# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the Angular application
RUN npm run build -- --configuration production

# Stage 2: Production - Serve with Node.js Express
FROM node:22-alpine AS production

WORKDIR /app

# Copy built assets from builder stage
COPY --from=builder /app/dist/webrtc-angular/browser ./dist

# Install express for serving static files
RUN npm install --no-save express compression

# Create a simple Express server to serve static files
RUN cat > server.js << 'EOF'
const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(compression());
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000

# Expose the port
EXPOSE 4000

# Start the server
CMD ["node", "server.js"]
