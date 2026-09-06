import type { View } from "./types";
import { HOME_SCALE, MAX_SCALE, MIN_SCALE } from "./presets";

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function clampScale(scale: number): number {
  return clamp(scale, MIN_SCALE, MAX_SCALE);
}

export function screenToComplex(
  nx: number,
  ny: number,
  view: View,
  aspect: number,
): { re: number; im: number } {
  return {
    re: view.re + (nx - 0.5) * 2 * view.scale * aspect,
    im: view.im + (0.5 - ny) * 2 * view.scale,
  };
}

export function zoomAt(
  view: View,
  nx: number,
  ny: number,
  aspect: number,
  factor: number,
): View {
  const c = screenToComplex(nx, ny, view, aspect);
  const scale = clampScale(view.scale / factor);
  return {
    re: c.re - (nx - 0.5) * 2 * scale * aspect,
    im: c.im - (0.5 - ny) * 2 * scale,
    scale,
  };
}

export function panByPixels(
  view: View,
  dx: number,
  dy: number,
  cssHeight: number,
): View {
  if (cssHeight <= 0) return view;
  const k = (2 * view.scale) / cssHeight;
  return {
    ...view,
    re: view.re - dx * k,
    im: view.im + dy * k,
  };
}

export function lerpView(a: View, b: View, t: number): View {
  const u = t * t * (3 - 2 * t);
  const logA = Math.log(a.scale);
  const logB = Math.log(b.scale);
  return {
    re: a.re + (b.re - a.re) * u,
    im: a.im + (b.im - a.im) * u,
    scale: Math.exp(logA + (logB - logA) * u),
  };
}

export function zoomFactor(scale: number): number {
  return HOME_SCALE / scale;
}

export function formatCoord(n: number, scale: number): string {
  const digits = clamp(Math.ceil(-Math.log10(scale)) + 2, 4, 10);
  return n.toFixed(digits);
}

export function formatZoom(scale: number): string {
  const z = zoomFactor(scale);
  if (z >= 1e6) return z.toExponential(2).replace("e+", "e");
  if (z >= 1000) return Math.round(z).toLocaleString("es-ES");
  if (z >= 100) return z.toFixed(0);
  if (z >= 10) return z.toFixed(1);
  return z.toFixed(2);
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
