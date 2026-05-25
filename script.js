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
const delayTimeEl = document.getElementById('delayTime');
const delayFeedbackEl = document.getElementById('delayFeedback');
const tremoloRateEl = document.getElementById('tremoloRate');
const tremoloDepthEl = document.getElementById('tremoloDepth');
const pitchLfoRateEl = document.getElementById('pitchLfoRate');
const pitchLfoDepthEl = document.getElementById('pitchLfoDepth');

// --- Audio Setup ---
let audioCtx;
let masterFilter;
let tremoloOsc, tremoloDepthNode, tremoloGain;
let delayNode, delayFeedbackNode;
let pitchLFO, pitchDepthNode;

// Generar diccionario de notas (C3 a C5)
const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const NOTES = [];
let f0 = 130.81; // C3
for (let octave = 3; octave <= 5; octave++) {
    for (let i = 0; i < 12; i++) {
        NOTES.push({ name: `${NOTE_NAMES[i]}${octave}`, freq: f0 * Math.pow(2, i / 12) });
    }
    f0 *= 2;
}

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Tremolo Nodes
        tremoloOsc = audioCtx.createOscillator();
        tremoloOsc.type = 'sine';
        tremoloOsc.frequency.value = parseFloat(tremoloRateEl.value);
        
        tremoloDepthNode = audioCtx.createGain();
        tremoloDepthNode.gain.value = parseFloat(tremoloDepthEl.value);
        
        tremoloGain = audioCtx.createGain();
        tremoloGain.gain.value = 1; // Base volume
        
        tremoloOsc.connect(tremoloDepthNode);
        tremoloDepthNode.connect(tremoloGain.gain); // Modulate gain
        tremoloOsc.start();
        
        // Pitch LFO Nodes
        pitchLFO = audioCtx.createOscillator();
        pitchLFO.type = 'sine';
        pitchLFO.frequency.value = parseFloat(pitchLfoRateEl.value);
        
        pitchDepthNode = audioCtx.createGain();
        pitchDepthNode.gain.value = parseFloat(pitchLfoDepthEl.value);
        
        pitchLFO.connect(pitchDepthNode);
        pitchLFO.start();

        // Delay Nodes
        delayNode = audioCtx.createDelay(5.0); // max 5 seconds
        delayNode.delayTime.value = parseFloat(delayTimeEl.value);
        
        delayFeedbackNode = audioCtx.createGain();
        delayFeedbackNode.gain.value = parseFloat(delayFeedbackEl.value);
        
        delayNode.connect(delayFeedbackNode);
        delayFeedbackNode.connect(delayNode);
        
        // Filter Node
        masterFilter = audioCtx.createBiquadFilter();
        masterFilter.type = 'lowpass';
        masterFilter.frequency.value = 1000;

        // ROUTING
        // Osc (from playNote) -> masterFilter -> tremoloGain
        masterFilter.connect(tremoloGain);
        
        // Split tremolo output: dry -> dest, wet -> delay -> dest
        tremoloGain.connect(audioCtx.destination);
        tremoloGain.connect(delayNode);
        delayNode.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playNote(freq) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'triangle'; 
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    // Connect Pitch LFO to oscillator frequency
    if (pitchDepthNode) {
        pitchDepthNode.connect(osc.frequency);
    }
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.01); 
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2); 
    
    osc.connect(gainNode);
    gainNode.connect(masterFilter);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

// --- Effects Event Listeners ---
delayTimeEl.addEventListener('input', e => { if (delayNode) delayNode.delayTime.value = parseFloat(e.target.value); });
delayFeedbackEl.addEventListener('input', e => { if (delayFeedbackNode) delayFeedbackNode.gain.value = parseFloat(e.target.value); });
tremoloRateEl.addEventListener('input', e => { if (tremoloOsc) tremoloOsc.frequency.value = parseFloat(e.target.value); });
tremoloDepthEl.addEventListener('input', e => { if (tremoloDepthNode) tremoloDepthNode.gain.value = parseFloat(e.target.value); });
pitchLfoRateEl.addEventListener('input', e => { if (pitchLFO) pitchLFO.frequency.value = parseFloat(e.target.value); });
pitchLfoDepthEl.addEventListener('input', e => { if (pitchDepthNode) pitchDepthNode.gain.value = parseFloat(e.target.value); });

