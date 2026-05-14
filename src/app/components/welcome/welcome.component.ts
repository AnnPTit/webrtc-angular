import { Component, ChangeDetectionStrategy, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CourseService, Course, CourseLevel } from '../../services/course.service';

interface QuizQuestion {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  options: { value: string; label: string; icon: string; description: string }[];
}

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.css',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeComponent {
  currentStep = signal(0); // 0=welcome, 1-4=questions, 5=result
  answers = signal<Record<string, string>>({});
  recommendedLevel = signal<CourseLevel>('BEGINNER');
  recommendedCourses = signal<Course[]>([]);
  allCourses = signal<Course[]>([]);
  loadingCourses = signal(false);
  animating = signal(false);

  totalSteps = 6; // welcome + 4 questions + result

  questions: QuizQuestion[] = [
    {
      id: 'level',
      title: 'Trình độ tiếng Anh hiện tại của bạn?',
      subtitle: 'Giúp chúng tôi hiểu bạn đang ở đâu',
      icon: '📊',
      options: [
        { value: 'beginner', label: 'Mới bắt đầu', icon: '🌱', description: 'Chưa biết gì hoặc biết rất ít' },
        { value: 'basic', label: 'Cơ bản', icon: '📝', description: 'Biết chữ cái, số đếm, câu đơn giản' },
        { value: 'intermediate', label: 'Trung bình', icon: '💬', description: 'Giao tiếp đơn giản được' },
        { value: 'advanced', label: 'Khá tốt', icon: '🎯', description: 'Đọc hiểu tốt, giao tiếp lưu loát' },
      ],
    },
    {
      id: 'goal',
      title: 'Mục tiêu học tiếng Anh của bạn?',
      subtitle: 'Chúng tôi sẽ tùy chỉnh lộ trình phù hợp',
      icon: '🎯',
      options: [
        { value: 'daily', label: 'Giao tiếp hàng ngày', icon: '🗣️', description: 'Tự tin nói chuyện với người nước ngoài' },
        { value: 'work', label: 'Công việc', icon: '💼', description: 'Sử dụng trong môi trường doanh nghiệp' },
        { value: 'exam', label: 'Thi chứng chỉ', icon: '🏆', description: 'IELTS, TOEIC, TOEFL...' },
        { value: 'study_abroad', label: 'Du học', icon: '✈️', description: 'Chuẩn bị cho việc học ở nước ngoài' },
      ],
    },
    {
      id: 'time',
      title: 'Bạn có thể dành bao nhiêu thời gian mỗi ngày?',
      subtitle: 'Chúng tôi sẽ điều chỉnh khối lượng bài học',
      icon: '⏰',
      options: [
        { value: '15min', label: '15 phút', icon: '⚡', description: 'Học nhanh, hiệu quả' },
        { value: '30min', label: '30 phút', icon: '📖', description: 'Vừa đủ cho 1 bài học' },
        { value: '1hour', label: '1 giờ', icon: '📚', description: 'Học chuyên sâu hơn' },
        { value: 'more', label: 'Hơn 1 giờ', icon: '🔥', description: 'Tập trung học tối đa' },
      ],
    },
    {
      id: 'skill',
      title: 'Kỹ năng nào bạn muốn cải thiện nhất?',
      subtitle: 'Chọn kỹ năng ưu tiên hàng đầu',
      icon: '💡',
      options: [
        { value: 'listening', label: 'Nghe', icon: '👂', description: 'Nghe hiểu hội thoại, bài giảng' },
        { value: 'speaking', label: 'Nói', icon: '🎙️', description: 'Phát âm chuẩn, nói lưu loát' },
        { value: 'reading', label: 'Đọc', icon: '📖', description: 'Đọc hiểu văn bản, tài liệu' },
        { value: 'writing', label: 'Viết', icon: '✍️', description: 'Viết email, essay, báo cáo' },
      ],
    },
  ];

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  get progressPercent(): number {
    return (this.currentStep() / (this.totalSteps - 1)) * 100;
  }

  get currentQuestion(): QuizQuestion | null {
    const step = this.currentStep();
    if (step >= 1 && step <= 4) {
      return this.questions[step - 1];
    }
    return null;
  }

  constructor(
    private authService: AuthService,
    private courseService: CourseService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  nextStep(): void {
    if (this.animating()) return;
    this.animating.set(true);
    setTimeout(() => {
      const next = this.currentStep() + 1;
      this.currentStep.set(next);
      this.animating.set(false);

      // If we just entered the result step, calculate and load courses
      if (next === 5) {
        this.analyzeAndRecommend();
      }
      this.cdr.markForCheck();
    }, 300);
  }

  selectAnswer(questionId: string, value: string): void {
    this.answers.update(prev => ({ ...prev, [questionId]: value }));
    // Auto-advance after short delay
    setTimeout(() => this.nextStep(), 400);
  }

  isSelected(questionId: string, value: string): boolean {
    return this.answers()[questionId] === value;
  }

  analyzeAndRecommend(): void {
    const a = this.answers();
    let level: CourseLevel = 'BEGINNER';

    // Base level from self-assessment
    switch (a['level']) {
      case 'beginner':
      case 'basic':
        level = 'BEGINNER';
        break;
      case 'intermediate':
        level = 'INTERMEDIATE';
        break;
      case 'advanced':
        level = 'ADVANCED';
        break;
    }

    // Boost for ambitious goals
    if (a['goal'] === 'exam' || a['goal'] === 'study_abroad') {
      if (level === 'BEGINNER') level = 'INTERMEDIATE';
      else if (level === 'INTERMEDIATE') level = 'ADVANCED';
    }

    this.recommendedLevel.set(level);
    this.loadCourses(level);
  }

  loadCourses(level: CourseLevel): void {
    this.loadingCourses.set(true);
    this.courseService.getAllCourses().subscribe({
      next: (courses) => {
        this.allCourses.set(courses);
        // Filter courses matching the recommended level
        const matched = courses.filter(c => c.level === level);
        // If no exact match, show all courses
        this.recommendedCourses.set(matched.length > 0 ? matched : courses);
        this.loadingCourses.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingCourses.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  getLevelLabel(level: CourseLevel): string {
    switch (level) {
      case 'BEGINNER': return 'Cơ bản';
      case 'INTERMEDIATE': return 'Trung bình';
      case 'ADVANCED': return 'Nâng cao';
    }
  }

  getLevelColor(level?: CourseLevel): string {
    switch (level) {
      case 'BEGINNER': return '#10B981';
      case 'INTERMEDIATE': return '#F59E0B';
      case 'ADVANCED': return '#EF4444';
      default: return '#3B82F6';
    }
  }

  getLevelBg(level?: CourseLevel): string {
    switch (level) {
      case 'BEGINNER': return '#ECFDF5';
      case 'INTERMEDIATE': return '#FFFBEB';
      case 'ADVANCED': return '#FEF2F2';
      default: return '#EFF6FF';
    }
  }

  getCourseIcon(index: number): string {
    const icons = ['📚', '🎓', '💡', '🌍', '✏️', '🔬', '🎨', '📐', '🧠', '📖'];
    return icons[index % icons.length];
  }

  goHome(): void {
    this.authService.clearNewUserFlag();
    this.router.navigate(['/home']);
  }

  startCourse(courseId: number): void {
    this.authService.clearNewUserFlag();
    this.router.navigate(['/learn', courseId]);
  }

  skip(): void {
    this.authService.clearNewUserFlag();
    this.router.navigate(['/home']);
  }
}
