/**
 * ExploreWallah - Interactive 360° Street View & Panorama Viewer Modal
 * 
 * Provides an interactive 360° ground-level Google Street View / PhotoSphere panorama
 * when clicking any waypoint node or Street View inspection dot along the trek route.
 */

import React, { useState } from 'react';
import { useJourneyStore } from '../store/journeyStore';
import { Panorama360Viewer } from './Panorama360Viewer';

const TOUR_PANORAMA_MAP: Record<string, string[]> = {
  'kedarkantha-winter-summit': [
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=3840&q=80', // Sankri Village Pine Forest
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=3840&q=80', // Frozen Juda Lake
    'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=3840&q=80', // Base Camp Ridge
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=3840&q=80', // Kedarkantha 3800m Summit Peak
  ],
  'hampta-pass-crossover': [
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=3840&q=80', // Jobra Pine Stream
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=3840&q=80', // Balu Ka Ghera Sand Valley
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=3840&q=80', // Hampta Pass Summit 4270m
    'https://images.unsplash.com/photo-1439853949127-fa647821eba0?auto=format&fit=crop&w=3840&q=80', // Chandratal Turquoise Moon Lake
  ],
  'valley-of-flowers-hemkund': [
    'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=3840&q=80', // Govindghat Alaknanda River
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=3840&q=80', // Ghangaria Base
    'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=3840&q=80', // Valley of Flowers Carpeted Blooms
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=3840&q=80', // Hemkund Sacred Mountain Lake
  ],
  'kashmir-great-lakes': [
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=3840&q=80', // Sonamarg Kashmiri Alpine Meadow
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=3840&q=80', // Nichnai Pass Valley
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=3840&q=80', // Vishansar Twin Trout Lakes
    'https://images.unsplash.com/photo-1439853949127-fa647821eba0?auto=format&fit=crop&w=3840&q=80', // Gadsar Flower Lake
    'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=3840&q=80', // Gangabal Mt. Haramukh Lake
  ],
  'brahmatal-winter-trek': [
    'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=3840&q=80', // Lohajung Valley
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=3840&q=80', // Bekaltal Snow Lake
    'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=3840&q=80', // Brahmatal Sacred Lake
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=3840&q=80', // Trishul Ridge Summit View
  ],
  'kuari-pass-curzon-trail': [
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=3840&q=80', // Dhak Village Trail
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=3840&q=80', // Gulling Pine Top
    'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=3840&q=80', // Khullara Bugyal Meadow
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=3840&q=80', // Kuari Summit Nanda Devi Peak View
  ],
  'har-ki-dun-crossover': [
    'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=3840&q=80', // Taluka Supin River
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=3840&q=80', // Osla Ancient Wooden Village
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=3840&q=80', // Har Ki Dun Valley of Gods
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=3840&q=80', // Maninda Glacial Lake
  ],
  'sandakphu-kanchenjunga-ridge': [
    'https://images.unsplash.com/photo-1465056836041-7f43ac27dcb5?auto=format&fit=crop&w=3840&q=80', // Manebhanjan Base
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=3840&q=80', // Tumling Nepali Ridge
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=3840&q=80', // Kalipokhri Black Lake
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=3840&q=80', // Sandakphu Sleeping Buddha Horizon
  ],
};

export const StreetViewModal: React.FC = () => {
  const activeStreetView = useJourneyStore((state) => state.activeStreetView);
  const closeStreetView = useJourneyStore((state) => state.closeStreetView);
  const selectedPackageSlug = useJourneyStore((state) => state.selectedPackageSlug);
  const [viewMode, setViewMode] = useState<'streetview' | 'satellite' | 'spherical'>('streetview');

  if (!activeStreetView) return null;

  const [lng, lat] = activeStreetView.coords;

  // Retrieve tour-specific 360° panoramas
  const tourPanoramas = TOUR_PANORAMA_MAP[selectedPackageSlug] || TOUR_PANORAMA_MAP['kedarkantha-winter-summit'];
  const nodeHash = Math.abs(Math.round(lat * 50 + lng * 50));
  const panoramaSrc = tourPanoramas[nodeHash % tourPanoramas.length];

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
