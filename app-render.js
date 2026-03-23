// ACS Neto — app-render.js

// ── Patch 03 — Smart DOM update (no-flash render) ────────────────────────────
// Hash FNV-1a 32-bit: < 1µs para HTML de 200 KB
const SEARCH_DEBOUNCE_MS = 220;  // delay da busca em listas (render throttle)
const ANIM_COUNTER_MS = 600;    // duração da animação de contador no dashboard
  // delay da busca em listas (render throttle)
function _fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}
const _renderHashes    = new Map();    // keyed by element.id (string)
const _renderHashesRef = new WeakMap(); // keyed by element reference (no id)
function _smartUpdate(el, content) {
  if (!el) return;
  // Aceita string HTML (legado) ou nó/fragmento DOM
  if (typeof content !== 'string') {
    el.textContent = '';
    el.appendChild(content instanceof DocumentFragment ? content : content);
    return;
  }
  const hash = _fnv1a(content);
  // Use id-keyed Map when available; WeakMap by reference otherwise
  const cache = el.id ? _renderHashes : _renderHashesRef;
  const key   = el.id || el;
  if (cache.get(key) === hash) return;
  cache.set(key, hash);
  const frag = document.createRange().createContextualFragment(content);
  el.textContent = '';
  el.appendChild(frag);
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Patch 04 — Animated counter (0 → value in ~600ms) ────────────────────────
function _animateCounter(el, target, duration) {
  if (!el) return;
  duration = duration || 600;
  // Always animate from 0 so the counter feels alive on every dashboard visit
  el.textContent = '0';
  function ease(t) { return t < .5 ? 2*t*t : -1+(4-2*t)*t; }
  var startTime = null;
  function step(ts) {
    if (!startTime) startTime = ts;
    var p = Math.min((ts - startTime) / duration, 1);
    el.textContent = Math.round(ease(p) * target);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}

// Garante que o arco chega ao valor final exacto (último frame do rAF pode ficar 1px curto)
function _finalizeArc(el, endOffset) {
  if (el) el.setAttribute('stroke-dashoffset', endOffset);
}
// ─────────────────────────────────────────────────────────────────────────────
// Depende de: app-core.js, app-utils.js, app-ui.js, app-vacinas.js

// ── Paleta semântica — fonte única de verdade para cores de estado ────────────
// Todas as cores condicionais (ok/alerta/urgente) passam por aqui.
// Para mudar o visual de status em toda a app, edite apenas este objeto.
const _COLORS = {
  ok:       'var(--emerald-600)',   // #0a8059  — em dia, realizado, saudável
  warn:     'var(--orange-500)',    // #bf5726  — atenção, intermediário
  urgente:  'var(--rose-600)',      // #e83355  — crítico, atrasado, urgente
  info:     'var(--violet-600)',    // azul     — informação, gestante, HAS
  dm:       'var(--orange-500)',    // laranja  — diabetes
  gestante: 'var(--violet-600)',   // violeta  — gestante
  crianca:  'var(--emerald-600)',  // ciano    — criança < 2 anos
  neutro:   'var(--slate-500)',     // cinza    — inativo, acamado
  prioAlta: 'var(--rose-600)',
  prioMed:  'var(--orange-500)',
  prioBaixa:'var(--emerald-600)',
  obesidadeII:  'var(--rose-600)',   // Obesidade grau II — mesmo nível de urgente
  obesidadeIII: 'var(--rose-700)',   // Obesidade grau III — máxima criticidade
  // Tints de fundo para cards e badges — usam vars globais (tema-aware)
  bgRose:    'var(--rose-bg)',       bgRoseDark:    'var(--rose-bdr)',
  bgOrange:  'var(--orange-bg)',     bgOrangeDark:  'var(--orange-bdr)',
  bgAmber:   'var(--amarelo-bg,rgba(255,117,51,.10))',   bgAmberDark:   'var(--amarelo-bdr,rgba(255,117,51,.22))',
  bgGreen:   'var(--emerald-bg)',    bgGreenDark:   'var(--emerald-bdr)',
  bgEmerald: 'var(--emerald-bg)',    bgEmeraldDark: 'var(--emerald-500)',
  bgViolet:  'var(--violet-bg)',     bgVioletDark:  'var(--violet-400)',
  bgPink:    'var(--rose-bg)',
  bgIndigo:  'var(--violet-bg)',
  bgFafafa:  'var(--surface-2)',
  // Texto sobre tints — usa tokens semânticos do sistema
  txtRose:   'var(--rose-600)',      txtOrange: 'var(--orange-600)',   txtAmber:  'var(--orange-700)',
  txtGreen:  'var(--emerald-700)',   txtEmerald:'var(--emerald-700)',
  txtViolet: 'var(--violet-700)',    txtBlue:   'var(--violet-700)',
  txtPink:   'var(--rose-700)',
};

// ── Ícones SVG — fonte única para todos os contextos ─────────────────────────
// Tamanho padrão: 20×20 (KPI cards); use style="width:Xpx" para redimensionar.
const _ICONS = {
  baby: `<svg style="width:var(--icon-sm);height:var(--icon-sm)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><path d="M16 16c.5 1.5 2 2.5 4 2.5"/><path d="M8 16c-.5 1.5-2 2.5-4 2.5"/><path d="M10 16.5v-3c0-1.1.9-2 2-2s2 .9 2 2v3"/><path d="M7 11c0-1.6 1.9-3 5-3s5 1.4 5 3"/></svg>`,
  babySmall: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><path d="M10 16.5v-3c0-1.1.9-2 2-2s2 .9 2 2v3"/><path d="M7 11c0-1.6 1.9-3 5-3s5 1.4 5 3"/></svg>`,
  bed: `<svg style="width:var(--icon-sm);height:var(--icon-sm)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3"/><path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0Z"/></svg>`,
  bell: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  check: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  clock: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  droplet: `<svg style="width:var(--icon-sm);height:var(--icon-sm)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>`,
  heart: `<svg style="width:var(--icon-sm);height:var(--icon-sm)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
  micro: `<svg style="width:var(--icon-sm);height:var(--icon-sm)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/></svg>`,
  star: `<svg style="width:var(--icon-sm);height:var(--icon-sm)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>`,
  syringe: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-1.6-1.6c-1-1-1-2.5 0-3.4L15 4"/><path d="m9 11 4 4"/><path d="m14 4 6 6"/></svg>`,
  target: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  tooth: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5.5c-1.5-2-4-2.5-5.5-1C4.5 6 4 8.5 5 11c.7 1.8 1.5 3.5 2 5 .3 1 .8 2 1.5 2s1.2-1 1.5-2l.5-2 .5 2c.3 1 .8 2 1.5 2s1.2-1 1.5-2c.5-1.5 1.3-3.2 2-5 1-2.5.5-5-1.5-6.5C13 4.5 11.5 5 10 5.5"/></svg>`,
};



/** Cor de status baseada em percentual (>= 80% = ok, >= 50% = warn, < 50% = urgente). */
function _statusColor(pct) {
  return pct >= 80 ? _COLORS.ok : pct >= 50 ? _COLORS.warn : _COLORS.urgente;
}

/** Renderiza badge inline de IMC a partir de um objeto indivíduo. */
function _renderImcBadge(ind) {
  if (!ind.pesoAtual || !ind.altura) return '<span style="color:var(--slate-400)">–</span>';
  const imc  = ind.pesoAtual / ((ind.altura / 100) ** 2);
  let cat, cor;
  if      (imc < 18.5) { cat = 'Abaixo do peso'; cor = _COLORS.info;    }
  else if (imc < 25)   { cat = 'Normal ✓';        cor = _COLORS.ok;      }
  else if (imc < 30)   { cat = 'Sobrepeso';        cor = _COLORS.warn;    }
  else if (imc < 35)   { cat = 'Obesidade I';      cor = _COLORS.urgente; }
  else if (imc < 40)   { cat = 'Obesidade II';     cor = _COLORS.obesidadeII;       }
  else                 { cat = 'Obesidade III';     cor = _COLORS.obesidadeIII;       }
  return `<strong style="font-size:var(--text-base);color:${cor}">${imc.toFixed(1)}</strong> <span style="font-size:var(--text-xs);color:${cor}">${cat}</span>`;
}

// ── Arc animation registry — populated by cardHtml, flushed after DOM update ─
let _pendingArcAnimations = [];

function _runPendingArcAnimations() {
  const queue = _pendingArcAnimations.splice(0);
  if (!queue.length) return;
  // Small delay so the DOM is painted before animating
  setTimeout(function() {
    queue.forEach(function(cfg) {
      const el = document.getElementById(cfg.arcId);
      if (!el) return;
      const startOffset = cfg.arcLen;
      const endOffset   = parseFloat(cfg.dashOffsetFinal);
      const duration    = 700;
      let startTime     = null;
      function ease(t) { return t < .5 ? 2*t*t : -1+(4-2*t)*t; }
      function step(ts) {
        if (!startTime) startTime = ts;
        const p = Math.min((ts - startTime) / duration, 1);
        el.setAttribute('stroke-dashoffset', (startOffset - (startOffset - endOffset) * ease(p)).toFixed(2));
        if (p < 1) requestAnimationFrame(step);
        else _finalizeArc(el, endOffset);
      }
      if (typeof IntersectionObserver !== 'undefined') {
        const obs = new IntersectionObserver(function(entries) {
          if (entries[0].isIntersecting) { requestAnimationFrame(step); obs.disconnect(); }
        }, { threshold: 0.2 });
        const card = el.closest('.dash-cov-card') || el;
        obs.observe(card);
      } else {
        requestAnimationFrame(step);
      }
    });
  }, 50);
}

// ── renderDashboard — helpers privados ───────────────────────────────────────

// ◆ BLOCO: DASHBOARD
// _dashKpis, _dashAlertas, _dashVisitasHoje, _dashRisco, _dashFichas,
// ✎ Editar para mudar o painel principal (KPIs, alertas, gráficos)
// ── Dashboard: contadores, cabeçalho e pílula de mês ────────────────────────
function _dashKpis(familias, individuos, visitasMesCount) {
  const pendAbertas   = db.pendencias.filter(p => !p.done).length;
  const total         = individuos.length;
  const criancas      = individuos.filter(i => { const a = getIdadeEmAnos(i.nasc); return a !== null && a < 5; });
  const criancasVac   = criancas.filter(i => Array.isArray(i.vacinas) && i.vacinas.length > 0).length;
  const coberturaVac  = criancas.length ? Math.min(100, Math.round(criancasVac / criancas.length * 100)) : 0;

  const sf = $id('s-familias');    if (sf)  _animateCounter(sf,  familias.length);
  const si = $id('s-individuos');  if (si)  _animateCounter(si,  total);
  const sv = $id('s-visitas-mes'); if (sv)  sv.textContent  = visitasMesCount;
  const sp = $id('s-pendencias');  if (sp)  sp.textContent  = pendAbertas;
  const sc = $id('s-cobertura');   if (sc)  sc.textContent  = coberturaVac + '%';
  $id('badge-pend').textContent = pendAbertas;

  const nomeEl = $id('dash-acs-nome');
  if (nomeEl) {
    // Mostra nome do config, com fallback para DEFAULT_CONFIG ou para o texto já no HTML
    const nomeConfig = db.config?.nome || (typeof DEFAULT_CONFIG !== 'undefined' ? DEFAULT_CONFIG.nome : '');
    if (nomeConfig) nomeEl.textContent = nomeConfig;
    // Se ainda vazio, mantém o conteúdo estático do HTML (José Neto definido no index.html)
  }

  const subEl = $id('dash-header-sub');
  if (subEl && db.config) {
    const esf  = db.config.esf       || DEFAULT_CONFIG.esf;
    const ma   = db.config.microarea || DEFAULT_CONFIG.microarea;
    const cnes = db.config.cnes      || DEFAULT_CONFIG.cnes;
    subEl.innerHTML = `${esc(esf)}<br><span style="font-size:var(--text-sm)">Microárea ${esc(ma)} &nbsp;·&nbsp; CNES ${esc(cnes)}</span>`;
  }

  // Atualiza info na sidebar
  if (db.config) {
    const esf  = db.config.esf       || DEFAULT_CONFIG.esf       || '';
    const ma   = db.config.microarea || DEFAULT_CONFIG.microarea || '';
    const cnes = db.config.cnes      || DEFAULT_CONFIG.cnes      || '';
    const sEsf  = $id('sidebar-esf');       if (sEsf)  sEsf.textContent  = esf;
    const sMa   = $id('sidebar-microarea'); if (sMa)   sMa.textContent   = 'Microárea ' + ma;
    const sCnes = $id('sidebar-cnes');      if (sCnes) sCnes.textContent  = 'CNES ' + cnes;
  }

  // Badge de versão — confirma que os arquivos corretos estão carregados
  const verEl = $id('dash-version-badge');
  if (verEl) verEl.innerHTML =
    '<span style="font-size:var(--text-2xs);color:var(--slate-400);' +
    'background:var(--surface-2);border:1px solid var(--bdr);' +
    'border-radius:var(--r-full);padding:2px 8px;display:inline-block">' +
    'v25.2.3 · legado' +
    '</span>';

  const pilMes = $id('dash-pill-mes');
  if (pilMes) {
    const now   = new Date();
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    pilMes.innerHTML = `<img src="icones/agenda/agenda.png" class="ico" style="width:var(--icon-md);height:var(--icon-md)"> ${meses[now.getMonth()]} ${now.getFullYear()}`;
  }

  _dashHealthCards(familias, individuos);
  _dashPendencias();
}

// ── Dashboard: cards de cobertura por grupo prioritário ─────────────────────
function _dashHealthCards(familias, individuos) {
  const mesAtual       = new Date().toISOString().slice(0, 7);
  const visMes         = db.visitas.filter(v => v.data && v.data.startsWith(mesAtual));
  const visitadosDireto = new Set(visMes.filter(v => v.membroId).map(v => Number(v.membroId)));
  const familiaVisitada = new Set(visMes.filter(v => !v.membroId).map(v => Number(v.familiaId)));

  function foiVisitado(ind) {
    return visitadosDireto.has(ind.idIndividuo) || familiaVisitada.has(ind.familiaId);
  }
  function cobGroup(grp) {
    if (!grp.length) return { vis: 0, tot: 0, pct: 0 };
    const vis = grp.filter(foiVisitado).length;
    return { vis, tot: grp.length, pct: Math.round(vis / grp.length * 100) };
  }
  function cobFicha(grp, tipo) {
    if (!grp.length) return { vis: 0, tot: 0, pct: 0 };
    let com = 0;
    if (tipo === 'hans') {
      const seis = new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0];
      const hist = (db.fichas.historico && db.fichas.historico.hans) || [];
      com = grp.filter(i => hist.some(h => h.individuoId == i.idIndividuo && h.data >= seis)).length;
    } else {
      com = grp.filter(i => {
        const f = (fichasAcompanhamento[tipo] || {})[i.idIndividuo] || {};
        return f._dataSalva && f._dataSalva.startsWith(mesAtual);
      }).length;
    }
    return { vis: com, tot: grp.length, pct: Math.round(com / grp.length * 100) };
  }
  function cobPrev(grp) {
    if (!grp.length) return { vis: 0, tot: 0, pct: 0 };
    const umAnoAtras = new Date();
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
    const com = grp.filter(function(i) {
      // Critério 1: ficha de prevenção preenchida este mês
      const ficha = (fichasAcompanhamento.prevencao || {})[i.idIndividuo] || {};
      if (ficha._dataSalva && ficha._dataSalva.startsWith(mesAtual)) return true;
      // Critério 2: papanicolau cadastrado com data < 1 ano
      if (!i.papanicolau) return false;
      const papISO = i.papanicolau.includes('/') ? _brToISO(i.papanicolau) : i.papanicolau;
      if (!papISO) return false;
      return new Date(papISO) >= umAnoAtras;
    }).length;
    return { vis: com, tot: grp.length, pct: Math.round(com / grp.length * 100) };
  }

  const grpHas  = individuos.filter(i => i.has      === 'sim');
  const grpDm   = individuos.filter(i => i.dm       === 'sim');
  const grpGest = individuos.filter(i => i.gestante === 'sim');
  const grpCri2 = individuos.filter(i => { const a = getIdadeEmAnos(i.nasc); return a !== null && a < 2; });
  const grpAcam = individuos.filter(i => i.acamado  === 'sim');
  const grpPrev = individuos.filter(i => {
    if (i.sexo !== 'F') return false;
    const a = getIdadeEmAnos(i.nasc);
    return a !== null && a >= 25 && a <= 64;
  });

  const cHas  = cobGroup(grpHas);
  const cDm   = cobGroup(grpDm);
  const cGest = cobGroup(grpGest);
  const cCri2 = cobGroup(grpCri2);
  const cAcam = cobGroup(grpAcam);
  const cHans = cobFicha(individuos, 'hans');
  const cAlim = cobFicha(grpCri2,    'consumoAlimentar');
  const cPrev = cobPrev(grpPrev);

  const ICON_SM = '22px'; // --icon-sm value (explicit px so SVG attr works)

  function cardHtml(icoSrc, label, c, color, clickFn) {
    const barColor  = _statusColor(c.pct);
    const pct       = Math.min(c.pct, 100);
    const subHtml   = c.tot === 0
      ? `<span style="color:var(--slate-400)">Nenhum</span>`
      : `<span style="color:${barColor};font-weight:700">${c.vis}</span><span style="color:var(--slate-500)"> / ${c.tot}</span>`;
    const clickAttr = clickFn ? `onclick="${clickFn}"` : '';
    const pctLabel  = c.tot ? c.pct + '%' : '—';
    const cardId    = 'cov-bar-' + label.replace(/[^a-z0-9]/gi,'').toLowerCase();
    return `<div class="dash-cov-card${clickFn ? ' clickable' : ''}" ${clickAttr}>
      <div class="dash-cov-ico-wrap">
        <img src="${icoSrc}" class="dash-cov-ico" alt="${label}">
      </div>
      <div class="dash-cov-bar-track">
        <div class="dash-cov-bar-fill" id="${cardId}" style="width:0%;background:${barColor}" data-pct="${pct}"></div>
      </div>
      <div class="dash-cov-pct-label" style="color:${barColor}">${pctLabel}</div>
      <div class="dash-cov-label">${label}</div>
      <div class="dash-cov-sub">${subHtml}</div>
    </div>`;
  }

  const grid = $id('dash-health-cards');
  if (!grid) return;
  grid.innerHTML =
    cardHtml('icones/has/has.png',        'HAS',           cHas,  _COLORS.urgente,     "openAcompPage('has')") +
    cardHtml('icones/dm/dm.png',   'Diabetes',       cDm,   _COLORS.dm,          "openAcompPage('dm')") +
    cardHtml('icones/gestante/gestante.png',   'Gestantes',      cGest, _COLORS.gestante,    "openAcompPage('gestante')") +
    cardHtml('icones/fichas/crianca.png',    'Crianças < 2a',  cCri2, _COLORS.crianca,     "showPage('vacinas')") +
    cardHtml('icones/domiciliados/domiciliado.png','Domiciliados',   cAcam, _COLORS.neutro,      "openModalDomiciliados()") +
    cardHtml('icones/hanseniase/hanseniase.png', 'Hanseníase',     cHans, 'var(--violet-500)', "openAcompPage('hans')") +
    cardHtml('icones/alimentacao/alimentacao.png','Alimentação',    cAlim, 'var(--emerald-500)',"openAcompPage('consumoAlimentar')") +
    cardHtml('icones/prevencao/prevencao.png',  'Prevenção',      cPrev, 'var(--rose-500)',   "openModalPrevencao()");

  // Animate straight bars
  requestAnimationFrame(function() {
    setTimeout(function() {
      grid.querySelectorAll('.dash-cov-bar-fill[data-pct]').forEach(function(el) {
        el.style.width = el.dataset.pct + '%';
      });
    }, 80);
  });
}

// ── Dashboard: banner de metas do mês ───────────────────────────────────────
function _dashMetasBanner(familias) {
  const banner = $id('dash-metas-banner');
  if (!banner) return;
  const m          = db.metas || {};
  const mesAtual   = new Date().toISOString().slice(0, 7);
  const realiz     = db.visitas.filter(v => v.data && v.data.startsWith(mesAtual)).length;
  const metaMensal = (m.manha || 5) * 20 + (m.tarde || 5) * 20;
  const pct        = metaMensal > 0 ? Math.min(100, Math.round(realiz / metaMensal * 100)) : 0;
  const cor        = _statusColor(pct);

  banner.innerHTML = `
    <div style="background:var(--surface);border-radius:var(--radius-md);
         padding:14px 18px;display:flex;align-items:center;gap:var(--sp-4);
         border:1px solid var(--bdr);cursor:pointer;transition:box-shadow .15s"
         onclick="showPage('metas')"
         onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.1)'"
         onmouseout="this.style.boxShadow=''">
      <div style="flex-shrink:0;color:${cor};display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:var(--r-md);background:${cor}18">
        ${_ICONS.target}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:var(--text-2xs);font-weight:800;color:var(--slate-500);text-transform:uppercase;letter-spacing:.06em;margin-bottom:var(--sp-1)">🎯 Metas do Mês</div>
        <div style="display:flex;align-items:baseline;gap:var(--sp-2);margin-bottom:var(--sp-1)">
          <span style="font-size:var(--text-xl);font-weight:800;color:var(--slate-900);font-family:var(--font-display);line-height:1">${realiz}</span>
          <span style="font-size:var(--text-xs);color:var(--slate-500);font-weight:500">de ${metaMensal} visitas programadas</span>
          <span style="margin-left:auto;font-size:var(--text-base);font-weight:800;color:${cor}">${pct}%</span>
        </div>
        <div style="background:var(--surface-3);border-radius:var(--r-full);height:5px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${cor};border-radius:var(--r-full);transition:width .5s"></div>
        </div>
      </div>
    </div>`;
}

// ── Dashboard: lista de pendências abertas ───────────────────────────────────
function _dashPendencias() {
  const pendList = $id('dash-pendencias-list');
  if (!pendList) return;
  const abertas = db.pendencias.filter(p => !p.done);

  if (!abertas.length) {
    pendList.replaceChildren(createEmptyState('✓', 'Nenhuma pendência em aberto'));
    return;
  }

  const corPrio = { urgente: _COLORS.urgente, alta: _COLORS.dm, media: _COLORS.warn, baixa: _COLORS.ok };
  const frag = document.createDocumentFragment();

  abertas.slice(0, 5).forEach(function(p) {
    const el = cloneTemplate('tpl-dash-pend-item');
    el.querySelector('.dpi-dot').style.background = corPrio[p.prioridade] || 'var(--slate-300)';
    el.querySelector('.dpi-titulo').textContent = p.titulo;
    el.querySelector('.dpi-sub').textContent    = p.obs || p.tipo || '–';
    frag.appendChild(el);
  });

  if (abertas.length > 5) {
    const mais = document.createElement('div');
    mais.className = 'dash-pend-mais';
    mais.textContent = '+' + (abertas.length - 5) + ' mais › ver todas';
    mais.addEventListener('click', function() { showPage('pendencias'); });
    frag.appendChild(mais);
  }

  pendList.innerHTML = '';
  pendList.appendChild(frag);
}

function _dashAlertas(familias, individuos) {

  const alertas = [];
  familias.filter(f => f.risco === 'alto').forEach(f => {
    const dias = diasSemVisita(f.ultimaVisita);
    if (dias > 30) alertas.push({ tipo:'urgente', icon:_ICONS.clock, cor:_COLORS.urgente, titulo:`Família ${getFamiliaLabel(f.idFamilia)} — Alto risco`, texto:`Sem visita há ${dias} dias` });
  });
  db.pendencias.filter(p => !p.done && p.prioridade === 'urgente').forEach(p => {
    alertas.push({ tipo:'urgente', icon:_ICONS.bell, cor:_COLORS.urgente, titulo:p.titulo, texto:'Pendência urgente' });
  });
  individuos.filter(i => i.gestante === 'sim').forEach(i => {
    alertas.push({ tipo:'atencao', icon:_ICONS.babySmall, cor:_COLORS.warn, titulo:`Gestante: ${i.nome}`, texto:'Acompanhamento gestacional em aberto' });
  });

  // Alertas de vacina atrasada em crianças < 5 anos
  // P2-1: usa vacinasAtrasadasIdx do snapshot — O(1) por indivíduo
  // em vez do loop O(n × vacinas × doses) que congelava o dashboard.
  // O índice é construído uma vez em DB.getSnapshot() e invalidado junto
  // com o restante do snapshot quando os dados mudam.
  const { vacinasAtrasadasIdx } = getSnapshot();
  individuos.forEach(ind => {
    const idadeMeses = getIdadeEmMeses(ind.nasc);
    if (idadeMeses === null || idadeMeses >= 60) return;
    if (!vacinasAtrasadasIdx.has(ind.idIndividuo)) return; // O(1)
    const idadeTexto = idadeMeses < 12
      ? `${Math.round(idadeMeses)} ${Math.round(idadeMeses) === 1 ? 'mês' : 'meses'}`
      : `${Math.floor(idadeMeses / 12)} ${Math.floor(idadeMeses / 12) === 1 ? 'ano' : 'anos'}`;
    alertas.push({ tipo:'urgente', icon:_ICONS.syringe, cor:_COLORS.urgente,
      titulo:`${ind.nome} (${idadeTexto}) — vacinas atrasadas`,
      texto:'Vacina(s) atrasada(s) · abra a aba Vacinas para detalhes' });
  });

  // Crianças < 2 anos sem avaliação odontológica
  individuos.forEach(ind => {
    const meses = getIdadeEmMeses(ind.nasc);
    if (meses === null || meses >= 24) return;
    if (ind.odonto && ind.odonto.dataAvaliacao) return;
    alertas.push({ tipo:'atencao', icon:_ICONS.tooth, cor:_COLORS.warn, titulo:`${ind.nome} — avaliação odontológica pendente`, texto:`${Math.floor(meses)} mês(es) sem avaliação odontológica` });
  });

  if (alertas.length === 0) alertas.push({ tipo:'ok', icon:_ICONS.check, cor:_COLORS.ok, titulo:'Nenhum alerta crítico', texto:'Todos os alertas foram tratados' });

  const el = $id('alertas-list');
  const frag = document.createDocumentFragment();

  alertas.slice(0, 5).forEach(function(a) {
    const item = cloneTemplate('tpl-alerta-item');
    const iconEl = item.querySelector('.alerta-icon');
    iconEl.innerHTML = a.icon;
    iconEl.style.color = a.cor;
    item.querySelector('.alerta-titulo').textContent = a.titulo;
    item.querySelector('.alerta-texto').textContent  = a.texto;
    frag.appendChild(item);
  });

  el.innerHTML = '';
  el.appendChild(frag);

  if (alertas.length > 5) {
    const mais = document.createElement('div');
    mais.className = 'dash-pend-mais';
    mais.textContent = '+' + (alertas.length - 5) + ' alertas adicionais ›';
    mais.addEventListener('click', function() { showPage('pendencias'); });
    el.appendChild(mais);
  }
}

function _dashVisitasHoje() {
  const visitasHoje = db.agenda.filter(a => a.data === hoje());
  const vhEl = $id('visitas-hoje');
  if (!vhEl) return;

  if (!visitasHoje.length) {
    vhEl.replaceChildren(createEmptyState('📅', 'Nenhuma visita programada para hoje.'));
    return;
  }

  const frag = document.createDocumentFragment();
  visitasHoje.forEach(function(v) {
    const f  = getFamilia(v.familiaId);
    const el = cloneTemplate('tpl-agenda-visita');
    el.querySelector('.av-familia').textContent = f ? getFamiliaLabel(f.idFamilia) : '–';
    el.querySelector('.av-tipo').textContent    = v.tipo || '';
    el.querySelector('.av-obs').textContent     = v.obs  || '';
    el.querySelector('.av-remover').hidden = true;
    frag.appendChild(el);
  });

  vhEl.innerHTML = '';
  vhEl.appendChild(frag);
}

function _dashFichas(individuos, mesAtual) {
  const mesLabel   = new Date().toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
  const mesLabelEl = $id('mes-fichas-label');
  if (mesLabelEl) mesLabelEl.textContent = mesLabel;

  const fichasDashEl = $id('fichas-dash-detail');
  if (!fichasDashEl) return;

  const linhas = [
    { icon:'🩺', label:'Hipertensão (HAS)',  tipo:'has',              inds: individuos.filter(i => i.has === 'sim'),        cor:_COLORS.info },
    { icon:'💉', label:'Diabetes (DM)',       tipo:'dm',               inds: individuos.filter(i => i.dm === 'sim'),         cor:_COLORS.warn },
    { icon:'🤰', label:'Gestantes',           tipo:'gestante',         inds: individuos.filter(i => i.gestante === 'sim'),   cor:_COLORS.gestante },
    { icon:'🍼', label:'Crianças < 2 anos',   tipo:'consumoAlimentar', inds: individuos.filter(i => { const a = getIdadeEmAnos(i.nasc); return a !== null && a < 2; }), cor:_COLORS.ok },
  ];

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;flex-direction:column;gap:8px';

  linhas.forEach(function(l) {
    const total    = l.inds.length;
    const comFicha = l.inds.filter(function(i) {
      const f = (fichasAcompanhamento[l.tipo] || {})[i.idIndividuo];
      return f && f._dataSalva && f._dataSalva.startsWith(mesAtual);
    }).length;
    const pendente = total - comFicha;
    const pctL     = total ? Math.round(comFicha / total * 100) : 0;
    const cor      = _statusColor(pctL);

    if (total === 0) {
      const el = cloneTemplate('tpl-ficha-dash-empty');
      el.querySelector('.fdr-icon-empty').textContent = l.icon;
      el.querySelector('.fdr-label').textContent      = l.label;
      wrapper.appendChild(el);
      return;
    }

    const el = cloneTemplate('tpl-ficha-dash-row');
    const iconEl = el.querySelector('.fdr-icon');
    iconEl.textContent        = l.icon;
    iconEl.style.background   = cor + '18';

    el.querySelector('.fdr-label').textContent     = l.label;
    const pctEl = el.querySelector('.fdr-pct');
    pctEl.textContent   = pctL + '%';
    pctEl.style.color   = cor;

    el.querySelector('.fdr-bar-fill').style.cssText = 'width:' + pctL + '%;background:' + cor;

    const pendEl = el.querySelector('.fdr-pend');
    pendEl.textContent = '⏳ ' + pendente + ' pendente' + (pendente !== 1 ? 's' : '');
    pendEl.style.color = pendente > 0 ? _COLORS.urgente : 'var(--slate-400)';

    el.querySelector('.fdr-ok').textContent    = '✅ ' + comFicha + ' preenchida' + (comFicha !== 1 ? 's' : '');
    el.querySelector('.fdr-total').textContent = 'de ' + total + ' elegível' + (total !== 1 ? 's' : '');

    // Hover interativo (mesma lógica do original)
    el.style.borderColor = '';
    el.addEventListener('click',      function() { openAcompPage(l.tipo); });
    el.addEventListener('mouseenter', function() {
      el.style.borderColor = l.cor;
      el.style.boxShadow   = '0 4px 16px ' + l.cor + '22';
    });
    el.addEventListener('mouseleave', function() {
      el.style.borderColor = '';
      el.style.boxShadow   = '';
    });

    wrapper.appendChild(el);
  });

  // Rodapé
  const rodape = document.createElement('div');
  rodape.className   = 'fdr-rodape';
  rodape.textContent = 'Clique para abrir uma ficha · ' + mesLabel;
  rodape.addEventListener('click', function() { openAcompPage('has'); });
  wrapper.appendChild(rodape);

  fichasDashEl.innerHTML = '';
  fichasDashEl.appendChild(wrapper);
}

// ── renderDashboard — orquestrador ───────────────────────────────────────────
function renderDashboard() {
  const { familias, individuos, mesAtual, visitasMesCount } = getSnapshot();

  _dashKpis(familias, individuos, visitasMesCount);
  _dashAlertas(familias, individuos);
  _dashPendencias();
  _dashStorageBanner();
  _dashBackupReminder();
}

// ── Aviso de armazenamento cheio no dashboard (Patch 01) ──────────────────────
const _STORAGE_WARN_PCT  = 80;
const _STORAGE_ALERT_PCT = 90;
const _STORAGE_BANNER_ID = 'dash-storage-banner';

function _dashStorageBanner() {
  const old = $id(_STORAGE_BANNER_ID);
  if (old) old.remove();
  // Com IDB como storage principal não há limite fixo de 5 MB — banner suprimido
  if (window._lastSavedBytes > 0) return;
  const usedKB = typeof getStorageUsageKB === 'function' ? getStorageUsageKB() : 0;
  const pct    = Math.min(100, Math.round(usedKB / 5120 * 100));
  // Só exibe se mais de 80% do armazenamento estiver ocupado
  if (pct < _STORAGE_WARN_PCT) return;

  const isAlert = pct >= _STORAGE_ALERT_PCT;
  const bg      = isAlert ? 'var(--rose-bg)'    : 'var(--orange-bg)';
  const border  = isAlert ? 'var(--rose-bdr)'   : 'var(--orange-bdr)';
  const color   = isAlert ? 'var(--vermelho)'   : 'var(--orange-600)';
  const msg     = isAlert
    ? `Armazenamento em ${pct}% — risco de perda de dados! Faça backup agora.`
    : `Armazenamento em ${pct}% — faça um backup para não perder dados.`;

  const banner = document.createElement('div');
  banner.id = _STORAGE_BANNER_ID;
  banner.style.cssText = `display:flex;align-items:center;justify-content:space-between;gap:12px;
    padding:12px 16px;background:${bg};border:1px solid ${border};
    border-radius:var(--r-md);margin-bottom:8px`;
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;min-width:0">
      <span style="font-size:var(--text-lg);flex-shrink:0">${isAlert ? '⛔' : '⚠️'}</span>
      <div>
        <div style="font-size:var(--text-sm);font-weight:700;color:${color}">${msg}</div>
        <div style="font-size:var(--text-xs);color:${color};opacity:.8;margin-top:2px">${usedKB} KB de 5120 KB usados (${pct}%)</div>
      </div>
    </div>
    <div style="display:flex;gap:6px;flex-shrink:0">
      <button onclick="showPage('configuracoes')"
        style="padding:6px 12px;font-size:var(--text-xs);font-weight:600;background:transparent;
               color:${color};border:1px solid ${color};border-radius:var(--r-sm);cursor:pointer">
        Fazer backup
      </button>
      <button onclick="$id('${_STORAGE_BANNER_ID}').remove()"
        style="padding:6px 8px;font-size:var(--text-xs);background:transparent;border:none;color:${color};opacity:.7;cursor:pointer">✕</button>
    </div>`;

  const dash = $id('page-dashboard');
  if (dash) dash.insertBefore(banner, dash.firstChild);
}

// ── Lembrete de backup periódico no dashboard (Patch 02) ─────────────────────
const _BACKUP_REMINDER_DAYS    = 7;
const _BACKUP_REMINDER_DISMISS = 'acs_backup_reminder_dismissed';
const _BACKUP_REMINDER_ID      = 'dash-backup-reminder';

function _dashBackupReminder() {
  // Não mostra se já dispensou hoje
  const today = new Date().toISOString().slice(0, 10);
  if (DB.getRawLocal(_BACKUP_REMINDER_DISMISS) === today) return;

  // Último backup a partir do histórico existente
  let lastDate = null;
  try {
    const hist = DB.getLocal(DB.LS.backupHistory, []);
    if (hist.length) {
      const newest = hist.reduce((a, b) => (a.data > b.data ? a : b), hist[0]);
      lastDate = newest.data || null;
    }
  } catch(e) { /* ignore */ }

  const daysSince = lastDate
    ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)
    : Infinity;

  // Remove banner anterior e sai se ainda não é hora
  const old = $id(_BACKUP_REMINDER_ID);
  if (old) old.remove();
  if (daysSince < _BACKUP_REMINDER_DAYS) return;

  const isNever = daysSince === Infinity;
  const msg = isNever
    ? 'Você ainda não fez nenhum backup. Faça agora para proteger seus dados.'
    : `Você está a ${daysSince} dia${daysSince !== 1 ? 's' : ''} sem fazer backup.`;

  const banner = document.createElement('div');
  banner.id = _BACKUP_REMINDER_ID;
  banner.style.cssText = `display:flex;align-items:center;justify-content:space-between;gap:12px;
    padding:12px 16px;background:var(--violet-bg);border:1px solid var(--violet-bdr,rgba(132,69,204,.28));
    border-radius:var(--r-md);margin-bottom:8px`;
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;min-width:0">
      <span style="font-size:var(--text-lg);flex-shrink:0">📦</span>
      <div>
        <div style="font-size:var(--text-sm);font-weight:700;color:var(--azul)">Lembrete de backup</div>
        <div style="font-size:var(--text-xs);color:var(--violet-500);margin-top:2px">${msg}</div>
      </div>
    </div>
    <div style="display:flex;gap:6px;flex-shrink:0;align-items:center">
      <button onclick="gerarBackupCompleto()"
        style="padding:7px 14px;font-size:var(--text-xs);font-weight:700;background:var(--azul);
               color:#fff;border:none;border-radius:var(--r-sm);cursor:pointer">
        Fazer backup
      </button>
      <button onclick="DB.setRawLocal('${_BACKUP_REMINDER_DISMISS}','${today}');this.closest('#${_BACKUP_REMINDER_ID}').remove()"
        style="padding:7px 10px;font-size:var(--text-xs);background:transparent;
               border:1px solid var(--violet-bdr,rgba(132,69,204,.28));color:var(--violet-500);border-radius:var(--r-sm);cursor:pointer">
        Lembrar amanhã
      </button>
      <button onclick="DB.setRawLocal('${_BACKUP_REMINDER_DISMISS}','${today}');this.closest('#${_BACKUP_REMINDER_ID}').remove()"
        title="Fechar"
        style="padding:5px 8px;font-size:var(--text-sm);font-weight:700;background:transparent;
               border:none;color:var(--slate-400);cursor:pointer;line-height:1">✕</button>
    </div>`;

  const dash = $id('page-dashboard');
  if (dash) dash.insertBefore(banner, dash.firstChild);
}


function _dashHans(individuos) {
  const el = $id('dash-hans-section');
  if (!el) return;
  const seisMStr = new Date(new Date().setMonth(new Date().getMonth()-6)).toISOString().split('T')[0];

  const total     = individuos.length;
  const pendentes = individuos.filter(ind => {
    const ultimo = (historicoFichas.hans||[]).filter(f => f && f.individuoId == ind.idIndividuo).sort((a,b) => b.data.localeCompare(a.data))[0];
    return !ultimo || ultimo.data < seisMStr;
  });
  const rastreados = total - pendentes.length;
  const pct = total ? Math.round(rastreados/total*100) : 0;
  const cor = _statusColor(pct);


  el.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--bdr);border-radius:var(--radius-md);padding:14px 18px;cursor:pointer;transition:box-shadow .15s" onclick="openAcompPage('hans')"
         onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'" onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:36px;height:36px;border-radius:var(--r-md);background:var(--surface-2);color:var(--slate-500);display:flex;align-items:center;justify-content:center">${_ICONS.micro}</div>
          <div>
            <div style="font-size:var(--text-sm);font-weight:700;color:var(--slate-900)">Rastreio de Hanseníase</div>
            <div style="font-size:var(--text-xs);color:var(--slate-500);margin-top:2px">Cobertura semestral · clique para registrar</div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:var(--text-lg);font-weight:800;color:${cor};line-height:1">${pct}%</div>
          <div style="font-size:var(--text-2xs);color:var(--slate-500);margin-top:2px">${rastreados} de ${total}</div>
        </div>
      </div>
      <div style="background:var(--surface-3);border-radius:var(--r-full);height:4px;overflow:hidden;margin-bottom:8px">
        <div style="width:${pct}%;height:100%;background:${cor};border-radius:var(--r-full);transition:width .7s"></div>
      </div>
      <div style="font-size:var(--text-xs);color:${pendentes.length > 0 ? _COLORS.urgente : _COLORS.ok};font-weight:600;display:flex;align-items:center;gap:5px">
        ${pendentes.length > 0 ? _ICONS.bell : _ICONS.check}
        ${pendentes.length > 0 ? `${pendentes.length} indivíduo${pendentes.length!==1?'s':''} com rastreio pendente ou vencido` : 'Todos os rastreios em dia'}
      </div>
    </div>`;
}

// Helpers de Papanicolau e Mamografia

function papanicolauAtrasado(ind) {
  // Mulheres entre 25 e 64 anos
  if (ind.sexo !== 'F') return null;
  const idade = getIdadeEmAnos(ind.nasc);
  if (idade === null || idade < 25 || idade > 64) return null;
  if (!ind.papanicolau) return 'atrasado'; // nunca fez
  // Converte dd/mm/aaaa → yyyy-mm-dd antes de construir o Date
  const papISO = ind.papanicolau.includes('/') ? _brToISO(ind.papanicolau) : ind.papanicolau;
  if (!papISO) return 'atrasado';
  const diasDesd = (new Date() - new Date(papISO)) / (24*3600*1000);
  return diasDesd > 365 ? 'atrasado' : 'ok';
}
function mamografiaAtrasada(ind) {
  if (ind.sexo !== 'F') return null;
  const idade = getIdadeEmAnos(ind.nasc);
  if (idade === null || idade < 40 || idade > 69) return null;
  if (!ind.mamografia) return 'atrasada';
  const mamoISO = ind.mamografia.includes('/') ? _brToISO(ind.mamografia) : ind.mamografia;
  if (!mamoISO) return 'atrasada';
  const diasDesd = (new Date() - new Date(mamoISO)) / (24*3600*1000);
  return diasDesd > 730 ? 'atrasada' : 'ok';
}

// ============================================
// COMPONENTES DE DOMICÍLIOS/FAMÍLIAS
// ============================================

// ◆ BLOCO: COMPONENTES_RENDER
// renderCondicaoBadge, renderBotoes*, renderDomicilioCard, membros
// ✎ Editar para mudar aparência de cards de domicílio, família e membr
function renderCondicaoBadge(condicao) {
  const badges = {
    has: '<span class="badge badge-orange" style="font-size:var(--text-2xs)">HAS</span>',
    dm: '<span class="badge badge-red" style="font-size:var(--text-2xs)">DM</span>',
    gestante: '<span class="badge badge-blue" style="font-size:var(--text-2xs)">Gest.</span>',
    papanicolau: '<span class="badge badge-orange" style="font-size:var(--text-2xs)">Papa.</span>',
    mamografia: '<span class="badge badge-orange" style="font-size:var(--text-2xs)">Mamo.</span>'
  };
  return badges[condicao] || '';
}

function renderCondicoesFamilia(inds) {
  const condTags = [];
  if (inds.some(i => i.has === 'sim')) condTags.push(renderCondicaoBadge('has'));
  if (inds.some(i => i.dm === 'sim')) condTags.push(renderCondicaoBadge('dm'));
  if (inds.some(i => i.gestante === 'sim')) condTags.push(renderCondicaoBadge('gestante'));
  if (inds.some(i => papanicolauAtrasado(i) === 'atrasado')) condTags.push(renderCondicaoBadge('papanicolau'));
  if (inds.some(i => mamografiaAtrasada(i) === 'atrasada')) condTags.push(renderCondicaoBadge('mamografia'));
  return condTags.length ? condTags.join('') : '';
}

function renderBotoesAcaoFamilia(f) {
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;padding:0 18px 4px">
    <button class="btn btn-primary btn-sm" onclick="registrarVisitaRapida(${f.idFamilia})" title="Registrar Visita familiar">🏠 Visita Familiar</button>
    <button class="btn btn-secondary btn-sm" onclick="openNovoIndividuoNaFamilia(${f.idFamilia})" title="Adicionar indivíduo">+ Indivíduo</button>
    <button class="btn btn-secondary btn-sm" onclick="editarFamilia(${f.idFamilia})" title="Editar família">✎ Editar Família</button>
  </div>`;
}

