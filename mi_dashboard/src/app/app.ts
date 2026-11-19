import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { DEFAULT_ENDPOINT, TelemetryService } from './core/telemetry.service';
import { num } from './core/telemetry.models';
import { Attitude } from './panels/attitude';
import { Battery } from './panels/battery';
import { Effort } from './panels/effort';
import { Legs } from './panels/legs';
import { MotorAngles } from './panels/motor-angles';
import { Temperature } from './panels/temperature';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MotorAngles, Attitude, Legs, Temperature, Effort, Battery],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnDestroy {
  readonly telemetry = inject(TelemetryService);

  readonly settingsOpen = signal(false);
  readonly endpointEdit = signal(this.telemetry.endpoint());
  readonly ahora = signal(Date.now());
  private readonly reloj = setInterval(() => this.ahora.set(Date.now()), 1000);

  readonly latest = this.telemetry.latest;
  readonly history = this.telemetry.history;
  readonly info = this.telemetry.info;
  readonly status = this.telemetry.status;
  readonly rate = this.telemetry.rate;

  readonly modelo = computed(
    () => this.info()?.modelo || this.latest()?.modelo || '—',
  );
  readonly nombreRobot = computed(() => {
    const info = this.info();
    if (info?.nombre) return info.nombre;
    return this.modelo() === 'g1' ? 'Unitree G1' : this.modelo() === 'go2' ? 'Unitree Go2' : 'Robot desconocido';
  });
  readonly esSimulador = computed(() => {
    const modo = this.info()?.modo;
    return !modo || modo === 'demo' || modo === 'simulador';
  });
  readonly estadoTexto = computed(
    () =>
      ({
        live: 'EN VIVO',
        polling: 'FALLBACK HTTP',
        connecting: 'CONECTANDO',
        offline: 'SIN CONEXIÓN',
      })[this.status()],
  );
  readonly lastAge = computed(() => {
    const last = this.telemetry.lastMessageAt();
    return last === null ? null : Math.max(0, Math.round((this.ahora() - last) / 1000));
  });

  readonly soc = computed(() => this.latest()?.bms?.soc ?? 0);
  readonly maxTemp = computed(() => {
    const m = this.latest()?.motores ?? [];
    return m.length ? Math.max(...m.map((x) => num(x.temperatura))) : 0;
  });
  readonly maxTorque = computed(() => {
    const m = this.latest()?.motores ?? [];
    return m.length ? Math.max(...m.map((x) => num(x.torque))) : 0;
  });
  readonly velocidadMedia = computed(() => {
    const m = this.latest()?.motores ?? [];
    return m.length
      ? m.reduce((a, x) => a + Math.abs(num(x.velocidad)), 0) / m.length
      : 0;
  });
  readonly moviendose = computed(() => this.velocidadMedia() > 0.05);
  readonly apoyadas = computed(() =>
    Object.values(this.latest()?.fuerzas ?? {}).filter((v) => Number(v) === 1).length,
  );
  readonly nPatas = computed(() => Object.keys(this.latest()?.fuerzas ?? {}).length);

  readonly hora = computed(() =>
    new Date(this.ahora()).toLocaleTimeString('es-AR', { hour12: false }),
  );

  abrirConfig(): void {
    this.endpointEdit.set(this.telemetry.endpoint());
    this.settingsOpen.set(true);
  }

  aplicarEndpoint(): void {
    this.telemetry.cambiarEndpoint(this.endpointEdit());
    this.settingsOpen.set(false);
  }

  usarDefault(): void {
    this.endpointEdit.set(DEFAULT_ENDPOINT);
    this.telemetry.cambiarEndpoint(DEFAULT_ENDPOINT);
    this.settingsOpen.set(false);
  }

  ngOnDestroy(): void {
    clearInterval(this.reloj);
  }
}
