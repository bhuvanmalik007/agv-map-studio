# AGV Map Studio

AGV Map Studio is a full-stack editor for visualizing and updating automated guided vehicle maps. It was built for the Mujin frontend take-home challenge with React, TypeScript, Express, and an interactive SVG canvas.

## Features

- View directed AGV paths and named stations on an interactive map
- Add, edit, move, and delete nodes
- Edit coordinates, QR codes, travel directions, chargers, chutes, and names
- Pan, zoom, rotate, and reset the canvas
- Import and export validated JSON map files
- Load and save the map through a REST API
- Detect duplicate QR codes before saving
- Use the provided nonstandard coordinate system correctly: North is `+X` and West is `+Y`
- Run the complete application from one Debian Bullseye Docker image

## Tech stack

- **Frontend:** React, TypeScript, Vite
- **Server state:** TanStack Query
- **Visualization:** SVG and pointer events
- **Backend:** Node.js and Express
- **Validation:** Zod, shared by the frontend and backend
- **Testing:** Vitest, Testing Library, and Supertest
- **Packaging:** Docker with a multi-stage Debian Bullseye build
- **CI:** GitHub Actions

## Architecture

```text
React editor
    │
    │ GET /api/map
    │ PUT /api/map
    ▼
Express API
    │
    ▼
data/map.json
```

In development, Vite runs the frontend on port `5173` and proxies `/api` requests to Express on port `3001`. In production, Vite compiles the frontend into static files and Express serves both those files and the API from a single process.

## Getting started

### Requirements

- Node.js 20 or newer
- npm

### Install and run

```bash
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The API is available at [http://localhost:3001](http://localhost:3001).

### Production build

```bash
npm run build
npm start
```

The production application is served at [http://localhost:3001](http://localhost:3001).

## Tests and quality checks

```bash
npm test              # Run all tests once
npm run test:watch    # Run tests in watch mode
npm run typecheck     # Type-check frontend, shared, and backend code
npm run build         # Build frontend and backend
npm run check         # Type-check, test, and build
```

`npm run check` is the recommended command before pushing changes. CI runs the same verification and also confirms that the Docker image builds.

The test suite covers:

- Map validation and supported node properties
- Direction rules, nearest-neighbor connections, and coordinate projection
- API reads, writes, validation errors, and persisted data
- Initial UI loading, core editor controls, save requests, and query-cache updates

## Docker

Build and run the application:

```bash
docker build -t agv-map-studio .
docker run --rm -p 3000:3000 agv-map-studio
```

Open [http://localhost:3000](http://localhost:3000).

To preserve map changes between containers, use a named volume:

```bash
docker run --rm -p 3000:3000 \
  -v agv-map-data:/app/data \
  agv-map-studio
```

The final container runs as an unprivileged user and exposes `/api/health` for health checks.

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Check service health |
| `GET` | `/api/map` | Load the current map |
| `PUT` | `/api/map` | Validate and replace the current map |

Invalid map documents return `422` with field-specific issues. Malformed JSON returns `400`.

## Key design decisions

- **Server data and draft state are separate.** TanStack Query owns the last map received from the API. React state owns the current unsaved draft, so a refetch cannot silently replace edits.
- **The schema is shared.** The same Zod schema validates imported files, API responses, and server writes while also providing TypeScript types.
- **Connections are derived.** Each direction connects to the nearest aligned node within `maxNeighborDistance`. Diagonal connections are rejected.
- **Coordinates are projected deliberately.** The source format defines North as positive X and West as positive Y. Projection helpers convert that system into an intuitive screen orientation and reverse it during drag operations.
- **Writes are atomic.** The server writes to a temporary file and renames it, reducing the chance of leaving a partially written map.
- **The API uses `PUT`.** The client replaces one known map resource, making repeated identical save requests idempotent.
- **The production deployment is simple.** Express serves the compiled React assets and the API, so the evaluator only needs one container and one exposed port.

## Project structure

```text
data/map.json                  Example map and persisted data
server/app.ts                  REST routes and error handling
server/mapStore.ts             Validated reads and atomic writes
shared/schema.ts               Shared Zod schema and TypeScript types
shared/mapMath.ts              Connections and coordinate projection
client/App.tsx                 Editor state and application commands
client/queries/map.ts          TanStack Query hooks and cache updates
client/components/MapCanvas.tsx
                                Interactive SVG map
client/components/NodeInspector.tsx
                                Node property editor
Dockerfile                     Production image
.github/workflows/ci.yml       Automated verification
```

## Current scope

JSON storage keeps the submission self-contained and easy to review. A multi-user production version would likely add a database, authentication, and revision-based conflict handling.
