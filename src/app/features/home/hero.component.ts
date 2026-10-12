import { Component, computed, inject, input, model, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TiltDirective } from '../../core/directives/tilt.directive';
import { Genre, Movie } from '../../core/models/movie.model';
import { TmdbService } from '../../core/services/tmdb.service';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterLink, TiltDirective],
  host: {
    '(keydown.arrowright)': 'next()',
    '(keydown.arrowleft)': 'prev()',
  },
  template: `
    <section
      class="hero"
      [class.auto]="autoplay"
      [class.paused]="paused()"
      (pointerenter)="paused.set($event.pointerType === 'mouse')"
      (pointerleave)="paused.set(false)"
      (pointerdown)="onPointerDown($event)"
      (pointerup)="onPointerUp($event)"
      (focusin)="paused.set(true)"
      (focusout)="paused.set(false)"
    >
      @for (m of movies(); track m.id; let i = $index) {
        <article
          class="slide"
          [class.active]="i === index()"
          [attr.aria-hidden]="i !== index()"
          [attr.inert]="i !== index() ? '' : null"
        >
          <div class="bg">
            <img
              [src]="tmdb.backdrop(m.backdrop_path, 'w1280')"
              alt=""
              [attr.fetchpriority]="i === 0 ? 'high' : null"
            />
          </div>

          <div class="container content">
            <div class="text">
              <p class="eyebrow r" style="--d: 0">
                Trending this week · {{ pad(i + 1) }} / {{ pad(movies().length) }}
              </p>

              <h1 class="title" [attr.aria-label]="m.title">
                @for (w of words(m.title); track $index) {
                  <span class="word" aria-hidden="true">
                    <span class="w" [style.--i]="$index">{{ w }}</span>
                  </span>
                }
              </h1>

              <p class="meta r" style="--d: 4">
                <span>{{ year(m) }}</span>
                <i>/</i>
                <span>★ {{ rating(m) }}</span>
                @if (genreText(m); as g) {
                  <i>/</i>
                  <span>{{ g }}</span>
                }
              </p>

              <p class="overview r" style="--d: 5">{{ m.overview }}</p>

              <div class="actions r" style="--d: 6">
                <a class="cta" [routerLink]="['/movie', m.id]">
                  <span>View details</span>
                  <span class="arrow" aria-hidden="true">→</span>
                </a>
              </div>
            </div>

            <div class="poster-wrap r" style="--d: 3">
              <div class="poster" appTilt>
                <img [src]="tmdb.poster(m.poster_path, 'w500')" [alt]="m.title" />
              </div>
            </div>
          </div>
        </article>
      } @empty {
        <div class="loading">Loading…</div>
      }

      @if (movies().length) {
        <div class="container controls">
          <div class="steps">
            @for (m of movies(); track m.id; let i = $index) {
              <button
                type="button"
                class="step"
                [class.on]="i === index()"
                [attr.aria-label]="'Show ' + m.title"
                (click)="go(i)"
                (animationend)="i === index() && next()"
              >
                {{ pad(i + 1) }}
              </button>
            }
          </div>
          <div class="nav">
            <button type="button" aria-label="Previous" (click)="prev()">←</button>
            <button type="button" aria-label="Next" (click)="next()">→</button>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    :host { display: block; }

    .hero {
      position: relative;
      display: grid;
      min-height: min(100svh, 900px);
      overflow: hidden;
      background: var(--bg);
      touch-action: pan-y; /* السحب الأفقي بيبدّل الأفلام، والرأسي بيعمل سكرول عادي */
    }

    .loading {
      grid-area: 1 / 1;
      display: grid;
      place-items: center;
      color: var(--muted);
    }

    /* ---------- السلايد (المحتوى في النص رأسياً) ---------- */
    .slide {
      grid-area: 1 / 1;
      position: relative;
      display: grid;
      align-items: center;
      padding-block: 6.5rem 6.5rem;
      visibility: hidden;
      transition: visibility 0s linear 1.2s;
    }

    .slide.active {
      visibility: visible;
      z-index: 2;
      transition-delay: 0s;
    }

    /* ---------- الخلفية ---------- */
    .bg {
      position: absolute;
      inset: 0;
      opacity: 0;
      transition: opacity 1.2s ease;
    }

    .active .bg { opacity: 1; }

    .bg img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scale(1.14);
      transition: transform 0s linear 1.2s;
    }

    .active .bg img {
      transform: scale(1);
      transition: transform 9s var(--ease-out);
    }

    .bg::after {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(to top, var(--bg) 2%, color-mix(in srgb, var(--bg) 40%, transparent) 42%, transparent 75%),
        linear-gradient(to right, color-mix(in srgb, var(--bg) 88%, transparent) 0%, transparent 68%);
    }

    /* ---------- المحتوى ---------- */
    .content {
      position: relative;
      z-index: 1;
      display: grid;
      gap: 2rem;
      align-items: center;
    }

    .text { max-width: 46rem; min-width: 0; }

    .r {
      opacity: 0;
      transform: translateY(26px);
      transition: opacity 0.35s ease, transform 0.35s ease;
    }

    .active .r {
      opacity: 1;
      transform: none;
      transition:
        opacity 0.9s var(--ease-out) calc(var(--d, 0) * 90ms + 300ms),
        transform 1s var(--ease-out) calc(var(--d, 0) * 90ms + 300ms);
    }

    .title {
      font-size: clamp(2.4rem, min(7vw, 10.5vh), 6.2rem);
      margin-block: 0.8rem 1rem;
    }

    .word {
      display: inline-block;
      overflow: hidden;
      vertical-align: top;
      padding-bottom: 0.14em;
      margin-bottom: -0.14em;
      margin-right: 0.2em;
    }

    .w {
      display: inline-block;
      transform: translateY(118%);
      transition: transform 0.45s ease;
    }

    .active .w {
      transform: none;
      transition: transform 1.1s var(--ease-out) calc(var(--i, 0) * 90ms + 250ms);
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem 0.9rem;
      font-weight: 500;
    }

    .meta i { font-style: normal; color: var(--accent); }

    .overview {
      max-width: 38rem;
      margin-top: 0.8rem;
      color: color-mix(in srgb, var(--fg) 82%, transparent);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .actions { margin-top: 1.3rem; }

    .cta {
      display: inline-flex;
      align-items: center;
      gap: 0.9rem;
      padding: 0.8rem 1.4rem;
      border-radius: 999px;
      font-weight: 700;
      background: var(--fg);
      color: var(--bg);
      transition: transform 0.5s var(--ease-out), background-color 0.4s ease;
    }

    .arrow { display: inline-block; transition: transform 0.5s var(--ease-out); }

    @media (hover: hover) {
      .cta:hover { background: var(--accent); transform: translateY(-3px); }
      .cta:hover .arrow { transform: translateX(7px); }
    }

    /* ---------- البوستر (الديسكتوب بس) ---------- */
    .poster-wrap { display: none; }

    .poster {
      aspect-ratio: 2 / 3;
      overflow: hidden;
      border-radius: var(--radius);
      box-shadow: 0 32px 60px -30px rgb(0 0 0 / 0.75);
      transform: perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
      transition: transform 0.6s var(--ease-out);
    }

    .poster img { width: 100%; height: 100%; object-fit: cover; }

    @media (min-width: 900px) {
      .content { grid-template-columns: minmax(0, 1fr) auto; }
      .poster-wrap {
        display: block;
        width: min(clamp(190px, 20vw, 300px), 33vh);
      }
    }

    /* ---------- التحكم ---------- */
    .controls {
      position: absolute;
      inset-inline: 0;
      bottom: 1.6rem;
      z-index: 5;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1rem;
    }

    .steps { display: flex; gap: clamp(0.7rem, 2vw, 1.5rem); }

    .step {
      position: relative;
      min-width: 2.2rem;
      padding: 0 0.1rem 0.85rem;
      text-align: left;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--muted);
      transition: color 0.4s ease;
    }

    .step:hover, .step.on { color: var(--fg); }

    .step::before, .step::after {
      content: '';
      position: absolute;
      left: 0;
      bottom: 0;
      height: 2px;
    }

    .step::before { width: 100%; background: var(--line); }
    .step::after { width: 0; background: var(--accent); }
    .step.on::after { width: 100%; }

    .auto .step.on::after {
      width: 0;
      animation: fill 7s linear forwards;
    }

    .paused .step.on::after { animation-play-state: paused; }

    @keyframes fill { to { width: 100%; } }

    .nav { display: flex; gap: 0.5rem; }

    .nav button {
      width: 2.8rem;
      height: 2.8rem;
      border: 1px solid var(--line);
      border-radius: 50%;
      transition: background-color 0.4s ease, color 0.4s ease, transform 0.5s var(--ease-out);
    }

    .nav button:hover { background: var(--fg); color: var(--bg); transform: translateY(-3px); }

    /* ---------- تابلت وموبايل ---------- */
    @media (max-width: 899px) {
      /* النص بياخد عرض الشاشة كله وفي نص الصورة، فبنخلي التدرج متوازن عشان يبان على أي صورة */
      .bg::after {
        background: linear-gradient(
          to top,
          var(--bg) 6%,
          color-mix(in srgb, var(--bg) 72%, transparent) 45%,
          color-mix(in srgb, var(--bg) 52%, transparent) 100%
        );
      }
    }

    @media (max-width: 600px) {
      .slide { padding-block: 5.5rem 5.2rem; }
      .title { font-size: clamp(2.2rem, 11vw, 3.4rem); }
      .cta { padding: 0.75rem 1.25rem; }
      .nav { display: none; } /* على الموبايل بنسحب بالإصبع */
    }

    /* شاشات قصيرة (لابتوب صغير أو موبايل landscape) */
    @media (max-height: 700px) {
      .slide { padding-block: 5.5rem 5rem; }
      .overview { -webkit-line-clamp: 1; line-clamp: 1; }
    }
  `,
})
export class HeroComponent {
  readonly tmdb = inject(TmdbService);

