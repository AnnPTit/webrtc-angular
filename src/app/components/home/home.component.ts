import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { EnrollmentService } from '../../services/enrollment.service';
import { VocabularyService } from '../../services/vocabulary.service';
import { QuizResultService } from '../../services/quiz-result.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { VocabularyWord } from '../../models/vocabulary.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  imports: [RouterLink, CommonModule],
})
export class HomeComponent implements OnInit {
  // ── Profile Menu ──
  isProfileMenuOpen = false;

  // ── Stats ──
  enrolledCount = 0;
  completedAssignments = 0;
  todayWordsLearned = 0;
  totalWordsLearned = 0;
  isLoadingStats = true;

  menuItems = [
    {
      id: 'meeting',
      title: 'Họp Trực Tuyến',
      description: 'Tham gia hoặc tạo phòng họp video trực tuyến với WebRTC',
      icon: 'video',
      route: '/meeting',
      color: '#4ecca3'
    },
    {
      id: 'courses',
      title: 'Khóa Học',
      description: 'Khám phá và tham gia các khóa học trực tuyến',
      icon: 'book',
      route: '/courses',
      color: '#45b7d1'
    },
    {
      id: 'vocabulary',
      title: 'Từ Vựng AI',
      description: 'Học từ vựng tiếng Anh thông minh với trí tuệ nhân tạo',
      icon: 'vocabulary',
      route: '/vocabulary',
      color: '#a78bfa'
    },
    {
      id: 'blog',
      title: 'Blog',
      description: 'Viết và chia sẻ bài viết kiến thức lập trình của bạn',
      icon: 'document',
      route: '/blog',
      color: '#8b5cf6'
    },
    {
      id: 'assignments',
      title: 'Bài Tập',
      description: 'Xem và nộp bài tập được giao',
      icon: 'assignment',
      route: null,
      color: '#f093fb'
    },
    {
      id: 'schedule',
      title: 'Lịch Học',
      description: 'Xem lịch học và sự kiện sắp tới',
      icon: 'calendar',
      route: null,
      color: '#f5576c'
    },
    {
      id: 'documents',
      title: 'Tài Liệu',
      description: 'Truy cập tài liệu học tập và thư viện',
      icon: 'document',
      route: null,
      color: '#feca57'
    },
    {
      id: 'grades',
      title: 'Điểm Số',
      description: 'Theo dõi kết quả học tập và điểm số',
      icon: 'grade',
      route: null,
      color: '#ff6b6b'
    }
  ];

  constructor(
    protected authService: AuthService,
    private enrollmentService: EnrollmentService,
    private vocabularyService: VocabularyService,
    private quizResultService: QuizResultService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  // ═══════════════════════════════════════════
  //  PROFILE MENU
  // ═══════════════════════════════════════════

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-wrapper')) {
      this.isProfileMenuOpen = false;
      this.cdr.markForCheck();
    }
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
    this.cdr.markForCheck();
  }

  closeProfileMenu(): void {
    this.isProfileMenuOpen = false;
    this.cdr.markForCheck();
  }

  logout(): void {
    this.authService.logout();
  }

  // ═══════════════════════════════════════════
  //  LOAD REAL STATS
  // ═══════════════════════════════════════════

  private loadStats(): void {
    const user = this.authService.getCurrentUser();
    if (!user?.userId) {
      this.isLoadingStats = false;
      return;
    }

    const userId = user.userId;

    // 1. Số khóa học đã đăng ký (từ localStorage)
    this.enrolledCount = this.enrollmentService.getEnrolledCourses(userId).length;

    // 2. Vocabulary stats + all vocabulary (để tính từ hôm nay)
    const vocabStats$ = this.vocabularyService.getUserStats(userId).pipe(
      catchError(() => of(null))
    );
    const allVocab$ = this.vocabularyService.getAllVocabulary(userId).pipe(
      catchError(() => of([] as VocabularyWord[]))
    );
    const quizStats$ = this.quizResultService.getUserStats(userId).pipe(
      catchError(() => of(null))
    );

    forkJoin({ vocabStats: vocabStats$, allVocab: allVocab$, quizStats: quizStats$ }).subscribe({
      next: ({ vocabStats, allVocab, quizStats }) => {
        // Tổng số từ đã học
        this.totalWordsLearned = vocabStats?.totalWordsLearned ?? 0;

        // Số từ học hôm nay: lọc từ có createdAt = hôm nay và learned = true
        const todayKey = this.getTodayKey();
        this.todayWordsLearned = (allVocab as VocabularyWord[]).filter(w => {
          const wordDate = w.createdAt ? w.createdAt.substring(0, 10) : '';
          return wordDate === todayKey && w.learned;
        }).length;

        // Số bài tập đã làm (tổng lượt)
        this.completedAssignments = quizStats?.totalAttempts ?? 0;

        this.isLoadingStats = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingStats = false;
        this.cdr.markForCheck();
      }
    });
  }

  private getTodayKey(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
