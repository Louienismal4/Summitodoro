# MapLibre and OpenStreetMap Migration Plan

> Status: Implemented on July 11, 2026. The application now uses MapLibre and
> OpenFreeMap without terrain or Mapbox runtime services.

## Goal

Replace Mapbox GL JS and Mapbox-hosted map resources with MapLibre GL JS and an
OpenStreetMap-derived basemap while preserving Summitodoro's trail animation,
markers, camera controls, fallback experience, and timer behavior.

The migration should target zero recurring map-provider cost without coupling
the app permanently to a tile vendor. The target architecture uses OpenFreeMap's
free public instance and a 2D route map. The existing illustrated fallback
protects the timer experience if that no-SLA service is unavailable.

## Recommended target architecture

```text
MapLibre GL JS renderer
├── OpenFreeMap OSM-derived vector style
├── Existing local, versioned trail GeoJSON
├── Existing client-side markers and progress layers
└── Visible provider and OpenStreetMap attribution
```

Start with OpenFreeMap's free public vector tiles and Liberty style. Keep the
style URL in environment configuration so a later move to another free endpoint
or self-hosted tiles does not require another renderer rewrite.

Do not use `tile.openstreetmap.org` as the production architecture. Those public
servers are community infrastructure with limited capacity, no SLA, and usage
rules that permit blocking heavy applications.

## Scope

### Preserve

- One interactive map instance per mounted expedition
- Local trail GeoJSON validation and interpolation
- Completed and remaining trail layers
- Trailhead, checkpoint, summit, and hiker markers
- Fit and reset controls
- Timer operation when the map or network fails
- Low-data illustrated fallback
- Responsive desktop and mobile layouts

### Replace

- `mapbox-gl` dependency and CSS
- `mapbox://` style URL and terrain integration
- Mapbox access-token handling
- Mapbox-specific types, names, errors, selectors, documentation, and tests
- Mapbox attribution metadata

### Exclude

- 3D terrain, elevation services, and raster DEM requests

### Defer

- Self-hosting a national or global OSM tile stack
- Offline tile downloads
- Routing, geocoding, search, and navigation APIs
- Real-world trail verification

## Configuration contract

Use provider-neutral public configuration:

```dotenv
NEXT_PUBLIC_MAP_STYLE_URL=
```

- Use `https://tiles.openfreemap.org/styles/liberty` for the target map.
- `NEXT_PUBLIC_MAP_STYLE_URL` remains configurable for a future endpoint change.
- OpenFreeMap requires no account or API key.
- Attribution should come from style sources where possible. Summitodoro must
  always render a visible attribution control and must not place it beneath UI.

Centralize parsing and validation in a small map configuration module rather
than reading environment variables throughout React components.

## Zero-cost service decision

OpenFreeMap is the initial provider because its public instance permits
commercial use with no registration, API key, map-view limit, or stated usage
fee. It is supplied as-is without an SLA or personalized support.

The project accepts that availability tradeoff for the zero-cost target because:

1. The timer remains fully functional without the interactive basemap.
2. The illustrated fallback already communicates map outages gracefully.
3. The provider URL remains configurable for a fast future replacement.
4. Local trail data and progress state never depend on OpenFreeMap.

Reconsider a paid provider or self-hosting only when measured outages or business
requirements justify recurring infrastructure cost.

## Implementation phases

### Phase 0: Record the current behavior

- Add or update browser assertions for map canvas visibility, trail controls,
  marker movement, fallback behavior, and absence of hydration errors.
- Record the current client bundle size and map initialization count.
- Confirm that timer ticks and duration changes do not recreate the map.
- Capture desktop and mobile screenshots for visual comparison.

Exit criteria:

- Current behavior is reproducible and protected by tests.
- Known stale end-to-end expectations are corrected before migration results are
  evaluated.

### Phase 1: Introduce provider-neutral configuration

- Add a validated map configuration module.
- Replace `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` checks with a required style URL.
- Update the fallback message to avoid naming a specific provider.
- Keep the existing Mapbox renderer temporarily so configuration and error-state
  changes can be reviewed separately.

Exit criteria:

- Missing style configuration shows the fallback without affecting the timer.

### Phase 2: Swap the renderer and establish a 2D baseline

