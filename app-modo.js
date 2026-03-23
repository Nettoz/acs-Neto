/* ═══════════════════════════════════════════════════════════════════
   ACS Neto — app-modo.js  v2.0
   Modo de exibição: Tablet (601×967 fixo — portrait) ↔ PC (responsivo)

   Este módulo faz APENAS:
     1. Aplica/remove o atributo data-modo="tablet" no <html>
     2. Injeta o CSS mínimo de frame (.app 601×967, sidebar overlay,
        body centralizado) — o grosso do estilo fica em styles-tablet.css
     3. Injeta e gerencia o botão de troca na topbar
     4. Persiste a preferência em localStorage('acs-modo')

   Todo o sistema de tokens (tipografia, espaçamento, componentes)
   vive em styles-tablet.css — edite apenas lá.
   ═══════════════════════════════════════════════════════════════════ */

(function (W) {
  'use strict';

  /* ── Constantes — devem coincidir com styles-tablet.css ────────── */
  var LS_KEY    = 'acs-modo';
  var TABLET_W  = 601;    /* --tab-w  em styles-tablet.css            */
  var TABLET_H  = 967;    /* --tab-h  em styles-tablet.css            */
  var SIDEBAR_W = 240;    /* --tab-sidebar-w em styles-tablet.css     */
  var TOPBAR_H  = 48;     /* --tab-topbar-h  em styles-tablet.css     */
  var STYLE_ID  = 'acs-modo-frame';   /* apenas o CSS de frame        */
  var BTN_ID    = 'modo-toggle-btn';

  /* ── CSS de frame — mínimo absoluto ───────────────────────────── */
  // styles-tablet.css controla todos os tokens e componentes.
  // Aqui só ficam regras que NÃO podem estar em arquivo estático
  // (precisam dos valores das constantes JS acima).
  var CSS_FRAME = `
[data-modo="tablet"] body {
  display:flex; align-items:center; justify-content:center;
  min-height:100vh; min-height:100dvh; overflow:hidden;
  background:#ffffff;
}
[data-modo="tablet"] body::before {
  content:''; display:none;
}
[data-modo="tablet"] .app {
  width:${TABLET_W}px !important; height:${TABLET_H}px !important;
  min-width:${TABLET_W}px !important; min-height:${TABLET_H}px !important;
  max-width:${TABLET_W}px !important; max-height:${TABLET_H}px !important;
  border-radius:14px; overflow:hidden; position:relative; z-index:1; flex-shrink:0;
  box-shadow:0 0 0 1px rgba(255,255,255,.06),0 8px 64px rgba(0,0,0,.8),0 32px 128px rgba(0,0,0,.6);
}
[data-modo="tablet"] .sidebar {
  position:absolute !important; left:0; top:0; bottom:0;
  width:${SIDEBAR_W}px !important; height:100% !important;
  transform:translateX(-100%) !important;
  transition:transform .26s cubic-bezier(.4,0,.2,1) !important;
  z-index:500 !important;
}
[data-modo="tablet"] .sidebar.open { transform:translateX(0) !important; }
[data-modo="tablet"] .sidebar-overlay {
  display:none !important; position:absolute !important; inset:0 !important; z-index:499 !important;
}
[data-modo="tablet"] .sidebar-overlay.active { display:block !important; }
[data-modo="tablet"] .hamburger { display:flex !important; }
[data-modo="tablet"] .main { width:100% !important; max-width:100% !important; }
[data-modo="tablet"] .modal-overlay { position:absolute !important; z-index:8000 !important; }
[data-modo="tablet"] .notif-panel {
  position:absolute !important;
  top:${TOPBAR_H}px !important;
  right:0 !important;
  width:min(360px,100%) !important;
  height:calc(${TABLET_H}px - ${TOPBAR_H}px) !important;
  max-height:calc(${TABLET_H}px - ${TOPBAR_H}px) !important;
}
[data-modo="tablet"] .notif-overlay { position:absolute !important; inset:0 !important; z-index:8500 !important; }
`;

  /* ── Estado ────────────────────────────────────────────────────── */
  var _modo = 'pc';

  /* ── Aplica modo ───────────────────────────────────────────────── */
  function _aplicarModo(modo) {
    _modo = modo;

    document.documentElement.setAttribute('data-modo', modo);

    var el = document.getElementById(STYLE_ID);
    if (modo === 'tablet') {
      if (!el) {
        el = document.createElement('style');
        el.id = STYLE_ID;
        document.head.appendChild(el);
      }
      el.textContent = CSS_FRAME;

      // Limpa inline styles de personalizacao que sobrescreveriam tokens tablet.
      // personalizacao.js usa root.style.setProperty() para --text-*, --h-btn, --sp-4 etc.
      // Inline styles têm prioridade (1,0,0,0) e batem qualquer regra CSS.
      var root = document.documentElement;
      var tabletTokens = [
        '--text-2xs','--text-xs','--text-sm','--text-base','--text-md',
        '--text-lg','--text-xl','--text-2xl',
        '--h-btn','--h-btn-sm','--h-btn-lg','--h-input','--h-nav','--h-tab','--h-chip',
        '--sp-1','--sp-2','--sp-3','--sp-4','--sp-5','--sp-6','--sp-8',
        '--p-btn','--p-btn-sm','--p-btn-lg','--p-input','--p-card','--p-content','--p-modal',
        '--r-xs','--r-sm','--r-md','--r-lg','--r-xl','--r-full',
        '--radius-sm','--radius-md','--radius-lg','--radius-clean',
      ];
      tabletTokens.forEach(function(tok) { root.style.removeProperty(tok); });

      // Move #save-indicator para dentro de .app (está em body antes do .app)
      var saveEl = document.getElementById('save-indicator');
      var appEl  = document.querySelector('.app');
      if (saveEl && appEl && saveEl.parentElement !== appEl) appEl.appendChild(saveEl);

      // Move #loading-overlay para dentro de .app
      var loadEl = document.getElementById('loading-overlay');
      if (loadEl && appEl && loadEl.parentElement !== appEl) appEl.appendChild(loadEl);

    } else {
      if (el) el.textContent = '';

      // Ao sair do tablet, devolve #save-indicator e #loading-overlay ao body
      var saveEl2 = document.getElementById('save-indicator');
      if (saveEl2 && saveEl2.parentElement !== document.body) document.body.insertBefore(saveEl2, document.body.firstChild);
      var loadEl2 = document.getElementById('loading-overlay');
      if (loadEl2 && loadEl2.parentElement !== document.body) document.body.insertBefore(loadEl2, document.body.firstChild);
    }

    var btn = document.getElementById(BTN_ID);
    if (btn) {
      btn.setAttribute('title', modo === 'tablet'
        ? 'Modo Tablet ativo (601×967) — clique para PC'
        : 'Modo PC ativo — clique para Tablet');
      btn.setAttribute('data-modo-ativo', modo);
      btn.querySelector('.modo-icon-pc').style.opacity       = modo === 'pc'     ? '1' : '0';
      btn.querySelector('.modo-icon-pc').style.transform     = modo === 'pc'     ? 'scale(1)' : 'scale(.4)';
      btn.querySelector('.modo-icon-tablet').style.opacity   = modo === 'tablet' ? '1' : '0';
      btn.querySelector('.modo-icon-tablet').style.transform = modo === 'tablet' ? 'scale(1)' : 'scale(.4)';
    }

    try { localStorage.setItem(LS_KEY, modo); } catch(e) {}

    var logado = sessionStorage.getItem('acs_dev_autenticado') === '1';
    if (logado && typeof inicializarUiPosLogin === 'function') {
      requestAnimationFrame(function () { inicializarUiPosLogin({ badge: false }); });
    }
  }

  /* ── Toggle público ────────────────────────────────────────────── */
  function toggleModo() { _aplicarModo(_modo === 'pc' ? 'tablet' : 'pc'); }
  W.toggleModo = toggleModo;

  /* ── Injeta botão na topbar ────────────────────────────────────── */
  function _injetarBotao() {
    if (document.getElementById(BTN_ID)) return;
    var themeBtn = document.getElementById('theme-toggle-btn');
    if (!themeBtn) return;

    var btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.className = 'modo-toggle-btn';
    btn.setAttribute('data-modo-ativo', 'pc');
    btn.setAttribute('title', 'Modo PC ativo — clique para Tablet');
    btn.setAttribute('aria-label', 'Alternar modo PC/Tablet');
    btn.onclick = toggleModo;

    btn.innerHTML =
      '<span class="modo-icon-pc" style="position:absolute;transition:transform .25s ease,opacity .25s ease;opacity:1;transform:scale(1);display:flex">'
      + '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>'
      + '</svg></span>'
      + '<span class="modo-icon-tablet" style="position:absolute;transition:transform .25s ease,opacity .25s ease;opacity:0;transform:scale(.4);display:flex">'
      + '<svg width="14" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/>'
      + '</svg></span>';

    themeBtn.parentNode.insertBefore(btn, themeBtn);
  }

  /* ── CSS base do botão ─────────────────────────────────────────── */
  function _injetarCssBase() {
    if (document.getElementById('acs-modo-btn-css')) return;
    var s = document.createElement('style');
    s.id = 'acs-modo-btn-css';
    s.textContent = [
      '.modo-toggle-btn{width:38px;height:38px;border-radius:var(--r-sm,8px);background:var(--surface-2);border:1.5px solid var(--bdr-strong);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--slate-600,#666);font-size:16px;transition:background .2s,border-color .2s,transform .15s,color .15s;flex-shrink:0;position:relative;overflow:hidden}',
      '.modo-toggle-btn:hover{background:var(--surface-3,var(--slate-100));transform:scale(1.08)}',
      '[data-modo="tablet"] .modo-toggle-btn{background:var(--orange-bg,rgba(255,117,51,.12));border-color:var(--orange-bdr,rgba(255,117,51,.28));color:var(--laranja,#FF7533)}',
      '[data-theme="light"] .modo-toggle-btn{background:var(--surface-2);border-color:rgba(0,0,0,.14)}',
      '[data-theme="light"][data-modo="tablet"] .modo-toggle-btn{background:var(--orange-bg,rgba(255,117,51,.10));border-color:var(--orange-bdr,rgba(255,117,51,.22));color:var(--orange-600,#bb4c00)}',
    ].join('');
    document.head.appendChild(s);
  }

  /* ── Init ──────────────────────────────────────────────────────── */
  function _init() {
    var saved = 'pc';
    try { saved = localStorage.getItem(LS_KEY) || 'pc'; } catch(e) {}
    if (saved !== 'tablet') saved = 'pc';

    _injetarCssBase();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        _injetarBotao();
        _aplicarModo(saved);
      });
    } else {
      _injetarBotao();
      _aplicarModo(saved);
    }
  }

  _init();

})(window);
