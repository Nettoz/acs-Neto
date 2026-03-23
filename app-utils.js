// ACS Neto — app-utils.js
// Utilitários puros: datas, idades, badges, validações
// Depende de: app-core.js (db, getIndividuo, getFamilia, esc, hoje)

// ── Primitivos DOM (movidos de app-crud.js — devem existir antes de app-vacinas.js e app-render.js) ──
function $id(id)             { return document.getElementById(id); }
function $val(id, fallback)  { if (fallback === undefined) fallback = ''; var el = document.getElementById(id); return el != null ? el.value : fallback; }
function $set(id, val)       { var el = document.getElementById(id); if (el) el.value = (val != null ? val : ''); }
function $check(id)          { var el = document.getElementById(id); return !!(el && el.checked); }
function $setCheck(id, bool) { var el = document.getElementById(id); if (el) el.checked = !!bool; }
function $trim(id, fallback) { if (fallback === undefined) fallback = ''; var el = document.getElementById(id); return (el != null ? el.value : fallback).trim(); }
function $show(id, display)  { var el = document.getElementById(id); if (el) el.style.display = (display !== undefined ? display : ''); }
function $hide(id)           { var el = document.getElementById(id); if (el) el.style.display = 'none'; }
function $text(id, txt)      { var el = document.getElementById(id); if (el) el.textContent = txt; }

// ── Helpers de data (movidos de app-fichas-core.js — devem existir antes de app-vacinas.js e app-render.js) ──
function parseDateBR(str) {
  if (!str || str.length !== 10) return null;
  var p = str.split('/');
  if (p.length !== 3) return null;
  var d = parseInt(p[0],10), m = parseInt(p[1],10), y = parseInt(p[2],10);
  if (!d||!m||!y||y<1900||y>2100||m<1||m>12||d<1||d>31) return null;
  var dt = new Date(y, m-1, d);
  if (dt.getFullYear()!==y||dt.getMonth()!==m-1||dt.getDate()!==d) return null;
  return dt;
}
function dateToISO(dt) {
  return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
}
function _brToISO(val) { var dt = parseDateBR(val); return dt ? dateToISO(dt) : ''; }
function _isoToBR(val) {
  if (!val || val.length !== 10) return '';
  var p = val.split('-');
  return p[2]+'/'+p[1]+'/'+p[0];
}

function amanha() { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0]; }

// Helper: formata IDs com 3 dígitos
function fmtId(n) { return String(n||0).padStart(3,'0'); }

// ── Helper interno: normaliza nasc para ISO (YYYY-MM-DD) ─────────────────────
// Aceita ISO, BR (DD/MM/YYYY) e retorna ISO ou null se inválido.
function _nascToISO(nasc) {
  if (!nasc || nasc === '') return null;
  if (nasc.includes('/')) {
    var dt = parseDateBR(nasc);
    return dt ? dateToISO(dt) : null;
  }
  return nasc; // já é ISO
}

function calcIdade(nasc) {
  var iso = _nascToISO(nasc);
  if (!iso) return { texto: '–', anos: null, meses: null };
  const dataNasc = new Date(iso + 'T00:00:00');
  if (isNaN(dataNasc.getTime())) return { texto: '–', anos: null, meses: null };

  const hoje = new Date();
  const diffMs = hoje - dataNasc;
  if (diffMs < 0) return { texto: '–', anos: null, meses: null };

  // Calcula anos/meses exatos sem usar média de 365.25
  const anos = hoje.getFullYear() - dataNasc.getFullYear() -
    ((hoje.getMonth() < dataNasc.getMonth() ||
      (hoje.getMonth() === dataNasc.getMonth() && hoje.getDate() < dataNasc.getDate())) ? 1 : 0);

  if (anos < 1) {
    const meses = hoje.getMonth() - dataNasc.getMonth() +
      (hoje.getFullYear() - dataNasc.getFullYear()) * 12 -
      (hoje.getDate() < dataNasc.getDate() ? 1 : 0);
    const m = Math.max(0, meses);
    return { texto: m + (m === 1 ? ' mês' : ' meses'), anos: 0, meses: m };
  }

  return { texto: anos + ' ano' + (anos !== 1 ? 's' : ''), anos: anos, meses: anos * 12 };
}