- Install `maplibre-gl` and remove `mapbox-gl`.
- Replace global Mapbox CSS with MapLibre CSS.
- Update map, bounds, marker, and navigation-control imports and types.
- Remove the Mapbox access-token assignment.
- Initialize MapLibre with the configured OSM-derived style URL.
- Preserve the local GeoJSON source, trail layers, markers, and camera controls.
- Remove the terrain source, state, imperative method, and user-interface control.
- Rename Mapbox-specific CSS selectors to MapLibre selectors.
- Enable MapLibre's attribution control in a position that remains visible at
  every responsive breakpoint.

Exit criteria:

- No Mapbox package, URL, token, or runtime request remains.
- The 2D basemap and complete Summitodoro trail experience work on desktop and
  mobile.
- Attribution is legible, linked, and unobscured.

### Phase 3: Harden lifecycle and performance

- Keep map initialization in one effect keyed only to the actual trail/style
  identity, not timer progress.
- Continue updating the hiker with `setLngLat` and trail paint with
  `setPaintProperty`.
- Ensure all controls, listeners, markers, and WebGL resources are removed on
  unmount.
- Consider initializing the map only when its container approaches the viewport
  or when the user requests the interactive view.
- Avoid prefetching or bulk-downloading OSM tiles.
- Verify browser and provider caching behavior rather than adding a custom tile
  proxy prematurely.

Exit criteria:

- One map instance is created per expedition mount.
- A running timer produces no map network requests beyond normal visible tiles.
- No listener, marker, or WebGL-context leak appears after navigation.

### Phase 4: Complete documentation and licensing cleanup

- Replace Mapbox setup instructions in the README and `.env.example`.
- Update mountain source attribution to name OpenStreetMap contributors and the
  chosen tile provider accurately.
- Update the original implementation plan or mark its Mapbox sections as
  superseded by this migration plan.
- Document provider availability terms, service announcements, attribution, and
  fallback procedures.
- Retain the existing warning that the route is illustrative and not suitable
  for real-world navigation.

Exit criteria:

- A new developer can run the fallback without credentials and enable the map
  using only documented configuration.
- Attribution and licensing text match every data and tile source in use.

### Phase 5: Rollout and observe

- Deploy to a preview environment first.
- Test from Philippine desktop and mobile networks.
- Monitor tile errors, style-load time, WebGL failures, and fallback activation
  rate.
- Roll out to production after preview stability is confirmed.
- Keep rollback as a commit-level deployment rollback rather than maintaining
  two renderers in the production bundle.

## Verification matrix

| Area           | Required checks                                               |
| -------------- | ------------------------------------------------------------- |
| Static quality | Format, ESLint, TypeScript, production build                  |
| Unit           | Config validation and fallback reasons                        |
| Browser        | Map load, marker movement, and camera controls                |
| Resilience     | Missing style, failed style, provider outage, and no WebGL    |
| Timer          | Start, pause, resume, reset, refresh recovery while map fails |
| Lifecycle      | No map recreation on timer ticks or checkpoint updates        |
| Responsive     | Desktop, tablet, and mobile attribution remains visible       |
| Accessibility  | Named controls, keyboard operation, fallback status text      |
| Network        | No Mapbox requests and no prohibited OSM tile prefetching     |

## Performance and efficiency budgets

- MapLibre must remain dynamically imported.
- Only one map instance may exist for the active expedition.
- Timer updates must not initialize a map or reload its style.
- Trail geometry must stay local and be prepared once per trail version.
- No elevation data or terrain service is loaded.
- The low-data fallback must remain a first-class operating mode.
- Compare client bundle size and time-to-interactive against the Phase 0
  baseline; investigate any material regression before rollout.

## Completion definition

The migration is complete when:

- The `mapbox-gl` runtime package, Mapbox URLs, environment variables, source,
  tests, and current documentation are removed. MapLibre's internally named
  `@mapbox/*` compatibility packages may remain as transitive dependencies.
- The application sends no requests to Mapbox domains.
- The interactive map uses MapLibre with an OSM-derived style.
- The trail and timer work with and without the basemap.
- Attribution is compliant and visible on every supported layout.
- Quality checks and the verification matrix pass.
- Preview monitoring shows acceptable latency, errors, and provider usage.

## Suggested implementation order

Execute Phases 0 through 2 in the first change set, then complete Phases 3 through
5 as hardening and rollout. Removing terrain entirely keeps the renderer swap
smaller, reduces network usage, and avoids unnecessary provider decisions.
