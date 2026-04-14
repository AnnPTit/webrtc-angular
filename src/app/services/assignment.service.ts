import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ── Request / Response DTOs ──────────────────────────────────────

export interface CreateAssignmentRequest {
  lessonId: number;
  title: string;
  description?: string;
}

export interface QuestionDTO {
  questionId?: number;
  question: string;
  options: { [key: string]: string };
  answer: string;
}

export interface AssignmentResponse {
  id: number;
  lessonId: number;
  title: string;
  description: string;
  statusProgress: string;
  errorMessage: string;
  createdAt: string;
  questions: QuestionDTO[];
}

export interface ApiResponse<T> {
  message: string;
  data: T;
}

// ── Service ──────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AssignmentService {
  private readonly API_URL = `${environment.apiBaseUrl}${environment.apiEndpoints.assignments}`;

  constructor(private http: HttpClient) {}

  /**
   * POST /api/assignments
   * Create a new assignment and queue it for async processing.
   */
  createAssignment(request: CreateAssignmentRequest): Observable<ApiResponse<AssignmentResponse>> {
    return this.http.post<ApiResponse<AssignmentResponse>>(this.API_URL, request);
  }

  /**
   * GET /api/assignments/{id}
   * Retrieve a single assignment with questions and options.
   */
  getAssignmentById(id: number): Observable<ApiResponse<AssignmentResponse>> {
    return this.http.get<ApiResponse<AssignmentResponse>>(`${this.API_URL}/${id}`);
  }

  /**
   * GET /api/assignments/by-lesson/{lessonId}
   * Retrieve all assignments for a lesson.
   */
  getAssignmentsByLessonId(lessonId: number): Observable<ApiResponse<AssignmentResponse[]>> {
    return this.http.get<ApiResponse<AssignmentResponse[]>>(`${this.API_URL}/by-lesson/${lessonId}`);
  }
}
