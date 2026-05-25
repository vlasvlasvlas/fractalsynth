// --- DOM Elements ---
const homeView = document.getElementById('home-view');
const gameView = document.getElementById('game-view');
const enterBtn = document.getElementById('enterPyramidBtn');

const navBackBtn = document.getElementById('navBackBtn');
const navHelpBtn = document.getElementById('navHelpBtn');
const navSettingsBtn = document.getElementById('navSettingsBtn');
const helpModal = document.getElementById('help-modal');
const closeHelpBtn = document.getElementById('closeHelpBtn');
const sidebar = document.getElementById('sidebar');

const canvas = document.getElementById('fractalCanvas');
const ctx = canvas.getContext('2d');

const speedSlider = document.getElementById('speedSlider');
const autoRotateSlider = document.getElementById('autoRotateSlider');
const pointMemoryEl = document.getElementById('pointMemory');
const chaosRatioEl = document.getElementById('chaosRatio');
const pointSizeEl = document.getElementById('pointSize');
const zoomValueEl = document.getElementById('zoomValue');
const paletteSelect = document.getElementById('paletteSelect');
const colorModeSelect = document.getElementById('colorModeSelect');

let anchorSelects = [];
const presetSelect = document.getElementById('presetSelect');
const anchorsContainer = document.getElementById('anchorsContainer');

const randomToggle = document.getElementById('randomToggle');
const randomColorToggle = document.getElementById('randomColorToggle');
const randomInterval = document.getElementById('randomInterval');

const iterCountEl = document.getElementById('iterCount');
const currentNoteEl = document.getElementById('currentNote');
const resetViewBtn = document.getElementById('resetViewBtn');

const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const selectionBox = document.getElementById('selection-box');

// --- Audio Effects UI ---
const masterVolumeEl = document.getElementById('masterVolume');
const delayTimeEl = document.getElementById('delayTime');
const delayFeedbackEl = document.getElementById('delayFeedback');
const delayMixEl = document.getElementById('delayMix');
const reverbSizeEl = document.getElementById('reverbSize');
const reverbMixEl = document.getElementById('reverbMix');
const pitchLfoRateEl = document.getElementById('pitchLfoRate');
const pitchLfoDepthEl = document.getElementById('pitchLfoDepth');

const requiredElements = [
    homeView, gameView, enterBtn, navBackBtn, navHelpBtn, navSettingsBtn,
    helpModal, closeHelpBtn, sidebar, canvas, speedSlider,
    autoRotateSlider, pointMemoryEl, paletteSelect, randomColorToggle,
    zoomValueEl, colorModeSelect, randomToggle, randomInterval, iterCountEl,
    currentNoteEl, resetViewBtn, zoomInBtn, zoomOutBtn, selectionBox,
    masterVolumeEl, delayTimeEl, delayFeedbackEl, delayMixEl, reverbSizeEl,
    reverbMixEl, pitchLfoRateEl, pitchLfoDepthEl, presetSelect, anchorsContainer,
    pointSizeEl
];

if (requiredElements.some(element => !element)) {
    throw new Error('Fractal Synth: missing required DOM element.');
}

// --- Constants ---
const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const DEFAULT_ANCHOR_NOTES = ['C4', 'Ab3', 'E4', 'G4', 'Eb4', 'B3'];
const ANCHOR_COLORS = ['#ff5555', '#aa55ff', '#55ffaa', '#ffaa55', '#55aaff', '#ff55aa', '#aaff55', '#ffffff'];

const FRACTAL_PRESETS = [
    { id: 'custom',     name: 'Custom',          count: null, ratio: null  },
    { id: 'sierpinski', name: 'Sierpiński △  ×3', count: 3,    ratio: 0.5  },
    { id: 'square',     name: 'Square ×4',        count: 4,    ratio: 0.33 },
    { id: 'pentaflake', name: 'Pentaflake ×5',    count: 5,    ratio: 0.38 },
    { id: 'hexaflake',  name: 'Hexaflake ×6',     count: 6,    ratio: 0.33 },
];

