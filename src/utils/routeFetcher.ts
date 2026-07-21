/**
 * ExploreWallah - Real Road & Trail Route Utility with Caching, Slicing & Node Snapping
 */

import type { Waypoint } from '../types';

const memoryRouteCache = new Map<string, GeoJSON.LineString>();

export async function fetchRealRoadRoute(
  packageSlug: string,
  waypoints: Waypoint[]
): Promise<GeoJSON.LineString> {
  if (!waypoints || waypoints.length < 2) {
    return {
      type: 'LineString',
      coordinates: waypoints.map((w) => w.coordinates),
    };
  }

  // 1. Memory cache
  if (memoryRouteCache.has(packageSlug)) {
    return memoryRouteCache.get(packageSlug)!;
  }

  // 2. LocalStorage cache (v3 for road + foot trek routes)
  const storageKey = `ew_route_cache_v3_${packageSlug}`;
  const cachedData = localStorage.getItem(storageKey);
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      memoryRouteCache.set(packageSlug, parsed);
      return parsed;
    } catch {
      // Ignore
    }
  }

  let roadCoords: [number, number][] = [];
  let trekCoords: [number, number][] = [];

  // Segment 1: Road Drive from Starting Hub to Base Camp (Waypoints 0 to 1)
  const roadWaypoints = waypoints.slice(0, 2);
  const roadCoordStr = roadWaypoints.map((w) => `${w.coordinates[0]},${w.coordinates[1]}`).join(';');

  try {
    const roadRes = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${roadCoordStr}?overview=full&geometries=geojson`
    );
    if (roadRes.ok) {
      const roadData = await roadRes.json();
      if (roadData.routes && roadData.routes[0]?.geometry?.coordinates) {
        roadCoords = roadData.routes[0].geometry.coordinates;
      }
    }
  } catch {
    // Fallback road
    roadCoords = denseInterpolate(roadWaypoints[0].coordinates, roadWaypoints[1].coordinates, 40);
  }

  if (roadCoords.length === 0) {
    roadCoords = denseInterpolate(roadWaypoints[0].coordinates, roadWaypoints[1].coordinates, 40);
  }

  // Segment 2: Mountain Foot Trek Trail from Base Camp to Summit / Alpine Lakes (Waypoints 1 to end)
  const trekWaypoints = waypoints.slice(1);
  const trekCoordStr = trekWaypoints.map((w) => `${w.coordinates[0]},${w.coordinates[1]}`).join(';');

  try {
    const trekRes = await fetch(
      `https://router.project-osrm.org/route/v1/foot/${trekCoordStr}?overview=full&geometries=geojson`
    );
    if (trekRes.ok) {
      const trekData = await trekRes.json();
      if (trekData.routes && trekData.routes[0]?.geometry?.coordinates) {
        trekCoords = trekData.routes[0].geometry.coordinates;
      }
    }
  } catch {
    // Fallback foot trail
  }

  if (trekCoords.length === 0) {
    // Dense trail interpolation between mountain waypoints
    for (let i = 0; i < trekWaypoints.length - 1; i++) {
      const seg = denseInterpolate(trekWaypoints[i].coordinates, trekWaypoints[i + 1].coordinates, 60);
      trekCoords.push(...seg);
    }
  }

  // Combine Road + Foot Trek coordinates
  const combinedCoords = [...roadCoords, ...trekCoords];

  const fullGeo: GeoJSON.LineString = {
    type: 'LineString',
    coordinates: combinedCoords,
  };

  memoryRouteCache.set(packageSlug, fullGeo);
  try {
    localStorage.setItem(storageKey, JSON.stringify(fullGeo));
  } catch {
    // Ignore
  }

  return fullGeo;
}

function denseInterpolate(start: [number, number], end: [number, number], steps: number): [number, number][] {
  const result: [number, number][] = [];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const lng = start[0] + (end[0] - start[0]) * t;
    const lat = start[1] + (end[1] - start[1]) * t;
    result.push([lng, lat]);
  }
  return result;
}

/**
 * Snaps waypoints to sit 100% directly ON the route LineString geometry.
 */
export function snapWaypointsToRoute(
  fullRoute: GeoJSON.LineString,
  waypoints: Waypoint[]
): Waypoint[] {
  if (!fullRoute?.coordinates || fullRoute.coordinates.length === 0) {
    return waypoints;
  }

  return waypoints.map((wp) => {
    let closestCoord = wp.coordinates;
    let minDistance = Infinity;

    for (let i = 0; i < fullRoute.coordinates.length; i++) {
      const pt = fullRoute.coordinates[i];
      const dist = Math.hypot(pt[0] - wp.coordinates[0], pt[1] - wp.coordinates[1]);
      if (dist < minDistance) {
        minDistance = dist;
        closestCoord = [pt[0], pt[1]];
      }
    }

    return {
      ...wp,
      coordinates: closestCoord as [number, number],
    };
  });
}

/**
 * Returns sliced geometry from start of fullRoute up to a continuous progress (0.0 to 1.0).
 */
import lineSliceAlong from '@turf/line-slice-along';
import length from '@turf/length';
import { lineString } from '@turf/helpers';

export function getSubRouteUpToProgress(
  fullRoute: GeoJSON.LineString,
  progress: number
): GeoJSON.LineString {
  if (!fullRoute?.coordinates || fullRoute.coordinates.length < 2) {
    return fullRoute;
  }

  const p = Math.max(0.001, Math.min(0.999, progress));
  const fullLine = lineString(fullRoute.coordinates);
  const totalLength = length(fullLine, { units: 'kilometers' });
  const stopDist = p * totalLength;

  try {
    const sliced = lineSliceAlong(fullLine, 0, stopDist, { units: 'kilometers' });
    return sliced.geometry;
  } catch {
    const endIdx = Math.max(2, Math.floor(p * fullRoute.coordinates.length));
    return {
      type: 'LineString',
      coordinates: fullRoute.coordinates.slice(0, endIdx),
    };
  }
}

/**
 * Returns sliced geometry from Waypoint 0 up to activeWaypointIndex.
 */
export function getSubRouteUpToWaypoint(
  fullRoute: GeoJSON.LineString,
  waypoints: Waypoint[],
  activeWaypointIndex: number
): GeoJSON.LineString {
  if (!fullRoute?.coordinates || fullRoute.coordinates.length === 0) {
    return fullRoute;
  }

  const targetWaypoint = waypoints[Math.min(activeWaypointIndex, waypoints.length - 1)];
  const targetCoords = targetWaypoint.coordinates;

  let closestIndex = 0;
  let minDistance = Infinity;

  for (let i = 0; i < fullRoute.coordinates.length; i++) {
    const pt = fullRoute.coordinates[i];
    const dist = Math.hypot(pt[0] - targetCoords[0], pt[1] - targetCoords[1]);
    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = i;
    }
  }

  const slicedCoords = fullRoute.coordinates.slice(0, Math.max(2, closestIndex + 1));

  return {
    type: 'LineString',
    coordinates: slicedCoords,
  };
}

/**
 * Computes geographic bounding box for waypoints with padding.
 */
export function calculateGeographicBounds(waypoints: Waypoint[]): [number, number, number, number] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  waypoints.forEach((w) => {
    if (w.coordinates[0] < minLng) minLng = w.coordinates[0];
    if (w.coordinates[1] < minLat) minLat = w.coordinates[1];
    if (w.coordinates[0] > maxLng) maxLng = w.coordinates[0];
    if (w.coordinates[1] > maxLat) maxLat = w.coordinates[1];
  });

  const pad = 0.45;
  return [minLng - pad, minLat - pad, maxLng + pad, maxLat + pad];
}
