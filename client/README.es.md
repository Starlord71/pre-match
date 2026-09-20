# Pre-match — Client (Web)

[English](README.md) | [Español](README.es.md)

Cliente web de la herramienta de análisis pre-partido.

> **Estado:** fases 1-5 implementadas. La UI es responsive (mobile-first), bilingüe (ES/EN con cambio instantáneo), consume la API mediante wrappers de servicios puros y hooks, renderiza las cuatro señales de análisis como tarjetas separadas y lista la jornada actual y la próxima de una liga, siguiendo varios partidos en vivo vía Socket.io. El empaquetado Docker (fase 7) sigue pendiente.

## Stack tecnológico

| Área        | Tecnología                     |
| ----------- | ------------------------------ |
| UI          | React 19                       |
| Build/dev   | Vite 8                         |
| i18n        | i18next + react-i18next        |
| Tiempo real | socket.io-client               |
| Testing     | Vitest + Testing Library       |
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
| `pnpm test`     | Ejecuta la suite unitaria + integración (Vitest) |
| `pnpm lint`     | Ejecuta Oxlint                                 |

Desde la raíz del monorepo también puedes usar `pnpm dev:client` y `pnpm --filter client test`.

## Estructura del proyecto

```
client/
├── index.html            # Punto de entrada HTML
├── vite.config.js        # Configuración de Vite
├── vitest.config.js      # Configuración de Vitest (entorno jsdom)
├── public/               # Assets estáticos servidos tal cual
└── src/
    ├── main.jsx          # Entrada: inicializa i18n y monta <App />
    ├── App.jsx           # Componente raíz + navegación entre páginas
    ├── services/         # Wrappers puros de fetch / sockets (sin React)
    ├── hooks/            # useTeams, useMatches, useAnalysis, useLiveMatches, useLanguage
    ├── components/       # Componentes presentacionales y tarjetas de señales
    ├── pages/            # Páginas de explorador y análisis
    ├── utils/            # Helpers puros (agrupación por jornada y formato de fechas)
    ├── i18n/             # Config de i18next + locales es/en
    ├── constants/        # Ligas soportadas
    ├── test/             # Setup de tests, fixtures y flujos de integración
    └── assets/           # Imágenes e iconos
```

Los componentes nunca llaman a `fetch`/`socket.io-client` directamente: las páginas orquestan hooks, los hooks consumen services y los services construyen las peticiones. Así cada capa se testea de forma aislada.

## Seguimiento en vivo

El panel en vivo del explorador lista la **jornada actual** de la liga seleccionada (la última que ya empezó, así se ven sus partidos jugados, en vivo y pendientes) y la **próxima**, cada una encabezada por el número de jornada y su rango de fechas. Dentro de cada jornada, los partidos se agrupan por día calendario y se ordenan por hora. La liga proviene del selector del explorador, así que el panel no tiene selector propio; cambiar de liga lo remonta y limpia los partidos seguidos. Se pueden seguir tantos partidos como se quiera, y su estado y marcador se actualizan vía Socket.io sin recargar.

## Configuración

- **Dev server:** valores por defecto de Vite (`http://localhost:5173`).
- **URL base de la API:** `VITE_API_URL` (por defecto `http://localhost:3000`), leída en `src/services/http.js`. El servidor habilita CORS, así que no hace falta proxy en desarrollo.
- **Idioma:** ambos bundles de locales se importan estáticamente y i18next inicializa de forma síncrona; la elección se persiste en `localStorage` bajo `preferredLanguage`.

## Documentación relacionada

- [README raíz](../README.es.md)
- [README del servidor](../server/README.es.md)
