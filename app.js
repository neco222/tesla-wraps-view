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
let dragX = 0;
let dragStart = null;
let bodyMaskCache = null;

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
    const alpha = insideCarBounds ? Math.max(0, Math.min(255, (brightness - 30) * 5.5)) : 0;
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
  const w = canvas.width; const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(dragX * (window.devicePixelRatio || 1), 0);
  ctx.drawImage(vehicle, 0, 0, w, h);
  ctx.restore();
  const texture = customImage || await loadImage(`assets/${selected[2]}`);
  const bodyMask = getBodyMask(w, h);
  const tintLayer = document.createElement('canvas');
  tintLayer.width = w; tintLayer.height = h;
  const tintContext = tintLayer.getContext('2d');
  tintContext.fillStyle = getWrapColor(selected[0]);
  tintContext.fillRect(0, 0, w, h);
  tintContext.globalCompositeOperation = 'destination-in';
  tintContext.drawImage(bodyMask, 0, 0);

  const textureLayer = document.createElement('canvas');
  textureLayer.width = w; textureLayer.height = h;
  const textureContext = textureLayer.getContext('2d');
  textureContext.drawImage(texture, w * .035, h * .05, w * .93, h * .86);
  textureContext.globalCompositeOperation = 'destination-in';
  textureContext.drawImage(bodyMask, 0, 0);

  ctx.save();
  ctx.translate(dragX * (window.devicePixelRatio || 1), 0);
  // Paint the car's actual bright body pixels first, preserving shading and
  // leaving windows, tires, and the studio background untouched.
  ctx.globalAlpha = .9;
  ctx.globalCompositeOperation = 'color';
  ctx.drawImage(tintLayer, 0, 0);
  // Add the official UV artwork only after it has been clipped to the body mask.
  ctx.globalAlpha = .62;
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
  const color = selected[0] === 'Acid Drip' ? '#c7f400' : '#89918f';
  document.getElementById('finishSwatch').style.background = color;
}

document.querySelectorAll('.filter-btn').forEach((button) => button.addEventListener('click', () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll('.filter-btn').forEach((b) => b.classList.toggle('active', b === button));
  renderCards();
}));
document.getElementById('searchInput').addEventListener('input', renderCards);
document.addEventListener('keydown', (event) => { if (event.key === '/' && document.activeElement.tagName !== 'INPUT') { event.preventDefault(); document.getElementById('searchInput').focus(); } });

document.querySelectorAll('.view-btn').forEach((button) => button.addEventListener('click', () => {
  activeView = button.dataset.view;
  document.querySelectorAll('.view-btn').forEach((b) => b.classList.toggle('active', b === button));
  const map = document.getElementById('mapPreview');
  map.classList.toggle('visible', activeView === 'map');
  map.setAttribute('aria-hidden', activeView !== 'map');
}));

document.getElementById('uploadInput').addEventListener('change', (event) => {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { customImage = new Image(); customImage.onload = () => { selected = ['Your design', 'custom', '', 'CUSTOM']; updateLabels(); renderCards(); renderPreview(); }; customImage.src = reader.result; };
  reader.readAsDataURL(file);
});

document.getElementById('saveBtn').addEventListener('click', (event) => {
  const button = event.currentTarget; button.classList.toggle('saved');
  const saved = button.classList.contains('saved'); button.querySelector('span').textContent = saved ? '♥' : '♡';
  document.getElementById('saveStatus').textContent = saved ? 'Saved — ready to share' : 'Your selection stays in this browser';
});

canvas.addEventListener('pointerdown', (event) => { dragStart = event.clientX; canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener('pointermove', (event) => { if (dragStart === null) return; dragX = Math.max(-14, Math.min(14, (event.clientX - dragStart) * .16)); renderPreview(); });
canvas.addEventListener('pointerup', () => { dragStart = null; dragX = 0; renderPreview(); });
window.addEventListener('resize', setCanvasSize);
vehicle.onload = setCanvasSize;
vehicle.src = 'assets/vehicle_image.png';
renderCards(); updateLabels();