function applyPalette(index) {
    const palette = COLOR_PALETTES[index];
    if (!palette) return;
    const n = anchors.length || anchorCount;
    for (let i = 0; i < n; i++) {
        const color = palette.colors[i % palette.colors.length];
        ANCHOR_COLORS[i] = color;
        if (anchors[i]) anchors[i].color = color;
    }
    redrawCanvas();
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 100;
const MAX_DPR = 2;
const MAX_POINTS = 50000;

const PARAM_SMOOTHING = 0.035;
const FILTER_SMOOTHING = 0.1;
const NOTE_ATTACK = 0.008;
const NOTE_DURATION = 0.18;
const NOTE_GAIN = 0.035;
const SILENCE_GAIN = 0;
const ENVELOPE_FLOOR = 0.0001;
const AUDIO_VOICE_COUNT = 18;
const PROCESS_RATE_MAX = 100;
const MAX_FAST_POINTS_PER_FRAME = 120;

// Generar diccionario de notas temperadas (C3 a B5).
const NOTES = [];
let f0 = 130.81; // C3
for (let octave = 3; octave <= 5; octave++) {
    for (let i = 0; i < 12; i++) {
        NOTES.push({ name: `${NOTE_NAMES[i]}${octave}`, freq: f0 * Math.pow(2, i / 12) });
    }
    f0 *= 2;
}

// --- Audio Setup ---
let audioCtx;
let masterFilter;
let delayNode, delayFeedbackNode, delaySendGain, delayWetGain;
let reverbNode, reverbToneNode, reverbSendGain, reverbWetGain;
let dryGain, outputGain, limiterNode;
let pitchLFO, pitchDepthNode;
let audioVoices = [];
let nextVoiceIndex = 0;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function hexToRGBA(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function readNumber(element, fallback, min, max) {
    const value = Number.parseFloat(element.value);
    if (!Number.isFinite(value)) return fallback;
    return clamp(value, min, max);
}

function setAudioParam(param, value, smoothing = PARAM_SMOOTHING) {
    if (!audioCtx || !param) return;
    const now = audioCtx.currentTime;
    param.cancelScheduledValues(now);
    param.setTargetAtTime(value, now, smoothing);
}

function updateMasterVolume() {
    const volume = readNumber(masterVolumeEl, 0.8, 0, 1);
    if (outputGain) setAudioParam(outputGain.gain, volume);
}

function updateDelayMix() {
    const mix = readNumber(delayMixEl, 0, 0, 1);
    const dry = Math.cos(mix * Math.PI * 0.5);
    const wet = Math.sin(mix * Math.PI * 0.5);

    if (dryGain) setAudioParam(dryGain.gain, dry);
    if (delaySendGain) setAudioParam(delaySendGain.gain, mix > 0 ? 1 : 0);
    if (delayWetGain) setAudioParam(delayWetGain.gain, wet);
}

function updateReverbMix() {
    const mix = readNumber(reverbMixEl, 0, 0, 1);
    const wet = Math.sin(mix * Math.PI * 0.5) * 0.7;

    if (reverbSendGain) setAudioParam(reverbSendGain.gain, mix > 0 ? 1 : 0);
    if (reverbWetGain) setAudioParam(reverbWetGain.gain, wet);
}

function createReverbImpulse(durationSeconds) {
    const duration = readNumber(reverbSizeEl, durationSeconds, 0.5, 6);
    const sampleRate = audioCtx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * duration));
    const impulse = audioCtx.createBuffer(2, length, sampleRate);
    const decay = 2.8;

    // Early reflection times (slightly different per channel for stereo width)
    const earlyL = [0.007, 0.013, 0.023, 0.037, 0.054, 0.071].map(t => Math.floor(t * sampleRate));
    const earlyR = [0.009, 0.017, 0.027, 0.041, 0.059, 0.076].map(t => Math.floor(t * sampleRate));
    const earlySet = [new Set(earlyL), new Set(earlyR)];

    for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
        const samples = impulse.getChannelData(channel);
        const reflections = earlySet[channel];
        for (let i = 0; i < length; i++) {
            const progress = i / length;
            const tail = (Math.random() * 2 - 1) * Math.pow(1 - progress, decay);
            if (reflections.has(i)) {
                const earlyGain = (1 - progress * 4) * 0.55;
                samples[i] = (Math.random() > 0.5 ? 1 : -1) * Math.max(0, earlyGain) + tail * 0.3;
            } else {
                samples[i] = tail;
            }
        }
    }

    return impulse;
}

function updateReverbSize() {
    if (reverbNode) {
        reverbNode.buffer = createReverbImpulse(readNumber(reverbSizeEl, 2.4, 0.5, 6));
    }
}

function updateFilterFromZoom() {
    if (!masterFilter) return;
    const newFreq = clamp(1000 * transform.scale, 100, 20000);
    setAudioParam(masterFilter.frequency, newFreq, FILTER_SMOOTHING);
}

function createAudioVoice() {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = NOTES[0].freq;
    osc.detune.value = 0;
    gainNode.gain.value = SILENCE_GAIN;

    if (pitchDepthNode) {
        pitchDepthNode.connect(osc.detune);
    }

    osc.connect(gainNode);
    gainNode.connect(masterFilter);
    osc.start();

    return { osc, gainNode };
}

function createAudioVoicePool() {
    audioVoices = [];
    nextVoiceIndex = 0;

    for (let i = 0; i < AUDIO_VOICE_COUNT; i++) {
        audioVoices.push(createAudioVoice());
    }
}

function disposeAudioVoicePool(voices, closingContext) {
    const now = closingContext.currentTime;
    const stopAt = now + 0.03;

    voices.forEach(({ osc, gainNode }) => {
        try {
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setTargetAtTime(SILENCE_GAIN, now, 0.005);
        } catch (_error) {}

        osc.onended = () => {
            try { osc.disconnect(); } catch (_error) {}
            try { gainNode.disconnect(); } catch (_error) {}
        };

        try {
            osc.stop(stopAt);
        } catch (_error) {}
    });
}

