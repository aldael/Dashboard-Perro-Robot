/** Paleta de series: suficiente para distinguir los 29 motores del G1. */
const SERIES = [
  '#22d3ee', '#f472b6', '#a78bfa', '#4ade80', '#fbbf24', '#60a5fa',
  '#fb923c', '#e879f9', '#34d399', '#f87171', '#c084fc', '#fde047',
  '#38bdf8', '#f9a8d4', '#818cf8', '#86efac', '#fdba74', '#67e8f9',
  '#d8b4fe', '#fca5a5', '#a3e635', '#93c5fd', '#f0abfc', '#5eead4',
  '#fcd34d', '#fda4af', '#c4b5fd', '#bef264', '#7dd3fc',
];

export function serieColor(index: number): string {
  return SERIES[index % SERIES.length];
}

/** 28 °C = frío (cian) → 55 °C = caliente (rojo), según el simulador. */
export function colorTemperatura(temp: number): string {
  const t = Math.min(1, Math.max(0, (temp - 28) / 27));
  const hue = 190 - t * 190;
  const light = 58 - t * 8;
  return `hsl(${hue.toFixed(0)} 85% ${light.toFixed(0)}%)`;
}

export function grupoMotor(nombre: string): 'Piernas' | 'Tronco' | 'Brazos' {
  const n = nombre.toLowerCase();
  if (/hip|knee|thigh|calf|ankle/.test(n)) return 'Piernas';
  if (/torso|waist/.test(n)) return 'Tronco';
  return 'Brazos';
}

export function esPierna(nombre: string): boolean {
  return grupoMotor(nombre) === 'Piernas';
}
