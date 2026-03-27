import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/** Validator: xác nhận mật khẩu khớp */
function passwordMatchValidator(control: AbstractControl) {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  if (password && confirmPassword && password !== confirmPassword) {
    control.get('confirmPassword')?.setErrors({ mismatch: true });
    return { mismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  form: FormGroup;
  errorMessage = signal('');
  successMessage = signal('');
  isLoading = signal(false);
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group(
      {
        fullName: ['', [Validators.required, Validators.minLength(2)]],
        username: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        role: ['STUDENT' as 'STUDENT' | 'LECTURER'],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: passwordMatchValidator }
    );
  }

  get f() {
    return this.form.controls;
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  setRole(role: 'STUDENT' | 'LECTURER'): void {
    this.form.patchValue({ role });
  }

  getFieldError(field: string): string {
    const control = this.f[field];
    if (!control || !control.invalid || !control.touched) return '';
    if (control.errors?.['required']) {
      const labels: Record<string, string> = {
        fullName: 'Họ và tên',
        username: 'Tên đăng nhập',
        email: 'Email',
        password: 'Mật khẩu',
        confirmPassword: 'Xác nhận mật khẩu',
      };
      return `${labels[field] ?? field} là bắt buộc`;
    }
    if (control.errors?.['minlength']) {
      const min = control.errors['minlength'].requiredLength;
      return `Phải có ít nhất ${min} ký tự`;
    }
    if (control.errors?.['email']) return 'Địa chỉ email không hợp lệ';
    if (control.errors?.['mismatch']) return 'Mật khẩu xác nhận không khớp';
    return '';
  }

  onSubmit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      // Tìm lỗi đầu tiên để hiển thị
      for (const key of ['fullName', 'username', 'email', 'password', 'confirmPassword']) {
        const msg = this.getFieldError(key);
        if (msg) {
          this.errorMessage.set(msg);
          return;
        }
      }
      return;
    }

    const { fullName, username, email, password, confirmPassword, role } = this.form.value;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.register({ fullName, username, email, password, confirmPassword, role }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Đăng ký thành công! Đang chuyển hướng...');
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      },
    });
  }
}
