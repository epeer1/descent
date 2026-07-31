uniform float uDepth;

varying vec3 vNormal;
varying vec3 vViewDir;
varying float vPart;
varying float vDrop;
varying float vFade;
varying float vPulse;

void main() {
  if (vFade < 0.01) discard;

  vec3 normal = normalize(vNormal);
  vec3 view = normalize(vViewDir);

  // Almost entirely rim light. A jellyfish is mostly water, so a diffuse term
  // makes it look like a solid rubber dome — the fresnel edge IS the animal.
  float fresnel = pow(1.0 - clamp(abs(dot(normal, view)), 0.0, 1.0), 1.8);

  // Cold, and firmly in the water's own hue family. Bioluminescence is real
  // and blue-green; a warm glow here would read as a second accent and start
  // competing with the fish, which is the one thing that must stay warm.
  vec3 tissue = mix(vec3(0.30, 0.55, 0.62), vec3(0.10, 0.28, 0.36), uDepth);
  vec3 glow = vec3(0.35, 0.92, 0.85);

  // The rim brightens as the bell contracts, so the pulse is visible even in
  // near-total darkness where the silhouette alone would be lost.
  float lit = 0.35 + max(vPulse, 0.0) * 0.55;

  vec3 color = tissue * 0.5 + glow * fresnel * lit * 0.85;

  float alpha;
  if (vPart < 0.5) {
    alpha = (0.10 + fresnel * 0.55) * vFade;
  } else {
    // Tentacles fade out along their length instead of ending in a hard cut.
    color += glow * 0.12;
    alpha = (0.30 * (1.0 - vDrop)) * vFade;
  }

  // They get relatively brighter as the water goes black — down here they are
  // making their own light, which is exactly what the 620 m entry claims.
  alpha *= mix(0.55, 1.0, smoothstep(0.15, 0.6, uDepth));

  gl_FragColor = vec4(color, alpha);
}
