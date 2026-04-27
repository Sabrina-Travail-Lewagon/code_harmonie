/* =============================================================
   music-theory.js — Théorie musicale (gammes, accords, accordages)
   ============================================================= */

const MT = (() => {
  const NOTES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

  const NOTES_FR = {
    'C':'Do','C#':'Do♯','Db':'Ré♭','D':'Ré','D#':'Ré♯','Eb':'Mi♭',
    'E':'Mi','F':'Fa','F#':'Fa♯','Gb':'Sol♭','G':'Sol','G#':'Sol♯',
    'Ab':'La♭','A':'La','A#':'La♯','Bb':'Si♭','B':'Si'
  };

  const NOTE_TO_SEMI = {
    'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,
    'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11
  };

  function noteToSemitone(name) { return NOTE_TO_SEMI[name]; }
  function semitoneToName(n) { return NOTES_SHARP[((n % 12) + 12) % 12]; }
  function frName(n) { return NOTES_FR[n] || n; }

  const SCALES = {
    major:    { label: 'Gamme Majeure',     intervals: [0,2,4,5,7,9,11] },
    minor:    { label: 'Mineure naturelle', intervals: [0,2,3,5,7,8,10] },
    pentaMaj: { label: 'Pentatonique Maj.', intervals: [0,2,4,7,9] },
    pentaMin: { label: 'Pentatonique Min.', intervals: [0,3,5,7,10] },
    blues:    { label: 'Gamme Blues',       intervals: [0,3,5,6,7,10] }
  };

  function scaleNotes(tonic, key) {
    const t = noteToSemitone(tonic);
    return SCALES[key].intervals.map(i => (t + i) % 12);
  }

  // Accordages (top → bottom = aigu → grave à l'écran)
  const TUNINGS = {
    ukulele: {
      label: 'Ukulélé',
      strings: [
        { name: 'A', midi: 69 },  // 1ère, aiguë
        { name: 'E', midi: 64 },
        { name: 'C', midi: 60 },  // la plus grave
        { name: 'G', midi: 67 }   // ré-entrant aigu
      ],
      frets: 12
    },
    guitar: {
      label: 'Guitare',
      strings: [
        { name: 'E', midi: 64 },  // mi aigu (1ère)
        { name: 'B', midi: 59 },
        { name: 'G', midi: 55 },
        { name: 'D', midi: 50 },
        { name: 'A', midi: 45 },
        { name: 'E', midi: 40 }   // mi grave (6e)
      ],
      frets: 12
    }
  };

  // Accords pour chaque instrument (frets order = aiguë → grave)
  const CHORDS = {
    ukulele: {
      C:    { frets: [3,0,0,0],    notes:['C','E','G'],     quality:'maj', degree:'I',    name:'Do Majeur' },
      Am:   { frets: [0,0,0,2],    notes:['A','C','E'],     quality:'min', degree:'vi',   name:'La mineur' },
      F:    { frets: [0,1,0,2],    notes:['F','A','C'],     quality:'maj', degree:'IV',   name:'Fa Majeur' },
      G:    { frets: [2,3,2,0],    notes:['G','B','D'],     quality:'maj', degree:'V',    name:'Sol Majeur' },
      G7:   { frets: [2,1,2,0],    notes:['G','B','D','F'], quality:'dom', degree:'V7',   name:'Sol 7' },
      Dm:   { frets: [0,1,2,2],    notes:['D','F','A'],     quality:'min', degree:'ii',   name:'Ré mineur' },
      Em:   { frets: [2,3,4,0],    notes:['E','G','B'],     quality:'min', degree:'iii',  name:'Mi mineur' },
      Bdim: { frets: [3,2,3,2],    notes:['B','D','F'],     quality:'dim', degree:'vii°', name:'Si diminué' }
    },
    guitar: {
      C:    { frets: [0,1,0,2,3,null],     notes:['C','E','G'],     quality:'maj', degree:'I',    name:'Do Majeur' },
      Am:   { frets: [0,1,2,2,0,null],     notes:['A','C','E'],     quality:'min', degree:'vi',   name:'La mineur' },
      F:    { frets: [1,1,2,3,3,1],        notes:['F','A','C'],     quality:'maj', degree:'IV',   name:'Fa Majeur' },
      G:    { frets: [3,0,0,0,2,3],        notes:['G','B','D'],     quality:'maj', degree:'V',    name:'Sol Majeur' },
      G7:   { frets: [1,0,0,0,2,3],        notes:['G','B','D','F'], quality:'dom', degree:'V7',   name:'Sol 7' },
      Dm:   { frets: [1,3,2,0,null,null],  notes:['D','F','A'],     quality:'min', degree:'ii',   name:'Ré mineur' },
      Em:   { frets: [0,0,0,2,2,0],        notes:['E','G','B'],     quality:'min', degree:'iii',  name:'Mi mineur' },
      Bdim: { frets: [null,3,4,3,2,null],  notes:['B','D','F'],     quality:'dim', degree:'vii°', name:'Si diminué' }
    }
  };

  function chordMidis(instrument, chordName) {
    const tun = TUNINGS[instrument];
    const chord = CHORDS[instrument][chordName];
    if (!chord) return [];
    const midis = [];
    // strum grave → aigu : on parcourt en sens inverse
    for (let i = chord.frets.length - 1; i >= 0; i--) {
      const f = chord.frets[i];
      if (f == null) continue;
      midis.push(tun.strings[i].midi + f);
    }
    return midis;
  }

  // Couleurs par note (chromatique, syncées avec --color-*)
  const NOTE_COLORS = {
    'C':  '#E84C3D', 'C#': '#E84C3D',
    'D':  '#F58A26', 'D#': '#F58A26',
    'E':  '#F5C026',
    'F':  '#5BC94A', 'F#': '#5BC94A',
    'G':  '#3BD4E8', 'G#': '#3BD4E8',
    'A':  '#2AA6E8', 'A#': '#2AA6E8',
    'B':  '#8B3FD1'
  };

  return {
    NOTES_SHARP, NOTES_FR, NOTE_COLORS,
    noteToSemitone, semitoneToName, frName,
    SCALES, scaleNotes,
    TUNINGS, CHORDS, chordMidis
  };
})();

window.MT = MT;
