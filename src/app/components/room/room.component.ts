import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  signal,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SlicePipe, isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { SocketService, ChatMessage } from '../../services/socket';
import { WebrtcService } from '../../services/webrtc';
import { SrcObjectDirective } from '../../directives/src-object.directive';

interface DeviceInfo {
  deviceId: string;
  label: string;
}

@Component({
  selector: 'app-room',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SlicePipe, SrcObjectDirective],
  template: `
    <div class="room-container">
      <header class="room-header">
        <h1>Room: {{ roomId() }}</h1>
        <div class="connection-status">
          <span
            class="status-indicator"
            [class.connected]="socket.isConnected()"
            [attr.aria-label]="socket.isConnected() ? 'Connected' : 'Disconnected'"
          ></span>
          <span>{{ socket.isConnected() ? 'Connected' : 'Disconnected' }}</span>
        </div>
        <button
          type="button"
          class="btn btn-danger"
          (click)="leaveRoom()"
          aria-label="Leave room"
        >
          Leave Room
        </button>
      </header>

      <main class="room-content">
        <section class="videos-section" [class.has-pinned]="pinnedVideo()" aria-label="Video streams">
          <!-- Pinned Video View -->
          @if (pinnedVideo()) {
            <div class="pinned-container">
              @if (pinnedVideo() === 'local' && webrtc.localStream()) {
                <div class="video-container pinned-video" [class.speaking]="webrtc.isLocalSpeaking()">
                  <video
                    autoplay
                    muted
                    playsinline
                    aria-label="Your video (pinned)"
                    [srcObject]="webrtc.localStream()"
                  ></video>
                  <span class="video-label">You (Camera) - Pinned</span>
                  <button
                    type="button"
                    class="btn-unpin"
                    (click)="unpinVideo()"
                    aria-label="Unpin video"
                  >
                    📌 Unpin
                  </button>
                </div>
              }
              @if (pinnedVideo() === 'local-screen' && webrtc.screenStream()) {
                <div class="video-container pinned-video screen-video">
                  <video
                    autoplay
                    playsinline
                    aria-label="Your screen share (pinned)"
                    [srcObject]="webrtc.screenStream()"
                  ></video>
                  <span class="video-label">You (Screen) - Pinned</span>
                  <button
                    type="button"
                    class="btn-unpin"
                    (click)="unpinVideo()"
                    aria-label="Unpin video"
                  >
                    📌 Unpin
                  </button>
                </div>
              }
              @for (remote of webrtc.allRemoteStreams(); track remote.stream.id) {
                @if (pinnedVideo() === remote.peerId + '-' + remote.stream.id) {
                  <div class="video-container pinned-video" [class.speaking]="webrtc.isPeerSpeaking(remote.peerId)">
                    <video
                      autoplay
                      playsinline
                      [attr.aria-label]="'Video from ' + remote.peerId + ' (pinned)'"
                      [srcObject]="remote.stream"
                    ></video>
                    <span class="video-label">{{ remote.peerId | slice: 0 : 8 }} - Pinned</span>
                    <button
                      type="button"
                      class="btn-unpin"
                      (click)="unpinVideo()"
                      aria-label="Unpin video"
                    >
                      📌 Unpin
                    </button>
                  </div>
                }
              }
            </div>
          }

          <!-- Thumbnails / Grid View -->
          <div class="videos-grid" [class.thumbnail-mode]="pinnedVideo()">
            @if (webrtc.localStream()) {
              <div 
                class="video-container local-video" 
                [class.speaking]="webrtc.isLocalSpeaking()"
                [class.is-pinned]="pinnedVideo() === 'local'"
              >
                <video
                  autoplay
                  muted
                  playsinline
                  aria-label="Your video"
                  [srcObject]="webrtc.localStream()"
                ></video>
                <span class="video-label">You (Camera)</span>
                @if (webrtc.isLocalSpeaking()) {
                  <span class="speaking-indicator" aria-label="Speaking"></span>
                }
                <button
                  type="button"
                  class="btn-pin"
                  (click)="pinVideo('local')"
                  [attr.aria-label]="pinnedVideo() === 'local' ? 'Unpin video' : 'Pin video'"
                >
                  {{ pinnedVideo() === 'local' ? '📌' : '📍' }}
                </button>
              </div>
            }

            @if (webrtc.screenStream()) {
              <div 
                class="video-container screen-video"
                [class.is-pinned]="pinnedVideo() === 'local-screen'"
              >
                <video
                  autoplay
                  playsinline
                  aria-label="Your screen share"
                  [srcObject]="webrtc.screenStream()"
                ></video>
                <span class="video-label">You (Screen)</span>
                <button
                  type="button"
                  class="btn-pin"
                  (click)="pinVideo('local-screen')"
                  [attr.aria-label]="pinnedVideo() === 'local-screen' ? 'Unpin video' : 'Pin video'"
                >
                  {{ pinnedVideo() === 'local-screen' ? '📌' : '📍' }}
                </button>
              </div>
            }

            @for (remote of webrtc.allRemoteStreams(); track remote.stream.id) {
              <div 
                class="video-container remote-video" 
                [class.speaking]="webrtc.isPeerSpeaking(remote.peerId)"
                [class.is-pinned]="pinnedVideo() === remote.peerId + '-' + remote.stream.id"
              >
                <video
                  autoplay
                  playsinline
                  [attr.aria-label]="'Video from ' + remote.peerId"
                  [srcObject]="remote.stream"
                  (loadedmetadata)="onRemoteVideoLoaded(remote.peerId, remote.stream)"
                ></video>
                <span class="video-label">{{ remote.peerId | slice: 0 : 8 }}</span>
                @if (webrtc.isPeerSpeaking(remote.peerId)) {
                  <span class="speaking-indicator" aria-label="Speaking"></span>
                }
                <button
                  type="button"
                  class="btn-pin"
                  (click)="pinVideo(remote.peerId + '-' + remote.stream.id)"
                  [attr.aria-label]="pinnedVideo() === remote.peerId + '-' + remote.stream.id ? 'Unpin video' : 'Pin video'"
                >
                  {{ pinnedVideo() === remote.peerId + '-' + remote.stream.id ? '📌' : '📍' }}
                </button>
              </div>
            }
          </div>
        </section>

        <aside class="chat-section" aria-label="Chat">
          <h2>Chat</h2>
          <ul
            #chatBox
            class="chat-messages"
            role="log"
            aria-live="polite"
            aria-label="Chat messages"
          >
            @for (msg of messages(); track $index) {
              <li class="chat-message" [class.own-message]="msg.from === socket.socketId()">
                <strong>{{ msg.from === socket.socketId() ? 'You' : (msg.from | slice: 0 : 8) }}:</strong>
                {{ msg.message }}
              </li>
            }
          </ul>
          <form class="chat-input-form" (ngSubmit)="sendMessage()">
            <label for="chatInput" class="visually-hidden">Type a message</label>
            <input
              id="chatInput"
              type="text"
              [(ngModel)]="chatInput"
              name="chatInput"
              placeholder="Type a message..."
              autocomplete="off"
            />
            <button type="submit" class="btn btn-primary" aria-label="Send message">
              Send
            </button>
          </form>
        </aside>
      </main>

      <footer class="room-controls">
        <button
          type="button"
          class="btn btn-control"
          [class.btn-off]="!webrtc.isVideoEnabled()"
          (click)="toggleVideo()"
          [attr.aria-pressed]="webrtc.isVideoEnabled()"
          aria-label="Toggle camera"
        >
          {{ webrtc.isVideoEnabled() ? '📹 Camera On' : '📹 Camera Off' }}
        </button>

        <button
          type="button"
          class="btn btn-control"
          [class.btn-off]="!webrtc.isAudioEnabled()"
          (click)="toggleAudio()"
          [attr.aria-pressed]="webrtc.isAudioEnabled()"
          aria-label="Toggle microphone"
        >
          {{ webrtc.isAudioEnabled() ? '🎤 Mic On' : '🎤 Mic Off' }}
        </button>

        <button
          type="button"
          class="btn btn-control"
          [class.btn-off]="!isSpeakerEnabled()"
          (click)="toggleSpeaker()"
          [attr.aria-pressed]="isSpeakerEnabled()"
          aria-label="Toggle speaker"
        >
          {{ isSpeakerEnabled() ? '🔊 Speaker On' : '🔇 Speaker Off' }}
        </button>

        <button
          type="button"
          class="btn btn-screen-share"
          [class.btn-active]="webrtc.isScreenSharing()"
          (click)="toggleScreenShare()"
          [attr.aria-pressed]="webrtc.isScreenSharing()"
          aria-label="Toggle screen sharing"
        >
          {{ webrtc.isScreenSharing() ? '🛑 Stop Sharing' : '🖥️ Share Screen' }}
        </button>

        <button
          type="button"
          class="btn btn-settings"
          (click)="toggleSettings()"
          [class.btn-active]="showSettings()"
          aria-label="Settings"
        >
          ⚙️ Settings
        </button>
      </footer>

      @if (showSettings()) {
        <div class="settings-panel" role="dialog" aria-label="Device settings">
          <div class="settings-header">
            <h3>Device Settings</h3>
            <button
              type="button"
              class="btn-close"
              (click)="toggleSettings()"
              aria-label="Close settings"
            >
              ✕
            </button>
          </div>
          <div class="settings-content">
            <div class="setting-group">
              <label for="videoInput">Camera</label>
              <select
                id="videoInput"
                [(ngModel)]="selectedVideoDevice"
                (change)="onVideoDeviceChange()"
              >
                @for (device of videoDevices(); track device.deviceId) {
                  <option [value]="device.deviceId">{{ device.label }}</option>
                }
              </select>
            </div>

            <div class="setting-group">
              <label for="audioInput">Microphone</label>
              <select
                id="audioInput"
                [(ngModel)]="selectedAudioInput"
                (change)="onAudioInputChange()"
              >
                @for (device of audioInputDevices(); track device.deviceId) {
                  <option [value]="device.deviceId">{{ device.label }}</option>
                }
              </select>
            </div>

            <div class="setting-group">
              <label for="audioOutput">Speaker</label>
              <select
                id="audioOutput"
                [(ngModel)]="selectedAudioOutput"
                (change)="onAudioOutputChange()"
              >
                @for (device of audioOutputDevices(); track device.deviceId) {
                  <option [value]="device.deviceId">{{ device.label }}</option>
                }
              </select>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .room-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: #1a1a2e;
      color: #fff;
      overflow: hidden;
    }

    .room-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #16213e;
      border-bottom: 1px solid #0f3460;
      flex-shrink: 0;
    }

    .room-header h1 {
      margin: 0;
      font-size: 1.25rem;
      flex: 1;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .status-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #e94560;
    }

    .status-indicator.connected {
      background: #4ecca3;
    }

    .room-content {
      display: flex;
      flex: 1;
      overflow: hidden;
      min-height: 0;
    }

    .videos-section {
      flex: 1;
      padding: 1rem;
      overflow-y: auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .videos-section.has-pinned {
      flex-direction: row;
    }

    .pinned-container {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pinned-video {
      width: 100%;
      max-height: 100%;
      aspect-ratio: 16 / 9;
    }

    .videos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 0.75fr));
      gap: 1rem;
      flex: 1;
    }

    .videos-grid.thumbnail-mode {
      flex: 0 0 200px;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      overflow-y: auto;
      max-height: 100%;
    }

    .videos-grid.thumbnail-mode .video-container {
      flex-shrink: 0;
      width: 100%;
      aspect-ratio: 16 / 9;
    }

    .videos-grid.thumbnail-mode .video-container.is-pinned {
      opacity: 0.5;
    }

    .video-container {
      position: relative;
      background: #0f3460;
      border-radius: 8px;
      overflow: hidden;
      aspect-ratio: 16 / 9;
    }

    .video-container:hover .btn-pin {
      opacity: 1;
    }

    .btn-pin {
      position: absolute;
      top: 0.5rem;
      left: 0.5rem;
      padding: 0.35rem 0.5rem;
      background: rgba(0, 0, 0, 0.6);
      border: none;
      border-radius: 4px;
      color: #fff;
      font-size: 0.875rem;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s, background 0.2s;
      z-index: 10;
    }

    .btn-pin:hover {
      background: rgba(78, 204, 163, 0.8);
    }

    .btn-pin:focus {
      opacity: 1;
      outline: 2px solid #4ecca3;
      outline-offset: 2px;
    }

    .btn-unpin {
      position: absolute;
      top: 0.75rem;
      left: 0.75rem;
      padding: 0.5rem 0.75rem;
      background: rgba(0, 0, 0, 0.7);
      border: 1px solid #4ecca3;
      border-radius: 6px;
      color: #4ecca3;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background 0.2s;
      z-index: 10;
    }

    .btn-unpin:hover {
      background: rgba(78, 204, 163, 0.3);
    }

    .btn-unpin:focus {
      outline: 2px solid #4ecca3;
      outline-offset: 2px;
    }

    .video-container video {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .video-label {
      position: absolute;
      bottom: 0.5rem;
      left: 0.5rem;
      padding: 0.25rem 0.5rem;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 4px;
      font-size: 0.75rem;
    }

    .local-video {
      border: 2px solid #4ecca3;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .screen-video {
      border: 2px solid #e94560;
    }

    .video-container.speaking {
      border-color: #4ecca3;
      box-shadow: 0 0 0 3px rgba(78, 204, 163, 0.4), 0 0 20px rgba(78, 204, 163, 0.6);
      animation: speaking-pulse 1.5s ease-in-out infinite;
    }

    @keyframes speaking-pulse {
      0%, 100% {
        box-shadow: 0 0 0 3px rgba(78, 204, 163, 0.4), 0 0 15px rgba(78, 204, 163, 0.5);
      }
      50% {
        box-shadow: 0 0 0 5px rgba(78, 204, 163, 0.5), 0 0 25px rgba(78, 204, 163, 0.7);
      }
    }

    .speaking-indicator {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      width: 12px;
      height: 12px;
      background: #4ecca3;
      border-radius: 50%;
      animation: speaking-dot 0.8s ease-in-out infinite;
    }

    @keyframes speaking-dot {
      0%, 100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.3);
        opacity: 0.8;
      }
    }

    .remote-video {
      border: 2px solid transparent;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .chat-section {
      width: 320px;
      display: flex;
      flex-direction: column;
      background: #16213e;
      border-left: 1px solid #0f3460;
      min-height: 0;
    }

    .chat-section h2 {
      padding: 1rem;
      margin: 0;
      font-size: 1rem;
      border-bottom: 1px solid #0f3460;
      flex-shrink: 0;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      margin: 0;
      list-style: none;
      min-height: 0;
    }

    .chat-message {
      margin-bottom: 0.75rem;
      padding: 0.5rem;
      background: #0f3460;
      border-radius: 8px;
      font-size: 0.875rem;
      word-break: break-word;
    }

    .chat-message.own-message {
      background: #4ecca3;
      color: #1a1a2e;
    }

    .chat-input-form {
      display: flex;
      padding: 1rem;
      gap: 0.5rem;
      border-top: 1px solid #0f3460;
      flex-shrink: 0;
    }

    .chat-input-form input {
      flex: 1;
      padding: 0.5rem;
      border: 1px solid #0f3460;
      border-radius: 6px;
      background: #1a1a2e;
      color: #fff;
      font-size: 0.875rem;
      min-width: 0;
    }

    .chat-input-form input:focus {
      outline: 2px solid #4ecca3;
      outline-offset: 2px;
    }

    .room-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding: 1rem;
      background: #16213e;
      border-top: 1px solid #0f3460;
      flex-shrink: 0;
    }

    .btn {
      padding: 0.6rem 1rem;
      border: none;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .btn:hover {
      transform: translateY(-2px);
    }

    .btn:focus {
      outline: 2px solid #4ecca3;
      outline-offset: 2px;
    }

    .btn-primary {
      background: #4ecca3;
      color: #1a1a2e;
    }

    .btn-primary:hover {
      background: #3db892;
    }

    .btn-danger {
      background: #e94560;
      color: #fff;
    }

    .btn-danger:hover {
      background: #d63d56;
    }

    .btn-active {
      background: #e94560;
      color: #fff;
      box-shadow: 0 2px 8px rgba(233, 69, 96, 0.4);
    }

    .btn-screen-share {
      background: #0f3460;
      color: #4ecca3;
      border: 2px solid #4ecca3;
    }

    .btn-screen-share:hover {
      background: #1a4d7a;
      box-shadow: 0 2px 8px rgba(78, 204, 163, 0.3);
    }

    .btn-screen-share.btn-active {
      background: #e94560;
      color: #fff;
      border-color: #e94560;
    }

    .btn-control {
      background: #4ecca3;
      color: #1a1a2e;
    }

    .btn-control:hover {
      background: #3db892;
    }

    .btn-control.btn-off {
      background: #6c757d;
      color: #fff;
    }

    .btn-control.btn-off:hover {
      background: #5a6268;
    }

    .btn-settings {
      background: #0f3460;
      color: #fff;
      border: 2px solid #0f3460;
    }

    .btn-settings:hover {
      background: #1a4d7a;
    }

    .btn-settings.btn-active {
      background: #4ecca3;
      color: #1a1a2e;
      border-color: #4ecca3;
    }

    .settings-panel {
      position: absolute;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: #16213e;
      border-radius: 12px;
      padding: 1rem;
      min-width: 320px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      z-index: 100;
      border: 1px solid #0f3460;
    }

    .settings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #0f3460;
    }

    .settings-header h3 {
      margin: 0;
      font-size: 1rem;
    }

    .btn-close {
      background: transparent;
      border: none;
      color: #aaa;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.25rem;
      line-height: 1;
    }

    .btn-close:hover {
      color: #fff;
    }

    .settings-content {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .setting-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .setting-group label {
      font-size: 0.8rem;
      color: #aaa;
      font-weight: 500;
    }

    .setting-group select {
      padding: 0.5rem;
      background: #0f3460;
      border: 1px solid #0f3460;
      border-radius: 6px;
      color: #fff;
      font-size: 0.875rem;
      cursor: pointer;
      transition: border-color 0.2s;
    }

    .setting-group select:hover {
      border-color: #4ecca3;
    }

    .setting-group select:focus {
      outline: none;
      border-color: #4ecca3;
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
      border: 0;
    }

    @media (max-width: 768px) {
      .room-content {
        flex-direction: column;
      }

      .chat-section {
        width: 100%;
        height: 250px;
        border-left: none;
        border-top: 1px solid #0f3460;
      }

      .videos-grid {
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      }

      .room-controls {
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0.75rem;
      }

      .btn {
        padding: 0.5rem 1rem;
        font-size: 0.8rem;
      }

      .settings-panel {
        left: 1rem;
        right: 1rem;
        transform: none;
        min-width: auto;
      }
    }
  `,
})
export class RoomComponent implements OnInit, OnDestroy {
  readonly socket = inject(SocketService);
  readonly webrtc = inject(WebrtcService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly roomId = signal('');
  readonly messages = signal<ChatMessage[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly showSettings = signal(false);
  readonly videoDevices = signal<DeviceInfo[]>([]);
  readonly audioInputDevices = signal<DeviceInfo[]>([]);
  readonly audioOutputDevices = signal<DeviceInfo[]>([]);
  readonly isSpeakerEnabled = signal(true);
  
  // Pin video feature: 'local' | 'local-screen' | peerId | null
  readonly pinnedVideo = signal<string | null>(null);
  
  chatInput = '';
  selectedVideoDevice = '';
  selectedAudioInput = '';
  selectedAudioOutput = '';

  private subscriptions: Subscription[] = [];

  async ngOnInit(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }
    
    const roomIdParam = this.route.snapshot.paramMap.get('roomId');
    if (!roomIdParam) {
      this.router.navigate(['/']);
      return;
    }

    this.roomId.set(roomIdParam);

    try {
      // Check if user came from lobby with media settings
      const mediaSettingsStr = sessionStorage.getItem('mediaSettings');
      if (mediaSettingsStr) {
        const mediaSettings = JSON.parse(mediaSettingsStr);
        await this.webrtc.initMediaWithDevices(
          mediaSettings.videoDeviceId,
          mediaSettings.audioDeviceId,
          mediaSettings.videoEnabled,
          mediaSettings.audioEnabled
        );
        // Store selected devices
        this.selectedVideoDevice = mediaSettings.videoDeviceId || '';
        this.selectedAudioInput = mediaSettings.audioDeviceId || '';
        
        // Get room password if exists
        const roomPassword = mediaSettings.roomPassword || sessionStorage.getItem('roomPassword') || '';
        
        // Clear the settings after use
        sessionStorage.removeItem('mediaSettings');
        sessionStorage.removeItem('roomPassword');
        
        // Load available devices
        await this.loadDevices();
        
        this.setupSocketListeners();
        this.socket.joinRoom(roomIdParam, roomPassword || undefined);
      } else {
        // Fallback to default initialization (redirect to lobby)
        this.router.navigate(['/lobby', roomIdParam]);
        return;
      }
    } catch (error) {
      console.error('Failed to initialize media:', error);
      this.errorMessage.set('Failed to access camera/microphone. Please check permissions.');
      this.router.navigate(['/']);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.webrtc.stopAllMedia();
  }

  private setupSocketListeners(): void {
    this.subscriptions.push(
      this.socket.onRoomUsers.subscribe(users => {
        console.log('Room users:', users);
        users.forEach(id => this.webrtc.createOffer(id));
      }),

      this.socket.onUserJoined.subscribe(id => {
        console.log('User joined:', id);
      }),

      this.socket.onUserLeft.subscribe(id => {
        console.log('User left:', id);
        this.webrtc.removePeer(id);
      }),

      this.socket.onOffer.subscribe(async ({ from, offer }) => {
        await this.webrtc.handleOffer(from, offer);
      }),

      this.socket.onAnswer.subscribe(async ({ from, answer }) => {
        await this.webrtc.handleAnswer(from, answer);
      }),

      this.socket.onIceCandidate.subscribe(async ({ from, candidate }) => {
        await this.webrtc.addIceCandidate(from, candidate);
      }),

      this.socket.onChat.subscribe(msg => {
        this.messages.update(msgs => [...msgs, msg]);
      })
    );
  }

  sendMessage(): void {
    if (!this.chatInput.trim()) return;

    this.socket.sendChat(this.roomId(), this.chatInput);
    this.chatInput = '';
  }

  async toggleScreenShare(): Promise<void> {
    if (this.webrtc.isScreenSharing()) {
      await this.webrtc.stopScreenShare();
    } else {
      await this.webrtc.shareScreen();
    }
  }

  toggleVideo(): void {
    this.webrtc.toggleVideo();
  }

  toggleAudio(): void {
    this.webrtc.toggleAudio();
  }

  toggleSpeaker(): void {
    const newState = !this.isSpeakerEnabled();
    this.isSpeakerEnabled.set(newState);
    
    // Mute/unmute all remote video elements
    const videos = document.querySelectorAll('.remote-video video') as NodeListOf<HTMLVideoElement>;
    videos.forEach(video => {
      video.muted = !newState;
    });
  }

  toggleSettings(): void {
    this.showSettings.update(v => !v);
  }

  private async loadDevices(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const videoDevs: DeviceInfo[] = devices
        .filter(d => d.kind === 'videoinput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${d.deviceId.slice(0, 5)}`,
        }));

      const audioInputDevs: DeviceInfo[] = devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 5)}`,
        }));

      const audioOutputDevs: DeviceInfo[] = devices
        .filter(d => d.kind === 'audiooutput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Speaker ${d.deviceId.slice(0, 5)}`,
        }));

      this.videoDevices.set(videoDevs);
      this.audioInputDevices.set(audioInputDevs);
      this.audioOutputDevices.set(audioOutputDevs);

      // Set default selections if not already set
      if (!this.selectedVideoDevice && videoDevs.length > 0) {
        this.selectedVideoDevice = videoDevs[0].deviceId;
      }
      if (!this.selectedAudioInput && audioInputDevs.length > 0) {
        this.selectedAudioInput = audioInputDevs[0].deviceId;
      }
      if (!this.selectedAudioOutput && audioOutputDevs.length > 0) {
        this.selectedAudioOutput = audioOutputDevs[0].deviceId;
      }
    } catch (err) {
      console.error('Error loading devices:', err);
    }
  }

  async onVideoDeviceChange(): Promise<void> {
    try {
      await this.webrtc.changeVideoDevice(this.selectedVideoDevice);
    } catch (err) {
      console.error('Error changing video device:', err);
    }
  }

  async onAudioInputChange(): Promise<void> {
    try {
      await this.webrtc.changeAudioInputDevice(this.selectedAudioInput);
    } catch (err) {
      console.error('Error changing audio input device:', err);
    }
  }

  async onAudioOutputChange(): Promise<void> {
    try {
      // Change audio output on all video elements
      const videos = document.querySelectorAll('video');
      for (const video of videos) {
        if ('setSinkId' in video) {
          await (video as HTMLVideoElement & { setSinkId(sinkId: string): Promise<void> })
            .setSinkId(this.selectedAudioOutput);
        }
      }
    } catch (err) {
      console.error('Error changing audio output device:', err);
    }
  }

  leaveRoom(): void {
    this.webrtc.stopAllMedia();
    this.router.navigate(['/']);
  }

  onRemoteVideoLoaded(peerId: string, stream: MediaStream): void {
    // Start voice activity detection for the remote stream
    this.webrtc.startRemoteVoiceActivityDetection(peerId, stream);
  }

  pinVideo(videoId: string): void {
    if (this.pinnedVideo() === videoId) {
      // Toggle off if already pinned
      this.pinnedVideo.set(null);
    } else {
      this.pinnedVideo.set(videoId);
    }
  }

  unpinVideo(): void {
    this.pinnedVideo.set(null);
  }
}
