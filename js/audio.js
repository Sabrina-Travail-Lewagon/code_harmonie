/* =============================================================
   audio.js — Moteur audio WebAudio (cordes pincées synthétisées)
   ============================================================= */

const AudioEngine = (() => {
  let ctx = null;
  let master = null;

  function init() {
    if (ctx) return ctx;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.4;
    master.connect(ctx.destination);
    return ctx;
  }

  function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  function pluck(midi, time = 0, duration = 1.2, gain = 0.35) {
    init();
    const t0 = ctx.currentTime + time;
    const freq = midiToFreq(midi);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4000, t0);
    filter.frequency.exponentialRampToValueAtTime(400, t0 + duration);
    filter.Q.value = 2;

    [
      { type: 'triangle', detune: 0,  g: 0.6 },
      { type: 'sine',     detune: 0,  g: 0.4 },
      { type: 'sawtooth', detune: 3,  g: 0.15 }
    ].forEach(o => {
      const osc = ctx.createOscillator();
      osc.type = o.type;
      osc.frequency.value = freq;
      osc.detune.value = o.detune;
      const og = ctx.createGain();
      og.gain.value = o.g;
      osc.connect(og).connect(filter);
      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    });

    filter.connect(g).connect(master);
  }

  function resume() { init(); ctx.resume(); }

  function playChord(midis, strumMs = 50, duration = 1.6) {
    resume();
    midis.forEach((m, i) => {
      if (m == null) return;
      pluck(m, (i * strumMs) / 1000, duration, 0.3);
    });
  }

  function playMelody(notes, noteDur = 0.45) {
    resume();
    let t = 0;
    notes.forEach(n => {
      const dur = n.dur || noteDur;
      if (n.midi != null) pluck(n.midi, t, dur * 1.3, 0.35);
      t += dur;
    });
  }

  return { init, resume, pluck, playChord, playMelody, midiToFreq };
})();

window.AudioEngine = AudioEngine;
