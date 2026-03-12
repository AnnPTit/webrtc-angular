import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PresignRequest {
  courseId: number;
  lessonId: number;
  fileName: string;
  fileSize?: number;
}

export interface PresignResponse {
  uploadUrl: string;
  objectKey: string;
  expiresAt: string; // ISO string
}

export interface VideoMetadataDto {
  courseId: number;
  lessonId: number;
  originalFileName: string;
  objectKey: string;
  fileSize: number;
}

@Injectable({ providedIn: 'root' })
export class VideoService {
  private readonly API_URL = 'http://localhost:8080/api/videos';

  constructor(private http: HttpClient) {}

  getPresignedUrl(req: PresignRequest): Observable<PresignResponse> {
    return this.http.post<PresignResponse>(`${this.API_URL}/presign`, req);
  }

  saveMetadata(dto: VideoMetadataDto): Observable<any> {
    return this.http.post(`${this.API_URL}/metadata`, dto);
  }
}
