// patch3.js - APEX // DX: blue theme, settings panel (sound, daylight, credits). Loads AFTER patch2.js.
(function () {
  const $ = (id) => document.getElementById(id);
  const get = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v === '1'; } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch (e) {} };

  /* ---- blue theme: the orange parts become blue ---- */
  const st = document.createElement('style');
  st.textContent = [
    '.btn-neon-orange{background:linear-gradient(135deg,#0ea5e9,#2563eb)!important;box-shadow:0 0 24px rgba(14,165,233,.55)!important}',
    '.text-orange-400,.text-amber-400,.text-amber-300{color:#38bdf8!important}',
    '.border-orange-500,.border-amber-400{border-color:#38bdf8!important}',
    '.bg-orange-500{background-color:#0ea5e9!important}',
    '.bg-orange-500\\/20{background-color:rgba(14,165,233,.2)!important}',
    '.from-orange-400{--tw-gradient-from:#38bdf8!important;--tw-gradient-stops:var(--tw-gradient-from),#2563eb!important}',
    '.to-rose-500{--tw-gradient-to:#2563eb!important}',
    '.hud-glass{border-color:rgba(56,189,248,.35)!important}'
  ].join('');
  document.head.appendChild(st);

  /* the developer credit moves into Settings */
  document.querySelectorAll('#garage-ui div').forEach((d) => {
    if (d.children.length === 0 && /developed by dave x/i.test(d.textContent)) d.style.display = 'none';
  });

  /* ---- daylight / night ---- */
  let day = get('apex_day', true);
  function applyLight() {
    const bg = day ? 0x87ceeb : 0x0b1020;
    scene.background = new THREE.Color(bg);
    scene.fog = new THREE.Fog(bg, 80, 400);
    if (day) {
      ambientLight.color.setHex(0xffffff); ambientLight.intensity = 1.0;
      dirLight.color.setHex(0xfff1d6); dirLight.intensity = 1.1; fillLight.intensity = 0.35;
    } else {
      ambientLight.color.setHex(0x8899cc); ambientLight.intensity = 0.55;
      dirLight.color.setHex(0x88aaff); dirLight.intensity = 0.7; fillLight.intensity = 0.8;
    }
  }
  window.__muted = !get('apex_sound', true);

  /* ---- settings button + panel ---- */
  const btn = document.createElement('button');
  btn.textContent = '⚙ SETTINGS';
  btn.className = 'hud-btn font-hud';
  btn.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:25;padding:8px 14px;border-radius:12px;font-size:11px;font-weight:700;color:#e2e8f0;cursor:pointer';
  document.body.appendChild(btn);

  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;background:rgba(2,6,23,.75)';
  panel.innerHTML =
    '<div class="hud-glass font-hud" style="width:min(92vw,360px);border-radius:20px;padding:20px;text-align:center">' +
    '<div style="font-size:18px;font-weight:900;color:#38bdf8;margin-bottom:14px">SETTINGS</div>' +
    '<button id="set-sound" class="hud-btn" style="width:100%;padding:12px;border-radius:12px;margin-bottom:10px;color:#e2e8f0;cursor:pointer"></button>' +
    '<button id="set-day" class="hud-btn" style="width:100%;padding:12px;border-radius:12px;margin-bottom:14px;color:#e2e8f0;cursor:pointer"></button>' +
    '<div style="font-size:11px;color:#94a3b8;margin-bottom:14px">APEX // DX — Developed by Dave X</div>' +
    '<button id="set-close" class="btn-neon-orange" style="width:100%;padding:12px;border-radius:12px;font-weight:800;color:#fff;cursor:pointer">CLOSE</button></div>';
  document.body.appendChild(panel);

  function refresh() {
    $('set-sound').textContent = '🔊 SOUND: ' + (window.__muted ? 'OFF' : 'ON');
    $('set-day').textContent = day ? '☀️ DAYLIGHT (tap for NIGHT)' : '🌙 NIGHT (tap for DAYLIGHT)';
  }
  $('set-sound').addEventListener('click', () => { window.__muted = !window.__muted; put('apex_sound', !window.__muted); refresh(); });
  $('set-day').addEventListener('click', () => { day = !day; put('apex_day', day); applyLight(); refresh(); });
  $('set-close').addEventListener('click', () => { panel.style.display = 'none'; });
  btn.addEventListener('click', () => { refresh(); panel.style.display = 'flex'; });
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyN') { day = !day; put('apex_day', day); applyLight(); } });

  applyLight();
})();
