import { Component, signal, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SocketService } from '../../services/socket';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-meeting',
  templateUrl: './meeting.component.html',
  styleUrl: './meeting.component.css',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeetingComponent implements OnDestroy {
  activeTab = signal<'join' | 'create'>('join');
  
  // Join room form
  roomId = signal('');
  joinPassword = signal('');
  showPasswordInput = signal(true);
  errorMessage = signal('');
  
  // Create room form
  newRoomId = signal('');
  createPassword = signal('');
  createErrorMessage = signal('');
  successMessage = signal('');
  
  isLoading = signal(false);
  private readonly subscriptions: Subscription[] = [];
  private pendingJoinRoomId = '';

  constructor(
    private router: Router,
    protected socket: SocketService,
    protected authService: AuthService
  ) {
    const meetingError = this.router.getCurrentNavigation()?.extras.state?.['meetingError'];
    if (typeof meetingError === 'string') {
      this.errorMessage.set(meetingError);
    }

    this.subscriptions.push(
      this.socket.onRoomCreated.subscribe(({ roomId }) => {
        this.successMessage.set(`Phòng đã tạo! ID: ${roomId}`);

        this.router.navigate(['/lobby', roomId], {
          queryParams: {
            password: this.createPassword().trim() || undefined,
            isCreator: true,
          },
        });
      }),

      this.socket.onCreateRoomError.subscribe(({ error }) => {
        this.isLoading.set(false);
        this.createErrorMessage.set(error || 'Không thể tạo phòng');
      }),

      this.socket.onJoinResult.subscribe(result => {
        if (!this.pendingJoinRoomId) {
          return;
        }

        const roomId = this.pendingJoinRoomId;
        const password = this.joinPassword().trim();

        if (result.success || (result.requiresPassword && password)) {
          this.pendingJoinRoomId = '';
          this.router.navigate(['/lobby', roomId], {
            queryParams: { password: password || undefined },
          });
          return;
        }

        this.isLoading.set(false);

        if (result.requiresPassword) {
          this.showPasswordInput.set(true);
          this.errorMessage.set('Vui lòng nhập mật khẩu phòng');
        } else {
          this.errorMessage.set(result.error || 'Không thể tham gia phòng');
          this.pendingJoinRoomId = '';
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  logout(): void {
    this.authService.logout();
  }

  joinRoom(): void {
    const roomId = this.roomId().trim();

    if (!roomId) {
      this.errorMessage.set('Vui lòng nhập Room ID');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.pendingJoinRoomId = roomId;

    this.socket.checkRoom(roomId);
  }

  createRoom(): void {
    const roomId = this.newRoomId().trim();

    if (!roomId) {
      this.createErrorMessage.set('Vui lòng nhập Room ID');
      return;
    }

    this.isLoading.set(true);
    this.createErrorMessage.set('');
    this.successMessage.set('');

    this.socket.createRoom(roomId, this.createPassword().trim() || undefined);
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
