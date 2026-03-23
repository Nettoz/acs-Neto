// ACS Neto — app-fichas.js
// Fichas clínicas unificadas: HAS, DM, Gestante, Outros, Hans/Rastreio + navegação
// Expõe: window.FichasModule, abrirFichaHas, abrirFichaDm, abrirFichaGestante,
//        abrirFichaOutros, abrirFichaHans, renderFichas, switchFichaTab, etc.
// Depende de: app-core.js, app-utils.js, app-crud.js, app-render.js

const _fh = {
  xs:    (t,cl='var(--cinza-500)')  => `<span style="font-size:var(--text-xs);color:${cl}">${t}</span>`,
  // xs6/xs8/sm7/mt2: dual-purpose — chamadas SEM argumento retornam string CSS
  // (usado em style="…"), chamadas COM argumento retornam HTML envolvido em <span>/<div>.
  xs6:   (t) => { const s='font-size:var(--text-xs);font-weight:600;color:var(--slate-500)';          return t!==undefined?`<span style="${s}">${t}</span>`:s; },
  xs8:   (t) => { const s='font-size:var(--text-xs);font-weight:800;color:var(--slate-900)';          return t!==undefined?`<span style="${s}">${t}</span>`:s; },
  sm7:   (t) => { const s='font-size:var(--text-sm);font-weight:700;color:var(--slate-600)';          return t!==undefined?`<span style="${s}">${t}</span>`:s; },
  bold:  (t)                        => `<span style="font-weight:700;margin-bottom:var(--sp-2)">${t}</span>`,
  bold6: (t)                        => `<span style="font-weight:600;margin-bottom:var(--sp-2)">${t}</span>`,
  mt2:   (t) => { const s='margin-top:2px;font-size:var(--text-xs)'; return t!==undefined?`<div style="${s}">${t}</div>`:s; },
  badgeOk:   (t='✓ Em uso')         => `<span style="margin-left:auto;font-size:var(--text-2xs);padding:2px 8px;border-radius:var(--r-sm);background:var(--verde);color:white;font-weight:600">${t}</span>`,
  badgeNo:   (t='Não confirmado')   => `<span style="margin-left:auto;font-size:var(--text-2xs);padding:2px 8px;border-radius:var(--r-sm);background:var(--cinza-200);color:var(--cinza-600);font-weight:600">${t}</span>`,
  rowSb:     ()                     => `display:flex;align-items:center;justify-content:space-between;padding:var(--sp-2) 12px;border-radius:var(--r-sm);background:var(--surface-2)`,
  p4:        ()                     => `padding:var(--sp-4)`,
};


// Depende de: app-core.js, app-utils.js

// Funções reutilizadas por todas as fichas clínicas.

/** Retorna {ind, ficha} ou null se indivíduo não encontrado. */
function _fBase(tipo, individuoId) {
  const ind   = getIndividuo(individuoId);
  if (!ind) return null;
  const store = tipo === 'hans'
    ? fichasAcompanhamento.hans
    : (fichasAcompanhamento[tipo] || {});
  const ficha = store[individuoId] || {};
  return { ind, ficha };
}

/** Card de seção com título e corpo. */
function _fCard(title, body, extra='') {
  return `<div class="card ficha-section${extra}"><div class="ficha-section-title">${title}</div>${body}</div>`;
}

/** Card compacto (gap menor). */
function _fCardCompact(title, body) {
  return `<div class="card ficha-section-compact"><div class="ficha-section-title muted">${title}</div>${body}</div>`;
}

/** Label de campo. */
function _fLabel(text) {
  return `<label class="ficha-label-muted">${text}</label>`;
}

/** Label estilo form (bold, bloco). */
function _fLabelBlock(text) {
  return `<label class="ficha-label">${text}</label>`;
}

/** Input com label acima — padrão ficha. */
function _fField(label, inputHtml) {
  return `<div>${_fLabel(label)}${inputHtml}</div>`;
}

/** Grid de 2 colunas (gap-sm). */
function _fGrid2(body) { return `<div class="grid-2">${body}</div>`; }

/** Grid de 3 colunas (gap-md). */
function _fGrid3(body) { return `<div class="grid-3">${body}</div>`; }

/** Grid de 2 colunas gap-md. */
function _fGrid2md(body) { return `<div class="grid-2-md">${body}</div>`; }

/** Linha de checkbox com texto. */
function _fCheck(tipo, id, key, label, checked) {
  const c = checked ? 'checked' : '';
  return `<label class="ficha-check-row"><input type="checkbox" ${c} onchange="salvarFichaCampo('${tipo}',${id},'${key}',this.checked)"><span>${label}</span></label>`;
}

/** Grupo de checkboxes em grid-2 a partir de array [[key,label],...]. */
function _fCheckGrid2(tipo, id, ficha, items) {
  return _fGrid2(items.map(([k,l]) => _fCheck(tipo, id, k, l, ficha[k])).join(''));
}

/** Input numérico com label. */
function _fNum(tipo, id, key, label, value, opts='') {
  return _fField(label, `<input type="number" class="input" value="${value||''}" onchange="salvarFichaCampo('${tipo}',${id},'${key}',this.value)" ${opts}>`);
}

/** Input de texto com label. */
function _fText(tipo, id, key, label, value, placeholder='') {
  return _fField(label, `<input type="text" class="input" value="${esc(value||'')}" placeholder="${placeholder}" onchange="salvarFichaCampo('${tipo}',${id},'${key}',this.value)">`);
}

/** Input de data (dd/mm/aaaa) com label. */
function _fDate(tipo, id, key, label, valueISO) {
  const br = valueISO ? _isoToBR(valueISO) : '';
  return _fField(label, `<input type="text" class="input date-input" maxlength="10" placeholder="dd/mm/aaaa" value="${br}" oninput="mascararData(this)" onchange="salvarFichaCampoDataTexto('${tipo}',${id},'${key}',this.value)">`);
}

/** Select com opções [[value,label],...] e label acima. */
function _fSelect(tipo, id, key, label, options, current) {
  const opts = options.map(([v,l]) => `<option value="${v}" ${current===v?'selected':''}>${l}</option>`).join('');
  return _fField(label, `<select class="input" onchange="salvarFichaCampo('${tipo}',${id},'${key}',this.value)"><option value="">Selecione</option>${opts}</select>`);
}

/** Textarea com label. */
function _fTextarea(tipo, id, key, label, value, rows=2) {
  return _fField(label, `<textarea class="input" rows="${rows}" onchange="salvarFichaCampo('${tipo}',${id},'${key}',this.value)">${esc(value||'')}</textarea>`);
}

/** Bloco de medicações reutilizado em HAS, DM e Gestante (eliminação de duplicação 3x). */
function _fMedicacoes(tipo, individuoId, ind, ficha) {
  const meds = (ind.medicacoes || []).filter(m => m?.nome);
  if (!meds.length) return `<div class="ficha-label-muted" style="font-style:italic;margin-bottom:10px">Nenhuma medicação registrada no cadastro do indivíduo.</div>`;
  return `<div style="font-size:var(--text-xs);color:var(--cinza-500);margin-bottom:10px">Medicações carregadas do cadastro:</div>
  <div style="display:grid;gap:var(--sp-1);margin-bottom:var(--sp-3)">
    ${meds.map((m,i) => `
    <div class="fmed-row">
      <input type="checkbox" ${(ficha.adesaoMeds||{})[i]?'checked':''} onchange="salvarFichaAdesaoMed('${tipo}',${individuoId},${i},this.checked)" title="Faz uso regular">
      <div style="flex:1;min-width:0">
        <div style="${_fh.xs8()}">${esc(m.nome)}</div>
        <div style="${_fh.xs()}">${[m.dose,m.freq,m.localAcesso].filter(Boolean).map(v=>esc(v)).join(' · ')}</div>
      </div>
      ${(ficha.adesaoMeds||{})[i] ? _fh.badgeOk('Em uso') : _fh.badgeNo('Não confirmado')}
    </div>`).join('')}
  </div>`;
}

/** Exibe classificação IMC colorida a partir do valor numérico salvo. */
function _fImcDisplay(imc) {
  if (!imc) return '';
  const v = parseFloat(imc);
  if (isNaN(v)) return '';
  const { cat, cor } = _classificarIMC(v);
  return `<span style="color:${cor};font-weight:700">${cat}</span>`;
}

// ACS Neto — app-fichas.js
// Fichas de acompanhamento: HAS, DM, Gestante, Consumo Alimentar, HANS
// Depende de: app-core.js, app-utils.js, app-ui.js, app-crud.js

// FICHAS DE ACOMPANHAMENTO - SISTEMA COMPLETO
// ============================================

// carregarFichas() / salvarFichas() — removidos (eram noops).
// Fichas agora vivem em db.fichas e são persistidas pelo save() normal.

// salvarFichaCampo, salvarFichaComVisita, abrirFicha, _fichaAbrirModal
// _debouncedSaveFichas: persiste + invalida snapshot para que chips/status
// (renderCondicoes, renderDashboard, família cards) reflitam a mudança imediatamente.
const _debouncedSaveFichas = (typeof window.debounce === 'function')
  ? window.debounce(function() {
      save();
      if (typeof DB !== 'undefined' && DB.invalidate) DB.invalidate();
      if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
    }, 500)
  : function() {
      save();
      if (typeof DB !== 'undefined' && DB.invalidate) DB.invalidate();
      if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
    };

function salvarFichaCampo(tipo, individuoId, campo, valor) {
  if (!fichasAcompanhamento[tipo]) fichasAcompanhamento[tipo] = {};
  if (!fichasAcompanhamento[tipo][individuoId]) fichasAcompanhamento[tipo][individuoId] = {};
  fichasAcompanhamento[tipo][individuoId][campo] = valor;
  _debouncedSaveFichas();
  // Atualiza o status do item na lista e barra de progresso sem re-renderizar tudo
  _acompAtualizarItemStatus(tipo, individuoId);
}

// Salva adesão individual por índice de medicação (checkbox por med do cadastro)
function salvarFichaAdesaoMed(tipo, individuoId, index, checked) {
  if (!fichasAcompanhamento[tipo]) fichasAcompanhamento[tipo] = {};
  if (!fichasAcompanhamento[tipo][individuoId]) fichasAcompanhamento[tipo][individuoId] = {};
  if (!fichasAcompanhamento[tipo][individuoId].adesaoMeds) fichasAcompanhamento[tipo][individuoId].adesaoMeds = {};
  fichasAcompanhamento[tipo][individuoId].adesaoMeds[index] = checked;
  save();
  if (typeof DB !== 'undefined' && DB.invalidate) DB.invalidate();
  // Re-renderiza só o container da ficha aberta (sem recarregar a página)
  const container = $id(`ficha-ind-${individuoId}`);
  if (container) {
    const html = (tipo === 'has' ? renderFichaHAS : tipo === 'dm' ? renderFichaDM : renderFichaGestante)(individuoId);
    container.innerHTML = html;
  }
}

// Salva campo de uma consulta pré-natal pelo índice
function salvarConsultaPrenatal(individuoId, index, campo, valor) {
  if (!fichasAcompanhamento.gestante) fichasAcompanhamento.gestante = {};
  if (!fichasAcompanhamento.gestante[individuoId]) fichasAcompanhamento.gestante[individuoId] = {};
  const ficha = fichasAcompanhamento.gestante[individuoId];
  if (!ficha.consultasPrenatal) ficha.consultasPrenatal = [];
  while (ficha.consultasPrenatal.length <= index) ficha.consultasPrenatal.push({});
  ficha.consultasPrenatal[index][campo] = valor;
  save();
  if (typeof DB !== 'undefined' && DB.invalidate) DB.invalidate();
}

function salvarFichaComVisita(tipo, individuoId) {
  const fa = db.fichas.atual;
  if (!fa[tipo])              fa[tipo]              = {};
  if (!fa[tipo][individuoId]) fa[tipo][individuoId] = {};

  const obsEl = $id(`ficha-obs-${tipo}-${individuoId}`);
  const obs   = obsEl ? obsEl.value.trim() : '';

  fa[tipo][individuoId]._dataSalva = hoje();

  // Cada chamada a salvarFichaComVisita cria uma entrada no histórico,
  // independentemente de contar ou não como visita domiciliar.
  const hist = db.fichas.historico;
  if (!hist[tipo])              hist[tipo]              = {};
  if (!hist[tipo][individuoId]) hist[tipo][individuoId] = [];

  // Snapshot completo dos campos (cópia sem referência)
  const snapshot = Object.assign({}, fa[tipo][individuoId]);
  delete snapshot._dataSalva; // data fica no envelope, não no snapshot

  hist[tipo][individuoId].push({
    data:     hoje(),
    dataHora: new Date().toISOString(),
    campos:   snapshot,
    obs:      obs,
  });

  const chk = $id(`ficha-visita-chk-${tipo}-${individuoId}`);
  const contarComoVisita = chk && chk.checked;
  if (contarComoVisita) {
    const familia = getFamiliaPorIndividuo(individuoId);
    if (familia) {
      const obsVisita = obs
        ? `Ficha: ${_tiposFichaLabel[tipo]||tipo}. ${obs}`
        : `Ficha de acompanhamento: ${_tiposFichaLabel[tipo]||tipo}.`;
      db.visitas.push({
        id:          nextId('visita'),
        data:        hoje(),
        familiaId:   familia.idFamilia,
        individuoId: Number(individuoId),
        turno:       new Date().getHours() < 12 ? 'manha' : 'tarde',
        tipo:        _tiposFichaLabel[tipo] || 'Ficha de Acompanhamento',
        desfecho:    'Visita realizada',
        obs:         obsVisita,
        escopo:      'individuo',
        membroId:    Number(individuoId),
        cbo:         db.config?.cbo || '515105',
        dataRegistro:hoje(),
      });
      if (!familia.ultimaVisita || hoje() > familia.ultimaVisita) familia.ultimaVisita = hoje();
    }
  }

  save();
  if (typeof DB !== 'undefined' && DB.invalidate) DB.invalidate();
  if (contarComoVisita) {
    // P2-2: em vez de renderFamilias() + renderIndividuos() + renderDashboard()
    // simultâneos (300–600ms bloqueantes), invalida o snapshot e agenda
    // apenas o re-render da página visível via requestIdleCallback.
    // updateBadge() é leve (só conta) — mantido imediato para feedback visual.
    updateBadge();
    if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
  }
  if (typeof atualizarBadgeHans === 'function') atualizarBadgeHans();
  // Notifica modal de visita individual (se aberto) para atualizar status da ficha na lista
  if (typeof window._notificarFichaSalva === 'function') window._notificarFichaSalva(tipo);

  toast(contarComoVisita ? 'Ficha salva e visita contabilizada! ✅' : 'Ficha salva!', 'success');
  // Atualiza status na lista inline após salvar com visita
  _acompAtualizarItemStatus(tipo, individuoId);
}

// Atualiza o ícone ⏳/✅ do item na lista de acompanhamento e recalcula
// a barra de progresso — sem re-renderizar a lista inteira.
function _acompAtualizarItemStatus(tipo, individuoId) {
  if (_acompTipoAtual !== tipo) return;
  const mesAtual = new Date().toISOString().slice(0, 7);

  // Determina se este indivíduo agora tem ficha
  function _temFicha(ind) {
    if (tipo === 'prevencao') return _prevencaoFeita(ind, fichasAcompanhamento, mesAtual);
    const f = (fichasAcompanhamento[tipo] || {})[ind.idIndividuo] || {};
    return !!(f._dataSalva && f._dataSalva.startsWith(mesAtual));
  }

  // Atualiza o ícone no item da lista via dataset.indId (confiável)
  const items = document.querySelectorAll('#acomp-lista .individuo-list-item, #acomp-lista [data-ind-id]');
  const ind = getIndividuo(individuoId);
  if (!ind) return;
  const temFInd = _temFicha(ind);
  items.forEach(function(el) {
    if (parseInt(el.dataset.indId) !== individuoId) return;
    el.dataset.tem = temFInd ? '1' : '0';
    const statusEl = el.querySelector('.ili-status');
    if (statusEl) statusEl.textContent = temFInd ? '✅' : '⏳';
  });

  // Recalcula e atualiza barra de progresso
  const todos = _fichaElegiveis(tipo);
  if (!todos.length) return;
  let comF = 0;
  todos.forEach(function(i) {
    if (_temFicha(i)) comF++;
  });
  const pct = Math.round(comF / todos.length * 100);
  const cor = pct === 100 ? 'var(--verde)' : pct >= 50 ? 'var(--amarelo)' : 'var(--vermelho)';
  const bar = document.getElementById('acomp-pct-bar');
  const lbl = document.getElementById('acomp-pct-label');
  const ok  = document.getElementById('acomp-ok-count');
  const pe  = document.getElementById('acomp-pend-count');
  if (bar) { bar.style.width = pct + '%'; bar.style.background = cor; }
  if (lbl) { lbl.textContent = pct + '%'; lbl.style.color = cor; }
  if (ok)  ok.textContent  = '✅ ' + comF + ' com ficha';
  if (pe)  pe.textContent  = '⏳ ' + (todos.length - comF) + ' pendente' + (todos.length - comF !== 1 ? 's' : '');
}

