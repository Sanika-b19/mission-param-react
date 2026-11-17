/* Three narrators with one interface: voiceover file, browser speech, or silent reading pace. */
/* ---------------- narrators ---------------- */
const estimateSec = t => t.split(/\s+/).length * .37 + .6;

class TimerVoice {          // silent: paces lines by reading speed
  constructor() { this.kind = "silent"; this.tok = 0; }
  speak(seg, cb) {
    const tok = ++this.tok, dur = estimateSec(seg.text) * 1000;
    this.cb = cb; this.elapsed = 0; this.t0 = performance.now(); this.paused = false;
    const f = () => {
      if (tok !== this.tok || this.paused) return;
      const p = Math.min(1, (this.elapsed + performance.now() - this.t0) / dur);
      cb.progress(p);
      if (p >= 1) { this.tok++; cb.end(); } else this.raf = requestAnimationFrame(f);
    };
    this.loop = f; this.raf = requestAnimationFrame(f);
  }
  pause() { if (this.paused) return; this.elapsed += performance.now() - this.t0; this.paused = true; cancelAnimationFrame(this.raf); }
  resume() { if (!this.paused) return; this.paused = false; this.t0 = performance.now(); this.raf = requestAnimationFrame(this.loop); }
  stop() { this.tok++; cancelAnimationFrame(this.raf); }
}

class SpeechVoice {         // browser speech synthesis, used when the folder has no voiceover file
  constructor() { this.kind = "speech"; this.tok = 0; }
  static available() { return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window; }
  pickVoice() {
    const vs = speechSynthesis.getVoices();
    const rank = v => (/en[-_]IN/i.test(v.lang) ? 0 : /en[-_]GB/i.test(v.lang) ? 2 : /^en/i.test(v.lang) ? 3 : 9) - (/natural|neural|google|online/i.test(v.name) ? 1 : 0);
    return vs.slice().sort((a, b) => rank(a) - rank(b))[0] || null;
  }
  speak(seg, cb) {
    const tok = ++this.tok; speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(seg.text);
    const v = this.pickVoice(); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-IN";
    u.rate = .93; u.pitch = .96; this.u = u;
    let started = false, boundary = false; const est = estimateSec(seg.text) / .93 * 1000;
    this.elapsed = 0; this.paused = false;
    const f = () => {
      if (tok !== this.tok || boundary) return;
      if (!this.paused) cb.progress(Math.min(.96, (this.elapsed + performance.now() - this.t0) / est));
      this.raf = requestAnimationFrame(f);
    };
    u.onstart = () => { if (tok !== this.tok) return; started = true; this.t0 = performance.now(); this.raf = requestAnimationFrame(f); };
    u.onboundary = e => { if (tok !== this.tok || (e.name && e.name !== "word")) return; boundary = true; cb.progress(null, e.charIndex); };
    u.onend = () => { if (tok !== this.tok) return; this.tok++; cancelAnimationFrame(this.raf); cb.progress(1); cb.end(); };
    u.onerror = e => { if (tok !== this.tok || e.error === "interrupted" || e.error === "canceled") return; this.tok++; cb.fail(e.error); };
    speechSynthesis.speak(u);
    setTimeout(() => { if (tok === this.tok && !started && !this.paused) { this.stop(); cb.fail("blocked"); } }, 2200);
  }
  pause() { this.paused = true; if (this.t0) this.elapsed += performance.now() - this.t0; speechSynthesis.pause(); }
  resume() { this.paused = false; this.t0 = performance.now(); speechSynthesis.resume(); }
  stop() { this.tok++; cancelAnimationFrame(this.raf); try { speechSynthesis.cancel(); } catch (e) {} }
}

class AudioVoice {          // the chapter's voiceover file, cut per line by timings
  constructor(audio, times) { this.kind = "audio"; this.a = audio; this.times = times; this.tok = 0; }
  speak(seg, cb) {
    const tok = ++this.tok, { start, end } = this.times[seg.i], a = this.a;
    this.paused = false;
    try { a.currentTime = start; } catch (e) {}
    const f = () => {
      if (tok !== this.tok) return;
      const t = a.currentTime, p = Math.max(0, Math.min(1, (t - start) / Math.max(.1, end - start)));
      cb.progress(p);
      if (t >= end - .04 || a.ended) { this.tok++; a.pause(); cb.end(); return; }
      this.raf = requestAnimationFrame(f);
    };
    const go = (retry) => a.play().then(() => { if (tok === this.tok) this.raf = requestAnimationFrame(f); })
      .catch(err => {
        if (tok !== this.tok) return;
        // an interrupted play() (seek/pause race) is retried; only a real block falls back to silent
        if (retry && (!err || err.name !== "NotAllowedError")) return setTimeout(() => tok === this.tok && go(false), 150);
        this.tok++; cb.fail("blocked");
      });
    go(true);
  }
  pause() { this.paused = true; this.a.pause(); }
  resume() { this.paused = false; this.a.play().catch(() => {}); }
  stop() { this.tok++; cancelAnimationFrame(this.raf); this.a.pause(); }
}
