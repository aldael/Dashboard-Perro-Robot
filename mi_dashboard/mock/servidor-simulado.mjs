/**
 * Simulador local del contrato TP05 (solo para desarrollo).
 * Expone /info, /telemetria, /motores, /imu, /bms, /fuerzas y WS /ws en :8001.
 * El robot se pasea solo con el mismo recorrido que entorno/sim/paseo.py.
 *
 *   npm run mock                 # Go2
 *   npm run mock -- --robot g1   # G1
 *   npm run mock -- --port 8002
 */
import http from 'node:http';
import { WebSocketServer } from 'ws';

const args = process.argv.slice(2);
const valor = (flag, def) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const ROBOT = valor('--robot', 'go2').toLowerCase() === 'g1' ? 'g1' : 'go2';
const PORT = Number(valor('--port', '8001'));

const ROBOTS = {
  go2: {
    nombre: 'Unitree Go2 EDU',
    tipo: 'cuadrupedo',
    n_motores: 12,
    patas: ['FR', 'FL', 'RR', 'RL'],
    motores_nombres: [
      'FR_hip', 'FR_thigh', 'FR_calf', 'FL_hip', 'FL_thigh', 'FL_calf',
      'RR_hip', 'RR_thigh', 'RR_calf', 'RL_hip', 'RL_thigh', 'RL_calf',
    ],
  },
  g1: {
    nombre: 'Unitree G1 EDU',
    tipo: 'humanoide',
    n_motores: 29,
    patas: ['R_foot', 'L_foot'],
    motores_nombres: [
      'L_hip_yaw', 'L_hip_roll', 'L_hip_pitch', 'L_knee', 'L_ankle_pitch', 'L_ankle_roll',
      'R_hip_yaw', 'R_hip_roll', 'R_hip_pitch', 'R_knee', 'R_ankle_pitch', 'R_ankle_roll',
      'torso_yaw', 'torso_roll', 'torso_pitch',
      'L_shoulder_pitch', 'L_shoulder_roll', 'L_shoulder_yaw',
      'L_elbow', 'L_wrist_roll', 'L_wrist_pitch', 'L_wrist_yaw',
      'R_shoulder_pitch', 'R_shoulder_roll', 'R_shoulder_yaw',
      'R_elbow', 'R_wrist_roll', 'R_wrist_pitch', 'R_wrist_yaw',
    ],
  },
};
const cfg = ROBOTS[ROBOT];

// Tramos del recorrido del simulador real (vx, vy, vyaw, segundos).
const RECORRIDO = [
  [0.2, 0, 0, 2.5], [0, 0, 0.5, 1.6], [0.15, 0, 0.3, 2], [0, 0, 0, 1.2],
  [0.18, 0, -0.35, 2], [0, 0, -0.5, 1.6], [-0.15, 0, 0, 1.8], [0, 0, 0, 1.2],
];
const DURACION = RECORRIDO.reduce((a, s) => a + s[3], 0);

const inicio = Date.now();
let fase = 0;
let yaw = 0;
let bateria = 87;
const temps = Array(cfg.n_motores).fill(28);
let ultimo = Date.now() / 1000;

function parametrosMotor(nombre) {
  const n = nombre.toLowerCase();
  if (/calf|knee/.test(n)) return { base: -25, amp: 24, carga: 1 };
  if (/thigh|hip_pitch/.test(n)) return { base: 8, amp: 22, carga: 1 };
  if (/hip_roll|hip_yaw/.test(n)) return { base: 0, amp: 9, carga: 0.8 };
  if (/ankle/.test(n)) return { base: 0, amp: 12, carga: 0.7 };
  if (/torso|waist/.test(n)) return { base: 0, amp: 3, carga: 0.2 };
  if (/shoulder/.test(n)) return { base: 0, amp: 11, carga: 0.3 };
  if (/elbow/.test(n)) return { base: -20, amp: 14, carga: 0.25 };
  return { base: 0, amp: 5, carga: 0.15 };
}

