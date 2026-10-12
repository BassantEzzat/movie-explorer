import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { WatchlistService } from '../core/services/watchlist.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  host: { '(window:scroll)': 'onScroll()' },
  template: `
    <header class="bar" [class.scrolled]="scrolled()" [class.hidden]="hidden()">
      <div class="container inner">
        <a routerLink="/" class="logo" aria-label="Cine, home">Cine<span>.</span></a>
        <nav aria-label="Main">
          <a routerLink="/" fragment="trending" class="link hide-sm">Trending</a>
          <a routerLink="/" fragment="top-rated" class="link hide-sm">Top rated</a>
          <a routerLink="/browse" routerLinkActive="on" class="link">Browse</a>
          <a routerLink="/watchlist" routerLinkActive="on" class="link">
            Watchlist
            @if (watchlist.count() > 0) {
              @for (c of [watchlist.count()]; track c) {
                <sup class="badge">{{ c }}</sup>
              }
            }
          </a>
        </nav>
      </div>
    </header>
  `,
  styles: `
    @keyframes pop {
      from { transform: scale(0.3); opacity: 0; }
      60% { transform: scale(1.4); }
      to { transform: none; opacity: 1; }
    }

    .bar {
      position: fixed;
      inset: 0 0 auto 0;
      z-index: 50;
      padding-block: 1.3rem;
      border-bottom: 1px solid transparent;
      transition:
        transform 0.6s var(--ease-out),
        padding 0.5s var(--ease-out),
        background-color 0.5s ease,
        border-color 0.5s ease;
    }

    .bar.scrolled {
      padding-block: 0.8rem;
      background: color-mix(in srgb, var(--bg) 70%, transparent);
      -webkit-backdrop-filter: blur(16px);
      backdrop-filter: blur(16px);
      border-color: var(--line);
    }

    .bar.hidden { transform: translateY(-100%); }

    .inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .logo {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 1.7rem;
      letter-spacing: -0.04em;
    }

    .logo span {
      display: inline-block;
      color: var(--accent);
      transition: transform 0.5s var(--ease-out);
    }

    .logo:hover span { transform: translateY(-0.18em); }

    nav { display: flex; gap: clamp(0.9rem, 3vw, 2rem); }

    .link {
      font-size: 0.9rem;
      font-weight: 500;
      padding-block: 0.4rem;
      background: linear-gradient(var(--accent), var(--accent)) 0 calc(100% - 0.1rem) / 0 2px no-repeat;
      transition: background-size 0.5s var(--ease-out), color 0.3s;
    }

    .link:hover, .link.on { background-size: 100% 2px; }

    .badge {
      display: inline-block;
      margin-left: 0.2rem;
      font-size: 0.65rem;
      font-weight: 800;
      color: var(--accent);
      animation: pop 0.5s var(--ease-out);
    }

    @media (max-width: 640px) {
      .hide-sm { display: none; }
    }

    @media (max-width: 480px) {
      .bar { padding-block: 1rem; }
      .bar.scrolled { padding-block: 0.65rem; }
      .logo { font-size: 1.45rem; }
      .link { font-size: 0.82rem; }
      nav { gap: 1.1rem; }
    }
  `,
})
export class HeaderComponent {
  readonly watchlist = inject(WatchlistService);

  readonly scrolled = signal(false);
  readonly hidden = signal(false);
  private lastY = 0;

  onScroll(): void {
    const y = window.scrollY;
    this.scrolled.set(y > 24);

    if (Math.abs(y - this.lastY) < 6) return;
    this.hidden.set(y > this.lastY && y > 320);
    this.lastY = y;
  }
}