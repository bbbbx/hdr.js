attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  gl_Position = vec4(aPosition, 0, 1);
  vUv = (gl_Position.xy / gl_Position.w);
  vUv = vUv * 0.5 + 0.5;
}