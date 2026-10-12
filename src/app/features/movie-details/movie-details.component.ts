import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { RevealDirective } from '../../core/directives/reveal.directive';
import { TiltDirective } from '../../core/directives/tilt.directive';
import { Movie, MovieDetails } from '../../core/models/movie.model';
import { ThemeService } from '../../core/services/theme.service';
import { TmdbService } from '../../core/services/tmdb.service';
import { AmbientComponent } from '../../shared/components/ambient.component';
import { MovieRailComponent } from '../../shared/components/movie-rail.component';
import { SaveButtonComponent } from '../../shared/components/save-button.component';

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ok'; movie: MovieDetails };

@Component({
  selector: 'app-movie-details',
  standalone: true,
  imports: [
    RouterLink,
    RevealDirective,
    TiltDirective,
    MovieRailComponent,
    AmbientComponent,
    SaveButtonComponent,
  ],
  host: { '(document:keydown.escape)': 'closeTrailer()' },
  template: `
    @if (movie(); as m) {
      <section class="hero">
        <div class="bg">
          @if (tmdb.backdrop(m.backdrop_path); as b) {
            <img [src]="b" alt="" fetchpriority="high" />
          }
        </div>

        <div class="container stack">
          <a class="back r" style="--d: 0" routerLink="/">
            <span aria-hidden="true">←</span> Home
          </a>

          <div class="content">
            <div class="poster-wrap r" style="--d: 1">
              <div class="poster" appTilt>
                @if (tmdb.poster(m.poster_path, 'w500'); as p) {
                  <img [src]="p" [alt]="m.title" />
                }
              </div>
            </div>

            <div class="info">
              @if (genres().length) {
                <p class="eyebrow genres r" style="--d: 1">
                  @for (g of genres(); track g.id; let last = $last) {
                    <a [routerLink]="['/browse']" [queryParams]="{ genre: g.id }">{{ g.name }}</a>
                    @if (!last) {
                      <i>/</i>
                    }
                  }
                </p>
              }

              <h1 class="title" [attr.aria-label]="m.title">
                @for (w of words(m.title); track $index) {
                  <span class="word" aria-hidden="true">
                    <span class="w" [style.--i]="$index">{{ w }}</span>
                  </span>
                }
              </h1>

              @if (m.tagline) {
                <p class="tagline r" style="--d: 4">“{{ m.tagline }}”</p>
              }

              <p class="meta r" style="--d: 5">
                <span>{{ year(m) }}</span>
                <i>/</i>
                <span>{{ runtime(m.runtime) }}</span>
                <i>/</i>
                <span>★ {{ rating(m) }}</span>
              </p>

              <p class="overview r" style="--d: 6">
                {{ m.overview || 'No overview available yet.' }}
              </p>

              <div class="actions r" style="--d: 7">
                @if (trailerSrc()) {
                  <button type="button" class="cta" (click)="openTrailer()">
                    <span>Watch trailer</span>
                    <span class="play" aria-hidden="true">▶</span>
                  </button>
                }
                @if (asMovie(); as sm) {
                  <app-save-button [movie]="sm" />
                }
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="below">
        <app-ambient />

        <section class="container facts" aria-label="Facts">
          @for (f of facts(); track f.label; let i = $index) {
            <div class="fact" [appReveal]="i * 90">
              <p class="eyebrow">{{ f.label }}</p>
              <p class="value" [class.accent]="i === 0">{{ f.value }}</p>
              @if (f.sub) {
                <p class="sub">{{ f.sub }}</p>
              }
            </div>
          }
        </section>

        @if (cast().length) {
          <section class="container">
            <div class="head" appReveal>
              <p class="eyebrow">Starring</p>
              <h2>Cast</h2>
            </div>

            <div class="cast-track">
              @for (c of cast(); track c.id; let i = $index) {
                <div class="cast-card" [appReveal]="(i % 8) * 60">
                  <div class="photo">
                    @if (c.profile_path) {
                      <img [src]="tmdb.poster(c.profile_path, 'w185')" [alt]="c.name" loading="lazy" />
                    } @else {
                      <span aria-hidden="true">{{ c.name.charAt(0) }}</span>
                    }
                  </div>
                  <h3>{{ c.name }}</h3>
                  <p>{{ c.character }}</p>
                </div>
              }
            </div>
          </section>
        }

        @if (similar().length) {
          <app-movie-rail
            eyebrow="You might also like"
            heading="Similar movies"
            [movies]="similar()"
            (hovered)="hovered.set($event)"
            (left)="hovered.set(null)"
          />
        }
      </div>
    } @else if (state().status === 'error') {
      <section class="container state">
        <p class="eyebrow">Something went wrong</p>
        <h1>Couldn't load this movie</h1>
        <a class="cta" routerLink="/">← Back home</a>
      </section>
    } @else {
      <section class="container state">
        <p class="eyebrow loading">Loading…</p>
      </section>
    }

    @if (trailerOpen() && trailerSrc(); as src) {
      <div class="modal" [class.closing]="closing()" (click)="closeTrailer()">
        <button type="button" class="close" aria-label="Close trailer" (click)="closeTrailer()" autofocus>✕</button>
        <div class="frame" (click)="$event.stopPropagation()">
          <iframe
            [src]="src"
            title="Trailer"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowfullscreen
          ></iframe>
        </div>
      </div>
    }
  `,
  styles: `
    :host { display: block; }

    /* ---------- حركات الدخول ---------- */
    @keyframes rise {
      from { opacity: 0; transform: translateY(24px); }
      to { opacity: 1; transform: none; }
    }
    @keyframes wordUp {
      from { transform: translateY(118%); }
      to { transform: none; }
    }
    @keyframes bgIn {
      from { opacity: 0; transform: scale(1.14); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
    @keyframes pop {
      from { opacity: 0; transform: translateY(24px) scale(0.96); }
      to { opacity: 1; transform: none; }
    }
    @keyframes popOut {
      from { opacity: 1; transform: none; }
      to { opacity: 0; transform: translateY(16px) scale(0.97); }
    }

    .r {
      animation: rise 0.9s var(--ease-out) both;
      animation-delay: calc(var(--d, 0) * 90ms + 200ms);
    }

    /* ---------- الهيرو ---------- */
    .hero {
      position: relative;
      display: grid;
      align-items: center;
      min-height: min(92svh, 860px);
      padding-block: 6.5rem 3.5rem;
      overflow: hidden;
    }

    .bg {
      position: absolute;
      inset: 0;
      animation: bgIn 1.6s var(--ease-out) both;
    }

    .bg img { width: 100%; height: 100%; object-fit: cover; }

    .bg::after {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(to top, var(--bg) 3%, color-mix(in srgb, var(--bg) 55%, transparent) 40%, color-mix(in srgb, var(--bg) 35%, transparent) 100%),
        linear-gradient(to right, color-mix(in srgb, var(--bg) 85%, transparent) 0%, transparent 70%);
    }

    .stack {
      position: relative;
      z-index: 1;
      display: grid;
      gap: 1.6rem;
    }

    .back {
      justify-self: start;
      display: inline-flex;
      gap: 0.6rem;
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--muted);
      transition: color 0.3s ease;
    }

    .back span { display: inline-block; transition: transform 0.5s var(--ease-out); }
    .back:hover { color: var(--fg); }
    .back:hover span { transform: translateX(-6px); }

    .content { display: grid; gap: 1.6rem; align-items: center; }

    .poster-wrap { width: min(46vw, 200px); }

    .poster {
      aspect-ratio: 2 / 3;
      overflow: hidden;
      border-radius: var(--radius);
      background: var(--line);
      box-shadow: 0 32px 60px -30px rgb(0 0 0 / 0.75);
      transform: perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
      transition: transform 0.6s var(--ease-out);
    }

    .poster img { width: 100%; height: 100%; object-fit: cover; }

    .info { min-width: 0; max-width: 46rem; }

    /* الأنواع كروابط */
    .genres { display: flex; flex-wrap: wrap; gap: 0.3rem 0.7rem; }
    .genres i { font-style: normal; opacity: 0.6; }
    .genres a { transition: color 0.3s ease; }

    @media (hover: hover) {
      .genres a:hover { color: var(--accent); }
    }

    .title {
      font-size: clamp(2.3rem, 7vw, 5.2rem);
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
      animation: wordUp 1.1s var(--ease-out) both;
      animation-delay: calc(var(--i, 0) * 90ms + 200ms);
    }

    .tagline {
      font-style: italic;
      color: var(--accent);
      margin-bottom: 0.9rem;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem 0.9rem;
      font-weight: 500;
    }

    .meta i { font-style: normal; color: var(--accent); }

    .overview {
      max-width: 40rem;
      margin-top: 1rem;
      color: color-mix(in srgb, var(--fg) 84%, transparent);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.8rem;
      margin-top: 1.5rem;
    }

    .cta {
      display: inline-flex;
      align-items: center;
      gap: 0.9rem;
      padding: 0.85rem 1.5rem;
      border-radius: 999px;
      font-weight: 700;
      background: var(--fg);
      color: var(--bg);
      transition: transform 0.5s var(--ease-out), background-color 0.4s ease;
    }

    .play { font-size: 0.7rem; transition: transform 0.5s var(--ease-out); }

    @media (hover: hover) {
      .cta:hover { background: var(--accent); transform: translateY(-3px); }
      .cta:hover .play { transform: scale(1.3); }
    }

    @media (min-width: 860px) {
      .content {
        grid-template-columns: auto minmax(0, 1fr);
        gap: clamp(2rem, 5vw, 4.5rem);
      }
      .poster-wrap { width: min(clamp(220px, 24vw, 320px), 42vh); }
    }

    /* ---------- تحت الهيرو (مع الخلفية الحية) ---------- */
    .below {
      position: relative;
      isolation: isolate;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: clamp(2.5rem, 6vw, 5rem);
      padding-block: 1rem clamp(3rem, 7vw, 6rem);
    }

    .facts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1.5rem;
    }

    .fact { padding-top: 1.2rem; border-top: 1px solid var(--line); }

    .value {
      margin-top: 0.5rem;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: clamp(2rem, 5vw, 3.6rem);
      letter-spacing: -0.04em;
      line-height: 1;
    }

    .value.accent { color: var(--accent); }
    .sub { margin-top: 0.5rem; font-size: 0.85rem; color: var(--muted); }

    .head h2 { margin-top: 0.6rem; }

    /* ---------- الممثلين ---------- */
    .cast-track {
      --pad: 12px;
      display: flex;
      gap: clamp(0.8rem, 2vw, 1.4rem);
      overflow-x: auto;
      margin-inline: calc(var(--pad) * -1);
      padding: 1.6rem var(--pad) 1rem;
      scrollbar-width: none;
      scroll-snap-type: x proximity;
      scroll-padding-inline: var(--pad);
    }

    .cast-track::-webkit-scrollbar { display: none; }

    .cast-card {
      flex: 0 0 clamp(120px, 30vw, 160px);
      min-width: 0;
      scroll-snap-align: start;
    }

    .photo {
      display: grid;
      place-items: center;
      aspect-ratio: 2 / 3;
      overflow: hidden;
      border-radius: var(--radius);
      background: var(--line);
      font-family: var(--font-display);
      font-size: 3rem;
      font-weight: 800;
      color: var(--muted);
    }

    .photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: filter 0.6s ease, transform 1s var(--ease-out);
    }

    @media (hover: hover) {
      .photo img { filter: grayscale(0.85) contrast(1.05); }
      .cast-card:hover .photo img { filter: none; transform: scale(1.05); }
    }

    .cast-card h3 {
      margin-top: 0.7rem;
      font-size: 0.95rem;
      line-height: 1.25;
      letter-spacing: -0.01em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cast-card p {
      margin-top: 0.15rem;
      font-size: 0.8rem;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-width: 700px) {
      .cast-track { --pad: var(--gutter); }
    }

    /* ---------- التحميل / الخطأ ---------- */
    .state {
      display: grid;
      align-content: center;
      justify-items: start;
      gap: 1.2rem;
      min-height: 80svh;
    }

    .loading { animation: pulse 1.4s ease-in-out infinite; }

    @keyframes pulse { 50% { opacity: 0.35; } }

    /* ---------- التريلر ---------- */
    .modal {
      position: fixed;
      inset: 0;
      z-index: 200;
      display: grid;
      place-items: center;
      padding: 1rem;
      background: color-mix(in srgb, var(--bg) 90%, black);
      animation: fadeIn 0.35s ease both;
    }

    .modal.closing { animation: fadeOut 0.28s ease both; }

    .frame {
      width: min(1100px, 100%);
      aspect-ratio: 16 / 9;
      overflow: hidden;
      border-radius: var(--radius);
      background: #000;
      animation: pop 0.55s var(--ease-out) both;
    }

    .modal.closing .frame { animation: popOut 0.28s ease both; }

    iframe { width: 100%; height: 100%; border: 0; }

    .close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      width: 3rem;
      height: 3rem;
      border: 1px solid var(--line);
      border-radius: 50%;
      font-size: 1rem;
      transition: background-color 0.4s ease, color 0.4s ease, transform 0.5s var(--ease-out);
    }

    .close:hover { background: var(--fg); color: var(--bg); transform: rotate(90deg); }
  `,
})
export class MovieDetailsComponent {
  /** بييجي من الـ route (movie/:id) بفضل withComponentInputBinding */
  readonly id = input.required<string>();