function _cardRegistrarVisita(tipo, individuoId) {
  // Recupera obs da entrada mais recente do histórico para pré-preencher
  return `
    <div class="card" style="margin-top:16px;padding:var(--sp-4);border:2px solid var(--azul);background:var(--azul-fraco);">
      <div style="font-weight:700;margin-bottom:10px;color:var(--azul);">📋 Salvar e Registrar Visita</div>
      <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;margin-bottom:14px;">
        <input type="checkbox" id="ficha-visita-chk-${tipo}-${individuoId}" style="width:18px;height:18px;cursor:pointer;">
        <span style="font-size:var(--text-sm);">Contar como <strong>visita domiciliar realizada</strong></span>
      </label>
      <div style="display:flex;gap:var(--sp-2)">
        <button class="btn btn-primary" onclick="salvarFichaComVisita('${tipo}',${individuoId})" style="flex:1;">
          💾 Salvar Ficha
        </button>
        <button class="btn btn-secondary" onclick="verHistoricoFicha('${tipo}',${individuoId})"
          aria-label="Ver histórico de salvamentos"
          title="Ver histórico de salvamentos" style="padding:0 12px;font-size:var(--text-md)">
          🕐
        </button>
      </div>
    </div>`;
}

function _classificarIMC(imc) {
  if (imc < 18.5) return { cat: 'Abaixo do peso', cor: _COLORS.info };
  if (imc < 25)   return { cat: 'Peso normal ✓',  cor: _COLORS.ok };
  if (imc < 30)   return { cat: 'Sobrepeso',       cor: _COLORS.warn };
  if (imc < 35)   return { cat: 'Obesidade I',     cor: _COLORS.urgente };
  if (imc < 40)   return { cat: 'Obesidade II',    cor: _COLORS.obesidadeII };
  return           { cat: 'Obesidade III',          cor: 'var(--rose-700,#7f1d1d)' };
}

function calcularImcInline(indId, pesoId, alturaId, resultId) {
  const peso   = parseFloat($id(pesoId)?.value);
  const altura = parseFloat($id(alturaId)?.value);
  const resEl  = $id(resultId);
  if (!resEl) return;
  if (!peso || !altura || altura < 50) {
    resEl.textContent = '–'; resEl.style.color = 'var(--slate-400)'; return;
  }
  const altM = altura / 100;
  const imc  = peso / (altM * altM);
  const { cat, cor } = _classificarIMC(imc);

  const strong = document.createElement('strong');
  strong.className   = 'imc-valor';
  strong.style.color = cor;
  strong.textContent = imc.toFixed(1);

  const span = document.createElement('span');
  span.className   = 'imc-cat';
  span.style.color = cor;
  span.textContent = cat;

  resEl.replaceChildren(strong, span);
  const ind = getIndividuo(indId);
  if (ind) { ind.imc = parseFloat(imc.toFixed(1)); ind.imcCategoria = cat; save(); }
}

function calcularIMC(tipo, individuoId) {
  const pesoEl     = $id('peso-imc-' + individuoId);
  const alturaEl   = $id('altura-imc-' + individuoId);
  const imcEl      = $id('imc-valor-' + individuoId);
  const imcClassEl = $id('imc-classificacao-' + individuoId);
  if (!pesoEl || !alturaEl || !imcEl) return;
  const peso   = parseFloat(pesoEl.value);
  const altura = parseFloat(alturaEl.value);
  if (!peso || !altura) { imcEl.value = ''; if (imcClassEl) imcClassEl.textContent = ''; return; }
  const alturaM = altura > 3 ? altura / 100 : altura; // aceita cm (>3) ou metros
  const imc     = peso / (alturaM * alturaM);
  imcEl.value   = imc.toFixed(1);
  salvarFichaCampo(tipo, individuoId, 'imc',    imc.toFixed(1));
  salvarFichaCampo(tipo, individuoId, 'peso',   String(peso));
  salvarFichaCampo(tipo, individuoId, 'altura', String(altura));
  if (imcClassEl) {
    const { cat, cor } = _classificarIMC(imc);
    imcClassEl.textContent    = cat;
    imcClassEl.style.color      = cor;
    imcClassEl.style.fontWeight = '700';
  }
}

// Mascara automatica: insere / enquanto digita dd/mm/aaaa
function mascararData(el) {
  var v = el.value.replace(/\D/g, '').slice(0, 8);
  if (v.length >= 5) v = v.slice(0,2) + '/' + v.slice(2,4) + '/' + v.slice(4);
  else if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2);
  el.value = v;
}

// parseDateBR, dateToISO, _brToISO, _isoToBR definidas em app-utils.js (carrega antes)

// Salva campo de data que vem no formato texto dd/mm/aaaa
function salvarFichaCampoDataTexto(tipo, individuoId, campo, valorTexto) {
  var dt = parseDateBR(valorTexto);
  salvarFichaCampo(tipo, individuoId, campo, dt ? dateToISO(dt) : '');
}

// Salva data de consulta prenatal vinda como texto
function salvarConsultaPrenatalDataTexto(iid, idx, valorTexto) {
  var dt = parseDateBR(valorTexto);
  salvarConsultaPrenatal(iid, idx, 'data', dt ? dateToISO(dt) : '');
}

// Calcula IG da consulta a partir da data digitada e da DUM salva
function calcIGConsulta(inputEl, iid, idx) {
  var erroEl = $id('cdata-erro-' + iid + '-' + idx);
  var igEl   = $id('ig-consulta-' + iid + '-' + idx);
  var val = inputEl.value;
  if (val.length < 10) { if (erroEl) erroEl.textContent = ''; return; }
  var dtConsulta = parseDateBR(val);
  if (!dtConsulta) {
    if (erroEl) erroEl.textContent = 'Data invalida';
    if (igEl) igEl.value = '';
    return;
  }
  if (erroEl) erroEl.textContent = '';
  var dumISO = db.fichas && db.fichas.atual && db.fichas.atual.gestante &&
               db.fichas.atual.gestante[iid] && db.fichas.atual.gestante[iid].dum;
  if (dumISO && igEl) {
    var dumDt  = new Date(dumISO + 'T00:00:00');
    var diffMs = dtConsulta - dumDt;
    if (diffMs >= 0) {
      var sem   = Math.floor(diffMs / (7*24*60*60*1000));
      var dia   = Math.floor((diffMs % (7*24*60*60*1000)) / (24*60*60*1000));
      var igStr = sem + 's ' + dia + 'd';
      igEl.value = igStr;
      salvarConsultaPrenatal(iid, idx, 'igConsulta', igStr);
    }
  }
}

function atualizarIG(individuoId) {
  var dumEl  = $id('dum-input-' + individuoId);
  var igEl   = $id('ig-display-' + individuoId);
  var dppEl  = $id('dpp-input-' + individuoId);
  var erroEl = $id('dum-erro-' + individuoId);
  if (!dumEl || !igEl) return;
  var val = dumEl.value;
  if (!val || val.length < 10) { igEl.value = ''; if (erroEl) erroEl.textContent = ''; return; }
  var dum = parseDateBR(val);
  if (!dum) {
    igEl.value = '';
    if (erroEl) erroEl.textContent = 'Data invalida';
    return;
  }
  if (erroEl) erroEl.textContent = '';
  var isoVal = dateToISO(dum);
  salvarFichaCampo('gestante', individuoId, 'dum', isoVal);
  var agora = new Date(); agora.setHours(0,0,0,0);
  var diffMs = agora - dum;
  if (diffMs < 0) { igEl.value = 'DUM no futuro'; return; }
  var totalDias = Math.floor(diffMs / (24*60*60*1000));
  var semanas   = Math.floor(totalDias / 7);
  var dias      = totalDias % 7;
  igEl.value = semanas + 's ' + dias + 'd';
  if (dppEl && !dppEl.dataset.editado) {
    var dpp    = new Date(dum.getTime()); dpp.setDate(dpp.getDate() + 280);
    var dppISO = dateToISO(dpp);
    dppEl.value = String(dpp.getDate()).padStart(2,'0') + '/' +
                  String(dpp.getMonth()+1).padStart(2,'0') + '/' + dpp.getFullYear();
    salvarFichaCampo('gestante', individuoId, 'dpp', dppISO);
  }
}


// ============================================
// FICHA HAS
// ============================================

// Formulários de fichas: HAS, DM, Gestante, Consumo Alimentar, HANS (~
// ✎ Alterar apenas se mudar campos clínicos dos formulários

function renderFichaHAS(individuoId) {
  const r = _fBase('has', individuoId);
  if (!r) return '';
  const { ind, ficha } = r;
  const id = individuoId;
  const T = 'has';

  // ── Dados Antropométricos ──
  const antropometria = _fCard('📊 Dados Antropométricos',
    _fGrid3(
      _fField('Peso (kg)', `<input type="number" id="peso-imc-${id}" class="input" step="0.1" value="${ficha.peso||''}" oninput="salvarFichaCampo('${T}',${id},'peso',this.value);calcularIMC('${T}',${id})">`)
      + _fField('Altura (cm)', `<input type="number" id="altura-imc-${id}" class="input" step="0.1" value="${ficha.altura||''}" oninput="salvarFichaCampo('${T}',${id},'altura',this.value);calcularIMC('${T}',${id})">`)
      + _fField('IMC', `<input type="number" id="imc-valor-${id}" class="input" step="0.1" value="${ficha.imc||''}" readonly style="background:var(--cinza-100)"><div id="imc-classificacao-${id}" style="font-size:var(--text-xs);margin-top:var(--sp-1)">${_fImcDisplay(ficha.imc)}</div>`)
    )
  );

  // ── Controle Pressórico ──
  const pressao = _fCard('❤️ Controle Pressórico',
    `<div class="grid-3-md">`
    + _fNum(T, id, 'paSistolica', 'PA Sistólica (mmHg)', ficha.paSistolica)
    + _fNum(T, id, 'paDiastolica', 'PA Diastólica (mmHg)', ficha.paDiastolica)
    + _fDate(T, id, 'paData', 'Data da Medida', ficha.paData)
    + `</div>`
    + _fCheck(T, id, 'paControlada', 'PA controlada (&lt; 140/90 mmHg)', ficha.paControlada)
    + `<div style="border-top:1px solid var(--cinza-200);padding-top:10px;margin-top:var(--sp-1)">
        <div style="font-size:var(--text-xs);font-weight:600;color:var(--cinza-700);margin-bottom:var(--sp-2)">🩺 Aparelho de Aferição Domiciliar</div>
        <div class="grid-auto">`
    + _fCheck(T, id, 'possuiAparelho', 'Possui aparelho de aferição em casa', ficha.possuiAparelho)
    + (ficha.possuiAparelho
      ? _fCheck(T, id, 'usaAparelhoCorretamente', 'Usa o aparelho corretamente', ficha.usaAparelhoCorretamente)
        + _fCheck(T, id, 'orientadoUsoAparelho', 'Orientado sobre técnica correta de aferição', ficha.orientadoUsoAparelho)
      : `<div style="font-size:var(--text-xs);color:var(--cinza-400);margin-left:24px;font-style:italic">Marque acima para exibir opções de uso</div>`)
    + `</div></div>`
  );

  // ── Tratamento e Adesão (usa helper compartilhado) ──
  const tratamento = _fCard('💊 Tratamento e Adesão',
    _fMedicacoes(T, id, ind, ficha)
    + _fTextarea(T, id, 'medicacoesObs', 'Outras medicações / observações', ficha.medicacoesObs)
    + _fCheck(T, id, 'adesao', 'Faz uso regular de todas as medicações prescritas', ficha.adesao)
    + _fCheck(T, id, 'reacoes', 'Apresentou reações adversas', ficha.reacoes)
  );

  // ── Fatores de Risco ──
  const risco = _fCard('⚠️ Fatores de Risco',
    _fCheckGrid2(T, id, ficha, [
      ['tabagismo','Tabagismo'],['etilismo','Etilismo'],
      ['sedentarismo','Sedentarismo'],['obesidade','Obesidade'],
      ['dislipidemia','Dislipidemia'],['dm','Diabetes Mellitus']
    ])
  );

  // ── Orientações ──
  const orientacoes = `<div class="card" style="${_fh.p4()}">`
    + `<div class="ficha-section-title">📝 Orientações Realizadas</div><div class="grid-auto">`
    + [['orientacaoDieta','Orientação sobre alimentação saudável (dieta hipossódica)'],
       ['orientacaoAtividade','Orientação sobre prática de atividade física'],
       ['orientacaoMedicacao','Orientação sobre uso correto da medicação'],
       ['orientacaoSinaisAlarme','Orientação sobre sinais de alarme']]
      .map(([k,l]) => _fCheck(T, id, k, l, ficha[k])).join('')
    + `</div></div>`;

  return `<div class="ficha-container">${antropometria}${pressao}${tratamento}${risco}${orientacoes}${_cardRegistrarVisita(T, id)}</div>`;
}

// ============================================


// FICHA DM
// ============================================
function renderFichaDM(individuoId) {
  const r = _fBase('dm', individuoId);
  if (!r) return '';
  const { ind, ficha } = r;
  const id = individuoId;
  const T = 'dm';

  // ── Controle Glicêmico ──
  const glicemico = _fCard('📊 Controle Glicêmico',
    `<div class="grid-3-md">`
    + _fNum(T, id, 'glicemiaJejum', 'Glicemia de Jejum', ficha.glicemiaJejum)
    + _fNum(T, id, 'hba1c', 'HbA1c (%)', ficha.hba1c, 'step="0.1"')
    + _fDate(T, id, 'glicemiaData', 'Data', ficha.glicemiaData)
    + `</div>`
    + _fCheck(T, id, 'glicemiaControlada', 'Glicemia controlada (HbA1c &lt; 7%)', ficha.glicemiaControlada)
  );

  // ── Avaliação do Pé Diabético ──
  const pe = _fCard('🦶 Avaliação do Pé Diabético',
    _fCheckGrid2(T, id, ficha, [
      ['inspecaoPele','Pele íntegra'],['inspecaoFissuras','Fissuras/rachaduras'],
      ['inspecaoCalos','Calosidades'],['inspecaoUlceras','Úlceras/feridas'],
      ['sensibilidadeNormal','Sensibilidade preservada'],['sensibilidadeDiminuida','Hipoestesia'],
      ['pulsoPedioso','Pulso pedioso palpável'],['pulsoTibial','Pulso tibial posterior palpável']
    ])
  );

  // ── Comorbidades ──
  const comorbidades = _fCard('⚠️ Comorbidades Associadas',
    _fCheckGrid2(T, id, ficha, [
      ['has','Hipertensão Arterial'],['dislipidemia','Dislipidemia'],
      ['nefropatia','Nefropatia'],['retinopatia','Retinopatia'],
      ['avc','AVC prévio'],['iam','IAM prévio']
    ])
  );

  // ── Tratamento e Adesão (usa helper compartilhado) ──
  const tratamento = _fCard('💊 Tratamento e Adesão',
    _fMedicacoes(T, id, ind, ficha)
    + _fTextarea(T, id, 'medicacoesObs', 'Outras medicações / observações', ficha.medicacoesObs)
    + _fCheck(T, id, 'adesao', 'Faz uso regular de todas as medicações prescritas', ficha.adesao)
    + _fCheck(T, id, 'reacoes', 'Apresentou reações adversas', ficha.reacoes)
    + _fCheck(T, id, 'insulina', 'Em uso de insulina', ficha.insulina)
    + _fCheck(T, id, 'glicemiaAutocuidado', 'Realiza automonitoramento da glicemia em casa', ficha.glicemiaAutocuidado)
  );

  // ── Orientações ──
  const orientacoes = _fCard('📝 Orientações Realizadas',
    `<div class="grid-auto">`
    + [['orientacaoPeDiabetico','Orientação sobre cuidados com os pés'],
       ['orientacaoHipoHiper','Orientação sobre hipoglicemia/hiperglicemia'],
       ['orientacaoAlimentar','Orientação alimentar'],
       ['orientacaoAtividade','Orientação sobre atividade física'],
       ['orientacaoMedicacao','Orientação sobre uso correto da medicação']]
      .map(([k,l]) => _fCheck(T, id, k, l, ficha[k])).join('')
    + `</div>`
  );

  return `<div class="ficha-container">${glicemico}${pe}${comorbidades}${tratamento}${orientacoes}${_cardRegistrarVisita(T, id)}</div>`;
}