function initAudio() {
    if (!audioCtx) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;

        audioCtx = new AudioCtor();

        pitchLFO = audioCtx.createOscillator();
        pitchLFO.type = 'sine';
        pitchLFO.frequency.value = readNumber(pitchLfoRateEl, 5, 0.1, 20);

        pitchDepthNode = audioCtx.createGain();
        pitchDepthNode.gain.value = readNumber(pitchLfoDepthEl, 0, 0, 100);

        pitchLFO.connect(pitchDepthNode);
        pitchLFO.start();

        delayNode = audioCtx.createDelay(2.0);
        delayNode.delayTime.value = readNumber(delayTimeEl, 0, 0, 1);

        delayFeedbackNode = audioCtx.createGain();
        delayFeedbackNode.gain.value = readNumber(delayFeedbackEl, 0, 0, 0.85);

        delaySendGain = audioCtx.createGain();
        delaySendGain.gain.value = 0;

        delayWetGain = audioCtx.createGain();
        delayWetGain.gain.value = 0;

        reverbNode = audioCtx.createConvolver();
        reverbNode.buffer = createReverbImpulse(2.4);

        reverbToneNode = audioCtx.createBiquadFilter();
        reverbToneNode.type = 'lowpass';
        reverbToneNode.frequency.value = 6500;
        reverbToneNode.Q.value = 0.2;

        reverbSendGain = audioCtx.createGain();
        reverbSendGain.gain.value = 0;

        reverbWetGain = audioCtx.createGain();
        reverbWetGain.gain.value = 0;

        dryGain = audioCtx.createGain();
        dryGain.gain.value = 1;

        outputGain = audioCtx.createGain();
        outputGain.gain.value = readNumber(masterVolumeEl, 0.8, 0, 1);

        limiterNode = audioCtx.createDynamicsCompressor();
        limiterNode.threshold.value = -10;
        limiterNode.knee.value = 0;
        limiterNode.ratio.value = 16;
        limiterNode.attack.value = 0.003;
        limiterNode.release.value = 0.12;

        masterFilter = audioCtx.createBiquadFilter();
        masterFilter.type = 'lowpass';
        masterFilter.frequency.value = 1000;
        masterFilter.Q.value = 0.3;

        createAudioVoicePool();

        masterFilter.connect(dryGain);
        masterFilter.connect(delaySendGain);
        masterFilter.connect(reverbSendGain);

        dryGain.connect(outputGain);
        delaySendGain.connect(delayNode);
        delayNode.connect(delayFeedbackNode);
        delayFeedbackNode.connect(delayNode);
        delayNode.connect(delayWetGain);
        delayWetGain.connect(outputGain);
        delayWetGain.connect(reverbSendGain);

        reverbSendGain.connect(reverbNode);
        reverbNode.connect(reverbToneNode);
        reverbToneNode.connect(reverbWetGain);
        reverbWetGain.connect(outputGain);

        outputGain.connect(limiterNode);
        limiterNode.connect(audioCtx.destination);

        updateDelayMix();
        updateReverbMix();
        updateMasterVolume();
        updateFilterFromZoom();
    }

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function shutdownAudio({ immediate = false } = {}) {
    if (!audioCtx) return;

    const closingContext = audioCtx;
    const closingOutput = outputGain;
    const closingVoices = audioVoices;

    audioCtx = null;
    masterFilter = null;
    delayNode = null;
    delayFeedbackNode = null;
    delaySendGain = null;
    delayWetGain = null;
    reverbNode = null;
    reverbToneNode = null;
    reverbSendGain = null;
    reverbWetGain = null;
    dryGain = null;
    outputGain = null;
    limiterNode = null;
    pitchLFO = null;
    pitchDepthNode = null;
    audioVoices = [];
    nextVoiceIndex = 0;

    try {
        if (closingOutput) {
            closingOutput.gain.cancelScheduledValues(closingContext.currentTime);
            closingOutput.gain.setTargetAtTime(0, closingContext.currentTime, 0.01);
        }
    } catch (_error) {}

    disposeAudioVoicePool(closingVoices, closingContext);

    const closeContext = () => {
        if (closingContext.state !== 'closed') {
            closingContext.close().catch(() => {});
        }
    };

    if (immediate) {
        closeContext();
    } else {
        window.setTimeout(closeContext, 80);
    }
}

function playNote(freq) {
    if (!audioCtx || audioCtx.state !== 'running' || !audioVoices.length) return;

    const now = audioCtx.currentTime;
    const voice = audioVoices[nextVoiceIndex];
    nextVoiceIndex = (nextVoiceIndex + 1) % audioVoices.length;

    const { osc, gainNode } = voice;
    osc.frequency.cancelScheduledValues(now);
    osc.frequency.setValueAtTime(freq, now);
    osc.detune.setValueAtTime(0, now);

    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(SILENCE_GAIN, now);
    gainNode.gain.linearRampToValueAtTime(NOTE_GAIN, now + NOTE_ATTACK);
    gainNode.gain.exponentialRampToValueAtTime(ENVELOPE_FLOOR, now + NOTE_DURATION);
    gainNode.gain.setValueAtTime(SILENCE_GAIN, now + NOTE_DURATION + 0.01);
}

masterVolumeEl.addEventListener('input', updateMasterVolume);
delayTimeEl.addEventListener('input', e => {
    if (delayNode) setAudioParam(delayNode.delayTime, readNumber(e.target, 0, 0, 1));
});
delayFeedbackEl.addEventListener('input', e => {
    if (delayFeedbackNode) setAudioParam(delayFeedbackNode.gain, readNumber(e.target, 0, 0, 0.85));
});
delayMixEl.addEventListener('input', updateDelayMix);
reverbSizeEl.addEventListener('change', updateReverbSize);
reverbMixEl.addEventListener('input', updateReverbMix);
pitchLfoRateEl.addEventListener('input', e => {
    if (pitchLFO) setAudioParam(pitchLFO.frequency, readNumber(e.target, 5, 0.1, 20));
});
pitchLfoDepthEl.addEventListener('input', e => {
    if (pitchDepthNode) setAudioParam(pitchDepthNode.gain, readNumber(e.target, 0, 0, 100));
});

// --- Geometry & Canvas State ---
let width = 0;
let height = 0;
let dpr = 1;
let transform = { scale: 1, offsetX: 0, offsetY: 0 };
let pointsBuffer = [];

