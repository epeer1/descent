// Fullscreen pass. Ignores the camera entirely — the plane is written straight
// to clip space so it always covers the viewport regardless of camera state.
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
