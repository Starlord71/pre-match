# Alcance

Qué está pensado para hacer Pre-match, y qué deja fuera deliberadamente. La herramienta es una
**ayuda de análisis pre-partido local y de un solo usuario**: convierte el historial de partidos
guardado de una liga en un conjunto reducido de **señales de contexto que interpreta una persona**,
nunca en una única predicción. Este documento registra el límite actual y la razón detrás de cada
exclusión.

## Dentro de alcance

| Área | Qué incluye |
| --- | --- |
| Competiciones | Las cinco ligas domésticas soportadas por football-data.org: Premier League (`PL`), La Liga (`PD`), Bundesliga (`BL1`), Serie A (`SA`) y Ligue 1 (`FL1`). |
| Análisis | Tres señales **independientes** para un enfrentamiento — forma reciente (ponderada exponencialmente), registro local/visitante en la sede, y congestión de calendario — más la resolución del partido real que las ancla, y la posición en la tabla de cada equipo como contexto de apoyo. |
| Fixtures | La jornada actual y próxima de la liga con sus partidos jugados, en vivo y pendientes, y la lista completa de partidos de un equipo (jugados y pendientes). |
| Datos en vivo | Actualizaciones de marcador y estado por Socket.io. El servidor consulta football-data.org solo mientras un partido guardado está dentro de su ventana en vivo, y difunde los cambios a los suscriptores. |
| Idiomas | Español e inglés, cambiables en cualquier momento y persistidos en `localStorage`. |
| Equipo favorito | Un equipo favorito opcional por usuario, con un modal que lista todos sus partidos, un banner en el explorador para su partido en vivo o próximo, y auto-seguimiento en vivo (sonido más notificación de escritorio opcional). |
| Persistencia | SQLite: `teams` y `matches` como historial duradero, `api_cache` como caché efímera con TTL de los payloads crudos de la API. |

Entregado hasta ahora: **fases 1-5 y 8** del plan. El empaquetado Docker (fase 7) sigue pendiente.

## Fuera de alcance

| Excluido | Por qué |
| --- | --- |
| Estadísticas de jugadores individuales | Pre-match interpreta **historial de partidos a nivel de equipo** en señales de contexto; los datos a nivel de jugador son un modelo distinto. Los endpoints de football-data.org que consume el backend tampoco exponen estadísticas por jugador para estas ligas. |
| Champions League y copas de eliminación directa | El modelo asume una temporada de liga doméstica con un calendario de jornadas y una tabla construida a partir de cada partido finalizado. Las rondas de eliminación directa no tienen ninguna de las dos cosas, así que la lógica de jornada actual/próxima y de posiciones no aplicaría. |
| Copa Libertadores y ligas sudamericanas | No están entre los cinco códigos de competición soportados, ni cubiertas por el plan de datos en uso. Soportarlas requeriría una fuente de datos distinta y un modelo de temporada diferente, así que es un proyecto aparte y no un flag. |
| Goleadores y tarjetas | Los endpoints de football-data.org que consume el backend no los proveen, así que no hay datos de los que derivar una señal. |
| Historial directo (head-to-head) | Eliminado. Solo tenía los partidos sincronizados localmente para trabajar, y como dos equipos de la misma liga se cruzan como mucho dos veces por temporada, quedaba por debajo de su propio mínimo en prácticamente todos los casos reales. Se intentó enriquecerlo con el endpoint cruzado entre temporadas `/matches/{id}/head2head` de football-data.org, pero se descartó porque ese endpoint **le faltaban enfrentamientos reales y mezclaba sin avisar partidos de otras competiciones** (copas, torneos continentales), así que no era lo bastante fiable para mostrarlo como un hecho — ni lo bastante útil como para mantenerlo como una señal que (casi) siempre decía "datos insuficientes". |
| Autenticación y multiusuario | Por diseño es una herramienta local de un solo usuario: sin cuentas, sesiones ni estado de servidor por usuario. Todo lo que debe sobrevivir a una recarga (idioma, equipo favorito, partidos seguidos) vive en `localStorage` del navegador. |
| Empaquetado Docker | Fase 7 del plan, todavía no construida. El desarrollo corre ambos paquetes con `pnpm dev`. |

## Documentación relacionada

- [Arquitectura](diagrams/architecture.es.md)
- [Motor de análisis](diagrams/analysis-engine.es.md)
- [Actualizaciones en vivo](diagrams/live-updates.es.md)
- [Equipo favorito](diagrams/favorite-team.es.md)
