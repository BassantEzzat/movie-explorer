import {
  Component,
  booleanAttribute,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Movie } from '../../core/models/movie.model';
import { ToastService } from '../../core/services/toast.service';
import { WatchlistService } from '../../core/services/watchlist.service';

@Component({
  selector: 'app-save-button',
  standalone: true,
  template: `
    <button
      type="button"
      class="btn"
      [class.saved]="saved()"
      [class.compact]="compact()"
      [class.pop]="popping()"
      [attr.aria-pressed]="saved()"
      [attr.aria-label]="saved() ? 'Remove from watchlist' : 'Add to watchlist'"
      (click)="onClick($event)"
    >
      <span class="icon" aria-hidden="true">{{ saved() ? '✓' : '+' }}</span>
      <span class="label">{{ label() }}</span>
    </button>
  `,
  styles: `
    :host { display: inline-block; }

    @keyframes pop {
      0% { transform: scale(0.3) rotate(-50deg); }
      60% { transform: scale(1.4) rotate(8deg); }
      100% { transform: none; }
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 3rem;
      padding: 0 1.4rem;
      border-radius: 999px;
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--fg);
      background: color-mix(in srgb, var(--bg) 55%, transparent);
      border: 1px solid color-mix(in srgb, var(--fg) 26%, transparent);
      -webkit-backdrop-filter: blur(10px);
      backdrop-filter: blur(10px);
      transition:
        background-color 0.4s ease,
        color 0.4s ease,
        border-color 0.4s ease,
        transform 0.5s var(--ease-out);
    }

    .icon { display: inline-block; font-size: 1.05rem; line-height: 1; }
    .pop .icon { animation: pop 0.6s var(--ease-out); }

    .label { margin-left: 0.6rem; white-space: nowrap; }

    .btn.saved {
      background: var(--accent);
      color: var(--bg);
      border-color: transparent;
    }

    /* الشكل المصغّر اللي بيتحط على البوستر */
    .btn.compact {
      height: 2.5rem;
      min-width: 2.5rem;
      padding: 0 0.7rem;
      font-size: 0.82rem;
    }

    .compact .label {
      max-width: 0;
      margin-left: 0;
      overflow: hidden;
      opacity: 0;
      transition:
        max-width 0.5s var(--ease-out),
        margin 0.5s var(--ease-out),
        opacity 0.3s ease;
    }

    @media (hover: hover) {
      .btn:hover { transform: translateY(-2px); }

      .compact:hover .label,
      .compact:focus-visible .label {
        max-width: 5rem;
        margin-left: 0.5rem;
        opacity: 1;
      }
    }
  `,
})
export class SaveButtonComponent {
  readonly movie = input.required<Movie>();
  readonly compact = input(false, { transform: booleanAttribute });

  private readonly watchlist = inject(WatchlistService);
  private readonly toast = inject(ToastService);

  readonly saved = computed(() => this.watchlist.has(this.movie().id));
  readonly popping = signal(false);

  readonly label = computed(() => {
    const saved = this.saved();
    return this.compact()
      ? saved ? 'Saved' : 'Save'
      : saved ? 'In your watchlist' : 'Add to watchlist';
  });

  private popTimer?: ReturnType<typeof setTimeout>;

  onClick(e: Event): void {
    e.preventDefault();
    e.stopPropagation();

    const m = this.movie();
    const added = this.watchlist.toggle(m);

    this.popping.set(false);
    clearTimeout(this.popTimer);
    // نمسح الكلاس الأول ونرجّعه عشان الأنيميشن يتكرر
    requestAnimationFrame(() => {
      this.popping.set(true);
      this.popTimer = setTimeout(() => this.popping.set(false), 650);
    });

    this.toast.show(
      added ? `Added “${m.title}” to your watchlist` : `Removed “${m.title}”`,
      { label: 'Undo', run: () => this.watchlist.toggle(m) }
    );
  }
}