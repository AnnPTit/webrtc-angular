import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';
import { Subject, Observable, EMPTY } from 'rxjs';

export interface ChatMessage {
  from: string;
  fromName?: string;
  message: string;
  time: Date;
}

export interface RoomUser {
  id: string;
  displayName: string;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  
  private socket: Socket | null = null;
  private readonly connected = signal(false);
  
  readonly isConnected = computed(() => this.connected());
  readonly socketId = signal<string | undefined>(undefined);
  
  // Store local user's display name
  // TODO: Later, replace this with user info from authentication
  readonly localDisplayName = signal<string>('Anonymous');
  
  // Mapping of peerId to displayName for all users in the room
  readonly userNames = signal<Map<string, string>>(new Map());

  private roomUsers$ = new Subject<RoomUser[]>();
  private userJoined$ = new Subject<RoomUser>();
  private userLeft$ = new Subject<string>();
  private offer$ = new Subject<{ from: string; offer: RTCSessionDescriptionInit }>();
  private answer$ = new Subject<{ from: string; answer: RTCSessionDescriptionInit }>();
  private iceCandidate$ = new Subject<{ from: string; candidate: RTCIceCandidateInit }>();
  private chat$ = new Subject<ChatMessage>();
  private roomCreated$ = new Subject<{ roomId: string; hasPassword: boolean }>();
  private joinResult$ = new Subject<{ success: boolean; error?: string; requiresPassword?: boolean }>();
  private createRoomError$ = new Subject<{ error: string }>();

  constructor() {
    if (!this.isBrowser) {
      return;
    }
    
    this.socket = io('https://tcnnxwg2-3000.asse.devtunnels.ms/');

    this.socket.on('connect', () => {
      this.connected.set(true);
      this.socketId.set(this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      this.connected.set(false);
      this.socketId.set(undefined);
      this.userNames.set(new Map());
    });

    // Handle room-users event - may receive array of strings (socket IDs) or array of RoomUser objects
    this.socket.on('room-users', (users: string[] | RoomUser[]) => {
      if (users.length > 0) {
        if (typeof users[0] === 'string') {
          // Legacy format: array of socket IDs
          const roomUsers = (users as string[]).map(id => ({ id, displayName: id.slice(0, 8) }));
          roomUsers.forEach(u => this.userNames.update(m => new Map(m).set(u.id, u.displayName)));
          this.roomUsers$.next(roomUsers);
        } else {
          // New format: array of RoomUser objects
          const roomUsers = users as RoomUser[];
          roomUsers.forEach(u => this.userNames.update(m => new Map(m).set(u.id, u.displayName)));
          this.roomUsers$.next(roomUsers);
        }
      } else {
        this.roomUsers$.next([]);
      }
    });
    
    // Handle user-joined event - may receive string (socket ID) or RoomUser object
    this.socket.on('user-joined', (data: string | RoomUser) => {
      if (typeof data === 'string') {
        // Legacy format: socket ID
        const user = { id: data, displayName: data.slice(0, 8) };
        this.userNames.update(m => new Map(m).set(user.id, user.displayName));
        this.userJoined$.next(user);
      } else {
        // New format: RoomUser object
        this.userNames.update(m => new Map(m).set(data.id, data.displayName));
        this.userJoined$.next(data);
      }
    });
    
    this.socket.on('user-left', (id: string) => {
      this.userNames.update(m => {
        const newMap = new Map(m);
        newMap.delete(id);
        return newMap;
      });
      this.userLeft$.next(id);
    });
    
    this.socket.on('offer', (data: { from: string; offer: RTCSessionDescriptionInit }) => this.offer$.next(data));
    this.socket.on('answer', (data: { from: string; answer: RTCSessionDescriptionInit }) => this.answer$.next(data));
    this.socket.on('ice-candidate', (data: { from: string; candidate: RTCIceCandidateInit }) => this.iceCandidate$.next(data));
    this.socket.on('chat', (msg: ChatMessage) => this.chat$.next(msg));
    this.socket.on('room-created', (data: { roomId: string; hasPassword: boolean }) => this.roomCreated$.next(data));
    this.socket.on('join-result', (data: { success: boolean; error?: string; requiresPassword?: boolean }) => this.joinResult$.next(data));
    this.socket.on('create-room-error', (data: { error: string }) => this.createRoomError$.next(data));
  }

  // Helper method to get display name for a peer
  getDisplayName(peerId: string): string {
    return this.userNames().get(peerId) || peerId.slice(0, 8);
  }

  get onRoomUsers(): Observable<RoomUser[]> {
    return this.roomUsers$.asObservable();
  }

  get onUserJoined(): Observable<RoomUser> {
    return this.userJoined$.asObservable();
  }

  get onUserLeft(): Observable<string> {
    return this.userLeft$.asObservable();
  }

  get onOffer(): Observable<{ from: string; offer: RTCSessionDescriptionInit }> {
    return this.offer$.asObservable();
  }

  get onAnswer(): Observable<{ from: string; answer: RTCSessionDescriptionInit }> {
    return this.answer$.asObservable();
  }

  get onIceCandidate(): Observable<{ from: string; candidate: RTCIceCandidateInit }> {
    return this.iceCandidate$.asObservable();
  }

  get onChat(): Observable<ChatMessage> {
    return this.chat$.asObservable();
  }

  get onRoomCreated(): Observable<{ roomId: string; hasPassword: boolean }> {
    return this.roomCreated$.asObservable();
  }

  get onJoinResult(): Observable<{ success: boolean; error?: string; requiresPassword?: boolean }> {
    return this.joinResult$.asObservable();
  }

  get onCreateRoomError(): Observable<{ error: string }> {
    return this.createRoomError$.asObservable();
  }

  createRoom(roomId: string, password?: string): void {
    this.socket?.emit('create-room', { roomId, password });
  }

  joinRoom(roomId: string, password?: string, displayName?: string): void {
    // Store local display name
    if (displayName) {
      this.localDisplayName.set(displayName);
    }
    this.socket?.emit('join-room', { roomId, password, displayName });
  }

  checkRoom(roomId: string): void {
    this.socket?.emit('check-room', { roomId });
  }

  sendOffer(to: string, offer: RTCSessionDescriptionInit): void {
    this.socket?.emit('offer', { to, offer });
  }

  sendAnswer(to: string, answer: RTCSessionDescriptionInit): void {
    this.socket?.emit('answer', { to, answer });
  }

  sendIceCandidate(to: string, candidate: RTCIceCandidate): void {
    this.socket?.emit('ice-candidate', { to, candidate });
  }

  sendChat(roomId: string, message: string): void {
    this.socket?.emit('chat', { roomId, message });
  }

  disconnect(): void {
    this.socket?.disconnect();
  }
}
