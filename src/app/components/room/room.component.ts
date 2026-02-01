import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { SocketService, ChatMessage, Reaction } from '../../services/socket';
import { WebrtcService } from '../../services/webrtc';
import { SubtitleService } from '../../services/subtitle';
import { SrcObjectDirective } from '../../directives/src-object.directive';

interface DeviceInfo {
  deviceId: string;
  label: string;
}

interface FloatingReaction {
  id: number;
  emoji: string;
  fromName: string;
  left: number;
}

@Component({
  selector: 'app-room',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SrcObjectDirective],
  templateUrl: './room.component.html',
  styleUrl: './room.component.css',
})
export class RoomComponent implements OnInit, OnDestroy {
  readonly socket = inject(SocketService);
  readonly webrtc = inject(WebrtcService);
  readonly subtitle = inject(SubtitleService);
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
  readonly isChatVisible = signal(true);

  // Reactions feature
  readonly showReactionsPicker = signal(false);
  readonly floatingReactions = signal<FloatingReaction[]>([]);
  readonly availableReactions = ['👍', '👏', '❤️', '😂', '😮', '🎉', '🔥', '👎'];
  private reactionIdCounter = 0;

  // Pin video feature: 'local' | 'local-screen' | peerId | null
  readonly pinnedVideo = signal<string | null>(null);

  // Room timer - startTime from server (timestamp)
  readonly roomStartTime = signal<number | null>(null);
  readonly elapsedSeconds = signal(0);
  readonly formattedTime = computed(() => {
    const total = this.elapsedSeconds();
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  });
  private timerInterval: ReturnType<typeof setInterval> | null = null;

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
        const roomPassword =
          mediaSettings.roomPassword || sessionStorage.getItem('roomPassword') || '';

        // Get display name
        const displayName = mediaSettings.displayName || 'Anonymous';

        // Clear the settings after use
        sessionStorage.removeItem('mediaSettings');
        sessionStorage.removeItem('roomPassword');

        // Load available devices
        await this.loadDevices();

        this.setupSocketListeners();
        this.socket.joinRoom(roomIdParam, roomPassword || undefined, displayName);
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
    // Leave room before disconnecting
    const currentRoomId = this.roomId();
    if (currentRoomId) {
      this.socket.leaveRoom(currentRoomId);
    }
    
    // Stop transcription if active
    this.subtitle.destroy();
    
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.webrtc.stopAllMedia();
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  private setupSocketListeners(): void {
    this.subscriptions.push(
      this.socket.onRoomUsers.subscribe(users => {
        console.log('Room users:', users);
        users.forEach(user => this.webrtc.createOffer(user.id));
      }),

      this.socket.onUserJoined.subscribe(user => {
        console.log('User joined:', user.displayName, user.id);
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
      }),

      this.socket.onChatHistory.subscribe(history => {
        // Prepend chat history to messages
        this.messages.update(msgs => [...history, ...msgs]);
      }),

      this.socket.onJoinResult.subscribe(result => {
        if (result.success && result.startTime) {
          this.roomStartTime.set(result.startTime);
          this.startTimer(result.startTime);
        }
      }),

      this.socket.onReaction.subscribe(reaction => {
        // Skip if reaction is from self (already shown locally)
        if (reaction.from === this.socket.socketId()) return;
        this.showFloatingReaction(reaction.emoji, reaction.fromName);
      }),

      // Subscribe to subtitles
      this.socket.onSubtitle.subscribe(subtitle => {
        this.subtitle.handleSubtitle(subtitle);
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

  toggleChat(): void {
    this.isChatVisible.update(v => !v);
  }

  toggleReactionsPicker(): void {
    this.showReactionsPicker.update(v => !v);
  }

  sendReaction(emoji: string): void {
    this.socket.sendReaction(this.roomId(), emoji);
    // Also show locally
    this.showFloatingReaction(emoji, this.socket.localDisplayName());
  }

  private showFloatingReaction(emoji: string, fromName: string): void {
    const id = ++this.reactionIdCounter;
    const left = 20 + Math.random() * 60; // Random position between 20% and 80%

    this.floatingReactions.update(reactions => [...reactions, { id, emoji, fromName, left }]);

    // Remove reaction after animation completes
    setTimeout(() => {
      this.floatingReactions.update(reactions => reactions.filter(r => r.id !== id));
    }, 3000);
  }

  private startTimer(serverStartTime?: number): void {
    // Calculate elapsed time from server start time
    if (serverStartTime) {
      const elapsed = Math.floor((Date.now() - serverStartTime) / 1000);
      this.elapsedSeconds.set(Math.max(0, elapsed));
    } else {
      this.elapsedSeconds.set(0);
    }
    
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds.update(s => s + 1);
    }, 1000);
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
          await (
            video as HTMLVideoElement & { setSinkId(sinkId: string): Promise<void> }
          ).setSinkId(this.selectedAudioOutput);
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

  async toggleSubtitles(): Promise<void> {
    // Get audio stream from local media
    const localStream = this.webrtc.localStream();
    await this.subtitle.toggleTranscription(localStream || undefined);
  }
}
