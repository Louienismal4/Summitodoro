# Summitodoro

Summitodoro is a gamified Pomodoro prototype where elapsed focus time moves a virtual hiker along a versioned Philippine mountain trail. It includes local snapshots of mapped OpenStreetMap paths for Mt. Ulap, Mt. Pulag, and Mt. Pinatubo; 5/15/25-minute timer presets; pause/resume/reset and refresh recovery; timed checkpoints; summit completion; a MapLibre and OpenStreetMap-derived basemap; and a low-data fallback.

The expedition dashboard also maintains a local hiker profile with XP, levels, completed summits, total focus minutes, and a focus-chain counter. Each completed session is rewarded once by session ID, so refreshing a completion cannot duplicate XP.

Checkpoint positions are proportional to elapsed focus time. Every route reaches
its first checkpoint at 35%, its second checkpoint at 70%, and the summit at
100%. The dashboard converts those percentages into exact elapsed and remaining
times for the selected duration. Pausing freezes both the clock and hiker.

> Routes are virtual productivity representations and are not intended for real-world navigation, access guidance, trail access, or safety decisions. Geometry is a simplified local snapshot of OpenStreetMap data, not a live navigation service; conditions and access can change.

## Requirements

- Node.js 20.9 or newer
- npm
- Network access to OpenFreeMap for the interactive map

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` to enter the full-screen expedition dashboard directly. The interactive map uses OpenFreeMap's free Liberty style by default and requires no account or API key. Set `NEXT_PUBLIC_MAP_STYLE_URL` only when you need to override that provider-neutral style URL. If the map service or WebGL is unavailable, the app deliberately uses the illustrated fallback while the timer remains fully functional.

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
- `components/map/mountain-map.tsx` creates one MapLibre instance per mounted hike and updates only the marker and trail paint as progress changes.
- The map renders distinct completed and remaining trail layers, trailhead/checkpoint/summit markers, and imperative camera controls without remounting during session updates.
- `public/data/trails/` contains versioned, simplified local snapshots of the OpenStreetMap ways listed in each mountain's attribution panel. Those snapshots are licensed under ODbL 1.0.

Authentication, Supabase persistence, rewards, additional mountains, and trail administration are intentionally deferred to later phases.
