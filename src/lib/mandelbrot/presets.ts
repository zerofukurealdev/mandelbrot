import type { Preset } from "./types";

/** Half-height of the classic full-set framing, in the complex plane. */
export const HOME_SCALE = 1.15;

export const HOME: Preset = {
  id: "overview",
  name: "El conjunto",
  hint: "Vista clásica",
  re: -0.5,
  im: 0,
  scale: HOME_SCALE,
  iter: 220,
};

export const PRESETS: readonly Preset[] = [
  HOME,
  {
    id: "seahorse",
    name: "Caballitos",
    hint: "Valle entre cabeza y cuerpo",
    re: -0.743643887037151,
    im: 0.13182590420533,
    scale: 0.0032,
    iter: 520,
  },
  {
    id: "elephant",
    name: "Elefantes",
    hint: "Trompas junto al cúspide",
    re: 0.3015,
    im: 0.0192,
    scale: 0.012,
    iter: 420,
  },
  {
    id: "spiral",
    name: "Espiral",
    hint: "Remolino logarítmico",
    re: -0.761574,
    im: -0.0847596,
    scale: 0.0018,
    iter: 560,
  },
  {
    id: "scepter",
    name: "Cetro",
    hint: "Filamentos del periodo 2",
    re: -1.25066,
    im: 0.02012,
    scale: 0.0024,
    iter: 480,
  },
  {
    id: "feather",
    name: "Pluma",
    hint: "Filamentos en el valle",
    re: -0.745308271,
    im: 0.11260661,
    scale: 0.00045,
    iter: 680,
  },
  {
    id: "mini",
    name: "Mini Mandelbrot",
    hint: "Una copia del conjunto",
    re: -1.768778837,
    im: 0.001738983,
    scale: 0.00028,
    iter: 760,
  },
  {
    id: "antenna",
    name: "Antena",
    hint: "El pico hacia −2",
    re: -1.75,
    im: 0,
    scale: 0.055,
    iter: 320,
  },
];

export const MIN_SCALE = 2e-7;
export const MAX_SCALE = 2.6;
export const MIN_ITER = 64;
export const MAX_ITER = 1024;
export const PRECISION_SCALE = 5e-6;
