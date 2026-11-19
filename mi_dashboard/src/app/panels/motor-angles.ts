import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { serieColor, esPierna, grupoMotor } from '../core/palette';
import { MotorState, RobotInfo, Sample, Telemetry } from '../core/telemetry.models';
import { ChartSeries, LineChart } from '../shared/line-chart';

type Grupo = 'Piernas' | 'Tronco' | 'Brazos';

@Component({
  selector: 'app-motor-angles',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LineChart],
  templateUrl: './motor-angles.html',
  styleUrl: './motor-angles.scss',
})
export class MotorAngles {
  readonly history = input.required<Sample[]>();
  readonly latest = input<Telemetry | null>(null);
  readonly info = input<RobotInfo | null>(null);

  readonly ventana = signal(300); // muestras = 30 s a 10 Hz
  readonly seleccion = signal<Set<number>>(new Set());
  private modeloInicializado = '';

  constructor() {
    effect(() => {
      const modelo = this.info()?.modelo || this.latest()?.modelo || '';
      const motores = this.motores();
      if (!motores.length || modelo === this.modeloInicializado) return;
      this.modeloInicializado = modelo;
      // En el G1 arrancamos con las piernas: 29 curvas simultáneas son ilegibles.
      const ids = motores
        .filter((m) => modelo !== 'g1' || esPierna(m.nombre))
        .map((m) => m.id);
      this.seleccion.set(new Set(ids));
    });
  }

  readonly motores = computed<MotorState[]>(() => {
    const tele = this.latest();
    if (tele?.motores?.length) return tele.motores;
    return (this.info()?.motores_nombres ?? []).map((nombre, id) => ({
      id,
      nombre,
      angulo: 0,
      velocidad: 0,
      torque: 0,
      temperatura: 0,
    }));
  });

  readonly grupos = computed(() => {
    const resultado: Record<Grupo, MotorState[]> = { Piernas: [], Tronco: [], Brazos: [] };
    for (const m of this.motores()) resultado[grupoMotor(m.nombre)].push(m);
    return resultado;
  });

  readonly gruposLista = computed(() =>
    (['Piernas', 'Tronco', 'Brazos'] as Grupo[])
      .map((nombre) => ({ nombre, motores: this.grupos()[nombre] }))
      .filter((g) => g.motores.length > 0),
  );

  readonly ventanaActual = computed(() => this.history().slice(-this.ventana()));
  readonly times = computed(() => this.ventanaActual().map((s) => s.t));

  readonly series = computed<ChartSeries[]>(() =>
    this.motores()
      .filter((m) => this.seleccion().has(m.id))
      .map((m) => ({
        name: m.nombre,
        color: serieColor(m.id),
        values: this.ventanaActual().map((s) => s.angles[m.id] ?? Number.NaN),
      })),
  );

  readonly visibles = computed(() => this.motores().filter((m) => this.seleccion().has(m.id)));
  readonly activos = computed(() => this.visibles().length);

  toggle(id: number): void {
    this.seleccion.update((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  seleccionar(tipo: 'todos' | 'ninguno' | 'piernas'): void {
    const motores = this.motores();
    if (tipo === 'ninguno') return this.seleccion.set(new Set());
    if (tipo === 'todos') return this.seleccion.set(new Set(motores.map((m) => m.id)));
    this.seleccion.set(
      new Set(motores.filter((m) => esPierna(m.nombre)).map((m) => m.id)),
    );
  }

  color(id: number): string {
    return serieColor(id);
  }
}