function editarDomicilioFromFamilia(domId) {
  if (domId) editarDomicilio(domId);
}

// renderBotoesAcaoDomicilio — mantida para compatibilidade, mas os botões do domicílio
// são agora renderizados inline em renderDomicilioCard
function renderBotoesAcaoDomicilio(d) {
  const domId = d.idDomicilio;
  return `<div style="display:flex;gap:6px">
    <button class="btn btn-secondary btn-sm" onclick="editarDomicilio('${domId}')" title="Editar domicílio">✎ Editar</button>
    <button class="btn btn-danger btn-sm" onclick="excluirDomicilio('${domId}')" title="Excluir domicílio">🗑</button>
  </div>`;
}

function renderNotaFamilia(f) {
  return `
    <div class="dom-nota-wrap">
      <textarea class="dom-nota" rows="2" placeholder="Nota / observação sobre este domicílio..."
        onblur="salvarNota(${f.idFamilia},this.value)">${esc(f.nota || '')}</textarea>
    </div>
  `;
}

// ============================================
// SISTEMA DE CLASSIFICAÇÃO DE INDIVÍDUOS
// ============================================

function classificarIndividuo(ind) {
  if (!ind || !ind.nasc) return { categoria: 'indefinido', faixaEtaria: 'Indefinido', condicoes: [], idadeMeses: 0, idadeAnos: 0 };

  const idadeMeses = getIdadeEmMeses(ind.nasc);
  if (idadeMeses === null) return { categoria: 'indefinido', faixaEtaria: 'Indefinido', condicoes: [], idadeMeses: 0, idadeAnos: 0 };
  const idadeAnos = getIdadeEmAnos(ind.nasc) || 0;
  
  let categoria = '';
  let faixaEtaria = '';
  
  if (idadeMeses < 1) {
    categoria = 'recem_nascido';
    faixaEtaria = 'Recém-nascido (< 1 mês)';
  } else if (idadeMeses < 24) {
    categoria = 'bebe';
    faixaEtaria = 'Bebê (< 2 anos)';
  } else if (idadeAnos < 5) {
    categoria = 'crianca1';
    faixaEtaria = 'Criança (2-5 anos)';
  } else if (idadeAnos < 12) {
    categoria = 'crianca2';
    faixaEtaria = 'Criança (5-12 anos)';
  } else if (idadeAnos < 18) {
    categoria = 'adolescente';
    faixaEtaria = 'Adolescente (12-18 anos)';
  } else if (idadeAnos < 60) {
    categoria = 'adulto';
    faixaEtaria = 'Adulto (18-60 anos)';
  } else {
    categoria = 'idoso';
    faixaEtaria = 'Idoso (> 60 anos)';
  }
  
  const condicoes = [];
  if (ind.has === 'sim') condicoes.push('hipertenso');
  if (ind.dm === 'sim') condicoes.push('diabetico');
  if (ind.gestante === 'sim') condicoes.push('gestante');
  if (ind.acamado === 'sim') condicoes.push('acamado');
  if (ind.mental === 'sim') condicoes.push('saude_mental');
  if (ind.deficiencia && ind.deficiencia !== 'nao') condicoes.push('deficiencia');
  
  return { categoria, faixaEtaria, condicoes, idadeMeses, idadeAnos };
}

