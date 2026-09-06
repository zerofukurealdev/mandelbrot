import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

type SliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  "aria-label": string;
  className?: string;
};

export function Slider({
  value,
  min,
  max,
  step = 1,
  onValueChange,
  className,
  ...props
}: SliderProps) {
  return (
    <SliderPrimitive.Root
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={(v) => onValueChange(v[0] ?? value)}
      className={cn(
        "relative flex h-11 w-full touch-none items-center select-none",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-fg/15">
        <SliderPrimitive.Range className="absolute h-full bg-fg/70" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-4 rounded-full bg-fg shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_18%,transparent)] outline-none transition-[box-shadow,scale] duration-[var(--motion-quick)] ease-[var(--ease-out)] hover:scale-105 focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-fg)_28%,transparent)] active:scale-[0.96]" />
    </SliderPrimitive.Root>
  );
}
