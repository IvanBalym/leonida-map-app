import 'leaflet/dist/leaflet.css';
import './style.css';

import { CDN, IS_ADMIN } from './config.js';
import { $, toast } from './modules/utils.js';
import { initTelegram, haptic } from './modules/telegram.js';
import { createMap } from './modules/map.js';
import { loadData } from './modules/data.js';
import { createRegions } from './modules/regions.js';
import { createLabels } from './modules/labels.js';
import { createPins } from './modules/pins.js';
import { createPanel } from './modules/panel.js';
import { createSheet } from './modules/sheet.js';
import { createHud } from './modules/hud.js';
import { createPro } from './modules/pro.js';
import { sharePin, linkedPinId } from './modules/share.js';
import * as store from './modules/store.js';

async function boot() {
  initTelegram();
  const map = createMap($('#map'));

  let data;
  try {
    data = await loadData();
  } catch (err) {
    console.error(err);
    $('#boot').innerHTML = `<div class="boot__err"><b>Не удалось загрузить данные карты</b>
      <span>Проверь VITE_CDN_BASE_URL (${CDN || 'не задан'}) и CORS на CDN.</span></div>`;
    return;
  }

  const hud = createHud(data);
  const pro = createPro();

  const regionsApi = createRegions(map, data.regions, {
    onSelect: (r) => hud.show(r),
    onClear: () => hud.hide(),
  });
  createLabels(map, data.labels);

  const sheet = createSheet(data, {
    onToggleFound(pin, value) {
      const res = store.setFound(pin.id, value);
      if (!res.ok && res.reason === 'limit') pro.open();
      else haptic(value ? 'success' : 'light');
      return res;
    },
    onShare: sharePin,
    onClose: () => pins.setActive(null),
  });

  const pins = createPins(map, data, {
    onOpen(pin) {
      pins.setActive(pin.id);
      sheet.open(pin);
    },
  });

  const openPin = (pin) => {
    pins.focus(pin);
    pins.setActive(pin.id);
    sheet.open(pin);
  };

  const panel = createPanel(data, pins, { onPick: openPin });

  const updateTotal = () => {
    const got = data.pins.filter((p) => store.isFound(p.id)).length;
    const total = data.pins.length;
    $('#progress-pill').textContent = `${got} / ${total}`;
    $('#total-text').textContent = `Найдено ${got} / ${total}`;
    $('#total-bar').style.width = total ? `${(got / total) * 100}%` : '0%';
  };

  store.onChange(() => {
    pins.refresh();
    panel.refresh();
    hud.refresh();
    sheet.syncFound();
    updateTotal();
  });
  updateTotal();
  store.syncFromCloud();

  // Deep link: ?pin=<id> or t.me/<bot>?startapp=pin_<id>
  const linked = linkedPinId();
  if (linked) {
    const pin = data.pins.find((p) => p.id === linked);
    if (pin) setTimeout(() => openPin(pin), 300);
    else toast('Метка из ссылки не найдена');
  }

  if (IS_ADMIN) {
    const { createAdmin } = await import('./modules/admin.js');
    createAdmin(map, data, { regionsApi });
  }

  $('#boot').classList.add('is-done');
  setTimeout(() => $('#boot').remove(), 500);

  // expose for debugging in console
  window.__leonida = { map, data, store };
}

boot();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
