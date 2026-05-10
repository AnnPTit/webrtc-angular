FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build Angular
RUN npm run build -- --configuration production

# Cài Express để serve static files với SPA fallback
RUN npm install --no-save express compression

# Tạo server.js để handle SPA routing
RUN cat > server.js << 'EOF'
const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(compression());
app.use(express.static('dist/webrtc-angular/browser'));

// SPA Fallback: Tất cả requests không tìm thấy file → về index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/webrtc-angular/browser/index.html'));
});

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});
EOF

# Copy entrypoint script và cấp quyền thực thi
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV PORT=8080
EXPOSE 8080

# Dùng entrypoint để inject env vars trước khi start server
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
