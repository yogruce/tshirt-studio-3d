import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PRESET_DESIGNS } from './presets.js';

// ============================================================================
// APPLICATION STATE
// ============================================================================
const state = {
  modelType: 'short', // 'short' | 'long'
  unit: 'cm',         // 'mm' | 'cm' | 'in'
  activeTool: 'select', // 'select' | 'pan'
  patternMarkings: true,
  autoRotate: false,
  fabricBump: 1.0,

  // Pattern piece colors (Starts completely uniform & plain by default)
  pieceColors: {
    neck_rib: '#65745a',
    right_sleeve: '#65745a',
    left_sleeve: '#65745a',
    front: '#65745a',
    back: '#65745a'
  },

  // Studio Backdrop Settings
  backdrop: {
    enabled: true,
    shadow: true,
    color: '#3f4a3c',
    lightType: 'leaf', // 'leaf' | 'window' | 'soft' | 'none'
    invertLight: false,
    brightness: 1.0,
    contrast: 1.15,
    hdriIntensity: 1.1,
    hdriRotation: 35
  },

  // Neck Label Settings
  neckLabel: {
    enabled: true,
    shape: 'small', // 'small' | 'square' | 'wide'
    color: '#f2f0eb'
  },

  // Pattern Polygons loaded from patterns.json
  patterns: null,

  // 2D Design Layers
  layers: [],
  selectedLayerId: null,

  // 2D Viewport Pan & Zoom (in normalized [0..1] pattern space)
  view2d: {
    scale: 1,
    offsetX: 0,
    offsetY: 0
  }
};

// Piece Metadata (Labels & Dimensions in cm)
const PIECE_META = {
  neck_rib: { title: 'Neck rib', cmW: 48, cmH_short: 4.5, cmH_long: 4.5 },
  right_sleeve: { title: 'Right sleeve', cmW: 46, cmH_short: 26, cmH_long: 58 },
  left_sleeve: { title: 'Left sleeve', cmW: 46, cmH_short: 26, cmH_long: 58 },
  front: { title: 'Front', cmW: 58, cmH_short: 74, cmH_long: 74 },
  back: { title: 'Back', cmW: 58, cmH_short: 74, cmH_long: 74 }
};

// ============================================================================
// OFFSCREEN 3D TEXTURE CANVAS (2048 x 2048)
// ============================================================================
const TEX_SIZE = 2048;
const texCanvas = document.createElement('canvas');
texCanvas.width = TEX_SIZE;
texCanvas.height = TEX_SIZE;
const texCtx = texCanvas.getContext('2d');

const fabricTexture = new THREE.CanvasTexture(texCanvas);
fabricTexture.flipY = false;
fabricTexture.colorSpace = THREE.SRGBColorSpace;
fabricTexture.anisotropy = 16;
fabricTexture.needsUpdate = true;

// ============================================================================
// THREE.JS 3D STUDIO SCENE SETUP
// ============================================================================
const viewport3dContainer = document.getElementById('viewport3dContainer');
const canvas3d = document.getElementById('canvas3d');

const renderer = new THREE.WebGLRenderer({
  canvas: canvas3d,
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 25);
camera.position.set(-0.18, 0.14, 0.78);

const controls = new OrbitControls(camera, canvas3d);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 0.04, 0);
controls.minDistance = 0.32;
controls.maxDistance = 2.2;
controls.maxPolarAngle = Math.PI * 0.85;

// Lighting Rig (Rotatable via HDRI rotation slider)
const lightRig = new THREE.Group();
scene.add(lightRig);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x3b423b, 0.85);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xfffcf5, 1.65);
keyLight.position.set(0.85, 1.15, 1.1);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 0.2;
keyLight.shadow.camera.far = 4.5;
const d = 0.65;
keyLight.shadow.camera.left = -d;
keyLight.shadow.camera.right = d;
keyLight.shadow.camera.top = d;
keyLight.shadow.camera.bottom = -d;
keyLight.shadow.bias = -0.0005;
lightRig.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.65);
fillLight.position.set(-1.1, 0.4, 0.8);
lightRig.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xfef9c3, 0.75);
rimLight.position.set(0.2, 0.9, -1.2);
lightRig.add(rimLight);

// Studio Backdrop Plane with Procedural Gobo Shadow (Leaf / Window / Soft)
const backdropCanvas = document.createElement('canvas');
backdropCanvas.width = 1024;
backdropCanvas.height = 1024;
const backdropCtx = backdropCanvas.getContext('2d');
const backdropTexture = new THREE.CanvasTexture(backdropCanvas);
backdropTexture.colorSpace = THREE.SRGBColorSpace;

const backdropGeo = new THREE.PlaneGeometry(4.2, 4.2);
const backdropMat = new THREE.MeshStandardMaterial({
  map: backdropTexture,
  roughness: 0.95,
  metalness: 0.0
});
const backdropMesh = new THREE.Mesh(backdropGeo, backdropMat);
backdropMesh.position.set(0, 0.0, -0.42);
backdropMesh.receiveShadow = true;
scene.add(backdropMesh);

function updateStudioBackdrop() {
  const { enabled, shadow, color, lightType, invertLight, brightness, contrast } = state.backdrop;
  backdropMesh.visible = enabled;
  keyLight.castShadow = shadow;

  const w = backdropCanvas.width;
  const h = backdropCanvas.height;
  backdropCtx.save();

  // Base studio color
  backdropCtx.fillStyle = color;
  backdropCtx.fillRect(0, 0, w, h);

  // Soft studio vignette
  const radGrad = backdropCtx.createRadialGradient(w * 0.52, h * 0.42, w * 0.05, w * 0.5, h * 0.5, w * 0.72);
  const lightAlpha = invertLight ? -0.18 : 0.22;
  radGrad.addColorStop(0, `rgba(255,255,255,${Math.max(0, lightAlpha * brightness)})`);
  radGrad.addColorStop(1, `rgba(0,0,0,${0.48 * contrast})`);
  backdropCtx.fillStyle = radGrad;
  backdropCtx.fillRect(0, 0, w, h);

  // Gobo shadow patterns (Leaf shadow like the user's screenshot!)
  if (lightType !== 'none') {
    backdropCtx.save();
    backdropCtx.filter = 'blur(26px)';
    const goboColor = invertLight ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.34)';
    backdropCtx.fillStyle = goboColor;

    if (lightType === 'leaf') {
      // Tropical palm / foliage shadow silhouette in top-right and left
      const drawLeafBranch = (cx, cy, rot, scale) => {
        backdropCtx.save();
        backdropCtx.translate(cx, cy);
        backdropCtx.rotate(rot);
        backdropCtx.scale(scale, scale);
        for (let i = -4; i <= 4; i++) {
          backdropCtx.beginPath();
          backdropCtx.ellipse(i * 42, -Math.abs(i) * 12, 18, 95, i * 0.18 + 0.3, 0, Math.PI * 2);
          backdropCtx.fill();
        }
        backdropCtx.restore();
      };
      drawLeafBranch(w * 0.65, h * 0.22, -0.35, 1.35);
      drawLeafBranch(w * 0.25, h * 0.18, 0.45, 1.1);
      drawLeafBranch(w * 0.78, h * 0.55, -0.6, 1.2);
    } else if (lightType === 'window') {
      backdropCtx.translate(w * 0.5, h * 0.5);
      backdropCtx.rotate(-0.28);
      for (let y = -450; y <= 450; y += 110) {
        backdropCtx.fillRect(-600, y, 1200, 48);
      }
    } else if (lightType === 'soft') {
      const spot = backdropCtx.createRadialGradient(w * 0.5, h * 0.45, 20, w * 0.5, h * 0.45, 420);
      spot.addColorStop(0, 'rgba(255,255,255,0.25)');
      spot.addColorStop(1, 'rgba(0,0,0,0.35)');
      backdropCtx.fillStyle = spot;
      backdropCtx.fillRect(0, 0, w, h);
    }
    backdropCtx.restore();
  }

  backdropCtx.restore();
  backdropTexture.needsUpdate = true;

  // Apply brightness & exposure
  const b = brightness;
  backdropMat.color.setScalar(b);

  // Update HDRI / Lighting rig
  const hdriInt = state.backdrop.hdriIntensity;
  keyLight.intensity = 1.5 * hdriInt;
  fillLight.intensity = 0.6 * hdriInt;
  rimLight.intensity = 0.7 * hdriInt;
  hemiLight.intensity = 0.75 * hdriInt;

  const angleRad = (state.backdrop.hdriRotation * Math.PI) / 180;
  lightRig.rotation.y = angleRad;
}

