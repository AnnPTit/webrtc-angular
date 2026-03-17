# Hướng Dẫn Deploy Lên Railway

## Yêu cầu

- Tài khoản Railway (đăng ký tại https://railway.app)
- Git được cài đặt
- Project đã được commit lên GitHub

## Bước 1: Chuẩn Bị Dự Án

### 1.1 Kiểm Tra Dockerfile
Dockerfile đã được cấu hình để:
- Build ứng dụng Angular
- Copy các file static vào container
- Chạy Express server để phục vụ SPA trên port 4000

⚠️ **Lưu ý**: Hiện tại sử dụng SPA mode. Nếu cần SSR (Server-Side Rendering), xem phần Nâng Cao ở cuối.

### 1.2 Cập Nhật Biến Môi Trường
Tạo file `.env.railway` với các giá trị production:

```env
API_BASE_URL=https://your-api-domain.com
SOCKET_URL=https://your-socket-domain.com
NODE_ENV=production
```

### 1.3 Đẩy Code Lên GitHub
```powershell
git add .
git commit -m "Thêm cấu hình environment cho deployment"
git push origin main
```

## Bước 2: Tạo Dự Án Trên Railway

### 2.1 Truy Cập Railway
1. Đăng nhập vào https://railway.app
2. Click **"Create New Project"**

### 2.2 Kết Nối GitHub
1. Chọn **"Deploy from GitHub repo"**
2. Chọn repository của bạn
3. Click **"Create"**

Railway sẽ tự động phát hiện Dockerfile và bắt đầu build.

## Bước 3: Cấu Hình Biến Môi Trường

### 3.1 Trong Dashboard Railway
1. Mở project vừa tạo
2. Chọn tab **"Variables"**
3. Thêm các biến sau:
   - `API_BASE_URL`: Địa chỉ API backend của bạn
   - `SOCKET_URL`: Địa chỉ Socket.IO server của bạn
   - `NODE_ENV`: `production`

### 3.2 Ví Dụ Cấu Hình
```
API_BASE_URL=https://api.yourdomain.com
SOCKET_URL=https://socket.yourdomain.com
NODE_ENV=production
```

## Bước 4: Cấu Hình Port và Domain

### 4.1 Cấu Hình Port
1. Đi tới tab **"Settings"**
2. Tìm mục **"Networking"**
3. Port đã được set là **4000** (tự động)

### 4.2 Cấu Hình Domain Tùy Chỉnh (Tuỳ chọn)
1. Trong **"Settings"** → **"Networking"**
2. Thêm custom domain của bạn
3. Update DNS settings tại nhà cung cấp domain

## Bước 5: Cập Nhật Environment Production

Khi deploy, hãy cập nhật `src/environments/environment.prod.ts` với domain thực tế:

```typescript
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.yourdomain.com',
  apiEndpoints: {
    auth: '/api/auth',
    courses: '/api/courses',
    lessons: '/api/lessons',
    videos: '/api/videos',
  },
  socket: {
    url: 'https://socket.yourdomain.com',
  },
};
```

## Bước 6: Deploy

### 6.1 Deploy Tự Động
Sau khi kết nối GitHub, Railway sẽ tự động deploy khi:
- Bạn push code lên branch chính
- Hoặc bạn click **"Deploy"** trong dashboard

### 6.2 Monitor Deployment
1. Xem logs trong tab **"Build Logs"**
2. Kiểm tra kết quả build
3. Xem **"Deployment Logs"** khi ứng dụng chạy

## Bước 7: Kiểm Tra Ứng Dụng

1. Vào **"Settings"** → **"Domains"** để lấy URL public
2. Truy cập ứng dụng qua URL đó
3. Mở DevTools (F12) để kiểm tra:
   - Network tab: Xác nhận API calls đi tới đúng domain
   - Console: Kiểm tra WebSocket connection

## Kiểm Tra Lỗi Phổ Biến

### ❌ Lỗi Build
- Kiểm tra **Build Logs** trong Railway
- Đảm bảo version Node.js tương thích
- Kiểm tra package.json có tất cả dependencies

### ❌ Lỗi API Connection
- Kiểm tra `API_BASE_URL` trong **Variables**
- Đảm bảo backend CORS được cấu hình đúng
- Kiểm tra API endpoint có hoạt động

### ❌ Lỗi WebSocket
- Kiểm tra `SOCKET_URL` trong **Variables**
- Đảm bảo Socket.IO server có enable CORS
- Kiểm tra firewall/proxy settings

## Cập Nhật Ứng Dụng

Sau khi deploy lần đầu, để cập nhật:

```powershell
# Chỉnh sửa code của bạn
# ...

# Commit và push
git add .
git commit -m "Cập nhật tính năng"
git push origin main

# Railway sẽ tự động deploy lại
```

## Các Tài Nguyên Hữu Ích

- [Railway Docs](https://docs.railway.app)
- [Hỗ Trợ Railway](https://railway.app/support)
- [Dockerfile Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## Notes

- Dockerfile hiện tại chạy ứng dụng ở chế độ SPA (Static) với Express server
- Server chạy trên port 4000 (có thể thay đổi trong environment variable)
- Environment variables được set trong Railway dashboard
- Logs có thể xem trong Railway dashboard hoặc livestream format

---

## 🚀 Nâng Cao: Cấu Hình SSR (Server-Side Rendering)

Nếu muốn bật SSR (Server-Side Rendering) để tối ưu SEO:

### Bước 1: Cập Nhật Package.json Script
```json
"build": "ng build --ssr"
```

### Bước 2: Cập Nhật Dockerfile Cho SSR
```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist/webrtc-angular ./dist/webrtc-angular
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
CMD ["node", "dist/webrtc-angular/server/server.mjs"]
```

### Bước 3: Đẩy Changes
```powershell
git add .
git commit -m "Enable SSR for better SEO"
git push origin main
```

---

Cần giúp gì thêm không? 😊