// ============================================


// FICHA GESTANTE (com abas)
// ============================================
function _gestanteTabStyle(ativo) {
  return ativo
    ? 'padding:var(--sp-2) 14px;font-size:var(--text-xs);font-weight:700;border:none;border-bottom:2px solid var(--azul);background:none;color:var(--azul);cursor:pointer;'
    : 'padding:var(--sp-2) 14px;font-size:var(--text-xs);font-weight:600;border:none;border-bottom:2px solid transparent;background:none;color:var(--cinza-500);cursor:pointer;';
}
function switchGestanteTab(iid, tab) {
  ['dados','vacinas','exames','prenatal','medicacoes'].forEach(t => {
    const el = $id(`gtab-${t}-${iid}`);
    const btn = $id(`gtabbtn-${t}-${iid}`);
    if (el) el.style.display = t === tab ? '' : 'none';
    if (btn) {
      btn.style.cssText = _gestanteTabStyle(t === tab);
    }
  });
}
// Extraídos para facilitar manutenção e localização de cada aba.

function _gestanteCalcIG(ficha) {
  let ig = '', semanas = 0, dppCalc = '';
  if (ficha.dum) {
    const dum = new Date(ficha.dum + 'T00:00:00');
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const totalDias = Math.max(0, Math.floor((hoje - dum) / (24*60*60*1000)));
    semanas = Math.floor(totalDias / 7);
    const dias = totalDias % 7;
    ig = `${semanas}s ${dias}d`;
    const dppDate = new Date(dum); dppDate.setDate(dppDate.getDate()+280);
    dppCalc = dppDate.toISOString().split('T')[0];
  }
  return { ig, semanas, dppCalc };
}

function _gestanteAlertaBronquiolite(ficha, semanas) {
  if (!ficha.dum) return '';
  const emJanela = semanas >= 26 && semanas <= 30;
  const tomada = ficha.vacinaBronquiolite;
  if (tomada) return `<div style="display:flex;align-items:center;gap:var(--sp-2);padding:6px 10px;background:var(--verde-fraco);border-radius:var(--r-sm);font-size:var(--text-xs);color:var(--verde);font-weight:600;margin-bottom:var(--sp-2);">✅ Vacina bronquiolite (VRS) confirmada</div>`;
  if (emJanela) return `<div style="display:flex;align-items:center;gap:var(--sp-2);padding:var(--sp-2) 12px;background:var(--amarelo-bg,rgba(255,117,51,.10));border:1px solid var(--amarelo-bdr,rgba(255,117,51,.22));border-radius:var(--r-sm);font-size:var(--text-xs);color:var(--orange-700,#cc5200);font-weight:600;margin-bottom:var(--sp-2);">⚠️ Atenção: gestante está na janela da vacina VRS (bronquiolite) — 28ª semana. Vacina ainda não confirmada!</div>`;
  if (semanas > 30) return `<div style="display:flex;align-items:center;gap:var(--sp-2);padding:6px 10px;background:var(--vermelho-fraco);border-radius:var(--r-sm);font-size:var(--text-xs);color:var(--vermelho);font-weight:600;margin-bottom:var(--sp-2);">⚠️ Janela da vacina VRS (28ª sem.) já passou — verificar com serviço de saúde</div>`;
  return `<div style="font-size:var(--text-xs);color:var(--cinza-400);margin-bottom:var(--sp-2);font-style:italic;">Vacina VRS/bronquiolite recomendada na 28ª semana (atualmente: ${semanas}ª sem.)</div>`;
}

function _gestanteConsultasHtml(ficha, iid) {
  const consultasPrenatal = ficha.consultasPrenatal || [];
  return Array.from({length: 8}, (_, i) => {
    const c = consultasPrenatal[i] || {};
    const dataExib = c.data ? c.data.split('-').reverse().join('/') : '';
    return `<div style="display:grid;grid-template-columns:32px 1fr 1fr auto;gap:var(--sp-2);align-items:start;padding:6px 8px;background:${c.compareceu?'var(--verde-fraco)':'var(--cinza-50)'};border-radius:var(--r-sm);border:1px solid ${c.compareceu?'var(--verde-bdr)':'var(--cinza-200)'};">
      <div style="font-size:var(--text-xs);font-weight:700;color:var(--cinza-500);text-align:center;padding-top:18px;">${i+1}ª</div>
      <div>
        <label style="font-size:var(--text-2xs);color:var(--cinza-500)">Data (dd/mm/aaaa)</label>
        <input type="text" class="input" style="font-size:var(--text-xs);padding:var(--sp-1) 6px;font-family:var(--font-mono);"
          maxlength="10" placeholder="dd/mm/aaaa" value="${dataExib}"
          oninput="mascararData(this);calcIGConsulta(this,${iid},${i})"
          onchange="salvarConsultaPrenatalDataTexto(${iid},${i},this.value)">
        <div id="cdata-erro-${iid}-${i}" style="font-size:9px;color:var(--vermelho);min-height:12px"></div>
      </div>
      <div>
        <label style="font-size:var(--text-2xs);color:var(--cinza-500)">IG na consulta</label>
        <input type="text" id="ig-consulta-${iid}-${i}" class="input" style="font-size:var(--text-xs);padding:var(--sp-1) 6px;background:var(--cinza-50);font-weight:600;color:var(--azul);"
          placeholder="calculada auto" value="${c.igConsulta||''}" readonly></div>
      <label style="display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;padding-top:14px;">
        <input type="checkbox" ${c.compareceu?'checked':''} onchange="salvarConsultaPrenatal(${iid},${i},'compareceu',this.checked)">
        <span style="font-size:9px;color:var(--cinza-500)">Compar.</span>
      </label>
    </div>`;
  }).join('');
}

function _gestanteExamesHtml(ficha, iid) {
  const examesSangue = [
    {key:'exameTipagem', label:'Tipagem sanguínea e Rh'},
    {key:'exameHemograma', label:'Hemograma completo'},
    {key:'exameGlicemia', label:'Glicemia de jejum'},
    {key:'exameSifilis', label:'VDRL (Sífilis)'},
    {key:'exameHiv', label:'HIV'},
    {key:'exameHepatiteB', label:'HBsAg (Hepatite B)'},
    {key:'exameHepatiteC', label:'Anti-HCV (Hepatite C)'},
    {key:'exameToxoplasmose', label:'Toxoplasmose IgM/IgG'},
    {key:'exameRubeolaCompleto', label:'Rubéola IgG'},
    {key:'exameUrina', label:'EAS / Urocultura'},
    {key:'exameTsh', label:'TSH (Tireoide)'},
    {key:'exameStrep', label:'Streptococcus B (35-37ª sem.)'},
  ];
  const examesUltrassom = [
    {key:'usgMorfologico', label:'USG Morfológico (11-14ª sem.)', semRef:'11-14'},
    {key:'usgSegundo', label:'USG Morfológico 2º tri (20-24ª sem.)', semRef:'20-24'},
    {key:'usgTerceiro', label:'USG 3º trimestre (30-33ª sem.)', semRef:'30-33'},
    {key:'usgDoppler', label:'USG Doppler (se indicado)', semRef:''},
  ];
  return `
    <div class="card ficha-section-compact">
      <div class="ficha-section-title primary">🩸 Exames de Sangue</div>
      <div class="grid-auto">
        ${examesSangue.map(e => `
        <div style="display:flex;align-items:center;gap:var(--sp-2);padding:7px 10px;background:${ficha[e.key+'Ok']?'var(--verde-fraco)':'var(--cinza-50)'};border:1px solid ${ficha[e.key+'Ok']?'var(--verde-bdr)':'var(--cinza-200)'};border-radius:var(--r-sm);">
          <label style="display:flex;align-items:center;gap:var(--sp-2);flex:1;cursor:pointer;min-width:0;">
            <input type="checkbox" ${ficha[e.key+'Ok']?'checked':''} onchange="salvarFichaCampo('gestante',${iid},'${e.key}Ok',this.checked)">
            <span style="${_fh.xs8()}">${e.label}</span>
          </label>
          <input type="text" class="input date-input" style="width:110px;font-size:var(--text-xs);padding:3px 6px;font-family:var(--font-mono)" maxlength="10" placeholder="dd/mm/aaaa" value="${ficha[e.key+'Data'] ? _isoToBR(ficha[e.key+'Data']) : ''}" oninput="mascararData(this)" onchange="salvarFichaCampoDataTexto('gestante',${iid},'${e.key}Data',this.value)" title="Data do resultado">
          <input type="text" class="input" style="width:90px;font-size:var(--text-xs);padding:3px 6px;" value="${ficha[e.key+'Result']||''}" onchange="salvarFichaCampo('gestante',${iid},'${e.key}Result',this.value)" placeholder="Resultado">
        </div>`).join('')}
      </div>
    </div>
    <div class="card" style="${_fh.p4()}">
      <div class="ficha-section-title primary">🔬 Ultrassonografias</div>
      <div class="grid-auto">
        ${examesUltrassom.map(e => `
        <div style="border:1px solid ${ficha[e.key+'Ok']?'var(--verde-bdr)':'var(--cinza-200)'};border-radius:var(--r-sm);padding:10px 12px;background:${ficha[e.key+'Ok']?'var(--verde-fraco)':'var(--surface)'};">
          <div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:${ficha[e.key+'Ok']?'8':'0'}px;">
            <label style="display:flex;align-items:center;gap:var(--sp-2);flex:1;cursor:pointer;">
              <input type="checkbox" ${ficha[e.key+'Ok']?'checked':''} onchange="salvarFichaCampo('gestante',${iid},'${e.key}Ok',this.checked)">
              <div>
                <div style="font-size:var(--text-xs);font-weight:700;color:var(--cinza-800)">${e.label}</div>
                ${e.semRef?`<div style="font-size:var(--text-2xs);color:var(--cinza-500)">Semanas: ${e.semRef}</div>`:''}
              </div>
            </label>
            ${ficha[e.key+'Ok']?`<span style="font-size:var(--text-2xs);padding:2px 8px;border-radius:var(--r-sm);background:var(--verde);color:white;font-weight:600;">✓ Realizado</span>`:''}
          </div>
          ${ficha[e.key+'Ok']?`<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2);padding-top:8px;border-top:1px solid var(--verde-bdr);">
            <div><label style="font-size:var(--text-2xs);color:var(--cinza-600)">Data</label>
              <input type="text" class="input date-input" style="margin-top:2px;font-size:var(--text-xs);font-family:var(--font-mono)" maxlength="10" placeholder="dd/mm/aaaa" value="${ficha[e.key+'Data'] ? _isoToBR(ficha[e.key+'Data']) : ''}" oninput="mascararData(this)" onchange="salvarFichaCampoDataTexto('gestante',${iid},'${e.key}Data',this.value)"></div>
            <div><label style="font-size:var(--text-2xs);color:var(--cinza-600)">IG na data</label>
              <input type="text" class="input" style="${_fh.mt2()}" placeholder="ex: 12s 1d" value="${ficha[e.key+'IG']||''}" onchange="salvarFichaCampo('gestante',${iid},'${e.key}IG',this.value)"></div>
            <div style="grid-column:span 2;"><label style="font-size:var(--text-2xs);color:var(--cinza-600)">Observação do laudo</label>
              <textarea class="input" rows="2" style="font-size:var(--text-xs);margin-top:2px;" onchange="salvarFichaCampo('gestante',${iid},'${e.key}Obs',this.value)">${ficha[e.key+'Obs']||''}</textarea></div>
          </div>`:''}
        </div>`).join('')}
      </div>
    </div>`;
}

function _gestantePrenatalHtml(ficha, iid, consultasHtml) {
  return `
    <div class="card ficha-section-compact">
      <div style="font-weight:700;margin-bottom:var(--sp-1);color:var(--azul);">🩺 Consultas de Pré-natal</div>
      <div style="font-size:var(--text-xs);color:var(--cinza-500);margin-bottom:var(--sp-3);">Mínimo recomendado: 6 consultas. Marque "Compar." para confirmar presença.</div>
      <div class="grid-auto">${consultasHtml}</div>
      <div style="margin-top:var(--sp-3);display:grid;grid-template-columns:repeat(2,1fr);gap:var(--sp-3);">
        <div><label class="ficha-label-muted">Total de consultas realizadas</label>
          <input type="number" class="input" value="${(ficha.consultasPrenatal||[]).filter(c=>c.compareceu).length}" readonly style="background:var(--cinza-100);font-weight:700;color:var(--verde)"></div>
        <div><label class="ficha-label-muted">Próxima consulta agendada</label>
          <input type="text" class="input" maxlength="10"
            value="${ficha.proximaConsulta ? ficha.proximaConsulta.split('-').reverse().join('/') : ''}"
            placeholder="dd/mm/aaaa" style="font-family:var(--font-mono)"
            oninput="mascararData(this)"
            onchange="salvarFichaCampoDataTexto('gestante',${iid},'proximaConsulta',this.value)">
          </div>
      </div>
    </div>
`;
}

function _gestanteMedicacoesHtml(ficha, iid, meds) {
  return `
    <div class="card ficha-section-compact">
      <div class="ficha-section-title primary">💊 Suplementação Obrigatória</div>
      <div class="grid-auto">
        <div style="border:1px solid ${ficha.sulfatoFerroso?'var(--verde-bdr)':'var(--cinza-200)'};border-radius:var(--r-sm);padding:10px 12px;background:${ficha.sulfatoFerroso?'var(--verde-fraco)':'var(--surface)'};">
          <label class="ficha-check-row-lg">
            <input type="checkbox" ${ficha.sulfatoFerroso?'checked':''} onchange="salvarFichaCampo('gestante',${iid},'sulfatoFerroso',this.checked)">
            <div>
              <div style="font-size:var(--text-sm);font-weight:700;color:var(--cinza-800)">Sulfato Ferroso</div>
              <div style="${_fh.xs()}">40mg de ferro elementar/dia · Via oral · Recomendado em toda gestação</div>
            </div>
            ${ficha.sulfatoFerroso?`${_fh.badgeOk()}`:`${_fh.badgeNo()}`}
          </label>
          ${ficha.sulfatoFerroso?`<div style="margin-top:var(--sp-2);padding-top:8px;border-top:1px solid var(--verde-bdr);display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2);">
            <div><label style="${_fh.xs6()}">Dose prescrita</label>
              <input type="text" class="input" style="${_fh.mt2()}" value="${ficha.sulfatoFerrosoDose||'40mg 1x/dia'}" onchange="salvarFichaCampo('gestante',${iid},'sulfatoFerrosoDose',this.value)"></div>
            <div><label style="${_fh.xs6()}">Faz uso regular?</label>
              <select class="input" style="${_fh.mt2()}" onchange="salvarFichaCampo('gestante',${iid},'sulfatoFerrosoAdesao',this.value)">
                <option value="">Selecione</option>
                ${['Sim, regularmente','Às vezes (esquece)','Raramente','Não usa'].map(o=>`<option value="${o}" ${ficha.sulfatoFerrosoAdesao===o?'selected':''}>${o}</option>`).join('')}
              </select></div>
          </div>`:''}
        </div>
        <div style="border:1px solid ${ficha.acidoFolico?'var(--verde-bdr)':'var(--cinza-200)'};border-radius:var(--r-sm);padding:10px 12px;background:${ficha.acidoFolico?'var(--verde-fraco)':'var(--surface)'};">
          <label class="ficha-check-row-lg">
            <input type="checkbox" ${ficha.acidoFolico?'checked':''} onchange="salvarFichaCampo('gestante',${iid},'acidoFolico',this.checked)">
            <div>
              <div style="font-size:var(--text-sm);font-weight:700;color:var(--cinza-800)">Ácido Fólico</div>
              <div style="${_fh.xs()}">400–800mcg/dia · Via oral · Idealmente iniciado antes da gestação</div>
            </div>
            ${ficha.acidoFolico?`${_fh.badgeOk()}`:`${_fh.badgeNo()}`}
          </label>
          ${ficha.acidoFolico?`<div style="margin-top:var(--sp-2);padding-top:8px;border-top:1px solid var(--verde-bdr);display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2);">
            <div><label style="${_fh.xs6()}">Dose prescrita</label>
              <input type="text" class="input" style="${_fh.mt2()}" value="${ficha.acidoFolicoDose||'400mcg 1x/dia'}" onchange="salvarFichaCampo('gestante',${iid},'acidoFolicoDose',this.value)"></div>
            <div><label style="${_fh.xs6()}">Faz uso regular?</label>
              <select class="input" style="${_fh.mt2()}" onchange="salvarFichaCampo('gestante',${iid},'acidoFolicoAdesao',this.value)">
                <option value="">Selecione</option>
                ${['Sim, regularmente','Às vezes (esquece)','Raramente','Não usa'].map(o=>`<option value="${o}" ${ficha.acidoFolicoAdesao===o?'selected':''}>${o}</option>`).join('')}
              </select></div>
          </div>`:''}
        </div>
      </div>
    </div>
    <div class="card" style="${_fh.p4()}">
      <div style="font-weight:700;margin-bottom:var(--sp-1);">💊 Outras Medicações</div>
      ${meds.length === 0
        ? `<div style="font-size:var(--text-xs);color:var(--cinza-400);margin-bottom:10px;font-style:italic;">Nenhuma medicação registrada no cadastro.</div>`
        : `<div style="font-size:var(--text-xs);color:var(--cinza-500);margin-bottom:10px;">Medicações carregadas do cadastro do indivíduo:</div>
           <div style="display:grid;gap:var(--sp-1);margin-bottom:var(--sp-3);">
             ${meds.map((m,i) => `
             <div style="display:flex;align-items:center;gap:var(--sp-2);background:var(--cinza-50);border:1px solid var(--cinza-200);border-radius:var(--r-sm);padding:var(--sp-2) 10px;">
               <input type="checkbox" ${(ficha.adesaoMeds||{})[i]?'checked':''} onchange="salvarFichaAdesaoMed('gestante',${iid},${i},this.checked)">
               <div style="flex:1;min-width:0;">
                 <div style="${_fh.xs8()}">${esc(m.nome)}</div>
                 <div style="${_fh.xs()}">${[m.dose,m.freq,m.localAcesso].filter(Boolean).join(' · ')}</div>
               </div>
               <span style="font-size:var(--text-2xs);padding:2px 8px;border-radius:var(--r-sm);font-weight:600;background:${(ficha.adesaoMeds||{})[i]?'var(--verde-fraco)':'var(--cinza-100)'};color:${(ficha.adesaoMeds||{})[i]?'var(--verde)':'var(--cinza-500)'};">${(ficha.adesaoMeds||{})[i]?'Em uso':'Não confirmado'}</span>
             </div>`).join('')}
           </div>`
      }
      <div><label class="ficha-label-muted">Outras medicações / observações</label>
        <textarea class="input" rows="2" onchange="salvarFichaCampo('gestante',${iid},'medicacoesObs',this.value)">${esc(ficha.medicacoesObs||'')}</textarea></div>
    </div>`;
}

