import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { VideoService, PresignResponse, PresignRequest, VideoMetadataDto } from '../../services/video.service';

@Component({
  selector: 'app-video-upload',
  templateUrl: './video-upload.component.html',
  styleUrls: ['./video-upload.component.css'],
  imports: [FormsModule],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoUploadComponent {
  courseId = signal<number | null>(null);
  lessonId = signal<number | null>(null);
  selectedFile = signal<File | null>(null);
  uploadStatus = signal<string | null>(null);

  constructor(private videoService: VideoService, private router: Router) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile.set(input.files[0]);
    }
  }

  isSuccessStatus(): boolean {
    const status = this.uploadStatus();
    return status ? status.toLowerCase().includes('successfully') || status.toLowerCase().includes('completed') : false;
  }

  goBack() {
    this.router.navigate(['/dashboard/courses']);
  }

  private clearStatusAfterDelay(delayMs: number = 5000) {
    setTimeout(() => {
      this.uploadStatus.set(null);
    }, delayMs);
  }

  async upload() {
    const cId = this.courseId();
    const lId = this.lessonId();
    const file = this.selectedFile();
    if (!cId || !lId || !file) {
      this.uploadStatus.set('Please fill all fields and choose a file');
      this.clearStatusAfterDelay(4000);
      return;
    }

    const presignReq: PresignRequest = {
      courseId: cId,
      lessonId: lId,
      fileName: file.name,
      fileSize: file.size,
    };

    try {
      const presign: PresignResponse = await lastValueFrom(this.videoService.getPresignedUrl(presignReq));

      // PUT the file directly
      const putResult = await fetch(presign.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });
      if (!putResult.ok) {
        throw new Error('Upload failed ' + putResult.status);
      }

      // save metadata
      const metadata: VideoMetadataDto = {
        courseId: cId,
        lessonId: lId,
        originalFileName: file.name,
        objectKey: presign.objectKey,
        fileSize: file.size,
      };
      await lastValueFrom(this.videoService.saveMetadata(metadata));
      
      // Success - reset form and show success message
      this.uploadStatus.set('Upload completed successfully!');
      this.courseId.set(null);
      this.lessonId.set(null);
      this.selectedFile.set(null);
      
      // Navigate back after 2 seconds to show success message
      setTimeout(() => {
        this.router.navigate(['/dashboard/courses']);
      }, 2000);
    } catch (err: any) {
      this.uploadStatus.set('Error: ' + (err.message || err));
      this.clearStatusAfterDelay(5000);
    }
  }
}