function getIdadeEmAnos(nasc) {
  var iso = _nascToISO(nasc);
  if (!iso) return null;
  const dataNasc = new Date(iso + 'T00:00:00');
  if (isNaN(dataNasc.getTime())) return null;
  const hoje = new Date();
  // Retorna inteiro exato (anos completos, sem fração)
  return hoje.getFullYear() - dataNasc.getFullYear() -
    ((hoje.getMonth() < dataNasc.getMonth() ||
      (hoje.getMonth() === dataNasc.getMonth() && hoje.getDate() < dataNasc.getDate())) ? 1 : 0);
}

// ── Centraliza cálculo de idade em meses — elimina duplicações inline ─────────
function getIdadeEmMeses(nasc) {
  var iso = _nascToISO(nasc);
  if (!iso) return null;
  const dataNasc = new Date(iso + 'T00:00:00');
  if (isNaN(dataNasc.getTime())) return null;
  const hoje = new Date();
  const meses = (hoje.getFullYear() - dataNasc.getFullYear()) * 12 +
    (hoje.getMonth() - dataNasc.getMonth()) -
    (hoje.getDate() < dataNasc.getDate() ? 1 : 0);
  return Math.max(0, meses);
}

function formatData(d) {
  if (!d) return '–';
  const [y,m,dia] = d.split('-');
  return `${dia}/${m}/${y}`;
}

function diasSemVisita(dataVisita) {
  if (!dataVisita) return 999;
  return Math.floor((new Date() - new Date(dataVisita)) / (24*3600*1000));
}

function badgeRisco(risco) {
  const m = { alto:'<span class="badge badge-red"><b style="color:var(--vermelho)">●</b> Alto</span>', medio:'<span class="badge badge-yellow"><b style="color:#795600">●</b> Médio</span>', baixo:'<span class="badge badge-green"><b style="color:var(--verde)">●</b> Baixo</span>' };
  return m[risco] || '<span class="badge badge-gray">–</span>';
}

function condicoesLabel(ind) {
  const tags = [];
  if (ind.has === 'sim') tags.push('<span class="badge badge-orange">HAS</span>');
  if (ind.dm === 'sim') tags.push('<span class="badge badge-red">DM</span>');
  if (ind.gestante === 'sim') tags.push('<span class="badge badge-blue">Gestante</span>');
  if (ind.tb === 'tb') tags.push('<span class="badge badge-red">TB</span>');
  if (ind.tb === 'hanseniase') tags.push('<span class="badge badge-red">Hanseníase</span>');
  if (ind.tea === 'sim')       tags.push('<span class="badge badge-purple">TEA</span>');
  if (ind.alcool === 'sim')    tags.push('<span class="badge badge-yellow">Álcool</span>');
  if (ind.drogas === 'sim')    tags.push('<span class="badge badge-red">Drogas</span>');
  if (ind.avc === 'sim')       tags.push('<span class="badge badge-orange">AVC</span>');
  if (ind.infarto === 'sim')   tags.push('<span class="badge badge-orange">Infarto</span>');
  if (ind.mental === 'sim') tags.push('<span class="badge badge-blue">S. Mental</span>');
  if (ind.deficiencia !== 'nao' && ind.deficiencia) tags.push('<span class="badge badge-gray">Defic.</span>');
  if (ind.alergias && ind.alergias.trim()) tags.push('<span class="badge" style="background:var(--amarelo-bg);color:var(--amarelo);border:1px solid var(--amarelo)">⚠️ Alergia</span>');
  // Badge vacina atrasada
  if (typeof temVacinaAtrasada === 'function' && temVacinaAtrasada(ind)) tags.push('<span class="badge" style="background:var(--vermelho-bg);color:var(--vermelho);border:1px solid var(--vermelho)">🔴 Vacina atrasada</span>');
  // Exames femininos atrasados
  if (ind.sexo === 'F') {
    const idadeAnos = getIdadeEmAnos(ind.nasc);
    if (ind.papanicolau && idadeAnos !== null && idadeAnos >= 25 && idadeAnos <= 64) {
      const vencPap = new Date(ind.papanicolau + 'T00:00:00');
      vencPap.setFullYear(vencPap.getFullYear() + 1);
      if (new Date() >= vencPap) tags.push('<span class="badge" style="background:var(--vermelho-bg);color:var(--vermelho);border:1px solid var(--vermelho)">🔴 Papanicolau atrasado</span>');
    } else if (!ind.papanicolau && idadeAnos !== null && idadeAnos >= 25 && idadeAnos <= 64) {
      tags.push('<span class="badge" style="background:var(--amarelo-bg);color:var(--amarelo);border:1px solid var(--amarelo)">Papanicolau s/ registro</span>');
    }
    if (ind.mamografia && idadeAnos !== null && idadeAnos >= 40 && idadeAnos <= 69) {
      const vencMamo = new Date(ind.mamografia + 'T00:00:00');
      vencMamo.setFullYear(vencMamo.getFullYear() + 2);
      if (new Date() >= vencMamo) tags.push('<span class="badge" style="background:var(--vermelho-bg);color:var(--vermelho);border:1px solid var(--vermelho)">🔴 Mamografia atrasada</span>');
    } else if (!ind.mamografia && idadeAnos !== null && idadeAnos >= 40 && idadeAnos <= 69) {
      tags.push('<span class="badge" style="background:var(--amarelo-bg);color:var(--amarelo);border:1px solid var(--amarelo)">Mamografia s/ registro</span>');
    }
  }
  const _meses = getIdadeEmMeses(ind.nasc);
  if (_meses !== null && _meses < 12)
    tags.push('<span class="badge badge-green">≤1 ano</span>');
  return tags.join(' ') || '<span style="color:var(--cinza-500);font-size:var(--text-xs)">Nenhuma</span>';
}

