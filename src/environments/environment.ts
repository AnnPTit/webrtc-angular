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
  },
  socket: {
    url: 'http://localhost:3000',
  },
};