// ============================================
// COMPONENTES DE DETALHES DO INDIVÍDUO
// ============================================

// ◆ BLOCO: DETALHES_INDIVIDUO_FAIXA_ETARIA
// renderDetalhesRecemNascido, renderDetalhesBebe, renderDetalhesCrianc
// ✎ Alterar apenas se mudar campos exibidos no modal de indivíduo por

/** Renderiza o card grid de Peso / Altura / IMC — reutilizado em 4 faixas etárias. */
function _renderPesoAlturaImc(ind) {
  const id = ind.idIndividuo;
  return `
    <!-- Peso / Altura / IMC -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
      <div class="card" style="padding:14px">
        <div style="font-size:var(--text-xs);font-weight:700;color:var(--slate-500);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Peso</div>
        <input type="number" class="input" id="peso-${id}" placeholder="kg" step="0.1"
               value="${ind.pesoAtual || ''}"
               oninput="salvarDadoIndividuo(${id},'pesoAtual',this.value);calcularImcInline(${id},'peso-${id}','altura-${id}','imc-res-${id}')">
      </div>
      <div class="card" style="padding:14px">
        <div style="font-size:var(--text-xs);font-weight:700;color:var(--slate-500);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Altura (cm)</div>
        <input type="number" class="input" id="altura-${id}" placeholder="cm" step="0.5"
               value="${ind.altura || ''}"
               oninput="salvarDadoIndividuo(${id},'altura',this.value);calcularImcInline(${id},'peso-${id}','altura-${id}','imc-res-${id}')">
      </div>
      <div class="card" style="padding:14px">
        <div style="font-size:var(--text-xs);font-weight:700;color:var(--slate-500);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">IMC</div>
        <div id="imc-res-${id}" style="padding-top:4px;min-height:32px">
          ${_renderImcBadge(ind)}
        </div>
      </div>
    </div>`;
}

function renderDetalhesRecemNascido(ind) {
  return `
    <div style="padding: 16px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
        <div class="card" style="padding: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <span class="badge badge-azul">Peso</span>
            <span style="font-size: var(--text-sm); color: var(--cinza-600);">Ao nascer</span>
          </div>
          <input type="number" class="input" placeholder="Peso (kg)" step="0.01" 
                 value="${ind.pesoNasc || ''}" onchange="salvarDadoIndividuo(${ind.idIndividuo}, 'pesoNasc', this.value)">
        </div>
        <div class="card" style="padding: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <span class="badge badge-azul">APGAR</span>
            <span style="font-size: var(--text-sm); color: var(--cinza-600);">1º/5º minuto</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <input type="number" class="input" placeholder="1'" min="0" max="10" 
                   value="${ind.apgar1 || ''}" onchange="salvarDadoIndividuo(${ind.idIndividuo}, 'apgar1', this.value)">
            <input type="number" class="input" placeholder="5'" min="0" max="10" 
                   value="${ind.apgar5 || ''}" onchange="salvarDadoIndividuo(${ind.idIndividuo}, 'apgar5', this.value)">
          </div>
        </div>
      </div>
      <div class="card" style="padding: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <span class="badge badge-verde">Aleitamento</span>
        </div>
        <div style="display: flex; gap: 16px; flex-wrap: wrap;">
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="radio" name="aleitamento_${ind.idIndividuo}" value="exclusivo" 
                   ${ind.aleitamento === 'exclusivo' ? 'checked' : ''}
                   onchange="salvarDadoIndividuo(${ind.idIndividuo}, 'aleitamento', 'exclusivo')">
            <span>Exclusivo</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="radio" name="aleitamento_${ind.idIndividuo}" value="misto" 
                   ${ind.aleitamento === 'misto' ? 'checked' : ''}
                   onchange="salvarDadoIndividuo(${ind.idIndividuo}, 'aleitamento', 'misto')">
            <span>Misto (LM + Fórmula)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="radio" name="aleitamento_${ind.idIndividuo}" value="artificial" 
                   ${ind.aleitamento === 'artificial' ? 'checked' : ''}
                   onchange="salvarDadoIndividuo(${ind.idIndividuo}, 'aleitamento', 'artificial')">
            <span>Artificial (fórmula)</span>
          </label>
        </div>
      </div>
      <div style="margin-top: 16px;">${renderAbaVacinas(ind)}</div>
    </div>
  `;
}

function renderDetalhesBebe(ind) {
  return `
    <div style="padding: 16px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
        <div class="card" style="padding: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <span class="badge badge-azul">Peso Atual</span>
          </div>
          <input type="number" class="input" placeholder="Peso (kg)" step="0.01" 
                 value="${ind.pesoAtual || ''}" onchange="salvarDadoIndividuo(${ind.idIndividuo}, 'pesoAtual', this.value)">
        </div>
        <div class="card" style="padding: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <span class="badge badge-vermelho">Diarreia</span>
          </div>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" ${ind.diarreia ? 'checked' : ''} 
                   onchange="salvarDadoIndividuo(${ind.idIndividuo}, 'diarreia', this.checked)">
            <span>Teve diarreia nos últimos 15 dias</span>
          </label>
        </div>
      </div>
      <div class="card" style="padding: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <span class="badge badge-verde">Consumo Alimentar</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" ${ind.aleitamentoExclusivo ? 'checked' : ''}
                   onchange="salvarDadoIndividuo(${ind.idIndividuo}, 'aleitamentoExclusivo', this.checked)">
            <span>Aleitamento materno exclusivo</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" ${ind.alimentacaoComplementar ? 'checked' : ''}
                   onchange="salvarDadoIndividuo(${ind.idIndividuo}, 'alimentacaoComplementar', this.checked)">
            <span>Recebe alimentação complementar</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" ${ind.introducaoAlimentar ? 'checked' : ''}
                   onchange="salvarDadoIndividuo(${ind.idIndividuo}, 'introducaoAlimentar', this.checked)">
            <span>Em fase de introdução alimentar</span>
          </label>

        </div>
      </div>
      <div style="margin-top: 16px;">${renderAbaVacinas(ind)}</div>
    </div>
  `;
}

function renderDetalhesCrianca(ind, faixa) {
  return `
    <div style="padding: 16px;">
      ${_renderPesoAlturaImc(ind)}
      <div class="card" style="padding: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <span class="badge badge-verde">Acompanhamento</span>
        </div>
        <div style="display: grid; gap: 12px;">
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" ${ind.estuda ? 'checked' : ''}
                   onchange="salvarDadoIndividuo(${ind.idIndividuo}, 'estuda', this.checked)">
            <span>Frequenta escola/creche</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" ${ind.puericultura ? 'checked' : ''}
                   onchange="salvarDadoIndividuo(${ind.idIndividuo}, 'puericultura', this.checked)">
            <span>Em acompanhamento de puericultura</span>
          </label>

        </div>
      </div>
      <div style="margin-top: 16px;">${renderAbaVacinas(ind)}</div>
    </div>
  `;
}

function renderDetalhesAdolescente(ind) {
  return `
    <div style="padding: 16px;">
      ${_renderPesoAlturaImc(ind)}
      <div class="card" style="padding: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <span class="badge badge-verde">Saúde do Adolescente</span>
        </div>
        <div style="display: grid; gap: 12px;">
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" ${ind.estuda ? 'checked' : ''}
                   onchange="salvarDadoIndividuo(${ind.idIndividuo}, 'estuda', this.checked)">
            <span>Frequenta escola</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" ${ind.trabalha ? 'checked' : ''}
                   onchange="salvarDadoIndividuo(${ind.idIndividuo}, 'trabalha', this.checked)">
            <span>Trabalha</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" ${ind.usaMetodoContraceptivo ? 'checked' : ''}
                   onchange="salvarDadoIndividuo(${ind.idIndividuo}, 'usaMetodoContraceptivo', this.checked)">
            <span>Usa método contraceptivo</span>
          </label>
        </div>
      </div>
      <div style="margin-top: 16px;">${renderAbaVacinas(ind)}</div>
    </div>
  `;
}

function renderDetalhesAdulto(ind) {
  const classificacao = classificarIndividuo(ind);
  const temCondicoes = (classificacao.condicoes || []).length > 0;
  return `
    <div style="padding: 16px;">
      ${_renderPesoAlturaImc(ind)}
      ${temCondicoes ? renderBotoesCondicoes(ind, classificacao.condicoes) : ''}
      <div class="card" style="padding: 12px; margin-top: 16px;">
        <div class="card-title">🔬 Rastreio de Hanseníase</div>
        <div id="historico-hans-${ind.idIndividuo}">
          ${renderHistoricoHans(ind.idIndividuo)}
        </div>
      </div>

    </div>
  `;
}

function renderDetalhesIdoso(ind) {
  return `
    <div style="padding: 16px;">
      ${_renderPesoAlturaImc(ind)}
      <div class="card" style="padding: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
          <span class="badge badge-verde">Saúde do Idoso</span>
        </div>
        <div style="display: grid; gap: 12px;">
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" ${ind.acamado === 'sim' ? 'checked' : ''}
                   onchange="salvarDadoIndividuo(${ind.idIndividuo}, 'acamado', this.checked ? 'sim' : 'nao')">
            <span>Acamado</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" ${ind.domiciliado ? 'checked' : ''}
                   onchange="salvarDadoIndividuo(${ind.idIndividuo}, 'domiciliado', this.checked)">
            <span>Domiciliado (restrito ao lar)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" ${ind.quedas ? 'checked' : ''}
                   onchange="salvarDadoIndividuo(${ind.idIndividuo}, 'quedas', this.checked)">
            <span>Histórico de quedas</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" ${ind.cuidador ? 'checked' : ''}
                   onchange="salvarDadoIndividuo(${ind.idIndividuo}, 'cuidador', this.checked)">
            <span>Possui cuidador</span>
          </label>
        </div>
      </div>
      <div style="margin-top: 16px;">${renderAbaVacinas(ind)}</div>
    </div>
  `;
}

function renderBotoesCondicoes(ind, condicoes) {
  const botoes = [];
  if (condicoes.includes('hipertenso')) {
    botoes.push(`
      <button class="btn ${ind.paControlada ? 'btn-success' : 'btn-warning'}" 
              onclick="abrirModalPA(${ind.idIndividuo})" style="margin-right: 8px;">
        <span class="badge" style="background: none;">❤️</span>
        ${ind.paControlada ? 'PA Controlada' : 'PA não controlada'}
      </button>
    `);
  }
  if (condicoes.includes('diabetico')) {
    botoes.push(`
      <button class="btn ${ind.glicemiaControlada ? 'btn-success' : 'btn-warning'}" 
              onclick="abrirModalGlicemia(${ind.idIndividuo})" style="margin-right: 8px;">
        <span class="badge" style="background: none;">💉</span>
        ${ind.glicemiaControlada ? 'Glicemia Controlada' : 'Glicemia não controlada'}
      </button>
    `);
  }
  if (condicoes.includes('gestante')) {
    botoes.push(`
      <button class="btn btn-primary" onclick="abrirModalGestante(${ind.idIndividuo})" style="margin-right: 8px;">
        <span class="badge" style="background: none;">🤰</span>
        Acompanhamento Pré-natal
      </button>
    `);
  }
  if (condicoes.includes('saude_mental')) {
    botoes.push(`
      <button class="btn btn-secondary" onclick="abrirModalSaudeMental(${ind.idIndividuo})" style="margin-right: 8px;">
        <span class="badge" style="background: none;">🧠</span>
        Acompanhamento Saúde Mental
      </button>
    `);
  }
  return `
    <div class="card" style="padding: 12px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <span class="badge badge-azul">Condições de Saúde</span>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        ${botoes.join('')}
      </div>
    </div>
  `;
}

function renderAbaVacinas(ind) {
  const vacinas = ind.vacinas || [];
  return `
    <div class="card" style="padding: 12px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="badge badge-azul">💉 Vacinas</span>
        </div>
        <button class="btn btn-primary btn-sm" onclick="abrirModalVacinas(${ind.idIndividuo})">
          + Registrar Vacina
        </button>
      </div>
      <div style="max-height: 200px; overflow-y: auto;">
        ${vacinas.length === 0 
          ? '<p style="color: var(--cinza-500); text-align: center; padding: 16px;">Nenhuma vacina registrada</p>'
          : vacinas.flatMap(v => (v.doses || []).map((d, idx) => d && d.data ? `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid var(--cinza-200);">
              <div>
                <div style="font-weight: 600;">${esc(v.nome)}</div>
                <div style="font-size: var(--text-xs); color: var(--cinza-500);">Dose: ${idx + 1} | Data: ${formatData(d.data)}</div>
              </div>
              <span class="badge badge-verde">✓ Aplicada</span>
            </div>
          ` : '')).join('')
        }
      </div>
    </div>
  `;
}

// ============================================
// MODAL DE DETALHES DO INDIVÍDUO
// ============================================

// ◆ BLOCO: MODAL_DETALHES_INDIVIDUO
// abrirDetalhesIndividuo, fecharDetalhesIndividuo, salvarDadoIndividuo
// ✎ Editar para mudar o modal de detalhes / abas do indivíduo
function abrirDetalhesIndividuo(indOuId) {
  // Redireciona para o modal de visita individual unificado
  var id  = (typeof indOuId === 'object') ? indOuId.idIndividuo : indOuId;
  var ind = db.individuoById[id];
  if (!ind) return;
  if (window._visInd) {
    window._visInd.open(ind.familiaId, id);
  }
}

