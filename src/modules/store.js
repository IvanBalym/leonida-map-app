import { FREE_LIMIT } from '../config.js';
import { cloud } from './telegram.js';

const KEY = 'leonida.found.v1';
const PRO_KEY = 'leonida.pro.v1';
const UI_KEY = 'leonida.ui.v1';

const ls = {
  get(k, fallback) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode / quota */ }
  },
};

const found = new Set(ls.get(KEY, []));
const listeners = new Set();

function persist() {
  const arr = [...found];
  ls.set(KEY, arr);
  cloud.set(KEY, JSON.stringify(arr));
  listeners.forEach((fn) => fn());
}

/** Merge progress saved in Telegram CloudStorage (other device) into local. */
export async function syncFromCloud() {
  const raw = await cloud.get(KEY);
  if (!raw) return;
  try {
    const before = found.size;
    JSON.parse(raw).forEach((id) => found.add(id));
    if (found.size !== before) persist();
  } catch { /* ignore */ }
}

export const isFound = (id) => found.has(id);
export const foundCount = () => found.size;
export const isPro = () => ls.get(PRO_KEY, false) === true;
export const setPro = (v) => ls.set(PRO_KEY, !!v);
export const freeLeft = () => Math.max(0, FREE_LIMIT - found.size);
export const onChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));

/**
 * Toggle "found". Soft freemium limit: unchecking is always allowed,
 * checking beyond FREE_LIMIT returns { ok: false, reason: 'limit' }.
 */
export function setFound(id, value) {
  if (!value) {
    if (found.delete(id)) persist();
    return { ok: true, found: false };
  }
  if (found.has(id)) return { ok: true, found: true };
  if (!isPro() && found.size >= FREE_LIMIT) return { ok: false, reason: 'limit' };
  found.add(id);
  persist();
  return { ok: true, found: true };
}

export const ui = {
  get: () => ls.get(UI_KEY, {}),
  patch(p) { ls.set(UI_KEY, { ...ls.get(UI_KEY, {}), ...p }); },
};
