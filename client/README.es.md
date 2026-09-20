# Pre-match — Client (Web)

[English](README.md) | [Español](README.es.md)

Cliente web de la herramienta de análisis pre-partido.

> **Estado:** desarrollo temprano. La app sigue siendo el scaffold de Vite + React; la UI real y la conexión con la API son _WIP_.

## Stack tecnológico

| Área        | Tecnología                     |
| ----------- | ------------------------------ |
| UI          | React 19                       |
| Build/dev   | Vite 8                         |
| Linting     | Oxlint                         |
| Lenguaje    | JavaScript (ESM), JSX          |

## Requisitos

- Node.js (LTS)
- pnpm `11.3.0`

## Scripts

| Script          | Descripción                                    |
| --------------- | ---------------------------------------------- |
| `pnpm dev`      | Arranca el dev server de Vite con HMR          |
| `pnpm build`    | Genera el bundle de producción en `dist/`      |
| `pnpm preview`  | Previsualiza el build de producción en local   |
| `pnpm lint`     | Ejecuta Oxlint                                 |

Desde la raíz del monorepo también puedes usar `pnpm dev:client`.

## Estructura del proyecto

```
client/
├── index.html            # Punto de entrada HTML
├── vite.config.js        # Configuración de Vite
├── .oxlintrc.json        # Configuración de Oxlint
├── public/               # Assets estáticos servidos tal cual
└── src/
    ├── main.jsx          # Entrada de React (monta <App />)
    ├── App.jsx           # Componente raíz (scaffold)   (WIP)
    ├── App.css           # Estilos de la app
    ├── index.css         # Estilos globales
    └── assets/           # Imágenes e iconos
```

## Configuración

- **Dev server:** valores por defecto de Vite (`http://localhost:5173`).
- **Proxy de API:** aún no configurado. Cuando el cliente empiece a consumir la API, añade una entrada `server.proxy` en `vite.config.js` para reenviar las peticiones a `/api` hacia el backend (`http://localhost:3000`). _(WIP)_
- **Entorno:** las variables de cliente deben usar el prefijo `VITE_` y se leen con `import.meta.env`. _(WIP)_

## Documentación relacionada

- [README raíz](../README.es.md)
- [README del servidor](../server/README.es.md)
