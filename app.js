const wraps = [
  ['Acid Drip', 'graphic', 'Acid_Drip.png', 'BOLD'], ['Ani', 'graphic', 'Ani.png', 'BOLD'],
  ['Apocalypse', 'graphic', 'Apocalypse.png', 'DARK'], ['Avocado Green', 'nature', 'Avocado_Green.png', 'FRESH'],
  ['Camo', 'nature', 'Camo.png', 'UTILITY'], ['Cosmic Burst', 'graphic', 'Cosmic_Burst.png', 'BOLD'],
  ['Divide', 'graphic', 'Divide.png', 'MINIMAL'], ['Doge', 'graphic', 'Doge.png', 'PLAYFUL'],
  ['Dot Matrix', 'retro', 'Dot_Matrix.png', 'DIGITAL'], ['Ice Cream', 'nature', 'Ice_Cream.png', 'SOFT'],
  ['Leopard', 'nature', 'Leopard.png', 'WILD'], ['Pixel Art', 'retro', 'Pixel_Art.png', 'DIGITAL'],
  ['Reindeer', 'nature', 'Reindeer.png', 'SEASONAL'], ['Rudi', 'retro', 'Rudi.png', 'CLASSIC'],
  ['Sakura', 'nature', 'Sakura.png', 'SOFT'], ['Sketch', 'retro', 'Sketch.png', 'ARTIST'],
  ['String Lights', 'nature', 'String_Lights.png', 'SEASONAL'], ['Valentine', 'nature', 'Valentine.png', 'SOFT'],
  ['Vintage Gradient', 'retro', 'Vintage_Gradient.png', 'CLASSIC'], ['Vintage Stripes', 'retro', 'Vintage_Stripes.png', 'CLASSIC']
];

const canvas = document.getElementById('previewCanvas');
const ctx = canvas.getContext('2d');
const vehicle = new Image();
let selected = wraps[0];
let activeFilter = 'all';
let activeView = 'car';
let customImage = null;
let bodyMaskCache = null;
let renderSequence = 0;
const initialParams = new URLSearchParams(window.location.search);
const initialWrap = wraps.find(([name]) => name.toLowerCase() === (initialParams.get('wrap') || '').toLowerCase());
if (initialWrap) selected = initialWrap;
if (['car', 'map', 'compare'].includes(initialParams.get('view'))) activeView = initialParams.get('view');

// Each source quad is a separate area of Tesla's 1024px Model 3 UV layout.
// Targets are hand-aligned to the supplied 900x1000 static vehicle photo.
// This is a two-dimensional fit guide, not Tesla's proprietary 3D UV mapping.
const surfacePanels = [
  { name: 'hood', source: [[366, 174], [656, 174], [656, 400], [366, 400]], target: [[100, 573], [337, 652], [455, 545], [228, 470]] },
  { name: 'front fascia', source: [[320, 30], [700, 30], [700, 141], [320, 141]], target: [[66, 657], [309, 742], [338, 675], [90, 597]] },
  { name: 'front wing', source: [[210, 167], [80, 167], [80, 365], [210, 365]], target: [[272, 484], [307, 639], [423, 674], [455, 544]] },
  { name: 'front side', source: [[210, 378], [70, 378], [70, 612], [210, 612]], target: [[455, 539], [401, 684], [603, 667], [634, 470]] },
  { name: 'rear side', source: [[210, 612], [70, 612], [70, 842], [210, 842]], target: [[634, 470], [603, 667], [767, 560], [810, 389]] },
  { name: 'rear wing', source: [[210, 843], [70, 843], [70, 985], [210, 985]], target: [[810, 389], [767, 560], [824, 499], [832, 400]] },
  { name: 'roof rail', source: [[365, 170], [270, 170], [270, 682], [365, 682]], target: [[229, 466], [337, 358], [804, 332], [790, 377]] }
];

