# Mandelbrot

Explorador del conjunto de Mandelbrot a pantalla completa.

El conjunto de Mandelbrot es un fractal en el plano complejo. Cada punto se itera con \(z \mapsto z^2 + c\); si la secuencia se dispara, el punto queda fuera (colores) y si se queda acotada, dentro (silueta negra). El borde es infinito: al acercarte aparecen copias, espirales y filamentos.

## Controles

- **Clic** para acercar hacia ese punto
- **Mayús+clic** o clic derecho para alejar
- **Arrastrar** para desplazar
- **Rueda** o pellizco para zoom
- **Restablecer** vuelve a la vista clásica
- Lugares predeterminados: Caballitos, Elefantes, Espiral, Cetro, Pluma, Mini Mandelbrot, Antena
- Control de **iteraciones** y cuatro paletas (Brasa, Marea, Tinta, Cobre)

El render va por GPU (WebGL). Mientras te mueves usa una pasada ligera; al soltar, el detalle completo.

## Desarrollo

```bash
git clone https://github.com/zerofukurealdev/mandelbrot.git
cd mandelbrot
npm install
npm run dev
```

La app escucha en [http://localhost:8080](http://localhost:8080).

## Código principal

| Archivo | Qué hace |
| --- | --- |
| `src/lib/mandelbrot/shaders.ts` | Shader de Mandelbrot con coloreado suave |
| `src/lib/mandelbrot/renderer.ts` | WebGL, calidad draft/full |
| `src/lib/mandelbrot/presets.ts` | Coordenadas de lugares famosos |
| `src/components/mandelbrot-explorer.tsx` | Zoom, pan, teclado, persistencia |
| `src/components/explorer-chrome.tsx` | Interfaz mínima |
