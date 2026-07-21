/**
 * ExploreWallah - Google 3D Maps Photorealistic Renderer
 * 
 * Features:
 * 1. Photorealistic 3D buildings, trees, and terrain meshes via <gmp-map-3d>
 * 2. Ultra-Bold Trail Rendering (width 10px neon cyan)
 * 3. Progressive trail tracing (traces Node 1 → Node 2 as you click/scroll)
 */

import React, { useEffect, useRef, useCallback } from 'react';
import type { MapRendererProps } from '../types';
import { getSubRouteUpToProgress } from '../utils/routeFetcher';
import { useJourneyStore } from '../store/journeyStore';

export const Google3DMapRenderer: React.FC<MapRendererProps> = ({
  routeData,
  activeWaypointIndex,
  cameraState,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapElementRef = useRef<any>(null);
  const polylineElementRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const tourProgress = useJourneyStore((state) => state.tourProgress);

  const loadGoogleMapsAPI = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (window.google?.maps?.maps3d) {
        resolve();
        return;
      }

      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        const checkInterval = setInterval(() => {
          if (window.google?.maps?.maps3d) {
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
        const checkReady = setInterval(() => {
          if (window.google?.maps?.maps3d) {
            clearInterval(checkReady);
            resolve();
          }
        }, 100);
      };
      script.onerror = () => reject(new Error('Failed to load Google Maps JavaScript API'));
      document.head.appendChild(script);
    });
  }, []);

  useEffect(() => {
    if (isInitializedRef.current || !containerRef.current) return;

    const init = async () => {
      try {
        await loadGoogleMapsAPI();

        const container = containerRef.current;
        if (!container) return;

        const mapEl = document.createElement('gmp-map-3d');
        mapEl.setAttribute('default-labels-disabled', '');
        mapEl.style.width = '100%';
        mapEl.style.height = '100%';

        mapEl.setAttribute('center', `${cameraState.lat},${cameraState.lng}`);
        mapEl.setAttribute('tilt', String(cameraState.pitch));
        mapEl.setAttribute('heading', String(cameraState.bearing));
        mapEl.setAttribute('range', '5000');

        container.appendChild(mapEl);
        mapElementRef.current = mapEl;

        const polyline = document.createElement('gmp-polyline-3d');
        polyline.setAttribute('stroke-color', '#ff0033');
        polyline.setAttribute('stroke-width', '14');
        polyline.setAttribute('stroke-opacity', '1.0');
        polyline.setAttribute('draws-occluded-segments', '');

        mapEl.appendChild(polyline);
        polylineElementRef.current = polyline;

        await customElements.whenDefined('gmp-polyline-3d');
        isInitializedRef.current = true;
      } catch (error) {
        console.error('Google 3D Maps initialization error:', error);
      }
    };

    init();

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      mapElementRef.current = null;
      polylineElementRef.current = null;
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

  useEffect(() => {
    const mapEl = mapElementRef.current;
    if (!mapEl || !isInitializedRef.current) return;

    mapEl.center = { lat: cameraState.lat, lng: cameraState.lng };
    mapEl.tilt = cameraState.pitch;
    mapEl.heading = cameraState.bearing;

    const zoomToRange = (zoom: number): number => {
      return Math.pow(2, 20 - zoom) * 2;
    };
    mapEl.range = zoomToRange(cameraState.zoom);
  }, [cameraState]);

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
