import type { Palette, PaletteId } from "./types";

export const PALETTES: readonly Palette[] = [
  {
    id: "ember",
    name: "Brasa",
    a: [0.52, 0.34, 0.2],
    b: [0.48, 0.32, 0.16],
    c: [1.0, 0.82, 0.48],
    d: [0.04, 0.14, 0.26],
    colorScale: 0.055,
  },
  {
    id: "tide",
    name: "Marea",
    a: [0.14, 0.24, 0.34],
    b: [0.38, 0.5, 0.54],
    c: [1.0, 0.88, 0.68],
    d: [0.52, 0.32, 0.16],
    colorScale: 0.05,
  },
  {
    id: "ink",
    name: "Tinta",
    a: [0.12, 0.12, 0.13],
    b: [0.58, 0.55, 0.48],
    c: [1.0, 1.0, 0.95],
    d: [0.0, 0.03, 0.06],
    colorScale: 0.042,
  },
  {
    id: "copper",
    name: "Cobre",
    a: [0.24, 0.18, 0.12],
    b: [0.52, 0.34, 0.16],
    c: [1.0, 0.72, 0.4],
    d: [0.18, 0.08, 0.02],
    colorScale: 0.048,
  },
];

export function getPalette(id: PaletteId): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}
