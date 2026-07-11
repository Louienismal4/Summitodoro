# Summitodoro

Summitodoro is a gamified Pomodoro prototype where elapsed focus time moves a virtual hiker along a versioned Philippine mountain trail. Phase 1 includes one Mt. Ulap-inspired prototype trail, 5/15/25-minute timer presets, pause/resume/reset, refresh recovery, two checkpoints, summit completion, Mapbox rendering, and a low-data fallback.

The expedition dashboard also maintains a local hiker profile with XP, levels, completed summits, total focus minutes, and a focus-chain counter. Each completed session is rewarded once by session ID, so refreshing a completion cannot duplicate XP.

> Routes are virtual productivity representations and are not intended for real-world navigation, access guidance, or safety decisions. The included geometry is synthetic prototype data, not a verified hiking route.

## Requirements

- Node.js 20.9 or newer
- npm
- An optional public Mapbox token for the interactive map

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` to enter the full-screen expedition dashboard directly. Set `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` in `.env.local` to enable Mapbox. Without it, the app deliberately uses the text/illustrated fallback while the timer remains fully functional. Restrict production public tokens to the deployed application URLs in Mapbox.

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## Architecture notes

- `lib/timer/focus-session.ts` is the pure timestamp-based timer engine. Render intervals only refresh the view; they are never the source of elapsed time.
- `hooks/use-focus-session.ts` owns browser persistence and refresh recovery. Persisted values are validated with Zod before use.
- `lib/gamification/progression.ts` calculates XP, levels, and idempotent completion rewards; `hooks/use-expedition-profile.ts` persists the local profile.
- `lib/trail/trail-engine.ts` validates external GeoJSON, calculates route length once, generates 500 samples once, and uses lightweight interpolation during the session.
- `components/map/mountain-map.tsx` creates one Mapbox instance per mounted hike and updates only the marker as progress changes.
- The map renders distinct completed and remaining trail layers, trailhead/checkpoint/summit markers, terrain, and imperative camera controls without remounting during session updates.
- `public/data/trails/mt-ulap-prototype-v1.geojson` is the versioned static prototype asset.

Authentication, Supabase persistence, rewards, additional mountains, and trail administration are intentionally deferred to later phases.
