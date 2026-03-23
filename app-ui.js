// ACS Neto — app-ui.js
// Navegação, modais, toast, notificações e selects de família
// Depende de: app-core.js, app-utils.js

const TOAST_REMOVE_MS = 220;      // duração do fade-out do toast

// ── Cache de elementos de navegação — P2-6 ───────────────────────────────────
// Construído uma única vez após o DOM estar pronto.
// showPage() usa estas caches em O(1) em vez de 3 querySelectorAll por navegação
// (que percorriam todo o DOM + busca textual em atributo onclick a cada clique).
//
// _navCache[pageId]   → <button class="nav-item" data-page="pageId">
// _pageCache[pageId]  → <div id="page-pageId" class="page">
// _navAcompCache[tipo]→ <button data-acomp="tipo"> (fichas de acompanhamento)
const _navCache      = {};
const _pageCache     = {};
const _navAcompCache = {};
let   _navCacheReady = false;

function _buildNavCache() {
  if (_navCacheReady) return;
  document.querySelectorAll('.page[id]').forEach(function(el) {
    _pageCache[el.id.replace('page-', '')] = el;
  });
  document.querySelectorAll('.nav-item[data-page]').forEach(function(el) {
    const page  = el.dataset.page;
    const acomp = el.dataset.acomp;
    if (acomp) {
      // Itens de acompanhamento: data-page="acompanhamento" + data-acomp="has|dm|..."
      _navAcompCache[acomp] = el;
    } else {
      _navCache[page] = el;
    }
  });
  _navCacheReady = true;
}

function showPage(id) {
  // Atualizar título do documento com a página atual
  const titleMap = {
    dashboard: 'Painel de Controle', familias: 'Domicílios e Famílias',
    individuos: 'Indivíduos', pendencias: 'Pendências', agenda: 'Agenda',
    visitas: 'Visitas',
    condicoes: 'Condições de Saúde',
    vacinas: 'Vacinas Infantis',
    metas: 'Metas', configuracoes: 'Configurações', exportar: 'Importar / Exportar', acompanhamento: 'Fichas de Acompanhamento',
    municipio: 'Meu Município'
  };
  document.title = (titleMap[id] ? titleMap[id] + ' — ' : '') + 'ACS Neto';
  // P2-6: O(1) em vez de 3 querySelectorAll + busca textual em onclick.
  _buildNavCache();
  const prevPage = document.querySelector('.page.active');
  if (prevPage) prevPage.classList.remove('active');
  const prevNav = document.querySelector('.nav-item.active');
  if (prevNav) prevNav.classList.remove('active');
  const targetPage = _pageCache[id];
  if (targetPage) targetPage.classList.add('active');
  const targetNav = _navCache[id];
  if (targetNav) {
    targetNav.classList.add('active');
  } else if (id === 'acompanhamento' && _acompTipoAtual) {
    const acompNav = _navAcompCache[_acompTipoAtual];
    if (acompNav) acompNav.classList.add('active');
  }
  const btn = $id('btn-top-action');
  $id('page-title').textContent = pageTitles[id] || id;
  if (pageActions[id]) {
    btn.textContent = pageActions[id].label;
    btn.onclick = pageActions[id].handler;   // P1-C: função real — sem setAttribute+string
    btn.style.display = '';
  } else {
    btn.onclick = null;
    btn.style.display = 'none';
  }
  // Marca a página activa no container de conteúdo (CSS usa data-page para suprimir scroll em páginas full-height)
  const contentEl = $id('main-content');
  if (contentEl) contentEl.dataset.page = id;
  // Remove modais dinâmicos (appendados ao body) que ficam em background
  // ao navegar para outra página — evita o fundo desfocado fantasma
  ['modal-ficha', 'modal-ficha-detalhe', 'modal-ficha-hans'].forEach(mid => {
    const el = document.getElementById(mid);
    if (el) el.remove();
  });
  // Remove também qualquer modal-overlay dinâmico sem id fixo
  document.querySelectorAll('.modal-overlay:not([id])').forEach(el => el.remove());

  renderPage(id);
  // Fecha sidebar em mobile/tablet ao navegar
  // — verifica largura da janela OU modo tablet ativo (frame 601px independente do window)
  const isTabletMode = document.documentElement.getAttribute('data-modo') === 'tablet';
  if (window.innerWidth <= 1023 || isTabletMode) closeSidebar();
}

