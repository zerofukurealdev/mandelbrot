import { useCallback, useEffect, useRef, useState } from "react";
import { ExplorerChrome } from "@/components/explorer-chrome";
import {
  clamp,
  lerpView,
  panByPixels,
  prefersReducedMotion,
  zoomAt,
} from "@/lib/mandelbrot/math";
import {
  HOME,
  MAX_ITER,
  MIN_ITER,
  PRECISION_SCALE,
  PRESETS,
} from "@/lib/mandelbrot/presets";
import { MandelbrotRenderer, type Quality } from "@/lib/mandelbrot/renderer";
import type { ExplorerState, PaletteId, View } from "@/lib/mandelbrot/types";

const STORAGE_KEY = "mandelbrot.v1";
const ZOOM_CLICK = 2.15;
const DRAG_THRESHOLD = 6;
const IDLE_MS = 140;
const HINT_MS = 5200;

const INITIAL: ExplorerState = {
  re: HOME.re,
  im: HOME.im,
  scale: HOME.scale,
  iter: HOME.iter,
  paletteId: "ember",
};

type Pointer = { x: number; y: number };

function loadState(): ExplorerState {
  if (typeof window === "undefined") return INITIAL;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL;
    const parsed = JSON.parse(raw) as Partial<ExplorerState>;
    if (
      typeof parsed.re !== "number" ||
      typeof parsed.im !== "number" ||
      typeof parsed.scale !== "number"
    ) {
      return INITIAL;
    }
    const paletteId: PaletteId =
      parsed.paletteId === "tide" ||
      parsed.paletteId === "ink" ||
      parsed.paletteId === "copper"
        ? parsed.paletteId
        : "ember";
    return {
      re: parsed.re,
      im: parsed.im,
      scale: parsed.scale,
      iter: clamp(parsed.iter ?? HOME.iter, MIN_ITER, MAX_ITER),
      paletteId,
    };
  } catch {
    return INITIAL;
  }
}

