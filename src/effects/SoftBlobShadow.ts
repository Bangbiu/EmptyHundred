import { Color, Mesh, MultiplyBlending, PlaneGeometry, ShaderMaterial, type ColorRepresentation } from "three";

type ShadowOpts = {
    baseSize?: number;        // diameter at hoverHeight = 0
    sizePerUnit?: number;     // how much the shadow grows per unit of hover height
    maxOpacity?: number;      // peak opacity at hoverHeight = 0
    opacityFalloff?: number;  // how fast opacity fades as it rises
    color?: ColorRepresentation;
};

class SoftBlobShadow extends Mesh {
    material: ShaderMaterial;
    baseSize: number;
    sizePerUnit: number;
    maxOpacity: number;
    opacityFalloff: number;

    constructor(opts: ShadowOpts = {}) {
        const {
            baseSize = 1.2,
            sizePerUnit = 0.6,
            maxOpacity = 0.35,
            opacityFalloff = 0.08,
            color = 0x000000,
        } = opts;

        const geom = new PlaneGeometry(1, 1, 1, 1);
        const material = new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        premultipliedAlpha: true,
        blending: MultiplyBlending,
        uniforms: {
            uOpacity: { value: maxOpacity },
            uColor:   { value: new Color(color) },
            uPower:   { value: 2.2 }, // edge softness: higher = tighter center, softer edge
        },
        vertexShader: `
            varying vec2 vUv;
            void main(){
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            uniform float uOpacity;
            uniform float uPower;
            uniform vec3  uColor;
            void main(){
            // radial distance from center (0 at center, ~1 at edge)
            vec2 p = vUv - 0.5;
            float r = length(p) * 2.0;

            // soft falloff: smoothstep for feathered edge + power for center weight
            float m = smoothstep(1.0, 0.0, r);
            m = pow(m, uPower);

            // final alpha
            float a = m * uOpacity;

            // premultiplied-style look with Multiply blending
            gl_FragColor = vec4(uColor * a, a);
            }
        `,
        polygonOffset: true,
        polygonOffsetFactor: -1, // nudge above the floor slightly to avoid z-fighting
        });

        super(geom, material);
        this.material = material;

        this.rotation.x = -Math.PI * 0.5; // lay flat
        this.renderOrder = 1000;          // draw after most geometry

        this.baseSize = baseSize;
        this.sizePerUnit = sizePerUnit;
        this.maxOpacity = maxOpacity;
        this.opacityFalloff = opacityFalloff;

        // initialize scale (plane is 1x1, so scale is diameter)
        this.scale.set(this.baseSize, 1, this.baseSize);

        // const pin = new Mesh(new BoxGeometry(0.1,0.1,0.1), new MeshLambertMaterial({
        //     color: "white"
        // }));
        // pin.rotation.y = Math.PI / 4;
        // this.add(pin);
    }

    /** Call every frame with the emblem's hover height (in scene units). */
    updateFromHover(hoverHeight: number) {
        const s = Math.max(0.0001, this.baseSize + this.sizePerUnit * hoverHeight);
        this.scale.set(s, 1, s);

        // fade out slightly as emblem rises
        const targetOpacity = Math.max(0.0, this.maxOpacity - this.opacityFalloff * hoverHeight);
        (this.material.uniforms.uOpacity as any).value = targetOpacity;
    }
}

export {
    SoftBlobShadow
}