const canvas = document.querySelector('#stage');
const ctx = canvas.getContext('2d');
const welcome = document.querySelector('#welcome');
const controls = document.querySelector('#controls');
const status = document.querySelector('#status');
const sceneName = document.querySelector('#sceneName');
const guestPanel = document.querySelector('#guestPanel');
const guestButton = document.querySelector('#guestButton');
const messageStage = document.querySelector('#messageStage');
const messageText = document.querySelector('#messageText');
const messageAuthor = document.querySelector('#messageAuthor');

const palette = ['#ff3ca6', '#24e8ff', '#d7ff3f', '#ff6b35', '#9c6cff'];
const scenes = ['Paprsky', 'Spektrum', 'Tunel', 'Kaleidoskop'];
const LASER_DURATION = 5000;
const LASER_MIN_INTERVAL = 8000;
const LASER_MAX_INTERVAL = 60000;
let width = 0;
let height = 0;
let dpr = 1;
let analyser;
let frequencies;
let audioContext;
let sourceMode = 'idle';
let sceneIndex = 0;
let autoScenes = true;
let lastSceneChange = performance.now();
let laserStart = -10000;
let nextLaser = scheduleLaser(performance.now());
let energy = 0;
let bass = 0;
let mids = 0;
let guestPanelVisible = true;
let lastCloudMessageId = '';
let showingMessage = false;
const messageQueue = [];

const sendUrl = new URL('send.html', window.location.href).href;
document.querySelector('#guestUrl').textContent = sendUrl.replace(/^https?:\/\//, '');
document.querySelector('#guestQr').src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(sendUrl)}`;

async function pollGuestMessages() {
  try {
    const since = lastCloudMessageId || '10s';
    const response = await fetch(`${LSMU_CONFIG.messageEndpoint}/json?poll=1&since=${encodeURIComponent(since)}`, { cache: 'no-store' });
    if (!response.ok) return;
    const events = (await response.text()).trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    for (const event of events) {
      if (event.event !== 'message' || event.id === lastCloudMessageId) continue;
      lastCloudMessageId = event.id;
      try {
        const message = JSON.parse(event.message);
        if (typeof message.text === 'string' && message.text.trim()) {
          messageQueue.push({ text: message.text.trim().slice(0, 120), name: String(message.name || '').trim().slice(0, 24) });
        }
      } catch (_) {}
    }
    showNextMessage();
  } catch (_) {}
}

function showNextMessage() {
  if (sourceMode === 'idle' || showingMessage || messageQueue.length === 0) return;
  showingMessage = true;
  const message = messageQueue.shift();
  messageText.textContent = message.text;
  messageAuthor.textContent = message.name ? `— ${message.name}` : '— Host galavečera';
  messageStage.classList.add('visible');
  window.setTimeout(() => messageStage.classList.remove('visible'), 7000);
  window.setTimeout(() => {
    showingMessage = false;
    showNextMessage();
  }, 8000);
}

function scheduleLaser(from) {
  return from + LASER_MIN_INTERVAL + Math.random() * (LASER_MAX_INTERVAL - LASER_MIN_INTERVAL);
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function setScene(index) {
  sceneIndex = (index + scenes.length) % scenes.length;
  sceneName.textContent = scenes[sceneIndex];
  lastSceneChange = performance.now();
}

async function startMicrophone() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = .35;
    audioContext.createMediaStreamSource(stream).connect(analyser);
    frequencies = new Uint8Array(analyser.frequencyBinCount);
    activate('Mikrofon aktivní', 'microphone');
  } catch (error) {
    activate('Demo režim', 'demo');
  }
}

function activate(label, mode) {
  sourceMode = mode;
  status.classList.add('live');
  status.querySelector('span').textContent = label;
  welcome.classList.add('hidden');
  controls.classList.add('visible');
  guestPanel.classList.toggle('visible', guestPanelVisible);
  showNextMessage();
}

function sampleAudio(time) {
  if (sourceMode === 'microphone') {
    analyser.getByteFrequencyData(frequencies);
    const average = (from, to) => {
      let sum = 0;
      for (let i = from; i < to; i++) sum += frequencies[i];
      return sum / (to - from) / 255;
    };
    const nextBass = average(1, 18);
    const nextMids = average(18, 80);
    const nextEnergy = average(1, 140);
    bass += (nextBass - bass) * (nextBass > bass ? .72 : .4);
    mids += (nextMids - mids) * (nextMids > mids ? .66 : .36);
    energy += (nextEnergy - energy) * (nextEnergy > energy ? .62 : .32);
  } else {
    const beat = Math.pow(Math.max(0, Math.sin(time * .0042)), 7);
    bass += ((.2 + beat * .7) - bass) * .18;
    mids += ((.25 + Math.sin(time * .0017) * .16) - mids) * .12;
    energy = (bass + mids) * .5;
  }
}

function clearFrame(time) {
  const hue = (time * .012) % 360;
  ctx.fillStyle = `hsl(${hue} 30% 3% / .28)`;
  ctx.fillRect(0, 0, width, height);
}

function drawRays(time) {
  const cx = width / 2;
  const cy = height / 2;
  const count = 36;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * .00006);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < count; i++) {
    const angle = i / count * Math.PI * 2;
    const inner = 38 + bass * 90;
    const outer = Math.hypot(width, height) * (.45 + energy * .5);
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle - .018 - bass * .025) * outer, Math.sin(angle - .018 - bass * .025) * outer);
    ctx.lineTo(Math.cos(angle + .018 + bass * .025) * outer, Math.sin(angle + .018 + bass * .025) * outer);
    ctx.closePath();
    ctx.fillStyle = `${palette[i % palette.length]}${Math.round((.08 + energy * .35) * 255).toString(16).padStart(2, '0')}`;
    ctx.fill();
  }
  ctx.restore();
}

function drawSpectrum(time) {
  const bars = 72;
  const barWidth = width / bars;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < bars; i++) {
    const audioValue = frequencies ? frequencies[Math.floor(i / bars * 150)] / 255 : .25 + Math.sin(i * .6 + time * .004) * .2 + bass * .4;
    const barHeight = 20 + audioValue * height * .72;
    ctx.fillStyle = palette[i % palette.length];
    ctx.globalAlpha = .35 + audioValue * .65;
    ctx.fillRect(i * barWidth + 1, height - barHeight, Math.max(2, barWidth - 3), barHeight);
    ctx.fillRect(i * barWidth + 1, 0, Math.max(2, barWidth - 3), barHeight * .18);
  }
  ctx.restore();
}

function drawTunnel(time) {
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.globalCompositeOperation = 'lighter';
  const maxRadius = Math.hypot(width, height) * .62;
  for (let i = 0; i < 18; i++) {
    const phase = ((i / 18 + time * .00012) % 1);
    const radius = Math.pow(phase, 1.7) * maxRadius;
    ctx.beginPath();
    for (let side = 0; side <= 6; side++) {
      const angle = side / 6 * Math.PI * 2 + time * .00015 + phase;
      const r = radius * (1 + bass * .22 * Math.sin(side * 2 + time * .005));
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      side ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = palette[i % palette.length];
    ctx.globalAlpha = phase * (.3 + energy);
    ctx.lineWidth = 1 + phase * 5;
    ctx.stroke();
  }
  ctx.restore();
}

function drawKaleidoscope(time) {
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.globalCompositeOperation = 'lighter';
  const slices = 14;
  for (let i = 0; i < slices; i++) {
    ctx.save();
    ctx.rotate(i / slices * Math.PI * 2);
    if (i % 2) ctx.scale(1, -1);
    for (let j = 0; j < 7; j++) {
      const distance = 70 + j * 52 + Math.sin(time * .002 + j) * 20;
      const size = 8 + bass * 42 + j * 3;
      ctx.beginPath();
      ctx.moveTo(distance, -size);
      ctx.lineTo(distance + 80 + mids * 90, 0);
      ctx.lineTo(distance, size);
      ctx.closePath();
      ctx.fillStyle = palette[(i + j) % palette.length];
      ctx.globalAlpha = .08 + energy * .26;
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

function triggerLaser() {
  laserStart = performance.now();
  nextLaser = scheduleLaser(laserStart);
}

function drawLaser(time) {
  const elapsed = time - laserStart;
  if (elapsed < 0 || elapsed > LASER_DURATION) return;
  const enter = Math.min(1, elapsed / 550);
  const exit = Math.min(1, (LASER_DURATION - elapsed) / 700);
  const opacity = Math.min(enter, exit);
  const fontSize = Math.min(width * .27, height * .48);
  const jitter = elapsed < 700 ? (Math.random() - .5) * 12 : 0;
  ctx.save();
  ctx.translate(width / 2 + jitter, height / 2);
  ctx.rotate(-.045);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${fontSize}px Syne, sans-serif`;
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = '#ff3ca6';
  ctx.shadowColor = '#ff3ca6';
  ctx.shadowBlur = 38 + bass * 55;
  ctx.lineWidth = Math.max(2, fontSize * .012);
  ctx.strokeText('LŠMU', 0, 0);
  ctx.shadowColor = '#24e8ff';
  ctx.shadowBlur = 12;
  ctx.lineWidth = Math.max(1, fontSize * .003);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText('LŠMU', 0, 0);
  ctx.restore();
}

