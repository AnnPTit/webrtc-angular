import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  QuizResultService,
  UserStatsResponse,
  QuizResultResponse,
  ProgressPoint,
} from '../../services/quiz-result.service';

@Component({
  selector: 'app-quiz-stats',
  templateUrl: './quiz-stats.component.html',
  styleUrl: './quiz-stats.component.css',
  imports: [CommonModule, FormsModule],
})
export class QuizStatsComponent implements OnInit {
  // ── Data ──
  userStats: UserStatsResponse | null = null;
  recentResults: QuizResultResponse[] = [];
  selectedResult: QuizResultResponse | null = null;

  // ── Loading ──
  loadingStats = true;
  loadingProgress = false;
  errorMessage: string | null = null;

  // ── Date Range for Progress ──
  dateFrom = '';
  dateTo = '';

  // ── Chart Data ──
  chartMaxScore = 100;

  constructor(
    private authService: AuthService,
    private quizResultService: QuizResultService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Default date range: last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    this.dateTo = this.toDateString(now);
    this.dateFrom = this.toDateString(thirtyDaysAgo);

    this.loadUserStats();
    this.loadProgress();
  }

  // ═══════════════════════════════════════════
  //  DATA LOADING
  // ═══════════════════════════════════════════

  private loadUserStats(): void {
    const user = this.authService.getCurrentUser();
    if (!user?.userId) {
      this.errorMessage = 'Không tìm thấy thông tin người dùng.';
      this.loadingStats = false;
      return;
    }

    this.loadingStats = true;
    this.quizResultService.getUserStats(user.userId).subscribe({
      next: (stats) => {
        this.userStats = stats;
        this.loadingStats = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load user stats:', err);
        this.errorMessage = 'Không thể tải thống kê. Vui lòng thử lại sau.';
        this.loadingStats = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadProgress(): void {
    const user = this.authService.getCurrentUser();
    if (!user?.userId || !this.dateFrom || !this.dateTo) return;

    this.loadingProgress = true;
    this.quizResultService.getUserProgress(user.userId, this.dateFrom, this.dateTo).subscribe({
      next: (results) => {
        this.recentResults = results;
        this.loadingProgress = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load progress:', err);
        this.loadingProgress = false;
        this.cdr.markForCheck();
      },
    });
  }

  viewResult(result: QuizResultResponse): void {
    this.selectedResult = this.selectedResult?.id === result.id ? null : result;
  }

  // ═══════════════════════════════════════════
  //  COMPUTED
  // ═══════════════════════════════════════════

  get scoreLabel(): string {
    const avg = this.userStats?.averageScore;
    if (avg === null || avg === undefined) return '—';
    if (avg >= 80) return 'Xuất sắc';
    if (avg >= 60) return 'Khá';
    if (avg >= 40) return 'Trung bình';
    return 'Cần cải thiện';
  }

  get scoreLabelClass(): string {
    const avg = this.userStats?.averageScore;
    if (avg === null || avg === undefined) return '';
    if (avg >= 80) return 'excellent';
    if (avg >= 60) return 'good';
    if (avg >= 40) return 'average';
    return 'poor';
  }

  get progressChartPoints(): string {
    if (!this.userStats?.progressHistory?.length) return '';

    const history = [...this.userStats.progressHistory].reverse(); // oldest first
    const len = history.length;
    if (len === 0) return '';

    const width = 100;
    const height = 50;
    const padding = 2;
    const usableWidth = width - padding * 2;
    const usableHeight = height - padding * 2;

    const points = history.map((p, i) => {
      const x = padding + (len === 1 ? usableWidth / 2 : (i / (len - 1)) * usableWidth);
      const y = padding + usableHeight - (p.score / this.chartMaxScore) * usableHeight;
      return `${x},${y}`;
    });

    return points.join(' ');
  }

  get progressChartAreaPoints(): string {
    if (!this.progressChartPoints) return '';

    const width = 100;
    const height = 50;
    const padding = 2;

    return `${padding},${height - padding} ${this.progressChartPoints} ${width - padding},${height - padding}`;
  }

  get improvementTrend(): string {
    const history = this.userStats?.progressHistory;
    if (!history || history.length < 2) return 'neutral';

    const recent = history.slice(0, Math.min(3, history.length));
    const older = history.slice(-Math.min(3, history.length));

    const recentAvg = recent.reduce((sum, p) => sum + p.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.score, 0) / older.length;

    if (recentAvg > olderAvg + 5) return 'improving';
    if (recentAvg < olderAvg - 5) return 'declining';
    return 'stable';
  }

  get trendIcon(): string {
    switch (this.improvementTrend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '📊';
    }
  }

  get trendText(): string {
    switch (this.improvementTrend) {
      case 'improving': return 'Đang tiến bộ!';
      case 'declining': return 'Cần cố gắng hơn';
      default: return 'Ổn định';
    }
  }

  // ═══════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════

  formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatShortDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    });
  }

  formatDuration(seconds: number | null): string {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}p ${secs}s`;
    return `${secs}s`;
  }

  scoreColor(score: number): string {
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  private toDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // ═══════════════════════════════════════════
  //  NAVIGATION
  // ═══════════════════════════════════════════

  goBack(): void {
    this.router.navigate(['/home']);
  }

  goToCourses(): void {
    this.router.navigate(['/courses']);
  }

  // ═══════════════════════════════════════════
  //  USER
  // ═══════════════════════════════════════════

  get username(): string {
    return this.userStats?.username || this.authService.getCurrentUser()?.fullName || 'Học viên';
  }

  get userInitials(): string {
    const user = this.authService.getCurrentUser();
    if (user?.fullName) {
      return user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
    }
    return 'ST';
  }
}