// Cada aba é gerada pelos helpers _gestante*() acima, tornando cada seção
// localizável e editável de forma independente.
function renderFichaGestante(individuoId) {
  const ind = getIndividuo(individuoId);
  if (!ind) return '';
  const ficha = (fichasAcompanhamento.gestante || {})[individuoId] || {};
  const iid = individuoId;

  const { ig, semanas, dppCalc } = _gestanteCalcIG(ficha);
  const alertaBronquiolite = _gestanteAlertaBronquiolite(ficha, semanas);
  const consultasHtml      = _gestanteConsultasHtml(ficha, iid);
  const meds               = (ind.medicacoes || []).filter(m => m?.nome);

  return `
    <div class="ficha-container">
      <!-- Barra de abas -->
      <div style="display:flex;gap:0;border-bottom:1px solid var(--cinza-200);margin-bottom:var(--sp-4);overflow-x:auto;flex-shrink:0;">
        <button id="gtabbtn-dados-${iid}"     style="${_gestanteTabStyle(true)}"  onclick="switchGestanteTab(${iid},'dados')">📅 Gestação</button>
        <button id="gtabbtn-vacinas-${iid}"   style="${_gestanteTabStyle(false)}" onclick="switchGestanteTab(${iid},'vacinas')">💉 Vacinas</button>
        <button id="gtabbtn-exames-${iid}"    style="${_gestanteTabStyle(false)}" onclick="switchGestanteTab(${iid},'exames')">🧪 Exames</button>
        <button id="gtabbtn-prenatal-${iid}"  style="${_gestanteTabStyle(false)}" onclick="switchGestanteTab(${iid},'prenatal')">🩺 Pré-natal</button>
        <button id="gtabbtn-medicacoes-${iid}" style="${_gestanteTabStyle(false)}" onclick="switchGestanteTab(${iid},'medicacoes')">💊 Medicações</button>
      </div>

      <!-- ABA: DADOS DA GESTAÇÃO -->
      <div id="gtab-dados-${iid}">
        <div class="card ficha-section-compact">
          <div class="ficha-section-title primary">📅 Dados da Gestação</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--sp-3);margin-bottom:var(--sp-3);">
            <div>
              <label class="ficha-label-muted">DUM <span style="font-size:var(--text-2xs);color:var(--cinza-400)">(dd/mm/aaaa)</span></label>
              <input type="text" id="dum-input-${iid}" class="input" maxlength="10"
                value="${ficha.dum ? ficha.dum.split('-').reverse().join('/') : ''}"
                placeholder="dd/mm/aaaa"
                oninput="mascararData(this);atualizarIG(${iid})"
                style="font-family:var(--font-mono)">
              <div id="dum-erro-${iid}" style="font-size:var(--text-2xs);color:var(--vermelho);margin-top:2px;min-height:14px"></div>
            </div>
            <div><label class="ficha-label-muted">IG (calculada automaticamente)</label>
              <input type="text" id="ig-display-${iid}" class="input" value="${ig}" readonly style="background:var(--cinza-100);font-weight:700;color:var(--azul)"></div>
            <div>
              <label class="ficha-label-muted">DPP <span style="font-size:var(--text-2xs);color:var(--cinza-400)">(dd/mm/aaaa)</span></label>
              <input type="text" id="dpp-input-${iid}" class="input" maxlength="10"
                value="${(ficha.dpp||dppCalc) ? (ficha.dpp||dppCalc).split('-').reverse().join('/') : ''}"
                placeholder="dd/mm/aaaa"
                oninput="mascararData(this)"
                onchange="this.dataset.editado='1';salvarFichaCampoDataTexto('gestante',${iid},'dpp',this.value)"
                style="font-family:var(--font-mono)">
              <div id="dpp-erro-${iid}" style="font-size:var(--text-2xs);color:var(--vermelho);margin-top:2px;min-height:14px"></div>
            </div>
            <div><label class="ficha-label-muted">Nº da Gestação</label>
              <input type="number" class="input" value="${ficha.gestacaoNum||''}" onchange="salvarFichaCampo('gestante',${iid},'gestacaoNum',this.value)"></div>
            <div><label class="ficha-label-muted">Tipo de Gestação</label>
              <select class="input" onchange="salvarFichaCampo('gestante',${iid},'tipoGestacao',this.value)">
                <option value="">Selecione</option>
                ${['Única','Gemelar','Trigemelar ou mais'].map(o=>`<option value="${o}" ${ficha.tipoGestacao===o?'selected':''}>${o}</option>`).join('')}
              </select></div>
            <div><label class="ficha-label-muted">Risco Gestacional</label>
              <select class="input" onchange="salvarFichaCampo('gestante',${iid},'risco',this.value)">
                <option value="">Selecione</option>
                ${['Habitual (baixo risco)','Alto risco'].map(o=>`<option value="${o}" ${ficha.risco===o?'selected':''}>${o}</option>`).join('')}
              </select></div>
          </div>
          ${ficha.risco==='Alto risco'?`<div style="padding:var(--sp-2) 12px;background:var(--vermelho-fraco);border-radius:var(--r-sm);font-size:var(--text-xs);color:var(--vermelho);font-weight:600;margin-bottom:var(--sp-3);">⚠️ Gestante de ALTO RISCO — acompanhamento especializado necessário</div>`:''}
          <div style="border-top:1px solid var(--cinza-200);padding-top:12px;margin-top:var(--sp-1);">
            <div style="font-size:var(--text-xs);font-weight:700;color:var(--cinza-700);margin-bottom:var(--sp-2);">📋 Antecedentes Clínicos</div>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--sp-1);">
              ${['antHas:Hipertensão Arterial','antDm:Diabetes Mellitus','antCardiopatia:Cardiopatia','antNefropatia:Nefropatia','antAnemia:Anemia','antDepressao:Depressão/Transtorno mental','antCirurgiaAnterior:Cirurgia anterior','antPerdaGestacaoAnterior:Perda gestacional anterior','antPretermoAnterior:Parto prematuro anterior','antCesareaAnterior:Cesárea anterior'].map(f=>{
                const [key,label]=f.split(':');
                return `<label class="ficha-check-row"><input type="checkbox" ${ficha[key]?'checked':''} onchange="salvarFichaCampo('gestante',${iid},'${key}',this.checked)"><span style="font-size:var(--text-xs);">${label}</span></label>`;
              }).join('')}
            </div>
            <div style="margin-top:10px;"><label class="ficha-label-muted">Outros antecedentes</label>
              <textarea class="input" rows="2" onchange="salvarFichaCampo('gestante',${iid},'antOutros',this.value)">${ficha.antOutros||''}</textarea></div>
          </div>
          <div style="border-top:1px solid var(--cinza-200);padding-top:12px;margin-top:var(--sp-3);">
            <div style="font-size:var(--text-xs);font-weight:700;color:var(--cinza-700);margin-bottom:var(--sp-2);">🦷 Avaliação Odontológica</div>
            <div class="grid-auto">
              <label class="ficha-check-row"><input type="checkbox" ${ficha.odontologiaEncaminhada?'checked':''} onchange="salvarFichaCampo('gestante',${iid},'odontologiaEncaminhada',this.checked)"><span style="font-size:var(--text-xs);">Encaminhada para avaliação odontológica</span></label>
              <label class="ficha-check-row"><input type="checkbox" ${ficha.odontologiaRealizada?'checked':''} onchange="salvarFichaCampo('gestante',${iid},'odontologiaRealizada',this.checked)"><span style="font-size:var(--text-xs);">Consulta odontológica realizada</span></label>
              <label class="ficha-check-row"><input type="checkbox" ${ficha.odontologiaTratamento?'checked':''} onchange="salvarFichaCampo('gestante',${iid},'odontologiaTratamento',this.checked)"><span style="font-size:var(--text-xs);">Em tratamento odontológico</span></label>
              <div><label class="ficha-label-muted">Data da consulta odontológica</label>
                <input type="text" class="input date-input" maxlength="10" placeholder="dd/mm/aaaa" value="${ficha.odontologiaData ? _isoToBR(ficha.odontologiaData) : ''}" oninput="mascararData(this)" onchange="salvarFichaCampoDataTexto('gestante',${iid},'odontologiaData',this.value)"></div>
            </div>
          </div>
        </div>
        <div class="card ficha-section-compact">
          <div class="ficha-section-title">📊 Dados Clínicos Atuais</div>
          <div class="grid-3">
            <div><label class="ficha-label-muted">PA Sistólica</label>
              <input type="number" class="input" value="${ficha.paSistolica||''}" onchange="salvarFichaCampo('gestante',${iid},'paSistolica',this.value)"></div>
            <div><label class="ficha-label-muted">PA Diastólica</label>
              <input type="number" class="input" value="${ficha.paDiastolica||''}" onchange="salvarFichaCampo('gestante',${iid},'paDiastolica',this.value)"></div>
            <div><label class="ficha-label-muted">Peso (kg)</label>
              <input type="number" class="input" step="0.1" value="${ficha.peso||''}" onchange="salvarFichaCampo('gestante',${iid},'peso',this.value)"></div>
          </div>
        </div>

      </div>

      <!-- ABA: VACINAS -->
      <div id="gtab-vacinas-${iid}" style="display:none;">
        <div class="card ficha-section-compact">
          <div class="ficha-section-title primary">💉 Vacinas na Gestação</div>
          <div style="display:grid;gap:var(--sp-2);">

            ${[
              {key:'vacinaDuplaAdulto', label:'dT — Dupla Adulto', obs:'Esquema: 3 doses (D1/D2/D3 ou reforço)'},
              {key:'vacinaDtpa', label:'dTpa — Tríplice Bacteriana Adulto', obs:'A partir da 20ª semana (ideal 27-36ª sem.)'},
              {key:'vacinaHepatiteB', label:'Hepatite B', obs:'Esquema completo (3 doses)'},
              {key:'vacinaInfluenza', label:'Influenza (Gripe)', obs:'Dose anual'},
            ].map(v => `
            <div style="border:1px solid var(--cinza-200);border-radius:var(--r-sm);padding:10px 12px;background:${ficha[v.key]?'var(--verde-fraco)':'var(--surface)'};">
              <label class="ficha-check-row-lg">
                <input type="checkbox" ${ficha[v.key]?'checked':''} onchange="salvarFichaCampo('gestante',${iid},'${v.key}',this.checked)">
                <div>
                  <div style="font-size:var(--text-xs);font-weight:700;color:var(--cinza-800)">${v.label}</div>
                  <div style="${_fh.xs()}">${v.obs}</div>
                </div>
                ${ficha[v.key]?`${_fh.badgeOk("✓ Aplicada")}`:''}
              </label>
              ${ficha[v.key]?`<div style="margin-top:var(--sp-2);padding-top:8px;border-top:1px solid var(--verde-bdr);">
                <label style="${_fh.xs6()}">Data de aplicação</label>
                <input type="text" class="input date-input" style="margin-top:3px;font-family:var(--font-mono)" maxlength="10" placeholder="dd/mm/aaaa" value="${ficha[v.key+'Data'] ? _isoToBR(ficha[v.key+'Data']) : ''}" oninput="mascararData(this)" onchange="salvarFichaCampoDataTexto('gestante',${iid},'${v.key}Data',this.value)">
              </div>`:''}
            </div>`).join('')}

            <!-- Bronquiolite / VRS — 28ª semana -->
            ${alertaBronquiolite}
            <div style="border:1px solid ${ficha.vacinaBronquiolite?'var(--verde-bdr)':'var(--orange-400)'};border-radius:var(--r-sm);padding:10px 12px;background:${ficha.vacinaBronquiolite?'var(--verde-fraco)':'var(--orange-bg)'};">
              <label class="ficha-check-row-lg">
                <input type="checkbox" ${ficha.vacinaBronquiolite?'checked':''} onchange="salvarFichaCampo('gestante',${iid},'vacinaBronquiolite',this.checked)">
                <div>
                  <div style="font-size:var(--text-xs);font-weight:700;color:var(--cinza-800)">VRS — Bronquiolite (Beyfortus/Abrysvo)</div>
                  <div style="${_fh.xs()}">Recomendada na <strong>28ª semana</strong> de gestação · Protege o bebê ao nascer</div>
                </div>
                ${ficha.vacinaBronquiolite?`${_fh.badgeOk("✓ Aplicada")}`:''}
              </label>
              ${ficha.vacinaBronquiolite?`<div style="margin-top:var(--sp-2);padding-top:8px;border-top:1px solid var(--verde-bdr);">
                <label style="${_fh.xs6()}">Data de aplicação</label>
                <input type="text" class="input date-input" style="margin-top:3px;font-family:var(--font-mono)" maxlength="10" placeholder="dd/mm/aaaa" value="${ficha.vacinaBronquioliteData ? _isoToBR(ficha.vacinaBronquioliteData) : ''}" oninput="mascararData(this)" onchange="salvarFichaCampoDataTexto('gestante',${iid},'vacinaBronquioliteData',this.value)">
              </div>`:''}
            </div>

          </div>
        </div>
      </div>

      <!-- ABA: EXAMES -->
      <div id="gtab-exames-${iid}" style="display:none;">
        ${_gestanteExamesHtml(ficha, iid)}
      </div>

      <!-- ABA: PRÉ-NATAL -->
      <div id="gtab-prenatal-${iid}" style="display:none;">
        ${_gestantePrenatalHtml(ficha, iid, consultasHtml)}
      </div>

      <!-- ABA: MEDICAÇÕES -->
      <div id="gtab-medicacoes-${iid}" style="display:none;">
        ${_gestanteMedicacoesHtml(ficha, iid, meds)}
      </div>

      ${_cardRegistrarVisita('gestante', individuoId)}
    </div>`;
}


