import { useCallback, useEffect, useRef, useState } from 'react';

// Voice to text, shared by every microphone button in the app.
//
// Why it is written this way:
// - Phones (Android Chrome) send the WHOLE sentence again with every update, so each update replaces
//   the current sentence. Adding updates together is what made words repeat.
// - Phones also stop listening at the first pause. So on a phone each recognition run is short, and a
//   new one starts straight away until the person presses stop.
// - If nothing is heard for a few runs in a row, it stops by itself so the mic is not left open.

const MAX_SILENT_RUNS = 3;
const onPhone = () => /Android|iPhone|iPad|iPod/i.test((typeof navigator !== 'undefined' && navigator.userAgent) || '');
const join = (a, b) => (a && b ? `${a} ${b}` : a || b);

// start(currentText, onUpdate) toggles listening. onUpdate(text) receives the full text of the box.
// stop(discard) ends listening and keeps what was heard, or drops the unfinished sentence if discard is true.
export default function useSpeech(lang = 'en-US') {
  const recognitionRef = useRef(null);
  const baseTextRef = useRef('');   // text already in the box: typed, or speech from finished runs
  const heardRef = useRef('');      // what the current run has heard so far
  const onUpdateRef = useRef(null);
  const wantedRef = useRef(false);  // stays true until the person presses stop
  const silentRef = useRef(0);
  const beginRef = useRef(null);
  const [listening, setListening] = useState(false);

  const show = () => {
    if (onUpdateRef.current) onUpdateRef.current(join(baseTextRef.current, heardRef.current.trim()));
  };

  beginRef.current = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = lang;
    r.continuous = !onPhone();
    r.interimResults = true;
    r.maxAlternatives = 1;
    recognitionRef.current = r;
    heardRef.current = '';

    r.onstart = () => setListening(true);
    r.onresult = (event) => {
      let heard = '';
      for (let i = 0; i < event.results.length; i++) heard += event.results[i][0].transcript;
      heardRef.current = heard;
      if (heard.trim()) silentRef.current = 0;
      show();
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wantedRef.current = false;
        alert('PM Buddy needs permission to use your microphone. Allow it in your browser settings and try again.');
      }
    };
    r.onend = () => {
      const heard = heardRef.current.trim();
      baseTextRef.current = join(baseTextRef.current, heard);
      heardRef.current = '';
      recognitionRef.current = null;
      show();
      if (!wantedRef.current) { setListening(false); return; }
      silentRef.current = heard ? 0 : silentRef.current + 1;
      if (silentRef.current >= MAX_SILENT_RUNS) { wantedRef.current = false; setListening(false); return; }
      setTimeout(() => {
        if (wantedRef.current && !recognitionRef.current) {
          try { beginRef.current(); } catch (err) { wantedRef.current = false; setListening(false); }
        }
      }, 250);
    };
    r.start();
  };

  const stop = useCallback((discard) => {
    wantedRef.current = false;
    const r = recognitionRef.current;
    recognitionRef.current = null;
    if (r) {
      r.onend = null; r.onerror = null; r.onresult = null;
      try { r.abort(); } catch (err) { /* already stopped */ }
    }
    if (!discard && heardRef.current.trim()) {
      baseTextRef.current = join(baseTextRef.current, heardRef.current.trim());
      heardRef.current = '';
      show();
    }
    heardRef.current = '';
    setListening(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback((currentValue, onUpdate) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice input is not supported in this browser. Please use Chrome.'); return; }
    if (wantedRef.current) { stop(); return; }
    onUpdateRef.current = onUpdate;
    baseTextRef.current = (currentValue || '').trim();
    wantedRef.current = true;
    silentRef.current = 0;
    try { beginRef.current(); } catch (err) { wantedRef.current = false; setListening(false); }
  }, [stop]);

  useEffect(() => () => stop(true), [stop]);

  return { listening, start, stop, baseTextRef };
}
