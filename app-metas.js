'use strict';

// ACS Neto — app-metas.js
// DOM helper (espelha app-crud.js)
// $id disponível globalmente via app-utils.js

// Metas de visitas, calendário e ajustes por dia
// Depende de: app-core.js, app-ui.js

function salvarMetas() {
  db.metas = db.metas || {};
  
  const mEl = $id('meta-manha');
  const tEl = $id('meta-tarde');
  const sEl = $id('meta-sabado');
  const dEl = $id('meta-domingo');
  
  // Só salva se os elementos existirem e tiverem valor válido
  if (mEl) {
    const val = parseInt(mEl.value);
    if (!isNaN(val) && val >= 0) db.metas.manha = val;
  }
  
  if (tEl) {
    const val = parseInt(tEl.value);
    if (!isNaN(val) && val >= 0) db.metas.tarde = val;
  }
  
  if (sEl) db.metas.sabado = sEl.value;
  if (dEl) db.metas.domingo = dEl.value;
  
  save();
}


function _metasSincronizarInputs(m) {
  const mEl = $id('meta-manha');
  const tEl = $id('meta-tarde');
  const sEl = $id('meta-sabado');
  const dEl = $id('meta-domingo');
  if (mEl && mEl.dataset.editing !== 'true') mEl.value = m.manha || 5;
  if (tEl && tEl.dataset.editing !== 'true') tEl.value = m.tarde || 5;
  if (sEl) sEl.value = m.sabado || 'nao';
  if (dEl) dEl.value = m.domingo || 'nao';
  function attachEditEvents(el) {
    if (!el || el.hasAttribute('data-events-attached')) return;
    el.setAttribute('data-events-attached', 'true');
    el.addEventListener('focus', function() { this.dataset.editing = 'true'; });
    el.addEventListener('blur',  function() { this.dataset.editing = 'false'; salvarMetas(); renderMetas(); });
  }
  attachEditEvents(mEl);
  attachEditEvents(tEl);
}

function _metasContextoMes(m) {
  var agora   = new Date();
  var refDate = new Date(agora.getFullYear(), agora.getMonth() + metasMesOffset, 1);
  var ano     = refDate.getFullYear();
  var mes     = refDate.getMonth();
  var meses   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                 'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  var nomeMes = meses[mes];
  var chave   = ano + '-' + String(mes + 1).padStart(2, '0');

  var navEl   = $id('metas-nav-label');
  var labelEl = $id('metas-mes-label');
  if (navEl)   navEl.textContent   = nomeMes + ' ' + ano;
  if (labelEl) labelEl.textContent = nomeMes + ' ' + ano;

  db.metasAjustes = db.metasAjustes || {};
  var dias = getDiasDoMes(ano, mes);

  var totalFamilias     = Object.values(db.familiaById || {}).filter(Boolean).length;
  var diasUteisBase     = dias.filter(function(d){ return metaDiaVisitas(d.tipo) > 0; });
  var diasUteisEfetivos = diasUteisBase.filter(function(d){ return db.metasAjustes[d.data] !== 0; });
  var numDiasUteis      = diasUteisEfetivos.length || 1;
  var metaPorDia        = Math.max(1, Math.ceil(totalFamilias / numDiasUteis));

  var metaMensal = diasUteisEfetivos.reduce(function(acc, d) {
    var aj = db.metasAjustes[d.data];
    return acc + (aj != null && aj !== 0 ? aj : metaPorDia);
  }, 0);

  // Inclui visitas de todos os escopos (família e individual)
  var visMes = (db.visitas || []).filter(function(v) {
    return (v.data || '').startsWith(chave);
  });
  var visitasPorDia = {};
  visMes.forEach(function(v) {
    visitasPorDia[v.data] = (visitasPorDia[v.data] || 0) + 1;
  });

  var _extras     = db.metasExtras     || {};
  var _realizadas = db.metasRealizadas || {};
  var visitasPorDiaEfetivo = {};
  dias.forEach(function(d) {
    var auto  = visitasPorDia[d.data] || 0;
    var extra = (_extras[d.data] || []).reduce(function(s, e){ return s + (e.qtd || 0); }, 0);
    visitasPorDiaEfetivo[d.data] = _realizadas[d.data] != null
      ? _realizadas[d.data]
      : auto + extra;
  });

  var hoje_str     = hoje();
  var diasAtivos   = diasUteisEfetivos;
  var diasPassados = diasAtivos.filter(function(d){ return d.data <= hoje_str; });
  var deficit = 0;
  diasPassados.forEach(function(d) {
    var aj      = db.metasAjustes[d.data];
    var metaDia = (aj != null && aj !== 0) ? aj : metaPorDia;
    var real    = visitasPorDiaEfetivo[d.data] || 0;
    if (real < metaDia) deficit += (metaDia - real);
  });

  var calcEl = $id('meta-calc');
  var descEl = $id('meta-calc-desc');
  if (calcEl) calcEl.textContent = metaMensal;
  if (descEl) descEl.textContent =
    totalFamilias + ' famílias ÷ ' + numDiasUteis + ' dias úteis = ' + metaPorDia + ' vis./dia';

  return { ano: ano, mes: mes, nomeMes: nomeMes, chave: chave, dias: dias,
           diasAtivos: diasAtivos, diasPassados: diasPassados,
           metaMensal: metaMensal, metaPorDia: metaPorDia,
           totalFamilias: totalFamilias, numDiasUteis: numDiasUteis,
           visMes: visMes,
           visitasPorDia: visitasPorDiaEfetivo,
           visitasPorDiaAuto: visitasPorDia,
           hoje_str: hoje_str, deficit: deficit };
}

