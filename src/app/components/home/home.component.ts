import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SocketService } from '../../services/socket';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
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
    protected socket: SocketService
  ) {}

  joinRoom(): void {
    const roomId = this.roomId();

    if (!roomId.trim()) {
      this.errorMessage.set('Please enter Room ID');
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
      this.createErrorMessage.set('Please enter Room ID');
      return;
    }

    this.isLoading.set(true);
    this.createErrorMessage.set('');

    this.successMessage.set(`Room created! ID: ${roomId}`);

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
