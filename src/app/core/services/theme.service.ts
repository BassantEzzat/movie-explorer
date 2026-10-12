import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface Palette {
  bg: string;
  fg: string;
  accent: string;
}

const DEFAULT_PALETTE: Palette = {
  bg: '#14110f',
  fg: '#f4efe6',
  accent: '#e4572e',
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly cache = new Map<number, Palette>();
  private token = 0;

  readonly palette = signal<Palette>(DEFAULT_PALETTE);

  /** بوستر الفيلم اللي ألوانه شغالة دلوقتي (بتستخدمه الخلفية الحية) */
  readonly poster = signal<string | null>(null);

  /** غيّري ألوان الصفحة حسب بوستر الفيلم */
  async setFromMovie(id: number, posterPath: string | null): Promise<void> {
    const current = ++this.token;

    let palette = this.cache.get(id);
    if (!palette) {
      palette = await this.buildPalette(id, posterPath);
      this.cache.set(id, palette);
    }

    // لو المستخدم عدّى على فيلم تاني في الأثناء، تجاهلي النتيجة دي
    if (current === this.token) {
      this.apply(palette);
      this.poster.set(posterPath);
    }
  }

  /** رجّعي الألوان الأصلية */
  reset(): void {
    this.token++;
    this.apply(DEFAULT_PALETTE);
    this.poster.set(null);
  }

  private apply(p: Palette): void {
    this.palette.set(p);
    const style = this.root.style;
    style.setProperty('--bg', p.bg);
    style.setProperty('--fg', p.fg);
    style.setProperty('--accent', p.accent);
  }

  private async buildPalette(
    id: number,
    posterPath: string | null
  ): Promise<Palette> {
    // لون بديل ثابت من رقم الفيلم لو القراءة فشلت أو البوستر أبيض وأسود
    let hue = (id * 47) % 360;
    let sat = 70;

    if (posterPath) {
      try {
        [hue, sat] = await this.dominantHueSat(
          `${environment.imgUrl}/w92${posterPath}`
        );
      } catch {
        /* نكمّل باللون البديل */
      }
    }

    return this.fromHsl(hue, sat);
  }

  /**
   * هنا بتتحكمي في قوة الألوان:
   * - الرقم 18% هو الفتحة (زوّديه = أفتح، قلّليه = أغمق)
   * - 0.75 هو نسبة التشبّع في الخلفية (زوّديه = ألوان أغنى)
   */
  private fromHsl(h: number, s: number): Palette {
    const sat = Math.min(Math.max(s, 45), 92);
    return {
      bg: `hsl(${h} ${Math.round(sat * 0.75)}% 18%)`,
      fg: `hsl(${h} 40% 95%)`,
      accent: `hsl(${h} ${Math.max(sat, 78)}% 62%)`,
    };
  }

  private dominantHueSat(url: string): Promise<[number, number]> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onerror = () => reject(new Error('image failed to load'));
      img.onload = () => {
        try {
          const w = 32;
          const h = 48;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) throw new Error('no canvas context');

          ctx.drawImage(img, 0, 0, w, h);
          const { data } = ctx.getImageData(0, 0, w, h);

          // histogram للدرجات (36 خانة × 10 درجات)، بنتجاهل الرمادي والأبيض والأسود
          const BINS = 36;
          const weights = new Array<number>(BINS).fill(0);
          const satSums = new Array<number>(BINS).fill(0);

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255;
            const g = data[i + 1] / 255;
            const b = data[i + 2] / 255;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const d = max - min;
            const l = (max + min) / 2;

            if (d < 0.08 || l < 0.1 || l > 0.9) continue;

            const s = d / (1 - Math.abs(2 * l - 1));
            let hue = 0;
            if (max === r) hue = ((g - b) / d) % 6;
            else if (max === g) hue = (b - r) / d + 2;
            else hue = (r - g) / d + 4;
            hue *= 60;
            if (hue < 0) hue += 360;

            const weight = s * (1 - Math.abs(2 * l - 1));
            const bin = Math.floor(hue / 10) % BINS;
            weights[bin] += weight;
            satSums[bin] += s * weight;
          }

          // أقوى درجة (مع حساب الجيران عشان الدرجات القريبة تتجمّع)
          let best = -1;
          let bestScore = 0;
          for (let i = 0; i < BINS; i++) {
            const score =
              weights[i] +
              0.5 * (weights[(i + BINS - 1) % BINS] + weights[(i + 1) % BINS]);
            if (score > bestScore) {
              bestScore = score;
              best = i;
            }
          }

          if (best < 0 || weights[best] === 0) {
            throw new Error('poster has no dominant color');
          }

          const hue = best * 10 + 5;
          const sat = Math.round((satSums[best] / weights[best]) * 100);
          resolve([hue, sat]);
        } catch (e) {
          reject(e);
        }
      };
      img.src = url;
    });
  }
}