// Gera os botões de acesso rápido às fichas de acordo com as condições do indivíduo.
// Cada botão abre diretamente a ficha do tipo correspondente com o indivíduo pré-selecionado.
function _botoesDetalheFichas(ind) {
  const botoes = [];
  const id     = ind.idIndividuo;

  // Mapeamento condição → ficha
  if (ind.has === 'sim')
    botoes.push({ tipo:'has', label:'📋 Ficha HAS', cor:'var(--vermelho)', bg:_COLORS.bgRose });
  if (ind.dm === 'sim')
    botoes.push({ tipo:'dm', label:'📋 Ficha DM', cor:_COLORS.gestante, bg:_COLORS.bgViolet });
  if (ind.gestante === 'sim')
    botoes.push({ tipo:'gestante', label:'📋 Pré-natal', cor:'var(--azul)', bg:'var(--azul-fraco)' });
  if (ind.tb === 'hanseniase')
    botoes.push({ tipo:'hans', label:'📋 Hanseníase', cor:'var(--laranja)', bg:_COLORS.bgOrange });
  if (ind.tb === 'tb')
    botoes.push({ tipo:'tb',   label:'📋 Tuberculose (TB)', cor:'var(--azul)',    bg:'var(--azul-fraco)' });

  // Consumo alimentar: crianças < 2 anos
  const idadeAnos = getIdadeEmAnos(ind.nasc);
  if (idadeAnos !== null && idadeAnos < 2)
    botoes.push({ tipo:'consumoAlimentar', label:'📋 Consumo Alimentar', cor:'var(--verde)', bg:'var(--verde-fraco)' });

  if (!botoes.length) return '';

  return botoes.map(b => `
    <button class="btn btn-sm"
      onclick="fecharDetalhesIndividuo();abrirFichaDoIndividuo('${b.tipo}',${id})"
      style="border:1px solid ${b.cor};color:${b.cor};background:${b.bg};font-size:var(--text-xs);padding:4px 10px;font-weight:600;border-radius:var(--r-sm)">
      ${b.label}
    </button>`).join('');
}

function fecharDetalhesIndividuo() {
  const overlay = $id('modal-detalhes-individuo');
  if (overlay) overlay.remove();
  currentIndividuoId = null;
}

function salvarDadoIndividuo(id, campo, valor) {
  const ind = getIndividuo(id);
  if (ind) {
    ind[campo] = valor;
    save();
    DB.invalidate();
    // Não reabre o modal para campos como peso/altura/IMC — evita perda de foco
  }
}

// ── Avatar de membro: combina faixa etária + sexo + raça/cor ──────────────
// Raças registradas no sistema: Branca, Preta, Amarela, Parda, Indígena
// Sexo: M / F
// Retorna um emoji que representa adequadamente o indivíduo
function getAvatarMembro(ind, cl) {
  const _av = _getAvatarMembroInner(ind, cl);
  return _av || '👤';
}
function _getAvatarMembroInner(ind, cl) {
  const cat   = cl ? cl.categoria : 'adulto';
  const sexo  = (ind.sexo  || 'M').toUpperCase();
  const raca  = (ind.raca  || '').toLowerCase();
  const gest  = ind.gestante === 'sim';

  // Recém-nascido e bebê — neutros
  if (cat === 'recem_nascido') return '👶';
  if (cat === 'bebe')          return '🍼';

  // Gestante
  if (gest) return '🤰';

  // Indígena
  if (raca === 'indígena' || raca === 'indigena') {
    if (cat === 'crianca1' || cat === 'crianca2') return sexo === 'F' ? '👧🏽' : '👦🏽';
    if (cat === 'adolescente') return sexo === 'F' ? '👩🏽' : '👨🏽';
    if (cat === 'idoso')       return sexo === 'F' ? '👵🏽' : '👴🏽';
    return sexo === 'F' ? '👩🏽' : '👨🏽';
  }

  // Preta
  if (raca === 'preta') {
    if (cat === 'crianca1' || cat === 'crianca2') return sexo === 'F' ? '👧🏿' : '👦🏿';
    if (cat === 'adolescente') return sexo === 'F' ? '👩🏿' : '👨🏿';
    if (cat === 'idoso')       return sexo === 'F' ? '👵🏿' : '👴🏿';
    return sexo === 'F' ? '👩🏿' : '👨🏿';
  }

  // Amarela
  if (raca === 'amarela') {
    if (cat === 'crianca1' || cat === 'crianca2') return sexo === 'F' ? '👧🏻' : '👦🏻';
    if (cat === 'adolescente') return sexo === 'F' ? '👩🏻' : '👨🏻';
    if (cat === 'idoso')       return sexo === 'F' ? '👵🏻' : '👴🏻';
    return sexo === 'F' ? '👩🏻' : '👨🏻';
  }

  // Parda
  if (raca === 'parda') {
    if (cat === 'crianca1' || cat === 'crianca2') return sexo === 'F' ? '👧🏽' : '👦🏽';
    if (cat === 'adolescente') return sexo === 'F' ? '👩🏽' : '👨🏽';
    if (cat === 'idoso')       return sexo === 'F' ? '👵🏽' : '👴🏽';
    return sexo === 'F' ? '👩🏽' : '👨🏽';
  }

  // Branca (default)
  if (cat === 'crianca1' || cat === 'crianca2') return sexo === 'F' ? '👧🏼' : '👦🏼';
  if (cat === 'adolescente') return sexo === 'F' ? '👩🏼' : '👨🏼';
  if (cat === 'idoso')       return sexo === 'F' ? '👵🏼' : '👴🏼';
  return sexo === 'F' ? '👩🏼' : '👨🏼';
}

// ============================================
// CARDS DE MEMBROS
// ============================================

function renderMembroCard(ind) {
  const classificacao = classificarIndividuo(ind);
  const coresBadge = {
    recem_nascido: 'badge-azul', bebe: 'badge-verde', crianca1: 'badge-verde',
    crianca2: 'badge-amarelo', adolescente: 'badge-amarelo', adulto: 'badge-cinza', idoso: 'badge-azul'
  };
  const condicoesIcons = [];
  if (ind.has === 'sim') condicoesIcons.push('❤️');
  if (ind.dm === 'sim') condicoesIcons.push('💉');
  if (ind.gestante === 'sim') condicoesIcons.push('🤰');
  if (ind.acamado === 'sim') condicoesIcons.push('🛏️');
  if (ind.mental === 'sim') condicoesIcons.push('🧠');
  const idade  = calcIdade(ind.nasc);
  const isResp = (() => { const f2 = getFamilia(ind.familiaId); return f2 && f2.responsavelId == ind.idIndividuo; })();

  const el = cloneTemplate('tpl-membro-card');
  el.addEventListener('click', function() { abrirDetalhesIndividuo(ind.idIndividuo); });

  el.querySelector('.membro-avatar').innerHTML = getAvatarMembro(ind, classificacao);
  el.querySelector('.membro-nome').textContent = ind.nome;

  const badge = el.querySelector('.membro-badge-faixa');
  badge.textContent = classificacao.faixaEtaria;
  badge.className   = 'badge ' + (coresBadge[classificacao.categoria] || 'badge-cinza');

  const starEl = el.querySelector('.membro-resp-star');
  starEl.hidden = !isResp;

  el.querySelector('.membro-idade').textContent = '📅 ' + idade.texto;

  const condsEl = el.querySelector('.membro-conds-row');
  if (condicoesIcons.length) {
    condsEl.hidden = false;
    condicoesIcons.forEach(function(ic) {
      const s = document.createElement('span');
      s.className   = 'membro-cond-icon';
      s.textContent = ic;
      condsEl.appendChild(s);
    });
  }

  const dppEl = el.querySelector('.membro-dpp');
  if (ind.gestante === 'sim') {
    dppEl.hidden      = false;
    dppEl.style.color = 'var(--violet-600)';
    dppEl.textContent = 'DPP: ' + (ind.dpp ? formatData(ind.dpp) : 'Não informada');
  }

  return el;
}

function renderMembrosSelecta(inds) {
  if (!inds || inds.length === 0) return '';

  const famId  = inds[0].familiaId;
  const fam    = getFamilia(famId);
  const respId = fam ? fam.responsavelId : null;
  const resp   = respId ? getIndividuo(respId) : null;
  const outros = inds.length - 1;

  // ── Condição do responsável (ícones rápidos) ─────────────────────────────
  const condIcons = [];
  if (resp) {
    if (resp.has      === 'sim') condIcons.push('<span class="membro-cond-icon" title="Hipertensão">❤️</span>');
    if (resp.dm       === 'sim') condIcons.push('<span class="membro-cond-icon" title="Diabetes">💉</span>');
    if (resp.gestante === 'sim') condIcons.push('<span class="membro-cond-icon" title="Gestante">🤰</span>');
    if (resp.acamado  === 'sim') condIcons.push('<span class="membro-cond-icon" title="Acamado">🛏️</span>');
    if (resp.mental   === 'sim') condIcons.push('<span class="membro-cond-icon" title="Saúde Mental">🧠</span>');
    if (resp.cancer   === 'sim') condIcons.push('<span class="membro-cond-icon" title="Câncer">🎗️</span>');
  }

  // ── Render de UM indivíduo como card completo (reutilizado no expand) ──────
  function _cardInd(ind) {
    const cl  = classificarIndividuo(ind);
    const av  = getAvatarMembro(ind, cl);
    const idd = calcIdadeCard(ind.nasc);
    const isR = fam && fam.responsavelId == ind.idIndividuo;
    const sexoIcon = ind.sexo === 'F' ? '♀' : '♂';
    const sexoCor  = ind.sexo === 'F' ? _COLORS.txtPink : _COLORS.info;
    const conds = [];
    if (ind.has==='sim')      conds.push('<span class="membro-cond-icon" title="Hipertensão">❤️</span>');
    if (ind.dm==='sim')       conds.push('<span class="membro-cond-icon" title="Diabetes">💉</span>');
    if (ind.gestante==='sim') conds.push('<span class="membro-cond-icon" title="Gestante">🤰</span>');
    if (ind.acamado==='sim')  conds.push('<span class="membro-cond-icon" title="Acamado">🛏️</span>');
    if (ind.mental==='sim')   conds.push('<span class="membro-cond-icon" title="Saúde Mental">🧠</span>');
    if (ind.cancer==='sim')   conds.push('<span class="membro-cond-icon" title="Câncer">🎗️</span>');
    if (ind.tb==='tb')        conds.push('<span class="membro-cond-icon" title="Tuberculose">🫁</span>');
    if (temVacinaAtrasada(ind)) conds.push('<span class="membro-cond-alerta" title="Vacina atrasada">💉🔴</span>');
    const bolsa = ind.bolsaFamilia && !ind.bolsaPesagem
      ? '<span class="membro-cond-bolsa" title="Pesagem Bolsa Família pendente">⚖️!</span>' : '';
    return `<div class="membro-grid-card" onclick="abrirDetalhesIndividuo(${ind.idIndividuo})">
      ${isR ? '<span class="membro-grid-resp">Resp</span>' : ''}
      <div class="membro-grid-avatar">${av}</div>
      <div class="membro-grid-info">
        <div class="membro-grid-nome" title="${esc(ind.nome)}">${esc(ind.nome)}</div>
        <div class="membro-grid-idade">${idd.linha1} <span style="color:${sexoCor};font-weight:700">${sexoIcon}</span></div>
        ${conds.length || bolsa ? `<div class="membro-grid-conds">${conds.join('')}${bolsa}</div>` : ''}
      </div>
      <svg style="width:var(--icon-xs);height:var(--icon-xs);flex-shrink:0;color:var(--slate-400);margin-left:auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`;
  }

  // ── Responsável em destaque (sempre renderizado) ─────────────────────────
  const respNome = resp ? (resp.nome || 'Responsável') : (inds[0].nome || 'Responsável');
  const respCard = resp
    ? _cardInd(resp)
    : `<div class="membro-grid-card" style="border:1.5px dashed var(--bdr);opacity:.7">
        <div class="membro-grid-avatar">👤</div>
        <div class="membro-grid-nome">${esc(respNome)}</div>
        <div class="membro-grid-idade" style="color:var(--slate-400)">Responsável</div>
      </div>`;

  // ── Demais membros: lazy – só carregam ao clicar ─────────────────────────
  const outrosInds = resp ? inds.filter(i => i.idIndividuo !== resp.idIndividuo) : inds.slice(1);
  const idsJson    = JSON.stringify(outrosInds.map(i => i.idIndividuo));

  const lazyPlaceholder = outrosInds.length > 0 ? `
    <div class="acs-lazy-members" data-fam="${famId}"
      onclick="_expandMembros(this, ${famId})"
      data-ids="${idsJson.replace(/"/g, '&quot;')}"
      style="display:flex;align-items:center;justify-content:center;gap:8px;
             min-height:64px;cursor:pointer;border:1.5px dashed var(--bdr);border-radius:var(--r-md);
             font-size:var(--text-xs);font-weight:700;color:var(--slate-500);
             transition:background .14s,border-color .14s;grid-column:1/-1"
      onmouseenter="this.style.background='var(--surface-2)';this.style.borderColor='var(--bdr-strong)'"
      onmouseleave="this.style.background='';this.style.borderColor=''">
      <span style="font-size:var(--text-md)">👥</span>
      Ver mais ${outrosInds.length} membro${outrosInds.length !== 1 ? 's' : ''}…
    </div>` : '';

  return `
    <div style="padding:12px 12px 14px;background:var(--surface-2);border-top:1px solid var(--bdr);box-sizing:border-box;overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-2);padding:0 2px">
        <span class="membros-label">👥 ${inds.length} indivíduo${inds.length !== 1 ? 's' : ''}</span>
        <button class="btn btn-primary btn-sm" onclick="openNovoIndividuoNaFamilia(${famId})">+ Indivíduo</button>
      </div>
      <div id="membros-grid-${famId}" style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--sp-2)">
        ${respCard}
        ${lazyPlaceholder}
      </div>
    </div>`;
}

// ── Lazy expand de membros ────────────────────────────────────────────────────
function _expandMembros(triggerEl, famId) {
  if (!triggerEl) return;
  const idsJson = triggerEl.dataset.ids;
  if (!idsJson) return;

  let ids;
  try { ids = JSON.parse(idsJson); } catch(e) { return; }

  // Spinner imediato
  triggerEl.innerHTML = '<span style="font-size:var(--text-md)">⌛</span> Carregando…';
  triggerEl.style.pointerEvents = 'none';

  setTimeout(() => {
    const fam = getFamilia(famId);
    const fragment = document.createDocumentFragment();

    ids.forEach(id => {
      const ind = getIndividuo(id);
      if (!ind) return;
      const cl  = classificarIndividuo(ind);
      const av  = getAvatarMembro(ind, cl);
      const idd = calcIdadeCard(ind.nasc);
      const isR = fam && fam.responsavelId == ind.idIndividuo;
      const sexoIcon = ind.sexo === 'F' ? '♀' : '♂';
      const sexoCor  = ind.sexo === 'F' ? _COLORS.txtPink : _COLORS.info;

      const COND_MAP = [
        ['has',      'Hipertensão',  '❤️'],
        ['dm',       'Diabetes',     '💉'],
        ['gestante', 'Gestante',     '🤰'],
        ['acamado',  'Acamado',      '🛏️'],
        ['mental',   'Saúde Mental', '🧠'],
        ['cancer',   'Câncer',       '🎗️'],
      ];

      const div = cloneTemplate('tpl-membro-grid-card');
      div.addEventListener('click',      function() { abrirDetalhesIndividuo(ind.idIndividuo); });
      div.addEventListener('mouseenter', function() { div.style.boxShadow = '0 3px 12px rgba(0,0,0,.1)'; div.style.transform = 'translateY(-1px)'; });
      div.addEventListener('mouseleave', function() { div.style.boxShadow = ''; div.style.transform = ''; });

      const respEl = div.querySelector('.membro-grid-resp');
      respEl.hidden = !isR;

      div.querySelector('.membro-grid-avatar').innerHTML = av;

      const nomeEl = div.querySelector('.membro-grid-nome');
      nomeEl.title       = ind.nome;
      nomeEl.textContent = ind.nome;

      const idadeEl = div.querySelector('.membro-grid-idade');
      idadeEl.textContent = idd.linha1 + ' ';
      const sexoSpan = document.createElement('span');
      sexoSpan.style.cssText = 'color:' + sexoCor + ';font-weight:700';
      sexoSpan.textContent   = sexoIcon;
      idadeEl.appendChild(sexoSpan);

      const condsEl = div.querySelector('.membro-grid-conds');
      const condsFrag = document.createDocumentFragment();

      COND_MAP.forEach(function([key, label, icon]) {
        if (ind[key] === 'sim') {
          const s = document.createElement('span');
          s.className = 'membro-cond-icon';
          s.title     = label;
          s.textContent = icon;
          condsFrag.appendChild(s);
        }
      });
      if (ind.tb === 'tb') {
        const s = document.createElement('span');
        s.className = 'membro-cond-icon'; s.title = 'Tuberculose'; s.textContent = '🫁';
        condsFrag.appendChild(s);
      }
      if (temVacinaAtrasada(ind)) {
        const s = document.createElement('span');
        s.className = 'membro-cond-alerta'; s.title = 'Vacina atrasada'; s.textContent = '💉🔴';
        condsFrag.appendChild(s);
      }
      if (ind.bolsaFamilia && !ind.bolsaPesagem) {
        const s = document.createElement('span');
        s.className = 'membro-cond-bolsa'; s.title = 'Pesagem Bolsa Família pendente'; s.textContent = '⚖️!';
        condsFrag.appendChild(s);
      }

      if (condsFrag.childElementCount) {
        condsEl.hidden = false;
        condsEl.appendChild(condsFrag);
      }

      fragment.appendChild(div);
    });

    triggerEl.replaceWith(fragment);
  }, 16);
}

// ── IntersectionObserver: pré-carrega ao rolar próximo ───────────────────────
if (typeof IntersectionObserver !== 'undefined') {
  const _lazyObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const famId = parseInt(el.dataset.fam, 10);
      if (famId) _expandMembros(el, famId);
      _lazyObserver.unobserve(el);
    });
  }, { rootMargin: '120px' });

  // Observa novos placeholders ao inserir no DOM
  // P2-5: escopo limitado ao container da lista de ruas (#lista-ruas), não document.body.
  // Motivo: observe(document.body, subtree:true) disparava para TODA inserção de nó
  // na página (toasts, badges, modais), causando centenas de execuções extras por
  // keystroke em listas de busca. O container alvo é substituído como um bloco,
  // então childList:true no próprio nó já captura os filhos diretos inseridos
  // pelo renderFamilias(). Para placeholders aninhados dentro de grupos de rua,
  // usamos subtree:true mas limitado ao container da lista.
  // A referência é exposta no Render para permitir disconnect() futuro.
  const _lazyMutCallback = function(mutations) {
    mutations.forEach(function(m) {
      m.addedNodes.forEach(function(node) {
        if (node.nodeType !== 1) return;
        node.querySelectorAll?.('.acs-lazy-members:not([data-observed])').forEach(function(el) {
          el.dataset.observed = '1';
          _lazyObserver.observe(el);
        });
        if (node.classList?.contains('acs-lazy-members') && !node.dataset.observed) {
          node.dataset.observed = '1';
          _lazyObserver.observe(node);
        }
      });
    });
  };
  // Inicia observação no container correto após o DOM estar pronto.
  // DOMContentLoaded pode já ter disparado — usa requestAnimationFrame para
  // garantir que #lista-ruas existe antes de observar.
  const _attachLazyMutObs = function() {
    const listaRuas = document.getElementById('lista-ruas');
    const root = listaRuas || document.getElementById('main-content') || document.body;
    Render._lazyMutObs = new MutationObserver(_lazyMutCallback);
    Render._lazyMutObs.observe(root, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _attachLazyMutObs, { once: true });
  } else {
    requestAnimationFrame(_attachLazyMutObs);
  }
}


