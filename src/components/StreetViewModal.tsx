import React, { useEffect, useState } from 'react';
import { useJourneyStore } from '../store/journeyStore';
import { Panorama360Viewer } from './Panorama360Viewer';

type PanoStatus = 'loading' | 'found' | 'none';

const SEARCH_RADII_M = [150, 1000, 5000, 25000];

function loadGoogleMapsAPI(): Promise<any> {
  return new Promise((resolve, reject) => {
    const win = window as any;
    if (win.google?.maps?.StreetViewService) {
      resolve(win.google);
      return;
    }

    const waitForReady = () => {
      const started = Date.now();
      const check = setInterval(() => {
        if (win.google?.maps?.StreetViewService) {
          clearInterval(check);
          resolve(win.google);
        } else if (Date.now() - started > 15000) {
          clearInterval(check);
          reject(new Error('Google Maps API load timeout'));
        }
      }, 100);
    };

    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      waitForReady();
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    if (!apiKey) {
      reject(new Error('VITE_GOOGLE_MAPS_API_KEY is missing'));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=alpha&libraries=maps3d`;
    script.async = true;
    script.defer = true;
    script.onload = waitForReady;
    script.onerror = () => reject(new Error('Failed to load Google Maps JavaScript API'));
    document.head.appendChild(script);
  });
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

export const StreetViewModal: React.FC = () => {
  const activeStreetView = useJourneyStore((state) => state.activeStreetView);
  const closeStreetView = useJourneyStore((state) => state.closeStreetView);
  const [viewMode, setViewMode] = useState<'satellite' | 'streetview' | 'spherical'>('satellite');

  const [panoStatus, setPanoStatus] = useState<PanoStatus>('loading');
  const [panoId, setPanoId] = useState<string | null>(null);
  const [panoLatLng, setPanoLatLng] = useState<[number, number] | null>(null);
  const [panoDistanceM, setPanoDistanceM] = useState(0);

  useEffect(() => {
    if (!activeStreetView) return;
    let cancelled = false;

    setPanoStatus('loading');
    setPanoId(null);
    setPanoLatLng(null);
    setPanoDistanceM(0);
    setViewMode('satellite');

    (async () => {
      try {
        const g = await loadGoogleMapsAPI();
        const svc = new g.maps.StreetViewService();
        const [lng, lat] = activeStreetView.coords;

        for (const radius of SEARCH_RADII_M) {
          if (cancelled) return;

          const data: any = await new Promise((res) => {
            try {
              svc.getPanorama(
                {
                  location: { lat, lng },
                  radius,
                  preference: g.maps.StreetViewPreference?.NEAREST ?? 'nearest',
                },
                (d: any, status: any) => res(status === 'OK' || status === g.maps.StreetViewStatus?.OK ? d : null)
              );
            } catch {
              res(null);
            }
          });

          const loc = data?.location;
          if (loc?.pano) {
            if (cancelled) return;
            const pLat = typeof loc.latLng?.lat === 'function' ? loc.latLng.lat() : lat;
            const pLng = typeof loc.latLng?.lng === 'function' ? loc.latLng.lng() : lng;
            setPanoId(loc.pano);
            setPanoLatLng([pLat, pLng]);
            setPanoDistanceM(haversineM(lat, lng, pLat, pLng));
            setPanoStatus('found');
            setViewMode('streetview');
            return;
          }
        }

        if (!cancelled) setPanoStatus('none');
      } catch {
        if (!cancelled) setPanoStatus('none');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeStreetView]);

  if (!activeStreetView) return null;

  const [lng, lat] = activeStreetView.coords;

  const panoEmbedUrl = panoId
    ? `https://maps.google.com/maps?layer=c&panoid=${encodeURIComponent(panoId)}${
        panoLatLng ? `&cbll=${panoLatLng[0]},${panoLatLng[1]}` : ''
      }&cbp=12,0,,0,0&output=svembed`
    : null;

  const streetViewEmbedUrl = `https://maps.google.com/maps?q=${lat},${lng}&layer=c&cbll=${lat},${lng}&cbp=12,0,0,0,0&output=svembed`;
  const satelliteEmbedUrl = `https://maps.google.com/maps?q=${lat},${lng}&t=k&z=17&ie=UTF8&iwloc=&output=embed`;

  const authenticPanoramaUrl = activeStreetView.photoSphereUrl;

  const streetViewButtonLabel =
    panoStatus === 'loading' ? '📷 Street View…' : panoStatus === 'found' ? '📷 Street View' : '📷 Street View';

  const footerTip =
    viewMode === 'satellite'
      ? 'Showing real HD Satellite & 3D Topographic Terrain centered on exact coordinates.'
      : viewMode === 'streetview'
        ? panoStatus === 'found'
          ? panoDistanceM > 200
            ? `Showing nearest 360° panorama, ${formatDistance(panoDistanceM)} from this marker — drag to look around, use the arrows to walk between panoramas.`
            : 'Interactive 360° panorama at this location — drag to look around, use the arrows to walk between panoramas.'
          : panoStatus === 'loading'
            ? 'Searching for the nearest 360° panorama imagery…'
            : 'No 360° imagery found within 25km of this remote trail point — showing the direct Google embed instead.'
        : 'Click & Drag to rotate 360° WebGL view.';

  return (
    <div className="ew-streetview-overlay" onClick={closeStreetView}>
      <div className="ew-streetview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ew-streetview-header">
          <div className="ew-streetview-title-group">
            <span className="ew-streetview-badge">
              {viewMode === 'satellite'
                ? '🛰️ HD SATELLITE TERRAIN'
                : viewMode === 'streetview' && panoStatus === 'found'
                  ? `📍 360° PANORAMA${panoDistanceM > 200 ? ` • ${formatDistance(panoDistanceM)} away` : ''}`
                  : '📍 REAL LOCATION VIEW'}
            </span>
            <h3 className="ew-streetview-title">{activeStreetView.title}</h3>
            <span className="ew-streetview-coords">
              Lat: {lat.toFixed(4)}°, Lng: {lng.toFixed(4)}°
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="ew-mode-toggle" style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: '20px', padding: '3px' }}>
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
                {streetViewButtonLabel}
              </button>
              {authenticPanoramaUrl && (
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
              )}
            </div>

            <button className="ew-streetview-close-btn" onClick={closeStreetView} title="Close View">
              ✕
            </button>
          </div>
        </div>

        <div className="ew-streetview-body">
          {viewMode === 'spherical' && authenticPanoramaUrl ? (
            <Panorama360Viewer imageSrc={authenticPanoramaUrl} title={activeStreetView.title} coords={activeStreetView.coords} />
          ) : viewMode === 'streetview' && panoStatus === 'found' && panoEmbedUrl ? (
            <iframe
              key={panoId}
              title={`360° Panorama - ${activeStreetView.title}`}
              src={panoEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              allow="accelerometer *; autoplay; clipboard-write; encrypted-media; gyroscope *; picture-in-picture; web-share"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : viewMode === 'streetview' && panoStatus === 'loading' ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                color: 'var(--ew-text-secondary)',
              }}
            >
              <div className="ew-loading-spinner" />
              <span>Locating nearest 360° panorama…</span>
            </div>
          ) : (
            <iframe
              key={viewMode}
              title={`Location View - ${activeStreetView.title}`}
              src={viewMode === 'streetview' ? streetViewEmbedUrl : satelliteEmbedUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              allow="accelerometer *; autoplay; clipboard-write; encrypted-media; gyroscope *; picture-in-picture; web-share"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}
        </div>

        <div className="ew-streetview-footer">
          <span className="ew-streetview-tip">💡 {footerTip}</span>
          <button className="ew-streetview-done-btn" onClick={closeStreetView}>
            Return to 3D Map
          </button>
        </div>
      </div>
    </div>
  );
};
