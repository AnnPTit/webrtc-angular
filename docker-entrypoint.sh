#!/bin/sh
set -e

# Thư mục chứa các file JS đã build
JS_DIR="/app/dist/webrtc-angular/browser"

# Thay thế placeholder bằng biến môi trường thực tế
# Nếu biến không được set, giữ nguyên giá trị mặc định
API_BASE_URL="${API_BASE_URL:-https://webrtcbackend-cexlj3i6.b4a.run}"
SOCKET_URL="${SOCKET_URL:-https://webrtc-signaling-annptit1644-g9un62tx.leapcell.dev}"
R2_PUBLIC_URL="${R2_PUBLIC_URL:-https://pub-5d0364766d28413d822cfa2cb638d396.r2.dev}"

echo "🔧 Injecting environment variables..."
echo "   API_BASE_URL  = $API_BASE_URL"
echo "   SOCKET_URL    = $SOCKET_URL"
echo "   R2_PUBLIC_URL = $R2_PUBLIC_URL"

# Tìm và thay thế trong tất cả file JS
find "$JS_DIR" -name "*.js" -exec sed -i \
  -e "s|__API_BASE_URL__|${API_BASE_URL}|g" \
  -e "s|__SOCKET_URL__|${SOCKET_URL}|g" \
  -e "s|__R2_PUBLIC_URL__|${R2_PUBLIC_URL}|g" \
  {} +

echo "✅ Environment variables injected successfully!"

# Chạy lệnh gốc (node server.js)
exec "$@"
