import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  signal,
  inject,
  PLATFORM_ID,
  effect,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { SrcObjectDirective } from '../../directives/src-object.directive';

interface MediaDeviceInfo {
  deviceId: string;
  label: string;
}

@Component({
  selector: 'app-lobby',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SrcObjectDirective],
  template: `
    <div class="lobby-container">
      <header class="lobby-header">
        <h1>Join Room: {{ roomId() }}</h1>
      </header>

      <main class="lobby-content">
        <section class="preview-section" aria-label="Device setup">
          <div class="video-preview-container">
            @if (previewStream()) {
              <video
                #videoPreview
                autoplay
                muted
                playsinline
                aria-label="Camera preview"
                [srcObject]="previewStream()"
                [class.video-disabled]="!isVideoEnabled()"
              ></video>
            } @else {
              <div class="video-placeholder">
                <p>Camera preview will appear here</p>
              </div>
            }
            @if (!isVideoEnabled()) {
              <div class="video-off-overlay">
                <span>Camera Off</span>
              </div>
            }
          </div>

          <div class="device-controls">
            <div class="control-group">
              <label for="cameraSelect">Camera</label>
              <select
                id="cameraSelect"
                [(ngModel)]="selectedVideoDevice"
                (change)="onDeviceChange()"
                [disabled]="!isVideoEnabled()"
              >
                @for (device of videoDevices(); track device.deviceId) {
                  <option [value]="device.deviceId">{{ device.label }}</option>
                }
              </select>
            </div>

            <div class="control-group">
              <label for="micSelect">Microphone</label>
              <select
                id="micSelect"
                [(ngModel)]="selectedAudioDevice"
                (change)="onDeviceChange()"
                [disabled]="!isAudioEnabled()"
              >
                @for (device of audioDevices(); track device.deviceId) {
                  <option [value]="device.deviceId">{{ device.label }}</option>
                }
              </select>
            </div>

            <div class="control-group">
              <label for="displayName">Display Name</label>
              <input
                id="displayName"
                type="text"
                [(ngModel)]="displayName"
                placeholder="Enter your display name"
                maxlength="30"
                aria-label="Enter your display name"
              />
            </div>

            <div class="toggle-controls">
              <button
                type="button"
                class="btn"
                [class.btn-active]="isVideoEnabled()"
                (click)="toggleVideo()"
                [attr.aria-pressed]="isVideoEnabled()"
                aria-label="Toggle camera"
              >
                {{ isVideoEnabled() ? '📹 Camera On' : '📹 Camera Off' }}
              </button>

              <button
                type="button"
                class="btn"
                [class.btn-active]="isAudioEnabled()"
                (click)="toggleAudio()"
                [attr.aria-pressed]="isAudioEnabled()"
                aria-label="Toggle microphone"
              >
                {{ isAudioEnabled() ? '🎤 Mic On' : '🎤 Mic Off' }}
              </button>
            </div>
          </div>

          @if (error()) {
            <div class="error-message" role="alert">
              {{ error() }}
            </div>
          }
        </section>
      </main>

      <footer class="lobby-footer">
        <button
          type="button"
          class="btn btn-secondary"
          (click)="goBack()"
          aria-label="Go back to home"
        >
          Back
        </button>
        <button
          type="button"
          class="btn btn-primary"
          (click)="joinRoom()"
          [disabled]="!canJoin()"
          aria-label="Join room"
        >
          Join Room
        </button>
      </footer>
    </div>
  `,
  styles: `
    .lobby-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: #1a1a2e;
      color: #fff;
      overflow: hidden;
    }

    .lobby-header {
      padding: 1rem;
      background: #16213e;
      border-bottom: 1px solid #0f3460;
      text-align: center;
      flex-shrink: 0;
    }

    .lobby-header h1 {
      margin: 0;
      font-size: 1.25rem;
    }

    .lobby-content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      overflow: hidden;
      min-height: 0;
    }

    .preview-section {
      max-width: 700px;
      width: 100%;
      display: flex;
      flex-direction: column;
      height: 100%;
      max-height: 100%;
      overflow: hidden;
    }

    .video-preview-container {
      position: relative;
      background: #0f3460;
      border-radius: 12px;
      overflow: hidden;
      width: 100%;
      height: 0;
      padding-bottom: 40%;
      margin-bottom: 1rem;
      flex-shrink: 0;
    }

    video {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    video.video-disabled {
      opacity: 0.3;
    }

    .video-placeholder {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #888;
    }

    .video-off-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.7);
      font-size: 1.25rem;
    }

    .device-controls {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      background: #16213e;
      padding: 1rem;
      border-radius: 8px;
      flex-shrink: 0;
      overflow: auto;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .control-group label {
      font-weight: 500;
      font-size: 0.8rem;
      color: #aaa;
    }

    select {
      padding: 0.5rem;
      background: #0f3460;
      border: 1px solid #0f3460;
      border-radius: 6px;
      color: #fff;
      font-size: 0.9rem;
      cursor: pointer;
      transition: border-color 0.2s;
    }

    select:hover:not(:disabled) {
      border-color: #4ecca3;
    }

    select:focus {
      outline: none;
      border-color: #4ecca3;
    }

    select:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    input[type="text"] {
      padding: 0.5rem;
      background: #0f3460;
      border: 1px solid #0f3460;
      border-radius: 6px;
      color: #fff;
      font-size: 0.9rem;
      transition: border-color 0.2s;
    }

    input[type="text"]:hover {
      border-color: #4ecca3;
    }

    input[type="text"]:focus {
      outline: none;
      border-color: #4ecca3;
    }

    input[type="text"]::placeholder {
      color: #888;
    }

    .toggle-controls {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.25rem;
    }

    .toggle-controls .btn {
      flex: 1;
    }

    .error-message {
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: #e94560;
      border-radius: 6px;
      text-align: center;
      font-size: 0.875rem;
      flex-shrink: 0;
    }

    .lobby-footer {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.5rem;
      background: #16213e;
      border-top: 1px solid #0f3460;
      flex-shrink: 0;
    }

    .btn {
      padding: 0.625rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      background: #0f3460;
      color: #fff;
    }

    .btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(78, 204, 163, 0.3);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .btn-active {
      background: #4ecca3;
      color: #1a1a2e;
    }

    .btn-primary {
      background: #4ecca3;
      color: #1a1a2e;
    }

    .btn-primary:hover:not(:disabled) {
      background: #45b393;
    }

    .btn-secondary {
      background: #0f3460;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #1a4d7a;
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
  `,
})
export class LobbyComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly roomId = signal<string>('');
  readonly previewStream = signal<MediaStream | null>(null);
  readonly isVideoEnabled = signal(true);
  readonly isAudioEnabled = signal(true);
  readonly videoDevices = signal<MediaDeviceInfo[]>([]);
  readonly audioDevices = signal<MediaDeviceInfo[]>([]);
  readonly error = signal<string>('');
  readonly canJoin = signal(false);
  
  // Display name for the user
  // TODO: Later, get this from login information when authentication is implemented
  displayName = '';

  selectedVideoDevice = '';
  selectedAudioDevice = '';

  private streamTracks: MediaStreamTrack[] = [];

  constructor() {
    effect(() => {
      // Enable join button if we have a preview stream
      // Note: displayName is not a signal, so this effect won't trigger on its change
      // The button will be enabled as soon as media is ready
      this.canJoin.set(!!this.previewStream());
    });
  }

  async ngOnInit(): Promise<void> {
    const roomId = this.route.snapshot.paramMap.get('roomId');
    if (roomId) {
      this.roomId.set(roomId);
    } else {
      await this.router.navigate(['/']);
      return;
    }

    if (this.isBrowser) {
      await this.loadDevices();
      await this.initPreview();
    }
  }

  ngOnDestroy(): void {
    this.stopPreview();
  }

  private async loadDevices(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const videoDevs: MediaDeviceInfo[] = devices
        .filter(d => d.kind === 'videoinput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${d.deviceId.slice(0, 5)}`,
        }));

      const audioDevs: MediaDeviceInfo[] = devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 5)}`,
        }));

      this.videoDevices.set(videoDevs);
      this.audioDevices.set(audioDevs);

      if (videoDevs.length > 0) {
        this.selectedVideoDevice = videoDevs[0].deviceId;
      }
      if (audioDevs.length > 0) {
        this.selectedAudioDevice = audioDevs[0].deviceId;
      }
    } catch (err) {
      console.error('Error enumerating devices:', err);
    }
  }

  private async initPreview(): Promise<void> {
    try {
      const constraints: MediaStreamConstraints = {
        video: this.isVideoEnabled() ? { deviceId: this.selectedVideoDevice || undefined } : false,
        audio: this.isAudioEnabled() ? { 
          deviceId: this.selectedAudioDevice || undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.streamTracks = stream.getTracks();
      this.previewStream.set(stream);
      this.error.set('');

      // Reload devices with labels after permission granted
      await this.loadDevices();
    } catch (err: unknown) {
      console.error('Error accessing media devices:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera or microphone';
      this.error.set(errorMessage);
    }
  }

  private stopPreview(): void {
    this.streamTracks.forEach(track => track.stop());
    this.streamTracks = [];
    this.previewStream.set(null);
  }

  async toggleVideo(): Promise<void> {
    this.isVideoEnabled.update(v => !v);
    await this.onDeviceChange();
  }

  async toggleAudio(): Promise<void> {
    this.isAudioEnabled.update(v => !v);
    await this.onDeviceChange();
  }

  async onDeviceChange(): Promise<void> {
    this.stopPreview();
    await this.initPreview();
  }

  async joinRoom(): Promise<void> {
    // Store the media stream settings in sessionStorage for the room component
    if (this.isBrowser) {
      const roomPassword = sessionStorage.getItem('roomPassword') || '';
      
      // Get display name from input
      // TODO: Later, replace this with user info from authentication
      // const displayName = this.authService.currentUser()?.displayName || 'Anonymous';
      const userDisplayName = this.displayName.trim() || 'Anonymous';
      
      sessionStorage.setItem('mediaSettings', JSON.stringify({
        videoEnabled: this.isVideoEnabled(),
        audioEnabled: this.isAudioEnabled(),
        videoDeviceId: this.selectedVideoDevice,
        audioDeviceId: this.selectedAudioDevice,
        roomPassword: roomPassword,
        displayName: userDisplayName,
      }));
    }

    await this.router.navigate(['/room', this.roomId()]);
  }

  async goBack(): Promise<void> {
    this.stopPreview();
    await this.router.navigate(['/']);
  }
}