// ============================================
// FICHA CONSUMO ALIMENTAR
// ============================================
function renderFichaConsumoAlimentar(individuoId) {
  const ind = getIndividuo(individuoId);
  if (!ind) return '';
  const ficha = (fichasAcompanhamento.consumoAlimentar || {})[individuoId] || {};
  const idadeMeses = Math.floor(getIdadeEmMeses(ind.nasc) ?? 0);
  const isMenos6 = idadeMeses < 6;
  const isMenos24 = idadeMeses < 24;

  const secaoAlimentar = isMenos6 ? `
    <div class="card ficha-section">
      <div class="ficha-section-title">🍼 Aleitamento (menos de 6 meses)</div>
      <div style="margin-bottom:var(--sp-3);">
        <div class="ficha-sub" style="${_fh.bold6()}">A criança está mamando no peito?</div>
        <div style="display:flex;gap:var(--sp-4);">
          <label class="ficha-check-row"><input type="radio" name="aleit_${individuoId}" value="sim" ${ficha.aleitamento==='sim'?'checked':''} onchange="salvarFichaCampo('consumoAlimentar',${individuoId},'aleitamento','sim')"><span>Sim</span></label>
          <label class="ficha-check-row"><input type="radio" name="aleit_${individuoId}" value="nao" ${ficha.aleitamento==='nao'?'checked':''} onchange="salvarFichaCampo('consumoAlimentar',${individuoId},'aleitamento','nao')"><span>Não</span></label>
        </div>
      </div>
      <div class="ficha-sub" style="${_fh.bold6()}">Outros alimentos consumidos:</div>
      <div class="grid-auto">
        ${['agua:Água','cha:Chá','suco:Suco','leiteNaoMaterno:Leite não materno','papa:Papinha/comida'].map(f=>{
          const [key,label]=f.split(':');
          return `<label class="ficha-check-row"><input type="checkbox" ${ficha[key]?'checked':''} onchange="salvarFichaCampo('consumoAlimentar',${individuoId},'${key}',this.checked)"><span>${label}</span></label>`;
        }).join('')}
      </div>
    </div>` : isMenos24 ? `
    <div class="card ficha-section">
      <div class="ficha-section-title">🥣 Consumo Alimentar (6 a 24 meses)</div>
      <div class="ficha-sub" style="${_fh.bold6()}">No dia anterior consumiu:</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--sp-1);margin-bottom:var(--sp-3);">
        ${['fruta:🍎 Fruta','verdura:🥬 Verdura/legume','carne:🥩 Carne/ovo','feijao:🫘 Feijão','cereal:🍚 Arroz/macarrão','leiteDerivados:🥛 Leite e derivados'].map(f=>{
          const [key,label]=f.split(':');
          return `<label class="ficha-check-row"><input type="checkbox" ${ficha[key]?'checked':''} onchange="salvarFichaCampo('consumoAlimentar',${individuoId},'${key}',this.checked)"><span>${label}</span></label>`;
        }).join('')}
      </div>
      <div class="ficha-sub" style="${_fh.bold6()}">Alimentos não recomendados:</div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--sp-1);">
        ${['refrigerante:🥤 Refrigerante','sucoIndustrializado:🧃 Suco industrializado','salgadinho:🍟 Salgadinho/biscoito','doces:🍬 Doces/guloseimas'].map(f=>{
          const [key,label]=f.split(':');
          return `<label class="ficha-check-row"><input type="checkbox" ${ficha[key]?'checked':''} onchange="salvarFichaCampo('consumoAlimentar',${individuoId},'${key}',this.checked)"><span>${label}</span></label>`;
        }).join('')}
      </div>
    </div>` : `
    <div class="card ficha-section">
      <div class="ficha-section-title">🥗 Marcadores de Consumo Alimentar</div>
      <div class="ficha-sub" style="${_fh.bold6()}">No dia anterior consumiu:</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--sp-1);">
        ${['feijao:Feijão','frutasFrescas:Frutas frescas','verdurasLegumes:Verduras/legumes','hamburguer:Hambúrguer/embutidos','bebidasAdocadas:Bebidas açucaradas','macarraoInstantaneo:Macarrão instantâneo','biscoitosSalgados:Biscoitos salgados','biscoitosDoces:Biscoitos doces'].map(f=>{
          const [key,label]=f.split(':');
          return `<label class="ficha-check-row"><input type="checkbox" ${ficha[key]?'checked':''} onchange="salvarFichaCampo('consumoAlimentar',${individuoId},'${key}',this.checked)"><span>${label}</span></label>`;
        }).join('')}
      </div>
    </div>`;

  return `
    <div class="ficha-container">
      <div class="card ficha-section">
        <div class="ficha-section-title">👶 Dados</div>
        <div class="grid-3">
          <div><label class="ficha-label-muted">Idade</label>
            <input type="text" class="input" value="${idadeMeses} meses" readonly style="background:var(--cinza-100)"></div>
          <div><label class="ficha-label-muted">Peso (kg)</label>
            <input type="number" class="input" step="0.01" value="${ficha.peso||''}" onchange="salvarFichaCampo('consumoAlimentar',${individuoId},'peso',this.value)"></div>
          <div><label class="ficha-label-muted">Altura (cm)</label>
            <input type="number" class="input" step="0.1" value="${ficha.altura||''}" onchange="salvarFichaCampo('consumoAlimentar',${individuoId},'altura',this.value)"></div>
        </div>
      </div>
      ${secaoAlimentar}
      ${_cardRegistrarVisita('consumoAlimentar', individuoId)}
    </div>`;
}

// ============================================
// FICHA HANSENÍASE
// ============================================
function renderFichaHans(individuoId) {
  const ind = getIndividuo(individuoId);
  if (!ind) return '';
  const ficha = fichasAcompanhamento.hans[individuoId] || {};
  return `
    <div class="ficha-container">
      <div class="card ficha-section">
        <div class="ficha-section-title">🔬 Sintomas Neurológicos</div>
        <div class="grid-2">
          ${['dormenciaMaos:Dormência nas mãos','dormenciaPes:Dormência nos pés','formigamentos:Formigamentos','areasAdormecidas:Áreas adormecidas na pele','caimbras:Câimbras','picadas:Sensação de picadas/agulhadas'].map(f=>{
            const [key,label]=f.split(':');
            return `<label class="ficha-check-row"><input type="checkbox" ${ficha[key]?'checked':''} onchange="salvarFichaCampo('hans',${individuoId},'${key}',this.checked)"><span>${label}</span></label>`;
          }).join('')}
        </div>
      </div>
      <div class="card ficha-section">
        <div class="ficha-section-title">🔴 Lesões de Pele</div>
        <div class="grid-2">
          ${['manchasPele:Manchas na pele','dorNervos:Dor nos nervos','carocosCorpo:Caroços no corpo','inchacoMaosPes:Inchaço nas mãos e pés','inchacoRosto:Inchaço no rosto','perdaCilios:Perda dos cílios/sobrancelhas'].map(f=>{
            const [key,label]=f.split(':');
            return `<label class="ficha-check-row"><input type="checkbox" ${ficha[key]?'checked':''} onchange="salvarFichaCampo('hans',${individuoId},'${key}',this.checked)"><span>${label}</span></label>`;
          }).join('')}
        </div>
      </div>
      <div class="card ficha-section">
        <div class="ficha-section-title">💪 Fraqueza Muscular</div>
        <div class="grid-2">
          ${['dificuldadeAbotoar:Dificuldade de abotoar camisa','dificuldadeOculos:Dificuldade de pegar óculos','dificuldadeEscrever:Dificuldade de escrever','dificuldadeSegurarPanela:Dificuldade de segurar panelas','dificuldadeCalcar:Dificuldade de calçar chinelos','dificuldadeManterChinelos:Dificuldade de manter chinelos'].map(f=>{
            const [key,label]=f.split(':');
            return `<label class="ficha-check-row"><input type="checkbox" ${ficha[key]?'checked':''} onchange="salvarFichaCampo('hans',${individuoId},'${key}',this.checked)"><span>${label}</span></label>`;
          }).join('')}
        </div>
      </div>
      <div class="card ficha-section">
        <div class="ficha-section-title">📊 Classificação</div>
        <div style="display:grid;gap:var(--sp-3);">
          <div><label class="ficha-label-muted">Número de lesões</label>
            <input type="number" class="input" value="${ficha.numeroLesoes||''}" onchange="salvarFichaCampo('hans',${individuoId},'numeroLesoes',this.value)"></div>
          <div><label class="ficha-label-muted">Classificação operacional</label>
            <select class="input" onchange="salvarFichaCampo('hans',${individuoId},'classificacao',this.value)">
              <option value="">Selecione</option>
              <option value="paucibacilar" ${ficha.classificacao==='paucibacilar'?'selected':''}>Paucibacilar (até 5 lesões)</option>
              <option value="multibacilar" ${ficha.classificacao==='multibacilar'?'selected':''}>Multibacilar (mais de 5 lesões)</option>
            </select></div>
          <div><label class="ficha-label-muted">Grau de incapacidade física</label>
            <select class="input" onchange="salvarFichaCampo('hans',${individuoId},'grauIncapacidade',this.value)">
              <option value="">Selecione</option>
              <option value="0" ${ficha.grauIncapacidade==='0'?'selected':''}>Grau 0 (sem alterações)</option>
              <option value="1" ${ficha.grauIncapacidade==='1'?'selected':''}>Grau 1 (diminuição da sensibilidade)</option>
              <option value="2" ${ficha.grauIncapacidade==='2'?'selected':''}>Grau 2 (lesões tróficas/deficiências)</option>
            </select></div>
        </div>
      </div>
      ${_cardRegistrarVisita('hans', individuoId)}
    </div>`;
}

// ============================================
// FUNÇÃO PRINCIPAL - ABRIR FICHA

// ============================================
// FICHA DOMICILIADOS / ACAMADOS
// ============================================
function renderFichaAcamado(individuoId) {
  const ind = getIndividuo(individuoId);
  if (!ind) return '<div style="padding:24px;text-align:center;color:var(--slate-500)">Paciente não encontrado.</div>';
  const ficha = (fichasAcompanhamento.acamado || {})[individuoId] || {};

  return `
    <div class="ficha-container">
      <div class="card ficha-section">
        <div class="ficha-section-title muted">🛏️ Situação Atual</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3)">
          <div>
            <label class="ficha-label">Condição</label>
            <select class="input" onchange="salvarFichaCampo('acamado',${individuoId},'condicao',this.value)">
              <option value="">Selecione</option>
              <option value="acamado" ${ficha.condicao==='acamado'?'selected':''}>Acamado (não sai do leito)</option>
              <option value="domiciliado" ${ficha.condicao==='domiciliado'?'selected':''}>Domiciliado (restrito ao lar)</option>
              <option value="cadeirante" ${ficha.condicao==='cadeirante'?'selected':''}>Cadeirante</option>
              <option value="semimobil" ${ficha.condicao==='semimobil'?'selected':''}>Semimóvel (sai com ajuda)</option>
            </select>
          </div>
          <div>
            <label class="ficha-label">Cuidador responsável</label>
            <input type="text" class="input" value="${ficha.cuidador||''}"
              onchange="salvarFichaCampo('acamado',${individuoId},'cuidador',this.value)"
              placeholder="Nome do cuidador">
          </div>
        </div>
      </div>

      <div class="card ficha-section">
        <div class="ficha-section-title muted">🩺 Necessidades de Saúde</div>
        <div class="grid-2">
          ${[
            ['sonda','Sonda nasogástrica'],
            ['gastrostomia','Gastrostomia'],
            ['oxigenio','Oxigênio domiciliar'],
            ['nebulizacao','Nebulização frequente'],
            ['curativos','Curativos frequentes'],
            ['fraldas','Uso de fraldas'],
            ['cadeirante_item','Cadeira de rodas'],
            ['andador','Andador / muleta']
          ].map(([key,label]) =>
            `<label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer">
              <input type="checkbox" ${ficha[key]?'checked':''} onchange="salvarFichaCampo('acamado',${individuoId},'${key}',this.checked)">
              <span style="font-size:var(--text-sm)">${label}</span>
            </label>`
          ).join('')}
        </div>
      </div>

      <div class="card ficha-section">
        <div class="ficha-section-title muted">🏃 Avaliação Funcional</div>
        <div style="display:grid;gap:var(--sp-3)">
          <div>
            <div style="font-size:var(--text-xs);font-weight:600;margin-bottom:6px;color:var(--slate-700)">Grau de dependência</div>
            <div style="display:flex;flex-direction:column;gap:var(--sp-1)">
              ${[
                ['total','Totalmente dependente'],
                ['parcial','Parcialmente dependente'],
                ['minima','Dependência mínima'],
                ['supervisao','Independente com supervisão']
              ].map(([v,l]) =>
                `<label style="display:flex;align-items:center;gap:var(--sp-2);font-size:var(--text-sm);cursor:pointer">
                  <input type="radio" name="dep_${individuoId}" value="${v}" ${ficha.dependencia===v?'checked':''} onchange="salvarFichaCampo('acamado',${individuoId},'dependencia','${v}')">
                  <span>${l}</span>
                </label>`
              ).join('')}
            </div>
          </div>
          <div>
            <label class="ficha-label">Risco de lesão por pressão</label>
            <select class="input" onchange="salvarFichaCampo('acamado',${individuoId},'riscoPressao',this.value)">
              <option value="">Selecione</option>
              <option value="baixo" ${ficha.riscoPressao==='baixo'?'selected':''}>Baixo risco</option>
              <option value="moderado" ${ficha.riscoPressao==='moderado'?'selected':''}>Risco moderado</option>
              <option value="alto" ${ficha.riscoPressao==='alto'?'selected':''}>Alto risco</option>
              <option value="lesao" ${ficha.riscoPressao==='lesao'?'selected':''}>Já possui lesão por pressão</option>
            </select>
          </div>
        </div>
      </div>

      ${_cardRegistrarVisita('acamado', individuoId)}
    </div>`;
}

