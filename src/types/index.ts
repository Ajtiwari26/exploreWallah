/**
 * ExploreWallah - Unified 3D Journey Map Types
 */

export interface CameraState {
  lng: number;
  lat: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface Waypoint {
  id: number;
  name: string;
  order: number;
  description: string;
  accommodation: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface RouteData {
  id: number;
  slug: string;
  title: string;
  category: string;
  season: string;
  state: string;
  duration: string;
  difficulty: 'Easy' | 'Moderate' | 'Difficult' | 'Challenging';
  price: string;
  description: string;
  thumbnail: string;
  route_geometry: GeoJSON.LineString;
  waypoints: Waypoint[];
}

export interface MapRendererProps {
  routeData: RouteData;
  activeWaypointIndex: number;
  cameraState: CameraState;
  onCameraUpdate: (state: CameraState) => void;
}

export type MapEngine = 'mapbox' | 'google';
