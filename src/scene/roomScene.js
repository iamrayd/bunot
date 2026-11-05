import * as THREE from 'three';

/**
 * The 3D Christmas room. Imperative on purpose: React hands it a guest list and calls a few verbs.
 * Returns null when WebGL is unavailable.
 */
export function createRoomScene({ root, canvas, labels, bubble }) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const NIGHT = 0x160c12;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(NIGHT);
  scene.fog = new THREE.Fog(NIGHT, 17, 40);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 140);
  const camBase = new THREE.Vector3(0, 5.5, 11);
  const LOOK = new THREE.Vector3(0, 1.2, 0);

  /* ---------- helpers ---------- */
  const M = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0, flatShading: true }, o || {}));
  const B = (color) => new THREE.MeshBasicMaterial({ color });
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const sph = (r, a = 10, b = 8) => new THREE.SphereGeometry(r, a, b);
  const cyl = (a, b, h, s = 10) => new THREE.CylinderGeometry(a, b, h, s);
  const cone = (r, h, s = 8) => new THREE.ConeGeometry(r, h, s);
  function add(parent, geo, material, x = 0, y = 0, z = 0, shadow = true) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = shadow; m.receiveShadow = shadow;
    parent.add(m);
    return m;
  }
  function group(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
  function canvasTex(size, draw, rx, ry) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c);
    if (rx) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); }
    return t;
  }
  function starGeo(R, r, depth) {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 + Math.PI / 2, rad = i % 2 ? r : R;
      const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
      if (i) s.lineTo(x, y); else s.moveTo(x, y);
    }
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
    g.translate(0, 0, -depth / 2);
    return g;
  }
  const twinkles = [];
  function bulb(parent, color, x, y, z, r = 0.07) {
    const m = add(parent, sph(r, 6, 5), B(color), x, y, z, false);
    twinkles.push({ m, base: new THREE.Color(color), phase: Math.random() * 6.28, speed: 1.5 + Math.random() * 2.5 });
    return m;
  }
  const LIGHTS = [0xffd45e, 0xff5a4f, 0x7fe0a0, 0x6fb7ff, 0xfff3dc];

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight(0xffe9d0, 0x3a2030, 0.62));
  const sun = new THREE.DirectionalLight(0xffe2b8, 0.6);
  sun.position.set(5, 10, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 30 });
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  const fireLight = new THREE.PointLight(0xff7a2e, 1.5, 13);
  fireLight.position.set(-3.7, 1.1, -2.2);
  scene.add(fireLight);
  const treeLight = new THREE.PointLight(0xffd27a, 0.55, 8);
  treeLight.position.set(3.4, 2.6, -1);
  scene.add(treeLight);

  /* ---------- room ---------- */
  const floorTex = canvasTex(256, (g) => {
    g.fillStyle = '#6a3d24'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? '#74452a' : '#613720'; g.fillRect(0, i * 32, 256, 31);
      g.fillStyle = '#4a2917'; g.fillRect((i * 97) % 256, i * 32, 3, 31);
    }
  }, 8, 6);
  const floor = add(scene, new THREE.PlaneGeometry(44, 28), M(0xffffff, { map: floorTex, flatShading: false }), 0, 0, 5);
  floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  const wallTex = canvasTex(128, (g) => {
    g.fillStyle = '#1f4d3a'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#245842'; g.fillRect(0, 0, 64, 128);
    g.fillStyle = '#d9b45a'; g.fillRect(62, 0, 2, 128); g.fillRect(126, 0, 2, 128);
  }, 22, 1);
  const wall = add(scene, new THREE.PlaneGeometry(44, 11), M(0xffffff, { map: wallTex, flatShading: false }), 0, 5.5, -4);
  wall.castShadow = false;
  add(scene, box(44, 1.3, 0.16), M(0x3a2018), 0, 0.65, -3.92);
  add(scene, box(44, 0.1, 0.24), M(0x4f2c1d), 0, 1.34, -3.9);

  const RING = { cx: 0.3, cz: 1.7, rx: 3.3, rz: 1.75 };
  const rug = group(scene, RING.cx, 0, RING.cz);
  rug.scale.set(1, 1, 0.6);
  [[new THREE.CircleGeometry(4.5, 40), 0xf3e2bd, 0.012], [new THREE.CircleGeometry(4.2, 40), 0x9c2233, 0.02], [new THREE.RingGeometry(1.5, 1.62, 40), 0xf2c14e, 0.028]].forEach(([geo, c, y]) => {
    const m = add(rug, geo, M(c, { flatShading: false }), 0, y, 0); m.rotation.x = -Math.PI / 2; m.castShadow = false;
  });

  for (let i = 0; i < 34; i++) {
    const x = -8.5 + i * 0.515, sag = Math.abs(Math.sin(i / 34 * Math.PI * 4)) * 0.35;
    bulb(scene, LIGHTS[i % LIGHTS.length], x, 5.25 - sag, -3.9, 0.075);
  }

  /* ---------- fireplace ---------- */
  const fp = group(scene, -3.7, 0, -3.55);
  const brick = M(0x8a3b2e), stone = M(0x6e625c), wood = M(0x4a2a1a);
  add(fp, box(3.2, 2.6, 0.9), brick, 0, 1.3, 0);
  add(fp, box(2.3, 8, 0.6), brick, 0, 6.6, -0.1);
  add(fp, box(3.7, 0.18, 1.15), wood, 0, 2.69, 0.05);
  add(fp, box(3.7, 0.12, 1.6), stone, 0, 0.06, 0.4);
  add(fp, box(1.8, 1.45, 0.06), B(0x120807), 0, 0.84, 0.46, false);
  const log1 = add(fp, cyl(0.11, 0.11, 1.1, 7), M(0x3a2114), 0, 0.26, 0.62); log1.rotation.z = Math.PI / 2; log1.rotation.y = 0.25;
  const log2 = add(fp, cyl(0.1, 0.1, 1.0, 7), M(0x452a18), 0.05, 0.38, 0.6); log2.rotation.z = Math.PI / 2; log2.rotation.y = -0.3;
  const flames = [];
  [[-0.3, 0.55, 0xff6a1f], [0, 0.85, 0xff8a2a], [0.3, 0.6, 0xff6a1f], [-0.12, 0.5, 0xffc24a], [0.14, 0.55, 0xffd76a]].forEach(([x, h, c], i) => {
    const f = add(fp, cone(0.2, h, 6), B(c), x, 0.42 + h / 2, 0.62 + (i > 2 ? 0.08 : 0), false);
    flames.push({ f, h, i });
  });
  [-1.1, -0.35, 0.4, 1.1].forEach((x, i) => {
    const c = [0xc2283a, 0xfff3dc, 0x2f7d57, 0xc2283a][i], s = group(fp, x, 2.3, 0.6);
    add(s, box(0.24, 0.5, 0.08), M(c), 0, 0, 0);
    add(s, box(0.3, 0.14, 0.1), M(i === 1 ? 0xc2283a : 0xfff3dc), 0, 0.26, 0);
    add(s, box(0.22, 0.2, 0.08), M(c), 0.13, -0.25, 0);
    s.rotation.z = (i % 2 ? -1 : 1) * 0.06;
  });
  for (let i = 0; i < 15; i++) {
    const x = -1.75 + i * 0.25;
    add(fp, sph(0.17, 6, 5), M(0x2a6b46), x, 2.86 + Math.sin(i * 1.7) * 0.03, 0.45);
    if (i % 2) bulb(fp, LIGHTS[i % LIGHTS.length], x, 2.98, 0.58, 0.05);
  }

  /* ---------- Santa, his chair, the jar ---------- */
  const santaRoot = group(scene, -1.15, 0, -2.0);
  santaRoot.rotation.y = 0.28;
  const leather = M(0x6b3a22);
  add(santaRoot, box(1.7, 0.55, 1.4), leather, 0, 0.42, 0);
  add(santaRoot, box(1.7, 1.9, 0.32), leather, 0, 1.45, -0.6);
  add(santaRoot, box(0.32, 0.85, 1.4), leather, -0.86, 0.8, 0);
  add(santaRoot, box(0.32, 0.85, 1.4), leather, 0.86, 0.8, 0);
  [-0.72, 0.72].forEach((x) => [-0.55, 0.55].forEach((z) => add(santaRoot, cyl(0.07, 0.05, 0.16, 6), wood, x, 0.08, z)));
  const santa = group(santaRoot, 0, 0.7, 0.05);
  const red = M(0xc2283a), white = M(0xfff8ec), skinM = M(0xf0b48c), black = M(0x1c1416);
  const santaBody = add(santa, sph(0.62, 12, 10), red, 0, 0.62, 0); santaBody.scale.set(1, 1.08, 0.95);
  add(santa, cyl(0.625, 0.63, 0.14, 14), black, 0, 0.45, 0);
  add(santa, box(0.2, 0.2, 0.06), M(0xf2c14e, { metalness: 0.4, roughness: 0.4 }), 0, 0.45, 0.61);
  const santaHead = group(santa, 0, 1.42, 0.05);
  add(santaHead, sph(0.34, 12, 10), skinM, 0, 0, 0);
  const beard = add(santaHead, sph(0.33, 10, 8), white, 0, -0.2, 0.17); beard.scale.set(1.1, 1.15, 0.75);
  add(santaHead, sph(0.07, 6, 5), M(0xe58f7a), 0, -0.02, 0.34);
  add(santaHead, sph(0.035, 6, 5), black, -0.12, 0.07, 0.31);
  add(santaHead, sph(0.035, 6, 5), black, 0.12, 0.07, 0.31);
  const brim = add(santaHead, new THREE.TorusGeometry(0.31, 0.09, 6, 14), white, 0, 0.2, 0); brim.rotation.x = Math.PI / 2;
  const hat = add(santaHead, cone(0.3, 0.62, 10), red, 0.06, 0.52, -0.04); hat.rotation.z = -0.28;
  add(santaHead, sph(0.1, 6, 5), white, 0.2, 0.8, -0.04);
  [-1, 1].forEach((s) => {
    const thigh = add(santa, cyl(0.2, 0.19, 0.8, 8), red, s * 0.26, 0.12, 0.48); thigh.rotation.x = Math.PI / 2;
    add(santa, cyl(0.18, 0.17, 0.55, 8), red, s * 0.26, -0.18, 0.86);
    add(santa, box(0.3, 0.26, 0.5), black, s * 0.26, -0.56, 0.95);
    add(santa, cyl(0.2, 0.2, 0.1, 8), white, s * 0.26, -0.4, 0.86);
  });
  const ARM_REST = -0.95;
  function santaArm(side) {
    const pivot = group(santa, side * 0.6, 1.0, 0.05);
    add(pivot, cyl(0.15, 0.13, 0.7, 8), red, 0, -0.35, 0);
    add(pivot, cyl(0.15, 0.15, 0.1, 8), white, 0, -0.68, 0);
    add(pivot, sph(0.13, 8, 6), black, 0, -0.8, 0);
    pivot.rotation.set(ARM_REST, 0, side * -0.3);
    return pivot;
  }
  const armL = santaArm(-1), armR = santaArm(1);
  let armLift = 0;
  const JAR_Y = 0.66;
  const jar = group(santa, 0, JAR_Y, 0.86);
  jar.scale.setScalar(1.3);
  add(jar, cyl(0.25, 0.22, 0.5, 14), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.3, roughness: 0.15, depthWrite: false }), 0, 0, 0, false);
  const jarRim = add(jar, new THREE.TorusGeometry(0.25, 0.03, 6, 16), M(0xf2c14e, { metalness: 0.4, roughness: 0.4 }), 0, 0.25, 0); jarRim.rotation.x = Math.PI / 2;
  const paperM = M(0xfffaf0), bandM = M(0xc2283a);
  const paperGeo = cyl(0.035, 0.035, 0.17, 6), bandGeo = cyl(0.039, 0.039, 0.03, 6);
  function paperRoll(parent, x = 0, y = 0, z = 0) {
    const p = group(parent, x, y, z);
    add(p, paperGeo, paperM).rotation.z = Math.PI / 2;
    add(p, bandGeo, bandM).rotation.z = Math.PI / 2;
    return p;
  }
  for (let i = 0; i < 8; i++) {
    const p = paperRoll(jar, Math.cos(i * 2.4) * 0.1, -0.18 + i * 0.036, Math.sin(i * 2.4) * 0.1);
    p.rotation.set(i * 1.3, i * 0.9, i * 0.5);
  }

  /* ---------- window, snow, parol ---------- */
  const win = group(scene, 1.35, 3.0, -3.94);
  add(win, box(2.3, 2.7, 0.1), M(0xf3e2bd), 0, 0, 0);
  add(win, new THREE.PlaneGeometry(2.0, 2.4), B(0x0d1b3a), 0, 0, 0.06, false);
  add(win, new THREE.CircleGeometry(0.22, 18), B(0xf4f0d8), 0.55, 0.7, 0.065, false);
  add(win, box(0.07, 2.4, 0.04), M(0xf3e2bd), 0, 0, 0.09);
  add(win, box(2.0, 0.07, 0.04), M(0xf3e2bd), 0, 0, 0.09);
  add(win, box(2.6, 0.12, 0.3), M(0xf3e2bd), 0, -1.38, 0.1);
  const SNOW = 70, snowPos = new Float32Array(SNOW * 3), snowV = [];
  for (let i = 0; i < SNOW; i++) { snowPos[i * 3] = (Math.random() * 2 - 1) * 0.97; snowPos[i * 3 + 1] = (Math.random() * 2 - 1) * 1.17; snowPos[i * 3 + 2] = 0.07; snowV.push(0.15 + Math.random() * 0.3); }
  const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  win.add(new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06 })));
  /* parol: the Filipino star lantern */
  const parol = group(scene, 1.35, 4.25, -3.3);
  add(parol, cyl(0.01, 0.01, 1.2, 4), black, 0, 0.6, 0, false);
  const parolBody = group(parol, 0, -0.55, 0);
  add(parolBody, starGeo(0.5, 0.21, 0.1), B(0xffd978), 0, 0, 0, false);
  add(parolBody, starGeo(0.24, 0.1, 0.14), B(0xff6b5a), 0, 0, 0, false);
  add(parolBody, new THREE.TorusGeometry(0.56, 0.03, 6, 24), B(0xff6b5a), 0, 0, 0, false);
  [-0.3, 0.3].forEach((x) => { const t = add(parolBody, cone(0.06, 0.4, 6), B(0xfff3dc), x, -0.72, 0, false); t.rotation.z = Math.PI; });
  const parolLight = new THREE.PointLight(0xffd27a, 0.5, 5); parolLight.position.set(1.35, 3.7, -2.6); scene.add(parolLight);

  /* ---------- tree and presents ---------- */
  const tree = group(scene, 3.9, 0, -2.3);
  add(tree, cyl(0.22, 0.26, 0.7, 8), wood, 0, 0.35, 0);
  const pineM = M(0x1f6b45), pineM2 = M(0x237a4e);
  [[1.55, 1.5, 0.6], [1.25, 1.4, 1.45], [0.95, 1.3, 2.25], [0.6, 1.1, 3.0]].forEach(([R, h, y0], t) => {
    add(tree, cone(R, h, 9), t % 2 ? pineM2 : pineM, 0, y0 + h / 2, 0);
    const n = 9 - t * 2;
    for (let i = 0; i < n; i++) {
      const f = 0.12 + ((i * 0.37) % 0.6), a = i / n * 6.283 + t, r = R * (1 - f) + 0.04;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, y = y0 + f * h;
      if (i % 2) bulb(tree, LIGHTS[(i + t) % LIGHTS.length], x, y, z, 0.07);
      else add(tree, sph(0.1, 8, 6), M([0xc2283a, 0xf2c14e, 0xfff3dc][(i / 2 + t) % 3 | 0], { metalness: 0.5, roughness: 0.3, flatShading: false }), x, y, z);
    }
  });
  const treeStar = add(tree, starGeo(0.34, 0.14, 0.1), B(0xffd45e), 0, 4.35, 0, false);
  [[-1.5, 0.5, 0.9, 0xc2283a, 0xf2c14e], [-0.7, 0.7, 1.5, 0xfff3dc, 0xc2283a], [0.5, 0.45, 1.6, 0x2f7d57, 0xfff3dc], [1.5, 0.6, 0.7, 0xf2c14e, 0xc2283a], [-1.75, 0.38, 1.75, 0x3d6fb0, 0xfff3dc]].forEach(([x, s, z, c, r], i) => {
    const p = group(tree, x, s / 2, z); p.rotation.y = i * 0.7;
    add(p, box(s, s, s), M(c));
    add(p, box(s + 0.02, s + 0.02, s * 0.16), M(r));
    add(p, box(s * 0.16, s + 0.02, s + 0.02), M(r));
    add(p, sph(s * 0.14, 6, 5), M(r), 0, s / 2 + 0.04, 0);
  });

  /* ---------- guests ---------- */
  const SKINS = [0xe8b08a, 0xc98a5e, 0xf0c3a0, 0xb9794f], HAIRS = [0x2a1a14, 0x15100e, 0x4a2a18, 0x3a2418];
  const hashId = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const guests = [];
  let meId = null, firstSync = true, guestScale = 1, now = 0;

  function buildGuest(d) {
    const h = hashId(d.id), isMe = d.id === meId;
    const groupRoot = group(scene);
    const pants = M(0x2c3550), sw = M(d.sweater), sk = M(SKINS[h % 4]);
    const wearsHat = isMe || (h >> 6) % 2 === 0;
    [-1, 1].forEach((s) => {
      const leg = add(groupRoot, sph(0.16, 8, 6), pants, s * 0.17, 0.12, 0.2); leg.scale.set(1.7, 0.75, 1); leg.rotation.y = s * 0.5;
      const arm = add(groupRoot, cyl(0.07, 0.065, 0.36, 6), sw, s * 0.27, 0.4, 0.09); arm.rotation.set(-0.5, 0, s * 0.35);
      add(groupRoot, sph(0.07, 6, 5), sk, s * 0.2, 0.22, 0.25);
    });
    add(groupRoot, cyl(0.2, 0.26, 0.46, 9), sw, 0, 0.42, 0);
    add(groupRoot, cyl(0.21, 0.21, 0.06, 9), M(0xfff8ec), 0, 0.64, 0);
    const head = group(groupRoot, 0, 0.87, 0);
    add(head, sph(0.2, 10, 8), sk);
    const hair = add(head, new THREE.SphereGeometry(0.215, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), M(HAIRS[(h >> 3) % 4]), 0, 0.01, -0.01); hair.rotation.x = -0.3;
    add(head, sph(0.026, 6, 5), M(0x1c1416), -0.07, 0.01, 0.186);
    add(head, sph(0.026, 6, 5), M(0x1c1416), 0.07, 0.01, 0.186);
    if (wearsHat) {
      add(head, cyl(0.205, 0.205, 0.07, 10), M(0xfff8ec), 0, 0.13, 0);
      const c = add(head, cone(0.18, 0.32, 8), M(0xc2283a), 0.03, 0.31, 0); c.rotation.z = -0.2;
      add(head, sph(0.055, 6, 5), M(0xfff8ec), 0.09, 0.47, 0);
    }
    const gift = paperRoll(groupRoot, 0, 0.3, 0.3);
    gift.scale.setScalar(1.7);
    const el = document.createElement('div');
    labels.appendChild(el);
    return { id: d.id, root: groupRoot, head, gift, el, hat: wearsHat, picked: false, flying: 0, pos: new THREE.Vector3(), target: new THREE.Vector3(), face: 0, hopT: -9, phase: (h % 628) / 100, born: -9 };
  }
  function destroyGuest(g) {
    scene.remove(g.root); g.el.remove();
    g.root.traverse((o) => { if (o.isMesh && o.geometry !== paperGeo && o.geometry !== bandGeo) { o.geometry.dispose(); if (o.material !== paperM && o.material !== bandM) o.material.dispose(); } });
  }
  function seatAll() {
    const n = guests.length, a0 = -50 * Math.PI / 180, span = 280 * Math.PI / 180;
    guestScale = n <= 10 ? 1 : Math.max(0.6, Math.pow(10 / n, 0.75));
    const grow = n <= 10 ? 1 : Math.min(1.18, 1 + (n - 10) * 0.012);
    guests.forEach((g, i) => {
      const a = a0 + (i + 0.5) / n * span;
      g.target.set(RING.cx + Math.cos(a) * RING.rx * grow, 0.03, RING.cz + Math.sin(a) * RING.rz * grow);
      g.face = Math.atan2(RING.cx - g.target.x, RING.cz - g.target.z);
    });
  }
  function setGuests(list, me) {
    meId = me || null;
    const byId = new Map(guests.map((g) => [g.id, g]));
    const keep = new Set(list.map((d) => d.id));
    guests.filter((g) => !keep.has(g.id)).forEach(destroyGuest);
    let order = list.slice();
    const mi = order.findIndex((d) => d.id === meId);
    if (mi >= 0) { const shift = (mi - Math.floor(order.length / 2) + order.length) % order.length; order = order.slice(shift).concat(order.slice(0, shift)); }
    const fresh = [];
    const next = order.map((d) => {
      let g = byId.get(d.id);
      // rebuild when "me" changes so the hat and label match
      if (g && (g.isMe !== (d.id === meId))) { destroyGuest(g); g = null; }
      if (!g) { g = buildGuest(d); g.isMe = d.id === meId; fresh.push(g); }
      g.picked = !!d.hasPicked;
      g.gift.visible = g.picked && !g.flying;
      g.el.className = 'label' + (g.isMe ? ' you' : '');
      g.el.textContent = g.isMe ? d.name + ' (you)' : d.name;
      return g;
    });
    guests.length = 0; guests.push(...next);
    seatAll();
    fresh.forEach((g) => { g.pos.copy(g.target); g.root.rotation.y = g.face; if (!firstSync && !byId.has(g.id)) g.born = now; });
    if (list.length) firstSync = false;
  }
  const byId = (id) => guests.find((g) => g.id === id);
  const headOf = (g, dy) => new THREE.Vector3(g.pos.x, g.pos.y + dy * guestScale, g.pos.z);

  /* ---------- star, confetti, timeline ---------- */
  const star = add(scene, starGeo(0.36, 0.15, 0.1), B(0xffd45e), 0, 0, 0, false);
  star.visible = false;
  let starId = null;

  const CONF = 110, confPos = new Float32Array(CONF * 3), confCol = new Float32Array(CONF * 3), confVel = [];
  const confGeo = new THREE.BufferGeometry();
  confGeo.setAttribute('position', new THREE.BufferAttribute(confPos, 3));
  confGeo.setAttribute('color', new THREE.BufferAttribute(confCol, 3));
  const conf = new THREE.Points(confGeo, new THREE.PointsMaterial({ size: 0.13, vertexColors: true, transparent: true }));
  conf.visible = false; conf.frustumCulled = false; scene.add(conf);
  let confT = -9;
  function burst(id) {
    const g = byId(id); if (!g) return;
    const p = headOf(g, 1.2), c = new THREE.Color();
    for (let i = 0; i < CONF; i++) {
      confPos.set([p.x, p.y, p.z], i * 3);
      const a = Math.random() * 6.283, s = 1 + Math.random() * 2.2;
      confVel[i] = [Math.cos(a) * s, 2.5 + Math.random() * 3, Math.sin(a) * s];
      c.setHex(LIGHTS[i % LIGHTS.length]); confCol.set([c.r, c.g, c.b], i * 3);
    }
    confGeo.attributes.color.needsUpdate = true;
    confT = now; conf.visible = true;
  }

  const tweens = [];
  const easeIO = (k) => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  function tween(delay, dur, fn) { tweens.push({ t0: now + delay, dur, fn }); }
  function runTweens() {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      if (now < tw.t0) continue;
      const k = Math.min(1, (now - tw.t0) / tw.dur);
      tw.fn(easeIO(k));
      if (k >= 1) tweens.splice(tweens.indexOf(tw), 1);
    }
  }

  function setJarRaised(up) {
    const from = armLift, to = up ? 1 : 0;
    tween(0, 0.5, (k) => { armLift = from + (to - from) * k; });
  }
  /** A paper flies from the jar to a guest, who then holds it. */
  function flyPaper(id) {
    const g = byId(id); if (!g) return;
    g.flying += 1; g.gift.visible = false;
    const paper = paperRoll(scene); paper.scale.setScalar(1.9);
    const from = new THREE.Vector3(); jar.getWorldPosition(from);
    tween(0, 0.9, (k) => {
      paper.position.lerpVectors(from, headOf(g, 0.5), k); paper.position.y += Math.sin(Math.PI * k) * 1.6;
      paper.rotation.set(k * 9, k * 5, 0);
      if (k >= 1) { scene.remove(paper); g.flying -= 1; g.gift.visible = g.picked && !g.flying; g.hopT = now; }
    });
  }

  let bubbleUntil = -9;
  function say(text, secs) { bubble.textContent = text; bubble.classList.add('on'); bubbleUntil = now + (secs || 1.8); }
  function hush() { bubbleUntil = now; }

  const v = new THREE.Vector3();
  function place(el, p, dx, dy, center) {
    v.copy(p).project(camera);
    const x = (v.x * 0.5 + 0.5) * root.clientWidth + (dx || 0), y = (-v.y * 0.5 + 0.5) * root.clientHeight + (dy || 0);
    el.style.transform = center ? `translate(${x}px, ${y}px) translate(-50%, -100%)` : `translate(${x}px, ${y}px)`;
  }

  /* ---------- resize and pointer ---------- */
  function fit() {
    const w = root.clientWidth, h = root.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false);
    const asp = w / h, portrait = asp < 1;
    camera.aspect = asp; camera.fov = portrait ? 52 : 40;
    const t = Math.tan(camera.fov * Math.PI / 360), z = Math.max(11, (portrait ? 5.2 : 6.3) / (t * asp) - 3);
    camBase.set(0, z * 0.5, z);
    scene.fog.near = z + 6; scene.fog.far = z + 32;
    if (portrait) camera.setViewOffset(w, h, 0, h * 0.16, w, h);
    else if (w >= 900) camera.setViewOffset(w, h, w * 0.1, h * 0.03, w, h);
    else if (w >= 600 && h <= 560) camera.setViewOffset(w, h, w * 0.19, 0, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(fit); ro.observe(root); fit();
  let px = 0, py = 0, cx = 0, cy = 0;
  const onMove = (e) => { px = e.clientX / root.clientWidth * 2 - 1; py = e.clientY / root.clientHeight * 2 - 1; };
  root.addEventListener('pointermove', onMove);

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  let raf = 0, dead = false;
  function frame() {
    if (dead) return;
    const dt = Math.min(clock.getDelta(), 0.1); now += dt;
    runTweens();

    if (!reduce) { cx += (px - cx) * 0.04; cy += (py - cy) * 0.04; }
    camera.position.set(camBase.x + cx * 0.7, camBase.y - cy * 0.35, camBase.z);
    camera.lookAt(LOOK);

    const flick = 0.85 + Math.sin(now * 11) * 0.08 + Math.sin(now * 23.7) * 0.07;
    fireLight.intensity = 1.5 * flick;
    flames.forEach(({ f, h, i }) => { const s = 1 + Math.sin(now * 9 + i * 2.1) * 0.22; f.scale.set(1 + Math.sin(now * 7 + i) * 0.12, s, 1); f.position.y = 0.42 + h * s / 2; });
    twinkles.forEach((t) => { t.m.material.color.copy(t.base).multiplyScalar(0.55 + 0.45 * Math.sin(now * t.speed + t.phase)); });
    treeStar.rotation.y = now * 0.8;
    parolBody.rotation.z = Math.sin(now * 0.9) * 0.08; parolBody.rotation.y = Math.sin(now * 0.6) * 0.3;
    for (let i = 0; i < SNOW; i++) { snowPos[i * 3 + 1] -= snowV[i] * dt; snowPos[i * 3] += Math.sin(now + i) * 0.0015; if (snowPos[i * 3 + 1] < -1.17) snowPos[i * 3 + 1] = 1.17; }
    snowGeo.attributes.position.needsUpdate = true;

    santaBody.scale.y = 1.08 + Math.sin(now * 1.6) * 0.02;
    santaHead.rotation.z = Math.sin(now * 0.8) * 0.05; santaHead.rotation.x = Math.sin(now * 1.6) * 0.03;
    armL.rotation.x = armR.rotation.x = ARM_REST - 0.3 * armLift + Math.sin(now * 1.6) * 0.02;
    jar.position.y = JAR_Y + 0.26 * armLift + Math.sin(now * 1.6) * 0.012;

    const kf = 1 - Math.exp(-dt * 5);
    guests.forEach((g) => {
      g.pos.lerp(g.target, kf);
      let y = g.pos.y, s = guestScale;
      const hk = (now - g.hopT) / 0.38; if (hk >= 0 && hk < 1) y += Math.sin(Math.PI * hk) * 0.38;
      const bk = (now - g.born) / 0.7;
      if (bk >= 0 && bk < 1) { const e = 1 - Math.pow(1 - bk, 3); s *= e * (1 + Math.sin(bk * Math.PI) * 0.25); y += (1 - e) * 2.2; }
      g.root.position.set(g.pos.x, y, g.pos.z); g.root.scale.setScalar(Math.max(s, 0.001));
      g.root.rotation.y += (g.face - g.root.rotation.y) * kf * 1.4;
      g.root.rotation.z = Math.sin(now * 1.3 + g.phase) * 0.035;
      g.head.rotation.y = Math.sin(now * 0.7 + g.phase) * 0.25; g.head.rotation.x = Math.sin(now * 1.1 + g.phase) * 0.06;
      v.set(g.pos.x, y + (g.hat ? 1.5 : 1.25) * guestScale, g.pos.z);
      place(g.el, v.clone(), 0, 0, true);
    });

    const sg = starId && byId(starId);
    star.visible = !!sg;
    if (sg) { star.position.copy(headOf(sg, 1.85)); star.position.y += Math.sin(now * 3) * 0.06; star.rotation.y = now * 2.4; }

    if (conf.visible) {
      const a = now - confT;
      if (a > 2) conf.visible = false;
      else {
        for (let i = 0; i < CONF; i++) { const cv = confVel[i]; cv[1] -= 7 * dt; confPos[i * 3] += cv[0] * dt; confPos[i * 3 + 1] = Math.max(0.05, confPos[i * 3 + 1] + cv[1] * dt); confPos[i * 3 + 2] += cv[2] * dt; }
        confGeo.attributes.position.needsUpdate = true; conf.material.opacity = Math.min(1, (2 - a) * 1.5);
      }
    }
    if (now > bubbleUntil) bubble.classList.remove('on');
    santaHead.getWorldPosition(v); place(bubble, v.clone().setY(v.y + 1.0), 18, -30, false);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  function dispose() {
    dead = true; cancelAnimationFrame(raf); ro.disconnect();
    root.removeEventListener('pointermove', onMove);
    labels.textContent = '';
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); });
    renderer.dispose();
  }

  return { setGuests, setStar: (id) => { starId = id || null; }, setJarRaised, flyPaper, burst, say, hush, dispose };
}
