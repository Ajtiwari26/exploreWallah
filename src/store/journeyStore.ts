import { create } from 'zustand';
import type { RouteData, TourPathData, MapEngine, CameraState, ActiveStreetView } from '../types';
import { sampleTrekPath, fullRouteData, tourPath } from '../data/sampleTrekData';

interface JourneyStore {
  // Current active package
  selectedPackageSlug: string;
  selectPackage: (slug: string) => void;

  // Tour State
  tourStarted: boolean;
  setTourStarted: (started: boolean) => void;

  // Flight & Step Data
  routeData: RouteData;
  tourPathData: TourPathData;
  isLoadingRoute: boolean;

  // Progress Tracking
  activeWaypointIndex: number;
  setActiveWaypointIndex: (index: number) => void;
  tourProgress: number; // 0 to 1
  setTourProgress: (progress: number) => void;

  // Engine Switcher
  mapEngine: MapEngine;
  setMapEngine: (engine: MapEngine) => void;

  // Camera Zoom Level Offset
  userZoomOffset: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  // Active 360 StreetView / Drone Modal
  activeStreetView: ActiveStreetView | null;
  openStreetView: (coords: [number, number], title: string, photoSphereUrl?: string) => void;
  closeStreetView: () => void;

  // Live Camera state passed to 3D renderer
  cameraState: CameraState;
  setCameraState: (state: CameraState) => void;
}

export const useJourneyStore = create<JourneyStore>((set) => ({
  selectedPackageSlug: 'kedarkantha',
  selectPackage: (slug: string) => {
    const data = sampleTrekPath(slug);
    set({
      selectedPackageSlug: slug,
      routeData: data.routeData,
      tourPathData: data.tourPathData,
      tourProgress: 0,
      tourStarted: false,
      activeWaypointIndex: 0,
      cameraState: {
        lng: data.tourPathData.waypoints[0]?.coordinates[0] ?? 78.1822,
        lat: data.tourPathData.waypoints[0]?.coordinates[1] ?? 31.0745,
        zoom: 13.5,
        pitch: 60,
        bearing: -10,
      },
    });
  },

  tourStarted: false,
  setTourStarted: (started: boolean) => {
    const firstWp = tourPath.waypoints[0];
    set({
      tourStarted: started,
      tourProgress: 0,
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

  mapEngine: 'google',
  setMapEngine: (engine: MapEngine) => set({ mapEngine: engine }),

  userZoomOffset: 0,
  zoomIn: () =>
    set((state) => ({
      userZoomOffset: Math.min(state.userZoomOffset + 0.75, 4.0),
      cameraState: {
        ...state.cameraState,
        zoom: Math.min(state.cameraState.zoom + 0.75, 20),
      },
    })),
  zoomOut: () =>
    set((state) => ({
      userZoomOffset: Math.max(state.userZoomOffset - 0.75, -6.0),
      cameraState: {
        ...state.cameraState,
        zoom: Math.max(state.cameraState.zoom - 0.75, 5),
      },
    })),
  resetZoom: () => set({ userZoomOffset: 0 }),

  activeStreetView: null,
  openStreetView: (coords: [number, number], title: string, photoSphereUrl?: string) =>
    set({ activeStreetView: { coords, title, photoSphereUrl } }),
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
