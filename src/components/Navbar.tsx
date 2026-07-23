import React from 'react';
import type { MapEngine } from '../types';
import { useJourneyStore } from '../store/journeyStore';
import logoSvg from '../assets/logo.svg';

export const Navbar: React.FC = () => {
  const {
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    mapEngine,
    setMapEngine,
    routeData,
  } = useJourneyStore();

  const handleEngineSwitch = (engine: MapEngine) => {
    setMapEngine(engine);
  };

  const currentPkg = routeData;

  return (
    <header className="ew-header">
      <div className="ew-header-container">
        {/* Brand Logo */}
        <div className="ew-brand" onClick={() => setViewMode('overview')} title="ExploreWallah Home">
          <img src={logoSvg} alt="ExploreWallah Logo" className="ew-brand-logo-img" />
        </div>

        {/* Navbar Navigation Links */}
        <nav className="ew-nav-links">
          <a href="#treks" className="ew-nav-link" onClick={() => setViewMode('overview')}>🏔️ Treks</a>
          <a href="#gallery" className="ew-nav-link" onClick={() => setViewMode('overview')}>📸 Media Gallery</a>
          <a href="#reviews" className="ew-nav-link" onClick={() => setViewMode('overview')}>⭐️ Reviews</a>
        </nav>

        {/* Global Search Bar */}
        <div className="ew-search-box">
          <span className="ew-search-icon">🔍</span>
          <input
            type="text"
            className="ew-search-input"
            placeholder="Search treks, peaks (e.g. Kedarkantha, Spiti, Kanchenjunga)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="ew-search-clear" onClick={() => setSearchQuery('')}>
              ✕
            </button>
          )}
        </div>

        {/* Action Controls & Toggles */}
        <div className="ew-nav-actions">
          {/* View Mode Switcher */}
          <div className="ew-mode-toggle">
            <button
              className={`ew-mode-btn ${viewMode === 'overview' ? 'active' : ''}`}
              onClick={() => setViewMode('overview')}
              title="Overview Map showing all Himalayan Treks"
            >
              <span className="ew-btn-icon">🗺️</span>
              3D Map View
            </button>

            {currentPkg && (
              <button
                className={`ew-mode-btn ${viewMode === 'focused-journey' ? 'active' : ''}`}
                onClick={() => setViewMode('focused-journey')}
                title="Experience currently selected trek in 3D"
              >
                <span className="ew-btn-icon">🏔️</span>
                3D Tour: {currentPkg.title.split(' ')[0]}
              </button>
            )}
          </div>

          {/* Map Engine Toggle (shown globally for consistence) */}
          <div className="ew-engine-toggle">
            <button
              className={`ew-engine-btn ${mapEngine === 'mapbox' ? 'active' : ''}`}
              onClick={() => handleEngineSwitch('mapbox')}
              title="Switch to MapLibre satellite terrain"
            >
              🛰️ MapLibre 3D
            </button>
            <button
              className={`ew-engine-btn ${mapEngine === 'google' ? 'active' : ''}`}
              onClick={() => handleEngineSwitch('google')}
              title="Switch to Google Earth 3D tiles"
            >
              🌍 Google 3D
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