function getWrapColor(name) {
  const colors = {
    'Acid Drip': '#b7e600', Ani: '#9b8bc7', Apocalypse: '#3f2e2a', 'Avocado Green': '#759c52',
    Camo: '#59644d', 'Cosmic Burst': '#5b4e86', Divide: '#bf4e5b', Doge: '#b59a72',
    'Dot Matrix': '#45606b', 'Ice Cream': '#dca8b4', Leopard: '#8d6a55', 'Pixel Art': '#4d6fa7',
    Reindeer: '#8f6953', Rudi: '#a94f45', Sakura: '#d48fa8', Sketch: '#a7a39b',
    'String Lights': '#a0775b', Valentine: '#b86b76', 'Vintage Gradient': '#6671a4', 'Vintage Stripes': '#b58550'
  };
  return colors[name] || '#8d9692';
}

function setCanvasSize() {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * scale);
  canvas.height = Math.round((rect.width * 1000 / 900) * scale);
  renderPreview();
}

function loadImage(src) {
  return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
}

function drawMappedTriangle(context, image, uv, output, width, height) {
  const [s0, s1, s2] = uv;
  const [d0, d1, d2] = output.map(([x, y]) => [x * width / 900, y * height / 1000]);
  const determinant = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]);
  if (Math.abs(determinant) < .001) return;
  const a = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / determinant;
  const b = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / determinant;
  const c = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / determinant;
  const d = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / determinant;
  const e = d0[0] - a * s0[0] - c * s0[1];
  const f = d0[1] - b * s0[0] - d * s0[1];
  context.save();
  context.beginPath();
  context.moveTo(...d0);
  context.lineTo(...d1);
  context.lineTo(...d2);
  context.closePath();
  context.clip();
  context.setTransform(a, b, c, d, e, f);
  context.drawImage(image, 0, 0, 1024, 1024);
  context.restore();
}

function drawMappedPanel(context, image, panel, width, height) {
  drawMappedTriangle(context, image, [panel.source[0], panel.source[1], panel.source[2]], [panel.target[0], panel.target[1], panel.target[2]], width, height);
  drawMappedTriangle(context, image, [panel.source[0], panel.source[2], panel.source[3]], [panel.target[0], panel.target[2], panel.target[3]], width, height);
}

function getBodyMask(w, h) {
  if (bodyMaskCache?.width === w && bodyMaskCache?.height === h) return bodyMaskCache;
  const source = document.createElement('canvas');
  source.width = w; source.height = h;
  const sourceContext = source.getContext('2d', { willReadFrequently: true });
  sourceContext.drawImage(vehicle, 0, 0, w, h);
  const pixels = sourceContext.getImageData(0, 0, w, h).data;
  const mask = document.createElement('canvas');
  mask.width = w; mask.height = h;
  const maskContext = mask.getContext('2d');
  const maskPixels = maskContext.createImageData(w, h);
  for (let i = 0; i < pixels.length; i += 4) {
    const x = (i / 4) % w;
    const y = Math.floor((i / 4) / w);
    const brightness = pixels[i] * .2126 + pixels[i + 1] * .7152 + pixels[i + 2] * .0722;
    const insideCarBounds = y < h * .79 && x > w * .045 && x < w * .96;
    // The supplied render has a dark studio background. Brightness cleanly
    // separates the painted panels from glass, tires, and that background.
    const alpha = insideCarBounds ? Math.max(0, Math.min(255, (brightness - 58) * 5)) : 0;
    maskPixels.data[i] = 255;
    maskPixels.data[i + 1] = 255;
    maskPixels.data[i + 2] = 255;
    maskPixels.data[i + 3] = alpha;
  }
  maskContext.putImageData(maskPixels, 0, 0);
  bodyMaskCache = mask;
  return mask;
}

