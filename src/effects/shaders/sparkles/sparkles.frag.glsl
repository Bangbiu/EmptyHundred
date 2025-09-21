// Sparkle – Fragment Shader (proper superellipse with derivative AA)
#extension GL_OES_standard_derivatives : enable
#ifdef GL_ES
precision mediump float;

#endif

varying float vBlink;
varying float vPhase;

uniform float uIntensity;        // 0.5..1.5
uniform float uSEExp;            // n: 2=circle, 4=squircle, 6+=boxier
uniform vec2  uSERadii;          // (a, b) radii in point-space (<=1.0)
uniform vec3  uColor;

void main() {
  // uv in [-1,1] (point sprite quad)
  vec2 p = gl_PointCoord * 2.0 - 1.0;

  // Superellipse implicit function:
  // f(p) = (|x|/a)^n + (|y|/b)^n - 1;  inside => f <= 0
  vec2 q = abs(p) / max(uSERadii, vec2(1e-4));
  float f = pow(q.x, uSEExp) + pow(q.y, uSEExp) - 1.0;

  // Derivative-based antialiasing around the *true* boundary f=0
  float w = fwidth(f);                       // AA width in f-space
  float mask = 1.0 - smoothstep(0.0, w, f);  // 1 inside, 0 outside with smooth edge

  // If you want perfectly crisp edges, uncomment the hard cut:
  // if (f > 0.0) discard;

  // Small stable per-sparkle variation (doesn't cause square bleed)
  float twinkle = 0.90 + 0.10 * fract(sin(vPhase * 43758.5453123));

  float alpha = mask * vBlink * twinkle * uIntensity;
  if (alpha <= 0.0) discard;

  gl_FragColor = vec4(uColor, alpha);
}