function renderPage(id) {
  const renders = { 
    dashboard: renderDashboard, 
    familias: renderFamilias, 
    individuos: renderIndividuos,
    pendencias: renderPendencias, 
    agenda: renderAgenda, 
    visitas: renderVisitas, 
    condicoes: renderCondicoes, 
    vacinas: renderVacinas,
    microarea: _preencherConfigDefaults,
    metas: function() {
      // Resetar flags de edição ao entrar na página
      const mEl = $id('meta-manha');
      const tEl = $id('meta-tarde');
      if (mEl) delete mEl.dataset.editing;
      if (tEl) delete tEl.dataset.editing;
      renderMetas();
    },
    configuracoes: renderConfig,
    exportar: function() { renderBackupStats(); renderHistoricoBackups(); },
    acompanhamento: function() {},
    municipio: renderMunicipio
  };
  
  if (renders[id]) renders[id]();
}
function renderAtual() {
  const active = document.querySelector('.page.active');
  if (active) renderPage(active.id.replace('page-',''));
}

function switchTab(el, targetId) {
  const tabsContainer = el.closest('.tabs');
  if (!tabsContainer) return;
  const container = tabsContainer.parentElement;
  if (!container) return;
  tabsContainer.querySelectorAll('.tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  let sib = tabsContainer.nextElementSibling;
  while (sib) {
    if (sib.classList.contains('tab-content')) sib.classList.remove('active');
    else if (sib.classList.contains('tabs')) break;
    sib = sib.nextElementSibling;
  }
  el.classList.add('active');
  el.setAttribute('aria-selected', 'true');
  const target = $id(targetId);
  if (target) target.classList.add('active');
}

function _loadNotifHistory() {
  _notifHistory = DB.getLocal(DB.LS.notifLog, []);
}
function _saveNotifHistory() {
  if (_notifHistory.length > 100) _notifHistory = _notifHistory.slice(-100);
  DB.setLocal(DB.LS.notifLog, _notifHistory);
}
function _renderNotifPanel() {
  const body = $id('notif-panel-body');
  if (!body) return;
  if (!_notifHistory.length) {
    body.innerHTML = '<div style="text-align:center;padding:40px;color:var(--cinza-500);font-size:var(--text-sm)">Nenhuma atividade registrada.</div>';
    return;
  }
  body.innerHTML = _notifHistory.slice().reverse().map(n => `
    <div class="notif-entry ${n.type}">
      <span class="ne-icon">${_notifIcons[n.type] || '🔔'}</span>
      <div class="ne-body">
        <div class="ne-msg">${esc(n.msg)}</div>
        <div class="ne-time">${n.time}</div>
      </div>
    </div>`).join('');
}
function _updateBadge() {
  const badge = $id('notif-badge');
  if (!badge) return;
  if (_notifUnread > 0) {
    badge.textContent = _notifUnread > 99 ? '99+' : _notifUnread;
    badge.classList.add('visible');
  } else {
    badge.classList.remove('visible');
  }
}
function toggleNotifPanel() {
  const panel = $id('notif-panel');
  const overlay = $id('notif-overlay');
  if (!panel) return;
  const isOpen = panel.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open', isOpen);
  if (isOpen) {
    _notifUnread = 0;
    _updateBadge();
    _renderNotifPanel();
  }
}
function limparNotificacoes() {
  _notifHistory = [];
  _saveNotifHistory();
  _notifUnread = 0;
  _updateBadge();
  _renderNotifPanel();
}

function toast(msg, type='') {
  // Registrar no histórico
  const now = new Date();
  const time = now.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }) + ' · ' + now.toLocaleDateString('pt-BR');
  _notifHistory.push({ msg, type, time });
  _saveNotifHistory();
  _notifUnread++;
  _updateBadge();

  // Mostrar toast visual
  const stack = $id('toast-stack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = 'toast-item' + (type ? ' ' + type : '');
  el.innerHTML = `
    <span class="toast-icon">${_notifIcons[type] || '🔔'}</span>
    <div class="toast-body">
      <div class="toast-title">${_notifTitles[type] || 'Aviso'}</div>
      <div class="toast-msg">${esc(msg)}</div>
    </div>
    <span class="toast-close" onclick="this.closest('.toast-item').remove()">✕</span>`;
  el.onclick = (e) => { if (!e.target.classList.contains('toast-close')) toggleNotifPanel(); };
  stack.appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    setTimeout(() => el.remove(), TOAST_REMOVE_MS);
  }, 4000);
}

