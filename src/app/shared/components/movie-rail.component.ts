import { Component, ElementRef, input, output, viewChild } from '@angular/core';
import { RevealDirective } from '../../core/directives/reveal.directive';
import { Movie } from '../../core/models/movie.model';
import { MovieCardComponent } from './movie-card.component';

@Component({
  selector: 'app-movie-rail',
  standalone: true,
  imports: [MovieCardComponent, RevealDirective],
  template: `
    <section class="container">
      <div class="head" appReveal>
        <div>
          <p class="eyebrow">{{ eyebrow() }}</p>
          <h2>{{ heading() }}</h2>
        </div>
        <div class="arrows">
          <button type="button" aria-label="Scroll left" (click)="scroll(-1)">←</button>
          <button type="button" aria-label="Scroll right" (click)="scroll(1)">→</button>
        </div>
      </div>

      <div class="track" #track>
        @for (m of movies(); track m.id; let i = $index) {
          <div class="slot" [appReveal]="(i % 7) * 70">
            <app-movie-card [movie]="m" (hover)="hovered.emit($event)" (leave)="left.emit()" />
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    :host { display: block; min-width: 0; }

    .head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: clamp(0.8rem, 2vw, 1.4rem);
    }

    .head h2 { margin-top: 0.6rem; }

    .arrows { display: flex; gap: 0.6rem; }

    .arrows button {
      width: 3rem;
      height: 3rem;
      border: 1px solid var(--line);
      border-radius: 50%;
      font-size: 1.1rem;
      transition:
        background-color 0.4s ease,
        color 0.4s ease,
        transform 0.5s var(--ease-out);
    }

    .arrows button:hover {
      background: var(--fg);
      color: var(--bg);
      transform: translateY(-3px);
    }

    /* الصف بيبدأ مع حافة العنوان، ومعاه مساحة زيادة من الجنبين للميلان والظل */
    .track {
      --pad: 12px;
      --card-w: clamp(140px, 42vw, 220px);
      display: flex;
      gap: clamp(0.8rem, 2vw, 1.5rem);
      overflow-x: auto;
      margin-inline: calc(var(--pad) * -1);
      padding: 1.6rem var(--pad) 2.4rem;
      scroll-padding-inline: var(--pad);
      scroll-snap-type: x proximity;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }

    .track::-webkit-scrollbar { display: none; }

    /* عرض ثابت لكل الكروت مهما كان طول العنوان */
    .slot {
      flex: 0 0 var(--card-w);
      width: var(--card-w);
      min-width: 0;
      scroll-snap-align: start;
    }

    /* موبايل: الصف يطلع لحافة الشاشة والأسهم تختفي (السحب أسهل) */
    @media (max-width: 700px) {
      .arrows { display: none; }
      .track { --pad: var(--gutter); }
    }
  `,
})
export class MovieRailComponent {
  readonly heading = input.required<string>();
  readonly eyebrow = input('');
  readonly movies = input.required<Movie[]>();

  readonly hovered = output<Movie>();
  readonly left = output<void>();

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  scroll(dir: 1 | -1): void {
    const el = this.track().nativeElement;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  }
}