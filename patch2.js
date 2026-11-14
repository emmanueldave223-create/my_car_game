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

  /* ---- cheap round shadow under every car ---- */
  const blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });
  const blobGeo = new THREE.PlaneGeometry(2.6, 5.4);
  function blob(o) {
    if (o.userData.blob && o.userData.blob.parent === o) return;
    const m = new THREE.Mesh(blobGeo, blobMat);
    m.rotation.x = -Math.PI / 2; m.position.y = 0.04;
    o.add(m); o.userData.blob = m;
  }

  /* ---- police trucks: the truck's own lights flash + red/blue glow on the road ---- */
  function copObj() {
    const w = new THREE.Group();
    w.add(createProceduralCarMesh('police'));
    w.rotation.y = Math.PI; // face forward like the player's car
    blob(w);
    return w;
  }
  const pr = new THREE.PointLight(0xff2020, 0, 28), pb = new THREE.PointLight(0x2060ff, 0, 28);
  scene.add(pr); scene.add(pb);
  function flashCops() {
    const ph = Math.floor(t * 8) % 2 === 0;
    let nearest = null;
    cops.forEach((c) => {
      if (!nearest || Math.abs(c.gap) < Math.abs(nearest.gap)) nearest = c;
      const ud = c.obj.userData;
      if (!ud.parts || (ud.parts.length === 0 && (ud.tries || 0) < 8 && t > (ud.next || 0))) {
        ud.parts = []; ud.tries = (ud.tries || 0) + 1; ud.next = t + 1.5;
        c.obj.traverse((m) => {
          if (m.isMesh && m.material && /siren|strobe|emerg|beacon|lightbar|light_bar/.test((m.name + ' ' + (m.material.name || '')).toLowerCase())) ud.parts.push(m);
        });
      }
      ud.parts.forEach((m) => { if (m.material.emissive) { m.material.emissive.setHex(ph ? 0xff0000 : 0x0033ff); m.material.emissiveIntensity = 2.5; } });
    });
    if (nearest) {
      pr.position.set(nearest.x, 2.6, nearest.gap); pb.position.set(nearest.x, 2.6, nearest.gap);
      pr.intensity = ph ? 3 : 0; pb.intensity = ph ? 0 : 3;
    } else { pr.intensity = 0; pb.intensity = 0; }
  }
  function spawn(n) {
    for (let i = 0; i < n; i++) {
      const obj = copObj();
      const c = { obj, k: cops.length, gap: 45 + i * 20 + Math.random() * 10, v: 50, x: LANES[Math.floor(Math.random() * LANES.length)] };
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
    pr.intensity = 0; pb.intensity = 0;
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
    if (playerCar) blob(playerCar);
    if (duelRival) blob(duelRival);
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
    const top = 78 + g.wantedStars * 8;                    // cop top speed (m/s)
    cops.forEach((c, i) => {
      const hover = 2.5 * Math.sin(t * 0.6 + c.k * 2.1);   // cops pull up beside you
      const want = Math.min(top, Math.max(0, g.speedMs + (c.gap - hover) * 0.9));
      c.v += (want - c.v) * Math.min(1, dt * 2.5);
      c.gap = Math.min(250, Math.max(-12, c.gap + (g.speedMs - c.v) * dt));
      const ram = Math.sin(t * 0.35 + c.k * 1.7) > 0.55;   // now and then they swerve into you
      let li = g.laneIndex + (c.k % 2 ? 1 : -1);
      if (li < 0 || li >= LANES.length) li = g.laneIndex + (c.k % 2 ? -1 : 1);
      const tx = c.gap < 40 ? (ram ? g.x : LANES[Math.max(0, Math.min(LANES.length - 1, li))]) : g.x;
      c.x += (tx - c.x) * Math.min(1, dt * (ram ? 2.2 : 1.2));
      if (Math.abs(c.gap) < 4.8 && Math.abs(c.x - g.x) < 2.1) { c.x += (c.x >= g.x ? 1 : -1) * 0.35; bump(0.88, 1.2); }
      for (let j = i + 1; j < cops.length; j++) {          // cops can't drive through each other
        const o = cops[j];
        if (Math.abs(c.gap - o.gap) < 5.5 && Math.abs(c.x - o.x) < 2.3) {
          const sg = c.x >= o.x ? 1 : -1;
          c.x += sg * 0.2; o.x -= sg * 0.2; c.gap += 0.3; o.gap -= 0.3;
        }
      }
      c.x = Math.max(lo, Math.min(hi, c.x));
      c.obj.position.set(c.x, 0, c.gap);
      if (c.gap < 7 && Math.abs(c.x - g.x) < 3.0) near = true;
    });
    flashCops();

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
