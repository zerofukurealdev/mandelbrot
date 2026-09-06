const FRAG_BODY = `
uniform vec2 uCenter;
uniform float uScale;
uniform vec2 uResolution;
uniform float uMaxIter;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform vec3 uD;
uniform float uColorScale;
uniform vec3 uInterior;

vec3 palette(float t) {
  return clamp(uA + uB * cos(6.28318530718 * (uC * t + uD)), 0.0, 1.0);
}

void main() {
  vec2 res = uResolution;
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / res.y;
  vec2 c = uCenter + uv * (uScale * 2.0);
  vec2 z = vec2(0.0);
  float i = 0.0;
  float escaped = 0.0;
  vec2 zEsc = z;
  const int MAX = 1024;
  for (int n = 0; n < MAX; n++) {
    if (i >= uMaxIter) break;
    float x = z.x * z.x - z.y * z.y + c.x;
    float y = 2.0 * z.x * z.y + c.y;
    z = vec2(x, y);
    i += 1.0;
    if (dot(z, z) > 256.0) {
      escaped = 1.0;
      zEsc = z;
      break;
    }
  }
  vec3 col = uInterior;
  if (escaped > 0.5) {
    float logZn = log(dot(zEsc, zEsc)) * 0.5;
    float nu = log(max(logZn * 1.44269504089, 1e-6)) * 1.44269504089;
    float mu = i + 1.0 - nu;
    col = palette(mu * uColorScale);
  }
  float rnd = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (rnd - 0.5) / 255.0;
  FRAG_OUT
}
`;

export function vertexSource(webgl2: boolean): string {
  if (webgl2) {
    return `#version 300 es
in vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;
  }
  return `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;
}

export function fragmentSource(webgl2: boolean): string {
  const body = FRAG_BODY.replace(
    "FRAG_OUT",
    webgl2 ? "fragColor = vec4(col, 1.0);" : "gl_FragColor = vec4(col, 1.0);",
  );
  if (webgl2) {
    return `#version 300 es
precision highp float;
out vec4 fragColor;
${body}`;
  }
  return `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
${body}`;
}
