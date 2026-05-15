import { Injectable, signal, computed, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'STUDENT' | 'LECTURER' | 'ADMIN';
}

/** Wrapper response từ POST /api/auth/register */
export interface RegisterApiResponse {
  success: boolean;
  message: string;
  data: AuthResponse;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  userId: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  newUser: boolean;
}

export interface User {
  userId: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = `${environment.apiBaseUrl}${environment.apiEndpoints.auth}`;
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSignal = signal<boolean>(this.hasToken());
  isAuthenticated = computed(() => this.isAuthenticatedSignal());

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(credentials: LoginRequest): Observable<AuthResponse> {
    console.log('ENV =', environment);
    console.log('API_URL =', this.API_URL);
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap((response) => this.handleAuthSuccess(response)),
      catchError(this.handleError)
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<RegisterApiResponse>(`${this.API_URL}/register`, data).pipe(
      map((response) => response.data),
      catchError(this.handleError)
    );
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
    this.currentUserSubject.next(null);
    this.isAuthenticatedSignal.set(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  private handleAuthSuccess(response: AuthResponse): void {
    if (this.isBrowser) {
      localStorage.setItem(this.TOKEN_KEY, response.token);
      const user: User = {
        userId: response.userId,
        username: response.username,
        fullName: response.fullName,
        email: response.email,
        role: response.role,
      };
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      // Store newUser flag separately so login component can check it
      localStorage.setItem('is_new_user', JSON.stringify(response.newUser ?? false));
      this.currentUserSubject.next(user);
      this.isAuthenticatedSignal.set(true);
    }
  }

  /** Check if the current session user was flagged as newUser by the backend */
  isNewUser(): boolean {
    if (!this.isBrowser) return false;
    try {
      return JSON.parse(localStorage.getItem('is_new_user') || 'false');
    } catch {
      return false;
    }
  }

  /** Clear the newUser flag (called after onboarding completes) */
  clearNewUserFlag(): void {
    if (this.isBrowser) {
      localStorage.removeItem('is_new_user');
    }
  }

  /** Check if the current user is an ADMIN */
  isAdmin(): boolean {
    return this.getCurrentUser()?.role === 'ADMIN';
  }

  /** Check if the current user is a LECTURER */
  isLecturer(): boolean {
    return this.getCurrentUser()?.role === 'LECTURER';
  }

  /** Check if the current user is a LECTURER or ADMIN */
  isLecturerOrAdmin(): boolean {
    const role = this.getCurrentUser()?.role;
    return role === 'LECTURER' || role === 'ADMIN';
  }

  private hasToken(): boolean {
    if (!this.isBrowser) {
      return false;
    }
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  private getStoredUser(): User | null {
    if (!this.isBrowser) {
      return null;
    }
    const userJson = localStorage.getItem(this.USER_KEY);
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch {
        return null;
      }
    }
    return null;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Đã xảy ra lỗi. Vui lòng thử lại.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      switch (error.status) {
        case 0:
          errorMessage = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
          break;
        case 400:
          errorMessage = error.error?.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
          break;
        case 401:
          errorMessage = 'Tên đăng nhập hoặc mật khẩu không đúng.';
          break;
        case 409:
          errorMessage = error.error?.message || 'Tên đăng nhập hoặc email đã được sử dụng.';
          break;
        default:
          errorMessage = error.error?.message || `Lỗi máy chủ (${error.status}).`;
      }
    }
    return throwError(() => new Error(errorMessage));
  }
}