function _metasRenderResumo(ctx, m, resumoEl) {
  if (!resumoEl) return;
  var metaMensal    = ctx.metaMensal;
  var visitasPorDia = ctx.visitasPorDia;
  var chave         = ctx.chave;
  var deficit       = ctx.deficit;
  var metaPorDia    = ctx.metaPorDia;
  var totalFamilias = ctx.totalFamilias;
  var numDiasUteis  = ctx.numDiasUteis;

  // Soma o mapa efetivo (inclui extras e ajustes manuais)
  var totalRealizadas = Object.keys(visitasPorDia)
    .filter(function(d){ return d.startsWith(chave); })
    .reduce(function(s, d){ return s + (visitasPorDia[d] || 0); }, 0);

  var pctMeta      = metaMensal > 0 ? Math.round(totalRealizadas / metaMensal * 100) : 0;
  var cor          = pctMeta >= 80 ? 'var(--verde)' : pctMeta >= 50 ? 'var(--amarelo)' : 'var(--vermelho)';
  var fillCls      = pctMeta >= 80 ? '' : pctMeta >= 50 ? 'amarelo' : 'vermelho';
  var faltando     = Math.max(0, metaMensal - totalRealizadas);
  var diasComVisita = Object.keys(visitasPorDia).filter(function(d){
    return d.startsWith(chave) && visitasPorDia[d] > 0;
  }).length;

  var el = cloneTemplate('tpl-metas-resumo');

  // Número grande
  var numEl = el.querySelector('.mr-numero');
  numEl.textContent = totalRealizadas;
  numEl.style.color = cor;

  // Subtítulo
  var subEl = el.querySelector('.mr-subtitulo');
  subEl.textContent = 'visitas realizadas de ';
  var boldMeta = document.createElement('strong');
  boldMeta.textContent = metaMensal;
  subEl.appendChild(boldMeta);
  subEl.appendChild(document.createTextNode(' (' + pctMeta + '%)'));

  // Barra
  var barraEl = el.querySelector('.mr-barra-fill');
  barraEl.style.width = Math.min(100, pctMeta) + '%';
  if (fillCls) barraEl.classList.add(fillCls);

  // Linhas de estatísticas
  function _setLinha(key, valor) {
    var linha = el.querySelector('[data-key="' + key + '"] strong');
    if (linha) linha.textContent = valor;
  }
  _setLinha('familias',     totalFamilias);
  _setLinha('diasUteis',    numDiasUteis);
  _setLinha('metaDia',      metaPorDia + ' vis.');
  _setLinha('diasComVisita', diasComVisita);

  var faltandoEl = el.querySelector('.mr-faltando');
  faltandoEl.textContent = faltando;
  faltandoEl.style.color = faltando > 0 ? 'var(--vermelho)' : 'var(--verde)';

  var deficitEl = el.querySelector('.mr-deficit');
  deficitEl.textContent = deficit;
  deficitEl.style.color = deficit > 0 ? 'var(--vermelho)' : 'var(--verde)';

  resumoEl.replaceChildren(el);
}

