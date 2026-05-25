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
const speedValue = document.getElementById('speedValue');
const zoomValueEl = document.getElementById('zoomValue');
const colorModeSelect = document.getElementById('colorModeSelect');

const anchorSelects = [
    document.getElementById('anchor1Select'),
    document.getElementById('anchor2Select'),
    document.getElementById('anchor3Select')
];

const randomToggle = document.getElementById('randomToggle');
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
const tremoloRateEl = document.getElementById('tremoloRate');
const tremoloDepthEl = document.getElementById('tremoloDepth');
const pitchLfoRateEl = document.getElementById('pitchLfoRate');
const pitchLfoDepthEl = document.getElementById('pitchLfoDepth');

const requiredElements = [
    homeView, gameView, enterBtn, navBackBtn, navHelpBtn, navSettingsBtn,
    helpModal, closeHelpBtn, sidebar, canvas, speedSlider, speedValue,
    zoomValueEl, colorModeSelect, randomToggle, randomInterval, iterCountEl,
    currentNoteEl, resetViewBtn, zoomInBtn, zoomOutBtn, selectionBox,
    masterVolumeEl, delayTimeEl, delayFeedbackEl, delayMixEl, tremoloRateEl,
    tremoloDepthEl, pitchLfoRateEl, pitchLfoDepthEl, ...anchorSelects
];

if (requiredElements.some(element => !element)) {
    throw new Error('Fractal Synth: missing required DOM element.');
}

// --- Constants ---
const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const DEFAULT_ANCHOR_NOTES = ['C4', 'Ab3', 'E4'];
const ANCHOR_COLORS = ['#ff5555', '#aa55ff', '#55ffaa'];

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
let tremoloOsc, tremoloDepthNode, tremoloGain;
let delayNode, delayFeedbackNode, delaySendGain, delayWetGain;
let dryGain, outputGain, limiterNode;
let pitchLFO, pitchDepthNode;
let audioVoices = [];
let nextVoiceIndex = 0;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
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

function updateTremoloDepth() {
    const depth = readNumber(tremoloDepthEl, 0, 0, 1);
    if (tremoloDepthNode) setAudioParam(tremoloDepthNode.gain, depth * 0.5);
    if (tremoloGain) setAudioParam(tremoloGain.gain, 1 - depth * 0.5);
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

        tremoloOsc = audioCtx.createOscillator();
        tremoloOsc.type = 'sine';
        tremoloOsc.frequency.value = readNumber(tremoloRateEl, 5, 0.1, 20);

        tremoloDepthNode = audioCtx.createGain();
        tremoloDepthNode.gain.value = 0;

        tremoloGain = audioCtx.createGain();
        tremoloGain.gain.value = 1;

        tremoloOsc.connect(tremoloDepthNode);
        tremoloDepthNode.connect(tremoloGain.gain);
        tremoloOsc.start();

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

        masterFilter.connect(tremoloGain);
        tremoloGain.connect(dryGain);
        tremoloGain.connect(delaySendGain);

        dryGain.connect(outputGain);
        delaySendGain.connect(delayNode);
        delayNode.connect(delayFeedbackNode);
        delayFeedbackNode.connect(delayNode);
        delayNode.connect(delayWetGain);
        delayWetGain.connect(outputGain);

        outputGain.connect(limiterNode);
        limiterNode.connect(audioCtx.destination);

        updateTremoloDepth();
        updateDelayMix();
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
    tremoloOsc = null;
    tremoloDepthNode = null;
    tremoloGain = null;
    delayNode = null;
    delayFeedbackNode = null;
    delaySendGain = null;
    delayWetGain = null;
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
tremoloRateEl.addEventListener('input', e => {
    if (tremoloOsc) setAudioParam(tremoloOsc.frequency, readNumber(e.target, 5, 0.1, 20));
});
tremoloDepthEl.addEventListener('input', updateTremoloDepth);
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
let currentX = 0;
let currentY = 0;
let iteration = 0;
let isPlaying = false;
let animationFrameId = null;
let randomTimerId = null;

let lastStepTime = 0;
let slowState = 0;
let activeAnchor = null;
let activeNote = null;
let activeColor = null;
let dropdownsInitialized = false;
let lastFocusedElement = null;

function setupAnchors() {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) * 0.8;
    const angles = [
        -Math.PI / 2,
        -Math.PI / 2 + (Math.PI * 2 / 3) * 2,
        -Math.PI / 2 + (Math.PI * 2 / 3)
    ];

    anchors = angles.map((angle, index) => ({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        color: ANCHOR_COLORS[index],
        noteIndex: anchors[index] ? anchors[index].noteIndex : 0
    }));
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
    slowState = 0;
    activeAnchor = null;
    activeNote = null;
    activeColor = null;
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
    } else if (isDragging) {
        panView(e.clientX - lastMouseX, e.clientY - lastMouseY);
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
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
});

