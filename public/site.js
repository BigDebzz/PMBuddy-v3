// Theme switch for the static pages. Uses the same saved choice as the app ("pmb-theme").
(function () {
  var KEY = 'pmb-theme';
  var root = document.documentElement;

  function read() {
    try {
      var v = localStorage.getItem(KEY);
      return v === 'light' || v === 'dark' ? v : 'auto';
    } catch (e) { return 'auto'; }
  }

  function apply(mode) {
    if (mode === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
  }

  function save(mode) {
    try {
      if (mode === 'auto') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, mode);
    } catch (e) { /* storage can be unavailable; the choice then lasts for this visit only */ }
  }

  var mode = read();
  apply(mode);

  var buttons = document.querySelectorAll('.theme button');
  function mark() {
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', buttons[i].getAttribute('data-mode') === mode ? 'true' : 'false');
    }
  }
  mark();

  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function (e) {
      mode = e.currentTarget.getAttribute('data-mode');
      apply(mode);
      save(mode);
      mark();
    });
  }
})();
