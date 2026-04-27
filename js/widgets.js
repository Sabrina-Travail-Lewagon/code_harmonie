/* =============================================================
   widgets.js — Composants visuels interactifs (vanilla SVG/DOM)
   - Fretboard SVG : grande taille, chaque note cliquable joue le son
   - Boutons "▶ Écouter" : lit accord, gamme ou intervalle
   - Diagramme d'accord (mini fretboard 5 cases) avec lecture au clic
   - Auto-init via attributs data-* (data-chord, data-scale-tonic, data-play)
   ============================================================= */

(function () {
  'use strict';
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function svg(tag, attrs = {}, children = []) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    children.forEach(c => el.appendChild(c));
    return el;
  }

  function playNote(midi) {
    if (window.AudioEngine) AudioEngine.pluck(midi, 0, 1.0, 0.4);
  }

  /* ---------------------------------------------------------------
     FRETBOARD COMPLET (toutes les cordes)
     data-instrument="ukulele|guitar"
     data-chord="C"          → affiche un accord (cases 1-5)
     data-scale-tonic="C"    → affiche une gamme
     data-scale-key="major|minor|pentaMaj|pentaMin|blues"
     data-frets="12"
     data-show-all="true"    → affiche TOUTES les notes (pas seulement la gamme)
  --------------------------------------------------------------- */

  function renderFretboard(host) {
    const instrument = host.dataset.instrument || 'ukulele';
    const chordName  = host.dataset.chord || null;
    const scaleTonic = host.dataset.scaleTonic || null;
    const scaleKey   = host.dataset.scaleKey || 'major';
    const showAll    = host.dataset.showAll === 'true';

    const tun = MT.TUNINGS[instrument];
    if (!tun) return;

    // Pour un accord : 5 cases. Pour une gamme : 12.
    const numFrets = parseInt(host.dataset.frets, 10) || (chordName ? 5 : 12);

    // Dimensions inspirées de l'original (grand manche, lisible)
    const W = 820;
    const numStrings = tun.strings.length;
    const H = numStrings * 38 + 40;
    const padL = 44, padR = 22, padT = 24, padB = 16;
    const gridW = W - padL - padR;
    const gridH = H - padT - padB;
    const fretW = gridW / numFrets;
    const stringGap = numStrings > 1 ? gridH / (numStrings - 1) : 0;

    const scaleSemis = scaleTonic ? MT.scaleNotes(scaleTonic, scaleKey) : null;
    const tonicSemi  = scaleTonic ? MT.noteToSemitone(scaleTonic) : null;
    const chordData  = chordName  ? MT.CHORDS[instrument][chordName] : null;
    const rootSemi   = chordData  ? MT.noteToSemitone(chordData.notes[0]) : tonicSemi;

    const markers = [3, 5, 7, 9];
    const doubleMarkers = [12];

    const root = svg('svg', {
      viewBox: `0 0 ${W} ${H}`,
      class: 'fb-svg',
      role: 'img',
      'aria-label': chordName
        ? `Accord ${chordData ? chordData.name : chordName}`
        : `Gamme ${MT.SCALES[scaleKey].label} de ${MT.frName(scaleTonic)}`
    });

    // defs : gradient bois
    const defs = svg('defs');
    const grad = svg('linearGradient', { id: `wood-${instrument}-${chordName || scaleTonic}`, x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.appendChild(svg('stop', { offset: '0%',   'stop-color': '#E8B877' }));
    grad.appendChild(svg('stop', { offset: '50%',  'stop-color': '#D9A460' }));
    grad.appendChild(svg('stop', { offset: '100%', 'stop-color': '#C88A3C' }));
    defs.appendChild(grad);
    root.appendChild(defs);

    const woodId = `wood-${instrument}-${chordName || scaleTonic}`;

    // bois
    root.appendChild(svg('rect', {
      x: padL, y: padT, width: gridW, height: gridH,
      fill: `url(#${woodId})`, rx: 4
    }));

    // sillet (nut)
    root.appendChild(svg('rect', {
      x: padL - 3, y: padT, width: 6, height: gridH,
      fill: '#2B1A0F', rx: 1
    }));

    // cases (lignes verticales)
    for (let f = 1; f <= numFrets; f++) {
      const x = padL + f * fretW;
      root.appendChild(svg('line', {
        x1: x, y1: padT, x2: x, y2: padT + gridH,
        stroke: '#6B5847', 'stroke-width': '1.5'
      }));
    }

    // markers
    markers.forEach(m => {
      if (m > numFrets) return;
      root.appendChild(svg('circle', {
        cx: padL + (m - 0.5) * fretW, cy: padT + gridH / 2,
        r: 6, fill: 'rgba(255,255,255,0.35)'
      }));
    });
    doubleMarkers.forEach(m => {
      if (m > numFrets) return;
      root.appendChild(svg('circle', {
        cx: padL + (m - 0.5) * fretW, cy: padT + gridH * 0.3,
        r: 6, fill: 'rgba(255,255,255,0.4)'
      }));
      root.appendChild(svg('circle', {
        cx: padL + (m - 0.5) * fretW, cy: padT + gridH * 0.7,
        r: 6, fill: 'rgba(255,255,255,0.4)'
      }));
    });

    // numéros de cases
    [0, 3, 5, 7, 9, 12].forEach(n => {
      if (n === 0 || n > numFrets) return;
      const t = svg('text', {
        x: padL + (n - 0.5) * fretW, y: H - 4,
        'font-size': 11, fill: '#6B5847',
        'font-family': "'JetBrains Mono', monospace",
        'text-anchor': 'middle', 'font-weight': 600
      });
      t.textContent = n;
      root.appendChild(t);
    });

    // cordes + étiquettes
    tun.strings.forEach((s, i) => {
      const y = padT + i * stringGap;
      // ombre de la corde
      root.appendChild(svg('line', {
        x1: padL, x2: padL + gridW, y1: y + 1, y2: y + 1,
        stroke: 'rgba(0,0,0,0.18)', 'stroke-width': (1.2 + (numStrings - i) * 0.2).toFixed(2)
      }));
      // corde
      root.appendChild(svg('line', {
        x1: padL, x2: padL + gridW, y1: y, y2: y,
        stroke: '#F8F3E3', 'stroke-width': (1 + (numStrings - i) * 0.2).toFixed(2)
      }));
      // étiquette
      const label = svg('text', {
        x: padL - 10, y: y + 4,
        'font-size': 12, 'font-weight': 700,
        'font-family': "'JetBrains Mono', monospace",
        fill: '#2B1A0F', 'text-anchor': 'end'
      });
      label.textContent = s.name;
      root.appendChild(label);
    });

    // ---- Notes ----
    tun.strings.forEach((s, si) => {
      const y = padT + si * stringGap;

      for (let fret = 0; fret <= numFrets; fret++) {
        const midi = s.midi + fret;
        const semi = midi % 12;
        const inScale = scaleSemis ? scaleSemis.includes(semi) : false;

        let inChord = false;
        if (chordData) {
          if (chordData.frets[si] === fret) inChord = true;
        }

        if (!showAll && !inScale && !inChord) continue;

        const isTonic = semi === rootSemi;
        const x = fret === 0 ? padL - 18 : padL + (fret - 0.5) * fretW;
        const name = MT.semitoneToName(semi);
        const color = MT.NOTE_COLORS[name] || '#2AA6E8';
        const r = isTonic ? 14 : 12;

        // groupe interactif
        const g = svg('g', {
          class: 'fb-note' + (isTonic ? ' is-tonic' : '') + (inChord ? ' is-chord' : ''),
          tabindex: 0,
          role: 'button',
          'aria-label': `Jouer ${MT.frName(name)} (corde ${s.name}, case ${fret})`
        });
        g.style.cursor = 'pointer';

        // halo
        g.appendChild(svg('circle', {
          cx: x, cy: y, r: r + 2,
          fill: '#fff', opacity: 0.85
        }));
        // pastille
        g.appendChild(svg('circle', {
          cx: x, cy: y, r,
          fill: color,
          stroke: isTonic ? '#2B1A0F' : 'rgba(0,0,0,0.18)',
          'stroke-width': isTonic ? 2.5 : 1
        }));
        // nom de la note
        const text = svg('text', {
          x, y: y + 4,
          'text-anchor': 'middle',
          'font-size': 11, 'font-weight': 800,
          'font-family': "'Nunito', sans-serif",
          fill: '#fff', 'pointer-events': 'none'
        });
        text.textContent = MT.frName(name).replace(/[♯♭]/g, m => m === '♯' ? '♯' : '♭');
        g.appendChild(text);

        // interaction
        const handler = () => playNote(midi);
        g.addEventListener('click', handler);
        g.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
        });

        root.appendChild(g);
      }
    });

    host.innerHTML = '';
    host.appendChild(root);

    // Légende & métadonnées
    if (chordData) {
      const meta = document.createElement('div');
      meta.className = 'fb-meta';
      meta.innerHTML = `
        <strong>${chordData.name}</strong>
        <span class="fb-degree degree-${chordData.quality}">${chordData.degree}</span>
        <span class="fb-notes">${chordData.notes.map(n => MT.frName(n)).join(' – ')}</span>
      `;
      host.appendChild(meta);
    } else if (scaleTonic) {
      const meta = document.createElement('div');
      meta.className = 'fb-meta';
      const notes = MT.scaleNotes(scaleTonic, scaleKey).map(s => MT.frName(MT.semitoneToName(s)));
      meta.innerHTML = `
        <strong>${MT.SCALES[scaleKey].label}</strong>
        <span class="fb-notes">de ${MT.frName(scaleTonic)} · ${notes.join(' – ')}</span>
      `;
      host.appendChild(meta);
    }

    // Astuce (sous le manche)
    if (host.dataset.hint !== 'false') {
      const hint = document.createElement('p');
      hint.className = 'fb-hint';
      hint.textContent = '💡 Clique sur une note pour l\'écouter.';
      host.appendChild(hint);
    }
  }

  /* ---------------------------------------------------------------
     CHORD CARD — 1 mini-manche (5 cases) compact
  --------------------------------------------------------------- */

  function renderChordCard(host) {
    // Identique à renderFretboard mais data-chord est obligatoire
    renderFretboard(host);
  }

  /* ---------------------------------------------------------------
     FAMILY ROW — toute une famille de 7 accords sur une ligne
     data-family="ukulele"  → affiche les 7 accords de la gamme de Do
  --------------------------------------------------------------- */

  function renderFamily(host) {
    const instr = host.dataset.family || 'ukulele';
    const order = ['C','Dm','Em','F','G','Am','Bdim'];

    host.innerHTML = '';
    host.classList.add('family-row');

    order.forEach(name => {
      const card = document.createElement('div');
      card.className = 'family-card quality-' + (MT.CHORDS[instr][name].quality);
      const fb = document.createElement('div');
      fb.className = 'fretboard fb-mini';
      fb.dataset.instrument = instr;
      fb.dataset.chord = name;
      fb.dataset.hint = 'false';
      card.appendChild(fb);
      const playBtn = document.createElement('button');
      playBtn.className = 'btn-play btn-play-soft';
      playBtn.dataset.play = `chord:${name}:${instr}`;
      playBtn.textContent = MT.CHORDS[instr][name].name;
      card.appendChild(playBtn);
      host.appendChild(card);

      renderFretboard(fb);
      bindPlayButton(playBtn);
    });
  }

  /* ---------------------------------------------------------------
     PROGRESSION ROW — une suite I-V-vi-IV jouable
     data-progression="C,G,Am,F" data-instrument="ukulele"
  --------------------------------------------------------------- */

  function renderProgression(host) {
    const chords = (host.dataset.progression || 'C,G,Am,F').split(',');
    const instr = host.dataset.instrument || 'ukulele';
    const labels = (host.dataset.degrees || 'I,V,vi,IV').split(',');

    host.innerHTML = '';
    host.classList.add('prog-row');

    chords.forEach((c, i) => {
      const cell = document.createElement('div');
      cell.className = 'prog-cell';
      const lab = document.createElement('span');
      lab.className = 'prog-degree';
      lab.textContent = labels[i] || '';
      cell.appendChild(lab);

      const fb = document.createElement('div');
      fb.className = 'fretboard fb-mini';
      fb.dataset.instrument = instr;
      fb.dataset.chord = c.trim();
      fb.dataset.hint = 'false';
      cell.appendChild(fb);

      const btn = document.createElement('button');
      btn.className = 'btn-play btn-play-soft';
      btn.dataset.play = `chord:${c.trim()}:${instr}`;
      btn.textContent = MT.CHORDS[instr][c.trim()] ? MT.CHORDS[instr][c.trim()].name : c.trim();
      cell.appendChild(btn);

      host.appendChild(cell);
      renderFretboard(fb);
      bindPlayButton(btn);
    });

    // Bouton "tout enchaîner"
    if (chords.length > 1) {
      const playAll = document.createElement('button');
      playAll.className = 'btn-play prog-play-all';
      playAll.textContent = 'Enchaîner la progression';
      playAll.addEventListener('click', () => {
        playAll.classList.add('is-playing');
        setTimeout(() => playAll.classList.remove('is-playing'), chords.length * 1100);
        chords.forEach((c, i) => {
          setTimeout(() => {
            AudioEngine.playChord(MT.chordMidis(instr, c.trim()));
          }, i * 1100);
        });
      });
      host.appendChild(playAll);
    }
  }

  /* ---------------------------------------------------------------
     PIANO mini — clavier 1 octave cliquable (utile pour M2/M6)
  --------------------------------------------------------------- */

  function renderPiano(host) {
    const baseMidi = parseInt(host.dataset.base, 10) || 60; // C4
    const octaves = parseInt(host.dataset.octaves, 10) || 1;
    const showLabels = host.dataset.labels !== 'false';
    const whiteKeys = [0, 2, 4, 5, 7, 9, 11];
    const blackKeys = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };

    const wWidth = 48, wHeight = 160;
    const totalWhites = whiteKeys.length * octaves + 1;
    const W = totalWhites * wWidth + 12;
    const H = wHeight + 16;

    const root = svg('svg', {
      viewBox: `0 0 ${W} ${H}`, class: 'pn-svg',
      role: 'img', 'aria-label': 'Clavier interactif'
    });

    // touches blanches
    let whiteIdx = 0;
    for (let oct = 0; oct < octaves; oct++) {
      whiteKeys.forEach((semi) => {
        const x = 6 + whiteIdx * wWidth;
        const midi = baseMidi + oct * 12 + semi;
        const g = svg('g', {
          class: 'pn-key pn-white', tabindex: 0, role: 'button',
          'aria-label': `Jouer ${MT.frName(MT.semitoneToName(midi % 12))}`
        });
        g.style.cursor = 'pointer';
        g.appendChild(svg('rect', {
          x, y: 6, width: wWidth - 2, height: wHeight,
          fill: '#fff', stroke: '#2B1A0F', 'stroke-width': 1.2, rx: 3
        }));
        if (showLabels) {
          const t = svg('text', {
            x: x + wWidth / 2 - 1, y: wHeight - 6,
            'font-size': 12, 'font-weight': 700,
            'font-family': "'Nunito', sans-serif",
            fill: '#6B5847', 'text-anchor': 'middle',
            'pointer-events': 'none'
          });
          t.textContent = MT.frName(MT.semitoneToName(midi % 12));
          g.appendChild(t);
        }
        g.addEventListener('click', () => playNote(midi));
        g.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playNote(midi); }
        });
        root.appendChild(g);
        whiteIdx++;
      });
    }
    // dernière touche (octave + 1)
    {
      const x = 6 + whiteIdx * wWidth;
      const midi = baseMidi + octaves * 12;
      const g = svg('g', { class: 'pn-key pn-white', tabindex: 0, role: 'button' });
      g.style.cursor = 'pointer';
      g.appendChild(svg('rect', {
        x, y: 6, width: wWidth - 2, height: wHeight,
        fill: '#fff', stroke: '#2B1A0F', 'stroke-width': 1.2, rx: 3
      }));
      if (showLabels) {
        const t = svg('text', {
          x: x + wWidth / 2 - 1, y: wHeight - 6,
          'font-size': 12, 'font-weight': 700,
          'font-family': "'Nunito', sans-serif",
          fill: '#6B5847', 'text-anchor': 'middle',
          'pointer-events': 'none'
        });
        t.textContent = MT.frName(MT.semitoneToName(midi % 12));
        g.appendChild(t);
      }
      g.addEventListener('click', () => playNote(midi));
      root.appendChild(g);
    }

    // touches noires
    for (let oct = 0; oct < octaves; oct++) {
      Object.keys(blackKeys).forEach((semiKey) => {
        const semi = parseInt(semiKey, 10);
        const whiteBefore = blackKeys[semi]; // index de la touche blanche à gauche
        const xWhite = 6 + (oct * whiteKeys.length + whiteBefore) * wWidth;
        const midi = baseMidi + oct * 12 + semi;
        const g = svg('g', {
          class: 'pn-key pn-black', tabindex: 0, role: 'button',
          'aria-label': `Jouer ${MT.frName(MT.semitoneToName(midi % 12))}`
        });
        g.style.cursor = 'pointer';
        const bw = wWidth * 0.6, bh = wHeight * 0.62;
        g.appendChild(svg('rect', {
          x: xWhite + wWidth - bw / 2 - 1, y: 6,
          width: bw, height: bh,
          fill: '#2B1A0F', rx: 2
        }));
        g.addEventListener('click', () => playNote(midi));
        g.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playNote(midi); }
        });
        root.appendChild(g);
      });
    }

    host.innerHTML = '';
    host.appendChild(root);
  }

  /* ---------------------------------------------------------------
     Boutons "Écouter"
       data-play="chord:C:ukulele"
       data-play="scale:C:major:ukulele"
       data-play="interval:0:4"
       data-play="note:7"   (semi par rapport à C4=60)
       data-play="progression:C,G,Am,F:ukulele"
  --------------------------------------------------------------- */

  function bindPlayButton(btn) {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const spec = btn.dataset.play.split(':');
      btn.classList.add('is-playing');
      setTimeout(() => btn.classList.remove('is-playing'), 1500);

      if (spec[0] === 'chord') {
        const [, name, instr] = spec;
        AudioEngine.playChord(MT.chordMidis(instr || 'ukulele', name));

      } else if (spec[0] === 'scale') {
        const [, tonic, key, instr] = spec;
        const semis = MT.scaleNotes(tonic, key || 'major');
        const baseTonicMidi = 60 + MT.noteToSemitone(tonic);
        const seq = [];
        let prev = -1;
        let cur = baseTonicMidi;
        semis.forEach((s, i) => {
          if (i === 0) { seq.push({ midi: cur }); prev = s; return; }
          const step = (s - prev + 12) % 12 || 12;
          cur += step;
          seq.push({ midi: cur });
          prev = s;
        });
        seq.push({ midi: baseTonicMidi + 12 });
        AudioEngine.playMelody(seq, 0.42);

      } else if (spec[0] === 'interval') {
        const [, baseSemi, targetSemi] = spec;
        AudioEngine.playMelody([
          { midi: 60 + parseInt(baseSemi, 10),   dur: 0.55 },
          { midi: 60 + parseInt(targetSemi, 10), dur: 0.95 }
        ]);

      } else if (spec[0] === 'note') {
        playNote(60 + parseInt(spec[1], 10));

      } else if (spec[0] === 'progression') {
        const [, listStr, instr] = spec;
        const list = listStr.split(',');
        list.forEach((c, i) => {
          setTimeout(() => {
            AudioEngine.playChord(MT.chordMidis(instr || 'ukulele', c.trim()));
          }, i * 1100);
        });
      }
    });
  }

  /* ---------------------------------------------------------------
     Animations d'entrée
  --------------------------------------------------------------- */

  function animateSlide(slide) {
    if (!slide) return;
    const inner = slide.querySelector('.slide-inner');
    if (!inner) return;
    const items = Array.from(inner.children);
    items.forEach((el, i) => {
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = `slide-in 540ms cubic-bezier(.2,.8,.2,1) ${i * 70}ms both`;
    });
  }

  /* ---------------------------------------------------------------
     Init global
  --------------------------------------------------------------- */

  function initWidgets(root) {
    root = root || document;

    // Familles d'accords
    root.querySelectorAll('[data-family]:not([data-rendered])').forEach(host => {
      try { renderFamily(host); host.dataset.rendered = '1'; }
      catch (e) { console.warn('Family error:', e); }
    });

    // Progressions
    root.querySelectorAll('[data-progression]:not([data-rendered])').forEach(host => {
      try { renderProgression(host); host.dataset.rendered = '1'; }
      catch (e) { console.warn('Progression error:', e); }
    });

    // Pianos
    root.querySelectorAll('.piano:not([data-rendered])').forEach(host => {
      try { renderPiano(host); host.dataset.rendered = '1'; }
      catch (e) { console.warn('Piano error:', e); }
    });

    // Manches simples
    root.querySelectorAll('.fretboard:not([data-rendered])').forEach(host => {
      try { renderFretboard(host); host.dataset.rendered = '1'; }
      catch (e) { console.warn('Fretboard error:', e); }
    });

    // Boutons play
    root.querySelectorAll('[data-play]').forEach(btn => bindPlayButton(btn));
  }

  window.Widgets = { initWidgets, animateSlide, renderFretboard, renderPiano, renderFamily, renderProgression };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initWidgets());
  } else {
    initWidgets();
  }

  window.addEventListener('slidechange', (e) => {
    animateSlide(e.detail.slide);
    initWidgets(e.detail.slide);
  });
})();
