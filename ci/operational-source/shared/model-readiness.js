/* Legacy page boundary. Historical display does not authorize execution. */
(function () {
  'use strict';
  let manifest = null;
  let loadFailed = false;
  const state = { status: 'blocked', reasons: [] };
  function show() {
    if (!document.body) return;
    let banner = document.getElementById('model-readiness-boundary');
    if (!banner) {
      banner = document.createElement('aside');
      banner.id = 'model-readiness-boundary';
      banner.setAttribute('role', 'status');
      banner.style.cssText = 'padding:16px;background:#fff4d6;color:#513c00;border-bottom:2px solid #c79b25;font:14px/1.5 system-ui;position:relative;z-index:1000';
      document.body.prepend(banner);
    }
    banner.textContent = 'Historical, unapproved legacy diagnostic display. Model execution is blocked in this interface until its exact variant and artifact prerequisites are reviewed. Use the qualified Scenario Lab routes for supported diagnostics.';
    if (loadFailed) banner.textContent += ' The model readiness policy could not be loaded.';
  }
  window.ModelReadiness = {
    state,
    requireExecution(route) {
      // No standalone route has been registered by the reviewed manifest.
      // A future registration still needs an artifact/input validator here;
      // merely adding a route or an approval flag cannot unlock inline solvers.
      const variant = manifest && manifest.routes && manifest.routes[route];
      state.status = 'blocked';
      state.reasons = [{ code: loadFailed ? 'manifest_unavailable' : 'route_variant_unsupported', message: variant ? 'Standalone artifact and input validation has not been implemented.' : 'This standalone execution route has no declared variant contract.', blocking: true, path: route }];
      show();
      return false;
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show);
  else show();
  fetch('../policy-ui/data/model-manifest.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('Manifest unavailable');
      return response.json();
    })
    .then(value => {
      if (value.schema_version !== '1.0') throw new Error('Manifest schema incompatible');
      manifest = value;
      show();
    })
    .catch(() => { loadFailed = true; show(); });
})();