// ── Validação CPF ──────────────────────────────────────────────────

// ── Sanitização de entrada de texto ──────────────────────────────
// Remove caracteres de controle e normaliza espaços
function sanitizeInput(v) {
  if (!v) return '';
  return String(v)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars
    .replace(/\s+/g, ' ')  // normalize whitespace
    .trim();
}

function validarCPF(cpf) {
  cpf = (cpf || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i]) * (10 - i);
  let r = (soma * 10) % 11; if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(cpf[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i]) * (11 - i);
  r = (soma * 10) % 11; if (r === 10 || r === 11) r = 0;
  return r === parseInt(cpf[10]);
}
function validarCNS(cns) {
  cns = (cns || '').replace(/\D/g, '');
  if (cns.length !== 15) return false;
  if (/^[12]/.test(cns)) {
    let pis = cns.substring(0, 11), soma = 0;
    for (let i = 0; i < 11; i++) soma += parseInt(pis[i]) * (15 - i);
    let dsc = 11 - (soma % 11);
    let r = dsc === 11 ? pis + '0000' : dsc === 10 ? pis + '0001' : pis + String(dsc).padStart(4,'0');
    return r === cns;
  }
  if (/^[789]/.test(cns)) {
    let soma = 0;
    for (let i = 0; i < 15; i++) soma += parseInt(cns[i]) * (15 - i);
    return soma % 11 === 0;
  }
  return false;
}
function validarDataNasc(nasc) {
  if (!nasc) return { ok: true };
  // Aceita dd/mm/aaaa (input texto) ou YYYY-MM-DD (legado/ISO)
  var iso = nasc.includes('/') ? _brToISO(nasc) : nasc;
  if (!iso) return { ok: false, msg: 'Data de nascimento inválida.' };
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return { ok: false, msg: 'Data de nascimento inválida.' };
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  if (d > hoje) return { ok: false, msg: 'Data de nascimento não pode ser futura.' };
  if (d.getFullYear() < 1900) return { ok: false, msg: 'Data de nascimento inválida (muito antiga).' };
  return { ok: true };
}

// Gera cor do arco baseada na porcentagem
function arcColor(pct) {
  if (pct >= 80) return 'var(--emerald-600)';  // verde
  if (pct >= 50) return 'var(--orange-400)';   // amarelo
  if (pct >= 25) return 'var(--orange-500)';   // laranja
  return 'var(--rose-600)';           // vermelho
}

function getRiscoIndividuo(ind) {
  if (!ind || !ind.familiaId) return 'baixo';
  
  // Primeiro, verificar o risco da família (mais confiável)
  const familia = getFamilia(ind.familiaId);
  if (familia && familia.risco) {
    return familia.risco;
  }
  
  // Fallback: cálculo baseado nas condições do indivíduo
  const hasFatoresAlto = (ind.has === 'sim' && ind.dm === 'sim') || 
                         ind.gestante === 'sim' || 
                         ind.tb === 'tb' || 
                         ind.tb === 'hanseniase';
  
  if (hasFatoresAlto) return 'alto';
  
  const hasFatoresMedio = ind.has === 'sim' || ind.dm === 'sim' || ind.mental === 'sim';
  if (hasFatoresMedio) return 'medio';
  
  return 'baixo';
}