function renderMensagemSemMembros(f) {
  return `
    <div style="grid-column:1/-1;font-size:var(--text-xs);color:var(--cinza-500);padding:6px 0">
      Nenhum membro cadastrado. 
      <button class="btn btn-secondary btn-sm" onclick="openNovoIndividuoNaFamilia(${f.idFamilia})">+ Cadastrar indivíduo</button>
    </div>
  `;
}

// ── renderDomicilioCard ────────────────────────────────────────────────────
// Vista compacta: só o número da casa como pill clicável.
// Ao clicar abre um modal com os detalhes completos da família.
function renderDomicilioCard(d) {
  const { visitasByFam, indsByFam } = getSnapshot();
  const familias    = (d.familias || []).map(fid => getFamilia(fid)).filter(Boolean);
  const visitadoMes = familias.some(f => visitasByFam.has(f.idFamilia));

  // Quando filtro papanicolau está ativo, o pill reflete status do exame — não da visita
  const fc = $id('filter-cond-fam') ? $id('filter-cond-fam').value : '';
  let txtStatus, pillBorder, pillBg;
  if (fc === 'papa-atrasado' || fc === 'papa-ok') {
    const todasInds = familias.flatMap(function(f) { return indsByFam[f.idFamilia] || []; });
    const temPend   = todasInds.some(function(i) { return papanicolauAtrasado(i) === 'atrasado'; });
    const temOk     = todasInds.some(function(i) { return papanicolauAtrasado(i) === 'ok'; });
    if (fc === 'papa-atrasado') {
      txtStatus  = temPend ? '🔴' : '–';
      pillBorder = temPend ? 'var(--vermelho)' : 'var(--bdr-strong)';
      pillBg     = temPend ? 'var(--rose-bg)'  : 'var(--surface-2)';
    } else {
      txtStatus  = temOk ? '✅' : '–';
      pillBorder = temOk ? 'var(--verde)'    : 'var(--bdr-strong)';
      pillBg     = temOk ? 'var(--emerald-bg)' : 'var(--surface-2)';
    }
  } else {
    txtStatus  = visitadoMes ? '✓' : '⏳';
    pillBorder = 'var(--bdr-strong)';
    pillBg     = 'var(--surface-2)';
  }

  return `
    <div class="domicilio-row ${visitadoMes ? 'visitado' : 'pendente'}"
      style="display:inline-block;margin:0;border:none;background:transparent;box-shadow:none;padding:0">
      <div class="dom-num-pill" onclick="abrirModalDomCard('${d.idDomicilio}')"
        style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;
               background:${pillBg};border:1.5px solid ${pillBorder};border-radius:var(--r-md);
               padding:6px 14px;margin:4px;transition:box-shadow .15s,transform .12s;user-select:none"
        onmouseenter="this.style.boxShadow='0 3px 10px rgba(0,0,0,.15)';this.style.transform='translateY(-1px)'"
        onmouseleave="this.style.boxShadow='';this.style.transform=''">
        <span class="dom-num">${esc(d.numero || 'S/N')}</span>
        <span class="dom-num-status" style="font-size:var(--text-sm);color:var(--slate-500)">${txtStatus}</span>
      </div>
    </div>
  `;
}

function abrirModalDomCard(domId) {
  var d = getDomicilio(domId);
  if (!d) return;

  var familias = (d.familias || []).map(function(fid) { return getFamilia(fid); }).filter(Boolean);
  var snap     = getSnapshot();
  var visitasByFam = snap.visitasByFam;
  var indsByFam    = snap.indsByFam;
  var visitadoMes  = familias.some(function(f) { return visitasByFam.has(f.idFamilia); });

  // Detecta filtro papa ativo
  var fcEl    = $id('filter-cond-fam');
  var fc      = fcEl ? fcEl.value : '';
  var modoPapa = (fc === 'papa-atrasado' || fc === 'papa-ok');

  var txtStatus, headerClass;
  if (modoPapa) {
    txtStatus   = fc === 'papa-atrasado' ? '🔴 Papanicolau pendente' : '✅ Papanicolau em dia';
    headerClass = fc === 'papa-atrasado' ? 'dom-modal-header dom-header-pend' : 'dom-modal-header dom-header-ok';
  } else {
    txtStatus   = visitadoMes ? '✓ Visitado' : '⏳ Pendente';
    headerClass = visitadoMes ? 'dom-modal-header dom-header-ok' : 'dom-modal-header dom-header-pend';
  }

  // Badge papanicolau por indivíduo (só no modo papa)
  function _papaBadge(ind) {
    var st = papanicolauAtrasado(ind);
    if (st === null) return '';
    if (st === 'atrasado') return '<span style="font-size:var(--text-2xs);background:var(--rose-bg);color:var(--vermelho);padding:1px 6px;border-radius:var(--r-full);font-weight:700;margin-left:4px">🔴 pendente</span>';
    return '<span style="font-size:var(--text-2xs);background:var(--emerald-bg);color:var(--emerald-700);padding:1px 6px;border-radius:var(--r-full);font-weight:700;margin-left:4px">✅ em dia</span>';
  }

  var famHtml = familias.length === 0
    ? '<div style="padding:16px;text-align:center;color:var(--slate-400);font-size:var(--text-sm);font-style:italic">Nenhuma família cadastrada neste domicílio.<br><button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="closeModal(\'modal-dom-card\');openNovaFamiliaNoDomicilio(\'' + d.idDomicilio + '\')">+ Cadastrar família</button></div>'
    : familias.map(function(f) {
        var inds      = indsByFam[f.idFamilia] || [];
        var dias      = diasSemVisita(f.ultimaVisita);
        var visitFam  = visitasByFam.has(f.idFamilia);
        var resp      = f.responsavelId ? getIndividuo(f.responsavelId) : null;
        var respNome  = resp ? resp.nome : (f.responsavel || 'Família');
        var riscoColor= f.risco==='alto' ? 'var(--vermelho)' : f.risco==='medio' ? 'var(--amarelo)' : 'var(--verde)';
        var riscoBg   = f.risco==='alto' ? 'var(--rose-bg)' : f.risco==='medio' ? 'var(--orange-bg)' : 'var(--emerald-bg)';

        var statusFam = modoPapa ? '' : (visitFam
          ? '<span style="font-size:var(--text-xs);background:var(--emerald-bg);color:var(--emerald-700);padding:1px 7px;border-radius:var(--r-full);font-weight:700">✓ Visitada</span>'
          : '<span style="font-size:var(--text-xs);background:var(--orange-bg);color:var(--orange-600);padding:1px 7px;border-radius:var(--r-full);font-weight:700">⏳ ' + (dias < 999 ? dias+'d' : 'Nunca') + '</span>');

        // Lista elegíveis no modo papa
        var membrosHtml;
        if (modoPapa) {
          var elegiveis = inds.filter(function(i) { return papanicolauAtrasado(i) !== null; });
          if (!elegiveis.length) {
            membrosHtml = '<div style="padding:8px 14px;font-size:var(--text-xs);color:var(--slate-400);font-style:italic">Nenhuma mulher elegível (25–64 anos) nesta família.</div>';
          } else {
            membrosHtml = '<div style="padding:8px 14px;display:flex;flex-direction:column;gap:6px">'
              + elegiveis.map(function(i) {
                  return '<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:var(--r-md);background:var(--surface-2)">'
                    + '<span style="font-size:var(--text-sm)">♀</span>'
                    + '<div style="flex:1;min-width:0">'
                    + '<div style="font-size:var(--text-sm);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(i.nome) + '</div>'
                    + '<div style="font-size:var(--text-xs);color:var(--slate-500)">' + (calcIdade(i.nasc).texto || '') + _papaBadge(i) + '</div>'
                    + '</div>'
                    + '<button class="btn btn-secondary btn-sm" onclick="closeModal(\'modal-dom-card\');editarIndividuo(' + i.idIndividuo + ')" style="flex-shrink:0;font-size:var(--text-xs)">✎ Editar</button>'
                    + '</div>';
                }).join('')
              + '</div>';
          }
        } else {
          membrosHtml = inds.length ? renderMembrosSelecta(inds) : renderMensagemSemMembros(f);
        }

        var visitaBtn = modoPapa ? '' :
          '<button class="btn btn-secondary btn-sm" onclick="closeModal(\'modal-dom-card\');openNovaVisitaParaFamilia(' + f.idFamilia + ')" title="Registrar Visita" style="display:inline-flex;align-items:center;gap:5px;padding:0 10px;min-height:32px"><img src="icones/sistema/ico_visita_familia.png" style="width:16px;height:16px;object-fit:contain;flex-shrink:0"><span style="font-size:var(--text-xs);font-weight:700;white-space:nowrap">Visita</span></button>';

        return '<div style="border-top:1px solid var(--bdr)">'
          + '<div style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:var(--slate-50)">'
          + '<div style="flex:1;min-width:0">'
          + '<div class="dom-fam-resp">' + esc(respNome) + '</div>'
          + '<div class="dom-fam-badges">'
          + '<span class="dom-fam-badge" style="background:var(--violet-bg);color:var(--violet-600)">' + inds.length + ' indivíduo' + (inds.length!==1?'s':'') + '</span>'
          + statusFam
          + '<span class="dom-fam-badge" style="background:' + riscoBg + ';color:' + riscoColor + '">' + (f.risco||'–') + '</span>'
          + (f.prontuario ? '<span class="dom-fam-badge" style="color:var(--slate-400)">' + esc(f.prontuario) + '</span>' : '')
          + '</div></div>'
          + '<div style="display:flex;gap:4px;flex-shrink:0">'
          + visitaBtn
          + '<button class="btn btn-secondary btn-sm" onclick="closeModal(\'modal-dom-card\');editarFamilia(' + f.idFamilia + ')" title="Editar família" style="display:inline-flex;align-items:center;gap:5px;padding:0 10px;min-height:32px"><img src="icones/sistema/ico_editar.png" style="width:16px;height:16px;object-fit:contain;flex-shrink:0"><span style="font-size:var(--text-xs);font-weight:700;white-space:nowrap">Editar</span></button>'
          + '<button class="btn btn-danger btn-sm" onclick="closeModal(\'modal-dom-card\');excluirFamilia(' + f.idFamilia + ')" title="Excluir família" style="display:inline-flex;align-items:center;gap:5px;padding:0 10px;min-height:32px"><img src="icones/sistema/ico_excluir.png" style="width:16px;height:16px;object-fit:contain;flex-shrink:0"><span style="font-size:var(--text-xs);font-weight:700;white-space:nowrap">Excluir</span></button>'
          + '</div></div>'
          + membrosHtml
          + renderNotaFamilia(f)
          + '</div>';
      }).join('');

  var header = '<div class="' + headerClass + '">'
    + '<div>'
    + '<div class="dom-modal-logradouro">' + esc(d.logradouro||'') + ' <span class="dom-modal-numero">' + esc(d.numero||'S/N') + '</span></div>'
    + '<div class="dom-modal-sub">' + ([d.bairro,d.complemento].filter(Boolean).map(esc).join(' · ') || '&nbsp;') + ' &nbsp;·&nbsp; <span style="font-weight:700">' + txtStatus + '</span></div>'
    + '</div>'
    + '<button onclick="closeModal(\'modal-dom-card\')" class="dom-close-btn">✕</button>'
    + '</div>';

  var footer = '<div class="modal-footer">'
    + '<button class="btn btn-primary btn-sm" onclick="closeModal(\'modal-dom-card\');openNovaFamiliaNoDomicilio(\'' + d.idDomicilio + '\')">+ Família</button>'
    + '<button class="btn btn-secondary btn-sm" onclick="closeModal(\'modal-dom-card\');editarDomicilio(\'' + d.idDomicilio + '\')">✎ Editar</button>'
    + '<button class="btn btn-danger btn-sm" onclick="closeModal(\'modal-dom-card\');excluirDomicilio(\'' + d.idDomicilio + '\')">🗑 Excluir</button>'
    + '</div>';

  $id('modal-dom-card-body').innerHTML = header + '<div class="dom-modal-body">' + famHtml + '</div>' + footer;
  openModal('modal-dom-card');
}

// ── Render — módulo de estado de UI ──────────────────────────────────────────
// Declarado aqui (antes de renderCabecalhoRua) para evitar ReferenceError:
// renderCorpoRua e toggleRua usam Render.ruasAbertas a partir desta área.
const Render = (() => {
  let _searchTimer = null;
  const ruasAbertas  = new Set(); // ruas abertas atualmente
  const ruasFechadas = new Set(); // ruas EXPLICITAMENTE fechadas pelo usuário

  function onSearchInput() {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(renderFamilias, SEARCH_DEBOUNCE_MS);
  }

  return { ruasAbertas, ruasFechadas, onSearchInput };
})();

function renderCabecalhoRua(rua, doms, visRua, pctRua, ruaId, isOpen) {
  const corBarra = pctRua >= 80 ? _COLORS.ok : pctRua >= 50 ? _COLORS.warn : _COLORS.urgente;
  return `
    <div class="rua-header" onclick="toggleRua('${ruaId}')">
      <!-- Nome da rua em destaque -->
      <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
        <div style="min-width:0;flex:1">
          <div class="rua-nome">${rua}</div>
          <div style="display:flex;gap:6px;margin-top:5px;flex-wrap:wrap;align-items:center">
            <span class="rua-pill">🏠 ${doms.length}</span>
            <span class="rua-pill rua-pill-ok">✓ ${visRua}</span>
            <span class="rua-pill rua-pill-pend">⏳ ${doms.length - visRua}</span>
            <span class="rua-pill">${pctRua}%
              <span style="display:inline-block;width:36px;height:4px;background:rgba(255,255,255,.25);border-radius:var(--r-full);vertical-align:middle;margin-left:4px;overflow:hidden">
                <span style="display:block;width:${pctRua}%;height:100%;background:${corBarra};border-radius:var(--r-full)"></span>
              </span>
            </span>
          </div>
        </div>
        <!-- Botão + casa -->
        <button class="rua-add-btn"
          onclick="event.stopPropagation();openNovoDomicilioNaRua('${rua.replace(/'/g,"\\'")}');"
          title="Novo domicílio">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" style="flex-shrink:0">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
      <!-- Seta -->
      <svg id="arr_${ruaId}" viewBox="0 0 24 24"
           style="width:18px;height:18px;fill:none;
                  stroke:var(--slate-500);stroke-width:2.5;
                  flex-shrink:0;margin-left:6px;
                  transition:transform .25s;
                  transform:${isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
  `;
}

function renderCorpoRua(ruaId, domsHtml) {
  return `<div class="rua-body ${Render.ruasAbertas.has(ruaId) ? 'open' : ''}" id="${ruaId}">
    <div style="padding:8px 6px 6px;display:flex;flex-wrap:wrap;align-items:flex-start;gap:0">${domsHtml}</div>
  </div>`;
}

function renderResumoFamilias(total, visitados, pendentes, altoRisco, numRuas) {
  const pills = [
    { cor: 'var(--violet-600)', bg: 'var(--violet-bg)', icone: '🏠', texto: `${total} domicílios` },
    { cor: _COLORS.ok, bg: _COLORS.bgEmerald, icone: '✓', texto: `${visitados} visitados` },
    { cor: _COLORS.dm, bg: _COLORS.bgOrange, icone: '⏳', texto: `${pendentes} pendentes` },
    { cor: _COLORS.txtPink, bg: _COLORS.bgPink, icone: '⚠', texto: `${altoRisco} alto risco` },
    { cor: _COLORS.neutro, bg: 'var(--surface-2)', icone: '📍', texto: `${numRuas} ruas` }
  ];
  
  return pills.map(p => 
    `<span class="dom-resumo-pill" style="background:${p.bg};color:${p.cor};border:1px solid ${p.cor}25">${p.icone} ${esc(p.texto)}</span>`
  ).join('');
}

function renderEmptyState() {
  const isFiltered = ($id('search-domicilio')?.value || '').trim() ||
    $id('filter-cond-fam')?.value || $id('filter-ficha-fam')?.value ||
    $id('filter-visita-fam')?.value;

  if (isFiltered) {
    return createEmptyState(
      '🔍',
      'Nenhum domicílio encontrado',
      'Tente ajustar os filtros ou a busca'
    );
  }

  return createEmptyState(
    '🏠',
    'Nenhum domicílio cadastrado',
    'Cadastre o primeiro domicílio da sua microárea para começar a acompanhar as famílias e indivíduos.',
    { label: '+ Cadastrar primeiro domicílio', onclick: openNovoDomicilio }
  );
}

// ============================================
// COMPONENTES DE INDIVÍDUOS
// ============================================

function renderLinhaIndividuo(i) {
  const f        = getFamilia(i.familiaId);
  const riscoInd = getRiscoIndividuo(i);
  const meds     = (i.medicacoes || []).filter(m => m?.nome);
  const idade    = calcIdade(i.nasc);

  const row = cloneTemplate('tpl-individuo-table-row');

  // Nome + nome social
  const nomeEl = row.querySelector('.itr-nome');
  const strong = document.createElement('strong');
  strong.textContent = i.nome;
  nomeEl.appendChild(strong);
  if (i.nomeSocial) {
    const small = document.createElement('small');
    small.className   = 'itr-nome-social';
    small.textContent = 'Social: ' + i.nomeSocial;
    nomeEl.appendChild(document.createElement('br'));
    nomeEl.appendChild(small);
  }

  row.querySelector('.itr-idade').textContent    = idade.texto;
  row.querySelector('.itr-sexo').textContent     = i.sexo === 'F' ? 'Fem' : 'Masc';
  row.querySelector('.itr-familia').textContent  = f ? getFamiliaLabel(f.idFamilia) : '–';
  row.querySelector('.itr-condicoes').innerHTML  = condicoesLabel(i);

  const medsEl = row.querySelector('.itr-meds');
  if (meds.length) {
    const frag = document.createDocumentFragment();
    meds.forEach(function(m) {
      const d = document.createElement('div');
      d.className = 'itr-med-item';
      d.textContent = m.nome + (m.dose ? ' ' + m.dose : '') + (m.freq ? ' ' + m.freq : '');
      frag.appendChild(d);
    });
    medsEl.appendChild(frag);
  } else {
    medsEl.textContent = '–';
  }

  row.querySelector('.itr-risco').innerHTML  = badgeRisco(riscoInd);

  const acoesEl = row.querySelector('.itr-acoes');
  const btnVisita = document.createElement('button');
  btnVisita.className   = 'btn btn-primary btn-sm';
  btnVisita.title       = 'Registrar Visita individual';
  btnVisita.textContent = '👤 Visita Individual';
  btnVisita.addEventListener('click', function(e) { e.stopPropagation(); registrarVisitaIndividuoRapida(i.familiaId, i.idIndividuo); });
  const btnEditar = document.createElement('button');
  btnEditar.className   = 'btn btn-secondary btn-sm';
  btnEditar.textContent = '✎ Editar';
  btnEditar.addEventListener('click', function(e) { e.stopPropagation(); editarIndividuo(i.idIndividuo); });
  acoesEl.appendChild(btnVisita);
  acoesEl.appendChild(btnEditar);

  return row;
}

// ============================================
// COMPONENTES DE PENDÊNCIAS
// ============================================

// ── Cache de contagem de pendências virtuais (FIX#7) ─────────────────────────
// Evita recalcular gerarPendenciasVacina/Odonto a cada updateBadge().
// Invalidado apenas quando indivíduos ou vacinas são modificados.
let _pendVirtualCache = null;
function invalidarCachePendencias() { _pendVirtualCache = null; }
function _getPendVirtualCount() {
  if (_pendVirtualCache !== null) return _pendVirtualCache;
  _pendVirtualCache = gerarPendenciasVacina().length + gerarPendenciasOdonto().length;
  return _pendVirtualCache;
}

