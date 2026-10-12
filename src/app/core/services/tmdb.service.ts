import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Genre, Movie, MovieDetails, Paged } from '../models/movie.model';

type PosterSize = 'w185' | 'w342' | 'w500' | 'w780';
type BackdropSize = 'w780' | 'w1280' | 'original';

@Injectable({ providedIn: 'root' })
export class TmdbService {
  private readonly http = inject(HttpClient);

  private get<T>(
    path: string,
    params: Record<string, string | number> = {}
  ): Observable<T> {
    const query = { language: 'en-US', ...params };

    // تطوير (ng serve): نكلّم TMDB مباشرة بالتوكن
    if (environment.tmdbToken) {
      return this.http.get<T>(`${environment.apiUrl}${path}`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${environment.tmdbToken}` }),
        params: query,
      });
    }

    // production: نكلّم الـ proxy، وهو اللي بيحط التوكن
    return this.http.get<T>(environment.apiUrl, { params: { path, ...query } });
  }

  trending(window: 'day' | 'week' = 'week'): Observable<Paged<Movie>> {
    return this.get(`/trending/movie/${window}`);
  }

  popular(page = 1): Observable<Paged<Movie>> {
    return this.get('/movie/popular', { page });
  }

  topRated(page = 1): Observable<Paged<Movie>> {
    return this.get('/movie/top_rated', { page });
  }

  search(query: string, page = 1): Observable<Paged<Movie>> {
    return this.get('/search/movie', { query, page, include_adult: 'false' });
  }

  discover(genreId: number, page = 1): Observable<Paged<Movie>> {
    return this.get('/discover/movie', {
      with_genres: genreId,
      page,
      sort_by: 'popularity.desc',
      'vote_count.gte': 100,
    });
  }

  genres(): Observable<Genre[]> {
    return this.get<{ genres: Genre[] }>('/genre/movie/list').pipe(
      map((res) => res.genres)
    );
  }

  details(id: number): Observable<MovieDetails> {
    return this.get(`/movie/${id}`, {
      append_to_response: 'credits,videos,similar',
    });
  }

  poster(path: string | null, size: PosterSize = 'w500'): string | null {
    return path ? `${environment.imgUrl}/${size}${path}` : null;
  }

  backdrop(path: string | null, size: BackdropSize = 'w1280'): string | null {
    return path ? `${environment.imgUrl}/${size}${path}` : null;
  }
}