"use strict";

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function dateSeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

const STAR_CHARS = [
  { ch: "\u00B7", weight: 50 },
  { ch: "\u2727", weight: 25 },
  { ch: "\u2606", weight: 15 },
  { ch: "\u2726", weight: 7 },
  { ch: "\u00B0", weight: 3 },
];

const STAR_CHARS_CUM = (() => {
  const cum = [];
  let total = 0;
  for (const s of STAR_CHARS) { total += s.weight; cum.push({ ch: s.ch, limit: total }); }
  return { cum, total };
})();

function pickChar(rng) {
  const roll = rng() * STAR_CHARS_CUM.total;
  for (const s of STAR_CHARS_CUM.cum) {
    if (roll < s.limit) return s.ch;
  }
  return STAR_CHARS_CUM.cum[STAR_CHARS_CUM.cum.length - 1].ch;
}

function generateStars(width, height, count, seed) {
  const rng = makeRng(seed);
  const stars = [];
  const marginX = Math.floor(width * 0.05);
  const marginY = Math.floor(height * 0.05);

  for (let i = 0; i < count; i++) {
    const x = marginX + Math.floor(rng() * (width - marginX * 2));
    const y = marginY + Math.floor(rng() * (height - marginY * 2));
    const ch = pickChar(rng);
    const phase = rng() * Math.PI * 2;
    const period = 8 + rng() * 20;
    const restRatio = 0.8 + rng() * 0.15;
    stars.push({ x, y, ch, phase, period, restRatio });
  }
  return stars;
}

function generateShootingStars(width, height, elapsedMax, seed) {
  const rng = makeRng(seed + 9999);
  const shootingStars = [];
  const count = 4 + Math.floor(rng() * 3);

  for (let i = 0; i < count; i++) {
    const startX = Math.floor(rng() * width * 0.9 + width * 0.05);
    const startY = 2 + Math.floor(rng() * Math.max(1, height * 0.6));
    const angle = 0.3 + rng() * 0.6;
    const speed = 3 + rng() * 5;
    const length = 6 + Math.floor(rng() * 8);
    const startTime = 300 + rng() * Math.max(1, elapsedMax - 800);
    const duration = 150 + rng() * 250;
    const hueShift = rng();
    shootingStars.push({ startX, startY, angle, speed, length, startTime, duration, hueShift });
  }
  return shootingStars;
}

function starBrightness(star, elapsed) {
  const t = (elapsed / 1000 / star.period + star.phase) % 1;
  if (t > star.restRatio) {
    const blinkT = (t - star.restRatio) / (1 - star.restRatio);
    return 0.3 + 0.7 * Math.sin(blinkT * Math.PI);
  }
  return 0.15 + 0.15 * Math.sin(t * Math.PI * 2 * 0.3);
}

function lerp(a, b, t) { return a + (b - a) * t; }

function renderStars(stars, canvas, elapsed) {
  for (const s of stars) {
    const brightness = starBrightness(s, elapsed);
    if (brightness < 0.05) continue;
    const r = Math.round(lerp(100, 226, brightness));
    const g = Math.round(lerp(116, 232, brightness));
    const b = Math.round(lerp(139, 240, brightness));
    canvas.setPixel(s.x, s.y, r, g, b);
  }
}

function renderShootingStars(shootingStars, canvas, elapsed) {
  for (const ss of shootingStars) {
    const localT = elapsed - ss.startTime;
    if (localT < 0 || localT > ss.duration) continue;
    const progress = localT / ss.duration;
    const brightness = Math.sin(progress * Math.PI);
    const trailLen = ss.length * (0.3 + 0.7 * Math.sin(progress * Math.PI * 0.8));
    const cx = ss.startX + Math.cos(ss.angle) * ss.speed * localT * 0.15;
    const cy = ss.startY + Math.sin(ss.angle) * ss.speed * localT * 0.15;

    for (let i = 0; i < trailLen; i++) {
      const px = Math.round(cx - Math.cos(ss.angle) * i * 1.8);
      const py = Math.round(cy - Math.sin(ss.angle) * i * 1.8);
      const decay = 1 - i / trailLen;
      const b = brightness * decay;
      const r = Math.round(lerp(180, 255, b));
      const g = Math.round(lerp(200, 255, b));
      const blue = Math.round(lerp(240, 255, b));
      canvas.setPixel(px, py, r * b, g * b, blue * b);
    }
  }
}

module.exports = { generateStars, renderStars, generateShootingStars, renderShootingStars, dateSeed, makeRng };
