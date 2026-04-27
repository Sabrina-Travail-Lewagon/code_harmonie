/* =============================================================
   widgets.js — Composants visuels interactifs (vanilla DOM/SVG)
   - Fretboard (manche) : affiche un accord OU une gamme
   - Boutons "▶ Écouter" : lit accord, gamme, ou intervalle
   - Auto-init via attributs data-* dans le HTML
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

  /* ---------------------------------------------------------------
     Fretboard SVG
     Options:
       instrument: 'ukulele' | 'guitar'
       chord:      nom d'accord (ex: 'C', 'Am')
       scale:      { tonic: 'C', key: 'major' }   // alternative à chord
       fretCount:  nombre de cases à afficher (par défaut 5 pour accord, 12 pour gamme)
       label:      étiquette à afficher
  --------------------------------------------------------------- */

  function renderFretboard(host) {
    const instrument = host.dataset.instrument || 'ukulele';
    const chordName  = host.dataset.chord || null;
    const scaleTonic = host.dataset.scaleTonic || null;
    const scaleKey   = host.dataset.scaleKey || 'major';

    const tun = MT.TUNINGS[instrument];
    if (!tun) return;

    let fretCount = parseInt(host.dataset.frets, 10);
    if (!fretCount) fretCount = chordName ? 5 : 12;

    const dots = []; // {string, fret, note, isRoot}

    if (chordName) {
      const chord = MT.CHORDS[instrument][chordName];
      if (chord) {
        chord.frets.forEach((f, i) => {
          if (f == null) return;
          const note = MT.semitoneToName((tun.strings[i].midi + f) % 12);
          dots.push({ string: i, fret: f, note, isRoot: note === chord.notes[0] });
        });
      }
    } else if (scaleTonic) {
      const semis = MT.scaleNotes(scaleTonic, scaleKey);
      const tonicSemi = MT.noteToSemitone(scaleTonic);
      tun.strings.forEach((s, i) => {
        for (let f = 0; f <= fretCount; f++) {
          const semi = (s.midi + f) % 12;
          if (semis.includes(semi)) {
            dots.push({
              string: i, fret: f,
              note: MT.semitoneToName(semi),
              isRoot: semi === tonicSemi
            });
          }
        }
      });
    }

    // dimensions
    const PAD_TOP = 18, PAD_BOTTOM = 24, PAD_LEFT = 38, PAD_RIGHT = 18;
    const FRET_W = chordName ? 56 : 48;
    const STR_GAP = 26;
    const W = PAD_LEFT + PAD_RIGHT + (fretCount + (chordName ? 0 : 1)) * FRET_W;
    const H = PAD_TOP + PAD_BOTTOM + (tun.strings.length - 1) * STR_GAP;

    // SVG root
    const svgEl = svg('svg', {
      viewBox: `0 0 ${W} ${H}`,
      class: 'fretboard-svg',
      role: 'img',
      'aria-label': chordName ? `Accord ${chordName}` : `Gamme ${scaleKey} de ${MT.frName(scaleTonic)}`
    });

    // wood background
    svgEl.appendChild(svg('rect', {
      x: PAD_LEFT - 4, y: PAD_TOP - 6,
      width: W - PAD_LEFT - PAD_RIGHT + 8,
      height: H - PAD_TOP - PAD_BOTTOM + 12,
      rx: 8, fill: 'url(#wood-grad)'
    }));

    // gradient defs
    const defs = svg('defs');
    const grad = svg('linearGradient', {
      id: 'wood-grad', x1: 0, y1: 0, x2: 0, y2: 1
    }, [
      svg('stop', { offset: '0%',   'stop-color': '#E8B877' }),
      svg('stop', { offset: '100%', 'stop-color': '#C88A3C' })
    ]);
    defs.appendChild(grad);
    svgEl.appendChild(defs);

    // nut (sillet) si on commence à la case 0
    const startFret = chordName ? 1 : 0;
    if (!chordName) {
      svgEl.appendChild(svg('rect', {
        x: PAD_LEFT - 4, y: PAD_TOP - 6,
        width: 5, height: H - PAD_TOP - PAD_BOTTOM + 12,
        fill: '#2B1A0F'
      }));
    }

    // frets verticaux
    for (let f = 0; f <= fretCount; f++) {
      const x = PAD_LEFT + f * FRET_W + (chordName ? 0 : FRET_W);
      svgEl.appendChild(svg('line', {
        x1: x, y1: PAD_TOP - 6,
        x2: x, y2: H - PAD_BOTTOM + 6,
        stroke: '#6B3E1C', 'stroke-width': f === 0 && chordName ? 4 : 2
      }));
    }

    // dots de marqueurs (cases 3, 5, 7, 9, 12)
    const inlays = chordName ? [] : [3, 5, 7, 9];
    inlays.forEach(f => {
      const x = PAD_LEFT + f * FRET_W + FRET_W / 2 + (chordName ? 0 : FRET_W);
      const y = (PAD_TOP + (H - PAD_BOTTOM)) / 2;
      svgEl.appendChild(svg('circle', {
        cx: x, cy: y, r: 4, fill: 'rgba(255,255,255,0.4)'
      }));
    });
    if (!chordName && fretCount >= 12) {
      const x = PAD_LEFT + 12 * FRET_W + FRET_W / 2 + FRET_W;
      svgEl.appendChild(svg('circle', { cx: x, cy: PAD_TOP + STR_GAP * 0.7, r: 4, fill: 'rgba(255,255,255,0.4)' }));
      svgEl.appendChild(svg('circle', { cx: x, cy: H - PAD_BOTTOM - STR_GAP * 0.7, r: 4, fill: 'rgba(255,255,255,0.4)' }));
    }

    // numéros de case sous le manche
    for (let f = 1; f <= fretCount; f++) {
      const x = PAD_LEFT + (f - (chordName ? 0.5 : -0.5)) * FRET_W;
      svgEl.appendChild(svg('text', {
        x, y: H - 6,
        'text-anchor': 'middle',
        'font-size': 10,
        'font-family': "'JetBrains Mono', monospace",
        fill: '#9B8770'
      })).textContent = f;
    }

    // cordes horizontales
    tun.strings.forEach((s, i) => {
      const y = PAD_TOP + i * STR_GAP;
      const stringW = 1 + i * 0.18;
      svgEl.appendChild(svg('line', {
        x1: PAD_LEFT - 4, y1: y,
        x2: W - PAD_RIGHT, y2: y,
        stroke: '#3a2615', 'stroke-width': stringW.toFixed(2)
      }));

      // étiquette de corde à gauche
      svgEl.appendChild(svg('text', {
        x: PAD_LEFT - 14, y: y + 4,
        'text-anchor': 'middle',
        'font-size': 11,
        'font-weight': 700,
        'font-family': "'JetBrains Mono', monospace",
        fill: '#6B5847'
      })).textContent = s.name;
    });

    // dots (notes)
    dots.forEach(d => {
      const x = chordName
        ? PAD_LEFT + (d.fret - 0.5) * FRET_W
        : PAD_LEFT + (d.fret + 0.5) * FRET_W + (d.fret === 0 ? -FRET_W * 0.45 : 0);
      const y = PAD_TOP + d.string * STR_GAP;

      const r = 11;
      const color = MT.NOTE_COLORS[d.note] || '#2B1A0F';

      // outer (white halo)
      svgEl.appendChild(svg('circle', {
        cx: x, cy: y, r: r + 1.5, fill: '#fff', opacity: 0.9
      }));
      // inner (couleur)
      svgEl.appendChild(svg('circle', {
        cx: x, cy: y, r,
        fill: color,
        stroke: d.isRoot ? '#2B1A0F' : 'rgba(0,0,0,0.15)',
        'stroke-width': d.isRoot ? 2.5 : 1
      }));
      // texte (note)
      const txt = svg('text', {
        x, y: y + 3.5,
        'text-anchor': 'middle',
        'font-size': 10,
        'font-weight': 700,
        'font-family': "'Nunito', sans-serif",
        fill: '#fff',
        'pointer-events': 'none'
      });
      txt.textContent = d.note;
      svgEl.appendChild(txt);
    });

    host.innerHTML = '';
    host.appendChild(svgEl);

    // étiquette légende
    if (chordName) {
      const chord = MT.CHORDS[instrument][chordName];
      const meta = document.createElement('div');
      meta.className = 'fretboard-meta';
      meta.innerHTML = `<strong>${chord.name}</strong> · <span class="degree-${chord.quality}">${chord.degree}</span> · ${chord.notes.map(n => MT.frName(n)).join(' – ')}`;
      host.appendChild(meta);
    } else if (scaleTonic) {
      const meta = document.createElement('div');
      meta.className = 'fretboard-meta';
      const scaleNotes = MT.scaleNotes(scaleTonic, scaleKey).map(s => MT.frName(MT.semitoneToName(s)));
      meta.innerHTML = `<strong>${MT.SCALES[scaleKey].label}</strong> de ${MT.frName(scaleTonic)} · ${scaleNotes.join(' – ')}`;
      host.appendChild(meta);
    }
  }

  /* ---------------------------------------------------------------
     Boutons "Écouter"
       data-play="chord:C:ukulele"
       data-play="scale:C:major:ukulele"
       data-play="interval:0:4"   (semitones diff par rapport à un do médium)
  --------------------------------------------------------------- */

  function bindPlayButton(btn) {
    btn.addEventListener('click', () => {
      const spec = btn.dataset.play.split(':');
      btn.classList.add('is-playing');
      setTimeout(() => btn.classList.remove('is-playing'), 1500);

      if (spec[0] === 'chord') {
        const [, name, instr] = spec;
        const midis = MT.chordMidis(instr || 'ukulele', name);
        AudioEngine.playChord(midis);
      } else if (spec[0] === 'scale') {
        const [, tonic, key, instr] = spec;
        const tun = MT.TUNINGS[instr || 'ukulele'];
        const semis = MT.scaleNotes(tonic, key);
        // Joue la gamme en montant depuis la tonique (octave médium)
        const baseMidi = tun.strings[tun.strings.length - 1].midi; // grave
        const tonicMidi = baseMidi + ((MT.noteToSemitone(tonic) - baseMidi % 12 + 12) % 12);
        const notes = semis.map((s, i) => ({
          midi: tonicMidi + (s - semis[0] + 12) % 12 + (i > 0 && (s - semis[i-1] + 12) % 12 < 0 ? 12 : 0)
        }));
        // Plus simple : on construit la séquence en demi-tons additifs
        const seq = [];
        let cur = tonicMidi;
        for (let i = 0; i < semis.length; i++) {
          if (i === 0) seq.push({ midi: cur });
          else {
            const step = (semis[i] - semis[i-1] + 12) % 12 || 12;
            cur += step;
            seq.push({ midi: cur });
          }
        }
        seq.push({ midi: tonicMidi + 12 });
        AudioEngine.playMelody(seq, 0.4);
      } else if (spec[0] === 'interval') {
        const [, baseSemi, targetSemi] = spec;
        const baseMidi = 60 + parseInt(baseSemi, 10);
        AudioEngine.playMelody([
          { midi: baseMidi, dur: 0.6 },
          { midi: 60 + parseInt(targetSemi, 10), dur: 1.0 }
        ]);
      } else if (spec[0] === 'note') {
        AudioEngine.pluck(60 + parseInt(spec[1], 10), 0, 1.4, 0.4);
      }
    });
  }

  /* ---------------------------------------------------------------
     Animation d'entrée des éléments d'une slide active
     (fade + translate Y léger sur les enfants directs de .slide-inner)
  --------------------------------------------------------------- */

  function animateSlide(slide) {
    if (!slide) return;
    const inner = slide.querySelector('.slide-inner');
    if (!inner) return;
    const items = Array.from(inner.children);
    items.forEach((el, i) => {
      el.style.animation = 'none';
      // force reflow
      void el.offsetWidth;
      el.style.animation = `slide-in 540ms cubic-bezier(.2,.8,.2,1) ${i * 70}ms both`;
    });
  }

  /* ---------------------------------------------------------------
     Init
  --------------------------------------------------------------- */

  function initWidgets(root) {
    root = root || document;
    root.querySelectorAll('.fretboard:not([data-rendered])').forEach(host => {
      try { renderFretboard(host); host.dataset.rendered = '1'; }
      catch (e) { console.warn('Fretboard error:', e); }
    });
    root.querySelectorAll('[data-play]:not([data-bound])').forEach(btn => {
      bindPlayButton(btn);
      btn.dataset.bound = '1';
    });
  }

  // Expose
  window.Widgets = { initWidgets, animateSlide, renderFretboard };

  // Auto-init au DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initWidgets());
  } else {
    initWidgets();
  }

  // Anime la slide active après navigation
  window.addEventListener('slidechange', (e) => {
    animateSlide(e.detail.slide);
  });
})();
