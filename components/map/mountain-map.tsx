"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { LngLatBounds, Map as MapLibreMap, Marker } from "maplibre-gl";

import { mapStyleUrl } from "@/lib/map/config";
import { loadMapStyle } from "@/lib/map/map-style-cache";
import {
  getTrailNavigationBounds,
  type TrailNavigationBounds,
} from "@/lib/map/trail-bounds";
import type { Coordinate, TrailFeature } from "@/types/trail";

const MAP_MIN_ZOOM = 13;
const MAP_MAX_ZOOM = 21;
const HIKER_FOLLOW_INTERVAL_MS = 1_500;
const HIKER_FOLLOW_DURATION_MS = 500;

const getHikerRecenteringOffset = (): [number, number] => {
  if (
    typeof window === "undefined" ||
    !window.matchMedia("(max-width: 820px) and (orientation: portrait)").matches
  ) {
    return [0, 0];
  }

  const sheetHeight = document
    .querySelector<HTMLElement>(".expedition-sidebar")
    ?.getBoundingClientRect().height;
  return [0, -Math.round((sheetHeight ?? window.innerHeight * 0.46) / 2)];
};

export type MapCheckpoint = {
  id: string;
  name: string;
  coordinate: Coordinate;
};

export type MountainMapHandle = {
  fitTrail: () => void;
  followHiker: () => void;
  resetCamera: () => void;
};

type MountainMapProps = {
  feature: TrailFeature;
  coordinate: Coordinate;
  progress: number;
  checkpoints: MapCheckpoint[];
  reachedCheckpointIds: string[];
  hikerAvatarUrl: string | null;
  navigationBounds?: TrailNavigationBounds;
  onFollowChange?: (following: boolean) => void;
  onUnavailable: (reason: string) => void;
};