// ── Pendências automáticas de vacina (computadas, não persistidas) ────────────
// Retorna objetos no mesmo formato de db.pendencias mas com id negativo (virtual).
// Só considera crianças < 5 anos para manter o sinal acionável e não poluir adultos.
function gerarPendenciasVacina() {
  const MAX_ANOS = 5;
  const pendencias = [];
  let vid = -1; // IDs negativos nunca colidem com pendências reais

  getIndividuos().forEach(ind => {
    const idadeAnos = getIdadeEmAnos(ind.nasc);
    if (idadeAnos === null || idadeAnos >= MAX_ANOS) return; // só crianças < 5 anos

    // Encontrar todas as vacinas atrasadas com nome específico
    const idadeMeses = getIdadeEmMeses(ind.nasc);
    CALENDARIO_VACINAL.forEach(vac => {
      if (_VACINAS_CICLICAS.has(vac.nome)) return;
      if (vac.feminino && ind.sexo !== 'F') return;
      if (idadeMeses > (vac.maxMeses + 12)) return;

      const regVacina = (ind.vacinas || []).find(v => v.nome === vac.nome);
      const dosesTomadas = regVacina
        ? (regVacina.doses || (regVacina.data ? [{ data: regVacina.data }] : []))
        : [];

      (vac.doseMeses || []).forEach((mesesPrevistos, doseIdx) => {
        if (idadeMeses < mesesPrevistos + 1) return; // dose ainda não venceu
        if (dosesTomadas[doseIdx] && dosesTomadas[doseIdx].data) return; // já tomou

        const familia = getFamilia(ind.familiaId);
        const nomeDose = vac.doses > 1 ? `${vac.nome} — dose ${doseIdx + 1}` : vac.nome;
        const mesesAtraso = Math.round(idadeMeses - mesesPrevistos);

        pendencias.push({
          id: vid--,
          titulo: `${nomeDose}`,
          tipo: 'vacina',
          prioridade: mesesAtraso >= 3 ? 'alta' : 'media',
          familiaId: ind.familiaId,
          individuoId: ind.idIndividuo,
          prazo: null,
          obs: `Prevista aos ${mesesPrevistos < 12 ? mesesPrevistos + ' meses' : Math.round(mesesPrevistos/12) + ' anos'} · atraso de ${mesesAtraso} ${mesesAtraso === 1 ? 'mês' : 'meses'}`,
          done: false,
          virtual: true,
          criado: ind.nasc,
        });
      });
    });
  });

  return pendencias;
}

// ─── Pendências virtuais: avaliação odontológica para crianças < 2 anos ──────
function gerarPendenciasOdonto() {
  const pendencias = [];
  let vid = -9000; // range separado dos IDs de vacina

  getIndividuos().forEach(ind => {
    const idadeMeses = getIdadeEmMeses(ind.nasc);
    if (idadeMeses === null || idadeMeses >= 24) return; // só crianças < 2 anos

    // Já tem avaliação registrada? Não gera pendência
    if (ind.odonto && ind.odonto.dataAvaliacao) return;

    const meses = Math.floor(idadeMeses);
    pendencias.push({
      id: vid--,
      titulo: `1ª avaliação odontológica`,
      tipo: 'odonto',
      prioridade: meses >= 12 ? 'alta' : 'media',
      familiaId: ind.familiaId,
      individuoId: ind.idIndividuo,
      prazo: null,
      obs: `Criança com ${meses < 12 ? meses + ' mês(es)' : Math.floor(meses/12) + ' ano(s) e ' + (meses%12) + ' mês(es)'} · ainda não possui avaliação odontológica registrada`,
      done: false,
      virtual: true,
      criado: ind.nasc,
    });
  });

  return pendencias;
}

// ─── Mostrar/ocultar campo odontológico de acordo com a idade ─────────────────
function toggleOdontoField() {
  const nascBR = $id('ind-nasc')?.value;
  const nasc = _brToISO(nascBR) || nascBR;
  const el = $id('ind-exame-odonto');
  if (!el) return;
  const meses = getIdadeEmMeses(nasc);
  el.style.display = (meses !== null && meses < 24) ? 'block' : 'none';
  verificarOdontoStatus();
}

function verificarOdontoStatus() {
  const dataVal = $id('ind-odonto-data')?.value;
  const statusEl = $id('ind-odonto-status');
  const infoEl   = $id('ind-odonto-info');
  if (!statusEl || !infoEl) return;
  if (!dataVal) {
    statusEl.textContent = '⚠️ Pendente';
    statusEl.style.cssText = 'font-size:var(--text-xs);font-weight:600;padding:2px 8px;border-radius:var(--r-lg);background:var(--orange-bg);color:var(--orange-600)';
    infoEl.textContent = 'Avaliação odontológica ainda não registrada.';
  } else {
    const dataISO = _brToISO(dataVal) || dataVal;
    statusEl.textContent = '✓ Realizada';
    statusEl.style.cssText = 'font-size:var(--text-xs);font-weight:600;padding:2px 8px;border-radius:var(--r-lg);background:var(--emerald-bg);color:var(--verde)';
    infoEl.textContent = `Avaliação registrada em ${formatData(dataISO)}.`;
  }
}


// ── Helper: resolve endereço do domicílio a partir de familiaId ────────────
function _pendEnderecoLabel(familiaId) {
  if (!familiaId) return '';
  const f = getFamilia(familiaId);
  if (!f) return '';
  const d = getDomicilio(f.domicilioId);
  if (!d) return '';
  const rua = d.logradouro ? `${d.tipoLogradouro || ''} ${d.logradouro}`.trim() : '';
  const num = d.numero ? `, nº ${d.numero}` : '';
  const bairro = d.bairro ? ` · ${d.bairro}` : '';
  return (rua + num + bairro).trim() || d.idDomicilio || '';
}

// Lookup tables extraídas da função — definidas uma única vez
const _PEND_TIP_ICON = {
  visita: '🏠', cadastro: '📋', vacina: '💉', odonto: '🦷',
  encaminhamento: '🔀', exame: '🧪', retorno: '🔁',
};
const _PEND_TIP_COR = {
  visita: 'var(--violet-500)', cadastro: 'var(--emerald-600)',
  vacina: 'var(--rose-600)',   odonto:   'var(--emerald-500)',
  encaminhamento: 'var(--orange-500)', exame: 'var(--violet-400)',
  retorno: 'var(--slate-500)',
};
const _PEND_PRIO_BG = {
  urgente: 'var(--rose-bg)', alta: 'rgba(255,117,51,.10)',
  media:   'rgba(245,158,11,.10)', baixa: 'var(--emerald-bg)',
};
const _PEND_PRIO_LABEL = {
  urgente: '🔴 Urgente', alta: '🟠 Alta', media: '🟡 Média', baixa: '🟢 Baixa',
};

function renderPendenciaItem(p) {
  const icon   = _PEND_TIP_ICON[p.tipo]  || (p.virtual ? '💉' : '📌');
  const icoCor = _PEND_TIP_COR[p.tipo]   || (p.virtual ? 'var(--rose-600)' : 'var(--slate-500)');
  const end    = _pendEnderecoLabel(p.familiaId);
  const ind    = p.individuoId ? getIndividuo(p.individuoId) : null;

  // ── Pendências virtuais (geradas automaticamente) ─────────────────────
  if (p.virtual) {
    const el = cloneTemplate('tpl-pendencia-virtual');
    el.style.borderLeft = '3px solid ' + icoCor;
    if (p.tipo === 'odonto') {
      el.style.background = 'var(--emerald-bg)';
    }

    const iconWrap = el.querySelector('.pend-icon-wrap');
    iconWrap.textContent = icon;
    iconWrap.style.color = icoCor;
    iconWrap.style.background = p.tipo === 'odonto'
      ? 'var(--emerald-bg)'
      : (_PEND_PRIO_BG[p.prioridade] || 'var(--rose-bg)');

    el.querySelector('.pend-titulo').textContent = p.titulo;

    const indEl = el.querySelector('.pend-individuo');
    if (ind) { indEl.textContent = '👤 ' + ind.nome; indEl.hidden = false; }

    const endEl = el.querySelector('.pend-end');
    if (end) { endEl.textContent = '📍 ' + end; endEl.hidden = false; }

    const pilEl = el.querySelector('.pend-prio-pill');
    if (p.prioridade && p.tipo !== 'odonto') {
      pilEl.textContent = _PEND_PRIO_LABEL[p.prioridade] || p.prioridade;
      pilEl.className   = 'pend-prio-pill ' + (p.prioridade || 'baixa');
      pilEl.hidden      = false;
    }

    return el;
  }

  // ── Pendências manuais ────────────────────────────────────────────────
  const el = cloneTemplate('tpl-pendencia-item');
  el.id        = 'pend-' + p.id;
  el.classList.toggle('pend-done', !!p.done);
  el.style.borderLeft = '3px solid ' + (p.done ? 'var(--slate-300)' : icoCor);

  const iconWrap = el.querySelector('.pend-icon-wrap');
  iconWrap.textContent  = p.done ? '✓' : icon;
  iconWrap.style.color  = p.done ? 'var(--slate-400)' : icoCor;
  iconWrap.style.background = p.done
    ? 'var(--surface-2)'
    : (_PEND_PRIO_BG[p.prioridade] || 'var(--surface-2)');

  el.querySelector('.pend-titulo').textContent = p.titulo;

  const obsEl = el.querySelector('.pend-obs');
  if (p.obs && p.obs !== '–') { obsEl.textContent = p.obs; obsEl.hidden = false; }

  const indEl = el.querySelector('.pend-individuo');
  if (ind) { indEl.textContent = '👤 ' + ind.nome; indEl.hidden = false; }

  const endEl = el.querySelector('.pend-end');
  if (end) { endEl.textContent = '📍 ' + end; endEl.hidden = false; }

  const metaEl = el.querySelector('.pend-meta');
  if (p.prazo) metaEl.textContent = '📅 ' + formatData(p.prazo);

  const pilEl = el.querySelector('.pend-prio-pill');
  pilEl.textContent = _PEND_PRIO_LABEL[p.prioridade] || p.prioridade;
  pilEl.className   = 'pend-prio-pill ' + (p.prioridade || 'baixa');

  const btnToggle = el.querySelector('.pend-btn-toggle');
  btnToggle.textContent = p.done ? '↩' : '✓';
  btnToggle.title       = p.done ? 'Reabrir' : 'Marcar como resolvido';
  btnToggle.classList.toggle('done', !!p.done);
  btnToggle.addEventListener('click', function() { togglePendencia(p.id); });

  el.querySelector('.pend-btn-del').addEventListener('click', function() { excluirPendencia(p.id); });

  return el;
}

// ============================================
// COMPONENTES DE CALENDÁRIO DE METAS
// ============================================

function renderCelulaCalendario(d, metaPadrao, metaAjust, real, isFds, isHoje, isFuturo, isAtivo, m) {
  const isFolga = metaAjust === 0;
  let cls = 'cal-cell';
  
  if (isHoje) cls += ' hoje';
  else if (isFds && metaAjust === 0) cls += ' fds';
  
  if (isAtivo && !isFuturo) {
    if (real >= metaAjust) cls += ' meta-ok';
    else if (real > 0) cls += ' meta-parcial';
    else if (!isHoje) cls += ' meta-zero';
  }
  if (isFolga) cls += ' inativo';
  
  const metaLabel = isFolga ? 'Folga' : isAtivo ? `meta: ${metaAjust}` : 'sem meta';
  const realLabel = real > 0 
    ? `<span class="cal-visitas" style="color:${real >= metaAjust ? 'var(--verde)' : real > 0 ? 'var(--amarelo)' : 'var(--cinza-500)'}">${real} vis.</span>` 
    : '';
  
  return `
    <div class="${cls}" onclick="abrirAjusteDia('${d.data}', ${metaAjust}, ${real})" title="Clique para ajustar meta deste dia" style="cursor:pointer">
      <div class="cal-day-num">${d.dia}</div>
      ${realLabel}
      <div class="cal-meta-ind" style="${isFolga ? 'color:var(--cinza-500);font-style:italic' : ''}">${metaLabel}</div>
      ${isAtivo && !isFolga ? renderBotoesTurno(m.manha || 5, m.tarde || 5, real) : ''}
    </div>
  `;
}

function renderBotoesTurno(metaManha, metaTarde, real) {
  return `
    <div class="cal-turno-btns">
      <span class="cal-turno-btn manha ${real > 0 ? 'ativo' : ''}" title="Manhã: meta ${metaManha}">M:${metaManha}</span>
      <span class="cal-turno-btn tarde ${real >= metaManha ? 'ativo' : ''}" title="Tarde: meta ${metaTarde}">T:${metaTarde}</span>
    </div>
  `;
}

// ============================================
// FUNÇÃO PRINCIPAL renderFamilias COM COMPONENTES
// ============================================

// Renderiza a lista principal de domicílios agrupada por logradouro.
// Pipeline:
//   1. Lê filtros ativos (busca textual, condição clínica, status de visita)
//   2. Filtra domicílios que satisfazem todos os critérios
//   3. Ordena por número e agrupa por rua
//   4. Calcula resumo (visitados/pendentes/alto risco) sobre o conjunto filtrado
//   5. Renderiza cabeçalho de resumo + accordion de ruas com cards de domicílio
//
// indsByFam e visitasByFam vêm do snapshot cacheado — nenhuma varredura extra.

// ◆ BLOCO: RENDER_FAMILIAS_FILTROS
// renderFamilias, gerarRuaIdMap, filtrarFamiliaPorCondicao, toggleRua,
// ✎ Editar para mudar lógica de filtro, agrupamento por rua ou accordi

// ── Ordenação inteligente de números de domicílio ──────────────────────────
// Entende: "10" < "10A" < "10B" < "10C" < "11" < "100"
// Também lida com: "S/N", "", números puros, alfanuméricos
function cmpNumero(a, b) {
  const parse = s => {
    if (!s) return { n: Infinity, l: '' };
    const m = String(s).trim().match(/^(\d+)([A-Za-z]*)$/);
    if (!m) return { n: Infinity, l: String(s).toUpperCase() };
    return { n: parseInt(m[1]), l: m[2].toUpperCase() };
  };
  const pa = parse(a), pb = parse(b);
  if (pa.n !== pb.n) return pa.n - pb.n;
  return pa.l.localeCompare(pb.l);
}
function renderFamilias() {
  const q   = ($id('search-domicilio')?.value || '').toLowerCase();
  const fc  = $id('filter-cond-fam')?.value  || '';
  const ff  = $id('filter-ficha-fam')?.value || '';
  const fv  = $id('filter-visita-fam')?.value || '';
  const ord = $id('filter-ordem-fam')?.value  || 'rua';
  // Salva foco antes do render para restaurar após innerHTML substituir o DOM
  const _focusId  = document.activeElement?.id;
  const _focusSel = document.activeElement?.selectionStart;
  const { indsByFam, visitasByFam } = getSnapshot();

  // Iterar por DOMICÍLIOS (inclui domicílios sem família)
  let domicilios = getDomicilios().filter(d => {
    const familias = (d.familias || []).map(fid => getFamilia(fid)).filter(Boolean);
    const prontuarios = familias.map(f => f.prontuario || '').join(' ');
    if (q && !(d.logradouro || '').toLowerCase().includes(q) &&
              !(d.numero || '').toLowerCase().includes(q) &&
              !(d.bairro || '').toLowerCase().includes(q) &&
              !prontuarios.toLowerCase().includes(q)) return false;
    if (fc && !familias.some(f => filtrarFamiliaPorCondicao(f, fc, indsByFam))) return false;
    if (ff && !familias.some(f => filtrarFamiliaPorCondicao(f, ff, indsByFam))) return false;
    if (fv === 'visitado') {
      const vis = familias.some(f => visitasByFam.has(f.idFamilia));
      if (!vis) return false;
    }
    if (fv === 'sem-visita') {
      const vis = familias.some(f => visitasByFam.has(f.idFamilia));
      if (vis) return false;
    }
    return true;
  });

  // Agrupar por rua (antes de ordenar, para todos os modos)
  const grupos = {};
  domicilios.forEach(d => {
    const rua = (d.logradouro || 'Sem logradouro').trim();
    if (!grupos[rua]) grupos[rua] = [];
    grupos[rua].push(d);
  });

  // Ordenar ruas e domicílios conforme o filtro de ordem
  let ruasOrdenadas;
  if (ord === 'numero-asc') {
    // Ignorar agrupamento por rua — lista plana ordenada por número crescente
    domicilios.sort((a, b) => cmpNumero(a.numero, b.numero));
    ruasOrdenadas = Object.keys(grupos).sort((a, b) => a.localeCompare(b));
    ruasOrdenadas.forEach(rua => grupos[rua].sort((a, b) => cmpNumero(a.numero, b.numero)));
  } else if (ord === 'numero-desc') {
    ruasOrdenadas = Object.keys(grupos).sort((a, b) => a.localeCompare(b));
    ruasOrdenadas.forEach(rua => grupos[rua].sort((a, b) => cmpNumero(b.numero, a.numero)));
  } else if (ord === 'prontuario') {
    ruasOrdenadas = Object.keys(grupos).sort((a, b) => a.localeCompare(b));
    ruasOrdenadas.forEach(rua => grupos[rua].sort((a, b) => {
      const pa = (getFamilia((a.familias||[])[0])?.prontuario || '');
      const pb = (getFamilia((b.familias||[])[0])?.prontuario || '');
      return pa.localeCompare(pb);
    }));
  } else if (ord === 'risco') {
    ruasOrdenadas = Object.keys(grupos).sort((a, b) => a.localeCompare(b));
    const riscoVal = r => r === 'alto' ? 0 : r === 'medio' ? 1 : 2;
    ruasOrdenadas.forEach(rua => grupos[rua].sort((a, b) => {
      const ra = Math.min(...(a.familias||[]).map(fid => riscoVal(getFamilia(fid)?.risco)));
      const rb = Math.min(...(b.familias||[]).map(fid => riscoVal(getFamilia(fid)?.risco)));
      return ra - rb;
    }));
  } else {
    // Padrão: ordenar ruas alfabeticamente, domicílios por número crescente dentro da rua
    ruasOrdenadas = Object.keys(grupos).sort((a, b) => a.localeCompare(b));
    ruasOrdenadas.forEach(rua => grupos[rua].sort((a, b) => cmpNumero(a.numero, b.numero)));
  }

  // Resumo (baseado em famílias)
  const todasFamilias = domicilios.flatMap(d => (d.familias||[]).map(fid=>getFamilia(fid)).filter(Boolean));
  const total = domicilios.length;
  const visitados = domicilios.filter(d =>
    (d.familias||[]).some(fid => {
      const f = getFamilia(fid);
      return f && visitasByFam.has(f.idFamilia);
    })
  ).length;
  const pendentes = total - visitados;
  const altoRisco = todasFamilias.filter(f => f && f.risco === 'alto').length;
  const numRuas = ruasOrdenadas.length;

  const resumoEl = $id('dom-resumo-bar');
  if (resumoEl) _smartUpdate(resumoEl, renderResumoFamilias(total, visitados, pendentes, altoRisco, numRuas));

  const { ruaIdMap, idsValidos } = gerarRuaIdMap(ruasOrdenadas);
  Render.ruasAbertas = new Set([...Render.ruasAbertas].filter(id => idsValidos.has(id)));
  // Não abre ruas automaticamente — o usuário controla clicando no cabeçalho

  const listaEl = $id('lista-ruas');
  if (!listaEl) return;

  if (ruasOrdenadas.length === 0) {
    _smartUpdate(listaEl, renderEmptyState());
    return;
  }

  _smartUpdate(listaEl, ruasOrdenadas.map(rua => {
    const doms = grupos[rua];
    const visRua = doms.filter(d =>
      (d.familias||[]).some(fid => {
        const f = getFamilia(fid);
        return f && visitasByFam.has(f.idFamilia);
      })
    ).length;
    const pctRua = doms.length ? Math.round(visRua / doms.length * 100) : 0;
    const ruaId = ruaIdMap[rua];
    const isOpen = Render.ruasAbertas.has(ruaId);

    const domsHtml = doms.map(d => renderDomicilioCard(d)).join('');

    return `
      <div class="rua-group">
        ${renderCabecalhoRua(rua, doms, visRua, pctRua, ruaId, isOpen)}
        ${renderCorpoRua(ruaId, domsHtml)}
      </div>
    `;
  }).join(''));

  // Restaura foco no campo de busca se ele estava activo antes do render
  if (_focusId) {
    const el = $id(_focusId);
    if (el) {
      el.focus();
      if (_focusSel != null && el.setSelectionRange) {
        try { el.setSelectionRange(_focusSel, _focusSel); } catch(e) {}
      }
    }
  }
}

// Gera um hash numérico simples e estável a partir do nome da rua
function _hashRua(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36); // positivo, base36
}

