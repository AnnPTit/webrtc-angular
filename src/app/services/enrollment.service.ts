import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Thông tin enrollment của một khóa học
 */
export interface EnrolledCourse {
  courseId: number;
  enrolledAt: string;       // ISO date string
  lastAccessedAt?: string;  // Lần cuối truy cập
  progressPercent: number;  // Tiến độ 0-100
  completedLessons: number[];
  totalLessons?: number;
}

/**
 * EnrollmentService — Quản lý đăng ký khóa học của học viên
 *
 * Sử dụng localStorage để lưu trữ enrollment data vì backend hiện tại
 * chưa có enrollment API riêng. Data được namespaced theo userId để
 * tránh xung đột giữa các tài khoản.
 *
 * Key format: `enrollments_${userId}`
 * Value: JSON array của EnrolledCourse[]
 */
@Injectable({ providedIn: 'root' })
export class EnrollmentService {
  private readonly KEY_PREFIX = 'enrollments_';
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  /** BehaviorSubject để notify các component khi enrollment thay đổi */
  private enrollmentsSubject = new BehaviorSubject<EnrolledCourse[]>([]);
  enrollments$ = this.enrollmentsSubject.asObservable();

  private currentUserId: number | null = null;

  /**
   * Khởi tạo service cho một user cụ thể.
   * Gọi method này sau khi user đăng nhập.
   */
  init(userId: number): void {
    this.currentUserId = userId;
    const stored = this.loadFromStorage(userId);
    this.enrollmentsSubject.next(stored);
  }

  /**
   * Lấy danh sách khóa học đã đăng ký của user hiện tại
   */
  getEnrolledCourses(userId: number): EnrolledCourse[] {
    return this.loadFromStorage(userId);
  }

  /**
   * Kiểm tra học viên đã đăng ký khóa học chưa
   */
  isEnrolled(userId: number, courseId: number): boolean {
    const enrollments = this.loadFromStorage(userId);
    return enrollments.some(e => e.courseId === courseId);
  }

  /**
   * Đăng ký khóa học mới.
   * Nếu đã đăng ký rồi thì không làm gì.
   * @returns true nếu đăng ký thành công, false nếu đã đăng ký rồi
   */
  enroll(userId: number, courseId: number): boolean {
    if (this.isEnrolled(userId, courseId)) {
      return false;
    }

    const enrollments = this.loadFromStorage(userId);
    const newEnrollment: EnrolledCourse = {
      courseId,
      enrolledAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      progressPercent: 0,
      completedLessons: [],
    };

    enrollments.push(newEnrollment);
    this.saveToStorage(userId, enrollments);

    // Notify subscribers
    if (userId === this.currentUserId) {
      this.enrollmentsSubject.next(enrollments);
    }

    return true;
  }

  /**
   * Hủy đăng ký khóa học.
   * @returns true nếu hủy thành công
   */
  unenroll(userId: number, courseId: number): boolean {
    const enrollments = this.loadFromStorage(userId);
    const index = enrollments.findIndex(e => e.courseId === courseId);
    if (index === -1) return false;

    enrollments.splice(index, 1);
    this.saveToStorage(userId, enrollments);

    if (userId === this.currentUserId) {
      this.enrollmentsSubject.next(enrollments);
    }

    return true;
  }

  /**
   * Cập nhật tiến độ học tập khi học viên hoàn thành bài học
   */
  updateProgress(userId: number, courseId: number, completedLessonId: number, totalLessons: number): void {
    const enrollments = this.loadFromStorage(userId);
    const enrollment = enrollments.find(e => e.courseId === courseId);

    if (!enrollment) {
      // Tự động enroll nếu chưa đăng ký (trường hợp vào học trực tiếp)
      this.enroll(userId, courseId);
      return;
    }

    // Thêm lessonId vào completed nếu chưa có
    if (!enrollment.completedLessons.includes(completedLessonId)) {
      enrollment.completedLessons.push(completedLessonId);
    }

    enrollment.totalLessons = totalLessons;
    enrollment.lastAccessedAt = new Date().toISOString();

    // Tính phần trăm tiến độ
    if (totalLessons > 0) {
      enrollment.progressPercent = Math.round(
        (enrollment.completedLessons.length / totalLessons) * 100
      );
    }

    this.saveToStorage(userId, enrollments);

    if (userId === this.currentUserId) {
      this.enrollmentsSubject.next([...enrollments]);
    }
  }

  /**
   * Cập nhật lần cuối truy cập khóa học
   */
  updateLastAccessed(userId: number, courseId: number): void {
    const enrollments = this.loadFromStorage(userId);
    const enrollment = enrollments.find(e => e.courseId === courseId);
    if (enrollment) {
      enrollment.lastAccessedAt = new Date().toISOString();
      this.saveToStorage(userId, enrollments);
    }
  }

  /**
   * Lấy thông tin enrollment của một khóa học cụ thể
   */
  getEnrollment(userId: number, courseId: number): EnrolledCourse | null {
    const enrollments = this.loadFromStorage(userId);
    return enrollments.find(e => e.courseId === courseId) ?? null;
  }

  /**
   * Lấy danh sách ID của các khóa học đã đăng ký
   */
  getEnrolledCourseIds(userId: number): Set<number> {
    const enrollments = this.loadFromStorage(userId);
    return new Set(enrollments.map(e => e.courseId));
  }

  // ── Private helpers ──────────────────────────────────────────────

  private storageKey(userId: number): string {
    return `${this.KEY_PREFIX}${userId}`;
  }

  private loadFromStorage(userId: number): EnrolledCourse[] {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem(this.storageKey(userId));
      return raw ? (JSON.parse(raw) as EnrolledCourse[]) : [];
    } catch {
      return [];
    }
  }

  private saveToStorage(userId: number, enrollments: EnrolledCourse[]): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(this.storageKey(userId), JSON.stringify(enrollments));
    } catch {
      // Bỏ qua lỗi quota exceeded
    }
  }
}
