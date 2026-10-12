import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  input,
  numberAttribute,
} from '@angular/core';

/** بيظهر العنصر بأنيميشن لما يدخل الشاشة. الاستخدام: appReveal أو [appReveal]="120" (تأخير بالمللي ثانية) */
@Directive({
  selector: '[appReveal]',
  standalone: true,
  host: {
    class: 'reveal',
    '[style.--reveal-delay]': 'delay() + "ms"',
  },
})
export class RevealDirective implements OnInit, OnDestroy {
  readonly delay = input(0, {
    alias: 'appReveal',
    transform: (v: unknown) => numberAttribute(v, 0),
  });

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      this.el.classList.add('in');
      return;
    }
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.el.classList.add('in');
          this.observer?.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    this.observer.observe(this.el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}