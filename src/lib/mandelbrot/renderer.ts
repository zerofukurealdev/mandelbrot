import { getPalette } from "./palettes";
import { fragmentSource, vertexSource } from "./shaders";
import type { PaletteId, View } from "./types";

export type Quality = "draft" | "full";

type Uniforms = {
  center: WebGLUniformLocation | null;
  scale: WebGLUniformLocation | null;
  resolution: WebGLUniformLocation | null;
  maxIter: WebGLUniformLocation | null;
  a: WebGLUniformLocation | null;
  b: WebGLUniformLocation | null;
  c: WebGLUniformLocation | null;
  d: WebGLUniformLocation | null;
  colorScale: WebGLUniformLocation | null;
  interior: WebGLUniformLocation | null;
};

const INTERIOR: [number, number, number] = [0.027, 0.027, 0.039];

function compile(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("No se pudo crear el shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "error de shader";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

function link(
  gl: WebGLRenderingContext,
  vs: WebGLShader,
  fs: WebGLShader,
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error("No se pudo crear el programa WebGL.");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "error de enlace";
    gl.deleteProgram(program);
    throw new Error(log);
  }
  return program;
}

export class MandelbrotRenderer {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private buffer: WebGLBuffer;
  private uniforms: Uniforms;
  private view: View = { re: -0.5, im: 0, scale: 1.15 };
  private iter = 220;
  private paletteId: PaletteId = "ember";
  private quality: Quality = "full";
  private cssW = 1;
  private cssH = 1;
  private scheduled = false;
  private disposed = false;
  private lost = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const opts: WebGLContextAttributes = {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
    };
    const gl2 = canvas.getContext("webgl2", opts);
    const gl =
      gl2 ??
      canvas.getContext("webgl", opts) ??
      canvas.getContext("experimental-webgl", opts);
    if (!gl) {
      throw new Error("Este navegador no admite WebGL.");
    }
    this.gl = gl as WebGLRenderingContext;
    const webgl2 = Boolean(gl2);
    const vs = compile(this.gl, this.gl.VERTEX_SHADER, vertexSource(webgl2));
    const fs = compile(
      this.gl,
      this.gl.FRAGMENT_SHADER,
      fragmentSource(webgl2),
    );
    this.program = link(this.gl, vs, fs);
    this.gl.deleteShader(vs);
    this.gl.deleteShader(fs);

    const buffer = this.gl.createBuffer();
    if (!buffer) throw new Error("No se pudo crear el buffer.");
    this.buffer = buffer;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      this.gl.STATIC_DRAW,
    );

    const loc = this.gl.getAttribLocation(this.program, "aPos");
    this.gl.useProgram(this.program);
    this.gl.enableVertexAttribArray(loc);
    this.gl.vertexAttribPointer(loc, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.disable(this.gl.DEPTH_TEST);
    this.gl.disable(this.gl.BLEND);

    this.uniforms = {
      center: this.gl.getUniformLocation(this.program, "uCenter"),
      scale: this.gl.getUniformLocation(this.program, "uScale"),
      resolution: this.gl.getUniformLocation(this.program, "uResolution"),
      maxIter: this.gl.getUniformLocation(this.program, "uMaxIter"),
      a: this.gl.getUniformLocation(this.program, "uA"),
      b: this.gl.getUniformLocation(this.program, "uB"),
      c: this.gl.getUniformLocation(this.program, "uC"),
      d: this.gl.getUniformLocation(this.program, "uD"),
      colorScale: this.gl.getUniformLocation(this.program, "uColorScale"),
      interior: this.gl.getUniformLocation(this.program, "uInterior"),
    };

    canvas.addEventListener("webglcontextlost", this.onLost);
    canvas.addEventListener("webglcontextrestored", this.onRestored);
  }

  setView(view: View, iter: number, paletteId: PaletteId) {
    this.view = view;
    this.iter = iter;
    this.paletteId = paletteId;
    this.invalidate();
  }

  setQuality(quality: Quality) {
    if (this.quality === quality) return;
    this.quality = quality;
    this.resize(this.cssW, this.cssH, true);
  }

  resize(cssW: number, cssH: number, force = false) {
    if (!force && cssW === this.cssW && cssH === this.cssH) return;
    this.cssW = Math.max(1, cssW);
    this.cssH = Math.max(1, cssH);
    const dpr = this.pixelRatio();
    const w = Math.max(1, Math.round(this.cssW * dpr));
    const h = Math.max(1, Math.round(this.cssH * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.invalidate();
  }

  invalidate() {
    if (this.disposed || this.lost || this.scheduled) return;
    this.scheduled = true;
    requestAnimationFrame(this.draw);
  }

  dispose() {
    this.disposed = true;
    this.canvas.removeEventListener("webglcontextlost", this.onLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onRestored);
    const gl = this.gl;
    gl.deleteBuffer(this.buffer);
    gl.deleteProgram(this.program);
    const ext = gl.getExtension("WEBGL_lose_context");
    ext?.loseContext();
  }

  private pixelRatio(): number {
    const raw = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
    const isCoarse =
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches;
    if (this.quality === "draft") {
      return Math.min(raw, 1) * (isCoarse ? 0.4 : 0.5);
    }
    const cap = isCoarse ? 1.5 : 2;
    let dpr = Math.min(raw, cap);
    const pixels = this.cssW * this.cssH * dpr * dpr;
    if (pixels > 2_400_000) {
      dpr *= Math.sqrt(2_400_000 / pixels);
    }
    return dpr;
  }

  private draw = () => {
    this.scheduled = false;
    if (this.disposed || this.lost) return;
    const gl = this.gl;
    const w = this.canvas.width;
    const h = this.canvas.height;
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    const palette = getPalette(this.paletteId);
    const iter =
      this.quality === "draft" ? Math.min(this.iter, 140) : this.iter;

    gl.uniform2f(this.uniforms.center, this.view.re, this.view.im);
    gl.uniform1f(this.uniforms.scale, this.view.scale);
    gl.uniform2f(this.uniforms.resolution, w, h);
    gl.uniform1f(this.uniforms.maxIter, iter);
    gl.uniform3fv(this.uniforms.a, palette.a);
    gl.uniform3fv(this.uniforms.b, palette.b);
    gl.uniform3fv(this.uniforms.c, palette.c);
    gl.uniform3fv(this.uniforms.d, palette.d);
    gl.uniform1f(this.uniforms.colorScale, palette.colorScale);
    gl.uniform3f(this.uniforms.interior, ...INTERIOR);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  private onLost = (event: Event) => {
    event.preventDefault();
    this.lost = true;
  };

  private onRestored = () => {
    this.lost = false;
    this.invalidate();
  };
}
