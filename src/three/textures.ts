/**
 * Procedural textures.
 *
 * Everything is painted into a canvas at runtime — no image files, nothing to
 * download, nothing to license.  Each generator is memoised because a texture
 * is expensive exactly once.
 */

import * as THREE from 'three';

const cache = new Map<string, THREE.Texture>();

function makeCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

function finish(canvas: HTMLCanvasElement, repeat: number, key: string): THREE.Texture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 4;
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, texture);
  return texture;
}

/** Deterministic value noise so textures look the same every session. */
function noise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

export function woodTexture(base = '#3b2b21', grain = '#241a14', repeat = 4): THREE.Texture {
  const key = `wood-${base}-${grain}-${repeat}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 190; i++) {
    const y = noise(i, 3, 11) * size;
    ctx.strokeStyle = grain;
    ctx.globalAlpha = 0.05 + noise(i, 7, 3) * 0.2;
    ctx.lineWidth = 0.6 + noise(i, 11, 5) * 2.4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 16) {
      ctx.lineTo(x, y + Math.sin((x / size) * Math.PI * 2 + i) * 3 * noise(i, x, 2));
    }
    ctx.stroke();
  }
  // Plank seams.
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#100b08';
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(0, (size / 4) * i);
    ctx.lineTo(size, (size / 4) * i);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return finish(canvas, repeat, key);
}

export function stoneTexture(base = '#3a3a42', repeat = 3): THREE.Texture {
  const key = `stone-${base}-${repeat}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const x = noise(i, 1, 17) * size;
    const y = noise(i, 2, 29) * size;
    const r = 1 + noise(i, 3, 41) * 5;
    const shade = noise(i, 4, 53);
    ctx.fillStyle = shade > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.07)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // A few cracks.
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  for (let i = 0; i < 9; i++) {
    ctx.lineWidth = 0.7 + noise(i, 9, 61) * 1.2;
    ctx.beginPath();
    let x = noise(i, 5, 71) * size;
    let y = noise(i, 6, 83) * size;
    ctx.moveTo(x, y);
    for (let s = 0; s < 8; s++) {
      x += (noise(i, s, 97) - 0.5) * 40;
      y += (noise(i, s + 20, 101) - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return finish(canvas, repeat, key);
}

export function groundTexture(base = '#241d18', wet = '#12161c', repeat = 8): THREE.Texture {
  const key = `ground-${base}-${wet}-${repeat}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  // Puddles: darker, smoother patches that will also read as more reflective.
  for (let i = 0; i < 26; i++) {
    const x = noise(i, 1, 5) * size;
    const y = noise(i, 2, 9) * size;
    const r = 6 + noise(i, 3, 13) * 34;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, wet);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 1800; i++) {
    const x = noise(i, 4, 19) * size;
    const y = noise(i, 5, 23) * size;
    ctx.fillStyle = noise(i, 6, 31) > 0.6 ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, 2, 2);
  }
  return finish(canvas, repeat, key);
}

export function parchmentTexture(repeat = 1): THREE.Texture {
  const key = `parchment-${repeat}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = '#d8cbb0';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1400; i++) {
    const x = noise(i, 1, 3) * size;
    const y = noise(i, 2, 7) * size;
    ctx.fillStyle = noise(i, 3, 11) > 0.5 ? 'rgba(120,95,60,0.06)' : 'rgba(255,250,235,0.06)';
    ctx.fillRect(x, y, 3, 3);
  }
  return finish(canvas, repeat, key);
}

/** The d20's face atlas: a 5×4 grid of numbers on blackened silver. */
export function d20Atlas(): THREE.Texture {
  const key = 'd20-atlas';
  const cached = cache.get(key);
  if (cached) return cached;

  const cell = 128;
  const canvas = document.createElement('canvas');
  canvas.width = cell * 5;
  canvas.height = cell * 4;
  const ctx = canvas.getContext('2d')!;

  for (let i = 0; i < 20; i++) {
    const cx = (i % 5) * cell;
    const cy = Math.floor(i / 5) * cell;
    const gradient = ctx.createLinearGradient(cx, cy, cx + cell, cy + cell);
    gradient.addColorStop(0, '#25252c');
    gradient.addColorStop(0.55, '#15151a');
    gradient.addColorStop(1, '#2c2c35');
    ctx.fillStyle = gradient;
    ctx.fillRect(cx, cy, cell, cell);

    const number = i + 1;
    ctx.save();
    ctx.translate(cx + cell / 2, cy + cell / 2 + 6);
    ctx.font = `600 ${number >= 10 ? 52 : 60}px Georgia, "Times New Roman", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = number === 20 ? '#e6c98a' : number === 1 ? '#c9556b' : '#cdd3de';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 6;
    ctx.fillText(String(number), 0, 0);
    // Underline 6 and 9 the way real dice do.
    if (number === 6 || number === 9) {
      ctx.shadowBlur = 0;
      ctx.fillRect(-18, 34, 36, 3);
    }
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  cache.set(key, texture);
  return texture;
}

/** A soft round sprite used for candle glow, motes and spell particles. */
export function glowSprite(color = '#e0a659'): THREE.Texture {
  const key = `glow-${color}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const size = 128;
  const { canvas, ctx } = makeCanvas(size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.35, `${color}88`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, texture);
  return texture;
}

/* ------------------------------------------------------------- Die Schwelle */

/** The medallion's face: a closed door beneath three stars, worn nearly flat. */
export function medallionFace(): THREE.Texture {
  const key = 'medallion-face';
  const cached = cache.get(key);
  if (cached) return cached;

  const size = 512;
  const { canvas, ctx } = makeCanvas(size);
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#3c3f47');
  gradient.addColorStop(0.5, '#1e2026');
  gradient.addColorStop(1, '#43464f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Age: pitting and tarnish.
  for (let i = 0; i < 3000; i++) {
    const x = noise(i, 1, 3) * size;
    const y = noise(i, 2, 5) * size;
    ctx.fillStyle = noise(i, 3, 7) > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.09)';
    ctx.fillRect(x, y, 2 + noise(i, 4, 11) * 3, 2);
  }

  const cx = size / 2;
  ctx.strokeStyle = 'rgba(210,215,228,0.5)';
  ctx.lineWidth = 5;

  // The door: a plain arched rectangle, closed, no handle.
  ctx.beginPath();
  ctx.moveTo(cx - 58, size * 0.9);
  ctx.lineTo(cx - 58, size * 0.68);
  ctx.arc(cx, size * 0.68, 58, Math.PI, 0);
  ctx.lineTo(cx + 58, size * 0.9);
  ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(190,196,210,0.28)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, size * 0.62);
  ctx.lineTo(cx, size * 0.9);
  ctx.stroke();

  // Three stars above it: four-pointed, engraved, uneven.
  const star = (x: number, y: number, r: number): void => {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.28, y - r * 0.28);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x + r * 0.28, y + r * 0.28);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.28, y + r * 0.28);
    ctx.lineTo(x - r, y);
    ctx.lineTo(x - r * 0.28, y - r * 0.28);
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillStyle = 'rgba(214,221,232,0.55)';
  star(cx - 76, size * 0.19, 17);
  star(cx, size * 0.135, 22);
  star(cx + 76, size * 0.19, 17);

  // Rim.
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.arc(cx, cx, size * 0.47, 0, Math.PI * 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, texture);
  return texture;
}

