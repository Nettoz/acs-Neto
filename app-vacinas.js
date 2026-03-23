// ACS Neto — app-vacinas.js
// Calendário vacinal PNI, VacinaModule e helpers de vacina
// Depende de: app-core.js (db, esc, hoje, _brToISO, formatData, _getDataHoraAtiva)

const CALENDARIO_VACINAL = [
  { nome:'BCG', doses:1, idades:['ao nascer'], doseMeses:[0], minMeses:0, maxMeses:1 },
  { nome:'Hepatite B', doses:3, idades:['ao nascer','2 meses','6 meses'], doseMeses:[0,2,6], minMeses:0, maxMeses:216 },
  { nome:'Pentavalente (DTP+Hib+HepB)', doses:3, idades:['2 meses','4 meses','6 meses'], doseMeses:[2,4,6], minMeses:1.5, maxMeses:18 },
  { nome:'VIP — Poliomielite inativada', doses:3, idades:['2 meses','4 meses','6 meses'], doseMeses:[2,4,6], minMeses:1.5, maxMeses:18 },
  { nome:'VOP — Poliomielite oral (reforços)', doses:2, idades:['15 meses','4 anos'], doseMeses:[15,48], minMeses:12, maxMeses:60 },
  { nome:'Pneumocócica 10-valente', doses:3, idades:['2 meses','4 meses','12 meses (reforço)'], doseMeses:[2,4,12], minMeses:1.5, maxMeses:48 },
  { nome:'Rotavírus humano', doses:2, idades:['2 meses','4 meses'], doseMeses:[2,4], minMeses:1.5, maxMeses:7.5 },
  { nome:'Meningocócica C', doses:3, idades:['3 meses','5 meses','12 meses (reforço)'], doseMeses:[3,5,12], minMeses:2, maxMeses:18 },
  { nome:'Febre Amarela', doses:2, idades:['9 meses','4 anos (reforço)'], doseMeses:[9,48], minMeses:8.5, maxMeses:999 },
  { nome:'Tríplice Viral — SCR', doses:2, idades:['12 meses','15 meses'], doseMeses:[12,15], minMeses:11, maxMeses:60 },
  { nome:'DTP — Tríplice Bacteriana (reforços)', doses:2, idades:['15 meses','4 anos'], doseMeses:[15,48], minMeses:12, maxMeses:60 },
  { nome:'Varicela', doses:1, idades:['15 meses'], doseMeses:[15], minMeses:12, maxMeses:48 },
  { nome:'Hepatite A', doses:1, idades:['15 meses'], doseMeses:[15], minMeses:12, maxMeses:36 },
  { nome:'HPV (SUS — meninas)', doses:2, idades:['9 anos','6 meses após 1ª dose'], doseMeses:[108,114], minMeses:108, maxMeses:180, feminino:true },
  { nome:'Meningocócica ACWY', doses:1, idades:['11–12 anos'], doseMeses:[132], minMeses:108, maxMeses:156 },
  { nome:'dTpa — reforço (adulto/gestante)', doses:1, idades:['a partir de 11 anos'], doseMeses:[132], minMeses:108, maxMeses:999 },
  { nome:'Influenza (anual — grupos prioritários)', doses:1, idades:['anualmente'], doseMeses:[6], minMeses:6, maxMeses:999 },
  { nome:'dT — dupla adulto (a cada 10 anos)', doses:1, idades:['a cada 10 anos'], doseMeses:[120], minMeses:120, maxMeses:999 },
];

const VAC_INFO = {
  'BCG':                               { icon:'🛡️', desc:'Protege contra tuberculose grave (meningite, miliar). Aplicada ao nascer.' },
  'Hepatite B':                         { icon:'🧬', desc:'Previne hepatite B — infecção crônica do fígado. 3 doses.' },
  'Pentavalente (DTP+Hib+HepB)':       { icon:'💉', desc:'Protege contra 5 doenças: difteria, tétano, coqueluche, meningite por Hib e hepatite B.' },
  'VIP — Poliomielite inativada':       { icon:'🦵', desc:'Previne poliomielite (paralisia infantil). Versão injetada — inicia o esquema.' },
  'VOP — Poliomielite oral (reforços)': { icon:'💊', desc:'Reforço da poliomielite em gotinhas. Dois reforços aos 15 meses e 4 anos.' },
  'Pneumocócica 10-valente':            { icon:'🫁', desc:'Protege contra pneumonia, meningite e otite causadas pelo pneumococo.' },
  'Rotavírus humano':                   { icon:'🦠', desc:'Previne diarreia grave por rotavírus — principal causa de internação em bebês.' },
  'Meningocócica C':                    { icon:'🧠', desc:'Protege contra meningite e sepse causadas pelo meningococo tipo C.' },
  'Febre Amarela':                      { icon:'🌿', desc:'Protege contra febre amarela — obrigatória em regiões endêmicas do Brasil.' },
  'Tríplice Viral — SCR':               { icon:'🌡️', desc:'Previne sarampo, caxumba e rubéola. Duas doses entre 12 e 15 meses.' },
  'DTP — Tríplice Bacteriana (reforços)':{ icon:'🔁', desc:'Reforços de difteria, tétano e coqueluche aos 15 meses e 4 anos.' },
  'Varicela':                           { icon:'🔵', desc:'Previne catapora (varicela) e suas complicações. Dose única aos 15 meses.' },
  'Hepatite A':                         { icon:'🫀', desc:'Previne hepatite A — transmitida por água e alimentos contaminados.' },
  'HPV (SUS — meninas)':               { icon:'🎗️', desc:'Protege contra o HPV, principal causa de câncer do colo do útero. Para meninas 9–14 anos.' },
  'Meningocócica ACWY':                 { icon:'🧠', desc:'Proteção ampliada contra meningococo tipos A, C, W e Y. Adolescentes 11–12 anos.' },
  'dTpa — reforço (adulto/gestante)':   { icon:'🤰', desc:'Reforço que inclui coqueluche — essencial em gestantes para proteger o recém-nascido.' },
  'Influenza (anual — grupos prioritários)':{ icon:'🤧', desc:'Previne gripe sazonal. Renovada anualmente para grupos prioritários.' },
  'dT — dupla adulto (a cada 10 anos)': { icon:'🔄', desc:'Reforço de difteria e tétano. Deve ser repetido a cada 10 anos na vida adulta.' },
};
function getVacInfo(nome) {
  return VAC_INFO[nome] || { icon:'💉', desc:'' };
}

