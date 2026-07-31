uniform float uTime;
uniform float uDepth;
uniform float uPixelRatio;

attribute float aSize;
attribute float aSpeed;
attribute float aPhase;

varying float vAlpha;

void main() {
  vec3 pos = position;

  // We are descending, so detritus rises past the camera. Wrapped over a fixed
  // column height so the field never runs out.
  float rise = mod(uTime * aSpeed * 0.35 + aPhase * 9.0, 14.0);
  pos.y = pos.y + rise - 7.0;
  pos.x += sin(uTime * aSpeed * 0.4 + aPhase * 6.2) * 0.35;

  vec4 view = viewMatrix * modelMatrix * vec4(pos, 1.0);

  // Marine snow thickens with depth — it is the main cue that you are getting
  // somewhere, once the light is gone and colour can no longer do the work.
  vAlpha = smoothstep(0.04, 0.50, uDepth) * 0.62 + 0.05;

  gl_PointSize = aSize * uPixelRatio * (24.0 / -view.z);
  gl_Position = projectionMatrix * view;
}
