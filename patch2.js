// patch2.js - APEX // DX police chase + heist ending. Loads AFTER patch.js.
(function () {
  const $ = (id) => document.getElementById(id);
  const cops = [];
  let robbedAt = null, bust = 15, lastStarAt = 0, t = 0, last = performance.now();

  function copObj() {
    const w = new THREE.Group();
    w.add(createProceduralCarMesh('police'));
    const mk = (c, x) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.35), new THREE.MeshBasicMaterial({ color: c }));
      m.position.set(x, 2.1, 0);
      w.add(m);
      return m;
    };
    w.userData.red = mk(0xff2222, -0.45);
    w.userData.blue = mk(0x2266ff, 0.45);
    return w;
  }

  function spawn(n) {
    for (let i = 0; i < n; i++) {
      const obj = copObj();
      const c = { obj, gap: 70 + i * 30 + Math.random() * 20, x: LANES[Math.floor(Math.random() * 4)] };
      obj.position.set(c.x, 0, c.gap);
      scene.add(obj);
      cops.push(c);
    }
  }

  function clearCops() {
    cops.forEach((c) => scene.remove(c.obj));
    cops.length = 0;
    robbedAt = null; bust = 15; lastStarAt = 0;
    $('bust-timer-box').classList.add('hidden');
  }

  function endGame(win) {
    const g = gameState;
    g.ended = true;
    g.cash = Math.max(0, g.cash + (win ? 15000 : -5000));
    $('garage-cash').textContent = '$' + g.cash.toLocaleString();
    $('res-icon').textContent = win ? '💰' : '🚔';
    $('res-title').textContent = win ? 'HEIST ESCAPE COMPLETE!' : 'BUSTED!';
    $('res-title').className = 'font-hud text-2xl font-black ' + (win ? 'text-emerald-400' : 'text-rose-500');
    $('res-desc').textContent = win ? 'You outran the cops and banked the loot.' : 'The police caught you. You lost your cut.';
    $('res-reward').textContent = win ? '+$15,000' : '-$5,000';
    $('siren-vignette').classList.add('hidden');
    $('result-modal').classList.remove('hidden');
    $('result-modal').classList.add('flex');
    clearCops();
  }

  function hideModal() {
    $('result-modal').classList.add('hidden');
    $('result-modal').classList.remove('flex');
  }
  $('btn-res-retry').addEventListener('click', () => { hideModal(); startGameplay(); });
  $('btn-res-garage').addEventListener('click', () => { hideModal(); $('btn-back-garage').click(); });

  function tick() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; t += dt;
    const g = gameState;
    if (!g.active || g.mode !== 'heist') { if (cops.length || robbedAt !== null) clearCops(); return; }
    if (g.ended) return;
    if (!g.heistRobbed) { if (robbedAt !== null) clearCops(); return; }

    if (robbedAt === null) { // just robbed the shop
      robbedAt = g.distanceM; lastStarAt = g.distanceM;
      g.wantedStars = 2;
      spawn(2);
      showToast('🚨 COPS ARE COMING! KEEP DRIVING!');
    }
    const since = g.distanceM - robbedAt;
    if (g.distanceM - lastStarAt > 400 && g.wantedStars < 5) { // more heat over time
      lastStarAt = g.distanceM; g.wantedStars++; spawn(1);
    }

    let near = false;
    cops.forEach((c) => {
      const copSpeed = 55 + g.wantedStars * 5;
      c.gap = Math.min(250, Math.max(0, c.gap + (g.speedMs - copSpeed) * dt));
      if (c.gap < 40) c.x += (g.x - c.x) * 0.04;
      c.obj.position.set(c.x, 0, c.gap);
      c.obj.userData.red.visible = Math.floor(t * 8) % 2 === 0;
      c.obj.userData.blue.visible = !c.obj.userData.red.visible;
      if (c.gap < 6 && Math.abs(c.x - g.x) < 2.8) near = true;
    });

    bust = near ? bust - dt : Math.min(15, bust + dt * 1.5);
    const box = $('bust-timer-box');
    if (near || bust < 15) box.classList.remove('hidden'); else box.classList.add('hidden');
    $('bust-seconds').textContent = Math.max(0, bust).toFixed(1);
    $('hud-objective').textContent = 'ESCAPE THE COPS! ' + Math.max(0, Math.round(1500 - since)) + 'm to safety';

    if (bust <= 0) endGame(false);
    else if (since >= 1500) endGame(true);
  }

  const prev = window.loop;
  window.loop = function () { tick(); prev(); };
})();
