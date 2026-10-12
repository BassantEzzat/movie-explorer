import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  text: string;
  actionLabel?: string;
  action?: () => void;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toast = signal<Toast | null>(null);
  readonly leaving = signal(false);

  private counter = 0;
  private hideTimer?: ReturnType<typeof setTimeout>;
  private removeTimer?: ReturnType<typeof setTimeout>;

  show(text: string, action?: { label: string; run: () => void }): void {
    clearTimeout(this.hideTimer);
    clearTimeout(this.removeTimer);
    this.leaving.set(false);
    this.toast.set({
      id: ++this.counter,
      text,
      actionLabel: action?.label,
      action: action?.run,
    });
    this.hideTimer = setTimeout(() => this.dismiss(), 4000);
  }

  dismiss(): void {
    if (!this.toast()) return;
    clearTimeout(this.hideTimer);
    this.leaving.set(true);
    this.removeTimer = setTimeout(() => {
      this.toast.set(null);
      this.leaving.set(false);
    }, 280);
  }
}