// ============================================
// FICHA PREVENÇÃO (Papanicolau / Mamografia)
// ============================================
function renderFichaPrevencao(individuoId) {
  const ind = getIndividuo(individuoId);
  if (!ind) return '<div style="padding:24px;text-align:center;color:var(--slate-500)">Paciente não encontrada.</div>';
  const ficha = (fichasAcompanhamento.prevencao || {})[individuoId] || {};
  const idadeAnos = getIdadeEmAnos(ind.nasc) || 0;
  const elegMamo  = idadeAnos >= 40 && idadeAnos <= 69;

  // Datas direto do cadastro do indivíduo (campos papanicolau / mamografia)
  const pap  = ind.papanicolau  || '';
  const mamo = ind.mamografia   || '';

  // Calcular próximo exame (Papanicolau: a cada 3 anos após 2 normais)
  function alertaExame(dataUltimoISO, intervaloAnos) {
    if (!dataUltimoISO) return { texto: '⚠️ Sem registro', cor: 'var(--rose-500)' };
    const ultimo = new Date(dataUltimoISO);
    const proximo = new Date(ultimo);
    proximo.setFullYear(proximo.getFullYear() + intervaloAnos);
    const hoje = new Date();
    const diffMs = proximo - hoje;
    const diffDias = Math.round(diffMs / 86400000);
    if (diffDias < 0)  return { texto: `⚠️ Atrasado ${Math.abs(diffDias)}d`, cor: 'var(--rose-500)' };
    if (diffDias < 90) return { texto: `⏳ Em ${diffDias}d`, cor: 'var(--amarelo)' };
    return { texto: `✅ Em dia`, cor: 'var(--verde)' };
  }

  const statusPap  = alertaExame(ficha.ultimoExamePapData  || pap,  3);
  const statusMamo = alertaExame(ficha.ultimoExameMamoData || mamo, 2);

  return `
    <div class="ficha-container">
      <div class="card ficha-section">
        <div class="ficha-section-title muted">🔬 Papanicolau (Citologia Cervical)</div>
        <div style="display:grid;gap:var(--sp-3)">
          <div>
            <label class="ficha-label">Data do último exame realizado</label>
            <input type="text" class="input date-input" maxlength="10" placeholder="dd/mm/aaaa"
              value="${ficha.ultimoExamePapData ? _isoToBR(ficha.ultimoExamePapData) : (pap ? pap.split('-').reverse().join('/') : '')}"
              oninput="mascararData(this)"
              onchange="salvarFichaCampoDataTexto('prevencao',${individuoId},'ultimoExamePapData',this.value)">
          </div>
          <div style="${_fh.rowSb()}">
            <span style="${_fh.sm7()}">Status</span>
            <span style="font-size:var(--text-sm);font-weight:700;color:${statusPap.cor}">${statusPap.texto}</span>
          </div>
          <div>
            <label class="ficha-label">Resultado do último exame</label>
            <select class="input" onchange="salvarFichaCampo('prevencao',${individuoId},'resultadoPap',this.value)">
              <option value="">Selecione</option>
              <option value="normal" ${ficha.resultadoPap==='normal'?'selected':''}>Normal / Negativo</option>
              <option value="atipia" ${ficha.resultadoPap==='atipia'?'selected':''}>Atipia de significado indeterminado (ASC-US)</option>
              <option value="lesao_baixo" ${ficha.resultadoPap==='lesao_baixo'?'selected':''}>Lesão de baixo grau (NIC I / HPV)</option>
              <option value="lesao_alto" ${ficha.resultadoPap==='lesao_alto'?'selected':''}>Lesão de alto grau (NIC II / NIC III)</option>
              <option value="aguardando" ${ficha.resultadoPap==='aguardando'?'selected':''}>Aguardando resultado</option>
            </select>
          </div>
          <div>
            <label class="ficha-label">Próximo exame agendado</label>
            <input type="text" class="input date-input" maxlength="10" placeholder="dd/mm/aaaa"
              value="${ficha.proximoPap ? _isoToBR(ficha.proximoPap) : ''}"
              oninput="mascararData(this)"
              onchange="salvarFichaCampoDataTexto('prevencao',${individuoId},'proximoPap',this.value)">
          </div>
          <div>
            <label class="ficha-label">Encaminhamento</label>
            <select class="input" onchange="salvarFichaCampo('prevencao',${individuoId},'encaminhamentoPap',this.value)">
              <option value="">Nenhum</option>
              <option value="ubs" ${ficha.encaminhamentoPap==='ubs'?'selected':''}>UBS — coleta de novo exame</option>
              <option value="gineco" ${ficha.encaminhamentoPap==='gineco'?'selected':''}>Ginecologista</option>
              <option value="onco" ${ficha.encaminhamentoPap==='onco'?'selected':''}>Oncologia / serviço especializado</option>
            </select>
          </div>
        </div>
      </div>

      ${elegMamo ? `
      <div class="card ficha-section">
        <div class="ficha-section-title muted">🩻 Mamografia (40–69 anos)</div>
        <div style="display:grid;gap:var(--sp-3)">
          <div>
            <label class="ficha-label">Data da última mamografia realizada</label>
            <input type="text" class="input date-input" maxlength="10" placeholder="dd/mm/aaaa"
              value="${ficha.ultimoExameMamoData ? _isoToBR(ficha.ultimoExameMamoData) : (mamo ? mamo.split('-').reverse().join('/') : '')}"
              oninput="mascararData(this)"
              onchange="salvarFichaCampoDataTexto('prevencao',${individuoId},'ultimoExameMamoData',this.value)">
          </div>
          <div style="${_fh.rowSb()}">
            <span style="${_fh.sm7()}">Status (bienal)</span>
            <span style="font-size:var(--text-sm);font-weight:700;color:${statusMamo.cor}">${statusMamo.texto}</span>
          </div>
          <div>
            <label class="ficha-label">Resultado</label>
            <select class="input" onchange="salvarFichaCampo('prevencao',${individuoId},'resultadoMamo',this.value)">
              <option value="">Selecione</option>
              <option value="birads1" ${ficha.resultadoMamo==='birads1'?'selected':''}>BI-RADS 1 — Normal</option>
              <option value="birads2" ${ficha.resultadoMamo==='birads2'?'selected':''}>BI-RADS 2 — Benigno</option>
              <option value="birads3" ${ficha.resultadoMamo==='birads3'?'selected':''}>BI-RADS 3 — Provavelmente benigno</option>
              <option value="birads4" ${ficha.resultadoMamo==='birads4'?'selected':''}>BI-RADS 4 — Suspeito</option>
              <option value="birads5" ${ficha.resultadoMamo==='birads5'?'selected':''}>BI-RADS 5 — Altamente suspeito</option>
              <option value="aguardando" ${ficha.resultadoMamo==='aguardando'?'selected':''}>Aguardando resultado</option>
            </select>
          </div>
          <div>
            <label class="ficha-label">Próxima mamografia agendada</label>
            <input type="text" class="input date-input" maxlength="10" placeholder="dd/mm/aaaa"
              value="${ficha.proximoMamo ? _isoToBR(ficha.proximoMamo) : ''}"
              oninput="mascararData(this)"
              onchange="salvarFichaCampoDataTexto('prevencao',${individuoId},'proximoMamo',this.value)">
          </div>
        </div>
      </div>` : ''}

      <div class="card ficha-section">
        <div class="ficha-section-title muted">🧬 HPV / Vacinação</div>
        <div class="grid-2">
          <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer">
            <input type="checkbox" ${ficha.vacinaHpv?'checked':''} onchange="salvarFichaCampo('prevencao',${individuoId},'vacinaHpv',this.checked)">
            <span style="font-size:var(--text-sm)">Vacina HPV aplicada</span>
          </label>
          <label style="display:flex;align-items:center;gap:var(--sp-2);cursor:pointer">
            <input type="checkbox" ${ficha.orientadaDst?'checked':''} onchange="salvarFichaCampo('prevencao',${individuoId},'orientadaDst',this.checked)">
            <span style="font-size:var(--text-sm)">Orientada sobre ISTs / prevenção</span>
          </label>
        </div>
      </div>

      ${_cardRegistrarVisita('prevencao', individuoId)}
    </div>`;
}


// ============================================
// MODAL DE SELEÇÃO PARA RASTREIO
// ============================================

function abrirRastreioHans() {
  const individuos = getIndividuos();
  const agora = new Date();
  const seisMesesAtras = new Date(agora.setMonth(agora.getMonth() - 6)).toISOString().split('T')[0];

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-rastreio-hans';
  overlay.style.display = 'flex';
  

  overlay.innerHTML = `
    <div class="modal" style="max-width:800px;width:95%;max-height:min(calc(100dvh - 48px),calc(100vh - 48px));">
      <div class="modal-header">
        <h2>🔬 Rastreio de Hanseníase</h2>
        <button class="btn-close" aria-label="Fechar" title="Fechar" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div class="modal-body" style="max-height:min(calc(100dvh - 48px),calc(100vh - 48px));overflow-y:auto;padding:var(--sp-4);">
        <div style="margin-bottom:var(--sp-4);">
          <input type="text" class="input input-lg" placeholder="Buscar por nome..."
                 id="busca-individuo-rastreio" oninput="filtrarIndividuosRastreio()">
        </div>
        <div style="display:grid;gap:var(--sp-2);" id="lista-individuos-rastreio">
          ${individuos.map(ind => {
            const ultimoRastreio = (historicoFichas.hans || [])
              .filter(f => f && f.individuoId === ind.idIndividuo)
              .sort((a,b) => (b.data||'').localeCompare(a.data||''))[0];
            const precisaRastreio = !ultimoRastreio || ultimoRastreio.data < seisMesesAtras;
            const diasDesdeUltimo = ultimoRastreio
              ? Math.floor((new Date() - new Date(ultimoRastreio.data + 'T00:00:00')) / (24*3600*1000)) : null;
            return `
              <div class="individuo-rastreio-item" data-nome="${esc(ind.nome).toLowerCase()}"
                   style="display:flex;align-items:center;justify-content:space-between;padding:12px;
                          background:var(--cinza-100);border-radius:var(--radius-sm);
                          border-left:4px solid ${precisaRastreio ? 'var(--vermelho)' : 'var(--verde)'};">
                <div style="flex:1;">
                  <div style="display:flex;align-items:center;gap:var(--sp-2);">
                    <span style="font-weight:600;">${esc(ind.nome)}</span>
                    <span class="badge badge-cinza">${calcIdade(ind.nasc).texto}</span>
                  </div>
                  <div style="font-size:var(--text-xs);color:var(--cinza-600);margin-top:var(--sp-1);">
                    Família: ${getFamiliaLabel(ind.familiaId)}
                  </div>
                  ${ultimoRastreio ? `
                    <div style="font-size:var(--text-xs);color:${precisaRastreio ? 'var(--vermelho)' : 'var(--verde)'};margin-top:var(--sp-1);">
                      Último rastreio: ${formatData(ultimoRastreio.data)} (há ${diasDesdeUltimo} dias) — ${ultimoRastreio.risco || ''}
                    </div>` : `
                    <div style="font-size:var(--text-xs);color:var(--vermelho);margin-top:var(--sp-1);">Nunca rastreado</div>`}
                </div>
                <button class="btn ${precisaRastreio ? 'btn-primary' : 'btn-secondary'}"
                        onclick="aplicarFichaHans(${ind.idIndividuo})">
                  ${precisaRastreio ? 'Aplicar Rastreio' : 'Reaplicar'}
                </button>
              </div>`;
          }).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Fechar</button>
      </div>
    </div>`;

  _getOverlayRoot().appendChild(overlay);
}

function filtrarIndividuosRastreio() {
  const termo = $id('busca-individuo-rastreio').value.toLowerCase();
  document.querySelectorAll('.individuo-rastreio-item').forEach(item => {
    item.style.display = item.dataset.nome.includes(termo) ? 'flex' : 'none';
  });
}

// ============================================
// FORMULÁRIO DE RASTREIO
// ============================================

function aplicarFichaHans(individuoId) {
  const ind = getIndividuo(individuoId);
  if (!ind) return;

  const modalSelecao = $id('modal-rastreio-hans');
  if (modalSelecao) modalSelecao.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-ficha-hans';
  overlay.style.display = 'flex';

  const campos = [
    ['sintomasNeurologicos', [
      ['dormenciaMaos','Sente dormência nas mãos'],
      ['dormenciaPes','Sente dormência nos pés'],
      ['formigamentos','Formigamentos'],
      ['areasAdormecidas','Áreas adormecidas na pele'],
      ['caimbras','Câimbras'],
      ['picadas','Sensação de picadas/agulhadas']
    ]],
    ['lesoesPele', [
      ['manchasPele','Manchas na pele (não considerar as de nascença)'],
      ['dorNervos','Dor nos nervos'],
      ['carocosCorpo','Caroços no corpo'],
      ['inchacoMaosPes','Inchaço nas mãos e pés'],
      ['inchacoRosto','Inchaço no rosto'],
      ['perdaCilios','Perda dos cílios/sobrancelhas']
    ]],
    ['fraquezaMuscular', [
      ['dificuldadeAbotoar','Dificuldade de abotoar camisa'],
      ['dificuldadeOculos','Dificuldade de pegar óculos'],
      ['dificuldadeEscrever','Dificuldade de escrever'],
      ['dificuldadeSegurarPanela','Dificuldade de segurar panelas'],
      ['dificuldadeCalcar','Dificuldade de calçar chinelos'],
      ['dificuldadeManterChinelos','Dificuldade de manter chinelos']
    ]]
  ];

  const tituloSecao = { sintomasNeurologicos:'🔬 Sintomas Neurológicos', lesoesPele:'🔴 Lesões de Pele', fraquezaMuscular:'💪 Fraqueza Muscular' };

  overlay.innerHTML = `
    <div class="modal" style="max-width:700px;width:95%;max-height:min(calc(100dvh - 48px),calc(100vh - 48px));">
      <div class="modal-header">
        <div>
          <h2>🔬 Rastreio de Hanseníase</h2>
          <div style="font-size:var(--text-sm);color:var(--cinza-600);margin-top:var(--sp-1);">${esc(ind.nome)} — ${calcIdade(ind.nasc).texto}</div>
        </div>
        <button class="btn-close" aria-label="Fechar" title="Fechar" onclick="customConfirm('Cancelar preenchimento?', () => this.closest('.modal-overlay').remove())">✕</button>
      </div>
      <div class="modal-body" style="max-height:min(calc(100dvh - 48px),calc(100vh - 48px));overflow-y:auto;padding:var(--sp-4);">
        <form id="form-rastreio-hans" onsubmit="event.preventDefault();salvarRastreioHans(${individuoId});">
          ${campos.map(([secao, itens]) => `
            <div class="card ficha-section">
              <div class="card-title">${tituloSecao[secao]}</div>
              <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--sp-2);">
                ${itens.map(([id, label]) => `
                  <label style="display:flex;align-items:center;gap:var(--sp-2);font-size:var(--text-sm);">
                    <input type="checkbox" name="${id}" id="${id}" style="width:16px;height:16px;accent-color:var(--azul);">
                    <span>${label}</span>
                  </label>`).join('')}
              </div>
            </div>`).join('')}
          <div class="card ficha-section">
            <div class="card-title">👥 Histórico Familiar</div>
            <label class="ficha-check-row">
              <input type="checkbox" name="historicoFamiliar" id="historicoFamiliar" style="width:16px;height:16px;accent-color:var(--azul);">
              <span>Há história de hanseníase na família?</span>
            </label>
          </div>
          <div class="card ficha-section">
            <div class="card-title">📝 Avaliação e Conduta</div>
            <div style="display:grid;gap:var(--sp-3);">

              <div style="background:var(--amarelo-fraco);padding:var(--sp-4);border-radius:var(--radius-sm);">
                <label style="display:flex;align-items:flex-start;gap:var(--sp-3);cursor:pointer;">
                  <input type="checkbox" name="contarComoVisita" style="margin-top:3px;width:16px;height:16px;accent-color:var(--azul);">
                  <div>
                    <span style="font-weight:600;">✅ Contar como visita realizada</span>
                    <p style="font-size:var(--text-xs);color:var(--cinza-700);margin-top:var(--sp-1);">
                      Marque se este rastreio está sendo feito durante uma visita domiciliar. Contabilizará para as metas do mês.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:var(--sp-2);justify-content:flex-end;">
            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar Rastreio</button>
          </div>
        </form>
      </div>
    </div>`;

  _getOverlayRoot().appendChild(overlay);
}

// ============================================
// SALVAR RASTREIO
// ============================================

function salvarRastreioHans(individuoId) {
  const form = $id('form-rastreio-hans');
  if (!form) return;
  const fd = new FormData(form);

  const camposNeuro = ['dormenciaMaos','dormenciaPes','formigamentos','areasAdormecidas','caimbras','picadas'];
  const camposPele = ['manchasPele','dorNervos','carocosCorpo','inchacoMaosPes','inchacoRosto','perdaCilios'];
  const camposMusc = ['dificuldadeAbotoar','dificuldadeOculos','dificuldadeEscrever','dificuldadeSegurarPanela','dificuldadeCalcar','dificuldadeManterChinelos'];

  const sintomasNeurologicos = Object.fromEntries(camposNeuro.map(k => [k, fd.get(k) === 'on']));
  const lesoesPele = Object.fromEntries(camposPele.map(k => [k, fd.get(k) === 'on']));
  const fraquezaMuscular = Object.fromEntries(camposMusc.map(k => [k, fd.get(k) === 'on']));

  const totalSintomas =
    Object.values(sintomasNeurologicos).filter(Boolean).length +
    Object.values(lesoesPele).filter(Boolean).length +
    Object.values(fraquezaMuscular).filter(Boolean).length;

  let risco, recomendacao;
  if (totalSintomas === 0) {
    risco = 'Baixo - Sem sintomas';
    recomendacao = 'Manter vigilância. Novo rastreio em 6 meses.';
  } else if (totalSintomas <= 3) {
    risco = 'Médio - Sintomas leves';
    recomendacao = 'Orientar retorno à UBS para avaliação médica. Agendar consulta.';
  } else {
    risco = 'Alto - Múltiplos sintomas';
    recomendacao = 'Encaminhamento URGENTE para dermatologia/neurologia. Notificar vigilância epidemiológica.';
  }

  const dados = {
    individuoId: Number(individuoId),
    data: hoje(),
    sintomasNeurologicos, lesoesPele, fraquezaMuscular,
    historicoFamiliar: fd.get('historicoFamiliar') === 'on',
    observacoes: fd.get('observacoes') || '',
    contarComoVisita: fd.get('contarComoVisita') === 'on',
    totalSintomas, risco, recomendacao
  };

  if (!historicoFichas.hans) historicoFichas.hans = [];
  historicoFichas.hans.push(dados);
  salvarHistoricoFichas();

  if (dados.contarComoVisita) {
    const familia = getFamiliaPorIndividuo(individuoId);
    if (familia) {
      db.visitas.push({
        id: nextId('visita'), data: hoje(), familiaId: familia.idFamilia, individuoId,
        turno: new Date().getHours() < 12 ? 'manha' : 'tarde',
        tipo: 'Rastreio de Hanseníase',
        desfecho: 'Visita realizada',
        obs: `Rastreio de hanseníase. Risco: ${risco}`,
        escopo: 'individuo', membroId: individuoId,
        cbo: db.config?.cbo || '515105', dataRegistro: hoje()
      });
      if (!familia.ultimaVisita || hoje() > familia.ultimaVisita) familia.ultimaVisita = hoje();
      save();
      if (typeof DB !== 'undefined' && DB.invalidate) DB.invalidate();
    }
  }

  const ind = getIndividuo(individuoId);
  if (ind) { ind.ultimoRastreioHans = { data: dados.data, risco, totalSintomas }; save(); if (typeof DB !== 'undefined' && DB.invalidate) DB.invalidate(); }

  // Invalida snapshot e atualiza UI imediatamente
  if (typeof DB !== 'undefined' && DB.invalidate) DB.invalidate();
  if (dados.contarComoVisita) {
    // P2-2: mesmo padrão de lazy render — só re-renderiza a página ativa
    updateBadge();
    if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
  }
  // Notifica modal de visita individual (se aberto)
  if (typeof window._notificarFichaSalva === 'function') window._notificarFichaSalva('hans');

  const modal = $id('modal-ficha-hans');
  if (modal) modal.remove();

  atualizarBadgeHans();
  toast(`Rastreio salvo! ${dados.contarComoVisita ? 'Visita contabilizada.' : ''}`, 'success');
  if (risco.includes('Alto')) {
    setTimeout(() => toast('⚠️ ATENÇÃO: Múltiplos sintomas. Encaminhamento URGENTE necessário!', 'warn'), 500);
  }
}

