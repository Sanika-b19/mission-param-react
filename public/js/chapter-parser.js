/* chapter.md → { meta, story[], epilogue[] }, plus timings.json / timings.yaml parsing. */

/* ---------------- chapter.md parsing ---------------- */
function cleanInline(s) {
  return s.replace(/\*\*|__|`/g, "").replace(/(^|\s)[*_](\S[^*_]*\S|\S)[*_](?=\s|$|[.,;:!?])/g, "$1$2").trim();
}
function parseChapter(md) {
  md = md.replace(/\r\n?/g, "\n").replace(/^﻿/, "");
  const meta = {};
  const fm = md.match(/^---\s*\n([\s\S]*?)\n---\s*(\n|$)/);
  if (fm) {
    fm[1].split("\n").forEach(l => {
      const m = l.match(/^\s*([\w-]+)\s*:\s*(.*)$/);
      if (m) meta[m[1].toLowerCase()] = m[2].trim().replace(/^["']|["']$/g, "");
    });
    md = md.slice(fm[0].length);
  }
  const out = { meta, story: [], epilogue: [], epilogueTitle: "Epilogue" };
  // A text line is one narrated sentence; lines without a blank line between them share a paragraph.
  let section = "story", para = null, pendingImgs = [], pg = 0;
  const target = () => out[section];
  const close = () => { if (para) pg++; para = null; };
  const imgRe = /^!\[([^\]]*)\]\(\s*<?([^\s)>]+)>?(?:\s+["']([^"']*)["'])?\s*\)\s*$/;
  for (let raw of md.split("\n")) {
    let line = raw.trim();
    if (/^```|^~~~/.test(line)) { close(); continue; }
    if (!line) { close(); continue; }
    const h = line.match(/^#{1,6}\s+(.*)$/);
    const epiPlain = line.match(/^\**\s*epilogue\s*\**\s*:?\s*(.*)$/i);
    if (h || (epiPlain && !para)) {
      const text = cleanInline(h ? h[1] : line);
      const epi = text.match(/^epilogue\s*[:\-–—]?\s*(.*)$/i);
      if (epi) { section = "epilogue"; if (epi[1]) out.epilogueTitle = epi[1]; }
      else if (/^(story|narration|chapter text|lines)\b/i.test(text)) section = "story";
      else if (!meta.title && !out.story.length) meta.title = text.replace(/^chapter\s+\d+\s*[:\-–—·]\s*/i, "");
      close(); continue;
    }
    const im = line.match(imgRe);
    if (im) {
      const img = { alt: im[1].trim(), src: im[2], label: (im[3] || "").trim() };
      const list = target();
      if (para) para.images.push(img);
      else if (list.length) list[list.length - 1].images.push(img);
      else pendingImgs.push(img);
      continue;
    }
    line = cleanInline(line.replace(/^>\s?/, ""));
    const li = line.match(/^(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (li) { close(); line = li[1]; }
    if (!line) continue;
    // a hard-wrapped sentence (previous line has no closing punctuation) continues the same unit
    if (para && !/[.!?:;"”’')]$/.test(para.text) && !para.images.length) para.text += " " + line;
    else { para = { text: line, images: pendingImgs, pg }; pendingImgs = []; target().push(para); }
  }
  return out;
}

/* timings.json / timings.yaml → [{start,end}] for every segment */
function parseYaml(txt) {
  const root = {}; let key = null, item = null, flat = null;
  for (const raw of txt.replace(/\r/g, "").split("\n")) {
    if (!raw.trim() || /^\s*#/.test(raw)) continue;
    const top = raw.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (top) { key = top[1]; item = null; root[key] = top[2] ? Number(top[2]) || top[2] : []; continue; }
    const li = raw.match(/^\s*-\s*(.*)$/);
    const list = key ? root[key] : (flat = flat || []);
    if (li) {
      const v = li[1].trim();
      const arr = v.match(/^\[\s*([\d.]+)\s*,\s*([\d.]+)\s*\]$/);
      if (arr) { list.push([+arr[1], +arr[2]]); item = null; continue; }
      item = {}; list.push(item);
      v.replace(/^\{|\}$/g, "").split(",").forEach(p => { const m = p.match(/([\w-]+)\s*:\s*([\d.:]+)/); if (m) item[m[1]] = toSec(m[2]); });
      continue;
    }
    const kv = raw.match(/^\s+([\w-]+)\s*:\s*([\d.:]+)/);
    if (kv && item) item[kv[1]] = toSec(kv[2]);
  }
  return flat || root;
}
function toSec(v) { if (typeof v === "number") return v; const p = String(v).split(":").map(Number); return p.reduce((a, b) => a * 60 + b, 0); }
function normTimings(obj, nStory, nEpi) {
  if (!obj) return null;
  const item = t => Array.isArray(t) ? { start: toSec(t[0]), end: toSec(t[1]) } : { start: toSec(t.start ?? t.from ?? t.in), end: t.end != null || t.to != null || t.out != null ? toSec(t.end ?? t.to ?? t.out) : null };
  let list;
  if (Array.isArray(obj)) list = obj.map(item);
  else if (Array.isArray(obj.lines)) list = obj.lines.map(item);
  else list = [...(obj.story || []), ...(obj.epilogue || [])].map(item);
  if (list.length < nStory + nEpi) return null;
  list.forEach((t, i) => { if (t.end == null || isNaN(t.end)) t.end = list[i + 1] ? list[i + 1].start - .15 : t.start + 6; });
  return list.slice(0, nStory + nEpi);
}
