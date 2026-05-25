# Fractal Synth

Fractal Synth es un sintetizador generativo web basado en el algoritmo del Chaos Game. Toma tres anclas geometricas, las convierte en notas musicales y dibuja un atractor triangular inspirado en el [Triangulo de Sierpinski](https://es.wikipedia.org/wiki/Tri%C3%A1ngulo_de_Sierpinski) mientras genera sonido en tiempo real.

Este es el primer sintetizador fractal de una serie. La idea es explorar distintas formas de convertir estructuras matematicas en instrumentos visuales y sonoros.

**Live:** https://vlasvlasvlas.github.io/fractalsynth/

## Que Hace

- Dibuja el fractal punto por punto usando el Chaos Game.
- Asigna una nota musical a cada vertice del triangulo.
- Cada iteracion elige un vertice al azar, mueve el punto actual al punto medio hacia ese vertice y dispara la nota correspondiente.
- Permite rotar el triangulo de anclas manualmente o con auto-rotacion continua, creando fractales superpuestos.
- Controla velocidad, memoria de puntos, colores, zoom y efectos de audio en vivo.
- 100% vanilla JS + Web Audio API. Sin frameworks, sin dependencias.

## Como Se Usa

Abri el sitio y toca la piramide para entrar al sintetizador.

### Motion

- **Speed**: puntos por segundo. Hasta 100 pts/s se ve la linea y el punto intermedio del proceso; por encima de 100 pts/s se dibuja solo el resultado acumulado.
- **Auto-rotate**: slider centrado en 0. Hacia la derecha gira el triangulo en sentido horario, hacia la izquierda en sentido antihorario. La velocidad se mide en grados/segundo.
- **Point Memory**: cuantos segundos vive cada punto antes de desaparecer. En 0 los puntos quedan para siempre.

### Harmonies

- **Anchor 1 / 2 / 3**: nota musical asignada a cada vertice del triangulo.
- **Randomize Anchors**: cambia las notas automaticamente (activado por defecto, cada 2 segundos, ajustable).

### Color

- **Color Mode**: heredar color del ancla, mapear a frecuencia, o monocromo blanco.

### Audio Effects

- **Master Volume**: volumen general.
- **Delay**: tiempo, feedback y mix del eco.
- **Reverb**: tamano e intensidad de la reverberacion.
- **Vibrato**: rate (Hz) y depth (cents) del LFO de pitch.
- El zoom tambien modifica el filtro de audio: cuanto mas cerca, mas abierto/agudo suena.

## Controles

| Accion | Control |
|---|---|
| Rotar triangulo | Click y arrastrar sobre el borde del circulo |
| Pan | Click y arrastrar en el canvas |
| Zoom por caja | `SHIFT` + arrastrar |
| Zoom rapido | Doble click |
| Zoom | Rueda del mouse / `+` `-` |
| Mover vista | Flechas del teclado |
| Reset vista | `0` o boton Reset |
| Ayuda | `?` o boton `?` |
| Ajustes | Boton `⚙` |

## Ejecutar Localmente

```bash
python3 -m http.server 8080
```

Luego abrir `http://localhost:8080` en el navegador.