function gerarRuaIdMap(ruasOrdenadas) {
  const ruaIdMap  = {};
  const idsValidos = new Set();
  const vistos = {};
  ruasOrdenadas.forEach((rua, i) => {
    let base = 'rua_' + _hashRua(rua);
    // Desambigua colisões de hash (muito raras) adicionando sufixo
    let ruaId = base;
    let suf = 0;
    while (vistos[ruaId] && vistos[ruaId] !== rua) { suf++; ruaId = base + '_' + suf; }
    vistos[ruaId] = rua;
    ruaIdMap[rua] = ruaId;
    idsValidos.add(ruaId);
  });
  return { ruaIdMap, idsValidos };
}

// buildIndsByFam() removida — lógica internalizada em DB.getSnapshot()

// Retorna true se a família `f` satisfaz o filtro de condição `fc`.
// `indsByFam` é o índice do snapshot (Map<familiaId → individuo[]>); quando
// ausente, faz fallback para varredura linear (menos eficiente, mas seguro).
// Cada condição usa .some() com curto-circuito — para no primeiro positivo.
function filtrarFamiliaPorCondicao(f, fc, indsByFam) {
  const fid  = f.idFamilia; // Number — matches indsByFam key type
  const inds = indsByFam ? (indsByFam[fid] || []) : getIndividuos().filter(i => i.familiaId === f.idFamilia);

  if (fc === 'has'           && !inds.some(i => i.has === 'sim'))                        return false;
  if (fc === 'dm'            && !inds.some(i => i.dm  === 'sim'))                        return false;
  if (fc === 'vacinas-atrasadas' && !inds.some(i => temVacinaAtrasada(i)))               return false;
  if (fc === 'gestante'      && !inds.some(i => i.gestante === 'sim'))                   return false;
  if (fc === 'papa-ok'       && !inds.some(i => papanicolauAtrasado(i) === 'ok'))        return false;
  if (fc === 'papa-atrasado' && !inds.some(i => papanicolauAtrasado(i) === 'atrasado'))  return false;
  if (fc === 'mamo-ok'       && !inds.some(i => mamografiaAtrasada(i) === 'ok'))         return false;
  if (fc === 'mamo-atrasada' && !inds.some(i => mamografiaAtrasada(i) === 'atrasada'))   return false;

  return true;
}
function toggleRua(ruaId) {
  if (!ruaId || typeof ruaId !== 'string') return;
  const el  = $id(ruaId);
  const arr = $id('arr_'+ruaId);
  if (!el) return;
  if (Render.ruasAbertas.has(ruaId)) {
    Render.ruasAbertas.delete(ruaId);
    el.classList.remove('open');
    if (arr) arr.style.transform = 'rotate(0deg)';
  } else {
    Render.ruasAbertas.add(ruaId);
    el.classList.add('open');
    if (arr) arr.style.transform = 'rotate(180deg)';
  }
}

function filtrarPorNumero(ruaId, valor) {
  const body = $id(ruaId);
  if (!body) return;
  const pills = body.querySelectorAll('.dom-num-pill');
  pills.forEach(pill => {
    const numEl = pill.querySelector('.dom-num');
    if (!numEl) return;
    const num = numEl.textContent.replace(/\D/g,'');
    const row = pill.closest('.domicilio-row');
    if (row) row.style.display = (!valor || num.includes(valor.trim())) ? '' : 'none';
  });
}

function salvarNota(famId, nota) {
  const f = getFamilia(famId);
  if (f) { f.nota = nota; save(); DB.invalidate(); }
}

// ◆ BLOCO: RENDER_LISTAS_SECUNDARIAS
// renderIndividuos, renderPendencias, renderAgenda, renderVisitas, ren
// ✎ Editar para mudar tabelas de indivíduos, visitas, pendências ou ri
function renderIndividuos() {
  const q      = ($id('search-individuo')?.value || '').toLowerCase();
  const fc     = $id('filter-cond')?.value   || '';
  const ff     = $id('filter-faixa')?.value  || '';
  const fp     = $id('filter-prevencao')?.value || '';
  const ordem  = $id('filter-ind-ordem')?.value || 'az';
  // Salva foco antes do render
  const _focusId  = document.activeElement?.id;
  const _focusSel = document.activeElement?.selectionStart;

  // Helper: verifica se exame está atrasado em relação a intervalAnos
  function _exameAtrasado(dataISO, intervaloAnos) {
    if (!dataISO) return true;  // sem registro = atrasado
    const venc = new Date(dataISO + 'T00:00:00');
    venc.setFullYear(venc.getFullYear() + intervaloAnos);
    return new Date() >= venc;
  }

  let inds = getIndividuos().filter(i => {
    // Busca textual
    if (q && !i.nome?.toLowerCase().includes(q) &&
        !(i.cpf || '').includes(q) &&
        !(i.cns || '').includes(q)) return false;

    const cl = classificarIndividuo(i);

    // Filtro faixa etária
    if (ff && cl.categoria !== ff) return false;

    // Filtro por condição
    if (fc === 'has'              && i.has !== 'sim')                         return false;
    if (fc === 'dm'               && i.dm !== 'sim')                          return false;
    if (fc === 'vacinas-atrasadas'&& !temVacinaAtrasada(i))                   return false;
    if (fc === 'gestante'         && i.gestante !== 'sim')                    return false;
    if (fc === 'saude-mental'     && i.mental !== 'sim')                      return false;
    if (fc === 'acamado'          && i.acamado !== 'sim')                     return false;
    if (fc === 'cancer'           && i.cancer !== 'sim')                      return false;
    if (fc === 'deficiencia'      && (!i.deficiencia || i.deficiencia === 'nao')) return false;

    // Filtro prevenção (só para mulheres 25–64)
    if (fp) {
      if (i.sexo !== 'F') return false;
      const idadeA = getIdadeEmAnos(i.nasc);
      const elegPap  = idadeA !== null && idadeA >= 25 && idadeA <= 64;
      const elegMamo = idadeA !== null && idadeA >= 40 && idadeA <= 69;
      if (fp === 'papa-atrasado' && !(elegPap  && _exameAtrasado(i.papanicolau, 1)))  return false;
      if (fp === 'papa-ok'       && !(elegPap  && !_exameAtrasado(i.papanicolau, 1))) return false;
      if (fp === 'mamo-atrasada' && !(elegMamo && _exameAtrasado(i.mamografia,  2)))  return false;
      if (fp === 'mamo-ok'       && !(elegMamo && !_exameAtrasado(i.mamografia, 2)))  return false;
    }

    return true;
  });

  // Ordenação
  inds.sort((a, b) => {
    if (ordem === 'az')        return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
    if (ordem === 'za')        return (b.nome || '').localeCompare(a.nome || '', 'pt-BR');
    if (ordem === 'mais-novo') return (b.nasc || '').localeCompare(a.nasc || '');
    if (ordem === 'mais-velho')return (a.nasc || '').localeCompare(b.nasc || '');
    return 0;
  });

  const container = $id('tabela-individuos');
  if (!container) return;
  if (!inds.length) {
    _smartUpdate(container, '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--cinza-500);font-size:var(--text-sm)">Nenhum indivíduo encontrado</div>');
    return;
  }
  _smartUpdate(container, inds.map(i => {
    const f = getFamilia(i.familiaId);
    const d = f ? getDomicilio(f.domicilioId) : null;
    const riscoInd = getRiscoIndividuo(i);
    const cl = classificarIndividuo(i);
    const avatar = getAvatarMembro(i, cl);
    const idade = calcIdade(i.nasc);
    const riscoColor = riscoInd==='alto' ? _COLORS.txtPink : riscoInd==='medio' ? _COLORS.dm : _COLORS.ok;
    const riscoBg    = riscoInd==='alto' ? _COLORS.bgPink : riscoInd==='medio' ? _COLORS.bgOrange : _COLORS.bgEmerald;

    // Endereço
    const endereco = d
      ? [d.logradouro, d.numero ? 'nº '+d.numero : '', d.bairro].filter(Boolean).join(', ')
      : '–';

    // Condições
    const conds = [];
    if (i.has==='sim')      conds.push('<span class="badge badge-orange">HAS</span>');
    if (i.dm==='sim')       conds.push('<span class="badge badge-yellow">DM</span>');
    if (i.gestante==='sim') conds.push('<span class="badge badge-blue">Gest.</span>');
    if (i.acamado==='sim')  conds.push('<span class="badge badge-red">Acamado</span>');
    if (i.mental==='sim')   conds.push('<span class="badge badge-purple">S. Mental</span>');
    if (i.cancer==='sim')   conds.push('<span class="badge badge-gray">Câncer</span>');
    if (temVacinaAtrasada(i)) conds.push('<span class="badge badge-red">💉 Vacina atrasada</span>');

    return `
    <div style="background:var(--surface);border:1px solid var(--bdr);
                border-radius:var(--r-md);padding:12px 16px;
                display:flex;align-items:center;gap:12px;
                box-shadow:0 1px 4px rgba(0,0,0,.05);
                transition:box-shadow .15s,transform .15s,border-color .15s"
      onmouseenter="this.style.boxShadow='0 4px 16px rgba(0,0,0,.09)';this.style.transform='translateY(-1px)';this.style.borderColor='rgba(255,117,51,.22)'"
      onmouseleave="this.style.boxShadow='0 1px 4px rgba(0,0,0,.05)';this.style.transform='';this.style.borderColor=''">
      <!-- Avatar -->
      <div style="font-size:var(--text-xl);line-height:1;flex-shrink:0;width:40px;text-align:center">${avatar}</div>
      <!-- Bloco principal -->
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
          <span style="font-size:var(--text-sm);font-weight:800;color:var(--slate-900)">${esc(i.nome)}</span>
          <span style="font-size:var(--text-xs);color:var(--slate-500);white-space:nowrap">${idade.texto} · ${i.sexo==='F'?'Feminino':'Masculino'}</span>
          <span style="font-size:var(--text-xs);color:var(--slate-400);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px" title="${esc(endereco)}">📍 ${esc(endereco)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
          <span style="font-size:var(--text-2xs);font-weight:600;padding:2px 8px;border-radius:var(--r-full);
                       background:var(--bg);color:var(--slate-500);
                       border:1px solid var(--bdr);white-space:nowrap">${cl.faixaEtaria}</span>
          ${conds.join('')}
          <span style="font-size:var(--text-2xs);font-weight:700;padding:2px 8px;border-radius:var(--r-full);
                       background:${riscoBg};color:${riscoColor};
                       white-space:nowrap;border:1px solid ${riscoColor}22">${riscoInd||'–'}</span>
        </div>
      </div>
      <!-- Botões -->
      <div style="display:flex;gap:6px;flex-shrink:0;align-items:center">
        <button class="btn btn-primary btn-sm" style="min-height:38px" onclick="registrarVisitaIndividuoRapida(${i.familiaId},${i.idIndividuo})">👤 Visita Individual</button>
        <button class="btn btn-secondary btn-sm" style="min-height:38px" onclick="editarIndividuo(${i.idIndividuo})">✎ Editar</button>
      </div>
    </div>`;
  }).join(''));

  // Restaura foco no campo de busca se estava activo antes do render
  if (_focusId) {
    const el = $id(_focusId);
    if (el) {
      el.focus();
      if (_focusSel != null && el.setSelectionRange) {
        try { el.setSelectionRange(_focusSel, _focusSel); } catch(e) {}
      }
    }
  }
}
function renderPendencias() {
  const ft = $id('filter-pend-tipo')?.value || '';
  const fp = $id('filter-pend-prio')?.value || '';

  // Mescla pendências reais + virtuais de vacina + virtuais de odonto
  const virtuais = (ft === '' || ft === 'vacina') ? gerarPendenciasVacina() : [];
  const virtuaisOdonto = (ft === '' || ft === 'odonto') ? gerarPendenciasOdonto() : [];
  let pends = [...db.pendencias, ...virtuais, ...virtuaisOdonto].filter(p => {
    if (ft && p.tipo !== ft) return false;
    if (fp && p.prioridade !== fp) return false;
    return true;
  });
  const listEl = $id('lista-pendencias');
  if (!listEl) return;
  if (!pends.length) {
    listEl.replaceChildren(createEmptyState('✓', 'Nenhuma pendência encontrada.'));
  } else {
    const frag = document.createDocumentFragment();
    pends.forEach(function(p) { frag.appendChild(renderPendenciaItem(p)); });
    listEl.replaceChildren(frag);
  }
}

function togglePendencia(id) {
  const p = db.pendencias.find(x => x.id === id);
  if (p) {
    p.done = !p.done;
    save();
    DB.invalidate();
    if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
    updateBadge();
    toast(p.done ? 'Pendência resolvida ✓' : 'Reaberta', 'success');
  }
}
function excluirPendencia(id) {
  customConfirm('Excluir esta pendência?', function() {
    db.pendencias = db.pendencias.filter(p => p.id !== id);
    save();
    DB.invalidate();
    if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
    updateBadge();
  });
}
function updateBadge() {
  const reais = db.pendencias.filter(p => !p.done).length;
  const n = reais + _getPendVirtualCount(); // cache invalidado por invalidarCachePendencias()
  $id('badge-pend').textContent = n;
  atualizarBadgesFichas();
}

function atualizarBadgesFichas() {
  try {
    const fa   = db && db.fichas && db.fichas.atual;
    const mes  = new Date().toISOString().slice(0, 7);
    const corte60 = new Date(); corte60.setDate(corte60.getDate() - 60);
    const c60  = corte60.toISOString().slice(0, 10);
    const inds = (typeof getIndividuos === 'function') ? getIndividuos() : [];

    function pendMes(key, fn) {
      return inds.filter(function(i) {
        if (fn && !fn(i)) return false;
        const f = fa && fa[key] && fa[key][Number(i.idIndividuo)];
        return !(f && f._dataSalva && f._dataSalva.startsWith(mes));
      }).length;
    }
    function pendAlim() {
      return inds.filter(function(i) {
        const idade = getIdadeEmAnos(i.nasc);
        if (idade === null || idade >= 2) return false; // só < 2 anos
        const f = fa && fa['consumoAlimentar'] && fa['consumoAlimentar'][Number(i.idIndividuo)];
        return !(f && f._dataSalva && f._dataSalva >= c60);
      }).length;
    }

    // Domiciliados: acamados/domiciliados sem ficha atualizada no último mês
    function pendAcamado() {
      return inds.filter(function(i) {
        if (i.acamado !== 'sim') return false;
        const f = fa && fa['acamado'] && fa['acamado'][Number(i.idIndividuo)];
        return !(f && f._dataSalva && f._dataSalva.startsWith(mes));
      }).length;
    }
    // Prevenção: mulheres elegíveis (25–64 papa ou 40–69 mamo) sem ficha no último mês
    function pendPrevencao() {
      return inds.filter(function(i) {
        if (i.sexo !== 'F') return false;
        const idade = getIdadeEmAnos(i.nasc);
        if (idade === null) return false;
        const elegPap  = idade >= 25 && idade <= 64;
        const elegMamo = idade >= 40 && idade <= 69;
        if (!elegPap && !elegMamo) return false;
        const f = fa && fa['prevencao'] && fa['prevencao'][Number(i.idIndividuo)];
        return !(f && f._dataSalva && f._dataSalva.startsWith(mes));
      }).length;
    }

    const counts = {
      'badge-has':      pendMes('has',      function(i){ return i.has      === 'sim'; }),
      'badge-dm':       pendMes('dm',       function(i){ return i.dm       === 'sim'; }),
      'badge-gest':     pendMes('gestante', function(i){ return i.gestante === 'sim'; }),
      'badge-alim':     pendAlim(),
      'badge-acamado':  pendAcamado(),
      'badge-prevencao': pendPrevencao()
    };
    Object.keys(counts).forEach(function(id) {
      const el = $id(id);
      if (!el) return;
      const n = counts[id];
      el.textContent = n;
      el.style.display = n > 0 ? '' : 'none';
    });
  } catch(e) { /* silencioso */ }
}
function renderAgenda() {
  populateFamiliaSelects();
  $id('agenda-data').value = _isoToBR(hoje());

  const agDs    = [...new Set(db.agenda.map(a => a.data))].sort().reverse();
  const listaEl = $id('lista-agenda');
  if (!listaEl) return;

  if (!agDs.length) {
    listaEl.replaceChildren(createEmptyState('📅', 'Nenhuma visita agendada.'));
    return;
  }

  const frag = document.createDocumentFragment();
  agDs.forEach(function(d) {
    const its   = db.agenda.filter(a => a.data === d);
    const grupo = cloneTemplate('tpl-agenda-dia');

    grupo.querySelector('.ad-data').textContent  = formatData(d);
    grupo.querySelector('.ad-count').textContent = its.length + ' visita(s)';

    const visitasContainer = grupo.querySelector('.ad-visitas');
    its.forEach(function(v) {
      const f    = getFamilia(v.familiaId);
      const item = cloneTemplate('tpl-agenda-visita');
      item.querySelector('.av-familia').textContent = f ? getFamiliaLabel(f.idFamilia) : '–';
      item.querySelector('.av-tipo').textContent    = '— ' + v.tipo;
      item.querySelector('.av-obs').textContent     = v.obs || '';

      const btnRemover = item.querySelector('.av-remover');
      btnRemover.hidden = false;
      btnRemover.addEventListener('click', function() { removerAgenda(v.id); });

      visitasContainer.appendChild(item);
    });

    frag.appendChild(grupo);
  });

  listaEl.innerHTML = '';
  listaEl.appendChild(frag);
}

function agendarVisita() {
  const dataBR = $id('agenda-data').value;
  const data = _brToISO(dataBR);
  const famId = parseInt($id('agenda-familia').value);
  const tipo = $id('agenda-tipo').value;
  const obs = '';
  if (!data || !famId) { toast(!data ? 'Data inválida (use dd/mm/aaaa)' : 'Preencha data e família', 'error'); return; }
  db.agenda.push({ id: nextId('agenda'), data, familiaId: famId, tipo, obs });
  save();
  DB.invalidate();
  renderAgenda();
  toast('Visita agendada!', 'success');
}
function removerAgenda(id) {
  db.agenda = db.agenda.filter(a => a.id !== id);
  save();
  DB.invalidate();
  renderAgenda();
}
function renderVisitas() {
  const q  = ($id('search-visita')?.value || '').toLowerCase();
  const ft = $id('filter-visita-tipo')?.value || '';
  const vis = db.visitas.filter(v => {
    const f = getFamilia(v.familiaId);
    if (q  && !(f?.responsavel||'').toLowerCase().includes(q) && !(v.data||'').includes(q)) return false;
    if (ft && !v.tipo.toLowerCase().includes(ft)) return false;
    return true;
  }).sort((a, b) => (b.data||'') > (a.data||'') ? 1 : -1);

  const tbody = $id('tabela-visitas');
  if (!tbody) return;

  if (!vis.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="td-empty-row">Nenhuma visita registrada</td></tr>';
    return;
  }

  const frag = document.createDocumentFragment();
  vis.forEach(function(v) {
    const f        = getFamilia(v.familiaId);
    const domId    = f ? f.domicilioId : null;
    const endereco = domId ? getDomicilioLabel(domId) : getFamiliaLabel(v.familiaId);

    const row = cloneTemplate('tpl-visita-table-row');
    row.querySelector('.vtr-data').textContent                   = formatData(v.data);
    const vtrEndereco = row.querySelector('.vtr-endereco');
    if (vtrEndereco) { vtrEndereco.textContent = endereco; vtrEndereco.title = endereco; }
    row.querySelector('.vtr-tipo .badge').textContent            = v.tipo;
    row.querySelector('.vtr-btn-editar').addEventListener('click', function() { editarVisita(v.id); });
    row.querySelector('.vtr-btn-excluir').addEventListener('click', function() { excluirVisita(v.id); });
    frag.appendChild(row);
  });

  tbody.innerHTML = '';
  tbody.appendChild(frag);
}

