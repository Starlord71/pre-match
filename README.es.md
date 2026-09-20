# Pre-match

[English](README.md) | [Español](README.es.md)

Herramienta de análisis pre-partido para próximos partidos de fútbol.

> **Estado:** las fases 1-5 del plan están implementadas y cubiertas por tests; el empaquetado Docker (fase 7) está pendiente.

## Descripción general

Este monorepo contiene la API backend y el cliente web de una herramienta que ayuda a analizar partidos de fútbol antes de que se jueguen.

## Estado actual

- **Hecho (servidor):** API de Express, SQLite con migraciones y cache, cliente de football-data.org con rate limiting, sincronización de ligas (`POST /api/sync/:league`), el endpoint de equipos (`GET /api/teams?league=`), la jornada actual y la próxima (`GET /api/matches?league=`), el motor de análisis de cuatro señales (`GET /api/analysis`) y actualizaciones de partidos en vivo vía Socket.io.
- **Hecho (cliente):** UI en React (responsive + i18n ES/EN) que lista los equipos de una liga, muestra las cuatro señales como tarjetas separadas y sigue partidos en vivo vía Socket.io.
- **Pendiente:** empaquetado Docker (fase 7).
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

# 3. Arrancar la API y el cliente juntos en modo desarrollo
pnpm dev
```

`pnpm dev` levanta ambos procesos a la vez: la API en `http://localhost:3000` y el cliente web en `http://localhost:5173`. Está implementado con `concurrently -k`, así que cuando un proceso termina el otro también se detiene, evitando procesos huérfanos. Usa los scripts por paquete de abajo para arrancar solo uno de ellos.

## Scripts de la raíz

| Script                      | Descripción                                      |
| --------------------------- | ------------------------------------------------ |
| `pnpm dev`                  | Arranca la API y el cliente juntos               |
| `pnpm dev:server`           | Arranca solo la API (modo watch) en `:3000`      |
| `pnpm dev:client`           | Arranca solo el dev server del cliente (Vite) en `:5173` |
| `pnpm test`                 | Ejecuta los tests del servidor                   |
| `pnpm --filter client test` | Ejecuta los tests del cliente                    |
| `pnpm lint`                 | Ejecuta el lint en todos los paquetes            |

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
