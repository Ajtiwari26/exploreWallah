import type { Waypoint } from '../types';
import { getPrebundledRoute } from '../data/cachedRoutes';
import lineSliceAlong from '@turf/line-slice-along';
import length from '@turf/length';
import { lineString } from '@turf/helpers';

const memoryRouteCache = new Map<string, GeoJSON.LineString>();

export async function fetchRealRoadRoute(
  packageSlug: string,
  waypoints: Waypoint[]
): Promise<GeoJSON.LineString> {
  if (!waypoints || waypoints.length < 2) {
    return {
      type: 'LineString',
      coordinates: waypoints ? waypoints.map((w) => w.coordinates) : [],
    };
  }

  if (memoryRouteCache.has(packageSlug)) {
    return memoryRouteCache.get(packageSlug)!;
  }

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

  const prebundled = getPrebundledRoute(packageSlug);
  if (prebundled) {
    memoryRouteCache.set(packageSlug, prebundled);
    fetchOSRMRouteInBackground(packageSlug, waypoints, storageKey);
    return prebundled;
  }

  const roadWaypoints = waypoints.slice(0, 2);
  const roadCoordStr = roadWaypoints.map((w) => `${w.coordinates[0]},${w.coordinates[1]}`).join(';');
  let roadCoords: [number, number][] = [];

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
    // Ignore
  }

  if (roadCoords.length === 0) {
    roadCoords = denseInterpolate(waypoints[0].coordinates, waypoints[1].coordinates, 45);
  }

  const trekWaypoints = waypoints.slice(1);
  const trekCoordStr = trekWaypoints.map((w) => `${w.coordinates[0]},${w.coordinates[1]}`).join(';');
  let trekCoords: [number, number][] = [];

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
    // Ignore
  }

  if (trekCoords.length === 0) {
    trekCoords = [];
    for (let i = 1; i < waypoints.length - 1; i++) {
      const seg = denseInterpolate(waypoints[i].coordinates, waypoints[i + 1].coordinates, 65);
      trekCoords.push(...seg);
    }
  }

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

export function denseInterpolate(start: [number, number], end: [number, number], steps: number): [number, number][] {
  const result: [number, number][] = [];
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const lng = start[0] + (end[0] - start[0]) * t;
    const lat = start[1] + (end[1] - start[1]) * t;
    result.push([lng, lat]);
  }
  return result;
}

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
    return sliced.geometry as GeoJSON.LineString;
  } catch {
    const splitIndex = Math.floor(p * fullRoute.coordinates.length);
    return {
      type: 'LineString',
      coordinates: fullRoute.coordinates.slice(0, Math.max(2, splitIndex)),
    };
  }
}

export function computeBoundsFromWaypoints(waypoints: Waypoint[]): [number, number, number, number] {
  if (!waypoints || waypoints.length === 0) return [72, 28, 85, 36];

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

async function fetchOSRMRouteInBackground(
  packageSlug: string,
  waypoints: Waypoint[],
  storageKey: string
) {
  try {
    const roadWaypoints = waypoints.slice(0, 2);
    const roadCoordStr = roadWaypoints.map((w) => `${w.coordinates[0]},${w.coordinates[1]}`).join(';');
    let roadCoords: [number, number][] = [];

    const roadRes = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${roadCoordStr}?overview=full&geometries=geojson`
    );
    if (roadRes.ok) {
      const roadData = await roadRes.json();
      if (roadData.routes && roadData.routes[0]?.geometry?.coordinates) {
        roadCoords = roadData.routes[0].geometry.coordinates;
      }
    }

    if (roadCoords.length === 0) return;

    const trekWaypoints = waypoints.slice(1);
    const trekCoordStr = trekWaypoints.map((w) => `${w.coordinates[0]},${w.coordinates[1]}`).join(';');
    let trekCoords: [number, number][] = [];

    const trekRes = await fetch(
      `https://router.project-osrm.org/route/v1/foot/${trekCoordStr}?overview=full&geometries=geojson`
    );
    if (trekRes.ok) {
      const trekData = await trekRes.json();
      if (trekData.routes && trekData.routes[0]?.geometry?.coordinates) {
        trekCoords = trekData.routes[0].geometry.coordinates;
      }
    }

    const combinedCoords = [...roadCoords, ...trekCoords];
    if (combinedCoords.length > 0) {
      const liveGeo: GeoJSON.LineString = {
        type: 'LineString',
        coordinates: combinedCoords,
      };
      memoryRouteCache.set(packageSlug, liveGeo);
      localStorage.setItem(storageKey, JSON.stringify(liveGeo));
    }
  } catch {
    // Ignore
  }
}
