// patch6.js - APEX // DX: merges the blue Gemini UI (garage, HUD, result card) into the game,
// and fixes the crew characters (loads only the selected one, shows a figure + toast while loading).
// Loads AFTER patch5.js (patch5.js loads it for you).
(function () {
  const $ = (id) => document.getElementById(id);

  /* ======================= CSS ======================= */
  const CSS = `
:root{--bg-glass:rgba(7,14,26,.88);--bg-card:rgba(10,20,38,.92);--cyan:#38bdf8;--sky:#0ea5e9;--blue:#2563eb;--gold:#facc15;--danger:#ef4444;--text-muted:#94a3b8;--border-thin:1px solid rgba(56,189,248,.38);--border-bright:1px solid #38bdf8}
.hidden{display:none!important}
.screen-layer{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;display:flex;font-family:'Rajdhani',sans-serif;color:#f8fafc}
.screen-layer .interactive,.interactive{pointer-events:auto}
.screen-layer h1,.screen-layer h2{font-family:'Orbitron',sans-serif;letter-spacing:.06em}
.screen-layer button{font-family:'Rajdhani',sans-serif;font-weight:700;cursor:pointer;border:none;outline:none;color:#f8fafc;background:transparent;transition:background .15s,border-color .15s,transform .1s}
.screen-layer button:active{transform:scale(.97)}
.glass-panel{background:var(--bg-glass);border:var(--border-thin);position:relative}
.corner-brackets::before,.corner-brackets::after{content:'';position:absolute;width:10px;height:10px;border-color:var(--cyan);border-style:solid;pointer-events:none}
.corner-brackets::before{top:-1px;left:-1px;border-width:2px 0 0 2px}
.corner-brackets::after{bottom:-1px;right:-1px;border-width:0 2px 2px 0}
#garage-ui{z-index:20;flex-direction:column;justify-content:space-between;padding:12px 16px 0}
#gameplay-hud{z-index:12;flex-direction:column;justify-content:space-between;padding:14px}
#result-modal{z-index:30;align-items:center;justify-content:center;background:rgba(3,8,18,.72);padding:16px}
.top-bar{display:flex;align-items:center;justify-content:space-between;background:var(--bg-glass);border:var(--border-thin);padding:8px 18px;clip-path:polygon(0 0,100% 0,calc(100% - 14px) 100%,14px 100%)}
.brand-logo{display:flex;flex-direction:column;line-height:1}
.brand-logo span:first-child{font-family:'Orbitron',sans-serif;font-weight:900;font-size:1.35rem;color:#fff;text-shadow:0 0 8px rgba(56,189,248,.7)}
.brand-logo span:last-child{font-size:.65rem;letter-spacing:.25em;color:var(--cyan);margin-top:2px}
.top-tabs{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
.top-tab-btn{font-family:'Orbitron',sans-serif!important;font-size:.78rem;padding:8px 14px;color:var(--text-muted)!important;border-bottom:2px solid transparent!important;letter-spacing:.08em}
.top-tab-btn:hover{color:#fff!important}
.top-tab-btn.active{color:var(--cyan)!important;border-bottom-color:var(--cyan)!important;background:rgba(56,189,248,.1)!important}
.cash-badge{display:flex;align-items:center;background:rgba(14,165,233,.14);border:var(--border-bright);padding:6px 14px;font-family:'Orbitron',sans-serif;font-size:.95rem;font-weight:700;color:var(--cyan)}
.garage-middle{flex:1;display:flex;justify-content:space-between;align-items:flex-start;padding:12px 0;gap:12px;min-height:0;position:relative}
.left-column{width:265px;display:flex;flex-direction:column;gap:10px;max-height:100%;overflow-y:auto;scrollbar-width:none}
.panel-header{font-family:'Orbitron',sans-serif;font-size:.78rem;font-weight:700;color:var(--cyan);letter-spacing:.1em;padding-bottom:6px;margin-bottom:8px;border-bottom:1px solid rgba(56,189,248,.25);display:flex;justify-content:space-between;align-items:center}
.profile-card,.crew-panel,.mode-panel{padding:10px 12px}
.profile-meta{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.avatar-hex{width:44px;height:44px;background:linear-gradient(135deg,var(--sky),var(--blue));display:flex;align-items:center;justify-content:center;font-family:'Orbitron',sans-serif;font-weight:900;clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)}
.profile-info div:first-child{font-weight:700;font-size:1rem;letter-spacing:.04em}
.profile-info div:last-child{font-size:.82rem;color:var(--cyan);font-weight:600}
.dual-btn-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cyber-btn{background:rgba(14,165,233,.14)!important;border:var(--border-thin)!important;padding:7px 10px;font-family:'Orbitron',sans-serif!important;font-size:.72rem;letter-spacing:.06em;text-align:center}
.cyber-btn:hover{background:rgba(56,189,248,.28)!important}
#crew-selector{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.crew-btn{padding:7px 4px;background:rgba(15,23,42,.85)!important;border:1px solid rgba(148,163,184,.3)!important;font-size:.75rem;font-family:'Orbitron',sans-serif!important;color:var(--text-muted)!important;text-transform:uppercase}
.crew-btn.active,.crew-btn:hover{border-color:var(--cyan)!important;color:var(--cyan)!important;background:rgba(56,189,248,.16)!important}
.mode-panel{display:flex;flex-direction:column;gap:7px}
.mode-btn{width:100%;padding:9px 12px;text-align:left;background:rgba(15,23,42,.88)!important;border:1px solid rgba(56,189,248,.3)!important;display:flex;justify-content:space-between;align-items:center;font-family:'Orbitron',sans-serif!important;font-size:.74rem}
.mode-btn span.tag{font-family:'Rajdhani',sans-serif;font-size:.72rem;padding:1px 6px;background:rgba(56,189,248,.2);color:var(--cyan)}
.mode-btn.active{border-color:var(--cyan)!important;background:linear-gradient(90deg,rgba(14,165,233,.32),rgba(37,99,235,.16))!important;color:#fff}
.radial-wrapper{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);z-index:20;display:flex;align-items:center;justify-content:center}
.radial-toggle{width:46px;height:46px;border-radius:50%;background:var(--bg-glass)!important;border:2px solid var(--cyan)!important;color:var(--cyan)!important;font-family:'Orbitron',sans-serif!important;font-size:.7rem;font-weight:900;z-index:3}
.radial-ring{position:absolute;width:196px;height:196px;border-radius:50%;border:1px dashed rgba(56,189,248,.45);background:radial-gradient(circle,rgba(7,14,26,.3) 25%,rgba(7,14,26,.85) 100%);pointer-events:none;opacity:0;transform:scale(.75);transition:opacity .18s,transform .18s}
.radial-wrapper.open .radial-ring{opacity:1;transform:scale(1);pointer-events:auto}
.radial-item{position:absolute;background:var(--bg-card)!important;border:var(--border-bright)!important;padding:5px 9px;font-size:.72rem;white-space:nowrap;color:#fff!important}
.radial-item:hover{background:var(--sky)!important;color:#030712!important}
.radial-item[data-pos=top]{top:-10px;left:50%;transform:translateX(-50%)}
.radial-item[data-pos=right]{right:-22px;top:50%;transform:translateY(-50%)}
.radial-item[data-pos=bottom]{bottom:-10px;left:50%;transform:translateX(-50%)}
.radial-item[data-pos=left]{left:-22px;top:50%;transform:translateY(-50%)}
.right-column{width:280px;padding:12px;max-height:100%;overflow-y:auto;scrollbar-width:none}
.control-group{margin-bottom:10px}
.control-label{display:block;font-size:.75rem;font-weight:700;color:var(--text-muted);letter-spacing:.08em;margin-bottom:5px;text-transform:uppercase}
.swatch-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
.swatch{height:26px;border:1px solid rgba(255,255,255,.35)!important}
.swatch.active{border:2px solid #fff!important;outline:1px solid var(--cyan)}
.cyber-select{width:100%;background:rgba(15,23,42,.95);border:var(--border-thin);color:#fff;padding:7px 10px;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:.88rem;outline:none}
.btn-save-custom{width:100%;margin-top:6px;padding:9px;background:linear-gradient(90deg,var(--sky),var(--blue))!important;border:1px solid var(--cyan)!important;font-family:'Orbitron',sans-serif!important;font-size:.78rem;letter-spacing:.1em}
.module-note{font-size:.9rem;color:var(--text-muted);line-height:1.4}
.garage-bottom-dock{display:flex;flex-direction:column;gap:8px;margin:0 -16px}
.carousel-stats-row{display:flex;align-items:stretch;gap:12px;padding:0 16px;height:118px}
.stats-panel{width:245px;flex-shrink:0;padding:10px 12px;display:flex;flex-direction:column;justify-content:space-between}
#garage-car-name{font-family:'Orbitron',sans-serif;font-size:.82rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.stat-line{display:grid;grid-template-columns:72px 1fr 52px;align-items:center;gap:6px;font-size:.74rem;font-weight:700}
.stat-line span:first-child{color:var(--text-muted)}
.stat-line span:last-child{text-align:right;color:var(--cyan);font-family:'Orbitron',sans-serif;font-size:.68rem}
.stat-track{height:5px;background:rgba(255,255,255,.12);overflow:hidden}
.stat-fill{height:100%;background:linear-gradient(90deg,var(--blue),var(--cyan));transition:width .25s}
.carousel-wrap{flex:1;display:flex;align-items:center;gap:8px;min-width:0}
.scroll-arrow{width:30px;height:100%;background:var(--bg-glass)!important;border:var(--border-thin)!important;color:var(--cyan)!important;font-family:'Orbitron',sans-serif!important;flex-shrink:0}
#car-grid{flex:1;display:flex;gap:10px;overflow-x:auto;height:100%;scrollbar-width:none}
#car-grid::-webkit-scrollbar{display:none}
.car-tile{min-width:168px;height:100%;background:var(--bg-glass)!important;border:var(--border-thin)!important;padding:8px 10px;display:flex;flex-direction:column;justify-content:space-between;text-align:left;flex-shrink:0}
.car-tile:hover{border-color:var(--cyan)!important;background:rgba(14,165,233,.18)!important}
.car-tile.selected{border:2px solid var(--cyan)!important;background:linear-gradient(180deg,rgba(14,165,233,.26),rgba(7,14,26,.94))!important}
.car-tile-top{display:flex;justify-content:space-between;font-size:.7rem;color:var(--cyan);font-family:'Orbitron',sans-serif}
.car-silhouette{width:100%;height:36px;display:flex;align-items:center;justify-content:center;color:rgba(56,189,248,.75)}
.car-tile-name{font-family:'Orbitron',sans-serif;font-size:.76rem;font-weight:700;color:#fff}
.car-tile-sub{font-size:.74rem;color:var(--text-muted);display:flex;justify-content:space-between}
.bottom-nav-bar{display:flex;align-items:stretch;justify-content:space-between;background:rgba(5,10,20,.95);border-top:var(--border-thin);height:54px;padding-left:16px}
.bottom-nav-links{display:flex;align-items:center;gap:6px;overflow-x:auto;scrollbar-width:none}
.bottom-nav-item{display:flex;align-items:center;gap:7px;padding:0 16px;height:100%;font-family:'Orbitron',sans-serif!important;font-size:.78rem;color:#f8fafc!important;border-right:1px solid rgba(56,189,248,.15)!important;white-space:nowrap}
.bottom-nav-item:hover,.bottom-nav-item.active{color:var(--cyan)!important;background:rgba(56,189,248,.12)!important}
.nav-dot{width:7px;height:7px;background:var(--cyan);display:inline-block}
#btn-launch-game{min-width:240px;padding:0 28px 0 38px;background:linear-gradient(135deg,var(--cyan) 0%,var(--sky) 55%,var(--blue) 100%)!important;color:#030914!important;font-family:'Orbitron',sans-serif!important;font-weight:900;font-size:1.05rem;letter-spacing:.08em;clip-path:polygon(22px 0,100% 0,100% 100%,0 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05;border:none!important;border-radius:0!important;box-shadow:none!important}
#btn-launch-game:hover{background:#7dd3fc!important}
#btn-launch-game .sub-cta{font-size:.62rem;font-weight:700;letter-spacing:.18em;opacity:.85}
.hud-top-row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.minimap-box{padding:6px;display:flex;flex-direction:column;align-items:center;gap:4px}
#minimap-canvas{width:128px;height:128px;background:rgba(4,10,20,.9);border:1px solid rgba(56,189,248,.45);display:block}
#minimap-target-label{font-family:'Orbitron',sans-serif;font-size:.65rem;color:var(--cyan);letter-spacing:.08em;max-width:128px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hud-center-top{display:flex;flex-direction:column;align-items:center;gap:6px;max-width:460px;width:100%}
.objective-bar{width:100%;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px}
.obj-text-group{display:flex;flex-direction:column;gap:2px;min-width:0}
#hud-mode-badge{font-family:'Orbitron',sans-serif;font-size:.65rem;color:var(--cyan);letter-spacing:.12em}
#hud-objective{font-size:.92rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#btn-back-garage{padding:6px 12px;background:rgba(14,165,233,.18)!important;border:var(--border-bright)!important;font-family:'Orbitron',sans-serif!important;font-size:.7rem;color:var(--cyan)!important;flex-shrink:0;border-radius:0!important}
#btn-back-garage:hover{background:var(--cyan)!important;color:#030914!important}
#duel-bar-wrap{width:100%;padding:6px 12px;display:flex;flex-direction:column;gap:4px}
.duel-meta{display:flex;justify-content:space-between;font-family:'Orbitron',sans-serif;font-size:.68rem;color:var(--cyan)}
.duel-track{width:100%;height:6px;background:rgba(255,255,255,.15)}
#duel-player-fill{width:0;height:100%;background:linear-gradient(90deg,var(--blue),var(--cyan))}
.wanted-box{padding:8px 12px;display:flex;flex-direction:column;align-items:flex-end;gap:6px;min-width:155px}
#hud-stars{display:flex;gap:4px;font-size:1.15rem;line-height:1;color:rgba(148,163,184,.35)}
#bust-timer-box{width:100%;padding:4px 8px;background:rgba(239,68,68,.22);border:1px solid var(--danger);font-family:'Orbitron',sans-serif;font-size:.74rem;color:#fca5a5;text-align:center;border-radius:0}
#bust-seconds{color:#fff;font-weight:900}
.hud-bottom-row{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}
.hud-controls-left{display:flex;flex-direction:column;gap:8px}
#ctrl-headlights{align-self:flex-start;padding:7px 12px;background:var(--bg-glass)!important;border:var(--border-thin)!important;font-family:'Orbitron',sans-serif!important;font-size:.72rem;color:var(--cyan)!important;border-radius:0!important}
#ctrl-headlights.on{background:var(--cyan)!important;color:#030914!important}
.steer-group{display:flex;gap:10px}
#ctrl-left,#ctrl-right{width:62px;height:58px;background:var(--bg-glass)!important;border:var(--border-bright)!important;font-size:1.2rem;color:#fff!important;display:flex;align-items:center;justify-content:center;border-radius:0!important}
#ctrl-left:active,#ctrl-right:active{background:rgba(56,189,248,.35)!important}
#interact-prompt{margin-bottom:10px}
#btn-interact{padding:11px 22px;background:rgba(7,14,26,.92)!important;border:2px solid var(--cyan)!important;font-family:'Orbitron',sans-serif!important;font-size:.85rem;font-weight:900;color:var(--cyan)!important;letter-spacing:.1em;animation:apexPulse 1.4s infinite ease-in-out;border-radius:0!important}
@keyframes apexPulse{0%,100%{transform:scale(1);border-color:#38bdf8}50%{transform:scale(1.04);border-color:#fff}}
.hud-right-cluster{display:flex;align-items:flex-end;gap:12px}
.pedal-stack{display:flex;flex-direction:column;gap:8px}
.pedal-row{display:flex;gap:8px}
#ctrl-nitro{width:100%;height:36px;background:rgba(37,99,235,.28)!important;border:1px solid var(--cyan)!important;font-family:'Orbitron',sans-serif!important;font-size:.74rem;color:var(--cyan)!important;border-radius:0!important}
#ctrl-brake{width:58px;height:58px;background:rgba(239,68,68,.2)!important;border:1px solid var(--danger)!important;font-family:'Orbitron',sans-serif!important;font-size:.74rem;color:#fca5a5!important;border-radius:0!important}
#ctrl-gas{width:68px;height:58px;background:rgba(14,165,233,.25)!important;border:1px solid var(--cyan)!important;font-family:'Orbitron',sans-serif!important;font-size:.8rem;color:#fff!important;border-radius:0!important}
#ctrl-horn{width:62px;height:58px;background:var(--bg-glass)!important;border:var(--border-bright)!important;font-family:'Orbitron',sans-serif!important;font-size:.7rem;color:#fff!important;border-radius:0!important}
#ctrl-horn:active{background:rgba(56,189,248,.35)!important}
#ctrl-gas,#ctrl-brake,#ctrl-nitro,#ctrl-left,#ctrl-right,#ctrl-horn{touch-action:none}
.speedo-panel{width:195px;padding:10px 14px;display:flex;flex-direction:column;gap:7px}
.speedo-main{display:flex;justify-content:space-between;align-items:baseline}
.speed-readout{display:flex;align-items:baseline;gap:4px}
#hud-speed{font-family:'Orbitron',sans-serif;font-size:2.1rem;font-weight:900;line-height:1;color:#fff}
.speed-unit{font-size:.72rem;color:var(--cyan);font-weight:700}
#hud-gear{width:34px;height:34px;border:1px solid var(--cyan);background:rgba(56,189,248,.16);display:flex;align-items:center;justify-content:center;font-family:'Orbitron',sans-serif;font-size:1.05rem;font-weight:900;color:var(--cyan)}
.gauge-group{display:flex;flex-direction:column;gap:3px}
.gauge-label{display:flex;justify-content:space-between;font-size:.66rem;font-weight:700;color:var(--text-muted);letter-spacing:.08em}
.gauge-track{width:100%;height:6px;background:rgba(255,255,255,.12);overflow:hidden}
#hud-rpm-fill{width:10%;height:100%;background:linear-gradient(90deg,var(--cyan),#facc15,var(--danger))}
#hud-nitro-fill{width:100%;height:100%;background:linear-gradient(90deg,var(--blue),var(--cyan))}
.result-card{width:100%;max-width:400px;padding:24px 20px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px}
#res-icon{width:56px;height:56px;border:2px solid var(--cyan);background:rgba(56,189,248,.15);display:flex;align-items:center;justify-content:center;font-size:1.5rem}
#res-title{font-family:'Orbitron',sans-serif;font-size:1.3rem;font-weight:900}
#res-desc{font-size:.95rem;color:var(--text-muted)}
#res-reward{padding:8px 18px;background:rgba(56,189,248,.14);border:var(--border-bright);font-family:'Orbitron',sans-serif;font-size:1.05rem;font-weight:700;color:var(--cyan)}
.result-actions{width:100%;display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px}
#btn-res-retry{padding:10px;background:linear-gradient(90deg,var(--sky),var(--blue))!important;border:1px solid var(--cyan)!important;font-family:'Orbitron',sans-serif!important;font-size:.78rem;border-radius:0!important}
#btn-res-garage{padding:10px;background:rgba(15,23,42,.9)!important;border:var(--border-thin)!important;font-family:'Orbitron',sans-serif!important;font-size:.78rem;color:var(--cyan)!important;border-radius:0!important}
@media (max-width:900px){#garage-ui{padding:8px 10px 0}.top-bar{padding:6px 10px;clip-path:none}.brand-logo span:first-child{font-size:1rem}.top-tab-btn{padding:5px 8px;font-size:.66rem}.left-column,.right-column{width:210px}.carousel-stats-row{height:102px;padding:0 10px}.stats-panel{width:190px;padding:7px 9px}.car-tile{min-width:142px}#btn-launch-game{min-width:165px;font-size:.88rem;padding:0 16px 0 26px}.bottom-nav-item{padding:0 10px;font-size:.7rem}}
@media (max-width:640px){.stats-panel{display:none}#minimap-canvas{width:96px;height:96px}.speedo-panel{width:150px;padding:8px 10px}#hud-speed{font-size:1.55rem}#ctrl-left,#ctrl-right{width:50px;height:48px}.cash-badge{padding:4px 8px;font-size:.78rem}.brand-logo span:last-child{display:none}}
@media (max-height:520px){#garage-ui{padding-top:6px}.top-bar{padding:4px 10px}.brand-logo span:last-child{display:none}.profile-card{display:none}.garage-middle{padding:6px 0}.left-column{width:190px;gap:6px}.carousel-stats-row{height:74px}.car-silhouette{display:none}.car-tile{min-width:130px;padding:5px 8px}.bottom-nav-bar{height:42px}.stats-panel{padding:5px 8px}.minimap-box{display:none}}
`;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@500;600;700&display=swap';
  document.head.appendChild(fonts);

  /* ======================= KEEP THE OLD BUTTONS (they carry the game's listeners) ======================= */
  const KEEP = ['btn-launch-game', 'btn-back-garage', 'btn-res-retry', 'btn-res-garage', 'btn-interact', 'ctrl-left', 'ctrl-right', 'ctrl-gas', 'ctrl-brake', 'ctrl-nitro', 'ctrl-headlights'];
  const kept = {};
  KEEP.forEach((id) => { kept[id] = $(id); });
  const settingsBtn = Array.prototype.find.call(document.querySelectorAll('button'), (b) => b.textContent.indexOf('SETTINGS') >= 0);
  const doorsBtn = $('btn-doors');
  [settingsBtn, doorsBtn].forEach((b) => { // old floating buttons: hidden, but the new UI still triggers them
    if (b) { b.style.setProperty('opacity', '0', 'important'); b.style.setProperty('pointer-events', 'none', 'important'); }
  });
  ['garage-ui', 'gameplay-hud', 'result-modal'].forEach((id) => { const e = $(id); if (e) e.remove(); });

  /* ======================= NEW MARKUP ======================= */
  const SIL = '<svg width="92" height="26" viewBox="0 0 100 28" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 20 L14 12 L36 8 L64 8 L84 13 L95 16 L95 21 L82 21 A7 7 0 0 1 68 21 L30 21 A7 7 0 0 1 16 21 L6 21 Z"/></svg>';
  const K = (id) => '<i data-keep="' + id + '"></i>';
  const html = `
<section id="garage-ui" class="screen-layer">
  <header class="top-bar interactive">
    <div class="brand-logo"><span>APEX // DX</span><span>STREET SYNDICATE</span></div>
    <nav class="top-tabs">
      <button class="top-tab-btn active" data-tab="GARAGE">GARAGE</button>
      <button class="top-tab-btn" data-tab="CUSTOMIZE">CUSTOMIZE</button>
      <button class="top-tab-btn" data-tab="SHOP">SHOP</button>
      <button class="top-tab-btn" data-tab="PROFILE">PROFILE</button>
      <button class="top-tab-btn" data-tab="SETTINGS">SETTINGS</button>
    </nav>
    <div class="cash-badge"><span id="garage-cash">$25,000</span></div>
  </header>
  <div class="garage-middle">
    <aside class="left-column interactive">
      <div class="glass-panel corner-brackets profile-card">
        <div class="panel-header"><span>CHARACTER PROFILE</span></div>
        <div class="profile-meta"><div class="avatar-hex">DX</div><div class="profile-info"><div>DRIVER: DAVE X</div><div>REP: APEX ELITE</div></div></div>
        <div class="dual-btn-row"><button class="cyber-btn" data-soon="OUTFIT">OUTFIT</button><button class="cyber-btn" data-soon="HELMET">HELMET</button></div>
      </div>
      <div class="glass-panel corner-brackets crew-panel">
        <div class="panel-header"><span>HEIST CREW</span></div>
        <div id="crew-selector">
          <button class="crew-btn active" data-crew="david">DAVID</button>
          <button class="crew-btn" data-crew="remy">REMY</button>
          <button class="crew-btn" data-crew="michelle">MICHELLE</button>
        </div>
      </div>
      <div class="glass-panel corner-brackets mode-panel">
        <div class="panel-header"><span>SELECT CONTRACT</span></div>
        <button id="btn-mode-heist" class="mode-btn active"><span>DOWNTOWN HEIST</span><span class="tag">CO-OP / CREW</span></button>
        <button id="btn-mode-1v1" class="mode-btn"><span>1V1 STREET RACE</span><span class="tag">PINK SLIP</span></button>
      </div>
    </aside>
    <div class="radial-wrapper interactive" id="radial-menu">
      <button class="radial-toggle" id="btn-radial-toggle">RAD</button>
      <div class="radial-ring">
        <button class="radial-item" data-pos="top" data-action="door">OPEN DOOR</button>
        <button class="radial-item" data-pos="right" data-action="lights">HEADLIGHTS</button>
        <button class="radial-item" data-pos="bottom" data-action="outfit">OUTFIT</button>
        <button class="radial-item" data-pos="left" data-action="daynight">DAY / NIGHT</button>
      </div>
    </div>
    <aside class="right-column glass-panel corner-brackets interactive hidden" id="right-column">
      <div id="panel-customize">
        <div class="panel-header"><span>CUSTOMIZE // VISUALS</span></div>
        <div class="control-group"><span class="control-label">PAINT COLOUR</span>
          <div class="swatch-grid">
            <button class="swatch active" style="background:#f8fafc" data-color="Arctic White"></button>
            <button class="swatch" style="background:#38bdf8" data-color="Apex Cyan"></button>
            <button class="swatch" style="background:#2563eb" data-color="Cobalt Blue"></button>
            <button class="swatch" style="background:#ef4444" data-color="Crimson Red"></button>
            <button class="swatch" style="background:#facc15" data-color="Solar Gold"></button>
            <button class="swatch" style="background:#111827" data-color="Obsidian Black"></button>
          </div></div>
        <div class="control-group"><label class="control-label">WHEELS</label><select class="cyber-select"><option>VOSSEN HF-2 FORGED</option><option>BBS FI-R MONOBLOCK</option><option>VOLK TE37 SAGA</option><option>HRE P101 CARBON</option></select></div>
        <div class="control-group"><label class="control-label">PAINT FINISH</label><select class="cyber-select"><option>METALLIC GLOSS</option><option>SATIN MATTE</option><option>LIQUID CHROME</option><option>EXPOSED CARBON</option></select></div>
        <button class="btn-save-custom" id="btn-save-custom">SAVE BUILD</button>
      </div>
      <div id="panel-module" style="display:none">
        <div class="panel-header"><span id="module-title">MODULE</span></div>
        <div class="module-note">Coming soon.</div>
      </div>
    </aside>
  </div>
  <footer class="garage-bottom-dock interactive">
    <div class="carousel-stats-row">
      <div class="stats-panel glass-panel corner-brackets">
        <div><span id="garage-car-name">CAR</span></div>
        <div class="stat-line"><span>TOP SPEED</span><div class="stat-track"><div class="stat-fill" id="stat-speed-bar"></div></div><span id="stat-speed-val"></span></div>
        <div class="stat-line"><span>ACCEL</span><div class="stat-track"><div class="stat-fill" id="stat-accel-bar"></div></div><span id="stat-accel-val"></span></div>
        <div class="stat-line"><span>RATING</span><div class="stat-track"><div class="stat-fill" id="stat-rating-bar"></div></div><span id="stat-rating-val"></span></div>
      </div>
      <div class="carousel-wrap">
        <button class="scroll-arrow" id="carousel-prev">&lt;</button>
        <div id="car-grid"></div>
        <button class="scroll-arrow" id="carousel-next">&gt;</button>
      </div>
    </div>
    <div class="bottom-nav-bar">
      <div class="bottom-nav-links">
        <button class="bottom-nav-item" data-bottom-nav="SHOP"><span class="nav-dot"></span>SHOP</button>
        <button class="bottom-nav-item" data-bottom-nav="TUNING"><span class="nav-dot"></span>TUNING</button>
        <button class="bottom-nav-item" data-bottom-nav="INVENTORY"><span class="nav-dot"></span>INVENTORY</button>
        <button class="bottom-nav-item" data-bottom-nav="TASKS"><span class="nav-dot"></span>TASKS</button>
      </div>
      ${K('btn-launch-game')}
    </div>
  </footer>
</section>

<section id="gameplay-hud" class="screen-layer hidden">
  <div class="hud-top-row">
    <div class="minimap-box glass-panel corner-brackets"><canvas id="minimap-canvas" width="128" height="128"></canvas><div id="minimap-target-label">24HR MART</div></div>
    <div class="hud-center-top interactive">
      <div class="objective-bar glass-panel">
        <div class="obj-text-group"><span id="hud-mode-badge">DOWNTOWN HEIST</span><span id="hud-objective">Drive to 24HR Fast Mart & tap INTERACT</span></div>
        ${K('btn-back-garage')}
      </div>
      <div id="duel-bar-wrap" class="glass-panel hidden">
        <div class="duel-meta"><span>YOU</span><span id="duel-gap-text">1V1 SPRINT</span><span>RIVAL</span></div>
        <div class="duel-track"><div id="duel-player-fill"></div></div>
      </div>
    </div>
    <div class="wanted-box glass-panel corner-brackets">
      <div id="hud-stars">★★★★★</div>
      <div id="bust-timer-box" class="hidden">BUSTED IN <span id="bust-seconds">15.0</span>s</div>
    </div>
  </div>
  <div class="hud-bottom-row">
    <div class="hud-controls-left interactive">${K('ctrl-headlights')}<div class="steer-group">${K('ctrl-left')}${K('ctrl-right')}<button id="ctrl-horn">HORN</button></div></div>
    <div id="interact-prompt" class="interactive hidden">${K('btn-interact')}</div>
    <div class="hud-right-cluster interactive">
      <div class="pedal-stack">${K('ctrl-nitro')}<div class="pedal-row">${K('ctrl-brake')}${K('ctrl-gas')}</div></div>
      <div class="speedo-panel glass-panel corner-brackets">
        <div class="speedo-main"><div class="speed-readout"><span id="hud-speed">0</span><span class="speed-unit">KM/H</span></div><div id="hud-gear">P</div></div>
        <div class="gauge-group"><div class="gauge-label"><span>RPM</span><span id="hud-rpm-val">1,000</span></div><div class="gauge-track"><div id="hud-rpm-fill"></div></div></div>
        <div class="gauge-group"><div class="gauge-label"><span>NITRO</span><span id="hud-nitro-val">100%</span></div><div class="gauge-track"><div id="hud-nitro-fill"></div></div></div>
      </div>
    </div>
  </div>
</section>

<section id="result-modal" class="screen-layer hidden interactive">
  <div class="result-card glass-panel corner-brackets">
    <div id="res-icon">★</div>
    <h2 id="res-title">HEIST COMPLETE</h2>
    <p id="res-desc"></p>
    <div id="res-reward"></div>
    <div class="result-actions">${K('btn-res-retry')}${K('btn-res-garage')}</div>
  </div>
</section>`;
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  while (wrap.firstChild) document.body.appendChild(wrap.firstChild);

  /* old buttons move into the new layout, keeping all their listeners */
  const LOOK = {
    'btn-launch-game': ['', '<span>PLAY</span><span class="sub-cta">ENTER STREET</span>'],
    'btn-back-garage': ['', 'GARAGE'],
    'btn-res-retry': ['', 'PLAY AGAIN'],
    'btn-res-garage': ['', 'GARAGE'],
    'btn-interact': ['', '[E] INTERACT // ROB 24HR MART'],
    'ctrl-left': ['', '◀'], 'ctrl-right': ['', '▶'],
    'ctrl-gas': ['', 'GAS'], 'ctrl-brake': ['', 'BRAKE'], 'ctrl-nitro': ['', 'NITRO [SHIFT]'],
    'ctrl-headlights': ['', 'LIGHTS']
  };
  document.querySelectorAll('i[data-keep]').forEach((ph) => {
    const id = ph.getAttribute('data-keep'), el = kept[id];
    if (!el) { ph.remove(); return; }
    el.className = LOOK[id][0];
    el.removeAttribute('style');
    el.innerHTML = LOOK[id][1];
    ph.replaceWith(el);
  });
  if (kept['ctrl-headlights']) kept['ctrl-headlights'].addEventListener('click', function () { this.classList.toggle('on'); });

  /* ======================= GARAGE LOGIC ======================= */
  const g = gameState;
  const grid = $('car-grid');
  const keys = Object.keys(CAR_FILES).filter((k) => k !== 'police');
  keys.sort((a, b) => (a === 'mclaren' ? -1 : b === 'mclaren' ? 1 : 0));
  const rating = (c) => Math.round((c.maxKmh / 420 * 0.5 + c.accel / 35 * 0.5) * 1000);
  const klass = (c) => (c.maxKmh >= 400 ? 'APEX X' : c.maxKmh >= 370 ? 'HYPER' : 'CLASS S');
  keys.forEach((k) => {
    const c = CAR_FILES[k];
    const b = document.createElement('button');
    b.className = 'car-tile' + (k === g.selectedCar ? ' selected' : '');
    b.dataset.car = k;
    b.innerHTML = '<div class="car-tile-top"><span>' + klass(c) + '</span><span>OWNED</span></div><div class="car-silhouette">' + SIL + '</div><div class="car-tile-name">' + c.title.replace('MERCEDES-', '') + '</div><div class="car-tile-sub"><span>RATING: ' + rating(c) + '</span><span>' + c.maxKmh + ' KM/H</span></div>';
    grid.appendChild(b);
  });
  function stats() {
    const c = CAR_FILES[g.selectedCar];
    $('garage-car-name').textContent = c.title;
    $('stat-speed-bar').style.width = Math.min(100, c.maxKmh / 420 * 100) + '%';
    $('stat-speed-val').textContent = c.maxKmh + ' KM/H';
    $('stat-accel-bar').style.width = Math.min(100, c.accel / 35 * 100) + '%';
    $('stat-accel-val').textContent = (c.accel / 3.5).toFixed(1) + '/10';
    $('stat-rating-bar').style.width = Math.min(100, rating(c) / 10) + '%';
    $('stat-rating-val').textContent = rating(c);
  }
  grid.addEventListener('click', (e) => {
    const t = e.target.closest('.car-tile');
    if (!t) return;
    g.selectedCar = t.dataset.car;
    grid.querySelectorAll('.car-tile').forEach((x) => x.classList.toggle('selected', x === t));
    stats();
    rebuildShowroom();
  });
  $('carousel-prev').addEventListener('click', () => grid.scrollBy({ left: -190, behavior: 'smooth' }));
  $('carousel-next').addEventListener('click', () => grid.scrollBy({ left: 190, behavior: 'smooth' }));
  stats();
  $('garage-cash').textContent = '$' + g.cash.toLocaleString();

  document.querySelectorAll('.crew-btn').forEach((b) => b.addEventListener('click', () => {
    g.selectedCrew = b.dataset.crew;
    document.querySelectorAll('.crew-btn').forEach((x) => x.classList.toggle('active', x === b));
    rebuildShowroom();
  }));
  const mh = $('btn-mode-heist'), m1 = $('btn-mode-1v1');
  [[mh, 'heist'], [m1, '1v1']].forEach((p) => p[0].addEventListener('click', () => {
    g.mode = p[1]; mh.classList.toggle('active', p[1] === 'heist'); m1.classList.toggle('active', p[1] === '1v1');
  }));
  document.querySelectorAll('[data-soon]').forEach((b) => b.addEventListener('click', () => showToast(b.dataset.soon + ': COMING SOON')));

  $('ctrl-horn').addEventListener('pointerdown', () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyH' })));

  /* top tabs: GARAGE = clear showroom, other tabs open the right panel, SETTINGS opens the real settings */
  const right = $('right-column'), pc = $('panel-customize'), pm = $('panel-module');
  function openModule(name) {
    if (name === 'CUSTOMIZE') { pc.style.display = 'block'; pm.style.display = 'none'; }
    else { pc.style.display = 'none'; pm.style.display = 'block'; $('module-title').textContent = name + ' // MODULE'; }
    right.classList.remove('hidden');
  }
  const tabs = document.querySelectorAll('.top-tab-btn');
  function setTab(name) {
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.bottom-nav-item').forEach((x) => x.classList.remove('active'));
    if (name === 'GARAGE') right.classList.add('hidden'); else openModule(name);
  }
  tabs.forEach((t) => t.addEventListener('click', () => {
    if (t.dataset.tab === 'SETTINGS') { if (settingsBtn) settingsBtn.click(); return; }
    setTab(t.dataset.tab);
  }));
  document.querySelectorAll('.bottom-nav-item').forEach((b) => b.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.bottom-nav-item').forEach((x) => x.classList.toggle('active', x === b));
    openModule(b.dataset.bottomNav);
  }));
  document.querySelectorAll('.swatch').forEach((s) => s.addEventListener('click', () => {
    document.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('active', x === s));
    showToast('PAINT: ' + s.dataset.color.toUpperCase() + ' (preview only for now)');
  }));
  $('btn-save-custom').addEventListener('click', () => showToast('BUILD SAVED'));

  /* radial quick menu */
  const radial = $('radial-menu');
  $('btn-radial-toggle').addEventListener('click', () => radial.classList.toggle('open'));
  radial.querySelectorAll('.radial-item').forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.action;
    if (a === 'door') { if (g.selectedCar === 'mclaren' && doorsBtn) doorsBtn.click(); else showToast('ONLY THE MCLAREN HAS OPENING DOORS'); }
    else if (a === 'lights') { if (kept['ctrl-headlights']) kept['ctrl-headlights'].click(); }
    else if (a === 'daynight') window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyN' }));
    else showToast('OUTFIT: COMING SOON');
    radial.classList.remove('open');
  }));

  /* ======================= CREW CHARACTERS ======================= */
  const crewCache = {};
  const spots = [[-2.2, 0.4], [-2.8, -0.8], [-2.7, 1.2]];
  function getCrew(key) {
    if (crewCache[key]) return crewCache[key];
    const info = CREW_FILES[key] || CREW_FILES.david;
    const holder = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: info.color, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 1.1, 12), mat);
    body.position.y = 0.85; body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), mat);
    head.position.y = 1.62; head.castShadow = true;
    const stand = new THREE.Group();
    stand.add(body); stand.add(head);
    holder.add(stand);
    return (crewCache[key] = { holder, stand, state: 'idle', mixer: null });
  }
  function loadCrew(key) {
    const c = getCrew(key);
    if (c.state !== 'idle') return;
    c.state = 'loading';
    const info = CREW_FILES[key] || CREW_FILES.david;
    showToast('Loading ' + key.toUpperCase() + '...');
    const fail = (why) => { c.state = 'failed'; console.error('CREW FAILED', key, why); showToast('Could not load ' + key.toUpperCase() + ' - press F12 to see why'); };
    const hasMesh = (o) => { let m = false; o.traverse((x) => { if (x.isMesh) m = true; }); return m; };
    const show = (fbx, clip) => {
      const h = new THREE.Box3().setFromObject(fbx).getSize(new THREE.Vector3()).y;
      fbx.scale.setScalar(1.8 / (h || 180));
      const a = clip || (fbx.animations && fbx.animations[0]);
      if (a) { c.mixer = new THREE.AnimationMixer(fbx); c.mixer.clipAction(a).play(); }
      fbx.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      c.holder.remove(c.stand);
      c.holder.add(fbx);
      c.state = 'ready';
      showToast(key.toUpperCase() + ' ready');
    };
    // the body (full model with the skin)
    const loadBody = (clip) => fbxLoader.load(REPO_RAW + info.idle, (fbx) => show(fbx, clip), undefined, (e) => fail(info.idle));
    if (info.sit) {
      fbxLoader.load(REPO_RAW + info.sit, (fbx) => {
        if (hasMesh(fbx)) show(fbx);
        else { console.log('sit file has no body (animation only) - playing it on the full model'); loadBody(fbx.animations && fbx.animations[0]); }
      }, undefined, () => loadBody(null));
    } else loadBody(null);
  }
  window.rebuildShowroom = function () {
    scene.remove(playerCar);
    playerCar = createProceduralCarMesh(g.selectedCar);
    scene.add(playerCar);
    safehouseCrew.clear();
    const order = [g.selectedCrew].concat(['david', 'remy', 'michelle'].filter((k) => k !== g.selectedCrew));
    order.forEach((k, i) => {
      const c = getCrew(k);
      c.holder.position.set(spots[i][0], 0, spots[i][1]);
      safehouseCrew.add(c.holder);
    });
    loadCrew(g.selectedCrew); // only the chosen character downloads (the files are 20-50 MB each)
  };

  /* ======================= PER-FRAME: HUD bars + crew animation ======================= */
  let last = performance.now();
  const prev = window.loop;
  window.loop = function () {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    Object.keys(crewCache).forEach((k) => { if (crewCache[k].mixer) crewCache[k].mixer.update(dt); });
    prev();
    const rpm = $('hud-rpm-fill'), nit = $('hud-nitro-fill');
    if (rpm) {
      const h = rpm.style.height;
      if (h && h !== '100%') { rpm.style.width = h; rpm.style.height = '100%'; $('hud-rpm-val').textContent = Math.round(1000 + parseFloat(h) / 100 * 8000).toLocaleString(); }
    }
    if (nit) { const n = Math.max(0, Math.min(100, g.nitro)); nit.style.width = n + '%'; nit.style.height = '100%'; $('hud-nitro-val').textContent = Math.round(n) + '%'; }
  };

  rebuildShowroom();
})();
