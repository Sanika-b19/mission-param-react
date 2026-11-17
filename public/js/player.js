/* The chapter player: builds a chapter, types each sentence in time with narration, swaps images,
   runs epilogue and completion, and moves between chapters.
   Uses from utils.js: $, ICON, REDUCED, el, pad2
   Uses from config.js: CHAPTERS
   Uses from chapter-parser.js: normTimings, parseYaml
   Uses from chapter-loader.js: loadFromBundle, loadFromFiles, loadFromUrl, tryAudio
   Uses from narrators.js: AudioVoice, SpeechVoice, TimerVoice */
/* ---------------- player ---------------- */
const S = { ch: null, segs: [], idx: -1, phase: "loading", run: 0, paused: false, muted: false, voice: null, preferred: null, audio: null, times: null, words: [] };

function buildTitle(ch, resolve) {
  const m = ch.meta, num = m.chapter ? pad2(m.chapter.replace(/\D/g, "") || m.chapter) : "01";
  S.num = num;
  document.title = m.title || "Chapter";
  $("#chNum").textContent = "Chapter " + num;
  $("#navCh").textContent = "Chapter " + num;
  $("#epiNum").textContent = "Chapter " + num;
  $("#doneNum").textContent = num;
  if (m.kicker) { $("#chKicker").hidden = false; $("#chKicker").textContent = m.kicker; }
  $("#chTitle").textContent = m.title || "Untitled chapter";
  const meta = $("#chMeta"); meta.innerHTML = "";
  const bits = [m.date, m.location].filter(Boolean);
  bits.forEach((b, i) => { if (i) meta.appendChild(el("i")); const s = el("span", "label label--strong", b); if (/\d/.test(b)) s.style.textTransform = "none"; meta.appendChild(s); });
  // backdrop: explicit background image, else a slow ring of the chapter's own plates
  const imgs = [...ch.story, ...ch.epilogue].flatMap(l => l.images).map(im => resolve(im.src)).filter(Boolean);
  const ring = $("#ring"); ring.innerHTML = "";
  document.querySelectorAll(".bg-photo").forEach(n => n.remove());
  if (m.background && resolve(m.background)) {
    const bg = el("div", "bg-photo"); bg.style.backgroundImage = `url("${resolve(m.background)}")`;
    $("#stage").insertBefore(bg, $("#ringWrap"));
  } else if (imgs.length) {
    const n = Math.max(10, Math.min(16, imgs.length * 2)), small = innerWidth < 820, w = small ? 120 : 168;
    const R = Math.round((w + (small ? 18 : 26)) * n / (2 * Math.PI));
    for (let i = 0; i < n; i++) {
      const t = el("div", "tile"), im = el("img"); im.src = imgs[i % imgs.length]; im.alt = ""; im.decoding = "async";
      t.style.transform = `rotateY(${i * 360 / n}deg) translateZ(${R}px)`; t.appendChild(im); ring.appendChild(t);
    }
  }
}

// One sentence = one inline span inside its paragraph; every letter is its own span so it can be "typed".
// Hidden letters keep their space, so the paragraph is laid out once and the text types into place.
function buildUnit(seg) {
  const u = el("span", "unit");
  seg.chars = []; seg.charPos = []; seg.wordEnds = [];
  const re = /\S+/g; let m, first = true;
  while ((m = re.exec(seg.text))) {
    if (!first) u.appendChild(document.createTextNode(" "));
    first = false;
    const wd = el("span", "wd");
    for (let j = 0; j < m[0].length; j++) {
      const c = el("span", "c", m[0][j]); wd.appendChild(c);
      seg.chars.push(c); seg.charPos.push(m.index + j);
    }
    seg.wordEnds.push(m.index + m[0].length);
    u.appendChild(wd);
  }
  seg.total = seg.chars.length; seg.k = 0;
  return u;
}
function buildParagraphs(container, segs) {
  let p = null, pg = null;
  segs.forEach(seg => {
    if (!p || seg.pg !== pg) { p = el("p", "para"); container.appendChild(p); pg = seg.pg; }
    else p.appendChild(document.createTextNode(" "));
    seg.node = buildUnit(seg); p.appendChild(seg.node);
  });
  container.querySelectorAll(".para").forEach(pp => pp.setAttribute("aria-label", pp.textContent));
  container.querySelectorAll(".unit").forEach(u => u.setAttribute("aria-hidden", "true"));
}
function buildPlate(img, resolve) {
  const f = el("figure", "plate"); f.style.margin = "0";
  const fr = el("div", "frame"), im = el("img");
  im.src = resolve(img.src); im.alt = img.alt || ""; im.decoding = "async";
  fr.appendChild(im); f.appendChild(fr);
  if (img.alt || img.label) {
    const c = el("figcaption", "cap"); c.appendChild(el("span", "", img.alt));
    if (img.label) c.appendChild(el("span", "label", img.label));
    f.appendChild(c);
  }
  return f;
}

