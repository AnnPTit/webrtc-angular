import { Routes } from '@angular/router';
import { authGuard, loginGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    // Route mặc định: Hiển thị Landing Page thay vì redirect thẳng đến login
    path: '',
    loadComponent: () =>
      import('./components/landing/landing.component').then(m => m.LandingComponent),
    // Không cần guard — trang công khai cho tất cả người dùng
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
    data: { roles: ['STUDENT', 'ADMIN'] }
  },
  {
    path: 'superadmin',
    loadComponent: () =>
      import('./components/superadmin-dashboard/superadmin-dashboard.component').then(m => m.SuperadminDashboardComponent),
    canActivate: [authGuard],
    data: { roles: ['SUPERADMIN'] }
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/lecturer-dashboard/lecturer-dashboard.component').then(m => m.LecturerDashboardComponent),
    canActivate: [authGuard],
    data: { roles: ['LECTURER', 'ADMIN'] }
  },
  {
    path: 'dashboard/courses',
    loadComponent: () =>
      import('./components/courses/course-management.component').then(m => m.CourseManagementComponent),
    canActivate: [authGuard],
    data: { roles: ['LECTURER', 'ADMIN'] }
  },
  {
    path: 'dashboard/videos/upload',
    loadComponent: () =>
      import('./components/videos/video-upload.component').then(m => m.VideoUploadComponent),
    canActivate: [authGuard],
    data: { roles: ['LECTURER', 'ADMIN'] }
  },
  {
    // Route /meeting: Cho phép guest access — không cần authentication
    // guestGuard: nếu đã đăng nhập → giữ nguyên, nếu chưa → vẫn cho phép truy cập
    path: 'meeting',
    loadComponent: () =>
      import('./components/meeting/meeting.component').then(m => m.MeetingComponent),
    canActivate: [guestGuard],
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
    data: { roles: ['STUDENT', 'ADMIN'] }
  },
  {
    // Route /my-courses: Danh sách khóa học đã đăng ký của học viên
    path: 'my-courses',
    loadComponent: () =>
      import('./components/my-courses/my-courses.component').then(m => m.MyCoursesComponent),
    canActivate: [authGuard],
    data: { roles: ['STUDENT', 'ADMIN'] }
  },
  {
    path: 'quiz-stats',
    loadComponent: () =>
      import('./components/quiz-stats/quiz-stats.component').then(m => m.QuizStatsComponent),
    canActivate: [authGuard],
    data: { roles: ['STUDENT', 'ADMIN'] }
  },
  {
    path: 'learn/:courseId',
    loadComponent: () =>
      import('./components/course-learning/course-learning.component').then(m => m.CourseLearningComponent),
    canActivate: [authGuard],
    data: { roles: ['STUDENT', 'ADMIN'] }
  },
  {
    path: 'vocabulary',
    loadComponent: () =>
      import('./components/vocabulary-learning/vocabulary-learning.component').then(m => m.VocabularyLearningComponent),
    canActivate: [authGuard],
    data: { roles: ['STUDENT', 'ADMIN'] }
  },
  {
    path: 'vocabulary/stats',
    loadComponent: () =>
      import('./components/vocabulary-stats/vocabulary-stats.component').then(m => m.VocabularyStatsComponent),
    canActivate: [authGuard],
    data: { roles: ['STUDENT', 'ADMIN'] }
  },
  {
    path: 'vocabulary/review',
    loadComponent: () =>
      import('./components/vocabulary-review/vocabulary-review.component').then(m => m.VocabularyReviewComponent),
    canActivate: [authGuard],
    data: { roles: ['STUDENT', 'ADMIN'] }
  },
  {
    path: 'vocabulary/favorites',
    loadComponent: () =>
      import('./components/vocabulary-favorites/vocabulary-favorites.component').then(m => m.VocabularyFavoritesComponent),
    canActivate: [authGuard],
    data: { roles: ['STUDENT', 'ADMIN'] }
  },
  {
    path: 'vocabulary/history',
    loadComponent: () =>
      import('./components/vocabulary-history/vocabulary-history.component').then(m => m.VocabularyHistoryComponent),
    canActivate: [authGuard],
    data: { roles: ['STUDENT', 'ADMIN'] }
  },
  {
    // Route /welcome: Màn hình onboarding quiz dành cho sinh viên mới đăng ký
    // Yêu cầu authentication và chỉ dành cho STUDENT/ADMIN
    path: 'welcome',
    loadComponent: () =>
      import('./components/welcome/welcome.component').then(m => m.WelcomeComponent),
    canActivate: [authGuard],
    data: { roles: ['STUDENT', 'ADMIN'] }
  },
  {
    path: 'superadmin',
    loadComponent: () =>
      import('./components/superadmin-dashboard/superadmin-dashboard.component').then(m => m.SuperadminDashboardComponent),
    canActivate: [authGuard],
    data: { roles: ['SUPERADMIN'] },
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