  readonly tmdb = inject(TmdbService);
  private readonly theme = inject(ThemeService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly pageTitle = inject(Title);

  readonly state = toSignal(
    toObservable(this.id).pipe(
      switchMap((id) =>
        this.tmdb.details(Number(id)).pipe(
          map((movie): State => ({ status: 'ok', movie })),
          catchError(() => of<State>({ status: 'error' })),
          startWith<State>({ status: 'loading' })
        )
      )
    ),
    { initialValue: { status: 'loading' } as State }
  );

  readonly movie = computed(() => {
    const s = this.state();
    return s.status === 'ok' ? s.movie : null;
  });

  /** نفس الفيلم بشكل Movie عادي (عشان زرار الحفظ والـ watchlist) */
  readonly asMovie = computed<Movie | null>(() => {
    const m = this.movie();
    if (!m) return null;
    return {
      id: m.id,
      title: m.title,
      overview: m.overview,
      poster_path: m.poster_path,
      backdrop_path: m.backdrop_path,
      release_date: m.release_date,
      vote_average: m.vote_average,
      vote_count: m.vote_count,
      genre_ids: m.genres.map((g) => g.id),
    };
  });

  readonly cast = computed(() => (this.movie()?.credits?.cast ?? []).slice(0, 16));

  readonly similar = computed(() =>
    (this.movie()?.similar?.results ?? []).filter((m) => m.poster_path).slice(0, 20)
  );

  readonly genres = computed(() => (this.movie()?.genres ?? []).slice(0, 3));

  readonly facts = computed(() => {
    const m = this.movie();
    if (!m) return [];
    return [
      {
        label: 'Rating',
        value: m.vote_average ? m.vote_average.toFixed(1) : '—',
        sub: m.vote_count ? `${m.vote_count.toLocaleString('en-US')} votes` : '',
      },
      { label: 'Runtime', value: this.runtime(m.runtime), sub: '' },
      {
        label: 'Released',
        value: this.year(m),
        sub: [this.fullDate(m.release_date), m.status].filter(Boolean).join(' · '),
      },
    ];
  });

  // ---------- التريلر ----------
  readonly trailerOpen = signal(false);
  readonly closing = signal(false);

  private readonly trailerKey = computed(() => {
    const videos = (this.movie()?.videos?.results ?? []).filter((v) => v.site === 'YouTube');
    const pick = videos.find((v) => v.type === 'Trailer') ?? videos.find((v) => v.type === 'Teaser');
    return pick?.key ?? null;
  });

  readonly trailerSrc = computed(() => {
    const key = this.trailerKey();
    if (!key || !/^[\w-]{6,20}$/.test(key)) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube-nocookie.com/embed/${key}?autoplay=1&rel=0`
    );
  });

  // ---------- اللون: فيلم الصفحة، أو الفيلم المشابه اللي الماوس عليه ----------
  readonly hovered = signal<Movie | null>(null);
  private readonly themeTarget = computed(() => this.hovered() ?? this.movie());

  constructor() {
    effect(() => {
      const t = this.themeTarget();
      if (t) this.theme.setFromMovie(t.id, t.poster_path);
    });

    effect(() => {
      const m = this.movie();
      if (m) this.pageTitle.setTitle(`${m.title} — Cine`);
    });

    // منع سكرول الصفحة والتريلر مفتوح
    effect(() => {
      document.body.style.overflow = this.trailerOpen() ? 'hidden' : '';
    });

    inject(DestroyRef).onDestroy(() => {
      this.theme.reset();
      document.body.style.overflow = '';
    });
  }

  openTrailer(): void {
    this.closing.set(false);
    this.trailerOpen.set(true);
  }

  closeTrailer(): void {
    if (!this.trailerOpen() || this.closing()) return;
    this.closing.set(true);
    setTimeout(() => {
      this.trailerOpen.set(false);
      this.closing.set(false);
    }, 280);
  }

  // ---------- مساعدات العرض ----------
  words(title: string): string[] {
    return title.split(/\s+/).filter(Boolean);
  }

  year(m: { release_date: string }): string {
    return m.release_date?.slice(0, 4) || '—';
  }

  rating(m: { vote_average: number }): string {
    return m.vote_average ? m.vote_average.toFixed(1) : '—';
  }

  runtime(min: number | null): string {
    if (!min) return '—';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
  }

  private fullDate(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}