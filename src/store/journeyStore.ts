/**
 * ExploreWallah - Journey State Store (Zustand)
 * 
 * Manages package catalog selection, active route geometry (with caching),
 * snapped waypoints, continuous scroll-driven tour progress, map engine, and camera state.
 */

import { create } from 'zustand';
import type { CameraState, MapEngine, RouteData } from '../types';
import { allPackages } from '../data/packages';
import { fetchRealRoadRoute, snapWaypointsToRoute } from '../utils/routeFetcher';
import { generateTourPathData, type TourPathData } from '../utils/cameraPath';

interface JourneyState {
  // Available packages list
  packages: Omit<RouteData, 'route_geometry'>[];
  selectedPackageSlug: string;
  selectPackage: (slug: string) => Promise<void>;

  // Current active route data
  routeData: RouteData | null;
  isLoadingRoute: boolean;

  // Pre-computed smoothed camera path for scroll-driven tour tracing
  tourPathData: TourPathData | null;

  // Tour state: whether the user has started scrolling the tour
  tourStarted: boolean;
  setTourStarted: (started: boolean) => void;

  // Active waypoint tracking (auto-updated from tour progress)
  activeWaypointIndex: number;
  setActiveWaypointIndex: (index: number) => void;

  // Continuous tour progress between 0.0 (start) and 1.0 (end)
  tourProgress: number;
  setTourProgress: (progress: number) => void;

  // Map engine toggle (mapbox or google)
  mapEngine: MapEngine;
  setMapEngine: (engine: MapEngine) => void;

  // Dynamic zoom offset driven by + / - buttons
  userZoomOffset: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  // 360° Street View / Panorama Modal state
  activeStreetView: { coords: [number, number]; title: string } | null;
  openStreetView: (coords: [number, number], title: string) => void;
  closeStreetView: () => void;
}

export const useJourneyStore = create<JourneyState>((set, get) => ({
  packages: allPackages,
  selectedPackageSlug: allPackages[0].slug,

  routeData: null,
  isLoadingRoute: false,
  tourPathData: null,

  tourStarted: false,
  setTourStarted: (started: boolean) => set({ tourStarted: started }),

  selectPackage: async (slug: string) => {
    const pkgInfo = allPackages.find((p) => p.slug === slug);
    if (!pkgInfo) return;

    set({
      selectedPackageSlug: slug,
      isLoadingRoute: true,
      activeWaypointIndex: 0,
      tourProgress: 0,
      tourStarted: false,
      tourPathData: null,
    });

    // Fetch or read from cache real road/trail route from OSRM routing engine
    const realGeometry = await fetchRealRoadRoute(pkgInfo.slug, pkgInfo.waypoints);

    // Mathematically snap all waypoint marker pins to sit 100% directly ON the route line
    const snappedWaypoints = snapWaypointsToRoute(realGeometry, pkgInfo.waypoints);

    const fullRouteData: RouteData = {
      ...pkgInfo,
      route_geometry: realGeometry,
      waypoints: snappedWaypoints,
    };

    // Pre-compute the smoothed Bezier camera path for scroll-driven tour tracing
    const tourPath = generateTourPathData(realGeometry, snappedWaypoints);

    const firstWp = snappedWaypoints[0];
    set({
      routeData: fullRouteData,
      tourPathData: tourPath,
      isLoadingRoute: false,
      activeWaypointIndex: 0,
      cameraState: {
        lng: firstWp.coordinates[0],
        lat: firstWp.coordinates[1],
        zoom: 13.5,
        pitch: 60,
        bearing: -10,
      },
    });
  },

  activeWaypointIndex: 0,
  setActiveWaypointIndex: (index: number) => set({ activeWaypointIndex: index }),

  tourProgress: 0,
  setTourProgress: (progress: number) => set({ tourProgress: progress }),

  mapEngine: 'mapbox',
  setMapEngine: (engine: MapEngine) => set({ mapEngine: engine }),

  userZoomOffset: 0,
  zoomIn: () => set((state) => ({ userZoomOffset: Math.min(state.userZoomOffset + 1.0, 3.5) })),
  zoomOut: () => set((state) => ({ userZoomOffset: Math.max(state.userZoomOffset - 1.0, -4.5) })),
  resetZoom: () => set({ userZoomOffset: 0 }),

  activeStreetView: null,
  openStreetView: (coords: [number, number], title: string) => set({ activeStreetView: { coords, title } }),
  closeStreetView: () => set({ activeStreetView: null }),

  cameraState: {
    lng: 78.1822,
    lat: 31.0745,
    zoom: 13.5,
    pitch: 60,
    bearing: -10,
  },
  setCameraState: (state: CameraState) => set({ cameraState: state }),
}));
