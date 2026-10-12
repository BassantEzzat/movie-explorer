import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { Genre, Movie } from '../../core/models/movie.model';
import { ThemeService } from '../../core/services/theme.service';
import { TmdbService } from '../../core/services/tmdb.service';
import { AmbientComponent } from '../../shared/components/ambient.component';
import { MovieRailComponent } from '../../shared/components/movie-rail.component';
import { HeroComponent } from './hero.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HeroComponent, MovieRailComponent, AmbientComponent],
  template: `
    <app-hero [movies]="heroMovies()" [genres]="genres()" [(index)]="heroIndex" />

    <div class="rails">
      <app-ambient />

      <app-movie-rail
        id="trending"
        eyebrow="This week"
        heading="Trending now"
        [movies]="trending()"
        (hovered)="hovered.set($event)"
        (left)="hovered.set(null)"
      />
      <app-movie-rail
        id="top-rated"
        eyebrow="All time"
        heading="Top rated"
        [movies]="topRated()"
        (hovered)="hovered.set($event)"
        (left)="hovered.set(null)"
      />
    </div>
  `,
  styles: `
    :host { display: block; }

    .rails {
      position: relative;
      isolation: isolate;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: clamp(2rem, 5vw, 4rem);
      padding-block: clamp(3rem, 7vw, 6rem);
    }

    app-movie-rail {
      min-width: 0;
      scroll-margin-top: 5rem;
    }
  `,
})
export class HomeComponent {
  private readonly tmdb = inject(TmdbService);
  private readonly theme = inject(ThemeService);

  readonly trending = toSignal(
    this.tmdb.trending().pipe(
      map((r) => r.results),
      catchError(() => of([] as Movie[]))
    ),
    { initialValue: [] as Movie[] }
  );

  readonly topRated = toSignal(
    this.tmdb.topRated().pipe(
      map((r) => r.results),
      catchError(() => of([] as Movie[]))
    ),
    { initialValue: [] as Movie[] }
  );

  readonly genres = toSignal(
    this.tmdb.genres().pipe(catchError(() => of([] as Genre[]))),
    { initialValue: [] as Genre[] }
  );

  readonly heroMovies = computed(() =>
    this.trending().filter((m) => m.backdrop_path).slice(0, 6)
  );

  readonly heroIndex = signal(0);
  readonly hovered = signal<Movie | null>(null);

  /** الفيلم اللي لونه بيلبّس الصفحة: اللي الماوس عليه، وإلا فيلم الـ Hero */
  readonly activeMovie = computed(
    () => this.hovered() ?? this.heroMovies()[this.heroIndex()] ?? null
  );

  constructor() {
    effect(() => {
      const m = this.activeMovie();
      if (m) this.theme.setFromMovie(m.id, m.poster_path);
    });

    inject(DestroyRef).onDestroy(() => this.theme.reset());
  }
}