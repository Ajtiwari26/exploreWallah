import { denseInterpolate } from '../utils/routeFetcher';
import { allPackages } from './packages';

const PREBUNDLED_ROUTES: Record<string, GeoJSON.LineString> = {};

function buildPrecalculatedRoute(waypoints: Array<{ coordinates: [number, number] }>): GeoJSON.LineString {
  if (!waypoints || waypoints.length < 2) {
    return {
      type: 'LineString',
      coordinates: waypoints ? waypoints.map((w) => w.coordinates) : [],
    };
  }

  const coords: [number, number][] = [];

  const roadSeg = denseInterpolate(waypoints[0].coordinates, waypoints[1].coordinates, 45);
  coords.push(...roadSeg);

  for (let i = 1; i < waypoints.length - 1; i++) {
    const trekSeg = denseInterpolate(waypoints[i].coordinates, waypoints[i + 1].coordinates, 65);
    coords.push(...trekSeg);
  }

  return {
    type: 'LineString',
    coordinates: coords,
  };
}

allPackages.forEach((pkg) => {
  PREBUNDLED_ROUTES[pkg.slug] = buildPrecalculatedRoute(pkg.waypoints);
});

export function getPrebundledRoute(slug: string): GeoJSON.LineString | null {
  return PREBUNDLED_ROUTES[slug] || null;
}
