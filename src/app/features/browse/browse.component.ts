import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Observable, Subject, catchError, debounceTime, distinctUntilChanged, of } from 'rxjs';
import { RevealDirective } from '../../core/directives/reveal.directive';
import { Genre, Movie, Paged } from '../../core/models/movie.model';
import { ThemeService } from '../../core/services/theme.service';
import { TmdbService } from '../../core/services/tmdb.service';
import { AmbientComponent } from '../../shared/components/ambient.component';
import { MovieCardComponent } from '../../shared/components/movie-card.component';

@Component({
  selector: 'app-browse',
  standalone: true,
  imports: [RouterLink, RevealDirective, MovieCardComponent, AmbientComponent],
  template: `
    <div class="page">
      <app-ambient />

      <section class="container top">
        <p class="eyebrow r" style="--d: 0">Search &amp; discover</p>
        <h1 class="title r" style="--d: 1">Find your <em>next</em> watch</h1>

        <div class="field r" style="--d: 2">
          <input
            #field
            type="text"
            role="searchbox"
            placeholder="Search movies…"
            aria-label="Search movies"
            autocomplete="off"
            spellcheck="false"
            enterkeyhint="search"
            [value]="text()"
            (input)="onInput(field.value)"
            (keydown.enter)="commit(field.value)"
            (keydown.escape)="clear()"
          />
          @if (text()) {
            <button type="button" class="clear" aria-label="Clear search" (click)="clear()">✕</button>
          }
        </div>

        <nav class="genres" aria-label="Genres">
          <a
            class="g"
            style="--i: 0"
            [routerLink]="['/browse']"
            [queryParams]="{ genre: null, q: null }"
            [class.on]="!hasFilter()"
          >All</a>
          @for (g of genres(); track g.id; let i = $index) {
            <a
              class="g"
              [style.--i]="i + 1"
              [routerLink]="['/browse']"
              [queryParams]="{ genre: g.id, q: null }"
              [class.on]="query().genre === g.id"
            >{{ g.name }}</a>
          }
        </nav>
      </section>

      <section class="container results">
        <div class="bar">
          @for (h of [heading()]; track h) {
            <div class="rise">
              <p class="eyebrow">{{ eyebrow() }}</p>
              <h2>{{ h }}</h2>
            </div>
          }
          @if (hasFilter() && total() > 0) {
            <p class="count">{{ fmt(total()) }} titles</p>
          }
        </div>

        @if (loading() && items().length === 0) {
          <div class="grid" aria-hidden="true">
            @for (s of skeletons; track s) {
              <div class="sk" [style.--i]="s"></div>
            }
          </div>
        } @else if (failed() && items().length === 0) {
          <div class="note">
            <p class="eyebrow">Something went wrong</p>
            <h3>Couldn't load movies</h3>
            <button type="button" class="more" (click)="retry()"><span>Try again</span></button>
          </div>
        } @else if (items().length === 0) {
          <div class="note">
            <p class="eyebrow">No results</p>
            <h3>
              @if (query().q) {
                Nothing matches “{{ query().q }}”
              } @else {
                Nothing here yet
              }
            </h3>
            <p class="hint">Try another title, or pick a genre above.</p>
          </div>
        } @else {
          <div class="grid">
            @for (m of items(); track m.id; let i = $index) {
              <div class="cell" [appReveal]="(i % 6) * 60">
                <app-movie-card
                  [movie]="m"
                  (hover)="hovered.set($event)"
                  (leave)="hovered.set(null)"
                />
              </div>
            }
          </div>

          <div class="foot">
            <p class="shown">
              Showing {{ items().length }}
              @if (hasFilter() && total() > 0) {
                of {{ fmt(total()) }}
              }
            </p>
            @if (failed()) {
              <p class="shown">Couldn't load more.</p>
            }
            @if (canMore() || failed()) {
              <button type="button" class="more" [disabled]="loading()" (click)="retry()">
                <span>{{ loading() ? 'Loading…' : failed() ? 'Try again' : 'Load more' }}</span>
              </button>
            }
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    :host { display: block; }

    @keyframes rise {
      from { opacity: 0; transform: translateY(24px); }
      to { opacity: 1; transform: none; }
    }

    @keyframes pulse { 50% { opacity: 0.45; } }

    .page {
      position: relative;
      isolation: isolate;
      min-height: 100svh;
      padding-block: 7rem 5rem;
    }

    .r {
      animation: rise 0.9s var(--ease-out) both;
      animation-delay: calc(var(--d, 0) * 90ms + 150ms);
    }

    .rise { animation: rise 0.7s var(--ease-out) both; }

    /* ---------- الجزء العلوي ---------- */
    .title {
      font-size: clamp(2.4rem, 8vw, 6rem);
      margin-block: 0.8rem 1.8rem;
    }

    .title em { font-style: normal; color: var(--accent); }

    .field {
      position: relative;
      display: flex;
      align-items: center;
      gap: 1rem;
      padding-bottom: 0.7rem;
      border-bottom: 2px solid var(--line);
    }

    /* خط الـ accent بيتملّي وقت التركيز */
    .field::after {
      content: '';
      position: absolute;
      inset: auto 0 -2px 0;
      height: 2px;
      background: var(--accent);
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 0.7s var(--ease-out);
    }

    .field:focus-within::after { transform: scaleX(1); }

    input {
      flex: 1;
      min-width: 0;
      background: none;
      border: 0;
      outline: none;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: clamp(1.5rem, 5vw, 3rem);
      letter-spacing: -0.03em;
      color: var(--fg);
    }

    input::placeholder { color: var(--muted); }

    .clear {
      width: 2.6rem;
      height: 2.6rem;
      flex: none;
      border: 1px solid var(--line);
      border-radius: 50%;
      font-size: 0.9rem;
      transition: background-color 0.4s ease, color 0.4s ease, transform 0.5s var(--ease-out);
    }

    .clear:hover { background: var(--fg); color: var(--bg); transform: rotate(90deg); }

    /* ---------- الأنواع ---------- */
    .genres {
      display: flex;
      flex-wrap: wrap;
      gap: 0.2rem 1.7rem;
      margin-top: 1.6rem;
    }

    .g {
      position: relative;
      padding: 0.35rem 0;
      white-space: nowrap;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: clamp(1.05rem, 2.2vw, 1.35rem);
      letter-spacing: -0.02em;
      color: var(--muted);
      transition: color 0.4s ease;
      animation: rise 0.7s var(--ease-out) both;
      animation-delay: calc(var(--i, 0) * 28ms + 350ms);
    }

    .g::after {
      content: '';
      position: absolute;
      inset: auto 0 0 0;
      height: 2px;
      background: var(--accent);
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 0.5s var(--ease-out);
    }

    .g.on { color: var(--fg); }
    .g.on::after { transform: scaleX(1); }

    @media (hover: hover) {
      .g:hover { color: var(--fg); }
      .g:hover::after { transform: scaleX(1); }
    }

    /* على الموبايل الأنواع بتتسحب أفقياً */
    @media (max-width: 700px) {
      .genres {
        flex-wrap: nowrap;
        overflow-x: auto;
        margin-inline: calc(var(--gutter) * -1);
        padding-inline: var(--gutter);
        scrollbar-width: none;
      }
      .genres::-webkit-scrollbar { display: none; }
    }

    /* ---------- النتائج ---------- */
    .results { margin-top: clamp(2.5rem, 6vw, 4.5rem); }

    .bar {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: clamp(1.2rem, 3vw, 2rem);
    }

    .bar h2 { margin-top: 0.6rem; }

    .count { font-size: 0.9rem; color: var(--muted); }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: clamp(1.2rem, 3vw, 2rem) clamp(0.8rem, 2vw, 1.5rem);
    }

    @media (min-width: 900px) {
      .grid { grid-template-columns: repeat(auto-fill, minmax(185px, 1fr)); }
    }

    .cell { min-width: 0; }

    /* skeleton */
    .sk {
      aspect-ratio: 2 / 3;
      border-radius: var(--radius);
      background: var(--line);
      animation: pulse 1.4s ease-in-out infinite;
      animation-delay: calc(var(--i, 0) * 70ms);
    }

    /* ---------- حالات خاصة ---------- */
    .note {
      display: grid;
      justify-items: start;
      gap: 1rem;
      padding-block: clamp(2rem, 8vw, 5rem);
      animation: rise 0.8s var(--ease-out) both;
    }

    .note h3 { font-size: clamp(1.8rem, 5vw, 3rem); }
    .hint { color: var(--muted); }

    .foot {
      display: grid;
      justify-items: center;
      gap: 1rem;
      margin-top: clamp(2.5rem, 6vw, 4rem);
    }

    .shown { font-size: 0.85rem; color: var(--muted); }

    .more {
      padding: 0.9rem 2rem;
      border: 1px solid var(--line);
      border-radius: 999px;
      font-weight: 700;
      transition:
        background-color 0.4s ease,
        color 0.4s ease,
        border-color 0.4s ease,
        transform 0.5s var(--ease-out);
    }

    .more:disabled { opacity: 0.55; cursor: progress; }

    @media (hover: hover) {
      .more:not(:disabled):hover {
        background: var(--fg);
        color: var(--bg);
        border-color: var(--fg);
        transform: translateY(-3px);
      }
    }
  `,
})
export class BrowseComponent {
  /** بييجوا من الرابط: /browse?q=...&genre=... */
  readonly q = input<string | undefined>();
  readonly genre = input<string | undefined>();

