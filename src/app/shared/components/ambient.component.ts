import { Component, effect, inject, signal, untracked } from '@angular/core';
import { environment } from '../../../environments/environment';
import { ThemeService } from '../../core/services/theme.service';

type Pair = [string | null, string | null];

/** خلفية مغبّشة من بوستر الفيلم الحالي. حطيها جوه عنصر position: relative */
@Component({
  selector: 'app-ambient',
  standalone: true,
  template: `
    <div class="stage">
      <div
        class="layer"
        [class.on]="front() === 0 && !!urls()[0]"
        [style.background-image]="bg(urls()[0])"
      ></div>
      <div
        class="layer"
        [class.on]="front() === 1 && !!urls()[1]"
        [style.background-image]="bg(urls()[1])"
      ></div>
    </div>
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      z-index: -1;
      overflow: clip;
      pointer-events: none;
      /* بتتلاشى من فوق ومن تحت عشان تدخل في باقي الصفحة من غير خط فاصل */
      -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 20%, #000 86%, transparent 100%);
      mask-image: linear-gradient(to bottom, transparent 0, #000 20%, #000 86%, transparent 100%);
    }

    /* ثابتة في الشاشة وإنتي بتسكرولي جوه القسم */
    .stage {
      position: sticky;
      top: 0;
      height: 100svh;
      overflow: hidden;
    }

    .layer {
      position: absolute;
      inset: -14%;
      background-size: cover;
      background-position: center;
      filter: blur(20px) saturate(1.45);
      opacity: 0;
      transition: opacity 1.4s var(--ease);
      will-change: opacity;
    }

    /* قوة اللون: زوّدي الرقم = خلفية أوضح */
    .layer.on { opacity: 1; }

    /* تعتيم خفيف على الأطراف عشان الكلام يفضل مقروء */
    .stage::after {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse at 50% 35%, transparent 0%, color-mix(in srgb, var(--bg) 78%, transparent) 100%),
        linear-gradient(color-mix(in srgb, var(--bg) 28%, transparent), color-mix(in srgb, var(--bg) 28%, transparent));
    }

    @media (prefers-reduced-motion: reduce) {
      .layer { transition-duration: 0.01ms; }
    }
  `,
})
export class AmbientComponent {
  private readonly theme = inject(ThemeService);

  readonly urls = signal<Pair>([null, null]);
  readonly front = signal<0 | 1>(0);
  private token = 0;

  constructor() {
    effect(() => {
      const p = this.theme.poster();
      untracked(() => this.show(p ? `${environment.imgUrl}/w342${p}` : null));
    });
  }

  bg(url: string | null): string {
    return url ? `url("${url}")` : 'none';
  }

  private show(url: string | null): void {
    const t = ++this.token;

    const apply = () => {
      if (t !== this.token) return; // وصل طلب أحدث، تجاهلي ده
      const next: 0 | 1 = this.front() === 0 ? 1 : 0;
      this.urls.update((u) => {
        const copy: Pair = [u[0], u[1]];
        copy[next] = url;
        return copy;
      });
      this.front.set(next);
    };

    if (!url) {
      apply();
      return;
    }

    // نحمّل الصورة الأول عشان الـ fade مايظهرش فاضي
    const img = new Image();
    img.onload = apply;
    img.src = url;
  }
}