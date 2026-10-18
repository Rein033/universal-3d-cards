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