let anchors = [];
let anchorCount = 3;
let currentX = 0;
let currentY = 0;
let iteration = 0;
let isPlaying = false;
let animationFrameId = null;
let randomTimerId = null;
let currentPaletteIndex = 0;

let lastStepTime = 0;
let lastFastFrameTime = 0;
let lastAutoRotateTime = 0;
let fastPointBudget = 0;
let slowState = 0;
let activeAnchor = null;
let activeNote = null;
let activeColor = null;
let dropdownsInitialized = false;
let lastFocusedElement = null;
let anchorRotationOffset = 0;
let isHoveringCircle = false;
let lastPinchDist = 0;
let lastPlayedColor = '#ffffff';
let lastPlayedAnchorAngle = null;

function setupAnchors() {
    const n = anchors.length || anchorCount;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) * 0.8;

    anchors = Array.from({ length: n }, (_, i) => {
        const angle = -Math.PI / 2 + (Math.PI * 2 / n) * i + anchorRotationOffset;
        return {
            x: cx + Math.cos(angle) * radius,
            y: cy + Math.sin(angle) * radius,
            color: ANCHOR_COLORS[i] || ANCHOR_COLORS[i % ANCHOR_COLORS.length],
            noteIndex: anchors[i] ? anchors[i].noteIndex : 0
        };
    });
}

function updateZoomDisplay() {
    zoomValueEl.innerText = transform.scale.toFixed(2) + 'x';
}

function resetFractalState() {
    pointsBuffer = [];
    iteration = 0;
    currentX = width / 2;
    currentY = height / 2;
    lastStepTime = 0;
    lastFastFrameTime = 0;
    lastAutoRotateTime = 0;
    fastPointBudget = 0;
    slowState = 0;
    activeAnchor = null;
    activeNote = null;
    activeColor = null;
    lastPlayedAnchorAngle = null;
    iterCountEl.innerText = '0';
    currentNoteEl.innerText = '-';
    currentNoteEl.style.color = '#ffffff';
}

function resetViewAndFractal() {
    transform = { scale: 1, offsetX: 0, offsetY: 0 };
    updateZoomDisplay();
    updateFilterFromZoom();
    resetFractalState();
    redrawCanvas();
}

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = clamp(window.devicePixelRatio || 1, 1, MAX_DPR);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    setupAnchors();

    if (isPlaying) {
        resetViewAndFractal();
    } else {
        redrawCanvas();
    }
}

window.addEventListener('resize', resize);

// --- View Transforms (Zoom & Pan) ---
let isDragging = false;
let isDrawingBox = false;
let isRotating = false;
let rotateStartAngle = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let boxStartX = 0;
let boxStartY = 0;

function setZoom(nextScale, cx = width / 2, cy = height / 2) {
    const oldScale = transform.scale;
    const clampedScale = clamp(nextScale, MIN_ZOOM, MAX_ZOOM);
    const actualScaleChange = clampedScale / oldScale;

    transform.offsetX = cx - (cx - transform.offsetX) * actualScaleChange;
    transform.offsetY = cy - (cy - transform.offsetY) * actualScaleChange;
    transform.scale = clampedScale;

    updateZoomDisplay();
    updateFilterFromZoom();
    redrawCanvas();
}

function applyZoom(scaleChange, cx, cy) {
    setZoom(transform.scale * scaleChange, cx, cy);
}

function panView(dx, dy) {
    transform.offsetX += dx;
    transform.offsetY += dy;
    redrawCanvas();
}

function getCircleScreenParams() {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) * 0.8;
    return {
        screenCx: cx * transform.scale + transform.offsetX,
        screenCy: cy * transform.scale + transform.offsetY,
        screenRadius: radius * transform.scale
    };
}

function isNearCircle(mx, my) {
    const { screenCx, screenCy, screenRadius } = getCircleScreenParams();
    const dist = Math.sqrt((mx - screenCx) ** 2 + (my - screenCy) ** 2);
    return Math.abs(dist - screenRadius) < 30;
}

function getAngleFromCenter(mx, my) {
    const { screenCx, screenCy } = getCircleScreenParams();
    return Math.atan2(my - screenCy, mx - screenCx);
}

function rotateAnchors(angleDelta) {
    anchorRotationOffset += angleDelta;
    const cx = width / 2;
    const cy = height / 2;
    anchors.forEach(a => {
        const dx = a.x - cx;
        const dy = a.y - cy;
        const r = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) + angleDelta;
        a.x = cx + Math.cos(angle) * r;
        a.y = cy + Math.sin(angle) * r;
    });
}