// ============================================================================
// 3D GARMENT MODELS & NECK LABEL
// ============================================================================
const garmentGroup = new THREE.Group();
scene.add(garmentGroup);

const loadedModels = {
  short: null,
  long: null
};
let activeMesh = null;

// Neck Label 3D Mesh inside back collar
const labelCanvas = document.createElement('canvas');
labelCanvas.width = 256;
labelCanvas.height = 128;
const labelCtx = labelCanvas.getContext('2d');
const labelTexture = new THREE.CanvasTexture(labelCanvas);
labelTexture.colorSpace = THREE.SRGBColorSpace;

const neckLabelGeo = new THREE.PlaneGeometry(0.036, 0.018, 8, 1);
// Slight curve to match inner back neck
const posAttr = neckLabelGeo.attributes.position;
for (let i = 0; i < posAttr.count; i++) {
  const x = posAttr.getX(i);
  posAttr.setZ(i, (x * x) * 1.8);
}
neckLabelGeo.computeVertexNormals();

const neckLabelMat = new THREE.MeshStandardMaterial({
  map: labelTexture,
  roughness: 0.7,
  side: THREE.DoubleSide
});
const neckLabelMesh = new THREE.Mesh(neckLabelGeo, neckLabelMat);
neckLabelMesh.position.set(0.0, 0.233, -0.055);
neckLabelMesh.rotation.x = 0.12;
garmentGroup.add(neckLabelMesh);

function updateNeckLabel() {
  const { enabled, shape, color } = state.neckLabel;
  neckLabelMesh.visible = enabled;
  if (!enabled) return;

  if (shape === 'small') {
    neckLabelMesh.scale.set(1.0, 1.0, 1.0);
  } else if (shape === 'square') {
    neckLabelMesh.scale.set(0.95, 1.55, 1.0);
  } else {
    neckLabelMesh.scale.set(1.45, 0.95, 1.0);
  }

  labelCtx.fillStyle = color;
  labelCtx.fillRect(0, 0, 256, 128);

  const isDark = color === '#18181b';
  labelCtx.strokeStyle = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)';
  labelCtx.lineWidth = 4;
  labelCtx.strokeRect(10, 10, 236, 108);

  // Clean plain woven label without logo text
  labelCtx.fillStyle = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
  labelCtx.font = '600 18px Inter, sans-serif';
  labelCtx.textAlign = 'center';
  labelCtx.fillText('100% COTTON · L', 128, 70);

  labelTexture.needsUpdate = true;
}

const gltfLoader = new GLTFLoader();

async function loadGarmentModel(type, activate = true) {
  if (loadedModels[type]) {
    if (activate) setActiveModel(type);
    return loadedModels[type];
  }
  const url = type === 'short' ? './models/tshirt_short.glb' : './models/tshirt_long.glb';
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        const root = gltf.scene;
        root.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            const oldMat = child.material;
            const normalMap = oldMat.normalMap;
            const aoMap = oldMat.aoMap;

            if (normalMap) {
              normalMap.wrapS = THREE.RepeatWrapping;
              normalMap.wrapT = THREE.RepeatWrapping;
              normalMap.repeat.set(8, 8);
              normalMap.channel = 1;
            }
            if (aoMap) {
              aoMap.channel = 1;
            }

            const newMat = new THREE.MeshStandardMaterial({
              map: fabricTexture,
              normalMap: normalMap || null,
              normalScale: new THREE.Vector2(2.2 * state.fabricBump, 2.2 * state.fabricBump),
              aoMap: aoMap || null,
              aoMapIntensity: 0.78,
              roughness: 0.82,
              metalness: 0.02,
              side: THREE.DoubleSide
            });
            child.material = newMat;
          }
        });
        loadedModels[type] = root;
        if (activate) setActiveModel(type);
        resolve(root);
      },
      undefined,
      reject
    );
  });
}

function setActiveModel(type) {
  state.modelType = type;
  Object.keys(loadedModels).forEach((k) => {
    if (loadedModels[k]) {
      garmentGroup.remove(loadedModels[k]);
    }
  });
  const model = loadedModels[type];
  if (model) {
    garmentGroup.add(model);
    activeMesh = model;
    updateFabricBump();
  }
  renderAll();
}

function updateFabricBump() {
  Object.values(loadedModels).forEach((root) => {
    if (!root) return;
    root.traverse((child) => {
      if (child.isMesh && child.material && child.material.normalScale) {
        const s = 2.2 * state.fabricBump;
        child.material.normalScale.set(s, s);
      }
    });
  });
}

// ============================================================================
// 2D SEWING PATTERN EDITOR & OFFSCREEN TEXTURE RENDERING
// ============================================================================
const canvas2d = document.getElementById('canvas2d');
const ctx2d = canvas2d.getContext('2d');
const rulerTop = document.getElementById('rulerTop');
const rulerLeft = document.getElementById('rulerLeft');

function getActivePatterns() {
  if (!state.patterns) return null;
  return state.patterns[state.modelType];
}

function tracePiecePolygon(ctx, points, scaleX, scaleY) {
  if (!points || points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0] * scaleX, points[0][1] * scaleY);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0] * scaleX, points[i][1] * scaleY);
  }
  ctx.closePath();
}

function drawLayerOnContext(ctx, layer, canvasSize) {
  const cx = layer.u * canvasSize;
  const cy = layer.v * canvasSize;
  const w = layer.w * canvasSize;
  const h = layer.h * canvasSize;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  if (layer.flipX) {
    ctx.scale(-1, 1);
  }

  if (layer.type === 'image' && layer.img && layer.img.complete) {
    ctx.drawImage(layer.img, -w / 2, -h / 2, w, h);
  } else if (layer.type === 'text') {
    const fontSize = Math.max(12, h * 0.78);
    ctx.font = `700 ${fontSize}px "${layer.font || 'Oswald'}", sans-serif`;
    ctx.fillStyle = layer.color || '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(layer.text || 'TEXT', 0, 0);
  }
  ctx.restore();
}

// Render the 2048x2048 offscreen texture that wraps onto the 3D T-Shirt
function render3dFabricTexture() {
  const pats = getActivePatterns();
  if (!pats) return;

  texCtx.save();
  // Fill default base color
  texCtx.fillStyle = state.pieceColors.front;
  texCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

  // Draw each pattern piece with generous outward bleed so UV seams have zero dark edges
  Object.entries(pats).forEach(([pieceKey, pieceData]) => {
    const color = state.pieceColors[pieceKey] || '#65745a';
    texCtx.save();
    tracePiecePolygon(texCtx, pieceData.points, TEX_SIZE, TEX_SIZE);
    texCtx.fillStyle = color;
    texCtx.strokeStyle = color;
    texCtx.lineJoin = 'round';
    texCtx.lineWidth = 64; // 32px outward UV seam bleed!
    texCtx.stroke();
    texCtx.fill();

    // Subtle ribbed vertical knit lines on the neck rib
    if (pieceKey === 'neck_rib') {
      const { minU, minV, maxU, maxV } = pieceData.bbox;
      texCtx.strokeStyle = 'rgba(0,0,0,0.06)';
      texCtx.lineWidth = 2;
      for (let x = minU * TEX_SIZE; x <= maxU * TEX_SIZE; x += 6) {
        texCtx.beginPath();
        texCtx.moveTo(x, (minV - 0.01) * TEX_SIZE);
        texCtx.lineTo(x, (maxV + 0.01) * TEX_SIZE);
        texCtx.stroke();
      }
    }

    // Clip to a slightly expanded region of this piece and draw its layers
    const b = pieceData.bbox;
    const pad = 0.018;
    texCtx.beginPath();
    texCtx.rect(
      (b.minU - pad) * TEX_SIZE,
      (b.minV - pad) * TEX_SIZE,
      (b.maxU - b.minU + pad * 2) * TEX_SIZE,
      (b.maxV - b.minV + pad * 2) * TEX_SIZE
    );
    texCtx.clip();

    state.layers.forEach((layer) => {
      if (layer.piece === pieceKey) {
        drawLayerOnContext(texCtx, layer, TEX_SIZE);
      }
    });

    texCtx.restore();
  });

  texCtx.restore();
  fabricTexture.needsUpdate = true;
}

