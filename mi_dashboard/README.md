# Unitree Live — Dashboard TP05

Dashboard web Angular que muestra **en vivo** la telemetría de un robot Unitree
(Go2 de 12 motores o G1 de 29), contra la API del TP05.

**Dirección por defecto: `http://10.0.0.5:8001`** (la que imprime
`INICIAR_TP05.bat` / `.sh`). Si en tu laboratorio muestra otra IP, cambiala desde
el botón de la dirección en la barra superior (o en `localStorage`, clave
`uade-tp05-endpoint`). El día del robot real no cambia nada más: el JSON y los
endpoints son los mismos.

## Arrancar

```bash
cd mi_dashboard
npm install
npm start          # http://localhost:4200
```

Dejá abierta la ventana de `INICIAR_TP05` mientras desarrollás. Para chequear
que el backend responde, abrí `http://10.0.0.5:8001/telemetria` en el navegador.

### Probar sin el simulador del laboratorio

Hay un simulador HTTP + WebSocket de respaldo que reproduce el contrato y el
paseo automático del TP05:

```bash
npm run mock                # Go2 en :8001
npm run mock -- --robot g1  # G1
npm run mock -- --port 8002 # otro puerto
```

Después, en el dashboard, apretá la dirección de la barra superior y poné
`localhost:8001` (o el puerto que elegiste). **El default sigue siendo
`10.0.0.5:8001`**: el mock es sólo una herramienta de desarrollo.

## Qué muestra

| Panel | Datos | Origen en el simulador |
|---|---|---|
| Ángulos de motores | gráfico multi-serie con las 12/29 articulaciones, selector por motor y ventana de 15/30/60/90 s | **real** |
| Temperatura | mapa de calor por motor + tendencia (máx. y promedio) en 60 s | **derivada** |
| Inclinación | horizonte artificial (roll/pitch), brújula (yaw) e histórico | yaw real; roll/pitch derivados |
| Batería | gauge SOC, corriente, temperatura del pack, celdas e histórico | **inventada** |
| Patas apoyadas (Go2) | diagrama superior + historial de contacto de 6,4 s | **derivada** |
| Esfuerzo | torque máx./medio y actividad de velocidad; hace visible la marcha | **derivado** |

El robot del simulador camina solo (avanza, gira, hace curvas y para). Los
gráficos de torque y temperatura suben durante la marcha y bajan en las pausas;
en las pausas las cuatro patas del Go2 quedan apoyadas.

Los umbrales de color (50 °C, 6 Nm) son **orientativos del simulador**: con el
robot real los valores medidos pueden ser distintos y no deben interpretarse
como alarmas de seguridad.

## Conexión

- `WebSocket ws://<IP>:8001/ws` a ~10 Hz es el canal principal.
- Si se corta, reconecta con backoff (0,8 → 8 s) y mientras tanto sigue
  consultando `GET /telemetria` cada 700 ms (modo "FALLBACK HTTP").
- `GET /info` se consulta al arrancar para no asumir modelo ni cantidad de
  motores; si falla, se infiere del campo `modelo` del primer frame.
- Los últimos 90 s de telemetría se guardan en memoria (no se envían a ningún
  servidor).

## Estructura

```
src/app/
  core/            modelos del contrato, servicio WS/HTTP, paleta
  shared/          gráfico de líneas SVG (sin librerías externas)
  panels/          ángulos, temperatura, inclinación, batería, patas, esfuerzo
  app.*            shell: barra de estado, KPIs, layout y configuración de IP
mock/              simulador local opcional (npm run mock)
```

Angular 22, TypeScript, signals, `ChangeDetectionStrategy.OnPush`. No se usó
ninguna librería de gráficos: el gráfico es SVG generado por `computed()` y
soporta tooltip con los valores de todas las series.

## Comandos

```bash
npm start    # servidor de desarrollo
npm run build # build de producción en dist/
npm test     # pruebas unitarias
```
