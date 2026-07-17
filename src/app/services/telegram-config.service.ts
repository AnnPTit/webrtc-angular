import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ===== Response Wrapper =====
export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
  timestamp: string;
}

// ===== Telegram =====
export interface TelegramContact {
  chatId: string;
  username: string | null;
  fullName: string;
}

export interface TelegramUser {
  userId: number;
  username: string;
  fullName: string;
  telegramChatId: string | null;
  telegramUsername: string | null;
}

export interface AssignChatRequest {
  userId: number;
  chatId: string;
  telegramUsername?: string | null;
}

export interface SendMessageRequest {
  userId?: number | null;
  chatId?: string | null;
  message: string;
}

// ===== Reminders =====
export type ReminderType = 'TEXT' | 'VOCAB_QUIZ';

export interface StudyReminder {
  id: number;
  userId: number;
  username: string | null;
  fullName: string | null;
  remindTime: string; // "HH:mm"
  daysOfWeek: string[]; // DayOfWeek names, e.g. ["MONDAY","WEDNESDAY"]
  message: string | null;
  type: ReminderType;
  enabled: boolean;
  telegramLinked: boolean;
  createdAt: string;
  lastSentAt: string | null;
}

export interface CreateReminderRequest {
  userId: number;
  remindTime: string;
  daysOfWeek: string[];
  message?: string | null;
  type?: ReminderType;
}

export interface UpdateReminderRequest {
  remindTime: string;
  daysOfWeek: string[];
  message?: string | null;
  type?: ReminderType;
  enabled?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TelegramConfigService {
  private readonly telegramUrl = `${environment.apiBaseUrl}${environment.apiEndpoints.telegram}`;
  private readonly remindersUrl = `${environment.apiBaseUrl}${environment.apiEndpoints.reminders}`;

  constructor(private http: HttpClient) {}

  // ---- Telegram contacts / linking ----

  getContacts(): Observable<TelegramContact[]> {
    return this.http
      .get<ApiResponse<TelegramContact[]>>(`${this.telegramUrl}/contacts`)
      .pipe(map((res) => res.data));
  }

  getTelegramUsers(): Observable<TelegramUser[]> {
    return this.http
      .get<ApiResponse<TelegramUser[]>>(`${this.telegramUrl}/users`)
      .pipe(map((res) => res.data));
  }

  assign(request: AssignChatRequest): Observable<TelegramUser> {
    return this.http
      .post<ApiResponse<TelegramUser>>(`${this.telegramUrl}/assign`, request)
      .pipe(map((res) => res.data));
  }

  unassign(userId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.telegramUrl}/assign/${userId}`)
      .pipe(map(() => void 0));
  }

  sendMessage(request: SendMessageRequest): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.telegramUrl}/send`, request)
      .pipe(map(() => void 0));
  }

  // ---- Reminders ----

  listReminders(): Observable<StudyReminder[]> {
    return this.http
      .get<ApiResponse<StudyReminder[]>>(this.remindersUrl)
      .pipe(map((res) => res.data));
  }

  createReminder(request: CreateReminderRequest): Observable<StudyReminder> {
    return this.http
      .post<ApiResponse<StudyReminder>>(this.remindersUrl, request)
      .pipe(map((res) => res.data));
  }

  updateReminder(id: number, request: UpdateReminderRequest): Observable<StudyReminder> {
    return this.http
      .put<ApiResponse<StudyReminder>>(`${this.remindersUrl}/${id}`, request)
      .pipe(map((res) => res.data));
  }

  deleteReminder(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.remindersUrl}/${id}`)
      .pipe(map(() => void 0));
  }

  toggleReminder(id: number): Observable<StudyReminder> {
    return this.http
      .patch<ApiResponse<StudyReminder>>(`${this.remindersUrl}/${id}/toggle`, {})
      .pipe(map((res) => res.data));
  }

  sendReminderNow(id: number): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.remindersUrl}/${id}/send-now`, {})
      .pipe(map(() => void 0));
  }
}
