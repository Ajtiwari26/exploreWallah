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
  type = 'custom' as const;
  renderingMode = '3d' as const;

  private map: maplibregl.Map | null = null;
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer | null = null;
  private tubeMesh: THREE.Mesh | null = null;

  private rawCoords: [number, number][];
  private radiusMeters: number;
  private colorHex: string;
  private emissiveHex: string;

  private lastBuildTime: number = 0;
  private lastBuildCoordCount: number = 0;
  private static readonly BUILD_THROTTLE_MS = 100;

  constructor(options: ThreeTubeLayerOptions) {
    this.id = options.id;
    this.rawCoords = options.coords;
    this.radiusMeters = options.radiusMeters || 2.5;
    this.colorHex = options.color || '#ff0033';
    this.emissiveHex = options.emissive || '#880011';

    this.camera = new THREE.Camera();
    this.scene = new THREE.Scene();

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
    } as any);
    this.renderer.autoClear = false;

    this.buildTubeMesh();
  }

  updateCoords(coords: [number, number][]) {
    if (coords.length === this.lastBuildCoordCount) return;

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

    const points: THREE.Vector3[] = [];

    for (let i = 0; i < this.rawCoords.length; i++) {
      const [lng, lat] = this.rawCoords[i];
      const terrainElev = this.map.queryTerrainElevation([lng, lat]) || 0;
      const mercator = maplibregl.MercatorCoordinate.fromLngLat([lng, lat], terrainElev + 15);
      points.push(new THREE.Vector3(mercator.x, mercator.y, mercator.z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    curve.curveType = 'centripetal';

    const originMercator = maplibregl.MercatorCoordinate.fromLngLat(
      [this.rawCoords[0][0], this.rawCoords[0][1]],
      0
    );
    const meterScale = originMercator.meterInMercatorCoordinateUnits();
    const tubeRadiusUnits = this.radiusMeters * meterScale;

    const tubularSegments = Math.max(30, this.rawCoords.length * 4);
    const geometry = new THREE.TubeGeometry(curve, tubularSegments, tubeRadiusUnits, 16, false);

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

  render(_gl: WebGLRenderingContext, matrix: number[]) {
    if (!this.renderer || !this.map) return;

    const m = new THREE.Matrix4().fromArray(matrix);
    this.camera.projectionMatrix = m;

    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
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
