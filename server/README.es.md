# Pre-match — Server (API)

[English](README.md) | [Español](README.es.md)

API backend de la herramienta de análisis pre-partido.

> **Estado:** fases 1-5 implementadas y cubiertas por tests: base de Express, SQLite con migraciones, cliente de football-data.org con rate limiting, el flujo de sync, el motor de análisis de cuatro señales, las actualizaciones de partidos en vivo vía Socket.io y los endpoints de equipos y partidos que consume el cliente en React. El empaquetado Docker (fase 7) sigue _WIP_.

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
├── src/
│   ├── server.js                 # Punto de entrada: servidor HTTP + Socket.io + poller
│   ├── app.js                    # Construye la app de Express (middleware + rutas)
│   ├── config/
│   │   └── env.js
│   ├── routes/                   # Routers de Express
│   │   ├── health.routes.js
│   │   ├── teams.routes.js
│   │   ├── matches.routes.js
│   │   ├── sync.routes.js
│   │   └── analysis.routes.js
│   ├── controllers/              # Handlers de peticiones
│   │   ├── health.controller.js
│   │   ├── teams.controller.js
│   │   ├── matches.controller.js
│   │   ├── sync.controller.js
│   │   └── analysis.controller.js
│   ├── schemas/                  # Schemas de Zod (dominio + payloads externos)
│   │   ├── league.schema.js
│   │   ├── team.schema.js
│   │   ├── match.schema.js
│   │   ├── analysis.schema.js
│   │   └── externalApi.schema.js
│   ├── services/                 # Lógica de negocio
│   │   ├── sync.service.js
│   │   ├── livePoller.service.js
│   │   └── analysisEngine/       # Las cuatro señales independientes
│   │       ├── index.js
│   │       ├── form.service.js
│   │       ├── homeAway.service.js
│   │       ├── h2h.service.js
│   │       └── schedule.service.js
│   ├── repositories/             # Acceso a datos (únicos módulos que tocan SQL)
│   │   ├── teams.repository.js
│   │   ├── matches.repository.js
│   │   └── cache.repository.js
│   ├── db/
│   │   ├── db.js                 # Conexión + runner de migraciones
│   │   └── migrations/
│   │       └── 001_init.sql
│   ├── external/                 # Cliente de football-data.org + rate limiter
│   │   ├── footballData.client.js
│   │   └── rateLimiter.js
│   └── sockets/                  # Handlers de Socket.io
│       └── liveMatches.socket.js
└── tests/                        # Tests unitarios + de integración (Vitest/Supertest)
```

`app.js` se mantiene separado de `server.js` para poder importar la app de Express en los tests sin abrir un puerto de red.

## API

URL base: `http://localhost:3000` (configurable vía `PORT`).

| Método | Ruta                              | Descripción                          |
| ------ | --------------------------------- | ------------------------------------ |
| `GET`  | `/health`                         | Estado del servicio                  |
| `GET`  | `/api/teams?league=`              | Equipos que jugaron en una liga      |
| `GET`  | `/api/matches?league=`            | Jornada actual + próxima de la liga con sus partidos |
| `POST` | `/api/sync/:league`               | Sincroniza una liga desde football-data |
| `GET`  | `/api/analysis?home=&away=&date=` | Cuatro señales para un partido       |

### `GET /health`