_loadNotifHistory();
// Mostrar badge com contagem do histórico do dia
(function() {
  const today = new Date().toLocaleDateString('pt-BR');
  const todayCount = _notifHistory.filter(n => n.time && n.time.includes(today)).length;
  if (todayCount > 0) { _notifUnread = 0; } // não marcar como não lido no carregamento
})();
// Retorna true se qualquer modal-overlay está visível — usado para guardar renders
function _anyModalOpen() {
  return document.querySelectorAll('.modal-overlay.open').length > 0;
}

// Agenda renderAtual respeitando modais abertos.
// Se um modal estiver aberto no momento da execução, adia até ele fechar.
function _safeRenderAtual() {
  if (typeof renderAtual !== 'function') return;
  var _attempt = function() {
    if (_anyModalOpen()) {
      // Tenta novamente após a próxima animação (modal pode estar fechando)
      setTimeout(_attempt, 80);
      return;
    }
    renderAtual();
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(_attempt, { timeout: 600 });
  } else {
    setTimeout(_attempt, 0);
  }
}
window._safeRenderAtual = _safeRenderAtual;

function openModal(id) {
  const el = $id(id);
  if (!el) return;
  // Calcula z-index maior que qualquer modal-overlay já aberto.
  // Teto: 1900 — abaixo do login-screen (2000) e do modal-recover (2100).
  const maxZ = Array.from(document.querySelectorAll('.modal-overlay.open'))
    .reduce((m, o) => Math.max(m, parseInt(o.style.zIndex || 1000)), 1000);
  el.style.zIndex  = Math.min(maxZ + 10, 1900);
  el.style.display = 'flex';
  el.classList.add('open');
  el.scrollTop = 0;
}

function closeModal(id) {
  const el = $id(id);
  if (!el) return;
  el.classList.remove('open');
  el.style.display = 'none';
  el.style.zIndex  = '';
}

// Função auxiliar para obter idade numérica segura

// ============================================
// OTIMIZAÇÃO: POPULATE FAMILIA SELECTS
// ============================================

function invalidateFamiliaSelects() {
  lastFamiliaSelectsUpdate = 0;
  familiasCount = -1;
}

function populateFamiliaSelects(force = false) {
  if (isUpdatingSelects) return;
  
  const familias = getFamilias();
  const currentCount = familias.length;
  const now = Date.now();
  const timeSinceLastUpdate = now - lastFamiliaSelectsUpdate;
  const countChanged = currentCount !== familiasCount;
  
  if (!force && !countChanged && timeSinceLastUpdate < 5000) return;
  
  if (!force && !countChanged) {
    let precisaAtualizar = false;
    for (const id of selectIds) {
      const select = $id(id);
      if (!select || select.options.length <= 1) { precisaAtualizar = true; break; }
    }
    if (!precisaAtualizar) return;
  }
  
  isUpdatingSelects = true;
  
  try {
    if (!familias || familias.length === 0) {
      selectIds.forEach(id => {
        const select = $id(id);
        if (select) select.innerHTML = '<option value="">Nenhum domicílio cadastrado</option>';
      });
      familiasCount = 0;
      lastFamiliaSelectsUpdate = now;
      return;
    }
    
    const options = familias.map(f => {
      const label = `${getFamiliaProntuario(f)} – ${getFamiliaLabel(f.idFamilia)}`;
      return `<option value="${f.idFamilia}">${esc(label)}</option>`;
    }).join('');
    
    selectIds.forEach(id => {
      const select = $id(id);
      if (!select) return;
      const defaultOption = id === 'pend-familia'
        ? '<option value="">Geral (sem família específica)</option>'
        : '<option value="">Selecione um domicílio...</option>';
      select.innerHTML = defaultOption + options;
    });
    
    familiasCount = currentCount;
    lastFamiliaSelectsUpdate = now;
    
  } catch (error) {
    console.error('Erro ao popular selects:', error);
  } finally {
    isUpdatingSelects = false;
  }
}


document.addEventListener('keydown', function(e) {
  // Escape: fecha o modal mais recente visível
  // querySelectorAll garante que fechamos o último no DOM (empilhamento natural),
  // não o primeiro — que seria o comportamento errado com modais aninhados.
  if (e.key === 'Escape') {
    const overlays = Array.from(document.querySelectorAll('.modal-overlay.open'));
    if (overlays.length) {
      const top = overlays[overlays.length - 1]; // o mais recente aberto
      top.classList.remove('open');
      top.style.display = 'none';
      top.style.zIndex  = '';
      return;
    }
    // Fecha sidebar se aberta
    const sb = document.querySelector('.sidebar.open');
    if (sb) { closeSidebar(); return; }
  }
  // Ctrl+S / Cmd+S: salvar manualmente (apenas após login)
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    const loginScreen = $id('login-screen');
    if (loginScreen && !loginScreen.classList.contains('hidden')) return;
    save();
    if (typeof DB !== 'undefined' && DB.invalidate) DB.invalidate();
    toast('✓ Dados salvos', 'success');
  }
});