  private readonly tmdb = inject(TmdbService);
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  readonly query = computed(() => ({
    q: (this.q() ?? '').trim(),
    genre: Number(this.genre()) || 0,
  }));

  readonly hasFilter = computed(() => !!(this.query().q || this.query().genre));

  readonly genres = toSignal(
    this.tmdb.genres().pipe(catchError(() => of([] as Genre[]))),
    { initialValue: [] as Genre[] }
  );

  readonly heading = computed(() => {
    const { q, genre } = this.query();
    if (q) return `Results for “${q}”`;
    if (genre) return this.genres().find((g) => g.id === genre)?.name ?? 'Genre';
    return 'Popular right now';
  });

  readonly eyebrow = computed(() => {
    const { q, genre } = this.query();
    return q ? 'Search' : genre ? 'Genre' : 'Discover';
  });

  // ---------- النتائج ----------
  readonly items = signal<Movie[]>([]);
  readonly page = signal(0);
  readonly totalPages = signal(0);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly canMore = computed(() => this.page() > 0 && this.page() < this.totalPages());
  readonly skeletons = Array.from({ length: 12 }, (_, i) => i);

  private requestId = 0;

  // ---------- مربع البحث ----------
  readonly text = signal('');
  private readonly typed = new Subject<string>();

  // ---------- اللون: الفيلم اللي الماوس عليه، وإلا أول نتيجة ----------
  readonly hovered = signal<Movie | null>(null);
  private readonly themeTarget = computed(() => this.hovered() ?? this.items()[0] ?? null);