const VAC_ABREV = {
  'BCG':                                      'BCG',
  'Hepatite B':                               'Hep B',
  'Pentavalente (DTP+Hib+HepB)':              'Pentavalente',
  'VIP — Poliomielite inativada':             'VIP',
  'VOP — Poliomielite oral (reforços)':       'VOP',
  'Pneumocócica 10-valente':                  'Pneumo 10',
  'Rotavírus humano':                         'Rota',
  'Meningocócica C':                          'MenC',
  'Febre Amarela':                            'F. Amarela',
  'Tríplice Viral — SCR':                     'SCR',
  'DTP — Tríplice Bacteriana (reforços)':     'DTP',
  'Varicela':                                 'Varicela',
  'Hepatite A':                               'Hep A',
  'HPV (SUS — meninas)':                      'HPV',
  'Meningocócica ACWY':                       'MenACWY',
  'dTpa — reforço (adulto/gestante)':         'dTpa',
  'Influenza (anual — grupos prioritários)':  'Influenza',
  'dT — dupla adulto (a cada 10 anos)':       'dT',
};
function vacAbrev(nome) { return VAC_ABREV[nome] || nome; }

// Vacinas de ciclo repetitivo (anual/decenal) sem data de início definida —
// não há como saber se estão "atrasadas" sem histórico completo anterior ao sistema.
// São gerenciadas pelas fichas de acompanhamento, não pelo calendário de doses.
const _VACINAS_CICLICAS = new Set([
  'Influenza (anual — grupos prioritários)',
  'dT — dupla adulto (a cada 10 anos)',
]);

// ── Verifica se o indivíduo possui alguma vacina do calendário atrasada ──────
function temVacinaAtrasada(ind) {
  if (!ind || !ind.nasc) return false;
  const nascDate = new Date(ind.nasc + 'T00:00:00');
  if (isNaN(nascDate.getTime())) return false;
  const agora = new Date();
  const idadeMeses = (agora - nascDate) / (30.44 * 24 * 3600 * 1000);

  return CALENDARIO_VACINAL.some(vac => {
    // Ignora vacinas de ciclo repetitivo (sem marco inicial confiável)
    if (_VACINAS_CICLICAS.has(vac.nome)) return false;
    // Ignora vacinas exclusivas de outro gênero
    if (vac.feminino && ind.sexo !== 'F') return false;
    // Ignora vacinas infantis (maxMeses<=60) em adultos/crianças > 5 anos
    if (idadeMeses > 60 && vac.maxMeses <= 60) return false;
    // Ignora vacinas muito além da faixa etária (12 meses de tolerância)
    if (idadeMeses > (vac.maxMeses + 12)) return false;

    // Suporte ao formato legado ({ nome, data, lote }) e ao formato atual ({ nome, doses:[] })
    const regVacina = (ind.vacinas || []).find(v => v.nome === vac.nome);
    const dosesTomadas = regVacina
      ? (regVacina.doses || (regVacina.data ? [{ data: regVacina.data }] : []))
      : [];

    return (vac.doseMeses || []).some((mesesPrevistos, index) => {
      // Dose já deveria ter sido dada (tolerância de 1 mês)?
      if (idadeMeses < mesesPrevistos + 1) return false;
      // Dose registrada?
      return !(dosesTomadas[index] && dosesTomadas[index].data);
    });
  });
}

let _tempMeds    = [];
let _acInstances = []; // instâncias de autocomplete — declarado aqui para evitar TDZ

// VacinaModule: calendário vacinal completo, doses, cobertura (~4k cha
// ✎ Alterar apenas se mudar calendário vacinal ou lógica de doses
// VacinaModule — gerencia estado temporário de vacinas e
// toda a lógica de filtragem/cobertura. _estado nunca exposto
// globalmente, eliminando a variável solta _tempVacinas.

function deepClone(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj)); // fallback browsers antigos
}

