# Fractal Synth (Chaos Game)

An experimental web-based generative synthesizer and visualizer, based on the famous "Chaos Game" algorithm ([Triángulo de Sierpinski](https://es.wikipedia.org/wiki/Tri%C3%A1ngulo_de_Sierpinski)) mapped to the Circle of Fifths.

This project is an exploration of algorithmic music composition paired with mathematical visualizations. It uses pure Vanilla JavaScript, HTML Canvas, and the Web Audio API with a brutalist "Web 1.0" design aesthetic.

## Features
- **Real-time Chaos Game Visualization**: Watch the Sierpiński Triangle generate point-by-point.
- **Micro-Tonal Speed Control**: Go from educational step-by-step rendering (1 second per point) to massive fractal generation (thousands of points per frame).
- **Web Audio FX Chain**: Includes a built-in Delay, and parallel LFOs for Tremolo (Amplitude) and Vibrato (Pitch).
- **Dynamic Harmonization**: Change the musical anchors mapped to the geometric vertices in real-time.
- **Projection Mode**: Fullscreen, stark, distraction-free brutalist interface.

## How to Run
Just open `index.html` in your browser. Or visit the live GitHub Pages site (link in repo).

## Controls
- `SHIFT + Drag`: Bounding Box Zoom.
- `Double Click`: Fast Zoom In.
- `[ ⚙ ]`: Toggle settings panel for Projection Mode.
