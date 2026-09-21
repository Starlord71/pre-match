# Pre-match — Client (Web)

[English](README.md) | [Español](README.es.md)

Cliente web de la herramienta de análisis pre-partido.

> **Estado:** fases 1-5 y 8 implementadas. La UI es responsive (mobile-first), bilingüe (ES/EN con cambio instantáneo), consume la API mediante wrappers de servicios puros y hooks, renderiza las tres señales de análisis como tarjetas separadas y lista la jornada actual de una liga, con un botón para pasar a la próxima, siguiendo varios partidos en vivo vía Socket.io. Se puede guardar un equipo favorito desde un modal que nunca abandona el explorador, con un banner en el explorador y auto-seguimiento en vivo. El empaquetado Docker (fase 7) sigue pendiente.

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
    ├── hooks/            # useTeams, useMatches, useTeamMatches, useAnalysis,
    │                     # useLiveMatches, useFollowedMatches, useFavoriteTeam
    ├── components/       # Componentes presentacionales, tarjetas de señales,
    │                     # el modal/banner/observador de equipo favorito
    ├── pages/            # Páginas de explorador y análisis
    ├── utils/            # Helpers puros (agrupación por jornada y formato de fechas)
    ├── i18n/             # Config de i18next + locales es/en
    ├── constants/        # Ligas soportadas
    ├── test/             # Setup de tests y fixtures compartidas
    ├── __tests__/        # Flujos de integración (Vitest + Testing Library)
    └── assets/           # Imágenes e iconos
```

Los tests unitarios viven en carpetas `__tests__/` junto a cada módulo (`components/__tests__`, `hooks/__tests__`, `services/__tests__`, `utils/__tests__`, `i18n/__tests__`).

Los componentes nunca llaman a `fetch`/`socket.io-client` directamente: las páginas orquestan hooks, los hooks consumen services y los services construyen las peticiones. Así cada capa se testea de forma aislada.

## Explorador

El formulario del explorador elige una liga y dos equipos. La liga usa un select nativo; los equipos usan un selector buscable construido sobre `react-select`, así las listas largas de equipos se filtran al escribir con soporte completo de teclado y lectores de pantalla.

## Seguimiento en vivo

El panel en vivo del explorador muestra por defecto la **jornada actual** de la liga seleccionada (la última que ya empezó, así se ven sus partidos jugados, en vivo y pendientes), encabezada por el número de jornada y su rango de fechas. Un botón **Ver próxima jornada** cambia la lista a la próxima y permite volver. Dentro de cada jornada, los partidos se agrupan por día calendario y se ordenan por hora, y cada tarjeta destaca el marcador. La liga proviene del selector del explorador, así que el panel no tiene selector propio; cambiar de liga lo remonta y limpia los partidos seguidos. Se pueden seguir tantos partidos como se quiera, y su estado y marcador se actualizan vía Socket.io sin recargar.

## Equipo favorito

`useFavoriteTeam` expone un contexto `FavoriteTeamProvider` (el equipo + el estado de
abierto/cerrado del modal) compartido por el botón del header, `FavoriteTeamModal`,
`FavoriteNextMatchBanner` y el link de "Volver" de la vista de análisis — sin página ni ruta propia.
Guardar un equipo lo persiste en `localStorage`; abrir el modal sin ninguno guardado muestra los
mismos selectores de liga/equipo que el explorador, y "Cambiar equipo" los reabre prellenados sin
perder el favorito actual hasta que se guarda uno nuevo de verdad. Dos cosas se mantienen
sincronizadas con él en segundo plano: `FavoriteNextMatchBanner` muestra el partido en vivo o
próximo del equipo en el explorador, y `FavoriteLiveWatcher` (montado una sola vez en `App.jsx`) se
auto-suscribe a ese mismo partido por Socket.io, de modo que sus actualizaciones suenan (y muestran
una notificación de escritorio opcional) sin tener que seguirlo a mano. Abrir un partido desde el
modal lo cierra y lleva `state.reopenFavorite`, así que hacer click en "Volver" desde la vista de
análisis reabre el modal en vez de dejar un explorador vacío.

## Configuración

- **Dev server:** valores por defecto de Vite (`http://localhost:5173`).
- **URL base de la API:** `VITE_API_URL` (por defecto `http://localhost:3000`), leída en `src/services/http.js`. El servidor habilita CORS, así que no hace falta proxy en desarrollo.
- **Idioma:** ambos bundles de locales se importan estáticamente y i18next inicializa de forma síncrona; la elección se persiste en `localStorage` bajo `preferredLanguage`.
- **Equipo favorito:** persistido bajo `favoriteTeam`; el aviso del header que sugiere elegir uno se cierra para siempre (`favoriteHintDismissed`) al abrirlo o cerrarlo. Las notificaciones de escritorio para actualizaciones en vivo son opt-in y se persisten bajo `notificationsEnabled`, compartido por el panel en vivo y el auto-seguimiento del favorito.

## Documentación relacionada

- [README raíz](../README.es.md)
- [README del servidor](../server/README.es.md)
