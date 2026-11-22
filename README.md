# Dashboard-Perro-Robot

Dashboard web para ver **en vivo** la telemetría de los robots Unitree del TP05
de *Desarrollo de Aplicaciones II*: el **Go2** (perro, 12 motores y 4 patas) y el
**G1** (humanoide, 29 motores). Está hecho en Angular y consume exactamente la
API del TP05, contra el simulador o contra el robot real: **sólo cambia la IP**.

Este archivo es el punto de entrada del repositorio. La documentación del
contrato y la guía rápida del dashboard están en [API.md](API.md) y
[LEEME_DASHBOARD.md](LEEME_DASHBOARD.md).

## Contenido del repositorio

| Ruta | Qué es |
|---|---|
| `INICIAR_TP05.bat` / `.sh` | Levanta el simulador y el backend de telemetría. Elegí `1` para G1 o `2` para Go2. Imprime la IP a la que debe apuntar el dashboard. **Dejalo abierto mientras usás la app.** |
| `entorno/` | Simulador + backend FastAPI (endpoints HTTP y WebSocket). No hace falta editarlo. |
| `API.md` | Contrato oficial: endpoints, JSON, unidades y qué datos son reales, derivados o inventados. |
| `mi_dashboard/` | **La aplicación Angular**: código, tests, build y simulador local opcional. Su README tiene el detalle de cada panel. |
| `LEEME_DASHBOARD.md` | Guía rápida y nota de compatibilidad con Python 3.10. |
| `LEEME_ESTUDIANTE.md`, `LEEME_DOCENTE.md`, `INSTALACION.md` | Consigna y documentación original del TP05. |

## Requisitos

- **Python 3.10 o superior** con las dependencias del entorno (FastAPI, uvicorn,
  mujoco). `INICIAR_TP05` busca Python automáticamente; si falta algo, seguí
  [INSTALACION.md](INSTALACION.md).
- **Node.js 20.19+ / 22.12+ / 24+** y npm (se desarrolló con Node 24 y npm 11).

## Cómo usarlo

### 1. Levantar el simulador y la API

En la raíz del proyecto:

```bat
INICIAR_TP05.bat
```

Elegí `1` (G1) o `2` (Go2) cuando pregunte. El script abre el simulador, espera
a que arranque y luego inicia el backend en el puerto **8001**. La ventana
muestra algo como:

```
BACKEND DE TELEMETRIA TP05 LISTO
Robot : go2   Modo: simulador

TU DASHBOARD tiene que pegarle a:
      http://10.0.0.5:8001
```

Si en tu máquina muestra otra IP (por ejemplo `http://127.0.0.1:8001`), usá
esa. Podés comprobar que responde abriendo `http://<IP>:8001/telemetria` o la
documentación viva en `http://<IP>:8001/docs`.

### 2. Levantar el dashboard

En otra terminal:

```bash
cd mi_dashboard
npm install        # sólo la primera vez
npm start          # http://localhost:4200
```

Abrí `http://localhost:4200` en el navegador.

### 3. Apuntar a la IP correcta

El dashboard arranca con **`10.0.0.5:8001`** por defecto (la dirección de la
consigna). Si el script mostró otra IP, hacé clic en la dirección que aparece en
la barra superior, escribí la IP/puerto y apretá **Conectar**. Queda guardada en
`localStorage` (clave `uade-tp05-endpoint`), así que no hay que repetirlo. El
botón **Usar 10.0.0.5:8001** vuelve al valor original.

En la barra superior también se ven el modelo detectado, la cantidad de
motores, el estado de conexión (`EN VIVO`, `FALLBACK HTTP`, `SIN CONEXIÓN`), los
mensajes por segundo y la hora.

## Cómo funciona

**Backend (`entorno/`).** Es una API FastAPI de **sólo lectura**. Expone
`GET /telemetria` (todo junto), `GET /motores`, `GET /imu`, `GET /bms`,
`GET /fuerzas`, `GET /info` y `WS /ws`, que envía el mismo JSON que
`/telemetria` unas **10 veces por segundo**. El robot del simulador **se pasea
solo**: avanza, gira, hace curvas y para, para que los gráficos tengan
variaciones. Si se lo quiere quieto, el simulador acepta `--sin-paseo`.

