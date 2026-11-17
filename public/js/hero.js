/* PARAM hero: a pinned stage whose scenes lift away as the page scrolls.
   Uses from player.js: enterStory, inStory */
/* ---------------- PARAM hero: scroll lifts each scene away and brings the next in ---------------- */
function initHero() {
  document.documentElement.classList.add("js");   // switches the hero from stacked (no script) to pinned scenes
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const hero = document.querySelector(".param-hero");
  const scenes = [].slice.call(hero.querySelectorAll(".hero-scene"));
  const cue = hero.querySelector(".param-hero__cue"), bar = hero.querySelector(".param-hero__progress");
  const N = scenes.length, RISE = 80, BLUR = 6;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), smooth = x => x * x * (3 - 2 * x);
  let endAt = 0;
  function progress() { const travel = hero.offsetHeight - innerHeight; return travel > 0 ? clamp(-hero.getBoundingClientRect().top / travel, 0, 1) : 1; }
  function render() {
    if (reduce.matches) { scenes.forEach(s => { s.removeAttribute("style"); s.inert = false; }); return; }
    const p = progress(), x = p * (N - 1), i = Math.floor(x), f = x - i;
    const pos = Math.min(N - 1, i + smooth(clamp((f - 0.3) / 0.4, 0, 1)));
    scenes.forEach((s, k) => {
      const d = pos - k, a = clamp(1 - Math.abs(d) * 2.2, 0, 1);
      s.style.opacity = a; s.style.transform = "translateY(" + (-d * RISE) + "px)";
      s.style.filter = "blur(" + (Math.min(1, Math.abs(d)) * BLUR) + "px)";
      const active = a > 0.6; s.style.pointerEvents = active ? "auto" : "none"; s.inert = !active;
      s.setAttribute("aria-hidden", active ? "false" : "true");
    });
    cue.classList.toggle("is-out", pos > N - 1.4);
    bar.style.transform = "scaleX(" + p + ")";
    if (p >= 0.999) { if (!endAt) endAt = performance.now(); } else endAt = 0;
  }
  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; render(); }); } };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  if (reduce.addEventListener) reduce.addEventListener("change", render);
  render();
  // Scrolling on past the last hero scene (after a short read) opens Chapter 01.
  addEventListener("wheel", e => { if (!inStory() && e.deltaY > 8 && endAt && performance.now() - endAt > 700) enterStory(); }, { passive: true });
}
