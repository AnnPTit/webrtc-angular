// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.

export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080',
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
    url: 'http://localhost:3000',
  },
  r2PublicUrl: 'https://pub-5d0364766d28413d822cfa2cb638d396.r2.dev',
};
