import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Sample, Telemetry } from '../core/telemetry.models';
import { ChartSeries, LineChart } from '../shared/line-chart';

@Component({
  selector: 'app-attitude',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LineChart],
  templateUrl: './attitude.html',
  styleUrl: './attitude.scss',
})
export class Attitude {
  readonly history = input.required<Sample[]>();
  readonly latest = input<Telemetry | null>(null);

  readonly roll = computed(() => this.latest()?.imu?.roll ?? 0);
  readonly pitch = computed(() => this.latest()?.imu?.pitch ?? 0);
  readonly yaw = computed(() => this.latest()?.imu?.yaw ?? 0);
  /** Escala visual del horizonte: 2,2 px por grado. Devuelve un string para [style.transform]. */
  readonly horizonStyle = computed(
    () =>
      `rotate(${(-this.roll()).toFixed(2)}deg) translateY(${(this.pitch() * 2.2).toFixed(1)}px)`,
  );

  readonly recientes = computed(() => this.history().slice(-300));
  readonly times = computed(() => this.recientes().map((s) => s.t));

  readonly serieInclinacion = computed<ChartSeries[]>(() => [
    { name: 'roll', color: '#22d3ee', values: this.recientes().map((s) => s.roll) },
    { name: 'pitch', color: '#a78bfa', values: this.recientes().map((s) => s.pitch) },
  ]);

  readonly serieRumbo = computed<ChartSeries[]>(() => [
    { name: 'yaw', color: '#4ade80', values: this.recientes().map((s) => s.yaw) },
  ]);

  readonly ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    const largo = i % 3 === 0 ? 40 : 44;
    return {
      x1: 60 + 48 * Math.sin(a),
      y1: 60 - 48 * Math.cos(a),
      x2: 60 + largo * Math.sin(a),
      y2: 60 - largo * Math.cos(a),
    };
  });

  readonly rumbo = computed(() => {
    const grados = ((this.yaw() % 360) + 360) % 360;
    const puntos = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    return puntos[Math.round(grados / 45) % 8];
  });
}
