import { Directive, ElementRef, OnDestroy, inject } from '@angular/core';

/** ميلان 3D مع حركة الماوس. بيحدّث المتغيرين --rx و --ry على العنصر */
@Directive({
  selector: '[appTilt]',
  standalone: true,
  host: {
    '(pointermove)': 'onMove($event)',
    '(pointerleave)': 'reset()',
  },
})
export class TiltDirective implements OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly enabled =
    typeof matchMedia === 'function' &&
    matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches;
  private frame = 0;
  private readonly max = 12; // أقصى زاوية بالدرجات

  onMove(e: PointerEvent): void {
    if (!this.enabled || e.pointerType !== 'mouse') return;

    const rect = this.el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      this.el.style.setProperty('--rx', `${((0.5 - y) * this.max * 2).toFixed(2)}deg`);
      this.el.style.setProperty('--ry', `${((x - 0.5) * this.max * 2).toFixed(2)}deg`);
    });
  }

  reset(): void {
    cancelAnimationFrame(this.frame);
    this.el.style.setProperty('--rx', '0deg');
    this.el.style.setProperty('--ry', '0deg');
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
  }
}