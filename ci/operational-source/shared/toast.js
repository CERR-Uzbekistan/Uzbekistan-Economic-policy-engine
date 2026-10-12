'use strict';

/**
 * toast.js — Lightweight toast notification system
 * Replaces silent fallbacks and alert() calls with non-intrusive notifications.
 */

(function(global) {
  const CONTAINER_ID = 'uz-toast-container';

  function getContainer() {
    let c = document.getElementById(CONTAINER_ID);
    if (!c) {
      c = document.createElement('div');
      c.id = CONTAINER_ID;
      c.setAttribute('role', 'status');
      c.setAttribute('aria-live', 'polite');
      Object.assign(c.style, {
        position: 'fixed', top: '72px', right: '20px', zIndex: '9999',
        display: 'flex', flexDirection: 'column', gap: '8px',
        pointerEvents: 'none', maxWidth: '380px'
      });
      document.body.appendChild(c);
    }
    return c;
  }

  const ICONS = {
    info:    { icon: 'ℹ️', bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
    success: { icon: '✓',  bg: '#f0fdf4', border: '#bbf7d0', color: '#166534' },
    warning: { icon: '⚠',  bg: '#fffbeb', border: '#fde68a', color: '#92400e' },
    error:   { icon: '✕',  bg: '#fef2f2', border: '#fecaca', color: '#991b1b' }
  };

  /**
   * Show a toast notification.
   * @param {string} message
   * @param {'info'|'success'|'warning'|'error'} type
   * @param {number} duration - ms before auto-dismiss (0 = sticky)
   */
  function show(message, type, duration) {
    type = type || 'info';
    duration = duration !== undefined ? duration : 4000;
    const s = ICONS[type] || ICONS.info;
    const el = document.createElement('div');
    Object.assign(el.style, {
      background: s.bg, border: '1px solid ' + s.border, color: s.color,
      borderRadius: '10px', padding: '12px 16px', fontSize: '13px',
      fontFamily: "'Inter', system-ui, sans-serif", fontWeight: '500',
      lineHeight: '1.4', boxShadow: '0 4px 16px rgba(0,0,0,.1)',
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      pointerEvents: 'auto', opacity: '0', transform: 'translateX(20px)',
      transition: 'all .25s ease'
    });
    el.innerHTML = `<span style="font-size:16px;flex-shrink:0;line-height:1;">${s.icon}</span>
      <span style="flex:1;">${message}</span>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:${s.color};cursor:pointer;font-size:16px;padding:0;line-height:1;opacity:.6;" aria-label="Dismiss">&times;</button>`;
    getContainer().appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateX(0)';
    });
    if (duration > 0) {
      setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(20px)';
        setTimeout(() => el.remove(), 300);
      }, duration);
    }
  }

  global.Toast = { show };
})(window);
