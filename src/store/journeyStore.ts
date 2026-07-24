import { create } from 'zustand';
import type { CameraState, MapEngine, RouteData } from '../types';
import { allPackages } from '../data/packages';
import { fetchRealRoadRoute, snapWaypointsToRoute } from '../utils/routeFetcher';
import { generateTourPathData, type TourPathData } from '../utils/cameraPath';

export type ViewMode = 'overview' | 'focused-journey';

interface JourneyState {
  packages: Omit<RouteData, 'route_geometry'>[];
  selectedPackageSlug: string;
  selectPackage: (slug: string) => Promise<void>;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  selectedState: string;
  setSelectedState: (state: string) => void;

  selectedSeason: string;
  setSelectedSeason: (season: string) => void;

  selectedDifficulty: string;
  setSelectedDifficulty: (difficulty: string) => void;

  selectedCategory: string;
  setSelectedCategory: (category: string) => void;

  resetFilters: () => void;

  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  routeData: RouteData | null;
  isLoadingRoute: boolean;

  tourPathData: TourPathData | null;

  tourStarted: boolean;
  setTourStarted: (started: boolean) => void;

  activeWaypointIndex: number;
  setActiveWaypointIndex: (index: number) => void;

  tourProgress: number;
  setTourProgress: (progress: number) => void;

  mapEngine: MapEngine;
  setMapEngine: (engine: MapEngine) => void;

  userZoomOffset: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  activeStreetView: { coords: [number, number]; title: string; photoSphereUrl?: string } | null;
  openStreetView: (coords: [number, number], title: string, photoSphereUrl?: string) => void;
  closeStreetView: () => void;

  cameraState: CameraState;
  setCameraState: (state: CameraState) => void;
}

export const useJourneyStore = create<JourneyState>((set) => ({
  packages: allPackages,
  selectedPackageSlug: allPackages[0].slug,

  searchQuery: '',
  setSearchQuery: (query: string) => set({ searchQuery: query }),

  selectedState: 'All',
  setSelectedState: (state: string) => set({ selectedState: state }),

  selectedSeason: 'All',
  setSelectedSeason: (season: string) => set({ selectedSeason: season }),

  selectedDifficulty: 'All',
  setSelectedDifficulty: (difficulty: string) => set({ selectedDifficulty: difficulty }),

  selectedCategory: 'All',
  setSelectedCategory: (category: string) => set({ selectedCategory: category }),

  resetFilters: () =>
    set({
      searchQuery: '',
      selectedState: 'All',
      selectedSeason: 'All',
      selectedDifficulty: 'All',
      selectedCategory: 'All',
    }),

  viewMode: 'overview',
  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),

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
      viewMode: 'focused-journey',
    });

    const realGeometry = await fetchRealRoadRoute(pkgInfo.slug, pkgInfo.waypoints);

    const snappedWaypoints = snapWaypointsToRoute(realGeometry, pkgInfo.waypoints);

    const fullRouteData: RouteData = {
      ...pkgInfo,
      route_geometry: realGeometry,
      waypoints: snappedWaypoints,
    };

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