// Fit 2D pattern view nicely inside #canvas2d
function fitPatternView() {
  const wrap = document.getElementById('patternCanvasWrap');
  const w = wrap.clientWidth || 800;
  const h = wrap.clientHeight || 400;
  const pad = 28;
  const scale = Math.min(w - pad * 2, h - pad * 2);
  state.view2d.scale = Math.max(180, scale);
  state.view2d.offsetX = (w - state.view2d.scale) / 2;
  state.view2d.offsetY = (h - state.view2d.scale) / 2;
  updateZoomLabel();
}

function updateZoomLabel() {
  const wrap = document.getElementById('patternCanvasWrap');
  const baseScale = Math.min((wrap.clientWidth || 800) - 56, (wrap.clientHeight || 400) - 56);
  const pct = Math.round((state.view2d.scale / Math.max(180, baseScale)) * 100);
  document.getElementById('zoomLabel').textContent = `${pct}%`;
}

// Convert screen (x, y) on #canvas2d to normalized UV (u, v) in [0..1]
function screenToUV(sx, sy) {
  const { scale, offsetX, offsetY } = state.view2d;
  return {
    u: (sx - offsetX) / scale,
    v: (sy - offsetY) / scale
  };
}

function uvToScreen(u, v) {
  const { scale, offsetX, offsetY } = state.view2d;
  return {
    x: offsetX + u * scale,
    y: offsetY + v * scale
  };
}

// Render the interactive 2D Sewing Pattern Editor Canvas + Rulers
function render2dEditor() {
  const pats = getActivePatterns();
  if (!pats) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas2d.clientWidth;
  const h = canvas2d.clientHeight;
  if (canvas2d.width !== w * dpr || canvas2d.height !== h * dpr) {
    canvas2d.width = w * dpr;
    canvas2d.height = h * dpr;
  }

  ctx2d.save();
  ctx2d.scale(dpr, dpr);

  // Dark studio pattern table background
  ctx2d.fillStyle = '#232625';
  ctx2d.fillRect(0, 0, w, h);

  const { scale, offsetX, offsetY } = state.view2d;

  ctx2d.save();
  ctx2d.translate(offsetX, offsetY);

  // Draw each of the 5 sewing pattern pieces
  Object.entries(pats).forEach(([pieceKey, pieceData]) => {
    const color = state.pieceColors[pieceKey] || '#65745a';
    const b = pieceData.bbox;
    const cx = ((b.minU + b.maxU) / 2) * scale;
    const cy = ((b.minV + b.maxV) / 2) * scale;

    // 1. Pattern piece silhouette & clip
    ctx2d.save();
    tracePiecePolygon(ctx2d, pieceData.points, scale, scale);
    ctx2d.fillStyle = color;
    ctx2d.fill();

    // Subtle border outline
    ctx2d.lineWidth = 1.2;
    ctx2d.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx2d.stroke();

    ctx2d.clip();

    // Draw all graphics/text layers belonging to this piece
    state.layers.forEach((layer) => {
      if (layer.piece === pieceKey) {
        drawLayerOnContext(ctx2d, layer, scale);
      }
    });

    // Pattern Markings (dashed centerlines, neck rib fold boxes)
    if (state.patternMarkings) {
      ctx2d.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx2d.lineWidth = 1;
      ctx2d.setLineDash([4, 4]);

      if (pieceKey === 'neck_rib') {
        // Two inner fold rectangles for "Neck rib - front" and "Neck rib - back"
        const rw = (b.maxU - b.minU) * scale;
        const rh = (b.maxV - b.minV) * scale;
        const rx = b.minU * scale;
        const ry = b.minV * scale;
        ctx2d.setLineDash([]);
        ctx2d.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx2d.strokeRect(rx + rw * 0.03, ry + rh * 0.22, rw * 0.34, rh * 0.56);
        ctx2d.strokeRect(rx + rw * 0.63, ry + rh * 0.22, rw * 0.34, rh * 0.56);
      } else {
        // Vertical centerline
        ctx2d.beginPath();
        ctx2d.moveTo(cx, b.minV * scale);
        ctx2d.lineTo(cx, b.maxV * scale);
        ctx2d.stroke();

        // Horizontal chest/guideline on Front and Back
        if (pieceKey === 'front' || pieceKey === 'back') {
          const chestY = (b.minV + (b.maxV - b.minV) * 0.32) * scale;
          ctx2d.beginPath();
          ctx2d.moveTo(b.minU * scale, chestY);
          ctx2d.lineTo(b.maxU * scale, chestY);
          ctx2d.stroke();
        }
      }
      ctx2d.setLineDash([]);
    }

    ctx2d.restore();

    // 2. Pattern Piece Labels & Dimensions (Matches user's screenshot!)
    if (state.patternMarkings) {
      ctx2d.fillStyle = '#c4ccc8';
      ctx2d.textAlign = 'center';
      const fontSizeTitle = Math.max(9, Math.min(12, scale * 0.016));
      const fontSizeSub = Math.max(8, Math.min(10.5, scale * 0.0135));

      if (pieceKey === 'neck_rib') {
        const rw = (b.maxU - b.minU) * scale;
        const rx = b.minU * scale;
        const labelY = b.maxV * scale + fontSizeSub + 3;
        ctx2d.font = `500 ${fontSizeSub}px Inter, sans-serif`;
        ctx2d.fillText('Neck rib - front', rx + rw * 0.20, labelY);
        ctx2d.fillText('Neck rib - back', rx + rw * 0.80, labelY);
      } else {
        const meta = PIECE_META[pieceKey];
        const cmW = meta.cmW;
        const cmH = state.modelType === 'long' ? meta.cmH_long : meta.cmH_short;
        const dimStr = formatDimensionPair(cmW, cmH, state.unit);

        const labelY = b.maxV * scale + fontSizeTitle + 5;
        ctx2d.font = `600 ${fontSizeTitle}px Inter, sans-serif`;
        ctx2d.fillStyle = '#d5ddda';
        ctx2d.fillText(meta.title, cx, labelY);

        ctx2d.font = `400 ${fontSizeSub}px Inter, sans-serif`;
        ctx2d.fillStyle = '#848e8a';
        ctx2d.fillText(`${dimStr} · cut 1`, cx, labelY + fontSizeSub + 3);
      }
    }
  });

  // Draw Selection Gizmo around the currently selected layer
  const selLayer = getSelectedLayer();
  if (selLayer) {
    const lx = selLayer.u * scale;
    const ly = selLayer.v * scale;
    const lw = selLayer.w * scale;
    const lh = selLayer.h * scale;

    ctx2d.save();
    ctx2d.translate(lx, ly);
    ctx2d.rotate((selLayer.rotation * Math.PI) / 180);

    // Selection bounding box
    ctx2d.strokeStyle = '#38b27b';
    ctx2d.lineWidth = 1.5;
    ctx2d.strokeRect(-lw / 2, -lh / 2, lw, lh);

    // Rotation stem & handle at top
    ctx2d.beginPath();
    ctx2d.moveTo(0, -lh / 2);
    ctx2d.lineTo(0, -lh / 2 - 18);
    ctx2d.stroke();

    ctx2d.fillStyle = '#a6c83b';
    ctx2d.beginPath();
    ctx2d.arc(0, -lh / 2 - 18, 5.5, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.strokeStyle = '#151716';
    ctx2d.stroke();

    // 4 Corner scale handles
    const corners = [
      [-lw / 2, -lh / 2],
      [lw / 2, -lh / 2],
      [lw / 2, lh / 2],
      [-lw / 2, lh / 2]
    ];
    corners.forEach(([cx, cy]) => {
      ctx2d.fillStyle = '#ffffff';
      ctx2d.strokeStyle = '#151716';
      ctx2d.lineWidth = 1.5;
      ctx2d.fillRect(cx - 4.5, cy - 4.5, 9, 9);
      ctx2d.strokeRect(cx - 4.5, cy - 4.5, 9, 9);
    });

    ctx2d.restore();
  }

  ctx2d.restore();
  ctx2d.restore();

  renderRulers();
}

function formatDimensionPair(cmW, cmH, unit) {
  if (unit === 'mm') {
    return `${Math.round(cmW * 10)} × ${Math.round(cmH * 10)} mm`;
  } else if (unit === 'in') {
    return `${(cmW / 2.54).toFixed(1)} × ${(cmH / 2.54).toFixed(1)} in`;
  }
  return `${cmW} × ${cmH} cm`;
}

// Render Top & Left Rulers (Matches screenshot's 0, 10, 20... 120 cm ruler!)
function renderRulers() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  // 1.0 UV space corresponds to 130 cm total table width
  const totalCm = 130;
  const unitFactor = state.unit === 'mm' ? 10 : state.unit === 'in' ? 1 / 2.54 : 1;
  const majorStep = state.unit === 'mm' ? 100 : state.unit === 'in' ? 5 : 10;
  const minorStep = majorStep / 5;

  // Top Ruler
  const tw = rulerTop.clientWidth;
  const th = rulerTop.clientHeight;
  if (rulerTop.width !== tw * dpr || rulerTop.height !== th * dpr) {
    rulerTop.width = tw * dpr;
    rulerTop.height = th * dpr;
  }
  const rtx = rulerTop.getContext('2d');
  rtx.save();
  rtx.scale(dpr, dpr);
  rtx.fillStyle = '#191c1b';
  rtx.fillRect(0, 0, tw, th);
  rtx.strokeStyle = '#454d4a';
  rtx.fillStyle = '#8b9490';
  rtx.font = '10px "JetBrains Mono", monospace';

  const maxVal = totalCm * unitFactor;
  for (let v = 0; v <= maxVal; v += minorStep) {
    const u = v / maxVal;
    const x = state.view2d.offsetX + u * state.view2d.scale;
    if (x < 0 || x > tw) continue;
    const isMajor = Math.abs(v % majorStep) < 0.001 || Math.abs((v % majorStep) - majorStep) < 0.001;
    rtx.beginPath();
    rtx.moveTo(x, isMajor ? 4 : 14);
    rtx.lineTo(x, th);
    rtx.stroke();
    if (isMajor) {
      rtx.fillText(Math.round(v).toString(), x + 3, 12);
    }
  }
  rtx.restore();

  // Left Ruler
  const lw = rulerLeft.clientWidth;
  const lh = rulerLeft.clientHeight;
  if (rulerLeft.width !== lw * dpr || rulerLeft.height !== lh * dpr) {
    rulerLeft.width = lw * dpr;
    rulerLeft.height = lh * dpr;
  }
  const rlx = rulerLeft.getContext('2d');
  rlx.save();
  rlx.scale(dpr, dpr);
  rlx.fillStyle = '#191c1b';
  rlx.fillRect(0, 0, lw, lh);
  rlx.strokeStyle = '#454d4a';
  rlx.fillStyle = '#8b9490';
  rlx.font = '10px "JetBrains Mono", monospace';

  for (let v = 0; v <= maxVal; v += minorStep) {
    const u = v / maxVal;
    const y = state.view2d.offsetY + u * state.view2d.scale;
    if (y < 0 || y > lh) continue;
    const isMajor = Math.abs(v % majorStep) < 0.001 || Math.abs((v % majorStep) - majorStep) < 0.001;
    rlx.beginPath();
    rlx.moveTo(isMajor ? 4 : 14, y);
    rlx.lineTo(lw, y);
    rlx.stroke();
    if (isMajor) {
      rlx.save();
      rlx.translate(11, y + 3);
      rlx.rotate(-Math.PI / 2);
      rlx.fillText(Math.round(v).toString(), 0, 0);
      rlx.restore();
    }
  }
  rlx.restore();
}