const VacinaModule = window.VacinaModule = (() => {
  let _estado = [];

  function init(vacinasExist) {
    _estado = vacinasExist ? deepClone(vacinasExist) : [];
    CALENDARIO_VACINAL.forEach(vac => {
      if (!_estado.find(x => x.nome === vac.nome))
        _estado.push({ nome: vac.nome, doses: [] });
    });
  }

  function getVacinasAplicaveis(idadeMeses, sexo) {
    return CALENDARIO_VACINAL.filter(v => {
      if (v.feminino && sexo !== 'F') return false;
      if (idadeMeses === null) return true;
      return idadeMeses >= (v.minMeses ?? 0);
    });
  }

  function getCobertura(vacToShow) {
    const aplicadas = vacToShow.filter(v => {
      const reg = _estado.find(x => x.nome === v.nome);
      return reg && reg.doses && reg.doses.some(d => d && d.data);
    }).length;
    return { aplicadas, total: vacToShow.length };
  }

  // Verifica se a dose já pode ser administrada (nascDate + meses da dose <= hoje)
  function doseDisponivel(nascDate, doseMeses) {
    if (!nascDate) return true;
    const dataMin = new Date(nascDate.getTime());
    dataMin.setDate(dataMin.getDate() + Math.floor(doseMeses * 30.44));
    return new Date() >= dataMin;
  }

  function toggleDose(regIdx, doseIdx) {
    const nascStr = $id('ind-nasc')?.value;
    const nascISO = nascStr && nascStr.includes('/') ? _brToISO(nascStr) : nascStr;
    const nascDate = nascISO ? new Date(nascISO + 'T00:00:00') : null;
    const vac = CALENDARIO_VACINAL.find(v => v.nome === _estado[regIdx]?.nome);
    if (nascDate && vac) {
      const doseMesesMin = (vac.doseMeses && vac.doseMeses[doseIdx] != null) ? vac.doseMeses[doseIdx] : (vac.minMeses ?? 0);
      if (!doseDisponivel(nascDate, doseMesesMin)) {
        const dp = new Date(nascDate.getTime());
        dp.setDate(dp.getDate() + Math.floor(doseMesesMin * 30.44));
        toast('\u26a0 Esta dose só pode ser aplicada a partir de ' + formatData(dp.toISOString().split('T')[0]), 'warn');
        return;
      }
    }
    if (!_estado[regIdx].doses) _estado[regIdx].doses = [];
    const dose = _estado[regIdx].doses[doseIdx];
    _estado[regIdx].doses[doseIdx] = dose && dose.data ? { data: null } : { data: hoje() };
    render(_estado, nascISO || nascStr);
  }

  function coletar() {
    return deepClone(_estado);
  }

  // render() — versão rica com ícones, botão ⓘ e VAC_DB integrado
  // (engine ex-patchVacinaModule fundido aqui; não há mais patch em runtime)
  function render(vacinasExist, nasc) {
    init(vacinasExist);
    const el     = $id('calendario-vacina');
    const infoEl = $id('vacina-idade-info');

    const nascDate   = nasc ? new Date(nasc + 'T00:00:00') : null;
    const now        = new Date();
    const idadeMeses = nascDate ? (now - nascDate) / (30.44 * 24 * 3600 * 1000) : null;
    const idadeAnos  = idadeMeses !== null ? Math.floor(idadeMeses / 12) : null;
    const sexo       = $id('ind-sexo')?.value || 'F';
    const vacToShow  = getVacinasAplicaveis(idadeMeses, sexo);
    const cob        = getCobertura(vacToShow);

    // Painel resumo
    if (infoEl) {
      if (!nascDate) {
        infoEl.innerHTML = '<span style="color:var(--slate-500)">Informe a data de nascimento para filtrar o calendário por idade.</span>';
      } else {
        const cor = cob.aplicadas === cob.total ? 'var(--verde)' : cob.aplicadas > 0 ? 'var(--amarelo)' : 'var(--vermelho)';
        infoEl.innerHTML = `<div style="display:flex;align-items:center;gap:var(--sp-3);flex-wrap:wrap">
          <span>Idade: <strong>${idadeAnos}a ${Math.floor(idadeMeses % 12)}m</strong></span>
          <span style="color:${cor}">● ${cob.aplicadas}/${cob.total} vacinas aplicadas</span>
        </div>`;
      }
    }

    if (!el) return;
    if (!vacToShow.length) {
      el.innerHTML = '<div style="color:var(--slate-500);font-size:var(--text-sm);padding:var(--sp-4)">Nenhuma vacina aplicável para esta faixa etária.</div>';
      return;
    }

    el.innerHTML = vacToShow.map(vac => {
      const regIdx  = _estado.findIndex(x => x.nome === vac.nome);
      const reg     = _estado[regIdx] || { nome: vac.nome, doses: [] };
      const todasOk = vac.idades.every((_, di) => reg.doses?.[di]?.data);
      const borda   = todasOk ? 'var(--verde)' : 'var(--cinza-300)';
      const bdrBox  = todasOk ? 'var(--verde-bdr)' : 'var(--cinza-200)';
      const dbInfo  = (typeof VAC_DB !== 'undefined' && VAC_DB[vac.nome]) || {};
      const icone   = dbInfo.icon || '💉';
      const nomeSafe = esc(vac.nome);
      const btnInfo = dbInfo.icon
        ? `<button class="vac-ibtn" onclick="event.stopPropagation();acsVacInfo('${nomeSafe.replace(/'/g,"\'")}')">ⓘ</button>`
        : '';

      const dosesHtml = vac.idades.map((idade, di) => {
        const doseReg      = reg.doses?.[di];
        const aplicada     = doseReg?.data;
        const doseMesesMin = (vac.doseMeses?.[di] != null) ? vac.doseMeses[di] : (vac.minMeses ?? 0);
        const liberada     = !nascDate || doseDisponivel(nascDate, doseMesesMin);
        if (!liberada) {
          const dp = new Date(nascDate.getTime());
          dp.setDate(dp.getDate() + Math.floor(doseMesesMin * 30.44));
          return `<div style="padding:6px var(--sp-2);background:var(--surface-2);border:1px solid var(--bdr);border-radius:var(--r-xs);font-size:var(--text-xs);opacity:.65;cursor:not-allowed">
            <div style="font-weight:600">D${di+1}: ${idade}</div>
            <div style="color:var(--slate-500)">🔒 A partir de ${formatData(dp.toISOString().split('T')[0])}</div>
          </div>`;
        }
        const bg  = aplicada ? 'var(--verde-fraco)' : 'var(--vermelho-fraco)';
        const bdr = aplicada ? 'var(--verde-claro)' : 'var(--vermelho)';
        return `<div style="padding:6px var(--sp-2);background:${bg};border:1px solid ${bdr};border-radius:var(--r-xs);font-size:var(--text-xs);cursor:pointer;transition:opacity .15s"
          onclick="VacinaModule.toggleDose(${regIdx},${di})" title="Clique para marcar/desmarcar">
          <div style="font-weight:600">D${di+1}: ${idade}</div>
          <div>${aplicada ? ('✓ ' + formatData(doseReg.data)) : 'Pendente'}</div>
        </div>`;
      }).join('');

      return `<div style="padding:10px var(--sp-3);background:var(--surface);border:1px solid ${bdrBox};border-radius:var(--radius-sm);border-left:3px solid ${borda}">
        <div class="vac-fix-hd">
          <span style="font-size:var(--text-base);flex-shrink:0">${icone}</span>
          <span class="vac-fix-nome" title="${nomeSafe}">${typeof vacAbrev==='function' ? esc(vacAbrev(vac.nome)) : nomeSafe}</span>
          ${btnInfo}
          <span class="vac-fix-badge">${vac.doses} dose(s) · ${todasOk
            ? '<span style="color:var(--verde)">✓ Completa</span>'
            : '<span style="color:var(--amarelo)">Pendente</span>'}
          </span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:var(--sp-1)">${dosesHtml}</div>
      </div>`;
    }).join('');
  }

  return { init, render, toggleDose, coletar, getVacinasAplicaveis, getCobertura };
})();