function _metasRenderCalendario(ctx, m, calEl) {
  if (!calEl) return;
  const { ano, mes, dias, visitasPorDia, hoje_str, metaPorDia } = ctx;
  const diasSemana  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const turnoManha  = m.manha || 5;
  const turnoTarde  = m.tarde || 5;
  const extras      = db.metasExtras     || {};
  const realizadas  = db.metasRealizadas || {};
  let html = `<div class="cal-grid">`;
  diasSemana.forEach((d,i) => {
    const isFdsHdr = i === 0 || i === 6;
    html += `<div class="cal-header-cell${isFdsHdr ? ' fds-header' : ''}">${d}</div>`;
  });
  for (let i = 0; i < primeiroDia; i++) html += `<div class="cal-cell inativo"></div>`;
  dias.forEach(d => {
    const metaPadrao  = metaDiaVisitas(d.tipo) > 0 ? metaPorDia : 0; // familias/dias uteis
    const metaAjust   = db.metasAjustes[d.data] !== undefined ? db.metasAjustes[d.data] : metaPadrao;
    // visitas automáticas + extras + ajuste manual
    const autoVis     = visitasPorDia[d.data] || 0;
    const extrasHoje  = (extras[d.data] || []).reduce((s,e) => s + (e.qtd||0), 0);
    const realAjust   = realizadas[d.data] != null ? realizadas[d.data] : null;
    const real        = realAjust != null ? realAjust : autoVis + extrasHoje;
    const isFds       = d.tipo === 'sabado' || d.tipo === 'domingo';
    const isHoje      = d.data === hoje_str;
    const isFuturo    = d.data > hoje_str;
    const isFolga     = db.metasAjustes[d.data] === 0;
    const isAtivo     = metaAjust > 0;
    let cls = 'cal-cell';
    if (isFds && !isHoje) cls += ' fds';
    if (isHoje)           cls += ' hoje';
    if (isAtivo && !isFuturo && !isFolga) {
      if (real >= metaAjust) cls += ' meta-ok';
      else if (real > 0)     cls += ' meta-parcial';
      else if (!isHoje)      cls += ' meta-zero';
    }
    if (isFolga) cls += ' inativo';
    const metaLabel = isFolga ? 'Folga' : isAtivo ? `meta: ${metaAjust}` : 'sem meta';
    const visColor  = real >= metaAjust ? 'var(--verde)' : real > 0 ? 'var(--amarelo)' : 'var(--cinza-500)';
    const realLabel = real > 0 ? `<span class="cal-visitas" style="color:${visColor}">${real} vis.</span>` : '';
    // Tags de atividades extras
    const TIPO_LABEL = { ac:'Ativ.Col', re:'Reun.Eq', ae:'A.Extra' };
    const TIPO_CLS   = { ac:'cal-extra-ac', re:'cal-extra-re', ae:'cal-extra-ae' };
    const extrasHtml = (extras[d.data] || []).map(e =>
      `<span class="cal-extra-tag ${TIPO_CLS[e.tipo]||''}" title="${e.qtd} vis.">${TIPO_LABEL[e.tipo]||e.tipo} +${e.qtd}</span>`
    ).join('');
    const manualBadge = realAjust != null ? `<span style="font-size:var(--text-2xs);color:var(--cinza-500)">✏</span>` : '';
    html += `<div class="${cls}" onclick="abrirAjusteDia('${d.data}',${metaAjust},${real})" title="Clique para ajustar" style="cursor:pointer">
      <div class="cal-day-num">${d.dia}${isFds ? ' <span style=\'font-size:var(--text-2xs);font-weight:400\'>🚫</span>' : ''}</div>
      ${realLabel}${manualBadge}
      <div class="cal-meta-ind" style="${isFolga?'color:var(--cinza-500);font-style:italic':''}">${metaLabel}</div>
      ${extrasHtml}
      ${isAtivo && !isFolga && !isFuturo ? `<div class="cal-turno-btns">
        <span class="cal-turno-btn ${autoVis>0?'ativo':''}" title="Visitas domiciliares">🏠${autoVis}</span>
        ${extrasHoje>0 ? `<span class="cal-turno-btn ativo" title="Extras">+${extrasHoje}</span>` : ''}
      </div>` : ''}
    </div>`;
  });
  const restantes = (7 - ((primeiroDia + dias.length) % 7)) % 7;
  for (let i = 0; i < restantes; i++) html += `<div class="cal-cell inativo"></div>`;
  html += `</div>`;
  calEl.innerHTML = html;
}

