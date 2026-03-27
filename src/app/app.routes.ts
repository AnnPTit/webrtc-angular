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
    path: '**',
    redirectTo: 'login',
  },
];
