import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SocketService } from '../../services/socket';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="home-container">
      <div class="hero">
        <h1>WebRTC Video Call</h1>
        <p>Join a room to start a video call with others</p>
      </div>

      <div class="join-card">
        <div class="connection-status">
          <span
            class="status-indicator"
            [class.connected]="socket.isConnected()"
            [attr.aria-label]="socket.isConnected() ? 'Connected to server' : 'Disconnected from server'"
          ></span>
          <span>{{ socket.isConnected() ? 'Connected' : 'Connecting...' }}</span>
        </div>

        <!-- Tabs -->
        <div class="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="tab"
            [class.active]="activeTab() === 'join'"
            [attr.aria-selected]="activeTab() === 'join'"
            (click)="activeTab.set('join')"
          >
            Join Room
          </button>
          <button
            type="button"
            role="tab"
            class="tab"
            [class.active]="activeTab() === 'create'"
            [attr.aria-selected]="activeTab() === 'create'"
            (click)="activeTab.set('create')"
          >
            Create Room
          </button>
        </div>

        @if (activeTab() === 'join') {
          <form (ngSubmit)="joinRoom()" class="join-form">
            <div class="form-group">
              <label for="roomId">Room ID</label>
              <input
                id="roomId"
                type="text"
                [(ngModel)]="roomId"
                name="roomId"
                placeholder="Enter room ID"
                required
                autocomplete="off"
              />
            </div>

            @if (showPasswordInput()) {
              <div class="form-group">
                <label for="joinPassword">Password</label>
                <input
                  id="joinPassword"
                  type="password"
                  [(ngModel)]="joinPassword"
                  name="joinPassword"
                  placeholder="Enter room password"
                  autocomplete="off"
                />
              </div>
            }

            @if (errorMessage()) {
              <div class="error-message" role="alert">
                {{ errorMessage() }}
              </div>
            }

            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="!socket.isConnected() || !roomId().trim() || isLoading()"
            >
              {{ isLoading() ? 'Joining...' : 'Join Room' }}
            </button>
          </form>
        }

        @if (activeTab() === 'create') {
          <form (ngSubmit)="createRoom()" class="join-form">
            <div class="form-group">
              <label for="newRoomId">Room ID</label>
              <input
                id="newRoomId"
                type="text"
                [(ngModel)]="newRoomId"
                name="newRoomId"
                placeholder="Enter new room ID"
                required
                autocomplete="off"
              />
            </div>

            <div class="form-group">
              <label for="createPassword">Password (optional)</label>
              <input
                id="createPassword"
                type="password"
                [(ngModel)]="createPassword"
                name="createPassword"
                placeholder="Set a password for the room"
                autocomplete="new-password"
              />
              <small class="hint">Leave empty for a public room</small>
            </div>

            @if (successMessage()) {
              <div class="success-message" role="status">
                {{ successMessage() }}
              </div>
            }

            @if (createErrorMessage()) {
              <div class="error-message" role="alert">
                {{ createErrorMessage() }}
              </div>
            }

            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="!socket.isConnected() || !newRoomId().trim() || isLoading()"
            >
              {{ isLoading() ? 'Creating...' : 'Create & Join Room' }}
            </button>
          </form>
        }

        <div class="info">
          <h2>How it works</h2>
          <ol>
            <li>Create a new room or join an existing one</li>
            <li>Set a password to make your room private (optional)</li>
            <li>Configure your camera and microphone</li>
            <li>Share the room ID and password with others</li>
          </ol>
        </div>
      </div>
    </div>
  `,
  styles: `
    .home-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      color: #fff;
    }

    .hero {
      text-align: center;
      margin-bottom: 2rem;
    }

    .hero h1 {
      font-size: 3rem;
      margin: 0;
      background: linear-gradient(135deg, #4ecca3 0%, #45b7d1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero p {
      font-size: 1.25rem;
      color: #a0a0a0;
      margin-top: 0.5rem;
    }

    .join-card {
      background: #16213e;
      border-radius: 16px;
      padding: 2rem;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    }

    .connection-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
    }

    .status-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #e94560;
      animation: pulse 2s infinite;
    }

    .status-indicator.connected {
      background: #4ecca3;
      animation: none;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    .join-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .form-group input {
      padding: 0.75rem 1rem;
      border: 2px solid #0f3460;
      border-radius: 8px;
      background: #1a1a2e;
      color: #fff;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .form-group input:focus {
      outline: none;
      border-color: #4ecca3;
    }

    .form-group input::placeholder {
      color: #666;
    }

    .btn {
      padding: 0.875rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s, transform 0.1s, opacity 0.2s;
    }

    .btn:hover:not(:disabled) {
      transform: translateY(-2px);
    }

    .btn:focus {
      outline: 2px solid #4ecca3;
      outline-offset: 2px;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: linear-gradient(135deg, #4ecca3 0%, #45b7d1 100%);
      color: #1a1a2e;
    }

    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #3db892 0%, #3ca7c1 100%);
    }

    .info {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #0f3460;
    }

    .info h2 {
      font-size: 1rem;
      margin: 0 0 1rem 0;
      color: #a0a0a0;
    }

    .info ol {
      margin: 0;
      padding-left: 1.25rem;
      color: #a0a0a0;
      font-size: 0.875rem;
      line-height: 1.8;
    }

    .tabs {
      display: flex;
      gap: 0;
      margin-bottom: 1.5rem;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #0f3460;
    }

    .tab {
      flex: 1;
      padding: 0.75rem 1rem;
      border: none;
      background: #1a1a2e;
      color: #a0a0a0;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .tab:hover {
      background: #0f3460;
      color: #fff;
    }

    .tab.active {
      background: #4ecca3;
      color: #1a1a2e;
    }

    .tab:focus {
      outline: 2px solid #4ecca3;
      outline-offset: -2px;
    }

    .hint {
      color: #666;
      font-size: 0.75rem;
      margin-top: 0.25rem;
    }

    .error-message {
      padding: 0.75rem;
      background: rgba(233, 69, 96, 0.2);
      border: 1px solid #e94560;
      border-radius: 6px;
      color: #e94560;
      font-size: 0.875rem;
      text-align: center;
    }

    .success-message {
      padding: 0.75rem;
      background: rgba(78, 204, 163, 0.2);
      border: 1px solid #4ecca3;
      border-radius: 6px;
      color: #4ecca3;
      font-size: 0.875rem;
      text-align: center;
    }

    @media (max-width: 480px) {
      .home-container {
        padding: 1rem;
      }

      .hero h1 {
        font-size: 2rem;
      }

      .join-card {
        padding: 1.5rem;
      }
    }
  `,
})
export class HomeComponent implements OnInit, OnDestroy {
  readonly socket = inject(SocketService);
  private readonly router = inject(Router);

  readonly roomId = signal('');
  readonly newRoomId = signal('');
  readonly activeTab = signal<'join' | 'create'>('join');
  readonly showPasswordInput = signal(false);
  readonly errorMessage = signal('');
  readonly createErrorMessage = signal('');
  readonly successMessage = signal('');
  readonly isLoading = signal(false);

  joinPassword = '';
  createPassword = '';

  private subscriptions: Subscription[] = [];
  private pendingRoomId = '';

  ngOnInit(): void {
    this.subscriptions.push(
      this.socket.onJoinResult.subscribe(result => {
        this.isLoading.set(false);
        
        if (result.success) {
          // Clear any previous errors
          this.errorMessage.set('');
          this.showPasswordInput.set(false);
          // Successfully joined, navigate to lobby
          this.router.navigate(['/lobby', this.pendingRoomId]);
        } else if (result.requiresPassword) {
          this.showPasswordInput.set(true);
          this.errorMessage.set('This room requires a password');
        } else {
          // Handle specific error messages
          const errorMsg = this.getErrorMessage(result.error);
          this.errorMessage.set(errorMsg);
          
          // Clear password input on wrong password
          if (result.error?.includes('password')) {
            this.joinPassword = '';
          }
        }
      }),

      this.socket.onRoomCreated.subscribe(result => {
        this.isLoading.set(false);
        this.createErrorMessage.set('');
        this.successMessage.set('Room created successfully!');
        
        // Store password for auto-join
        if (this.createPassword) {
          sessionStorage.setItem('roomPassword', this.createPassword);
        }
        
        // Navigate to lobby
        setTimeout(() => {
          this.router.navigate(['/lobby', result.roomId]);
        }, 500);
      }),

      this.socket.onCreateRoomError.subscribe(result => {
        this.isLoading.set(false);
        this.successMessage.set('');
        const errorMsg = this.getErrorMessage(result.error);
        this.createErrorMessage.set(errorMsg);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  joinRoom(): void {
    const room = this.roomId().trim();
    if (!room || !this.socket.isConnected()) return;

    this.errorMessage.set('');
    this.isLoading.set(true);
    this.pendingRoomId = room;

    // Store password if provided
    if (this.joinPassword) {
      sessionStorage.setItem('roomPassword', this.joinPassword);
    }

    this.socket.joinRoom(room, this.joinPassword || undefined);
  }

  createRoom(): void {
    const room = this.newRoomId().trim();
    if (!room || !this.socket.isConnected()) return;

    // Validate room ID format
    if (room.length < 3) {
      this.createErrorMessage.set('Room ID must be at least 3 characters');
      return;
    }
    
    if (!/^[a-zA-Z0-9-_]+$/.test(room)) {
      this.createErrorMessage.set('Room ID can only contain letters, numbers, hyphens and underscores');
      return;
    }

    this.createErrorMessage.set('');
    this.successMessage.set('');
    this.isLoading.set(true);
    this.pendingRoomId = room;

    this.socket.createRoom(room, this.createPassword || undefined);
  }

  private getErrorMessage(error?: string): string {
    if (!error) return 'An unknown error occurred';
    
    // Map server errors to user-friendly messages
    const errorMap: Record<string, string> = {
      'Room already exists': 'This room ID is already taken. Please choose a different one.',
      'Room does not exist': 'This room does not exist. Please check the Room ID or create a new room.',
      'Invalid password': 'Incorrect password. Please try again.',
      'Wrong password': 'Incorrect password. Please try again.',
      'Password required': 'This room requires a password.',
      'Room is full': 'This room is full. Please try again later.',
      'Invalid room ID': 'Invalid room ID format.',
    };

    // Check if error matches any known error
    for (const [key, message] of Object.entries(errorMap)) {
      if (error.toLowerCase().includes(key.toLowerCase())) {
        return message;
      }
    }

    return error;
  }
}
