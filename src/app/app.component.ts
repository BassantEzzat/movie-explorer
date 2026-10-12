import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header.component';
import { ToastComponent } from './shared/components/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, ToastComponent],
  template: `
    <app-header />
    <main><router-outlet /></main>
    <footer class="container footer">
      <p>Designed &amp; built by Bassant · Angular</p>
      <p class="credit">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </footer>
    <app-toast />
  `,
  styles: `
    .footer {
      display: grid;
      gap: 0.5rem;
      padding-block: 3rem 4rem;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 0.9rem;
    }

    .credit { font-size: 0.78rem; }
  `,
})
export class AppComponent {}