function renderAll() {
  render3dFabricTexture();
  render2dEditor();
  updateContextUI();
}

// ============================================================================
// LAYER MANAGEMENT & HIT TESTING IN 2D PATTERN EDITOR
// ============================================================================
let nextLayerId = 1;

function getSelectedLayer() {
  return state.layers.find((l) => l.id === state.selectedLayerId) || null;
}

function detectPieceAtUV(u, v) {
  const pats = getActivePatterns();
  if (!pats) return 'front';
  for (const [pieceKey, pieceData] of Object.entries(pats)) {
    const b = pieceData.bbox;
    if (u >= b.minU - 0.02 && u <= b.maxU + 0.02 && v >= b.minV - 0.02 && v <= b.maxV + 0.02) {
      return pieceKey;
    }
  }
  return null;
}

function addImageLayerFromUrl(url, name, options = {}) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const aspect = (img.naturalWidth || 200) / (img.naturalHeight || 200);
    const piece = options.piece || 'front';
    const pats = getActivePatterns();
    const b = pats && pats[piece] ? pats[piece].bbox : { minU: 0.085, minV: 0.415, maxU: 0.47, maxV: 0.955 };

    const defaultW = options.w || 0.14;
    const defaultH = options.h || defaultW / aspect;
    const defaultU = options.u !== undefined ? options.u : (b.minU + b.maxU) / 2;
    const defaultV = options.v !== undefined ? options.v : (b.minV + b.maxV) / 2;

    const layer = {
      id: nextLayerId++,
      type: 'image',
      name: name || 'Tasarım',
      piece,
      u: defaultU,
      v: defaultV,
      w: defaultW,
      h: defaultH,
      rotation: 0,
      flipX: false,
      img
    };
    state.layers.push(layer);
    if (options.select !== false) {
      state.selectedLayerId = layer.id;
    }
    renderAll();
  };
  img.src = url;
}

function addTextLayer(textStr = 'STUDIO 3D') {
  const pats = getActivePatterns();
  const b = pats ? pats.front.bbox : { minU: 0.085, minV: 0.415, maxU: 0.47, maxV: 0.955 };
  const layer = {
    id: nextLayerId++,
    type: 'text',
    name: `Metin: ${textStr}`,
    piece: 'front',
    u: (b.minU + b.maxU) / 2,
    v: b.minV + (b.maxV - b.minV) * 0.36,
    w: 0.18,
    h: 0.055,
    rotation: 0,
    flipX: false,
    text: textStr,
    font: 'Oswald',
    color: '#ffffff'
  };
  state.layers.push(layer);
  state.selectedLayerId = layer.id;
  renderAll();
}

function updateContextUI() {
  const bar = document.getElementById('layerContextBar');
  const textBar = document.getElementById('textEditBar');
  const sel = getSelectedLayer();
  if (!sel) {
    bar.classList.add('hidden');
    textBar.classList.add('hidden');
    return;
  }
  bar.classList.remove('hidden');
  document.getElementById('selectedLayerName').textContent = sel.name;

  if (sel.type === 'text') {
    textBar.classList.remove('hidden');
    document.getElementById('textContentInput').value = sel.text;
    document.getElementById('textFontSelect').value = sel.font;
    document.getElementById('textColorInput').value = sel.color;
  } else {
    textBar.classList.add('hidden');
  }
}

// Interactive Mouse / Pointer handling on #canvas2d
let dragState = null; // { mode: 'pan' | 'move' | 'scale' | 'rotate', ... }
let isSpaceDown = false;

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.code === 'Space') {
    isSpaceDown = true;
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    if (state.selectedLayerId) {
      state.layers = state.layers.filter((l) => l.id !== state.selectedLayerId);
      state.selectedLayerId = null;
      renderAll();
    }
  } else if (e.key === 'v' || e.key === 'V') {
    setActiveTool('select');
  } else if (e.key === 'h' || e.key === 'H') {
    setActiveTool('pan');
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') isSpaceDown = false;
});