export const MountainMap = forwardRef<MountainMapHandle, MountainMapProps>(
  function MountainMap(
    {
      feature,
      coordinate,
      progress,
      checkpoints,
      reachedCheckpointIds,
      hikerAvatarUrl,
      navigationBounds,
      onFollowChange,
      onUnavailable,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const boundsRef = useRef<LngLatBounds | null>(null);
    const hikerMarkerRef = useRef<Marker | null>(null);
    const hikerElementRef = useRef<HTMLDivElement | null>(null);
    const staticMarkersRef = useRef<Marker[]>([]);
    const checkpointElementsRef = useRef(new Map<string, HTMLDivElement>());
    const onUnavailableRef = useRef(onUnavailable);
    const onFollowChangeRef = useRef(onFollowChange);
    const initialCoordinateRef = useRef(coordinate);
    const coordinateRef = useRef(coordinate);
    const progressRef = useRef(progress);
    const reachedCheckpointIdsRef = useRef(reachedCheckpointIds);
    const hikerAvatarUrlRef = useRef(hikerAvatarUrl);
    const isFollowingRef = useRef(true);
    const lastFollowAtRef = useRef(0);
    const followTimerRef = useRef<number | null>(null);
    progressRef.current = progress;
    coordinateRef.current = coordinate;
    reachedCheckpointIdsRef.current = reachedCheckpointIds;
    hikerAvatarUrlRef.current = hikerAvatarUrl;

    useEffect(() => {
      onUnavailableRef.current = onUnavailable;
    }, [onUnavailable]);

    useEffect(() => {
      onFollowChangeRef.current = onFollowChange;
    }, [onFollowChange]);

    const setFollowing = useCallback((following: boolean) => {
      if (isFollowingRef.current === following) return;

      isFollowingRef.current = following;
      if (containerRef.current) {
        containerRef.current.dataset.cameraFollowing = String(following);
      }
      if (!following && followTimerRef.current !== null) {
        window.clearTimeout(followTimerRef.current);
        followTimerRef.current = null;
      }
      onFollowChangeRef.current?.(following);
    }, []);

    const centerOnHiker = useCallback((duration = HIKER_FOLLOW_DURATION_MS) => {
      const map = mapRef.current;
      if (!map?.isStyleLoaded()) return;

      lastFollowAtRef.current = performance.now();
      map.easeTo({
        center: coordinateRef.current,
        offset: getHikerRecenteringOffset(),
        duration,
        essential: true,
      });
    }, []);

    const scheduleFollow = useCallback(() => {
      if (!isFollowingRef.current) return;

      const elapsed = performance.now() - lastFollowAtRef.current;
      if (elapsed >= HIKER_FOLLOW_INTERVAL_MS) {
        centerOnHiker();
        return;
      }

      if (followTimerRef.current !== null) return;
      followTimerRef.current = window.setTimeout(() => {
        followTimerRef.current = null;
        if (isFollowingRef.current) centerOnHiker();
      }, HIKER_FOLLOW_INTERVAL_MS - elapsed);
    }, [centerOnHiker]);

    useImperativeHandle(
      ref,
      () => ({
        fitTrail: () => {
          setFollowing(false);
          if (mapRef.current && boundsRef.current) {
            mapRef.current.fitBounds(boundsRef.current, {
              padding: 80,
              duration: 650,
            });
          }
        },
        followHiker: () => {
          setFollowing(true);
          centerOnHiker();
        },
        resetCamera: () => {
          setFollowing(false);
          if (mapRef.current && boundsRef.current) {
            mapRef.current.fitBounds(boundsRef.current, {
              padding: 80,
              bearing: 0,
              pitch: 0,
              duration: 650,
            });
          }
        },
      }),
      [centerOnHiker, setFollowing],
    );

    useEffect(() => {
      let disposed = false;
      let stopFollowingFromMapControl: ((event: PointerEvent) => void) | null =
        null;
      const controller = new AbortController();
      const mapContainer = containerRef.current;
      const checkpointElements = checkpointElementsRef.current;
      isFollowingRef.current = true;
      if (mapContainer) {
        mapContainer.dataset.cameraFollowing = "true";
      }

      void Promise.all([
        import("maplibre-gl"),
        loadMapStyle(mapStyleUrl, controller.signal),
      ])
        .then(([{ default: maplibregl }, mapStyle]) => {
          if (disposed || !mapContainer) return;

          const start = feature.geometry.coordinates[0] as Coordinate;
          const end = feature.geometry.coordinates.at(-1) as Coordinate;
          const bounds = feature.geometry.coordinates.reduce(
            (currentBounds, point) => currentBounds.extend(point as Coordinate),
            new maplibregl.LngLatBounds(start, start),
          );
          const constrainedBounds =
            navigationBounds ??
            getTrailNavigationBounds(
              feature.geometry.coordinates as Coordinate[],
            );
          boundsRef.current = bounds;

          const map = new maplibregl.Map({
            container: mapContainer,
            style: mapStyle,
            bounds,
            maxBounds: constrainedBounds,
            minZoom: MAP_MIN_ZOOM,
            maxZoom: MAP_MAX_ZOOM,
            renderWorldCopies: false,
            fitBoundsOptions: { padding: 80 },
            attributionControl: { compact: true },
          });
          mapRef.current = map;
          map.addControl(
            new maplibregl.NavigationControl({ showCompass: false }),
            "top-right",
          );
          stopFollowingFromMapControl = (event: PointerEvent) => {
            if (
              event.target instanceof Element &&
              event.target.closest(".maplibregl-ctrl button")
            ) {
              setFollowing(false);
            }
          };
          mapContainer.addEventListener(
            "pointerdown",
            stopFollowingFromMapControl,
          );
          const stopFollowingAfterManualMovement = (event: {
            originalEvent?: unknown;
          }) => {
            if (event.originalEvent) setFollowing(false);
          };
          map.on("dragstart", stopFollowingAfterManualMovement);
          map.on("zoomstart", stopFollowingAfterManualMovement);
          map.on("rotatestart", stopFollowingAfterManualMovement);
          map.on("pitchstart", stopFollowingAfterManualMovement);
          map.on("mousedown", () => setFollowing(false));
          map.on("touchstart", () => setFollowing(false));
          map.on("wheel", () => setFollowing(false));

          map.once("load", () => {
            if (disposed) return;
            map.addSource("summitodoro-trail", {
              type: "geojson",
              data: feature,
              lineMetrics: true,
            });
            map.addLayer({
              id: "trail-casing",
              type: "line",
              source: "summitodoro-trail",
              paint: {
                "line-color": "#fffdf7",
                "line-width": 11,
                "line-opacity": 0.96,
              },
            });
            map.addLayer({
              id: "trail-incomplete",
              type: "line",
              source: "summitodoro-trail",
              paint: {
                "line-color": "#929b94",
                "line-width": 7,
                "line-opacity": 0.92,
              },
            });
            map.addLayer({
              id: "trail-completed",
              type: "line",
              source: "summitodoro-trail",
              paint: {
                "line-width": 6,
                "line-opacity": 1,
                "line-gradient": [
                  "step",
                  ["line-progress"],
                  "#0aa256",
                  Math.max(0.0001, progressRef.current),
                  "rgba(10, 162, 86, 0)",
                ],
              },
            });
            if (containerRef.current) {
              containerRef.current.dataset.trailLayers =
                "casing incomplete completed";
            }
            // Keep the summit as a map-native feature rather than an HTML
            // marker. MapLibre reprojects this source with the trail on every
            // camera change, so it cannot drift from Pulag's endpoint when the
            // route is fitted or the user zooms out.
            map.addSource("summitodoro-summit", {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "Point",
                  coordinates: end,
                },
              },
            });
            map.addLayer({
              id: "summit-marker-base",
              type: "circle",
              source: "summitodoro-summit",
              paint: {
                "circle-radius": 15,
                "circle-color": "#0aa256",
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 3,
                "circle-opacity": 1,
              },
            });
            map.addLayer({
              id: "summit-marker-icon",
              type: "symbol",
              source: "summitodoro-summit",
              layout: {
                "text-field": "▲",
                "text-size": 10,
                "text-anchor": "center",
              },
              paint: {
                "text-color": "#ffffff",
              },
            });
            map.addLayer({
              id: "summit-marker-label",
              type: "symbol",
              source: "summitodoro-summit",
              layout: {
                "text-field": "SUMMIT",
                "text-size": 6,
                "text-letter-spacing": 0.05,
                "text-offset": [0, 3.5],
                "text-anchor": "top",
              },
              paint: {
                "text-color": "#515952",
                "text-halo-color": "rgba(255, 255, 253, 0.94)",
                "text-halo-width": 3,
              },
            });

            const addStaticMarker = (
              markerCoordinate: Coordinate,
              kind: "trailhead" | "checkpoint" | "summit",
              label: string,
              id?: string,
            ) => {
              const element = document.createElement("div");
              element.className = `trail-map-marker ${kind}`;
              if (id && reachedCheckpointIdsRef.current.includes(id)) {
                element.classList.add("reached");
              }
              element.setAttribute("aria-label", label);
              if (id) element.dataset.checkpointId = id;
              const icon = document.createElement("span");
              icon.textContent =
                kind === "trailhead" ? "●" : kind === "summit" ? "▲" : "◆";
              const caption = document.createElement("small");
              caption.textContent = label;
              element.append(icon, caption);
              if (id) checkpointElements.set(id, element);
              staticMarkersRef.current.push(
                new maplibregl.Marker({ element, anchor: "center" })
                  .setLngLat(markerCoordinate)
                  .addTo(map),
              );
            };

            addStaticMarker(start, "trailhead", "Trailhead");
            checkpoints.forEach((checkpoint) =>
              addStaticMarker(
                checkpoint.coordinate,
                "checkpoint",
                checkpoint.name,
                checkpoint.id,
              ),
            );
            const hikerElement = document.createElement("div");
            hikerElement.className = "map-hiker-marker";
            hikerElement.setAttribute("aria-label", "Virtual hiker position");
            hikerElement.classList.toggle(
              "has-avatar",
              Boolean(hikerAvatarUrlRef.current),
            );
            hikerElement.style.backgroundImage = hikerAvatarUrlRef.current
              ? `url("${hikerAvatarUrlRef.current}")`
              : "";
            hikerElement.textContent = hikerAvatarUrlRef.current ? "" : "🥾";
            hikerElementRef.current = hikerElement;
            hikerMarkerRef.current = new maplibregl.Marker({
              element: hikerElement,
            })
              .setLngLat(initialCoordinateRef.current)
              .addTo(map);

            window.requestAnimationFrame(() => {
              if (disposed) return;
              centerOnHiker(0);
            });
          });
        })
        .catch((error: unknown) =>
          onUnavailableRef.current(
            error instanceof Error
              ? error.message
              : "The map library could not be loaded.",
          ),
        );

      return () => {
        disposed = true;
        controller.abort();
        if (followTimerRef.current !== null) {
          window.clearTimeout(followTimerRef.current);
          followTimerRef.current = null;
        }
        hikerMarkerRef.current?.remove();
        staticMarkersRef.current.forEach((marker) => marker.remove());
        if (stopFollowingFromMapControl) {
          mapContainer?.removeEventListener(
            "pointerdown",
            stopFollowingFromMapControl,
          );
        }
        mapRef.current?.remove();
        hikerMarkerRef.current = null;
        hikerElementRef.current = null;
        staticMarkersRef.current = [];
        checkpointElements.clear();
        mapRef.current = null;
        boundsRef.current = null;
      };
    }, [centerOnHiker, checkpoints, feature, navigationBounds, setFollowing]);

    useEffect(() => {
      hikerMarkerRef.current?.setLngLat(coordinate);
      scheduleFollow();
    }, [coordinate, scheduleFollow]);

    useEffect(() => {
      const hikerElement = hikerElementRef.current;
      if (!hikerElement) return;

      hikerElement.classList.toggle("has-avatar", Boolean(hikerAvatarUrl));
      hikerElement.style.backgroundImage = hikerAvatarUrl
        ? `url("${hikerAvatarUrl}")`
        : "";
      hikerElement.textContent = hikerAvatarUrl ? "" : "🥾";
    }, [hikerAvatarUrl]);

    useEffect(() => {
      const map = mapRef.current;
      if (map?.getLayer("trail-completed")) {
        map.setPaintProperty("trail-completed", "line-gradient", [
          "step",
          ["line-progress"],
          "#0aa256",
          Math.max(0.0001, progress),
          "rgba(10, 162, 86, 0)",
        ]);
      }
    }, [progress]);

    useEffect(() => {
      const reached = new Set(reachedCheckpointIds);
      checkpointElementsRef.current.forEach((element, id) => {
        element.classList.toggle("reached", reached.has(id));
      });
    }, [reachedCheckpointIds]);

    return (
      <div
        ref={containerRef}
        className="map-canvas"
        aria-label="Map showing the virtual trail"
      />
    );
  },
);
