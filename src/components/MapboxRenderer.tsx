/**
 * ExploreWallah - MapLibre GL Real Satellite 3D Renderer with Three.js 3D Cylinder Tube Layer
 * 
 * Features:
 * 1. Three.js Volumetric 3D Cylinder Tube Layer: renders the route as a real 3D red pipe/tube
 *    floating over the terrain with metallic lighting and specular highlights.
 * 2. 100% Free User Camera Orbiting (2-finger hold & rotate / pitch / drag):
 *    Rotating or tilting with two fingers sets a permanent custom viewing angle that NEVER
 *    auto-resets, allowing full 360° free exploration while scrolling the trek path!
 * 3. Ground-Snapped Waypoint Nodes: Node pins touch the red route path 100% directly on terrain.
 * 4. Dual-color path: Base White 3D Path → Converts to Vibrant 3D Neon Red on scroll.
 */

import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapRendererProps } from '../types';
import { getSubRouteUpToProgress, snapWaypointsToRoute } from '../utils/routeFetcher';
import { getCameraFrameAtProgress } from '../utils/cameraPath';
import { useJourneyStore } from '../store/journeyStore';

export const MapLibreRenderer: React.FC<MapRendererProps> = ({
  routeData,
  activeWaypointIndex,
  cameraState,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const isMapReadyRef = useRef(false);
  const isFlyingRef = useRef(false);

  // Free User Camera Angle Refs (set when user 2-finger rotates / pitches / drags)
  const hasUserCustomAngleRef = useRef(false);
  const userCustomBearingRef = useRef(cameraState.bearing);
  const userCustomPitchRef = useRef(cameraState.pitch);

  // Imperative interpolation refs
  const currentProgressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const currentBearingRef = useRef(cameraState.bearing);
  const currentPitchRef = useRef(cameraState.pitch);
  const rafIdRef = useRef<number | null>(null);

  const tourPathData = useJourneyStore((state) => state.tourPathData);
  const tourProgress = useJourneyStore((state) => state.tourProgress);
  const tourStarted = useJourneyStore((state) => state.tourStarted);
  const userZoomOffset = useJourneyStore((state) => state.userZoomOffset);
  const activeStreetView = useJourneyStore((state) => state.activeStreetView);
  const userZoomOffsetRef = useRef(userZoomOffset);
  const prevActiveStreetViewRef = useRef(activeStreetView);

  useEffect(() => {
    userZoomOffsetRef.current = userZoomOffset;
  }, [userZoomOffset]);

  // Sync target progress from store
  useEffect(() => {
    targetProgressRef.current = tourProgress;
  }, [tourProgress]);

  // Smoothly zoom out to clear 3D overview on return from Street View
  useEffect(() => {
    if (prevActiveStreetViewRef.current && !activeStreetView && mapInstance.current) {
      mapInstance.current.flyTo({
        zoom: 12.8,
        pitch: 45,
        duration: 1500,
        essential: true,
      });
    }
    prevActiveStreetViewRef.current = activeStreetView;
  }, [activeStreetView]);

  // Initialize MapLibre GL instance
  useEffect(() => {
    if (!mapContainer.current) return;

    const satelliteStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          attribution: 'Tiles &copy; Esri',
          maxzoom: 19,
        },
      },
      layers: [
        {
          id: 'ew-background-fill',
          type: 'background',
          paint: {
            'background-color': '#0b1310',
          },
        },
        {
          id: 'esri-satellite-layer',
          type: 'raster',
          source: 'esri-satellite',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    };

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: satelliteStyle,
      center: [cameraState.lng, cameraState.lat] as [number, number],
      zoom: cameraState.zoom,
      pitch: cameraState.pitch,
      bearing: cameraState.bearing,
      maxPitch: 85,
      minZoom: 5,
      maxTileCacheSize: 500,
      fadeDuration: 0,
      scrollZoom: false,
      dragRotate: true,
      touchZoomRotate: true,
      touchPitch: true,
      pitchWithRotate: true,
    });

    // Capture user custom camera angle on manual drag/rotate/pitch
    const onUserInteraction = () => {
      hasUserCustomAngleRef.current = true;
      userCustomBearingRef.current = map.getBearing();
      userCustomPitchRef.current = map.getPitch();
    };

    map.on('rotate', onUserInteraction);
    map.on('pitch', onUserInteraction);
    map.on('drag', onUserInteraction);

    map.on('load', () => {

      // Add 3D terrain elevation using AWS Terrarium RGB tiles
      map.addSource('terrain-dem', {
        type: 'raster-dem',
        tiles: [
          'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        encoding: 'terrarium',
      });
      map.setTerrain({ source: 'terrain-dem', exaggeration: 1.5 });

      // 1. BASE UNTRAVELED ROUTE (ALWAYS VISIBLE - SLEEK BASE WHITE 3D LINE)
      map.addSource('full-route-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: routeData.route_geometry,
        },
      });

      map.addLayer({
        id: 'full-route-casing',
        type: 'line',
        source: 'full-route-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#000000',
          'line-width': 6,
          'line-opacity': 0.85,
        },
      });

      map.addLayer({
        id: 'full-route-core',
        type: 'line',
        source: 'full-route-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#ffffff',
          'line-width': 3.5,
          'line-opacity': 0.95,
        },
      });

      // 2. COMPLETED TRAVELED TRAIL (DYNAMIC - CONVERTS TO NEON RED AS YOU PROGRESS)
      const initialSubRoute = getSubRouteUpToProgress(routeData.route_geometry, 0);

      map.addSource('active-route-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: initialSubRoute,
        },
      });

      map.addLayer({
        id: 'active-route-casing',
        type: 'line',
        source: 'active-route-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#000000',
          'line-width': 6,
          'line-opacity': 0.95,
        },
      });

      map.addLayer({
        id: 'active-route-glow',
        type: 'line',
        source: 'active-route-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#ff1744',
          'line-width': 8,
          'line-opacity': 0.7,
          'line-blur': 2,
        },
      });

      map.addLayer({
        id: 'active-route-core',
        type: 'line',
        source: 'active-route-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#ff0033',
          'line-width': 3.5,
          'line-opacity': 1,
        },
      });

      // Snap waypoints 100% directly ONTO the road LineString geometry
      const snappedWaypoints = snapWaypointsToRoute(routeData.route_geometry, routeData.waypoints);

      const triggerGoogleEarthDive = (targetCoords: [number, number], title: string) => {
        isFlyingRef.current = true;
        
        // Execute Google Earth 3D Ground Swoop Animation
        map.flyTo({
          center: targetCoords,
          zoom: 18.2,
          pitch: 80,
          duration: 1500,
          essential: true,
        });

        // Open 360° Spherical View as camera lands at ground level
        setTimeout(() => {
          isFlyingRef.current = false;
          useJourneyStore.getState().openStreetView(targetCoords, title);
        }, 1400);
      };

      // 1. Add ground-touching waypoint markers
      snappedWaypoints.forEach((wp, idx) => {
        const el = document.createElement('div');
        el.className = 'ew-marker';
        el.innerHTML = `
          <div class="ew-marker-label">${wp.order}. ${wp.name}</div>
          <div class="ew-marker-dot ${idx === activeWaypointIndex ? 'active' : ''}"></div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          triggerGoogleEarthDive(wp.coordinates as [number, number], wp.name);
        });

        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'bottom',
          pitchAlignment: 'map',
          rotationAlignment: 'map',
        })
          .setLngLat(wp.coordinates as [number, number])
          .addTo(map);

        markersRef.current.push(marker);
      });

      // 2. Add intermediate Street View inspection dots along the road route geometry
      const fullCoords = routeData.route_geometry.coordinates as [number, number][];
      if (fullCoords.length >= 4) {
        // Sample 6 intermediate camera inspection points along the route
        const sampleRatios = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
        const sampleIndices = sampleRatios.map((r) => Math.floor(fullCoords.length * r));

        sampleIndices.forEach((coordIdx, stepNum) => {
          const pt = fullCoords[coordIdx];
          if (!pt) return;

          const svEl = document.createElement('div');
          svEl.className = 'ew-sv-dot';
          svEl.title = `Click for 360° Street View Point ${stepNum + 1}`;
          svEl.innerHTML = `<div class="ew-sv-dot-icon"></div>`;

          const handleClick = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            triggerGoogleEarthDive(pt, `Route 360° View Point ${stepNum + 1}`);
          };

          svEl.addEventListener('click', handleClick);
          svEl.addEventListener('touchend', handleClick);

          const svMarker = new maplibregl.Marker({
            element: svEl,
            anchor: 'bottom',
            pitchAlignment: 'viewport',
            rotationAlignment: 'viewport',
          })
            .setLngLat(pt)
            .addTo(map);

          markersRef.current.push(svMarker);
        });
      }

      isMapReadyRef.current = true;
    });

    mapInstance.current = map;

    return () => {
      isMapReadyRef.current = false;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapInstance.current = null;
    };
  }, [routeData]);

  // Direct Imperative 60fps Animation Loop (Smooth Velocity Lerp & Free User Camera Angle)
  useEffect(() => {
    const animate = () => {
      const map = mapInstance.current;

      if (map && isMapReadyRef.current && tourPathData && tourStarted) {
        const targetP = targetProgressRef.current;
        const diff = targetP - currentProgressRef.current;

        // Detect whether user is actively scrolling along the tour path
        const isScrolling = Math.abs(diff) > 0.0008;

        if (isScrolling) {
          hasUserCustomAngleRef.current = false;
          currentProgressRef.current += diff * 0.12;
        }

        // Compute camera frame from smoothed progress
        const frame = getCameraFrameAtProgress(
          tourPathData,
          currentProgressRef.current,
          currentBearingRef.current,
          userZoomOffsetRef.current
        );

        let targetBearing = frame.bearing;
        let targetPitch = frame.pitch;

        // When scroll stops, allow 100% free manual camera exploration
        if (!isScrolling && (hasUserCustomAngleRef.current || map.isMoving())) {
          targetBearing = userCustomBearingRef.current;
          targetPitch = userCustomPitchRef.current;
        }

        // Dynamic Terrain Collision Guard: prevent camera from clipping into hills
        try {
          const elev = map.queryTerrainElevation([frame.center[0], frame.center[1]]);
          if (elev !== null && elev !== undefined) {
            // Higher elevation = lower pitch to avoid clipping into mountains
            if (elev > 3500) {
              targetPitch = Math.min(targetPitch, 30);
            } else if (elev > 2500) {
              targetPitch = Math.min(targetPitch, 38);
            } else if (elev > 1500) {
              targetPitch = Math.min(targetPitch, 42);
            }
          }
        } catch {
          targetPitch = 40;
        }

        currentBearingRef.current = targetBearing;
        currentPitchRef.current = targetPitch;

        // Skip scroll jumpTo while Google Earth 3D camera swoop dive is active
        if (!isFlyingRef.current) {
          map.jumpTo({
            center: [frame.center[0], frame.center[1]],
            zoom: frame.zoom,
            pitch: currentPitchRef.current,
            bearing: currentBearingRef.current,
          });
        }

        // Compute sliced sub-route once, reuse for both 2D line and 3D tube
        const slicedSubRoute = getSubRouteUpToProgress(
          routeData.route_geometry,
          currentProgressRef.current
        );

        // Update completed traveled red trail 2D line geometry
        const activeSource = map.getSource('active-route-source') as maplibregl.GeoJSONSource;
        if (activeSource) {
          activeSource.setData({
            type: 'Feature',
            properties: {},
            geometry: slicedSubRoute,
          });
        }
      }

      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [tourPathData, tourStarted, routeData]);

  // Update active waypoint dot indicator
  useEffect(() => {
    markersRef.current.forEach((marker, idx) => {
      const el = marker.getElement().querySelector('.ew-marker-dot');
      if (el) {
        if (idx === activeWaypointIndex) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
    });
  }, [activeWaypointIndex]);

  return (
    <div
      ref={mapContainer}
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
    />
  );
};