// Expõe: window.acsVacInfo, window._acsVacInjetarCSS (VacinaModule já no escopo)
// Depende de: app-utils.js, styles.css

(function acsVacinasFix() {
  'use strict';

  /* ══════════════════════════════════════════════════════════════
     BASE DE DADOS COMPLETA
  ══════════════════════════════════════════════════════════════ */
  /* ── Paleta de cores por vacina — edite aqui para alterar visual ── */
  var VAC_COLORS = {
    'BCG':                                    { cor: 'var(--violet-400)',    corBg: 'var(--violet-bg)' },
    'Febre Amarela':                          { cor: 'var(--orange-500)',    corBg: 'var(--orange-bg)' },
    'Hepatite A':                             { cor: 'var(--emerald-600)',   corBg: 'var(--emerald-bg)' },
    'Hepatite B':                             { cor: 'var(--orange-400)',    corBg: 'var(--orange-bg)' },
    'Meningocócica ACWY':                     { cor: 'var(--rose-600)',      corBg: 'var(--rose-bg)' },
    'Meningocócica C':                        { cor: 'var(--rose-500)',      corBg: 'var(--rose-bg)' },
    'Pneumocócica 10-valente':                { cor: 'var(--orange-500)',    corBg: 'var(--orange-bg)' },
    'Rotavírus humano':                       { cor: 'var(--violet-500)',    corBg: 'var(--violet-bg)' },
    'Varicela':                               { cor: 'var(--violet-600)',    corBg: 'var(--violet-bg)' },
    'Pentavalente (DTP+Hib+HepB)':           { cor: 'var(--violet-500)',    corBg: 'var(--violet-bg)' },
    'VIP — Poliomielite inativada':           { cor: 'var(--violet-400)',    corBg: 'var(--violet-bg)' },
    'VOP — Poliomielite oral (reforços)':    { cor: 'var(--emerald-500)',   corBg: 'var(--emerald-bg)' },
    'Tríplice Viral — SCR':                  { cor: 'var(--violet-700)',    corBg: 'var(--violet-bg)' },
    'DTP — Tríplice Bacteriana (reforços)':  { cor: 'var(--violet-600)',    corBg: 'var(--violet-bg)' },
    'HPV (SUS — meninas)':                   { cor: 'var(--rose-600)',      corBg: 'var(--rose-bg)' },
    'dTpa — reforço (adulto/gestante)':      { cor: 'var(--emerald-700)',   corBg: 'var(--emerald-bg)' },
    'Influenza (anual — grupos prioritários)':{ cor: 'var(--violet-500)',   corBg: 'var(--violet-bg)' },
  };

  var VAC_DB = {
    'BCG': {
      icon:'🛡️', ...VAC_COLORS['BCG'],
      previne:['Tuberculose miliar (disseminada)','Meningite tuberculosa','Tuberculose óssea e renal'],
      recomendacoes:['Aplicar ao nascer, idealmente nas primeiras 12h de vida','Dose única — sem reforço no calendário SUS','Via intradérmica no deltoide direito','A cicatriz (quelóide pequeno) é normal e esperada'],
      cuidadosApos:['Local pode formar pústula, úlcera e depois cicatriz — processo normal (semanas)','Não cobrir com curativo nem aplicar pomada','Não comprimir nem esfregar o local','Abscesso volumoso ou linfonodo aumentado: orientar consulta médica'],
      restricoes:['Imunodeprimidos (HIV com CD4 baixo, imunossupressores)','Recém-nascidos < 2 kg — aguardar ganho de peso','Lesões cutâneas extensas no local de aplicação','Não revacinar'],
      curiosidade:'💡 A BCG foi criada em 1921 por Calmette e Guérin e é uma das vacinas mais antigas ainda em uso no mundo.'
    },
    'Hepatite B': {
      icon:'🧬', ...VAC_COLORS['Hepatite B'],
      previne:['Hepatite B aguda e crônica','Cirrose hepática por HBV','Carcinoma hepatocelular (câncer de fígado)','Transmissão vertical mãe-filho'],
      recomendacoes:['1ª dose ao nascer (até 24h) — essencial contra transmissão vertical','2ª dose aos 2 meses (Pentavalente) e 3ª aos 6 meses','Adultos não vacinados devem completar o esquema em qualquer idade','Gestantes: verificar situação vacinal no pré-natal'],
      cuidadosApos:['Dor e inchaço leve no local (1–2 dias)','Febre baixa pode ocorrer — paracetamol sob orientação','Observar 15–20 minutos após aplicação'],
      restricoes:['Reação anafilática a dose prévia ou ao fermento Saccharomyces cerevisiae','Adiar em doença febril aguda moderada a grave'],
      curiosidade:'💡 A hepatite B é 50–100× mais infecciosa que o HIV. Esta foi a primeira "vacina anticâncer" por prevenir o câncer de fígado.'
    },
    'Pentavalente (DTP+Hib+HepB)': {
      icon:'💉', ...VAC_COLORS['Pentavalente (DTP+Hib+HepB)'],
      previne:['Difteria (crupe)','Tétano neonatal e geral','Coqueluche (tosse comprida)','Meningite e pneumonia por Haemophilus influenzae tipo b','Hepatite B'],
      recomendacoes:['Esquema: 2, 4 e 6 meses','Intramuscular no vasto lateral da coxa em lactentes','Manter criança em observação 20 min após','Reações são mais comuns que vacinas simples — informar os pais'],
      cuidadosApos:['Dor, vermelhidão e endurecimento local frequentes (até 48h)','Febre ≥ 38°C em até 50% — oferecer paracetamol conforme peso','Nódulo endurecido pode persistir semanas — absorvido naturalmente','Choro > 3h ou episódio hipotônico-hiporresponsivo: comunicar à equipe'],
      restricoes:['Encefalopatia progressiva sem causa definida','Convulsão nas 72h após dose anterior de DTP','Síndrome de Guillain-Barré nas 6 semanas após dose prévia','Não indicada para maiores de 7 anos'],
      curiosidade:'💡 A coqueluche ainda mata ~160.000 pessoas/ano no mundo. Em bebês < 3 meses as apneias são frequentes e fatais.'
    },
    'VIP — Poliomielite inativada': {
      icon:'🦵', ...VAC_COLORS['VIP — Poliomielite inativada'],
      previne:['Poliomielite (paralisia infantil) — tipos 1, 2 e 3','Paralisia flácida aguda por poliovírus','Síndrome pós-pólio'],
      recomendacoes:['Aplicada aos 2, 4 e 6 meses','Reforços (15 meses e 4 anos) são com VOP (gotinhas)','Via intramuscular ou subcutânea','Pode ser administrada com outras vacinas do calendário'],
      cuidadosApos:['Reações locais leves são comuns','Febre baixa pode ocorrer no dia da vacinação','Criança pode ser amamentada normalmente'],
      restricoes:['Anafilaxia a neomicina, estreptomicina ou polimixina B (componentes)','Adiar em doença febril aguda grave','VIP é segura em imunodeprimidos (ao contrário da VOP)'],
      curiosidade:'💡 O Brasil está livre de poliomielite desde 1994. Manter cobertura alta é o único obstáculo contra o retorno da doença.'
    },
    'VOP — Poliomielite oral (reforços)': {
      icon:'💊', ...VAC_COLORS['VOP — Poliomielite oral (reforços)'],
      previne:['Reforço contra poliomielite tipos 1 e 3','Transmissão intestinal do poliovírus'],
      recomendacoes:['2 gotas na boca (via oral)','Se vomitar em 10 min: repetir a dose','Pode ser dada com outras vacinas','Não usar em imunodeprimidos ou seus contatos domiciliares'],
      cuidadosApos:['Sem restrição de alimentação ou amamentação após as gotas','Reações sistêmicas são raríssimas','Observar 20 min após administração'],
      restricoes:['Imunodeprimidos e seus contatos domiciliares — usar VIP','Não usar em bebês < 6 semanas'],
      curiosidade:'💡 A VOP cria imunidade intestinal que impede a multiplicação e transmissão do vírus — essencial para erradicação global.'
    },
    'Pneumocócica 10-valente': {
      icon:'🫁', ...VAC_COLORS['Pneumocócica 10-valente'],
      previne:['Pneumonia pneumocócica','Meningite pneumocócica','Otite média aguda','Sepse por pneumococo','Bacteremia oculta'],
      recomendacoes:['Esquema: 2 meses, 4 meses, reforço aos 12 meses','Intramuscular na coxa em lactentes, deltoide após 2 anos','Fundamental em crianças com doenças crônicas ou imunodepressão'],
      cuidadosApos:['Reações locais moderadas são frequentes (dor, endurecimento, calor)','Febre ≥ 38°C em até 30% — paracetamol','Choro irritado nas primeiras 24h é comum'],
      restricoes:['Reação anafilática a dose anterior','Adiar em doença aguda grave','> 5 anos: usar pneumocócica 23-valente em grupos de risco'],
      curiosidade:'💡 Antes desta vacina, o pneumococo causava > 800.000 mortes infantis/ano. No Brasil as internações por pneumonia caíram > 40%.'
    },
    'Rotavírus humano': {
      icon:'🦠', ...VAC_COLORS['Rotavírus humano'],
      previne:['Gastroenterite grave por rotavírus','Desidratação severa','Internação hospitalar por diarreia'],
      recomendacoes:['Via oral: 2 doses (2 e 4 meses)','1ª dose OBRIGATORIAMENTE até 3 meses e 15 dias','2ª dose até 7 meses e 29 dias','Fora da janela etária: NÃO administrar mesmo com atraso'],
      cuidadosApos:['Diarreia leve e transitória pode ocorrer nos primeiros dias','Irritabilidade e febre baixa são possíveis','Atentar para invaginação intestinal: choro súbito, vômitos, sangue nas fezes'],
      restricoes:['Fora da janela etária — contraindicada (sem recuperação de esquema)','Imunodeficiência combinada grave (SCID)','Invaginação intestinal prévia ou malformação gastrointestinal'],
      curiosidade:'💡 No Brasil, antes da vacina, eram ~850.000 consultas e 3.500 mortes infantis/ano só por rotavírus.'
    },
    'Meningocócica C': {
      icon:'🧠', ...VAC_COLORS['Meningocócica C'],
      previne:['Meningite meningocócica C','Sepse meningocócica (meningococcemia)','Púrpura fulminante'],
      recomendacoes:['Esquema: 3 meses, 5 meses e reforço aos 12 meses','Via intramuscular','Contato com caso confirmado: quimioprofilaxia antibiótica'],
      cuidadosApos:['Dor e vermelhidão local (1–3 dias)','Febre baixa pode ocorrer','Observar sinais de meningite: petéquias, rigidez de nuca, vômitos → emergência'],
      restricoes:['Reação anafilática a dose anterior','Adiar em doença febril aguda intensa'],
      curiosidade:'💡 A meningocócica pode matar em menos de 24h. Mesmo com tratamento, até 20% dos casos evoluem para morte e 20% ficam com sequelas permanentes.'
    },
    'Febre Amarela': {
      icon:'🌿', ...VAC_COLORS['Febre Amarela'],
      previne:['Febre amarela silvestre e urbana','Insuficiência hepática e renal','Sangramento e coagulação intravascular'],
      recomendacoes:['1ª dose aos 9 meses; reforço único aos 4 anos','Após o reforço: proteção para toda a vida','Viajantes para áreas endêmicas: vacinar 10 dias antes','Obrigatória em regiões endêmicas'],
      cuidadosApos:['Dor, febre e mal-estar leve são comuns nos primeiros 5 dias','Reação grave (doença viscerotrópica): febre alta, icterícia, sinais hemorrágicos → emergência','Amamentação: avaliar risco/benefício com médico'],
      restricoes:['Alergia grave a ovo ou proteínas de galinha','Imunodeficiência grave','Gestantes — avaliar com médico','Lactentes < 6 meses: contraindicada','> 60 anos: aplicar com cautela'],
      curiosidade:'💡 A vacina do Instituto Bio-Manguinhos (RJ) é exportada para > 70 países e é referência mundial de qualidade pela OMS.'
    },
    'Tríplice Viral — SCR': {
      icon:'🌡️', ...VAC_COLORS['Tríplice Viral — SCR'],
      previne:['Sarampo (e complicações: pneumonia, encefalite, morte)','Caxumba (orquite, meningite, surdez)','Rubéola e síndrome da rubéola congênita (malformações fetais)'],
      recomendacoes:['1ª dose aos 12 meses; 2ª dose aos 15 meses','Adultos sem comprovante: 2 doses com intervalo de 1 mês','Mulheres em idade fértil: verificar imunidade antes de engravidar','Trabalhadores de saúde: 2 doses independentemente da idade'],
      cuidadosApos:['Febre, manchas avermelhadas e mal-estar leve entre o 5º e 12º dia','Linfonodos aumentados por até 3 semanas — normal','Dor articular transitória em mulheres adultas (componente rubéola)'],
      restricoes:['Gravidez: CONTRAINDICADA — evitar gravidez por 30 dias após a dose','Imunodeprimidos graves','Trombocitopenia grave atual ou após dose prévia','Transfusão recente: aguardar 3–11 meses'],
      curiosidade:'💡 O sarampo pode infectar 12–18 pessoas não vacinadas por um único caso. Cobertura ≥ 95% é necessária para bloquear a transmissão.'
    },
    'DTP — Tríplice Bacteriana (reforços)': {
      icon:'🔁', ...VAC_COLORS['DTP — Tríplice Bacteriana (reforços)'],
      previne:['Difteria (membrana na garganta que causa asfixia)','Tétano (espasmos musculares graves)','Coqueluche (tosse paroxística com apneia)'],
      recomendacoes:['1º reforço aos 15 meses; 2º reforço aos 4 anos','Via intramuscular','Após os 7 anos: usar dTpa','Reforço de dT a cada 10 anos na vida adulta'],
      cuidadosApos:['Reações locais mais intensas nos reforços (dor, endurecimento, calor)','Febre nas primeiras 48h','Nódulo subcutâneo pode persistir semanas'],
      restricoes:['Encefalopatia progressiva sem causa identificada','Convulsão nas 72h após dose anterior','Para maiores de 7 anos: substituir por dTpa ou dT'],
      curiosidade:'💡 O tétano ainda mata ~30.000 pessoas/ano no mundo. Sua toxina é tão potente que a quantidade para causar doença não gera imunidade — só a vacina protege.'
    },
    'Varicela': {
      icon:'🔵', ...VAC_COLORS['Varicela'],
      previne:['Catapora (varicela)','Infecções bacterianas secundárias (celulite, fasciite)','Pneumonia varicelosa','Herpes-zóster na vida adulta (parcialmente)'],
      recomendacoes:['Dose única aos 15 meses pelo SUS (2ª dose com tetraviral)','Adultos susceptíveis: 2 doses com intervalo de 4–8 semanas','Não administrar em gestantes','Profissionais de saúde e professores: verificar imunidade'],
      cuidadosApos:['Exantema varicela-like leve (5–30 vesículas) em até 5% — não contraindica nova dose','Febre leve e mal-estar nos primeiros 10 dias','Banhos frios e anti-histamínico aliviam o prurido'],
      restricoes:['Gravidez: CONTRAINDICADA — evitar gravidez por 1 mês após a dose','Imunodeprimidos graves','Uso de AAS: não usar por 6 semanas (risco de síndrome de Reye)','Alergia grave a neomicina ou gelatina'],
      curiosidade:'💡 O VZV permanece latente nos gânglios nervosos e pode reativar décadas depois como herpes-zóster. A vacina reduz significativamente esse risco.'
    },
    'Hepatite A': {
      icon:'🫀', ...VAC_COLORS['Hepatite A'],
      previne:['Hepatite A aguda','Insuficiência hepática fulminante por HAV (rara)','Surtos em coletividades'],
      recomendacoes:['Dose única aos 15 meses pelo SUS','Adultos em risco (viajantes, hepatopatas): 2 doses','Via intramuscular','Verificar cobertura em comunidades com saneamento precário'],
      cuidadosApos:['Dor local e febre baixa são as reações mais comuns','Cefaleia leve pode ocorrer no dia','Icterícia, urina escura, fadiga intensa após vacinação: contato médico'],
      restricoes:['Reação anafilática a dose anterior','Adiar em doença aguda grave'],
      curiosidade:'💡 A melhoria do saneamento + vacinação reduziram casos de hepatite A em mais de 95% no Brasil.'
    },
    'HPV (SUS — meninas)': {
      icon:'🎗️', ...VAC_COLORS['HPV (SUS — meninas)'],
      previne:['Câncer do colo do útero (tipos 16 e 18 causam ~70% dos casos)','Câncer de vagina e vulva','Câncer anal','Câncer de orofaringe','Verrugas genitais (condilomas)'],
      recomendacoes:['Meninas 9–14 anos: 2 doses com intervalo de 6 meses','Melhor eficácia ANTES da iniciação sexual','Via intramuscular no deltoide','Completar mesmo quem já teve relações — protege tipos não adquiridos'],
      cuidadosApos:['Dor, vermelhidão e inchaço local (1–3 dias)','Síncope vasovagal é mais comum em adolescentes — manter observação sentada por 15 min','Cefaleia, febre baixa e fadiga leve podem ocorrer'],
      restricoes:['Gravidez: adiar até após o parto','Reação anafilática a dose anterior','Doença aguda grave: adiar'],
      curiosidade:'💡 A Austrália, com vacinação precoce e alta cobertura, está caminhando para a eliminação do câncer do colo do útero.'
    },
    'Meningocócica ACWY': {
      icon:'🧠', ...VAC_COLORS['Meningocócica ACWY'],
      previne:['Meningite meningocócica tipos A, C, W e Y','Sepse meningocócica','Doença invasiva por meningococo em adolescentes'],
      recomendacoes:['Dose única aos 11–12 anos','Via intramuscular no deltoide','Adolescentes que não vacinaram: vacinar até os 19 anos','Indicada para viajantes ao cinturão africano de meningite'],
      cuidadosApos:['Dor e endurecimento local por 2–3 dias','Febre e cefaleia leve nas primeiras 24h','Atividades físicas intensas: evitar no dia da vacinação'],
      restricoes:['Reação anafilática à dose anterior','Adiar em febre alta ou doença aguda moderada a grave'],
      curiosidade:'💡 O sorogrupo W chegou ao Brasil via peregrinos que retornaram do Hajj (Meca), onde a vacina ACWY é obrigatória.'
    },
    'dTpa — reforço (adulto/gestante)': {
      icon:'🤰', ...VAC_COLORS['dTpa — reforço (adulto/gestante)'],
      previne:['Coqueluche em adultos (reservatório e transmissores para bebês)','Difteria em adultos','Tétano em adultos','Coqueluche no recém-nascido (via anticorpos maternos)'],
      recomendacoes:['Gestantes: uma dose entre 20ª e 36ª semana (ideal: 27ª–36ª)','Adultos que cuidam de bebês < 6 meses: 1 dose se nunca vacinaram','Substituir 1 reforço de dT a cada 10 anos por dTpa'],
      cuidadosApos:['Dor local intensa é comum — especialmente com muitos reforços anteriores','Febre, mialgia e mal-estar leve nas primeiras 48h','Reação de Arthus (reação local grave) se reforço muito frequente'],
      restricoes:['Síndrome de Guillain-Barré nas 6 semanas após dose prévia de vacina tetânica','Encefalopatia progressiva','Intervalo < 2 anos desde última dose tetânica: risco de reação de Arthus'],
      curiosidade:'💡 A "estratégia do casulo" — vacinar todos os conviventes — protege o recém-nascido nos primeiros meses, quando ele ainda não pode ser vacinado.'
    },
    'Influenza (anual — grupos prioritários)': {
      icon:'🤧', ...VAC_COLORS['Influenza (anual — grupos prioritários)'],
      previne:['Gripe sazonal (influenza A e B)','Pneumonia gripal e pós-gripal','Internação e morte por complicações da influenza'],
      recomendacoes:['Grupos: crianças 6m–5a, gestantes, puérperas até 45 dias, idosos ≥ 60, profissionais de saúde, portadores de doenças crônicas','Uma dose anual — Campanha Nacional geralmente em abril/maio','Crianças < 9 anos na 1ª vez: 2 doses com 30 dias de intervalo','A vacina NÃO causa gripe — contém vírus inativados'],
      cuidadosApos:['Dor e endurecimento local são as reações mais comuns','Sintomas gripais leves por 1–2 dias em algumas pessoas','Gestantes: segura em qualquer trimestre'],
      restricoes:['Alergia grave a ovo (algumas formulações contêm proteínas do ovo)','Reação anafilática a dose anterior','Síndrome de Guillain-Barré nas 6 semanas após vacinação prévia','Não vacinar < 6 meses'],
      curiosidade:'💡 A OMS monitora os vírus do hemisfério norte e indica as 3–4 cepas para a vacina do hemisfério sul. Por isso ela precisa ser renovada anualmente.'
    },
    'dT — dupla adulto (a cada 10 anos)': {
      icon:'🔄', cor:'var(--slate-500)', corBg:'var(--surface-2)',
      previne:['Tétano em adultos e idosos','Difteria em adultos'],
      recomendacoes:['Dose a cada 10 anos para adultos com esquema básico completo','Ferimento grave: avaliar dose adicional + imunoglobulina antitetânica','Gestantes sem dTpa: usar dTpa no lugar da dT','Registrar sempre a data no cartão de vacinação'],
      cuidadosApos:['Dor local e endurecimento por 2–3 dias','Febre baixa pode ocorrer','Reação de Arthus em quem recebe reforços muito frequentes'],
      restricoes:['Histórico de reação neurológica a vacina com componente tetânico','Síndrome de Guillain-Barré nas 6 semanas após dose anterior','Não fazer com intervalo < 2 anos, salvo ferimentos graves'],
      curiosidade:'💡 Quem teve tétano pode tê-lo novamente — a doença não confere imunidade. A única proteção é manter o esquema vacinal em dia.'
    }
  };

  /* ══════════════════════════════════════════════════════════════
     CSS
  ══════════════════════════════════════════════════════════════ */
  // injetarCSS: raw CSS pixels intentional — this builds a <style> textContent string
  // where CSS custom properties cannot be referenced.
  function injetarCSS() {
    if ($id('acs-vac-fix-css')) return;
    var s = document.createElement('style');
    s.id = 'acs-vac-fix-css';
    s.textContent = [
      /* modal overlay */
      '#acsvi-overlay{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.52);backdrop-filter:blur(5px);display:none;align-items:center;justify-content:center;padding:16px}',
      '#acsvi-overlay.open{display:flex}',
      '#acsvi-box{background:var(--surface,#fff);border-radius:18px;width:100%;max-width:540px;max-height:86vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.22);border:1.5px solid var(--bdr,rgba(0,0,0,.08));animation:acsviIn .2s cubic-bezier(.34,1.4,.64,1)}',
      '@keyframes acsviIn{from{opacity:0;transform:scale(.93) translateY(14px)}to{opacity:1;transform:none}}',
      /* header */
      '.acsvi-hd{display:flex;align-items:center;gap:13px;padding:18px 20px 14px;border-bottom:1px solid var(--bdr,rgba(0,0,0,.08));flex-shrink:0}',
      '.acsvi-av{width:50px;height:50px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}',
      '.acsvi-title{font-size:15px;font-weight:800;color:var(--slate-900,#111);line-height:1.3;word-break:break-word}',
      '.acsvi-sub{font-size:11.5px;color:var(--slate-500,#888);margin-top:2px}',
      '.acsvi-cls{margin-left:auto;width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;background:var(--surface-2,#f0f1f5);font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--slate-600,#666);transition:background .15s}',
      '.acsvi-cls:hover{background:var(--rose-bg);color:var(--vermelho)}',
      /* body */
      '.acsvi-body{overflow-y:auto;padding:16px 20px 20px;display:flex;flex-direction:column;gap:14px}',
      '.acsvi-desc{font-size:13px;color:var(--slate-700,#444);line-height:1.65;padding:11px 13px;background:var(--surface-2,#f8fafc);border-radius:9px;border-left:3px solid var(--_vc,#0ea5e9)}',
      '.acsvi-sec-title{font-size:10.5px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--slate-500,#888);margin-bottom:7px;display:flex;align-items:center;gap:5px}',
      '.acsvi-list{display:flex;flex-direction:column;gap:4px}',
      '.acsvi-item{display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--slate-700,#444);line-height:1.5;padding:6px 9px;background:var(--surface-2,#f8fafc);border-radius:7px;border:1px solid var(--bdr,rgba(0,0,0,.06))}',
      '.acsvi-item.rest{background:var(--rose-bg,#fff1f2);border-color:rgba(232,51,85,.18)}',
      '.acsvi-item-dot{flex-shrink:0;margin-top:1px;font-size:12px}',
      '.acsvi-cur{font-size:12px;line-height:1.55;padding:9px 13px;background:var(--amarelo-bg,rgba(255,117,51,.08));border:1px solid var(--amarelo-bdr,rgba(255,117,51,.22));border-radius:9px;color:var(--slate-700,#444)}',
      /* botão ⓘ */
      '.vac-ibtn{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:var(--violet-bg);border:1.5px solid var(--violet-bdr,rgba(132,69,204,.28));color:var(--roxo);font-size:12px;font-weight:800;cursor:pointer;flex-shrink:0;transition:background .15s,transform .12s;line-height:1;font-style:normal;vertical-align:middle;margin-left:5px}',
      '.vac-ibtn:hover{background:var(--roxo);color:#fff;transform:scale(1.12)}',
      /* card header corrigido */
      '.vac-fix-hd{display:flex;align-items:center;gap:8px;margin-bottom:8px;min-width:0}',
      '.vac-fix-nome{font-size:13px;font-weight:600;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}',
      '.vac-fix-badge{font-size:11px;color:var(--slate-500,#888);white-space:nowrap;flex-shrink:0}'
    ].join('');
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════════════
     MODAL INFO
  ══════════════════════════════════════════════════════════════ */
  function criarModal() {
    if ($id('acsvi-overlay')) return;
    var o = document.createElement('div');
    o.id = 'acsvi-overlay';
    o.innerHTML =
      '<div id="acsvi-box">' +
        '<div class="acsvi-hd">' +
          '<div class="acsvi-av" id="acsvi-av"></div>' +
          '<div style="${_h.flex1()}"><div class="acsvi-title" id="acsvi-title"></div><div class="acsvi-sub">Informações da vacina</div></div>' +
          '<button class="acsvi-cls" onclick="document.getElementById(\'acsvi-overlay\').classList.remove(\'open\')" title="Fechar">✕</button>' +
        '</div>' +
        '<div class="acsvi-body" id="acsvi-body"></div>' +
      '</div>';
    o.addEventListener('click', function(e){ if(e.target===o) o.classList.remove('open'); });
    _getOverlayRoot().appendChild(o);
    document.addEventListener('keydown', function(e){
      if(e.key==='Escape') { var ov=$id('acsvi-overlay'); if(ov) ov.classList.remove('open'); }
    });
  }

  window.acsVacInfo = function(nome) {
    var d = VAC_DB[nome];
    if (!d) { console.warn('[ACS-VAC] sem dados para:', nome); return; }
    criarModal(); // no-op se já existe
    var ov = $id('acsvi-overlay');
    var av = $id('acsvi-av');
    var ti = $id('acsvi-title');
    var bo = $id('acsvi-body');
    if (!ov) return;

    // Garante que o overlay está no container correto (tablet→.app, PC→body)
    var root = _getOverlayRoot();
    if (ov.parentElement !== root) root.appendChild(ov);

    av.textContent = d.icon;
    av.style.background = d.corBg;
    ti.textContent = nome;
    ov.querySelector('#acsvi-box').style.setProperty('--_vc', d.cor);

    function sec(titulo, icone, itens, cls) {
      return '<div><div class="acsvi-sec-title">' + icone + ' ' + titulo + '</div>' +
        '<div class="acsvi-list">' +
        itens.map(function(t){ return '<div class="acsvi-item' + (cls?' '+cls:'') + '"><span class="acsvi-item-dot">' + (cls?'⚠️':'•') + '</span><span>' + t + '</span></div>'; }).join('') +
        '</div></div>';
    }

    bo.innerHTML =
      '<div class="acsvi-desc" style="--_vc:' + d.cor + '">' + d.previne[0] + (d.previne.length > 1 ? ' e outras ' + (d.previne.length-1) + ' doenças.' : '') + '</div>' +
      sec('O que previne', '🛡️', d.previne) +
      sec('Recomendações', '📋', d.recomendacoes) +
      sec('Cuidados após aplicação', '🩹', d.cuidadosApos) +
      sec('Restrições e contraindicações', '🚫', d.restricoes, 'rest') +
      '<div class="acsvi-cur">' + d.curiosidade + '</div>';

    ov.classList.add('open');
  };

  

  /* ══════════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════════ */
  function init() {
    injetarCSS();
    criarModal();

    /* re-renderizar se o modal de indivíduo já estiver aberto */
    var modalInd = $id('modal-individuo');
    if (modalInd && modalInd.classList.contains('open')) {
      if (window.VacinaModule) VacinaModule.render(VacinaModule.coletar(), ($id('ind-nasc')||{}).value || '');
    }

    /* observer: re-renderizar quando o modal de indivíduo abrir */
    if (modalInd) {
      new MutationObserver(function(muts) {
        muts.forEach(function(m) {
          if (m.type==='attributes' && m.attributeName==='class' && modalInd.classList.contains('open')) {
            setTimeout(function(){
              if (window.VacinaModule) VacinaModule.render(VacinaModule.coletar(), ($id('ind-nasc')||{}).value || '');
            }, 80);
          }
        });
      }).observe(modalInd, { attributes: true });
    }
  }

  window._acsVacInjetarCSS = injetarCSS;
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

})();
