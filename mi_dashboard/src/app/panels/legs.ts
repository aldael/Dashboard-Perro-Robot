import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RobotInfo, Sample, Telemetry } from '../core/telemetry.models';

interface Pata {
  nombre: string;
  apoyada: boolean;
  x: number;
  y: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

@Component({
  selector: 'app-legs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './legs.html',
  styleUrl: './legs.scss',
})
export class Legs {
  readonly history = input.required<Sample[]>();
  readonly latest = input<Telemetry | null>(null);
  readonly info = input<RobotInfo | null>(null);
  readonly moviendose = input(false);

  private readonly posiciones: Record<string, Omit<Pata, 'nombre' | 'apoyada'>> = {
    FR: { x: 152, y: 28, x1: 112, y1: 52, x2: 140, y2: 34 },
    FL: { x: 48, y: 28, x1: 88, y1: 52, x2: 60, y2: 34 },
    RR: { x: 152, y: 122, x1: 112, y1: 98, x2: 140, y2: 116 },
    RL: { x: 48, y: 122, x1: 88, y1: 98, x2: 60, y2: 116 },
  };

  readonly esCuadrupedo = computed(() => {
    const modelo = this.info()?.modelo ?? this.latest()?.modelo;
    return modelo === 'go2' || this.info()?.tipo === 'cuadrupedo';
  });

  readonly nombres = computed(() => {
    const info = this.info()?.patas ?? [];
    const tele = Object.keys(this.latest()?.fuerzas ?? {});
    return (info.length ? info : tele).filter((n) => this.posiciones[n]);
  });

  readonly patas = computed<Pata[]>(() => {
    const fuerzas = this.latest()?.fuerzas ?? {};
    return this.nombres().map((nombre) => ({
      nombre,
      apoyada: Number(fuerzas[nombre]) === 1,
      ...this.posiciones[nombre],
    }));
  });

  readonly apoyadas = computed(() => this.patas().filter((p) => p.apoyada).length);
  readonly total = computed(() => this.patas().length);

  readonly recientes = computed(() => this.history().slice(-64));
  readonly pasos = computed(() => Array.from({ length: this.recientes().length }, (_, i) => i));
  readonly filas = computed(() =>
    this.nombres().map((nombre) => ({
      nombre,
      celdas: this.recientes().map((s) => Number(s.fuerzas[nombre]) === 1),
    })),
  );
}
