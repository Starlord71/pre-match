# Diagramas

Diagramas Mermaid detallados de Pre-match. GitHub renderiza Mermaid dentro de Markdown, así que cada
fichero de abajo se puede leer directamente.

| Diagrama | Qué muestra |
| --- | --- |
| [Arquitectura](architecture.es.md) | Vista por capas del cliente en React, el servidor Express, la base SQLite, football-data.org y Socket.io. |
| [Sincronización y caché](sync-and-cache.es.md) | Secuencia de `POST /api/sync/:league`: obtención desde caché o API, validación con Zod y el upsert en SQLite. |
| [Motor de análisis](analysis-engine.es.md) | Secuencia de `GET /api/analysis`: resolución del partido real y las tres señales calculadas de forma independiente. |
| [Actualizaciones en vivo](live-updates.es.md) | Tiempo real de punta a punta: suscripción por Socket.io, el poller acotado a la ventana en vivo, persistencia, difusión y la actualización sin refetch. |
| [Equipo favorito](favorite-team.es.md) | El contexto compartido del equipo favorito, el modal, el observador de auto-seguimiento en vivo, el banner de próximo partido y el flujo de vuelta al modal. |

Las capturas que usan los README viven en [`../images`](../images).
