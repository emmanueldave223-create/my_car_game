// patch5.js - APEX // DX: McLaren W1 with spinning + steering wheels, doors that open, headlights. Loads AFTER patch4.js.
(function () {
  const $ = (id) => document.getElementById(id);
  CAR_FILES.mclaren = { file: 'models/mclaren_w1.glb', title: 'MCLAREN W1', maxKmh: 350, accel: 33, rotY: 0, color: 0xf97316 };

  CREW_FILES.david.sit = 'models/david_sit.fbx'; // used if the file exists, otherwise the normal idle animation

  const mc = { model: null, loading: false, wheels: [], head: null, mixer: null, action: null, open: false, beams: false, waiting: [] };
  const prevCar = window.createProceduralCarMesh;
  const UP = new THREE.Vector3(0, 0, 1); // "up" inside the McLaren file

  function placeholder() {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.4), new THREE.MeshStandardMaterial({ color: 0xf97316 }));
    m.position.y = 0.5; m.castShadow = true;
    g.add(m);
    return g;
  }

  function load() {
    if (mc.loading || mc.model) return;
    mc.loading = true;
    showToast('Loading MCLAREN W1...');
    const urls = [CAR_FILES.mclaren.file, 'mclaren_w1.glb']; // look in models/ first, then the main folder
    const attempt = (i) => gltfLoader.load(REPO_RAW + urls[i], (gltf) => {
      const model = gltf.scene;
      model.updateMatrixWorld(true);
      const head = model.getObjectByName('headlights'), tail = model.getObjectByName('tailights');
      if (head && tail) { // turn the car so its nose points the way the game drives
        const h = new THREE.Vector3().setFromMatrixPosition(head.matrixWorld);
        const t = new THREE.Vector3().setFromMatrixPosition(tail.matrixWorld);
        model.rotation.y = Math.PI - Math.atan2(h.x - t.x, h.z - t.z);
      }
      let b = new THREE.Box3().setFromObject(model);
      const s = b.getSize(new THREE.Vector3());
      model.scale.setScalar(4.6 / Math.max(s.x, s.z));
      b = new THREE.Box3().setFromObject(model);
      const c = b.getCenter(new THREE.Vector3());
      model.position.set(-c.x, -b.min.y, -c.z);
      model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

      ['tire', 'tire003', 'tire001', 'tire004'].forEach((n, i) => { // first two = front, last two = rear
        const o = model.getObjectByName(n);
        if (o) mc.wheels.push({ o, base: o.quaternion.clone(), left: o.position.x > 0, front: i < 2, spin: 0 });
      });
      mc.head = head;
      if (gltf.animations && gltf.animations.length) { // built-in animation: doors + rear wing
        mc.mixer = new THREE.AnimationMixer(model);
        mc.action = mc.mixer.clipAction(gltf.animations[0]);
        mc.action.setLoop(THREE.LoopOnce, 1);
        mc.action.clampWhenFinished = true;
        mc.action.play();
        mc.action.paused = true;
        mc.action.time = 0;
      }
      mc.model = model;
      const w = mc.waiting[mc.waiting.length - 1];
      if (w) { w.clear(); w.add(model); }
      mc.waiting.length = 0;
    }, undefined, (e) => {
      if (i + 1 < urls.length) attempt(i + 1);
      else { console.error('MCLAREN FAILED - file not found in models/ or the main folder', e); mc.loading = false; }
    });
    attempt(0);
  }

  window.createProceduralCarMesh = function (key) {
    if (key !== 'mclaren') return prevCar(key);
    const g = new THREE.Group();
    if (mc.model) { g.add(mc.model); return g; }
    g.add(placeholder());
    mc.waiting.push(g);
    load();
    return g;
  };

  /* ---- doors (button or O key) ---- */
  function toggleDoors() {
    const a = mc.action;
    if (!a) return;
    mc.open = !mc.open;
    const d = a.getClip().duration;
    a.paused = false;
    a.timeScale = mc.open ? 1 : -1;
    if (mc.open && a.time >= d - 0.001) a.time = 0;
    if (!mc.open && a.time <= 0.001) a.time = d;
  }
  const db = document.createElement('button');
  db.id = 'btn-doors';
  db.textContent = '🚪 DOORS';
  db.className = 'hud-btn font-hud';
  db.style.cssText = 'position:fixed;top:12px;left:calc(50% + 100px);z-index:25;padding:8px 14px;border-radius:12px;font-size:11px;font-weight:700;color:#e2e8f0;cursor:pointer;display:none';
  db.addEventListener('click', toggleDoors);
  document.body.appendChild(db);

  /* ---- headlights (button or L key) ---- */
  function setBeams(on) {
    mc.beams = on;
    if (!mc.head) return;
    mc.head.traverse((m) => {
      if (m.isMesh && m.material && m.material.emissive) { m.material.emissive.setHex(on ? 0xffffee : 0x000000); m.material.emissiveIntensity = on ? 4 : 1; }
    });
  }
  $('ctrl-headlights').addEventListener('click', () => setBeams(!mc.beams));
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyL') setBeams(!mc.beams); if (e.code === 'KeyO') toggleDoors(); });

  /* ---- McLaren tile in the garage ---- */
  const grid = $('car-grid');
  const tile = document.createElement('button');
  tile.dataset.car = 'mclaren';
  tile.className = 'car-tile rounded-xl p-2.5 text-left bg-slate-900/75 border border-white/10 hover:border-white/30 transition cursor-pointer';
  tile.innerHTML = '<div class="font-hud text-[11px] font-black text-white">MCLAREN W1</div><div class="text-[10px] text-sky-300 font-bold">Hybrid V8 • 350 KM/H</div>';
  grid.insertBefore(tile, grid.firstChild);
  tile.addEventListener('click', () => {
    gameState.selectedCar = 'mclaren';
    document.querySelectorAll('#car-grid .car-tile').forEach((t) => {
      const on = t === tile;
      t.classList.toggle('border-2', on); t.classList.toggle('border-orange-500', on);
      t.classList.toggle('border', !on); t.classList.toggle('border-white/10', !on);
    });
    $('garage-car-name').textContent = CAR_FILES.mclaren.title;
    rebuildShowroom();
  });

  /* ---- every frame: wheels roll + steer, buttons show only in the garage ---- */
  const setBtn = Array.prototype.find.call(document.querySelectorAll('button'), (b) => b.textContent.indexOf('SETTINGS') >= 0);
  let last = performance.now();
  function tick() {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const g = gameState;
    db.style.display = (!g.active && g.selectedCar === 'mclaren') ? 'block' : 'none';
    if (setBtn) setBtn.style.display = g.active ? 'none' : 'block';
    if (mc.mixer) mc.mixer.update(dt);
    if (!mc.model || g.selectedCar !== 'mclaren') return;
    const steer = g.active ? Math.max(-0.5, Math.min(0.5, -(LANES[g.laneIndex] - g.x) * 0.25)) : 0;
    const roll = g.active ? g.speedMs * dt / 0.33 : 0;
    mc.wheels.forEach((w) => {
      w.spin = (w.spin + (w.left ? 1 : -1) * roll) % (Math.PI * 2);
      const qs = new THREE.Quaternion().setFromAxisAngle(UP, w.front ? steer : 0);
      const qk = new THREE.Quaternion().setFromAxisAngle(UP, w.spin);
      w.o.quaternion.copy(qs).multiply(w.base).multiply(qk);
    });
  }
  const prev = window.loop;
  window.loop = function () { tick(); prev(); };
})();

/* ---- loads patch6.js (the blue UI merge + crew fix) right after this file ---- */
(function () {
  if (document.readyState === 'loading') {
    document.write('<script src="patch6.js"><\/script>');
  } else {
    const s = document.createElement('script');
    s.src = 'patch6.js';
    document.body.appendChild(s);
  }
})();
