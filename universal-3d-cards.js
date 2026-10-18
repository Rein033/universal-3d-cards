/* Universal 3D Cards for Home Assistant: one card for Bambu Lab, Klipper (Moonraker), Creality (local and cloud),
 * Anycubic Cloud and OctoPrint printers. Drawn printer with the print growing inside it, live camera, slicer info,
 * temperatures, AMS/ACE spools and controls. Plus a group card with all printers in one list. Both have a visual editor.
 *
 *   type: custom:printer-3d-card
 *   entity: sensor.x1c_print_status     # any entity of the printer; the card finds the others through the device
 *   name: X1C                           # optional
 *   view: printer                       # printer (drawing), preview (progress ring) or camera
 *   drawing: auto                       # auto, enclosed, bambu, bedslinger, voron, k1, kobra
 *   show_slicer / show_temperatures / show_controls / show_view_switch / show_history: true
 *
 *   type: custom:printer-3d-group-card
 *   title: Printers
 *   entities: [...]                     # optional, default: every printer found
 *
 * The printer drawings are original artwork. https://github.com/Rein033/universal-3d-cards */

/* How to find each part of a printer, per integration. A matcher is a translation_key (tk), or for integrations
   without translation keys the end of the entity_id (end) plus the domain. The first match wins. */
const tk = (...keys) => keys.map((k) => ({ tk: k }));
const end = (domain, ...ends) => ends.map((e) => ({ domain, end: e }));

const ADAPTERS = {
  creality_cloud: {
    label: 'Creality Cloud',
    roles: {
      status: tk('status'), progress: tk('progress'), remaining: tk('time_remaining'), ends: tk('print_end'), job: tk('job_name'),
      nozzle: tk('nozzle_temperature'), nozzle_target: tk('nozzle_target'), bed: tk('bed_temperature'), bed_target: tk('bed_target'),
      extra: tk('chamber_temperature'), online: tk('online'), pause: tk('pause'), resume: tk('resume'), cancel: tk('cancel'),
      light: tk('light'), thumbnail: tk('thumbnail'), error: tk('error_code'), history: tk('last_print'), firmware: tk('firmware'),
    },
    extraLabel: 'chamber',
    anchor: { tk: 'status' },
    state: (c) => c.str('status'),
    shape: () => 'k1',
  },
  ha_creality_ws: {
    label: 'Creality (local)',
    roles: {
      status: tk('print_status'), progress: tk('print_progress'), remaining: tk('print_left_time'), job: tk('print_status'),
      nozzle: tk('nozzle_temperature'), bed: tk('bed_temperature'), extra: tk('chamber_temperature'),
      layer: tk('current_layer'), layers: tk('total_layers'), filament: tk('used_material_length'),
      pause: tk('pause_print'), resume: tk('resume_print'), cancel: tk('stop_print'), light: tk('light'),
      thumbnail: tk('current_print_preview'), camera: tk('printer_camera'),
    },
    extraLabel: 'chamber',
    anchor: { tk: 'print_status' },
    jobAttr: 'file',
    state: (c) => ({ printing: 'printing', 'self-testing': 'printing', paused: 'paused', completed: 'finished', complete: 'finished',
      finished: 'finished', stopped: 'stopped', error: 'failed', idle: 'idle', off: 'offline' })[c.str('status')] || (c.str('status') ? 'idle' : 'offline'),
    shape: (m) => (/ender|cr-?10|sermoon|v3/i.test(m) ? 'bedslinger' : 'k1'),
  },
  anycubic_cloud: {
    label: 'Anycubic Cloud',
    roles: {
      progress: tk('job_progress'), remaining: tk('job_time_remaining'), ends: tk('job_eta'), job: tk('job_name'),
      nozzle: tk('curr_nozzle_temp'), nozzle_target: tk('target_nozzle_temp'), bed: tk('curr_hotbed_temp'), bed_target: tk('target_hotbed_temp'),
      extra: tk('ace_current_temperature'), online: tk('printer_online'), busy: tk('job_in_progress'), paused: tk('job_is_paused'),
      complete: tk('job_complete'), failed: tk('job_failed'), pause: tk('pause_print'), resume: tk('resume_print'), cancel: tk('cancel_print'),
      light: tk('printer_light'), thumbnail: tk('job_image_url'), layer: tk('job_current_layer'), layers: tk('job_total_layers'),
      filament: tk('job_filament_used'), loaded_slot: tk('ace_loaded_slot'), slot1: tk('ace_slot_1'), slot2: tk('ace_slot_2'),
      slot3: tk('ace_slot_3'), slot4: tk('ace_slot_4'), error: tk('last_error'), camera: tk('camera'),
    },
    extraLabel: 'ace',
    anchor: { tk: 'job_progress' },
    state: (c) => (c.on('paused') ? 'paused' : c.on('busy') ? 'printing' : c.on('failed') ? 'failed' : c.on('complete') ? 'finished' : 'idle'),
    shape: (m) => (/kobra s1|s1/i.test(m) ? 'kobra' : /kobra|vyper|mega/i.test(m) ? 'bedslinger' : 'kobra'),
  },
  bambu_lab: {
    label: 'Bambu Lab',
    roles: {
      status: tk('print_status'), progress: tk('print_progress'), remaining: tk('remaining_time'), ends: tk('end_time'),
      job: tk('subtask_name', 'gcode_file'), nozzle: tk('nozzle_temp', 'left_nozzle_temp'), nozzle_target: tk('target_nozzle_temp', 'left_target_nozzle_temp'),
      bed: tk('bed_temp'), bed_target: tk('target_bed_temp'), extra: tk('chamber_temp'), online: tk('online'),
      pause: tk('pause'), resume: tk('resume'), cancel: tk('stop'), light: tk('chamber_light'), thumbnail: tk('cover_image'),
      camera: tk('camera', 'p1p_camera'), layer: tk('current_layer'), layers: tk('total_layers'), weight: tk('print_weight'),
      error: tk('print_error'), stage: tk('stage'), firmware_bin: tk('firmware_update'), tray: tk('tray'), external: tk('external_spool'),
    },
    extraLabel: 'chamber',
    anchor: { tk: 'print_status' },
    state: (c) => ({ running: 'printing', prepare: 'printing', slicing: 'printing', init: 'printing', pause: 'paused', finish: 'finished',
      failed: 'failed', idle: 'idle', offline: 'offline' })[c.str('status')] || 'idle',
    shape: (m) => (/a1/i.test(m) ? 'bedslinger' : 'bambu'),
  },
  moonraker: {
    label: 'Klipper',
    roles: {
      status: end('sensor', '_current_print_state'), progress: end('sensor', '_progress'), remaining: end('sensor', '_print_time_left'),
      ends: end('sensor', '_print_eta'), job: end('sensor', '_filename'),
      nozzle: end('sensor', '_extruder_temperature'), nozzle_target: end('sensor', '_extruder_target', '_extruder_target_temperature'),
      bed: end('sensor', '_heater_bed_temperature', '_bed_temperature'), bed_target: end('sensor', '_heater_bed_target', '_heater_bed_target_temperature'),
      extra: end('sensor', '_chamber_temperature', '_chamber_temp_temperature'), layer: end('sensor', '_current_layer'), layers: end('sensor', '_total_layer'),
      filament: end('sensor', '_filament_used'), pause: end('button', '_pause_print'), resume: end('button', '_resume_print'),
      cancel: end('button', '_cancel_print'), thumbnail: end('camera', '_thumbnail'), camera: end('camera', '_webcam', '_camera', '_cam'),
      printer_state: end('sensor', '_printer_state'),
    },
    extraLabel: 'chamber',
    anchor: { domain: 'sensor', end: '_current_print_state' },
    state: (c) => {
      if (['shutdown', 'error', 'disconnected'].includes(c.str('printer_state'))) return 'offline';
      return ({ printing: 'printing', paused: 'paused', complete: 'finished', cancelled: 'stopped', error: 'failed', standby: 'idle' })[c.str('status')] || 'idle';
    },
    shape: (m) => (/ender|prusa|mk[34]|i3|neptune|sv0[0-7]|kobra|a1/i.test(m) ? 'bedslinger' : 'voron'),
  },
  octoprint: {
    label: 'OctoPrint',
    roles: {
      status: end('sensor', '_current_state'), progress: end('sensor', '_job_percentage'), ends: end('sensor', '_estimated_finish_time'),
      job: end('sensor', '_current_file'), nozzle: end('sensor', '_actual_tool0_temp'), nozzle_target: end('sensor', '_target_tool0_temp'),
      bed: end('sensor', '_actual_bed_temp'), bed_target: end('sensor', '_target_bed_temp'), printing: end('binary_sensor', '_printing'),
      pause: end('button', '_pause_job'), resume: end('button', '_resume_job'), cancel: end('button', '_stop_job'), camera: end('camera', ''),
    },
    extraLabel: 'chamber',
    anchor: { domain: 'sensor', end: '_current_state' },
    state: (c) => {
      const s = String(c.str('status') || '').toLowerCase();
      if (!s || s === 'offline' || s.includes('error')) return 'offline';
      if (s.startsWith('paus')) return 'paused';
      if (s.startsWith('printing') || s === 'starting') return 'printing';
      if (s.startsWith('cancel')) return 'stopped';
      return 'idle';
    },
    shape: (m) => (/voron|ratrig|vzbot/i.test(m) ? 'voron' : 'bedslinger'),
  },
};

