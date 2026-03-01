import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
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
      route: null,
      color: '#45b7d1'
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

  constructor(protected authService: AuthService) {}

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  logout(): void {
    this.authService.logout();
  }
}
