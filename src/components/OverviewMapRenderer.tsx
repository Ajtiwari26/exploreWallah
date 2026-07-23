/**
 * ExploreWallah - OverviewMapRenderer Component
 *
 * Interactive 3D Satellite India/Himalaya map for the homepage. Every trek is
 * shown as a classic teardrop location-pin SVG planted at its EXACT starting
 * coordinates (no bulky rectangular chips), color-coded by state, with a
 * hover tooltip (title • state • price) and a soft ground pulse.
 * Clicking a pin flies the camera to that region and opens the trek in 3D.
 */

import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { RouteData } from '../types';
import { useJourneyStore } from '../store/journeyStore';

/** State → pin color coding (also used by the homepage legend) */
export const STATE_COLORS: Record<string, string> = {
  Uttarakhand: '#4ade80',
  'Himachal Pradesh': '#ffd54a',
  'Jammu & Kashmir': '#ff6b81',
  Sikkim: '#a78bfa',
  'West Bengal': '#38bdf8',
  Ladakh: '#f97316',
};

const DEFAULT_PIN_COLOR = '#60a5fa';

export const pinColorForState = (state: string): string =>
  STATE_COLORS[state] ?? DEFAULT_PIN_COLOR;

/** Classic teardrop location-pin (same silhouette as the 📍 dropdown marker) */
const locationPinSvg = (color: string): string => `
  <svg class="ew-loc-pin-svg" width="30" height="42" viewBox="0 0 30 42" aria-hidden="true">
    <path
      d="M15 1C7.3 1 1 7.2 1 14.8 1 20.6 5.7 27.9 15 41 24.3 27.9 29 20.6 29 14.8 29 7.2 22.7 1 15 1z"
      fill="${color}" stroke="rgba(255,255,255,0.92)" stroke-width="1.6"
    />
    <circle cx="15" cy="14.6" r="5.2" fill="rgba(15,23,42,0.9)" />
    <circle cx="15" cy="14.6" r="2.1" fill="#ffffff" />
  </svg>
`;

interface OverviewMapRendererProps {
  filteredPackages: Omit<RouteData, 'route_geometry'>[];
}

export const OverviewMapRenderer: React.FC<OverviewMapRendererProps> = ({ filteredPackages }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const { selectPackage } = useJourneyStore();

  // Initialize MapLibre Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'esri-satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: 'Esri World Imagery',
            maxzoom: 17,
          },
          'mapbox-dem': {
            type: 'raster-dem',
            tiles: [
              'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            encoding: 'terrarium',
            maxzoom: 15,
          },
        },
        layers: [
          {
            id: 'esri-satellite-layer',
            type: 'raster',
            source: 'esri-satellite',
            minzoom: 0,
            maxzoom: 22,
          },
        ],
        terrain: {
          source: 'mapbox-dem',
          exaggeration: 1.5,
        },
      },
      center: [78.5, 31.0], // Center over Indian Himalayas
      zoom: 6.5,
      pitch: 45,
      bearing: -5,
      maxPitch: 75,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Trek Pins whenever filteredPackages changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Plant a location pin at each trek's exact starting coordinates
    filteredPackages.forEach((pkg) => {
      const firstWp = pkg.waypoints[0];
      if (!firstWp || !firstWp.coordinates) return;

      const color = pinColorForState(pkg.state);

      const el = document.createElement('div');
      el.className = 'ew-loc-pin';
      el.style.setProperty('--pin-color', color);
      el.innerHTML = `
        <div class="ew-loc-pin-tip">
          <span class="ew-loc-pin-tt-title">${pkg.thumbnail} ${pkg.title}</span>
          <span class="ew-loc-pin-tt-meta">${pkg.state} • ${pkg.price} • ${pkg.difficulty}</span>
          <span class="ew-loc-pin-tt-cta">Click to explore in 3D →</span>
        </div>
        ${locationPinSvg(color)}
        <span class="ew-loc-pin-pulse"></span>
      `;

      el.addEventListener('click', () => {
        // Fly camera to trek start location
        map.flyTo({
          center: firstWp.coordinates,
          zoom: 11,
          pitch: 55,
          duration: 1800,
        });
        // Select package for 3D exploration
        selectPackage(pkg.slug);
      });

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'bottom',
      })
        .setLngLat(firstWp.coordinates)
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Auto-fit bounds if we have packages
    if (filteredPackages.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      filteredPackages.forEach((pkg) => {
        const wp = pkg.waypoints[0];
        if (wp && wp.coordinates) {
          bounds.extend(wp.coordinates);
        }
      });
      map.fitBounds(bounds, {
        padding: { top: 80, bottom: 70, left: 250, right: 90 },
        maxZoom: 8,
        duration: 1200,
      });
    }
  }, [filteredPackages, selectPackage]);

  return (
    <div className="ew-overview-map-wrapper">
      <div ref={mapContainerRef} className="ew-overview-map-container" />
    </div>
  );
};
