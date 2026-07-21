/**
 * ExploreWallah - Journey Map Container (Parent Coordinator)
 * 
 * Features:
 * 1. Non-passive native wheel listener ({ passive: false }) to 100% BLOCK trackpad zoom
 * 2. Trackpad scroll drives CONTINUOUS tour progress (0.0 → 1.0) along the smoothed camera path
 * 3. Velocity Clamping: smooth progress accumulation (SCROLL_SENSITIVITY = 0.0003)
 * 4. Floating Zoom Controls (+ / -) for explicit manual zooming
 * 5. Package Scroller Bar for switching treks
 * 6. Dual Map Engine Toggle (MapLibre Satellite 3D ↔ Google 3D Maps)
 * 7. Waypoint Itinerary Sidebar (auto-highlights based on progress)
 * 8. Tour progress bar
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { useJourneyStore } from '../store/journeyStore';
import { MapLibreRenderer } from './MapboxRenderer';
import { Google3DMapRenderer } from './Google3DMapRenderer';
import {
  getCameraFrameAtProgress,
  getActiveWaypointFromProgress,
  TOUR_ZOOM,
  TOUR_PITCH,
} from '../utils/cameraPath';
import type { MapEngine } from '../types';

/** Clamped scroll sensitivity (0.0003 per deltaY pixel) — smooth, human-paced tour tracing */
const CLAMPED_SCROLL_SENSITIVITY = 0.0003;

