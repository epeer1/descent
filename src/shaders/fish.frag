uniform vec3 uAccent;
uniform float uDepth;

varying vec3 vNormal;
varying vec3 vViewDir;
varying float vPart;
varying float vAlongBody;
varying vec3 vLocalPos;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 view = normalize(vViewDir);

  // Light comes from the surface, so it comes from above. As we descend there
  // is less of it, but never zero — the fish is the last lit thing here, and
  // the page has nothing left to look at if it goes fully dark.
  vec3 sun = normalize(vec3(0.15, 1.0, 0.35));
  float lambert = clamp(dot(normal, sun), 0.0, 1.0);
  float ambient = mix(0.58, 0.20, uDepth);
  float key = mix(0.95, 0.34, uDepth);

  // Rim picks the silhouette off a dark background.
  float fresnel = pow(1.0 - clamp(dot(normal, view), 0.0, 1.0), 2.6);

  // Belly is paler than the back — countershading, which every fish has and
  // which does most of the work of reading as "fish" rather than "orange tube".
  float belly = smoothstep(-0.35, 0.45, -normal.y);

  // Procedural scales. Rows of overlapping arcs in cylindrical coordinates
  // around the body axis, staggered every other row. Costs nothing, and it is
  // the difference between "orange surface" and "fish" at close range.
  float scaleShade = 0.0;
  if (vPart < 0.5) {
    float ring = atan(vLocalPos.z, vLocalPos.y);
    vec2 q = vec2(vLocalPos.x * 26.0, ring * 3.6);
    q.y += 0.5 * step(1.0, mod(floor(q.x), 2.0));
    vec2 cell = fract(q) - 0.5;
    float d = length(cell * vec2(1.0, 1.25));
    scaleShade = smoothstep(0.30, 0.46, d);
    // Fade the pattern out at the nose and into the tail, where real scales
    // get too small to resolve anyway.
    scaleShade *= smoothstep(0.0, 0.18, vAlongBody) * (1.0 - smoothstep(0.62, 0.9, vAlongBody));
  }

  vec3 base = uAccent;
  vec3 back = mix(base, vec3(0.85, 0.34, 0.06), 0.35);
  vec3 pale = mix(base, vec3(1.0, 0.88, 0.62), 0.70);
  vec3 body = mix(back, pale, belly * 0.75);

  // Slight darkening toward the tail keeps the eye at the head.
  body *= mix(1.0, 0.82, vAlongBody);
  // Scale edges read as a faint darkening, plus a sheen where they catch light.
  body *= 1.0 - scaleShade * 0.16;
  body += uAccent * scaleShade * lambert * 0.10;

  vec3 color = body * (ambient + lambert * key);
  color += mix(uAccent, vec3(1.0, 0.82, 0.55), 0.4) * fresnel * mix(0.34, 0.22, uDepth);

  // Eye, painted rather than modelled — an extra sphere would cost a draw call
  // and this is the single detail that makes the silhouette read as an animal.
  if (vPart < 0.5) {
    vec3 eye = vec3(0.255, 0.055, 0.0);
    vec2 d2 = vec2(vLocalPos.x - eye.x, vLocalPos.y - eye.y);
    float r = length(vec2(d2.x * 1.05, d2.y)) ;
    float onSide = smoothstep(0.055, 0.085, abs(vLocalPos.z));
    float pupil = (1.0 - smoothstep(0.030, 0.038, r)) * onSide;
    float ring  = (1.0 - smoothstep(0.044, 0.054, r)) * onSide;
    color = mix(color, vec3(0.97, 0.90, 0.76), ring * 0.85);
    color = mix(color, vec3(0.02, 0.02, 0.03), pupil);
    // Catchlight, so the eye is not a dead dot.
    float spec = 1.0 - smoothstep(0.006, 0.011, length(d2 - vec2(0.010, 0.009)));
    color = mix(color, vec3(1.0), spec * onSide * 0.9);
  }

  // Fins are thin membrane: paler, translucent, and they catch the rim harder.
  float alpha = 1.0;
  if (vPart > 0.5) {
    // Membrane, not muscle: it keeps the accent hue but thins out toward the
    // edge so the water reads through it. Opaque fins turn a fish into a toy.
    // Keep the fin firmly in the accent hue. Thinning it too far let the teal
    // water read through and the tail turned grey — which detached it from the
    // body and cost the fish its silhouette.
    color = mix(color, uAccent * 1.25, 0.75);
    color += vec3(1.0, 0.86, 0.62) * fresnel * 0.22;
    alpha = mix(0.94, 0.42, pow(vAlongBody, 1.6));
  }

  gl_FragColor = vec4(color, alpha);
}
