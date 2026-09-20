# Pre-match — Client (Web)

[English](README.md) | [Español](README.es.md)

Web client for the pre-match analysis tool.

> **Status:** early development. The app is still the Vite + React scaffold; the real UI and the connection to the API are _WIP_.

## Tech stack

| Concern   | Technology                     |
| --------- | ------------------------------ |
| UI        | React 19                       |
| Build/dev | Vite 8                         |
| Linting   | Oxlint                         |
| Language  | JavaScript (ESM), JSX          |

## Requirements

- Node.js (LTS)
- pnpm `11.3.0`

## Scripts

| Script          | Description                                    |
| --------------- | ---------------------------------------------- |
| `pnpm dev`      | Start the Vite dev server with HMR             |
| `pnpm build`    | Build the production bundle into `dist/`       |
| `pnpm preview`  | Preview the production build locally           |
| `pnpm lint`     | Run Oxlint                                     |

From the monorepo root you can also use `pnpm dev:client`.

## Project structure

```
client/
├── index.html            # HTML entry point
├── vite.config.js        # Vite configuration
├── .oxlintrc.json        # Oxlint configuration
├── public/               # Static assets served as-is
└── src/
    ├── main.jsx          # React entry point (mounts <App />)
    ├── App.jsx           # Root component (scaffold)   (WIP)
    ├── App.css           # App styles
    ├── index.css         # Global styles
    └── assets/           # Images and icons
```

## Configuration

- **Dev server:** Vite defaults (`http://localhost:5173`).
- **API proxy:** not configured yet. When the client starts consuming the API, add a `server.proxy` entry in `vite.config.js` so requests to `/api` are forwarded to the backend (`http://localhost:3000`). _(WIP)_
- **Environment:** client-side variables must use the `VITE_` prefix and are read via `import.meta.env`. _(WIP)_

## Related documentation

- [Root README](../README.md)
- [Server README](../server/README.md)
