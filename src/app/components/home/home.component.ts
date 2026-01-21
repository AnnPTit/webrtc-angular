import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
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

          <button
            type="submit"
            class="btn btn-primary"
            [disabled]="!socket.isConnected() || !roomId().trim()"
          >
            Join Room
          </button>
        </form>

        <div class="info">
          <h2>How it works</h2>
          <ol>
            <li>Enter a room ID (or create a new one)</li>
            <li>Configure your camera and microphone</li>
            <li>Join the room and start calling</li>
            <li>Share the room ID with others to join</li>
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
export class HomeComponent {
  readonly socket = inject(SocketService);
  private readonly router = inject(Router);

  readonly roomId = signal('');

  joinRoom(): void {
    const room = this.roomId().trim();
    if (room && this.socket.isConnected()) {
      this.router.navigate(['/lobby', room]);
    }
  }
}
