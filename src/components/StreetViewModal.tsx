/**
 * ExploreWallah - Interactive 360° Street View & Panorama Viewer Modal
 * 
 * Provides an interactive 360° ground-level Google Street View / PhotoSphere panorama
 * when clicking any waypoint node or Street View inspection dot along the trek route.
 */

import React, { useState } from 'react';
import { useJourneyStore } from '../store/journeyStore';
import { Panorama360Viewer } from './Panorama360Viewer';

const HIMALAYAN_360_PANORAMAS = [
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=3840&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=3840&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=3840&q=80',
  'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=3840&q=80',
];

export const StreetViewModal: React.FC = () => {
  const activeStreetView = useJourneyStore((state) => state.activeStreetView);
  const closeStreetView = useJourneyStore((state) => state.closeStreetView);
  const [viewMode, setViewMode] = useState<'streetview' | 'satellite' | 'spherical'>('streetview');

  if (!activeStreetView) return null;

  const [lng, lat] = activeStreetView.coords;

  // Select 360° image based on title/coords hash for deterministic matching
  const panoIndex = Math.abs(Math.round(lat * 100 + lng * 100)) % HIMALAYAN_360_PANORAMAS.length;
  const panoramaSrc = HIMALAYAN_360_PANORAMAS[panoIndex];

  // High-performance 360° Google Street View embed URL
  const streetViewEmbedUrl = `https://maps.google.com/maps?q=${lat},${lng}&layer=c&cbll=${lat},${lng}&cbp=12,0,0,0,0&output=svembed`;
  
  // High-def Satellite Terrain embed URL fallback for mountain wilderness
  const satelliteEmbedUrl = `https://maps.google.com/maps?q=${lat},${lng}&t=k&z=17&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="ew-streetview-overlay" onClick={closeStreetView}>
      <div className="ew-streetview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ew-streetview-header">
          <div className="ew-streetview-title-group">
            <span className="ew-streetview-badge">📍 GOOGLE 360° STREET VIEW</span>
            <h3 className="ew-streetview-title">{activeStreetView.title}</h3>
            <span className="ew-streetview-coords">
              Lat: {lat.toFixed(4)}°, Lng: {lng.toFixed(4)}°
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="ew-mode-toggle" style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: '20px', padding: '3px' }}>
              <button
                className={`ew-mode-btn ${viewMode === 'streetview' ? 'active' : ''}`}
                onClick={() => setViewMode('streetview')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '16px',
                  border: 'none',
                  background: viewMode === 'streetview' ? 'var(--ew-accent)' : 'transparent',
                  color: viewMode === 'streetview' ? '#000' : 'var(--ew-text-secondary)',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                📷 Street View
              </button>
              <button
                className={`ew-mode-btn ${viewMode === 'satellite' ? 'active' : ''}`}
                onClick={() => setViewMode('satellite')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '16px',
                  border: 'none',
                  background: viewMode === 'satellite' ? 'var(--ew-accent)' : 'transparent',
                  color: viewMode === 'satellite' ? '#000' : 'var(--ew-text-secondary)',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                🛰️ HD Satellite
              </button>
              <button
                className={`ew-mode-btn ${viewMode === 'spherical' ? 'active' : ''}`}
                onClick={() => setViewMode('spherical')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '16px',
                  border: 'none',
                  background: viewMode === 'spherical' ? 'var(--ew-accent)' : 'transparent',
                  color: viewMode === 'spherical' ? '#000' : 'var(--ew-text-secondary)',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                🌐 360° PhotoSphere
              </button>
            </div>

            <button className="ew-streetview-close-btn" onClick={closeStreetView} title="Close View">
              ✕
            </button>
          </div>
        </div>

        <div className="ew-streetview-body">
          {viewMode === 'spherical' ? (
            <Panorama360Viewer imageSrc={panoramaSrc} title={activeStreetView.title} coords={activeStreetView.coords} />
          ) : (
            <iframe
              key={viewMode}
              title={`360° View - ${activeStreetView.title}`}
              src={viewMode === 'streetview' ? streetViewEmbedUrl : satelliteEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; device-orientation"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}
        </div>

        <div className="ew-streetview-footer">
          <span className="ew-streetview-tip">
            💡 {viewMode === 'spherical' ? 'Click & Drag to rotate 360° horizontally & vertically | Scroll to zoom FOV' : viewMode === 'streetview' ? 'Drag inside to pan 360°. If street view coverage is absent, switch to 360° WebGL View above!' : 'Zoom and drag to inspect 3D satellite mountain terrain.'}
          </span>
          <button className="ew-streetview-done-btn" onClick={closeStreetView}>
            Return to 3D Map
          </button>
        </div>
      </div>
    </div>
  );
};
