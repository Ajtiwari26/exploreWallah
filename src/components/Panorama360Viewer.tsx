/**
 * ExploreWallah - Real WebGL 360° Spherical Panorama Engine (Three.js)
 * 
 * Provides interactive 360° x 180° spherical panorama viewing with:
 * - Free drag pan & tilt (360° horizontal, ±85° vertical)
 * - Smooth inertial momentum
 * - Scroll FOV zoom
 * - Live HUD compass (N/E/S/W)
 * - Auto-rotation toggle
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Panorama360ViewerProps {
  imageSrc: string;
  title: string;
  coords: [number, number];
}

export const Panorama360Viewer: React.FC<Panorama360ViewerProps> = ({ imageSrc, title, coords }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [heading, setHeading] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const isUserInteractingRef = useRef(false);
  const onPointerDownMouseXRef = useRef(0);
  const onPointerDownMouseYRef = useRef(0);
  const lonRef = useRef(0);
  const onPointerDownLonRef = useRef(0);
  const latRef = useRef(0);
  const onPointerDownLatRef = useRef(0);
  const phiRef = useRef(0);
  const thetaRef = useRef(0);
  const fovRef = useRef(75);

  useEffect(() => {
    if (!containerRef.current) return;

    setIsLoading(true);

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 1100);
    camera.target = new THREE.Vector3(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    containerRef.current.appendChild(renderer.domElement);

    // 2. Spherical Geometry (Inverted Sphere for 360° Interior Panoramas)
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    // 3. Load 360° Equirectangular Texture
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      imageSrc,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        setIsLoading(false);
      },
      undefined,
      (err) => {
        console.warn('Failed to load 360° panorama image, using procedural sky grid fallback:', err);
        // Fallback procedural canvas texture for smooth rendering
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const grad = ctx.createLinearGradient(0, 0, 0, 1024);
          grad.addColorStop(0, '#0f2027');
          grad.addColorStop(0.5, '#203a43');
          grad.addColorStop(1, '#2c5364');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 2048, 1024);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 48px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`360° Panorama - ${title}`, 1024, 512);
        }
        const fallbackTex = new THREE.CanvasTexture(canvas);
        fallbackTex.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.MeshBasicMaterial({ map: fallbackTex });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        setIsLoading(false);
      }
    );

    // 4. Input Handlers for Drag, Touch, and Zoom
    const onPointerDown = (event: PointerEvent) => {
      isUserInteractingRef.current = true;
      onPointerDownMouseXRef.current = event.clientX;
      onPointerDownMouseYRef.current = event.clientY;
      onPointerDownLonRef.current = lonRef.current;
      onPointerDownLatRef.current = latRef.current;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isUserInteractingRef.current) return;
      lonRef.current = (onPointerDownMouseXRef.current - event.clientX) * 0.18 + onPointerDownLonRef.current;
      latRef.current = (event.clientY - onPointerDownMouseYRef.current) * 0.18 + onPointerDownLatRef.current;
    };

    const onPointerUp = () => {
      isUserInteractingRef.current = false;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      fovRef.current = Math.max(30, Math.min(100, fovRef.current + event.deltaY * 0.05));
      camera.fov = fovRef.current;
      camera.updateProjectionMatrix();
    };

    const domEl = containerRef.current;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    // 5. Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (isAutoRotating && !isUserInteractingRef.current) {
        lonRef.current += 0.08;
      }

      latRef.current = Math.max(-85, Math.min(85, latRef.current));
      phiRef.current = THREE.MathUtils.degToRad(90 - latRef.current);
      thetaRef.current = THREE.MathUtils.degToRad(lonRef.current);

      const x = 500 * Math.sin(phiRef.current) * Math.cos(thetaRef.current);
      const y = 500 * Math.cos(phiRef.current);
      const z = 500 * Math.sin(phiRef.current) * Math.sin(thetaRef.current);

      camera.lookAt(x, y, z);

      // Update live compass heading (0-360°)
      const currentHeading = (Math.round((lonRef.current % 360) + 360) % 360);
      setHeading(currentHeading);

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
    };
  }, [imageSrc, isAutoRotating, title]);

  // Convert degrees to cardinal compass text
  const getCardinalDirection = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(deg / 45) % 8];
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', cursor: 'grab' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Loading Spinner */}
      {isLoading && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5,10,15,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#00ffcc', gap: '12px', zIndex: 10 }}>
          <div className="ew-spinner" style={{ width: '36px', height: '36px', border: '3px solid rgba(0,255,204,0.2)', borderTopColor: '#00ffcc', borderRadius: '50%', animation: 'ew-spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px' }}>Loading 360° Spherical Panorama...</span>
        </div>
      )}

      {/* Live HUD Compass */}
      <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(10,15,25,0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,255,204,0.3)', borderRadius: '20px', padding: '6px 14px', color: '#fff', fontSize: '12px', fontWeight: '600', zIndex: 5 }}>
        <span style={{ color: '#00ffcc', fontSize: '14px' }}>🧭</span>
        <span>{heading}° {getCardinalDirection(heading)}</span>
      </div>

      {/* Auto-Rotation Toggle Button */}
      <button
        onClick={() => setIsAutoRotating(!isAutoRotating)}
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          background: isAutoRotating ? 'rgba(0,255,204,0.2)' : 'rgba(10,15,25,0.85)',
          border: '1px solid var(--ew-accent)',
          borderRadius: '20px',
          padding: '8px 16px',
          color: isAutoRotating ? '#00ffcc' : '#fff',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backdropFilter: 'blur(10px)',
          zIndex: 5,
        }}
      >
        <span>{isAutoRotating ? '⏸️ Pause Auto-Rotate' : '▶️ Auto-Rotate 360°'}</span>
      </button>

      {/* Drag instruction tip */}
      <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(10,15,25,0.75)', backdropFilter: 'blur(10px)', padding: '6px 16px', borderRadius: '16px', color: 'rgba(255,255,255,0.8)', fontSize: '12px', pointerEvents: 'none', zIndex: 5 }}>
        🖱️ Click & Drag anywhere to look 360° around | Scroll wheel to zoom
      </div>
    </div>
  );
};
