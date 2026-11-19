import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Sample, Telemetry } from '../core/telemetry.models';
import { ChartSeries, LineChart } from '../shared/line-chart';

@Component({
  selector: 'app-battery',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LineChart],
  templateUrl: './battery.html',
  styleUrl: './battery.scss',
})
export class Battery {
  readonly history = input.required<Sample[]>();
  readonly latest = input<Telemetry | null>(null);

  readonly soc = computed(() => Math.max(0, Math.min(100, this.latest()?.bms?.soc ?? 0)));
  readonly corriente = computed(() => this.latest()?.bms?.corriente ?? 0);
  readonly temp = computed(() => this.latest()?.bms?.temperatura ?? 0);
  readonly celdas = computed(() => this.latest()?.bms?.celdas ?? []);
  readonly color = computed(() => {
    const s = this.soc();
    return s > 50 ? '#4ade80' : s > 20 ? '#fbbf24' : '#f87171';
  });
  /** Circumferencia del arco (radio 52, arco de 270° = 0.75 vueltas). */
  readonly dash = computed(() => (2 * Math.PI * 52 * 0.75 * this.soc()) / 100);
  readonly circunferencia = 2 * Math.PI * 52 * 0.75;
  readonly total = 2 * Math.PI * 52;

  readonly recientes = computed(() => this.history().slice(-300));
  readonly times = computed(() => this.recientes().map((s) => s.t));
  readonly series = computed<ChartSeries[]>(() => [
    { name: 'corriente', color: '#fbbf24', values: this.recientes().map((s) => s.corriente) },
  ]);
}
