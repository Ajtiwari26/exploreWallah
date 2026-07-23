import React, { useEffect, useRef, useCallback, useState } from 'react';
import { gsap } from 'gsap';
import { useJourneyStore } from '../store/journeyStore';
import { MapLibreRenderer } from './MapboxRenderer';
import { Google3DMapRenderer } from './Google3DMapRenderer';
import logoSvg from '../assets/logo.svg';
import {
  getCameraFrameAtProgress,
  getActiveWaypointFromProgress,
} from '../utils/cameraPath';
import type { MapEngine, Waypoint } from '../types';

export const JourneyMapContainer: React.FC = () => {
  const {
    packages,
    selectedPackageSlug,
    selectPackage,
    setViewMode,
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
  const isStartAnimating = useRef(false);

  const startTour = useCallback(() => {
    if (!tourPathData || tourStarted || isStartAnimating.current) return;

    isStartAnimating.current = true;

    // Calculate dynamic flight path duration based on total route distance
    const routeDistance = tourPathData.totalDistance;
    const flightDuration = Math.max(2.5, Math.min(6.5, routeDistance / 45));

    // Fly-in Camera Intro swoop
    const currentCamera = { ...cameraState };

    gsap.to(currentCamera, {
      lng: tourPathData.points[0].coords[0],
      lat: tourPathData.points[0].coords[1],
      zoom: 15.0,
      pitch: 62,
      bearing: -15,
      duration: flightDuration,
      ease: 'power2.inOut',
      onUpdate: () => {
        setCameraState({ ...currentCamera });
      },
      onComplete: () => {
        setTourStarted(true);
        setTourProgress(0);
        isStartAnimating.current = false;
      },
    });
  }, [tourPathData, tourStarted, cameraState, setCameraState, setTourStarted, setTourProgress]);

  // Scroll Handler for 3D Tour Path Animation Tracing
  useEffect(() => {
    const handleScroll = (e: WheelEvent) => {
      // Ignore if Street View Modal is active
      if (useJourneyStore.getState().activeStreetView) return;

      if (!tourPathData) return;

      if (!tourStarted) {
        if (e.deltaY > 5) {
          startTour();
        }
        return;
      }

      e.preventDefault();

      // Scroll speed dampening factor
      const speedDampener = 0.00035;
      const nextProgress = Math.max(
        0,
        Math.min(1, tourProgress + e.deltaY * speedDampener)
      );

      setTourProgress(nextProgress);

      // Auto-update active waypoint node selection as hiker scrolls past its threshold
      const currentActiveWp = getActiveWaypointFromProgress(
        tourPathData,
        nextProgress
      );
      if (currentActiveWp !== null && currentActiveWp !== activeWaypointIndex) {
        setActiveWaypointIndex(currentActiveWp);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleScroll, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleScroll);
      }
    };
  }, [
    tourPathData,
    tourStarted,
    tourProgress,
    activeWaypointIndex,
    startTour,
    setTourProgress,
    setActiveWaypointIndex,
  ]);

  // Touch Swipe / Drag support for Mobile 3D Journey Tracing
  useEffect(() => {
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (useJourneyStore.getState().activeStreetView) return;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (useJourneyStore.getState().activeStreetView) return;
      if (!tourPathData) return;

      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;
      touchStartY = touchY;

      if (!tourStarted) {
        if (deltaY > 5) {
          startTour();
        }
        return;
      }

      e.preventDefault();

      const speedDampener = 0.0015;
      const nextProgress = Math.max(
        0,
        Math.min(1, tourProgress + deltaY * speedDampener)
      );

      setTourProgress(nextProgress);

      const currentActiveWp = getActiveWaypointFromProgress(
        tourPathData,
        nextProgress
      );
      if (currentActiveWp !== null && currentActiveWp !== activeWaypointIndex) {
        setActiveWaypointIndex(currentActiveWp);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
      }
    };
  }, [
    tourPathData,
    tourStarted,
    tourProgress,
    activeWaypointIndex,
    startTour,
    setTourProgress,
    setActiveWaypointIndex,
  ]);

  // Waypoint Card click handler — flies camera to clicked waypoint node
  const handleWaypointClick = useCallback(
    (index: number) => {
      if (!tourPathData || !routeData) return;

      // Force tour to started state
      if (!tourStarted) {
        setTourStarted(true);
      }

      // Map indices
      const wp = routeData.waypoints[index];
      const wpPathNode = tourPathData.waypoints.find((w) => w.id === wp.id);
      if (!wpPathNode) return;

      const targetP = wpPathNode.ratio;

      // Run GSAP transition to target waypoint progress
      const progressObj = { p: tourProgress };
      gsap.to(progressObj, {
        p: targetP,
        duration: 1.8,
        ease: 'power2.out',
        onUpdate: () => {
          setTourProgress(progressObj.p);
          const currentActiveWp = getActiveWaypointFromProgress(
            tourPathData,
            progressObj.p
          );
          if (currentActiveWp !== null) {
            setActiveWaypointIndex(currentActiveWp);
          }
        },
      });
    },
    [tourPathData, routeData, tourStarted, tourProgress, setTourStarted, setTourProgress, setActiveWaypointIndex]
  );

  const { zoomIn, zoomOut } = useJourneyStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

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
          <div className="ew-trail-legend">
            <span className="ew-legend-item road">🔴 🚗 Road Drive</span>
            <span className="ew-legend-divider">|</span>
            <span className="ew-legend-item trek">🥾 Mountain Trek</span>
          </div>
        </div>
      )}

      {/* Collapsed Top Header Floating Indicator */}
      {isHeaderCollapsed && (
        <button
          className="ew-header-expand-btn"
          onClick={() => setIsHeaderCollapsed(false)}
          title="Expand Top Controls"
        >
          📍 {routeData?.title || 'ExploreWallah 3D'} • Expand Controls ▼
        </button>
      )}

      {/* Top Header & Package Scroller Bar */}
      <div className={`ew-control-bar ${isHeaderCollapsed ? 'collapsed' : ''}`}>
        <div className="ew-top-row">
          <div className="ew-logo" onClick={() => setViewMode('overview')} style={{ cursor: 'pointer' }} title="Return to Overview">
            <img src={logoSvg} alt="ExploreWallah Logo" className="ew-brand-logo-img sm" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

            <button
              className="ew-collapse-toggle-btn"
              onClick={() => setIsHeaderCollapsed(true)}
              title="Collapse Top Bar for Fullscreen 3D View"
            >
              ▲ Hide Top Bar
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

      {/* Collapsed Sidebar Edge Expand Trigger */}
      {routeData && isSidebarCollapsed && (
        <button
          className="ew-sidebar-expand-btn"
          onClick={() => setIsSidebarCollapsed(false)}
          title="Expand Itinerary Sidebar"
        >
          ▶ Itinerary & Waypoints ({routeData.waypoints.length})
        </button>
      )}

      {/* Waypoint Itinerary Sidebar */}
      {routeData && (
        <div className={`ew-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="ew-sidebar-header">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
              <div className="ew-price-badge">{routeData.price}</div>
              <button
                className="ew-collapse-toggle-btn sm"
                onClick={() => setIsSidebarCollapsed(true)}
                title="Collapse Sidebar for Fullscreen 3D View"
              >
                ◀ Collapse
              </button>
            </div>
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
