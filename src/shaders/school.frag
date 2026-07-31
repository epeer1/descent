uniform float uDepth;

varying vec3 vNormal;
varying vec3 vViewDir;
varying float vFade;
varying float vAlong;

void main() {
  if (vFade < 0.01) discard;

  vec3 normal = normalize(vNormal);
  vec3 view = normalize(vViewDir);

  // Everything that is not the goldfish stays cold and desaturated. These are
  // silhouettes and suggestions, not characters — the moment one of them gets
  // a warm tone the page has two subjects and neither wins.
  vec3 cold = mix(vec3(0.34, 0.52, 0.55), vec3(0.06, 0.16, 0.22), uDepth);

  float sun = clamp(dot(normal, normalize(vec3(0.15, 1.0, 0.35))), 0.0, 1.0);
  float fresnel = pow(1.0 - clamp(dot(normal, view), 0.0, 1.0), 2.2);

  vec3 color = cold * (0.30 + sun * 0.55) + cold * fresnel * 0.7;
  color *= mix(1.0, 0.7, vAlong);

  // They read as distant water, not as objects sitting on top of it.
  float alpha = vFade * mix(0.55, 0.30, uDepth);

  gl_FragColor = vec4(color, alpha);
}
