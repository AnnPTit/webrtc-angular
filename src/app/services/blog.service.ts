import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export type BlogStatus = 'DRAFT' | 'PUBLISHED';

/** Full blog payload (includes the HTML body) — used by the editor. */
export interface BlogPost {
  id: number;
  title: string | null;
  summary: string | null;
  category: string | null;
  tags: string[];
  contentHtml: string | null;
  status: BlogStatus;
  createdAt: string;
  updatedAt: string | null;
  publishedAt: string | null;
  authorName: string | null;
}

/** Lightweight payload for list views (no HTML body). */
export interface BlogSummary {
  id: number;
  title: string | null;
  summary: string | null;
  category: string | null;
  tags: string[];
  status: BlogStatus;
  updatedAt: string | null;
  createdAt: string;
  publishedAt: string | null;
  authorName?: string | null;
}

/** Create / update / autosave payload. */
export interface SaveBlogRequest {
  title?: string | null;
  summary?: string | null;
  category?: string | null;
  tags?: string[];
  contentHtml?: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class BlogService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}${environment.apiEndpoints.blogs}`;

  /** Create a new draft; returns the persisted blog (with its new id). */
  create(request: SaveBlogRequest): Observable<BlogPost> {
    return this.http
      .post<ApiResponse<BlogPost>>(this.baseUrl, request)
      .pipe(map(res => res.data), catchError(this.handleError));
  }

  /** Save/autosave an existing draft or post. */
  update(id: number, request: SaveBlogRequest): Observable<BlogPost> {
    return this.http
      .put<ApiResponse<BlogPost>>(`${this.baseUrl}/${id}`, request)
      .pipe(map(res => res.data), catchError(this.handleError));
  }

  publish(id: number): Observable<BlogPost> {
    return this.http
      .post<ApiResponse<BlogPost>>(`${this.baseUrl}/${id}/publish`, {})
      .pipe(map(res => res.data), catchError(this.handleError));
  }

  unpublish(id: number): Observable<BlogPost> {
    return this.http
      .post<ApiResponse<BlogPost>>(`${this.baseUrl}/${id}/unpublish`, {})
      .pipe(map(res => res.data), catchError(this.handleError));
  }

  get(id: number): Observable<BlogPost> {
    return this.http
      .get<ApiResponse<BlogPost>>(`${this.baseUrl}/${id}`)
      .pipe(map(res => res.data), catchError(this.handleError));
  }

  listMine(): Observable<BlogSummary[]> {
    return this.http
      .get<ApiResponse<BlogSummary[]>>(`${this.baseUrl}/mine`)
      .pipe(map(res => res.data), catchError(this.handleError));
  }

  /** Public community feed of published posts. */
  feed(): Observable<BlogSummary[]> {
    return this.http
      .get<ApiResponse<BlogSummary[]>>(`${this.baseUrl}/feed`)
      .pipe(map(res => res.data), catchError(this.handleError));
  }

  /** Public read of a single published post. */
  getPublic(id: number): Observable<BlogPost> {
    return this.http
      .get<ApiResponse<BlogPost>>(`${this.baseUrl}/public/${id}`)
      .pipe(map(res => res.data), catchError(this.handleError));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.baseUrl}/${id}`)
      .pipe(map(() => undefined), catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    let message = 'Đã xảy ra lỗi. Vui lòng thử lại.';
    if (error.status === 0) {
      message = 'Không thể kết nối đến máy chủ. Kiểm tra kết nối mạng.';
    } else if (error.status === 401) {
      message = 'Bạn cần đăng nhập để thực hiện thao tác này.';
    } else if (error.status === 403) {
      message = error.error?.message || 'Bạn không có quyền với bài viết này.';
    } else if (error.status === 400) {
      message = error.error?.message || 'Dữ liệu không hợp lệ.';
    } else if (error.status === 404) {
      message = error.error?.message || 'Không tìm thấy bài viết.';
    } else if (error.status === 500) {
      message = 'Lỗi máy chủ. Vui lòng thử lại sau.';
    }
    return throwError(() => new Error(message));
  }
}
