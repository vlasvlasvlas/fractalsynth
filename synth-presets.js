// Synth presets for Fractal Synth.
// Each preset controls oscillator waveform, envelope, and effect levels.
// Add new presets by appending objects to this array following the same structure.
//
// YAML-equivalent structure for documentation:
//
// - id: my_preset          # unique identifier (no spaces)
//   name: My Preset        # display name in dropdown
//   description: '...'     # short description shown in sidebar
//   osc: sine              # waveform: sine | triangle | sawtooth | square
//   attack: 0.01           # envelope attack in seconds (0.001 – 1.0)
//   duration: 0.3          # envelope decay/duration in seconds (0.05 – 4.0)
//   gain: 0.035            # peak note gain (0.01 – 0.08)
//   delay:
//     time: 0.0            # delay time in seconds (0.0 – 1.0)
//     feedback: 0.0        # delay feedback (0.0 – 0.85)
//     mix: 0.0             # delay wet mix (0.0 – 1.0)
//   reverb:
//     size: 2.4            # reverb impulse size in seconds (0.5 – 6.0)
//     mix: 0.0             # reverb wet mix (0.0 – 1.0)
//   vibrato:
//     rate: 5.0            # LFO rate in Hz (0.1 – 20)
//     depth: 0             # LFO depth in cents (0 – 100)

const SYNTH_PRESETS = [
    {
        id: 'default',
        name: 'Default',
        description: 'Sonido base del sintetizador. Triangle limpio, sin efectos.',
        osc: 'triangle',
        attack: 0.008,
        duration: 0.18,
        gain: 0.035,
        delay:   { time: 0.0,  feedback: 0.0,  mix: 0.0  },
        reverb:  { size: 2.4,  mix: 0.0  },
        vibrato: { rate: 5.0,  depth: 0  },
    },
    {
        id: 'cosmos',
        name: 'Cosmos  (Vangelis)',
        description: 'Pad etéreo de sine. Ataque lento, reverb profundo, delay espacial.',
        osc: 'sine',
        attack: 0.20,
        duration: 1.4,
        gain: 0.045,
        delay:   { time: 0.36, feedback: 0.42, mix: 0.44 },
        reverb:  { size: 5.0,  mix: 0.65 },
        vibrato: { rate: 4.2,  depth: 9  },
    },
    {
        id: 'algorithmic',
        name: 'Algorithmic  (Spiegel)',
        description: 'Sine puro, preciso, matemático. Delay corto, reverb sutil.',
        osc: 'sine',
        attack: 0.025,
        duration: 0.32,
        gain: 0.032,
        delay:   { time: 0.14, feedback: 0.28, mix: 0.22 },
        reverb:  { size: 1.8,  mix: 0.18 },
        vibrato: { rate: 5.0,  depth: 0  },
    },
    {
        id: 'drone',
        name: 'Drone',
        description: 'Sawtooth con ataque muy lento y reverb largo. Envolvente y sostenido.',
        osc: 'sawtooth',
        attack: 0.50,
        duration: 2.8,
        gain: 0.038,
        delay:   { time: 0.52, feedback: 0.62, mix: 0.50 },
        reverb:  { size: 6.0,  mix: 0.72 },
        vibrato: { rate: 0.4,  depth: 18 },
    },
    {
        id: 'sequencer',
        name: 'Sequencer  (Moroder)',
        description: 'Sawtooth corto y pulsante. Delay rítmico, sensación de arpeggiator.',
        osc: 'sawtooth',
        attack: 0.004,
        duration: 0.13,
        gain: 0.040,
        delay:   { time: 0.26, feedback: 0.38, mix: 0.55 },
        reverb:  { size: 1.2,  mix: 0.12 },
        vibrato: { rate: 5.0,  depth: 0  },
    },
    {
        id: 'moog',
        name: 'Moog  (Wendy Carlos)',
        description: 'Square articulado, clásico. Vibrato pronunciado, reverb de sala.',
        osc: 'square',
        attack: 0.012,
        duration: 0.28,
        gain: 0.030,
        delay:   { time: 0.09, feedback: 0.18, mix: 0.22 },
        reverb:  { size: 2.2,  mix: 0.28 },
        vibrato: { rate: 6.5,  depth: 14 },
    },
    {
        id: 'spacelady',
        name: 'Space Lady',
        description: 'Sine soñador y lo-fi. Notas largas, delay suave, carácter etéreo.',
        osc: 'sine',
        attack: 0.010,
        duration: 0.45,
        gain: 0.040,
        delay:   { time: 0.19, feedback: 0.22, mix: 0.32 },
        reverb:  { size: 2.8,  mix: 0.28 },
        vibrato: { rate: 7.5,  depth: 6  },
    },
];
