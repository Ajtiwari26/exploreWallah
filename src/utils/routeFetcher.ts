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

  // 2. LocalStorage cache (v2 for clean one-way routes)
  const storageKey = `ew_route_cache_v2_${packageSlug}`;
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

  // 3. Format waypoints for OSRM API
  const coordString = waypoints.map((w) => `${w.coordinates[0]},${w.coordinates[1]}`).join(';');
  
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes.length > 0 && data.routes[0].geometry) {
        const geometry: GeoJSON.LineString = data.routes[0].geometry;
        memoryRouteCache.set(packageSlug, geometry);
        try {
          localStorage.setItem(storageKey, JSON.stringify(geometry));
        } catch {
          // Ignore
        }
        return geometry;
      }
    }
  } catch (err) {
    console.warn('OSRM routing fetch failed, using fallback:', err);
  }

  // Fallback dense interpolation
  const denseCoords: [number, number][] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i].coordinates;
    const end = waypoints[i + 1].coordinates;
    const steps = 50;

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const lng = start[0] + (end[0] - start[0]) * t;
      const lat = start[1] + (end[1] - start[1]) * t;
      denseCoords.push([lng, lat]);
    }
  }

  const fallbackGeo: GeoJSON.LineString = {
    type: 'LineString',
    coordinates: denseCoords,
  };

  memoryRouteCache.set(packageSlug, fallbackGeo);
  return fallbackGeo;
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