export const JourneyMapContainer: React.FC = () => {
  const {
    packages,
    selectedPackageSlug,
    selectPackage,
    routeData,
    isLoadingRoute,
    tourPathData,
    tourStarted,
    setTourStarted,
    activeWaypointIndex,
    setActiveWaypointIndex,
    tourProgress,
    setTourProgress,
    mapEngine,
    setMapEngine,
    cameraState,
    setCameraState,
  } = useJourneyStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const tourProgressRef = useRef(tourProgress);
  const tourStartedRef = useRef(tourStarted);
  const isStartAnimating = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    tourProgressRef.current = tourProgress;
  }, [tourProgress]);

  useEffect(() => {
    tourStartedRef.current = tourStarted;
  }, [tourStarted]);

  // Sync active waypoint index in sidebar based on current tourProgress
  useEffect(() => {
    if (!tourPathData) return;
    const activeIdx = getActiveWaypointFromProgress(tourPathData, tourProgress);
    if (activeIdx !== activeWaypointIndex) {
      setActiveWaypointIndex(activeIdx);
    }
  }, [tourProgress, tourPathData, activeWaypointIndex, setActiveWaypointIndex]);

  // ─── Tour Start Animation: zoom from overview (10) to tour level (14.5) ─────
  const startTour = useCallback(() => {
    if (isStartAnimating.current || !tourPathData) return;
    isStartAnimating.current = true;

    // Get the first point of the camera path for the zoom-in target
    const firstFrame = getCameraFrameAtProgress(tourPathData, 0, cameraState.bearing);

    // Animate from current overview zoom to tour zoom
    const proxy = { zoom: cameraState.zoom, pitch: cameraState.pitch };
    gsap.to(proxy, {
      zoom: TOUR_ZOOM,
      pitch: TOUR_PITCH,
      duration: 1.8,
      ease: 'power2.inOut',
      onUpdate: () => {
        setCameraState({
          lng: firstFrame.center[0],
          lat: firstFrame.center[1],
          zoom: proxy.zoom,
          pitch: proxy.pitch,
          bearing: firstFrame.bearing,
        });
      },
      onComplete: () => {
        isStartAnimating.current = false;
        setTourStarted(true);
      },
    });
  }, [tourPathData, cameraState, setCameraState, setTourStarted]);

  // Auto-enable tour tracing when tourPathData is ready (pre-warmed 3D satellite view)
  useEffect(() => {
    if (tourPathData) {
      setTourStarted(true);
    }
  }, [tourPathData, setTourStarted]);

  // ─── Native NON-PASSIVE Wheel Listener: drives continuous tour progress ─────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      // Ignore scroll inside sidebar list so user can scroll sidebar text
      if ((e.target as HTMLElement)?.closest('.ew-waypoint-list')) {
        return;
      }

      // CRITICAL: Block browser & map trackpad zoom
      e.preventDefault();
      e.stopPropagation();

      if (!tourPathData) return;

      // Accumulate continuous progress with velocity clamping
      // Clamp wheel delta to max 40 to prevent sudden tile demand spikes
      const clampedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 40);
      const deltaProgress = clampedDelta * CLAMPED_SCROLL_SENSITIVITY;

      const newProgress = Math.max(0, Math.min(1, tourProgressRef.current + deltaProgress));
      tourProgressRef.current = newProgress;
      setTourProgress(newProgress);
    };

    // Attach non-passive wheel event listener
    container.addEventListener('wheel', handleNativeWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleNativeWheel);
    };
  }, [tourPathData, startTour, setTourProgress]);

  // ─── Waypoint Click: jump to that waypoint's progress position ──────────────
  const handleWaypointClick = useCallback(
    (index: number) => {
      if (!tourPathData) return;

      const targetProgress = tourPathData.waypointProgressMap[index] ?? 0;

      if (!tourStartedRef.current) {
        tourProgressRef.current = targetProgress;
        setTourProgress(targetProgress);
        startTour();
      } else {
        // Smoothly animate progress to the clicked waypoint
        const proxy = { p: tourProgressRef.current };
        gsap.to(proxy, {
          p: targetProgress,
          duration: 1.5,
          ease: 'power2.inOut',
          onUpdate: () => {
            tourProgressRef.current = proxy.p;
            setTourProgress(proxy.p);
          },
        });
      }
    },
    [tourPathData, startTour, setTourProgress]
  );

  const { zoomIn, zoomOut } = useJourneyStore();

  // ─── Zoom In / Out Handlers ─────────────────────────────────────────────────
  const handleZoomIn = () => {
    zoomIn();
  };

  const handleZoomOut = () => {
    zoomOut();
  };

  const handleEngineSwitch = (engine: MapEngine) => {
    setMapEngine(engine);
  };

  const handlePackageClick = (slug: string) => {
    selectPackage(slug);
  };

  // Calculate progress percentage for the progress bar
  const progressPercent = Math.round(tourProgress * 100);

  return (
    <div ref={containerRef} className="ew-journey-container">
      {/* Full-screen Map Canvas */}
      <div className="ew-map-canvas">
        {isLoadingRoute ? (
          <div className="ew-loading">
            <div className="ew-loading-spinner" />
            <p>Tracing real road paths for 3D view...</p>
          </div>
        ) : routeData ? (
          mapEngine === 'mapbox' ? (
            <MapLibreRenderer
              routeData={routeData}
              activeWaypointIndex={activeWaypointIndex}
              cameraState={cameraState}
              onCameraUpdate={setCameraState}
            />
          ) : (
            <Google3DMapRenderer
              routeData={routeData}
              activeWaypointIndex={activeWaypointIndex}
              cameraState={cameraState}
              onCameraUpdate={setCameraState}
            />
          )
        ) : null}
      </div>

      {/* Tour Start Hint (shown before tour starts) */}
      {routeData && !tourStarted && !isStartAnimating.current && (
        <div className="ew-tour-hint">
          <div className="ew-tour-hint-icon">👆</div>
          <div className="ew-tour-hint-text">Scroll down to start the tour</div>
        </div>
      )}

      {/* Tour Progress Bar */}
      {tourStarted && (
        <div className="ew-progress-bar-container">
          <div className="ew-progress-bar-track">
            <div
              className="ew-progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="ew-progress-label">{progressPercent}%</span>
        </div>
      )}

      {/* Top Header & Package Scroller Bar */}
      <div className="ew-control-bar">
        <div className="ew-top-row">
          <div className="ew-logo">
            <span className="ew-logo-icon">🏔️</span>
            <span className="ew-logo-text">ExploreWallah</span>
          </div>

          <div className="ew-engine-toggle">
            <button
              className={`ew-engine-btn ${mapEngine === 'mapbox' ? 'active' : ''}`}
              onClick={() => handleEngineSwitch('mapbox')}
            >
              <span className="ew-engine-icon">🛰️</span>
              Satellite 3D
            </button>
            <button
              className={`ew-engine-btn ${mapEngine === 'google' ? 'active' : ''}`}
              onClick={() => handleEngineSwitch('google')}
            >
              <span className="ew-engine-icon">🌍</span>
              Google 3D
            </button>
          </div>
        </div>

        {/* Package Scroller Pills */}
        <div className="ew-package-scroller">
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              className={`ew-package-pill ${pkg.slug === selectedPackageSlug ? 'active' : ''}`}
              onClick={() => handlePackageClick(pkg.slug)}
            >
              <span className="ew-pill-icon">{pkg.thumbnail}</span>
              <div className="ew-pill-info">
                <span className="ew-pill-title">{pkg.title}</span>
                <span className="ew-pill-meta">{pkg.state} • {pkg.price}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Dedicated Floating Zoom In / Zoom Out Controls */}
      <div className="ew-zoom-controls">
        <button className="ew-zoom-btn" onClick={handleZoomIn} title="Zoom In">
          +
        </button>
        <button className="ew-zoom-btn" onClick={handleZoomOut} title="Zoom Out">
          −
        </button>
      </div>

      {/* Waypoint Itinerary Sidebar */}
      {routeData && (
        <div className="ew-sidebar">
          <div className="ew-sidebar-header">
            <div className="ew-price-badge">{routeData.price}</div>
            <h2 className="ew-trek-title">{routeData.title}</h2>
            <div className="ew-trek-meta">
              <span className="ew-tag">{routeData.duration}</span>
              <span className="ew-tag">{routeData.difficulty}</span>
              <span className="ew-tag">{routeData.season}</span>
              <span className="ew-tag">{routeData.state}</span>
            </div>
            <p className="ew-trek-desc">{routeData.description}</p>
          </div>

          <div className="ew-waypoint-list">
            {routeData.waypoints.map((wp, index) => (
              <button
                key={wp.id}
                className={`ew-waypoint-card ${index === activeWaypointIndex ? 'active' : ''}`}
                onClick={() => handleWaypointClick(index)}
              >
                <div className="ew-waypoint-indicator">
                  <div className="ew-waypoint-number">{index + 1}</div>
                  {index < routeData.waypoints.length - 1 && (
                    <div className="ew-waypoint-connector" />
                  )}
                </div>
                <div className="ew-waypoint-content">
                  <h3 className="ew-waypoint-name">{wp.name}</h3>
                  <p className="ew-waypoint-desc">{wp.description}</p>
                  <div className="ew-waypoint-accommodation">
                    <span className="ew-accommodation-icon">🏨</span>
                    {wp.accommodation}
                  </div>
                  <div
                    className="ew-sv-card-btn"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      useJourneyStore.getState().openStreetView(wp.coordinates, wp.name);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        useJourneyStore.getState().openStreetView(wp.coordinates, wp.name);
                      }
                    }}
                    title="Open 360° Street View Panorama"
                  >
                    📍 View 360° Street View
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
