import { FREE_LIMIT, PRO_URL } from '../config.js';
import { $, toast } from './utils.js';
import { openLink, haptic } from './telegram.js';

/**
 * PRO paywall modal. The free limit is a SOFT client-side limit (localStorage).
 * Real payments (e.g. Telegram Stars invoice) need a bot backend: point VITE_PRO_URL to it,
 * and after a confirmed payment call store.setPro(true) (e.g. from a ?pro_token=… handshake).
 */
export function createPro() {
  const modal = $('#pro-modal');

  function open() {
    $('#pro-text').textContent = `В бесплатной версии можно отметить до ${FREE_LIMIT} находок. Сними отметку с любой метки или открой PRO.`;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-on'));
    haptic('warning');
  }
  function close() {
    modal.classList.remove('is-on');
    setTimeout(() => (modal.hidden = true), 200);
  }

  $('#pro-later').addEventListener('click', close);
  modal.addEventListener('click', (e) => e.target === modal && close());
  $('#pro-buy').addEventListener('click', () => {
    if (PRO_URL) openLink(PRO_URL);
    else toast('PRO скоро будет доступен');
    close();
  });

  return { open, close };
}
