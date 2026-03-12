import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
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
    // stub for UI
  }

  uploadVideo() {
    // stub for UI
  }

  createAssignment() {
    // stub for UI
  }
}
