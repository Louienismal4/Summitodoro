# Philippine Mountain Pomodoro App

> Map architecture update: The Mapbox sections in this original plan are
> historical. The implemented zero-cost renderer and basemap migration is
> documented in `maplibre-osm-migration-plan.md`.

## Full Implementation Plan

## 1. Product Definition

### Working Concept

A focus timer where users virtually climb real Philippine mountain trails.

The user:

1. Selects a mountain and trail.
2. Chooses or accepts a corresponding focus duration.
3. Starts a focus session.
4. Watches a hiker move along the actual trail geometry.
5. Reaches landmarks as focus milestones.
6. Arrives at the summit when the timer is completed.
7. Earns experience points, badges, streaks, and mountain completions.

The map should feel like trail navigation, but the product must explicitly state that it is a **virtual productivity experience**, not a real-world hiking navigation or safety application.

---

## 2. Core Product Principle

The map is driven by time, not by the user's GPS location.

```text
Elapsed focus time
        ↓
Session progress: 0–100%
        ↓
Distance along trail
        ↓
Coordinate on GeoJSON route
        ↓
Hiker marker position
```

Example:

```text
25-minute focus session
Trail length: 8 km

After 12.5 minutes:
Progress = 50%
Virtual distance = 4 km
Hiker appears halfway along the route
```

This architecture means the app does not need to call a routing API continuously.

---

## 3. Recommended Philippine Mountain Catalog

Start with a curated catalog rather than trying to support every Philippine mountain.

### MVP: Five Mountains

| Mountain     | Proposed Virtual Difficulty | Suggested Focus Session | Product Role        |
| ------------ | --------------------------: | ----------------------: | ------------------- |
| Mt. Pinatubo |                        Easy |              15 minutes | Onboarding mountain |
| Mt. Batulao  |                        Easy |              20 minutes | Early progression   |
| Mt. Ulap     |                    Moderate |              25 minutes | Standard Pomodoro   |
| Mt. Pulag    |                        Hard |              45 minutes | Long focus session  |
| Mt. Apo      |                  Expedition |              60 minutes | Premium achievement |

These time ratings are **game-design values**, not representations of actual hiking duration or safety difficulty.

For a launch catalog, prioritize mountains with:

- Recognizable identity
- Visually distinct terrain
- Usable trail geometry
- Several meaningful checkpoints
- Geographic diversity
- Verifiable public information

### Post-MVP Candidates

- Mt. Daraitan
- Mt. Makiling
- Mt. Arayat
- Mt. Tapulao
- Mt. Guiting-Guiting
- Mt. Kanlaon
- Mt. Kitanglad
- Mt. Dulang-Dulang
- Mt. Hamiguitan
- Mt. Mayon, presented as a landmark rather than necessarily a climbable route

Before publishing any mountain, verify:

- Whether the represented trail is legitimate
- Whether the route is currently recognized
- Whether the area has environmental or cultural restrictions
- Whether the trail name and checkpoints are accurate
- Whether showing detailed geometry creates conservation concerns

The product should not imply that a trail is currently open simply because it appears in the app.

---

## 4. Final Technology Stack

### Frontend

- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
- **Framer Motion**

### Map and Geospatial Layer

- **Mapbox GL JS**
- **GeoJSON**
- **Turf.js**
- **Mapbox terrain and hillshade layers**
- Optional elevation profiles generated during trail ingestion

### Backend

- **Supabase Auth**
- **Supabase PostgreSQL**
- **Supabase Storage**
- **Supabase Edge Functions**
- **PostGIS**, enabled in PostgreSQL if needed

### Deployment

- **Vercel** for the Next.js application
- **Supabase** for database, authentication, and asset storage
- Optional CDN or object storage later if trail traffic becomes significant

### Monitoring

- Sentry for errors
- PostHog or Plausible for product analytics
- Vercel Analytics for application performance
- Supabase logs for backend failures

---

## 5. Trail Data Strategy

This is the most important operational part of the project.

### Do Not Request Live Trail Routes During User Sessions

Instead, create a curated trail-ingestion pipeline.

```text
OpenStreetMap / authorized GPX / manual trace
                 ↓
             Raw route
                 ↓
       Validation and cleanup
                 ↓
      GeoJSON LineString output
                 ↓
   Simplification and metadata generation
                 ↓
       Store as versioned trail asset
                 ↓
       Reused by every app user
```

### Accepted Trail Sources

#### Preferred

1. OpenStreetMap ways and hiking-route relations
2. GPX tracks contributed with explicit permission
3. Official or open government datasets with compatible licenses
4. Manually traced routes based on authorized source material