function hitTestLayerHandle(layer, sx, sy) {
  const { scale, offsetX, offsetY } = state.view2d;
  const cx = offsetX + layer.u * scale;
  const cy = offsetY + layer.v * scale;
  const lw = layer.w * scale;
  const lh = layer.h * scale;

  // Transform screen point into layer-local unrotated coordinates
  const dx = sx - cx;
  const dy = sy - cy;
  const rad = (-layer.rotation * Math.PI) / 180;
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

  // Check rotation handle at (0, -lh/2 - 18)
  if (Math.hypot(lx - 0, ly - (-lh / 2 - 18)) <= 10) {
    return 'rotate';
  }

  // Check 4 corner scale handles
  const corners = [
    [-lw / 2, -lh / 2],
    [lw / 2, -lh / 2],
    [lw / 2, lh / 2],
    [-lw / 2, lh / 2]
  ];
  for (const [kx, ky] of corners) {
    if (Math.abs(lx - kx) <= 9 && Math.abs(ly - ky) <= 9) {
      return 'scale';
    }
  }

  // Check inside bounding box
  if (Math.abs(lx) <= lw / 2 && Math.abs(ly) <= lh / 2) {
    return 'move';
  }
  return null;
}

canvas2d.addEventListener('pointerdown', (e) => {
  const rect = canvas2d.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  if (state.activeTool === 'pan' || isSpaceDown || e.button === 1) {
    dragState = {
      mode: 'pan',
      startX: sx,
      startY: sy,
      origOffsetX: state.view2d.offsetX,
      origOffsetY: state.view2d.offsetY
    };
    canvas2d.setPointerCapture(e.pointerId);
    return;
  }

  // First check handles on currently selected layer
  const sel = getSelectedLayer();
  if (sel) {
    const hit = hitTestLayerHandle(sel, sx, sy);
    if (hit) {
      const { u, v } = screenToUV(sx, sy);
      dragState = {
        mode: hit,
        layer: sel,
        startU: u,
        startV: v,
        origU: sel.u,
        origV: sel.v,
        origW: sel.w,
        origH: sel.h,
        origRot: sel.rotation,
        origDist: Math.max(0.005, Math.hypot(u - sel.u, v - sel.v))
      };
      canvas2d.setPointerCapture(e.pointerId);
      return;
    }
  }

  // Otherwise check top-down across all layers
  for (let i = state.layers.length - 1; i >= 0; i--) {
    const layer = state.layers[i];
    const hit = hitTestLayerHandle(layer, sx, sy);
    if (hit) {
      state.selectedLayerId = layer.id;
      const { u, v } = screenToUV(sx, sy);
      dragState = {
        mode: 'move',
        layer,
        startU: u,
        startV: v,
        origU: layer.u,
        origV: layer.v
      };
      canvas2d.setPointerCapture(e.pointerId);
      renderAll();
      return;
    }
  }

  // Clicked empty space -> deselect or pan if dragged
  state.selectedLayerId = null;
  dragState = {
    mode: 'pan',
    startX: sx,
    startY: sy,
    origOffsetX: state.view2d.offsetX,
    origOffsetY: state.view2d.offsetY
  };
  canvas2d.setPointerCapture(e.pointerId);
  renderAll();
});

canvas2d.addEventListener('pointermove', (e) => {
  if (!dragState) return;
  const rect = canvas2d.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;

  if (dragState.mode === 'pan') {
    state.view2d.offsetX = dragState.origOffsetX + (sx - dragState.startX);
    state.view2d.offsetY = dragState.origOffsetY + (sy - dragState.startY);
    render2dEditor();
    return;
  }

  const { u, v } = screenToUV(sx, sy);
  const layer = dragState.layer;

  if (dragState.mode === 'move') {
    layer.u = dragState.origU + (u - dragState.startU);
    layer.v = dragState.origV + (v - dragState.startV);
    const newPiece = detectPieceAtUV(layer.u, layer.v);
    if (newPiece) {
      layer.piece = newPiece;
    }
    renderAll();
  } else if (dragState.mode === 'scale') {
    const dist = Math.max(0.005, Math.hypot(u - layer.u, v - layer.v));
    const ratio = dist / dragState.origDist;
    layer.w = Math.max(0.015, Math.min(0.65, dragState.origW * ratio));
    layer.h = Math.max(0.015, Math.min(0.65, dragState.origH * ratio));
    renderAll();
  } else if (dragState.mode === 'rotate') {
    const angle = Math.atan2(v - layer.v, u - layer.u) * (180 / Math.PI) + 90;
    layer.rotation = e.shiftKey ? Math.round(angle / 15) * 15 : angle;
    renderAll();
  }
});

canvas2d.addEventListener('pointerup', (e) => {
  if (dragState) {
    dragState = null;
    canvas2d.releasePointerCapture(e.pointerId);
  }
});

// Mouse wheel zoom on 2D pattern canvas
canvas2d.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const rect = canvas2d.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newScale = Math.max(150, Math.min(2800, state.view2d.scale * factor));
    const ratio = newScale / state.view2d.scale;
    state.view2d.offsetX = mx - (mx - state.view2d.offsetX) * ratio;
    state.view2d.offsetY = my - (my - state.view2d.offsetY) * ratio;
    state.view2d.scale = newScale;
    updateZoomLabel();
    render2dEditor();
  },
  { passive: false }
);

// Drag & Drop image files directly onto the 2D Pattern Canvas
const patternWrap = document.getElementById('patternCanvasWrap');
patternWrap.addEventListener('dragover', (e) => {
  e.preventDefault();
});
patternWrap.addEventListener('drop', (e) => {
  e.preventDefault();
  const rect = canvas2d.getBoundingClientRect();
  const { u, v } = screenToUV(e.clientX - rect.left, e.clientY - rect.top);
  const targetPiece = detectPieceAtUV(u, v) || 'front';
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleUploadedFiles(e.dataTransfer.files, { piece: targetPiece, u, v });
  }
});