canvas.addEventListener('dblclick', e => {
    applyZoom(1.5, e.clientX, e.clientY);
});

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
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1 / transform.scale;
    ctx.stroke();

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
    }

    const size = 1.5 / transform.scale;
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
    return '#ffffff';
}

function trimPointBuffer() {
    if (pointsBuffer.length > MAX_POINTS) {
        pointsBuffer.splice(0, pointsBuffer.length - MAX_POINTS);
    }
}

function addFractalPoint(color) {
    pointsBuffer.push({ x: currentX, y: currentY, c: color });
}

function iterate(timestamp) {
    if (!isPlaying) return;

    const frameTime = timestamp || performance.now();
    const speed = Number.parseInt(speedSlider.value, 10) || 0;

    if (speed > 0 && anchors.length === 3) {
        if (speed <= 50) {
            const delayMs = 1000 - ((speed - 1) * (980 / 49));

            if (frameTime - lastStepTime > delayMs) {
                lastStepTime = frameTime;

                if (slowState === 0) {
                    const r = Math.floor(Math.random() * 3);
                    activeAnchor = anchors[r];
                    activeNote = NOTES[activeAnchor.noteIndex] || NOTES[0];
                    activeColor = getPointColor(activeAnchor, activeNote);
                    slowState = 1;
                    redrawCanvas();
                } else {
                    currentX = (currentX + activeAnchor.x) / 2;
                    currentY = (currentY + activeAnchor.y) / 2;

                    addFractalPoint(activeColor);
                    trimPointBuffer();

                    playNote(activeNote.freq);
                    currentNoteEl.innerText = activeNote.name;
                    currentNoteEl.style.color = activeColor;
                    iteration++;
                    iterCountEl.innerText = iteration;

                    slowState = 0;
                    activeAnchor = null;
                    redrawCanvas();
                }
            }
        } else {
            if (activeAnchor) {
                activeAnchor = null;
                slowState = 0;
            }

            const fastSpeed = speed - 50;
            let lastNote = null;
            let lastColor = '#ffffff';

            for (let k = 0; k < fastSpeed; k++) {
                const r = Math.floor(Math.random() * 3);
                const anchor = anchors[r];
                const note = NOTES[anchor.noteIndex] || NOTES[0];
                const color = getPointColor(anchor, note);

                currentX = (currentX + anchor.x) / 2;
                currentY = (currentY + anchor.y) / 2;

                addFractalPoint(color);
                lastNote = note;
                lastColor = color;
                iteration++;
            }

            trimPointBuffer();

            if (lastNote) {
                playNote(lastNote.freq);
                currentNoteEl.innerText = lastNote.name;
                currentNoteEl.style.color = lastColor;
            }
            iterCountEl.innerText = iteration;
            redrawCanvas();
        }
    }

    animationFrameId = requestAnimationFrame(iterate);
}

// --- Setup UI ---
function setDefaultAnchorNotes() {
    DEFAULT_ANCHOR_NOTES.forEach((name, index) => {
        const noteIndex = NOTES.findIndex(note => note.name === name);
        const safeIndex = noteIndex >= 0 ? noteIndex : 0;
        anchors[index].noteIndex = safeIndex;
        anchorSelects[index].value = String(safeIndex);
    });
}

function populateDropdowns() {
    if (!dropdownsInitialized) {
        const optionsHtml = NOTES
            .map((note, index) => `<option value="${index}">${note.name}</option>`)
            .join('');

        anchorSelects.forEach((select, index) => {
            select.innerHTML = optionsHtml;
            select.addEventListener('change', e => {
                anchors[index].noteIndex = Number.parseInt(e.target.value, 10) || 0;
                redrawCanvas();
            });
        });

        dropdownsInitialized = true;
    }

    setDefaultAnchorNotes();
}

function randomizeNotes() {
    anchorSelects.forEach((select, index) => {
        const r = Math.floor(Math.random() * NOTES.length);
        anchors[index].noteIndex = r;
        select.value = String(r);
    });
    redrawCanvas();
}

function getRandomIntervalMs() {
    const seconds = readNumber(randomInterval, 3, 1, 60);
    randomInterval.value = String(Math.round(seconds));
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
    if (randomToggle.checked) {
        randomTimerId = setInterval(randomizeNotes, getRandomIntervalMs());
    }
}

randomToggle.addEventListener('change', startRandomizer);
randomInterval.addEventListener('change', startRandomizer);

speedSlider.addEventListener('input', e => {
    speedValue.innerText = e.target.value;
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
    randomToggle.checked = false;
    isDragging = false;
    isDrawingBox = false;
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

    initAudio();
    populateDropdowns();
    isPlaying = true;
    resize();
    startAnimation();
    canvas.focus({ preventScroll: true });
});

navBackBtn.addEventListener('click', () => {
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
        stopPlayback({ closeAudio: true, immediateAudio: true });
    }
});

// Init layout
resize();
