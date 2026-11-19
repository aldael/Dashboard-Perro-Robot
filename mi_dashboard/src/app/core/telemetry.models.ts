/** Contrato del TP05: https://github.com/.../API.md (idéntico en simulador y robot real). */

export interface MotorState {
  id: number;
  nombre: string;
  /** grados — REAL */
  angulo: number;
  /** rad/s — REAL (derivado del movimiento) */
  velocidad: number;
  /** Nm — DERIVADO en el simulador */
  torque: number;
  /** °C — DERIVADO en el simulador */
  temperatura: number;
}

export interface ImuState {
  /** grados — DERIVADO en el simulador */
  roll: number;
  /** grados — DERIVADO en el simulador */
  pitch: number;
  /** grados — REAL */
  yaw: number;
  ax?: number;
  ay?: number;
  az?: number;
}

export interface BmsState {
  /** % — INVENTADO en el simulador */
  soc: number;
  corriente?: number;
  temperatura?: number;
  celdas?: number[];
}

export interface Telemetry {
  modelo: string;
  /** segundos desde que arrancó el backend */
  ts: number;
  motores: MotorState[];
  imu: ImuState;
  bms: BmsState;
  /** 1 = apoyada, 0 = en el aire — DERIVADO en el simulador. El G1 no lo reporta útilmente. */
  fuerzas: Record<string, number>;
}

export interface RobotInfo {
  modelo: string;
  nombre: string;
  tipo: string;
  n_motores: number;
  motores_nombres: string[];
  patas: string[];
  frecuencia_hz: number;
  modo: string;
}

/** Un frame del historial. Se guarda todo lo que el dashboard necesita graficar. */
export interface Sample {
  t: number;
  angles: number[];
  temps: number[];
  torques: number[];
  speeds: number[];
  roll: number;
  pitch: number;
  yaw: number;
  soc: number;
  corriente: number;
  tempBms: number;
  fuerzas: Record<string, number>;
}

export type ConnectionStatus = 'connecting' | 'live' | 'polling' | 'offline';

export function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function isTelemetry(value: unknown): value is Telemetry {
  if (!value || typeof value !== 'object') return false;
  const t = value as Partial<Telemetry>;
  return Array.isArray(t.motores) && !!t.imu && !!t.bms && typeof t === 'object';
}

/** El contrato manda números, pero normalizar evita que un string rompa los gráficos. */
export function normalizarTelemetria(t: Telemetry): Telemetry {
  return {
    modelo: String(t.modelo ?? ''),
    ts: num(t.ts),
    motores: (t.motores ?? []).map((m) => ({
      id: num(m.id),
      nombre: String(m.nombre ?? `motor_${m.id}`),
      angulo: num(m.angulo),
      velocidad: num(m.velocidad),
      torque: num(m.torque),
      temperatura: num(m.temperatura),
    })),
    imu: {
      roll: num(t.imu?.roll),
      pitch: num(t.imu?.pitch),
      yaw: num(t.imu?.yaw),
      ax: num(t.imu?.ax),
      ay: num(t.imu?.ay),
      az: num(t.imu?.az),
    },
    bms: {
      soc: num(t.bms?.soc),
      corriente: num(t.bms?.corriente),
      temperatura: num(t.bms?.temperatura),
      celdas: (t.bms?.celdas ?? []).map((c) => num(c)),
    },
    fuerzas: Object.fromEntries(
      Object.entries(t.fuerzas ?? {}).map(([k, v]) => [k, num(v)]),
    ),
  };
}

export function toSample(t: Telemetry, fallbackTime: number): Sample {
  return {
    t: Number.isFinite(t.ts) ? t.ts : fallbackTime,
    angles: t.motores.map((m) => num(m.angulo)),
    temps: t.motores.map((m) => num(m.temperatura)),
    torques: t.motores.map((m) => num(m.torque)),
    speeds: t.motores.map((m) => num(m.velocidad)),
    roll: num(t.imu?.roll),
    pitch: num(t.imu?.pitch),
    yaw: num(t.imu?.yaw),
    soc: num(t.bms?.soc),
    corriente: num(t.bms?.corriente),
    tempBms: num(t.bms?.temperatura),
    fuerzas: { ...(t.fuerzas ?? {}) },
  };
}
