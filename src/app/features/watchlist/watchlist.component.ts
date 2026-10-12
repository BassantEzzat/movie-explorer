import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../core/directives/reveal.directive';
import { Movie } from '../../core/models/movie.model';
import { ThemeService } from '../../core/services/theme.service';
import { WatchlistService } from '../../core/services/watchlist.service';
import { AmbientComponent } from '../../shared/components/ambient.component';
import { MovieCardComponent } from '../../shared/components/movie-card.component';

type Sort = 'added' | 'rating' | 'year';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [RouterLink, RevealDirective, MovieCardComponent, AmbientComponent],
  template: `
    <div class="page">
      <app-ambient />

      <section class="container top">
        <p class="eyebrow r" style="--d: 0">Saved for later</p>
        <h1 class="title r" style="--d: 1">Your <em>watchlist</em></h1>
        <p class="sub r" style="--d: 2">
          @if (count() > 0) {
            {{ count() }} {{ count() === 1 ? 'movie' : 'movies' }} saved on this device
          } @else {
            Movies you save will show up here.
          }
        </p>
      </section>

      <section class="container results">
        @if (count() > 0) {
          <div class="controls r" style="--d: 3">
            <div class="sorts" role="group" aria-label="Sort">
              @for (s of sorts; track s.id) {
                <button
                  type="button"
                  class="g"
                  [class.on]="sort() === s.id"
                  [attr.aria-pressed]="sort() === s.id"
                  (click)="sort.set(s.id)"
                >{{ s.label }}</button>
              }
            </div>

            <button type="button" class="clear" [class.sure]="confirming()" (click)="clearAll()">
              {{ confirming() ? 'Sure? Tap again' : 'Clear all' }}
            </button>
          </div>

          <div class="grid">
            @for (m of list(); track m.id; let i = $index) {
              <div class="cell" [appReveal]="(i % 6) * 60">
                <app-movie-card
                  [movie]="m"
                  (hover)="hovered.set($event)"
                  (leave)="hovered.set(null)"
                />
              </div>
            }
          </div>
        } @else {
          <div class="empty">
            <p class="eyebrow">Nothing here yet</p>
            <h2>Your list is empty</h2>
            <p class="hint">Tap the + on any poster to save it for later.</p>
            <a class="cta" routerLink="/browse">
              <span>Browse movies</span>
              <span class="arrow" aria-hidden="true">→</span>
            </a>
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

    .title {
      font-size: clamp(2.6rem, 9vw, 7rem);
      margin-block: 0.8rem 1rem;
    }

    .title em { font-style: normal; color: var(--accent); }
    .sub { color: var(--muted); }

    .results { margin-top: clamp(2rem, 5vw, 3.5rem); }

    .controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: clamp(1.4rem, 3vw, 2.2rem);
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--line);
    }

    .sorts { display: flex; flex-wrap: wrap; gap: 0.2rem 1.5rem; }

    .g {
      position: relative;
      padding: 0.35rem 0;
      white-space: nowrap;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: clamp(1rem, 2vw, 1.2rem);
      letter-spacing: -0.02em;
      color: var(--muted);
      transition: color 0.4s ease;
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
    }

    .clear {
      flex: none;
      padding: 0.55rem 1.1rem;
      border: 1px solid var(--line);
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--muted);
      transition:
        background-color 0.4s ease,
        color 0.4s ease,
        border-color 0.4s ease;
    }

    .clear:hover, .clear.sure {
      background: var(--accent);
      border-color: transparent;
      color: var(--bg);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: clamp(1.2rem, 3vw, 2rem) clamp(0.8rem, 2vw, 1.5rem);
    }

    @media (min-width: 900px) {
      .grid { grid-template-columns: repeat(auto-fill, minmax(185px, 1fr)); }
    }

    .cell { min-width: 0; }

    .empty {
      display: grid;
      justify-items: start;
      gap: 1rem;
      padding-block: clamp(2rem, 8vw, 5rem);
      animation: rise 0.9s var(--ease-out) 0.3s both;
    }

    .empty h2 { font-size: clamp(2rem, 6vw, 4rem); }
    .hint { color: var(--muted); }

    .cta {
      display: inline-flex;
      align-items: center;
      gap: 0.9rem;
      margin-top: 0.6rem;
      padding: 0.85rem 1.5rem;
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

    @media (max-width: 600px) {
      .controls { flex-direction: column; align-items: flex-start; }
    }
  `,
})
export class WatchlistComponent {
  private readonly watchlist = inject(WatchlistService);
  private readonly theme = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly count = this.watchlist.count;

  readonly sorts: { id: Sort; label: string }[] = [
    { id: 'added', label: 'Recently added' },
    { id: 'rating', label: 'Top rated' },
    { id: 'year', label: 'Newest' },
  ];

  readonly sort = signal<Sort>('added');

  readonly list = computed(() => {
    const items = [...this.watchlist.items()];
    switch (this.sort()) {
      case 'rating':
        return items.sort((a, b) => b.vote_average - a.vote_average);
      case 'year':
        return items.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
      default:
        return items;
    }
  });

  // ---------- اللون: الفيلم اللي الماوس عليه، وإلا أول فيلم في القائمة ----------
  readonly hovered = signal<Movie | null>(null);

  private readonly target = computed(() => {
    const h = this.hovered();
    if (h && this.watchlist.has(h.id)) return h;
    return this.list()[0] ?? null;
  });

  // ---------- Clear all بتأكيد من خطوتين ----------
  readonly confirming = signal(false);
  private confirmTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const m = this.target();
      if (m) this.theme.setFromMovie(m.id, m.poster_path);
      else this.theme.reset();
    });

    this.destroyRef.onDestroy(() => {
      clearTimeout(this.confirmTimer);
      this.theme.reset();
    });
  }

  clearAll(): void {
    if (!this.confirming()) {
      this.confirming.set(true);
      this.confirmTimer = setTimeout(() => this.confirming.set(false), 3000);
      return;
    }
    clearTimeout(this.confirmTimer);
    this.watchlist.clear();
    this.confirming.set(false);
  }
}