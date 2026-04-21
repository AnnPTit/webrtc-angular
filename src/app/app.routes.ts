import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent),
    canActivate: [loginGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./components/register/register.component').then(m => m.RegisterComponent),
    canActivate: [loginGuard],
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./components/home/home.component').then(m => m.HomeComponent),
    canActivate: [authGuard],
    data: { roles: ['STUDENT'] }
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/lecturer-dashboard/lecturer-dashboard.component').then(m => m.LecturerDashboardComponent),
    canActivate: [authGuard],
    data: { roles: ['LECTURER'] }
  },
  {
    path: 'dashboard/courses',
    loadComponent: () =>
      import('./components/courses/course-management.component').then(m => m.CourseManagementComponent),
    canActivate: [authGuard],
    data: { roles: ['LECTURER'] }
  },
  {
    path: 'dashboard/videos/upload',
    loadComponent: () =>
      import('./components/videos/video-upload.component').then(m => m.VideoUploadComponent),
    canActivate: [authGuard],
    data: { roles: ['LECTURER'] }
  },
  {
    path: 'meeting',
    loadComponent: () =>
      import('./components/meeting/meeting.component').then(m => m.MeetingComponent),
    canActivate: [authGuard],
  },
  {
    path: 'lobby/:roomId',
    loadComponent: () =>
      import('./components/lobby/lobby.component').then(m => m.LobbyComponent),
    canActivate: [authGuard],
  },
  {
    path: 'room/:roomId',
    loadComponent: () =>
      import('./components/room/room.component').then(m => m.RoomComponent),
    canActivate: [authGuard],
  },
  {
    path: 'courses',
    loadComponent: () =>
      import('./components/course-list/course-list.component').then(m => m.CourseListComponent),
    canActivate: [authGuard],
    data: { roles: ['STUDENT'] }
  },
  {
    path: 'quiz-stats',
    loadComponent: () =>
      import('./components/quiz-stats/quiz-stats.component').then(m => m.QuizStatsComponent),
    canActivate: [authGuard],
    data: { roles: ['STUDENT'] }
  },
  {
    path: 'learn/:courseId',
    loadComponent: () =>
      import('./components/course-learning/course-learning.component').then(m => m.CourseLearningComponent),
    canActivate: [authGuard],
    data: { roles: ['STUDENT'] }
  },
  {
    path: 'vocabulary',
    loadComponent: () =>
      import('./components/vocabulary-learning/vocabulary-learning.component').then(m => m.VocabularyLearningComponent),
    canActivate: [authGuard],
    data: { roles: ['STUDENT'] }
  },
  {
    path: 'vocabulary/stats',
    loadComponent: () =>
      import('./components/vocabulary-stats/vocabulary-stats.component').then(m => m.VocabularyStatsComponent),
    canActivate: [authGuard],
    data: { roles: ['STUDENT'] }
  },
  {
    path: 'vocabulary/review',
    loadComponent: () =>
      import('./components/vocabulary-review/vocabulary-review.component').then(m => m.VocabularyReviewComponent),
    canActivate: [authGuard],
    data: { roles: ['STUDENT'] }
  },
  {
    path: 'vocabulary/favorites',
    loadComponent: () =>
      import('./components/vocabulary-favorites/vocabulary-favorites.component').then(m => m.VocabularyFavoritesComponent),
    canActivate: [authGuard],
    data: { roles: ['STUDENT'] }
  },
  {
    path: 'vocabulary/history',
    loadComponent: () =>
      import('./components/vocabulary-history/vocabulary-history.component').then(m => m.VocabularyHistoryComponent),
    canActivate: [authGuard],
    data: { roles: ['STUDENT'] }
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