canvas.addEventListener('mousedown', e => {
    if (e.shiftKey) {
        isDrawingBox = true;
        boxStartX = e.clientX;
        boxStartY = e.clientY;
        selectionBox.style.left = boxStartX + 'px';
        selectionBox.style.top = boxStartY + 'px';
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        selectionBox.style.display = 'block';
    } else if (isNearCircle(e.clientX, e.clientY)) {
        isRotating = true;
        rotateStartAngle = getAngleFromCenter(e.clientX, e.clientY);
        canvas.style.cursor = 'grabbing';
    } else {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
});

window.addEventListener('mousemove', e => {
    if (isDrawingBox) {
        const currentMouseX = e.clientX;
        const currentMouseY = e.clientY;
        const left = Math.min(boxStartX, currentMouseX);
        const top = Math.min(boxStartY, currentMouseY);
        const boxWidth = Math.abs(currentMouseX - boxStartX);
        const boxHeight = Math.abs(currentMouseY - boxStartY);

        selectionBox.style.left = left + 'px';
        selectionBox.style.top = top + 'px';
        selectionBox.style.width = boxWidth + 'px';
        selectionBox.style.height = boxHeight + 'px';
    } else if (isRotating) {
        const newAngle = getAngleFromCenter(e.clientX, e.clientY);
        rotateAnchors(newAngle - rotateStartAngle);
        rotateStartAngle = newAngle;
        redrawCanvas();
    } else if (isDragging) {
        panView(e.clientX - lastMouseX, e.clientY - lastMouseY);
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    } else {
        const near = isNearCircle(e.clientX, e.clientY);
        if (near !== isHoveringCircle) {
            isHoveringCircle = near;
            redrawCanvas();
        }
        canvas.style.cursor = near ? 'grab' : 'crosshair';
    }
});

window.addEventListener('mouseup', e => {
    if (isDrawingBox) {
        isDrawingBox = false;
        selectionBox.style.display = 'none';

        const boxWidth = Math.abs(e.clientX - boxStartX);
        const boxHeight = Math.abs(e.clientY - boxStartY);

        if (boxWidth > 10 && boxHeight > 10) {
            const left = Math.min(boxStartX, e.clientX);
            const top = Math.min(boxStartY, e.clientY);
            const scaleX = width / boxWidth;
            const scaleY = height / boxHeight;
            const nextScale = transform.scale * Math.min(scaleX, scaleY) * 0.9;
            const boxCenterX = left + boxWidth / 2;
            const boxCenterY = top + boxHeight / 2;
            const worldX = (boxCenterX - transform.offsetX) / transform.scale;
            const worldY = (boxCenterY - transform.offsetY) / transform.scale;

            transform.scale = clamp(nextScale, MIN_ZOOM, MAX_ZOOM);
            transform.offsetX = (width / 2) - (worldX * transform.scale);
            transform.offsetY = (height / 2) - (worldY * transform.scale);

            updateZoomDisplay();
            updateFilterFromZoom();
            redrawCanvas();
        }
    }
    isDragging = false;
    isRotating = false;
    isHoveringCircle = false;
    canvas.style.cursor = isNearCircle(e.clientX, e.clientY) ? 'grab' : 'crosshair';
});

canvas.addEventListener('dblclick', e => {
    applyZoom(1.5, e.clientX, e.clientY);
});

// --- Touch Events ---
function getTouchDist(e) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length === 2) {
        isDragging = false;
        isRotating = false;
        lastPinchDist = getTouchDist(e);
    } else if (e.touches.length === 1) {
        const t = e.touches[0];
        if (isNearCircle(t.clientX, t.clientY)) {
            isRotating = true;
            rotateStartAngle = getAngleFromCenter(t.clientX, t.clientY);
        } else {
            isDragging = true;
            lastMouseX = t.clientX;
            lastMouseY = t.clientY;
        }
    }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 2) {
        const dist = getTouchDist(e);
        if (lastPinchDist) {
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            applyZoom(dist / lastPinchDist, midX, midY);
        }
        lastPinchDist = dist;
    } else if (e.touches.length === 1) {
        const t = e.touches[0];
        if (isRotating) {
            const newAngle = getAngleFromCenter(t.clientX, t.clientY);
            rotateAnchors(newAngle - rotateStartAngle);
            rotateStartAngle = newAngle;
            redrawCanvas();
        } else if (isDragging) {
            panView(t.clientX - lastMouseX, t.clientY - lastMouseY);
            lastMouseX = t.clientX;
            lastMouseY = t.clientY;
        }
    }
}, { passive: false });

canvas.addEventListener('touchend', e => {
    e.preventDefault();
    if (e.touches.length < 2) lastPinchDist = 0;
    if (e.touches.length === 0) {
        isDragging = false;
        isRotating = false;
    }
}, { passive: false });

canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const zoomSensitivity = 0.005;
    const scaleChange = Math.exp(-e.deltaY * zoomSensitivity);
    applyZoom(scaleChange, e.clientX, e.clientY);
}, { passive: false });

zoomInBtn.addEventListener('click', () => applyZoom(1.5));
zoomOutBtn.addEventListener('click', () => applyZoom(1 / 1.5));

