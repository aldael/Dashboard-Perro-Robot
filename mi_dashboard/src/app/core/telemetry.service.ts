import { Injectable, OnDestroy, computed, signal } from '@angular/core';
import {
  ConnectionStatus,
  RobotInfo,
  Sample,
  Telemetry,
  isTelemetry,
  normalizarTelemetria,
  toSample,
} from './telemetry.models';

const STORAGE_KEY = 'uade-tp05-endpoint';
/** La dirección que muestra INICIAR_TP05.bat / .sh. El día del robot cambia sólo esto. */
export const DEFAULT_ENDPOINT = '10.0.0.5:8001';
const MAX_SAMPLES = 900; // 90 s a 10 Hz

function endpointGuardado(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_ENDPOINT;
  } catch {
    return DEFAULT_ENDPOINT;
  }
}

/** Acepta "10.0.0.5:8001", "http://10.0.0.5:8001" o "ws://10.0.0.5:8001". */
export function normalizarBase(raw: string): string {
  let s = (raw || '').trim().replace(/\/+$/, '');
  s = s.replace(/^wss?:\/\//i, 'http://');
  if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
  return s;
}

@Injectable({ providedIn: 'root' })
export class TelemetryService implements OnDestroy {
  private readonly endpointSignal = signal(endpointGuardado());

  readonly endpoint = this.endpointSignal.asReadonly();
  readonly baseUrl = computed(() => normalizarBase(this.endpointSignal()));
  readonly wsUrl = computed(() => this.baseUrl().replace(/^http/i, 'ws') + '/ws');
  readonly httpUrl = computed(() => this.baseUrl() + '/telemetria');

  readonly status = signal<ConnectionStatus>('connecting');
  readonly info = signal<RobotInfo | null>(null);
  readonly latest = signal<Telemetry | null>(null);
  readonly history = signal<Sample[]>([]);
  readonly lastMessageAt = signal<number | null>(null);
  readonly rate = signal(0);
  readonly frames = signal(0);

  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private rateTimer: ReturnType<typeof setInterval> | null = null;
  private connectionId = 0;
  private intentos = 0;
  private framesEnVentana = 0;

  constructor() {
    this.conectar();
    this.rateTimer = setInterval(() => {
      this.rate.set(this.framesEnVentana / 2);
      this.framesEnVentana = 0;
    }, 2000);
  }

  cambiarEndpoint(raw: string): void {
    const valor = raw.trim();
    if (!valor) return;
    try {
      localStorage.setItem(STORAGE_KEY, valor);
    } catch {
      /* modo privado: funciona igual mientras la pestaña esté abierta */
    }
    this.endpointSignal.set(valor);
    this.detenerConexion();
    this.info.set(null);
    this.latest.set(null);
    this.history.set([]);
    this.lastMessageAt.set(null);
    this.status.set('connecting');
    this.conectar();
  }

  reintentar(): void {
    this.detenerConexion();
    this.status.set('connecting');
    this.intentos = 0;
    this.conectar();
  }

  ngOnDestroy(): void {
    this.detenerConexion();
    if (this.rateTimer) clearInterval(this.rateTimer);
  }

  // ---------------------------------------------------------------- conexión

  private conectar(): void {
    const id = ++this.connectionId;
    this.traerInfo(id);

    let ws: WebSocket;
    try {
      ws = new WebSocket(this.wsUrl());
    } catch {
      this.fallo(id);
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      if (id !== this.connectionId) return;
      this.intentos = 0;
      this.iniciarWatchdog(id);
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      if (id !== this.connectionId) return;
      try {
        const dato: unknown = JSON.parse(event.data);
        if (!isTelemetry(dato)) return;
        this.ingestar(dato);
        this.status.set('live');
        this.detenerPolling();
      } catch {
        /* un frame roto no mata la conexión */
      }
    };

    ws.onerror = () => {
      // onclose llega justo después; ahí se decide el fallback.
    };

    ws.onclose = () => {
      if (id !== this.connectionId) return;
      this.ws = null;
      this.detenerWatchdog();
      this.status.set('offline');
      this.iniciarPolling(id);
      this.programarReconexion(id);
    };
  }

  private traerInfo(id: number): void {
    fetch(this.baseUrl() + '/info')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: RobotInfo) => {
        if (id === this.connectionId && data?.modelo) this.info.set(data);
      })
      .catch(() => {
        // Sin /info igual sabemos el modelo por el campo `modelo` de la telemetría.
      });
  }

  private programarReconexion(id: number): void {
    if (id !== this.connectionId || this.reconnectTimer) return;
    const espera = Math.min(8000, 800 * 2 ** this.intentos++);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (id === this.connectionId) this.conectar();
    }, espera);
  }

  /** Si el WebSocket quedó "abierto" pero dejó de mandar datos, lo cortamos. */
  private iniciarWatchdog(id: number): void {
    this.detenerWatchdog();
    this.watchdogTimer = setInterval(() => {
      if (id !== this.connectionId) return;
      const ultimo = this.lastMessageAt();
      if (ultimo !== null && Date.now() - ultimo > 3000) this.ws?.close();
    }, 1500);
  }

  private detenerWatchdog(): void {
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.watchdogTimer = null;
  }

  /** Mientras no haya WebSocket, /telemetria mantiene el dashboard vivo. */
  private iniciarPolling(id: number): void {
    if (this.pollTimer) return;
    const consultar = () => {
      if (id !== this.connectionId) return;
      fetch(this.httpUrl())
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((dato: unknown) => {
          if (id !== this.connectionId || !isTelemetry(dato)) return;
          this.ingestar(dato);
          this.status.set('polling');
        })
        .catch(() => {});
    };
    consultar();
    this.pollTimer = setInterval(consultar, 700);
  }

  private detenerPolling(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  private fallo(id: number): void {
    if (id !== this.connectionId) return;
    this.status.set('offline');
    this.iniciarPolling(id);
    this.programarReconexion(id);
  }

  private detenerConexion(): void {
    this.connectionId++;
    this.detenerPolling();
    this.detenerWatchdog();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      ws.onclose = null;
      ws.onmessage = null;
      ws.close();
    }
  }

  private ingestar(dato: Telemetry): void {
    const ahora = Date.now();
    const t = normalizarTelemetria(dato);
    const sample = toSample(t, ahora / 1000);
    this.latest.set(t);
    this.history.update((h) => {
      const siguiente = h.length >= MAX_SAMPLES ? h.slice(h.length - MAX_SAMPLES + 1) : h.slice();
      siguiente.push(sample);
      return siguiente;
    });
    this.lastMessageAt.set(ahora);
    this.frames.update((n) => n + 1);
    this.framesEnVentana++;
  }
}
