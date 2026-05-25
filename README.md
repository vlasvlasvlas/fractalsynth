# Fractal Synth

Fractal Synth es un sintetizador generativo web basado en el algoritmo del Chaos Game. Toma tres anclas geometricas, las convierte en notas musicales y dibuja un atractor triangular inspirado en el [Triangulo de Sierpinski](https://es.wikipedia.org/wiki/Tri%C3%A1ngulo_de_Sierpinski) mientras genera sonido en tiempo real.

Este es el primer sintetizador fractal de una serie. La idea es explorar distintas formas de convertir estructuras matematicas en instrumentos visuales y sonoros; este primer instrumento usa un triangulo, y despues vendran otros fractales y otros comportamientos musicales.

## Que Hace

- Dibuja el fractal punto por punto usando el Chaos Game.
- Asigna una nota musical a cada vertice del triangulo.
- Cada iteracion elige un vertice, mueve el punto actual hacia ese vertice y dispara la nota correspondiente.
- Permite cambiar las notas, la velocidad, el color, el zoom y efectos de audio en vivo.
- Usa Web Audio API, HTML Canvas y JavaScript puro.

## Como Se Usa

Abri el sitio y toca la piramide para entrar al sintetizador.

Live GitHub Pages site: https://vlasvlasvlas.github.io/fractalsynth/

Dentro del instrumento:

- **Speed** controla la velocidad. En valores bajos se ve el proceso paso a paso; en valores altos el fractal se construye rapido.
- **Harmonies** cambia las tres notas ancla del triangulo.
- **Color Mode** cambia como se colorean los puntos.
- **Audio Effects** controla volumen, delay, tremolo, vibrato y filtro.
- El zoom tambien modifica el filtro de audio: cuanto mas cerca, mas abierto/agudo suena.

## Controles

- `SHIFT + Drag`: zoom por caja.
- `Double Click`: zoom rapido.
- `[ ⚙ ]`: mostrar u ocultar ajustes.
- `+` / `-`: zoom con teclado.
- Flechas: mover la vista.
- `0`: resetear vista y limpiar puntos.

## Ejecutar Localmente

Abrir `index.html` en el navegador, o servir la carpeta con cualquier servidor estatico local.
