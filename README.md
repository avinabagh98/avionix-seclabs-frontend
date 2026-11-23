# Avionix SecLabs frontend

This directory contains the Next.js frontend only. The live API server is a
separate service; this project does not contain or run the backend.

## Run the frontend

From this directory:

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Other useful commands:

```powershell
npm run lint
npm test
npm run build
```

Development and production builds use separate Next.js output directories
(`.next-dev/` and `.next/`) so running a dev server alongside a production
build does not corrupt either server's generated modules.

Set `NEXT_PUBLIC_API_URL` in `.env.local` to configure the API origin. The
included local setting is `http://127.0.0.1:8000`; requests append the documented
`/api/...` paths. This value is embedded in the browser bundle, so it must not
contain secrets.

## Pages and shared UI

| File | Responsibility |
| --- | --- |
| `app/layout.tsx` | Root HTML layout, navigation, metadata, global styling, and shared providers. |
| `app/globals.css` | Global Tailwind and application styles. |
| `app/page.tsx` | Dashboard route (`/`); checks API health and links to topology and simulator tools. |
| `app/topology/page.tsx` | Topology route (`/topology`); requests and displays devices and links. |
| `app/simulator/page.tsx` | Simulator route (`/simulator`); page heading and packet form. |
| `components/providers/QueryProvider.tsx` | Creates and shares the TanStack Query client. |
| `components/simulator/PacketForm.tsx` | Packet input form, evaluation request, and verdict/error display. |

## API, data, and state

| File | Responsibility |
| --- | --- |
| `services/topologyApi.ts` | Fetches the topology endpoint and records success/error telemetry. |
| `schemas/apiSchema.ts` | Zod response schemas and inferred TypeScript types for the documented API. |
| `hooks/useTopologyQuery.ts` | TanStack Query hook for loading and refreshing topology every 15 seconds. |
| `lib/api.ts` | Typed JSON client for health, topology, router sync/state, simulator evaluation, and audit endpoints. |
| `lib/errors.ts` | Typed HTTP and schema-drift error classes. |
| `store/useAppStore.ts` | Typed Zustand store for a bounded list of frontend telemetry messages. |

## Data flow

### Topology

`app/topology/page.tsx` → `hooks/useTopologyQuery.ts` →
`services/topologyApi.ts` → external `GET /api/topology/map` →
`schemas/apiSchema.ts` validates the response → the page renders nodes and
links. TanStack Query caches the result and refreshes it every 15 seconds.

### Packet simulator

`app/simulator/page.tsx` renders `components/simulator/PacketForm.tsx`. The form
converts optional port values to numbers (or `null`) and calls
`apiClient.evaluateTraffic()` in `lib/api.ts`, which sends
`POST /api/simulator/evaluate`. It can also synchronize the router using
`POST /api/router/{router_name}/sync`. The topology page provides controls for
router sync, cached state, and audit.

The request paths and response schemas are based on the provided live API
documentation.

The API client currently maps to these documented routes:

| Frontend action | API request |
| --- | --- |
| Dashboard connection status | `GET /` |
| Load topology | `GET /api/topology/map` |
| Sync a router | `POST /api/router/{router_name}/sync` |
| Load cached router state | `GET /api/router/{router_name}/state` |
| Evaluate packet | `POST /api/simulator/evaluate` |
| Audit router | `GET /api/simulator/audit/{router_name}` |

If the browser reports a CORS error, allow the frontend's origin
(`http://localhost:3000` or `http://127.0.0.1:3000`) in the separate backend's
CORS configuration.

## Other project files

| File/folder | Responsibility |
| --- | --- |
| `public/` | Static assets served directly by Next.js. |
| `__tests__/` | Vitest tests for topology fetching, schema validation, and error handling. |
| `package.json` | Frontend dependencies and npm scripts. |
| `tsconfig.json` | TypeScript compiler settings and the `@/` import alias. |
| `eslint.config.mjs` | ESLint configuration. |
| `next.config.ts` | Next.js configuration. |
| `vitest.config.ts` | Vitest configuration. |
