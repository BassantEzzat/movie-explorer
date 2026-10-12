import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Cine — Movie Explorer',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'browse',
    title: 'Browse — Cine',
    loadComponent: () =>
      import('./features/browse/browse.component').then((m) => m.BrowseComponent),
  },
  {
    path: 'watchlist',
    title: 'Watchlist — Cine',
    loadComponent: () =>
      import('./features/watchlist/watchlist.component').then((m) => m.WatchlistComponent),
  },
  {
    path: 'movie/:id',
    title: 'Movie — Cine',
    loadComponent: () =>
      import('./features/movie-details/movie-details.component').then(
        (m) => m.MovieDetailsComponent
      ),
  },
  { path: '**', redirectTo: '' },
];