/* Loads a chapter from a served folder, a picked folder, or the standalone bundle; preloads the voiceover.
   Uses from chapter-parser.js: parseChapter */
/* ---------------- loading (URL folder or picked folder) ---------------- */
function normPath(p) {
  const parts = []; p.split("/").forEach(s => { if (!s || s === ".") return; if (s === "..") parts.pop(); else parts.push(s); });
  return parts.join("/");
}
// Read a text file of a chapter. Served: fetch it live. Opened from disk (file://), browsers block
// fetch, so fall back to chapters/content.js, which tools/build.py writes from the same files.
const FROM_DISK = location.protocol === "file:";
async function readText(path) {
  if (!FROM_DISK) { try { const r = await fetch(path, { cache: "no-store" }); if (r.ok) return await r.text(); } catch (e) {} }
  const c = window.MP_CONTENT && window.MP_CONTENT[normPath(path)];
  return typeof c === "string" ? c : null;
}
async function loadFromUrl(base) {
  const md = await readText(base + "chapter.md");
  if (md == null) throw new Error("no chapter.md");
  const ch = parseChapter(md);
  const baseUrl = new URL(base, location.href);
  const resolve = p => /^(https?:|data:|blob:)/.test(p) ? p : new URL(p, baseUrl).href;
  const audioCands = (ch.meta.voiceover ? [ch.meta.voiceover] : []).concat(["voiceover.mp3", "voiceover.wav", "voiceover.m4a", "voiceover.ogg"]).map(resolve);
  const timingText = async () => {
    const names = ch.meta.timings ? [ch.meta.timings] : ["timings.json", "timings.yaml", "timings.yml"];
    for (const n of names) {
      const txt = await readText(base + n);
      if (txt && txt.trim()) return { name: n, txt };
    }
    return null;
  };
  return { ch, resolve, audioCands, timingText };
}
// Standalone build: the chapter folder packed into the page (see build-standalone.py), so it opens from disk.
let bundleData = null;
function loadFromBundle(node, idx) {
  bundleData = bundleData || JSON.parse(node.textContent);
  const b = bundleData.chapters ? bundleData.chapters[idx || 0] : bundleData;
  const files = new Map(Object.entries(b.files || {}).map(([k, v]) => [normPath(k).toLowerCase(), v]));
  const urls = new Map();
  const toBlobUrl = d => {
    const m = d.match(/^data:([^;,]+)?(;base64)?,(.*)$/s); if (!m) return d;
    const bin = m[2] ? atob(m[3]) : decodeURIComponent(m[3]);
    const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([arr], { type: m[1] || "application/octet-stream" }));
  };
  const resolve = p => {
    if (/^(https?:|data:|blob:)/.test(p)) return p;
    const key = normPath(p).toLowerCase(), d = files.get(key); if (!d) return "";
    if (!urls.has(key)) urls.set(key, toBlobUrl(d));
    return urls.get(key);
  };
  const ch = parseChapter(b.md);
  const audioCands = (ch.meta.voiceover ? [ch.meta.voiceover] : []).concat(["voiceover.mp3", "voiceover.wav", "voiceover.m4a", "voiceover.ogg"]).filter(n => files.has(normPath(n).toLowerCase())).map(resolve);
  const timingText = async () => b.timings ? { name: b.timingsName || "timings.json", txt: b.timings } : null;
  return { ch, resolve, audioCands, timingText };
}
function loadFromFiles(fileList) {
  const files = [...fileList];
  const pathOf = f => (f.webkitRelativePath || f.name).replace(/\\/g, "/");
  const mdFile = files.find(f => /(^|\/)chapter\.md$/i.test(pathOf(f))) || files.find(f => /\.md$/i.test(f.name));
  if (!mdFile) throw new Error("That folder has no chapter.md.");
  const root = pathOf(mdFile).split("/").slice(0, -1).join("/");
  const map = new Map(files.map(f => [normPath(pathOf(f)).toLowerCase(), f]));
  const urls = new Map();
  const find = p => map.get(normPath((root ? root + "/" : "") + p).toLowerCase());
  const resolve = p => { if (/^(https?:|data:|blob:)/.test(p)) return p; const f = find(p); if (!f) return ""; if (!urls.has(f)) urls.set(f, URL.createObjectURL(f)); return urls.get(f); };
  return mdFile.text().then(txt => {
    const ch = parseChapter(txt);
    const audioCands = (ch.meta.voiceover ? [ch.meta.voiceover] : []).concat(["voiceover.mp3", "voiceover.wav", "voiceover.m4a", "voiceover.ogg"]).filter(find).map(resolve);
    const timingText = async () => {
      for (const n of (ch.meta.timings ? [ch.meta.timings] : ["timings.json", "timings.yaml", "timings.yml"])) { const f = find(n); if (f) return { name: n, txt: await f.text() }; }
      return null;
    };
    return { ch, resolve, audioCands, timingText };
  });
}
function tryAudio(urls) {
  const open = src => new Promise((res, rej) => {
    const a = new Audio(); a.preload = "auto";
    const done = ok => { a.onloadedmetadata = a.onerror = null; ok ? res(a) : rej(); };
    a.onloadedmetadata = () => done(isFinite(a.duration) && a.duration > 0);
    a.onerror = () => done(false);
    setTimeout(() => done(false), 15000);
    a.src = src;
  });
  return (async () => {
    for (let url of urls) {
      let src = url;
      if (!/^(blob:|data:)/.test(url)) {
        // load the whole file first so per-line seeking works on any server
        let r = null;
        if (!FROM_DISK) { try { r = await fetch(url); } catch (e) { r = null; } }   // from disk, fetch is blocked
        if (r && !r.ok) continue;                                     // served, file not there
        if (r) { try { src = URL.createObjectURL(await r.blob()); } catch (e) { src = url; } }
      }
      try { return await open(src); } catch (e) {}                    // from disk: play the file directly
    }
    return null;
  })();
}