function persist(state: ExplorerState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

function eventToNorm(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): { nx: number; ny: number } {
  return {
    nx: clamp((clientX - rect.left) / rect.width, 0, 1),
    ny: clamp((clientY - rect.top) / rect.height, 0, 1),
  };
}

function activePreset(view: View): string | null {
  for (const p of PRESETS) {
    const d = Math.hypot(view.re - p.re, view.im - p.im);
    const rel = Math.abs(Math.log(view.scale / p.scale));
    if (d < p.scale * 0.12 && rel < 0.18) return p.id;
  }
  return null;
}

export function MandelbrotExplorer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<MandelbrotRenderer | null>(null);
  const stateRef = useRef<ExplorerState>(INITIAL);
  const pointersRef = useRef<Map<number, Pointer>>(new Map());
  const pinchRef = useRef<{ dist: number; nx: number; ny: number } | null>(
    null,
  );
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const idleRef = useRef<number>(0);
  const animRef = useRef<number>(0);
  const hintTimer = useRef<number>(0);
  const displayTimer = useRef<number>(0);

  const [display, setDisplay] = useState<ExplorerState>(INITIAL);
  const [hintVisible, setHintVisible] = useState(true);
  const [glError, setGlError] = useState<string | null>(null);

  const pushDisplay = useCallback(() => {
    if (displayTimer.current) return;
    displayTimer.current = window.setTimeout(() => {
      displayTimer.current = 0;
      setDisplay({ ...stateRef.current });
    }, 50);
  }, []);

  const apply = useCallback(
    (patch: Partial<ExplorerState>, quality: Quality = "draft") => {
      const next = { ...stateRef.current, ...patch };
      stateRef.current = next;
      rendererRef.current?.setQuality(quality);
      rendererRef.current?.setView(next, next.iter, next.paletteId);
      pushDisplay();
    },
    [pushDisplay],
  );

  const markInteract = useCallback(() => {
    setHintVisible(false);
    rendererRef.current?.setQuality("draft");
    window.clearTimeout(idleRef.current);
    idleRef.current = window.setTimeout(() => {
      rendererRef.current?.setQuality("full");
      rendererRef.current?.setView(
        stateRef.current,
        stateRef.current.iter,
        stateRef.current.paletteId,
      );
      persist(stateRef.current);
    }, IDLE_MS);
  }, []);

  const cancelAnim = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = 0;
    }
  }, []);

  const animateTo = useCallback(
    (target: View & { iter?: number }) => {
      cancelAnim();
      const from: View = {
        re: stateRef.current.re,
        im: stateRef.current.im,
        scale: stateRef.current.scale,
      };
      const to: View = { re: target.re, im: target.im, scale: target.scale };
      const fromIter = stateRef.current.iter;
      const toIter = target.iter ?? fromIter;
      if (prefersReducedMotion()) {
        apply({ ...to, iter: toIter }, "full");
        persist({ ...stateRef.current, ...to, iter: toIter });
        return;
      }
      const start = performance.now();
      const duration = 520;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const view = lerpView(from, to, t);
        const iter = Math.round(fromIter + (toIter - fromIter) * t);
        apply({ ...view, iter }, t < 1 ? "draft" : "full");
        if (t < 1) {
          animRef.current = requestAnimationFrame(tick);
        } else {
          animRef.current = 0;
          persist(stateRef.current);
        }
      };
      animRef.current = requestAnimationFrame(tick);
    },
    [apply, cancelAnim],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const loaded = loadState();
    stateRef.current = loaded;
    setDisplay(loaded);

    let renderer: MandelbrotRenderer;
    try {
      renderer = new MandelbrotRenderer(canvas);
    } catch (err) {
      setGlError(
        err instanceof Error
          ? err.message
          : "No se pudo iniciar el renderizado.",
      );
      return;
    }
    rendererRef.current = renderer;
    renderer.setView(loaded, loaded.iter, loaded.paletteId);

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      renderer.resize(entry.contentRect.width, entry.contentRect.height);
    });
    ro.observe(wrap);

    hintTimer.current = window.setTimeout(() => setHintVisible(false), HINT_MS);

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      cancelAnim();
      const rect = canvas.getBoundingClientRect();
      const { nx, ny } = eventToNorm(event.clientX, event.clientY, rect);
      const factor = Math.exp(-event.deltaY * 0.00135);
      markInteract();
      apply(zoomAt(stateRef.current, nx, ny, rect.width / rect.height, factor));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });

    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      const st = stateRef.current;
      const rect = wrap.getBoundingClientRect();
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        markInteract();
        apply(zoomAt(st, 0.5, 0.5, rect.width / rect.height, ZOOM_CLICK));
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        markInteract();
        apply(zoomAt(st, 0.5, 0.5, rect.width / rect.height, 1 / ZOOM_CLICK));
      } else if (event.key === "0") {
        event.preventDefault();
        animateTo(HOME);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        markInteract();
        apply(panByPixels(st, -48, 0, rect.height));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        markInteract();
        apply(panByPixels(st, 48, 0, rect.height));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        markInteract();
        apply(panByPixels(st, 0, -48, rect.height));
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        markInteract();
        apply(panByPixels(st, 0, 48, rect.height));
      } else if (event.key === "[") {
        apply({ iter: clamp(st.iter - 32, MIN_ITER, MAX_ITER) }, "full");
        persist(stateRef.current);
      } else if (event.key === "]") {
        apply({ iter: clamp(st.iter + 32, MIN_ITER, MAX_ITER) }, "full");
        persist(stateRef.current);
      }
    };
    window.addEventListener("keydown", onKey);

    type Probe = {
      getView: () => ExplorerState;
      reset: () => void;
      gotoPreset: (id: string) => void;
    };
    (window as unknown as { __mandelbrot: Probe }).__mandelbrot = {
      getView: () => ({ ...stateRef.current }),
      reset: () => animateTo(HOME),
      gotoPreset: (id: string) => {
        const preset = PRESETS.find((p) => p.id === id);
        if (preset) animateTo(preset);
      },
    };

    return () => {
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      ro.disconnect();
      window.clearTimeout(idleRef.current);
      window.clearTimeout(hintTimer.current);
      window.clearTimeout(displayTimer.current);
      cancelAnim();
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [animateTo, apply, cancelAnim, markInteract]);

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button === 1) return;
    cancelAnim();
    const canvas = event.currentTarget;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      /* synthetic events and some touch paths cannot capture */
    }
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pointersRef.current.size === 1) {
      dragRef.current = {
        x: event.clientX,
        y: event.clientY,
        moved: false,
      };
    } else {
      dragRef.current = null;
      const pts = [...pointersRef.current.values()];
      if (pts.length >= 2) {
        const a = pts[0];
        const b = pts[1];
        const rect = canvas.getBoundingClientRect();
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const { nx, ny } = eventToNorm(mx, my, rect);
        pinchRef.current = {
          dist: Math.hypot(b.x - a.x, b.y - a.y),
          nx,
          ny,
        };
      }
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    const prev = pointersRef.current.get(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()];
      const a = pts[0];
      const b = pts[1];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      if (dist > 8 && pinchRef.current.dist > 8) {
        const factor = dist / pinchRef.current.dist;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const { nx, ny } = eventToNorm(mx, my, rect);
        markInteract();
        apply(zoomAt(stateRef.current, nx, ny, rect.width / rect.height, factor));
        pinchRef.current = { dist, nx, ny };
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag || !prev) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    const stepX = event.clientX - prev.x;
    const stepY = event.clientY - prev.y;
    markInteract();
    apply(panByPixels(stateRef.current, stepX, stepY, rect.height));
  };

  const finishPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const had = pointersRef.current.has(event.pointerId);
    pointersRef.current.delete(event.pointerId);
    if (!had) return;
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const drag = dragRef.current;

    if (pointersRef.current.size < 2) pinchRef.current = null;

    if (pointersRef.current.size === 0) {
      dragRef.current = null;
      if (drag && !drag.moved && event.button !== 2) {
        const { nx, ny } = eventToNorm(event.clientX, event.clientY, rect);
        const factor = event.shiftKey ? 1 / ZOOM_CLICK : ZOOM_CLICK;
        markInteract();
        apply(zoomAt(stateRef.current, nx, ny, rect.width / rect.height, factor));
      }
    }
  };

  const onContextMenu = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const { nx, ny } = eventToNorm(event.clientX, event.clientY, rect);
    markInteract();
    apply(
      zoomAt(stateRef.current, nx, ny, rect.width / rect.height, 1 / ZOOM_CLICK),
    );
  };

  const onReset = () => {
    setHintVisible(false);
    animateTo({ ...HOME });
  };

  const onPreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setHintVisible(false);
    animateTo(preset);
  };

  const onIter = (iter: number) => {
    apply({ iter }, "full");
    persist(stateRef.current);
  };

  const onPalette = (paletteId: PaletteId) => {
    apply({ paletteId }, "full");
    persist(stateRef.current);
  };

  const st = display;

  return (
    <div
      ref={wrapRef}
      className="relative h-dvh w-full overflow-hidden bg-bg"
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none cursor-crosshair"
        aria-label="Explorador del conjunto de Mandelbrot"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onContextMenu={onContextMenu}
      />
      <ExplorerChrome
        re={st.re}
        im={st.im}
        scale={st.scale}
        iter={st.iter}
        paletteId={st.paletteId}
        activePresetId={activePreset(st)}
        hintVisible={hintVisible}
        precisionWarn={st.scale < PRECISION_SCALE}
        glError={glError}
        onReset={onReset}
        onIter={onIter}
        onPalette={onPalette}
        onPreset={onPreset}
      />
    </div>
  );
}
