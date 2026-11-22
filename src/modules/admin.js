import L from 'leaflet';
import { latLngToYX } from './map.js';
import { $, esc, copyText, toast, slug, pointInPolygon, round1 } from './utils.js';

/**
 * Editor mode (?admin=1)
 *  - Polygon mode: click = add vertex, double-click = close the shape and copy the region JSON.
 *  - Pin mode: click = open a form; "Generate" copies the pins.json entry with normalized [Y, X].
 * Output is also shown in the textarea so nothing is lost if clipboard access is blocked.
 */
export function createAdmin(map, data, { regionsApi }) {
  const container = map.getContainer();
  const root = document.createElement('div');
  root.className = 'admin';
  root.innerHTML = `
    <div class="admin__head"><b>ADMIN</b><span class="admin__coords" id="adm-coords">Y — · X —</span>
      <button class="btn btn--icon admin__min" id="adm-min" aria-label="Свернуть">–</button></div>
    <div class="admin__body">
      <div class="seg">
        <button data-mode="off" class="is-on">Просмотр</button>
        <button data-mode="poly">Полигоны</button>
        <button data-mode="pin">Метки</button>
      </div>

      <div class="admin__sec" data-sec="poly" hidden>
        <div class="grid2">
          <label>id<input id="adm-r-id" placeholder="vice-dale" /></label>
          <label>Название<input id="adm-r-name" placeholder="Vice-Dale County" /></label>
          <label>Тип<select id="adm-r-type"><option>county</option><option>area</option></select></label>
          <label>Цвет<input id="adm-r-color" type="color" value="#ff2bd6" /></label>
        </div>
        <p class="hint">Клики — вершины. <b>Двойной клик</b> — замкнуть контур и скопировать JSON. Точек: <b id="adm-count">0</b></p>
        <div class="row"><button class="btn" id="adm-undo">↶ Отменить точку</button><button class="btn" id="adm-reset">Сбросить</button></div>
      </div>

      <form class="admin__sec" data-sec="pin" id="adm-pin-form" hidden>
        <p class="hint">Кликни по карте, чтобы поставить метку. <span id="adm-pin-pos"></span></p>
        <label>Название<input id="adm-p-name" required /></label>
        <label>Категория<select id="adm-p-cat">${data.categories.map((c) => `<option value="${esc(c.id)}">${esc(c.icon)} ${esc(c.name)}</option>`).join('')}</select></label>
        <label>Описание<textarea id="adm-p-desc" rows="2"></textarea></label>
        <div class="grid2">
          <label>id<input id="adm-p-id" placeholder="авто из названия" /></label>
          <label>Скриншот<input id="adm-p-img" placeholder="<id>.webp" /></label>
        </div>
        <button class="btn btn--primary" type="submit">Сгенерировать JSON</button>
      </form>

      <textarea class="admin__out" id="adm-out" rows="5" readonly placeholder="Здесь появится JSON"></textarea>
      <button class="btn" id="adm-copy">Скопировать ещё раз</button>
    </div>`;
  document.body.appendChild(root);

  let mode = 'off';
  let points = [];
  let pinPos = null;
  const draft = L.layerGroup().addTo(map);
  const line = L.polyline([], { color: '#fff', weight: 2, dashArray: '6 6', interactive: false }).addTo(draft);
  const shape = L.polygon([], { color: '#ff2bd6', weight: 2, fillOpacity: 0.15, interactive: false }).addTo(draft);
  const vertexLayer = L.layerGroup().addTo(draft);
  const pinMarker = L.circleMarker([0, 0], { radius: 9, color: '#fff', weight: 3, fillColor: '#ff2bd6', fillOpacity: 1, interactive: false });

  const out = $('#adm-out', root);
  const count = $('#adm-count', root);

  const show = async (obj, label) => {
    const text = JSON.stringify(obj, null, 2);
    out.value = text;
    const ok = await copyText(text);
    toast(ok ? `${label} скопирован в буфер` : `${label} готов — скопируй из панели`);
  };

  function drawPoly() {
    line.setLatLngs(points);
    shape.setLatLngs(points.length >= 3 ? points : []);
    shape.setStyle({ color: $('#adm-r-color', root).value, fillColor: $('#adm-r-color', root).value });
    vertexLayer.clearLayers();
    points.forEach((p) => L.circleMarker(p, { radius: 4, color: '#fff', weight: 2, fillOpacity: 1, interactive: false }).addTo(vertexLayer));
    count.textContent = points.length;
  }

  function setMode(m) {
    mode = m;
    root.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('is-on', b.dataset.mode === m));
    root.querySelectorAll('.admin__sec').forEach((s) => (s.hidden = s.dataset.sec !== m));
    container.classList.toggle('admin-editing', m !== 'off');
    container.style.cursor = m === 'off' ? '' : 'crosshair';
    regionsApi.setInteractive(m === 'off');
    if (m === 'poly') map.doubleClickZoom.disable();
    else map.doubleClickZoom.enable();
    if (m !== 'pin') pinMarker.remove();
  }

  root.querySelector('.seg').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-mode]');
    if (b) setMode(b.dataset.mode);
  });
  $('#adm-min', root).addEventListener('click', () => root.classList.toggle('is-min'));
  $('#adm-undo', root).addEventListener('click', () => (points.pop(), drawPoly()));
  $('#adm-reset', root).addEventListener('click', () => ((points = []), drawPoly()));
  $('#adm-r-color', root).addEventListener('input', drawPoly);
  $('#adm-copy', root).addEventListener('click', async () => out.value && toast((await copyText(out.value)) ? 'Скопировано' : 'Не удалось скопировать'));
  $('#adm-p-name', root).addEventListener('input', (e) => ($('#adm-p-id', root).placeholder = slug(e.target.value) || 'авто из названия'));

  map.on('mousemove', (e) => {
    const [y, x] = latLngToYX(e.latlng);
    $('#adm-coords', root).textContent = `Y ${y} · X ${x}`;
  });

  map.on('click', (e) => {
    if (mode === 'poly') {
      points.push(latLngToYX(e.latlng));
      drawPoly();
    } else if (mode === 'pin') {
      pinPos = latLngToYX(e.latlng);
      pinMarker.setLatLng(pinPos).addTo(map);
      $('#adm-pin-pos', root).textContent = `[${pinPos.join(', ')}]`;
      $('#adm-p-name', root).focus();
    }
  });

  map.on('dblclick', () => {
    if (mode !== 'poly') return;
    // a double-click also produced 2 clicks at ~the same spot — drop near-duplicate vertices
    const tol = (6 * 1000) / (256 * Math.pow(2, map.getZoom())); // ≈ 6 screen px in map units
    points = points.filter((p, i, a) => i === 0 || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > tol);
    if (points.length < 3) {
      toast('Нужно минимум 3 точки');
      drawPoly();
      return;
    }
    const name = $('#adm-r-name', root).value.trim() || 'New Region';
    const region = {
      id: $('#adm-r-id', root).value.trim() || slug(name),
      name,
      type: $('#adm-r-type', root).value,
      color: $('#adm-r-color', root).value,
      polygon: points.map(([y, x]) => [round1(y), round1(x)]),
    };
    show(region, 'Полигон');
    drawPoly();
    points = [];
  });

  $('#adm-pin-form', root).addEventListener('submit', (e) => {
    e.preventDefault();
    if (!pinPos) return toast('Сначала кликни по карте');
    const name = $('#adm-p-name', root).value.trim();
    const id = $('#adm-p-id', root).value.trim() || slug(name);
    const ordered = [...data.regions].sort((a, b) => (a.type === 'county') - (b.type === 'county'));
    const pin = {
      id,
      name,
      category: $('#adm-p-cat', root).value,
      region: ordered.find((r) => pointInPolygon(pinPos, r.polygon))?.id || null,
      pos: pinPos,
      description: $('#adm-p-desc', root).value.trim(),
      image: $('#adm-p-img', root).value.trim() || `${id}.webp`,
    };
    show(pin, 'JSON метки');
  });

  toast('Режим редактора включён');
}