  readonly movies = input.required<Movie[]>();
  readonly genres = input<Genre[]>([]);
  readonly index = model(0);

  readonly paused = signal(false);
  readonly autoplay =
    typeof matchMedia === 'function' &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches;

  private startX = 0;
  private startY = 0;

  private readonly genreMap = computed(
    () => new Map(this.genres().map((g) => [g.id, g.name]))
  );

  next(): void {
    const n = this.movies().length;
    if (n) this.index.update((i) => (i + 1) % n);
  }

  prev(): void {
    const n = this.movies().length;
    if (n) this.index.update((i) => (i - 1 + n) % n);
  }

  go(i: number): void {
    this.index.set(i);
  }

  /** سحب بالإصبع على الموبايل */
  onPointerDown(e: PointerEvent): void {
    if (e.pointerType === 'mouse') return;
    this.startX = e.clientX;
    this.startY = e.clientY;
  }

  onPointerUp(e: PointerEvent): void {
    if (e.pointerType === 'mouse') return;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) this.next();
      else this.prev();
    }
  }

  words(title: string): string[] {
    return title.split(/\s+/).filter(Boolean);
  }

  pad(n: number): string {
    return String(n).padStart(2, '0');
  }

  year(m: Movie): string {
    return m.release_date?.slice(0, 4) || '—';
  }

  rating(m: Movie): string {
    return m.vote_average ? m.vote_average.toFixed(1) : '—';
  }

  genreText(m: Movie): string {
    return m.genre_ids
      .slice(0, 3)
      .map((id) => this.genreMap().get(id))
      .filter(Boolean)
      .join(' / ');
  }
}