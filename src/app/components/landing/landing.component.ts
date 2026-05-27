import {
  Component,
  ChangeDetectionStrategy,
  signal,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * LandingComponent — Trang chào mừng công khai (route: /)
 *
 * Hiển thị cho tất cả người dùng kể cả chưa đăng nhập.
 * Cung cấp ba điểm điều hướng chính:
 *  • /meeting  — Họp trực tuyến ngay (guest access)
 *  • /login    — Đăng nhập
 *  • /register — Đăng ký tài khoản
 */
@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);

  /** Trạng thái navbar cuộn */
  isScrolled = signal(false);

  /** Trạng thái menu mobile */
  mobileMenuOpen = signal(false);

  /** Các số liệu thống kê hiển thị trên hero */
  stats = [
    { value: '10,000+', label: 'Sinh viên' },
    { value: '500+', label: 'Bài học' },
    { value: '98%', label: 'Hài lòng' },
    { value: '24/7', label: 'Hỗ trợ' },
  ];

  /** Tính năng nổi bật */
  features = [
    {
      icon: '🎥',
      title: 'Họp trực tuyến HD',
      description: 'Kết nối real-time với WebRTC. Chất lượng video Full HD, độ trễ cực thấp, phù hợp mọi thiết bị.',
      color: 'blue',
    },
    {
      icon: '📚',
      title: 'Học liệu phong phú',
      description: 'Thư viện khóa học tiếng Anh đa dạng từ cơ bản đến nâng cao, được thiết kế bởi chuyên gia.',
      color: 'purple',
    },
    {
      icon: '🤖',
      title: 'AI hỗ trợ học tập',
      description: 'Hệ thống AI thông minh gợi ý từ vựng, phân tích tiến độ và cá nhân hóa lộ trình học của bạn.',
      color: 'green',
    },
    {
      icon: '🏆',
      title: 'Quiz & Gamification',
      description: 'Hệ thống bài kiểm tra tương tác, bảng xếp hạng và phần thưởng giúp học vui và hiệu quả hơn.',
      color: 'amber',
    },
    {
      icon: '📊',
      title: 'Theo dõi tiến độ',
      description: 'Dashboard chi tiết hiển thị tiến trình học tập, điểm mạnh và khu vực cần cải thiện của bạn.',
      color: 'pink',
    },
    {
      icon: '🌍',
      title: 'Cộng đồng học tập',
      description: 'Kết nối với hàng nghìn học viên, trao đổi kiến thức và cùng nhau phát triển kỹ năng ngôn ngữ.',
      color: 'indigo',
    },
  ];

  /** Đánh giá từ học viên */
  testimonials = [
    {
      name: 'Nguyễn Minh Anh',
      role: 'Sinh viên CNTT',
      avatar: 'N',
      content: 'Nền tảng tuyệt vời! Tôi đã cải thiện tiếng Anh rõ rệt chỉ sau 3 tháng nhờ hệ thống AI gợi ý từ vựng thông minh.',
      rating: 5,
    },
    {
      name: 'Trần Thị Bích',
      role: 'Giảng viên Đại học',
      avatar: 'T',
      content: 'Tính năng họp trực tuyến rất ổn định và dễ sử dụng. Sinh viên của tôi rất thích học qua nền tảng này.',
      rating: 5,
    },
    {
      name: 'Lê Hoàng Nam',
      role: 'Kỹ sư Phần mềm',
      avatar: 'L',
      content: 'Giao diện đẹp, tốc độ nhanh và nội dung chất lượng cao. Đây là lựa chọn hàng đầu cho việc học tiếng Anh.',
      rating: 5,
    },
  ];

  private scrollListener!: () => void;

  ngOnInit(): void {
    // Nếu user đã đăng nhập, chuyển hướng đến trang phù hợp
    if (this.authService.getToken()) {
      const user = this.authService.getCurrentUser();
      const target = (user?.role === 'LECTURER' || user?.role === 'ADMIN')
        ? '/dashboard'
        : '/home';
      this.router.navigate([target]);
      return;
    }

    // Lắng nghe sự kiện cuộn để thay đổi style navbar
    this.scrollListener = () => {
      this.isScrolled.set(window.scrollY > 30);
    };
    window.addEventListener('scroll', this.scrollListener, { passive: true });
  }

  ngOnDestroy(): void {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
  }

  /** Toggle menu mobile */
  toggleMobileMenu(): void {
    this.mobileMenuOpen.set(!this.mobileMenuOpen());
  }

  /** Cuộn mượt đến section */
  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    this.mobileMenuOpen.set(false);
  }

  /** Điều hướng đến trang họp ngay */
  goToMeeting(): void {
    this.router.navigate(['/meeting']);
  }
}
