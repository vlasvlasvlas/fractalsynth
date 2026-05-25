# Fractal Synth

Sintetizador generativo web basado en el algoritmo del [Chaos Game](https://es.wikipedia.org/wiki/Juego_del_caos). Toma tres anclas geometricas, las convierte en notas musicales y dibuja un atractor triangular inspirado en el [Triangulo de Sierpinski](https://es.wikipedia.org/wiki/Tri%C3%A1ngulo_de_Sierpinski) mientras genera sonido en tiempo real.

100% vanilla JS + Web Audio API. Sin frameworks, sin dependencias.

**Live:** https://vlasvlasvlas.github.io/fractalsynth/

## Que Hace

- Dibuja el fractal punto por punto usando el Chaos Game.
- Asigna una nota musical a cada vertice del triangulo.
- A velocidades bajas (≤100 pts/s) muestra la linea del proceso y el punto intermedio; a velocidades altas dibuja solo el resultado acumulado.
- Rota el triangulo de anclas manualmente (drag sobre el circulo) o con auto-rotacion continua, creando fractales superpuestos en vivo.
- El arco del circulo se tiñe con el color del ancla que acaba de sonar, cambiando al ritmo del fractal.
- Paletas de colores intercambiables, con randomizacion automatica de notas y colores.
- Efectos de audio: delay, reverb con reflexiones tempranas estereo, vibrato y filtro mapeado al zoom.
- Soporte completo de touch mobile: un dedo pan/rotacion, dos dedos pinch-zoom.

## Como Se Usa

Tocar la piramide para entrar. El fractal arranca solo, girando despacio hacia la derecha.

### Motion

| Campo | Descripcion |
|---|---|
| **Speed** | Puntos por segundo (float). ≤100: modo proceso visible; >100: modo textura rapida. |
| **Rotate °/s** | Velocidad de auto-rotacion. Negativo = izquierda, positivo = derecha. 0 = quieto. Rango -100 a 100. |
| **Memory s** | Segundos que vive cada punto. 0 = para siempre. Combinado con rotacion crea capas superpuestas. |

### Harmonies

- **Anchor 1 / 2 / 3**: nota musical de cada vertice.
- **Randomize Anchors**: cambia las notas automaticamente al intervalo configurado (default: cada 2 seg, activado por defecto).
- **Randomize Colors**: itera sobre las paletas de colores al mismo intervalo. Puede activarse junto o por separado de Randomize Anchors.

### Color

- **Palette**: elige entre 10 paletas de 3 colores (Neon, Synthwave, Sunset, Ocean, Forest, Lava, Candy, Ember, Ice, Ghost). Agregar paletas en `palettes.js`.
- **Color Mode**: Inherit Anchor Color (default), Map to Frequency, Chromatic (by note), Monochrome.

### Audio Effects

- **Master Volume**: volumen general.
- **Delay**: tiempo, feedback y mix del eco.
- **Reverb**: tamaño e intensidad. Implementado con reflexiones tempranas estereo.
- **Vibrato**: rate (Hz) y depth (cents) del LFO de pitch.
- El zoom modifica el filtro de audio: mas zoom = frecuencia de corte mas alta.

## Controles

| Accion | Control |
|---|---|
| Rotar triangulo (mouse) | Click y arrastrar sobre el borde del circulo |
| Rotar triangulo (touch) | Un dedo sobre el borde del circulo |
| Pan (mouse) | Click y arrastrar en el canvas |
| Pan (touch) | Un dedo en el canvas |
| Zoom (mouse) | Rueda del mouse / doble click / `+` `-` |
| Zoom (touch) | Pinch con dos dedos |
| Zoom por caja | `SHIFT` + arrastrar |
| Mover vista | Flechas del teclado |
| Reset vista | `0` o boton Reset |
| Ayuda | `?` o boton `?` |
| Ajustes | Boton `⚙` |

## Agregar Paletas

Editar `palettes.js` y agregar una entrada al array `COLOR_PALETTES`:

```js
{ name: 'Mi Paleta', colors: ['#ff0000', '#00ff00', '#0000ff'] },
```

Estructura equivalente en YAML documentada dentro del mismo archivo.

## Ejecutar Localmente

```bash
python3 -m http.server 8080
```

Abrir `http://localhost:8080` en el navegador.
