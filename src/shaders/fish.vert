uniform float uTime;
uniform float uSwim;    // stroke rate multiplier

attribute float aPart;  // 0 = body, 1 = fin membrane

varying vec3 vNormal;
varying vec3 vViewDir;
varying float vPart;
varying float vAlongBody;
varying vec3 vLocalPos;

void main() {
  vec3 pos = position;
  vLocalPos = position;

  // The fish runs along +X, nose at x = 0.5, tail at x = -0.7. The wave has
  // almost no amplitude at the head and the most at the tail, which is what
  // makes it read as swimming rather than as a wobbling object.
  float along = clamp((0.5 - pos.x) / 1.2, 0.0, 1.0);
  float weight = pow(along, 1.9);

  float phase = uTime * uSwim - along * 4.2;
  pos.z += sin(phase) * 0.20 * weight;
  // Yaw into the stroke so the body follows its own curve.
  pos.x += cos(phase) * 0.045 * weight * weight;

  // Fins trail the body slightly — they are membrane, not muscle.
  if (aPart > 0.5) {
    pos.z += sin(phase - 0.9) * 0.10 * weight;
    pos.y += sin(uTime * uSwim * 0.7 + along * 3.0) * 0.02;
  }

  vec4 world = modelMatrix * vec4(pos, 1.0);
  vec4 view = viewMatrix * world;

  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-view.xyz);
  vPart = aPart;
  vAlongBody = along;

  gl_Position = projectionMatrix * view;
}
