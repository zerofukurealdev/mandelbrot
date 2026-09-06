export type View = {
  re: number;
  im: number;
  scale: number;
};

export type PaletteId = "ember" | "tide" | "ink" | "copper";

export type Palette = {
  id: PaletteId;
  name: string;
  a: [number, number, number];
  b: [number, number, number];
  c: [number, number, number];
  d: [number, number, number];
  colorScale: number;
};

export type Preset = {
  id: string;
  name: string;
  hint: string;
  re: number;
  im: number;
  scale: number;
  iter: number;
};

export type ExplorerState = View & {
  iter: number;
  paletteId: PaletteId;
};
