import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  CreateReminderRequest,
  StudyReminder,
  TelegramConfigService,
  TelegramContact,
  TelegramUser,
} from '../../services/telegram-config.service';

interface DayOption {
  key: string; // DayOfWeek name
  label: string; // VN short label
}

@Component({
  selector: 'app-telegram-config',
  templateUrl: './telegram-config.component.html',
  styleUrl: './telegram-config.component.css',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TelegramConfigComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly days: DayOption[] = [
    { key: 'MONDAY', label: 'T2' },
    { key: 'TUESDAY', label: 'T3' },
    { key: 'WEDNESDAY', label: 'T4' },
    { key: 'THURSDAY', label: 'T5' },
    { key: 'FRIDAY', label: 'T6' },
    { key: 'SATURDAY', label: 'T7' },
    { key: 'SUNDAY', label: 'CN' },
  ];

  // ---- State ----
  contacts = signal<TelegramContact[]>([]);
  users = signal<TelegramUser[]>([]);
  reminders = signal<StudyReminder[]>([]);

  loadingContacts = signal(false);
  loadingUsers = signal(false);
  loadingReminders = signal(false);
  submitting = signal(false);

  linkedUsers = computed(() => this.users().filter((u) => !!u.telegramChatId));

  selectedDays = signal<Set<string>>(new Set(['MONDAY', 'WEDNESDAY', 'FRIDAY']));

  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error' | 'info'>('success');
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  assignForm: FormGroup;
  reminderForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private telegramService: TelegramConfigService,
    private router: Router
  ) {
    this.assignForm = this.fb.group({
      chatId: ['', Validators.required],
      userId: [null, Validators.required],
    });
    this.reminderForm = this.fb.group({
      userId: [null, Validators.required],
      type: ['TEXT'],
      remindTime: ['20:00', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
      message: [''],
    });
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.loadUsers();
      this.loadReminders();
    }
  }

  // ==================== Telegram contacts ====================

  loadContacts(): void {
    this.loadingContacts.set(true);
    this.telegramService.getContacts().subscribe({
      next: (data) => {
        this.contacts.set(data);
        this.loadingContacts.set(false);
        if (data.length === 0) {
          this.showToast('Chưa có ai nhắn tin cho bot trong 24h qua.', 'info');
        }
      },
      error: (err) => {
        this.loadingContacts.set(false);
        this.showToast(this.errText(err, 'Không lấy được danh sách người nhắn bot.'), 'error');
      },
    });
  }

  loadUsers(): void {
    this.loadingUsers.set(true);
    this.telegramService.getTelegramUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.loadingUsers.set(false);
      },
      error: (err) => {
        this.loadingUsers.set(false);
        this.showToast(this.errText(err, 'Không tải được danh sách người dùng.'), 'error');
      },
    });
  }

  /** Pre-fill the assign form with a chosen contact's chatId. */
  pickContact(contact: TelegramContact): void {
    this.assignForm.patchValue({ chatId: contact.chatId });
    this.showToast(`Đã chọn chat_id ${contact.chatId}. Hãy chọn người dùng để gán.`, 'info');
  }

  assign(): void {
    this.assignForm.markAllAsTouched();
    if (this.assignForm.invalid) {
      this.showToast('Vui lòng chọn chat_id và người dùng.', 'error');
      return;
    }
    const chatId: string = this.assignForm.value.chatId;
    const userId: number = this.assignForm.value.userId;
    const contact = this.contacts().find((c) => c.chatId === chatId);
    this.submitting.set(true);
    this.telegramService
      .assign({ userId, chatId, telegramUsername: contact?.username ?? null })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.showToast('Đã gắn Telegram cho người dùng.', 'success');
          this.assignForm.reset();
          this.loadUsers();
        },
        error: (err) => {
          this.submitting.set(false);
          this.showToast(this.errText(err, 'Gán chat_id thất bại.'), 'error');
        },
      });
  }

  unassign(user: TelegramUser): void {
    this.telegramService.unassign(user.userId).subscribe({
      next: () => {
        this.showToast(`Đã bỏ gắn Telegram của ${user.fullName}.`, 'success');
        this.loadUsers();
      },
      error: (err) => this.showToast(this.errText(err, 'Bỏ gắn thất bại.'), 'error'),
    });
  }

  sendTest(user: TelegramUser): void {
    this.telegramService
      .sendMessage({ userId: user.userId, message: '✅ Tin nhắn thử từ hệ thống nhắc học bài.' })
      .subscribe({
        next: () => this.showToast(`Đã gửi tin thử tới ${user.fullName}.`, 'success'),
        error: (err) => this.showToast(this.errText(err, 'Gửi tin thử thất bại.'), 'error'),
      });
  }

  // ==================== Reminders ====================

  loadReminders(): void {
    this.loadingReminders.set(true);
    this.telegramService.listReminders().subscribe({
      next: (data) => {
        this.reminders.set(data);
        this.loadingReminders.set(false);
      },
      error: (err) => {
        this.loadingReminders.set(false);
        this.showToast(this.errText(err, 'Không tải được danh sách lịch nhắc.'), 'error');
      },
    });
  }

  toggleDay(key: string): void {
    this.selectedDays.update((set) => {
      const next = new Set(set);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  isDaySelected(key: string): boolean {
    return this.selectedDays().has(key);
  }

  createReminder(): void {
    this.reminderForm.markAllAsTouched();
    const daysArr = this.days.map((d) => d.key).filter((k) => this.selectedDays().has(k));
    if (this.reminderForm.invalid) {
      this.showToast('Vui lòng chọn người dùng và nhập giờ hợp lệ (HH:mm).', 'error');
      return;
    }
    if (daysArr.length === 0) {
      this.showToast('Vui lòng chọn ít nhất một ngày trong tuần.', 'error');
      return;
    }
    const type = this.reminderForm.value.type === 'VOCAB_QUIZ' ? 'VOCAB_QUIZ' : 'TEXT';
    const request: CreateReminderRequest = {
      userId: this.reminderForm.value.userId,
      remindTime: this.reminderForm.value.remindTime,
      daysOfWeek: daysArr,
      type,
      message: type === 'VOCAB_QUIZ' ? null : this.reminderForm.value.message?.trim() || null,
    };
    this.submitting.set(true);
    this.telegramService.createReminder(request).subscribe({
      next: () => {
        this.submitting.set(false);
        this.showToast('Tạo lịch nhắc thành công.', 'success');
        this.reminderForm.patchValue({ message: '' });
        this.loadReminders();
      },
      error: (err) => {
        this.submitting.set(false);
        this.showToast(this.errText(err, 'Tạo lịch nhắc thất bại.'), 'error');
      },
    });
  }

  toggleReminder(reminder: StudyReminder): void {
    this.telegramService.toggleReminder(reminder.id).subscribe({
      next: () => {
        this.showToast('Đã cập nhật trạng thái lịch.', 'success');
        this.loadReminders();
      },
      error: (err) => this.showToast(this.errText(err, 'Cập nhật trạng thái thất bại.'), 'error'),
    });
  }

  deleteReminder(reminder: StudyReminder): void {
    this.telegramService.deleteReminder(reminder.id).subscribe({
      next: () => {
        this.showToast('Đã xóa lịch nhắc.', 'success');
        this.loadReminders();
      },
      error: (err) => this.showToast(this.errText(err, 'Xóa lịch nhắc thất bại.'), 'error'),
    });
  }

  sendReminderNow(reminder: StudyReminder): void {
    this.telegramService.sendReminderNow(reminder.id).subscribe({
      next: () => this.showToast('Đã gửi nhắc ngay.', 'success'),
      error: (err) => this.showToast(this.errText(err, 'Gửi nhắc thất bại.'), 'error'),
    });
  }

  // ==================== Helpers ====================

  dayLabels(keys: string[]): string {
    return keys
      .map((k) => this.days.find((d) => d.key === k)?.label ?? k)
      .join(', ');
  }

  /** True when the reminder form is currently set to the vocab-quiz type. */
  isQuizType(): boolean {
    return this.reminderForm.value.type === 'VOCAB_QUIZ';
  }

  typeLabel(type: string): string {
    return type === 'VOCAB_QUIZ' ? 'Quiz từ vựng' : 'Văn bản';
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  private errText(err: unknown, fallback: string): string {
    const e = err as { error?: { message?: string }; message?: string };
    return e?.error?.message || e?.message || fallback;
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => this.toastMessage.set(null), 3500);
  }

  dismissToast(): void {
    this.toastMessage.set(null);
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }
}
