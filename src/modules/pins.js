import L from 'leaflet';
import { PIN_FOCUS_ZOOM } from '../config.js';
import { esc } from './utils.js';
import { isFound } from './store.js';

export function createPins(map, data, { onOpen }) {
  const { pins, catById } = data;
  const group = L.layerGroup().addTo(map);
  const markers = new Map();
  let filter = { cats: new Set(data.categories.map((c) => c.id)), query: '', hideFound: false };

  const icon = (pin) => {
    const c = catById.get(pin.category) || { icon: '•', color: '#fff' };
    return L.divIcon({
      className: `pin${isFound(pin.id) ? ' pin--found' : ''}`,
      html: `<div class="pin__dot" style="--c:${esc(c.color)}"><span>${esc(c.icon)}</span></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  };

  for (const pin of pins) {
    const m = L.marker(pin.pos, { icon: icon(pin), title: pin.name, riseOnHover: true, keyboard: true });
    m.on('click', () => onOpen?.(pin));
    markers.set(pin.id, m);
  }

  const matches = (pin) => {
    if (!filter.cats.has(pin.category)) return false;
    if (filter.hideFound && isFound(pin.id)) return false;
    if (filter.query) {
      const q = filter.query;
      return pin.name.toLowerCase().includes(q) || (pin.description || '').toLowerCase().includes(q);
    }
    return true;
  };

  function apply() {
    const visible = [];
    for (const pin of pins) {
      const m = markers.get(pin.id);
      if (matches(pin)) {
        visible.push(pin);
        if (!group.hasLayer(m)) group.addLayer(m);
      } else if (group.hasLayer(m)) group.removeLayer(m);
    }
    return visible;
  }

  return {
    setFilter(patch) {
      filter = { ...filter, ...patch, query: (patch.query ?? filter.query).trim().toLowerCase() };
      return apply();
    },
    refresh(id) {
      const ids = id ? [id] : pins.map((p) => p.id);
      for (const pid of ids) {
        const m = markers.get(pid);
        const el = m?.getElement();
        if (el) el.classList.toggle('pin--found', isFound(pid));
        else m?.setIcon(icon(pins.find((p) => p.id === pid)));
      }
      if (filter.hideFound) apply();
    },
    focus(pin, zoom = Math.max(map.getZoom(), PIN_FOCUS_ZOOM)) {
      const m = markers.get(pin.id);
      if (m && !group.hasLayer(m)) group.addLayer(m); // deep link to a filtered-out pin still shows it
      map.flyTo(pin.pos, zoom, { duration: 0.8 });
      setTimeout(() => {
        const el = m?.getElement();
        if (!el) return;
        el.classList.remove('pin--pulse');
        void el.offsetWidth;
        el.classList.add('pin--pulse');
      }, 850);
    },
    setActive(id) {
      for (const [pid, m] of markers) m.getElement()?.classList.toggle('pin--active', pid === id);
    },
    apply,
  };
}