function editarVisita(id) {
  const v = (db.visitas || []).find(x => x.id === id);
  if (!v) return;
  const over = document.createElement('div');
  over.id = 'modal-editar-visita';
  over.className = 'modal-overlay';
  over.style.display = 'flex';

  const famOpts = Object.values(db.familiaById||{})
    .filter(Boolean)
    .sort((a,b)=>(a.responsavel||'').localeCompare(b.responsavel||''))
    .map(f => `<option value="${f.idFamilia}" ${f.idFamilia==v.familiaId?'selected':''}>${getFamiliaLabel(f.idFamilia)}</option>`)
    .join('');

  const tiposVisita = [
    'Visita de rotina', 'Acompanhamento de crônico', 'Gestante', 'Criança',
    'Idoso', 'Saúde Mental', 'Alto risco', 'Cadastramento', 'Busca ativa',
    'Emergencial', 'Orientação', 'Entrega de medicação', 'Visita domiciliar',
  ];
  const tipoOpts = tiposVisita.map(t => `<option ${t===v.tipo?'selected':''}>${t}</option>`).join('');

  const desfechoOpts = ['Visita realizada','Ausente','Recusou atendimento','Mudou-se','Óbito']
    .map(d => `<option ${d===v.desfecho?'selected':''}>${d}</option>`).join('');

  over.innerHTML = `
    <div class="modal" style="max-width:560px">
      <div class="modal-header">
        <h2>✏️ Editar Visita</h2>
        <button class="close-btn" onclick="$id('modal-editar-visita').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-grid">
          <div class="form-group">
            <label>Data da Visita *</label>
            <input class="input date-input" type="text" id="ev-data" maxlength="10" placeholder="dd/mm/aaaa" value="${v.data ? _isoToBR(v.data) : ''}" oninput="mascararData(this)">
          </div>
          <div class="form-group">
            <label>Turno</label>
            <select class="input" id="ev-turno">
              <option value="manha" ${v.turno==='manha'?'selected':''}>Manhã</option>
              <option value="tarde" ${v.turno==='tarde'?'selected':''}>Tarde</option>
              <option value="noite" ${v.turno==='noite'?'selected':''}>Noite</option>
            </select>
          </div>
          <div class="form-group span2">
            <label>Família / Domicílio</label>
            <select class="input" id="ev-familia">${famOpts}</select>
          </div>
          <div class="form-group">
            <label>Tipo de Visita</label>
            <select class="input" id="ev-tipo">${tipoOpts}</select>
          </div>
          <div class="form-group">
            <label>Desfecho</label>
            <select class="input" id="ev-desfecho">${desfechoOpts}</select>
          </div>
          <div class="form-group">
            <label>Vacinação em dia?</label>
            <select class="input" id="ev-vacina">
              <option value="nao-avaliado" ${v.vacina==='nao-avaliado'?'selected':''}>Não avaliado</option>
              <option value="sim" ${v.vacina==='sim'?'selected':''}>Sim</option>
              <option value="nao" ${v.vacina==='nao'?'selected':''}>Não</option>
              <option value="pendente" ${v.vacina==='pendente'?'selected':''}>Pendente</option>
            </select>
          </div>
          <div class="form-group">
            <label>Encaminhamento?</label>
            <select class="input" id="ev-encam">
              <option value="nao" ${v.encam==='nao'?'selected':''}>Não</option>
              <option value="sim" ${v.encam==='sim'?'selected':''}>Sim</option>
            </select>
          </div>

        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="$id('modal-editar-visita').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="salvarEdicaoVisita(${id})">💾 Salvar</button>
      </div>
    </div>`;
  _getOverlayRoot().appendChild(over);
}

function salvarEdicaoVisita(id) {
  const v = (db.visitas || []).find(x => x.id === id);
  if (!v) return;
  const g = id2 => $id(id2)?.value || '';
  const novaData = _brToISO(g('ev-data'));
  if (!novaData) { toast('Data inválida (use dd/mm/aaaa).', 'warn'); return; }
  v.data      = novaData;
  v.turno     = g('ev-turno');
  v.familiaId = parseInt(g('ev-familia')) || v.familiaId;
  v.tipo      = g('ev-tipo');
  v.desfecho  = g('ev-desfecho');
  v.vacina    = g('ev-vacina');
  v.encam     = g('ev-encam');
  v.obs       = '';
  // Atualizar ultimaVisita da família
  const fam = getFamilia(v.familiaId);
  if (fam) {
    const vissFam = db.visitas.filter(x => x.familiaId === v.familiaId).map(x => x.data).filter(Boolean);
    fam.ultimaVisita = vissFam.length ? vissFam.sort().reverse()[0] : '';
  }
  save();
  DB.invalidate();
  $id('modal-editar-visita')?.remove();
  if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
  toast('✓ Visita atualizada!', 'success');
}

function excluirVisita(id) {
  customConfirm('Excluir esta visita?', function() {
    db.visitas = (db.visitas || []).filter(v => v.id !== id);
    save();
    DB.invalidate();
    if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
    updateBadge();
    toast('Visita excluída.', 'success');
  });
}
// Cada aba (HAS, DM, Gestantes, Crianças <5, Idosos ≥60, Saúde Mental) exibe
// uma tabela filtrada de indivíduos. A classificação é feita em varredura única
// (O(n)) em vez de 6 chamadas separadas a getIndividuos() (O(6n)).
// ◆ BLOCO: RENDER_VACINAS
// Página Vacinas Infantis — lista crianças < 5 anos com calendário vacinal
function _populaFiltroVacinas() {
  const sel = $id('vac-filter-vacina');
  if (!sel || sel.options.length > 1) return; // já populado
  CALENDARIO_VACINAL
    .filter(v => !_VACINAS_CICLICAS.has(v.nome) && v.minMeses < 60)
    .forEach(v => {
      const o = document.createElement('option');
      o.value = v.nome;
      o.textContent = typeof vacAbrev==='function' ? vacAbrev(v.nome) : v.nome;
      sel.appendChild(o);
    });
}

function renderVacinas() {
  _populaFiltroVacinas();

  const q       = ($id('vac-search')?.value || '').toLowerCase();
  const fIdade  = $id('vac-filter-idade')?.value || '';
  const fSit    = $id('vac-filter-sit')?.value   || '';
  const fVacina = $id('vac-filter-vacina')?.value || '';

  const agora = new Date();

  // Todas as crianças < 5 anos
  let criancas = getIndividuos().filter(i => {
    if (!i.nasc) return fSit === 'semnasc' || fSit === '';
    const meses = getIdadeEmMeses(i.nasc);
    return meses !== null && meses < 60;
  });

  // Filtro texto
  if (q) criancas = criancas.filter(i => (i.nome||'').toLowerCase().includes(q));

  // Filtro idade
  if (fIdade) {
    const [minM, maxM] = fIdade.split('-').map(Number);
    criancas = criancas.filter(i => {
      const meses = getIdadeEmMeses(i.nasc);
      return meses !== null && meses >= minM && meses < maxM;
    });
  }

  // Filtro situação
  if (fSit === 'semnasc') {
    criancas = criancas.filter(i => !i.nasc);
  } else if (fSit === 'atrasada') {
    criancas = criancas.filter(i => temVacinaAtrasada(i));
  } else if (fSit === 'ok') {
    criancas = criancas.filter(i => i.nasc && !temVacinaAtrasada(i));
  }

  // Filtro por vacina específica
  if (fVacina) {
    criancas = criancas.filter(i => {
      const idadeMeses = getIdadeEmMeses(i.nasc);
      if (idadeMeses === null) return false;
      const vac = CALENDARIO_VACINAL.find(v => v.nome === fVacina);
      if (!vac) return false;
      if (idadeMeses > vac.maxMeses + 12) return false;
      const reg = (i.vacinas||[]).find(v => v.nome === fVacina);
      const doses = reg ? (reg.doses || (reg.data ? [{data:reg.data}] : [])) : [];
      return (vac.doseMeses||[]).some((mp, idx) => idadeMeses >= mp + 1 && !(doses[idx]?.data));
    });
  }

  // Ordenar: atrasadas primeiro, depois por idade crescente
  criancas.sort((a, b) => {
    const aAtras = temVacinaAtrasada(a) ? 0 : 1;
    const bAtras = temVacinaAtrasada(b) ? 0 : 1;
    if (aAtras !== bAtras) return aAtras - bAtras;
    return (a.nasc||'').localeCompare(b.nasc||'');
  });

  // ── Resumo ──────────────────────────────────────────────────────────────
  const total     = criancas.length;
  const atrasadas = criancas.filter(i => temVacinaAtrasada(i)).length;
  const emDia     = criancas.filter(i => i.nasc && !temVacinaAtrasada(i)).length;
  const semNasc   = criancas.filter(i => !i.nasc).length;

  // Atualiza badge sidebar
  const bv = $id('badge-vac');
  if (bv) { bv.textContent = atrasadas; bv.style.display = atrasadas ? '' : 'none'; }

  const resumoEl = $id('vac-resumo-bar');
  if (resumoEl) {
    resumoEl.innerHTML = [
      { label:`${total} criança${total!==1?'s':''}`, bg:'var(--surface-2)', color:'var(--slate-500)', border:'var(--bdr)' },
      { label:`🔴 ${atrasadas} com atraso`, bg:_COLORS.bgRose,  color:_COLORS.txtRose,  border:'var(--rose-bdr)' },
      { label:`✅ ${emDia} em dia`,          bg:_COLORS.bgGreen, color:_COLORS.txtGreen, border:'var(--emerald-bdr)' },
      semNasc ? { label:`⚠️ ${semNasc} sem nasc.`, bg:'var(--amarelo-bg,rgba(255,117,51,.10))', color:'var(--orange-700)', border:'var(--amarelo-bdr,rgba(255,117,51,.22))' } : null,
    ].filter(Boolean).map(c =>
      `<div class="vac-resumo-chip" style="background:${c.bg};color:${c.color};border-color:${c.border}">${c.label}</div>`
    ).join('');
  }

  // ── Lista ────────────────────────────────────────────────────────────────
  const listaEl = $id('vac-lista');
  if (!listaEl) return;

  if (!criancas.length) {
    listaEl.replaceChildren(createEmptyState('👶', 'Nenhuma criança encontrada com os filtros aplicados.'));
    return;
  }

  listaEl.innerHTML = criancas.map(ind => _renderVacCard(ind, agora, fVacina)).join('');
}

function _renderVacCard(ind, agora, fVacina) {
  if (typeof window._acsVacInjetarCSS === 'function') window._acsVacInjetarCSS();
  if (typeof window.acsVacInfo === 'undefined' && typeof criarModal === 'function') criarModal();
  const nascDate = ind.nasc ? new Date((_nascToISO(ind.nasc) || ind.nasc) + 'T00:00:00') : null;
  const idadeMesesRaw = nascDate && !isNaN(nascDate) ? getIdadeEmMeses(ind.nasc) : null;
  const idadeMeses = idadeMesesRaw;
  const atrasada = temVacinaAtrasada(ind);
  const sit = !ind.nasc ? 'semnasc' : atrasada ? 'atrasada' : 'ok';

  const idadeTexto = idadeMeses === null ? 'Sem data de nascimento'
    : idadeMeses < 1   ? 'Recém-nascido'
    : idadeMeses < 12  ? `${Math.round(idadeMeses)} meses`
    : idadeMeses < 24  ? `${Math.floor(idadeMeses/12)} ano e ${Math.round(idadeMeses%12)} meses`
    : `${Math.floor(idadeMeses/12)} anos`;

  const sitIcon  = { atrasada:'🔴', ok:'✅', semnasc:'⚪' }[sit];
  const sitLabel = { atrasada:'Vacinas atrasadas', ok:'Em dia', semnasc:'Sem data de nasc.' }[sit];
  const sitColor = { atrasada:_COLORS.txtRose, ok:_COLORS.txtGreen, semnasc:_COLORS.neutro }[sit];
  const sitBg    = { atrasada:'rgba(239,68,68,.08)', ok:'rgba(16,185,129,.08)', semnasc:'var(--surface-2)' }[sit];

  const familia = getFamilia(ind.familiaId);
  const domicilio = familia ? getDomicilio(familia.domicilioId) : null;
  const endereco = domicilio ? [domicilio.logradouro, domicilio.numero ? 'nº '+domicilio.numero : ''].filter(Boolean).join(', ') : '–';

  // Montar doses
  const vacinasAplicaveis = CALENDARIO_VACINAL.filter(vac => {
    if (_VACINAS_CICLICAS.has(vac.nome)) return false;
    if (vac.feminino && ind.sexo !== 'F') return false;
    // Página de vacinas é só para < 5 anos: exclui vacinas exclusivas de adultos
    if (vac.minMeses >= 60) return false;
    if (idadeMeses === null) return true;
    return idadeMeses <= (vac.maxMeses + 12);
  }).filter(vac => !fVacina || vac.nome === fVacina);

  const dosesHtml = vacinasAplicaveis.map(vac => {
    const reg = (ind.vacinas||[]).find(v => v.nome === vac.nome);
    const dosesTomadas = reg ? (reg.doses || (reg.data ? [{data:reg.data}] : [])) : [];

    return (vac.doseMeses||[]).map((mp, idx) => {
      let cls, icon, detalhe;
      if (idadeMeses === null) {
        cls = 'dose-futura'; icon = '⏳';
        detalhe = `Prevista aos ${mp < 12 ? mp+' meses' : Math.round(mp/12)+' anos'}`;
      } else if (dosesTomadas[idx]?.data) {
        cls = 'dose-ok'; icon = '✅';
        detalhe = `Aplicada em ${formatData(dosesTomadas[idx].data)}`;
      } else if (idadeMeses < mp) {
        cls = 'dose-futura'; icon = '⏳';
        const dataMin = new Date(nascDate);
        dataMin.setMonth(dataMin.getMonth() + mp);
        // Ajuste de overflow de mês (ex: 31 jan + 1m → 28 fev)
        if (dataMin.getDate() !== nascDate.getDate()) dataMin.setDate(0);
        detalhe = `Prevista: ${formatData(dataMin.toISOString().split('T')[0])}`;
      } else {
        cls = 'dose-atrasada'; icon = '🔴';
        const mesesAtraso = Math.round(idadeMeses - mp);
        detalhe = `Prevista aos ${mp < 12 ? mp+' meses' : Math.round(mp/12)+' anos'} · atraso de ${mesesAtraso} ${mesesAtraso===1?'mês':'meses'}`;
      }
      const nomeDose = vac.doses > 1 ? `${vacAbrev(vac.nome)} — D${idx+1}` : vacAbrev(vac.nome);
      const vi = getVacInfo(vac.nome);
      const _vacInfoBtn = typeof window.acsVacInfo === 'function' && VAC_INFO[vac.nome]
        ? `<button class="vac-ibtn" onclick="event.stopPropagation();window.acsVacInfo('${vac.nome.replace(/'/g,"\\'")}')" title="Informações sobre ${esc(vac.nome)}" aria-label="Info">ⓘ</button>`
        : '';
      return `<div class="vac-dose-row ${cls}">
        <span class="vac-dose-icon" title="${esc(vac.nome)}">${vi.icon}</span>
        <div class="vac-dose-info">
          <div class="vac-dose-nome">${esc(nomeDose)}${_vacInfoBtn}</div>
          ${vi.desc && idx===0 ? `<div style="font-size:var(--text-2xs);color:var(--slate-500);margin-bottom:2px;line-height:1.4">${esc(vi.desc)}</div>` : ''}
          <div class="vac-dose-detalhe">${detalhe}</div>
        </div>
      </div>`;
    }).join('');
  }).join('');

  const cardId = `vac-card-${ind.idIndividuo}`;
  return `
    <div class="vac-card" id="${cardId}">
      <div class="vac-card-header ${sit}" onclick="toggleVacCard('${cardId}')">
        <div class="vac-avatar" style="background:${sitBg};font-size:var(--text-lg)">${sitIcon}</div>
        <div style="flex:1;min-width:0">
          <div class="vac-nome">${esc(ind.nome)}</div>
          <div class="vac-meta">${idadeTexto} · ${ind.sexo==='F'?'Feminino':'Masculino'} · 📍 ${esc(endereco)}</div>
        </div>
        <span style="font-size:var(--text-xs);font-weight:700;padding:2px 10px;border-radius:var(--r-full);background:${sitBg};color:${sitColor};white-space:nowrap;margin-right:8px">${sitLabel}</span>
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();editarIndividuo(${ind.idIndividuo})" style="margin-right:6px">✎</button>
        <span class="vac-chevron">▼</span>
      </div>
      <div class="vac-doses-grid">
        ${dosesHtml || '<div style="color:var(--cinza-500);font-size:var(--text-xs);padding:4px 0">Nenhuma vacina aplicável nesta faixa etária.</div>'}
      </div>
    </div>`;
}

function toggleVacCard(id) {
  $id(id)?.classList.toggle('open');
}

function renderCondicoes() {
  // Um indivíduo pode aparecer em múltiplas abas (ex.: idoso com HAS e DM).
  const grupos = { has: [], dm: [], gestante: [], crianca: [], idoso: [], mental: [] ,tea:[],alcool:[],avc:[],infarto:[]};

  for (const i of getIndividuos()) {
    const idadeAnos = getIdadeEmAnos(i.nasc);
    if (i.has      === 'sim')                            grupos.has.push(i);
    if (i.dm       === 'sim')                            grupos.dm.push(i);
    if (i.gestante === 'sim')                            grupos.gestante.push(i);
    if (i.mental   === 'sim')                            grupos.mental.push(i);
    if (i.tea      === 'sim')                            grupos.tea.push(i);
    if (i.alcool   === 'sim')                            grupos.alcool.push(i);
    if (i.avc      === 'sim')                            grupos.avc.push(i);
    if (i.infarto  === 'sim')                            grupos.infarto.push(i);
    if (idadeAnos !== null && idadeAnos < 5)             grupos.crianca.push(i);
    if (idadeAnos !== null && idadeAnos >= 60)           grupos.idoso.push(i);
  }

  // ── Helper: preenche uma linha de tabela via template ────────────────────
  const VAZIO_FRAG = function() {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan    = 6;
    td.className  = 'td-empty-row';
    td.textContent = 'Nenhum registrado';
    tr.appendChild(td);
    return tr;
  };

  function buildRows(lista, col3Fn, col4Fn, col5Fn, col6Fn) {
    if (!lista.length) return VAZIO_FRAG();
    const frag = document.createDocumentFragment();
    lista.forEach(function(i) {
      const row = cloneTemplate('tpl-acomp-row');
      row.querySelector('.atr-nome strong').textContent = i.nome;
      row.querySelector('.atr-idade').textContent        = calcIdade(i.nasc).texto;
      const c3 = col3Fn ? col3Fn(i) : '–';
      const c4 = col4Fn ? col4Fn(i) : '–';
      const c5 = col5Fn ? col5Fn(i) : badgeRisco(getRiscoIndividuo(i));
      const c6 = col6Fn ? col6Fn(i) : formatData(getUltimaVisita(i.familiaId));
      // c3-c6 podem ser HTML — usar innerHTML é seguro aqui (gerado internamente)
      row.querySelector('.atr-col3').innerHTML = c3;
      row.querySelector('.atr-col4').innerHTML = c4;
      row.querySelector('.atr-col5').innerHTML = c5;
      row.querySelector('.atr-col6').innerHTML = c6;
      frag.appendChild(row);
    });
    return frag;
  }

  function setTabBody(id, lista, c3, c4, c5, c6) {
    const el = $id(id);
    if (!el) return;
    el.innerHTML = '';
    el.appendChild(buildRows(lista, c3, c4, c5, c6));
  }

  setTabBody('tab-has-body',      grupos.has);
  setTabBody('tab-dm-body',       grupos.dm);
  setTabBody('tab-gestante-body', grupos.gestante,
    null, null, null, function() { return '–'; });
  setTabBody('tab-crianca-body',  grupos.crianca,
    function() { return '<span class="badge badge-yellow">Verificar</span>'; },
    function() { return '–'; },
    function() { return '<span class="badge badge-green">Normal</span>'; });
  setTabBody('tab-idoso-body', grupos.idoso,
    function(i) { return condicoesLabel(i); },
    function() { return '–'; },
    function() { return '–'; });
  setTabBody('tab-mental-body', grupos.mental,
    null, null, null,
    function(i) { return formatData(getUltimaVisita(i.familiaId)); });
}

function getUltimaVisita(famId) {
  const vis = db.visitas.filter(v => v.familiaId === famId).sort((a,b) => b.data > a.data ? 1:-1);
  return vis.length ? vis[0].data : null;
}
