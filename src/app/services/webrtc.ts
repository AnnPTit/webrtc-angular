import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SocketService } from './socket';

export interface PeerConnection {
  id: string;
  pc: RTCPeerConnection;
  streams: Map<string, MediaStream>;
}

@Injectable({
  providedIn: 'root'
})
export class WebrtcService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  
  private readonly peers = signal<Map<string, RTCPeerConnection>>(new Map());
  private readonly pendingCandidates = signal<Map<string, RTCIceCandidateInit[]>>(new Map());
  private readonly remoteStreams = signal<Map<string, MediaStream[]>>(new Map());
  
  private localStreamValue: MediaStream | null = null;
  private rawStreamValue: MediaStream | null = null; // Original stream from getUserMedia
  private screenStreamValue: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  
  readonly localStream = signal<MediaStream | null>(null);
  readonly screenStream = signal<MediaStream | null>(null);
  readonly isScreenSharing = signal(false);
  readonly mediaReady = signal(false);
  readonly isVideoEnabled = signal(true);
  readonly isAudioEnabled = signal(true);
  
  // Voice Activity Detection
  readonly isLocalSpeaking = signal(false);
  readonly speakingPeers = signal<Set<string>>(new Set());
  
  private localAnalyser: AnalyserNode | null = null;
  private localVadInterval: number | null = null;
  private remoteAnalysers = new Map<string, { analyser: AnalyserNode; context: AudioContext; interval: number }>();
  private readonly VAD_THRESHOLD = 30; // Audio level threshold for speaking detection
  private readonly VAD_CHECK_INTERVAL = 100; // Check every 100ms
  
  readonly allRemoteStreams = computed(() => {
    const result: { peerId: string; stream: MediaStream }[] = [];
    this.remoteStreams().forEach((streams, peerId) => {
      streams.forEach(stream => {
        result.push({ peerId, stream });
      });
    });
    return result;
  });

  private readonly iceServers: RTCConfiguration = {
    iceServers: [
      // STUN server
      { urls: 'stun:stun.relay.metered.ca:80' },
      // TURN servers từ Metered.ca (credentials của bạn)
      {
        urls: 'turn:global.relay.metered.ca:80',
        username: 'de2fdccebb4b92085f52fc05',
        credential: 'UT2MgcOElTK1nzhJ',
      },
      {
        urls: 'turn:global.relay.metered.ca:80?transport=tcp',
        username: 'de2fdccebb4b92085f52fc05',
        credential: 'UT2MgcOElTK1nzhJ',
      },
      {
        urls: 'turn:global.relay.metered.ca:443',
        username: 'de2fdccebb4b92085f52fc05',
        credential: 'UT2MgcOElTK1nzhJ',
      },
      {
        urls: 'turns:global.relay.metered.ca:443?transport=tcp',
        username: 'de2fdccebb4b92085f52fc05',
        credential: 'UT2MgcOElTK1nzhJ',
      },
    ],
    iceCandidatePoolSize: 10,
  };

  constructor(private socket: SocketService) {}

  async initMedia(constraints?: MediaStreamConstraints): Promise<void> {
    if (!this.isBrowser) {
      return;
    }
    
    try {
      const defaultConstraints: MediaStreamConstraints = {
        video: true,
        audio: {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          // Additional constraints to reduce echo
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 48000 },
          sampleSize: { ideal: 16 },
        }
      };
      
      const rawStream = await navigator.mediaDevices.getUserMedia(
        constraints || defaultConstraints
      );
      
      // Store raw stream to stop it later
      this.rawStreamValue = rawStream;
      
      // Process audio through Web Audio API for better echo control
      this.localStreamValue = await this.processAudioStream(rawStream);
      this.localStream.set(this.localStreamValue);
      this.mediaReady.set(true);
    } catch (err) {
      console.error('Error accessing media devices:', err);
      throw err;
    }
  }

  private async processAudioStream(stream: MediaStream): Promise<MediaStream> {
    if (!this.isBrowser) return stream;
    
    try {
      // Create audio context
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      const destination = this.audioContext.createMediaStreamDestination();
      
      // Create a gain node to control volume
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0.9; // Slightly reduce input volume to prevent feedback
      
      // Create a compressor to prevent audio peaks
      const compressor = this.audioContext.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 10;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      
      // Create a high-pass filter to remove low frequency rumble
      const highpassFilter = this.audioContext.createBiquadFilter();
      highpassFilter.type = 'highpass';
      highpassFilter.frequency.value = 80;
      
      // Connect: source -> highpass -> compressor -> gain -> destination
      source.connect(highpassFilter);
      highpassFilter.connect(compressor);
      compressor.connect(gainNode);
      gainNode.connect(destination);
      
      // Create analyser for voice activity detection
      this.localAnalyser = this.audioContext.createAnalyser();
      this.localAnalyser.fftSize = 256;
      this.localAnalyser.smoothingTimeConstant = 0.5;
      gainNode.connect(this.localAnalyser);
      
      // Start local VAD monitoring
      this.startLocalVoiceActivityDetection();
      
      // Create new stream with processed audio and original video
      const processedStream = new MediaStream();
      
      // Add video tracks from original stream
      stream.getVideoTracks().forEach(track => {
        processedStream.addTrack(track);
      });
      
      // Add processed audio tracks
      destination.stream.getAudioTracks().forEach(track => {
        processedStream.addTrack(track);
      });
      
      return processedStream;
    } catch (err) {
      console.error('Error processing audio stream:', err);
      return stream; // Fallback to original stream
    }
  }

  async initMediaWithDevices(
    videoDeviceId?: string,
    audioDeviceId?: string,
    videoEnabled = true,
    audioEnabled = true
  ): Promise<void> {
    // Always request both video and audio with echo cancellation
    const constraints: MediaStreamConstraints = {
      video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
      audio: {
        deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    };

    await this.initMedia(constraints);

    // Disable tracks based on user preferences
    if (this.localStreamValue) {
      this.localStreamValue.getVideoTracks().forEach(track => {
        track.enabled = videoEnabled;
      });
      this.localStreamValue.getAudioTracks().forEach(track => {
        track.enabled = audioEnabled;
      });
      this.isVideoEnabled.set(videoEnabled);
      this.isAudioEnabled.set(audioEnabled);
    }
  }

  toggleVideo(): boolean {
    if (!this.localStreamValue) return false;
    
    const newState = !this.isVideoEnabled();
    this.localStreamValue.getVideoTracks().forEach(track => {
      track.enabled = newState;
    });
    this.isVideoEnabled.set(newState);
    return newState;
  }

  toggleAudio(): boolean {
    if (!this.localStreamValue) return false;
    
    const newState = !this.isAudioEnabled();
    this.localStreamValue.getAudioTracks().forEach(track => {
      track.enabled = newState;
    });
    this.isAudioEnabled.set(newState);
    return newState;
  }

  async changeVideoDevice(deviceId: string): Promise<void> {
    if (!this.localStreamValue || !this.isBrowser) return;

    try {
      // Get new video stream
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = this.localStreamValue.getVideoTracks()[0];
      
      // Replace track in all peer connections
      for (const [, pc] of this.peers()) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }
      
      // Replace track in local stream
      if (oldVideoTrack) {
        this.localStreamValue.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
      }
      this.localStreamValue.addTrack(newVideoTrack);
      newVideoTrack.enabled = this.isVideoEnabled();
      
      // Trigger update
      this.localStream.set(this.localStreamValue);
    } catch (err) {
      console.error('Error changing video device:', err);
      throw err;
    }
  }

  async changeAudioInputDevice(deviceId: string): Promise<void> {
    if (!this.localStreamValue || !this.isBrowser) return;

    try {
      // Get new audio stream
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: { deviceId: { exact: deviceId } },
      });
      
      const newAudioTrack = newStream.getAudioTracks()[0];
      const oldAudioTrack = this.localStreamValue.getAudioTracks()[0];
      
      // Replace track in all peer connections
      for (const [, pc] of this.peers()) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
        if (sender) {
          await sender.replaceTrack(newAudioTrack);
        }
      }
      
      // Replace track in local stream
      if (oldAudioTrack) {
        this.localStreamValue.removeTrack(oldAudioTrack);
        oldAudioTrack.stop();
      }
      this.localStreamValue.addTrack(newAudioTrack);
      newAudioTrack.enabled = this.isAudioEnabled();
      
      // Trigger update
      this.localStream.set(this.localStreamValue);
    } catch (err) {
      console.error('Error changing audio input device:', err);
      throw err;
    }
  }

  private getOrCreatePeer(peerId: string): RTCPeerConnection {
    const existingPeer = this.peers().get(peerId);
    if (existingPeer) {
      return existingPeer;
    }
    return this.createNewPeer(peerId);
  }

  private createNewPeer(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.iceServers);

    pc.onconnectionstatechange = () => {
      console.log(`Peer ${peerId} connection state:`, pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`Peer ${peerId} ICE state:`, pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        console.error(`ICE connection failed for peer ${peerId}. Restarting ICE...`);
        pc.restartIce();
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log(`Peer ${peerId} ICE gathering state:`, pc.iceGatheringState);
    };

    pc.onicecandidateerror = (event) => {
      console.error(`ICE candidate error for peer ${peerId}:`, event);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        // Log candidate type để debug
        console.log(`ICE candidate for ${peerId}: type=${e.candidate.type}, protocol=${e.candidate.protocol}, address=${e.candidate.address}`);
        this.socket.sendIceCandidate(peerId, e.candidate);
      } else {
        console.log(`ICE gathering complete for ${peerId}`);
      }
    };

    // Add camera tracks
    if (this.localStreamValue) {
      this.localStreamValue.getTracks().forEach(track => {
        pc.addTrack(track, this.localStreamValue!);
      });
    }

    // Add screen share track if currently sharing
    if (this.screenStreamValue && this.isScreenSharing()) {
      this.screenStreamValue.getTracks().forEach(track => {
        pc.addTrack(track, this.screenStreamValue!);
      });
    }

    pc.ontrack = (e) => {
      console.log(`Received track from ${peerId}:`, e.track.kind, 'streamId:', e.streams[0]?.id);
      const stream = e.streams[0];
      if (stream) {
        // Listen for track removal
        stream.onremovetrack = () => {
          console.log(`Track removed from stream ${stream.id}`);
          if (stream.getTracks().length === 0) {
            this.remoteStreams.update(streams => {
              const newStreams = new Map(streams);
              const peerStreams = newStreams.get(peerId) || [];
              const filtered = peerStreams.filter(s => s.id !== stream.id);
              if (filtered.length > 0) {
                newStreams.set(peerId, filtered);
              } else {
                newStreams.delete(peerId);
              }
              return newStreams;
            });
          }
        };

        this.remoteStreams.update(streams => {
          const newStreams = new Map(streams);
          const peerStreams = newStreams.get(peerId) || [];
          const existingIndex = peerStreams.findIndex(s => s.id === stream.id);
          if (existingIndex === -1) {
            peerStreams.push(stream);
          } else {
            // Update existing stream reference
            peerStreams[existingIndex] = stream;
          }
          newStreams.set(peerId, peerStreams);
          return newStreams;
        });
      }
    };

    this.peers.update(peers => {
      const newPeers = new Map(peers);
      newPeers.set(peerId, pc);
      return newPeers;
    });

    return pc;
  }

  async createOffer(peerId: string): Promise<void> {
    let pc = this.peers().get(peerId);
    if (!pc) {
      pc = this.createNewPeer(peerId);
    }
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.socket.sendOffer(peerId, offer);
  }

  async handleOffer(from: string, offer: RTCSessionDescriptionInit): Promise<void> {
    let pc = this.peers().get(from);
    if (!pc) {
      pc = this.createNewPeer(from);
    }
    await pc.setRemoteDescription(offer);
    
    await this.processPendingCandidates(from, pc);
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.socket.sendAnswer(from, answer);
  }

  async handleAnswer(from: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peers().get(from);
    if (pc) {
      await pc.setRemoteDescription(answer);
      await this.processPendingCandidates(from, pc);
    }
  }

  async addIceCandidate(from: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peers().get(from);
    if (pc?.remoteDescription?.type) {
      await pc.addIceCandidate(candidate);
    } else {
      this.pendingCandidates.update(pending => {
        const newPending = new Map(pending);
        const candidates = newPending.get(from) || [];
        candidates.push(candidate);
        newPending.set(from, candidates);
        return newPending;
      });
    }
  }

  private async processPendingCandidates(peerId: string, pc: RTCPeerConnection): Promise<void> {
    const candidates = this.pendingCandidates().get(peerId);
    if (candidates) {
      for (const candidate of candidates) {
        await pc.addIceCandidate(candidate);
      }
      this.pendingCandidates.update(pending => {
        const newPending = new Map(pending);
        newPending.delete(peerId);
        return newPending;
      });
    }
  }

  removePeer(peerId: string): void {
    const pc = this.peers().get(peerId);
    if (pc) {
      pc.close();
    }
    
    // Stop VAD for this peer
    this.stopRemoteVoiceActivityDetection(peerId);
    
    this.peers.update(peers => {
      const newPeers = new Map(peers);
      newPeers.delete(peerId);
      return newPeers;
    });
    
    this.pendingCandidates.update(pending => {
      const newPending = new Map(pending);
      newPending.delete(peerId);
      return newPending;
    });
    
    this.remoteStreams.update(streams => {
      const newStreams = new Map(streams);
      newStreams.delete(peerId);
      return newStreams;
    });
  }

  async shareScreen(): Promise<void> {
    if (this.isScreenSharing()) {
      console.log('Already sharing screen');
      return;
    }

    try {
      this.screenStreamValue = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = this.screenStreamValue.getVideoTracks()[0];
      this.isScreenSharing.set(true);
      this.screenStream.set(this.screenStreamValue);

      this.peers().forEach((pc, peerId) => {
        pc.addTrack(screenTrack, this.screenStreamValue!);
      });

      for (const [peerId, pc] of this.peers()) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socket.sendOffer(peerId, offer);
      }

      screenTrack.onended = async () => {
        await this.stopScreenShare();
      };

    } catch (err) {
      console.error('Error sharing screen:', err);
      this.isScreenSharing.set(false);
    }
  }

  async stopScreenShare(): Promise<void> {
    if (!this.isScreenSharing() || !this.screenStreamValue) {
      return;
    }

    const screenTrack = this.screenStreamValue.getVideoTracks()[0];
    
    for (const [peerId, pc] of this.peers()) {
      const sender = pc.getSenders().find(s => s.track === screenTrack);
      if (sender) {
        pc.removeTrack(sender);
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.socket.sendOffer(peerId, offer);
    }

    this.screenStreamValue.getTracks().forEach(track => track.stop());
    this.screenStreamValue = null;
    this.screenStream.set(null);
    this.isScreenSharing.set(false);
  }

  stopAllMedia(): void {
    // Stop all tracks from local stream
    this.localStreamValue?.getTracks().forEach(track => track.stop());
    
    // Stop raw stream tracks (original from getUserMedia) to fully release camera/mic
    this.rawStreamValue?.getTracks().forEach(track => track.stop());
    
    // Stop screen sharing tracks
    this.screenStreamValue?.getTracks().forEach(track => track.stop());
    
    // Stop local VAD
    this.stopLocalVoiceActivityDetection();
    
    // Stop all remote VAD
    this.stopAllRemoteVoiceActivityDetection();
    
    // Close audio context
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    
    this.peers().forEach(pc => pc.close());
    
    this.localStreamValue = null;
    this.rawStreamValue = null;
    this.screenStreamValue = null;
    this.localStream.set(null);
    this.screenStream.set(null);
    this.peers.set(new Map());
    this.pendingCandidates.set(new Map());
    this.remoteStreams.set(new Map());
    this.mediaReady.set(false);
    this.isScreenSharing.set(false);
    this.isLocalSpeaking.set(false);
    this.speakingPeers.set(new Set());
  }
  
  private startLocalVoiceActivityDetection(): void {
    if (!this.localAnalyser || !this.isBrowser) return;
    
    const dataArray = new Uint8Array(this.localAnalyser.frequencyBinCount);
    
    this.localVadInterval = window.setInterval(() => {
      if (!this.localAnalyser) return;
      
      this.localAnalyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      
      const isSpeaking = average > this.VAD_THRESHOLD && this.isAudioEnabled();
      if (this.isLocalSpeaking() !== isSpeaking) {
        this.isLocalSpeaking.set(isSpeaking);
      }
    }, this.VAD_CHECK_INTERVAL);
  }
  
  private stopLocalVoiceActivityDetection(): void {
    if (this.localVadInterval !== null) {
      clearInterval(this.localVadInterval);
      this.localVadInterval = null;
    }
    this.localAnalyser = null;
    this.isLocalSpeaking.set(false);
  }
  
  startRemoteVoiceActivityDetection(peerId: string, stream: MediaStream): void {
    if (!this.isBrowser) return;
    
    // Skip if already monitoring this peer
    if (this.remoteAnalysers.has(peerId)) return;
    
    // Check if stream has audio tracks
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;
    
    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const interval = window.setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        
        const isSpeaking = average > this.VAD_THRESHOLD;
        const currentSpeakers = this.speakingPeers();
        const wasSpeaking = currentSpeakers.has(peerId);
        
        if (isSpeaking !== wasSpeaking) {
          this.speakingPeers.update(peers => {
            const newPeers = new Set(peers);
            if (isSpeaking) {
              newPeers.add(peerId);
            } else {
              newPeers.delete(peerId);
            }
            return newPeers;
          });
        }
      }, this.VAD_CHECK_INTERVAL);
      
      this.remoteAnalysers.set(peerId, { analyser, context: audioContext, interval });
    } catch (err) {
      console.error('Error starting remote VAD for peer:', peerId, err);
    }
  }
  
  stopRemoteVoiceActivityDetection(peerId: string): void {
    const vadData = this.remoteAnalysers.get(peerId);
    if (vadData) {
      clearInterval(vadData.interval);
      vadData.context.close().catch(() => {});
      this.remoteAnalysers.delete(peerId);
      
      this.speakingPeers.update(peers => {
        const newPeers = new Set(peers);
        newPeers.delete(peerId);
        return newPeers;
      });
    }
  }
  
  private stopAllRemoteVoiceActivityDetection(): void {
    this.remoteAnalysers.forEach((vadData, peerId) => {
      clearInterval(vadData.interval);
      vadData.context.close().catch(() => {});
    });
    this.remoteAnalysers.clear();
    this.speakingPeers.set(new Set());
  }
  
  isPeerSpeaking(peerId: string): boolean {
    return this.speakingPeers().has(peerId);
  }
}
