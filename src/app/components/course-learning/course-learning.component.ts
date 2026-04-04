import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CourseService, Lesson as ApiLesson } from '../../services/course.service';
import { AssignmentService, QuestionDTO } from '../../services/assignment.service';
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
    this.quizSubmitted = false;
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

          if (assignment.title) {
            // Use assignment title/description if available
            this.currentLesson.description = assignment.description || this.currentLesson.description;
          }

          if (assignment.questions && assignment.questions.length > 0) {
            this.currentLesson.quiz = this.convertApiQuestions(assignment.questions);
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
   */
  private convertApiQuestions(apiQuestions: QuestionDTO[]): QuizQuestion[] {
    return apiQuestions.map((q, index) => {
      // Sort option keys alphabetically: A, B, C, D
      const keys = Object.keys(q.options).sort();
      const options = keys.map((key) => q.options[key]);
      const correctAnswer = keys.indexOf(q.answer);

      return {
        id: index + 1,
        question: q.question,
        options,
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
    if (this.quizSubmitted) return;
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
    if (!this.currentLesson?.quiz) return 0;
    return this.currentLesson.quiz.filter(
      (q) => q.selectedAnswer === q.correctAnswer,
    ).length;
  }

  get scorePercent(): number {
    if (this.totalQuestions === 0) return 0;
    return Math.round((this.quizScore / this.totalQuestions) * 100);
  }

  get isPerfectScore(): boolean {
    return this.quizScore === this.totalQuestions;
  }

  submitQuiz(): void {
    if (!this.allQuestionsAnswered) return;
    this.quizSubmitted = true;

    // Mark lesson as completed in sidebar
    const sidebarItem = this.sidebarLessons.find(
      (l) => l.id === this.currentLesson?.id,
    );
    if (sidebarItem) {
      sidebarItem.status = 'completed';
    }
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
