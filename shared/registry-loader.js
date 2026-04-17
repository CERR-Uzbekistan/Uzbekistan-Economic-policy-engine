/* ═══════════════════════════════════════════════════════════════
   EPE Parameter Registry Loader
   Fetches shared/parameter-registry.json once and exposes it on
   window.EPE_REGISTRY. Also provides a helper to render a small
   "Linked to registry vX" badge so stakeholders can see the link.

   Usage in a model page <head>:
     <script src="../shared/registry-loader.js" defer></script>

   Then in model code:
     EPE.ready(reg => {
       myParams.armington = EPE.get('trade_elasticities.default_armington', 2.5);
       EPE.badge();  // optional: stamps a badge in the corner
     });
   ═══════════════════════════════════════════════════════════════ */
(function () {
  const REGISTRY_PATHS = [
    '../shared/parameter-registry.json',
    'shared/parameter-registry.json',
    './shared/parameter-registry.json',
  ];

  const api = {
    registry: null,
    _callbacks: [],
    _loaded: false,
    _error: null,

    ready(cb) {
      if (this._loaded) cb(this.registry, this._error);
      else this._callbacks.push(cb);
    },

    get(path, fallback) {
      if (!this.registry) return fallback;
      const parts = path.split('.');
      let cur = this.registry;
      for (const p of parts) {
        if (cur == null || typeof cur !== 'object') return fallback;
        cur = cur[p];
      }
      return cur === undefined ? fallback : cur;
    },

    badge(opts = {}) {
      if (document.getElementById('epe-registry-badge')) return;
      const el = document.createElement('div');
      el.id = 'epe-registry-badge';
      const v = this.registry?._meta?.version || '?';
      const status = this.registry ? 'linked' : 'offline';
      el.innerHTML = `
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${this.registry ? '#14b8a6' : '#ef4444'};margin-right:6px;"></span>
        Registry ${status === 'linked' ? 'v' + v : '(offline)'}
      `;
      Object.assign(el.style, {
        position: 'fixed', bottom: '12px', right: '12px', zIndex: 9999,
        background: 'rgba(15,23,42,.92)', color: '#e2e8f0',
        fontFamily: 'Inter, system-ui, sans-serif', fontSize: '11px',
        fontWeight: '600', padding: '6px 10px', borderRadius: '16px',
        border: '1px solid rgba(148,163,184,.25)',
        boxShadow: '0 2px 8px rgba(0,0,0,.25)',
        letterSpacing: '.3px', pointerEvents: 'auto', cursor: 'help',
      });
      el.title = this.registry
        ? `Linked to shared/parameter-registry.json\nLast updated: ${this.registry._meta?.last_updated || '?'}\nClick this model's values to see which came from the registry.`
        : 'Registry failed to load — falling back to local defaults.';
      document.body.appendChild(el);
    },
  };

  async function tryLoad() {
    for (const p of REGISTRY_PATHS) {
      try {
        const r = await fetch(p);
        if (r.ok) {
          api.registry = await r.json();
          return;
        }
      } catch (e) { /* try next */ }
    }
    if (window.EPE_REGISTRY_DATA) {
      api.registry = window.EPE_REGISTRY_DATA;
      api._source = 'embedded';
      return;
    }
    api._error = 'registry not reachable';
  }

  tryLoad().finally(() => {
    api._loaded = true;
    api._callbacks.forEach(cb => {
      try { cb(api.registry, api._error); } catch (e) { console.warn('[EPE] ready cb failed', e); }
    });
    api._callbacks = [];
  });

  window.EPE = api;
})();
