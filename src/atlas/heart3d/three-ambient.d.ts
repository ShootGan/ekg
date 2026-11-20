declare module 'three' {
  export class Vector2 {
    constructor(x?: number, y?: number);
    x: number;
    y: number;
  }

  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): this;
    setFromArray(a: ArrayLike<number>, offset?: number): this;
    copy(v: Vector3): this;
    clone(): Vector3;
    add(v: Vector3): this;
    addScaledVector(v: Vector3, s: number): this;
    sub(v: Vector3): this;
    subVectors(a: Vector3, b: Vector3): this;
    multiplyScalar(s: number): this;
    normalize(): this;
    length(): number;
    distanceTo(v: Vector3): number;
    crossVectors(a: Vector3, b: Vector3): this;
    applyAxisAngle(axis: Vector3, angle: number): this;
    lerp(v: Vector3, a: number): this;
    setScalar(s: number): this;
    toArray(): number[];
  }

  export class Euler {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): this;
  }

  export class Color {
    constructor(c?: number | string);
    r: number;
    g: number;
    b: number;
    set(c: number | string): this;
    setRGB(r: number, g: number, b: number): this;
    clone(): Color;
  }

  export class Material {
    dispose(): void;
    transparent: boolean;
    opacity: number;
    visible: boolean;
  }

  export class MeshBasicMaterial extends Material {
    constructor(p?: Record<string, unknown>);
    color: Color;
    map: Texture | null;
    side: number;
    depthWrite: boolean;
    blending: number;
  }

  export class MeshStandardMaterial extends Material {
    constructor(p?: Record<string, unknown>);
    color: Color;
    emissive: Color;
    emissiveIntensity: number;
    vertexColors: boolean;
    side: number;
    roughness: number;
    metalness: number;
  }

  export class Texture {
    needsUpdate: boolean;
    dispose(): void;
  }

  export class CanvasTexture extends Texture {
    constructor(canvas: HTMLCanvasElement | HTMLImageElement);
  }

  export class SpriteMaterial extends Material {
    constructor(p?: Record<string, unknown>);
    map: Texture | null;
    depthWrite: boolean;
    sizeAttenuation: boolean;
  }

  export class BufferAttribute {
    constructor(array: ArrayLike<number>, itemSize: number, normalized?: boolean);
    array: ArrayLike<number>;
    count: number;
    itemSize: number;
    needsUpdate: boolean;
    getX(i: number): number;
    getY(i: number): number;
    getZ(i: number): number;
    setX(i: number, v: number): this;
    setY(i: number, v: number): this;
    setZ(i: number, v: number): this;
    setXYZ(i: number, x: number, y: number, z: number): this;
  }

  export class BufferGeometry {
    attributes: Record<string, BufferAttribute>;
    setAttribute(name: string, attr: BufferAttribute): this;
    getAttribute(name: string): BufferAttribute;
    setIndex(index: BufferAttribute | number[]): this;
    computeVertexNormals(): void;
    rotateX(a: number): this;
    rotateY(a: number): this;
    rotateZ(a: number): this;
    translate(x: number, y: number, z: number): this;
    dispose(): void;
  }

  export class SphereGeometry extends BufferGeometry {
    constructor(radius?: number, widthSegments?: number, heightSegments?: number);
  }

  export class BoxGeometry extends BufferGeometry {
    constructor(w?: number, h?: number, d?: number);
  }

  export class ConeGeometry extends BufferGeometry {
    constructor(radius?: number, height?: number, radialSegments?: number);
  }

  export class TorusGeometry extends BufferGeometry {
    constructor(radius?: number, tube?: number, radialSegments?: number, tubularSegments?: number);
  }

  export class Curve<T> {
    getPoint(t: number, target?: T): T;
    getPoints(n?: number): T[];
    getLength(): number;
  }

  export class CatmullRomCurve3 extends Curve<Vector3> {
    constructor(points?: Vector3[], closed?: boolean, curveType?: string, tension?: number);
  }

  export class TubeGeometry extends BufferGeometry {
    constructor(path: Curve<Vector3>, tubularSegments?: number, radius?: number, radialSegments?: number, closed?: boolean);
  }

  export class Object3D {
    constructor();
    position: Vector3;
    rotation: Euler;
    scale: Vector3;
    visible: boolean;
    name: string;
    children: Object3D[];
    add(...o: Object3D[]): this;
    remove(...o: Object3D[]): this;
    traverse(cb: (o: Object3D) => void): void;
    lookAt(x: number | Vector3, y?: number, z?: number): void;
    updateMatrixWorld(force?: boolean): void;
  }

  export class Group extends Object3D {}

  export class Scene extends Object3D {
    background: Color | null;
  }

  export class Camera extends Object3D {}

  export class PerspectiveCamera extends Camera {
    constructor(fov?: number, aspect?: number, near?: number, far?: number);
    fov: number;
    aspect: number;
    updateProjectionMatrix(): void;
  }

  export class Mesh extends Object3D {
    constructor(geometry?: BufferGeometry, material?: Material);
    geometry: BufferGeometry;
    material: MeshStandardMaterial;
  }

  export class Sprite extends Object3D {
    constructor(material?: SpriteMaterial);
    material: SpriteMaterial;
    center: Vector2;
  }

  export class Light extends Object3D {
    constructor(color?: number | string, intensity?: number);
    intensity: number;
  }

  export class AmbientLight extends Light {}

  export class DirectionalLight extends Light {}

  export class WebGLRenderer {
    constructor(params?: {
      canvas?: HTMLCanvasElement;
      antialias?: boolean;
      alpha?: boolean;
      powerPreference?: string;
      preserveDrawingBuffer?: boolean;
    });
    domElement: HTMLCanvasElement;
    setPixelRatio(v: number): void;
    setSize(w: number, h: number, updateStyle?: boolean): void;
    setClearColor(c: number | string, a?: number): void;
    render(scene: Object3D, camera: Camera): void;
    dispose(): void;
    forceContextLoss(): void;
    info: { memory: { geometries: number; textures: number }; render: { calls: number; triangles: number } };
  }

  export const FrontSide: number;
  export const BackSide: number;
  export const DoubleSide: number;
  export const NormalBlending: number;
  export const AdditiveBlending: number;

  export const MathUtils: {
    clamp(v: number, a: number, b: number): number;
    degToRad(d: number): number;
    lerp(a: number, b: number, t: number): number;
  };
}