function _metasRenderAlertas(ctx, alertaEl) {
  if (!alertaEl) return;
  const { dias, diasPassados, visitasPorDia, metaMensal, visMes, hoje_str, metaPorDia } = ctx;
  const totalRealizadas = visMes.length;
  const diasComDeficit  = diasPassados
    .map(d => { const aj = db.metasAjustes[d.data]; const meta = aj != null ? aj : metaPorDia; const real = visitasPorDia[d.data] || 0; return { data:d.data, falta:meta-real, meta, real }; })
    .filter(x => x.falta > 0)
    .sort((a,b) => b.falta - a.falta);
  if (diasComDeficit.length === 0) {
    const notif = document.createElement('div');
    notif.className = 'notif notif-ok';
    const icon = document.createElement('div');
    icon.className = 'notif-icon';
    icon.textContent = '✓';
    const text = document.createElement('div');
    text.className = 'notif-text';
    const h4 = document.createElement('h4');
    h4.textContent = 'Meta em dia!';
    const p = document.createElement('p');
    p.textContent = 'Nenhum déficit de visitas até hoje.';
    text.appendChild(h4);
    text.appendChild(p);
    notif.appendChild(icon);
    notif.appendChild(text);
    alertaEl.replaceChildren(notif);
    return;
  }

  const diasRestantesAtivos = dias.filter(d => d.data > hoje_str && metaDiaVisitas(d.tipo) > 0 && db.metasAjustes[d.data] !== 0);
  const totalFaltando  = metaMensal - totalRealizadas;
  const mediaNecess    = diasRestantesAtivos.length > 0 ? Math.ceil(totalFaltando / diasRestantesAtivos.length) : totalFaltando;

  const card = document.createElement('div');
  card.className = 'card';

  const titulo = document.createElement('div');
  titulo.className = 'card-title';
  titulo.style.color = 'var(--vermelho)';
  titulo.textContent = 'Alerta de Déficit — ' + diasComDeficit.length + ' dia(s) abaixo da meta';
  card.appendChild(titulo);

  const fragDeficit = document.createDocumentFragment();
  diasComDeficit.slice(0, 5).forEach(function(x) {
    const row = document.createElement('div');
    row.className = 'deficit-item';
    const spanInfo = document.createElement('span');
    const strong = document.createElement('strong');
    strong.textContent = formatData(x.data);
    spanInfo.appendChild(strong);
    spanInfo.appendChild(document.createTextNode(' — ' + x.real + ' de ' + x.meta + ' visitas'));
    const spanFalta = document.createElement('span');
    spanFalta.style.cssText = 'color:var(--vermelho);font-weight:700';
    spanFalta.textContent = '–' + x.falta;
    row.appendChild(spanInfo);
    row.appendChild(spanFalta);
    fragDeficit.appendChild(row);
  });
  card.appendChild(fragDeficit);

  const dica = document.createElement('div');
  if (diasRestantesAtivos.length > 0) {
    dica.className = 'deficit-dica';
    dica.textContent = 'Para atingir a meta mensal, você precisa fazer em média ';
    const bold1 = document.createElement('strong');
    bold1.style.color = 'var(--laranja)';
    bold1.textContent = mediaNecess + ' visitas/dia';
    const bold2 = document.createElement('strong');
    bold2.textContent = diasRestantesAtivos.length;
    dica.appendChild(bold1);
    dica.appendChild(document.createTextNode(' nos '));
    dica.appendChild(bold2);
    dica.appendChild(document.createTextNode(' dias úteis restantes.'));
  } else {
    dica.className = 'deficit-sem-dias';
    dica.textContent = 'Não há mais dias úteis neste mês para recuperar o déficit.';
  }
  card.appendChild(dica);
  alertaEl.replaceChildren(card);
}

