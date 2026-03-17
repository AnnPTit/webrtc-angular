import { Component, signal, ChangeDetectionStrategy, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CourseService, type Course, type Lesson, type CreateLessonRequest, type Video } from '../../services/course.service';
import { VideoService, type PresignRequest, type VideoMetadataDto } from '../../services/video.service';

@Component({
  selector: 'app-course-management',
  templateUrl: './course-management.component.html',
  styleUrl: './course-management.component.css',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class CourseManagementComponent {
  private courseService = inject(CourseService);
  private videoService = inject(VideoService);
  private router = inject(Router);

  courses = signal<Course[]>([]);
  selectedCourse = signal<Course | null>(null);
  searchQuery = signal('');

  // Lessons from backend
  lessons = signal<Lesson[]>([]);

  // Videos from backend
  videos = signal<Video[]>([]);
  signedVideoUrls = signal<Map<number, string>>(new Map());
  lessonVideosLoading = signal(false);
  expandedLessonId: number | null = null;

  // form state
  showCourseForm = signal(false);
  courseFormTitle = signal('');
  courseFormDescription = signal('');
  isEditing = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');

  // lesson form state
  showLessonForm = signal(false);
  lessonFormTitle = signal('');
  lessonFormDescription = signal('');
  lessonLoading = signal(false);
  lessonEditingId: number | null = null;

  // video upload form state
  showVideoUploadForm = signal(false);
  selectedLessonForVideo: Lesson | null = null;
  videoLoading = signal(false);
  videoUploadProgress = signal(0);
  videoFile: File | null = null;

  constructor() {
    // Load courses on init
    this.loadCourses();

    // Auto-select first course on init
    effect(() => {
      const allCourses = this.courses();
      if (allCourses.length > 0 && !this.selectedCourse()) {
        this.selectedCourse.set(allCourses[0]);
      }
    });

    // Load lessons when course is selected
    effect(() => {
      const course = this.selectedCourse();
      if (course) {
        this.loadLessonsByCourse(course.id);
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  loadCourses() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.courseService.getAllCourses().subscribe({
      next: (data) => {
        this.courses.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading courses:', err);
        this.errorMessage.set('Lỗi tải khóa học');
        this.isLoading.set(false);
      },
    });
  }

  loadLessonsByCourse(courseId: number) {
    this.lessonLoading.set(true);
    this.courseService.getLessonsByCourseId(courseId).subscribe({
      next: (data) => {
        this.lessons.set(data);
        this.lessonLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading lessons:', err);
        this.lessons.set([]);
        this.lessonLoading.set(false);
      },
    });
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
    if (query.trim() === '') {
      this.loadCourses();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.courseService.searchCourses(query).subscribe({
      next: (data) => {
        this.courses.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error searching courses:', err);
        this.errorMessage.set('Lỗi tìm kiếm khóa học');
        this.isLoading.set(false);
      },
    });
  }

  selectCourse(course: Course) {
    this.selectedCourse.set(course);
    this.loadLessonsByCourse(course.id);
  }

  openNewCourseForm() {
    this.showCourseForm.set(true);
    this.isEditing.set(false);
    this.courseFormTitle.set('');
    this.courseFormDescription.set('');
    this.errorMessage.set('');
  }

  openEditCourse(course: Course) {
    this.selectCourse(course);
    this.showCourseForm.set(true);
    this.isEditing.set(true);
    this.courseFormTitle.set(course.title);
    this.courseFormDescription.set(course.description);
    this.errorMessage.set('');
  }

  closeForm() {
    this.showCourseForm.set(false);
  }

  // Save course to backend
  saveCourse() {
    const title = this.courseFormTitle().trim();
    const description = this.courseFormDescription().trim();

    if (!title || !description) {
      this.errorMessage.set('Vui lòng điền tiêu đề và mô tả');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const courseData = { title, description };

    if (this.isEditing()) {
      // Update existing course
      const courseId = this.selectedCourse()?.id;
      if (!courseId) return;

      this.courseService.updateCourse(courseId, courseData).subscribe({
        next: (updatedCourse) => {
          const currentCourses = this.courses();
          const index = currentCourses.findIndex(c => c.id === courseId);
          if (index !== -1) {
            currentCourses[index] = updatedCourse;
            this.courses.set([...currentCourses]);
          }
          this.isLoading.set(false);
          this.closeForm();
        },
        error: (err) => {
          console.error('Error updating course:', err);
          this.errorMessage.set('Lỗi cập nhật khóa học');
          this.isLoading.set(false);
        },
      });
    } else {
      // Create new course
      this.courseService.createCourse(courseData).subscribe({
        next: (newCourse) => {
          this.courses.set([...this.courses(), newCourse]);
          this.isLoading.set(false);
          this.closeForm();
        },
        error: (err) => {
          console.error('Error creating course:', err);
          this.errorMessage.set('Lỗi tạo khóa học');
          this.isLoading.set(false);
        },
      });
    }
  }

  deleteCourse(course: Course) {
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa khóa học "${course.title}" không?`
      )
    ) {
      return;
    }

    this.isLoading.set(true);
    this.courseService.deleteCourse(course.id).subscribe({
      next: () => {
        const currentCourses = this.courses();
        this.courses.set(
          currentCourses.filter(c => c.id !== course.id)
        );
        if (this.selectedCourse()?.id === course.id) {
          this.selectedCourse.set(null);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error deleting course:', err);
        this.errorMessage.set('Lỗi xóa khóa học');
        this.isLoading.set(false);
      },
    });
  }

  addLesson() {
    this.showLessonForm.set(true);
    this.lessonFormTitle.set('');
    this.lessonFormDescription.set('');
    this.lessonEditingId = null;
  }

  openEditLesson(lesson: Lesson) {
    this.showLessonForm.set(true);
    this.lessonFormTitle.set(lesson.title);
    this.lessonFormDescription.set(lesson.description);
    this.lessonEditingId = lesson.id;
  }

  closeLessonForm() {
    this.showLessonForm.set(false);
    this.lessonFormTitle.set('');
    this.lessonFormDescription.set('');
    this.lessonEditingId = null;
  }

  saveLesson() {
    const title = this.lessonFormTitle().trim();
    const description = this.lessonFormDescription().trim();
    const courseId = this.selectedCourse()?.id;

    if (!title || !description || !courseId) {
      this.errorMessage.set('Vui lòng điền tiêu đề, mô tả');
      return;
    }

    this.lessonLoading.set(true);
    this.errorMessage.set('');

    if (this.lessonEditingId !== null) {
      // Update existing lesson
      this.courseService.updateLesson(this.lessonEditingId, { title, description }).subscribe({
        next: (updatedLesson) => {
          const currentLessons = this.lessons();
          const index = currentLessons.findIndex(l => l.id === this.lessonEditingId);
          if (index !== -1) {
            currentLessons[index] = updatedLesson;
            this.lessons.set([...currentLessons]);
          }
          this.lessonLoading.set(false);
          this.closeLessonForm();
        },
        error: (err) => {
          console.error('Error updating lesson:', err);
          this.errorMessage.set('Lỗi cập nhật bài học');
          this.lessonLoading.set(false);
        },
      });
    } else {
      // Create new lesson
      const lessonData: CreateLessonRequest = { courseId, title, description };
      this.courseService.createLesson(lessonData).subscribe({
        next: (newLesson) => {
          this.lessons.set([...this.lessons(), newLesson]);
          this.lessonLoading.set(false);
          this.closeLessonForm();
        },
        error: (err) => {
          console.error('Error creating lesson:', err);
          this.errorMessage.set('Lỗi tạo bài học');
          this.lessonLoading.set(false);
        },
      });
    }
  }

  deleteLesson(lesson: Lesson) {
    if (!confirm(`Bạn có chắc chắn muốn xóa bài học "${lesson.title}" không?`)) {
      return;
    }

    this.lessonLoading.set(true);
    this.courseService.deleteLesson(lesson.id).subscribe({
      next: () => {
        const currentLessons = this.lessons();
        this.lessons.set(currentLessons.filter(l => l.id !== lesson.id));
        this.lessonLoading.set(false);
      },
      error: (err) => {
        console.error('Error deleting lesson:', err);
        this.errorMessage.set('Lỗi xóa bài học');
        this.lessonLoading.set(false);
      },
    });
  }

  uploadVideo() {
    // stub for UI
  }

  openVideoUploadForm(lesson: Lesson) {
    this.selectedLessonForVideo = lesson;
    this.showVideoUploadForm.set(true);
    this.videoFile = null;
    this.videoUploadProgress.set(0);
    this.errorMessage.set('');
  }

  closeVideoUploadForm() {
    this.showVideoUploadForm.set(false);
    this.selectedLessonForVideo = null;
    this.videoFile = null;
    this.videoUploadProgress.set(0);
  }

  onVideoFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      // Only accept video files
      if (file.type.startsWith('video/')) {
        this.videoFile = file;
        this.errorMessage.set('');
      } else {
        this.videoFile = null;
        this.errorMessage.set('Vui lòng chọn file video');
      }
    }
  }

  submitVideoUpload() {
    if (!this.videoFile || !this.selectedLessonForVideo) {
      this.errorMessage.set('Vui lòng chọn file video');
      return;
    }

    const courseId = this.selectedCourse()?.id;
    const lessonId = this.selectedLessonForVideo.id;

    if (!courseId) {
      this.errorMessage.set('Lỗi: Khóa học không tồn tại');
      return;
    }

    this.videoLoading.set(true);
    this.errorMessage.set('');

    // Step 1: Get presigned URL
    const presignReq: PresignRequest = {
      courseId,
      lessonId,
      fileName: this.videoFile.name,
      fileSize: this.videoFile.size,
    };

    this.videoService.getPresignedUrl(presignReq).subscribe({
      next: (presignRes) => {
        // Step 2: Upload file to presigned URL
        this.uploadToPresignedUrl(presignRes.uploadUrl, presignRes.objectKey);
      },
      error: (err) => {
        console.error('Error getting presigned URL:', err);
        this.errorMessage.set('Lỗi lấy URL upload');
        this.videoLoading.set(false);
      },
    });
  }

  private uploadToPresignedUrl(uploadUrl: string, objectKey: string) {
    if (!this.videoFile) return;

    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        this.videoUploadProgress.set(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Step 3: Save metadata
        this.saveVideoMetadata(objectKey);
      } else {
        console.error('Upload failed with status:', xhr.status);
        this.errorMessage.set('Lỗi upload file');
        this.videoLoading.set(false);
      }
    });

    xhr.addEventListener('error', () => {
      console.error('Upload error');
      this.errorMessage.set('Lỗi upload file');
      this.videoLoading.set(false);
    });

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', this.videoFile.type);
    xhr.send(this.videoFile);
  }

  private saveVideoMetadata(objectKey: string) {
    if (!this.videoFile || !this.selectedLessonForVideo) return;

    const courseId = this.selectedCourse()?.id;
    const lessonId = this.selectedLessonForVideo.id;

    if (!courseId) {
      this.errorMessage.set('Lỗi: Khóa học không tồn tại');
      this.videoLoading.set(false);
      return;
    }

    const metadataDto: VideoMetadataDto = {
      courseId,
      lessonId,
      originalFileName: this.videoFile.name,
      objectKey,
      fileSize: this.videoFile.size,
    };

    this.videoService.saveMetadata(metadataDto).subscribe({
      next: () => {
        this.videoLoading.set(false);
        this.closeVideoUploadForm();
        this.errorMessage.set('');
        // Reload videos after upload
        if (this.expandedLessonId && this.selectedCourse()) {
          this.loadVideosByLesson(this.selectedCourse()!.id, this.expandedLessonId);
        }
      },
      error: (err) => {
        console.error('Error saving video metadata:', err);
        this.errorMessage.set('Lỗi lưu thông tin video');
        this.videoLoading.set(false);
      },
    });
  }

  toggleLessonVideos(lesson: Lesson) {
    const courseId = this.selectedCourse()?.id;
    if (!courseId) return;

    if (this.expandedLessonId === lesson.id) {
      // Close if already open
      this.expandedLessonId = null;
      this.videos.set([]);
    } else {
      // Open and load videos
      this.expandedLessonId = lesson.id;
      this.loadVideosByLesson(courseId, lesson.id);
    }
  }

  loadVideosByLesson(courseId: number, lessonId: number) {
    this.lessonVideosLoading.set(true);
    this.courseService.getVideosByLesson(courseId, lessonId).subscribe({
      next: (data) => {
        this.videos.set(data);
        this.signedVideoUrls.set(new Map());

        // Fetch signed URLs for all videos
        data.forEach((video) => {
          this.courseService.getSignedVideoUrl(video.objectKey).subscribe({
            next: (response) => {
              const currentMap = this.signedVideoUrls();
              currentMap.set(video.id, response.signedUrl);
              this.signedVideoUrls.set(new Map(currentMap));
            },
            error: (err) => {
              console.error(`Error fetching signed URL for video ${video.id}:`, err);
              // Fallback to original videoUrl if signed URL fails
              const currentMap = this.signedVideoUrls();
              currentMap.set(video.id, video.videoUrl);
              this.signedVideoUrls.set(new Map(currentMap));
            },
          });
        });

        this.lessonVideosLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading videos:', err);
        this.videos.set([]);
        this.signedVideoUrls.set(new Map());
        this.lessonVideosLoading.set(false);
      },
    });
  }

  deleteVideo(video: Video) {
    if (!confirm(`Bạn có chắc chắn muốn xóa video "${video.originalFileName}" không?`)) {
      return;
    }

    this.lessonVideosLoading.set(true);
    this.courseService.deleteVideo(video.id).subscribe({
      next: () => {
        const currentVideos = this.videos();
        this.videos.set(currentVideos.filter(v => v.id !== video.id));
        this.lessonVideosLoading.set(false);
      },
      error: (err) => {
        console.error('Error deleting video:', err);
        this.errorMessage.set('Lỗi xóa video');
        this.lessonVideosLoading.set(false);
      },
    });
  }

  getVideoUrl(videoId: number): string {
    return this.signedVideoUrls().get(videoId) || '';
  }

  createAssignment() {
    // stub for UI
  }
}
