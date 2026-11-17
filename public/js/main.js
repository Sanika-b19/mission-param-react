/* Entry point: start the hero, preload Chapter 01, wait for "Begin the Story".
   Uses from player.js: openChapter, needFolder
   Uses from hero.js: initHero */
initHero();
openChapter(0, false).catch(() => needFolder("Could not load the chapter — check that /chapters/01/ was deployed."));
