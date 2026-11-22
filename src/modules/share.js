import { TG_APP, TG_BOT } from '../config.js';
import { copyText, toast } from './utils.js';
import { inTelegram, openLink, startParam, haptic } from './telegram.js';

/** Telegram start_param allows only [A-Za-z0-9_-], max 64 chars. */
const safeId = (id) => String(id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60);

export function pinLink(pin) {
  if (inTelegram && TG_BOT) {
    const base = TG_APP ? `https://t.me/${TG_BOT}/${TG_APP}` : `https://t.me/${TG_BOT}`;
    return `${base}?startapp=pin_${safeId(pin.id)}`;
  }
  const u = new URL(location.href);
  u.search = '';
  u.hash = '';
  u.searchParams.set('pin', pin.id);
  return u.toString();
}

export async function sharePin(pin) {
  const url = pinLink(pin);
  const ok = await copyText(url);
  haptic('light');
  if (inTelegram) {
    // also offer Telegram's native "share to chat"
    openLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(pin.name)}`);
  }
  toast(ok ? 'Ссылка скопирована' : url, ok ? 2000 : 6000);
}

/** Pin id from ?pin=… or Telegram start_param "pin_<id>". */
export function linkedPinId() {
  const q = new URLSearchParams(location.search).get('pin');
  if (q) return q;
  const sp = startParam();
  return sp.startsWith('pin_') ? sp.slice(4) : null;
}
