# Diagrams

Detailed Mermaid diagrams for Pre-match. GitHub renders Mermaid inside Markdown, so each file below
can be read directly.

| Diagram | What it shows |
| --- | --- |
| [Architecture](architecture.md) | Layered view of the React client, the Express server, the SQLite database, football-data.org and Socket.io. |
| [Sync and cache](sync-and-cache.md) | Sequence of `POST /api/sync/:league`: cache-or-API retrieval, Zod validation and the upsert into SQLite. |
| [Analysis engine](analysis-engine.md) | Sequence of `GET /api/analysis`: real-fixture resolution and the three signals computed independently. |
| [Live updates](live-updates.md) | End-to-end real time: Socket.io subscription, the poller bounded to the live window, persistence, broadcast and the update without a refetch. |
| [Favorite team](favorite-team.md) | Shared favorite-team context, the modal, the auto-following live watcher, the next-match banner and the back-to-modal flow. |

The screenshots used by the READMEs live in [`../images`](../images).
