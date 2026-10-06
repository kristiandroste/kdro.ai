// kdro.ai: the strand in the baabaa card and the EEG trace in the IntoMind card. No libraries.
(function () {
  'use strict';
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- the strand: what baabaa draws while it works, fed by a stand-in for a model ---------------------
  const host = document.getElementById('strand');
  if (host && window.BaabaaThread) {
    const thread = new window.BaabaaThread.Thread(host, { width: 300, still });
    const label = document.getElementById('strandLabel');
    const words = ('The test counts tags, not sheep. A sheep read twice is counted twice, so the fix is one line.\n\n'
      + 'Let me read the file before changing anything, then run the tests again.\n\n').match(/\S+\s*/g);
    const acts = [['wait', 1.8, 'Waiting for the GPU'], ['think', 8, 'Thinking…'], ['tool', 2.6, 'Running a command…'],
      ['think', 4.5, 'Thinking…'], ['write', 6, ''], ['wait', 1.2, '']];
    let act = -1, left = 0, at = 0, owed = 0, last = 0, shown = null;
    const next = () => { act = (act + 1) % acts.length; left = acts[act][1]; thread.set(acts[act][0]); };
    next();
    if (still) { thread.set('think'); for (let i = 0; i < 40; i++) thread.pulse(words[i % words.length]); thread.settle(); thread.draw(); label.textContent = 'Thinking…'; }
    else {
      const tick = ms => {
        const dt = Math.max(0, Math.min((ms - last) / 1000, 0.05));
        last = ms;
        if (!document.hidden) {
          left -= dt;
          if (left <= 0) next();
          const mode = acts[act][0];
          if (mode === 'think' || mode === 'write') {
            owed += 28 * 4 * dt;
            while (owed >= words[at].length) { owed -= words[at].length; thread.pulse(words[at]); at = (at + 1) % words.length; }
          }
          const text = mode === 'think' ? `Thinking… ${Math.max(1, Math.round(thread.seconds))} s` : acts[act][2];
          if (text !== shown) { shown = text; label.textContent = text; }
          thread.step(dt);
          thread.draw();
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(ms => { last = ms; requestAnimationFrame(tick); });
    }
  }

  // ---- the EEG trace: a few channels scrolling by, as on a monitor ------------------------------------------
  const eeg = document.getElementById('eeg');
  if (eeg) {
    const ctx = eeg.getContext('2d'), W = eeg.width, H = eeg.height, CH = 4, N = 320;
    const rows = [];
    for (let c = 0; c < CH; c++) rows.push({ v: new Float32Array(N), phase: Math.random() * 6.28, f: 9 + Math.random() * 3, drift: 0, blink: 0, y: (c + 1) * H / (CH + 1) });
    let t = 0, last = 0;
    function sample(r) {
      // a sleepy alpha rhythm under slow drift, plus a little noise; now and then an eye blink, which is slow and large
      r.drift += (Math.random() - 0.5) * 0.6; r.drift *= 0.98;
      const alpha = Math.sin(t * r.f + r.phase) * (0.55 + 0.45 * Math.sin(t * 0.37 + r.phase)) * 9;
      if (r.blink > 0) r.blink--;
      else if (Math.random() < 0.0012) r.blink = 36;
      const blink = r.blink > 0 ? Math.sin(r.blink / 36 * Math.PI) * 30 : 0;
      return alpha + r.drift + (Math.random() - 0.5) * 3.5 + blink;
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
      ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(178,107,255,.9)';
      rows.forEach((r, i) => {
        ctx.strokeStyle = i === 1 ? 'rgba(236,220,255,.95)' : 'rgba(190,130,255,.85)';
        ctx.beginPath();
        for (let k = 0; k < N; k++) {
          const x = k / (N - 1) * W, y = r.y - r.v[k];
          k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      });
      ctx.shadowBlur = 0;
    }
    for (let k = 0; k < N; k++) { t += 1 / 60; for (const r of rows) { r.v.copyWithin(0, 1); r.v[N - 1] = sample(r); } }
    draw();
    if (!still) {
      const tick = ms => {
        const dt = Math.max(0, Math.min((ms - last) / 1000, 0.05)); last = ms;
        if (!document.hidden && dt > 0) {
          t += dt;
          const steps = Math.max(1, Math.round(dt * 120));
          for (let s = 0; s < steps; s++) for (const r of rows) { r.v.copyWithin(0, 1); r.v[N - 1] = sample(r); }
          draw();
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(ms => { last = ms; requestAnimationFrame(tick); });
    }
  }
})();