function handleUploadedFiles(fileList, dropOpts = {}) {
  Array.from(fileList).forEach((file) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const cleanName = file.name.replace(/\.[^.]+$/, '');
      addImageLayerFromUrl(ev.target.result, cleanName, dropOpts);
    };
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// UI CONTROLS & EVENT BINDINGS
// ============================================================================
function setActiveTool(toolName) {
  state.activeTool = toolName;
  document.getElementById('toolSelect').classList.toggle('active', toolName === 'select');
  document.getElementById('toolPan').classList.toggle('active', toolName === 'pan');
  canvas2d.style.cursor = toolName === 'pan' ? 'grab' : 'default';
}

function setupUIEvents() {
  // 1. Model Switcher (Short Sleeve vs Long Sleeve)
  const modelSelect = document.getElementById('modelSelect');
  modelSelect.addEventListener('change', async (e) => {
    const newType = e.target.value;
    await loadGarmentModel(newType);
  });

  // 2. Quick Camera Angle Buttons
  const camPresets = {
    front: { pos: [0.0, 0.08, 0.82], target: [0, 0.02, 0] },
    back: { pos: [0.0, 0.08, -0.82], target: [0, 0.02, 0] },
    left: { pos: [0.78, 0.06, 0.22], target: [0, 0.02, 0] },
    right: { pos: [-0.78, 0.06, 0.22], target: [0, 0.02, 0] },
    collar: { pos: [-0.14, 0.16, 0.56], target: [0.02, 0.10, 0] }
  };

  document.querySelectorAll('.cam-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cam-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const preset = camPresets[btn.dataset.cam];
      if (preset) {
        animateCameraTo(preset.pos, preset.target);
      }
    });
  });

  document.getElementById('btnResetView').addEventListener('click', () => {
    garmentGroup.rotation.y = 0;
    animateCameraTo([-0.16, 0.12, 0.78], [0, 0.04, 0]);
  });

  const btnQuickSpin = document.getElementById('btnQuickSpin');
  const toggleAutoRotate = document.getElementById('toggleAutoRotate');
  btnQuickSpin.addEventListener('click', () => {
    state.autoRotate = !state.autoRotate;
    toggleAutoRotate.checked = state.autoRotate;
    btnQuickSpin.classList.toggle('active', state.autoRotate);
  });
  toggleAutoRotate.addEventListener('change', (e) => {
    state.autoRotate = e.target.checked;
    btnQuickSpin.classList.toggle('active', state.autoRotate);
  });

  // 3. 2D Floating Tools
  document.getElementById('toolSelect').addEventListener('click', () => setActiveTool('select'));
  document.getElementById('toolPan').addEventListener('click', () => setActiveTool('pan'));
  document.getElementById('fileInput').addEventListener('change', (e) => {
    handleUploadedFiles(e.target.files);
    e.target.value = '';
  });
  document.getElementById('toolAddText').addEventListener('click', () => addTextLayer('YOUR DESIGN'));

  // Presets Drawer
  const presetsPopover = document.getElementById('presetsPopover');
  document.getElementById('toolPresets').addEventListener('click', () => {
    presetsPopover.classList.toggle('hidden');
  });
  document.getElementById('btnClosePresets').addEventListener('click', () => {
    presetsPopover.classList.add('hidden');
  });
  document.getElementById('btnClearAllLayers').addEventListener('click', () => {
    state.layers = [];
    state.selectedLayerId = null;
    renderAll();
  });

  const presetsGrid = document.getElementById('presetsGrid');
  PRESET_DESIGNS.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'preset-card';
    card.innerHTML = `<img src="${p.url}" alt="${p.name}" /><span>${p.name}</span>`;
    card.addEventListener('click', () => {
      addImageLayerFromUrl(p.url, p.name, {
        piece: p.defaultPiece,
        u: p.defaultU,
        v: p.defaultV,
        w: p.defaultW,
        h: p.defaultH
      });
    });
    presetsGrid.appendChild(card);
  });

  // Unit selector (mm / cm / in)
  document.querySelectorAll('.unit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.unit-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.unit = btn.dataset.unit;
      render2dEditor();
    });
  });

  // Layer Context Bar actions
  document.getElementById('btnCenterPiece').addEventListener('click', () => {
    const sel = getSelectedLayer();
    const pats = getActivePatterns();
    if (sel && pats && pats[sel.piece]) {
      const b = pats[sel.piece].bbox;
      sel.u = (b.minU + b.maxU) / 2;
      renderAll();
    }
  });
  document.getElementById('btnFlipH').addEventListener('click', () => {
    const sel = getSelectedLayer();
    if (sel) {
      sel.flipX = !sel.flipX;
      renderAll();
    }
  });
  document.getElementById('btnDuplicate').addEventListener('click', () => {
    const sel = getSelectedLayer();
    if (sel) {
      const copy = { ...sel, id: nextLayerId++, u: sel.u + 0.03, v: sel.v + 0.03 };
      state.layers.push(copy);
      state.selectedLayerId = copy.id;
      renderAll();
    }
  });
  document.getElementById('btnDeleteLayer').addEventListener('click', () => {
    if (state.selectedLayerId) {
      state.layers = state.layers.filter((l) => l.id !== state.selectedLayerId);
      state.selectedLayerId = null;
      renderAll();
    }
  });

  // Text layer live editing
  document.getElementById('textContentInput').addEventListener('input', (e) => {
    const sel = getSelectedLayer();
    if (sel && sel.type === 'text') {
      sel.text = e.target.value;
      sel.name = `Metin: ${sel.text}`;
      renderAll();
    }
  });
  document.getElementById('textFontSelect').addEventListener('change', (e) => {
    const sel = getSelectedLayer();
    if (sel && sel.type === 'text') {
      sel.font = e.target.value;
      renderAll();
    }
  });
  document.getElementById('textColorInput').addEventListener('input', (e) => {
    const sel = getSelectedLayer();
    if (sel && sel.type === 'text') {
      sel.color = e.target.value;
      renderAll();
    }
  });

  // Zoom buttons
  document.getElementById('btnZoomIn').addEventListener('click', () => {
    state.view2d.scale = Math.min(2800, state.view2d.scale * 1.2);
    updateZoomLabel();
    render2dEditor();
  });
  document.getElementById('btnZoomOut').addEventListener('click', () => {
    state.view2d.scale = Math.max(150, state.view2d.scale / 1.2);
    updateZoomLabel();
    render2dEditor();
  });
  document.getElementById('btnZoomFit').addEventListener('click', () => {
    fitPatternView();
    render2dEditor();
  });

  // 4. Right Sidebar: Garment & Piece Colors
  const pieceSelect = document.getElementById('activePieceColorSelect');
  function applyPieceColor(hex) {
    const target = pieceSelect.value;
    if (target === 'body_all') {
      state.pieceColors.front = hex;
      state.pieceColors.back = hex;
      state.pieceColors.right_sleeve = hex;
      state.pieceColors.left_sleeve = hex;
    } else {
      state.pieceColors[target] = hex;
    }
    renderAll();
  }

  document.querySelectorAll('#fabricSwatches .swatch[data-color]').forEach((sw) => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('#fabricSwatches .swatch').forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      applyPieceColor(sw.dataset.color);
    });
  });
  document.getElementById('customFabricColor').addEventListener('input', (e) => {
    applyPieceColor(e.target.value);
  });
  document.getElementById('btnSyncAllColors').addEventListener('click', () => {
    const c = state.pieceColors.front;
    Object.keys(state.pieceColors).forEach((k) => (state.pieceColors[k] = c));
    renderAll();
  });

  // Fabric Bump Slider
  const sliderFabricBump = document.getElementById('sliderFabricBump');
  sliderFabricBump.addEventListener('input', (e) => {
    state.fabricBump = Number(e.target.value) / 100;
    document.getElementById('valFabricBump').textContent = `${e.target.value}%`;
    updateFabricBump();
  });

  // 5. Right Sidebar: Studio Backdrop & HDRI
  document.getElementById('sliderHdriIntensity').addEventListener('input', (e) => {
    state.backdrop.hdriIntensity = Number(e.target.value) / 100;
    document.getElementById('valHdriIntensity').textContent = state.backdrop.hdriIntensity.toFixed(1);
    updateStudioBackdrop();
  });
  document.getElementById('sliderHdriRotation').addEventListener('input', (e) => {
    state.backdrop.hdriRotation = Number(e.target.value);
    document.getElementById('valHdriRotation').textContent = `${e.target.value}°`;
    updateStudioBackdrop();
  });
  document.getElementById('toggleBackdrop').addEventListener('change', (e) => {
    state.backdrop.enabled = e.target.checked;
    updateStudioBackdrop();
  });
  document.getElementById('toggleBackdropShadow').addEventListener('change', (e) => {
    state.backdrop.shadow = e.target.checked;
    updateStudioBackdrop();
  });
  document.querySelectorAll('#backdropSwatches .swatch[data-bg]').forEach((sw) => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('#backdropSwatches .swatch').forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      state.backdrop.color = sw.dataset.bg;
      updateStudioBackdrop();
    });
  });
  document.getElementById('customBackdropColor').addEventListener('input', (e) => {
    state.backdrop.color = e.target.value;
    updateStudioBackdrop();
  });
  document.getElementById('backdropLightSelect').addEventListener('change', (e) => {
    state.backdrop.lightType = e.target.value;
    updateStudioBackdrop();
  });
  document.getElementById('toggleInvertLight').addEventListener('change', (e) => {
    state.backdrop.invertLight = e.target.checked;
    updateStudioBackdrop();
  });
  document.getElementById('sliderBgBrightness').addEventListener('input', (e) => {
    state.backdrop.brightness = Number(e.target.value) / 100;
    document.getElementById('valBgBrightness').textContent = `${e.target.value}%`;
    updateStudioBackdrop();
  });
  document.getElementById('sliderBgContrast').addEventListener('input', (e) => {
    state.backdrop.contrast = Number(e.target.value) / 100;
    document.getElementById('valBgContrast').textContent = `${e.target.value}%`;
    updateStudioBackdrop();
  });

  // 6. Right Sidebar: Details (Neck Label, Pattern Markings)
  document.getElementById('toggleNeckLabel').addEventListener('change', (e) => {
    state.neckLabel.enabled = e.target.checked;
    updateNeckLabel();
  });
  document.getElementById('labelShapeSelect').addEventListener('change', (e) => {
    state.neckLabel.shape = e.target.value;
    updateNeckLabel();
  });
  document.querySelectorAll('#labelSwatches .swatch').forEach((sw) => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('#labelSwatches .swatch').forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      state.neckLabel.color = sw.dataset.labelColor;
      updateNeckLabel();
    });
  });
  document.getElementById('togglePatternMarkings').addEventListener('change', (e) => {
    state.patternMarkings = e.target.checked;
    render2dEditor();
  });

  // 7. Splitter Drag (Resize 3D Viewport vs 2D Pattern Editor)
  const splitterBar = document.getElementById('splitterBar');
  let isSplitting = false;
  splitterBar.addEventListener('pointerdown', (e) => {
    isSplitting = true;
    splitterBar.setPointerCapture(e.pointerId);
  });
  splitterBar.addEventListener('pointermove', (e) => {
    if (!isSplitting) return;
    const totalH = window.innerHeight;
    const newTopH = Math.max(200, Math.min(totalH - 220, e.clientY));
    viewport3dContainer.style.height = `${newTopH}px`;
    handleWindowResize();
  });
  splitterBar.addEventListener('pointerup', (e) => {
    if (isSplitting) {
      isSplitting = false;
      splitterBar.releasePointerCapture(e.pointerId);
    }
  });

  // 8. Export Suite Buttons
  document.getElementById('btnExportTransparentPng').addEventListener('click', () => export3dSnapshot(true));
  document.getElementById('btnExportStudioPng').addEventListener('click', () => export3dSnapshot(false));
  document.getElementById('btnExportVideo360').addEventListener('click', () => export360ShowcaseVideo());
  document.getElementById('btnExportPattern2d').addEventListener('click', () => export2dPatternSheet());
  document.getElementById('btnSaveToPromptVault').addEventListener('click', () => saveRenderToPromptVault());

  // 8b. PromptVault Drawer Controls
  const pvPopover = document.getElementById('promptVaultPopover');
  document.getElementById('toolPromptVault').addEventListener('click', () => {
    presetsPopover.classList.add('hidden');
    pvPopover.classList.toggle('hidden');
    if (!pvPopover.classList.contains('hidden')) {
      connectAndFetchPromptVault();
    }
  });
  document.getElementById('btnClosePV').addEventListener('click', () => {
    pvPopover.classList.add('hidden');
  });
  document.getElementById('btnPvConnect').addEventListener('click', () => {
    connectAndFetchPromptVault();
  });
  document.getElementById('pvWorkspaceSelect').addEventListener('change', () => {
    fetchPromptVaultImages();
  });
  let pvSearchTimer = null;
  document.getElementById('pvSearchInput').addEventListener('input', () => {
    clearTimeout(pvSearchTimer);
    pvSearchTimer = setTimeout(() => fetchPromptVaultImages(), 260);
  });

  // 9. Reset to Default Scene
  document.getElementById('btnResetDefaults').addEventListener('click', () => {
    resetToDefaultScene();
  });
}

