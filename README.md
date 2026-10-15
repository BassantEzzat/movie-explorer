# Cine — Movie Explorer 🎬

A movie discovery app where **the whole page takes on the colors of the film you're looking at**. Built with Angular and the TMDB API.

**🔗 Live demo:** https://movie-explorer-six-omega.app

## Features

- **Adaptive color**: the palette is extracted from each poster and the whole page transitions to it, with a soft blurred backdrop behind the content.
- **Hero slider** with word-by-word title animation, autoplay with progress, swipe on touch devices and keyboard arrows.
- **Browse**: debounced search and genre filters; the URL is the source of truth (`/browse?q=batman`, `/browse?genre=28`), with "Load more", skeleton loading and error states.
- **Movie details**: cast, trailer modal, facts, similar movies, clickable genres.
- **Watchlist**: saved in `localStorage`, synced across tabs, with sorting, undo toasts and a live counter.
- **Responsive and accessible**: mobile-first layout, `prefers-reduced-motion` support, keyboard navigation, semantic markup.

## Tech

- Angular (standalone components, signals, zoneless change detection, new control flow)
- RxJS for data fetching, `toSignal` / `toObservable` interop
- CSS only: custom properties with `@property` for animated theming, view transitions between routes
- Vercel (hosting + a serverless proxy that keeps the TMDB token private)

## Getting started

```bash
git clone https://github.com/BassantEzzat/movie-explorer.git
cd movie-explorer
npm install
```

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/) and copy your **API Read Access Token** (Settings → API).
2. Create `src/environments/environment.development.ts`:

```ts
export const environment = {
  tmdbToken: 'YOUR_READ_ACCESS_TOKEN',
  apiUrl: 'https://api.themoviedb.org/3',
  imgUrl: 'https://image.tmdb.org/t/p',
};
```

3. Run `ng serve` and open http://localhost:4200

## Deploy

Deployed on Vercel. In production the app calls `/api/tmdb` (a serverless function in `api/tmdb.js`) which adds the token on the server, so it is never exposed to the browser. Set `TMDB_TOKEN` in the Vercel project's Environment Variables.

## Structure

```
src/app
├─ core/        services (TMDB, theme, watchlist, toast), models, directives
├─ layout/      header
├─ shared/      movie card, rail, ambient background, save button, toast
└─ features/    home, browse, movie-details, watchlist
```

## Credits

Movie data and images by [TMDB](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB.