```json
{
  "status": "ok",
  "uptime": 12.34,
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

### `GET /api/teams?league=`

`league` es uno de `PL`, `PD`, `BL1`, `SA`, `FL1`. Como `teams` no tiene columna de liga, la pertenencia se deriva con un join contra `matches`: se devuelve un equipo cuando jugó en cualquiera de los dos lados de al menos un partido almacenado de esa liga. Una liga no soportada o ausente devuelve `400`.

```json
{
  "league": "PL",
  "teams": [
    {
      "id": 57,
      "name": "Arsenal FC",
      "shortName": "Arsenal",
      "tla": "ARS",
      "crest": "https://crests.football-data.org/57.png",
      "updatedAt": "2026-09-20T19:23:56.791Z"
    }
  ]
}
```

### `GET /api/matches?league=`

`league` es uno de `PL`, `PD`, `BL1`, `SA`, `FL1`. Devuelve la jornada **actual** de la liga (la última que ya empezó, así una jornada en curso conserva sus partidos jugados, en vivo y pendientes) y la **próxima**. Cada partido incluye sus `homeTeam` y `awayTeam`, de modo que una lista de partidos no necesita otra petición. `currentMatchday` es `null` antes de que arranque la temporada y `nextMatchday` es `null` cuando termina; `matchdays` solo contiene las jornadas que existen. Una liga no soportada o ausente devuelve `400`.

```json
{
  "league": "PL",
  "currentMatchday": 3,
  "nextMatchday": 4,
  "matchdays": [
    {
      "matchday": 3,
      "matches": [
        {
          "id": 500,
          "league": "PL",
          "utcDate": "2026-09-20T19:30:00Z",
          "status": "IN_PLAY",
          "matchday": 3,
          "winner": null,
          "duration": "REGULAR",
          "fullTimeHome": 1,
          "fullTimeAway": 0,
          "halfTimeHome": 1,
          "halfTimeAway": 0,
          "updatedAt": "2026-09-20T19:45:00.000Z",
          "homeTeam": { "id": 57, "name": "Arsenal FC", "shortName": "Arsenal", "tla": "ARS", "crest": "https://crests.football-data.org/57.png" },
          "awayTeam": { "id": 61, "name": "Chelsea FC", "shortName": "Chelsea", "tla": "CHE", "crest": "https://crests.football-data.org/61.png" }
        }
      ]
    },
    { "matchday": 4, "matches": [] }
  ]
}
```

### `POST /api/sync/:league`

`:league` es uno de `PL`, `PD`, `BL1`, `SA`, `FL1`. El servicio sirve desde la tabla `api_cache` cuando existe una entrada fresca; si no, consulta football-data.org, valida el payload y hace upsert en `teams` y `matches`. Una liga desconocida devuelve `400`.

```json
{
  "league": "PL",
  "source": "api",
  "teams": 20,
  "matches": 380
}
```

### `GET /api/analysis?home=&away=&date=`

`home` y `away` son ids de equipo y `date` es el kickoff ISO del partido analizado. Las cuatro señales se devuelven como objetos separados y nunca se fusionan en una única puntuación. Parámetros inválidos o ausentes devuelven `400`.

```json
{
  "homeTeamId": 1,
  "awayTeamId": 2,
  "matchDate": "2026-04-01T15:00:00Z",
  "form": {
    "home": {
      "teamId": 1,
      "windowSize": 5,
      "decay": 0.7,
      "matchesAnalyzed": 5,
      "weightedPoints": 8.51,
      "totalWeight": 2.77,
      "weightedScore": 0.61,
      "results": [
        { "matchId": 41, "utcDate": "2026-03-28T15:00:00Z", "result": "W", "points": 3, "weight": 1 }
      ]
    },
    "away": { "teamId": 2, "windowSize": 5, "decay": 0.7, "matchesAnalyzed": 5, "weightedPoints": 4.2, "totalWeight": 2.77, "weightedScore": 0.3, "results": [] }
  },
  "homeAway": {
    "home": { "teamId": 1, "venue": "HOME", "matchesPlayed": 10, "wins": 7, "draws": 2, "losses": 1, "points": 23, "pointsPerGame": 2.3, "winRate": 0.7, "goalsFor": 21, "goalsAgainst": 8, "goalDifference": 13 },
    "away": { "teamId": 2, "venue": "AWAY", "matchesPlayed": 10, "wins": 3, "draws": 3, "losses": 4, "points": 12, "pointsPerGame": 1.2, "winRate": 0.3, "goalsFor": 11, "goalsAgainst": 14, "goalDifference": -3 }
  },
  "h2h": {
    "teamAId": 1,
    "teamBId": 2,
    "matchesAnalyzed": 4,
    "minimumMatches": 3,
    "insufficientData": false,
    "meetings": [
      { "matchId": 12, "utcDate": "2025-11-02T15:00:00Z", "homeTeamId": 2, "awayTeamId": 1, "homeScore": 1, "awayScore": 2, "resultForTeamA": "W" }
    ],
    "summary": { "teamAWins": 2, "teamBWins": 1, "draws": 1, "goalsA": 6, "goalsB": 4 }
  },
  "schedule": {
    "home": { "teamId": 1, "upcomingMatchDate": "2026-04-01T15:00:00Z", "windowDays": 14, "threshold": 3, "matchesInWindow": 2, "congested": false, "daysSinceLastMatch": 4.2, "matches": [{ "matchId": 37, "utcDate": "2026-03-28T15:00:00Z", "daysBefore": 4.2, "venue": "HOME" }] },
    "away": { "teamId": 2, "upcomingMatchDate": "2026-04-01T15:00:00Z", "windowDays": 14, "threshold": 3, "matchesInWindow": 3, "congested": true, "daysSinceLastMatch": 2.8, "matches": [] }
  }
}
```

Cuando una señal carece de historial suficiente lo dice explícitamente en lugar de adivinar: `form.weightedScore` es `null` con cero partidos analizados y `h2h.insufficientData` es `true` por debajo del mínimo de enfrentamientos.

Las rutas desconocidas devuelven `404 { "error": "Not Found" }`. Los errores se gestionan con un middleware central que devuelve `{ "error": "<mensaje>" }`.

## Tiempo real (Socket.io)

Socket.io se adjunta al mismo servidor HTTP. Los clientes se suscriben por partido; cada partido es una room llamada `match:{id}`, de modo que cada suscriptor solo recibe eventos de los partidos que pidió.

| Dirección       | Evento              | Payload               | Descripción                                    |
| --------------- | ------------------- | --------------------- | ---------------------------------------------- |
| Cliente → server | `subscribe:match`   | id de partido         | Entra en la room `match:{id}`                   |
| Cliente → server | `unsubscribe:match` | id de partido         | Sale de la room `match:{id}`                    |
| Server → cliente | `match:update`      | objeto de partido    | Se emite cuando el poller detecta un cambio     |

Ambos eventos de suscripción aceptan un callback de acknowledgement opcional que recibe `{ ok: true, room }`, o `{ ok: false }` si el id no es válido.

El poller comprueba cada 60-90s si algún partido guardado está dentro de su ventana en vivo (kickoff → kickoff + ~2h). Solo llama a football-data.org cuando hay al menos uno; las peticiones pasan por el rate limiter compartido (≤10 por minuto). Los cambios de estado/marcador detectados se persisten vía `matches.repository.js` y se emiten como `match:update` a `match:{id}`.

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

socket.emit('subscribe:match', 123);
socket.on('match:update', (match) => {
  console.log(match.id, match.status, match.fullTimeHome, match.fullTimeAway);
});
```

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
