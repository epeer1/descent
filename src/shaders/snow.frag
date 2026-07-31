uniform float uDepth;

varying float vAlpha;

void main() {
  // Soft round particle. gl_PointCoord is cheaper than a texture and there is
  // nothing here a texture would buy us.
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d);
  if (r > 0.25) discard;

  float falloff = 1.0 - smoothstep(0.0, 0.25, r);
  vec3 tint = mix(vec3(0.62, 0.78, 0.78), vec3(0.42, 0.55, 0.60), uDepth);

  gl_FragColor = vec4(tint, falloff * falloff * vAlpha * 0.55);
}