(function tabletTouchEnhancements() {
  const isTouch = () => window.matchMedia('(pointer: coarse)').matches;

  // Thresholds maiores para evitar acionamento acidental durante scroll
  let touchStartX = 0, touchStartY = 0, touchMoved = false;
  const SWIPE_THRESHOLD  = 80;  // px horizontais mínimos (era 60)
  const SWIPE_MAX_VERT   = 40;  // px verticais máximos  (era 80 — muito tolerante)
  const SWIPE_EDGE_ZONE  = 20;  // px da borda esquerda  (era 28)

  document.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchMoved  = false;
  }, { passive: true });

  document.addEventListener('touchmove', function(e) {
    touchMoved = true;
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    if (!touchMoved) return; // toque estático — não é swipe
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
    if (dy > SWIPE_MAX_VERT) return; // muito vertical — provavelmente scroll
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    // Em modo tablet o .app é centralizado — offsetX do frame para calcular zona de borda
    const appEl   = document.querySelector('.app');
    const appLeft = appEl ? appEl.getBoundingClientRect().left : 0;
    const localX  = touchStartX - appLeft;
    if (dx > SWIPE_THRESHOLD && localX <= SWIPE_EDGE_ZONE) {
      if (typeof toggleSidebar === 'function') toggleSidebar();
    }
    if (dx < -SWIPE_THRESHOLD && sidebar.classList.contains('open')) {
      if (typeof closeSidebar === 'function') closeSidebar();
    }
  }, { passive: true });

  // Feedback visual leve — sem disparar click artificialmente
  if (isTouch()) {
    const touchEls = '.familia-card, .domicilio-row, .stat-card, .membro-item, .pend-card';
    document.addEventListener('touchstart', function(e) {
      const el = e.target.closest(touchEls);
      if (el) el.classList.add('touch-active');
    }, { passive: true });
    const clearActive = () => document.querySelectorAll('.touch-active').forEach(el => el.classList.remove('touch-active'));
    document.addEventListener('touchend',    clearActive, { passive: true });
    document.addEventListener('touchcancel', clearActive, { passive: true });
  }

  // ── Scroll para input focado (evita teclado virtual cobrir campo) ──────
  // Só rola se: dispositivo touch + input DENTRO de modal aberto + foco NÃO programático
  // (foco programático acontece após cada render — rolaria a lista inteira sem motivo)
  window._acsProgrammaticFocus = false;

  document.addEventListener('focusin', function(e) {
    if (window._acsProgrammaticFocus) return;
    if (!e.target.matches('input, textarea, select')) return;
    if (!isTouch()) return;
    const isInsideModal = !!e.target.closest('.modal-overlay.open');
    if (!isInsideModal) return;
    setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 320);
  });

})();

// ── Marca foco como programático durante renders para não disparar scrollIntoView ──
(function _wrapRendersFocus() {
  const _wrap = (name) => {
    const orig = window[name];
    if (typeof orig !== 'function') return;
    window[name] = function () {
      window._acsProgrammaticFocus = true;
      orig.apply(this, arguments);
      requestAnimationFrame(() => { window._acsProgrammaticFocus = false; });
    };
  };
  // Espera as funções de render estarem disponíveis
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      _wrap('renderFamilias');
      _wrap('renderIndividuos');
    });
  } else {
    _wrap('renderFamilias');
    _wrap('renderIndividuos');
  }
})();


