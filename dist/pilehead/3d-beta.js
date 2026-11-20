/* STACK 3D BETA: presentation-only adapter for the canonical local and online tables.
 * Three.js NEVER owns cards, validates moves, or reads hidden opponent state.
 * The existing semantic buttons remain the only game interaction targets.
 */
(() => {
  'use strict';
  const app = document.getElementById('app');
  const root = document.documentElement;
  const body = document.body;
  if (!app || !body.classList.contains('stack-3d-beta')) return;
  const status = document.getElementById('stack-3d-status');
  const search = new URLSearchParams(location.search);
  if (search.has('room') || search.has('online')) {
    const classic = document.querySelector('.beta-classic-link');
    if (classic) classic.href = 'index.html' + location.search;
  }
  let canvas = null, renderer = null, scene = null, camera = null, THREE = null;
  let sheetImages = {}, textures = new Map(), cards = new Map();
  let table = null, drawWidth = 0, drawHeight = 0, lastTime = 0, frameId = 0;
  let refreshing = false, isReady = false, shadowTexture = null, observer = null;
  const MAX_DPR = matchMedia('(max-width: 700px)').matches ? 1.3 : 1.65;
  const faceNames = Array.from({length: 10}, (_, i) => 'number-' + (i + 1))
    .concat(['reset', 'ghost', 'under', 'skip', 'burn', 'dump']);
  const facePositions = Object.fromEntries(faceNames.map((name, i) => [name, [i % 4, Math.floor(i / 4)]]));

  function report(message) { if (status) status.textContent = message; }
  function fallback(message) {
    isReady = false;
    body.classList.remove('stack-3d-ready');
    canvas && (canvas.style.display = 'none');
    report(message || 'Classic rendering (3D unavailable)');
  }
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not load ' + src));
      image.src = src;
    });
  }
  function theme() {
    return window.StackDeckThemes?.get?.() || 'characters';
  }
  function makeTexture(name) {
    const mode = theme();
    const key = mode + ':' + name;
    if (textures.has(key)) return textures.get(key);
    const image = name === 'back' ? sheetImages.back :
      (mode === 'characters' ? sheetImages.characters : sheetImages.geometry);
    if (!image) return null;
    const el = document.createElement('canvas');
    if (name === 'back') {
      el.width = image.naturalWidth;
      el.height = image.naturalHeight;
      el.getContext('2d').drawImage(image, 0, 0);
    } else {
      const pos = facePositions[name];
      if (!pos) return null;
      el.width = Math.round(image.naturalWidth / 4);
      el.height = Math.round(image.naturalHeight / 4);
      const w = image.naturalWidth / 4, h = image.naturalHeight / 4;
      el.getContext('2d').drawImage(image, pos[0] * w, pos[1] * h, w, h,
        0, 0, el.width, el.height);
    }
    const texture = new THREE.CanvasTexture(el);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    textures.set(key, texture);
    return texture;
  }
  function shadowMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 180;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 89, 8, 64, 90, 83);
    grad.addColorStop(0, 'rgba(0,0,0,.72)');
    grad.addColorStop(.5, 'rgba(0,0,0,.40)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 180);
    return new THREE.CanvasTexture(canvas);
  }
  function cardFace(element) {
    if (element.classList.contains('ph-back')) return 'back';
    const raster = element.querySelector('[data-card-art]');
    if (raster?.dataset.cardArt) return raster.dataset.cardArt;
    const label = (element.getAttribute('aria-label') || '').toLowerCase();
    const numeric = label.match(/number\s+(\d+)/);
    if (numeric) return 'number-' + numeric[1];
    const action = ['reset','ghost','under','skip','burn','dump'].find(a => label.includes(a));
    return action || null;
  }
  function cardId(element, face) {
    if (element.dataset.card) return 'id:' + element.dataset.card;
    if (element.dataset.blind) return 'blind:' + element.dataset.blind;
    const pile = element.closest('.pile-card');
    if (pile) {
      const stack = pile.closest('.stack');
      const stackIndex = Array.from(stack?.parentElement?.children || []).indexOf(stack);
      return 'stack:' + stackIndex + ':slot:' + Array.from(pile.querySelectorAll('.card.ph-card')).indexOf(element);
    }
    return 'display:' + face + ':' + Array.from(element.parentElement?.children || []).indexOf(element);
  }
  function makeCard(element, face, id) {
    const front = new THREE.MeshStandardMaterial({
      map: makeTexture(face), roughness: .82, metalness: 0, color: 0xffffff
    });
    const reverse = new THREE.MeshStandardMaterial({
      map: makeTexture('back'), roughness: .85, metalness: 0
    });
    const edge = new THREE.MeshStandardMaterial({color: 0xf2e5cc, roughness: .95});
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1.8),
      [edge,edge,edge,edge,front,reverse]);
    mesh.position.set(0, -30, 3);
    mesh.scale.set(1, 1, 1);
    mesh.renderOrder = 2;
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({map: shadowTexture, transparent: true, opacity: .56,
        depthWrite: false, polygonOffset: true, polygonOffsetFactor: 1}));
    shadow.position.z = -6;
    shadow.renderOrder = 1;
    scene.add(shadow); scene.add(mesh);
    return {id, element, mesh, shadow, face, width: 1, height: 1, seen: true, new: true};
  }
  function discardCard(card) {
    scene.remove(card.mesh); scene.remove(card.shadow);
    card.mesh.geometry.dispose();
    card.mesh.material.forEach(material => material.dispose());
    card.shadow.geometry.dispose();
    card.shadow.material.dispose();
  }
  function mount() {
    const next = app.querySelector('.table');
    if (table === next) return;
    cards.forEach(discardCard); cards.clear();
    table = next;
    if (canvas) canvas.remove();
    if (!table || !canvas) return;
    table.insertBefore(canvas, table.firstChild);
    canvas.style.display = '';
    resize();
  }
  function resize() {
    if (!table || !renderer || !canvas) return;
    const width = Math.round(table.clientWidth);
    const height = Math.round(table.clientHeight);
    if (!width || !height) return;
    if (width === drawWidth && height === drawHeight) return;
    drawWidth = width; drawHeight = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.updateProjectionMatrix();
  }
  function updateCards(dt) {
    if (!table || !table.isConnected || !canvas) return;
    resize();
    const canvasRect = canvas.getBoundingClientRect();
    if (!canvasRect.width || !canvasRect.height) return;
    const seen = new Set();
    const elements = table.querySelectorAll('.card.ph-card:not(.card-ghost)');
    const interpolant = 1 - Math.exp(-Math.min(.075, dt) * 15);
    for (const element of elements) {
      const face = cardFace(element);
      if (!face || !makeTexture(face)) continue;
      const id = cardId(element, face);
      seen.add(id);
      let entry = cards.get(id);
      if (entry && entry.face !== face) {
        discardCard(entry); cards.delete(id); entry = null;
      }
      if (!entry) {
        entry = makeCard(element, face, id); cards.set(id, entry);
      }
      entry.element = element;
      const bounds = element.getBoundingClientRect();
      if (bounds.width < 5 || bounds.height < 5) continue;
      const x = bounds.left + bounds.width / 2 - canvasRect.left - canvasRect.width / 2;
      const y = canvasRect.height / 2 - (bounds.top + bounds.height / 2 - canvasRect.top);
      const selected = element.classList.contains('selected');
      const hovering = element.matches(':hover') && !element.disabled;
      const z = selected ? 24 : hovering ? 14 : 4;
      const targetY = y + (selected ? 5 : hovering ? 3 : 0);
      const transform = getComputedStyle(element).transform;
      let angle = 0;
      if (transform && transform !== 'none') {
        const match = transform.match(/^matrix\(([-+\d.eE]+),\s*([-+\d.eE]+)/);
        if (match) angle = Math.atan2(Number(match[2]), Number(match[1]));
      }
      angle = Math.max(-.22, Math.min(.22, angle));
      if (entry.new) {
        entry.mesh.position.set(x, targetY - 14, z);
        entry.mesh.scale.set(bounds.width * .94, bounds.height * .94, 1);
        entry.new = false;
      }
      entry.mesh.position.x += (x - entry.mesh.position.x) * interpolant;
      entry.mesh.position.y += (targetY - entry.mesh.position.y) * interpolant;
      entry.mesh.position.z += (z - entry.mesh.position.z) * interpolant;
      entry.mesh.scale.x += (bounds.width - entry.mesh.scale.x) * interpolant;
      entry.mesh.scale.y += (bounds.height - entry.mesh.scale.y) * interpolant;
      entry.mesh.rotation.z += (angle - entry.mesh.rotation.z) * interpolant;
      entry.mesh.rotation.x += ((hovering ? -.07 : -.018) - entry.mesh.rotation.x) * interpolant;
      entry.mesh.rotation.y += ((selected ? .065 : 0) - entry.mesh.rotation.y) * interpolant;
      entry.shadow.position.x = entry.mesh.position.x + 8;
      entry.shadow.position.y = entry.mesh.position.y - 9;
      entry.shadow.scale.set(bounds.width * 1.3, bounds.height * 1.32, 1);
      entry.shadow.material.opacity = selected ? .82 : .46;
    }
    for (const [id, card] of cards) {
      if (!seen.has(id)) {discardCard(card); cards.delete(id);}
    }
  }
  function animate(time) {
    frameId = requestAnimationFrame(animate);
    if (document.hidden || !table || !table.isConnected) return;
    const dt = Math.max(.001, Math.min(.06, (time - (lastTime || time)) / 1000));
    lastTime = time;
    updateCards(dt);
    renderer.render(scene, camera);
  }
  async function start() {
    report('Loading 3D tabletop…');
    try {
      THREE = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
      if (!window.WebGLRenderingContext) throw new Error('WebGL unsupported');
      [sheetImages.geometry, sheetImages.characters, sheetImages.back] = await Promise.all([
        loadImage('assets/stack-sheet.webp'),
        loadImage('assets/stack-characters.webp'),
        loadImage('assets/stack-back.webp')
      ]);
      canvas = document.createElement('canvas');
      canvas.className = 'stack-beta-three-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true, powerPreference:'low-power'});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(37, 1, 0.1, 4000);
      scene.add(new THREE.AmbientLight(0xffffff, 2.0));
      const keyLight = new THREE.DirectionalLight(0xffe0b0, 2.4);
      keyLight.position.set(-260, 320, 490);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xa8d6e5, 1.0);
      fillLight.position.set(280, -230, 300);
      scene.add(fillLight);
      shadowTexture = shadowMap();
      mount();
      const themeMode = theme();
      isReady = true;
      body.classList.toggle('stack-3d-ready', themeMode !== 'studio');
      report(themeMode === 'studio' ? 'Studio deck uses classic rendering' : '3D tabletop beta · live');
      observer = new MutationObserver(() => {
        if (refreshing) return;
        refreshing = true;
        requestAnimationFrame(() => {refreshing = false; mount();});
      });
      observer.observe(app, {childList:true, subtree:true});
      window.addEventListener('resize', resize, {passive:true});
      window.addEventListener('stack-deck-theme-change', () => {
        const studio = theme() === 'studio';
        body.classList.toggle('stack-3d-ready', !studio);
        if (canvas) canvas.style.display = studio ? 'none' : '';
        report(studio ? 'Studio deck uses classic rendering' : '3D tabletop beta · live');
        cards.forEach(discardCard); cards.clear();
        textures.forEach(texture => texture.dispose()); textures.clear();
      });
      requestAnimationFrame(animate);
      window.addEventListener('pagehide', () => {
        cancelAnimationFrame(frameId);
        observer?.disconnect();
        cards.forEach(discardCard); cards.clear();
        textures.forEach(texture => texture.dispose());
        shadowTexture?.dispose();
        renderer?.dispose();
      }, {once:true});
    } catch (error) {
      console.warn('[STACK beta] 3D fallback:', error);
      fallback('3D unavailable · classic game still playable');
      renderer?.dispose();
    }
  }
  // Keep the currently selected deck in classic mode; fresh beta visits use illustrated cards.
  try {
    if (!localStorage.getItem('stack-deck-theme-v1')) window.StackDeckThemes?.set?.('characters');
  } catch (_) { /* Storage may be disabled */ }
  start();
})();