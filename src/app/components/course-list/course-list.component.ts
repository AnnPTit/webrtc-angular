import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CourseService, Course, Lesson } from '../../services/course.service';

@Component({
  selector: 'app-course-list',
  templateUrl: './course-list.component.html',
  styleUrl: './course-list.component.css',
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseListComponent implements OnInit {
  courses: Course[] = [];
  loading = true;
  error: string | null = null;

  // Modal state
  showModal = false;
  selectedCourse: Course | null = null;
  selectedCourseLessons: Lesson[] = [];
  loadingLessons = false;

  constructor(
    private courseService: CourseService,
    protected authService: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.courseService.getAllCourses().subscribe({
      next: (courses) => {
        this.courses = courses;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load courses:', err);
        this.error = 'Không thể tải danh sách khóa học. Vui lòng thử lại.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Modal ──

  openCourseDetail(course: Course): void {
    this.selectedCourse = course;
    this.showModal = true;
    this.selectedCourseLessons = [];
    this.loadingLessons = true;
    this.cdr.markForCheck();

    this.courseService.getLessonsByCourseId(course.id).subscribe({
      next: (lessons) => {
        this.selectedCourseLessons = lessons;
        this.loadingLessons = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingLessons = false;
        this.cdr.markForCheck();
      },
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedCourse = null;
    this.selectedCourseLessons = [];
    this.cdr.markForCheck();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('cl-modal-overlay')) {
      this.closeModal();
    }
  }

  enrollCourse(): void {
    if (this.selectedCourse) {
      this.router.navigate(['/learn', this.selectedCourse.id]);
    }
  }

  // ── Helpers ──

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

  logout(): void {
    this.authService.logout();
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

  getCourseIcon(index: number): string {
    const icons = ['📚', '🎓', '💡', '🌍', '✏️', '🔬', '🎨', '📐', '🧠', '📖'];
    return icons[index % icons.length];
  }

  getCourseGradient(index: number): string {
    const gradients = [
      'linear-gradient(135deg, #38bd94, #2a9d6e)',
      'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      'linear-gradient(135deg, #a78bfa, #7c3aed)',
      'linear-gradient(135deg, #f59e0b, #d97706)',
      'linear-gradient(135deg, #ec4899, #be185d)',
      'linear-gradient(135deg, #14b8a6, #0d9488)',
      'linear-gradient(135deg, #f43f5e, #e11d48)',
      'linear-gradient(135deg, #6366f1, #4f46e5)',
    ];
    return gradients[index % gradients.length];
  }
}