function fpillClick(btn) {
  const targetId = btn.dataset.target;
  const value    = btn.dataset.value;
  const select   = $id(targetId);
  if (!select) return;
  // Suporta tanto .filter-group (pills normais) quanto .filter-group-compact (pills compactas)
  const group = btn.closest('.filter-group') || btn.closest('.filter-group-compact');
  if (group) group.querySelectorAll('.fpill, .fpill-sm').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

// Sincroniza um <select class="fselect"> com o select oculto correspondente
function fSelectChange(sel) {
  var targetId = sel.dataset.target;
  var hidden   = document.getElementById(targetId);
  if (!hidden) return;
  hidden.value = sel.value;
  hidden.dispatchEvent(new Event('change'));
  // Destaca visualmente se tem filtro ativo
  sel.classList.toggle('fselect-active', sel.value !== '');
}

// Depende de: app-core.js (db, renderFamilias, renderIndividuos, etc.)

(function () {
  'use strict';

  var FILTROS_CONFIG = [

    {
      pageId: 'page-familias',
      search: { id: 'search-domicilio', placeholder: '🔍 Rua, responsável, prontuário…' },
      groups: [
        {
          label: 'Visita',
          pills: [
            { label: 'Todas',      value: '',           target: 'filter-visita-fam', active: true },
            { label: '⏳ Pendente', value: 'sem-visita', target: 'filter-visita-fam' },
            { label: '✓ Visitado', value: 'visitado',   target: 'filter-visita-fam' }
          ]
        },
        {
          label: 'Condição',
          pills: [
            { label: 'Todas',    value: '',               target: 'filter-cond-fam', active: true },
            { label: 'HAS',      value: 'has',            target: 'filter-cond-fam' },
            { label: 'DM',       value: 'dm',             target: 'filter-cond-fam' },
            { label: 'Gestante', value: 'gestante',       target: 'filter-cond-fam' },
            { label: 'Papa+1a',  value: 'papa-atrasado',  target: 'filter-cond-fam' },
            { label: 'Mamo+2a',  value: 'mamo-atrasada',  target: 'filter-cond-fam' }
          ]
        },
        {
          label: 'Ficha',
          pills: [
            { label: 'Todas',          value: '',                  target: 'filter-ficha-fam', active: true },
            { label: '🔴 Vac. Atrasadas', value: 'vacinas-atrasadas', target: 'filter-ficha-fam' }
          ]
        },
        {
          label: 'Ordem',
          pills: [
            { label: 'Rua',   value: 'rua',         target: 'filter-ordem-fam', active: true },
            { label: 'Nº ↑',  value: 'numero-asc',  target: 'filter-ordem-fam' },
            { label: 'Nº ↓',  value: 'numero-desc', target: 'filter-ordem-fam' },
            { label: 'Risco', value: 'risco',        target: 'filter-ordem-fam' }
          ]
        }
      ]
    },

    {
      pageId: 'page-individuos',
      search: { id: 'search-individuo', placeholder: '🔍 Nome, CPF, CNS…' },
      groups: [
        {
          label: 'Faixa etária',
          dropdown: true,
          target: 'filter-faixa',
          pills: [
            { label: 'Todas as faixas',  value: '' },
            { label: 'Recém-nascido',    value: 'recem_nascido' },
            { label: 'Bebê',             value: 'bebe' },
            { label: 'Criança 2–5a',     value: 'crianca1' },
            { label: 'Criança 5–12a',    value: 'crianca2' },
            { label: 'Adolescente',      value: 'adolescente' },
            { label: 'Adulto',           value: 'adulto' },
            { label: 'Idoso',            value: 'idoso' }
          ]
        },
        {
          label: 'Condição',
          dropdown: true,
          target: 'filter-cond',
          pills: [
            { label: 'Todas as condições',  value: '' },
            { label: '💉 Vacinas atrasadas', value: 'vacinas-atrasadas' },
            { label: 'HAS',                 value: 'has' },
            { label: 'Diabetes',            value: 'dm' },
            { label: 'Gestante',            value: 'gestante' },
            { label: 'Acamado',             value: 'acamado' },
            { label: 'Saúde Mental',        value: 'saude-mental' },
            { label: 'Câncer',              value: 'cancer' },
            { label: 'Deficiência',         value: 'deficiencia' }
          ]
        },
        {
          label: 'Prevenção',
          dropdown: true,
          target: 'filter-prevencao',
          pills: [
            { label: 'Todas',                value: '' },
            { label: '🔴 Papanicolau atrasado', value: 'papa-atrasado' },
            { label: '✅ Papanicolau em dia',    value: 'papa-ok' },
            { label: '🔴 Mamografia atrasada',  value: 'mamo-atrasada' },
            { label: '✅ Mamografia em dia',     value: 'mamo-ok' }
          ]
        },
        {
          label: 'Ordenar por',
          dropdown: true,
          target: 'filter-ind-ordem',
          pills: [
            { label: 'Nome A → Z',  value: 'az' },
            { label: 'Nome Z → A',  value: 'za' },
            { label: 'Mais novo',   value: 'mais-novo' },
            { label: 'Mais velho',  value: 'mais-velho' }
          ]
        }
      ]
    },

    {
      pageId: 'vac-tab-lista',
      barStyle: 'margin-bottom:14px',
      search: { id: 'vac-search', placeholder: '🔍 Buscar criança…' },
      groups: [
        {
          label: 'Idade',
          pills: [
            { label: 'Todas', value: '',      target: 'vac-filter-idade', active: true },
            { label: '0–6m',  value: '0-6',   target: 'vac-filter-idade' },
            { label: '6–12m', value: '6-12',  target: 'vac-filter-idade' },
            { label: '1–2a',  value: '12-24', target: 'vac-filter-idade' },
            { label: '2–5a',  value: '24-60', target: 'vac-filter-idade' }
          ]
        },
        {
          label: 'Situação',
          pills: [
            { label: 'Todas',     value: '',         target: 'vac-filter-sit', active: true },
            { label: '🔴 Atraso', value: 'atrasada', target: 'vac-filter-sit' },
            { label: '✅ Em dia', value: 'ok',        target: 'vac-filter-sit' },
            { label: 'Sem nasc.', value: 'semnasc',  target: 'vac-filter-sit' }
          ]
        }
      ]
    },

    {
      pageId: 'page-pendencias',
      search: null,
      groups: [
        {
          label: 'Tipo',
          pills: [
            { label: 'Todos',       value: '',               target: 'filter-pend-tipo', active: true },
            { label: '🏠 Visita',   value: 'visita',         target: 'filter-pend-tipo' },
            { label: '💉 Vacina',   value: 'vacina',         target: 'filter-pend-tipo' },
            { label: '📋 Cadastro', value: 'cadastro',       target: 'filter-pend-tipo' },
            { label: '🔀 Encam.',   value: 'encaminhamento', target: 'filter-pend-tipo' },
            { label: '🧪 Exame',    value: 'exame',          target: 'filter-pend-tipo' },
            { label: '🔁 Retorno',  value: 'retorno',        target: 'filter-pend-tipo' }
          ]
        },
        {
          label: 'Prioridade',
          pills: [
            { label: 'Todas',      value: '',        target: 'filter-pend-prio', active: true },
            { label: '🔴 Urgente', value: 'urgente', target: 'filter-pend-prio' },
            { label: '🟠 Alta',    value: 'alta',    target: 'filter-pend-prio' },
            { label: '🟡 Média',   value: 'media',   target: 'filter-pend-prio' },
            { label: '🟢 Baixa',   value: 'baixa',   target: 'filter-pend-prio' }
          ]
        }
      ],
      extraBtn: { label: '+ Nova', onclick: 'openNovaPendencia()', style: 'margin-left:auto' }
    },

    {
      pageId: 'page-visitas',
      search: { id: 'search-visita', placeholder: '🔍 Domicílio ou data…' },
      groups: [
        {
          label: 'Tipo',
          pills: [
            { label: 'Todos',       value: '',            target: 'filter-visita-tipo', active: true },
            { label: 'Rotina',      value: 'rotina',      target: 'filter-visita-tipo' },
            { label: 'Crônico',     value: 'cronico',     target: 'filter-visita-tipo' },
            { label: 'Gestante',    value: 'gestante',    target: 'filter-visita-tipo' },
            { label: 'Criança',     value: 'crianca',     target: 'filter-visita-tipo' },
            { label: 'Busca ativa', value: 'busca-ativa', target: 'filter-visita-tipo' }
          ]
        }
      ]
    }

  ];


  function renderFilterBarHtml(cfg) {
    var parts = [];
    var hasCompact = cfg.groups.some(function(g) { return g.compact; });

    if (cfg.search) {
      parts.push(
        '<input class="filter-search" type="text"' +
        ' id="' + cfg.search.id + '"' +
        ' placeholder="' + cfg.search.placeholder + '">'
      );
    }

    cfg.groups.forEach(function (grupo) {
      // ── Dropdown (select nativo) ─────────────────────────────────────────
      if (grupo.dropdown) {
        var options = grupo.pills.map(function (pill) {
          return '<option value="' + pill.value + '">' + pill.label + '</option>';
        }).join('');
        parts.push(
          '<select class="fselect" data-target="' + grupo.target + '"' +
          ' title="' + grupo.label + '"' +
          ' onchange="fSelectChange(this)">' + options + '</select>'
        );
        return;
      }

      // ── Pills (comportamento original) ───────────────────────────────────
      var isCompact = !!grupo.compact;
      var pillClass  = isCompact ? 'fpill-sm' : 'fpill';
      var groupClass = isCompact ? 'filter-group-compact' : 'filter-group';

      var pills = grupo.pills.map(function (pill) {
        return '<button class="' + pillClass + (pill.active ? ' active' : '') + '"' +
          ' data-target="' + pill.target + '"' +
          ' data-value="' + pill.value + '"' +
          ' onclick="fpillClick(this)">' + pill.label + '</button>';
      }).join('');

      parts.push(
        '<div class="' + groupClass + '">' +
          '<span class="filter-label">' + grupo.label + '</span>' +
          pills +
        '</div>'
      );
    });

    if (cfg.extraBtn) {
      parts.push(
        '<button class="btn btn-primary btn-sm"' +
        ' onclick="' + cfg.extraBtn.onclick + '"' +
        (cfg.extraBtn.style ? ' style="' + cfg.extraBtn.style + '"' : '') + '>' +
        cfg.extraBtn.label + '</button>'
      );
    }

    // Dropdown pages use a flex-wrap row of selects
    var allDropdown = cfg.groups.length > 0 && cfg.groups.every(function(g) { return g.dropdown; });
    var barClass = allDropdown ? 'filter-bar-dropdown'
                 : hasCompact  ? 'filter-bar-compact'
                 : 'filter-bar';
    var styleAttr = cfg.barStyle ? ' style="' + cfg.barStyle + '"' : '';
    return '<div class="' + barClass + '"' + styleAttr + '>' + parts.join('') + '</div>';
  }


  var SEARCH_RENDER_MAP = {
    'search-domicilio': function () { if (typeof renderFamilias   === 'function') renderFamilias();   },
    'search-individuo': function () { if (typeof renderIndividuos === 'function') renderIndividuos(); },
    'vac-search':       function () { if (typeof renderVacinas    === 'function') renderVacinas();    },
    'search-visita':    function () { if (typeof renderVisitas    === 'function') renderVisitas();    }
  };

  function reconectarBuscas() {
    var debounceFn = typeof window._acsDebounce === 'function'
      ? window._acsDebounce
      : function (fn, ms) {
          var t;
          return function () { var a = arguments; clearTimeout(t); t = setTimeout(function () { fn.apply(this, a); }, ms); };
        };

    Object.keys(SEARCH_RENDER_MAP).forEach(function (id) {
      var el = $id(id);
      if (!el) return;
      el.removeAttribute('oninput');
      el.addEventListener('input', debounceFn(SEARCH_RENDER_MAP[id], 200));
    });
  }


  function aplicarFilterBar(cfg) {
    var page = $id(cfg.pageId);
    if (!page) return;
    var bar = page.querySelector('.filter-bar, .filter-bar-compact, .filter-bar-dropdown');
    if (!bar) return;
    var temp = document.createElement('div');
    temp.innerHTML = renderFilterBarHtml(cfg);
    bar.parentNode.replaceChild(temp.firstChild, bar);
  }

  function inicializarFiltros() {
    FILTROS_CONFIG.forEach(aplicarFilterBar);
    reconectarBuscas();
    console.info('[ACS:filtros] ✓ ' + FILTROS_CONFIG.length + ' barras reconstruídas.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarFiltros);
  } else {
    inicializarFiltros();
  }


  window.FiltrosModule = {
    renderizar: function (pageId) {
      var cfg = FILTROS_CONFIG.find(function (c) { return c.pageId === pageId; });
      if (cfg) { aplicarFilterBar(cfg); reconectarBuscas(); }
    },
    registrar: function (cfg) {
      FILTROS_CONFIG.push(cfg);
      aplicarFilterBar(cfg);
      reconectarBuscas();
    },
    configs: FILTROS_CONFIG
  };

})();

// ── FIXES: abas, debounce, link-btn, hover, gerenciar dados (ex-app-ui-fixes.js) ──
(function () {
  'use strict';


  function switchBcgTab(avisa) {
    const CORES = AVISA_CORES; // definido em app-municipio.js
    ['I','II','III','IV','V','VI'].forEach(function (a) {
      const panel = $id('bcg-avisa-' + a);
      const btn   = $id('bcg-btn-' + a);
      const ativo = (a === avisa);
      if (panel) panel.style.display = ativo ? '' : 'none';
      if (btn) {
        btn.style.background = ativo ? CORES[a]         : 'var(--surface-2)';
        btn.style.color      = ativo ? '#fff'           : 'var(--slate-500)';
      }
    });
  }

  function switchVacTab(tab) {
    const lista = $id('vac-tab-lista');
    const crono = $id('vac-tab-crono');
    const btnL  = $id('vac-tab-lista-btn');
    const btnC  = $id('vac-tab-crono-btn');
    if (!lista || !crono) return;
    const isLista = (tab === 'lista');
    lista.style.display = isLista ? '' : 'none';
    crono.style.display = isLista ? 'none' : '';
    btnL.setAttribute('aria-selected', isLista ? 'true' : 'false');
    btnC.setAttribute('aria-selected', isLista ? 'false' : 'true');
    btnL.style.color             = isLista ? 'var(--primary)'   : 'var(--slate-500)';
    btnL.style.borderBottomColor = isLista ? 'var(--primary)'   : 'transparent';
    btnC.style.color             = isLista ? 'var(--slate-500)' : 'var(--primary)';
    btnC.style.borderBottomColor = isLista ? 'transparent'      : 'var(--primary)';
  }

  function switchMetasTab(tab) {
    const tabs = ['metas', 'palestras', 'agenda'];
    if (!tabs.includes(tab)) return;
    tabs.forEach(function(t) {
      const panel = $id('metas-tab-' + t);
      const btn   = $id('metas-tab-btn-' + t);
      if (!panel || !btn) return;
      const active = (t === tab);
      panel.style.display = active ? '' : 'none';
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.style.color             = active ? 'var(--accent)'   : 'var(--slate-500)';
      btn.style.borderBottomColor = active ? 'var(--accent)'   : 'transparent';
      if (active) btn.classList.add('active');
      else        btn.classList.remove('active');
    });
  }

  window.switchBcgTab   = switchBcgTab;
  window.switchVacTab   = switchVacTab;
  window.switchMetasTab = switchMetasTab;


  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }
  window._acsDebounce = debounce; // exposto para outros módulos (filtros)

  // acomp-search não está no FILTROS_CONFIG — registrar aqui
  function _aplicarDebounceAcomp() {
    const el = $id('acomp-search');
    if (!el) return;
    el.removeAttribute('oninput');
    el.addEventListener('input', debounce(function () {
      const val = $id('acomp-search');
      if (typeof filtrarListaAcomp === 'function' && val) filtrarListaAcomp(val.value);
    }, 200));
  }

  // ── [F3] CSS para <button class="acs-link-btn"> (substitui os <a onclick>) ─

  function injetarEstiloLinkBtn() {
    if ($id('fix-link-btn-style')) return;
    const s = document.createElement('style');
    s.id = 'fix-link-btn-style';
    s.textContent = `.acs-link-btn{background:none;border:none;padding:0;cursor:pointer;font-family:inherit;font-size:inherit;color:inherit;text-decoration:underline;display:inline}.acs-link-btn:hover{opacity:.8}`;
    document.head.appendChild(s);
  }


  function corrigirHoverLogout() {
    if ($id('fix-logout-hover')) return;
    const s = document.createElement('style');
    s.id = 'fix-logout-hover';
    s.textContent = `#btn-logout:hover{background:var(--rose-bg)!important;border-color:var(--rose-bdr)!important}`;
    document.head.appendChild(s);
  }


  function confirmarLimparVisitas() {
    if (typeof customConfirm !== 'function') return;
    customConfirm('Limpar TODAS as visitas?', function () {
      db.visitas = [];
      if (typeof save === 'function') save();
      if (typeof DB !== 'undefined' && DB.invalidate) DB.invalidate();
      if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
      if (typeof toast === 'function') toast('Visitas apagadas', 'success');
    });
  }

  function confirmarLimparDomicilios() {
    if (typeof customConfirm !== 'function') return;
    customConfirm('Apagar todos os domicílios e membros? Visitas e agenda serão mantidas.', function () {
      db.domicilioById = {};
      db.familiaById   = {};
      db.individuoById = {};
      db._nextId.domicilio = 1;
      db._nextId.familia   = 1;
      db._nextId.individuo = 1;
      if (typeof save === 'function') save();
      if (typeof DB !== 'undefined' && DB.invalidate) DB.invalidate();
      if (typeof invalidateFamiliaSelects === 'function') invalidateFamiliaSelects();
      if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
      if (typeof toast === 'function') toast('Domicílios apagados', '');
    });
  }

  function confirmarApagarTudo() {
    if (typeof customConfirm !== 'function') return;
    customConfirm('APAGAR TODOS OS DADOS? Isso não pode ser desfeito.', function () {
      if (typeof limparTudo === 'function') limparTudo();
    });
  }

  window.confirmarLimparVisitas    = confirmarLimparVisitas;
  window.confirmarLimparDomicilios = confirmarLimparDomicilios;
  window.confirmarApagarTudo       = confirmarApagarTudo;


  function inicializar() {
    injetarEstiloLinkBtn();
    corrigirHoverLogout();
    _aplicarDebounceAcomp();
    console.info('[ACS:ui] ✓ abas, estilos e debounce acomp aplicados.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
  } else {
    inicializar();
  }

})();
