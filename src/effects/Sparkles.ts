import * as THREE from "three";
import vert from "./shaders/sparkles/sparkles.vert.glsl?raw";
import frag from "./shaders/sparkles/sparkles.frag.glsl?raw";

type SparkleOpts = {
    count?: number;        // number of sparkles
    diskRadius?: number;   // disk radius around emblem origin
    height?: number;       // y offset above emblem
    sizePx?: number;       // nominal pixel size
    intensity?: number;    // 0.5..1.5
    blinkRate?: number;    // blinks per second (e.g., 1.5)
    seExponent?: number;   // superellipse exponent (2..8). 2=circle, 4=squircle
    color?: THREE.ColorRepresentation;
    depthTest?: boolean;   // true hides behind emblem
};

export class SparkleField extends THREE.Points {
  private mat: THREE.ShaderMaterial;
  private start = performance.now();

  constructor(opts: SparkleOpts = {}) {
    const {
      count = 140,
      diskRadius = 0.65,
      height = 0.14,
      sizePx = 7,
      intensity = 1.0,
      blinkRate = 1.6,
      seExponent = 4.0,                // nice squircle
      color = 0xffffff,
      depthTest = true,
    } = opts;

    // --- Disk distribution (uniform) ---
    // r = R * sqrt(u), theta in [0,2π)
    const pos = new Float32Array(count * 3);
    const aPhase = new Float32Array(count);
    const aSize  = new Float32Array(count);
    const aBlink = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const r = diskRadius * Math.sqrt(u);
      const th = Math.random() * Math.PI * 2;

      pos[i * 3 + 0] = Math.cos(th) * r;
      pos[i * 3 + 1] = height + (Math.random() - 0.5) * 0.02; // light variance
      pos[i * 3 + 2] = Math.sin(th) * r;

      aPhase[i] = Math.random();
      aSize[i]  = 0.85 + Math.random() * 0.35;      // 0.85..1.2
      aBlink[i] = (Math.random() - 0.5) * 0.25;     // -0.125..0.125s jitter
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(aPhase, 1));
    geo.setAttribute("aSize",  new THREE.BufferAttribute(aSize,  1));
    geo.setAttribute("aBlinkJit", new THREE.BufferAttribute(aBlink, 1));
    geo.computeBoundingSphere();

    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: depthTest,
      uniforms: {
        uTime:      { value: 0 },
        uSizePx:    { value: sizePx * Math.min(window.devicePixelRatio || 1, 2) },
        uBlinkRate: { value: blinkRate },
        uIntensity: { value: intensity },
        uSEExp:     { value: seExponent },
        uColor:     { value: new THREE.Color(color) },
      },
    });

    super(geo, mat);
    this.mat = mat;

    // follow the emblem
    this.renderOrder = 2;
  }

  update() {
    const t = (performance.now() - this.start) * 0.001;
    this.mat.uniforms.uTime.value = t;
  }

  dispose() {
    (this.geometry as THREE.BufferGeometry).dispose();
    this.mat.dispose();
    this.parent?.remove(this);
  }
}
