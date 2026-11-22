import { $ } from './utils.js';
import { isFound } from './store.js';
import { pinImageUrl } from './data.js';
import { useBackButton } from './telegram.js';

/** Pin card: bottom sheet on mobile, floating card on desktop. Swipe down to close. */
export function createSheet(data, { onToggleFound, onShare, onClose }) {
  const el = $('#sheet');
  const img = $('#sheet-img');
  const found = $('#sheet-found');
  let current = null;
  let disposeBack = () => {};

  function open(pin) {
    current = pin;
    const c = data.catById.get(pin.category);
    const r = data.regionById.get(pin.region);
    $('#sheet-title').textContent = pin.name;
    $('#sheet-desc').textContent = pin.description || '';
    const badge = $('#sheet-cat');
    badge.textContent = c ? `${c.icon} ${c.name}` : pin.category;
    badge.style.setProperty('--c', c?.color || '#fff');
    $('#sheet-region').textContent = r ? r.name : '';
    found.checked = isFound(pin.id);

    const src = pinImageUrl(pin);
    el.classList.toggle('no-media', !src);
    img.removeAttribute('src');
    if (src) {
      img.alt = pin.name;
      img.src = src;
    }

    el.style.transform = '';
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    disposeBack();
    disposeBack = useBackButton(close);
  }

  function close() {
    if (!current) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    el.style.transform = '';
    disposeBack();
    current = null;
    onClose?.();
  }

  img.addEventListener('error', () => el.classList.add('no-media'));
  $('#sheet-close').addEventListener('click', close);
  $('#sheet-share').addEventListener('click', () => current && onShare?.(current));
  found.addEventListener('change', () => {
    if (!current) return;
    const res = onToggleFound?.(current, found.checked);
    if (res && !res.ok) found.checked = false;
  });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());

  // swipe-down to dismiss (mobile)
  let startY = null;
  let dy = 0;
  const grip = $('#sheet-grip');
  const startDrag = (e) => {
    if (window.innerWidth >= 900) return;
    startY = e.touches[0].clientY;
    dy = 0;
    el.style.transition = 'none';
  };
  const moveDrag = (e) => {
    if (startY == null) return;
    dy = Math.max(0, e.touches[0].clientY - startY);
    el.style.transform = `translateY(${dy}px)`;
  };
  const endDrag = () => {
    if (startY == null) return;
    el.style.transition = '';
    startY = null;
    if (dy > 90) close();
    else el.style.transform = '';
  };
  for (const t of [grip, $('.sheet__media', el)]) {
    t.addEventListener('touchstart', startDrag, { passive: true });
    t.addEventListener('touchmove', moveDrag, { passive: true });
    t.addEventListener('touchend', endDrag);
  }

  return {
    open,
    close,
    get current() { return current; },
    syncFound() { if (current) found.checked = isFound(current.id); },
  };
}
