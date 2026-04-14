export const environment = {
  production: true,
  apiBaseUrl: 'https://web-rtc-backend-production-0910.up.railway.app',
  apiEndpoints: {
    auth: '/api/auth',
    courses: '/api/courses',
    lessons: '/api/lessons',
    videos: '/api/videos',
    transcriptions: '/api/transcriptions',
    assignments: '/api/assignments',
    quizResults: '/api/quiz-results',
  },
  socket: {
    url: 'https://webrtc-signaling-production-534f.up.railway.app',
  },
  r2PublicUrl: 'https://pub-5d0364766d28413d822cfa2cb638d396.r2.dev',
};
