import { Component, signal, ChangeDetectionStrategy, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface Course {
  id: number;
  title: string;
  description: string;
}

interface Lesson {
  id: number;
  title: string;
}

@Component({
  selector: 'app-course-management',
  templateUrl: './course-management.component.html',
  styleUrl: './course-management.component.css',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class CourseManagementComponent {
  courses = signal<Course[]>([
    { id: 1, title: 'Ngôn ngữ lập trình Java', description: 'Khóa học cơ bản về Java' },
    { id: 2, title: 'Phát triển Web với Angular', description: 'Xây dựng ứng dụng với Angular' },
  ]);

  selectedCourse = signal<Course | null>(null);

  // placeholder lists
  lessons = signal<Lesson[]>([
    { id: 1, title: 'Giới thiệu' },
    { id: 2, title: 'Cài đặt môi trường' },
  ]);

  // form state
  showCourseForm = signal(false);
  courseFormTitle = signal('');
  courseFormDescription = signal('');
  isEditing = signal(false);

  // lesson form state
  showLessonForm = signal(false);
  lessonFormTitle = signal('');
  lessonEditingIndex: number | null = null;

  constructor() {
    // Auto-select first course on init
    effect(() => {
      const allCourses = this.courses();
      if (allCourses.length > 0 && !this.selectedCourse()) {
        this.selectedCourse.set(allCourses[0]);
      }
    });
  }

  selectCourse(course: Course) {
    this.selectedCourse.set(course);
  }

  openNewCourseForm() {
    this.showCourseForm.set(true);
    this.isEditing.set(false);
    this.courseFormTitle.set('');
    this.courseFormDescription.set('');
  }

  openEditCourse(course: Course) {
    this.selectCourse(course);
    this.showCourseForm.set(true);
    this.isEditing.set(true);
    this.courseFormTitle.set(course.title);
    this.courseFormDescription.set(course.description);
  }

  closeForm() {
    this.showCourseForm.set(false);
  }

  // stubs, no actual implementation
  saveCourse() {
    this.closeForm();
  }

  deleteCourse(course: Course) {
    // stub
    if (this.selectedCourse() === course) {
      this.selectedCourse.set(null);
    }
  }

  addLesson() {
    this.showLessonForm.set(true);
    this.lessonFormTitle.set('');
    this.lessonEditingIndex = null;
  }

  openEditLesson(index: number, lesson: Lesson) {
    this.showLessonForm.set(true);
    this.lessonFormTitle.set(lesson.title);
    this.lessonEditingIndex = index;
  }

  closeLessonForm() {
    this.showLessonForm.set(false);
    this.lessonFormTitle.set('');
    this.lessonEditingIndex = null;
  }

  saveLesson() {
    const title = this.lessonFormTitle().trim();
    if (!title) return;

    const currentLessons = this.lessons();
    if (this.lessonEditingIndex !== null) {
      // Edit existing lesson
      currentLessons[this.lessonEditingIndex].title = title;
      this.lessons.set([...currentLessons]);
    } else {
      // Add new lesson
      const newLesson: Lesson = {
        id: currentLessons.length > 0 ? Math.max(...currentLessons.map(l => l.id)) + 1 : 1,
        title: title,
      };
      this.lessons.set([...currentLessons, newLesson]);
    }
    this.closeLessonForm();
  }

  deleteLesson(index: number) {
    const currentLessons = this.lessons();
    this.lessons.set(currentLessons.filter((_, i) => i !== index));
  }

  uploadVideo() {
    // stub for UI
  }

  createAssignment() {
    // stub for UI
  }
}