const SHAPES = ['enclosed', 'bambu', 'bedslinger', 'voron', 'k1', 'kobra'];

const STATUS = {
  printing: { color: 'var(--p3d-accent)', icon: 'mdi:printer-3d-nozzle' },
  paused: { color: 'var(--warning-color, #f59e0b)', icon: 'mdi:pause-circle' },
  finished: { color: 'var(--success-color, #22c55e)', icon: 'mdi:check-circle' },
  failed: { color: 'var(--error-color, #ef4444)', icon: 'mdi:alert-circle' },
  stopped: { color: 'var(--error-color, #ef4444)', icon: 'mdi:stop-circle' },
  waiting: { color: 'var(--secondary-text-color)', icon: 'mdi:timer-sand' },
  idle: { color: 'var(--secondary-text-color)', icon: 'mdi:printer-3d' },
  unknown: { color: 'var(--secondary-text-color)', icon: 'mdi:printer-3d' },
  offline: { color: 'var(--disabled-text-color, #888)', icon: 'mdi:cloud-off-outline' },
};

const TEXT = {
  en: { printing: 'Printing', paused: 'Paused', finished: 'Finished', failed: 'Failed', stopped: 'Cancelled', idle: 'Idle',
    waiting: 'Waiting', offline: 'Offline', unknown: 'Unknown', remaining: 'Remaining', ends: 'Ready at', nozzle: 'Nozzle', bed: 'Bed',
    chamber: 'Chamber', ace: 'ACE', pause: 'Pause', resume: 'Resume', cancel: 'Cancel', light: 'Light', noJob: 'No print running',
    confirm: 'Cancel the print on %s? This cannot be undone.', notFound: 'Printer not found. Pick an entity of a supported 3D printer integration.',
    error: 'Error', material: 'Material', layerHeight: 'Layer', layers: 'Layers', filament: 'Filament', slicer: 'Slicer', weight: 'Weight',
    estimate: 'Estimate', viewPrinter: 'Printer', viewPreview: 'Preview', viewCamera: 'Camera', history: 'Print history', noHistory: 'No prints yet.',
    timelapse: 'Timelapse', reprint: 'Print again', reprintConfirm: 'Print "%s" again on %s?', reprintBusy: 'Possible when the printer is online and idle',
    reprintNotOnPrinter: 'This file is not on the printer', close: 'Close', update: 'Update', updateTitle: 'Firmware %s is available',
    groupTitle: 'Printers', noPrinters: 'No printers found.', cameraOff: 'Camera not available',
    e_entity: 'Printer (any entity of it)', e_name: 'Name (optional)', e_view: 'Start view', e_drawing: 'Drawing',
    e_show_slicer: 'Show slicer info', e_show_temperatures: 'Show temperatures', e_show_controls: 'Show buttons (pause, cancel, light)',
    e_show_view_switch: 'Show view switch', e_show_history: 'Show history button (Creality Cloud)', e_title: 'Title',
    e_entities: 'Printers (empty = all printers)', e_show_idle: 'Also show idle and offline printers',
    d_auto: 'Automatic', d_enclosed: 'Enclosed (generic)', d_bambu: 'Bambu Lab X1 / P1 / H2', d_bedslinger: 'Bed slinger (A1, Ender, Prusa)',
    d_voron: 'Voron / Klipper', d_k1: 'Creality K1 / K2', d_kobra: 'Anycubic Kobra S1 with ACE' },
  nl: { printing: 'Printen', paused: 'Gepauzeerd', finished: 'Klaar', failed: 'Mislukt', stopped: 'Geannuleerd', idle: 'Vrij',
    waiting: 'Wachten', offline: 'Offline', unknown: 'Onbekend', remaining: 'Nog', ends: 'Klaar om', nozzle: 'Nozzle', bed: 'Bed',
    chamber: 'Kast', ace: 'ACE', pause: 'Pauzeren', resume: 'Hervatten', cancel: 'Annuleren', light: 'Licht', noJob: 'Er loopt geen print',
    confirm: 'De print op %s echt annuleren? Dit kun je niet terugdraaien.', notFound: 'Printer niet gevonden. Kies een entiteit van een ondersteunde 3D-printerintegratie.',
    error: 'Fout', material: 'Materiaal', layerHeight: 'Laag', layers: 'Lagen', filament: 'Filament', slicer: 'Slicer', weight: 'Gewicht',
    estimate: 'Schatting', viewPrinter: 'Printer', viewPreview: 'Voorbeeld', viewCamera: 'Camera', history: 'Printgeschiedenis', noHistory: 'Nog geen prints.',
    timelapse: 'Timelapse', reprint: 'Opnieuw printen', reprintConfirm: '"%s" opnieuw printen op %s?', reprintBusy: 'Kan als de printer online en vrij is',
    reprintNotOnPrinter: 'Dit bestand staat niet op de printer', close: 'Sluiten', update: 'Update', updateTitle: 'Firmware %s is beschikbaar',
    groupTitle: 'Printers', noPrinters: 'Geen printers gevonden.', cameraOff: 'Camera niet beschikbaar',
    e_entity: 'Printer (een willekeurige entiteit ervan)', e_name: 'Naam (optioneel)', e_view: 'Startweergave', e_drawing: 'Tekening',
    e_show_slicer: 'Slicer-info tonen', e_show_temperatures: 'Temperaturen tonen', e_show_controls: 'Knoppen tonen (pauzeren, annuleren, licht)',
    e_show_view_switch: 'Wisselknop weergave tonen', e_show_history: 'Geschiedenisknop tonen (Creality Cloud)', e_title: 'Titel',
    e_entities: 'Printers (leeg = alle printers)', e_show_idle: 'Ook vrije en offline printers tonen',
    d_auto: 'Automatisch', d_enclosed: 'Gesloten (algemeen)', d_bambu: 'Bambu Lab X1 / P1 / H2', d_bedslinger: 'Bedslinger (A1, Ender, Prusa)',
    d_voron: 'Voron / Klipper', d_k1: 'Creality K1 / K2', d_kobra: 'Anycubic Kobra S1 met ACE' },
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SECONDS = { s: 1, min: 60, h: 3600, d: 86400 };
const isHex = (c) => /^#[0-9a-f]{6}/i.test(c || '');
const hex6 = (c) => (isHex(c) ? c.slice(0, 7) : null);
let uid = 0;

function tr(hass, k) {
  const lang = (hass && hass.locale && hass.locale.language || 'en').split('-')[0];
  return (TEXT[lang] || TEXT.en)[k] ?? TEXT.en[k] ?? k;
}

function cleanJob(name) {
  return String(name || '').split('/').pop().replace(/\.(gcode|3mf|bgcode)$/i, '')
    .replace(/(\.stl)?_[A-Z][A-Z0-9+-]*(_0\.\d+)?_(\d+d)?(\d+h)?(\d+m)?(\d+s)?$/, '').replace(/^\d{4}-\d{4}-/, '');
}

/* Slicers (Creality Print, OrcaSlicer, Bambu Studio, PrusaSlicer) often put material, layer height and the time estimate
   in the file name, e.g. "Benchy.stl_PLA_0.2_1h12m3s.gcode". Used when the integration doesn't report them. */
function parseJobName(name) {
  const m = String(name || '').match(/[._](PLA|PETG|ABS|ASA|TPU|PA|PC|PVA|HIPS|PLA\+|[A-Z]{2,5}-CF)(?:[_ ](0\.\d+)(?:mm)?)?[_ ](?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?(?:\.\w+)?$/i);
  if (!m || !(m[3] || m[4] || m[5] || m[6])) return {};
  const est = (+m[3] || 0) * 86400 + (+m[4] || 0) * 3600 + (+m[5] || 0) * 60 + (+m[6] || 0);
  return { filament_types: [m[1].toUpperCase()], layer_height: m[2] ? +m[2] : undefined, slicer_estimate: est };
}

function dur(sec) {
  if (sec == null) return '–';
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`;
}

function fmtLength(v, unit) {
  if (isNaN(v)) return null;
  if (unit === 'g') return `${Math.round(v)} g`;
  const mm = unit === 'm' ? v * 1000 : unit === 'cm' ? v * 10 : v;
  return mm >= 1000 ? `${(mm / 1000).toFixed(1)} m` : `${Math.round(mm)} mm`;
}

/* Looking through all entities is the expensive part, and Home Assistant hands every card a new hass object on every
   state change anywhere. hass.entities only changes when entities are added or removed, so cache per that object. */
const CACHE = new WeakMap();
function cacheFor(hass) {
  const reg = hass.entities || {};
  let c = CACHE.get(reg);
  if (!c) { c = { resolved: new Map(), printers: null }; CACHE.set(reg, c); }
  return c;
}

function matches(e, m) {
  if (m.tk) return e.translation_key === m.tk;
  return (!m.domain || e.entity_id.startsWith(m.domain + '.')) && e.entity_id.endsWith(m.end);
}

/* All printers: [{entity, platform, device_id}], one anchor entity per device. */
function allPrinters(hass) {
  const cache = cacheFor(hass);
  if (cache.printers) return cache.printers;
  const out = [], seen = new Set();
  for (const e of Object.values(hass.entities || {})) {
    const A = ADAPTERS[e.platform];
    if (A && e.device_id && !seen.has(e.device_id) && matches(e, A.anchor)) { seen.add(e.device_id); out.push({ entity: e.entity_id, platform: e.platform, device_id: e.device_id }); }
  }
  cache.printers = out;
  return out;
}

/* role -> entity_id for the printer that entityId belongs to (cached). Entities of sub-devices (Bambu AMS units) count
   too; repeated roles (spool trays) are collected as lists. */
function resolve(hass, entityId) {
  const cache = cacheFor(hass);
  if (cache.resolved.has(entityId)) return cache.resolved.get(entityId);
  const first = (hass.entities || {})[entityId];
  const A = first && ADAPTERS[first.platform];
  let r = null;
  if (first && first.device_id && A) {
    const devices = new Set([first.device_id]);
    for (const d of Object.values(hass.devices || {})) if (d.via_device_id === first.device_id) devices.add(d.id);
    const own = Object.values(hass.entities).filter((e) => devices.has(e.device_id) && e.platform === first.platform);
    const ids = {}, lists = {};
    for (const [role, list] of Object.entries(A.roles)) {
      if (role === 'tray') { lists.tray = own.filter((e) => matches(e, list[0])).map((e) => e.entity_id).sort(); continue; }
      for (const m of list) {
        const pool = own.filter((e) => matches(e, m) && e.device_id === first.device_id);
        // a camera matcher with an empty end means "any camera that isn't the thumbnail"
        const hit = m.end === '' ? pool.find((e) => !e.entity_id.endsWith('_thumbnail')) : pool[0];
        if (hit) { ids[role] = hit.entity_id; break; }
      }
    }
    const dev = (hass.devices || {})[first.device_id] || {};
    if (Object.keys(ids).length) r = { first, A, ids, lists, model: [dev.model, dev.name, dev.model_id].filter(Boolean).join(' ') };
  }
  cache.resolved.set(entityId, r);
  return r;
}

function shapeFor(r, wanted) {
  if (wanted && wanted !== 'auto' && SHAPES.includes(wanted)) return wanted;
  return r.A.shape(r.model || '');
}

/* Everything the cards show about one printer, in one shape for all integrations. */
function snapshot(hass, entityId, name) {
  const r = resolve(hass, entityId);
  if (!r) return null;
  const { first, A, ids, lists } = r;
  const st = (role) => { const s = ids[role] && hass.states[ids[role]]; return s && !['unavailable', 'unknown'].includes(s.state) ? s : null; };
  const c = {
    str: (role) => (st(role) ? st(role).state : null),
    num: (role) => { const s = st(role); const n = s ? parseFloat(s.state) : NaN; return isNaN(n) ? null : n; },
    on: (role) => (ids[role] && hass.states[ids[role]] || {}).state === 'on',
    secs: (role) => { const s = st(role); const n = s ? parseFloat(s.state) : NaN; return isNaN(n) ? null : n * (SECONDS[s.attributes.unit_of_measurement] || 1); },
  };
  const onlineEnt = ids.online && hass.states[ids.online];
  const statusEnt = ids.status && hass.states[ids.status];
  const online = onlineEnt ? onlineEnt.state === 'on' : statusEnt ? statusEnt.state !== 'unavailable' : true;
  let state = !online ? 'offline' : (A.state(c) || 'unknown');
  if (state === 'idle' && ids.printing && c.on('printing')) state = 'printing';
  const active = state === 'printing' || state === 'paused';
  const done = state === 'finished';
  const jobState = st('job');
  const jobAttr = jobState ? jobState.attributes : {};
  const jobRaw = jobState ? (A.jobAttr ? jobAttr[A.jobAttr] : jobAttr.file_name || jobState.state) : '';
  const fromName = jobAttr.filament_types ? {} : parseJobName(jobRaw);
  let remaining = active ? c.secs('remaining') : null;
  const endsState = st('ends');
  let ends = null;
  if (active) {
    if (endsState && !isNaN(Date.parse(endsState.state))) ends = new Date(endsState.state);
    else if (remaining != null) ends = new Date(Date.now() + remaining * 1000);
    if (remaining == null && ends) remaining = Math.max(0, (ends - Date.now()) / 1000);
  }
  const thumbState = ids.thumbnail && hass.states[ids.thumbnail];
  const dev = (hass.devices || {})[first.device_id] || {};
  const errS = ids.error && hass.states[ids.error];
  const err = !errS || ['unavailable', 'unknown', 'off', '0', 'none', ''].includes(String(errS.state).toLowerCase()) ? null
    : errS.state === 'on' ? (errS.attributes.error || errS.attributes.code || tr(hass, 'error')) : errS.state;

  // spools: Anycubic ACE slots, Bambu AMS trays (first unit) or the external spool
  let spools = [];
  const loaded = c.str('loaded_slot');
  [1, 2, 3, 4].forEach((n) => {
    const s = st('slot' + n);
    if (s) spools.push({ n, mat: s.state, color: hex6(s.attributes.color_hex), loaded: s.attributes.spool_loaded !== false, active: String(n) === String(loaded) });
  });
  if (!spools.length && lists.tray && lists.tray.length) {
    spools = lists.tray.slice(0, 4).map((id, i) => {
      const s = hass.states[id] || { state: '', attributes: {} };
      return { n: i + 1, mat: s.attributes.type || s.state, color: hex6(s.attributes.color), loaded: !!(s.attributes.color && !/^#?0{6}/.test(s.attributes.color.replace('#', '')) && s.state !== 'empty' && s.state !== 'Empty'), active: !!s.attributes.active };
    });
  }
  const ext = st('external');
  if (!spools.some((s) => s.active) && ext && ext.attributes.active) spools.push({ n: 0, mat: ext.attributes.type || ext.state, color: hex6(ext.attributes.color), loaded: true, active: true, external: true });
  const activeSpool = spools.find((s) => s.active);

  const fw = ids.firmware && hass.states[ids.firmware];
  const fwBin = ids.firmware_bin && hass.states[ids.firmware_bin];
  const hist = ids.history && hass.states[ids.history];
  const filament = st('filament');
  const weight = st('weight');
  const stage = st('stage');
  const camState = ids.camera && hass.states[ids.camera];
  return {
    A, ids, c, online, state, active, done, look: STATUS[state] || STATUS.idle, device_id: first.device_id, platform: first.platform,
    model: r.model, r,
    name: name || dev.name_by_user || dev.name || 'Printer',
    progress: active ? Math.max(0, Math.min(100, c.num('progress') ?? 0)) : done ? 100 : 0,
    job: jobRaw ? cleanJob(jobRaw) : '',
    jobAttr: { ...fromName, ...jobAttr }, remaining, ends,
    stage: active && stage && !['printing', 'idle', 'offline', 'unknown'].includes(stage.state) ? stage.state.replace(/_/g, ' ') : null,
    // image and camera entities serve their picture through entity_picture (with an access token)
    thumb: (active || done) && thumbState && thumbState.state !== 'unavailable' && thumbState.attributes.entity_picture ? thumbState.attributes.entity_picture : null,
    camera: camState && camState.state !== 'unavailable' && camState.attributes.access_token
      ? { id: ids.camera, stream: `/api/camera_proxy_stream/${ids.camera}?token=${camState.attributes.access_token}`, still: camState.attributes.entity_picture } : null,
    lightOn: ids.light && (hass.states[ids.light] || {}).state === 'on',
    err,
    spools, tint: (active || done) && activeSpool && activeSpool.color ? activeSpool.color : null,
    layer: c.num('layer'), layers: c.num('layers'),
    filamentTxt: filament ? fmtLength(parseFloat(filament.state), filament.attributes.unit_of_measurement) : weight ? fmtLength(parseFloat(weight.state), 'g') : null,
    update: fw && fw.state === 'on' ? fw.attributes.latest_version : fwBin && fwBin.state === 'on' ? (fwBin.attributes.new_version || '') : null,
    updateId: ids.firmware || ids.firmware_bin,
    history: hist && Array.isArray(hist.attributes.history) ? hist.attributes.history : null,
  };
}

/* One key per printer that changes when anything the cards show changes. */
function snapKey(hass, r) {
  const ids = [...Object.values(r.ids || {}), ...(r.lists.tray || [])];
  return JSON.stringify(ids.map((id) => { const s = hass.states[id]; return s && [s.state, s.last_updated]; }));
}

function moreInfo(el, entityId) {
  if (entityId) el.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId }, bubbles: true, composed: true }));
}
/* The print inside the drawing: the preview image, revealed from the bottom up to the progress, the rest as a ghost.
   With a filament colour the image is tinted in that colour. */
function printPart(id, { x, y, w, h, progress, thumb, tint }) {
  if (!thumb) return '';
  const top = y + h * (1 - progress / 100);
  const filter = tint ? `filter="url(#${id}-tint)"` : '';
  return `<defs>
      <clipPath id="${id}-done"><rect x="${x}" y="${top}" width="${w}" height="${y + h - top}"/></clipPath>
      ${tint ? `<filter id="${id}-tint" color-interpolation-filters="sRGB">
        <feColorMatrix type="saturate" values="0"/>
        <feComponentTransfer result="grey"><feFuncR type="linear" slope=".55" intercept=".5"/><feFuncG type="linear" slope=".55" intercept=".5"/><feFuncB type="linear" slope=".55" intercept=".5"/></feComponentTransfer>
        <feFlood flood-color="${tint}" result="col"/>
        <feBlend in="col" in2="grey" mode="multiply" result="mix"/>
        <feComposite in="mix" in2="SourceAlpha" operator="in"/></filter>` : ''}
    </defs>
    <image href="${esc(thumb)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMax meet" opacity=".22" ${filter}/>
    <image href="${esc(thumb)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMax meet" clip-path="url(#${id}-done)" ${filter}/>`;
}

/* The toolhead lives in its own transparent layer on top of the drawing. Only that layer slides back and forth while
   printing (a transform, done by the compositor), so the drawing itself is never repainted for the animation. */
function headLayer(viewBox, moving, inner) {
  return `<svg viewBox="${viewBox}" class="headlayer ${moving ? 'moving' : ''}" aria-hidden="true">${inner}</svg>`;
}

/* Creality K1 Max style: dark cube, glass door, CoreXY toolhead above the print. Original artwork. */
function k1Svg(id, o) {
  const pTop = 92 + 104 * (1 - o.progress / 100);   // top of the printed part
  const headY = o.thumb ? Math.min(178, Math.max(80, pTop - 22)) : 86;
  return `<svg viewBox="0 0 300 260" class="printer ${o.printing ? 'printing' : ''}" aria-hidden="true">
    <defs>
      <linearGradient id="${id}-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2b2e"/><stop offset="1" stop-color="#17171a"/></linearGradient>
      <linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cfe6f7" stop-opacity=".10"/><stop offset="1" stop-color="#cfe6f7" stop-opacity=".03"/></linearGradient>
      <radialGradient id="${id}-led" cx=".5" cy="0" r=".9"><stop offset="0" stop-color="#fff2c4" stop-opacity="${o.lightOn ? '.22' : '0'}"/><stop offset="1" stop-color="#fff7d6" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse cx="150" cy="248" rx="104" ry="7" fill="#000" opacity=".18"/>
    <rect x="56" y="22" width="188" height="222" rx="12" fill="url(#${id}-body)"/>
    <rect x="56" y="22" width="188" height="12" rx="6" fill="#3a3a3e"/>
    <rect x="68" y="44" width="164" height="168" rx="6" fill="#26272c"/>
    <rect x="68" y="44" width="164" height="168" rx="6" fill="url(#${id}-led)"/>
    <rect x="76" y="198" width="148" height="7" rx="2" fill="#4a4a50"/>
    <rect x="80" y="196" width="140" height="3" rx="1.5" fill="#6d6d75"/>
    <g>${printPart(id, { x: 98, y: 92, w: 104, h: 104, progress: o.progress, thumb: o.thumb, tint: o.tint })}</g>
    <rect x="72" y="${78 + headY - 86}" width="156" height="5" rx="2.5" fill="#55555c"/>
    <rect x="68" y="44" width="164" height="168" rx="6" fill="url(#${id}-glass)" stroke="#3b3b40" stroke-width="2"/>
    <path d="M92 52l-16 40M108 52l-26 62" stroke="#fff" stroke-opacity=".07" stroke-width="5" stroke-linecap="round"/>
    <rect x="226" y="120" width="4" height="34" rx="2" fill="#4a4a50"/>
    <rect x="70" y="220" width="62" height="16" rx="3" fill="#0e0e10" stroke="#38383d"/>
    <rect x="73" y="223" width="22" height="10" rx="1.5" fill="${o.active ? '#1e88e5' : '#2a2a2e'}" opacity=".9"/>
    <rect x="62" y="243" width="20" height="6" rx="2" fill="#2a2a2e"/><rect x="218" y="243" width="20" height="6" rx="2" fill="#2a2a2e"/>
  </svg>${headLayer('0 0 300 260', o.printing, `<g transform="translate(0 ${headY - 86})">
      <rect x="134" y="70" width="32" height="20" rx="4" fill="#d7d7dc"/>
      <rect x="138" y="74" width="24" height="3" rx="1.5" fill="#9a9aa2"/>
      <path d="M144 90h12l-3 7h-6z" fill="#e8a33a"/></g>`)}`;
}

/* Anycubic Kobra S1 style with ACE Pro on top: four spools in their real colours, active slot outlined. Original artwork. */
function kobraSvg(id, o) {
  const pTop = 132 + 92 * (1 - o.progress / 100);
  const headY = o.thumb ? Math.min(206, Math.max(120, pTop - 20)) : 126;
  const slots = [0, 1, 2, 3].map((i) => {
    const s = o.spools.find((x) => x.n === i + 1);
    const col = s && isHex(s.color) ? s.color : '#3a3a3e';
    const x = 92 + i * 30;
    return `<g>
      <rect x="${x}" y="22" width="26" height="40" rx="4" fill="#26262a" ${s && s.active ? 'stroke="#e53935" stroke-width="2.5"' : 'stroke="#3d3d42"'}/>
      <rect x="${x + 4}" y="27" width="4" height="30" rx="2" fill="#3f3f45"/><rect x="${x + 18}" y="27" width="4" height="30" rx="2" fill="#3f3f45"/>
      ${s && s.loaded !== false ? `<rect x="${x + 8}" y="36" width="10" height="12" rx="2" fill="${col}"/><rect x="${x + 8}" y="36" width="10" height="3" rx="1.5" fill="#fff" opacity=".25"/>` : ''}
    </g>`;
  }).join('');
  const active = o.spools.find((s) => s.active);
  const tube = active && isHex(active.color) ? active.color : '#d84b3e';
  return `<svg viewBox="0 0 300 300" class="printer ${o.printing ? 'printing' : ''}" aria-hidden="true">
    <defs>
      <linearGradient id="${id}-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2a2d"/><stop offset="1" stop-color="#161618"/></linearGradient>
      <linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6f0f7" stop-opacity=".16"/><stop offset="1" stop-color="#e6f0f7" stop-opacity=".05"/></linearGradient>
      <radialGradient id="${id}-led" cx=".5" cy="0" r=".9"><stop offset="0" stop-color="#fff2c4" stop-opacity="${o.lightOn ? '.35' : '0'}"/><stop offset="1" stop-color="#fff7d6" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse cx="150" cy="290" rx="100" ry="6" fill="#000" opacity=".18"/>
    ${o.spools.length ? `<rect x="80" y="10" width="140" height="62" rx="8" fill="#1b1b1e"/>
      <rect x="92" y="13" width="116" height="4" rx="2" fill="#3a3a40"/>${slots}
      <rect x="92" y="64" width="116" height="4" rx="2" fill="#2f2f34"/>
      <circle cx="212" cy="18" r="2" fill="${o.active ? '#29b6f6' : '#555'}"/>
      <path d="M220 52 C 250 52, 252 84, 228 96" stroke="${tube}" stroke-width="3.5" fill="none" stroke-linecap="round"/>` : ''}
    <rect x="60" y="86" width="180" height="198" rx="10" fill="url(#${id}-body)"/>
    <rect x="196" y="90" width="34" height="18" rx="3" fill="#2f3440"/><rect x="204" y="95" width="10" height="9" rx="1.5" fill="#3d4a66"/>
    <rect x="70" y="112" width="160" height="150" rx="5" fill="#f3f4f6" opacity=".96"/>
    <rect x="70" y="112" width="160" height="150" rx="5" fill="url(#${id}-led)"/>
    <rect x="80" y="244" width="140" height="7" rx="2" fill="#c9ccd2"/>
    <g>${printPart(id, { x: 104, y: 132, w: 92, h: 112, progress: o.progress, thumb: o.thumb, tint: o.tint })}</g>
    <g transform="translate(0 ${headY - 126})">
      <rect x="74" y="120" width="152" height="6" rx="3" fill="#b8bcc4"/>
      <rect x="74" y="118" width="10" height="10" rx="2" fill="#3a3a40"/><rect x="216" y="118" width="10" height="10" rx="2" fill="#3a3a40"/>
    </g>
    <rect x="70" y="112" width="160" height="150" rx="5" fill="url(#${id}-glass)" stroke="#2f2f34" stroke-width="2"/>
    <path d="M96 120l-18 44M112 120l-24 58" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/>
    <rect x="60" y="264" width="180" height="20" rx="6" fill="#1c1c1f"/>
    <rect x="72" y="284" width="22" height="6" rx="2" fill="#38383d"/><rect x="206" y="284" width="22" height="6" rx="2" fill="#38383d"/>
  </svg>${headLayer('0 0 300 300', o.printing, `<g transform="translate(0 ${headY - 126})">
      <rect x="132" y="110" width="36" height="22" rx="4" fill="#26272b"/>
      <rect x="150" y="114" width="4" height="12" rx="2" fill="#4fc3f7"/>
      <path d="M144 132h12l-3 7h-6z" fill="#e0e0e0"/><path d="M148 139h4l-2 3z" fill="#e8a33a"/></g>`)}`;
}


/* Four spool windows on top of a printer (Bambu AMS, Anycubic ACE). Original artwork. */
function spoolBox(spools, { x, y, light }) {
  if (!spools.length) return '';
  const slots = [0, 1, 2, 3].map((i) => {
    const s = spools.find((v) => v.n === i + 1);
    const sx = x + 12 + i * 30;
    const col = s && s.color ? s.color : light ? '#d5d7db' : '#3a3a3e';
    return `<rect x="${sx}" y="${y + 10}" width="26" height="34" rx="5" fill="${light ? '#e9ebee' : '#26262a'}" ${s && s.active ? 'stroke="#e53935" stroke-width="2.5"' : `stroke="${light ? '#c4c7cc' : '#3d3d42'}"`}/>
      ${s && s.loaded ? `<circle cx="${sx + 13}" cy="${y + 27}" r="10" fill="${col}"/><circle cx="${sx + 13}" cy="${y + 27}" r="3.5" fill="${light ? '#e9ebee' : '#26262a'}"/>` : ''}`;
  }).join('');
  return `<rect x="${x}" y="${y}" width="140" height="54" rx="8" fill="${light ? '#f6f7f8' : '#1b1b1e'}" stroke="${light ? '#cfd2d6' : 'none'}"/>${slots}
    <rect x="${x + 8}" y="${y + 48}" width="124" height="3" rx="1.5" fill="${light ? '#cfd2d6' : '#2f2f34'}"/>`;
}

/* Bambu Lab X1 / P1S / H2 style: dark enclosure, glass door, AMS on top. */
function bambuSvg(id, o) {
  const pTop = 128 + 96 * (1 - o.progress / 100);
  const headY = o.thumb ? Math.min(206, Math.max(116, pTop - 20)) : 122;
  const active = o.spools.find((s) => s.active);
  const tube = active && active.color ? active.color : '#9aa0a8';
  return `<svg viewBox="0 0 300 300" class="printer" aria-hidden="true">
    <defs>
      <linearGradient id="${id}-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c2d31"/><stop offset="1" stop-color="#18191c"/></linearGradient>
      <linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9ecfa" stop-opacity=".14"/><stop offset="1" stop-color="#d9ecfa" stop-opacity=".04"/></linearGradient>
      <radialGradient id="${id}-led" cx=".5" cy="0" r=".9"><stop offset="0" stop-color="#fff2c4" stop-opacity="${o.lightOn ? '.3' : '0'}"/><stop offset="1" stop-color="#fff7d6" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse cx="150" cy="290" rx="104" ry="6" fill="#000" opacity=".18"/>
    ${spoolBox(o.spools, { x: 80, y: 18, light: true })}
    ${o.spools.length ? `<path d="M214 60 C 238 62, 240 84, 222 96" stroke="${tube}" stroke-width="3" fill="none" stroke-linecap="round"/>` : ''}
    <rect x="56" y="84" width="188" height="200" rx="12" fill="url(#${id}-body)"/>
    <rect x="62" y="84" width="176" height="10" rx="4" fill="#3a3b40"/>
    <rect x="68" y="102" width="164" height="150" rx="6" fill="#222327"/>
    <rect x="68" y="102" width="164" height="150" rx="6" fill="url(#${id}-led)"/>
    <rect x="80" y="232" width="140" height="8" rx="2" fill="#4c4d53"/>
    <g>${printPart(id, { x: 102, y: 128, w: 96, h: 104, progress: o.progress, thumb: o.thumb, tint: o.tint })}</g>
    <rect x="72" y="${118 + headY - 122}" width="156" height="5" rx="2.5" fill="#5b5c62"/>
    <rect x="68" y="102" width="164" height="150" rx="6" fill="url(#${id}-glass)" stroke="#3b3c41" stroke-width="2"/>
    <path d="M92 110l-16 40M108 110l-26 62" stroke="#fff" stroke-opacity=".08" stroke-width="5" stroke-linecap="round"/>
    <rect x="226" y="150" width="4" height="40" rx="2" fill="#4c4d53"/>
    <rect x="108" y="258" width="84" height="18" rx="4" fill="#0f1012" stroke="#38393e"/>
    <rect x="112" y="262" width="34" height="10" rx="2" fill="${o.active ? '#00ae42' : '#2a2b2f'}" opacity=".9"/>
    <rect x="66" y="284" width="20" height="6" rx="2" fill="#2a2b2f"/><rect x="214" y="284" width="20" height="6" rx="2" fill="#2a2b2f"/>
  </svg>${headLayer('0 0 300 300', o.printing, `<g transform="translate(0 ${headY - 122})">
      <rect x="132" y="104" width="36" height="24" rx="5" fill="#e8e9ec"/>
      <rect x="137" y="109" width="26" height="4" rx="2" fill="#b9bcc2"/>
      <rect x="146" y="117" width="8" height="5" rx="1" fill="#00ae42"/>
      <path d="M145 128h10l-3 6h-4z" fill="#c8a24a"/></g>`)}`;
}

/* Bed slinger (Bambu A1, Ender, Prusa, Kobra 2/3): open frame, the gantry rises with the print, spool on top. */
function bedslingerSvg(id, o) {
  const pTop = 110 + 92 * (1 - o.progress / 100);
  const gantryY = o.thumb ? Math.min(186, Math.max(74, pTop - 18)) : 92;
  const spool = o.spools.find((s) => s.active) || o.spools[0];
  const spoolColor = (spool && spool.color) || (o.tint || '#8d95a0');
  return `<svg viewBox="0 0 300 260" class="printer" aria-hidden="true">
    <ellipse cx="150" cy="250" rx="112" ry="6" fill="#000" opacity=".16"/>
    <rect x="52" y="222" width="196" height="22" rx="6" fill="#2a2b2f"/>
    <rect x="60" y="226" width="54" height="14" rx="3" fill="#0f1012"/><rect x="63" y="229" width="22" height="8" rx="1.5" fill="${o.active ? '#29b6f6' : '#2a2b2f'}"/>
    <rect x="66" y="34" width="10" height="190" rx="3" fill="#3d3f45"/><rect x="224" y="34" width="10" height="190" rx="3" fill="#3d3f45"/>
    <rect x="62" y="28" width="176" height="10" rx="4" fill="#4a4c53"/>
    <g>
      <circle cx="150" cy="16" r="14" fill="${spoolColor}" opacity=".95"/><circle cx="150" cy="16" r="5" fill="#2a2b2f"/>
      <path d="M150 30 C 150 44, 184 40, 184 ${gantryY - 4}" stroke="${spoolColor}" stroke-width="2" fill="none" opacity=".7"/>
    </g>
    <rect x="84" y="204" width="132" height="8" rx="2" fill="#c9ccd2"/><rect x="92" y="212" width="116" height="10" rx="2" fill="#55575e"/>
    <g>${printPart(id, { x: 104, y: 110, w: 92, h: 94, progress: o.progress, thumb: o.thumb, tint: o.tint })}</g>
    <rect x="60" y="${gantryY}" width="180" height="7" rx="3" fill="#6b6e76"/>
    <rect x="58" y="${gantryY - 4}" width="22" height="15" rx="3" fill="#2f3036"/><rect x="220" y="${gantryY - 4}" width="22" height="15" rx="3" fill="#2f3036"/>
  </svg>${headLayer('0 0 300 260', o.printing, `<g transform="translate(0 ${gantryY - 92})">
      <rect x="134" y="80" width="32" height="26" rx="5" fill="#e6e7ea"/>
      <rect x="139" y="85" width="22" height="4" rx="2" fill="#b4b7bd"/>
      <path d="M145 106h10l-3 6h-4z" fill="#c8a24a"/></g>`)}`;
}

/* Voron / Klipper: aluminium extrusion frame, smoked panels, red and black toolhead. */
function voronSvg(id, o) {
  const pTop = 98 + 96 * (1 - o.progress / 100);
  const headY = o.thumb ? Math.min(178, Math.max(78, pTop - 20)) : 84;
  const rail = '#b7bbc2';
  return `<svg viewBox="0 0 300 260" class="printer" aria-hidden="true">
    <defs>
      <linearGradient id="${id}-panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3f48" stop-opacity=".55"/><stop offset="1" stop-color="#1c1f24" stop-opacity=".7"/></linearGradient>
      <radialGradient id="${id}-led" cx=".5" cy="0" r=".9"><stop offset="0" stop-color="#e8f4ff" stop-opacity="${o.lightOn !== false ? '.18' : '0'}"/><stop offset="1" stop-color="#e8f4ff" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse cx="150" cy="250" rx="106" ry="6" fill="#000" opacity=".16"/>
    <rect x="58" y="210" width="184" height="32" rx="4" fill="#1d1f23"/>
    <rect x="70" y="218" width="40" height="16" rx="3" fill="#0e0f11" stroke="#c62828" stroke-width="1.5"/>
    <rect x="66" y="40" width="168" height="170" fill="url(#${id}-panel)"/>
    <rect x="66" y="40" width="168" height="170" fill="url(#${id}-led)"/>
    <rect x="80" y="196" width="140" height="8" rx="2" fill="#2f3238"/><rect x="84" y="192" width="132" height="5" rx="1.5" fill="#d0d3d8"/>
    <g>${printPart(id, { x: 104, y: 98, w: 92, h: 94, progress: o.progress, thumb: o.thumb, tint: o.tint })}</g>
    <rect x="70" y="${76 + headY - 84}" width="160" height="5" rx="2" fill="#7e838b"/>
    <rect x="58" y="32" width="184" height="10" rx="2" fill="${rail}"/><rect x="58" y="204" width="184" height="9" rx="2" fill="${rail}"/>
    <rect x="58" y="32" width="10" height="210" rx="2" fill="${rail}"/><rect x="232" y="32" width="10" height="210" rx="2" fill="${rail}"/>
    <rect x="58" y="32" width="10" height="10" fill="#c62828"/><rect x="232" y="32" width="10" height="10" fill="#c62828"/>
    <path d="M90 50l-14 34M104 50l-22 52" stroke="#fff" stroke-opacity=".06" stroke-width="5" stroke-linecap="round"/>
  </svg>${headLayer('0 0 300 260', o.printing, `<g transform="translate(0 ${headY - 84})">
      <rect x="133" y="64" width="34" height="28" rx="6" fill="#1c1d21"/>
      <rect x="138" y="68" width="24" height="10" rx="3" fill="#c62828"/>
      <circle cx="150" cy="84" r="4" fill="${o.lightOn !== false ? '#e3f2fd' : '#444'}"/>
      <path d="M145 92h10l-3 6h-4z" fill="#c8a24a"/></g>`)}`;
}

function drawingFor(shape, id, o) {
  switch (shape) {
    case 'bambu': return bambuSvg(id, o);
    case 'bedslinger': return bedslingerSvg(id, o);
    case 'voron': return voronSvg(id, o);
    case 'kobra': return kobraSvg(id, o);
    default: return k1Svg(id, o);   // 'k1' and 'enclosed'
  }
}

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
const CSS = `<style>
  ha-card { --p3d-accent: var(--accent-color, var(--primary-color)); padding: 16px; overflow: hidden; position: relative; container-type: inline-size; }
  ha-card::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 4px; background: var(--p3d-status); opacity: .85; }
  .msg { padding: 8px 0; color: var(--secondary-text-color); }
  .head { display: flex; align-items: center; gap: 8px 12px; flex-wrap: wrap; }
  .logo { --mdc-icon-size: 28px; color: var(--p3d-status); background: color-mix(in srgb, var(--p3d-status) 14%, transparent);
    border-radius: 12px; padding: 8px; flex: none; }
  .title { flex: 1 1 120px; min-width: 0; }
  .name { font-size: 1.1rem; font-weight: 600; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { color: var(--secondary-text-color); font-size: .85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: .8rem; font-weight: 500;
    background: color-mix(in srgb, var(--p3d-status) 16%, transparent); color: var(--primary-text-color); cursor: pointer; white-space: nowrap; }
  .tools { display: flex; align-items: center; gap: 2px; margin-left: auto; }
  .tools .chip { margin-right: 2px; }
  .icon.upd { color: var(--primary-color); }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--p3d-status); }
  button { font: inherit; cursor: pointer; }
  .icon { border: none; background: none; color: var(--secondary-text-color); border-radius: 50%; padding: 6px; display: flex; }
  .icon.on { color: var(--state-light-on-color, #f5b301); }
  .icon:disabled { opacity: .4; cursor: default; }

  .stage { position: relative; margin: 8px 0 4px; }
  .draw { position: relative; max-width: 300px; margin: 0 auto; cursor: pointer; }
  .printer { display: block; width: 100%; height: auto; }
  .cam { position: relative; border-radius: 14px; overflow: hidden; background: #000; aspect-ratio: 16 / 9; cursor: pointer; }
  .cam img { display: block; width: 100%; height: 100%; object-fit: contain; }
  .cam .pct.float { right: 10px; bottom: 10px; }
  .headlayer { position: absolute; left: 0; top: 0; width: 100%; height: auto; pointer-events: none; }
  .headlayer.moving { animation: cpc-head 2.8s ease-in-out infinite alternate; will-change: transform; }
  :host([paused]) .headlayer.moving { animation-play-state: paused; }
  @keyframes cpc-head { from { transform: translateX(-11%); } to { transform: translateX(11%); } }
  @media (prefers-reduced-motion: reduce) { .headlayer.moving { animation: none; } }
  .pct.float { right: 4%; bottom: 12%; }
  .under .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 4px 0; text-align: center; }
  .views { position: absolute; left: 0; bottom: 6px; display: flex; gap: 4px; padding: 4px; border-radius: 999px;
    background: color-mix(in srgb, var(--primary-text-color) 70%, transparent); }
  .viewrow { display: flex; }
  .viewrow .views { position: static; }
  .views button { border: none; background: none; color: var(--card-background-color, #fff); border-radius: 50%; width: 34px; height: 34px;
    display: flex; align-items: center; justify-content: center; }
  .views button ha-icon { --mdc-icon-size: 20px; }
  .views button.sel { background: var(--card-background-color, #fff); color: var(--primary-text-color); }

  .body { display: flex; align-items: center; gap: 20px; margin: 16px 0 8px; }
  .body.idle { justify-content: center; }
  .ring { position: relative; width: 132px; height: 132px; flex: none; cursor: pointer; }
  .ring svg { position: absolute; inset: 0; transform: rotate(-90deg); }
  .ring circle { fill: none; stroke-width: 8; }
  .track { stroke: var(--divider-color, rgba(127,127,127,.25)); }
  .bar { stroke: var(--p3d-status); stroke-linecap: round; transition: stroke-dashoffset .8s ease; }
  .ring img { position: absolute; inset: 18px; width: 96px; height: 96px; object-fit: contain; border-radius: 50%;
    background: color-mix(in srgb, var(--p3d-status) 8%, transparent); }
  .ring .ph { position: absolute; inset: 0; margin: auto; width: 48px; height: 48px; --mdc-icon-size: 48px; color: var(--secondary-text-color); opacity: .5; }
  .pct { position: absolute; right: -6px; bottom: -2px; background: var(--card-background-color, #fff); border: 2px solid var(--p3d-status);
    border-radius: 999px; padding: 1px 8px; font-weight: 700; font-size: .95rem; color: var(--primary-text-color); }
  .pct small { font-size: .7rem; font-weight: 500; }
  .stats { display: grid; gap: 12px; flex: 1; }
  .stat { display: flex; flex-direction: column; }
  .label { color: var(--secondary-text-color); font-size: .75rem; text-transform: uppercase; letter-spacing: .04em; }
  .big { font-size: 1.5rem; font-weight: 600; line-height: 1.2; }

  .slicer { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .slicer span { display: inline-flex; flex-direction: column; padding: 6px 10px; border-radius: 10px; font-size: .72rem;
    color: var(--secondary-text-color); border: 1px solid var(--divider-color, rgba(127,127,127,.25)); line-height: 1.25; }
  .slicer b { color: var(--primary-text-color); font-size: .9rem; font-weight: 600; }

  .temps { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 8px; margin-top: 10px; }
  .temp { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 12px; cursor: pointer;
    background: var(--secondary-background-color, rgba(127,127,127,.08)); }
  .temp ha-icon { color: var(--secondary-text-color); --mdc-icon-size: 20px; }
  .temp.hot ha-icon { color: var(--state-climate-heat-color, #ff8100); }
  .temp div { display: flex; flex-direction: column; }
  .temp .val { font-weight: 600; white-space: nowrap; }
  .temp .val small { font-weight: 400; color: var(--secondary-text-color); }
  .err { display: flex; align-items: center; gap: 6px; margin-top: 10px; color: var(--error-color, #ef4444); font-size: .85rem; }
  .actions { display: flex; gap: 8px; margin-top: 12px; }
  .act { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 12px; border-radius: 12px;
    border: 1px solid var(--divider-color, rgba(127,127,127,.3)); background: none; color: var(--primary-text-color); }
  .act ha-icon { --mdc-icon-size: 18px; }
  .act.danger { color: var(--error-color, #ef4444); border-color: color-mix(in srgb, var(--error-color, #ef4444) 40%, transparent); }
  .act:disabled { opacity: .5; cursor: default; }
  @container (max-width: 300px) { .big { font-size: 1.1rem; white-space: nowrap; } .label { font-size: .68rem; } }
  @container (max-width: 400px) { .temp { padding: 8px; gap: 6px; } .temp ha-icon { display: none !important; } .temp .val small { font-size: .75rem; } }
  @media (max-width: 420px) { .body { gap: 14px; } .ring { width: 112px; height: 112px; } .ring img { inset: 14px; width: 84px; height: 84px; } .big { font-size: 1.25rem; } }
</style>`;


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
    name: 'Universal 3D Printer Card',
    description: 'Drawn printer with the print growing inside it, live camera, slicer info, spools and controls. Bambu Lab, Klipper, Creality, Anycubic and OctoPrint.',
    preview: true,
    documentationURL: 'https://github.com/Rein033/universal-3d-cards',
  }, {
    type: 'printer-3d-group-card',
    name: 'Universal 3D Printer Group',
    description: 'All your 3D printers in one compact list: status, progress and finish time.',
    preview: true,
    documentationURL: 'https://github.com/Rein033/universal-3d-cards',
  });
  console.info('%c UNIVERSAL 3D CARDS %c 0.1.0 ', 'background:#ff4081;color:#fff;font-weight:700', 'background:#333;color:#fff');
}
