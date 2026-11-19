# Dashboard de telemetría (TP05)

El dashboard web quedó en **`mi_dashboard/`**, dentro de esta misma carpeta del TP05.

## Uso rápido

```bash
cd mi_dashboard
npm install        # sólo la primera vez
npm start          # abre http://localhost:4200
```

Dejá abierto `INICIAR_TP05.bat` (o `.sh`) mientras usás el dashboard. Por defecto
apunta a `http://10.0.0.5:8001` (WS `ws://10.0.0.5:8001/ws`), la dirección que
imprime el script. Si tu laboratorio muestra otra IP, cambiala desde el botón de
la dirección en la barra superior del dashboard; se guarda en `localStorage`.

Para probar sin el simulador del laboratorio:

```bash
npm run mock                # Go2 en :8001
npm run mock -- --robot g1  # G1
```

Después configurá `localhost:8001` en el dashboard. El mock es opcional.

## Verificación

```bash
npm run build              # build de producción OK
npm test -- --watch=false  # 3/3 pruebas OK
```

La documentación completa de paneles, proveniencia de los datos (REAL /
DERIVADO / INVENTADO) y conexión está en `mi_dashboard/README.md`.

## Nota sobre el WebSocket (Python 3.10)

`entorno/api/telemetry_server.py` tenía `except TimeoutError:` en el handler de
`/ws`. En Python 3.10 `asyncio.TimeoutError` **no** es el `TimeoutError` builtin
(sí se unificaron en 3.11), así que el servidor cerraba el WebSocket después del
primer frame y el dashboard mostraba el aviso *"WebSocket caído: datos por
/telemetria (fallback)"*. Se cambió por `except (TimeoutError,
asyncio.TimeoutError):`, compatible con 3.10 y 3.11+. Después de reiniciar
`INICIAR_TP05`, el dashboard vuelve a **EN VIVO** a ~10 Hz y el aviso desaparece.
