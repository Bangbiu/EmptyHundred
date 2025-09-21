uniform float uTime;
uniform float uPixelRatio;
attribute float phase;
attribute float speed;
attribute float psize;
varying float vBlink;

void main() {
    float t = uTime * speed + phase;
    vBlink = 0.5 + 0.5 * sin(t);   // blink 0..1

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = psize * (300.0 / -mvPosition.z) / uPixelRatio;
    gl_Position = projectionMatrix * mvPosition;
}
