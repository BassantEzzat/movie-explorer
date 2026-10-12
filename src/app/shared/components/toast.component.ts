import { Component, inject } from '@angular/core';
import { Toast, ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  template: `
    @if (svc.toast(); as t) {
      @for (x of [t]; track x.id) {
        <div class="toast" [class.leaving]="svc.leaving()" role="status" aria-live="polite">
          <span class="text">{{ x.text }}</span>
          @if (x.actionLabel) {
            <button type="button" class="act" (click)="run(x)">{{ x.actionLabel }}</button>
          }
        </div>
      }
    }
  `,
  styles: `
    :host {
      position: fixed;
      inset: auto 0 0 0;
      z-index: 150;
      display: flex;
      justify-content: center;
      padding: 0 1rem calc(1.4rem + env(safe-area-inset-bottom, 0px));
      pointer-events: none;
    }

    @keyframes in {
      from { opacity: 0; transform: translateY(24px) scale(0.96); }
      to { opacity: 1; transform: none; }
    }

    @keyframes out {
      from { opacity: 1; transform: none; }
      to { opacity: 0; transform: translateY(16px) scale(0.97); }
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 1.2rem;
      max-width: min(100%, 34rem);
      padding: 0.8rem 0.9rem 0.8rem 1.3rem;
      border-radius: 999px;
      background: var(--fg);
      color: var(--bg);
      font-size: 0.9rem;
      font-weight: 500;
      box-shadow: 0 20px 40px -18px rgb(0 0 0 / 0.6);
      pointer-events: auto;
      animation: in 0.55s var(--ease-out) both;
    }

    .toast.leaving { animation: out 0.28s ease both; }

    .text {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .act {
      flex: none;
      padding: 0.45rem 0.9rem;
      border-radius: 999px;
      font-weight: 700;
      color: var(--fg);
      background: var(--bg);
      transition: transform 0.4s var(--ease-out);
    }

    @media (hover: hover) {
      .act:hover { transform: translateY(-2px); }
    }
  `,
})
export class ToastComponent {
  readonly svc = inject(ToastService);

  run(t: Toast): void {
    t.action?.();
    this.svc.dismiss();
  }
}