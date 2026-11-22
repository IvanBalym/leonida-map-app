import { CDN } from '../config.js';
import { pointInPolygon } from './utils.js';

async function getJSON(name, fallback) {
  try {
    const res = await fetch(`${CDN}/${name}`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (fallback !== undefined) {
      console.warn(`[data] ${name} not loaded, using fallback`, err);
      return fallback;
    }
    throw err;
  }
}

export async function loadData() {
  const [regions, pins, categories, labels] = await Promise.all([
    getJSON('regions.json'),
    getJSON('pins.json'),
    getJSON('categories.json'),
    getJSON('labels.json', []),
  ]);

  const regionById = new Map(regions.map((r) => [r.id, r]));
  const catById = new Map(categories.map((c) => [c.id, c]));

  // Pins without an explicit region get one by point-in-polygon (areas win over counties).
  const ordered = [...regions].sort((a, b) => (a.type === 'county') - (b.type === 'county'));
  for (const p of pins) {
    if (!p.region || !regionById.has(p.region)) {
      p.region = ordered.find((r) => pointInPolygon(p.pos, r.polygon))?.id || null;
    }
    if (!catById.has(p.category)) console.warn(`[data] pin ${p.id}: unknown category ${p.category}`);
  }

  return { regions, pins, categories, labels, regionById, catById };
}

export const pinImageUrl = (pin) => (pin.image ? `${CDN}/pins/${pin.image}` : '');
