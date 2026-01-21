import { Directive, ElementRef, input, effect } from '@angular/core';

@Directive({
  selector: 'video[srcObject]',
})
export class SrcObjectDirective {
  readonly srcObject = input<MediaStream | null>(null);

  constructor(private el: ElementRef<HTMLVideoElement>) {
    effect(() => {
      const stream = this.srcObject();
      if (this.el.nativeElement) {
        this.el.nativeElement.srcObject = stream;
      }
    });
  }
}
