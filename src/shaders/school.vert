uniform float uTime;
uniform float uDepth;

attribute float aPhase;
attribute float aSpeed;
attribute float aBand;   // depth this creature belongs to
attribute float aSpan;   // how wide its depth band is

varying vec3 vNormal;
varying vec3 vViewDir;
varying float vFade;
varying float vAlong;

void main() {
  vec3 pos = position;

  float along = clamp((0.5 - pos.x) / 1.2, 0.0, 1.0);
  float weight = pow(along, 1.9);
  float phase = uTime * aSpeed * 5.5 + aPhase;
  pos.z += sin(phase - along * 4.2) * 0.22 * weight;

  vec4 world = instanceMatrix * vec4(pos, 1.0);

  // Lateral drift, wrapped. Each creature crosses the frame and reappears.
  float travel = mod(uTime * aSpeed * 0.5 + aPhase * 2.7, 22.0) - 11.0;
  world.x += travel;
  world.y += sin(uTime * aSpeed * 0.8 + aPhase) * 0.35;

  // Creatures only exist near their own depth band, so the population of the
  // ocean changes as you descend instead of the same fish following you down.
  vFade = 1.0 - smoothstep(0.0, aSpan, abs(uDepth - aBand));

  vec4 view = viewMatrix * world;
  vNormal = normalize(mat3(instanceMatrix) * normal);
  vViewDir = normalize(-view.xyz);
  vAlong = along;

  gl_Position = projectionMatrix * view;
}