function build(ch, resolve) {
  S.ch = ch; S.resolve = resolve; S.segs = [];
  buildTitle(ch, resolve);
  const lines = $("#lines"), vis = $("#visual"), epiL = $("#epiLines"), epiBg = $("#epiBg");
  lines.innerHTML = vis.innerHTML = epiL.innerHTML = epiBg.innerHTML = "";
  ch.story.forEach((l, k) => {
    const seg = { kind: "story", text: l.text, images: l.images, pg: l.pg, n: k + 1, i: S.segs.length };
    seg.plates = l.images.map(im => { const p = buildPlate(im, resolve); vis.appendChild(p); return p; });
    S.segs.push(seg);
  });
  ch.epilogue.forEach((l, k) => {
    const seg = { kind: "epi", text: l.text, images: l.images, pg: l.pg, n: k + 1, i: S.segs.length };
    seg.plates = l.images.map(im => { const d = el("div"); d.style.backgroundImage = `url("${resolve(im.src)}")`; d.dataset.cap = [im.alt, im.label].filter(Boolean).join(" · "); epiBg.appendChild(d); return d; });
    S.segs.push(seg);
  });
  S.shownStory = S.shownEpi = null;
  assignHeldPlates();
  buildParagraphs(lines, S.segs.filter(s => s.kind === "story"));
  buildParagraphs(epiL, S.segs.filter(s => s.kind === "epi"));
  $("#epiTitle").textContent = ch.epilogueTitle || "Epilogue";
  // progress rail
  const segs = $("#segs"); segs.innerHTML = "";
  S.segs.forEach(s => { const d = el("div", "seg" + (s.kind === "epi" ? " epi" : "")); const b = el("b"); d.appendChild(b); s.bar = b; segs.appendChild(d); });
  $("#doneTitle").textContent = ch.meta.title || "";
}

/* scene switching */
function show(id) { ["titleScene", "storyScene", "epiScene", "doneScene"].forEach(s => $("#" + s).classList.toggle("on", s === id)); }

