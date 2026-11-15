# HDMS — technical direction

**Product roadmap:** [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) — пользовательские возможности, UX-референсы и последовательность релизов.

## Product direction

HDMS should become a **web service first**, with an installable mobile experience later. A separately downloadable desktop program is useful as a developer/enthusiast preview, but should not be the main public distribution model.

The intended user flow is:

1. Open the service URL in a browser on desktop or phone.
2. Use the same account and saved data across devices when sync is introduced.
3. Optionally install HDMS to the phone's home screen as a PWA.
4. Consider app-store distribution only after the mobile experience and demand are validated.

## Architecture stages

### Stage 1 — local development preview

Keep the current Next.js application. It provides the UI, API routes, server-side deck/card operations, and the local development workflow. A Web Worker can run A-vs-B simulations in the browser. Local history remains in IndexedDB.

### Stage 2 — hosted responsive web service

Deploy the same web application to a public HTTPS domain. The browser is the primary client; users do not install a desktop program. Keep the simulation engine in framework-independent TypeScript modules so it can be called from the API and browser Worker.

The first public release can keep anonymous/local history. Accounts and cloud sync should be introduced only when they solve a real user need.

### Stage 3 — installable PWA

Add the web app manifest, app icons, service worker and carefully chosen offline caching. This makes the website installable from supported browsers and gives it an app-like launch experience.

PWA installation does not make every feature offline automatically. Server API operations still require connectivity; only cached UI/data and browser-side features can work offline.

### Stage 4 — accounts and synchronized data

Add authentication and a relational database for user profiles, saved decks, collections, matchup runs and settings. Keep IndexedDB as a local cache/offline store, then synchronize selected records with the backend.

The card registry should be cached or mirrored server-side so the service is not wholly dependent on a third-party card-data endpoint at request time.

### Stage 5 — native mobile distribution, only if justified

If users need app-store installation, push notifications, native sharing or deeper device integration, package the responsive web application with a bridge such as Capacitor. This reuses much of the existing React/Next frontend.

The current project is a full-stack Next.js application, so it cannot simply be copied unchanged into an APK/IPA or switched to static export while retaining its API routes. Before Capacitor packaging, separate the mobile/browser client build from the hosted Next.js API/backend. The client then calls the same hosted API; the simulation core can be shared where practical.

A separate React Native client is a later alternative, not the starting point: it creates another UI codebase to maintain.

## Simulation execution

Use two execution paths for different workloads:

- **Browser Web Worker:** quick A-vs-B analysis, responsive UI, and limited offline use after required card data is cached.
- **Backend simulation workers:** large batches and large N×N matrices that should not depend on a phone staying awake or a browser tab remaining open.

Long-running simulation jobs should eventually become job-based: create a job, process it in a worker, store progress/results, and let the browser poll or subscribe for updates. This is more robust than holding one long HTTP request open.

The simulation engine should remain shared TypeScript wherever practical. Server-only APIs, persistence and job orchestration should stay outside that engine.

## Current limitations to resolve before public launch

- The simulator is model-based, not a reproduction of Blizzard's full game engine.
- Card-effect coverage and outcome quality need systematic validation against curated matchup scenarios.
- Public deployment needs rate limits, input validation, error reporting and resource limits for simulation jobs.
- User accounts, server-side persistence and cross-device synchronization are not implemented yet.
- Mobile layouts and touch interactions need dedicated testing before presenting the PWA as a polished mobile product.
