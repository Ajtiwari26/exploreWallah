import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import along from '@turf/along';
import turfLength from '@turf/length';
import turfBearing from '@turf/bearing';
import { lineString } from '@turf/helpers';
import type { MapRendererProps } from '../types';
import { getSubRouteUpToProgress, snapWaypointsToRoute } from '../utils/routeFetcher';
import { getCameraFrameAtProgress } from '../utils/cameraPath';
import { registerFootprintImages } from '../utils/footprintIcons';
import { useJourneyStore } from '../store/journeyStore';

const CAMERA_CLEARANCE_M = 100;

interface TransformCameraLike {
  getCameraLngLat?: () => { lng: number; lat: number };
  getCameraAltitude?: () => number;
}

const DEM_MAX_QUERY_ZOOM = 15;

interface TerrainMapLike {
  terrain?: {
    getElevationForLngLatZoom?: (lngLat: maplibregl.LngLat, zoom: number) => number;
  };
  getCenterElevation?: () => number;
  setCenterElevation?: (elevation: number) => void;
}

const TREK_START_RATIO = 0.3;
const TREK_END_RATIO = 0.985;
const FOOTSTEP_COUNT = 80;
const GAIT_OFFSET_M = 5;

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

  const hasUserCustomAngleRef = useRef(false);
  const userCustomBearingRef = useRef(cameraState.bearing);
  const userCustomPitchRef = useRef(cameraState.pitch);
  const orbitMovedRef = useRef(false);

  const currentProgressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const currentBearingRef = useRef(cameraState.bearing);
  const currentPitchRef = useRef(cameraState.pitch);
  const rafIdRef = useRef<number | null>(null);

  const lastFootFilterRef = useRef(-1);
  const lastLabelZoomRef = useRef(-1);

  const pitchReliefRef = useRef(0);
  const zoomReliefRef = useRef(0);

  const labelElsRef = useRef<HTMLElement[]>([]);

  const tourPathData = useJourneyStore((state) => state.tourPathData);
  const tourProgress = useJourneyStore((state) => state.tourProgress);
  const tourStarted = useJourneyStore((state) => state.tourStarted);
  const userZoomOffset = useJourneyStore((state) => state.userZoomOffset);
  const activeStreetView = useJourneyStore((state) => state.activeStreetView);
  const activeStreetViewRef = useRef(activeStreetView);
  const userZoomOffsetRef = useRef(userZoomOffset);
  const prevActiveStreetViewRef = useRef(activeStreetView);

  useEffect(() => {
    activeStreetViewRef.current = activeStreetView;
  }, [activeStreetView]);

  useEffect(() => {
    userZoomOffsetRef.current = userZoomOffset;
  }, [userZoomOffset]);

  useEffect(() => {
    targetProgressRef.current = tourProgress;
  }, [tourProgress]);

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
          maxzoom: 17,
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
          maxzoom: 22,
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
      dragPan: false,
      dragRotate: true,
      doubleClickZoom: false,
      touchZoomRotate: true,
      touchPitch: true,
      pitchWithRotate: true,
    });

    const onUserInteraction = (e?: { originalEvent?: unknown }) => {
      if (!e || !e.originalEvent) return;
      hasUserCustomAngleRef.current = true;
      userCustomBearingRef.current = map.getBearing();
      userCustomPitchRef.current = map.getPitch();
    };

    map.on('rotate', onUserInteraction);
    map.on('pitch', onUserInteraction);

    const canvas = map.getCanvas();
    let orbitActive = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      orbitActive = true;
      orbitMovedRef.current = false;
      lastX = e.clientX;
      lastY = e.clientY;
      userCustomBearingRef.current = map.getBearing();
      userCustomPitchRef.current = map.getPitch();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!orbitActive) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 2) orbitMovedRef.current = true;
      hasUserCustomAngleRef.current = true;
      userCustomBearingRef.current -= dx * 0.25;
      userCustomPitchRef.current = Math.max(5, Math.min(80, userCustomPitchRef.current - dy * 0.25));
    };

    const onPointerUp = () => {
      orbitActive = false;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    map.on('dblclick', (e) => {
      e.preventDefault();
      hasUserCustomAngleRef.current = false;
    });

    const triggerGoogleEarthDive = (targetCoords: [number, number], title: string) => {
      isFlyingRef.current = true;

      map.flyTo({
        center: targetCoords,
        zoom: 15,
        pitch: 65,
        duration: 1500,
        essential: true,
      });

      setTimeout(() => {
        isFlyingRef.current = false;
        useJourneyStore.getState().openStreetView(targetCoords, title);
      }, 1400);
    };

    const initMapLayersAndMarkers = () => {
      if (isMapReadyRef.current) return;

      try {
        if (!map.getSource('terrain-dem')) {
          map.addSource('terrain-dem', {
            type: 'raster-dem',
            tiles: [
              'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            encoding: 'terrarium',
            maxzoom: 15,
          });
          map.setTerrain({ source: 'terrain-dem', exaggeration: 1.5 });
        }
      } catch {
        // Ignore
      }

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

      const snappedWaypoints = snapWaypointsToRoute(routeData.route_geometry, routeData.waypoints);

      const buildMarkers = () => {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        labelElsRef.current = [];

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
            pitchAlignment: 'viewport',
            rotationAlignment: 'viewport',
          })
            .setLngLat(wp.coordinates as [number, number])
            .addTo(map);

          markersRef.current.push(marker);
          labelElsRef.current.push(el);
        });

        const fullCoords = routeData.route_geometry.coordinates as [number, number][];

        if (fullCoords.length >= 4) {
          const sampleRatios = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];

          sampleRatios.forEach((ratio, stepNum) => {
            const coordIdx = Math.floor(fullCoords.length * ratio);
            const pt = fullCoords[coordIdx];
            if (!pt) return;

            const isTrekSection = ratio >= TREK_START_RATIO;
            const svEl = document.createElement('div');

            if (isTrekSection) {
              svEl.className = 'ew-footprint-dot';
              svEl.title = `🥾 Mountain Trek Trail - Point ${stepNum + 1}`;
              svEl.innerHTML = `<div class="ew-footprint-icon">🥾</div>`;
            } else {
              svEl.className = 'ew-sv-dot';
              svEl.title = `🚗 Road Drive Section - Point ${stepNum + 1}`;
              svEl.innerHTML = `<div class="ew-sv-dot-icon"></div>`;
            }

            const handleClick = (e: Event) => {
              e.preventDefault();
              e.stopPropagation();
              const locationTitle = isTrekSection
                ? `🥾 Mountain Trek Point ${stepNum + 1}`
                : `🚗 Road Drive View Point ${stepNum + 1}`;
              triggerGoogleEarthDive(pt, locationTitle);
            };

            svEl.addEventListener('click', handleClick);
            svEl.addEventListener('touchend', handleClick);

            const svMarker = new maplibregl.Marker({
              element: svEl,
              anchor: 'center',
              pitchAlignment: 'viewport',
              rotationAlignment: 'viewport',
            })
              .setLngLat(pt)
              .addTo(map);

            markersRef.current.push(svMarker);
          });
        }
      };

      buildMarkers();

      registerFootprintImages(map);

      const fullCoords = routeData.route_geometry.coordinates as [number, number][];
      if (fullCoords.length >= 2) {
        const routeLine = lineString(fullCoords);
        const totalKm = turfLength(routeLine, { units: 'kilometers' });
        const startKm = totalKm * TREK_START_RATIO;
        const endKm = totalKm * TREK_END_RATIO;
        const stepKm = (endKm - startKm) / FOOTSTEP_COUNT;

        const features: GeoJSON.Feature<GeoJSON.Point>[] = [];

        for (let i = 0; i < FOOTSTEP_COUNT; i++) {
          const dist = startKm + i * stepKm;
          const pt = along(routeLine, dist, { units: 'kilometers' }).geometry
            .coordinates as [number, number];
          const aheadPt = along(routeLine, Math.min(dist + stepKm, totalKm), {
            units: 'kilometers',
          }).geometry.coordinates as [number, number];

          const heading = turfBearing(pt, aheadPt);
          const isLeft = i % 2 === 0;

          const perpRad = ((heading + (isLeft ? -90 : 90)) * Math.PI) / 180;
          const dLat = (GAIT_OFFSET_M * Math.cos(perpRad)) / 111320;
          const dLng =
            (GAIT_OFFSET_M * Math.sin(perpRad)) /
            (111320 * Math.cos((pt[1] * Math.PI) / 180));

          features.push({
            type: 'Feature',
            properties: {
              ratio: dist / totalKm,
              rot: heading + (isLeft ? -8 : 8),
              foot: isLeft ? 'left' : 'right',
            },
            geometry: { type: 'Point', coordinates: [pt[0] + dLng, pt[1] + dLat] },
          });
        }

        map.addSource('ew-footsteps-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features },
        });

        map.addLayer({
          id: 'ew-footsteps-dim',
          type: 'symbol',
          source: 'ew-footsteps-source',
          layout: {
            'icon-image': ['concat', 'foot-', ['get', 'foot'], '-dim'],
            'icon-rotate': ['get', 'rot'],
            'icon-rotation-alignment': 'map',
            'icon-pitch-alignment': 'map',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-size': ['interpolate', ['exponential', 1.8], ['zoom'], 12, 0.2, 14, 0.45, 16, 1.0, 18, 2.1],
          },
          paint: { 'icon-opacity': 0.9 },
        });

        map.addLayer({
          id: 'ew-footsteps-lit',
          type: 'symbol',
          source: 'ew-footsteps-source',
          filter: ['<=', ['get', 'ratio'], 0],
          layout: {
            'icon-image': ['concat', 'foot-', ['get', 'foot'], '-lit'],
            'icon-rotate': ['get', 'rot'],
            'icon-rotation-alignment': 'map',
            'icon-pitch-alignment': 'map',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-size': ['interpolate', ['exponential', 1.8], ['zoom'], 12, 0.2, 14, 0.45, 16, 1.0, 18, 2.1],
          },
        });

        const onFootstepClick = (e: maplibregl.MapLayerMouseEvent) => {
          if (orbitMovedRef.current) return;
          const f = e.features && e.features[0];
          if (!f || f.geometry.type !== 'Point') return;
          const [lng, lat] = f.geometry.coordinates as [number, number];
          triggerGoogleEarthDive([lng, lat], '🥾 Trek Footstep View');
        };

        map.on('click', 'ew-footsteps-dim', onFootstepClick);
        map.on('click', 'ew-footsteps-lit', onFootstepClick);

        const setPointer = () => {
          map.getCanvas().style.cursor = 'pointer';
        };
        const clearPointer = () => {
          map.getCanvas().style.cursor = '';
        };
        map.on('mouseenter', 'ew-footsteps-dim', setPointer);
        map.on('mouseleave', 'ew-footsteps-dim', clearPointer);
        map.on('mouseenter', 'ew-footsteps-lit', setPointer);
        map.on('mouseleave', 'ew-footsteps-lit', clearPointer);

        const trekStartPt = along(routeLine, startKm, { units: 'kilometers' }).geometry
          .coordinates as [number, number];
        const badgeEl = document.createElement('div');
        badgeEl.className = 'ew-trek-start-badge';
        badgeEl.textContent = '🥾 Trek starts here';

        const badgeMarker = new maplibregl.Marker({
          element: badgeEl,
          anchor: 'bottom',
          pitchAlignment: 'viewport',
          rotationAlignment: 'viewport',
        })
          .setLngLat(trekStartPt)
          .addTo(map);

        markersRef.current.push(badgeMarker);
        labelElsRef.current.push(badgeEl);
      }

      isMapReadyRef.current = true;
    };

    if (map.isStyleLoaded() || map.loaded()) {
      initMapLayersAndMarkers();
    } else {
      map.on('load', initMapLayersAndMarkers);
    }

    mapInstance.current = map;

    return () => {
      isMapReadyRef.current = false;
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      labelElsRef.current = [];
      map.remove();
      mapInstance.current = null;
    };
  }, [routeData]);

  useEffect(() => {
    const animate = () => {
      const map = mapInstance.current;

      if (map && isMapReadyRef.current && tourPathData && tourStarted) {
        const targetP = targetProgressRef.current;
        const diff = targetP - currentProgressRef.current;

        const isScrolling = Math.abs(diff) > 0.0003;

        if (isScrolling) {
          const step = diff * 0.12;
          const zoomStepDamp =
            userZoomOffsetRef.current > 0 ? 1 / (1 + userZoomOffsetRef.current) : 1;
          const maxStep = 0.0012 * zoomStepDamp;
          currentProgressRef.current += Math.max(-maxStep, Math.min(maxStep, step));
        }

        const frame = getCameraFrameAtProgress(
          tourPathData,
          currentProgressRef.current,
          currentBearingRef.current,
          userZoomOffsetRef.current
        );

        const sampleElev = (lng: number, lat: number): number | null => {
          const tm = map as unknown as TerrainMapLike;
          if (!tm.terrain?.getElevationForLngLatZoom) return null;
          try {
            const qZoom = Math.min(DEM_MAX_QUERY_ZOOM, Math.floor(map.getZoom()));
            const e = tm.terrain.getElevationForLngLatZoom(new maplibregl.LngLat(lng, lat), qZoom);
            return e > 0 ? e : null;
          } catch {
            return null;
          }
        };

        let targetBearing = frame.bearing;
        let targetPitch = frame.pitch;

        if (hasUserCustomAngleRef.current) {
          targetBearing = userCustomBearingRef.current;
          targetPitch = userCustomPitchRef.current;
        } else {
          const elev = sampleElev(frame.center[0], frame.center[1]);

          if (elev !== null) {
            if (elev > 5250) {
              targetPitch = Math.min(targetPitch, 30);
            } else if (elev > 3750) {
              targetPitch = Math.min(targetPitch, 38);
            } else if (elev > 2250) {
              targetPitch = Math.min(targetPitch, 42);
            }
          }

          if (frame.zoom > 15) {
            targetPitch = Math.min(targetPitch, Math.max(25, 45 - (frame.zoom - 15) * 8));
          }
        }

        currentBearingRef.current = targetBearing;
        currentPitchRef.current = targetPitch;

        if (!isFlyingRef.current && !activeStreetViewRef.current) {
          const appliedPitch = Math.max(8, currentPitchRef.current - pitchReliefRef.current);
          const appliedZoom = frame.zoom - zoomReliefRef.current;

          map.jumpTo({
            center: [frame.center[0], frame.center[1]],
            zoom: appliedZoom,
            pitch: appliedPitch,
            bearing: currentBearingRef.current,
          });

          const tMap = map as unknown as TerrainMapLike;
          if (tMap.terrain?.getElevationForLngLatZoom && tMap.setCenterElevation) {
            const qZoom = Math.min(DEM_MAX_QUERY_ZOOM, Math.floor(map.getZoom()));
            const centerElevFix = tMap.terrain.getElevationForLngLatZoom(
              new maplibregl.LngLat(frame.center[0], frame.center[1]),
              qZoom
            );
            const currentElev = tMap.getCenterElevation ? tMap.getCenterElevation() : 0;
            if (centerElevFix > 0 && Math.abs(centerElevFix - currentElev) > 1) {
              tMap.setCenterElevation(centerElevFix);
            }
          }

          try {
            const tr = (map as unknown as { transform?: TransformCameraLike }).transform;
            if (tr?.getCameraLngLat && tr?.getCameraAltitude) {
              const camLL = tr.getCameraLngLat();
              const camAlt = tr.getCameraAltitude();
              const centerSurf = sampleElev(frame.center[0], frame.center[1]) ?? 0;

              let worstMargin = Infinity;
              for (const t of [0.05, 0.4, 0.75]) {
                const lng = camLL.lng + (frame.center[0] - camLL.lng) * t;
                const lat = camLL.lat + (frame.center[1] - camLL.lat) * t;
                const surf = sampleElev(lng, lat);
                if (surf === null) continue;
                const rayAlt = camAlt + (centerSurf - camAlt) * t;
                const needed = CAMERA_CLEARANCE_M * (1 - t) + 15;
                worstMargin = Math.min(worstMargin, rayAlt - surf - needed);
              }

              if (worstMargin < 0) {
                if (pitchReliefRef.current < 40) {
                   pitchReliefRef.current = Math.min(40, pitchReliefRef.current + 2.5);
                } else {
                  zoomReliefRef.current = Math.min(2.5, zoomReliefRef.current + 0.06);
                }
              } else if (worstMargin > CAMERA_CLEARANCE_M * 1.5) {
                pitchReliefRef.current = Math.max(0, pitchReliefRef.current - 0.25);
                zoomReliefRef.current = Math.max(0, zoomReliefRef.current - 0.008);
              }
            }
          } catch {
            // Ignore
          }
        }

        const roadMaxProgress = Math.min(currentProgressRef.current, TREK_START_RATIO);
        const slicedRoadRoute = getSubRouteUpToProgress(
          routeData.route_geometry,
          roadMaxProgress
        );

        const activeSource = map.getSource('active-route-source') as maplibregl.GeoJSONSource;
        if (activeSource) {
          activeSource.setData({
            type: 'Feature',
            properties: {},
            geometry: slicedRoadRoute,
          });
        }

        if (
          Math.abs(currentProgressRef.current - lastFootFilterRef.current) > 0.003 &&
          map.getLayer('ew-footsteps-lit')
        ) {
          lastFootFilterRef.current = currentProgressRef.current;
          map.setFilter('ew-footsteps-lit', ['<=', ['get', 'ratio'], currentProgressRef.current]);
        }

        if (Math.abs(frame.zoom - lastLabelZoomRef.current) > 0.05) {
          lastLabelZoomRef.current = frame.zoom;
          const lift = Math.min(90, Math.max(0, (frame.zoom - 13) * 16));
          labelElsRef.current.forEach((el) =>
            el.style.setProperty('--ew-label-lift', `${lift}px`)
          );
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