// --- Geometry & Canvas State ---
let width, height;
let transform = { scale: 1, offsetX: 0, offsetY: 0 };
let pointsBuffer = []; 
const MAX_POINTS = 50000; 

let anchors = []; 
let currentX, currentY;
let iteration = 0;
let isPlaying = false;
let animationFrameId;
let randomTimerId;

let lastStepTime = 0;
let slowState = 0;
let activeAnchor = null;
let activeNote = null;
let activeColor = null;

const ANCHOR_COLORS = ['#ff5555', '#aa55ff', '#55ffaa'];

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    setupAnchors();
    redrawCanvas();
}
window.addEventListener('resize', resize);

function setupAnchors() {
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) * 0.8;
    
    const angles = [-Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 / 3)*2, -Math.PI / 2 + (Math.PI * 2 / 3)];
    
    anchors = angles.map((angle, index) => ({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        color: ANCHOR_COLORS[index],
        noteIndex: anchors[index] ? anchors[index].noteIndex : 0 
    }));
}

// --- View Transforms (Zoom & Pan) ---
let isDragging = false;
let isDrawingBox = false;
let lastMouseX, lastMouseY;
let boxStartX = 0, boxStartY = 0;

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
        const currentX = e.clientX;
        const currentY = e.clientY;
        const left = Math.min(boxStartX, currentX);
        const top = Math.min(boxStartY, currentY);
        const boxWidth = Math.abs(currentX - boxStartX);
        const boxHeight = Math.abs(currentY - boxStartY);
        
        selectionBox.style.left = left + 'px';
        selectionBox.style.top = top + 'px';
        selectionBox.style.width = boxWidth + 'px';
        selectionBox.style.height = boxHeight + 'px';
    } else if (isDragging) {
        transform.offsetX += e.clientX - lastMouseX;
        transform.offsetY += e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        redrawCanvas();
    }
});

function applyZoom(scaleChange, cx, cy) {
    cx = cx !== undefined ? cx : width / 2;
    cy = cy !== undefined ? cy : height / 2;
    
    transform.offsetX = cx - (cx - transform.offsetX) * scaleChange;
    transform.offsetY = cy - (cy - transform.offsetY) * scaleChange;
    transform.scale *= scaleChange;
    
    transform.scale = Math.max(0.1, Math.min(transform.scale, 500));
    zoomValueEl.innerText = transform.scale.toFixed(2) + 'x';
    
    if (masterFilter) {
        const newFreq = Math.max(100, Math.min(20000, 1000 * transform.scale));
        masterFilter.frequency.setTargetAtTime(newFreq, audioCtx.currentTime, 0.1);
    }
    redrawCanvas();
}

zoomInBtn.addEventListener('click', () => applyZoom(1.5));
zoomOutBtn.addEventListener('click', () => applyZoom(1 / 1.5));

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
            const scaleChange = Math.min(scaleX, scaleY) * 0.9;
            
            const boxCenterX = left + boxWidth / 2;
            const boxCenterY = top + boxHeight / 2;
            
            const worldX = (boxCenterX - transform.offsetX) / transform.scale;
            const worldY = (boxCenterY - transform.offsetY) / transform.scale;
            
            transform.scale *= scaleChange;
            transform.scale = Math.max(0.1, Math.min(transform.scale, 500));
            
            transform.offsetX = (width / 2) - (worldX * transform.scale);
            transform.offsetY = (height / 2) - (worldY * transform.scale);
            
            zoomValueEl.innerText = transform.scale.toFixed(2) + 'x';
            if (masterFilter) {
                const newFreq = Math.max(100, Math.min(20000, 1000 * transform.scale));
                masterFilter.frequency.setTargetAtTime(newFreq, audioCtx.currentTime, 0.1);
            }
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
    
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    transform.offsetX = mouseX - (mouseX - transform.offsetX) * scaleChange;
    transform.offsetY = mouseY - (mouseY - transform.offsetY) * scaleChange;
    transform.scale *= scaleChange;
    
    transform.scale = Math.max(0.1, Math.min(transform.scale, 50));
    zoomValueEl.innerText = transform.scale.toFixed(2) + 'x';
    
    if (masterFilter) {
        const newFreq = Math.max(100, Math.min(20000, 1000 * transform.scale));
        masterFilter.frequency.setTargetAtTime(newFreq, audioCtx.currentTime, 0.1);
    }
    redrawCanvas();
});

