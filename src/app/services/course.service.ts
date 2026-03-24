import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Course {
  id: number;
  title: string;
  description: string;
}

export interface CreateCourseRequest {
  title: string;
  description: string;
}

export interface Lesson {
  id: number;
  courseId: number;
  title: string;
  description: string;
}

export interface CreateLessonRequest {
  courseId: number;
  title: string;
  description: string;
}

export interface Video {
  id: number;
  courseId: number;
  lessonId: number;
  originalFileName: string;
  objectKey: string;
  videoUrl: string;
  fileSize: number;
  uploadTime: string;
}

@Injectable({ providedIn: 'root' })
export class CourseService {
  private readonly API_URL = `${environment.apiBaseUrl}${environment.apiEndpoints.courses}`;
  private readonly LESSONS_API_URL = `${environment.apiBaseUrl}${environment.apiEndpoints.lessons}`;

  constructor(private http: HttpClient) {}

  searchCourses(query: string): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.API_URL}/search`, {
      params: { query },
    });
  }

  createCourse(data: CreateCourseRequest): Observable<Course> {
    return this.http.post<Course>(`${this.API_URL}/create`, data);
  }

  getAllCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.API_URL}/search`);
  }

  getCourseById(id: number): Observable<Course> {
    return this.http.get<Course>(`${this.API_URL}/${id}`);
  }

  updateCourse(id: number, data: CreateCourseRequest): Observable<Course> {
    return this.http.put<Course>(`${this.API_URL}/update/${id}`, data);
  }

  deleteCourse(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/delete/${id}`);
  }

  // Lessons API
  getLessonsByCourseId(courseId: number): Observable<Lesson[]> {
    return this.http.get<Lesson[]>(`${this.LESSONS_API_URL}/get-by-course/${courseId}`);
  }

  createLesson(data: CreateLessonRequest): Observable<Lesson> {
    return this.http.post<Lesson>(`${this.LESSONS_API_URL}/create`, data);
  }

  updateLesson(id: number, data: Omit<CreateLessonRequest, 'courseId'>): Observable<Lesson> {
    return this.http.put<Lesson>(`${this.LESSONS_API_URL}/update/${id}`, data);
  }

  deleteLesson(id: number): Observable<void> {
    return this.http.delete<void>(`${this.LESSONS_API_URL}/delete/${id}`);
  }

  // Videos API
  getVideosByLesson(courseId: number, lessonId: number): Observable<Video[]> {
    return this.http.get<Video[]>(`${this.LESSONS_API_URL}/get-videos/course/${courseId}/lesson/${lessonId}`);
  }

 getSignedVideoUrl(objectKey: string): Observable<{ signedUrl: string }> {
  return this.http.get<{ signedUrl: string }>(`${environment.apiBaseUrl}${environment.apiEndpoints.videos}/signed-url`, {
    params: { key: objectKey },
  });
}

  deleteVideo(videoId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${videoId}`);
  }
}
