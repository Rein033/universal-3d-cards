
const INTEGRATIONS = Object.keys(ADAPTERS);

/* Visual editor for the single card, built on Home Assistant's own ha-form. */
class PrinterCardEditor extends HTMLElement {
  setConfig(config) { this._config = { ...config }; this._render(); }

  set hass(hass) { this._hass = hass; if (this._form) this._form.hass = hass; else this._render(); }

  _t(k) { return tr(this._hass, k); }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = (s) => this._t('e_' + s.name);
      this._form.addEventListener('value-changed', (ev) => {
        const cfg = { ...ev.detail.value };
        for (const k of ['show_slicer', 'show_temperatures', 'show_controls', 'show_view_switch', 'show_history']) if (cfg[k] === true) delete cfg[k];
        if (cfg.view === 'printer') delete cfg.view;
        if (cfg.drawing === 'auto') delete cfg.drawing;
        if (!cfg.name) delete cfg.name;
        this._config = cfg;
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: cfg }, bubbles: true, composed: true }));
      });
      this.append(this._form);
    }
    this._form.hass = this._hass;
    // only offer entities of printers that were found (no slow integration lookups in the picker)
    const printers = allPrinters(this._hass).map((p) => p.entity);
    if (this._config.entity && !printers.includes(this._config.entity)) printers.push(this._config.entity);
    this._form.schema = [
      { name: 'entity', required: true, selector: { entity: { include_entities: printers } } },
      { name: 'name', selector: { text: {} } },
      { name: 'view', selector: { select: { mode: 'dropdown', options: [
        { value: 'printer', label: this._t('viewPrinter') }, { value: 'preview', label: this._t('viewPreview') }, { value: 'camera', label: this._t('viewCamera') }] } } },
      { name: 'drawing', selector: { select: { mode: 'dropdown', options: ['auto', ...SHAPES].map((d) => ({ value: d, label: this._t('d_' + d) })) } } },
      { name: 'show_slicer', selector: { boolean: {} } },
      { name: 'show_temperatures', selector: { boolean: {} } },
      { name: 'show_controls', selector: { boolean: {} } },
      { name: 'show_view_switch', selector: { boolean: {} } },
      { name: 'show_history', selector: { boolean: {} } },
    ];
    this._form.data = { view: 'printer', drawing: 'auto', show_slicer: true, show_temperatures: true, show_controls: true,
      show_view_switch: true, show_history: true, ...this._config };
  }
}

/* Printer group: every printer in one compact list. */
class PrinterGroupCard extends HTMLElement {
  setConfig(config) { this._config = { ...(config || {}) }; this._key = null; }

  static getConfigElement() { return document.createElement('printer-3d-group-card-editor'); }

  static getStubConfig() { return {}; }

  getCardSize() { return 1 + (this._rows || 2) * 2; }

  getGridOptions() { return { columns: 12, min_columns: 6, rows: 'auto' }; }

  set hass(hass) {
    this._hass = hass;
    const list = (this._config.entities && this._config.entities.length ? this._config.entities.map((e) => ({ entity: e })) : allPrinters(hass));
    const key = list.map((p) => { const r = resolve(hass, p.entity); return r ? snapKey(hass, r) : ''; }).join('|');
    if (key === this._key) return;
    this._key = key;
    const snaps = list.map((p) => snapshot(hass, p.entity)).filter(Boolean)
      .filter((s) => this._config.show_idle !== false || s.active || s.done);
    this._rows = snaps.length;
    this._render(snaps);
  }

  _t(k) { return tr(this._hass, k); }

  _render(snaps) {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    const hass = this._hass;
    const lang = hass.locale ? hass.locale.language : undefined;
    const title = this._config.title ?? this._t('groupTitle');
    const active = snaps.filter((s) => s.active).length;
    const row = (s, i) => {
      const nozzle = s.c.num('nozzle'), bed = s.c.num('bed');
      const end2 = s.ends ? s.ends.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' }) : null;
      return `<div class="row" data-i="${i}" style="--p3d-status:${s.look.color}">
        <div class="pic">${s.thumb ? `<img src="${esc(s.thumb)}" alt="">` : `<ha-icon icon="${s.look.icon}"></ha-icon>`}</div>
        <div class="main">
          <div class="top"><span class="nm">${esc(s.name)}</span><span class="chip"><span class="dot"></span>${esc(this._t(s.state))}</span></div>
          <div class="job">${esc(s.active || s.done ? s.job : this._t('noJob'))}</div>
          ${s.active ? `<div class="bar"><i style="width:${s.progress}%"></i></div>
            <div class="meta"><b>${Math.round(s.progress)}%</b><span>${esc(this._t('remaining'))} ${dur(s.remaining)}</span>${end2 ? `<span>${esc(this._t('ends'))} ${esc(end2)}</span>` : ''}</div>`
          : `<div class="meta">${nozzle != null ? `<span><ha-icon icon="mdi:printer-3d-nozzle-heat"></ha-icon>${Math.round(nozzle)}°</span>` : ''}${bed != null ? `<span><ha-icon icon="mdi:radiator"></ha-icon>${Math.round(bed)}°</span>` : ''}${s.update != null ? `<span class="upd"><ha-icon icon="mdi:package-up"></ha-icon>${esc(this._t('update'))}</span>` : ''}</div>`}
        </div>
      </div>`;
    };
    this.shadowRoot.innerHTML = `<ha-card style="--p3d-accent: var(--accent-color, var(--primary-color))">
      ${title ? `<div class="head"><span>${esc(title)}</span>${active ? `<span class="count">${active} ${esc(this._t('printing').toLowerCase())}</span>` : ''}</div>` : ''}
      ${snaps.length ? snaps.map(row).join('') : `<div class="empty">${esc(this._t('noPrinters'))}</div>`}
    </ha-card>${GROUP_CSS}`;
    this.shadowRoot.querySelectorAll('[data-i]').forEach((el) => el.addEventListener('click', () => {
      const s = snaps[+el.dataset.i];
      moreInfo(this, s.ids.status || s.ids.progress || s.ids.busy);
    }));
  }
}

