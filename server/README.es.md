# Pre-match — Server (API)

[English](README.md) | [Español](README.es.md)

API backend de la herramienta de análisis pre-partido.

> **Estado:** desarrollo temprano. Solo está implementado el endpoint de health check; el resto se marca como _WIP_.

## Stack tecnológico

| Área              | Tecnología                          |
| ----------------- | ----------------------------------- |
| Runtime           | Node.js (ESM)                       |
| Framework HTTP    | Express 4                           |
| Base de datos     | SQLite vía `better-sqlite3`         |
| Tiempo real       | Socket.io                           |
| Validación        | Zod                                 |
| Logging           | Morgan                              |
| Configuración     | dotenv                              |
| Testing           | Vitest + Supertest                  |

## Requisitos

- Node.js (LTS)
- pnpm `11.3.0`

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores.

| Variable                | Descripción                       | Valor por defecto        |
| ----------------------- | --------------------------------- | ------------------------ |
| `PORT`                  | Puerto HTTP del servidor          | `3000`                   |
| `NODE_ENV`              | Entorno de ejecución              | `development`            |
| `FOOTBALL_DATA_API_KEY` | API key de football-data.org      | `''`                     |
| `DB_PATH`               | Ruta al fichero de base SQLite    | `./data/prematch.sqlite` |

Se leen y centralizan en `src/config/env.js`.

## Scripts

| Script              | Descripción                                 |
| ------------------- | ------------------------------------------- |
| `pnpm dev`          | Arranca con `node --watch` (recarga auto)   |
| `pnpm start`        | Arranca una vez                             |
| `pnpm test`         | Ejecuta la suite de tests una vez (Vitest)  |
| `pnpm test:watch`   | Ejecuta los tests en modo watch             |
| `pnpm lint`         | Comprueba la sintaxis de `src/server.js`    |

## Estructura del proyecto

```
server/
└── src/
    ├── server.js          # Punto de entrada: crea el servidor HTTP
    ├── app.js             # Construye la app de Express (middleware + rutas)
    ├── config/            # Configuración del entorno
    │   └── env.js
    ├── routes/            # Routers de Express
    │   └── health.routes.js
    ├── controllers/       # Handlers de peticiones
    │   └── health.controller.js
    ├── schemas/           # Schemas de Zod (modelo de dominio)
    │   ├── league.schema.js
    │   ├── match.schema.js
    │   └── team.schema.js
    ├── services/          # Lógica de negocio                    (WIP)
    ├── repositories/      # Acceso a datos / consultas SQLite    (WIP)
    ├── db/migrations/     # Migraciones de base de datos         (WIP)
    ├── external/          # Cliente de la API football-data.org  (WIP)
    └── sockets/           # Handlers de Socket.io                (WIP)
```

`app.js` se mantiene separado de `server.js` para poder importar la app de Express en los tests sin abrir un puerto de red.

## API

URL base: `http://localhost:3000` (configurable vía `PORT`).

| Método | Ruta      | Descripción                    | Estado |
| ------ | --------- | ------------------------------ | ------ |
| `GET`  | `/health` | Estado del servicio            | Listo  |

### `GET /health`

```json
{
  "status": "ok",
  "uptime": 12.34,
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

Las rutas desconocidas devuelven `404 { "error": "Not Found" }`. Los errores se gestionan con un middleware central que devuelve `{ "error": "<mensaje>" }`.

> Las rutas de ligas, equipos y partidos son _WIP_.

## Modelo de dominio

Definido con Zod en `src/schemas/`:

- **League** (`league.schema.js`): códigos de competición soportados `PL`, `PD`, `BL1`, `SA`, `FL1`, con nombres legibles.
- **Team** (`team.schema.js`): `id`, `name`, `shortName`, `tla` (código de 3 letras), `crest` (URL).
- **Match** (`match.schema.js`): `id`, `league`, `utcDate`, `status`, `matchday`, `homeTeam`, `awayTeam` y `score`.
  - Estados: `SCHEDULED`, `TIMED`, `IN_PLAY`, `PAUSED`, `FINISHED`, `SUSPENDED`, `POSTPONED`, `CANCELLED`, `AWARDED`.
  - Score: `winner`, `duration` y los desgloses `fullTime` / `halfTime`.

## Testing

Los tests se escriben con Vitest y Supertest. Coloca los ficheros de test junto al código o en una carpeta `__tests__`; ejecútalos con:

```bash
pnpm test
```

## Documentación relacionada

- [README raíz](../README.es.md)
- [README del cliente](../client/README.es.md)
