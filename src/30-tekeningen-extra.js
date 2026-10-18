
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
