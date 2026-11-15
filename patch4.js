// patch4.js - APEX // DX street: asphalt road, brick buildings, brick pilasters, daytime clouds. Loads AFTER patch3.js.
(function () {
  const TINY = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  // load a picture and shrink it so it uses little graphics memory
  function small(url, size, done) {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      c.getContext('2d').drawImage(img, 0, 0, size, size);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      done(t);
    };
    img.onerror = () => console.error('TEXTURE FAILED', url);
    img.src = url;
  }

  /* ---- road + ground ---- */
  let roadTex = null;
  const planes = cityGroup.children.filter((c) => c.geometry && c.geometry.type === 'PlaneGeometry')
    .sort((a, b) => a.geometry.parameters.width - b.geometry.parameters.width);
  const road = planes[0], ground = planes[planes.length - 1];
  if (ground && ground !== road && ground.material.color) ground.material.color.setHex(0xaab4be);
  if (road) {
    const p = road.geometry.parameters;
    small(REPO_RAW + 'textures/asphalt_02_diff_1k.jpg', 512, (t) => {
      t.repeat.set(p.width / 8, p.height / 8);
      road.material.map = t;
      if (road.material.color) road.material.color.setHex(0xe2e8f0);
      road.material.needsUpdate = true;
      roadTex = t;
    });
  }

  /* ---- brick buildings ---- */
  const boxes = cityGroup.children.filter((c) => c.geometry && c.geometry.type === 'BoxGeometry' && c.userData.move);
  small(REPO_RAW + 'models/T_RedBrick_BaseColor.png', 1024, (tex) => {
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
    const done = new Set();
    boxes.forEach((b) => {
      const p = b.geometry.parameters;
      if (!done.has(b.geometry)) {   // scale the brick pattern to the building size (once per shape)
        done.add(b.geometry);
        const rx = Math.max(p.width * b.scale.x, p.depth * b.scale.z) / 4, ry = p.height * b.scale.y / 4;
        const uv = b.geometry.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * rx, uv.getY(i) * ry);
        uv.needsUpdate = true;
      }
      b.material = mat;
    });
    addPilasters(tex);
  });

  /* ---- real brick pillars from your kit, on the road side of the buildings (first 2 floors) ---- */
  function addPilasters(tex) {
    const mgr = new THREE.LoadingManager();
    mgr.setURLModifier((u) => (/\.png$/i.test(u) ? TINY : u));
    new THREE.GLTFLoader(mgr).load(REPO_RAW + 'models/Brick_Column_RedBricks.gltf', (g) => {
      g.scene.updateMatrixWorld(true);
      let mesh = null;
      g.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
      if (!mesh) return;
      const items = [];
      boxes.forEach((b) => {
        const p = b.geometry.parameters;
        const w = p.width * b.scale.x, d = p.depth * b.scale.z;
        const side = b.position.x < 0 ? 1 : -1;               // +1 = this building's road side faces +x
        const fx = b.position.x + side * (w / 2);
        for (let z = -d / 2 + 3; z < d / 2 - 1; z += 9) {
          [0, 4.2].forEach((y) => items.push([fx, y, b.userData.z0 + z, side]));
        }
      });
      const im = new THREE.InstancedMesh(mesh.geometry, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), items.length);
      const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(1.4, 1.4, 1.4);
      items.forEach((it, i) => {
        q.setFromAxisAngle(up, it[3] * Math.PI / 2);
        const m = new THREE.Matrix4().compose(new THREE.Vector3(it[0], it[1], it[2]), q, sc);
        m.multiply(mesh.matrixWorld);
        im.setMatrixAt(i, m);
      });
      im.frustumCulled = false;
      im.userData = { z0: 0, move: true };
      cityGroup.add(im);
    }, undefined, (e) => console.error('BRICK PILLAR FAILED', e));
  }

  /* ---- daytime clouds ---- */
  const clouds = new THREE.Group();
  const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false });
  const sg = new THREE.SphereGeometry(1, 8, 6);
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const s = new THREE.Mesh(sg, cm);
      s.scale.set(14 + Math.random() * 10, 5 + Math.random() * 3, 8 + Math.random() * 4);
      s.position.set(j * 12 - 18 + Math.random() * 4, Math.random() * 3, Math.random() * 5);
      c.add(s);
    }
    c.position.set(-250 + Math.random() * 500, 70 + Math.random() * 40, -150 - Math.random() * 220);
    clouds.add(c);
  }
  scene.add(clouds);

  let last = performance.now();
  function tick() {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (roadTex) roadTex.offset.y = (gameState.distanceM / 8) % 1;  // road texture slides with your speed
    const bg = scene.background;
    clouds.visible = !!(bg && bg.isColor && bg.getHex() === 0x87ceeb);
    if (clouds.visible) clouds.children.forEach((c) => { c.position.x += 2 * dt; if (c.position.x > 260) c.position.x = -260; });
  }
  const prev = window.loop;
  window.loop = function () { tick(); prev(); };
})();