  constructor() {
    // مزامنة مربع البحث مع الرابط (إلا لو المستخدم بيكتب فيه دلوقتي)
    effect(() => {
      const q = this.q() ?? '';
      untracked(() => {
        const el = this.field()?.nativeElement;
        if (el && document.activeElement === el) return;
        this.text.set(q);
      });
    });

    // أي تغيير في البحث أو النوع: نبدأ من الأول
    effect(() => {
      this.query();
      untracked(() => {
        this.items.set([]);
        this.page.set(0);
        this.totalPages.set(0);
        this.total.set(0);
        this.load(1, true);
      });
    });

    effect(() => {
      const m = this.themeTarget();
      if (m) this.theme.setFromMovie(m.id, m.poster_path);
      else this.theme.reset();
    });

    // البحث بعد ما توقفي كتابة 350ms
    this.typed
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((v) => this.go(v));

    this.destroyRef.onDestroy(() => this.theme.reset());
  }

  onInput(value: string): void {
    this.text.set(value);
    this.typed.next(value);
  }

  commit(value: string): void {
    this.go(value);
  }

  clear(): void {
    this.text.set('');
    this.typed.next('');
    this.go('');
    this.field()?.nativeElement.focus();
  }

  private go(value: string): void {
    this.router.navigate(['/browse'], {
      queryParams: { q: value.trim() || null, genre: null },
      replaceUrl: true,
    });
  }

  retry(): void {
    if (this.items().length === 0) this.load(1, true);
    else this.load(this.page() + 1, false);
  }

  private fetch(page: number): Observable<Paged<Movie>> {
    const { q, genre } = this.query();
    if (q) return this.tmdb.search(q, page);
    if (genre) return this.tmdb.discover(genre, page);
    return this.tmdb.popular(page);
  }

  private load(page: number, reset: boolean): void {
    const id = ++this.requestId;
    this.loading.set(true);
    this.failed.set(false);

    this.fetch(page)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (id !== this.requestId) return; // وصل طلب أحدث، تجاهلي ده
          const results = res.results.filter((m) => m.poster_path);
          this.items.update((prev) => (reset ? results : this.merge(prev, results)));
          this.page.set(res.page);
          this.totalPages.set(Math.min(res.total_pages, 500));
          this.total.set(res.total_results);
          this.loading.set(false);
        },
        error: () => {
          if (id !== this.requestId) return;
          this.failed.set(true);
          this.loading.set(false);
        },
      });
  }

  private merge(prev: Movie[], next: Movie[]): Movie[] {
    const seen = new Set(prev.map((m) => m.id));
    return [...prev, ...next.filter((m) => !seen.has(m.id))];
  }

  fmt(n: number): string {
    return n.toLocaleString('en-US');
  }
}