function frame(time) {
  sampleAudio(time);
  clearFrame(time);
  [drawRays, drawSpectrum, drawTunnel, drawKaleidoscope][sceneIndex](time);
  if (autoScenes && time - lastSceneChange > 14000) setScene(sceneIndex + 1);
  if (time > nextLaser && sourceMode !== 'idle') triggerLaser();
  drawLaser(time);
  requestAnimationFrame(frame);
}

document.querySelector('#startButton').addEventListener('click', startMicrophone);
document.querySelector('#demoButton').addEventListener('click', () => activate('Demo režim', 'demo'));
document.querySelector('#previousButton').addEventListener('click', () => setScene(sceneIndex - 1));
document.querySelector('#nextButton').addEventListener('click', () => setScene(sceneIndex + 1));
document.querySelector('#laserButton').addEventListener('click', triggerLaser);
guestButton.addEventListener('click', () => {
  guestPanelVisible = !guestPanelVisible;
  guestPanel.classList.toggle('visible', guestPanelVisible && sourceMode !== 'idle');
  guestButton.setAttribute('aria-pressed', String(guestPanelVisible));
});
document.querySelector('#autoButton').addEventListener('click', (event) => {
  autoScenes = !autoScenes;
  event.currentTarget.setAttribute('aria-pressed', String(autoScenes));
  lastSceneChange = performance.now();
});
document.querySelector('#fullscreenButton').addEventListener('click', async () => {
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  else await document.exitFullscreen();
});
document.addEventListener('fullscreenchange', () => document.body.classList.toggle('projecting', Boolean(document.fullscreenElement)));
document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') setScene(sceneIndex + 1);
  if (event.key === 'ArrowLeft') setScene(sceneIndex - 1);
  if (event.key.toLowerCase() === 'l') triggerLaser();
  if (event.key.toLowerCase() === 'f') document.querySelector('#fullscreenButton').click();
});
window.addEventListener('resize', resize);

resize();
window.setInterval(pollGuestMessages, 3000);
pollGuestMessages();
requestAnimationFrame(frame);