const GROUP_CSS = `<style>
  ha-card { padding: 12px 16px 8px; }
  .head { display: flex; align-items: baseline; justify-content: space-between; font-size: 1.1rem; font-weight: 600; padding: 4px 0 8px; }
  .count { font-size: .8rem; font-weight: 500; color: var(--p3d-accent); }
  .row { display: flex; gap: 12px; align-items: center; padding: 10px 0; border-top: 1px solid var(--divider-color, rgba(127,127,127,.2)); cursor: pointer; }
  .row:first-of-type, .head + .row { border-top: none; }
  .pic { width: 52px; height: 52px; flex: none; border-radius: 12px; display: flex; align-items: center; justify-content: center; overflow: hidden;
    background: color-mix(in srgb, var(--p3d-status) 14%, transparent); color: var(--p3d-status); --mdc-icon-size: 26px; }
  .pic img { width: 100%; height: 100%; object-fit: contain; }
  .main { flex: 1; min-width: 0; }
  .top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .nm { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chip { display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border-radius: 999px; font-size: .75rem; font-weight: 500; flex: none;
    background: color-mix(in srgb, var(--p3d-status) 16%, transparent); }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--p3d-status); }
  .job { color: var(--secondary-text-color); font-size: .85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .bar { height: 6px; border-radius: 999px; background: var(--divider-color, rgba(127,127,127,.25)); overflow: hidden; margin: 6px 0 4px; }
  .bar i { display: block; height: 100%; background: var(--p3d-status); border-radius: 999px; transition: width .8s ease; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: .8rem; color: var(--secondary-text-color); align-items: center; }
  .meta b { color: var(--primary-text-color); }
  .meta span { display: inline-flex; align-items: center; gap: 3px; }
  .meta ha-icon { --mdc-icon-size: 15px; }
  .upd { color: var(--p3d-accent); }
  .empty { color: var(--secondary-text-color); padding: 8px 0 12px; }
</style>`;

class PrinterGroupCardEditor extends HTMLElement {
  setConfig(config) { this._config = { ...config }; this._render(); }

  set hass(hass) { this._hass = hass; if (this._form) this._form.hass = hass; else this._render(); }

  _t(k) { return tr(this._hass, k); }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = (s) => this._t('e_' + s.name);
      this._form.addEventListener('value-changed', (ev) => {
        const cfg = { ...ev.detail.value };
        if (cfg.show_idle === true) delete cfg.show_idle;
        if (!cfg.entities || !cfg.entities.length) delete cfg.entities;
        this._config = cfg;
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: cfg }, bubbles: true, composed: true }));
      });
      this.append(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = [
      { name: 'title', selector: { text: {} } },
      { name: 'entities', selector: { entity: { multiple: true, include_entities: allPrinters(this._hass).map((p) => p.entity) } } },
      { name: 'show_idle', selector: { boolean: {} } },
    ];
    this._form.data = { show_idle: true, ...this._config };
  }
}

const define = (name, cls) => { if (!customElements.get(name)) customElements.define(name, cls); };
define('printer-3d-dialog', PrinterDialog);
define('printer-3d-card-editor', PrinterCardEditor);
define('printer-3d-group-card-editor', PrinterGroupCardEditor);
if (!customElements.get('printer-3d-card')) {
  define('printer-3d-card', PrinterCard);
  define('printer-3d-group-card', PrinterGroupCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: 'printer-3d-card',
    name: '3D Printer Card',
    description: 'Drawn printer with the print growing inside it, live camera, slicer info, spools and controls. Bambu Lab, Klipper, Creality, Anycubic and OctoPrint.',
    preview: true,
    documentationURL: 'https://github.com/Rein033/lovelace-3d-printer-card',
  }, {
    type: 'printer-3d-group-card',
    name: '3D Printer Group',
    description: 'All your 3D printers in one compact list: status, progress and finish time.',
    preview: true,
    documentationURL: 'https://github.com/Rein033/lovelace-3d-printer-card',
  });
  console.info('%c 3D PRINTER CARD %c 0.1.0 ', 'background:#ff4081;color:#fff;font-weight:700', 'background:#333;color:#fff');
}
