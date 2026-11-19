import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { normalizarBase } from './core/telemetry.service';
import { isTelemetry, toSample } from './core/telemetry.models';

describe('Dashboard TP05', () => {
  it('crea el componente principal', async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('normaliza la dirección que muestra el script', () => {
    expect(normalizarBase('10.0.0.5:8001')).toBe('http://10.0.0.5:8001');
    expect(normalizarBase('ws://10.0.0.5:8001/')).toBe('http://10.0.0.5:8001');
    expect(normalizarBase('http://localhost:8002')).toBe('http://localhost:8002');
  });

  it('valida y convierte el JSON del contrato', () => {
    const dato = {
      modelo: 'go2', ts: 1.5,
      motores: [{ id: 0, nombre: 'FR_hip', angulo: 45, velocidad: -0.2, torque: 1.3, temperatura: 30 }],
      imu: { roll: 1, pitch: 2, yaw: 3 },
      bms: { soc: 86 },
      fuerzas: { FR: 1, FL: 0, RR: 0, RL: 1 },
    };
    expect(isTelemetry(dato)).toBe(true);
    expect(isTelemetry({ motores: [] })).toBe(false);
    const sample = toSample(dato as never, 99);
    expect(sample.t).toBe(1.5);
    expect(sample.angles[0]).toBe(45);
    expect(sample.fuerzas['FR']).toBe(1);
  });
});