#### Avoid Without Explicit Licensing Permission

- Downloading or scraping routes from commercial hiking platforms
- Copying tracks from personal blogs without permission
- Extracting coordinates from copyrighted maps
- Treating a publicly visible trail as automatically reusable data

Visibility does not equal licensing permission.

### Attribution

At minimum, the application should retain:

```text
© Mapbox
© OpenStreetMap contributors
```

The exact attribution implementation must also satisfy the terms of the Mapbox style and data products being used.

---

## 6. Trail Ingestion Tool

Build a small internal admin utility instead of manually editing production JSON.

### Inputs

- Mountain name
- Trail name
- OSM relation or way IDs
- GeoJSON upload
- GPX upload
- Trailhead and summit
- Source URL
- Source license
- Attribution
- Reviewer notes

### Processing Steps

1. Import the original data.
2. Convert GPX to GeoJSON when necessary.
3. Merge disconnected LineStrings.
4. Remove duplicate coordinates.
5. Validate longitude and latitude order.
6. Confirm route direction.
7. Simplify the geometry.
8. Calculate route distance.
9. Generate equally spaced progress points.
10. Assign checkpoints.
11. Preview on Mapbox.
12. Approve and publish a version.

### Suggested Libraries

- `@turf/turf`
- `togeojson`
- `geojson-validation`
- `mapbox-gl`
- Optional `gpxparser`

### Validation Rules

A trail cannot be published when:

- It has no source or attribution.
- Geometry is invalid.
- The route jumps implausibly between coordinates.
- The summit is not near the final coordinate.
- The route has unresolved disconnected sections.
- It has not passed human review.

---

## 7. Trail Asset Format

Use one versioned document per route.

```json
{
  "schemaVersion": 1,
  "id": "mt-ulap-eco-trail-v1",
  "mountainId": "mt-ulap",
  "name": "Mt. Ulap Eco-Trail",
  "status": "published",
  "country": "PH",
  "region": "Cordillera Administrative Region",
  "virtualDurationMinutes": 25,
  "routeDistanceMeters": 7200,
  "difficulty": "moderate",
  "source": {
    "provider": "OpenStreetMap",
    "license": "ODbL",
    "retrievedAt": "2026-07-11",
    "attribution": "© OpenStreetMap contributors"
  },
  "checkpoints": [
    {
      "id": "trailhead",
      "name": "Trailhead",
      "progress": 0
    },
    {
      "id": "first-ridge",
      "name": "First Ridge",
      "progress": 0.3
    },
    {
      "id": "viewpoint",
      "name": "Viewpoint",
      "progress": 0.65
    },
    {
      "id": "summit",
      "name": "Summit",
      "progress": 1
    }
  ],
  "geometry": {
    "type": "LineString",
    "coordinates": []
  }
}
```

The values above are illustrative and should not be published until validated.

---

## 8. Database Design

### `profiles`

```sql
id uuid primary key
display_name text
avatar_url text
xp integer default 0
level integer default 1
total_focus_seconds bigint default 0
current_streak integer default 0
longest_streak integer default 0
timezone text default 'Asia/Manila'
created_at timestamptz
updated_at timestamptz
```

### `mountains`

```sql
id text primary key
name text
slug text unique
region text
province text
description text
virtual_difficulty text
cover_image_url text
latitude numeric
longitude numeric
status text
sort_order integer
created_at timestamptz
updated_at timestamptz
```

### `trails`

```sql
id text primary key
mountain_id text references mountains(id)
name text
version integer
geojson_url text
route_distance_meters numeric
default_focus_seconds integer
source_name text
source_license text
source_attribution text
source_reference text
status text
published_at timestamptz
created_at timestamptz
updated_at timestamptz
```

### `trail_checkpoints`

```sql
id uuid primary key
trail_id text references trails(id)
name text
description text
progress numeric
icon text
ambient_sound text
sort_order integer
```

### `focus_sessions`

```sql
id uuid primary key
user_id uuid references profiles(id)
mountain_id text references mountains(id)
trail_id text references trails(id)
planned_seconds integer
elapsed_seconds integer
started_at timestamptz
completed_at timestamptz
status text
completion_ratio numeric
xp_awarded integer
client_session_id uuid unique
created_at timestamptz
```

### `achievements`

```sql
id text primary key
name text
description text
icon_url text
condition_type text
condition_value jsonb
xp_reward integer
```

### `user_achievements`

```sql
user_id uuid references profiles(id)
achievement_id text references achievements(id)
earned_at timestamptz
primary key (user_id, achievement_id)
```

### `daily_progress`