function getFamiliaPorIndividuo(individuoId) {
  const ind = getIndividuo(individuoId);
  if (!ind) return null;
  return getFamilia(ind.familiaId);
}

// ============================================
// HISTÓRICO NO MODAL DO INDIVÍDUO
// ============================================

function renderHistoricoHans(individuoId) {
  const historico = (historicoFichas.hans || [])
    .filter(f => f && f.individuoId === individuoId)
    .sort((a,b) => b.data.localeCompare(a.data));

  if (historico.length === 0) {
    return `
      <div style="text-align:center;padding:20px;color:var(--cinza-500);">
        <p>Nenhum rastreio registrado.</p>
        <button class="btn btn-primary btn-sm" onclick="aplicarFichaHans(${individuoId})">Realizar 1º Rastreio</button>
      </div>`;
  }

  const ultimo = historico[0];
  const diasDesdeUltimo = Math.floor((new Date() - new Date(ultimo.data + 'T00:00:00')) / (24*3600*1000));
  const corRisco = ultimo.risco.includes('Alto') ? 'var(--vermelho-fraco)' : ultimo.risco.includes('Médio') ? 'var(--amarelo-fraco)' : 'var(--verde-fraco)';
  const badgeRiscoClass = ultimo.risco.includes('Alto') ? 'badge-vermelho' : ultimo.risco.includes('Médio') ? 'badge-amarelo' : 'badge-verde';

  return `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-4);">
        <h4 style="margin:0;">Histórico de Rastreios</h4>
        <button class="btn btn-primary btn-sm" onclick="aplicarFichaHans(${individuoId})">+ Novo Rastreio</button>
      </div>
      <div class="card" style="margin-bottom:var(--sp-4);padding:12px;background:${corRisco};">
        <div style="display:flex;align-items:center;gap:var(--sp-3);">
          <div style="font-size:var(--text-xl);">🔬</div>
          <div style="flex:1;">
            <div style="display:flex;justify-content:space-between;">
              <span style="font-weight:600;">Último Rastreio</span>
              <span class="badge ${badgeRiscoClass}">${ultimo.risco}</span>
            </div>
            <div style="font-size:var(--text-xs);color:var(--cinza-700);">Data: ${formatData(ultimo.data)} (há ${diasDesdeUltimo} dias)</div>
            <div style="font-size:var(--text-xs);margin-top:var(--sp-1);"><strong>Sintomas:</strong> ${ultimo.totalSintomas} identificados</div>
            <div style="font-size:var(--text-xs);margin-top:var(--sp-1);background:var(--surface);padding:var(--sp-2);border-radius:var(--radius-sm);">
              <strong>Recomendação:</strong> ${ultimo.recomendacao}
            </div>
          </div>
        </div>
      </div>
      ${historico.length > 1 ? `
        <details>
          <summary style="cursor:pointer;color:var(--azul);">Ver histórico completo (${historico.length-1} registros anteriores)</summary>
          <div style="margin-top:var(--sp-3);">
            ${historico.slice(1).map(f => `
              <div style="padding:var(--sp-2);border-bottom:1px solid var(--cinza-200);font-size:var(--text-sm);">
                <div style="display:flex;justify-content:space-between;">
                  <span>${formatData(f.data)}</span>
                  <span class="badge ${f.risco.includes('Alto') ? 'badge-vermelho' : f.risco.includes('Médio') ? 'badge-amarelo' : 'badge-verde'}">${f.risco}</span>
                </div>
                <div style="font-size:var(--text-xs);color:var(--cinza-600);">${f.totalSintomas} sintomas — ${f.recomendacao}</div>
              </div>`).join('')}
          </div>
        </details>` : ''}
    </div>`;
}

// ============================================
// BADGE E INICIALIZAÇÃO
// ============================================

function atualizarBadgeHans() {
  const seisMesesAtras = new Date();
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
  const seisMesesAtrasStr = seisMesesAtras.toISOString().split('T')[0];

  const pendentes = getIndividuos().filter(ind => {
    const ultimo = (historicoFichas.hans || [])
      .filter(f => f && f.individuoId === ind.idIndividuo)
      .sort((a,b) => b.data.localeCompare(a.data))[0];
    return !ultimo || ultimo.data < seisMesesAtrasStr;
  }).length;

  const badge = $id('badge-hans');
  if (badge) {
    badge.textContent = pendentes;
    badge.style.display = pendentes > 0 ? '' : 'none';
  }
}

carregarHistoricoFichas();


//             app-fichas-gestante.js, app-fichas-outros.js, app-core.js

// ============================================

function verHistoricoFicha(tipo, individuoId) {
  const ind      = getIndividuo(Number(individuoId));
  const nome     = ind ? esc(ind.nome) : `ID ${individuoId}`;
  const titulos  = { has:'HAS', dm:'DM', gestante:'Gestante', consumoAlimentar:'Consumo Alimentar', hans:'Hanseníase', acamado:'Domiciliados', prevencao:'Prevenção' };
  const entradas = (db.fichas?.historico?.[tipo]?.[individuoId] || []).slice().reverse();

  // Campos a exibir por tipo (rótulo legível)
  const labels = {
    has:  { peso:'Peso (kg)', imc:'IMC', paSistolica:'PA Sist.', paDiastolica:'PA Diast.',
            paControlada:'PA Controlada', adesao:'Adesão', medicacoes:'Medicações' },
    dm:   { glicemiaJejum:'Glicemia Jejum', hba1c:'HbA1c', glicemiaControlada:'Controlada',
            medicacoes:'Medicações' },
    gestante: { dum:'DUM', dpp:'DPP', consultasNum:'Nº Consultas', ultimaConsulta:'Última Consulta',
                peso:'Peso (kg)', paSistolica:'PA Sist.', riscoGestacional:'Alto Risco' },
    consumoAlimentar: { aleitamento:'Aleitamento', pesoNasc:'Peso Nasc.', alimentos:'Alimentos' },
    hans: {},
    acamado: { condicao:'Condição', cuidador:'Cuidador', dependencia:'Dependência', riscoPressao:'Risco Pressão' },
    prevencao: { resultadoPap:'Resultado Pap.', resultadoMamo:'BI-RADS Mamo', vacinaHpv:'Vacina HPV', proximoPap:'Próx. Papanicolau' },
  };
  const camposLabel = labels[tipo] || {};

  function _fmtVal(v) {
    if (v === true || v === 'sim') return '<span style="color:var(--verde);font-weight:700">Sim</span>';
    if (v === false || v === 'nao' || v === '') return '<span style="color:var(--cinza-400)">Não</span>';
    return esc(String(v));
  }

  const linhas = entradas.length ? entradas.map((e, idx) => {
    const data  = e.data ? e.data.split('-').reverse().join('/') : '–';
    const hora  = e.dataHora ? new Date(e.dataHora).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}) : '';
    const campos = Object.entries(camposLabel)
      .filter(([k]) => e.campos[k] != null && e.campos[k] !== '')
      .map(([k, lbl]) => `
        <span style="display:inline-flex;align-items:center;gap:var(--sp-1);padding:2px 7px;border-radius:var(--r-md);background:var(--cinza-100);font-size:var(--text-xs);margin:2px">
          <span style="color:var(--cinza-500)">${esc(lbl)}:</span>
          <span style="font-weight:600">${_fmtVal(e.campos[k])}</span>
        </span>`).join('');
    return `
      <div style="padding:12px 14px;border-bottom:1px solid var(--cinza-100)">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
          <span style="font-weight:700;font-size:var(--text-sm);color:var(--cinza-800)">📅 ${data} ${hora ? '<span style="${_fh.xs()}">às '+hora+'</span>' : ''}</span>
          <span style="font-size:var(--text-2xs);background:var(--cinza-100);padding:2px 7px;border-radius:10px;color:var(--cinza-500)">${idx===0?'mais recente':''}</span>
        </div>
        ${campos ? `<div style="margin-bottom:6px">${campos}</div>` : ''}
        ${e.obs ? `<div style="font-size:var(--text-xs);color:var(--cinza-700);background:var(--amarelo-bg,rgba(255,117,51,.10));border-left:3px solid var(--amarelo);padding:6px 8px;border-radius:0 4px 4px 0;margin-top:var(--sp-1)">💬 ${esc(e.obs)}</div>` : ''}
      </div>`;
  }).join('') : `<div style="padding:32px;text-align:center;color:var(--cinza-400);font-size:var(--text-sm)">Nenhum salvamento registrado</div>`;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  
  overlay.innerHTML = `
    <div class="modal" class="modal" style="display:flex;flex-direction:column">
      <div class="modal-header" style="flex-shrink:0">
        <div>
          <h2 style="font-size:var(--text-base)">🕐 Histórico — ${titulos[tipo]||tipo}</h2>
          <div style="font-size:var(--text-xs);color:var(--cinza-500);margin-top:2px">${nome} · ${entradas.length} salvamento${entradas.length!==1?'s':''}</div>
        </div>
        <button class="close-btn" aria-label="Fechar" title="Fechar" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div style="flex:1;overflow-y:auto;background:var(--cinza-50)">${linhas}</div>
    </div>`;
  _getOverlayRoot().appendChild(overlay);
}



// Retorna true se o indivíduo de prevenção é considerado "feito" no mês:
// - ficha preenchida este mês, OU
// - papanicolau do cadastro com data < 1 ano atrás (exame em dia)
function _prevencaoFeita(ind, fichasAcomp, mesAtual) {
  const ficha = (fichasAcomp.prevencao || {})[ind.idIndividuo] || {};
  if (ficha._dataSalva && ficha._dataSalva.startsWith(mesAtual)) return true;
  if (!ind.papanicolau) return false;
  const umAnoAtras = new Date();
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
  // Suporta tanto dd/mm/aaaa quanto yyyy-mm-dd
  const papISO = ind.papanicolau.includes('/') ? _brToISO(ind.papanicolau) : ind.papanicolau;
  if (!papISO) return false;
  const papDate = new Date(papISO);
  return !isNaN(papDate) && papDate >= umAnoAtras;
}

function _fichaElegiveis(tipo) {
  switch(tipo) {
    case 'has':              return getIndividuos().filter(i => i.has === 'sim');
    case 'dm':               return getIndividuos().filter(i => i.dm === 'sim');
    case 'gestante':         return getIndividuos().filter(i => i.gestante === 'sim');
    case 'consumoAlimentar': return getIndividuos().filter(i => { const a = getIdadeEmAnos(i.nasc); return a !== null && a < 2; });
    case 'hans':             return getIndividuos().filter(i => i.tb === 'hanseniase');
    case 'acamado':          return getIndividuos().filter(i => i.acamado === 'sim');
    case 'prevencao':        return getIndividuos().filter(i => { if (i.sexo !== 'F') return false; const a = getIdadeEmAnos(i.nasc); return a !== null && a >= 25 && a <= 64; });
    default:                 return [];
  }
}

function _fichaRenderLista(inds, tipo, mesAtual) {
  if (!inds.length) return '<div style="padding:var(--sp-4);font-size:var(--text-xs);color:var(--cinza-500);text-align:center">Nenhum resultado</div>';
  const umAnoAtras = new Date(new Date().setFullYear(new Date().getFullYear()-1)).toISOString().split('T')[0];
  return inds.map(ind => {
    const id   = ind.idIndividuo;
    const ficha = (fichasAcompanhamento[tipo] || {})[id] || {};
    const temF  = tipo === 'prevencao'
      ? _prevencaoFeita(ind, fichasAcompanhamento, mesAtual)
      : (ficha._dataSalva && ficha._dataSalva.startsWith(mesAtual));

    // Subtítulo contextual por tipo
    let sub = calcIdade(ind.nasc).texto;
    if (tipo === 'prevencao') {
      const pap = ind.papanicolau;
      sub = pap
        ? (pap >= umAnoAtras ? '✅ Papanicolau em dia' : '⚠️ Papanicolau atrasado')
        : '⚠️ Sem Papanicolau';
    } else if (tipo === 'acamado') {
      const cond = { acamado:'Acamado', domiciliado:'Domiciliado', cadeirante:'Cadeirante', semimobil:'Semimóvel' }[ficha.condicao];
      sub = cond ? cond + ' · ' + calcIdade(ind.nasc).texto : calcIdade(ind.nasc).texto;
    }

    return `
      <div class="individuo-list-item" onclick="carregarFichaIndividuo('${tipo}',${id},this)"
           data-nome="${esc(ind.nome||'').toLowerCase()}"
           style="padding:12px 14px;cursor:pointer;border-bottom:1px solid var(--cinza-200);transition:all .15s;display:flex;align-items:center;gap:var(--sp-2)">
        <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${temF?'var(--verde)':'var(--cinza-300)'}"></div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:var(--text-sm);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(ind.nome)}</div>
          <div style="font-size:var(--text-xs);color:var(--cinza-500);margin-top:1px">${sub}</div>
        </div>
        <div style="font-size:var(--text-2xs);font-weight:700;padding:2px 7px;border-radius:20px;flex-shrink:0;
             background:${temF?'var(--verde-bg)':'var(--vermelho-bg)'};
             color:${temF?'var(--verde)':'var(--vermelho)'}">
          ${temF?'✓ Preenchida':'Pendente'}
        </div>
      </div>`;
  }).join('');
}

function _fichaAbrirModal(tipo, todosInds, comFicha, semFicha, listaHtml) {
  const titulos = {
    has: '🩺 HAS — Hipertensão Arterial', dm: '💉 DM — Diabetes Mellitus',
    gestante: '🤰 Gestante — Pré-natal',
    consumoAlimentar: '🍼 Consumo Alimentar — Crianças < 2 anos',
    hans: '🔬 Hanseníase',
    acamado: '🛏️ Domiciliados — Acompanhamento',
    prevencao: '🔬 Prevenção — Saúde da Mulher',
  };
  const pct    = todosInds.length ? Math.round(comFicha.length / todosInds.length * 100) : 0;
  const corPct = pct === 100 ? 'var(--verde)' : pct >= 50 ? 'var(--amarelo)' : 'var(--vermelho)';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id        = 'modal-ficha';
  overlay.style.display = 'flex';
  

  overlay.innerHTML = `
    <div class="modal" class="modal modal-md" style="display:flex;flex-direction:column">
      <div class="modal-header" style="flex-shrink:0">
        <h2 style="font-size:var(--text-base)">${titulos[tipo]}</h2>
        <button class="close-btn" aria-label="Fechar" title="Fechar" onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>

      ${todosInds.length === 0 ? `
        <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:48px;color:var(--cinza-500);flex-direction:column;gap:var(--sp-3)">
          <div style="font-size:48px /* emoji-placeholder */;opacity:.3">📋</div>
          <div style="font-size:var(--text-sm);font-weight:600">Nenhum indivíduo elegível cadastrado na microárea</div>
        </div>` : `

      <div style="padding:12px 20px;background:var(--cinza-100);border-bottom:1px solid var(--cinza-200);flex-shrink:0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:var(--text-xs);font-weight:600;color:var(--cinza-700)">
            📊 Fichas do mês: <strong style="color:${corPct}">${comFicha.length} de ${todosInds.length}</strong> preenchidas
          </span>
          <span style="font-size:var(--text-sm);font-weight:800;color:${corPct}">${pct}%</span>
        </div>
        <div style="background:var(--cinza-300);border-radius:99px;height:8px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${corPct};border-radius:99px;transition:width .6s"></div>
        </div>
        <div style="display:flex;gap:var(--sp-4);margin-top:6px;font-size:var(--text-xs)">
          <span style="color:var(--verde)">✅ ${comFicha.length} com ficha</span>
          <span style="color:var(--vermelho)">⏳ ${semFicha.length} pendente${semFicha.length!==1?'s':''}</span>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden">
        <div style="padding:10px 12px;border-bottom:1px solid var(--bdr);background:var(--surface);flex-shrink:0">
          <div style="position:relative">
            <span style="position:absolute;left:9px;top:50%;transform:translateY(-50%);font-size:var(--text-sm);pointer-events:none">🔍</span>
            <input type="text" id="ficha-search-${tipo}" placeholder="Buscar por nome..."
              class="input" style="padding-left:32px;font-size:var(--text-xs);height:34px"
              oninput="filtrarListaFicha('${tipo}', this.value)">
          </div>
        </div>
        <div style="display:flex;gap:var(--sp-1);padding:var(--sp-2) 10px;background:var(--surface-2);border-bottom:1px solid var(--bdr);flex-shrink:0">
          <button onclick="filtrarStatusFicha('${tipo}','todos')" id="btn-todos-${tipo}" class="btn btn-primary btn-sm" style="flex:1;font-size:var(--text-xs)">Todos</button>
          <button onclick="filtrarStatusFicha('${tipo}','pendente')" id="btn-pend-${tipo}" class="btn btn-sm" style="flex:1;font-size:var(--text-xs)">Pendentes</button>
          <button onclick="filtrarStatusFicha('${tipo}','feito')" id="btn-feito-${tipo}" class="btn btn-sm" style="flex:1;font-size:var(--text-xs)">Com ficha</button>
        </div>
        <div id="lista-fichas-${tipo}" style="flex:1;overflow-y:auto">${listaHtml}</div>
      </div>`}
    </div>`;

  _getOverlayRoot().appendChild(overlay);
  if (!$id('style-ficha-lista')) {
    const s = document.createElement('style');
    s.id = 'style-ficha-lista';
    s.textContent = `.individuo-list-item:hover{background:var(--cinza-50)}.individuo-list-item.ativo{background:var(--azul-fraco);border-left:3px solid var(--azul)}`;
    document.head.appendChild(s);
  }
}