// ============================================================================
// PROMPTVAULT LIVE BRIDGE & PLUGIN API
// ============================================================================
function getPromptVaultBaseUrl() {
  const input = document.getElementById('pvServerUrl');
  return (input && input.value ? input.value.trim() : 'http://127.0.0.1:7860').replace(/\/+$/, '');
}

async function connectAndFetchPromptVault() {
  const baseUrl = getPromptVaultBaseUrl();
  const dot = document.getElementById('pvStatusDot');
  const wsSelect = document.getElementById('pvWorkspaceSelect');
  try {
    const res = await fetch(`${baseUrl}/api/workspaces`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const workspaces = await res.json();
    dot.className = 'pv-status-dot online';
    const currentVal = wsSelect.value;
    wsSelect.innerHTML = '<option value="">Tüm Projeler (Workspaces)</option>';
    (workspaces || []).forEach((ws) => {
      const opt = document.createElement('option');
      opt.value = ws.id;
      opt.textContent = `${ws.icon || '🎨'} ${ws.name} (${ws.image_count || 0})`;
      wsSelect.appendChild(opt);
    });
    wsSelect.value = currentVal;
    await fetchPromptVaultImages();
  } catch (err) {
    dot.className = 'pv-status-dot offline';
    const grid = document.getElementById('pvGalleryGrid');
    grid.innerHTML = `<div class="pv-empty">PromptVault sunucusuna (${baseUrl}) ulaşılamadı.<br/>PromptVault'un açık olduğundan emin olun.</div>`;
  }
}

async function fetchPromptVaultImages() {
  const baseUrl = getPromptVaultBaseUrl();
  const wsId = document.getElementById('pvWorkspaceSelect').value;
  const q = document.getElementById('pvSearchInput').value.trim();
  const grid = document.getElementById('pvGalleryGrid');

  try {
    const params = new URLSearchParams({ limit: '48', sort: 'added' });
    if (q) params.set('q', q);
    if (wsId) params.set('workspace_id', wsId);

    const res = await fetch(`${baseUrl}/api/images?${params.toString()}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const items = data.items || [];

    if (items.length === 0) {
      grid.innerHTML = '<div class="pv-empty">Bu filtrede görsel bulunamadı.</div>';
      return;
    }

    grid.innerHTML = '';
    items.forEach((item) => {
      const thumbUrl = `${baseUrl}/api/images/${item.id}/thumb`;
      const fullUrl = `${baseUrl}/api/images/${item.id}/file`;
      const label = item.prompt ? item.prompt.slice(0, 32) : `Görsel #${item.id}`;
      const card = document.createElement('div');
      card.className = 'pv-card';
      card.title = item.prompt || label;
      card.innerHTML = `<img src="${thumbUrl}" loading="lazy" alt="${label}" /><span>#${item.id} ${label}</span>`;
      card.addEventListener('click', () => {
        const piece = document.getElementById('pvTargetPiece').value || 'front';
        addImageLayerFromUrl(fullUrl, `PV #${item.id}`, { piece });
      });
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = '<div class="pv-empty">Görseller alınırken hata oluştu.</div>';
  }
}

async function saveRenderToPromptVault() {
  const baseUrl = getPromptVaultBaseUrl();
  const btnText = document.getElementById('btnSaveToPvText');
  const origLabel = btnText.textContent;
  btnText.textContent = 'PromptVault Kasasına Kaydediliyor...';

  try {
    const origW = viewport3dContainer.clientWidth;
    const origH = viewport3dContainer.clientHeight;
    renderer.setSize(1600, 1600, false);
    camera.aspect = 1.0;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);

    const dataUrl = canvas3d.toDataURL('image/png');

    renderer.setSize(origW, origH, false);
    camera.aspect = origW / origH;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);

    const wsIdStr = document.getElementById('pvWorkspaceSelect')?.value;
    const body = {
      prompt: `3D T-Shirt Mockup (${state.modelType === 'long' ? 'Uzun Kollu' : 'Kısa Kollu'})`,
      generator: '3D T-Shirt Studio',
      model: state.modelType === 'long' ? 'Long Sleeve Crew Neck' : 'Oversize Crew Neck',
      tags: ['3d-mockup', 'tshirt-studio', state.modelType],
      notes: `Parça Renkleri: Gövde ${state.pieceColors.front}, Yaka ${state.pieceColors.neck_rib}`,
      data_b64: dataUrl,
      filename: `tshirt-3d-${state.modelType}-${Date.now()}.png`,
      workspace_id: wsIdStr ? Number(wsIdStr) : null
    };

    const res = await fetch(`${baseUrl}/api/manual-add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const saved = await res.json();
    btnText.textContent = `✓ Kasaya Kaydedildi (ID: #${saved.id || 'OK'})`;
    setTimeout(() => {
      btnText.textContent = origLabel;
    }, 3000);
  } catch (err) {
    btnText.textContent = '✕ PromptVault Açık Değil (7860)';
    setTimeout(() => {
      btnText.textContent = origLabel;
    }, 3500);
  }
}

// Listen for postMessage & URL Query Params from PromptVault or external host apps
function setupExternalPluginHooks() {
  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'LOAD_TSHIRT_DESIGN' && msg.url) {
      addImageLayerFromUrl(msg.url, msg.name || 'PromptVault Tasarımı', {
        piece: msg.piece || 'front'
      });
    } else if (msg.type === 'SET_TSHIRT_MODEL' && (msg.model === 'short' || msg.model === 'long')) {
      document.getElementById('modelSelect').value = msg.model;
      loadGarmentModel(msg.model, true);
    } else if (msg.type === 'SET_TSHIRT_COLOR' && msg.color) {
      Object.keys(state.pieceColors).forEach((k) => (state.pieceColors[k] = msg.color));
      renderAll();
    }
  });

  const params = new URLSearchParams(window.location.search);
  const pvUrl = params.get('pv_url');
  if (pvUrl) {
    const input = document.getElementById('pvServerUrl');
    if (input) input.value = pvUrl;
  }
  const imgUrl = params.get('image');
  const pvId = params.get('pv_id');
  const piece = params.get('piece') || 'front';
  const modelParam = params.get('model');
  if (modelParam === 'long' || modelParam === 'short') {
    document.getElementById('modelSelect').value = modelParam;
    loadGarmentModel(modelParam, true);
  }
  if (imgUrl) {
    addImageLayerFromUrl(imgUrl, params.get('name') || 'Harici Tasarım', { piece });
  } else if (pvId) {
    const base = (pvUrl || getPromptVaultBaseUrl()).replace(/\/+$/, '');
    addImageLayerFromUrl(`${base}/api/images/${pvId}/file`, `PV #${pvId}`, { piece });
  }
}