```sql
user_id uuid references profiles(id)
local_date date
completed_sessions integer
focus_seconds integer
xp_earned integer
primary key (user_id, local_date)
```

---

## 9. Timer Architecture

Do not depend on decrementing a number once per second. Browser throttling, sleeping devices, and inactive tabs will make that inaccurate.

Use timestamps:

```typescript
elapsed = now - startedAt - totalPausedDuration;
remaining = plannedDuration - elapsed;
progress = elapsed / plannedDuration;
```

Persist:

- `startedAt`
- `pausedAt`
- `accumulatedPausedMs`
- `plannedDurationMs`
- `status`

### Timer States

```typescript
type TimerState = "idle" | "running" | "paused" | "completed" | "cancelled";
```

### Recovery Behavior

When the user refreshes:

1. Load the persisted session.
2. Recalculate elapsed time.
3. Restore the marker to the correct route position.
4. Complete the session automatically if its end time passed.
5. Prevent duplicate rewards through an idempotent completion endpoint.

---

## 10. Hiker Movement Algorithm

Precompute the route length once after loading the trail.

```typescript
const route = lineString(coordinates);
const totalDistanceKm = length(route, { units: "kilometers" });

function positionAtProgress(progress: number) {
  const distance = totalDistanceKm * Math.min(Math.max(progress, 0), 1);

  return along(route, distance, {
    units: "kilometers",
  });
}
```

### Performance Decision

Do not run heavy Turf calculations every animation frame.

Instead:

1. Generate approximately 500–1,000 sampled positions when the trail loads.
2. Store them in memory.
3. Choose the appropriate sample from current timer progress.
4. Interpolate visually between adjacent samples.

```typescript
index = Math.floor(progress * (samples.length - 1));
```

This keeps movement smooth even on lower-powered phones.

---

## 11. Map Component Architecture

```text
MountainMap
├── MapCanvas
├── TerrainLayer
├── TrailSource
├── CompletedTrailLayer
├── RemainingTrailLayer
├── HikerMarker
├── CheckpointMarkers
├── TrailStatusOverlay
├── MapControls
└── Attribution
```

### Map Lifecycle

Create the map once.

```tsx
<MapProvider>
  <App />
</MapProvider>
```

Avoid destroying and recreating the map when:

- Opening a modal
- Pausing the timer
- Changing the timer display
- Navigating between map overlays
- Updating the marker

This reduces Mapbox map loads and improves performance.

### Visual Layers

- Basemap
- Hillshade
- Optional 3D terrain
- Full trail line
- Completed trail line
- Checkpoint symbols
- Hiker marker
- Summit marker

For the MVP, use 3D terrain only when device capability and network conditions are adequate.

---

## 12. Cost-Control Strategy

### Mapbox Cost Controls

- Initialize one map per application visit where possible.
- Avoid remounting it during a session.
- Do not use Directions API for curated trails.
- Do not use Geocoding API for each mountain view.
- Store mountain coordinates in the database.
- Load GeoJSON from your own storage or CDN.
- Cache trail assets aggressively.
- Disable unnecessary Mapbox services.
- Configure account usage alerts and billing limits.
- Track map initialization events in analytics.

### Suggested Cache Headers

For immutable versioned trails:

```http
Cache-Control: public, max-age=31536000, immutable
```

For mountain catalog metadata:

```http
Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400
```

---

## 13. User Experience

### Onboarding

1. Introduce the hiking metaphor.
2. Ask the user to choose a focus goal.
3. Recommend a first mountain.
4. Let the user run a short five-minute tutorial hike.
5. Prompt for account creation only after the experience is understood.

### Mountain-Selection Screen

Each card should show:

- Mountain name
- Region
- Virtual focus time
- Difficulty tier
- Landscape preview
- Locked or unlocked state
- User completion count

### Pre-Hike Screen

```text
Mt. Ulap

Virtual climb: 25 minutes
Checkpoints: 4
Reward: 250 XP

This is a focus experience and not a real-world navigation guide.

[Begin Hike]
```

### Active Session

The screen should prioritize:

- Map
- Hiker
- Current checkpoint
- Pause control
- Optional countdown
- Ambient audio toggle

Avoid cluttering it with analytics during focus.

### Completion

- Camera moves toward the summit.
- Hiker reaches the final point.
- Summit flag appears.
- XP is awarded.
- Focus summary appears.
- A short break is proposed.

---

## 14. Gamification Rules

Keep the first version understandable.

### Base XP

```text
1 completed focus minute = 10 XP
```

### Bonuses