// Abre a ficha do tipo informado e, após o modal montar, seleciona
// automaticamente o indivíduo na lista lateral.
function abrirFichaDoIndividuo(tipo, individuoId) {
  // Navega para a página de acompanhamento e seleciona o indivíduo
  openAcompPage(tipo);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const lista = $id('acomp-lista');
      if (!lista) return;
      const item = lista.querySelector(`.individuo-list-item[onclick*="${individuoId}"]`);
      if (item) { item.click(); item.scrollIntoView({ block: 'nearest' }); }
    });
  });
}

function abrirFicha(tipo) {
  // Redireciona para a página de acompanhamento inline (2 colunas)
  // em vez de abrir o modal flutuante antigo
  openAcompPage(tipo);
}

function filtrarListaFicha(tipo, busca) {
  const lista = $id('lista-fichas-' + tipo) || $id('ficha-lista-' + tipo);
  if (!lista) return;
  const q = busca.trim().toLowerCase();
  lista.querySelectorAll('.individuo-list-item').forEach(el => {
    const nome = el.dataset.nome || '';
    el.style.display = !q || nome.includes(q) ? '' : 'none';
  });
}

function filtrarStatusFicha(tipo, filtro) {
  const lista = $id('lista-fichas-' + tipo);
  if (!lista) return;
  const mesAtual = new Date().toISOString().slice(0,7);
  // Atualizar estilo dos botões
  ['todos','pendente','feito'].forEach(f => {
    const btn = $id('btn-' + (f==='todos'?'todos':f==='pendente'?'pend':'feito') + '-' + tipo);
    if (btn) { btn.className = f === filtro ? 'btn btn-primary btn-sm' : 'btn btn-sm'; btn.style.flex = '1'; btn.style.fontSize = '11px'; }
  });
  lista.querySelectorAll('.individuo-list-item').forEach(el => {
    const onclick = el.getAttribute('onclick') || '';
    const m = onclick.match(/carregarFichaIndividuo\('[^']+',(\d+)/);
    if (!m) return;
    const id = parseInt(m[1]);
    const ficha = (fichasAcompanhamento[tipo]||{})[id]||{};
    const ind4f = getIndividuo(id);
    const temF = (tipo === 'prevencao' && ind4f)
      ? _prevencaoFeita(ind4f, fichasAcompanhamento, mesAtual)
      : (ficha._dataSalva && ficha._dataSalva.startsWith(mesAtual));
    if (filtro === 'todos') el.style.display = '';
    else if (filtro === 'feito') el.style.display = temF ? '' : 'none';
    else el.style.display = !temF ? '' : 'none';
  });
  // Limpar busca
  const searchEl = $id('ficha-search-' + tipo);
  if (searchEl) searchEl.value = '';
}

function filtrarTabFicha(tipo, aba) {
  const overlay = $id('modal-ficha');
  if (!overlay) return;
  overlay._abaAtual = aba;

  const tabPend = $id('ficha-tab-pend-' + tipo);
  const tabOk   = $id('ficha-tab-ok-' + tipo);
  const lista   = $id('ficha-lista-' + tipo);
  if (!lista) return;

  const inds = aba === 'pend' ? overlay._semFicha : overlay._comFicha;

  if (tabPend && tabOk) {
    if (aba === 'pend') {
      tabPend.style.color = 'var(--vermelho)'; tabPend.style.background = 'var(--vermelho-bg)'; tabPend.style.borderBottom = '2px solid var(--vermelho)';
      tabOk.style.color = 'var(--cinza-500)';  tabOk.style.background = '';  tabOk.style.borderBottom = '2px solid transparent';
    } else {
      tabOk.style.color = 'var(--verde)';    tabOk.style.background = 'var(--verde-bg)'; tabOk.style.borderBottom = '2px solid var(--verde)';
      tabPend.style.color = 'var(--cinza-500)'; tabPend.style.background = ''; tabPend.style.borderBottom = '2px solid transparent';
    }
  }

  lista.innerHTML = overlay._renderLista(inds);

  // Limpar busca
  const searchEl = $id('ficha-search-' + tipo);
  if (searchEl) searchEl.value = '';
}

const _FICHA_ICONES = {
  has: '❤️', dm: '💉', gestante: '🤰', consumoAlimentar: '🍼',
  hans: '🔬', acamado: '🛏️', prevencao: '🔬',
};
const _FICHA_TITULOS = {
  has: '🩺 HAS — Hipertensão Arterial', dm: '💉 DM — Diabetes Mellitus',
  gestante: '🤰 Gestante — Pré-natal',
  consumoAlimentar: '🍼 Consumo Alimentar — Crianças < 2 anos',
  hans: '🔬 Hanseníase',
  acamado: '🛏️ Domiciliados — Acompanhamento',
  prevencao: '🔬 Prevenção — Saúde da Mulher',
};
const _FICHA_RENDERS = {
  has: id => renderFichaHAS(id),
  dm:  id => renderFichaDM(id),
  gestante: id => renderFichaGestante(id),
  consumoAlimentar: id => renderFichaConsumoAlimentar(id),
  hans: id => (typeof renderFichaHans === 'function' ? renderFichaHans(id) : ''),
  acamado: id => renderFichaAcamado(id),
  prevencao: id => renderFichaPrevencao(id),
};

/**
 * Carrega a ficha do indivíduo no painel direito da página Acompanhamento.
 * Em desktop: renderiza inline na coluna direita.
 * Em mobile:  ativa a classe .acomp-ficha-ativa no layout (slide-in).
 */
function carregarFichaIndividuo(tipo, individuoId, el) {
  // Marcar item selecionado na lista
  document.querySelectorAll('.individuo-list-item').forEach(i => i.classList.remove('selected','ativo'));
  if (el) { el.classList.add('selected','ativo'); }

  const ind = getIndividuo(individuoId);
  if (!ind) return;

  // Renderizar HTML da ficha
  const fichaHtml = (_FICHA_RENDERS[tipo] || (() => `<div style="${_fh.p4()}">Ficha indisponível.</div>`))(individuoId);

  // Preencher cabeçalho do painel direito
  const av = getAvatarMembro(ind, classificarIndividuo(ind));
  const headerEl  = $id('acomp-ficha-header');
  const avatarEl  = $id('acomp-ficha-avatar');
  const nomeEl    = $id('acomp-ficha-nome');
  const subEl     = $id('acomp-ficha-sub');
  const contentEl = $id('acomp-ficha-content');
  const emptyEl   = $id('acomp-empty');

  if (avatarEl) avatarEl.textContent = av;
  if (nomeEl)   nomeEl.textContent   = ind.nome;
  if (subEl)    subEl.textContent    = calcIdade(ind.nasc).texto + ' · ' + (_FICHA_TITULOS[tipo] || tipo);

  if (headerEl)  { headerEl.style.display  = 'flex'; }
  if (emptyEl)   { emptyEl.style.display   = 'none'; }
  if (contentEl) { contentEl.style.display = 'block'; contentEl.innerHTML = fichaHtml; }

  // Mobile: mostrar painel de ficha (slide)
  const layout = $id('acomp-layout');
  if (layout) layout.classList.add('acomp-ficha-ativa');

  // Atualizar estado
  _acompIndAtual = individuoId;
}

/** Volta para a lista (mobile) */
function acompVoltarLista() {
  const layout = $id('acomp-layout');
  if (layout) layout.classList.remove('acomp-ficha-ativa');
}

// Inicializar fichas

let _acompTipoAtual = null;
let _acompIndAtual  = null;
const _acompTitulos = {
  has:'❤️ HAS — Hipertensão Arterial', dm:'💉 DM — Diabetes Mellitus',
  gestante:'🤰 Pré-natal — Gestante',
  consumoAlimentar:'🍼 Consumo Alimentar — Crianças < 2 anos',
  hans:'🔬 Rastreio de Hanseníase',
  acamado:'🛏️ Domiciliados — Acompanhamento',
  prevencao:'🔬 Prevenção — Saúde da Mulher',
};

function _acompMostrarOrientacao() {
  const empty   = $id('acomp-empty');
  const header  = $id('acomp-ficha-header');
  const content = $id('acomp-ficha-content');
  const layout  = $id('acomp-layout');
  if (content) { content.style.display = 'none'; content.innerHTML = ''; }
  if (header)    header.style.display  = 'none';
  if (empty)     empty.style.display   = 'flex';
  if (layout)    layout.classList.remove('acomp-ficha-ativa');
  // Update the empty icon based on ficha type
  const tipo = _acompTipoAtual || '';
  const icEl = $id('acomp-empty-ico');
  if (icEl) icEl.textContent = _FICHA_ICONES[tipo] || '📋';
}

function openAcompPage(tipo) {
  _acompTipoAtual = tipo;
  _acompIndAtual  = null;
  showPage('acompanhamento');
  const lbl = $id('acomp-tipo-label');
  if (lbl) lbl.textContent = _acompTitulos[tipo] || tipo;
  if (tipo === 'hans') { _acompListaHans(); return; }
  _acompListaTipo(tipo);
}

function _acompListaTipo(tipo) {
  const mesAtual = new Date().toISOString().slice(0,7);
  const todos    = _fichaElegiveis(tipo);
  const comF     = todos.filter(i => {
    if (tipo === 'prevencao') return _prevencaoFeita(i, fichasAcompanhamento, mesAtual);
    const f = (fichasAcompanhamento[tipo]||{})[i.idIndividuo]||{};
    return f._dataSalva && f._dataSalva.startsWith(mesAtual);
  });
  const semF = todos.filter(i => !comF.includes(i));
  const pct  = todos.length ? Math.round(comF.length/todos.length*100) : 0;
  const cor  = pct===100?'var(--verde)':pct>=50?'var(--amarelo)':'var(--vermelho)';

  const prog = $id('acomp-progresso');
  if (prog) {
    prog.style.display = todos.length?'':'none';
    const bar = $id('acomp-pct-bar');
    const lbl = $id('acomp-pct-label');
    if (bar) { bar.style.width=pct+'%'; bar.style.background=cor; }
    if (lbl) { lbl.textContent=pct+'%'; lbl.style.color=cor; }
    const ok = $id('acomp-ok-count');
    const pe = $id('acomp-pend-count');
    if (ok) ok.textContent = '✅ '+comF.length+' com ficha';
    if (pe) pe.textContent = '⏳ '+semF.length+' pendente'+(semF.length!==1?'s':'');
  }

  const lista = $id('acomp-lista');
  if (!lista) return;
  if (!todos.length) {
    lista.replaceChildren(createEmptyState('', 'Nenhum indivíduo elegível cadastrado.'));
    _acompMostrarOrientacao();
    return;
  }

  const frag = document.createDocumentFragment();
  todos.forEach(function(i) {
    const temF = comF.includes(i);
    const av   = getAvatarMembro(i, classificarIndividuo(i));
    const el   = cloneTemplate('tpl-individuo-list-item');
    el.dataset.nome  = i.nome.toLowerCase();
    el.dataset.tem   = temF ? '1' : '0';
    el.dataset.indId = i.idIndividuo;
    el.addEventListener('click', function() { carregarFichaIndividuo(tipo, i.idIndividuo, el); });
    el.querySelector('.ili-avatar').textContent = av;
    el.querySelector('.ili-nome').textContent   = i.nome;
    el.querySelector('.ili-sub').textContent    = calcIdade(i.nasc).texto;
    el.querySelector('.ili-status').textContent = temF ? '✅' : '⏳';
    frag.appendChild(el);
  });
  lista.innerHTML = '';
  lista.appendChild(frag);

  // Se nenhum indivíduo estava selecionado, mostra orientação no painel direito
  if (!_acompIndAtual) {
    _acompMostrarOrientacao();
  }
}

function _acompListaHans() {
  const lista = $id('acomp-lista');
  const prog  = $id('acomp-progresso');
  if (prog) prog.style.display = 'none';
  if (!lista) return;
  const inds = getIndividuos();
  if (!inds.length) {
    lista.replaceChildren(createEmptyState('', 'Nenhum indivíduo cadastrado.'));
    _acompMostrarOrientacao();
    return;
  }
  const agora = new Date();
  const seis  = new Date(new Date().setMonth(agora.getMonth() - 6)).toISOString().split('T')[0];
  const _hansHistorico = historicoFichas.hans || [];

  const frag = document.createDocumentFragment();
  inds.forEach(function(i) {
    const hist = _hansHistorico.filter(h => h.individuoId === i.idIndividuo);
    const ult  = hist.sort((a, b) => (b.data||'').localeCompare(a.data||''))[0];
    const rec  = ult && ult.data >= seis;
    const av   = getAvatarMembro(i, classificarIndividuo(i));
    const el   = cloneTemplate('tpl-individuo-list-item');
    el.dataset.nome  = i.nome.toLowerCase();
    el.dataset.tem   = rec ? '1' : '0';
    el.dataset.indId = i.idIndividuo;
    el.addEventListener('click', function() { carregarFichaIndividuo('hans', i.idIndividuo, el); });
    el.querySelector('.ili-avatar').textContent = av;
    el.querySelector('.ili-nome').textContent   = i.nome;
    el.querySelector('.ili-sub').textContent    = ult ? 'Último: ' + formatData(ult.data) : 'Sem rastreio';
    el.querySelector('.ili-status').textContent = rec ? '✅' : '⏳';
    frag.appendChild(el);
  });
  lista.innerHTML = '';
  lista.appendChild(frag);

  if (!_acompIndAtual) {
    const empty = $id('acomp-empty');
    const cont  = $id('acomp-ficha-content');
    if (empty) empty.style.display = 'flex';
    if (cont)  { cont.style.display = 'none'; cont.innerHTML = ''; }
  }
}

function selecionarAcompInd(tipo, id, el) {
  // Delegado a carregarFichaIndividuo (painel inline)
  carregarFichaIndividuo(tipo, id, el);
}

function selecionarHansInd(id, el) {
  carregarFichaIndividuo('hans', id, el);
}

function _acompEmpty() {
  _acompMostrarOrientacao();
}

function filtrarListaAcomp(q) {
  const qn = (q||'').toLowerCase().trim();
  document.querySelectorAll('#acomp-lista .individuo-list-item').forEach(el => {
    el.style.display = (!qn || (el.dataset.nome||'').includes(qn)) ? '' : 'none';
  });
}

function filtrarStatusAcomp(filtro) {
  ['todos','pend','feito'].forEach(f => {
    const id = 'acomp-btn-'+f;
    const btn = $id(id);
    const isActive = (f==='todos'&&filtro==='todos')||(f==='pend'&&filtro==='pendente')||(f==='feito'&&filtro==='feito');
    if (btn) btn.className = isActive ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    if (btn) btn.style.cssText = 'flex:1;font-size:var(--text-xs);min-height:30px';
  });
  document.querySelectorAll('#acomp-lista .individuo-list-item').forEach(el => {
    const tem = el.dataset.tem==='1';
    el.style.display = filtro==='todos' ? '' : filtro==='feito' ? (tem?'':'none') : (!tem?'':'none');
  });
}

_garantirFichas();

// ============================================
// FICHA DE HANSENÍASE - RASTREIO UNIVERSAL
// ============================================

// carregarHistoricoFichas/salvarHistoricoFichas → noops (legado).
// Histórico agora em db.fichas.historico.

// abrirRastreioHans, aplicarFichaHans, salvarRastreioHans, renderHisto
function carregarHistoricoFichas() { /* noop — histórico vem do db */ }
function salvarHistoricoFichas()   { save(); }

// ── Domiciliados e Prevenção: agora usam o mesmo fluxo de acompanhamento ──────
function openModalDomiciliados() { openAcompPage('acamado'); }
function openModalPrevencao()    { openAcompPage('prevencao'); }