// --- Rendering ---
function redrawCanvas() {
    if (!width || !height) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    ctx.setTransform(
        dpr * transform.scale,
        0,
        0,
        dpr * transform.scale,
        dpr * transform.offsetX,
        dpr * transform.offsetY
    );

    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) * 0.8;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${isHoveringCircle ? 0.35 : 0.2})`;
    ctx.lineWidth = (isHoveringCircle || isRotating ? 1.5 : 1) / transform.scale;
    ctx.stroke();

    if (lastPlayedAnchorAngle !== null) {
        const arcSpan = 0.26;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, lastPlayedAnchorAngle - arcSpan, lastPlayedAnchorAngle + arcSpan);
        ctx.strokeStyle = hexToRGBA(lastPlayedColor, 0.85);
        ctx.lineWidth = 2.5 / transform.scale;
        ctx.stroke();
    }

    ctx.font = `${20 / transform.scale}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    anchors.forEach(a => {
        const note = NOTES[a.noteIndex] || NOTES[0];
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(a.x, a.y, 6 / transform.scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = a.color;
        const offset = 30 / transform.scale;
        const dirX = Math.sign(a.x - cx) || 0;
        const dirY = a.y < cy ? -1 : 1;
        ctx.fillText(note.name, a.x + dirX * offset, a.y + dirY * offset);
    });

    if (activeAnchor) {
        const ratio = readNumber(chaosRatioEl, 0.5, 0.01, 0.99);
        const midX = currentX + (activeAnchor.x - currentX) * ratio;
        const midY = currentY + (activeAnchor.y - currentY) * ratio;

        ctx.beginPath();
        ctx.moveTo(currentX, currentY);
        ctx.lineTo(activeAnchor.x, activeAnchor.y);
        ctx.strokeStyle = activeColor || '#ffffff';
        ctx.lineWidth = 1 / transform.scale;
        ctx.setLineDash([5 / transform.scale, 5 / transform.scale]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(currentX, currentY, 3 / transform.scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = activeColor || '#ffffff';
        ctx.beginPath();
        ctx.arc(midX, midY, 4 / transform.scale, 0, Math.PI * 2);
        ctx.fill();
    }

    const size = readNumber(pointSizeEl, 1, 1, 20) / transform.scale;
    const colorPaths = {};

    for (let i = 0; i < pointsBuffer.length; i++) {
        const point = pointsBuffer[i];
        if (!colorPaths[point.c]) colorPaths[point.c] = new Path2D();
        colorPaths[point.c].rect(point.x, point.y, size, size);
    }

    for (const color in colorPaths) {
        ctx.fillStyle = color;
        ctx.fill(colorPaths[color]);
    }
}

function HSLToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s /= 100;
    l /= 100;

    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = l - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

    r = Math.round((r + m) * 255).toString(16).padStart(2, '0');
    g = Math.round((g + m) * 255).toString(16).padStart(2, '0');
    b = Math.round((b + m) * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

function getPointColor(anchor, note) {
    const mode = colorModeSelect.value;
    if (mode === 'inherit') return anchor.color;
    if (mode === 'frequency') {
        const minF = NOTES[0].freq;
        const maxF = NOTES[NOTES.length - 1].freq;
        const hue = ((note.freq - minF) / (maxF - minF)) * 360;
        return HSLToHex(hue, 80, 60);
    }
    if (mode === 'semitone') {
        // Same note = same color across all octaves (C3=C4=C5)
        const hue = (anchor.noteIndex % 12) / 12 * 360;
        return HSLToHex(hue, 85, 55);
    }
    return '#ffffff';
}

function getPointMemoryMs() {
    return readNumber(pointMemoryEl, 0, 0, 300) * 1000;
}

function trimPointBuffer(timestamp = performance.now()) {
    const memoryMs = getPointMemoryMs();
    let removeCount = 0;

    if (memoryMs > 0) {
        const cutoff = timestamp - memoryMs;
        while (removeCount < pointsBuffer.length && pointsBuffer[removeCount].t < cutoff) {
            removeCount++;
        }
    }

    const overflowCount = pointsBuffer.length - removeCount - MAX_POINTS;
    if (overflowCount > 0) {
        removeCount += overflowCount;
    }

    if (removeCount > 0) {
        pointsBuffer.splice(0, removeCount);
        return true;
    }

    return false;
}

function addFractalPoint(color, timestamp) {
    pointsBuffer.push({ x: currentX, y: currentY, c: color, t: timestamp });
}

function prepareActiveStep() {
    const r = Math.floor(Math.random() * anchors.length);
    activeAnchor = anchors[r];
    activeNote = NOTES[activeAnchor.noteIndex] || NOTES[0];
    activeColor = getPointColor(activeAnchor, activeNote);
}

function commitActiveStep(timestamp) {
    const ratio = readNumber(chaosRatioEl, 0.5, 0.01, 0.99);
    currentX = currentX + (activeAnchor.x - currentX) * ratio;
    currentY = currentY + (activeAnchor.y - currentY) * ratio;

    addFractalPoint(activeColor, timestamp);
    lastPlayedColor = activeAnchor.color;
    lastPlayedAnchorAngle = Math.atan2(activeAnchor.y - height / 2, activeAnchor.x - width / 2);
    playNote(activeNote.freq);
    currentNoteEl.innerText = activeNote.name;
    currentNoteEl.style.color = activeColor;
    iteration++;
    iterCountEl.innerText = iteration;
}

function iterate(timestamp) {
    if (!isPlaying) return;

    const frameTime = timestamp || performance.now();

    const autoRotateVal = readNumber(autoRotateSlider, 3, -100, 100);
    if (autoRotateVal !== 0 && !isRotating) {
        if (lastAutoRotateTime) {
            const elapsed = Math.min((frameTime - lastAutoRotateTime) / 1000, 0.1);
            rotateAnchors(autoRotateVal * Math.PI / 180 * elapsed);
        }
    }
    lastAutoRotateTime = frameTime;

    const rate = readNumber(speedSlider, 5, 0, 300);
    let needsRedraw = trimPointBuffer(frameTime);

    if (rate > 0 && anchors.length > 0) {
        if (rate <= PROCESS_RATE_MAX) {
            slowState = 1;
            if (!activeAnchor) prepareActiveStep();
            if (!lastStepTime) lastStepTime = frameTime;

            const elapsedSeconds = Math.min((frameTime - lastStepTime) / 1000, 0.25);
            lastStepTime = frameTime;
            lastFastFrameTime = 0;
            fastPointBudget += rate * elapsedSeconds;

            const pointsToDraw = Math.min(Math.floor(fastPointBudget), MAX_FAST_POINTS_PER_FRAME);

            for (let k = 0; k < pointsToDraw; k++) {
                commitActiveStep(frameTime);
                prepareActiveStep();
            }

            fastPointBudget -= pointsToDraw;
            if (pointsToDraw > 0) trimPointBuffer(frameTime);

            redrawCanvas();
            needsRedraw = false;
        } else {
            if (activeAnchor) {
                activeAnchor = null;
                slowState = 0;
            }

            if (!lastFastFrameTime) lastFastFrameTime = frameTime;
            const elapsedSeconds = Math.min((frameTime - lastFastFrameTime) / 1000, 0.25);
            lastFastFrameTime = frameTime;
            lastStepTime = frameTime;
            fastPointBudget += rate * elapsedSeconds;

            const pointsToDraw = Math.min(Math.floor(fastPointBudget), MAX_FAST_POINTS_PER_FRAME);
            const notesThisFrame = new Map();
            let lastNote = null;
            let lastColor = '#ffffff';

            for (let k = 0; k < pointsToDraw; k++) {
                const r = Math.floor(Math.random() * anchors.length);
                const anchor = anchors[r];
                const note = NOTES[anchor.noteIndex] || NOTES[0];
                const color = getPointColor(anchor, note);

                const ratio = readNumber(chaosRatioEl, 0.5, 0.01, 0.99);
                currentX = currentX + (anchor.x - currentX) * ratio;
                currentY = currentY + (anchor.y - currentY) * ratio;

                addFractalPoint(color, frameTime);
                notesThisFrame.set(anchor.noteIndex, { note, color });
                lastPlayedColor = anchor.color;
                lastPlayedAnchorAngle = Math.atan2(anchor.y - height / 2, anchor.x - width / 2);
                lastNote = note;
                lastColor = color;
                iteration++;
            }

            fastPointBudget -= pointsToDraw;

            if (pointsToDraw > 0) {
                trimPointBuffer(frameTime);
                notesThisFrame.forEach(({ note }) => playNote(note.freq));
                currentNoteEl.innerText = lastNote.name;
                currentNoteEl.style.color = lastColor;
                iterCountEl.innerText = iteration;
                redrawCanvas();
                needsRedraw = false;
            }
        }
    } else if (activeAnchor) {
        activeAnchor = null;
        slowState = 0;
        lastStepTime = 0;
        lastFastFrameTime = 0;
        fastPointBudget = 0;
        needsRedraw = true;
    }

    if (needsRedraw) {
        redrawCanvas();
    }

    animationFrameId = requestAnimationFrame(iterate);
}

// --- Setup UI ---
function buildAnchorSelects(n) {
    anchorsContainer.innerHTML = '';
    anchorSelects = [];
    const optionsHtml = NOTES.map((note, i) => `<option value="${i}">${note.name}</option>`).join('');

    for (let i = 0; i < n; i++) {
        const label = document.createElement('label');
        label.textContent = `Anchor ${i + 1}`;
        label.htmlFor = `anchorSelect${i}`;

        const select = document.createElement('select');
        select.id = `anchorSelect${i}`;
        select.innerHTML = optionsHtml;
        select.value = String(anchors[i] ? anchors[i].noteIndex : 0);

        const idx = i;
        select.addEventListener('change', e => {
            if (anchors[idx]) {
                anchors[idx].noteIndex = Number.parseInt(e.target.value, 10) || 0;
                redrawCanvas();
            }
        });

        anchorsContainer.appendChild(label);
        anchorsContainer.appendChild(select);
        anchorSelects.push(select);
    }
}

function setAnchorCount(n) {
    anchorCount = n;
    const prevNoteIndices = anchors.map(a => a.noteIndex);
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) * 0.8;

    anchors = Array.from({ length: n }, (_, i) => ({
        x: cx + Math.cos(-Math.PI / 2 + (Math.PI * 2 / n) * i + anchorRotationOffset) * radius,
        y: cy + Math.sin(-Math.PI / 2 + (Math.PI * 2 / n) * i + anchorRotationOffset) * radius,
        color: ANCHOR_COLORS[i] || ANCHOR_COLORS[i % ANCHOR_COLORS.length],
        noteIndex: i < prevNoteIndices.length ? prevNoteIndices[i] : 0
    }));

    buildAnchorSelects(n);
    setDefaultAnchorNotes();
    resetFractalState();
    redrawCanvas();
}

function applyPreset(id) {
    const preset = FRACTAL_PRESETS.find(p => p.id === id);
    if (!preset || preset.id === 'custom') return;

    if (preset.ratio !== null) {
        chaosRatioEl.value = String(preset.ratio);
    }

    if (preset.count !== null && preset.count !== anchorCount) {
        setAnchorCount(preset.count);
    } else {
        resetFractalState();
        redrawCanvas();
    }
}

function setDefaultAnchorNotes() {
    anchorSelects.forEach((select, index) => {
        const name = DEFAULT_ANCHOR_NOTES[index] || DEFAULT_ANCHOR_NOTES[0];
        const noteIndex = NOTES.findIndex(note => note.name === name);
        const safeIndex = noteIndex >= 0 ? noteIndex : 0;
        if (anchors[index]) anchors[index].noteIndex = safeIndex;
        select.value = String(safeIndex);
    });
}

function populateDropdowns() {
    if (!dropdownsInitialized) {
        paletteSelect.innerHTML = COLOR_PALETTES
            .map((p, i) => `<option value="${i}">${p.name}</option>`)
            .join('');
        paletteSelect.addEventListener('change', e => {
            applyPalette(Number.parseInt(e.target.value, 10));
        });

        presetSelect.innerHTML = FRACTAL_PRESETS
            .map(p => `<option value="${p.id}">${p.name}</option>`)
            .join('');
        presetSelect.value = 'sierpinski';
        presetSelect.addEventListener('change', e => {
            applyPreset(e.target.value);
        });

        dropdownsInitialized = true;
    }

    buildAnchorSelects(anchorCount);
    setDefaultAnchorNotes();
}

function randomizeNotes() {
    anchorSelects.forEach((select, i) => {
        const r = Math.floor(Math.random() * NOTES.length);
        if (anchors[i]) anchors[i].noteIndex = r;
        select.value = String(r);
    });
    redrawCanvas();
}

function randomizeColors() {
    currentPaletteIndex = (currentPaletteIndex + 1) % COLOR_PALETTES.length;
    applyPalette(currentPaletteIndex);
    paletteSelect.value = String(currentPaletteIndex);
}

function getRandomIntervalMs() {
    const seconds = Math.round(readNumber(randomInterval, 2, 1, 60));
    randomInterval.value = String(seconds);
    return seconds * 1000;
}

function stopRandomizer() {
    if (randomTimerId) {
        clearInterval(randomTimerId);
        randomTimerId = null;
    }
}

function startRandomizer() {
    stopRandomizer();
    if (randomToggle.checked || randomColorToggle.checked) {
        randomTimerId = setInterval(() => {
            if (randomToggle.checked) randomizeNotes();
            if (randomColorToggle.checked) randomizeColors();
        }, getRandomIntervalMs());
    }
}

randomToggle.addEventListener('change', startRandomizer);
randomColorToggle.addEventListener('change', startRandomizer);
randomInterval.addEventListener('change', startRandomizer);

pointMemoryEl.addEventListener('input', () => {
    if (Number.parseFloat(pointMemoryEl.value) < 0) pointMemoryEl.value = '0';
});

pointMemoryEl.addEventListener('change', () => {
    if (trimPointBuffer(performance.now())) {
        redrawCanvas();
    }
});

colorModeSelect.addEventListener('change', redrawCanvas);

resetViewBtn.addEventListener('click', resetViewAndFractal);

// --- Dialog and Keyboard ---
function openHelpModal() {
    lastFocusedElement = document.activeElement;
    helpModal.style.display = 'flex';
    helpModal.setAttribute('aria-hidden', 'false');
    closeHelpBtn.focus();
}

function closeHelpModal() {
    helpModal.style.display = 'none';
    helpModal.setAttribute('aria-hidden', 'true');
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
    }
}

function isHelpOpen() {
    return helpModal.style.display !== 'none';
}

function trapHelpFocus(event) {
    const focusable = helpModal.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

function isEditableTarget(target) {
    if (!target || !target.tagName) return false;
    const tag = target.tagName.toLowerCase();
    return target.isContentEditable || ['input', 'select', 'textarea', 'button', 'a'].includes(tag);
}

document.addEventListener('keydown', event => {
    if (isHelpOpen()) {
        if (event.key === 'Escape') closeHelpModal();
        if (event.key === 'Tab') trapHelpFocus(event);
        return;
    }

    if (!isPlaying || isEditableTarget(event.target)) return;

    if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        applyZoom(1.2);
    } else if (event.key === '-') {
        event.preventDefault();
        applyZoom(1 / 1.2);
    } else if (event.key === '0') {
        event.preventDefault();
        resetViewAndFractal();
    } else if (event.key === '?') {
        event.preventDefault();
        openHelpModal();
    } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        panView(40, 0);
    } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        panView(-40, 0);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        panView(0, 40);
    } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        panView(0, -40);
    }
});

