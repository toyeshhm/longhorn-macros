// The press has to be picked before the first paint, and the stylesheet ships inside the 300KB app bundle: a
// Night reader on a dark phone got a full screen of cream stock until the bundle parsed. This runs from <head>,
// blocking, ahead of everything, and src/ui/theme.ts then owns the press for the rest of the session.
//
// It carries one line per press — the stock it prints on and whether that stock is light or dark — because it
// cannot import anything. That is the whole duplication, and tests/theme.test.ts fails the moment it drifts from
// src/theme.ts. The rest of the token set (the two drums, the four macro inks, the grain, the marks) arrives
// with the bundle, which is also when the first pixel of the app itself is painted.
(function () {
  // No prototype: a stored press id is looked up as a bare property, so on a plain object literal "constructor"
  // and "__proto__" both came back truthy and the .slice below threw, which killed the rest of this script and
  // cost the pre-paint press entirely — the exact wrong-stock flash it exists to prevent.
  var STOCK = Object.assign(Object.create(null), {
    day: '#F7F3EA light',
    night: '#141A33 dark',
    cherry: '#FCFBFD light',
    newsprint: '#E6DCC4 light',
    blueprint: '#0B2039 dark',
    meadow: '#E7EDE0 light'
  })
  var raw = ''
  try {
    raw = localStorage.getItem('lm-press') || ''
    // Upgrade from the two-theme build, whose key was 'lm-theme' with 'auto' | 'light' | 'night'. Without this a
    // reader who had chosen Night silently landed back on Match phone, and the old key was never cleaned up.
    if (!raw) {
      var old = localStorage.getItem('lm-theme')
      if (old) {
        raw = (old === 'light' ? 'day' : old === 'night' ? 'night' : 'auto') + '|day|night'
        localStorage.setItem('lm-press', raw)
        localStorage.removeItem('lm-theme')
      }
    }
  } catch {
    // Private mode and blocked site data both throw on access; the app must still print.
  }
  // "choice|light|dark", the format src/theme.ts writes. Anything unreadable falls back per field.
  var parts = raw.split('|')
  var light = STOCK[parts[1]] && STOCK[parts[1]].slice(8) === 'light' ? parts[1] : 'day'
  var dark = STOCK[parts[2]] && STOCK[parts[2]].slice(8) === 'dark' ? parts[2] : 'night'
  var press = STOCK[parts[0]]
    ? parts[0]
    : matchMedia('(prefers-color-scheme: dark)').matches ? dark : light
  var stock = STOCK[press].slice(0, 7)
  var root = document.documentElement
  root.dataset.theme = press
  root.style.colorScheme = STOCK[press].slice(8)
  root.style.setProperty('--paper', stock)
  var meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', stock)
})()
