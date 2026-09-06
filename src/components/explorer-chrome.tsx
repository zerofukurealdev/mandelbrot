import { RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { PALETTES } from "@/lib/mandelbrot/palettes";
import { MAX_ITER, MIN_ITER, PRESETS } from "@/lib/mandelbrot/presets";
import type { PaletteId } from "@/lib/mandelbrot/types";
import { formatCoord, formatZoom } from "@/lib/mandelbrot/math";
import { cn } from "@/lib/utils";

type ExplorerChromeProps = {
  re: number;
  im: number;
  scale: number;
  iter: number;
  paletteId: PaletteId;
  activePresetId: string | null;
  hintVisible: boolean;
  precisionWarn: boolean;
  glError: string | null;
  onReset: () => void;
  onIter: (n: number) => void;
  onPalette: (id: PaletteId) => void;
  onPreset: (id: string) => void;
};

export function ExplorerChrome({
  re,
  im,
  scale,
  iter,
  paletteId,
  activePresetId,
  hintVisible,
  precisionWarn,
  glError,
  onReset,
  onIter,
  onPalette,
  onPreset,
}: ExplorerChromeProps) {
  const sign = im >= 0 ? "+" : "\u2212";
  const imAbs = formatCoord(Math.abs(im), scale);

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <header className="hud-tl pointer-events-auto flex max-w-[min(100%,22rem)] flex-col gap-1">
        <h1 className="font-display text-xl leading-tight tracking-[-0.03em] text-fg text-balance md:text-2xl">
          Mandelbrot
        </h1>
        <p className="font-mono text-xs leading-snug text-muted tabular-nums">
          {formatCoord(re, scale)} {sign} {imAbs} i
          <span className="text-subtle"> \u00b7 \u00d7 {formatZoom(scale)}</span>
        </p>
        {precisionWarn ? (
          <p className="text-xs text-muted">L\u00edmite de precisi\u00f3n</p>
        ) : null}
      </header>

      <div className="hud-tr pointer-events-auto">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-surface/80 px-3.5 text-sm font-medium text-fg shadow-[var(--shadow-border)] backdrop-blur-sm transition-[box-shadow,background-color,scale] duration-[var(--motion-quick)] ease-[var(--ease-out)] hover:bg-surface hover:shadow-[var(--shadow-border-hover)] active:scale-[0.96]"
        >
          <RotateCcw className="size-4" strokeWidth={1.75} aria-hidden="true" />
          Restablecer
        </button>
      </div>

      <div className="hud-hint pointer-events-none text-center">
        <p
          className={cn(
            "text-sm text-muted transition-opacity duration-[var(--motion-slow)] ease-[var(--ease-smooth-out)]",
            hintVisible ? "opacity-100" : "opacity-0",
          )}
        >
          Clic para acercar \u00b7 Arrastra para desplazar
          <span className="mt-1 block text-xs text-subtle">
            May\u00fas+clic aleja \u00b7 Rueda para zoom
          </span>
        </p>
      </div>

      <footer className="hud-bottom pointer-events-auto flex flex-col gap-2">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PRESETS.map((preset) => {
            const active = preset.id === activePresetId;
            return (
              <button
                key={preset.id}
                type="button"
                title={preset.hint}
                onClick={() => onPreset(preset.id)}
                className={cn(
                  "h-11 shrink-0 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-[var(--motion-quick)] ease-[var(--ease-out)]",
                  active
                    ? "bg-fg text-accent-fg"
                    : "bg-surface/80 text-muted shadow-[var(--shadow-border)] backdrop-blur-sm hover:text-fg",
                )}
              >
                {preset.name}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-surface/80 py-0 pr-1 pl-3 shadow-[var(--shadow-border)] backdrop-blur-sm sm:gap-3 sm:pr-2">
          <label className="hidden shrink-0 text-xs font-medium tracking-wide text-muted uppercase sm:block">
            Iteraciones
          </label>
          <Slider
            aria-label="Iteraciones"
            min={MIN_ITER}
            max={MAX_ITER}
            step={8}
            value={iter}
            onValueChange={onIter}
            className="min-w-0 flex-1"
          />
          <span className="w-9 shrink-0 text-right font-mono text-xs text-fg tabular-nums sm:w-10">
            {iter}
          </span>
          <div
            className="flex items-center"
            role="radiogroup"
            aria-label="Paleta"
          >
            {PALETTES.map((palette) => (
              <button
                key={palette.id}
                type="button"
                role="radio"
                aria-checked={palette.id === paletteId}
                aria-label={palette.name}
                title={palette.name}
                onClick={() => onPalette(palette.id)}
                className="grid size-11 place-items-center"
              >
                <span
                  className={cn(
                    "swatch size-6 rounded-full transition-[box-shadow,scale] duration-[var(--motion-quick)] ease-[var(--ease-out)]",
                    `swatch-${palette.id}`,
                    palette.id === paletteId
                      ? "shadow-[0_0_0_2px_var(--color-bg),0_0_0_3px_var(--color-fg)]"
                      : "shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_28%,transparent)]",
                  )}
                />
              </button>
            ))}
          </div>
        </div>
      </footer>

      {glError ? (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-bg px-6 text-center">
          <p className="max-w-sm text-sm text-muted">{glError}</p>
        </div>
      ) : null}
    </div>
  );
}
