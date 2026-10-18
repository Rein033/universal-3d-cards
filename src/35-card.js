
class PrinterCard extends HTMLElement {
  setConfig(config) {
    if (!config || !config.entity) throw new Error('Set "entity" to any entity of a supported 3D printer');
    this._config = config;
    this._view = ['preview', 'camera'].includes(config.view) ? config.view : 'printer';
    this._key = null;
    this._uid = 'p3d' + (++uid);
  }

  static getConfigElement() { return document.createElement('printer-3d-card-editor'); }

  static getStubConfig(hass) {
    // prefer a printer that is online and busy
    const rank = (p) => { const s = snapshot(hass, p.entity); return !s ? 9 : (s.online ? 0 : 4) + (s.active ? 0 : 2); };
    const p = allPrinters(hass).slice().sort((a, b) => rank(a) - rank(b))[0];
    return { entity: p ? p.entity : '' };
  }

  getCardSize() { return 7; }

  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }

  set hass(hass) {
    this._hass = hass;
    const r = resolve(hass, this._config.entity);
    const key = this._view + (r ? snapKey(hass, r) : 'none');
    if (key === this._key) return;
    this._key = key;
    const s = snapshot(hass, this._config.entity, this._config.name);
    this._snap = s;
    this._render(s);
    if (this._dialog) this._dialog.update(hass, s);
  }

  _t(k) { return tr(this._hass, k); }

  _render(s) {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    const root = this.shadowRoot;
    if (!s) { root.innerHTML = `<ha-card><div class="msg">${esc(this._t('notFound'))}</div></ha-card>${CSS}`; return; }
    const hass = this._hass, cfg = this._config, show = (k) => cfg[k] !== false;
    const { A, ids, c, active, done, state, online } = s;
    if (this._view === 'camera' && !s.camera) this._view = 'printer';

    const types = [...new Set(Array.isArray(s.jobAttr.filament_types) ? s.jobAttr.filament_types : [])];
    const slicer = [
      types.length ? [this._t('material'), types.join(' + ')] : null,
      s.jobAttr.layer_height ? [this._t('layerHeight'), `${s.jobAttr.layer_height} mm`] : null,
      s.layers ? [this._t('layers'), `${s.layer != null ? Math.round(s.layer) : '–'} / ${Math.round(s.layers)}`] : null,
      s.filamentTxt ? [this._t('filament'), s.filamentTxt] : null,
      s.jobAttr.slicer_estimate ? [this._t('estimate'), dur(s.jobAttr.slicer_estimate)] : null,
      s.jobAttr.slicer ? [this._t('slicer'), String(s.jobAttr.slicer)] : null,
    ].filter(Boolean);

    const lang = hass.locale ? hass.locale.language : undefined;
    const endTime = s.ends ? s.ends.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }) : '–';
    const temp = (k, tk2, icon, label) => {
      const now = c.num(k), target = tk2 ? c.num(tk2) : null;
      if (now == null && !ids[k]) return '';
      const heating = target != null && target > 0;
      return `<div class="temp ${heating ? 'hot' : ''}" data-more="${esc(ids[k])}">
        <ha-icon icon="${icon}"></ha-icon>
        <div><span class="label">${esc(label)}</span><span class="val">${now == null ? '–' : Math.round(now)}°${heating ? `<small> / ${Math.round(target)}°</small>` : ''}</span></div></div>`;
    };
    const btn = (k, icon, cls = '') => (ids[k] && (hass.states[ids[k]] || {}).state !== 'unavailable'
      ? `<button class="act ${cls}" data-press="${k}"><ha-icon icon="${icon}"></ha-icon>${esc(this._t(k))}</button>` : '');

    const C = 2 * Math.PI * 52;
    const ring = `<div class="ring" data-more="${esc(ids.progress || ids.status)}">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle class="track" cx="60" cy="60" r="52"></circle>
          <circle class="bar" cx="60" cy="60" r="52" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - s.progress / 100)}"></circle>
        </svg>
        ${s.thumb ? `<img src="${esc(s.thumb)}" alt="">` : `<ha-icon class="ph" icon="mdi:printer-3d"></ha-icon>`}
        ${active ? `<div class="pct">${Math.round(s.progress)}<small>%</small></div>` : ''}
      </div>`;
    const o = { progress: s.progress, thumb: s.thumb, tint: s.tint, active, printing: state === 'printing', lightOn: s.lightOn, spools: s.spools };
    const drawing = `<div class="draw" data-more="${esc(ids.progress || ids.status)}">
        ${drawingFor(shapeFor(s.r, cfg.drawing), this._uid, o)}
        ${active ? `<div class="pct float">${Math.round(s.progress)}<small>%</small></div>` : ''}
      </div>`;
    const camera = s.camera ? `<div class="cam" data-more="${esc(s.camera.id)}"><img data-stream="${esc(s.camera.stream)}" alt="${esc(this._t('viewCamera'))}">
        ${active ? `<div class="pct float">${Math.round(s.progress)}<small>%</small></div>` : ''}</div>` : '';
    const times = active ? `<div class="stats">
        <div class="stat"><span class="label">${esc(this._t('remaining'))}</span><span class="big">${dur(s.remaining)}</span></div>
        <div class="stat"><span class="label">${esc(this._t('ends'))}</span><span class="big">${esc(endTime)}</span></div>
      </div>` : '';
    const vbtn = (v, icon, label) => `<button class="${this._view === v ? 'sel' : ''}" data-view="${v}" title="${esc(this._t(label))}"><ha-icon icon="${icon}"></ha-icon></button>`;
    const viewBtns = !show('show_view_switch') ? '' : `<div class="views" role="group">
        ${vbtn('printer', 'mdi:printer-3d', 'viewPrinter')}${vbtn('preview', 'mdi:image-outline', 'viewPreview')}${s.camera ? vbtn('camera', 'mdi:cctv', 'viewCamera') : ''}
      </div>`;
    const historyBtn = show('show_history') && ids.history
      ? `<button class="icon" data-history title="${esc(this._t('history'))}"><ha-icon icon="mdi:history"></ha-icon></button>` : '';
    const updateChip = s.update != null ? `<button class="icon upd" data-more="${esc(s.updateId)}" title="${esc(this._t('updateTitle').replace('%s', s.update))}"><ha-icon icon="mdi:package-up"></ha-icon></button>` : '';
    const sub = s.job && (active || done) ? s.job + (s.stage ? ' · ' + s.stage : '') : this._t('noJob');

    const oldCam = root.querySelector('.cam img');
    root.innerHTML = `<ha-card style="--p3d-status:${s.look.color}">
      <div class="head">
        <ha-icon class="logo" icon="${s.look.icon}"></ha-icon>
        <div class="title"><div class="name">${esc(s.name)}</div><div class="sub">${esc(sub)}</div></div>
        <div class="tools">
          ${updateChip}
          <span class="chip" data-more="${esc(ids.status || ids.busy || ids.online)}"><span class="dot"></span>${esc(this._t(state))}</span>
          ${historyBtn}
          ${ids.light && show('show_controls') ? `<button class="icon ${s.lightOn ? 'on' : ''}" data-light title="${esc(this._t('light'))}" ${online ? '' : 'disabled'}><ha-icon icon="${s.lightOn ? 'mdi:lightbulb-on' : 'mdi:lightbulb-outline'}"></ha-icon></button>` : ''}
        </div>
      </div>
      ${this._view === 'preview'
        ? `<div class="body ${active ? '' : 'idle'}">${ring}${times}</div>${viewBtns ? `<div class="viewrow">${viewBtns}</div>` : ''}`
        : `<div class="stage">${this._view === 'camera' ? camera : drawing}${viewBtns}</div>${times ? `<div class="under">${times}</div>` : ''}`}
      ${(active || done) && slicer.length && show('show_slicer') ? `<div class="slicer">${slicer.map(([l, v]) => `<span><b>${esc(v)}</b>${esc(l)}</span>`).join('')}</div>` : ''}
      ${!show('show_temperatures') ? '' : `<div class="temps">
        ${temp('nozzle', 'nozzle_target', 'mdi:printer-3d-nozzle-heat', this._t('nozzle'))}
        ${temp('bed', 'bed_target', 'mdi:radiator', this._t('bed'))}
        ${temp('extra', null, A.extraLabel === 'ace' ? 'mdi:printer-3d-nozzle-outline' : 'mdi:thermometer', this._t(A.extraLabel))}
      </div>`}
      ${s.err ? `<div class="err"><ha-icon icon="mdi:alert"></ha-icon>${esc(this._t('error'))}: ${esc(s.err)}</div>` : ''}
      ${active && online && show('show_controls') ? `<div class="actions">
        ${state === 'printing' ? btn('pause', 'mdi:pause') : btn('resume', 'mdi:play')}
        ${btn('cancel', 'mdi:stop', 'danger')}
      </div>` : ''}
    </ha-card>${CSS}`;

    // keep a running camera stream instead of reconnecting on every state change
    const newCam = root.querySelector('.cam img');
    if (newCam && oldCam && oldCam.dataset.stream === newCam.dataset.stream) newCam.replaceWith(oldCam);
    this._camToggle();

    root.querySelectorAll('[data-more]').forEach((el) => el.addEventListener('click', () => moreInfo(this, el.dataset.more)));
    root.querySelectorAll('[data-view]').forEach((el) => el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this._view = el.dataset.view;
      this._key = null;
      this.hass = this._hass;
    }));
    root.querySelectorAll('[data-press]').forEach((el) => el.addEventListener('click', () => {
      const k = el.dataset.press;
      if (k === 'cancel' && !confirm(this._t('confirm').replace('%s', s.name))) return;
      el.disabled = true;
      hass.callService('button', 'press', { entity_id: ids[k] }).catch(() => { el.disabled = false; });
    }));
    const l = root.querySelector('[data-light]');
    if (l) l.addEventListener('click', () => hass.callService('light', 'toggle', { entity_id: ids.light }));
    const h = root.querySelector('[data-history]');
    if (h) h.addEventListener('click', () => this._openHistory());
  }

  /* The live stream only runs while the camera view is on screen. */
  _camToggle() {
    const img = this.shadowRoot && this.shadowRoot.querySelector('.cam img');
    if (!img) return;
    const want = this.hasAttribute('paused') || document.hidden ? '' : img.dataset.stream;
    if ((img.getAttribute('src') || '') !== want) { if (want) img.setAttribute('src', want); else img.removeAttribute('src'); }
  }

  _openHistory() {
    if (!this._dialog) {
      this._dialog = document.createElement('printer-3d-dialog');
      this._dialog.addEventListener('closed', () => { this._dialog.remove(); this._dialog = null; });
    }
    document.body.append(this._dialog);
    this._dialog.update(this._hass, this._snap);
  }

  connectedCallback() {
    if (!this._io && 'IntersectionObserver' in window) {
      this._io = new IntersectionObserver((entries) => { this.toggleAttribute('paused', !entries[0].isIntersecting); this._camToggle(); });
    }
    if (this._io) this._io.observe(this);
    this._vis = () => this._camToggle();
    document.addEventListener('visibilitychange', this._vis);
  }

  disconnectedCallback() {
    if (this._io) this._io.disconnect();
    document.removeEventListener('visibilitychange', this._vis);
    const img = this.shadowRoot && this.shadowRoot.querySelector('.cam img');
    if (img) img.removeAttribute('src');
    if (this._dialog) { this._dialog.remove(); this._dialog = null; }
  }
}
