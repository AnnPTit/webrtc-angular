import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SocketService } from '../../services/socket';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-meeting',
  templateUrl: './meeting.component.html',
  styleUrl: './meeting.component.css',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeetingComponent {
  activeTab = signal<'join' | 'create'>('join');
  
  // Join room form
  roomId = signal('');
  joinPassword = signal('');
  showPasswordInput = signal(false);
  errorMessage = signal('');
  
  // Create room form
  newRoomId = signal('');
  createPassword = signal('');
  createErrorMessage = signal('');
  successMessage = signal('');
  
  isLoading = signal(false);

  constructor(
    private router: Router,
    protected socket: SocketService,
    protected authService: AuthService
  ) {}

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  logout(): void {
    this.authService.logout();
  }

  joinRoom(): void {
    const roomId = this.roomId();

    if (!roomId.trim()) {
      this.errorMessage.set('Vui lòng nhập Room ID');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.router.navigate(['/lobby', roomId.trim()], {
      queryParams: { password: this.joinPassword() || undefined },
    });
  }

  createRoom(): void {
    const roomId = this.newRoomId();

    if (!roomId.trim()) {
      this.createErrorMessage.set('Vui lòng nhập Room ID');
      return;
    }

    this.isLoading.set(true);
    this.createErrorMessage.set('');

    this.successMessage.set(`Phòng đã tạo! ID: ${roomId}`);

    setTimeout(() => {
      this.router.navigate(['/lobby', roomId.trim()], {
        queryParams: { 
          password: this.createPassword() || undefined,
          isCreator: true 
        },
      });
    }, 1000);
  }

  private generateRoomId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const segments = [3, 4, 3];
    return segments
      .map((len) =>
        Array.from(
          { length: len },
          () => chars[Math.floor(Math.random() * chars.length)]
        ).join('')
      )
      .join('-');
  }
}
