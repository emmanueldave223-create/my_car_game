// patch2.js (v2) - APEX // DX: police chase, 1v1 duel, crashes, headlights, shadows. Loads AFTER patch.js.
(function () {
  const $ = (id) => document.getElementById(id);
  const cops = [];
  let robbedAt = null, bust = 15, lastStarAt = 0, t = 0, last = performance.now(), lastBump = -9;
  let duel = null, beams = false;
  const lo = Math.min.apply(null, LANES), hi = Math.max.apply(null, LANES);

  /* ---- shadows: bigger shadow area + road receives shadows ---- */
  const sc = dirLight.shadow.camera;
  sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 10; sc.far = 140;
  sc.updateProjectionMatrix();
  dirLight.shadow.mapSize.set(1024, 1024);
  cityGroup.children.forEach((c) => { c.receiveShadow = true; });

  /* ---- headlights (button or L key) ---- */
  const lamps = [-0.75, 0.75].map((x) => {
    const s = new THREE.SpotLight(0xfff2cc, 0, 70, 0.5, 0.5);
    const tg = new THREE.Object3D();
    scene.add(s); scene.add(tg); s.target = tg;
    return { s, tg, x };
  });
  function toggleBeams() { beams = !beams; showToast(beams ? '💡 Headlights ON' : 'Headlights OFF'); }
  $('ctrl-headlights').addEventListener('click', toggleBeams);
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyL') toggleBeams(); });

  /* ---- police trucks with flashing lights ---- */
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
      const c = { obj, gap: 45 + i * 20 + Math.random() * 10, v: 50, x: LANES[Math.floor(Math.random() * LANES.length)] };
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

  function bump(f, cd) {
    if (t - lastBump > cd) { lastBump = t; gameState.speedMs *= f; showToast('💥 CRASH!'); }
  }

  /* ---- result screen ---- */
  function endGame(icon, title, desc, amt, win) {
    const g = gameState;
    g.ended = true;
    g.cash = Math.max(0, g.cash + amt);
    $('garage-cash').textContent = '$' + g.cash.toLocaleString();
    $('res-icon').textContent = icon;
    $('res-title').textContent = title;
    $('res-title').className = 'font-hud text-2xl font-black ' + (win ? 'text-emerald-400' : 'text-rose-500');
    $('res-desc').textContent = desc;
    $('res-reward').textContent = (amt >= 0 ? '+$' : '-$') + Math.abs(amt).toLocaleString();
    $('siren-vignette').classList.add('hidden');
    $('result-modal').classList.remove('hidden');
    $('result-modal').classList.add('flex');
    clearCops();
  }
  function hideModal() { $('result-modal').classList.add('hidden'); $('result-modal').classList.remove('flex'); }
  $('btn-res-retry').addEventListener('click', () => { hideModal(); startGameplay(); });
  $('btn-res-garage').addEventListener('click', () => { hideModal(); $('btn-back-garage').click(); });

  /* ---- 1v1 duel: the rival drives by itself ---- */
  function runDuel(g, dt) {
    if (!duelRival) return;
    if (!duel || duel.obj !== duelRival) {
      const key = g.selectedCar === 'terzo' ? 'chiron' : 'terzo';
      duel = { obj: duelRival, dist: 0, v: 0, x: LANES[1], top: CAR_FILES[key].maxKmh / 3.6 * 0.93, acc: CAR_FILES[key].accel * 0.9 };
    }
    duel.v = Math.min(duel.top, duel.v + duel.acc * dt);
    duel.dist += duel.v * dt;
    const z = Math.max(-300, Math.min(60, g.distanceM - duel.dist));
    if (Math.abs(z) < 4.6 && Math.abs(duel.x - g.x) < 2.1) {
      bump(0.85, 1.0);
      duel.x += (duel.x >= g.x ? 1 : -1) * 0.25;
    }
    duel.x = Math.max(lo, Math.min(hi, duel.x));
    duelRival.position.set(duel.x, 0, z);
    $('duel-player-fill').style.width = Math.min(100, g.distanceM / 15) + '%';
    const gap = Math.round(duel.dist - g.distanceM);
    $('duel-gap-text').textContent = gap > 0 ? 'RIVAL +' + gap + 'm' : 'YOU +' + (-gap) + 'm';
    if (g.distanceM >= 1500) endGame('🏁', 'YOU WIN!', 'You beat the rival to the finish line.', 10000, true);
    else if (duel.dist >= 1500) endGame('🏁', 'YOU LOST', 'The rival crossed the line first.', -5000, false);
  }

  function tick() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; t += dt;
    const g = gameState;
    const on = beams && g.active && !g.ended;
    lamps.forEach((l) => {
      l.s.position.set(g.x + l.x, 0.8, -1.8);
      l.tg.position.set(g.x + l.x * 1.2, 0.2, -30);
      l.s.intensity = on ? 2.2 : 0;
    });

    if (!g.active) {
      if (cops.length || robbedAt !== null) clearCops();
      if (duelRival) { scene.remove(duelRival); duelRival = null; }
      duel = null;
      return;
    }
    if (g.ended) return;
    if (g.mode === '1v1') { runDuel(g, dt); return; }
    if (duelRival) { scene.remove(duelRival); duelRival = null; }
    if (g.mode !== 'heist') return;
    if (!g.heistRobbed) { if (robbedAt !== null) clearCops(); return; }

    if (robbedAt === null) { // just robbed the shop
      robbedAt = g.distanceM; lastStarAt = g.distanceM;
      g.wantedStars = 2;
      spawn(2);
      showToast('🚨 COPS ARE COMING! KEEP DRIVING!');
    }
    const since = g.distanceM - robbedAt;
    if (g.distanceM - lastStarAt > 400 && g.wantedStars < 5) { lastStarAt = g.distanceM; g.wantedStars++; spawn(1); }

    let near = false;
    const tg = Math.max(3.5, 8.5 - g.wantedStars * 0.9);  // how close cops try to stay
    const top = 78 + g.wantedStars * 8;                    // cop top speed (m/s)
    cops.forEach((c) => {
      const want = Math.min(top, Math.max(0, g.speedMs + (c.gap - tg) * 0.9));
      c.v += (want - c.v) * Math.min(1, dt * 2.5);
      c.gap = Math.min(250, Math.max(0, c.gap + (g.speedMs - c.v) * dt));
      if (c.gap < 40) c.x += (g.x - c.x) * 0.05;
      if (c.gap < 4.6 && Math.abs(c.x - g.x) < 2.1) { c.gap = 4.6; bump(0.85, 1.2); }
      c.obj.position.set(c.x, 0, c.gap);
      c.obj.userData.red.visible = Math.floor(t * 8) % 2 === 0;
      c.obj.userData.blue.visible = !c.obj.userData.red.visible;
      if (c.gap < 6.5 && Math.abs(c.x - g.x) < 2.8) near = true;
    });

    bust = near ? bust - dt : Math.min(15, bust + dt * 1.5);
    const box = $('bust-timer-box');
    if (near || bust < 15) box.classList.remove('hidden'); else box.classList.add('hidden');
    $('bust-seconds').textContent = Math.max(0, bust).toFixed(1);
    $('hud-objective').textContent = 'ESCAPE THE COPS! ' + Math.max(0, Math.round(1500 - since)) + 'm to safety';

    if (bust <= 0) endGame('🚔', 'BUSTED!', 'The police caught you. You lost your cut.', -5000, false);
    else if (since >= 1500) endGame('💰', 'HEIST ESCAPE COMPLETE!', 'You outran the cops and banked the loot.', 15000, true);
  }

  const prev = window.loop;
  window.loop = function () { tick(); prev(); };
})();