**Frontend (`mi_dashboard/`).** Angular 22 standalone, signals y
`ChangeDetectionStrategy.OnPush`, sin SSR ni routing. El
`TelemetryService` usa el WebSocket como canal principal; si se corta,
reconecta con backoff (0,8 → 8 s) y mientras tanto sigue consultando
`/telemetria` cada 700 ms, mostrando el aviso *FALLBACK HTTP*. Al arrancar
consulta `/info` para no asumir modelo ni cantidad de motores, y guarda los
últimos 90 s en memoria (nada se envía a otro servidor). Los gráficos son SVG
generado por el propio código: no se usa ninguna librería de charts.

### Paneles

| Panel | Qué muestra |
|---|---|
| Ángulos de motores | Las 12/29 articulaciones en el tiempo, con filtro por motor y ventanas de 15/30/60/90 s. |
| Temperatura | Mapa de calor por motor y tendencia de máxima y promedio en 60 s. |
| Inclinación y rumbo | Horizonte artificial (roll/pitch), brújula (yaw) e histórico. |
| Batería | SOC, corriente, temperatura del pack, celdas e histórico. |
| Patas apoyadas | Diagrama superior e historial de contacto. **Sólo aparece con Go2.** |
| Esfuerzo | Torque máximo/medio y actividad de velocidad: permite ver cuándo camina y cuándo frena. |

Durante la marcha suben el torque y las temperaturas; al detenerse bajan y las
cuatro patas del Go2 quedan apoyadas.

### Proveniencia de los datos

Los colores y etiquetas de la interfaz distinguen:

- **REAL** (verde): ángulo y velocidad de motor, yaw.
- **DERIVADO** (violeta): torque, temperatura, roll/pitch, fuerzas de pata.
- **INVENTADO** (amarillo): batería del simulador.

Los umbrales de color (50 °C, 6 Nm) son **orientativos del simulador**, no
alarmas ni mediciones del robot real. La tabla completa está en
[API.md](API.md).

## Prueba sin el simulador del TP05

Dentro de `mi_dashboard/` hay un mock HTTP + WebSocket que reproduce el
contrato y el paseo automático:

```bash
npm run mock                # Go2 en :8001
npm run mock -- --robot g1  # G1
npm run mock -- --port 8002 # otro puerto
```

Después configurá `localhost:8001` (o el puerto elegido) en el dashboard. Es
una herramienta de desarrollo: **el default sigue siendo `10.0.0.5:8001`**.

## Comandos útiles

```bash
cd mi_dashboard
npm start                 # servidor de desarrollo en :4200
npm run build             # build de producción en mi_dashboard/dist/
npm test -- --watch=false # pruebas unitarias (3/3)
npm run mock              # simulador local opcional
```

## Solución de problemas

- **"Sin telemetría"**: el backend no está levantado o la IP es incorrecta.
  Revisá la ventana de `INICIAR_TP05` y probá `/telemetria` en el navegador.
  El botón **Reintentar ahora** vuelve a conectar.
- **"FALLBACK HTTP"**: los datos siguen llegando por `/telemetria`, pero el
  WebSocket se está reconectando. Si persiste, reiniciá `INICIAR_TP05`.
- **Python 3.10 y WebSocket cortado**: `entorno/api/telemetry_server.py` fue
  parcheado para atrapar también `asyncio.TimeoutError`; sin eso el WS se cerraba
  después del primer frame. Detalle en [LEEME_DASHBOARD.md](LEEME_DASHBOARD.md).
- **Con G1 no aparece el panel de patas**: es esperado, el G1 no reporta
  contacto de patas en el contrato.

## Estado

Build de producción y pruebas unitarias verificados. El dashboard fue probado
contra el simulador real del TP05 (Go2 y G1), con conexión WebSocket a ~10 Hz y
con el fallback HTTP.
