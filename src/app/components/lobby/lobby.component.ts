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
  templateUrl: './lobby.component.html',
  styleUrl: './lobby.component.css',
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
  displayName = '';

  selectedVideoDevice = '';
  selectedAudioDevice = '';

  private streamTracks: MediaStreamTrack[] = [];

  constructor() {
    effect(() => {
      // Enable join button if we have a preview stream
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
        video: this.isVideoEnabled()
          ? { deviceId: this.selectedVideoDevice || undefined }
          : false,
        audio: this.isAudioEnabled()
          ? {
              deviceId: this.selectedAudioDevice || undefined,
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.streamTracks = stream.getTracks();
      this.previewStream.set(stream);
      this.error.set('');

      // Reload devices with labels after permission granted
      await this.loadDevices();
    } catch (err: unknown) {
      console.error('Error accessing media devices:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to access camera or microphone';
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

      const userDisplayName = this.displayName.trim() || 'Anonymous';

      sessionStorage.setItem(
        'mediaSettings',
        JSON.stringify({
          videoEnabled: this.isVideoEnabled(),
          audioEnabled: this.isAudioEnabled(),
          videoDeviceId: this.selectedVideoDevice,
          audioDeviceId: this.selectedAudioDevice,
          roomPassword: roomPassword,
          displayName: userDisplayName,
        })
      );
    }

    await this.router.navigate(['/room', this.roomId()]);
  }

  async goBack(): Promise<void> {
    this.stopPreview();
    await this.router.navigate(['/']);
  }
}