function telemetria() {
  const ahora = Date.now() / 1000;
  const dt = Math.min(0.5, Math.max(0, ahora - ultimo));
  ultimo = ahora;
  const tRelativo = ((Date.now() - inicio) / 1000) % DURACION;
  let acumulado = 0;
  let tramo = RECORRIDO[0];
  for (const s of RECORRIDO) {
    if (tRelativo < acumulado + s[3]) { tramo = s; break; }
    acumulado += s[3];
  }
  const [vx, , vyaw] = tramo;
  const moviendose = Math.abs(vx) > 0.001 || Math.abs(vyaw) > 0.001;
  const velocidadMarcha = Math.abs(vx) / 0.2;
  const velocidadGiro = Math.abs(vyaw) / 0.5;
  const ritmo = moviendose ? 2.1 + 0.8 * velocidadMarcha : 0;
  fase += ritmo * dt;
  yaw += (vyaw * 180 * dt) / Math.PI;

  const motores = cfg.motores_nombres.map((nombre, i) => {
    const p = parametrosMotor(nombre);
    const desfase = i * 0.55 + (i % 4) * 1.1;
    const angulo = p.base + (moviendose ? p.amp * Math.sin(fase + desfase) : p.base * 0.05);
    const vel = moviendose ? (p.amp * Math.PI / 180) * ritmo * Math.cos(fase + desfase) : 0;
    const esfuerzo = moviendose
      ? Math.min(1, (0.3 + 0.7 * Math.abs(Math.sin(fase + desfase))) *
        (0.45 + 0.55 * Math.max(velocidadMarcha, velocidadGiro * 0.8)))
      : 0;
    const objetivo = 28 + esfuerzo * 27;
    const paso = (objetivo > temps[i] ? 0.9 : 0.25) * dt;
    temps[i] += Math.sign(objetivo - temps[i]) * Math.min(paso, Math.abs(objetivo - temps[i]));
    return {
      id: i,
      nombre,
      angulo: Number(angulo.toFixed(2)),
      velocidad: Number(vel.toFixed(3)),
      torque: Number((esfuerzo * p.carga * 12).toFixed(2)),
      temperatura: Number(temps[i].toFixed(1)),
    };
  });

  const roll = moviendose ? 2 * Math.sin(fase) : 0;
  const pitch = moviendose ? 1.5 * Math.sin(2 * fase + 0.7) : 0;
  bateria = Math.max(5, bateria - 0.004 * dt * (moviendose ? 2.5 : 1));

  const fuerzas = {};
  cfg.patas.forEach((pata, i) => {
    if (ROBOT === 'g1') {
      fuerzas[pata] = Math.sin(fase + i * Math.PI) < 0.3 ? 1 : 0;
    } else {
      const desfase = i === 1 || i === 2 ? Math.PI : 0;
      fuerzas[pata] = !moviendose || Math.sin(fase + desfase) < 0.3 ? 1 : 0;
    }
  });

  return {
    modelo: ROBOT,
    ts: Number(((Date.now() - inicio) / 1000).toFixed(2)),
    motores,
    imu: {
      roll: Number(roll.toFixed(3)), pitch: Number(pitch.toFixed(3)),
      yaw: Number((((yaw % 360) + 360) % 360).toFixed(2)),
      ax: Number((moviendose ? 0.1 * Math.sin(fase) : 0).toFixed(3)),
      ay: 0, az: 9.79,
    },
    bms: {
      soc: Math.round(bateria),
      corriente: moviendose ? -780 - Math.round(120 * velocidadMarcha) : -60,
      temperatura: 32.5,
      celdas: Array.from({ length: 12 }, (_, i) => Number((3.72 + 0.01 * Math.sin(i)).toFixed(3))),
    },
    fuerzas,
  };
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const server = http.createServer((req, res) => {
  const ruta = (req.url || '/').split('?')[0];
  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    return res.end();
  }
  const dato = telemetria();
  let cuerpo;
  if (ruta === '/info') {
    cuerpo = { ...cfg, modelo: ROBOT, frecuencia_hz: 10, modo: 'demo' };
  } else if (ruta === '/motores') {
    cuerpo = { modelo: ROBOT, n_motores: dato.motores.length, motores: dato.motores };
  } else if (ruta === '/imu') cuerpo = dato.imu;
  else if (ruta === '/bms') cuerpo = dato.bms;
  else if (ruta === '/fuerzas') cuerpo = dato.fuerzas;
  else if (ruta === '/telemetria' || ruta === '/modo') {
    cuerpo = ruta === '/modo' ? { modo: 'demo', robot: ROBOT } : dato;
  } else {
    res.writeHead(404, cors);
    return res.end('No encontrado');
  }
  res.writeHead(200, { ...cors, 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(cuerpo));
});

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => {
  const timer = setInterval(() => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(telemetria()));
  }, 100);
  ws.on('close', () => clearInterval(timer));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[MOCK TP05] ${cfg.nombre} en http://localhost:${PORT} · WS ws://localhost:${PORT}/ws`);
  console.log('[MOCK TP05] Dashboard apuntando a 10.0.0.5:8001 por defecto; cambialo en ⚙ para probar acá.');
});
