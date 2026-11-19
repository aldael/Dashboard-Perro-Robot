import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export interface ChartSeries {
  name: string;
  color: string;
  values: number[];
}

interface Tick {
  top: number;
  label: string;
}

interface Plot {
  paths: Array<{ name: string; color: string; d: string }>;
  ticks: Tick[];
  xLabels: string[];
  n: number;
  lo: number;
  hi: number;
  span: number;
}

const W = 1000;
const H = 300;

@Component({
  selector: 'app-line-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './line-chart.html',
  styleUrl: './line-chart.scss',
})
export class LineChart {
  readonly series = input.required<ChartSeries[]>();
  readonly times = input<number[]>([]);
  readonly height = input(210);
  readonly unit = input('');
  readonly min = input<number | null>(null);
  readonly max = input<number | null>(null);
  readonly zeroLine = input(false);
  readonly digits = input(1);

  readonly hoverIndex = signal<number | null>(null);

  readonly plot = computed<Plot>(() => {
    const all = this.series();
    const times = this.times();
    const n = Math.min(times.length || Number.MAX_SAFE_INTEGER, ...all.map((s) => s.values.length));
    if (!all.length || n < 2) {
      return { paths: [], ticks: [], xLabels: [], n: 0, lo: 0, hi: 1, span: 0 };
    }

    let lo = this.min() ?? Number.POSITIVE_INFINITY;
    let hi = this.max() ?? Number.NEGATIVE_INFINITY;
    if (this.min() === null || this.max() === null) {
      for (const s of all) {
        for (let i = 0; i < n; i++) {
          const v = s.values[i];
          if (!Number.isFinite(v)) continue;
          if (this.min() === null) lo = Math.min(lo, v);
          if (this.max() === null) hi = Math.max(hi, v);
        }
      }
    }
    if (!Number.isFinite(lo)) lo = 0;
    if (!Number.isFinite(hi)) hi = 1;
    if (hi - lo < 1e-6) {
      lo -= 1;
      hi += 1;
    }
    const padding = (hi - lo) * 0.08;
    if (this.min() === null) lo -= padding;
    if (this.max() === null) hi += padding;

    const x = (i: number) => (i / (n - 1)) * W;
    const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;

    const paths = all.map((s) => {
      let d = '';
      for (let i = 0; i < n; i++) {
        const v = s.values[i];
        if (!Number.isFinite(v)) continue;
        d += `${d ? 'L' : 'M'}${x(i).toFixed(2)} ${y(v).toFixed(2)} `;
      }
      return { name: s.name, color: s.color, d };
    });

    const ticks: Tick[] = [0, 0.25, 0.5, 0.75, 1].map((f) => {
      const value = lo + f * (hi - lo);
      return { top: (1 - f) * 100, label: this.formatTick(value) };
    });

    const span = Math.max(0, times[n - 1] - times[0]);
    const xLabels = [1, 0.75, 0.5, 0.25, 0].map((f) =>
      f === 0 ? 'ahora' : `-${(span * f).toFixed(0)} s`,
    );

    return { paths, ticks, xLabels, n, lo, hi, span };
  });

  readonly hoverX = computed(() => {
    const i = this.hoverIndex();
    const n = this.plot().n;
    return i !== null && n > 1 ? (i / (n - 1)) * 100 : null;
  });

  readonly tooltipLeft = computed(() => {
    const x = this.hoverX();
    return x === null ? 50 : Math.min(78, Math.max(10, x));
  });

  readonly hoverValues = computed(() => {
    const i = this.hoverIndex();
    if (i === null) return [];
    return this.series()
      .map((s) => ({ name: s.name, color: s.color, value: s.values[i] }))
      .filter((s) => Number.isFinite(s.value));
  });

  readonly zeroY = computed(() => {
    const p = this.plot();
    if (!this.zeroLine() || p.n === 0) return null;
    const top = (1 - (0 - p.lo) / (p.hi - p.lo)) * 100;
    return top >= 0 && top <= 100 ? top : null;
  });

  readonly hoverShown = computed(() => this.hoverValues().slice(0, 10));

  readonly hoverAgo = computed(() => {
    const i = this.hoverIndex();
    const p = this.plot();
    if (i === null || p.n < 2) return '';
    return (p.span * (1 - i / (p.n - 1))).toFixed(1);
  });

  onMove(event: MouseEvent): void {
    const n = this.plot().n;
    if (n < 2) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    this.hoverIndex.set(Math.round(ratio * (n - 1)));
  }

  formatTick(v: number): string {
    const d = this.digits();
    if (Math.abs(v) >= 100) return v.toFixed(0);
    return v.toFixed(Math.min(d, 1));
  }

  formatValue(v: number): string {
    return v.toFixed(this.digits());
  }
}
