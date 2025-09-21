import { 
    AdditiveBlending, 
    BufferAttribute, 
    BufferGeometry, 
    Color, 
    DirectionalLight, 
    Points, 
    ShaderMaterial, 
    WebGLRenderer 
} from "three";
import { SceneBuilder } from "./SceneBuilder";

class GridPoints extends Points {
    public waveSpeed = 0.8;
    constructor(renderer: WebGLRenderer) {
        // ----- Dotted Wave (Points grid)
        const cols = 90;       // horizontal resolution
        const rows = 45;        // vertical resolution
        const gap = 0.9;       // dot spacing
        const amp = 2.2;        // wave amplitude
        const sizePx = 4;       // point size (pixels)

        const count = cols * rows;
        const positions = new Float32Array(count * 3);
        const phases = new Float32Array(count); // precomputed phase offsets for organic motion

        let i = 0;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const u = x / (cols - 1) - 0.5;
                const v = y / (rows - 1) - 0.5;

                positions[i * 3 + 0] = u * cols * gap;
                positions[i * 3 + 1] = v * rows * gap * 0.55; // squash vertically
                positions[i * 3 + 2] = 0;

                // radial offset so center peaks differently
                const dx = u * 2.0;
                const dy = v * 1.5;
                phases[i] = Math.hypot(dx, dy) * 2.4;

                i++;
            }
        }

        const geom = new BufferGeometry();
        geom.setAttribute("position", new BufferAttribute(positions, 3));
        geom.setAttribute("phase", new BufferAttribute(phases, 1));

        // Custom shader so points keep a crisp pixel size and glow slightly
        const mat = new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
            uTime: { value: 0 },
            uAmp: { value: amp },
            uSize: { value: sizePx * renderer.getPixelRatio() },
            uColorA: { value: new Color("#7a42ff") },
            uColorB: { value: new Color("#ff2e7e") },
        },
        vertexShader: /* glsl */ `
            uniform float uTime;
            uniform float uAmp;
            uniform float uSize;
            attribute float phase;
            varying float vMix;

            void main() {
            vec3 p = position;
            float wave = sin(phase + uTime) * uAmp;
            p.z += wave;

            // fade far points slightly
            float dist = length(p.xy) / 40.0;
            vMix = clamp(1.0 - dist, 0.0, 1.0);

            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = uSize * (0.75 + vMix * 0.75);
            }
        `,
        fragmentShader: /* glsl */ `
            precision mediump float;
            varying float vMix;
            uniform vec3 uColorA;
            uniform vec3 uColorB;

            void main() {
            // circular soft dot
            vec2 uv = gl_PointCoord * 2.0 - 1.0;
            float d = dot(uv, uv);
            float alpha = smoothstep(1.0, 0.2, d); // soft edge
            vec3 c = mix(uColorA, uColorB, vMix);
            gl_FragColor = vec4(c, alpha * 0.85);
            }
        `,
        });
        super(geom, mat);
    }

    public update(now: number) {
        const seconds = now * 0.001;
        ((this.material as ShaderMaterial).uniforms.uTime.value as number) = seconds * this.waveSpeed;
    }
}

class Grids extends SceneBuilder {
    public readonly points;
    constructor(canvas: HTMLCanvasElement) {
        super(canvas);
        const camera = this.camera;
        const scene = this.scene;
        camera.position.set(0, 18, 42);
        this.rebuildLights();

        const points = new GridPoints(this.renderer);
        points.position.set(0, -6, -12);     // push grid back & down
        points.rotation.x = -0.9;            // tilt like in the reference
        scene.add(points);
        this.points = points;
    }
    
    public rebuildLights() {
        this.scene.clear();
        // ----- Lights (subtle rim)
        const light = new DirectionalLight(0xffffff, 0.4);
        light.position.set(1, 2, 2);
        this.scene.add(light);
    }

    public override animate(now: number): void {
        const t = this.timestamp += 0.016;
        const camera = this.camera;
        camera.position.x = Math.sin(t * 0.2) * 2.0;
        camera.position.y = 18 + Math.sin(t * 0.13) * 0.6;
        camera.lookAt(0, 0, 0);
        this.points.update(now);
        super.animate(now);
    }
}

export {
    Grids
}