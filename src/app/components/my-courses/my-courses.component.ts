import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, switchMap, catchError } from 'rxjs/operators';

import { AuthService } from '../../services/auth.service';
import { CourseService, Course } from '../../services/course.service';
import { EnrollmentService, EnrolledCourse } from '../../services/enrollment.service';

/** Dữ liệu kết hợp giữa Course info và Enrollment info */
export interface MyCourseItem {
  course: Course;
  enrollment: EnrolledCourse;
}

@Component({
  selector: 'app-my-courses',
  templateUrl: './my-courses.component.html',
  styleUrl: './my-courses.component.css',
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyCoursesComponent implements OnInit, OnDestroy {
  /** Danh sách khóa học đã đăng ký kết hợp với thông tin enrollment */
  myCourses: MyCourseItem[] = [];

  loading = true;
  error: string | null = null;

  /** Tab hiện tại: all | inProgress | completed */
  activeTab = signal<'all' | 'inProgress' | 'completed'>('all');

  /** Modal xác nhận unenroll */
  showUnenrollModal = false;
  unenrollTarget: MyCourseItem | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private courseService: CourseService,
    private enrollmentService: EnrollmentService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    // Khởi tạo enrollment service với user hiện tại
    this.enrollmentService.init(user.userId);
    this.loadMyCourses();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─────────────────────────────────────────────────────────────────
  //  DATA LOADING
  // ─────────────────────────────────────────────────────────────────

  loadMyCourses(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    const enrollments = this.enrollmentService.getEnrolledCourses(user.userId);

    if (enrollments.length === 0) {
      this.myCourses = [];
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    // Tải thông tin chi tiết tất cả khóa học đã đăng ký song song
    const courseRequests = enrollments.map(enrollment =>
      this.courseService.getCourseById(enrollment.courseId).pipe(
        catchError(() => of(null)) // Bỏ qua khóa học không tải được
      )
    );

    forkJoin(courseRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (courses) => {
          this.myCourses = courses
            .map((course, index) => ({ course, enrollment: enrollments[index] }))
            .filter((item): item is MyCourseItem => item.course !== null) as MyCourseItem[];

          // Sắp xếp: truy cập gần nhất lên đầu
          this.myCourses.sort((a, b) => {
            const dateA = new Date(a.enrollment.lastAccessedAt || a.enrollment.enrolledAt).getTime();
            const dateB = new Date(b.enrollment.lastAccessedAt || b.enrollment.enrolledAt).getTime();
            return dateB - dateA;
          });

          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'Không thể tải danh sách khóa học. Vui lòng thử lại.';
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  // ─────────────────────────────────────────────────────────────────
  //  FILTERED COURSES (theo tab)
  // ─────────────────────────────────────────────────────────────────

  get filteredCourses(): MyCourseItem[] {
    switch (this.activeTab()) {
      case 'inProgress':
        return this.myCourses.filter(
          item => item.enrollment.progressPercent > 0 && item.enrollment.progressPercent < 100
        );
      case 'completed':
        return this.myCourses.filter(item => item.enrollment.progressPercent >= 100);
      default:
        return this.myCourses;
    }
  }

  get totalCount(): number { return this.myCourses.length; }
  get inProgressCount(): number {
    return this.myCourses.filter(
      item => item.enrollment.progressPercent > 0 && item.enrollment.progressPercent < 100
    ).length;
  }
  get completedCount(): number {
    return this.myCourses.filter(item => item.enrollment.progressPercent >= 100).length;
  }

  // ─────────────────────────────────────────────────────────────────
  //  ACTIONS
  // ─────────────────────────────────────────────────────────────────

  continueCourse(courseId: number): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.enrollmentService.updateLastAccessed(user.userId, courseId);
    }
    this.router.navigate(['/learn', courseId]);
  }

  setTab(tab: 'all' | 'inProgress' | 'completed'): void {
    this.activeTab.set(tab);
  }

  /** Mở modal xác nhận unenroll */
  openUnenrollModal(item: MyCourseItem, event: MouseEvent): void {
    event.stopPropagation();
    this.unenrollTarget = item;
    this.showUnenrollModal = true;
    this.cdr.markForCheck();
  }

  /** Xác nhận unenroll */
  confirmUnenroll(): void {
    const user = this.authService.getCurrentUser();
    if (!user || !this.unenrollTarget) return;

    this.enrollmentService.unenroll(user.userId, this.unenrollTarget.course.id);
    this.myCourses = this.myCourses.filter(
      item => item.course.id !== this.unenrollTarget!.course.id
    );
    this.showUnenrollModal = false;
    this.unenrollTarget = null;
    this.cdr.markForCheck();
  }

  cancelUnenroll(): void {
    this.showUnenrollModal = false;
    this.unenrollTarget = null;
    this.cdr.markForCheck();
  }

  // ─────────────────────────────────────────────────────────────────
  //  HELPERS / DISPLAY
  // ─────────────────────────────────────────────────────────────────

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get userInitials(): string {
    const user = this.currentUser;
    if (user?.fullName) {
      return user.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
    }
    return 'ST';
  }

  getLevelLabel(level?: string): string {
    switch (level) {
      case 'BEGINNER': return 'Cơ bản';
      case 'INTERMEDIATE': return 'Trung bình';
      case 'ADVANCED': return 'Nâng cao';
      default: return 'Cơ bản';
    }
  }

  getLevelClass(level?: string): string {
    switch (level) {
      case 'BEGINNER': return 'level-beginner';
      case 'INTERMEDIATE': return 'level-intermediate';
      case 'ADVANCED': return 'level-advanced';
      default: return 'level-beginner';
    }
  }

  getCourseGradient(index: number): string {
    const gradients = [
      'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      'linear-gradient(135deg, #10b981, #059669)',
      'linear-gradient(135deg, #f59e0b, #d97706)',
      'linear-gradient(135deg, #ec4899, #be185d)',
      'linear-gradient(135deg, #14b8a6, #0d9488)',
      'linear-gradient(135deg, #f43f5e, #e11d48)',
      'linear-gradient(135deg, #6366f1, #4f46e5)',
    ];
    return gradients[index % gradients.length];
  }

  getCourseEmoji(index: number): string {
    const emojis = ['📚', '🎓', '💡', '🌍', '✏️', '🔬', '🎨', '📐', '🧠', '📖'];
    return emojis[index % emojis.length];
  }

  formatDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  getProgressStatusLabel(percent: number): string {
    if (percent === 0) return 'Chưa bắt đầu';
    if (percent >= 100) return 'Hoàn thành';
    return `${percent}% hoàn thành`;
  }

  getProgressStatusClass(percent: number): string {
    if (percent === 0) return 'status-not-started';
    if (percent >= 100) return 'status-completed';
    return 'status-in-progress';
  }

  getContinueBtnLabel(percent: number): string {
    if (percent === 0) return 'Bắt đầu học';
    if (percent >= 100) return 'Xem lại';
    return 'Tiếp tục học';
  }

  logout(): void {
    this.authService.logout();
  }
}
