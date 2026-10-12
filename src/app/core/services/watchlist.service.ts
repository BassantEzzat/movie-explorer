import { Injectable, computed, signal } from '@angular/core';
import { Movie } from '../models/movie.model';

const KEY = 'cine.watchlist.v1';
const MAX = 200;

@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private readonly state = signal<Movie[]>(this.read());

  readonly items = this.state.asReadonly();
  readonly count = computed(() => this.state().length);
  private readonly ids = computed(() => new Set(this.state().map((m) => m.id)));

  constructor() {
    // مزامنة بين التابات
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === KEY) this.state.set(this.read());
      });
    }
  }

  has(id: number): boolean {
    return this.ids().has(id);
  }

  /** بترجع true لو الفيلم اتضاف، و false لو اتشال */
  toggle(movie: Movie): boolean {
    if (this.has(movie.id)) {
      this.commit(this.state().filter((m) => m.id !== movie.id));
      return false;
    }
    this.commit([this.snapshot(movie), ...this.state()].slice(0, MAX));
    return true;
  }

  remove(id: number): void {
    this.commit(this.state().filter((m) => m.id !== id));
  }

  clear(): void {
    this.commit([]);
  }

  private commit(next: Movie[]): void {
    this.state.set(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* التخزين ممتلي أو ممنوع: نكمّل في الذاكرة بس */
    }
  }

  private read(): Movie[] {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const data: unknown = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data
        .filter((m): m is Movie => !!m && typeof m === 'object' && typeof (m as Movie).id === 'number')
        .map((m) => this.snapshot(m));
    } catch {
      return [];
    }
  }

  /** بنحفظ الحقول المهمة بس عشان التخزين يفضل صغير */
  private snapshot(m: Movie): Movie {
    return {
      id: m.id,
      title: String(m.title ?? ''),
      overview: String(m.overview ?? '').slice(0, 300),
      poster_path: m.poster_path ?? null,
      backdrop_path: m.backdrop_path ?? null,
      release_date: m.release_date ?? '',
      vote_average: Number(m.vote_average) || 0,
      vote_count: Number(m.vote_count) || 0,
      genre_ids: Array.isArray(m.genre_ids) ? m.genre_ids : [],
    };
  }
}