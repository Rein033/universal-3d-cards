/* Popup with the print history: timelapse playback and "print again". Lives on document.body so it covers the
   whole screen, whatever dashboard layout the card is in. */
class PrinterDialog extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._video = null;
    this._onKey = (ev) => { if (ev.key === 'Escape') this._close(); };
  }

  connectedCallback() { document.addEventListener('keydown', this._onKey); }

  disconnectedCallback() { document.removeEventListener('keydown', this._onKey); }

  update(hass, snap) {
    this._hass = hass;
    this._snap = snap;
    if (!this._video) this._render();   // don't rebuild while a video plays
  }

  _t(k) { return tr(this._hass, k); }

  _close() { this.dispatchEvent(new CustomEvent('closed')); }

  _render() {
    const s = this._snap, hass = this._hass;
    if (!s) return;
    const lang = hass.locale ? hass.locale.language : undefined;
    const items = s.history || [];
    const canPrint = s.online && !s.active;
    const row = (r, i) => {
      const look = STATUS[r.state] || STATUS.idle;
      const when = r.start ? new Date(r.start * 1000).toLocaleString(lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
      const reprintTitle = !r.on_printer ? this._t('reprintNotOnPrinter') : !canPrint ? this._t('reprintBusy') : this._t('reprint');
      return `<li>
        <div class="thumb ${r.timelapse ? 'play' : ''}" ${r.timelapse ? `data-play="${i}" title="${esc(this._t('timelapse'))}"` : ''}>
          ${r.thumbnail || r.timelapse_cover ? `<img src="${esc(r.timelapse_cover || r.thumbnail)}" alt="" loading="lazy">` : '<ha-icon icon="mdi:cube-outline"></ha-icon>'}
          ${r.timelapse ? '<span class="playicon"><ha-icon icon="mdi:play"></ha-icon></span>' : ''}
        </div>
        <div class="info">
          <div class="nm">${esc(cleanJob(r.name))}</div>
          <div class="meta"><span class="st" style="--c:${look.color}">${esc(this._t(r.state))}</span>${esc(when)}${r.duration ? ' · ' + dur(r.duration) : ''}</div>
        </div>
        <div class="btns">
          ${r.timelapse ? `<button data-play="${i}" title="${esc(this._t('timelapse'))}"><ha-icon icon="mdi:play-circle-outline"></ha-icon></button>` : ''}
          ${s.platform === 'creality_cloud' ? `<button data-reprint="${i}" title="${esc(reprintTitle)}" ${r.on_printer && canPrint ? '' : 'disabled'}><ha-icon icon="mdi:restart"></ha-icon></button>` : ''}
        </div>
      </li>`;
    };
    this.shadowRoot.innerHTML = `<div class="backdrop" data-close></div>
      <div class="dlg" role="dialog" aria-modal="true" aria-label="${esc(this._t('history'))}">
        <header><div><h2>${esc(this._t('history'))}</h2><div class="sub">${esc(s.name)}</div></div>
          <button class="x" data-close title="${esc(this._t('close'))}"><ha-icon icon="mdi:close"></ha-icon></button></header>
        ${this._video != null ? '' : items.length ? `<ul>${items.map(row).join('')}</ul>` : `<p class="empty">${esc(this._t('noHistory'))}</p>`}
      </div>${DIALOG_CSS}`;
    this.shadowRoot.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', () => this._close()));
    this.shadowRoot.querySelectorAll('[data-play]').forEach((el) => el.addEventListener('click', () => this._play(items[+el.dataset.play])));
    this.shadowRoot.querySelectorAll('[data-reprint]').forEach((el) => el.addEventListener('click', async () => {
      const r = items[+el.dataset.reprint];
      if (!confirm(this._t('reprintConfirm').replace('%s', cleanJob(r.name)).replace('%s', s.name))) return;
      el.disabled = true;
      try {
        await hass.callService('creality_cloud', 'reprint', { device_id: s.device_id, file_name: r.name.split('/').pop() });
        this._close();
      } catch (e) { el.disabled = false; alert(e.message || e); }
    }));
  }

  _play(r) {
    this._video = r;
    this._render();
    const dlg = this.shadowRoot.querySelector('.dlg');
    const box = document.createElement('div');
    box.className = 'player';
    box.innerHTML = `<button class="back" title="${esc(this._t('history'))}"><ha-icon icon="mdi:arrow-left"></ha-icon>${esc(cleanJob(r.name))}</button>`;
    const v = document.createElement('video');
    v.src = r.timelapse;   // only Creality CDN URLs reach this point (checked by the integration)
    v.controls = true; v.autoplay = true; v.playsInline = true; v.loop = true;
    if (r.timelapse_cover || r.thumbnail) v.poster = r.timelapse_cover || r.thumbnail;
    box.append(v);
    dlg.append(box);
    box.querySelector('.back').addEventListener('click', () => { this._video = null; this._render(); });
  }
}

const DIALOG_CSS = `<style>
  :host { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; font-family: var(--paper-font-body1_-_font-family, inherit); }
  .backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.5); }
  .dlg { position: relative; width: min(560px, calc(100vw - 24px)); max-height: calc(100vh - 48px); overflow: auto; border-radius: 20px;
    background: var(--card-background-color, #fff); color: var(--primary-text-color); box-shadow: 0 12px 40px rgba(0,0,0,.35); padding: 16px 16px 20px; }
  header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
  h2 { margin: 0; font-size: 1.2rem; font-weight: 600; }
  .sub { color: var(--secondary-text-color); font-size: .85rem; }
  button { font: inherit; cursor: pointer; border: none; background: none; color: inherit; }
  .x { border-radius: 50%; padding: 8px; display: flex; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  li { display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: 12px; background: var(--secondary-background-color, rgba(127,127,127,.08)); }
  .thumb { position: relative; width: 56px; height: 56px; flex: none; border-radius: 10px; overflow: hidden; display: flex; align-items: center; justify-content: center;
    background: var(--card-background-color, #fff); color: var(--secondary-text-color); }
  .thumb img { width: 100%; height: 100%; object-fit: contain; }
  .thumb.play { cursor: pointer; }
  .playicon { position: absolute; inset: auto 4px 4px auto; background: rgba(0,0,0,.6); color: #fff; border-radius: 50%; display: flex; padding: 2px; --mdc-icon-size: 16px; }
  .info { flex: 1; min-width: 0; }
  .nm { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .meta { color: var(--secondary-text-color); font-size: .8rem; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .st { color: var(--c); font-weight: 600; }
  .btns { display: flex; gap: 2px; }
  .btns button { border-radius: 50%; padding: 8px; display: flex; color: var(--primary-color); }
  .btns button:disabled { color: var(--disabled-text-color, #999); cursor: default; }
  .empty { color: var(--secondary-text-color); }
  .player { display: grid; gap: 10px; }
  .back { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; justify-self: start; padding: 4px 0; }
  video { width: 100%; max-height: 70vh; border-radius: 12px; background: #000; }
</style>`;

