import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Panorama360ViewerProps {
  imageSrc: string;
  title: string;
  coords: [number, number];
}

export const Panorama360Viewer: React.FC<Panorama360ViewerProps> = ({ imageSrc, title, coords: _coords }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [heading, setHeading] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

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

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 1100);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    containerRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

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
      () => {
        setIsLoading(false);
        setLoadFailed(true);
      }
    );

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

      const currentHeading = (Math.round((lonRef.current % 360) + 360) % 360);
      setHeading(currentHeading);

      renderer.render(scene, camera);
    };

    animate();

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

      scene.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) {
          const mesh = object as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => {
              if ((mat as THREE.MeshBasicMaterial).map) (mat as THREE.MeshBasicMaterial).map?.dispose();
              mat.dispose();
            });
          } else if (mesh.material) {
            if ((mesh.material as THREE.MeshBasicMaterial).map) {
              (mesh.material as THREE.MeshBasicMaterial).map?.dispose();
            }
            mesh.material.dispose();
          }
        }
      });

      geometry.dispose();
      renderer.dispose();
      renderer.forceContextLoss();

      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [imageSrc, isAutoRotating, title, _coords]);

  const getCardinalDirection = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(deg / 45) % 8];
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', cursor: 'grab' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {loadFailed && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5,10,15,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: '10px', zIndex: 10, textAlign: 'center', padding: '24px' }}>
          <span style={{ fontSize: '32px' }}>📷</span>
          <span style={{ fontSize: '14px', fontWeight: 700 }}>360° photo unavailable for {title}</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', maxWidth: '420px' }}>
            The panorama image could not be loaded. Try the 📷 Street View tab for real nearby imagery, or the 🛰️ HD Satellite view.
          </span>
        </div>
      )}

      {isLoading && !loadFailed && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5,10,15,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#00ffcc', gap: '12px', zIndex: 10 }}>
          <div className="ew-spinner" style={{ width: '36px', height: '36px', border: '3px solid rgba(0,255,204,0.2)', borderTopColor: '#00ffcc', borderRadius: '50%', animation: 'ew-spin 0.8s linear infinite' }} />
          <span style={{ fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px' }}>Loading 360° Spherical Panorama...</span>
        </div>
      )}

      <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(10,15,25,0.85)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,255,204,0.3)', borderRadius: '20px', padding: '6px 14px', color: '#fff', fontSize: '12px', fontWeight: '600', zIndex: 5 }}>
        <span style={{ color: '#00ffcc', fontSize: '14px' }}>🧭</span>
        <span>{heading}° {getCardinalDirection(heading)}</span>
      </div>

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

      <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(10,15,25,0.75)', backdropFilter: 'blur(10px)', padding: '6px 16px', borderRadius: '16px', color: 'rgba(255,255,255,0.8)', fontSize: '12px', pointerEvents: 'none', zIndex: 5 }}>
        Format card: 🖱️ Click & Drag anywhere to look 360° | Scroll to zoom
      </div>
    </div>
  );
};