function renderMetas() {
  const m   = db.metas || {};
  _metasSincronizarInputs(m);
  const ctx = _metasContextoMes(m);
  _metasRenderResumo(ctx, m, $id('metas-resumo'));
  _metasRenderCalendario(ctx, m, $id('metas-calendario'));
  _metasRenderAlertas(ctx, $id('metas-alerta'));
}

function abrirAjusteDia(data, metaAtual, realizado) {
  var _old = $id('ajuste-dia-overlay');
  if (_old) _old.remove();
  db.metasExtras     = db.metasExtras     || {};
  db.metasRealizadas = db.metasRealizadas || {};

  var extrasHoje      = db.metasExtras[data]     || [];
  var realizadoManual = db.metasRealizadas[data] != null ? db.metasRealizadas[data] : '';

  function _extrasHtml(list) {
    var LABEL = { ac: 'Atividade Coletiva', re: 'Reunião de Equipe', ae: 'Ação Extramuro' };
    var COR   = { ac: 'var(--violet-bg)', re: 'rgba(139,92,246,.12)', ae: 'var(--emerald-bg)' }; // tints: ac=consulta/re=retorno/ae=atividade
    if (!list.length) return '<div id="extras-lista" style="color:var(--cinza-500);font-size:var(--text-xs);padding:4px 0">Nenhuma atividade adicionada.</div>';
    return '<div id="extras-lista">' + list.map(function(e, i) {
      // Atualizar metas após remoção
      return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;background:' + (COR[e.tipo]||'var(--surface-2)') + ';padding:5px 8px;border-radius:6px;font-size:var(--text-xs)">' +
        '<span style="flex:1">' + (LABEL[e.tipo]||e.tipo) + ' — <strong>' + e.qtd + ' vis.</strong></span>' +
        '<button onclick="(function(){' +
          'db.metasExtras[\'' + data + '\'].splice(' + i + ',1);' +
          'save();renderMetas();' +
          'document.getElementById(\'extras-lista-wrap\').innerHTML=_extrasHtmlGlobal(\'' + data + '\');' +
        '})()" style="background:none;border:none;cursor:pointer;color:var(--vermelho-cl);font-size:var(--text-sm);padding:0 2px">✕</button>' +
      '</div>';
    }).join('') + '</div>';
  }
  window._extrasHtmlGlobal = function(d) { return _extrasHtml(db.metasExtras[d] || []); };

  var overlay = document.createElement('div');
  overlay.id        = 'ajuste-dia-overlay';
  overlay.className = 'modal-overlay';
  overlay.style.display = 'flex';
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px;">
      <div class="modal-header">
        <h2>📅 ${typeof formatData==='function'?formatData(data):data}</h2>
        <button class="btn-close" aria-label="Fechar" title="Fechar" onclick="$id('ajuste-dia-overlay').remove()">✕</button>
      </div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:14px">

        <div style="background:var(--cinza-50);border-radius:8px;padding:12px">
          <div style="font-weight:700;font-size:var(--text-sm);margin-bottom:8px">🎯 Meta do dia</div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div class="form-group" style="margin:0;flex:1;min-width:100px">
              <label style="font-size:var(--text-xs)">Nova meta</label>
              <input class="input" type="number" id="ajuste-meta-val" value="${metaAtual}" min="0" max="30" style="margin-top:3px">
            </div>
            <label style="display:flex;align-items:center;gap:6px;font-size:var(--text-sm);cursor:pointer;margin-top:16px">
              <input type="checkbox" id="ajuste-folga" ${metaAtual===0?'checked':''}> Folga
            </label>
          </div>
          <div style="font-size:var(--text-xs);color:var(--cinza-500);margin-top:4px">Meta 0 = Folga (não conta no cálculo mensal)</div>
        </div>

        <div style="background:var(--cinza-50);border-radius:8px;padding:12px">
          <div style="font-weight:700;font-size:var(--text-sm);margin-bottom:8px">✏️ Visitas realizadas (ajuste manual)</div>
          <div style="font-size:var(--text-xs);color:var(--cinza-500);margin-bottom:6px">Registradas automaticamente: <strong>${realizado}</strong> vis. &nbsp;·&nbsp; Deixe em branco para usar o valor automático.</div>
          <input class="input" type="number" id="ajuste-realizado-val" value="${realizadoManual}" min="0" max="99" placeholder="Ex: 8 — sobrescreve o automático">
        </div>

        <div style="background:var(--cinza-50);border-radius:8px;padding:12px">
          <div style="font-weight:700;font-size:var(--text-sm);margin-bottom:8px">➕ Atividades no dia</div>
          <div id="extras-lista-wrap">${_extrasHtml(extrasHoje)}</div>
          <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
            <select class="input" id="extra-tipo" style="flex:1;min-width:140px">
              <option value="ac">🟦 Atividade Coletiva</option>
              <option value="re">🟪 Reunião de Equipe</option>
              <option value="ae">🟩 Ação Extramuro</option>
            </select>
            <input class="input" type="number" id="extra-qtd" value="1" min="1" max="99" style="width:70px" placeholder="Qtd">
            <button class="btn btn-secondary btn-sm" onclick="(function(){
              var t=$id('extra-tipo').value;
              var q=parseInt($id('extra-qtd').value)||1;
              db.metasExtras['${data}']=db.metasExtras['${data}']||[];
              db.metasExtras['${data}'].push({tipo:t,qtd:q});
              save();renderMetas();
              $id('extras-lista-wrap').innerHTML=_extrasHtmlGlobal('${data}');
            })()">+ Adicionar</button>
          </div>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="$id('ajuste-dia-overlay').remove()">Cancelar</button>
        <button class="btn btn-primary" onclick="confirmarAjusteDia('${data}')">Salvar</button>
      </div>
    </div>`;
  _getOverlayRoot().appendChild(overlay);

  const chk = $id('ajuste-folga');
  const inp = $id('ajuste-meta-val');
  if (chk && inp) {
    inp.disabled = chk.checked;
    chk.addEventListener('change', function() {
      inp.value    = this.checked ? '0' : metaAtual;
      inp.disabled = this.checked;
    });
  }
}

function confirmarAjusteDia(data) {
  db.metasAjustes     = db.metasAjustes     || {};
  db.metasRealizadas  = db.metasRealizadas  || {};
  const folga   = $id('ajuste-folga')?.checked;
  const metaVal = folga ? 0 : (parseInt($id('ajuste-meta-val')?.value) || 0);
  const realVal = $id('ajuste-realizado-val')?.value;
  db.metasAjustes[data] = metaVal;
  if (realVal !== '' && realVal != null) {
    db.metasRealizadas[data] = parseInt(realVal) || 0;
  } else {
    delete db.metasRealizadas[data];
  }
  save(); renderMetas();
  $id('ajuste-dia-overlay')?.remove();
  toast(folga ? `${formatData(data)} marcado como folga` : `${formatData(data)}: meta ${metaVal} vis. salva`, 'success');
}
function toggleSidebar() {
  const sb = document.querySelector('.sidebar');
  const ov = $id('sidebar-overlay');
  const isOpen = sb.classList.toggle('open');
  if (ov) ov.classList.toggle('active', isOpen);
}
function closeSidebar() {
  document.querySelector('.sidebar')?.classList.remove('open');
  $id('sidebar-overlay')?.classList.remove('active');
}

// Swipe para sidebar: gerenciado por app-ui.js (tabletTouchEnhancements)

// db.metas e db.metasAjustes já inicializados em _initDbStructure() após load()
_preencherConfigDefaults();
$id('acs-nome').textContent = db.config.nome || 'ACS';
$id('acs-area').textContent = `Microárea ${db.config.microarea || '09'} · ${db.config.esf || 'ESF'}`;
updateBadge();
renderDashboard();

// ============================================