function getDiasDoMes(ano, mes) {
  // Retorna array de objetos {data, diaSemana, tipo:'util'|'sabado'|'domingo'}
  const dias = [];
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  for (let d = 1; d <= totalDias; d++) {
    const dt = new Date(ano, mes, d);
    const ds = dt.getDay(); // 0=dom,6=sab
    dias.push({ dia: d, data: `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
      diaSemana: ds, tipo: ds === 0 ? 'domingo' : ds === 6 ? 'sabado' : 'util' });
  }
  return dias;
}

function metaDiaVisitas(tipoDia) {
  const m = db.metas || {};
  if (tipoDia === 'util')    return (m.manha||5) + (m.tarde||5);
  if (tipoDia === 'sabado')  return m.sabado  === 'sim' ? (m.manha||5) + (m.tarde||5) : 0;
  if (tipoDia === 'domingo') return m.domingo === 'sim' ? (m.manha||5) + (m.tarde||5) : 0;
  return 0;
}

// save() — wrapper global; delega para DB.saveSync() antes do login
// e para DB.saveSafe() após o login (ver window.save abaixo)

// Retorna texto completo: "X anos, Y meses e Z dias"
function idadeExata(nasc) {
  if (!nasc || nasc === '') return null;
  const dn = new Date(nasc + 'T00:00:00');
  if (isNaN(dn.getTime())) return null;
  const hj = new Date();
  let anos = hj.getFullYear() - dn.getFullYear();
  let meses = hj.getMonth() - dn.getMonth();
  let dias = hj.getDate() - dn.getDate();
  if (dias < 0) {
    meses--;
    dias += new Date(hj.getFullYear(), hj.getMonth(), 0).getDate();
  }
  if (meses < 0) { anos--; meses += 12; }
  const p = [];
  if (anos > 0)  p.push(anos  + (anos  === 1 ? ' ano'   : ' anos'));
  if (meses > 0) p.push(meses + (meses === 1 ? ' mês'   : ' meses'));
  if (dias > 0)  p.push(dias  + (dias  === 1 ? ' dia'   : ' dias'));
  if (p.length === 0) return '0 dias';
  if (p.length === 1) return p[0];
  return p.slice(0, -1).join(', ') + ' e ' + p[p.length - 1];
}
// ── calcIdadeCard(nasc) — formato compacto para cards de membro ──────────────
// Retorna { linha1: string curta (ex: "2a 3m"), linha2: string longa (ex: "2a 3m de vida") }
// Substitui idadeDetalhada() inline em renderMembrosSelecta — única fonte de verdade
function calcIdadeCard(nasc) {
  if (!nasc) return { linha1: '?', linha2: 'sem nasc.' };
  var iso = _nascToISO(nasc);
  if (!iso) return { linha1: '?', linha2: 'sem nasc.' };
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return { linha1: '?', linha2: 'sem nasc.' };
  const agora = new Date();
  if (agora < d) return { linha1: '?', linha2: 'data futura' };

  const diffMs   = agora - d;
  const diffDias = Math.floor(diffMs / 86400000);

  if (diffDias < 30) {
    const s = diffDias === 1 ? '1 dia de vida' : diffDias + ' dias de vida';
    return { linha1: diffDias + 'd', linha2: s };
  }

  // Cálculo exato em meses e anos por calendário
  const anos  = agora.getFullYear() - d.getFullYear() -
    ((agora.getMonth() < d.getMonth() ||
      (agora.getMonth() === d.getMonth() && agora.getDate() < d.getDate())) ? 1 : 0);
  const mesesTotal = (agora.getFullYear() - d.getFullYear()) * 12 +
    (agora.getMonth() - d.getMonth()) -
    (agora.getDate() < d.getDate() ? 1 : 0);
  const meses = Math.max(0, mesesTotal);

  if (meses < 60) {
    const a = Math.floor(meses / 12);
    const m = meses % 12;
    const partes = [];
    if (a > 0) partes.push(a + 'a');
    if (m > 0) partes.push(m + 'm');
    // dias extras apenas para bebês < 12 meses (a === 0)
    if (a === 0) {
      const nascDia = new Date(d.getFullYear(), d.getMonth() + meses, d.getDate());
      const diasExtra = Math.floor((agora - nascDia) / 86400000);
      if (diasExtra > 0) partes.push(diasExtra + 'd');
    }
    const texto = partes.join(' ') || '< 1m';
    return { linha1: texto, linha2: texto + (a === 0 ? ' de vida' : '') };
  }
  return { linha1: anos + ' anos', linha2: anos + ' anos' };
}


// ═══════════════════════════════════════════════════════════════════════════
// SISTEMA DE TEMPLATES — cloneTemplate / renderList / createEmptyState
// Resolve: #5 Bloat, #6 CSS/JS acoplados, #9 Inconsistência, #10 Manutenibilidade
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Clona um <template id="..."> usando document.importNode — forma idiomática
 * recomendada pelo padrão HTML. Retorna o elemento raiz do template.
 *
 * Uso:
 *   const el = cloneTemplate('tpl-agenda-visita');
 *   el.querySelector('.av-familia').textContent = ind.nome; // seguro contra XSS
 *   container.appendChild(el);
 *
 * Por que importNode e não cloneNode?
 *   - importNode adota o fragmento para o documento atual (importante em iframes/shadow DOM)
 *   - É o padrão recomendado pelo WHATWG para clonar <template>
 *   - Semântica mais clara: "importar conteúdo de um template para o documento"
 */
function cloneTemplate(id) {
  const tpl = document.getElementById(id);
  if (!tpl) {
    console.warn('[tpl] <template id="' + id + '"> não encontrado');
    return document.createElement('div');
  }
  // importNode(node, deep=true) — adota e clona o DocumentFragment completo
  const fragment = document.importNode(tpl.content, true);
  return fragment.firstElementChild;
}

/**
 * Renderiza uma lista a partir de um <template>, usando DocumentFragment
 * para evitar reflows múltiplos. Cada item é clonado via importNode.
 *
 * @param {string}   containerId  - id do elemento container
 * @param {string}   templateId   - id do <template>
 * @param {Array}    items        - array de dados
 * @param {Function} fillFn       - function(el, item) preenche o clone via textContent
 * @param {string}   [emptyHtml]  - HTML exibido quando items.length === 0
 */
function renderList(containerId, templateId, items, fillFn, emptyHtml) {
  const container = $id(containerId);
  if (!container) return;

  if (!items || !items.length) {
    container.innerHTML = emptyHtml || '';
    return;
  }

  // Pré-busca o template uma única vez — evita getElementById por item
  const tpl = document.getElementById(templateId);
  if (!tpl) {
    console.warn('[renderList] <template id="' + templateId + '"> não encontrado');
    return;
  }

  const frag = document.createDocumentFragment();
  items.forEach(function(item) {
    const clone    = document.importNode(tpl.content, true);
    const el       = clone.firstElementChild;
    fillFn(el, item);
    frag.appendChild(el);
  });

  container.innerHTML = '';
  container.appendChild(frag);
}

/**
 * Cria um empty-state padronizado a partir do template tpl-empty-state.
 * Elimina as 9+ variantes inconsistentes espalhadas nos arquivos JS.
 *
 * @param {string}  icon   - emoji ou texto do ícone
 * @param {string}  title  - título principal
 * @param {string}  desc   - texto de apoio (opcional)
 * @param {Object}  [action] - { label, onclick } botão opcional
 * @returns {HTMLElement}
 */
function createEmptyState(icon, title, desc, action) {
  const el = cloneTemplate('tpl-empty-state');
  if (!el) {
    const div = document.createElement('div');
    div.className = 'tpl-empty-state';
    div.innerHTML = '<p style="text-align:center;padding:24px;color:var(--cinza-500)">' + (title || '') + '</p>';
    return div;
  }
  const iconEl  = el.querySelector('.es-icon');
  const titleEl = el.querySelector('.es-title');
  const descEl  = el.querySelector('.es-desc');
  const btnEl   = el.querySelector('.es-btn');

  if (iconEl)  iconEl.textContent  = icon  || '';
  if (titleEl) titleEl.textContent = title || '';
  if (descEl) {
    if (desc) { descEl.textContent = desc; }
    else      { descEl.hidden = true; }
  }
  if (btnEl) {
    if (action) {
      btnEl.textContent = action.label;
      btnEl.addEventListener('click', action.onclick);
      btnEl.hidden = false;
    } else {
      btnEl.hidden = true;
    }
  }
  return el;
}

// ── _getOverlayRoot() ─────────────────────────────────────────────────────────
// Em modo tablet o .app é o stacking context confinado — overlays dinâmicos
// devem ser appendados a ele, não ao document.body, para ficarem dentro do frame.
// Em modo PC mantém o comportamento legado (document.body).
//
// Uso:  _getOverlayRoot().appendChild(overlayEl);
function _getOverlayRoot() {
  if (document.documentElement.getAttribute('data-modo') === 'tablet') {
    const app = document.querySelector('.app');
    if (app) return app;
  }
  return document.body;
}
