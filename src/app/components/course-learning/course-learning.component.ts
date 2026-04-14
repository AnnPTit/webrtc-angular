import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CourseService, Lesson as ApiLesson } from '../../services/course.service';
import { AssignmentService, QuestionDTO } from '../../services/assignment.service';
import { QuizResultService, QuizResultResponse, SubmitQuizRequest, AnswerItem } from '../../services/quiz-result.service';
import {
  CourseInfo,
  LessonData,
  QuizQuestion,
  SidebarLesson,
} from './models/course-learning.models';

@Component({
  selector: 'app-course-learning',
  templateUrl: './course-learning.component.html',
  styleUrl: './course-learning.component.css',
  imports: [CommonModule, FormsModule],
})
export class CourseLearningComponent implements OnInit, OnDestroy {
  // ── Course & Lesson Data ──
  courseInfo: CourseInfo = { id: 0, title: '', description: '' };
  sidebarLessons: SidebarLesson[] = [];
  currentLesson: LessonData | null = null;

  // ── Loading / Error ──
  loadingCourse = true;
  loadingLesson = false;
  loadingQuiz = false;
  errorMessage: string | null = null;

  // ── Video ──
  videoWatchPercent = 0;
  videoWatched = false;

  // ── Quiz ──
  quizSubmitted = false;
  submittingQuiz = false;
  quizStartTime = 0;
  serverResult: QuizResultResponse | null = null;
  submitError: string | null = null;

  // ── Quiz History ──
  quizHistory: QuizResultResponse[] = [];
  showHistory = false;
  loadingHistory = false;

  // ── UI ──
  sidebarOpen = true;
  mobileSidebarOpen = false;

