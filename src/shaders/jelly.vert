uniform float uTime;
uniform float uDepth;

attribute float aPart;
attribute float aDrop;
attribute float aPhase;
attribute float aSpeed;
attribute float aBand;
attribute float aSpan;

varying vec3 vNormal;
varying vec3 vViewDir;
varying float vPart;
varying float vDrop;
varying float vFade;
varying float vPulse;

void main() {
  vec3 pos = position;

  // The pulse travels down the animal rather than happening all at once —
  // crown first, tentacle tips last. That delay is the whole illusion.
  float pulse = sin(uTime * aSpeed * 1.6 + aPhase - aDrop * 2.6);

  if (aPart < 0.5) {
    // Bell contracts radially and stretches vertically, conserving rough volume.
    float squeeze = 1.0 - pulse * 0.16;
    pos.xz *= squeeze;
    pos.y *= 1.0 + pulse * 0.20;
  } else {
    // Tentacles trail, swinging wider the further from the bell they are.
    float sway = sin(uTime * aSpeed * 1.2 + aPhase - aDrop * 3.4);
    pos.xz *= 1.0 - pulse * 0.10;
    pos.x += sway * 0.10 * aDrop;
    pos.z += cos(uTime * aSpeed * 0.9 + aPhase - aDrop * 3.0) * 0.08 * aDrop;
  }

  vec4 world = instanceMatrix * vec4(pos, 1.0);

  // Jellies rise slowly and wrap, so the band never empties as you scroll.
  world.y += mod(uTime * aSpeed * 0.16 + aPhase * 5.0, 16.0) - 8.0;
  world.x += sin(uTime * aSpeed * 0.22 + aPhase) * 0.5;

  vFade = 1.0 - smoothstep(0.0, aSpan, abs(uDepth - aBand));

  vec4 view = viewMatrix * world;
  vNormal = normalize(mat3(instanceMatrix) * normal);
  vViewDir = normalize(-view.xyz);
  vPart = aPart;
  vDrop = aDrop;
  vPulse = pulse;

  gl_Position = projectionMatrix * view;
}