async function renderPreview() {
  if (!vehicle.complete || !vehicle.naturalWidth) return;
  const sequence = ++renderSequence;
  const w = canvas.width; const h = canvas.height;
  const texture = customImage || await loadImage(`assets/${selected[2]}`);
  if (sequence !== renderSequence) return;
  const bodyMask = getBodyMask(w, h);
  const textureLayer = document.createElement('canvas');
  textureLayer.width = w; textureLayer.height = h;
  const textureContext = textureLayer.getContext('2d');
  for (const panel of surfacePanels) drawMappedPanel(textureContext, texture, panel, w, h);
  textureContext.globalCompositeOperation = 'destination-in';
  textureContext.drawImage(bodyMask, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(vehicle, 0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = .95;
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(textureLayer, 0, 0);
  ctx.restore();
}

function renderCards() {
  const term = document.getElementById('searchInput').value.trim().toLowerCase();
  const visible = wraps.filter(([name, category]) => (activeFilter === 'all' || category === activeFilter) && name.toLowerCase().includes(term));
  document.getElementById('wrapCount').textContent = `${visible.length} / ${wraps.length}`;
  document.getElementById('wrapList').innerHTML = visible.length ? visible.map((item) => `
    <button class="wrap-card ${item[0] === selected[0] && !customImage ? 'selected' : ''}" data-name="${item[0]}" aria-label="${item[0]} を選択">
      <img class="wrap-thumb" src="assets/${item[2]}" alt="" loading="lazy" />
      <span class="wrap-meta"><strong>${item[0]}</strong><span>${item[3]}</span></span>
    </button>`).join('') : '<div class="empty-state">NO WRAPS FOUND / TRY ANOTHER SEARCH</div>';
  document.querySelectorAll('.wrap-card').forEach((card) => card.addEventListener('click', () => selectWrap(wraps.find((item) => item[0] === card.dataset.name))));
}

async function selectWrap(item) {
  if (!item) return;
  selected = item; customImage = null; updateLabels(); renderCards();
  document.getElementById('loadingState').classList.add('active');
  document.getElementById('mapImage').src = `assets/${selected[2]}`;
  await renderPreview();
  setTimeout(() => document.getElementById('loadingState').classList.remove('active'), 230);
}

function updateLabels() {
  document.getElementById('currentWrapName').textContent = selected[0];
  document.getElementById('finishName').textContent = selected[0];
  document.getElementById('finishSwatch').style.background = getWrapColor(selected[0]);
}

function showView(view) {
  activeView = view;
  document.querySelectorAll('.view-btn').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
  const map = document.getElementById('mapPreview');
  map.classList.toggle('visible', view !== 'car');
  map.setAttribute('aria-hidden', view === 'car');
  document.getElementById('previewStage').classList.toggle('compare', view === 'compare');
}

document.querySelectorAll('.filter-btn').forEach((button) => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll('.filter-btn').forEach((b) => b.classList.toggle('active', b === button));
  renderCards();
}));
document.getElementById('searchInput').addEventListener('input', renderCards);
document.addEventListener('keydown', (event) => { if (event.key === '/' && document.activeElement.tagName !== 'INPUT') { event.preventDefault(); document.getElementById('searchInput').focus(); } });

document.querySelectorAll('.view-btn').forEach((button) => button.addEventListener('click', () => showView(button.dataset.view)));

document.getElementById('uploadInput').addEventListener('change', (event) => {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { customImage = new Image(); customImage.onload = () => { selected = ['Your design', 'custom', '', 'CUSTOM']; document.getElementById('mapImage').src = reader.result; updateLabels(); renderCards(); renderPreview(); }; customImage.src = reader.result; };
  reader.readAsDataURL(file);
});

document.getElementById('saveBtn').addEventListener('click', (event) => {
  const button = event.currentTarget; button.classList.toggle('saved');
  const saved = button.classList.contains('saved'); button.querySelector('span').textContent = saved ? '♥' : '♡';
  document.getElementById('saveStatus').textContent = saved ? 'Saved — ready to share' : 'Your selection stays in this browser';
});

window.addEventListener('resize', setCanvasSize);
vehicle.onload = setCanvasSize;
vehicle.src = 'assets/vehicle_image.png';
document.getElementById('mapImage').src = `assets/${selected[2]}`;
renderCards(); updateLabels(); showView(activeView);
