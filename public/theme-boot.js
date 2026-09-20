// The press has to be picked before the first paint, and the stylesheet ships inside the 300KB app bundle: a
// Night reader on a dark phone got a full screen of cream stock until the bundle parsed. This runs from <head>,
// blocking, ahead of everything, and src/ui/theme.ts then owns the choice for the rest of the session.
// Keep the key and the two stocks in step with src/theme.ts — tests/theme.test.ts fails if they drift.
(function () {
  var choice = null
  try {
    choice = localStorage.getItem('lm-theme')
  } catch {
    // Private mode and blocked site data both throw on access; the app must still print.
  }
  var theme = choice === 'light' || choice === 'night'
    ? choice
    : matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'light'
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme === 'night' ? 'dark' : 'light'
  var meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'night' ? '#141A33' : '#F7F3EA')
})()
