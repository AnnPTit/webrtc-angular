import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface SystemUser {
  userId: number;
  username: string;
  fullName: string;
  email: string;
  role: 'STUDENT' | 'LECTURER' | 'ADMIN' | 'SUPERADMIN';
  createdAt?: string;
  enabled?: boolean;
}

export interface CreateUserRequest {
  fullName: string;
  username: string;
  email: string;
  password: string;
  role: 'STUDENT' | 'LECTURER' | 'ADMIN' | 'SUPERADMIN';
}

export interface UpdateUserRequest {
  fullName?: string;
  email?: string;
  role?: 'STUDENT' | 'LECTURER' | 'ADMIN' | 'SUPERADMIN';
  enabled?: boolean;
}

export interface UserListResponse {
  users: SystemUser[];
  total: number;
  page: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly API_URL = `${environment.apiBaseUrl}/api/users`;

  constructor(private http: HttpClient) {}

  /** Lấy danh sách tất cả users (superadmin only) */
  getAllUsers(): Observable<SystemUser[]> {
    return this.http.get<SystemUser[]>(this.API_URL).pipe(
      catchError(this.handleError)
    );
  }

  /** Lấy user theo ID */
  getUserById(userId: number): Observable<SystemUser> {
    return this.http.get<SystemUser>(`${this.API_URL}/${userId}`).pipe(
      catchError(this.handleError)
    );
  }

  /** Tạo user mới */
  createUser(data: CreateUserRequest): Observable<SystemUser> {
    return this.http.post<SystemUser>(`${this.API_URL}/create`, data).pipe(
      catchError(this.handleError)
    );
  }

  /** Cập nhật thông tin user */
  updateUser(userId: number, data: UpdateUserRequest): Observable<SystemUser> {
    return this.http.put<SystemUser>(`${this.API_URL}/update/${userId}`, data).pipe(
      catchError(this.handleError)
    );
  }

  /** Xóa user */
  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/delete/${userId}`).pipe(
      catchError(this.handleError)
    );
  }

  /** Thay đổi role của user */
  updateUserRole(userId: number, role: string): Observable<SystemUser> {
    return this.http.patch<SystemUser>(`${this.API_URL}/${userId}/role`, { role }).pipe(
      catchError(this.handleError)
    );
  }

  /** Kích hoạt / vô hiệu hóa tài khoản */
  toggleUserStatus(userId: number, enabled: boolean): Observable<SystemUser> {
    return this.http.patch<SystemUser>(`${this.API_URL}/${userId}/status`, { enabled }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    let message = 'Đã xảy ra lỗi. Vui lòng thử lại.';
    if (error.status === 0) {
      message = 'Không thể kết nối đến máy chủ.';
    } else if (error.status === 403) {
      message = 'Bạn không có quyền thực hiện thao tác này.';
    } else if (error.status === 404) {
      message = 'Không tìm thấy người dùng.';
    } else if (error.status === 409) {
      message = error.error?.message || 'Tên đăng nhập hoặc email đã tồn tại.';
    } else if (error.error?.message) {
      message = error.error.message;
    }
    return throwError(() => new Error(message));
  }
}
