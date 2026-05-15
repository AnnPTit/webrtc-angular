import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CourseService, type Course, type Lesson } from '../../services/course.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-lecturer-dashboard',
  templateUrl: './lecturer-dashboard.component.html',
  styleUrl: './lecturer-dashboard.component.css',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LecturerDashboardComponent implements OnInit {
  private courseService = inject(CourseService);

  // Stats
  totalCourses = signal(0);
  totalLessons = signal(0);
  statsLoading = signal(true);

  menuItems = [
    {
      id: 'upload-video',
      title: 'Tải video lên',
      description: 'Đăng tải video bài giảng',
      icon: 'video',
      route: '/dashboard/videos/upload',
      color: '#4ecca3'
    },
    {
      id: 'manage-courses',
      title: 'Quản lý khóa học',
      description: 'Tạo và chỉnh sửa các khóa học của bạn',
      icon: 'book',
      route: '/dashboard/courses',
      color: '#45b7d1'
    },
    {
      id: 'create-meeting',
      title: 'Tạo cuộc họp',
      description: 'Khởi tạo phòng họp trực tuyến cho lớp',
      icon: 'video',
      route: '/meeting',
      color: '#4ecca3'
    },
    {
      id: 'assignments',
      title: 'Giao bài tập',
      description: 'Tạo và xem trạng thái bài tập của sinh viên',
      icon: 'assignment',
      route: null,
      color: '#f093fb'
    },
    {
      id: 'student-list',
      title: 'Danh sách sinh viên',
      description: 'Xem thông tin và tiến độ học tập của sinh viên',
      icon: 'users',
      route: null,
      color: '#f5576c'
    },
    {
      id: 'schedule',
      title: 'Lịch giảng dạy',
      description: 'Theo dõi lịch trình bài giảng và sự kiện',
      icon: 'calendar',
      route: null,
      color: '#feca57'
    },
    {
      id: 'grades',
      title: 'Chấm điểm',
      description: 'Nhập điểm và nhận xét cho sinh viên',
      icon: 'grade',
      route: null,
      color: '#ff6b6b'
    }
  ];

  constructor(protected authService: AuthService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  logout(): void {
    this.authService.logout();
  }

  private loadStats(): void {
    this.statsLoading.set(true);

    // Load all courses (backend filters by lecturer for LECTURER role)
    this.courseService.getAllCourses().subscribe({
      next: (courses: Course[]) => {
        this.totalCourses.set(courses.length);

        if (courses.length === 0) {
          this.totalLessons.set(0);
          this.statsLoading.set(false);
          return;
        }

        // Load lessons for each course and sum up
        const lessonRequests = courses.map(c => this.courseService.getLessonsByCourseId(c.id));
        forkJoin(lessonRequests).subscribe({
          next: (lessonArrays: Lesson[][]) => {
            const total = lessonArrays.reduce((sum, arr) => sum + arr.length, 0);
            this.totalLessons.set(total);
            this.statsLoading.set(false);
          },
          error: () => {
            this.totalLessons.set(0);
            this.statsLoading.set(false);
          }
        });
      },
      error: () => {
        this.totalCourses.set(0);
        this.totalLessons.set(0);
        this.statsLoading.set(false);
      }
    });
  }
}