- First summit of the day: +50 XP
- No-pause completion: +10%
- Daily goal completion: +100 XP
- Seven-day streak: badge
- Complete all Luzon launch mountains: regional badge

Do not reward tab surveillance or invasive behavior. Detecting tab visibility may be used to pause optional animations, but it should not be framed as proof that a user was or was not productive.

### Progression Example

| Level | XP Required | Unlock       |
| ----: | ----------: | ------------ |
|     1 |           0 | Mt. Pinatubo |
|     2 |         300 | Mt. Batulao  |
|     3 |         800 | Mt. Ulap     |
|     4 |       1,800 | Mt. Pulag    |
|     5 |       3,500 | Mt. Apo      |

This should be tested so users do not feel forced to complete trivial sessions just to access mountains.

---

## 15. Accessibility and Low-Bandwidth Support

This is important for a Philippine consumer web product.

### Required Features

- Reduced-motion mode
- Keyboard-accessible controls
- Screen-reader timer announcements
- High-contrast route state
- Text alternative for map progress
- Audio off by default
- Graceful fallback when WebGL is unavailable
- Low-data mode

### Low-Data Mode

The fallback replaces terrain rendering with a lightweight illustrated route:

```text
Trailhead ━━━ Forest ━━━ Ridge ━━━ Summit
                        🚶 68%
```

Users should still be able to complete sessions if Mapbox fails.

The timer must never depend on the map loading successfully.

---

## 16. Security and Data Integrity

### Supabase Row Level Security

Users can:

- Read their own profile
- Update safe profile fields
- Read their own sessions
- Create their own session records

Users cannot:

- Directly set XP
- Directly set achievement completion
- Modify published trail data
- Mark incomplete sessions as complete through a raw client update

### Server-Controlled Completion

Use an Edge Function or Next.js server route:

```text
POST /api/sessions/{id}/complete
```

The server:

1. Reads the session.
2. Verifies ownership.
3. Calculates elapsed time.
4. Checks completion eligibility.
5. Awards XP once.
6. Updates streak data.
7. Evaluates achievements.
8. Returns the final summary.

---

## 17. Repository Structure

```text
summit-focus/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── (marketing)/
│       │   ├── (app)/
│       │   │   ├── mountains/
│       │   │   ├── hike/
│       │   │   ├── history/
│       │   │   └── profile/
│       │   └── api/
│       ├── components/
│       │   ├── map/
│       │   ├── timer/
│       │   ├── mountains/
│       │   ├── achievements/
│       │   └── ui/
│       ├── hooks/
│       ├── lib/
│       │   ├── map/
│       │   ├── timer/
│       │   ├── supabase/
│       │   └── analytics/
│       ├── stores/
│       └── types/
├── packages/
│   ├── trail-engine/
│   ├── shared-types/
│   └── validation/
├── tools/
│   └── trail-admin/
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── seed.sql
└── docs/
    ├── product/
    ├── architecture/
    ├── licensing/
    └── trail-sources/
```

---

## 18. Implementation Phases

### Phase 0: Discovery and Route Feasibility

**Duration:** 1 week

Deliverables:

- Product brief
- Five proposed MVP mountains
- Trail-source spreadsheet
- Licensing checklist
- Mapbox proof of concept
- At least one valid Philippine trail displayed as GeoJSON
- Mobile performance test

Exit criteria:

- One route can be legally sourced.
- It renders reliably.
- A marker can move from trailhead to summit.
- The team understands attribution obligations.

### Phase 1: Technical Prototype

**Duration:** 1–2 weeks

Build:

- Next.js application shell
- Mapbox integration
- One mountain
- One static GeoJSON route
- Turf-based progress calculation
- Functional 5-, 15-, and 25-minute timers
- Pause and resume
- Refresh recovery
- Summit completion animation

No authentication yet.

Exit criteria:

- Timer remains accurate after changing tabs.
- Map failure does not break the timer.
- Mobile performance is acceptable.
- Marker movement is smooth.

### Phase 2: Core MVP

**Duration:** 3 weeks

Build:

- Supabase authentication
- Mountain catalog
- Five curated trails
- Sessions database
- XP and levels
- Checkpoints
- Session history
- User profile
- Responsive design
- Low-data fallback
- Basic sound settings

Exit criteria:

- A signed-in user can complete a session and see it in history.
- Rewards cannot be duplicated by refreshing.
- Each trail has source and license metadata.
- All five trails have human review.

### Phase 3: Trail Administration

**Duration:** 2 weeks

Build:

- Admin authentication
- GPX and GeoJSON upload
- Geometry preview
- Route reversal
- Simplification controls
- Checkpoint editor
- Source and licensing fields
- Draft/publish workflow
- Trail versioning

