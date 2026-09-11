# Protocolo Androide · Robotic Viewer VR

Juego de realidad mixta: la cámara detecta tu cuerpo y reconstruye manos, dedos y extremidades como prótesis robóticas.

## Demo

**[https://ojperdomoc.github.io/roboticviewer_VR/](https://ojperdomoc.github.io/roboticviewer_VR/)**

Necesitas HTTPS (GitHub Pages lo proporciona) y permiso de cámara. Todo el tracking corre en el dispositivo; no se envía video a ningún servidor.

## Desarrollo local

```bash
npm install
npm run dev
```

Luego abre la URL que imprime Vite (por defecto `http://localhost:5173/roboticviewer_VR/`).

```bash
npm run build    # genera dist/
npm run preview  # sirve el build de producción
```

## GitHub Pages

El sitio se construye con Vite y se publica automáticamente con GitHub Actions al hacer push a `main`.

1. **Settings → Pages → Source:** GitHub Actions
2. El workflow `.github/workflows/deploy-pages.yml` instala dependencias, ejecuta `npm run build` y despliega `dist/`
3. `vite.config.ts` usa `base: "/roboticviewer_VR/"` para que los assets resuelvan bajo el path del repositorio
