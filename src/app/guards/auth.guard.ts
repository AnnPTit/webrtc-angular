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
      if (user.role === 'LECTURER') {
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
    const target = user?.role === 'LECTURER' ? '/dashboard' : '/home';
    router.navigate([target]);
    return false;
  }

  return true;
};
