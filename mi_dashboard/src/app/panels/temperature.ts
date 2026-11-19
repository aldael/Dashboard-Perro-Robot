import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { colorTemperatura } from '../core/palette';
import { Sample, Telemetry } from '../core/telemetry.models';
import { ChartSeries, LineChart } from '../shared/line-chart';

interface Celda {
  id: number;
  nombre: string;
  valor: number;
  color: string;
  pct: number;
}

@Component({
  selector: 'app-temperature',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LineChart],
  templateUrl: './temperature.html',
  styleUrl: './temperature.scss',
})
export class Temperature {
  readonly history = input.required<Sample[]>();
  readonly latest = input<Telemetry | null>(null);

  /** Umbral blando, calibrado para el simulador (28 °C reposo → 55 °C uso sostenido). */
  readonly umbral = 50;

  readonly celdas = computed<Celda[]>(() =>
    (this.latest()?.motores ?? []).map((m) => ({
      id: m.id,
      nombre: m.nombre,
      valor: m.temperatura,
      color: colorTemperatura(m.temperatura),
      pct: Math.min(100, Math.max(0, ((m.temperatura - 28) / 27) * 100)),
    })),
  );

  readonly max = computed(() => Math.max(0, ...this.celdas().map((c) => c.valor)));
  readonly min = computed(() =>
    this.celdas().length ? Math.min(...this.celdas().map((c) => c.valor)) : 0,
  );
  readonly promedio = computed(() => {
    const c = this.celdas();
    return c.length ? c.reduce((a, b) => a + b.valor, 0) / c.length : 0;
  });
  readonly calientes = computed(() => this.celdas().filter((c) => c.valor >= this.umbral).length);

  readonly recientes = computed(() => this.history().slice(-600));
  readonly times = computed(() => this.recientes().map((s) => s.t));

  readonly series = computed<ChartSeries[]>(() => {
    const h = this.recientes();
    return [
      {
        name: 'Máxima',
        color: '#fb923c',
        values: h.map((s) => (s.temps.length ? Math.max(...s.temps) : Number.NaN)),
      },
      {
        name: 'Promedio',
        color: '#22d3ee',
        values: h.map((s) =>
          s.temps.length ? s.temps.reduce((a, b) => a + b, 0) / s.temps.length : Number.NaN,
        ),
      },
    ];
  });
}
