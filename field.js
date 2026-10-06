// kdro.ai: the field behind the page. Deep violet nebulae drift on a slow current; filaments grow along the same
// current, branch, and fade; glyphs ride it like spores; now and then a pulse runs down a filament. One 2-D canvas,
// no libraries. With reduced motion it draws a single still picture.
(function () {
  'use strict';
  const canvas = document.getElementById('field');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = Math.min(innerWidth, innerHeight) < 700;
  const TAU = Math.PI * 2;
  const trail = document.createElement('canvas'), tctx = trail.getContext('2d');   // filaments live here and fade slowly
  let W = 0, H = 0, dpr = 1, T = 0, last = 0;

  // ---- gradient noise in three dimensions (the third is time), Perlin's construction ------------------------
  const perm = new Uint8Array(512);
  (function () {
    const p = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = 20260;
    const rnd = () => (s = (s * 48271) % 2147483647) / 2147483647;
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  function grad(h, x, y, z) {
    const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }
  function noise(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z, B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return lerp(
      lerp(lerp(grad(perm[AA] & 15, x, y, z), grad(perm[BA] & 15, x - 1, y, z), u),
           lerp(grad(perm[AB] & 15, x, y - 1, z), grad(perm[BB] & 15, x - 1, y - 1, z), u), v),
      lerp(lerp(grad(perm[AA + 1] & 15, x, y, z - 1), grad(perm[BA + 1] & 15, x - 1, y, z - 1), u),
           lerp(grad(perm[AB + 1] & 15, x, y - 1, z - 1), grad(perm[BB + 1] & 15, x - 1, y - 1, z - 1), u), v), w);
  }
  // The current: the curl of a scalar noise field, so it swirls without sources or sinks, like a fluid.
  const SCALE = 0.0021;
  function flow(x, y) {
    const e = 0.9, s = SCALE;
    const dx = (noise((x + e) * s, y * s, T) - noise((x - e) * s, y * s, T)) / (2 * e);
    const dy = (noise(x * s, (y + e) * s, T) - noise(x * s, (y - e) * s, T)) / (2 * e);
    return Math.atan2(-dx, dy);
  }

  // ---- the things in the field ----------------------------------------------------------------------------
  const nebulae = [], filaments = [], glyphs = [], pulses = [];
  const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789αβγδθλμπσφψωΣΔΩ∿∫≈∞';
  const N_GLYPHS = small ? 60 : 150, N_FIL = small ? 10 : 22, N_NEB = small ? 5 : 7;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function seed() {
    nebulae.length = filaments.length = glyphs.length = pulses.length = 0;
    for (let i = 0; i < N_NEB; i++) {
      nebulae.push({ x: rnd(0, W), y: rnd(0, H), r: rnd(0.22, 0.42) * Math.max(W, H), hue: rnd(262, 292), a: rnd(0.16, 0.3), drift: rnd(0.2, 0.5) });
    }
    for (let i = 0; i < N_GLYPHS; i++) glyphs.push(newGlyph(true));
    while (filaments.length < N_FIL) filaments.push(newFilament());
  }
  function newGlyph(anywhere) {
    return { x: rnd(0, W), y: anywhere ? rnd(0, H) : rnd(0, H), ch: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
      life: rnd(0, 1), rate: rnd(0.08, 0.2), speed: rnd(14, 32), size: rnd(11, 15), bright: Math.random() < 0.08, tick: rnd(0, 1) };
  }
  function newFilament(x, y, a) {
    return { x: x == null ? rnd(0, W) : x, y: y == null ? rnd(0, H) : y, a: a == null ? rnd(0, TAU) : a,
      life: rnd(5, 13), age: 0, w: rnd(0.7, 1.9), pts: [], glow: Math.random() < 0.35, speed: rnd(55, 95) };
  }

  function stepFilaments(dt) {
    for (let i = filaments.length - 1; i >= 0; i--) {
      const f = filaments[i];
      const want = flow(f.x, f.y);
      let d = want - f.a;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      f.a += d * Math.min(1, 3.2 * dt) + (Math.random() - 0.5) * 0.9 * dt;        // it follows the current, with inertia and a wobble
      const nx = f.x + Math.cos(f.a) * f.speed * dt, ny = f.y + Math.sin(f.a) * f.speed * dt;
      const fresh = Math.min(1, f.age / 0.8), old = Math.max(0, 1 - (f.age - f.life + 2) / 2);
      const alpha = 0.55 * fresh * old;
      if (alpha > 0.01) {
        tctx.strokeStyle = f.glow ? `rgba(214,170,255,${alpha})` : `rgba(170,110,255,${alpha * 0.8})`;
        tctx.lineWidth = f.w * dpr;
        tctx.beginPath();
        tctx.moveTo(f.x * dpr, f.y * dpr);
        tctx.lineTo(nx * dpr, ny * dpr);
        tctx.stroke();
      }
      f.x = nx; f.y = ny; f.age += dt;
      f.pts.push(nx, ny);
      if (f.pts.length > 1200) f.pts.splice(0, 2);
      if (Math.random() < 0.55 * dt && filaments.length < N_FIL * 2) {
        filaments.push(newFilament(nx, ny, f.a + (Math.random() < 0.5 ? 1 : -1) * rnd(0.6, 1.3)));           // a branch
      }
      if (f.age > f.life || nx < -40 || ny < -40 || nx > W + 40 || ny > H + 40) filaments.splice(i, 1);
    }
    while (filaments.length < N_FIL) filaments.push(newFilament());
  }

  function stepGlyphs(dt) {
    for (const g of glyphs) {
      const a = flow(g.x, g.y);
      g.x += Math.cos(a) * g.speed * dt;
      g.y += Math.sin(a) * g.speed * dt + 6 * dt;                                       // and a slow fall, as in the film
      g.tick += dt;
      if (g.tick > 1 / g.rate * 0.25) { g.tick = 0; if (Math.random() < 0.5) g.ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)]; }
      g.life += dt * g.rate;
      if (g.life > 1 || g.x < -20 || g.x > W + 20 || g.y > H + 20) Object.assign(g, newGlyph(false), { y: g.y > H + 20 ? -10 : g.y, x: g.x < -20 || g.x > W + 20 ? rnd(0, W) : g.x });
    }
  }

  function stepPulses(dt) {
    if (!still && Math.random() < 0.9 * dt && pulses.length < 5) {
      const long = filaments.filter(f => f.pts.length > 80);
      if (long.length) pulses.push({ f: long[Math.floor(Math.random() * long.length)], at: 0, v: rnd(160, 260) });
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.at += p.v * dt;
      if (p.at * 2 >= p.f.pts.length - 2 || !filaments.includes(p.f)) pulses.splice(i, 1);
    }
  }

  function stepNebulae(dt) {
    for (const n of nebulae) {
      const a = flow(n.x, n.y);
      n.x += Math.cos(a) * 9 * n.drift * dt;
      n.y += Math.sin(a) * 9 * n.drift * dt;
      if (n.x < -n.r) n.x = W + n.r * 0.5; if (n.x > W + n.r) n.x = -n.r * 0.5;
      if (n.y < -n.r) n.y = H + n.r * 0.5; if (n.y > H + n.r) n.y = -n.r * 0.5;
    }
  }

  // ---- drawing --------------------------------------------------------------------------------------------
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#07040f';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    for (const n of nebulae) {                                                   // the nebulae
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, `hsla(${n.hue}, 90%, 46%, ${n.a})`);
      g.addColorStop(0.45, `hsla(${n.hue}, 85%, 34%, ${n.a * 0.45})`);
      g.addColorStop(1, 'hsla(270, 80%, 20%, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(trail, 0, 0);                                                  // the filaments
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    for (const g of glyphs) {                                                    // the glyphs
      const a = Math.sin(g.life * Math.PI);
      ctx.font = `${g.size}px "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace`;
      ctx.fillStyle = g.bright ? `rgba(236,220,255,${0.9 * a})` : `rgba(168,110,255,${0.42 * a})`;
      ctx.fillText(g.ch, g.x, g.y);
    }
    for (const f of filaments) {                                                 // the growing tips
      if (f.age < 0.3 || f.age > f.life - 1.5) continue;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 7);
      g.addColorStop(0, 'rgba(255,245,255,0.9)');
      g.addColorStop(0.3, 'rgba(214,170,255,0.5)');
      g.addColorStop(1, 'rgba(160,90,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(f.x - 7, f.y - 7, 14, 14);
    }
    for (const p of pulses) {                                                    // the pulses
      const i = Math.min(p.f.pts.length - 2, Math.floor(p.at) * 2), x = p.f.pts[i], y = p.f.pts[i + 1];
      const g = ctx.createRadialGradient(x, y, 0, x, y, 11);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.25, 'rgba(230,200,255,0.7)');
      g.addColorStop(1, 'rgba(180,110,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 11, y - 11, 22, 22);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function fadeTrail(dt) {
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.globalCompositeOperation = 'destination-out';
    tctx.fillStyle = `rgba(0,0,0,${Math.min(1, 0.22 * dt)})`;
    tctx.fillRect(0, 0, trail.width, trail.height);
    tctx.globalCompositeOperation = 'source-over';
  }

  function step(dt) {
    T += dt * 0.045;
    fadeTrail(dt);
    stepNebulae(dt);
    stepFilaments(dt);
    stepGlyphs(dt);
    stepPulses(dt);
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, small ? 1 : 1.5);
    W = innerWidth; H = innerHeight;
    canvas.width = trail.width = Math.round(W * dpr);
    canvas.height = trail.height = Math.round(H * dpr);
    tctx.lineCap = 'round';
    seed();
    if (still) {                                       // one picture, grown in silence
      for (let i = 0; i < 420; i++) step(1 / 50);
      draw();
    }
  }
  resize();
  let timer = null;
  addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(resize, 150); });

  if (!still) {
    const tick = ms => {
      const dt = Math.max(0, Math.min((ms - last) / 1000, 0.05));
      last = ms;
      if (!document.hidden) { step(dt); draw(); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(ms => { last = ms; requestAnimationFrame(tick); });
  }
})();