// --- Flow Control ---
function stopPlayback({ closeAudio = false, immediateAudio = false } = {}) {
    isPlaying = false;

    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    stopRandomizer();
    isDragging = false;
    isDrawingBox = false;
    isRotating = false;
    isHoveringCircle = false;
    lastPinchDist = 0;
    selectionBox.style.display = 'none';

    if (closeAudio) {
        shutdownAudio({ immediate: immediateAudio });
    }
}

function startAnimation() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(iterate);
}

enterBtn.addEventListener('click', () => {
    homeView.style.display = 'none';
    gameView.style.display = 'block';

    anchorRotationOffset = 0;
    initAudio();
    populateDropdowns();
    isPlaying = true;
    resize();
    if (window.innerWidth <= 600) {
        sidebar.classList.add('hidden');
    }
    startRandomizer();
    startAnimation();
    canvas.focus({ preventScroll: true });
});

navBackBtn.addEventListener('click', () => {
    if (!confirm('Volver al inicio? Se perderá el progreso actual.')) return;
    stopPlayback({ closeAudio: true });
    closeHelpModal();

    gameView.style.display = 'none';
    homeView.style.display = 'flex';
});

navHelpBtn.addEventListener('click', openHelpModal);
closeHelpBtn.addEventListener('click', closeHelpModal);

navSettingsBtn.addEventListener('click', () => {
    sidebar.classList.toggle('hidden');
});

window.addEventListener('pagehide', () => {
    stopPlayback({ closeAudio: true, immediateAudio: true });
});

window.addEventListener('beforeunload', () => {
    stopPlayback({ closeAudio: true, immediateAudio: true });
});

window.addEventListener('unload', () => {
    stopPlayback({ closeAudio: true, immediateAudio: true });
});

window.addEventListener('freeze', () => {
    stopPlayback({ closeAudio: true, immediateAudio: true });
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        if (audioCtx && audioCtx.state === 'running') {
            audioCtx.suspend().catch(() => {});
        }
    } else if (isPlaying) {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
    }
});

// Init layout
resize();
