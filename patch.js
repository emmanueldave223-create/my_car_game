// patch.js - APEX // DX fixes. Loads AFTER the main script in index.html.
(function () {
  const clock = new THREE.Clock();
  const mixers = [];
  const dispose = window.disposeObject || function () {};
  if (CAR_FILES.chiron) CAR_FILES.chiron.tiltZ = 0.2; // the Bugatti file is rolled about 11.5 degrees

  /* ---------- CARS: download once, reuse, correct size ---------- */
  const carCache = new Map();
  const pending = new Map();
  const origCar = createProceduralCarMesh;

  function boxCar(key) { // original box car, without its own download
    const keep = gltfLoader.load;
    gltfLoader.load = function () {};
    const g = origCar(key);
    gltfLoader.load = keep;
    return g;
  }

  window.createProceduralCarMesh = function (key) {
    const info = CAR_FILES[key] || CAR_FILES.amggt63;
    const group = boxCar(key);
    const show = (m) => { group.clear(); group.add(m.clone(true)); };
    if (carCache.has(key)) { show(carCache.get(key)); return group; }
    if (pending.has(key)) { pending.get(key).push(show); return group; }
    pending.set(key, [show]);
    showToast('Loading ' + info.title + '...');
    gltfLoader.load(REPO_RAW + encodeURIComponent(info.file), (gltf) => {
      const model = gltf.scene;
      model.rotation.y = info.rotY;
      model.rotation.z = info.tiltZ || 0;
      let b = new THREE.Box3().setFromObject(model);
      const s = b.getSize(new THREE.Vector3());
      model.scale.setScalar(4.6 / Math.max(s.x, s.z));
      b = new THREE.Box3().setFromObject(model);
      const c = b.getCenter(new THREE.Vector3());
      model.position.set(-c.x, -b.min.y, -c.z);
      model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      const wrap = new THREE.Group();
      wrap.add(model);
      if (carCache.size >= 3) { // keep memory low: max 3 cars in memory
        const old = carCache.keys().next().value;
        dispose(carCache.get(old));
        carCache.delete(old);
      }
      carCache.set(key, wrap);
      pending.get(key).forEach((f) => f(wrap));
      pending.delete(key);
    }, undefined, (e) => { console.error('GLB FAILED', key, e); pending.delete(key); });
    return group;
  };

  /* ---------- CREW: same height, idle animation, loaded once ---------- */
  const crewCache = {};
  function crew(key) {
    if (crewCache[key]) return crewCache[key];
    const info = CREW_FILES[key] || CREW_FILES.david;
    const holder = new THREE.Group();
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 12), new THREE.MeshStandardMaterial({ color: info.color }));
    stand.position.y = 0.9;
    holder.add(stand);
    const ok = (fbx) => {
      holder.clear();
      const h = new THREE.Box3().setFromObject(fbx).getSize(new THREE.Vector3()).y;
      fbx.scale.setScalar(1.8 / (h || 180));
      if (fbx.animations && fbx.animations.length) {
        const m = new THREE.AnimationMixer(fbx);
        m.clipAction(fbx.animations[0]).play();
        mixers.push(m);
      }
      fbx.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      holder.add(fbx);
    };
    const go = (url, fb) => fbxLoader.load(REPO_RAW + url, ok, undefined, (e) => { if (fb) go(fb); else console.error('FBX FAILED', key, e); });
    go(info.sit || info.idle, info.sit ? info.idle : null);
    crewCache[key] = holder;
    return holder;
  }

  window.rebuildShowroom = function () {
    scene.remove(playerCar);
    playerCar = createProceduralCarMesh(gameState.selectedCar);
    scene.add(playerCar);
    safehouseCrew.clear();
    const others = ['david', 'remy', 'michelle'].filter((k) => k !== gameState.selectedCrew);
    const spots = [[-2.2, 0.4], [-2.8, -0.8], [-2.7, 1.2]];
    [gameState.selectedCrew].concat(others).forEach((k, i) => {
      const h = crew(k);
      h.position.set(spots[i][0], 0, spots[i][1]);
      safehouseCrew.add(h);
    });
  };

  /* ---------- ROAD: lane stripes + moving buildings ---------- */
  const stripes = new THREE.Group();
  scene.add(stripes);
  const sg = new THREE.BoxGeometry(0.18, 0.02, 3);
  const sm = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
  [-4.2, 0, 4.2].forEach((x) => {
    for (let z = -420; z < 20; z += 8) {
      const s = new THREE.Mesh(sg, sm);
      s.position.set(x, 0.02, z);
      stripes.add(s);
    }
  });
  cityGroup.children.forEach((c) => {
    c.userData.z0 = c.position.z;
    c.userData.move = c.geometry.type === 'BoxGeometry';
  });
  function shiftCity(d) {
    cityGroup.children.forEach((c) => { if (c.userData.move) c.position.z = c.userData.z0 + (d % 180); });
    stripes.position.z = d % 8;
  }

  /* ---------- CONTROLS ---------- */
  const input = { gas: false, brake: false, nitro: false };
  const keyMap = { KeyW: 'gas', ArrowUp: 'gas', KeyS: 'brake', ArrowDown: 'brake', Space: 'nitro', ShiftLeft: 'nitro' };
  window.addEventListener('keydown', (e) => { if (keyMap[e.code]) input[keyMap[e.code]] = true; if (e.code === 'KeyH') honk(); });
  window.addEventListener('keyup', (e) => { if (keyMap[e.code]) input[keyMap[e.code]] = false; });
  [['ctrl-gas', 'gas'], ['ctrl-brake', 'brake'], ['ctrl-nitro', 'nitro']].forEach((p) => {
    const el = document.getElementById(p[0]);
    el.addEventListener('pointerdown', () => { input[p[1]] = true; });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => el.addEventListener(ev, () => { input[p[1]] = false; }));
  });
  document.getElementById('ctrl-left').addEventListener('click', () => { gameState.laneIndex = Math.max(0, gameState.laneIndex - 1); });
  document.getElementById('ctrl-right').addEventListener('click', () => { gameState.laneIndex = Math.min(3, gameState.laneIndex + 1); });
  document.getElementById('btn-interact').addEventListener('click', () => triggerInteract());
  const wheel = Array.prototype.find.call(document.querySelectorAll('#gameplay-hud div'), (d) => d.textContent.trim() === '🎡');
  if (wheel) wheel.addEventListener('pointerdown', () => honk());

  /* ---------- SOUND (engine, siren, horn on H key or the wheel icon) ---------- */
  let ac, eng, engG, sir, sirG;
  function initAudio() {
    if (ac) { ac.resume(); return; }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const mk = (type) => {
      const o = ac.createOscillator();
      const gn = ac.createGain();
      o.type = type; gn.gain.value = 0;
      o.connect(gn); gn.connect(ac.destination); o.start();
      return [o, gn];
    };
    const a = mk('triangle'); eng = a[0]; engG = a[1];
    const b = mk('triangle'); sir = b[0]; sirG = b[1];
  }
  function honk() {
    if (!ac || window.__muted) return;
    [420, 520].forEach((f) => {
      const o = ac.createOscillator();
      const gn = ac.createGain();
      o.type = 'square'; o.frequency.value = f; gn.gain.value = 0.05;
      o.connect(gn); gn.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + 0.4);
    });
  }
  document.getElementById('btn-launch-game').addEventListener('click', initAudio);

  /* ---------- MAIN LOOP (real driving) ---------- */
  let t = 0, lastStars = -1;
  const $ = (id) => document.getElementById(id);
  window.loop = function () {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta());
    t += dt;
    mixers.forEach((m) => m.update(dt));
    const g = gameState;
    const car = CAR_FILES[g.selectedCar];
    const top = car.maxKmh / 3.6;

    if (g.active && !g.ended) {
      const boost = input.nitro && g.nitro > 0;
      if (input.brake) g.speedMs = Math.max(0, g.speedMs - 45 * dt);
      else if (input.gas) g.speedMs = Math.min(top * (boost ? 1.25 : 1), g.speedMs + car.accel * (boost ? 1.8 : 1) * dt);
      else g.speedMs = Math.max(0, g.speedMs - 6 * dt);
      g.nitro = boost ? Math.max(0, g.nitro - 25 * dt) : Math.min(100, g.nitro + 6 * dt);
      g.distanceM += g.speedMs * dt;
      g.x += (LANES[g.laneIndex] - g.x) * 0.12;
      playerCar.position.set(g.x, 0, 0);
      shiftCity(g.distanceM);

      if (g.mode === 'heist' && !g.heistRobbed && g.distanceM > 65) $('interact-prompt').classList.remove('hidden');

      const r = g.speedMs / top;
      $('hud-speed').textContent = Math.round(g.speedMs * 3.6);
      $('hud-gear').textContent = g.speedMs < 0.5 ? 'P' : String(Math.min(6, 1 + Math.floor(r * 6)));
      $('hud-rpm-fill').style.height = (10 + ((r * 6) % 1) * 85) + '%';
      $('hud-nitro-fill').style.height = g.nitro + '%';
      if (g.wantedStars !== lastStars) {
        lastStars = g.wantedStars;
        $('hud-stars').innerHTML = '<span class="text-amber-400">' + '★'.repeat(lastStars) + '</span>' + '★'.repeat(5 - lastStars);
      }

      camera.fov = 52 + Math.min(1.25, r) * 10;
      camera.updateProjectionMatrix();
      camera.position.set(g.x * 0.6, 3.6, 9);
      camera.lookAt(g.x * 0.4, 0.9, -5);

      if (ac) {
        eng.frequency.value = 45 + r * 140;
        engG.gain.value = window.__muted ? 0 : 0.015 + r * 0.02;
        sir.frequency.value = 850 + 150 * Math.sin(t * 7);
        sirG.gain.value = (g.wantedStars > 0 && !window.__muted) ? 0.01 : 0;
      }
    } else {
      if (!dragging) orbitAngle += dt * 0.35;
      shiftCity(0);
      if (camera.fov !== 60) { camera.fov = 60; camera.updateProjectionMatrix(); }
      camera.position.set(Math.sin(orbitAngle) * 5.2, 2.1, Math.cos(orbitAngle) * 5.6);
      camera.lookAt(-0.5, 0.8, 0);
      if (ac) { engG.gain.value = 0; sirG.gain.value = 0; }
    }
    renderer.render(scene, camera);
  };
})();
