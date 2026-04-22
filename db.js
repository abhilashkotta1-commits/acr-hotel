// ═══════════════════════════════════════════════════════════
//  db.js — Supabase cloud sync for Amma Cheti Ruchulu
//  Include as FIRST script in every page's <head>
// ═══════════════════════════════════════════════════════════
(function () {
  const SB_URL = 'https://idjgwooxjrbksfwqfgtk.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlkamd3b294anJia3Nmd3FmZ3RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjY5MzcsImV4cCI6MjA5MTg0MjkzN30.C2oYFjVOPS5RGTFrrQtH7wbUkTn9_8j_rg72JY2S93Y';
  const HDR  = {
    'apikey'        : SB_KEY,
    'Authorization' : 'Bearer ' + SB_KEY,
    'Content-Type'  : 'application/json'
  };

  // ── Hide page immediately so users don't see a flash of empty data ──
  document.documentElement.style.visibility = 'hidden';

  // ── Keep a reference to the ORIGINAL setItem before we override it ──
  var _origSet = Storage.prototype.setItem;

  // ── Override localStorage.setItem: any fc_ key also syncs to cloud ──
  Storage.prototype.setItem = function (key, value) {
    _origSet.call(this, key, value);
    if (key.startsWith('fc_')) {
      _push(key, value).catch(function (e) {
        console.warn('[db] push failed for', key, e);
      });
    }
  };

  // Push a single key→value to Supabase (upsert)
  function _push(key, valueStr) {
    var value;
    try { value = JSON.parse(valueStr); } catch (e) { value = valueStr; }
    return fetch(SB_URL + '/rest/v1/app_data', {
      method  : 'POST',
      headers : Object.assign({}, HDR, {
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      }),
      body: JSON.stringify({ key: key, value: value })
    }).then(function (r) {
      if (!r.ok) console.warn('[db] push HTTP', r.status, key);
    });
  }

  // Pull ALL fc_ rows from Supabase into localStorage
  function _pull() {
    return fetch(SB_URL + '/rest/v1/app_data?select=key,value', { headers: HDR })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (rows) {
        if (!Array.isArray(rows)) return;
        rows.forEach(function (row) {
          // Use _origSet so we don't trigger another push back to cloud
          _origSet.call(localStorage, row.key, JSON.stringify(row.value));
        });
        console.log('[db] pulled', rows.length, 'rows from cloud');
      });
  }

  // ── fcInit: pages call this instead of running init code directly ──
  //    Ensures BOTH the DB pull AND the DOM are ready before init runs.
  var _dbDone = false;
  var _queue  = [];

  window.fcInit = function (fn) {
    if (_dbDone) {
      _runWhenDomReady(fn);
    } else {
      _queue.push(fn);
    }
  };

  function _runWhenDomReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        try { fn(); } catch (e) { console.error('[db] init error', e); }
      }, { once: true });
    } else {
      try { fn(); } catch (e) { console.error('[db] init error', e); }
    }
  }

  // ── Run: pull then reveal page ──
  window.dbReady = _pull()
    .catch(function (e) {
      console.warn('[db] pull failed — using local data:', e);
    })
    .finally(function () {
      _dbDone = true;
      // Run all queued init functions
      _queue.forEach(function (fn) { _runWhenDomReady(fn); });
      _queue = [];
      // Reveal the page
      document.documentElement.style.visibility = '';
    });

  // ── Convenience: force a full re-pull (call after bulk imports etc.) ──
  window.dbPull = function () {
    return _pull().then(function () {
      console.log('[db] manual pull done');
    });
  };

})();
