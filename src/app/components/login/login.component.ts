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
      next: (response) => {
        this.isLoading.set(false);
        const user = this.authService.getCurrentUser();

        // New student → redirect to welcome/onboarding screen
        if (user?.role === 'STUDENT' && response.newUser) {
          this.router.navigate(['/welcome']);
          return;
        }

        // Normal login flow
        let target = this.returnUrl;
        if (user?.role === 'LECTURER') {
          if (target === '/home' || target === '/' || target.startsWith('/home')) {
            target = '/dashboard';
          }
        } else if (user?.role === 'STUDENT') {
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
