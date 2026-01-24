import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';
import { Subject, Observable, EMPTY } from 'rxjs';

export interface ChatMessage {
  from: string;
  message: string;
  time: Date;
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

  private roomUsers$ = new Subject<string[]>();
  private userJoined$ = new Subject<string>();
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
    });

    this.socket.on('room-users', (users: string[]) => this.roomUsers$.next(users));
    this.socket.on('user-joined', (id: string) => this.userJoined$.next(id));
    this.socket.on('user-left', (id: string) => this.userLeft$.next(id));
    this.socket.on('offer', (data: { from: string; offer: RTCSessionDescriptionInit }) => this.offer$.next(data));
    this.socket.on('answer', (data: { from: string; answer: RTCSessionDescriptionInit }) => this.answer$.next(data));
    this.socket.on('ice-candidate', (data: { from: string; candidate: RTCIceCandidateInit }) => this.iceCandidate$.next(data));
    this.socket.on('chat', (msg: ChatMessage) => this.chat$.next(msg));
    this.socket.on('room-created', (data: { roomId: string; hasPassword: boolean }) => this.roomCreated$.next(data));
    this.socket.on('join-result', (data: { success: boolean; error?: string; requiresPassword?: boolean }) => this.joinResult$.next(data));
    this.socket.on('create-room-error', (data: { error: string }) => this.createRoomError$.next(data));
  }

  get onRoomUsers(): Observable<string[]> {
    return this.roomUsers$.asObservable();
  }

  get onUserJoined(): Observable<string> {
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

  joinRoom(roomId: string, password?: string): void {
    this.socket?.emit('join-room', { roomId, password });
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
