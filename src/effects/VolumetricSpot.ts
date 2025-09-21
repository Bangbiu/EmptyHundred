// VolumetricSpot.ts
import * as THREE from "three";

export class VolumetricSpot extends THREE.Mesh {
    public material: THREE.ShaderMaterial;

    constructor(length: number, angle: number, color = 0xffffff, opacity = 0.35) {
        // cone radius from spotlight angle
        const radius = Math.tan(angle) * length;

        // Cone axis is +Y by default; rotate so axis is +Z (so lookAt works)
        const geom = new THREE.ConeGeometry(radius, length, 64, 1, true);
        geom.translate(0, -length * 0.5, 0);      // tip at mesh origin
        geom.rotateY(Math.PI * 0.37);                // axis -> +Z

        const mat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            depthTest: true,                         // emblem can occlude the beam
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            uniforms: {
                uTime:   { value: 0 },
                uColor:  { value: new THREE.Color(color) },
                uAlpha:  { value: opacity },
            },
        vertexShader: /* glsl */`
            varying vec2 vUv;
            varying float vLen;
            void main() {
            vUv = uv;
            vec4 wp = modelViewMatrix * vec4(position, 1.0);
            vLen = -wp.z; // distance in view space for a tiny depth-based fade
            gl_Position = projectionMatrix * wp;
            }
        `,
        fragmentShader: /* glsl */`
            precision mediump float;
            varying vec2 vUv;
            varying float vLen;
            uniform vec3  uColor;
            uniform float uAlpha;
            uniform float uTime;

            // cheap animated noise
            float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
            float noise(vec2 p){
            vec2 i = floor(p), f = fract(p);
            float a = hash(i), b = hash(i + vec2(1.,0.));
            float c = hash(i + vec2(0.,1.)), d = hash(i + vec2(1.,1.));
            vec2 u = f*f*(3.-2.*f);
            return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
            }

            void main(){
            // vUv.x ~ around cone; vUv.y ~ along cone from tip(0) -> base(1)
            float axial  = 1.0 - pow(vUv.y, 1.6);     // fade along length
            float radial = 1.0 - pow(vUv.x, 1.8);     // fade from axis outward
            float n = noise(vec2(vUv.x*6.0, vUv.y*8.0 + uTime*0.6)); // wispy flow
            float fog = smoothstep(0.0, 80.0, vLen);  // subtle distance fade

            float a = axial * radial;
            a *= mix(0.75, 1.2, n);   // dither
            a *= uAlpha;
            gl_FragColor = vec4(uColor, a);
            }
        `,
        });

        super(geom, mat);
        this.material = mat;
        this.renderOrder = 2; // render after opaque meshes
    }

    update(t: number) {
        this.material.uniforms.uTime.value = t;
        this.rotation
    }
}