Exit criteria:

- A new mountain can be added without a frontend deployment.
- Published routes cannot be silently overwritten.
- Previous trail versions remain recoverable.

### Phase 4: Product Polish

**Duration:** 2 weeks

Build:

- Camera fly-in
- Animated trail completion
- Mountain-specific ambience
- Achievement system
- Streaks
- Daily goals
- Improved onboarding
- Reduced-motion support
- Performance instrumentation

Exit criteria:

- Core Web Vitals are acceptable.
- No critical accessibility blockers.
- Mobile interaction is stable.
- Mapbox map initialization is measured.

### Phase 5: Private Beta

**Duration:** 1–2 weeks

Test with approximately 25–100 users.

Measure:

- Session start rate
- Completion rate
- Timer failures
- Map-load failures
- Average focus duration
- Repeat usage
- Cost per active user
- Preferred mountains
- Drop-off points

During beta, avoid adding many new mountains. Fix the focus loop first.

### Phase 6: Public MVP Launch

Launch requirements:

- Five or more validated trails
- Privacy policy
- Terms of service
- Map attribution
- Data-source register
- Error monitoring
- Mapbox billing alerts
- Backup and recovery process
- User account deletion
- Product disclaimer
- Incident response checklist

---

## 19. Testing Plan

### Unit Tests

- Timer progress calculation
- Pause-duration calculation
- Route interpolation
- Checkpoint triggering
- XP calculation
- Streak calculation
- Trail-schema validation

### Integration Tests

- Authentication
- Session creation
- Session recovery
- Session completion
- Duplicate completion request
- Achievement award
- Trail asset loading

### End-to-End Tests

Using Playwright:

1. Open mountain catalog.
2. Select a mountain.
3. Start a shortened test session.
4. Pause and resume.
5. Reload the browser.
6. Complete the session.
7. Verify XP.
8. Verify history.
9. Confirm no duplicate reward.

### Geospatial Tests

- First coordinate matches trailhead.
- Final coordinate matches summit or declared endpoint.
- Progress never moves backward unexpectedly.
- Route has no extreme jumps.
- Checkpoints lie near the route.
- Geometry renders inside the expected Philippine region.

---

## 20. Principal Risks

### Trail Data Is Incomplete

**Mitigation:** Curate and review each route. Never generate the public catalog automatically from all OSM trails.

### Trail Geometry Is Inaccurate

**Mitigation:** Label it as a virtual representation, record provenance, support corrections, and version every route.

### Users Interpret It as Real Navigation

**Mitigation:** Use explicit wording throughout the app:

> This route is presented for virtual focus progress and is not intended for real-world navigation, emergency use, or trail-condition guidance.

### Protected-Area Sensitivity

**Mitigation:** Avoid revealing unofficial paths, environmentally sensitive points, or locations that relevant authorities do not want promoted. Coordinate with park or local stakeholders when expanding the catalog.

### Map Costs Increase

**Mitigation:** One map instance, no live Directions requests, aggressive GeoJSON caching, low-data fallback, billing alerts, and map-load analytics.

### Timer Is Exploitable

**Mitigation:** Server-side completion checks, idempotent reward logic, and reasonable validation without invasive surveillance.

---

## 21. MVP Definition

The MVP is complete when a user can:

1. Create an account.
2. Select one of five Philippine mountains.
3. Read its virtual duration and trail description.
4. Start a focus session.
5. Watch a hiker move on a real trail-shaped route.
6. Pause and resume.
7. Recover the session after refreshing.
8. Reach checkpoints.
9. Complete the session.
10. Earn XP.
11. View completed mountains and focus history.

The MVP does **not** need:

- Turn-by-turn real navigation
- Live user GPS
- Social multiplayer
- Community route uploads
- Weather integration
- Leaderboards
- Mobile applications
- Hundreds of mountains
- Mapbox Directions API
- Offline maps

---

## 22. Recommended First Development Slice

Build the first vertical slice with **one Philippine mountain only**:

```text
Mountain catalog
      ↓
Mountain details
      ↓
Load validated GeoJSON
      ↓
Start 5-minute test hike
      ↓
Animate hiker with Turf.js
      ↓
Reach two checkpoints
      ↓
Complete session
      ↓
Save result to Supabase
```

Once this complete flow works, adding mountains becomes primarily a trail-content operation rather than a new engineering project.

The critical early milestone is not five mountain cards or a sophisticated achievement system. It is proving that a validated Philippine trail, a resilient timer, and a smooth Mapbox animation can operate together without repeated routing calls or excessive map initialization.
