#include ./chunks/noise.glsl

uniform float uTime;
uniform float uDepth;   // 0 at the surface, 1 at the bottom of the descent
uniform float uAspect;

varying vec2 vUv;

/**
 * The water is NEUTRAL. It runs teal -> deep blue-green -> near black, and it
 * never picks up a violet cast on the way down. The only warm hue on this page
 * belongs to the fish; if the water competes, the page has two accents and the
 * fish stops being the thing your eye tracks.
 */
vec3 waterColor(float d) {
  vec3 surface = vec3(0.14, 0.40, 0.44);
  vec3 upper   = vec3(0.05, 0.23, 0.29);
  vec3 mid     = vec3(0.02, 0.13, 0.19);
  vec3 deep    = vec3(0.005, 0.040, 0.065);
  vec3 abyss   = vec3(0.002, 0.010, 0.018);

  vec3 c = mix(surface, upper, smoothstep(0.00, 0.20, d));
  c = mix(c, mid,   smoothstep(0.18, 0.44, d));
  c = mix(c, deep,  smoothstep(0.42, 0.72, d));
  c = mix(c, abyss, smoothstep(0.70, 1.00, d));
  return c;
}

/** Overlapping distorted cells — the bright web of light on shallow water. */
float caustics(vec2 uv, float t) {
  vec2 p = uv * 5.0;
  float a = fbm(vec3(p, t * 0.18));
  float b = fbm(vec3(p * 1.7 + 4.3, t * 0.24));
  float web = abs(a - b);
  return pow(1.0 - clamp(web * 2.4, 0.0, 1.0), 6.0);
}

/** Vertical shafts from the surface, swaying and softening as they descend. */
float lightShafts(vec2 uv, float t) {
  float x = uv.x * uAspect;
  float sway = snoise(vec3(x * 1.2, t * 0.09, 0.0)) * 0.16;
  float beams = fbm(vec3((x + sway) * 2.6, uv.y * 0.35 - t * 0.02, 7.1));
  beams = smoothstep(0.06, 0.85, beams);
  // Shafts are born at the surface and are gone well before the halfway point.
  return beams * pow(clamp(uv.y, 0.0, 1.0), 1.6);
}

void main() {
  vec2 uv = vUv;
  float d = clamp(uDepth, 0.0, 1.0);

  vec3 color = waterColor(d);

  // Light from above, always. Even in the abyss there is a faint gradient,
  // because a flat black rectangle reads as a bug rather than as darkness.
  float fromAbove = pow(clamp(uv.y, 0.0, 1.0), 2.2);
  color += waterColor(max(d - 0.16, 0.0)) * fromAbove * (0.30 - d * 0.24);

  // Caustics live in the top fifth of the descent only.
  float causticFade = 1.0 - smoothstep(0.02, 0.22, d);
  if (causticFade > 0.001) {
    float c = caustics(uv * vec2(uAspect, 1.0), uTime);
    color += vec3(0.42, 0.80, 0.78) * c * causticFade * 0.16 * fromAbove;
  }

  // Shafts persist a little longer, then go.
  float shaftFade = 1.0 - smoothstep(0.05, 0.42, d);
  if (shaftFade > 0.001) {
    float s = lightShafts(uv, uTime);
    color += vec3(0.38, 0.70, 0.74) * s * shaftFade * 0.16;
  }

  // Vignette tightens with depth — pressure, closing in.
  vec2 vig = (uv - 0.5) * vec2(uAspect, 1.0);
  float vignette = 1.0 - dot(vig, vig) * (0.55 + d * 1.25);
  color *= clamp(vignette, 0.0, 1.0);

  // Break up banding in the very dark ranges, where 8-bit steps are visible.
  float dither = (fract(sin(dot(uv * 1024.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  color += dither;

  gl_FragColor = vec4(color, 1.0);
}
