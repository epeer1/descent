uniform float uTime;
uniform float uDepth;
uniform float uPixelRatio;

attribute float aSize;
attribute float aSpeed;
attribute float aPhase;

varying float vGlow;

void main() {
  vec3 pos = position;

  pos.y += mod(uTime * aSpeed * 0.12 + aPhase * 11.0, 15.0) - 7.5;
  pos.x += sin(uTime * aSpeed * 0.3 + aPhase * 8.0) * 0.6;

  vec4 view = viewMatrix * modelMatrix * vec4(pos, 1.0);

  // Each mote blinks on its own clock and is dark most of the time. A field of
  // steadily-lit dots reads as a starfield; intermittency reads as alive.
  float blink = sin(uTime * (0.5 + aSpeed) + aPhase * 21.0);
  float on = smoothstep(0.55, 0.98, blink);

  // Bioluminescence belongs to the deep. Above the twilight zone there is
  // still enough sunlight that nothing would bother.
  vGlow = on * smoothstep(0.30, 0.62, uDepth);

  gl_PointSize = aSize * uPixelRatio * (26.0 / -view.z) * (0.5 + on * 0.8);
  gl_Position = projectionMatrix * view;
}
