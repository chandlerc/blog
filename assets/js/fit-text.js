// Scales elements marked `{.r-fit-text}` to fill the width of their container,
// replacing reveal.js's own implementation of that class.
//
// reveal delegates to fitty, which applies a single multiplicative correction
// per call -- new size = old size * available width / measured width -- and
// measures through `scrollWidth`, which is a whole number of pixels. Glyph
// advances are quantized, so text width is not exactly proportional to font
// size, and one correction overshoots while the next undershoots. reveal calls
// fitty again every time it loads a slide, so the size a heading ends up at
// depends on how many times its slide happened to be loaded: on this site the
// same heading renders at 58.4475px when you jump straight to it and 58.7412px
// once you have left and come back, and the second of those is 3px wider than
// the slide it is supposed to fit inside. Another heading overflows by 12px.
// Whichever correction lands first runs before the webfonts arrive, against
// fallback metrics, and sticks until the slide is loaded again. Headings that a
// flex container blockifies are never scaled at all, because a stretched box
// always measures exactly as wide as the space available.
//
// Nothing in the answer depends on the window: reveal lays slides out in a
// fixed coordinate system and scales the result with a transform, so the size
// that fits is a property of the text, the fonts, and the width of the
// container. Measure it once, exactly, and keep it until that width changes.

(function () {
  'use strict';

  // Blink lays out at 1/64px; nothing finer is observable.
  var GRID = 64;
  // Sizes are always derived from this reference rather than from whatever the
  // element currently has, so the result cannot depend on what ran before.
  var REFERENCE = 100;
  // Bounds chosen so that text this cannot fit ends up the size reveal's
  // version rendered it at: it stopped shrinking at 24px, and stopped growing
  // at 80% of the slide height.
  var MIN_SIZE = 24;

  // Rename the elements before reveal.js is even fetched, so that its
  // implementation never sees them and the two never fight over a font size.
  var found = document.querySelectorAll('.r-fit-text');
  for (var i = 0; i < found.length; i++) {
    found[i].classList.replace('r-fit-text', 'fit-text');
  }
  if (found.length === 0) return;

  // Container width each element was last fitted against.
  var fittedFor = new WeakMap();
  var fontsReady = false;

  // The width the element's text wants at `size`, in rendered pixels.
  // `max-content` takes the containing block out of the measurement, so a
  // heading stretched by a flex parent, or clamped by a narrow one, still
  // reports what its text actually needs.
  function widthAt(element, size) {
    element.style.fontSize = size + 'px';
    element.style.width = 'max-content';
    var width = element.getBoundingClientRect().width;
    element.style.width = '';
    return width;
  }

  function quantize(size, maxSize) {
    return Math.max(
      MIN_SIZE,
      Math.floor(Math.min(size, maxSize) * GRID) / GRID
    );
  }

  function fit(element) {
    var container = element.parentNode;
    var style = getComputedStyle(container);
    var available =
      container.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);
    // Slides outside reveal's view distance are `display: none` and cannot be
    // measured. They are fitted when they come into view.
    if (available <= 0 || container.offsetWidth <= 0) return;
    if (fittedFor.get(element) === available) return;
    fittedFor.set(element, available);

    // Measurements come back through reveal's scale transform, so the target
    // has to be scaled the same way.
    var scale = container.getBoundingClientRect().width / container.offsetWidth;
    var target = available * scale;
    // The upper bound described at MIN_SIZE.
    var maxSize = 0.8 * Reveal.getComputedSlideSize().height;
    var size = quantize(
      REFERENCE * (target / widthAt(element, REFERENCE)),
      maxSize
    );

    // Proportionality is only approximate, so check the estimate rather than
    // trusting it, and keep correcting until the text really does fit.
    for (var attempt = 0; attempt < 8 && size > MIN_SIZE; attempt++) {
      var width = widthAt(element, size);
      if (width <= target) break;
      var next = quantize(size * (target / width), maxSize);
      size = next < size ? next : Math.max(MIN_SIZE, size - 1 / GRID);
    }
    element.style.fontSize = size + 'px';
  }

  // Queried afresh each pass: the PDF export copies slides that span more than
  // one page, and those copies need fitting too.
  function fitAll() {
    if (!fontsReady) return;
    var elements = document.querySelectorAll('.fit-text');
    for (var index = 0; index < elements.length; index++) {
      fit(elements[index]);
    }
  }

  // The container's width is the only input that ever changes: it goes from
  // nothing to a real number when reveal displays the slide, and it changes
  // again for a PDF export. Watching it directly means there is no set of
  // reveal events to keep in sync with, and no chance of being left with a fit
  // computed against a layout that was still settling.
  var observer = new ResizeObserver(fitAll);
  for (i = 0; i < found.length; i++) {
    observer.observe(found[i].parentNode);
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Copies made for the PDF export exist only once this has fired, and the
    // print layout is final by then.
    Reveal.on('pdf-ready', fitAll);
    // Fitting against fallback metrics is what makes reveal's version overflow,
    // so nothing happens until the webfonts are in place.
    document.fonts.ready.then(function () {
      fontsReady = true;
      fitAll();
    });
  });
})();
