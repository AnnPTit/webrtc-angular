export const environment = {
  production: true,
  apiBaseUrl: process.env['API_BASE_URL'] || 'https://web-rtc-be-production.up.railway.app',
  apiEndpoints: {
    auth: '/api/auth',
    courses: '/api/courses',
    lessons: '/api/lessons',
    videos: '/api/videos',
  },
  socket: {
    url: process.env['SOCKET_URL'] || 'https://socket.example.com',
  },
};
