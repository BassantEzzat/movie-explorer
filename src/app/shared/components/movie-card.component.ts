import { Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TiltDirective } from '../../core/directives/tilt.directive';
import { Movie } from '../../core/models/movie.model';
import { TmdbService } from '../../core/services/tmdb.service';
import { WatchlistService } from '../../core/services/watchlist.service';
import { SaveButtonComponent } from './save-button.component';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [RouterLink, TiltDirective, SaveButtonComponent],
  template: `
    <div
      class="card"
      appTilt
      (mouseenter)="hover.emit(movie())"
      (mouseleave)="leave.emit()"
      (focusin)="hover.emit(movie())"
      (focusout)="leave.emit()"
    >
      <div class="poster">
        <a class="cover" [routerLink]="['/movie', movie().id]" [attr.aria-label]="movie().title">
          @if (src(); as s) {
            <img [src]="s" [alt]="movie().title" loading="lazy"
                 [class.loaded]="loaded()" (load)="loaded.set(true)" />
          } @else {
            <div class="fallback">{{ movie().title }}</div>
          }
        </a>

        <app-save-button class="save" [class.is-saved]="saved()" [movie]="movie()" compact />
      </div>

      <a class="meta" [routerLink]="['/movie', movie().id]" tabindex="-1" aria-hidden="true">
        <h3>{{ movie().title }}</h3>
        <p>{{ year() }} · ★ {{ rating() }}</p>
      </a>
    </div>
  `,
  styles: `
    :host { display: block; min-width: 0; }

    .card { min-width: 0; }

    .poster {
      position: relative;
      aspect-ratio: 2 / 3;
      overflow: hidden;
      border-radius: var(--radius);
      background: var(--line);
      transform:
        perspective(900px)
        rotateX(var(--rx, 0deg))
        rotateY(var(--ry, 0deg))
        translateY(var(--lift, 0px));
      transition: transform 0.6s var(--ease-out), box-shadow 0.6s var(--ease-out);
    }

    .cover { display: block; width: 100%; height: 100%; border-radius: inherit; }
    .cover:focus-visible { outline: 3px solid var(--accent); outline-offset: -3px; }

    .card:has(.cover:focus-visible) .poster {
      --lift: -10px;
      box-shadow: 0 26px 40px -20px rgb(0 0 0 / 0.6);
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transform: scale(1.1);
      transition: opacity 0.8s ease, transform 1.2s var(--ease-out);
    }

    img.loaded { opacity: 1; transform: none; }

    .fallback {
      display: grid;
      place-items: center;
      height: 100%;
      padding: 1rem;
      text-align: center;
      font-family: var(--font-display);
      font-weight: 700;
      color: var(--muted);
    }

    /* زرار الحفظ فوق البوستر */
    .save {
      position: absolute;
      top: 0.6rem;
      right: 0.6rem;
      z-index: 2;
      opacity: 0;
      transform: translateY(-6px);
      transition: opacity 0.4s ease, transform 0.5s var(--ease-out);
    }

    .save.is-saved,
    .save:focus-within,
    .card:has(:focus-visible) .save {
      opacity: 1;
      transform: none;
    }

    @media (hover: none) {
      .save { opacity: 1; transform: none; }
    }

    .meta {
      display: block;
      min-width: 0;
      margin-top: 0.9rem;
      transition: transform 0.5s var(--ease-out);
    }

    h3 {
      font-size: 1rem;
      line-height: 1.25;
      letter-spacing: -0.01em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: color 0.4s ease;
    }

    p { margin-top: 0.25rem; font-size: 0.82rem; color: var(--muted); }

    /* تأثيرات الهوفر للأجهزة اللي فيها ماوس بس */
    @media (hover: hover) {
      .card:hover .poster {
        --lift: -10px;
        box-shadow: 0 26px 40px -20px rgb(0 0 0 / 0.6);
      }
      .card:hover img { transform: scale(1.05); }
      .card:hover .save { opacity: 1; transform: none; }
      .card:hover .meta { transform: translateY(-3px); }
      .card:hover h3 { color: var(--accent); }
    }

    @media (max-width: 600px) {
      h3 { font-size: 0.92rem; }
      p { font-size: 0.78rem; }
    }
  `,
})
export class MovieCardComponent {
  private readonly tmdb = inject(TmdbService);
  private readonly watchlist = inject(WatchlistService);

  readonly movie = input.required<Movie>();
  readonly hover = output<Movie>();
  readonly leave = output<void>();

  readonly loaded = signal(false);
  readonly saved = computed(() => this.watchlist.has(this.movie().id));
  readonly src = computed(() => this.tmdb.poster(this.movie().poster_path, 'w342'));
  readonly year = computed(() => this.movie().release_date?.slice(0, 4) || '—');
  readonly rating = computed(() =>
    this.movie().vote_average ? this.movie().vote_average.toFixed(1) : '—'
  );
}