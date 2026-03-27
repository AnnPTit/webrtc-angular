import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  username = signal('');
  password = signal('');
  errorMessage = signal('');
  isLoading = signal(false);
  showPassword = signal(false);

  private returnUrl = '/home';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  onSubmit(): void {
    const username = this.username();
    const password = this.password();

    if (!username.trim()) {
      this.errorMessage.set('Please enter your username');
      return;
    }

    if (!password.trim()) {
      this.errorMessage.set('Please enter your password');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login({ username, password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        // after login, if returnUrl points to home but user is lecturer redirect to dashboard
        const user = this.authService.getCurrentUser();
        let target = this.returnUrl;
        if (user?.role === 'LECTURER') {
          // make sure lecturer never lands on student pages
          if (target === '/home' || target === '/' || target.startsWith('/home')) {
            target = '/dashboard';
          }
        } else if (user?.role === 'STUDENT') {
          // any dashboard URL should send student to home instead
          if (target === '/dashboard' || target.startsWith('/dashboard')) {
            target = '/home';
          }
        }
        this.router.navigate([target]);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.message || 'Login failed');
      },
    });
  }
}
