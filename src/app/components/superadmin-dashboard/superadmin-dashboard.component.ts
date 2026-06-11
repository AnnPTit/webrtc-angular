import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthService } from '../../services/auth.service';
import { CourseService, Course } from '../../services/course.service';
import { UserService, SystemUser, CreateUserRequest, UpdateUserRequest } from '../../services/user.service';

interface CourseWithLessons {
  course: Course;
  lessonCount: number;
}

interface ActivityItem {
  icon: string;
  text: string;
  time: string;
  color: string;
}

type SectionType = 'overview' | 'users' | 'courses' | 'stats' | 'settings';

@Component({
  selector: 'app-superadmin-dashboard',
  templateUrl: './superadmin-dashboard.component.html',
  styleUrl: './superadmin-dashboard.component.css',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperadminDashboardComponent implements OnInit {
  activeSection: SectionType = 'overview';

  // ── Overview Stats ──
  totalCourses = 0;
  totalLessons = 0;
  totalUsers = 0;
  statsLoading = true;

  // ── Users ──
  users: SystemUser[] = [];
  filteredUsers: SystemUser[] = [];
  usersLoading = false;
  userSearchQuery = '';
  userRoleFilter: string = 'ALL';

  // ── User Modal (Create / Edit) ──
  showUserModal = false;
  isEditingUser = false;
  userModalLoading = false;
  userModalError: string | null = null;
  userForm: CreateUserRequest & { userId?: number; confirmPassword?: string } = {
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'STUDENT',
  };

  // ── Delete Confirm Modal ──
  showDeleteModal = false;
  deleteTarget: SystemUser | null = null;
  deleteLoading = false;

  // ── Toast ──
  toastMessage: string | null = null;
  toastType: 'success' | 'error' | 'info' = 'success';
  private toastTimeout: any;

  // ── Courses list ──
  courses: Course[] = [];
  coursesWithLessons: CourseWithLessons[] = [];
  filteredCoursesWithLessons: CourseWithLessons[] = [];
  coursesLoading = false;
  courseSearchQuery = '';

  // ── Sidebar ──
  sidebarCollapsed = false;

  // ── System info ──
  systemUptime = new Date();

  // ── Recent activity (static placeholder) ──
  recentActivities: ActivityItem[] = [
    { icon: '📚', text: 'Khóa học mới "Tiếng Anh giao tiếp B2" được tạo', time: '5 phút trước', color: '#3B82F6' },
    { icon: '👤', text: 'Giảng viên Nguyễn Văn A đăng nhập hệ thống',   time: '12 phút trước', color: '#10B981' },
    { icon: '📝', text: '24 học viên hoàn thành bài kiểm tra Module 3',  time: '1 giờ trước',   color: '#F59E0B' },
    { icon: '🎯', text: 'Bài học "Grammar Advanced" được cập nhật',       time: '2 giờ trước',   color: '#8B5CF6' },
    { icon: '🔔', text: 'Hệ thống backup dữ liệu thành công',             time: '3 giờ trước',   color: '#06B6D4' },
  ];

  // ── Chart data ──
  levelDistribution: { label: string; count: number; color: string; percentage: number }[] = [];

  readonly ROLES: { value: string; label: string }[] = [
    { value: 'ALL',        label: 'Tất cả vai trò' },
    { value: 'STUDENT',    label: 'Học viên' },
    { value: 'LECTURER',   label: 'Giảng viên' },
    { value: 'ADMIN',      label: 'Admin' },
    { value: 'SUPERADMIN', label: 'Super Admin' },
  ];

  readonly CREATE_ROLES: { value: string; label: string }[] = [
    { value: 'STUDENT',    label: 'Học viên' },
    { value: 'LECTURER',   label: 'Giảng viên' },
    { value: 'ADMIN',      label: 'Admin' },
    { value: 'SUPERADMIN', label: 'Super Admin' },
  ];

  constructor(
    protected authService: AuthService,
    private courseService: CourseService,
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadOverviewStats();
  }

  // ═══════════════════════════════════════════
  //  SECTION NAV
  // ═══════════════════════════════════════════

  setSection(section: SectionType): void {
    this.activeSection = section;
    if (section === 'users' && this.users.length === 0) {
      this.loadUsers();
    }
    if (section === 'courses' && this.coursesWithLessons.length === 0) {
      this.loadCoursesDetail();
    }
    if (section === 'stats' && this.courses.length === 0) {
      this.loadCoursesForStats();
    }
    this.cdr.markForCheck();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    this.cdr.markForCheck();
  }

  // ═══════════════════════════════════════════
  //  OVERVIEW STATS
  // ═══════════════════════════════════════════

  private loadOverviewStats(): void {
    this.statsLoading = true;

    forkJoin({
      courses: this.courseService.getAllCourses().pipe(catchError(() => of([] as Course[]))),
      users: this.userService.getAllUsers().pipe(catchError(() => of([] as SystemUser[]))),
    }).subscribe(({ courses, users }) => {
      this.courses = courses;
      this.totalCourses = courses.length;
      this.totalLessons = courses.reduce((s, c) => s + (c.lessonCount ?? 0), 0);
      this.users = users;
      this.filteredUsers = [...users];
      this.totalUsers = users.length;
      this.statsLoading = false;
      this.buildLevelDistribution(courses);
      this.cdr.markForCheck();
    });
  }

  // ═══════════════════════════════════════════
  //  USER MANAGEMENT
  // ═══════════════════════════════════════════

  loadUsers(): void {
    this.usersLoading = true;
    this.cdr.markForCheck();
    this.userService.getAllUsers().pipe(catchError(() => of([] as SystemUser[]))).subscribe(users => {
      this.users = users;
      this.applyUserFilters();
      this.totalUsers = users.length;
      this.usersLoading = false;
      this.cdr.markForCheck();
    });
  }

  filterUsers(): void {
    this.applyUserFilters();
    this.cdr.markForCheck();
  }

  private applyUserFilters(): void {
    let result = [...this.users];
    const q = this.userSearchQuery.toLowerCase().trim();

    if (q) {
      result = result.filter(u =>
        u.username.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }
    if (this.userRoleFilter !== 'ALL') {
      result = result.filter(u => u.role === this.userRoleFilter);
    }
    this.filteredUsers = result;
  }

  // ── Open Create Modal ──
  openCreateUserModal(): void {
    this.isEditingUser = false;
    this.userForm = { fullName: '', username: '', email: '', password: '', confirmPassword: '', role: 'STUDENT' };
    this.userModalError = null;
    this.showUserModal = true;
    this.cdr.markForCheck();
  }

  // ── Open Edit Modal ──
  openEditUserModal(user: SystemUser): void {
    this.isEditingUser = true;
    this.userForm = {
      userId: user.userId,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      password: '',
      confirmPassword: '',
      role: user.role as any,
    };
    this.userModalError = null;
    this.showUserModal = true;
    this.cdr.markForCheck();
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.userModalError = null;
    this.cdr.markForCheck();
  }

  submitUserForm(): void {
    // Validate
    if (!this.userForm.fullName.trim() || !this.userForm.username.trim() || !this.userForm.email.trim()) {
      this.userModalError = 'Vui lòng điền đầy đủ thông tin bắt buộc.';
      this.cdr.markForCheck();
      return;
    }
    if (!this.isEditingUser && !this.userForm.password.trim()) {
      this.userModalError = 'Vui lòng nhập mật khẩu.';
      this.cdr.markForCheck();
      return;
    }
    if (!this.isEditingUser && this.userForm.password !== this.userForm.confirmPassword) {
      this.userModalError = 'Mật khẩu xác nhận không khớp.';
      this.cdr.markForCheck();
      return;
    }

    this.userModalLoading = true;
    this.userModalError = null;
    this.cdr.markForCheck();

    if (this.isEditingUser && this.userForm.userId) {
      // UPDATE
      const updateData: UpdateUserRequest = {
        fullName: this.userForm.fullName,
        email: this.userForm.email,
        role: this.userForm.role,
      };
      this.userService.updateUser(this.userForm.userId, updateData).subscribe({
        next: (updated) => {
          const idx = this.users.findIndex(u => u.userId === updated.userId);
          if (idx !== -1) this.users[idx] = updated;
          this.applyUserFilters();
          this.userModalLoading = false;
          this.showUserModal = false;
          this.showToast(`Đã cập nhật người dùng "${updated.fullName}" thành công!`, 'success');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.userModalError = err.message;
          this.userModalLoading = false;
          this.cdr.markForCheck();
        },
      });
    } else {
      // CREATE
      const createData: CreateUserRequest = {
        fullName: this.userForm.fullName,
        username: this.userForm.username,
        email: this.userForm.email,
        password: this.userForm.password,
        role: this.userForm.role,
      };
      this.userService.createUser(createData).subscribe({
        next: (created) => {
          this.users.unshift(created);
          this.totalUsers = this.users.length;
          this.applyUserFilters();
          this.userModalLoading = false;
          this.showUserModal = false;
          this.showToast(`Đã tạo người dùng "${created.fullName}" thành công!`, 'success');
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.userModalError = err.message;
          this.userModalLoading = false;
          this.cdr.markForCheck();
        },
      });
    }
  }

  // ── Delete ──
  openDeleteModal(user: SystemUser): void {
    this.deleteTarget = user;
    this.showDeleteModal = true;
    this.cdr.markForCheck();
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.deleteTarget = null;
    this.cdr.markForCheck();
  }

  confirmDeleteUser(): void {
    if (!this.deleteTarget) return;
    this.deleteLoading = true;
    this.cdr.markForCheck();

    this.userService.deleteUser(this.deleteTarget.userId).subscribe({
      next: () => {
        const name = this.deleteTarget!.fullName;
        this.users = this.users.filter(u => u.userId !== this.deleteTarget!.userId);
        this.totalUsers = this.users.length;
        this.applyUserFilters();
        this.showDeleteModal = false;
        this.deleteTarget = null;
        this.deleteLoading = false;
        this.showToast(`Đã xóa người dùng "${name}" thành công!`, 'success');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.deleteLoading = false;
        this.showDeleteModal = false;
        this.deleteTarget = null;
        this.showToast(err.message || 'Không thể xóa người dùng.', 'error');
        this.cdr.markForCheck();
      },
    });
  }

  // ── Quick role change inline ──
  changeUserRole(user: SystemUser, newRole: string): void {
    this.userService.updateUserRole(user.userId, newRole).subscribe({
      next: (updated) => {
        const idx = this.users.findIndex(u => u.userId === updated.userId);
        if (idx !== -1) this.users[idx] = { ...this.users[idx], role: updated.role };
        this.applyUserFilters();
        this.showToast(`Đã đổi vai trò thành ${this.getRoleLabel(newRole)}.`, 'info');
        this.cdr.markForCheck();
      },
      error: (err) => this.showToast(err.message, 'error'),
    });
  }

  // ═══════════════════════════════════════════
  //  COURSES
  // ═══════════════════════════════════════════

  private loadCoursesDetail(): void {
    this.coursesLoading = true;
    this.cdr.markForCheck();
    const source = this.courses.length > 0
      ? of(this.courses)
      : this.courseService.getAllCourses().pipe(catchError(() => of([] as Course[])));

    source.subscribe(courses => {
      this.courses = courses;
      this.coursesWithLessons = courses.map(course => ({ course, lessonCount: course.lessonCount ?? 0 }));
      this.filteredCoursesWithLessons = [...this.coursesWithLessons];
      this.coursesLoading = false;
      this.cdr.markForCheck();
    });
  }

  private loadCoursesForStats(): void {
    if (this.courses.length > 0) { this.buildLevelDistribution(this.courses); return; }
    this.courseService.getAllCourses().pipe(catchError(() => of([] as Course[]))).subscribe(courses => {
      this.courses = courses;
      this.buildLevelDistribution(courses);
      this.cdr.markForCheck();
    });
  }

  private buildLevelDistribution(courses: Course[]): void {
    const counts = { BEGINNER: 0, INTERMEDIATE: 0, ADVANCED: 0 };
    courses.forEach(c => { if (c.level && counts[c.level] !== undefined) counts[c.level]++; });
    const total = courses.length || 1;
    this.levelDistribution = [
      { label: 'Cơ bản',   count: counts['BEGINNER'],     color: '#10B981', percentage: Math.round((counts['BEGINNER']     / total) * 100) },
      { label: 'Trung cấp', count: counts['INTERMEDIATE'], color: '#F59E0B', percentage: Math.round((counts['INTERMEDIATE'] / total) * 100) },
      { label: 'Nâng cao', count: counts['ADVANCED'],     color: '#EF4444', percentage: Math.round((counts['ADVANCED']     / total) * 100) },
    ];
    this.cdr.markForCheck();
  }

  filterCourses(): void {
    const q = this.courseSearchQuery.toLowerCase().trim();
    this.filteredCoursesWithLessons = q
      ? this.coursesWithLessons.filter(i => i.course.title.toLowerCase().includes(q) || (i.course.description ?? '').toLowerCase().includes(q))
      : [...this.coursesWithLessons];
    this.cdr.markForCheck();
  }

  // ═══════════════════════════════════════════
  //  HELPERS / DISPLAY
  // ═══════════════════════════════════════════

  get currentUser() { return this.authService.getCurrentUser(); }

  getRoleLabel(role: string): string {
    const map: Record<string, string> = {
      STUDENT: 'Học viên', LECTURER: 'Giảng viên',
      ADMIN: 'Admin', SUPERADMIN: 'Super Admin',
    };
    return map[role] ?? role;
  }

  getRoleClass(role: string): string {
    const map: Record<string, string> = {
      STUDENT: 'role-student', LECTURER: 'role-lecturer',
      ADMIN: 'role-admin', SUPERADMIN: 'role-superadmin',
    };
    return map[role] ?? '';
  }

  getUserInitial(user: SystemUser): string {
    return (user.fullName || user.username || '?').charAt(0).toUpperCase();
  }

  getUserAvatarColor(index: number): string {
    const colors = [
      'linear-gradient(135deg,#3B82F6,#6366F1)',
      'linear-gradient(135deg,#10B981,#059669)',
      'linear-gradient(135deg,#F59E0B,#D97706)',
      'linear-gradient(135deg,#EF4444,#DC2626)',
      'linear-gradient(135deg,#8B5CF6,#7C3AED)',
      'linear-gradient(135deg,#EC4899,#BE185D)',
    ];
    return colors[index % colors.length];
  }

  getLevelLabel(level?: string): string {
    switch (level) {
      case 'BEGINNER': return 'Cơ bản';
      case 'INTERMEDIATE': return 'Trung cấp';
      case 'ADVANCED': return 'Nâng cao';
      default: return 'Không xác định';
    }
  }

  getLevelClass(level?: string): string {
    switch (level) {
      case 'BEGINNER': return 'level-beginner';
      case 'INTERMEDIATE': return 'level-intermediate';
      case 'ADVANCED': return 'level-advanced';
      default: return 'level-unknown';
    }
  }

  getCourseGradient(index: number): string {
    const gradients = [
      'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
      'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)',
      'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)',
      'linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)',
      'linear-gradient(135deg,#fa709a 0%,#fee140 100%)',
      'linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)',
    ];
    return gradients[index % gradients.length];
  }

  getSectionTitle(): string {
    const map: Record<SectionType, string> = {
      overview: 'Tổng quan', users: 'Quản lý người dùng',
      courses: 'Quản lý khóa học', stats: 'Thống kê', settings: 'Cài đặt',
    };
    return map[this.activeSection];
  }

  getSystemUptimeString(): string {
    return this.systemUptime.toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  getUserCountByRole(role: string): number {
    return this.users.filter(u => u.role === role).length;
  }

  navigateToCourses(): void { this.router.navigate(['/dashboard/courses']); }

  logout(): void { this.authService.logout(); }

  // ── Toast ──
  private showToast(msg: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage = msg;
    this.toastType = type;
    this.cdr.markForCheck();
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage = null;
      this.cdr.markForCheck();
    }, 3500);
  }

  dismissToast(): void {
    this.toastMessage = null;
    clearTimeout(this.toastTimeout);
    this.cdr.markForCheck();
  }

  // Prevent modal backdrop from closing when clicking inside
  stopProp(e: MouseEvent): void { e.stopPropagation(); }
}
