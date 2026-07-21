/**
 * ExploreWallah - Three.js Custom 3D Volumetric Cylinder Tube Layer for MapLibre GL
 * 
 * Renders the route path as a true 3D volumetric cylinder pipe floating directly ON top of 3D terrain
 * by querying map terrain elevation for every coordinate vertex.
 */

import * as THREE from 'three';
import maplibregl from 'maplibre-gl';

export interface ThreeTubeLayerOptions {
  id: string;
  coords: [number, number][];
  radiusMeters?: number;
  color?: string;
  emissive?: string;
}

export class ThreeTubeLayer {
  id: string;
  type: 'custom' = 'custom';
  renderingMode: '3d' = '3d';

  private map: maplibregl.Map | null = null;
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer | null = null;
  private tubeMesh: THREE.Mesh | null = null;

  private rawCoords: [number, number][];
  private radiusMeters: number;
  private colorHex: string;
  private emissiveHex: string;

  // Performance: throttle tube geometry rebuilds
  private lastBuildTime: number = 0;
  private lastBuildCoordCount: number = 0;
  private static readonly BUILD_THROTTLE_MS = 100; // Max 10fps geometry rebuilds

  constructor(options: ThreeTubeLayerOptions) {
    this.id = options.id;
    this.rawCoords = options.coords;
    this.radiusMeters = options.radiusMeters || 2.5;
    this.colorHex = options.color || '#ff0033';
    this.emissiveHex = options.emissive || '#880011';

    this.camera = new THREE.Camera();
    this.scene = new THREE.Scene();

    // 3D Lighting setup for realistic metallic cylinder rendering
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.8);
    dirLight1.position.set(2, 4, 3).normalize();
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xff1744, 2.0);
    dirLight2.position.set(-2, -2, 3).normalize();
    this.scene.add(dirLight2);
  }

  onAdd(map: maplibregl.Map, gl: WebGLRenderingContext) {
    this.map = map;

    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      outputColorSpace: THREE.SRGBColorSpace,
    });
    this.renderer.autoClear = false;

    this.buildTubeMesh();
  }

  /**
   * Updates the coordinates of the 3D tube geometry dynamically (for active traveled path)
   */
  updateCoords(coords: [number, number][]) {
    // Skip if coords haven't meaningfully changed (same count = same progress frame)
    if (coords.length === this.lastBuildCoordCount) return;

    // Throttle: skip if last build was < 100ms ago
    const now = performance.now();
    if (now - this.lastBuildTime < ThreeTubeLayer.BUILD_THROTTLE_MS) return;

    this.rawCoords = coords;
    this.lastBuildCoordCount = coords.length;
    this.lastBuildTime = now;

    if (this.map) {
      this.buildTubeMesh();
      this.map.triggerRepaint();
    }
  }

  private buildTubeMesh() {
    if (!this.map || this.rawCoords.length < 2) return;

    if (this.tubeMesh) {
      this.scene.remove(this.tubeMesh);
      this.tubeMesh.geometry.dispose();
      (this.tubeMesh.material as THREE.Material).dispose();
      this.tubeMesh = null;
    }

    // Convert geographic coordinates [lng, lat] into MapLibre Mercator 3D vectors WITH TERRAIN ELEVATION
    const points: THREE.Vector3[] = [];

    for (let i = 0; i < this.rawCoords.length; i++) {
      const [lng, lat] = this.rawCoords[i];
      // Query terrain elevation at this point
      const terrainElev = this.map.queryTerrainElevation([lng, lat]) || 0;
      // Add +15 meters altitude offset so sleek tube floats cleanly above terrain
      const mercator = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], terrainElev + 15);
      points.push(new THREE.Vector3(mercator.x, mercator.y, mercator.z));
    }

    // Create a 3D CatmullRom curve through all terrain-aware coordinates
    const curve = new THREE.CatmullRomCurve3(points);
    curve.curveType = 'centripetal';

    // Calculate mercator scale factor for tube radius
    const originMercator = maplibregl.MercatorCoordinate.fromLngLat(
      [this.rawCoords[0][0], this.rawCoords[0][1]],
      0
    );
    const meterScale = originMercator.meterInMercatorCoordinateUnits();
    const tubeRadiusUnits = this.radiusMeters * meterScale;

    // Create 3D Volumetric Cylinder Geometry
    const tubularSegments = Math.max(30, this.rawCoords.length * 4);
    const geometry = new THREE.TubeGeometry(curve, tubularSegments, tubeRadiusUnits, 16, false);

    // Glowing 3D Metallic Red Material
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.colorHex),
      emissive: new THREE.Color(this.emissiveHex),
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.9,
      wireframe: false,
    });

    this.tubeMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.tubeMesh);
  }

  render(gl: WebGLRenderingContext, matrix: number[]) {
    if (!this.renderer || !this.map) return;

    const m = new THREE.Matrix4().fromArray(matrix);
    this.camera.projectionMatrix = m;

    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
    // NOTE: Do NOT call triggerRepaint() here — it creates an infinite repaint loop.
    // MapLibre already calls render() when needed (camera moves, tiles load, etc.)
  }

  onRemove() {
    if (this.tubeMesh) {
      this.scene.remove(this.tubeMesh);
      this.tubeMesh.geometry.dispose();
      (this.tubeMesh.material as THREE.Material).dispose();
      this.tubeMesh = null;
    }
  }
}