/** Frost creeping in from the rim — used as an alpha-blended overlay. */
export function frostTexture(): THREE.Texture {
  const key = 'frost';
  const cached = cache.get(key);
  if (cached) return cached;

  const size = 512;
  const { canvas, ctx } = makeCanvas(size);
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;

  // Radial ferns growing inward from the edge.
  for (let i = 0; i < 220; i++) {
    const angle = (i / 220) * Math.PI * 2 + noise(i, 1, 3) * 0.4;
    let x = cx + Math.cos(angle) * cx * 0.94;
    let y = cx + Math.sin(angle) * cx * 0.94;
    const length = 26 + noise(i, 2, 7) * 96;
    ctx.strokeStyle = `rgba(214,238,250,${0.16 + noise(i, 3, 11) * 0.34})`;
    ctx.lineWidth = 0.5 + noise(i, 4, 13) * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const steps = 9;
    for (let s = 0; s < steps; s++) {
      const wobble = (noise(i, s, 17) - 0.5) * 0.55;
      x -= Math.cos(angle + wobble) * (length / steps);
      y -= Math.sin(angle + wobble) * (length / steps);
      ctx.lineTo(x, y);
      // side branches
      if (s % 2 === 0) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle + 1.4) * 6, y + Math.sin(angle + 1.4) * 6);
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle - 1.4) * 6, y + Math.sin(angle - 1.4) * 6);
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  cache.set(key, texture);
  return texture;
}

/**
 * What is under the glass. Stage two is a fingerprint; stage three is a whole
 * hand, pressed flat, from the inside.
 */
export function pressTexture(stage: 2 | 3): THREE.Texture {
  const key = `press-${stage}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const size = 512;
  const { canvas, ctx } = makeCanvas(size);
  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;

  if (stage === 2) {
    ctx.strokeStyle = 'rgba(232,242,250,0.7)';
    for (let i = 0; i < 16; i++) {
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      const r = 10 + i * 6.2;
      ctx.ellipse(cx, cx + 6, r * 0.72, r, 0.08, Math.PI * 0.15, Math.PI * 1.85);
      ctx.stroke();
    }
    // The whorl is broken on one side, like a print left in a hurry.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx + 62, cx + 40, 60, 90, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.fillStyle = 'rgba(226,240,250,0.55)';
    // palm
    ctx.beginPath();
    ctx.ellipse(cx, cx + 52, 96, 84, 0, 0, Math.PI * 2);
    ctx.fill();
    // fingers
    const fingers: [number, number, number, number][] = [
      [-74, -40, 26, 86],
      [-26, -66, 27, 104],
      [24, -62, 27, 100],
      [70, -34, 24, 80],
    ];
    fingers.forEach(([dx, dy, w, h], i) => {
      ctx.save();
      ctx.translate(cx + dx, cx + dy);
      ctx.rotate((i - 1.5) * 0.16);
      ctx.beginPath();
      ctx.ellipse(0, 0, w, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    // thumb
    ctx.save();
    ctx.translate(cx - 104, cx + 62);
    ctx.rotate(-0.9);
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  cache.set(key, texture);
  return texture;
}

export function disposeTextures(): void {
  cache.forEach((texture) => texture.dispose());
  cache.clear();
}
