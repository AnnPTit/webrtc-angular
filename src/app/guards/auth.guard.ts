import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // must be authenticated first
  if (!authService.getToken()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // if route defines allowed roles, enforce them
  const expectedRoles = route.data?.['roles'] as string[] | undefined;
  const user = authService.getCurrentUser();
  if (expectedRoles && user) {
    if (!expectedRoles.includes(user.role)) {
      // redirect to appropriate default page based on role
      if (user.role === 'SUPERADMIN') {
        router.navigate(['/superadmin']);
      } else if (user.role === 'LECTURER') {
        router.navigate(['/dashboard']);
      } else if (user.role === 'ADMIN') {
        router.navigate(['/dashboard']);
      } else {
        router.navigate(['/home']);
      }
      return false;
    }
  }

  return true;
};

export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getToken()) {
    const user = authService.getCurrentUser();
    // SUPERADMIN → /superadmin, ADMIN/LECTURER → /dashboard, others → /home
    let target = '/home';
    if (user?.role === 'SUPERADMIN') {
      target = '/superadmin';
    } else if (user?.role === 'LECTURER' || user?.role === 'ADMIN') {
      target = '/dashboard';
    }
    router.navigate([target]);
    return false;
  }

  return true;
};

/**
 * guestGuard — Guard cho route /meeting (họp trực tuyến)
 *
 * Cho phép TẤT CẢ người dùng truy cập, kể cả chưa đăng nhập (guest).
 * Nếu đã đăng nhập: vẫn cho phép truy cập bình thường.
 * Nếu chưa đăng nhập: vẫn cho phép với tư cách guest.
 *
 * Khác biệt với authGuard (chặn guest) và loginGuard (chặn user đã đăng nhập).
 */
export const guestGuard: CanActivateFn = (_route, _state) => {
  // Always allow access — route này công khai cho cả guest và user đã đăng nhập
  return true;
};
