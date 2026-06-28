/* ════════════════════════════════════════════════════════════════
   Debt-Free.world — SHARED i18n ENGINE  (single source of truth)
   One engine for the whole project. Pages register nothing of their
   own — they load this file + i18n-dict.js, then call DFWI18n.init()
   (homepage) or drive it from boot() (member area).

   Mechanism:
     data-i18n="key"            -> el.textContent
     data-i18n-html="key"       -> el.innerHTML   (markup-bearing strings)
     data-i18n-placeholder="key"-> el placeholder
     data-i18n-aria="key"       -> el aria-label

   Rules baked in:
     - A language is OFFERED only if it has a non-empty dictionary.
       (Kills the cosmetic bug: never switch to a lang that renders EN.)
     - Per-key EN fallback, always.
     - Persists choice to localStorage 'dfw_lang'.
     - Protected brand/product tokens are kept verbatim INSIDE each
       language's values — the engine does not need to know them.
   ════════════════════════════════════════════════════════════════ */
(function (w) {
  var STORAGE = 'dfw_lang';
  var DEFAULT = 'EN';

  var dict   = {};   /* code -> { key: value }  (only non-empty langs) */
  var labels = {};   /* code -> native label                          */
  var order  = [];   /* registration order of usable languages        */
  var current = DEFAULT;
  var changeCbs = [];

  /* Register a language. Empty/whitespace tables are recorded as a
     label only and stay OUT of the selector until populated. */
  function register(code, label, table) {
    code = String(code).toUpperCase();
    if (label) labels[code] = label;
    if (table && typeof table === 'object' && Object.keys(table).length) {
      dict[code] = table;
      if (order.indexOf(code) < 0) order.push(code);
    }
  }

  function has(code) {
    code = String(code || '').toUpperCase();
    return !!(dict[code] && Object.keys(dict[code]).length);
  }

  /* Languages with real dictionaries, EN always first. */
  function available() {
    var a = order.slice();
    a.sort(function (x, y) { return x === 'EN' ? -1 : (y === 'EN' ? 1 : 0); });
    return a;
  }

  function label(code) {
    code = String(code || '').toUpperCase();
    return labels[code] || code;
  }

  function t(key, vars) {
    var d = dict[current] || dict[DEFAULT] || {};
    var en = dict[DEFAULT] || {};
    var s = (d[key] !== undefined) ? d[key]
          : (en[key] !== undefined) ? en[key]
          : key;
    if (vars) Object.keys(vars).forEach(function (k) {
      s = String(s).replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
    });
    return s;
  }

  function paint() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
  }

  function persist(code) { try { localStorage.setItem(STORAGE, code); } catch (e) {} }
  function stored()      { try { return localStorage.getItem(STORAGE); } catch (e) { return null; } }

  /* Canonical entry point. Refuses any language without a dictionary. */
  function applyLang(code) {
    code = String(code || '').toUpperCase();
    if (!has(code)) code = DEFAULT;
    current = code;
    persist(code);
    if (document.documentElement) document.documentElement.lang = code.toLowerCase();
    paint();
    changeCbs.forEach(function (cb) { try { cb(code); } catch (e) {} });
    return code;
  }

  function onChange(cb) { if (typeof cb === 'function') changeCbs.push(cb); }

  /* Homepage-style init: stored choice -> else EN. (Member area sets its
     own language from the member record in boot(), then this persists
     subsequent manual switches.) */
  function init() {
    var want = stored() || DEFAULT;
    if (!has(want)) want = DEFAULT;
    return applyLang(want);
  }

  w.DFWI18n = {
    register: register,
    has: has,
    available: available,
    label: label,
    t: t,
    applyLang: applyLang,
    onChange: onChange,
    init: init,
    repaint: paint,
    stored: stored,
    DEFAULT: DEFAULT,
    STORAGE: STORAGE,
    get current() { return current; }
  };
})(window);
