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

