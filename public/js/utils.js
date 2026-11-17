/* Small DOM helpers, icons and the reduced-motion flag. */
const $ = s => document.querySelector(s);
const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
const pad2 = n => String(n).padStart(2, "0");
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const ICON = {
  pause: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 4h3.5v12H5zm6.5 0H15v12h-3.5z"/></svg>',
  play: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4l10 6-10 6z"/></svg>',
  on: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7.5h3.2L10.5 4v12l-4.3-3.5H3zM13 6.2a5 5 0 0 1 0 7.6l-1-1.1a3.5 3.5 0 0 0 0-5.4zm2.2-2.3a8.2 8.2 0 0 1 0 12.2l-1-1.1a6.7 6.7 0 0 0 0-10z"/></svg>',
  off: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7.5h3.2L10.5 4v12l-4.3-3.5H3zm10.3-.3 1.9 1.9 1.9-1.9 1 1-1.9 1.9 1.9 1.9-1 1-1.9-1.9-1.9 1.9-1-1 1.9-1.9-1.9-1.9z"/></svg>'
};
