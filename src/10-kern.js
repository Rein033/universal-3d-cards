/* 3D Printer Card for Home Assistant: one card for Bambu Lab, Klipper (Moonraker), Creality (local and cloud),
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
 * The printer drawings are original artwork. https://github.com/Rein033/lovelace-3d-printer-card */

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
