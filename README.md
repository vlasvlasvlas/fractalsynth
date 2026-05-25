# Fractal Synth

Sintetizador generativo web basado en el algoritmo del [Chaos Game](https://es.wikipedia.org/wiki/Juego_del_caos). Asigna notas musicales a vertices geometricos y dibuja fractales en tiempo real mientras genera sonido.

100% vanilla JS + Web Audio API. Sin frameworks, sin dependencias.

**Live:** https://vlasvlasvlas.github.io/fractalsynth/

## Que Hace

- Dibuja el fractal punto por punto usando el Chaos Game con N anclas configurables.
- Presets de fractales conocidos: Sierpiński △ (3 anclas, ratio 0.5), Square ×4, Pentaflake ×5, Hexaflake ×6.
- Asigna una nota musical a cada ancla; cada paso del algoritmo suena la nota del vertice elegido.
- A velocidades bajas (≤100 pts/s) muestra la linea del proceso y el punto intermedio; a velocidades altas dibuja solo el resultado acumulado.
- Rota las anclas manualmente (drag sobre el circulo) o con auto-rotacion continua, creando fractales superpuestos en vivo.
- El arco del circulo se tiñe con el color del ancla que acaba de sonar.
- Paletas de colores intercambiables, con randomizacion automatica de notas y colores.
- Efectos de audio: delay, reverb con reflexiones tempranas estereo, vibrato y filtro mapeado al zoom.
- Soporte completo de touch mobile: un dedo pan/rotacion, dos dedos pinch-zoom.

## Como Se Usa

Tocar la piramide para entrar. El fractal arranca solo, girando despacio hacia la derecha.

### Motion

| Campo | Descripcion |
|---|---|
| **Speed pts/s** | Puntos por segundo. ≤100: modo proceso visible; >100: modo textura rapida. |
| **Rotate °/s** | Velocidad de auto-rotacion. Negativo = izquierda, positivo = derecha. Rango -100 a 100. |
| **Memory s** | Segundos que vive cada punto. 0 = infinito. Combinado con rotacion crea capas superpuestas. |
| **Chaos ratio** | Fraccion del camino que recorre el punto hacia el ancla elegida. 0.5 = punto medio (Sierpinski clasico). Valores distintos generan otras formas. |
| **Point size px** | Tamaño en pixels de cada punto dibujado. Default 1px. Aumentarlo ayuda a visualizar la estructura del fractal con muchas anclas. |

### Harmonies

- **Fractal Preset**: configura automaticamente cantidad de anclas, posiciones y chaos ratio para fractales conocidos. Opciones: Custom, Sierpiński △ ×3, Square ×4, Pentaflake ×5, Hexaflake ×6.
- **Anchor 1…N**: nota musical de cada vertice. La cantidad depende del preset activo.
- **Randomize Anchors**: cambia las notas automaticamente al intervalo configurado (default: cada 2 seg, activado por defecto).
- **Randomize Colors**: itera sobre las paletas de colores al mismo intervalo.

### Color

- **Palette**: elige entre 10 paletas de colores (Neon, Synthwave, Sunset, Ocean, Forest, Lava, Candy, Ember, Ice, Ghost). Agregar paletas en `palettes.js`.
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
| Rotar anclas (mouse) | Click y arrastrar sobre el borde del circulo |
| Rotar anclas (touch) | Un dedo sobre el borde del circulo |
| Pan (mouse) | Click y arrastrar en el canvas |
| Pan (touch) | Un dedo en el canvas |
| Zoom (mouse) | Rueda del mouse / doble click / `+` `-` |
| Zoom (touch) | Pinch con dos dedos |
| Zoom por caja | `SHIFT` + arrastrar |
| Mover vista | Flechas del teclado |
| Reset vista | `0` o boton Reset |
| Ayuda | `?` o boton `?` |
| Ajustes | Boton `⚙` |

## Fractales incluidos

| Preset | Anclas | Chaos ratio | Resultado |
|---|---|---|---|
| Sierpiński △ | 3 | 0.5 | Triangulo de Sierpinski clasico |
| Square | 4 | 0.33 | Patron fractal en cuadrado |
| Pentaflake | 5 | 0.38 | Copo de nieve pentagonal |
| Hexaflake | 6 | 0.33 | Copo de nieve hexagonal |
| Custom | libre | libre | Explorar combinaciones propias |

## Agregar Paletas

Editar `palettes.js` y agregar una entrada al array `COLOR_PALETTES`:

```js
{ name: 'Mi Paleta', colors: ['#ff0000', '#00ff00', '#0000ff'] },
```

## Ejecutar Localmente

```bash
python3 -m http.server 8080
```

Abrir `http://localhost:8080` en el navegador.
