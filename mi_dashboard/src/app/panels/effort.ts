import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Sample, Telemetry, num } from '../core/telemetry.models';
import { ChartSeries, LineChart } from '../shared/line-chart';

@Component({
  selector: 'app-effort',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LineChart],
  templateUrl: './effort.html',
  styleUrl: './effort.scss',
})
export class Effort {
  readonly history = input.required<Sample[]>();
  readonly latest = input<Telemetry | null>(null);
  readonly moviendose = input(false);

  readonly umbral = 6; // Nm, orientativo: el simulador estima hasta ~12 Nm

  readonly torqueMax = computed(() => {
    const t = this.latest();
    return t?.motores.length ? Math.max(...t.motores.map((m) => num(m.torque))) : 0;
  });

  readonly torqueMedio = computed(() => {
    const t = this.latest();
    if (!t?.motores.length) return 0;
    return t.motores.reduce((a, m) => a + num(m.torque), 0) / t.motores.length;
  });

  readonly velocidadMedia = computed(() => {
    const t = this.latest();
    if (!t?.motores.length) return 0;
    return t.motores.reduce((a, m) => a + Math.abs(num(m.velocidad)), 0) / t.motores.length;
  });

  readonly recientes = computed(() => this.history().slice(-600));
  readonly times = computed(() => this.recientes().map((s) => s.t));

  readonly series = computed<ChartSeries[]>(() => {
    const h = this.recientes();
    return [
      {
        name: 'torque máx.',
        color: '#fb923c',
        values: h.map((s) => (s.torques.length ? Math.max(...s.torques) : Number.NaN)),
      },
      {
        name: 'torque medio',
        color: '#a78bfa',
        values: h.map((s) =>
          s.torques.length
            ? s.torques.reduce((a, b) => a + b, 0) / s.torques.length
            : Number.NaN,
        ),
      },
    ];
  });

  readonly actividad = computed(() => {
    const h = this.history().slice(-80);
    const techo = Math.max(0.6, ...h.map((s) => this.media(s)));
    return h.map((s) => Math.min(100, (this.media(s) / techo) * 100));
  });

  private media(s: Sample): number {
    return s.speeds.length
      ? s.speeds.reduce((a, b) => a + Math.abs(b), 0) / s.speeds.length
      : 0;
  }
}
