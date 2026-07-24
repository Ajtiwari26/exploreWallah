import React, { useEffect, useRef, useCallback } from 'react';
import type { MapRendererProps } from '../types';
import { getSubRouteUpToProgress } from '../utils/routeFetcher';
import { useJourneyStore } from '../store/journeyStore';

export const Google3DMapRenderer: React.FC<MapRendererProps> = ({
  routeData,
  activeWaypointIndex: _activeWaypointIndex,
  cameraState,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapElementRef = useRef<any>(null);
  const polylineElementRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const tourProgress = useJourneyStore((state) => state.tourProgress);

  const loadGoogleMapsAPI = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      const win = window as any;
      if (win.google?.maps?.maps3d) {
        resolve();
        return;
      }

      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        const checkInterval = setInterval(() => {
          if (win.google?.maps?.maps3d) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
      if (!apiKey) {
        reject(new Error('VITE_GOOGLE_MAPS_API_KEY is missing. Add it to your .env file.'));
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=alpha&libraries=maps3d`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const checkInterval = setInterval(() => {
          if (win.google?.maps?.maps3d) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      };
      script.onerror = () => reject(new Error('Failed to load Google Maps 3D API'));
      document.head.appendChild(script);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initMap = async () => {
      try {
        await loadGoogleMapsAPI();
        if (cancelled || !containerRef.current) return;

        const win = window as any;
        const { Map3DElement, Polyline3DElement } = win.google.maps.maps3d;

        if (mapElementRef.current) {
          containerRef.current.innerHTML = '';
        }

        const mapEl = new Map3DElement({
          center: { lat: cameraState.lat, lng: cameraState.lng },
          tilt: cameraState.pitch,
          heading: cameraState.bearing,
          range: Math.pow(2, 20 - cameraState.zoom) * 2,
        });

        mapEl.style.width = '100%';
        mapEl.style.height = '100%';

        const polyline = new Polyline3DElement({
          strokeColor: '#38bdf8',
          strokeWidth: 8,
          altitudeMode: 'CLAMP_TO_GROUND',
        });

        mapEl.appendChild(polyline);
        polylineElementRef.current = polyline;
        containerRef.current.appendChild(mapEl);
        mapElementRef.current = mapEl;
        isInitializedRef.current = true;
      } catch {
        // Fallback or error handled silently
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      isInitializedRef.current = false;
    };
  }, [routeData, loadGoogleMapsAPI]);

  useEffect(() => {
    const polyline = polylineElementRef.current;
    if (!polyline || !routeData.route_geometry || !isInitializedRef.current) return;

    const subRoute = getSubRouteUpToProgress(
      routeData.route_geometry,
      tourProgress
    );

    const coords = subRoute.coordinates.map((coord: number[]) => ({
      lat: coord[1],
      lng: coord[0],
      altitude: 0,
    }));

    polyline.coordinates = coords;
  }, [tourProgress, routeData]);

  const userZoomOffset = useJourneyStore((state) => state.userZoomOffset);

  useEffect(() => {
    const mapEl = mapElementRef.current;
    if (!mapEl || !isInitializedRef.current) return;

    mapEl.center = { lat: cameraState.lat, lng: cameraState.lng };
    mapEl.tilt = cameraState.pitch;
    mapEl.heading = cameraState.bearing;

    const zoomToRange = (zoom: number): number => {
      return Math.pow(2, 20 - zoom) * 2;
    };
    const effectiveZoom = Math.max(5, Math.min(20, cameraState.zoom + userZoomOffset));
    mapEl.range = zoomToRange(effectiveZoom);
  }, [cameraState, userZoomOffset]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        background: '#0a0a0a',
      }}
    />
  );
};