// ============================================================================
// EXPORT SUITE (TRANSPARENT PNG, STUDIO PNG, 360 VIDEO, 2D PATTERN SHEET)
// ============================================================================
function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function export3dSnapshot(transparent = true) {
  const origW = viewport3dContainer.clientWidth;
  const origH = viewport3dContainer.clientHeight;
  const prevBackdropVis = backdropMesh.visible;

  if (transparent) {
    backdropMesh.visible = false;
  }

  // Render at 2048 x 2048 Ultra HD
  const exportSize = 2048;
  renderer.setSize(exportSize, exportSize, false);
  camera.aspect = 1.0;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);

  const dataUrl = canvas3d.toDataURL('image/png');
  downloadDataUrl(
    dataUrl,
    transparent ? `tshirt-${state.modelType}-transparent-hd.png` : `tshirt-${state.modelType}-studio-hd.png`
  );

  // Restore viewport size & backdrop visibility
  backdropMesh.visible = prevBackdropVis;
  renderer.setSize(origW, origH, false);
  camera.aspect = origW / origH;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
}

function export2dPatternSheet() {
  const pats = getActivePatterns();
  if (!pats) return;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = 2048;
  outCanvas.height = 2048;
  const ctx = outCanvas.getContext('2d');

  ctx.fillStyle = '#1b1e1d';
  ctx.fillRect(0, 0, 2048, 2048);

  Object.entries(pats).forEach(([pieceKey, pieceData]) => {
    const color = state.pieceColors[pieceKey] || '#65745a';
    const b = pieceData.bbox;
    const cx = ((b.minU + b.maxU) / 2) * 2048;

    ctx.save();
    tracePiecePolygon(ctx, pieceData.points, 2048, 2048);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.stroke();
    ctx.clip();

    state.layers.forEach((layer) => {
      if (layer.piece === pieceKey) {
        drawLayerOnContext(ctx, layer, 2048);
      }
    });
    ctx.restore();

    const meta = PIECE_META[pieceKey];
    if (meta) {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 24px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(meta.title, cx, b.maxV * 2048 + 32);
    }
  });

  downloadDataUrl(outCanvas.toDataURL('image/png'), `tshirt-${state.modelType}-2d-kalip-plani.png`);
}

let isRecordingVideo = false;
function export360ShowcaseVideo() {
  if (isRecordingVideo) return;
  isRecordingVideo = true;

  const overlay = document.getElementById('recordOverlay');
  const statusText = document.getElementById('recordStatusText');
  const progressFill = document.getElementById('recordProgressFill');
  overlay.classList.remove('hidden');

  const stream = canvas3d.captureStream(60);
  const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const supportedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';

  const recorder = new MediaRecorder(stream, {
    mimeType: supportedMime,
    videoBitsPerSecond: 8000000
  });

  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const startRotY = garmentGroup.rotation.y;
  const durationMs = 4500;
  const startTime = performance.now();

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: supportedMime });
    const url = URL.createObjectURL(blob);
    downloadDataUrl(url, `tshirt-${state.modelType}-360-showcase.webm`);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    garmentGroup.rotation.y = startRotY;
    overlay.classList.add('hidden');
    isRecordingVideo = false;
  };

  recorder.start();

  function stepRecord(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    garmentGroup.rotation.y = startRotY + progress * Math.PI * 2;

    const pct = Math.round(progress * 100);
    statusText.textContent = `360° Vitrin Videosu Kaydediliyor... %${pct}`;
    progressFill.style.width = `${pct}%`;

    if (progress < 1) {
      requestAnimationFrame(stepRecord);
    } else {
      recorder.stop();
    }
  }
  requestAnimationFrame(stepRecord);
}

// Smooth camera transition helper
let camAnim = null;
function animateCameraTo(targetPos, targetLook) {
  camAnim = {
    startPos: camera.position.clone(),
    endPos: new THREE.Vector3(...targetPos),
    startLook: controls.target.clone(),
    endLook: new THREE.Vector3(...targetLook),
    startTime: performance.now(),
    duration: 480
  };
}

// ============================================================================
// INITIALIZATION & DEFAULT SCENE (MATCHES SCREENSHOT)
// ============================================================================
function resetToDefaultScene() {
  state.pieceColors = {
    neck_rib: '#65745a',
    right_sleeve: '#65745a',
    left_sleeve: '#65745a',
    front: '#65745a',
    back: '#65745a'
  };
  // Start completely plain (no logos or graphics unless the user adds them)
  state.layers = [];
  state.selectedLayerId = null;

  garmentGroup.rotation.y = 0;
  animateCameraTo([-0.16, 0.12, 0.78], [0, 0.04, 0]);
  renderAll();
}

function handleWindowResize() {
  const w3d = viewport3dContainer.clientWidth || 800;
  const h3d = viewport3dContainer.clientHeight || 400;
  renderer.setSize(w3d, h3d, false);
  camera.aspect = w3d / h3d;
  camera.updateProjectionMatrix();

  fitPatternView();
  render2dEditor();
}

window.addEventListener('resize', handleWindowResize);

async function init() {
  setupUIEvents();
  updateStudioBackdrop();
  updateNeckLabel();

  const res = await fetch('./models/patterns.json');
  state.patterns = await res.json();

  handleWindowResize();
  await loadGarmentModel('short', true);
  // Preload long sleeve model in background so switching is instant
  loadGarmentModel('long', false);

  resetToDefaultScene();
  setupExternalPluginHooks();

  function animate(now) {
    requestAnimationFrame(animate);

    if (camAnim) {
      const t = Math.min(1, (now - camAnim.startTime) / camAnim.duration);
      const ease = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(camAnim.startPos, camAnim.endPos, ease);
      controls.target.lerpVectors(camAnim.startLook, camAnim.endLook, ease);
      if (t >= 1) camAnim = null;
    }

    if (state.autoRotate && !isRecordingVideo) {
      garmentGroup.rotation.y += 0.008;
    }

    controls.update();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}

init();
