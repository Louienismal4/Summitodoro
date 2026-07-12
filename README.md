# Summitodoro

Summitodoro is a gamified Pomodoro prototype where elapsed focus time moves a virtual hiker along a versioned Philippine mountain trail. It includes local snapshots of mapped OpenStreetMap paths for Mt. Ulap, Mt. Pulag, and Mt. Pinatubo; 30/45/60/90/120-minute timer presets; automatic short breaks at work checkpoints; pause/resume/reset and refresh recovery; timed checkpoints; summit completion; a MapLibre and OpenStreetMap-derived basemap; and a low-data fallback.

The expedition dashboard also maintains a local hiker profile with XP, levels, completed summits, total focus minutes, and a focus-chain counter. Each completed session is rewarded once by session ID, so refreshing a completion cannot duplicate XP.

Checkpoint positions are proportional to elapsed focus time. Every route reaches
its first checkpoint at 35%, its second checkpoint at 70%, and the summit at
100%. The dashboard converts those percentages into exact elapsed and remaining
times for the selected duration. Pausing freezes both the clock and hiker.

When a running session reaches a work checkpoint, the work clock pauses for a
short break and resumes automatically. Each break is 20% of one work segment;
for example, a 60-minute session with two intermediate checkpoints has three
20-minute work segments and four-minute short breaks after the first two.

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

Open `http://localhost:3000/hike` to enter the full-screen expedition dashboard. The root URL redirects there automatically. The interactive map uses OpenFreeMap's free Liberty style by default and requires no account or API key. Set `NEXT_PUBLIC_MAP_STYLE_URL` only when you need to override that provider-neutral style URL. If the map service or WebGL is unavailable, the app deliberately uses the illustrated fallback while the timer remains fully functional.

## Optional Supabase Google sign-in

The welcome dialog always supports a local hiker name. To offer Google sign-in
and profile personalization, configure Google as a provider in Supabase Auth,
then set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` and Vercel. Set
`NEXT_PUBLIC_SITE_URL=https://summitodoro.vercel.app` for the production
deployment. The Google
profile name and picture personalize the local hiker profile after sign-in.
Run both migration files in `supabase/migrations/` in the Supabase SQL Editor
before using the app. They create the per-user profile table, its row-level
security policies, and the expedition summary fields. Once a signed-in hiker's
profile is available, their XP, focus time, summit count, focus chain, and
completed-session history are synced to Supabase. Local storage remains an
offline fallback for visitors who are not signed in.

## Mountain images and YouTube stream

Add your own mountain images before deploying by placing these files in the
repository, then committing and deploying them through Vercel:

- `public/images/mountains/mt-ulap.jpg`
- `public/images/mountains/mt-pulag.jpg`
- `public/images/mountains/mt-pinatubo.jpg`

They are displayed in the mountain selector with a built-in illustration-style
fallback until you add them. Static `public/` files are deployed from the Git
repository; they cannot be uploaded to an already deployed Vercel project. If
you need uploads from an admin screen later, use Vercel Blob with authenticated
storage instead.

The sidebar player embeds a hardcoded set of YouTube presets that users can
cycle through with the previous and next controls. To change the available
streams, update `defaultYouTubeStreamOptions` in
`components/hike/expedition-sidebar.tsx`. A YouTube live stream works too, but
use the currently active live video URL because older live recordings can become
unavailable after YouTube rotates them.

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
- `lib/gamification/progression.ts` calculates XP, levels, and idempotent completion rewards; `hooks/use-expedition-profile.ts` persists the local profile and synchronizes signed-in users to Supabase.
- `lib/trail/trail-engine.ts` validates external GeoJSON, calculates route length once, generates 500 samples once, and uses lightweight interpolation during the session.
- `components/map/mountain-map.tsx` creates one MapLibre instance per mounted hike and updates only the marker and trail paint as progress changes.
- The map renders distinct completed and remaining trail layers, trailhead/checkpoint/summit markers, and imperative camera controls without remounting during session updates.
- `public/data/trails/` contains versioned, simplified local snapshots of the OpenStreetMap ways listed in each mountain's attribution panel. Those snapshots are licensed under ODbL 1.0.

Additional mountains and trail administration are intentionally deferred to later phases.