  private courseId = 0;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private courseService: CourseService,
    private assignmentService: AssignmentService,
    private quizResultService: QuizResultService,
    private cdr: ChangeDetectorRef,
  ) {}

  // ═══════════════════════════════════════════
  //  LIFECYCLE
  // ═══════════════════════════════════════════

  ngOnInit(): void {
    this.courseId = Number(this.route.snapshot.paramMap.get('courseId'));
    if (!this.courseId || isNaN(this.courseId)) {
      this.errorMessage = 'ID khóa học không hợp lệ.';
      this.loadingCourse = false;
      return;
    }
    this.loadCourseAndLessons();
  }

  ngOnDestroy(): void {
    // cleanup if needed
  }

  // ═══════════════════════════════════════════
  //  DATA LOADING
  // ═══════════════════════════════════════════

  private loadCourseAndLessons(): void {
    this.loadingCourse = true;
    this.errorMessage = null;

    // Load course info
    this.courseService.getCourseById(this.courseId).subscribe({
      next: (course) => {
        this.courseInfo = {
          id: course.id,
          title: course.title,
          description: course.description,
        };
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load course:', err);
        this.errorMessage = 'Không thể tải thông tin khóa học.';
        this.loadingCourse = false;
        this.cdr.markForCheck();
      },
    });

    // Load lesson list
    this.courseService.getLessonsByCourseId(this.courseId).subscribe({
      next: (apiLessons) => {
        this.sidebarLessons = apiLessons.map((l) => ({
          id: l.id,
          title: l.title,
          status: 'not-started' as const,
          duration: '',
        }));
        this.loadingCourse = false;

        // Auto-select first lesson
        if (this.sidebarLessons.length > 0) {
          this.selectLesson(this.sidebarLessons[0].id);
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load lessons:', err);
        this.errorMessage = 'Không thể tải danh sách bài học.';
        this.loadingCourse = false;
        this.cdr.markForCheck();
      },
    });
  }

  selectLesson(lessonId: number): void {
    if (this.currentLesson?.id === lessonId) return;

    this.loadingLesson = true;
    this.loadingQuiz = false;
    this.resetQuizState();
    this.videoWatchPercent = 0;
    this.videoWatched = false;

    const sidebarItem = this.sidebarLessons.find((l) => l.id === lessonId);
    const lessonTitle = sidebarItem?.title || `Lesson ${lessonId}`;

    // Initialize lesson data (video will be loaded, quiz loaded separately)
    this.currentLesson = {
      id: lessonId,
      title: lessonTitle,
      description: '',
      videoUrl: '',
      videoDescription: '',
      duration: '',
      status: 'in-progress',
      quiz: [],
    };

    // Update sidebar
    if (sidebarItem && sidebarItem.status === 'not-started') {
      sidebarItem.status = 'in-progress';
    }

    // 1) Load videos for the lesson
    this.courseService.getVideosByLesson(this.courseId, lessonId).subscribe({
      next: (videos) => {
        if (videos && videos.length > 0 && this.currentLesson?.id === lessonId) {
          const video = videos[0];
          this.currentLesson.videoUrl = video.videoUrl || '';

          // Try to get a signed URL for the video
          if (video.objectKey) {
            this.courseService.getSignedVideoUrl(video.objectKey).subscribe({
              next: (res) => {
                if (this.currentLesson?.id === lessonId) {
                  this.currentLesson.videoUrl = res.signedUrl;
                  this.cdr.markForCheck();
                }
              },
              error: () => { /* keep original videoUrl */ },
            });
          }
        }
        this.loadingLesson = false;
        this.mobileSidebarOpen = false;
        this.cdr.markForCheck();

        setTimeout(() => {
          const el = document.getElementById('lesson-scroll-container');
          if (el) el.scrollTop = 0;
        }, 50);
      },
      error: () => {
        // Video loading failed — lesson still usable without video
        this.loadingLesson = false;
        this.mobileSidebarOpen = false;
        this.cdr.markForCheck();
      },
    });

    // 2) Load quiz/assignments for the lesson
    this.loadQuizForLesson(lessonId);
  }

  /**
   * Calls GET /api/assignments/by-lesson/{lessonId} to load quiz questions.
   * Converts API QuestionDTO format to component's QuizQuestion format.
   */
  private loadQuizForLesson(lessonId: number): void {
    this.loadingQuiz = true;

    this.assignmentService.getAssignmentsByLessonId(lessonId).subscribe({
      next: (response) => {
        if (this.currentLesson?.id !== lessonId) return;

        const assignments = response.data;
        if (assignments && assignments.length > 0) {
          // Use the first assignment that has status DONE and has questions
          const assignment = assignments.find(
            (a) => a.questions && a.questions.length > 0,
          ) || assignments[0];

          // Save assignmentId for quiz submission
          if (this.currentLesson) {
            this.currentLesson.assignmentId = assignment.id;
          }

          if (assignment.title) {
            // Use assignment title/description if available
            this.currentLesson.description = assignment.description || this.currentLesson.description;
          }

          if (assignment.questions && assignment.questions.length > 0) {
            this.currentLesson.quiz = this.convertApiQuestions(assignment.questions);
            // Start the quiz timer
            this.quizStartTime = Date.now();
          }
        }

        this.loadingQuiz = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load assignments for lesson:', err);
        // Quiz loading failed — lesson still usable, just no quiz
        this.loadingQuiz = false;
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Converts API QuestionDTO[] (options as key-value map, answer as letter)
   * to component QuizQuestion[] (options as string[], correctAnswer as index).
   * Also stores dbId and optionKeys for API submission.
   */
  private convertApiQuestions(apiQuestions: QuestionDTO[]): QuizQuestion[] {
    return apiQuestions.map((q, index) => {
      // Sort option keys alphabetically: A, B, C, D
      const keys = Object.keys(q.options).sort();
      const options = keys.map((key) => q.options[key]);
      const correctAnswer = keys.indexOf(q.answer);

      return {
        id: index + 1,
        dbId: q.questionId,
        question: q.question,
        options,
        optionKeys: keys,
        correctAnswer: correctAnswer >= 0 ? correctAnswer : 0,
        explanation: `Đáp án đúng: ${q.answer}. ${q.options[q.answer] || ''}`,
        selectedAnswer: undefined,
        isAnswered: false,
      };
    });
  }

  // ═══════════════════════════════════════════
  //  VIDEO
  // ═══════════════════════════════════════════

  onVideoTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (video.duration > 0) {
      this.videoWatchPercent = Math.round((video.currentTime / video.duration) * 100);
      if (this.videoWatchPercent >= 80 && !this.videoWatched) {
        this.videoWatched = true;
      }
    }
  }

  onVideoEnded(): void {
    this.videoWatched = true;
    this.videoWatchPercent = 100;
  }

  // ═══════════════════════════════════════════
  //  QUIZ
  // ═══════════════════════════════════════════

  selectAnswer(question: QuizQuestion, answerIndex: number): void {
    if (this.quizSubmitted || this.submittingQuiz) return;
    question.selectedAnswer = answerIndex;
    question.isAnswered = true;
  }

  get allQuestionsAnswered(): boolean {
    if (!this.currentLesson?.quiz) return false;
    return this.currentLesson.quiz.every((q) => q.isAnswered);
  }

  get answeredCount(): number {
    return this.currentLesson?.quiz?.filter((q) => q.isAnswered).length || 0;
  }

  get totalQuestions(): number {
    return this.currentLesson?.quiz?.length || 0;
  }

  get quizScore(): number {
    // Prefer server result
    if (this.serverResult) return this.serverResult.correctCount;
    if (!this.currentLesson?.quiz) return 0;
    return this.currentLesson.quiz.filter(
      (q) => q.selectedAnswer === q.correctAnswer,
    ).length;
  }

  get scorePercent(): number {
    // Prefer server result
    if (this.serverResult) return Math.round(this.serverResult.score);
    if (this.totalQuestions === 0) return 0;
    return Math.round((this.quizScore / this.totalQuestions) * 100);
  }

  get isPerfectScore(): boolean {
    return this.quizScore === this.totalQuestions;
  }

  get quizDurationSeconds(): number {
    if (this.serverResult?.durationSeconds) return this.serverResult.durationSeconds;
    if (this.quizStartTime > 0) {
      return Math.round((Date.now() - this.quizStartTime) / 1000);
    }
    return 0;
  }

  get formattedDuration(): string {
    const secs = this.quizDurationSeconds;
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    if (mins > 0) {
      return `${mins} phút ${remSecs} giây`;
    }
    return `${secs} giây`;
  }

  /**
   * Submit quiz to backend API.
   * Builds the request with userId, assignmentId, duration, and answers.
   */
  submitQuiz(): void {
    if (!this.allQuestionsAnswered || this.submittingQuiz) return;

    const user = this.authService.getCurrentUser();
    const assignmentId = this.currentLesson?.assignmentId;

    // If we don't have user or assignmentId, fall back to local grading
    if (!user?.userId || !assignmentId) {
      this.submitQuizLocally();
      return;
    }

    this.submittingQuiz = true;
    this.submitError = null;

    // Calculate duration
    const durationSeconds = this.quizStartTime > 0
      ? Math.round((Date.now() - this.quizStartTime) / 1000)
      : undefined;

    // Build answers array
    const answers: AnswerItem[] = (this.currentLesson?.quiz || []).map((q) => {
      let selectedAnswer: string | null = null;
      if (q.isAnswered && q.selectedAnswer !== undefined && q.optionKeys) {
        selectedAnswer = q.optionKeys[q.selectedAnswer] || null;
      }
      return {
        questionId: q.dbId || q.id,
        selectedAnswer,
      };
    });

    const request: SubmitQuizRequest = {
      userId: user.userId,
      assignmentId,
      durationSeconds,
      answers,
    };

    this.quizResultService.submitQuiz(request).subscribe({
      next: (result) => {
        this.serverResult = result;
        this.quizSubmitted = true;
        this.submittingQuiz = false;

        // Update answer correctness from server
        this.applyServerResults(result);

        // Mark lesson as completed in sidebar
        const sidebarItem = this.sidebarLessons.find(
          (l) => l.id === this.currentLesson?.id,
        );
        if (sidebarItem) {
          sidebarItem.status = 'completed';
        }

        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to submit quiz:', err);
        this.submittingQuiz = false;
        this.submitError = 'Không thể nộp bài. Vui lòng thử lại.';
        // Fall back to local grading on error
        this.submitQuizLocally();
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Fallback: grade quiz locally when API is unavailable
   */
  private submitQuizLocally(): void {
    this.quizSubmitted = true;
    this.submittingQuiz = false;

    // Mark lesson as completed in sidebar
    const sidebarItem = this.sidebarLessons.find(
      (l) => l.id === this.currentLesson?.id,
    );
    if (sidebarItem) {
      sidebarItem.status = 'completed';
    }
  }

  /**
   * Apply server answer results back to the local quiz questions.
   * Updates correctAnswer from server response for accurate display.
   */
  private applyServerResults(result: QuizResultResponse): void {
    if (!this.currentLesson?.quiz || !result.answerDetails) return;

    for (const detail of result.answerDetails) {
      const question = this.currentLesson.quiz.find((q) => q.dbId === detail.questionId);
      if (question && question.optionKeys) {
        // Update correct answer from server
        const correctIndex = question.optionKeys.indexOf(detail.correctAnswer);
        if (correctIndex >= 0) {
          question.correctAnswer = correctIndex;
        }

        // Update explanation with server info
        question.explanation = `Đáp án đúng: ${detail.correctAnswer}. ${detail.questionText || ''}`;
      }
    }
  }

  /**
   * Retry quiz — reset all state and allow user to retake.
   */
  retryQuiz(): void {
    this.resetQuizState();

    // Reset all question answers
    if (this.currentLesson?.quiz) {
      for (const q of this.currentLesson.quiz) {
        q.selectedAnswer = undefined;
        q.isAnswered = false;
      }
    }

    // Restart timer
    this.quizStartTime = Date.now();
    this.cdr.markForCheck();

    // Scroll to quiz section
    setTimeout(() => {
      const el = document.getElementById('quiz-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  private resetQuizState(): void {
    this.quizSubmitted = false;
    this.submittingQuiz = false;
    this.serverResult = null;
    this.submitError = null;
    this.quizHistory = [];
    this.showHistory = false;
    this.loadingHistory = false;
  }

  // ═══════════════════════════════════════════
  //  QUIZ HISTORY
  // ═══════════════════════════════════════════

  toggleHistory(): void {
    if (this.showHistory) {
      this.showHistory = false;
      return;
    }

    const user = this.authService.getCurrentUser();
    const assignmentId = this.currentLesson?.assignmentId;
    if (!user?.userId || !assignmentId) return;

    this.showHistory = true;
    this.loadingHistory = true;

    this.quizResultService.getHistory(user.userId, assignmentId).subscribe({
      next: (history) => {
        this.quizHistory = history;
        this.loadingHistory = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load quiz history:', err);
        this.loadingHistory = false;
        this.cdr.markForCheck();
      },
    });
  }

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

  formatDuration(seconds: number | null): string {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}p ${secs}s`;
    return `${secs}s`;
  }

  // ═══════════════════════════════════════════
  //  NAVIGATION
  // ═══════════════════════════════════════════

  get currentLessonIndex(): number {
    return this.sidebarLessons.findIndex(
      (l) => l.id === this.currentLesson?.id,
    );
  }

  get canGoNext(): boolean {
    return this.currentLessonIndex < this.sidebarLessons.length - 1;
  }

  get canGoPrev(): boolean {
    return this.currentLessonIndex > 0;
  }

  goToNextLesson(): void {
    if (!this.canGoNext) return;
    const nextLesson = this.sidebarLessons[this.currentLessonIndex + 1];
    this.selectLesson(nextLesson.id);
  }

  goToPrevLesson(): void {
    if (!this.canGoPrev) return;
    const prevLesson = this.sidebarLessons[this.currentLessonIndex - 1];
    this.selectLesson(prevLesson.id);
  }

  goBackToCourses(): void {
    this.router.navigate(['/courses']);
  }

  goToStats(): void {
    this.router.navigate(['/quiz-stats']);
  }

  // ═══════════════════════════════════════════
  //  SIDEBAR
  // ═══════════════════════════════════════════

  toggleSidebar(): void {
    if (window.innerWidth <= 1024) {
      this.mobileSidebarOpen = !this.mobileSidebarOpen;
    } else {
      this.sidebarOpen = !this.sidebarOpen;
    }
  }

  closeMobileOverlay(): void {
    this.mobileSidebarOpen = false;
  }

  // ═══════════════════════════════════════════
  //  PROGRESS
  // ═══════════════════════════════════════════

  get completedLessonsCount(): number {
    return this.sidebarLessons.filter((l) => l.status === 'completed').length;
  }

  get progressPercent(): number {
    if (this.sidebarLessons.length === 0) return 0;
    return Math.round(
      (this.completedLessonsCount / this.sidebarLessons.length) * 100,
    );
  }

  // ═══════════════════════════════════════════
  //  USER
  // ═══════════════════════════════════════════

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