/* pausable wait */
function wait(ms, run) {
  return new Promise(res => {
    let left = REDUCED ? Math.min(ms, 300) : ms, last = performance.now();
    const f = now => {
      if (run !== S.run) return;
      if (!S.paused) left -= now - last;
      last = now;
      left <= 0 ? res() : requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
}

/* word reveal */
function setTyped(seg, k, caret) {
  k = Math.max(0, Math.min(seg.total, k));
  const from = Math.min(seg.k, k), to = Math.max(seg.k, k);
  for (let i = from; i < to; i++) seg.chars[i].classList.toggle("v", i < k);
  seg.chars.forEach(c => c.classList.remove("cur", "pre"));
  if (caret && seg.total) (k ? seg.chars[k - 1].classList.add("cur") : seg.chars[0].classList.add("pre"));
  seg.node.classList.toggle("typing", caret && k > 0 && k < seg.total);
  seg.k = k;
}
function reveal(seg, p, charIndex) {
  let k;
  if (charIndex != null) {
    // speech engine reports word starts: type up to the end of the word being spoken
    const end = seg.wordEnds.find(e => e > charIndex) ?? seg.text.length;
    k = seg.charPos.filter(pos => pos < end).length;
    if (k < seg.k) k = seg.k;
  } else k = p >= 1 ? seg.total : Math.round(p * seg.total);
  setTyped(seg, k, true);
  const frac = charIndex != null ? Math.min(1, (charIndex + 1) / seg.text.length) : p;
  seg.bar.style.transform = `scaleX(${Math.max(0, Math.min(1, frac))})`;
  // multiple images on one line share its duration
  if (seg.plates.length > 1) {
    const j = Math.min(seg.plates.length - 1, Math.floor(frac * seg.plates.length));
    if (seg.plateIdx !== j) { setPlate(seg, j); }
  }
}
// One plate on screen per scene. Swapping animates the old one out and the new one in;
// showing the plate that is already up does nothing, so a held image stays still.
function showPlate(kind, pl) {
  const key = kind === "epi" ? "shownEpi" : "shownStory", cur = S[key] || null;
  if (cur === (pl || null)) return;
  if (kind === "epi") {
    if (cur) cur.classList.remove("in");
    if (pl) { pl.classList.add("in"); $("#epiCap").textContent = pl.dataset.cap || ""; $("#epiCap").classList.add("in"); }
    else $("#epiCap").classList.remove("in");
  } else {
    if (cur) { cur.classList.remove("in"); cur.classList.add("out"); }
    if (pl) { pl.classList.remove("out"); void pl.offsetWidth; pl.classList.add("in"); }
  }
  S[key] = pl || null;
}
function setPlate(seg, j) { showPlate(seg.kind, seg.eff[j]); seg.plateIdx = j; }
function clearPlates(seg) { showPlate(seg.kind, null); seg.plateIdx = -1; }
// A line without its own image holds the previous line's image (or, at the start, the next one's),
// so the visual panel is never empty while the chapter has images.
function assignHeldPlates() {
  ["story", "epi"].forEach(kind => {
    const list = S.segs.filter(s => s.kind === kind); let last = null, nextP = null;
    list.forEach(s => { if (s.plates.length) last = s.plates[s.plates.length - 1]; s.eff = s.plates.length ? s.plates : (last ? [last] : []); });
    for (let k = list.length - 1; k >= 0; k--) { const s = list[k]; if (s.plates.length) nextP = s.plates[0]; else if (!s.eff.length && nextP) s.eff = [nextP]; }
  });
}
function centerLine(seg) {
  if (seg.kind !== "story") return;
  // keep the sentence being typed near the middle of the column (layout is fixed, so measure untransformed)
  const col = $("#textCol"), lines = $("#lines"), node = seg.node;
  const top = node.getBoundingClientRect().top - lines.getBoundingClientRect().top;
  const y = top + node.getBoundingClientRect().height / 2 - col.clientHeight * .5;
  lines.style.transform = `translateY(${-y}px)`;
}

function activate(seg) {
  S.segs.forEach(s => {
    if (s === seg) return;
    s.node.classList.toggle("past", s.i < seg.i);
    s.node.classList.remove("typing");
    if (s.i > seg.i) { setTyped(s, 0, false); s.bar.style.transform = "scaleX(0)"; }
    else { setTyped(s, s.total, false); s.bar.style.transform = "scaleX(1)"; }
  });
  seg.node.classList.remove("past");
  setTyped(seg, 0, true);
  centerLine(seg);
  if (seg.eff.length) setPlate(seg, 0); else clearPlates(seg);
  $("#count").textContent = seg.kind === "story" ? pad2(seg.n) + " / " + pad2(S.ch.story.length) : (S.ch.epilogueTitle || "Epilogue");
}

function speakSeg(seg, run) {
  return new Promise(res => {
    reveal(seg, 0);
    S.voice.speak(seg, {
      progress: (p, ci) => { if (run === S.run) reveal(seg, p, ci); },
      end: () => { if (run === S.run) { reveal(seg, 1); res(); } },
      fail: () => {
        if (run !== S.run) return;
        // sound was blocked (no user gesture yet): keep going silently, offer to turn it on
        S.voice = new TimerVoice(); if (!S.muted) $("#soundPill").hidden = false;
        speakSeg(seg, run).then(res);
      }
    });
    S.current = { seg, res };
  });
}

async function play(fromIdx, run) {
  for (let i = fromIdx; i < S.segs.length; i++) {
    if (run !== S.run) return;
    const seg = S.segs[i], prev = S.segs[i - 1];
    S.idx = i;
    if (seg.kind === "epi" && (!prev || prev.kind !== "epi")) {
      if (prev) await wait(700, run);
      S.phase = "epilogue"; show("epiScene");
      if (prev) setTimeout(() => { if (run === S.run) clearPlates(prev); }, 1200); // leave with the story scene, not before it
      $("#epiScene").classList.remove("settled");
      await wait(2600, run); if (run !== S.run) return;
      $("#epiScene").classList.add("settled");
      await wait(1300, run); if (run !== S.run) return;
    }
    activate(seg);
    await speakSeg(seg, run);
    if (run !== S.run) return;
    await wait(seg.kind === "epi" ? 900 : 650, run);
    if (run !== S.run) return;
    const next = S.segs[i + 1];
    if (!next) clearPlates(seg);
    else if (next.kind === seg.kind) await wait(next.eff[0] !== S[seg.kind === "epi" ? "shownEpi" : "shownStory"] ? 300 : 150, run);
  }
  if (run !== S.run) return;
  await wait(1600, run);
  finish(run);
}

function finish(run) {
  if (run !== S.run) return;
  S.phase = "done"; S.segs.forEach(s => clearPlates(s));
  $("#bar").classList.remove("on"); $("#soundPill").hidden = true;
  setNextButton(); show("doneScene");
}

function chooseVoice() {
  if (S.muted) return new TimerVoice();
  if (S.audio && S.times) return new AudioVoice(S.audio, S.times);
  if (SpeechVoice.available()) return new SpeechVoice();
  return new TimerVoice();
}

let begun = false;
function begin() {
  if (begun || S.phase !== "title") return;
  begun = true; S.phase = "story";
  const run = ++S.run;
  S.voice = chooseVoice();
  if (S.voice.kind === "speech") { try { speechSynthesis.speak(new SpeechSynthesisUtterance("")); } catch (e) {} } // prime inside the gesture
  $("#titleScene").classList.add("leave");
  $("#stage").classList.add("leaving");
  $("#cue").hidden = true;
  setTimeout(() => {
    if (run !== S.run) return;
    const s0 = S.segs[0]; if (s0 && s0.eff.length) showPlate("story", s0.eff[0]); // first image arrives with the scene
    show("storyScene"); $("#bar").classList.add("on");
    setTimeout(() => play(0, run), REDUCED ? 100 : 1100);
  }, REDUCED ? 100 : 1000);
}

function resetToTitle(autoStart) {
  S.run++; if (S.voice) S.voice.stop();
  S.paused = false; setPauseIcon(); begun = false; S.phase = "title"; S.idx = -1;
  $("#soundPill").hidden = true; $("#bar").classList.remove("on");
  S.segs.forEach(s => { s.node.classList.remove("past", "typing"); setTyped(s, 0, false); s.bar.style.transform = "scaleX(0)"; s.plates.forEach(p => p.classList.remove("in", "out")); s.plateIdx = -1; });
  S.shownStory = S.shownEpi = null;
  $("#epiCap").classList.remove("in"); $("#lines").style.transform = "none";
  $("#epiScene").classList.remove("settled");
  $("#titleScene").classList.remove("leave"); $("#stage").classList.remove("leaving");
  show("titleScene"); $("#cue").hidden = false;
  if (autoStart) setTimeout(begin, REDUCED ? 200 : 1800);
}

/* controls */
function setPauseIcon() { const b = $("#pauseBtn"); b.innerHTML = S.paused ? ICON.play : ICON.pause; b.setAttribute("aria-label", S.paused ? "Resume" : "Pause"); }
function setMuteIcon() { const b = $("#muteBtn"); b.innerHTML = S.muted ? ICON.off : ICON.on; b.setAttribute("aria-label", S.muted ? "Turn narration on" : "Mute narration"); }
function togglePause() {
  if (S.phase !== "story" && S.phase !== "epilogue") return;
  S.paused = !S.paused; S.paused ? S.voice.pause() : S.voice.resume(); setPauseIcon();
}
function restartCurrentWith(voice) {
  // switch narrator mid-line: restart the line that is playing
  S.voice.stop(); S.voice = voice; S.paused = false; setPauseIcon();
  const run = ++S.run, i = Math.max(0, S.idx);
  const seg = S.segs[i];
  if (seg && seg.kind === "epi" && S.phase !== "epilogue") return play(i, run);
  play(i, run);
}
$("#pauseBtn").addEventListener("click", togglePause);
$("#muteBtn").addEventListener("click", () => {
  S.muted = !S.muted; setMuteIcon(); $("#soundPill").hidden = true;
  if (S.phase === "story" || S.phase === "epilogue") restartCurrentWith(chooseVoice());
});
$("#soundPill").addEventListener("click", () => { $("#soundPill").hidden = true; S.muted = false; setMuteIcon(); restartCurrentWith(chooseVoice()); });
$("#restartBtn").addEventListener("click", () => resetToTitle(true));
$("#beginBtn").addEventListener("click", begin);

/* scroll / swipe / keys start the chapter from the title */
addEventListener("wheel", e => { if (inStory() && S.phase === "title" && e.deltaY > 8 && performance.now() - (S.titleAt || 0) > 1200) begin(); }, { passive: true });
let ty = null;
addEventListener("touchstart", e => { ty = e.touches[0].clientY; }, { passive: true });
addEventListener("touchmove", e => { if (ty != null && inStory() && S.phase === "title" && performance.now() - (S.titleAt || 0) > 1200 && ty - e.touches[0].clientY > 30) { ty = null; begin(); } }, { passive: true });
addEventListener("keydown", e => {
  if (e.target.closest("input") || !inStory()) return;
  if (S.phase === "title" && ["ArrowDown", "PageDown", " ", "Enter"].includes(e.key) && !e.target.closest("button")) { e.preventDefault(); begin(); }
  else if ((S.phase === "story" || S.phase === "epilogue") && e.key === " " && !e.target.closest("button")) { e.preventDefault(); togglePause(); }
});
addEventListener("resize", () => { const s = S.segs[S.idx]; if (s) centerLine(s); });

/* theme toggle (kit: dark by default) */
function setTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  $("#tDark").setAttribute("aria-pressed", String(t === "dark")); $("#tLight").setAttribute("aria-pressed", String(t === "light"));
  try { localStorage.setItem("bk-theme", t); } catch (e) {}
}
$("#themeToggle").addEventListener("click", () => setTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light"));
(() => { let t = null; try { t = localStorage.getItem("bk-theme"); } catch (e) {} const host = document.documentElement.getAttribute("data-theme"); setTheme(t || (host === "light" ? "light" : "dark")); })();

/* boot */
async function boot(loaded) {
  const { ch, resolve, audioCands, timingText } = loaded;
  if (!ch.story.length) throw new Error("chapter.md has no story lines.");
  build(ch, resolve);
  S.audio = await tryAudio(audioCands);
  S.times = null;
  if (S.audio) {
    const tt = await timingText(); let obj = null;
    if (tt) { try { obj = /\.json$/i.test(tt.name) || /^\s*[\[{]/.test(tt.txt) ? JSON.parse(tt.txt) : parseYaml(tt.txt); } catch (e) { obj = null; } }
    S.times = normTimings(obj, ch.story.length, ch.epilogue.length);
    if (!S.times) {
      // no timing file: share the voiceover across lines by length
      const total = S.segs.reduce((a, s) => a + s.text.length + 18, 0); let t = 0;
      S.times = S.segs.map(s => { const d = S.audio.duration * (s.text.length + 18) / total; const r = { start: t, end: t + d }; t += d; return r; });
    }
  }
  $("#picker").hidden = true; $("#cue").hidden = false;
  S.phase = "title"; begun = false;
  show("titleScene");
}
function needFolder(msg) {
  S.phase = "pick";
  $("#chNum").textContent = "Chapter player";
  $("#chTitle").textContent = "Open a chapter";
  $("#chMeta").innerHTML = ""; if (msg) $("#chMeta").appendChild(el("span", "label label--strong", msg));
  $("#picker").hidden = false; $("#cue").hidden = true;
  show("titleScene");
}
$("#folderInput").addEventListener("change", async e => {
  try { await boot(await loadFromFiles(e.target.files)); }
  catch (err) { needFolder(err.message || "Could not read that folder"); }
});

setPauseIcon(); setMuteIcon();

/* ---------------- chapters in reading order ---------------- */
const bundle = document.getElementById("chapter-bundle");
const chapterCount = () => bundle ? (JSON.parse(bundle.textContent).chapters || [0]).length : CHAPTERS.length;
const loaderFor = i => bundle ? Promise.resolve().then(() => loadFromBundle(bundle, i)) : loadFromUrl(CHAPTERS[i]);
const inStory = () => document.documentElement.classList.contains("in-story");
S.chIndex = 0;

async function openChapter(i, autoStart) {
  if (S.voice) S.voice.stop();
  if (S.audio) S.audio.pause();
  if (S.segs.length) resetToTitle(false);
  S.chIndex = i; S.phase = "loading"; S.nextTitle = null;
  $("#skipNext").hidden = i + 1 >= chapterCount(); // no next chapter after the last one
  await boot(await loaderFor(i));
  S.titleAt = performance.now();
  if (autoStart) setTimeout(() => { if (S.chIndex === i && S.phase === "title") begin(); }, REDUCED ? 300 : 2200);
  if (i + 1 < chapterCount()) { try { const n = await loaderFor(i + 1); S.nextTitle = n.ch.meta.title || null; } catch (e) {} }
}
const ARROW = '<svg class="arrow" viewBox="0 0 20 20" aria-hidden="true"><path d="M11.3 4.3 10.2 5.4l3.85 3.85H3.5v1.5h10.55L10.2 14.6l1.1 1.1L17 10z"/></svg>';
function setNextButton() {
  const b = $("#nextBtn"), last = S.chIndex + 1 >= chapterCount();
  b.innerHTML = last ? "Back to the beginning" : "Next chapter" + (S.nextTitle ? " <small>· " + S.nextTitle.replace(/[<&]/g, "") + "</small>" : "") + ARROW;
  setTimeout(() => { try { b.focus({ preventScroll: true }); } catch (e) {} }, 900);
}
// Skip ahead while a chapter is playing
$("#skipNext").addEventListener("click", () => { if (S.chIndex + 1 < chapterCount()) openChapter(S.chIndex + 1, true); });
$("#nextBtn").addEventListener("click", () => {
  if (S.chIndex + 1 < chapterCount()) openChapter(S.chIndex + 1, true);
  else exitStory();
});

function enterStory() {
  if (inStory()) return;
  document.documentElement.classList.add("in-story");
  S.titleAt = performance.now();
  if (S.phase === "title") show("titleScene");
  setTimeout(() => { try { $("#beginBtn").focus({ preventScroll: true }); } catch (e) {} }, 300);
}
function exitStory() {
  resetToTitle(false);
  document.documentElement.classList.remove("in-story");
  scrollTo(0, 0);
  openChapter(0, false);
}
document.querySelectorAll("[data-enter-story]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); enterStory(); }));
