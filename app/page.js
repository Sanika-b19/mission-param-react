"use client";

import Script from "next/script";

/* The markup below is a direct React translation of the original index.html <body>. The actual
   behaviour (hero scroll, typing, voiceover sync, held image panel, next-chapter) still runs from
   the proven vanilla engine in /public/js — loaded below, in order, as classic scripts — because it
   talks to these elements by id exactly the way it always did. Nothing about the experience changed;
   only the project became a Next.js app so it can be built and deployed like a normal React site. */
export default function Page() {
  return (
    <>
      <a className="skip bk-btn bk-btn--accent" href="#begin" data-enter-story>
        Skip to story
      </a>

      <header className="param-hero" id="top" aria-labelledby="param-title">
        <div className="param-hero__stage">
          <div className="hero-scene">
            <p className="param-hero__era intro">
              <i aria-hidden="true"></i>
              <span className="bk-label bk-label--strong">1946 – Today</span>
              <i aria-hidden="true"></i>
            </p>
            <h1 className="param-hero__title intro intro--2" id="param-title">
              PARAM
            </h1>
          </div>
          <div className="hero-scene">
            <p className="param-hero__subtitle">The Machine India Was Told It Couldn&rsquo;t Have</p>
          </div>
          <div className="hero-scene">
            <p className="param-hero__lead">
              A visual journey through PARAM—India&rsquo;s bold leap into supercomputing, innovation, and
              technological self-reliance.
            </p>
            <div className="param-hero__actions">
              <a className="bk-btn bk-btn--accent" href="#begin" data-enter-story>
                Begin the Story
                <svg className="arrow" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M11.3 4.3 10.2 5.4l3.85 3.85H3.5v1.5h10.55L10.2 14.6l1.1 1.1L17 10z" />
                </svg>
              </a>
            </div>
          </div>
          <div className="param-hero__cue bk-cue" aria-hidden="true">
            <span className="bk-label bk-label--strong">Scroll</span>
            <span className="bk-cue__line"></span>
          </div>
          <div className="param-hero__progress" aria-hidden="true"></div>
        </div>
      </header>

      <div className="stage" id="stage">
        <div className="ring-wrap" id="ringWrap" aria-hidden="true">
          <div className="ring-tilt">
            <div className="ring" id="ring"></div>
          </div>
        </div>

        <section className="scene title-scene" id="titleScene" aria-labelledby="chTitle">
          <div className="title-block" id="titleBlock">
            <div className="meta-row reveal">
              <span className="label label--accent" id="chNum">
                Chapter
              </span>
            </div>
            <p className="kicker reveal" id="chKicker" hidden></p>
            <h1 className="chapter-title reveal" id="chTitle">
              Loading chapter
            </h1>
            <div className="meta-row reveal" id="chMeta"></div>
            <div className="picker" id="picker" hidden>
              <p>
                Choose the chapter folder. It needs a <b>chapter.md</b>, an <b>images</b> folder, and
                optionally a voiceover and timings file.
              </p>
              <label className="btn btn--glow" htmlFor="folderInput">
                Choose chapter folder
              </label>
              <input type="file" id="folderInput" webkitdirectory="true" directory="true" multiple />
            </div>
          </div>
          <div className="cue" id="cue" hidden>
            <span className="label label--strong">Scroll to begin</span>
            <span className="cue__line"></span>
            <button className="btn btn--ghost" id="beginBtn" type="button">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M3 7.5h3.2L10.5 4v12l-4.3-3.5H3zM13 6.2a5 5 0 0 1 0 7.6l-1-1.1a3.5 3.5 0 0 0 0-5.4zm2.2-2.3a8.2 8.2 0 0 1 0 12.2l-1-1.1a6.7 6.7 0 0 0 0-10z" />
              </svg>
              Begin with sound
            </button>
          </div>
        </section>

        <section className="scene story" id="storyScene" aria-label="Story">
          <div className="text-col" id="textCol">
            <div className="lines" id="lines"></div>
          </div>
          <div className="visual" id="visual" aria-live="off"></div>
        </section>

        <section className="scene epi-scene" id="epiScene" aria-label="Epilogue">
          <div className="epi-bg" id="epiBg"></div>
          <div className="epi-head">
            <span className="label label--accent" id="epiNum"></span>
            <h2 className="chapter-title" id="epiTitle">
              Epilogue
            </h2>
          </div>
          <div className="epi-lines" id="epiLines"></div>
          <div className="epi-cap label label--strong" id="epiCap"></div>
        </section>

        <section className="scene done-scene" id="doneScene" aria-label="Chapter complete">
          <div className="done">
            <div className="seal">
              <svg viewBox="0 0 96 96" aria-hidden="true">
                <circle className="track" cx="48" cy="48" r="46" />
                <circle className="draw" cx="48" cy="48" r="46" />
              </svg>
              <b id="doneNum">01</b>
            </div>
            <span className="label label--accent">Chapter complete</span>
            <h2 className="chapter-title" id="doneTitle"></h2>
            <div className="actions">
              <button className="btn btn--glow next-btn" id="nextBtn" type="button"></button>
            </div>
          </div>
        </section>
      </div>

      <nav className="nav" aria-label="Storyline">
        <span className="nav__name">Mission PARAM</span>
        <span className="label label--strong" id="navCh"></span>
      </nav>

      <button className="btn btn--glow sound-pill" id="soundPill" type="button" hidden>
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M3 7.5h3.2L10.5 4v12l-4.3-3.5H3zM13 6.2a5 5 0 0 1 0 7.6l-1-1.1a3.5 3.5 0 0 0 0-5.4z" />
        </svg>
        Turn on narration
      </button>

      <div className="bar" id="bar">
        <button className="label toggle" id="themeToggle" type="button" aria-label="Switch theme">
          <span aria-pressed="true" id="tDark">
            Dark
          </span>
          <span>/</span>
          <span aria-pressed="false" id="tLight">
            Light
          </span>
        </button>
        <div className="progress">
          <div className="segs" id="segs"></div>
          <span className="label label--strong count" id="count"></span>
        </div>
        <div className="controls">
          <button className="btn btn--ghost skip-next" id="skipNext" type="button" aria-label="Next chapter" hidden>
            <span>Next chapter</span>
            <svg className="arrow" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M11.3 4.3 10.2 5.4l3.85 3.85H3.5v1.5h10.55L10.2 14.6l1.1 1.1L17 10z" />
            </svg>
          </button>
          <button className="icon-btn" id="muteBtn" type="button" aria-label="Mute narration"></button>
          <button className="icon-btn" id="pauseBtn" type="button" aria-label="Pause"></button>
          <button className="icon-btn" id="restartBtn" type="button" aria-label="Restart chapter">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 3.5a6.5 6.5 0 1 1-6.3 8h1.6A5 5 0 1 0 10 5v2.6L6.4 4.3 10 1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* The engine. public/js/engine.js is utils+config+chapter-parser+chapter-loader+narrators+
          player+hero+main, concatenated in that exact order (the individual files are also kept in
          public/js, unchanged, as readable source) — one file means no script-load-order risk. */}
      <Script src="/js/engine.js" strategy="afterInteractive" />
    </>
  );
}
