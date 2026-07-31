varying float vGlow;

void main() {
  if (vGlow < 0.01) discard;

  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;

  // Tight core with a wide soft halo — the halo is what makes a 3px dot look
  // like it is emitting rather than just being a bright pixel.
  float core = 1.0 - smoothstep(0.0, 0.16, r);
  float halo = 1.0 - smoothstep(0.10, 0.5, r);

  vec3 tint = vec3(0.42, 0.95, 0.86);
  float a = (core * 0.9 + halo * 0.35) * vGlow;

  gl_FragColor = vec4(tint, a);
}
