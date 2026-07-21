/**
 * ExploreWallah — Camera Path Generator & Tour Interpolation Engine
 *
 * Generates a smoothed Bezier camera path from the raw OSRM road geometry.
 * The camera follows this smooth path while the map displays the actual zig-zag road.
 *
 * Architecture:
 *   Road Path  → displayed on map (neon trail with all switchbacks)
 *   Camera Path → invisible, simplified + Bezier-smoothed for cinematic camera movement
 */

import along from '@turf/along';
import length from '@turf/length';
import bearing from '@turf/bearing';
import { simplify } from '@turf/simplify';
import bezierSpline from '@turf/bezier-spline';
import { lineString, point } from '@turf/helpers';
import lineSliceAlong from '@turf/line-slice-along';
import type { Waypoint } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CameraFrame {
  center: [number, number];
  bearing: number;
  zoom: number;
  pitch: number;
}

export interface TourPathData {
  /** The smoothed Bezier camera path (invisible — only used for camera positioning) */
  cameraPath: GeoJSON.Feature<GeoJSON.LineString>;
  /** Total length of camera path in kilometers */
  totalLengthKm: number;
  /** Pre-sampled bearings at evenly-spaced intervals for fast lookup */
  bearingSamples: number[];
  /** Number of bearing samples */
  sampleCount: number;
  /** Maps each waypoint index to a progress value (0.0 – 1.0) along the camera path */
  waypointProgressMap: number[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Simplify tolerance in degrees (~300m at equator). Removes hairpin zig-zags */
const SIMPLIFY_TOLERANCE = 0.003;

/** Bezier spline resolution — higher = smoother curve, more points */
const BEZIER_RESOLUTION = 10000;

/** Bezier sharpness — how tightly the spline hugs the simplified line (0–1) */
const BEZIER_SHARPNESS = 0.85;

/** Number of evenly-spaced bearing samples to pre-compute */
const BEARING_SAMPLE_COUNT = 500;

/** Look-ahead distance in km for bearing calculation (2.5km smooth general heading) */
const LOOK_AHEAD_KM = 2.5;

/** Tour zoom level during the fly-along */
export const TOUR_ZOOM = 13.5;

/** Tour pitch during fly-along (safe 45° angle to prevent mountain clipping) */
export const TOUR_PITCH = 45;

/** Initial overview zoom before tour starts */
export const OVERVIEW_ZOOM = 10;

/** Scroll sensitivity — how much each pixel of deltaY moves progress (0–1) */
export const SCROLL_SENSITIVITY = 0.0008;

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Generates the smoothed camera path and pre-computes bearing samples.
 * Call this once when the route loads — results are cached.
 */
export function generateTourPathData(
  routeGeometry: GeoJSON.LineString,
  waypoints: Waypoint[]
): TourPathData {
  const coords = routeGeometry.coordinates as [number, number][];

  if (coords.length < 3) {
    // Fallback: not enough points to simplify, use raw geometry
    const line = lineString(coords);
    return buildTourData(line, waypoints);
  }

  // Step 1: Simplify the raw OSRM road (removes switchback zig-zags)
  const rawLine = lineString(coords);
  const simplified = simplify(rawLine, {
    tolerance: SIMPLIFY_TOLERANCE,
    highQuality: true,
  });

  // Need at least 3 points for Bezier spline
  const simplifiedCoords = simplified.geometry.coordinates;
  if (simplifiedCoords.length < 3) {
    return buildTourData(lineString(coords), waypoints);
  }

  // Step 2: Generate smooth Bezier spline from the simplified line
  let cameraPath: GeoJSON.Feature<GeoJSON.LineString>;
  try {
    cameraPath = bezierSpline(simplified, {
      resolution: BEZIER_RESOLUTION,
      sharpness: BEZIER_SHARPNESS,
    });
  } catch {
    // Fallback if Bezier fails (can happen with very short or weird geometries)
    cameraPath = lineString(coords);
  }

  return buildTourData(cameraPath, waypoints);
}

/**
 * Builds the full TourPathData from a given camera path line.
 */
function buildTourData(
  cameraPath: GeoJSON.Feature<GeoJSON.LineString>,
  waypoints: Waypoint[]
): TourPathData {
  const totalLengthKm = length(cameraPath, { units: 'kilometers' });

  // Pre-compute bearing samples at evenly-spaced intervals
  const bearingSamples: number[] = [];
  for (let i = 0; i < BEARING_SAMPLE_COUNT; i++) {
    const progress = i / (BEARING_SAMPLE_COUNT - 1);
    const dist = progress * totalLengthKm;
    const lookAheadDist = Math.min(dist + LOOK_AHEAD_KM, totalLengthKm);

    const currentPt = along(cameraPath, dist, { units: 'kilometers' });
    const lookAheadPt = along(cameraPath, lookAheadDist, { units: 'kilometers' });

    const b = bearing(currentPt, lookAheadPt);
    bearingSamples.push(b);
  }

  // Map each waypoint to its closest progress value on the camera path
  const waypointProgressMap = waypoints.map((wp) => {
    return findClosestProgress(cameraPath, wp.coordinates, totalLengthKm);
  });

  return {
    cameraPath,
    totalLengthKm,
    bearingSamples,
    sampleCount: BEARING_SAMPLE_COUNT,
    waypointProgressMap,
  };
}

/**
 * Given a progress value (0.0–1.0), returns the camera frame (center, bearing, zoom, pitch).
 */
export function getCameraFrameAtProgress(
  tourData: TourPathData,
  progress: number,
  currentBearing: number,
  userZoomOffset: number = 0
): CameraFrame {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const dist = clampedProgress * tourData.totalLengthKm;

  // Get camera position on the smooth path
  const currentPt = along(tourData.cameraPath, dist, { units: 'kilometers' });
  const center = currentPt.geometry.coordinates as [number, number];

  // Look up pre-computed bearing from samples (fast interpolation)
  const sampleIndex = clampedProgress * (tourData.sampleCount - 1);
  const lowerIdx = Math.floor(sampleIndex);
  const upperIdx = Math.min(lowerIdx + 1, tourData.sampleCount - 1);
  const fraction = sampleIndex - lowerIdx;

  const targetBearing = lerpAngle(
    tourData.bearingSamples[lowerIdx],
    tourData.bearingSamples[upperIdx],
    fraction
  );

  // Smooth the bearing transition heavily (lerp 0.03 = ultra-gradual orientation shifts)
  const smoothedBearing = lerpAngle(currentBearing, targetBearing, 0.03);
  const computedZoom = Math.max(6.5, Math.min(18, TOUR_ZOOM + userZoomOffset));

  return {
    center,
    bearing: smoothedBearing,
    zoom: computedZoom,
    pitch: TOUR_PITCH,
  };
}

/**
 * Returns which waypoint index is currently "active" based on tour progress.
 * Used for highlighting the correct waypoint in the sidebar.
 */
export function getActiveWaypointFromProgress(
  tourData: TourPathData,
  progress: number
): number {
  const progressMap = tourData.waypointProgressMap;
  let activeIdx = 0;

  for (let i = 0; i < progressMap.length; i++) {
    if (progress >= progressMap[i] - 0.01) {
      activeIdx = i;
    }
  }

  return activeIdx;
}

/**
 * Gets the distance in km at a given progress for trail slicing.
 */
export function getDistanceAtProgress(
  tourData: TourPathData,
  progress: number
): number {
  return Math.max(0, Math.min(1, progress)) * tourData.totalLengthKm;
}

// ─── Math Helpers ─────────────────────────────────────────────────────────────

/**
 * Linear interpolation between two angles (handles 360° wrap-around).
 * `t` is the interpolation factor (0 = stay at current, 1 = jump to target).
 * Use small t values (0.05–0.15) for smooth camera bearing transitions.
 */
export function lerpAngle(current: number, target: number, t: number): number {
  let diff = ((target - current + 540) % 360) - 180;
  return current + diff * t;
}

/**
 * Finds the closest progress value (0–1) on the camera path to a given coordinate.
 * Used to map waypoint positions to progress values.
 */
function findClosestProgress(
  line: GeoJSON.Feature<GeoJSON.LineString>,
  targetCoord: [number, number],
  totalLengthKm: number
): number {
  // Sample the line at regular intervals and find the closest point
  const sampleCount = 200;
  let closestProgress = 0;
  let minDistSq = Infinity;

  for (let i = 0; i <= sampleCount; i++) {
    const progress = i / sampleCount;
    const dist = progress * totalLengthKm;
    const pt = along(line, dist, { units: 'kilometers' });
    const coords = pt.geometry.coordinates;

    const dx = coords[0] - targetCoord[0];
    const dy = coords[1] - targetCoord[1];
    const distSq = dx * dx + dy * dy;

    if (distSq < minDistSq) {
      minDistSq = distSq;
      closestProgress = progress;
    }
  }

  return closestProgress;
}