function redrawCanvas() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.offsetX, transform.offsetY);
    
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
    
    anchors.forEach((a, i) => {
        const note = NOTES[a.noteIndex];
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(a.x, a.y, 6 / transform.scale, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = a.color;
        const offset = 30 / transform.scale;
        const dirX = Math.sign(a.x - cx) || 0;
        const dirY = a.y < cy ? -1 : 1;
        ctx.fillText(note.name, a.x + dirX*offset, a.y + dirY*offset);
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
    const colorGroups = {};
    
    for (let i = 0; i < pointsBuffer.length; i++) {
        const p = pointsBuffer[i];
        if (!colorGroups[p.c]) colorGroups[p.c] = [];
        colorGroups[p.c].push(p);
    }
    
    for (const color in colorGroups) {
        ctx.fillStyle = color;
        ctx.beginPath();
        const group = colorGroups[color];
        for (let j = 0; j < group.length; j++) {
            const p = group[j];
            ctx.rect(p.x, p.y, size, size);
        }
        ctx.fill();
    }
}

function HSLToHex(h, s, l) {
    s /= 100; l /= 100;
    let c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs((h / 60) % 2 - 1)),
        m = l - c/2, r = 0, g = 0, b = 0;
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

function iterate(timestamp) {
    if (!timestamp) timestamp = performance.now();
    const speed = parseInt(speedSlider.value);
    
    if (speed > 0) {
        if (speed <= 50) {
            const delay = 1000 - ((speed - 1) * (980 / 49)); 
            
            if (timestamp - lastStepTime > delay) {
                lastStepTime = timestamp;
                
                if (slowState === 0) {
                    const r = Math.floor(Math.random() * 3);
                    activeAnchor = anchors[r];
                    activeNote = NOTES[activeAnchor.noteIndex];
                    
                    const mode = colorModeSelect.value;
                    if (mode === 'inherit') {
                        activeColor = activeAnchor.color;
                    } else if (mode === 'frequency') {
                        const minF = NOTES[0].freq;
                        const maxF = NOTES[NOTES.length-1].freq;
                        const hue = ((activeNote.freq - minF) / (maxF - minF)) * 360;
                        activeColor = HSLToHex(hue, 80, 60);
                    } else {
                        activeColor = '#ffffff';
                    }
                    
                    slowState = 1;
                    redrawCanvas();
                } else if (slowState === 1) {
                    currentX = (currentX + activeAnchor.x) / 2;
                    currentY = (currentY + activeAnchor.y) / 2;
                    
                    pointsBuffer.push({ x: currentX, y: currentY, c: activeColor });
                    if (pointsBuffer.length > MAX_POINTS) pointsBuffer.shift();
                    
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
            for (let k = 0; k < fastSpeed; k++) {
                const r = Math.floor(Math.random() * 3);
                const anchor = anchors[r];
                const note = NOTES[anchor.noteIndex];
                
                currentX = (currentX + anchor.x) / 2;
                currentY = (currentY + anchor.y) / 2;
                
                let color = '#ffffff';
                const mode = colorModeSelect.value;
                if (mode === 'inherit') {
                    color = anchor.color;
                } else if (mode === 'frequency') {
                    const minF = NOTES[0].freq;
                    const maxF = NOTES[NOTES.length-1].freq;
                    const hue = ((note.freq - minF) / (maxF - minF)) * 360;
                    color = HSLToHex(hue, 80, 60);
                }
                
                pointsBuffer.push({ x: currentX, y: currentY, c: color });
                if (pointsBuffer.length > MAX_POINTS) pointsBuffer.shift();
                
                if (k === fastSpeed - 1) {
                    playNote(note.freq);
                    currentNoteEl.innerText = note.name;
                    currentNoteEl.style.color = color;
                }
                iteration++;
            }
            iterCountEl.innerText = iteration;
            redrawCanvas();
        }
    }
    
    animationFrameId = requestAnimationFrame(iterate);
}

// --- Setup UI ---
function populateDropdowns() {
    let optionsHtml = '';
    NOTES.forEach((n, i) => {
        optionsHtml += `<option value="${i}">${n.name}</option>`;
    });
    
    anchorSelects.forEach((select, index) => {
        select.innerHTML = optionsHtml;
        select.addEventListener('change', (e) => {
            anchors[index].noteIndex = parseInt(e.target.value);
            redrawCanvas();
        });
    });
    
    anchors[0].noteIndex = NOTES.findIndex(n => n.name === 'C4');
    anchors[1].noteIndex = NOTES.findIndex(n => n.name === 'Ab3');
    anchors[2].noteIndex = NOTES.findIndex(n => n.name === 'E4');
    
    anchorSelects[0].value = anchors[0].noteIndex;
    anchorSelects[1].value = anchors[1].noteIndex;
    anchorSelects[2].value = anchors[2].noteIndex;
}

function randomizeNotes() {
    anchorSelects.forEach((select, index) => {
        const r = Math.floor(Math.random() * NOTES.length);
        anchors[index].noteIndex = r;
        select.value = r;
    });
    redrawCanvas();
}

randomToggle.addEventListener('change', () => {
    if (randomTimerId) clearInterval(randomTimerId);
    if (randomToggle.checked) {
        const intervalMs = parseInt(randomInterval.value) * 1000;
        randomTimerId = setInterval(randomizeNotes, intervalMs);
    }
});
randomInterval.addEventListener('change', () => {
    if (randomToggle.checked) {
        clearInterval(randomTimerId);
        const intervalMs = parseInt(randomInterval.value) * 1000;
        randomTimerId = setInterval(randomizeNotes, intervalMs);
    }
});

speedSlider.addEventListener('input', e => {
    speedValue.innerText = e.target.value;
});

colorModeSelect.addEventListener('change', redrawCanvas);

resetViewBtn.addEventListener('click', () => {
    transform = { scale: 1, offsetX: 0, offsetY: 0 };
    zoomValueEl.innerText = '1.0x';
    pointsBuffer = [];
    iteration = 0;
    iterCountEl.innerText = '0';
    if (masterFilter) masterFilter.frequency.value = 1000;
    redrawCanvas();
});

// --- Flow Control ---
enterBtn.addEventListener('click', () => {
    homeView.style.display = 'none';
    gameView.style.display = 'block';
    
    initAudio();
    resize();
    populateDropdowns();
    
    pointsBuffer = [];
    iteration = 0;
    currentX = width / 2;
    currentY = height / 2;
    
    isPlaying = true;
    iterate();
});

// UI Buttons
navBackBtn.addEventListener('click', () => {
    gameView.style.display = 'none';
    homeView.style.display = 'flex';
    isPlaying = false;
    cancelAnimationFrame(animationFrameId);
    if (randomTimerId) clearInterval(randomTimerId);
    randomToggle.checked = false;
});

navHelpBtn.addEventListener('click', () => {
    helpModal.style.display = 'flex';
});

closeHelpBtn.addEventListener('click', () => {
    helpModal.style.display = 'none';
});

navSettingsBtn.addEventListener('click', () => {
    sidebar.classList.toggle('hidden');
});

// Init layout
resize();
