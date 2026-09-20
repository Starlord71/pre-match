# Pre-match

[English](README.md) | [Español](README.es.md)

Herramienta de análisis pre-partido para próximos partidos de fútbol.

> **Estado:** el lado servidor (fases 1-4 del plan) está implementado y cubierto por tests; el cliente web sigue siendo el scaffold de Vite (fase 5) y el empaquetado Docker (fase 7) está pendiente.

## Descripción general

Este monorepo contiene la API backend y el cliente web de una herramienta que ayuda a analizar partidos de fútbol antes de que se jueguen.

## Estado actual

- **Hecho (servidor):** API de Express, SQLite con migraciones y cache, cliente de football-data.org con rate limiting, sincronización de ligas (`POST /api/sync/:league`), el motor de análisis de cuatro señales (`GET /api/analysis`) y actualizaciones de partidos en vivo vía Socket.io.
- **En progreso:** cliente en React (responsive + i18n) y empaquetado Docker.
- **Referencia de la API:** consulta [`server/README.es.md`](server/README.es.md).

## Estructura del proyecto

```
pre-match/
├── server/   # API backend (Express + SQLite + Socket.io)
└── client/   # Cliente web (React + Vite)
```

- Consulta [`server/README.es.md`](server/README.es.md) para la documentación de la API.
- Consulta [`client/README.es.md`](client/README.es.md) para la documentación del cliente web.

## Stack tecnológico

| Paquete  | Stack                                                    |
| -------- | -------------------------------------------------------- |
| `server` | Node.js, Express, better-sqlite3, Socket.io, Zod         |
| `client` | React 19, Vite                                          |
| Tooling  | pnpm workspaces, Vitest, Oxlint                          |

## Requisitos

- Node.js (LTS)
- [pnpm](https://pnpm.io/) `11.3.0` (fijado vía `packageManager` en `package.json`)

## Puesta en marcha

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar el entorno
cp .env.example .env
# edita .env y completa los valores necesarios

# 3. Arrancar la API en modo desarrollo
pnpm dev
```

## Scripts de la raíz

| Script            | Descripción                          |
| ----------------- | ------------------------------------ |
| `pnpm dev`        | Arranca el servidor en modo watch    |
| `pnpm dev:server` | Arranca el servidor en modo watch    |
| `pnpm dev:client` | Arranca el dev server del cliente    |
| `pnpm test`       | Ejecuta los tests del servidor       |
| `pnpm lint`       | Ejecuta el lint en todos los paquetes |

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores.

| Variable                | Descripción                              | Valor por defecto           |
| ----------------------- | ---------------------------------------- | --------------------------- |
| `PORT`                  | Puerto HTTP de la API                    | `3000`                      |
| `NODE_ENV`              | Entorno de ejecución                     | `development`               |
| `FOOTBALL_DATA_API_KEY` | API key de football-data.org             | —                           |
| `DB_PATH`               | Ruta al fichero de base de datos SQLite  | `./data/prematch.sqlite`    |

## Licencia

Por definir — _WIP_.
