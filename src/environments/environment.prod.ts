export const environment = {
  production: true,
  apiBaseUrl: 'https://web-rtc-backend-2073.onrender.com',
  apiEndpoints: {
    auth: '/api/auth',
    courses: '/api/courses',
    lessons: '/api/lessons',
    videos: '/api/videos',
    transcriptions: '/api/transcriptions',
    assignments: '/api/assignments',
    quizResults: '/api/quiz-results',
    vocabulary: '/api/vocabulary',
  },
  socket: {
    url: 'https://webrtc-signaling-annptit1644-g9un62tx.leapcell.dev',
  },
  r2PublicUrl: 'https://pub-5d0364766d28413d822cfa2cb638d396.r2.dev',
};
