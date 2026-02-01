import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SocketService } from './socket';

export interface Subtitle {
  type: 'partial' | 'final';
  text: string;
  from: string;
  fromName: string;
  timestamp: number;
}

export interface SubtitleDisplay {
  id: number;
  fromName: string;
  text: string;
  isFinal: boolean;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class SubtitleService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly socket = inject(SocketService);

  // Audio capture
  private audioContext: AudioContext | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private audioStream: MediaStream | null = null;

  // State
  readonly isTranscribing = signal(false);
  readonly isConnecting = signal(false);
  readonly subtitlesEnabled = signal(true);
  readonly error = signal<string | null>(null);

  // Subtitles - Map of speakerId to their current subtitle
  private readonly subtitlesMap = signal<Map<string, SubtitleDisplay>>(new Map());
  private subtitleIdCounter = 0;

  // Computed: array of subtitles for display
  readonly subtitles = computed(() => {
    const map = this.subtitlesMap();
    const subtitles = Array.from(map.values());
    // Sort by timestamp, most recent first
    return subtitles.sort((a, b) => b.timestamp - a.timestamp);
  });

  // Keep only recent subtitles (last 3)
  readonly displaySubtitles = computed(() => {
    return this.subtitles().slice(0, 3);
  });

  private readonly SAMPLE_RATE = 16000;
  private readonly BUFFER_SIZE = 4096;
  private cleanupTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  /**
   * Start transcription - capture audio and send to server
   * @param existingStream - Optional existing MediaStream to use (from WebRTC)
   */
  async startTranscription(existingStream?: MediaStream): Promise<void> {
    if (!this.isBrowser) return;

    if (this.isTranscribing()) {
      console.log('Already transcribing');
      return;
    }

    this.isConnecting.set(true);
    this.error.set(null);

    try {
      // Use existing stream or get a new one
      if (existingStream) {
        this.audioStream = existingStream;
      } else {
        this.audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: this.SAMPLE_RATE,
            channelCount: 1,
          },
        });
      }

      // Create audio context with the required sample rate
      this.audioContext = new AudioContext({ sampleRate: this.SAMPLE_RATE });

      // Create source from the audio stream
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.audioStream);

      // Create script processor for capturing audio data
      // Note: ScriptProcessorNode is deprecated but still widely supported
      // AudioWorklet would be the modern alternative
      this.scriptProcessor = this.audioContext.createScriptProcessor(this.BUFFER_SIZE, 1, 1);

      this.scriptProcessor.onaudioprocess = (event) => {
        if (!this.isTranscribing()) return;

        const inputBuffer = event.inputBuffer.getChannelData(0);

        // Convert Float32 to Int16 PCM
        const pcmData = this.float32ToInt16(inputBuffer);

        // Send to server via socket - slice to get a proper ArrayBuffer
        this.socket.sendAudioData(pcmData.buffer.slice(0) as ArrayBuffer);
      };

      // Connect the nodes
      this.mediaStreamSource.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      // Tell server to start transcription
      const roomId = this.socket.getCurrentRoomId();
      if (roomId) {
        this.socket.startTranscription(roomId);
        this.isTranscribing.set(true);
      } else {
        throw new Error('Not in a room');
      }
    } catch (err) {
      console.error('Failed to start transcription:', err);
      this.error.set(err instanceof Error ? err.message : 'Failed to start transcription');
      this.cleanup();
    } finally {
      this.isConnecting.set(false);
    }
  }

  /**
   * Stop transcription
   */
  stopTranscription(): void {
    if (!this.isTranscribing()) return;

    const roomId = this.socket.getCurrentRoomId();
    if (roomId) {
      this.socket.stopTranscription(roomId);
    }

    this.cleanup();
    this.isTranscribing.set(false);
  }

  /**
   * Toggle transcription on/off
   */
  async toggleTranscription(existingStream?: MediaStream): Promise<void> {
    if (this.isTranscribing()) {
      this.stopTranscription();
    } else {
      await this.startTranscription(existingStream);
    }
  }

  /**
   * Toggle subtitles visibility
   */
  toggleSubtitles(): void {
    this.subtitlesEnabled.update((v) => !v);
  }

  /**
   * Handle incoming subtitle from server
   */
  handleSubtitle(subtitle: Subtitle): void {
    if (!this.subtitlesEnabled()) return;

    const key = subtitle.from;

    // Clear any existing cleanup timeout for this speaker
    const existingTimeout = this.cleanupTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    this.subtitlesMap.update((map) => {
      const newMap = new Map(map);
      newMap.set(key, {
        id: ++this.subtitleIdCounter,
        fromName: subtitle.fromName,
        text: subtitle.text,
        isFinal: subtitle.type === 'final',
        timestamp: subtitle.timestamp,
      });
      return newMap;
    });

    // Remove subtitle after 5 seconds if final, or 10 seconds if still partial
    const timeout = subtitle.type === 'final' ? 5000 : 10000;
    const cleanupTimeout = setTimeout(() => {
      this.subtitlesMap.update((map) => {
        const newMap = new Map(map);
        newMap.delete(key);
        return newMap;
      });
      this.cleanupTimeouts.delete(key);
    }, timeout);

    this.cleanupTimeouts.set(key, cleanupTimeout);
  }

  /**
   * Clear all subtitles
   */
  clearSubtitles(): void {
    this.cleanupTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.cleanupTimeouts.clear();
    this.subtitlesMap.set(new Map());
  }

  /**
   * Convert Float32Array to Int16Array for PCM audio
   */
  private float32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp the value between -1 and 1
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      // Convert to 16-bit signed integer
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }

  /**
   * Cleanup audio resources
   */
  private cleanup(): void {
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Don't stop the stream if it was passed in (it's the WebRTC stream)
    // Only stop if we created it ourselves
    this.audioStream = null;
  }

  /**
   * Cleanup on service destroy
   */
  destroy(): void {
    this.stopTranscription();
    this.clearSubtitles();
  }
}
