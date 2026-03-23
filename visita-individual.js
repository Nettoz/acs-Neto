(function() {
  'use strict';

  /* ── DOM helpers (espelham os primitivos de app-crud.js, escopo local) ── */
  const $id    = id => document.getElementById(id);
  const $val   = (id, fb = '') => $id(id)?.value ?? fb;
  const $check = id => !!$id(id)?.checked;

  /* ── helpers locais ── */
  function _hoje() { return new Date().toISOString().slice(0,10); }

  function _getFichasDoInd(ind) {
    if (!ind) return [];
    const fichas = [];
    fichas.push({ key: 'hans', label: '🟡 Rastreio de Hanseníase', forAll: true });
    if (ind.has === 'sim')      fichas.push({ key: 'has',            label: '❤️ Hipertensão Arterial (HAS)' });
    if (ind.dm === 'sim')       fichas.push({ key: 'dm',             label: '🩸 Diabetes Mellitus (DM)' });
    if (ind.gestante === 'sim') fichas.push({ key: 'gestante',       label: '🤰 Gestante / Pré-natal' });
    if (ind.mental === 'sim')   fichas.push({ key: 'mental',         label: '🧠 Saúde Mental' });
    if (ind.tb === 'tb')       fichas.push({ key: 'tb',             label: '🫁 Tuberculose (TB)' });
    if (ind.cancer === 'sim')   fichas.push({ key: 'cancer',         label: '🎗️ Oncologia / CA' });
    if (ind.acamado === 'sim')  fichas.push({ key: 'acamado',        label: '🛏️ Paciente Acamado' });
    const idadeAnos = getIdadeEmAnos(ind.nasc);
    if (idadeAnos !== null && idadeAnos < 2)
      fichas.push({ key: 'consumoAlimentar', label: '🥗 Consumo Alimentar (< 2 anos)' });
    // Prevenção — Saúde da Mulher: mulheres entre 25 e 64 anos (critério PCCU/mamografia)
    if (ind.sexo === 'F' && idadeAnos !== null && idadeAnos >= 25 && idadeAnos <= 64)
      fichas.push({ key: 'prevencao', label: '🔬 Prevenção — Saúde da Mulher' });
    return fichas;
  }

  function _fichaJaExiste(key, indId) {
    return !!(db.fichas && db.fichas.atual && db.fichas.atual[key] && db.fichas.atual[key][indId]);
  }

  function _renderFichasList(ind, fichasSalvas) {
    const container = $id('vis-ind-fichas-list');
    const fichas = _getFichasDoInd(ind);
    let html = '';
    fichas.forEach(f => {
      const jaExiste  = _fichaJaExiste(f.key, ind.idIndividuo);
      const salvaAgora = !!fichasSalvas[f.key];
      const statusClass = (jaExiste || salvaAgora) ? 'ficha-tag-ok' : 'ficha-tag-pend';
      const statusText  = (jaExiste || salvaAgora) ? '✓ Preenchida' : 'Pendente';
      html += `
        <div class="ficha-card" onclick="_visInd.abrirFicha('${f.key}')" id="ficha-card-${f.key}">
          <span class="ficha-title">${f.label}
            ${f.forAll ? '<span class="ficha-tag ficha-tag-all" style="margin-left:6px">TODOS</span>' : ''}
          </span>
          <span class="ficha-tag ${statusClass}" id="ficha-status-${f.key}">${statusText}</span>
        </div>`;
    });
    container.innerHTML = html || '<div class="vis-ind-empty">Nenhuma ficha disponível</div>';
  }

  /* ── formulários de cada ficha ── */
  const FICHA_FORMS = {
    hans: function() {
      return `<div class="sf-title">🟡 Rastreio de Hanseníase<button onclick="_visInd.fecharSubform()">✕</button></div>
        <div class="sf-row"><div class="sf-field" style="flex:1 1 100%">
          <label>Manchas ou alterações de sensibilidade?</label>
          <select id="sf-hans-manchas">
            <option value="nao">Não</option>
            <option value="sim">Sim — encaminhar</option>
            <option value="suspeita">Suspeita — investigar</option>
          </select></div></div>
        <div class="sf-checkbox-row">
          <label class="sf-checkbox"><input type="checkbox" id="sf-hans-orientado"> Paciente orientado sobre sinais</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-hans-contatos"> Contatos domiciliares avaliados</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-hans-encam"> Encaminhado à UBS/especialidade</label>
        </div>
        <div class="sf-row"><div class="sf-field" style="flex:1 1 100%">
          <label>Observações</label>
          <textarea id="sf-hans-obs" rows="2" placeholder="Anotações da avaliação..."></textarea>
        </div></div>
        <button class="sf-save-btn" onclick="_visInd.salvarFicha('hans')">💾 Salvar Ficha</button>`;
    },
    has: function(ind) {
      const meds = ind.medicacoes || [];
      const checkMeds = meds.map((m, i) =>
        `<label class="sf-checkbox"><input type="checkbox" id="sf-has-med-${i}" checked> ${esc(m.nome||'')} ${esc(m.dose||'')}</label>`
      ).join('');
      return `<div class="sf-title">❤️ Ficha HAS<button onclick="_visInd.fecharSubform()">✕</button></div>
        <div class="sf-row">
          <div class="sf-field"><label>PA Sistólica (mmHg)</label><input type="number" id="sf-has-pas" min="60" max="250" placeholder="120"></div>
          <div class="sf-field"><label>PA Diastólica (mmHg)</label><input type="number" id="sf-has-pad" min="40" max="160" placeholder="80"></div>
          <div class="sf-field"><label>Peso (kg)</label><input type="number" id="sf-has-peso" step="0.1" placeholder="70.0"></div>
          <div class="sf-field"><label>Data aferição PA</label><input type="text" class="date-input" id="sf-has-pa-data" maxlength="10" placeholder="dd/mm/aaaa" value="${_isoToBR(_hoje())}" oninput="mascararData(this)"></div>
        </div>
        <div class="sf-checkbox-row">
          <label class="sf-checkbox"><input type="checkbox" id="sf-has-controlada"> PA controlada</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-has-adesao"> Boa adesão ao tto.</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-has-tabagismo"> Tabagismo</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-has-etilismo"> Etilismo</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-has-sed"> Sedentarismo</label>
        </div>
        ${meds.length ? `<div style="font-size:11px;font-weight:700;color:var(--slate-500);margin:6px 0 4px">Adesão aos medicamentos:</div><div class="sf-checkbox-row">${checkMeds}</div>` : ''}
        <div class="sf-checkbox-row">
          <label class="sf-checkbox"><input type="checkbox" id="sf-has-oriDieta"> Orient. dieta</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-has-oriAtiv"> Orient. atividade</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-has-oriMed"> Orient. medicação</label>
        </div>
        <div class="sf-row"><div class="sf-field" style="flex:1 1 100%"><label>Observações</label><textarea id="sf-has-obs" rows="2" placeholder="Anotações..."></textarea></div></div>
        <button class="sf-save-btn" onclick="_visInd.salvarFicha('has')">💾 Salvar Ficha</button>`;
    },
    dm: function() {
      return `<div class="sf-title">🩸 Ficha DM<button onclick="_visInd.fecharSubform()">✕</button></div>
        <div class="sf-row">
          <div class="sf-field"><label>Glicemia em jejum (mg/dL)</label><input type="number" id="sf-dm-gli" min="40" max="600" placeholder="100"></div>
          <div class="sf-field"><label>HbA1c (%)</label><input type="number" id="sf-dm-hba" step="0.1" min="4" max="20" placeholder="7.0"></div>
          <div class="sf-field"><label>Data exame</label><input type="text" class="date-input" id="sf-dm-data" maxlength="10" placeholder="dd/mm/aaaa" value="${_isoToBR(_hoje())}" oninput="mascararData(this)"></div>
        </div>
        <div class="sf-checkbox-row">
          <label class="sf-checkbox"><input type="checkbox" id="sf-dm-controlada"> Glicemia controlada</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-dm-insulina"> Usa insulina</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-dm-has"> HAS associada</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-dm-nefro"> Nefropatia</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-dm-retino"> Retinopatia</label>
        </div>
        <div class="sf-checkbox-row">
          <label class="sf-checkbox"><input type="checkbox" id="sf-dm-pe"> Insp. pé diabético</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-dm-hipoHiper"> Orient. hipo/hiper</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-dm-alim"> Orient. alimentar</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-dm-atv"> Orient. atividade</label>
        </div>
        <div class="sf-row"><div class="sf-field" style="flex:1 1 100%"><label>Observações</label><textarea id="sf-dm-obs" rows="2"></textarea></div></div>
        <button class="sf-save-btn" onclick="_visInd.salvarFicha('dm')">💾 Salvar Ficha</button>`;
    },
    gestante: function() {
      return `<div class="sf-title">🤰 Ficha Gestante / Pré-natal<button onclick="_visInd.fecharSubform()">✕</button></div>
        <div class="sf-row">
          <div class="sf-field"><label>DUM</label><input type="text" class="date-input" id="sf-gest-dum" maxlength="10" placeholder="dd/mm/aaaa" oninput="mascararData(this)"></div>
          <div class="sf-field"><label>Tipo de Gestação</label><select id="sf-gest-tipo"><option>Única</option><option>Gemelar</option></select></div>
          <div class="sf-field"><label>Risco</label><select id="sf-gest-risco"><option>Habitual</option><option>Alto risco</option></select></div>
        </div>
        <div class="sf-row">
          <div class="sf-field"><label>PA Sistólica</label><input type="number" id="sf-gest-pas" placeholder="110"></div>
          <div class="sf-field"><label>PA Diastólica</label><input type="number" id="sf-gest-pad" placeholder="70"></div>
          <div class="sf-field"><label>Peso (kg)</label><input type="number" id="sf-gest-peso" step="0.1" placeholder="65.0"></div>
        </div>
        <div class="sf-checkbox-row">
          <label class="sf-checkbox"><input type="checkbox" id="sf-gest-fe"> Sulfato ferroso</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-gest-fo"> Ácido fólico</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-gest-vacDT"> Vacina dT/dTpa</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-gest-vacInf"> Vacina Influenza</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-gest-vacHB"> Vacina Hepatite B</label>
        </div>
        <div class="sf-row"><div class="sf-field" style="flex:1 1 100%"><label>Observações</label><textarea id="sf-gest-obs" rows="2"></textarea></div></div>
        <button class="sf-save-btn" onclick="_visInd.salvarFicha('gestante')">💾 Salvar Ficha</button>`;
    },
    mental: function() {
      return `<div class="sf-title">🧠 Ficha Saúde Mental<button onclick="_visInd.fecharSubform()">✕</button></div>
        <div class="sf-row"><div class="sf-field"><label>Situação atual</label>
          <select id="sf-mental-sit"><option value="estavel">Estável</option><option value="agudizado">Agudizado</option><option value="crise">Em crise</option><option value="melhora">Em melhora</option></select>
        </div></div>
        <div class="sf-checkbox-row">
          <label class="sf-checkbox"><input type="checkbox" id="sf-mental-adesao"> Adesão ao tto.</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-mental-caps"> Acompanha CAPS</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-mental-familiar"> Suporte familiar</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-mental-encam"> Encaminhado</label>
        </div>
        <div class="sf-row"><div class="sf-field" style="flex:1 1 100%"><label>Observações</label><textarea id="sf-mental-obs" rows="2"></textarea></div></div>
        <button class="sf-save-btn" onclick="_visInd.salvarFicha('mental')">💾 Salvar Ficha</button>`;
    },
    tb: function() {
      return `<div class="sf-title">🫁 Ficha Tuberculose<button onclick="_visInd.fecharSubform()">✕</button></div>
        <div class="sf-row">
          <div class="sf-field"><label>Fase do tto.</label><select id="sf-tb-fase"><option>Intensiva</option><option>Manutenção</option><option>Encerrado</option></select></div>
          <div class="sf-field"><label>Dose supervisionada?</label><select id="sf-tb-dots"><option value="sim">Sim (DOTS)</option><option value="nao">Não</option></select></div>
        </div>
        <div class="sf-checkbox-row">
          <label class="sf-checkbox"><input type="checkbox" id="sf-tb-adesao"> Boa adesão</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-tb-reacoes"> Reações adversas</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-tb-contatos"> Contatos investigados</label>
        </div>
        <div class="sf-row"><div class="sf-field" style="flex:1 1 100%"><label>Observações</label><textarea id="sf-tb-obs" rows="2"></textarea></div></div>
        <button class="sf-save-btn" onclick="_visInd.salvarFicha('tb')">💾 Salvar Ficha</button>`;
    },
    cancer: function() {
      return `<div class="sf-title">🎗️ Ficha Oncologia / CA<button onclick="_visInd.fecharSubform()">✕</button></div>
        <div class="sf-row"><div class="sf-field"><label>Fase do tratamento</label>
          <select id="sf-ca-fase"><option>Diagnóstico</option><option>Quimioterapia</option><option>Radioterapia</option><option>Cirurgia</option><option>Paliativo</option><option>Remissão</option></select>
        </div></div>
        <div class="sf-checkbox-row">
          <label class="sf-checkbox"><input type="checkbox" id="sf-ca-adesao"> Adesão ao tto.</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-ca-dor"> Queixa de dor</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-ca-oncol"> Acompanha oncologia</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-ca-suporte"> Suporte familiar/social</label>
        </div>
        <div class="sf-row"><div class="sf-field" style="flex:1 1 100%"><label>Observações</label><textarea id="sf-ca-obs" rows="2"></textarea></div></div>
        <button class="sf-save-btn" onclick="_visInd.salvarFicha('cancer')">💾 Salvar Ficha</button>`;
    },
    acamado: function() {
      return `<div class="sf-title">🛏️ Ficha Paciente Acamado<button onclick="_visInd.fecharSubform()">✕</button></div>
        <div class="sf-checkbox-row">
          <label class="sf-checkbox"><input type="checkbox" id="sf-ac-lesao"> Lesão por pressão</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-ac-higiene"> Higiene adequada</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-ac-alim"> Alimentação adequada</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-ac-cuidador"> Cuidador disponível</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-ac-fisio"> Fisioterapia</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-ac-encam"> Encaminhado NASF/equipe</label>
        </div>
        <div class="sf-row"><div class="sf-field" style="flex:1 1 100%"><label>Observações</label><textarea id="sf-ac-obs" rows="2"></textarea></div></div>
        <button class="sf-save-btn" onclick="_visInd.salvarFicha('acamado')">💾 Salvar Ficha</button>`;
    },
    consumoAlimentar: function() {
      return `<div class="sf-title">🥗 Marcadores de Consumo Alimentar<button onclick="_visInd.fecharSubform()">✕</button></div>
        <p style="font-size:12px;color:var(--slate-600);margin-bottom:8px">Ontem, esse indivíduo consumiu:</p>
        <div class="sf-checkbox-row">
          <label class="sf-checkbox"><input type="checkbox" id="sf-ca-feijao"> Feijão</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-ca-frutas"> Frutas frescas</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-ca-legumes"> Legumes/verduras</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-ca-leite"> Leite/derivados</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-ca-carne"> Carnes/ovos</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-ca-ultra"> Ultraprocessados</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-ca-refrigerante"> Refrigerante/suco artificial</label>
          <label class="sf-checkbox"><input type="checkbox" id="sf-ca-gordura"> Gordura aparente/fritura</label>
        </div>
        <div class="sf-row"><div class="sf-field" style="flex:1 1 100%"><label>Observações</label><textarea id="sf-ca2-obs" rows="2"></textarea></div></div>
        <button class="sf-save-btn" onclick="_visInd.salvarFicha('consumoAlimentar')">💾 Salvar Ficha</button>`;
    }
  };

  /* ── coletar dados de cada ficha ── */
  const FICHA_COLETAR = {
    hans: () => ({
      manchas: $val('sf-hans-manchas'),
      orientado: $check('sf-hans-orientado'),
      contatosAvaliados: $check('sf-hans-contatos'),
      encaminhado: $check('sf-hans-encam'),
      obs: $val('sf-hans-obs')
    }),
    has: (ind) => {
      const meds = ind.medicacoes || [];
      const adesaoMeds = {};
      meds.forEach((_, i) => { adesaoMeds[i] = $check(`sf-has-med-${i}`) ?? true; });
      return {
        paSistolica: +$val('sf-has-pas') || null,
        paDiastolica: +$val('sf-has-pad') || null,
        peso: +$val('sf-has-peso') || null,
        paData: _brToISO($val('sf-has-pa-data')||'')||undefined,
        paControlada: $check('sf-has-controlada'),
        adesao: $check('sf-has-adesao'),
        adesaoMeds,
        tabagismo: $check('sf-has-tabagismo'),
        etilismo: $check('sf-has-etilismo'),
        sedentarismo: $check('sf-has-sed'),
        orientacaoDieta: $check('sf-has-oriDieta'),
        orientacaoAtividade: $check('sf-has-oriAtiv'),
        orientacaoMedicacao: $check('sf-has-oriMed'),
        obsGerais: $val('sf-has-obs')
      };
    },
    dm: () => ({
      glicemiaJejum: +$val('sf-dm-gli') || null,
      hba1c: +$val('sf-dm-hba') || null,
      glicemiaData: _brToISO($val('sf-dm-data')||'')||undefined,
      glicemiaControlada: $check('sf-dm-controlada'),
      insulina: $check('sf-dm-insulina'),
      has: $check('sf-dm-has'),
      nefropatia: $check('sf-dm-nefro'),
      retinopatia: $check('sf-dm-retino'),
      orientacaoPeDiabetico: $check('sf-dm-pe'),
      orientacaoHipoHiper: $check('sf-dm-hipoHiper'),
      orientacaoAlimentar: $check('sf-dm-alim'),
      orientacaoAtividade: $check('sf-dm-atv'),
      obsGerais: $val('sf-dm-obs')
    }),
    gestante: () => ({
      dum: _brToISO($val('sf-gest-dum')||'')||undefined,
      tipoGestacao: $val('sf-gest-tipo'),
      risco: $val('sf-gest-risco'),
      paSistolica: +$val('sf-gest-pas') || null,
      paDiastolica: +$val('sf-gest-pad') || null,
      peso: +$val('sf-gest-peso') || null,
      sulfatoFerroso: $check('sf-gest-fe'),
      acidoFolico: $check('sf-gest-fo'),
      vacinaDtpa: $check('sf-gest-vacDT'),
      vacinaInfluenza: $check('sf-gest-vacInf'),
      vacinaHepatiteB: $check('sf-gest-vacHB'),
      obs: $val('sf-gest-obs')
    }),
    mental: () => ({
      situacao: $val('sf-mental-sit'),
      adesao: $check('sf-mental-adesao'),
      acompanhaCaps: $check('sf-mental-caps'),
      suporteFamiliar: $check('sf-mental-familiar'),
      encaminhado: $check('sf-mental-encam'),
      obs: $val('sf-mental-obs')
    }),
    tb: () => ({
      fase: $val('sf-tb-fase'),
      dots: $val('sf-tb-dots'),
      adesao: $check('sf-tb-adesao'),
      reacoes: $check('sf-tb-reacoes'),
      contatosInvestigados: $check('sf-tb-contatos'),
      obs: $val('sf-tb-obs')
    }),
    cancer: () => ({
      fase: $val('sf-ca-fase'),
      adesao: $check('sf-ca-adesao'),
      dor: $check('sf-ca-dor'),
      acompanhaOncologia: $check('sf-ca-oncol'),
      suporte: $check('sf-ca-suporte'),
      obs: $val('sf-ca-obs')
    }),
    acamado: () => ({
      lesaoPressao: $check('sf-ac-lesao'),
      higiene: $check('sf-ac-higiene'),
      alimentacao: $check('sf-ac-alim'),
      cuidador: $check('sf-ac-cuidador'),
      fisioterapia: $check('sf-ac-fisio'),
      encaminhado: $check('sf-ac-encam'),
      obs: $val('sf-ac-obs')
    }),
    consumoAlimentar: () => ({
      feijao: $check('sf-ca-feijao'),
      frutas: $check('sf-ca-frutas'),
      legumes: $check('sf-ca-legumes'),
      leite: $check('sf-ca-leite'),
      carnes: $check('sf-ca-carne'),
      ultraprocessados: $check('sf-ca-ultra'),
      refrigerante: $check('sf-ca-refrigerante'),
      gordura: $check('sf-ca-gordura'),
      obs: $val('sf-ca2-obs')
    })
  };

  /* ── Hook global: chamado por salvarFichaComVisita (app-fichas.js) ao salvar
     qualquer ficha enquanto o modal de visita estiver aberto.
     Marca a ficha como salva e atualiza o status na lista sem fechar o modal. */
  window._notificarFichaSalva = function(key) {
    if (!_visIndId) return; // modal fechado — ignorar
    _fichasSalvas[key] = true;
    var ind = db.individuoById[_visIndId];
    if (ind) _renderFichasList(ind, _fichasSalvas);
  };

  /* ══════════════════════════════════════════
     Controller principal
  ══════════════════════════════════════════ */
  let _visFamId = null, _visIndId = null, _fichasSalvas = {};

  /* _renderVacinasModal — renderiza o calendário vacinal diretamente nos
     containers vis-calendario-vacina / vis-vacina-idade-info do modal de visita.
     Não usa mais swap de IDs: lê ind.vacinas como fonte de verdade e escreve
     diretamente no container correto. */
  function _renderVacinasModal(ind) {
    if (!ind) return;
    const calEl  = $id('vis-calendario-vacina');
    const infoEl = $id('vis-vacina-idade-info');
    if (!calEl) return;

    const nascStr  = ind.nasc || '';
    const nascISO  = nascStr && nascStr.includes('/') ? _brToISO(nascStr) : nascStr;
    const nascDate = nascISO && !isNaN(new Date(nascISO + 'T00:00:00').getTime())
      ? new Date(nascISO + 'T00:00:00')
      : null;
    const sexo     = ind.sexo || 'F';
    const now      = new Date();

    // FIX: usa getIdadeEmMeses() canônica (cálculo por calendário real, não por média de 30.44 dias)
    const idadeMeses  = (typeof getIdadeEmMeses === 'function') ? getIdadeEmMeses(ind.nasc) : null;
    const idadeAnos   = (typeof getIdadeEmAnos  === 'function') ? getIdadeEmAnos(ind.nasc)  :
                        (idadeMeses !== null ? Math.floor(idadeMeses / 12) : null);

    const vacToShow = (typeof CALENDARIO_VACINAL !== 'undefined' && idadeMeses !== null)
      ? CALENDARIO_VACINAL.filter(function(v) {
          if (v.feminino && sexo !== 'F') return false;
          return idadeMeses >= (v.minMeses != null ? v.minMeses : 0);
        })
      : [];

    if (infoEl) {
      if (!nascDate) {
        infoEl.innerHTML = '<span style="color:var(--slate-500);font-size:var(--text-sm)">Data de nascimento não informada.</span>';
      } else {
        const aplicadas = vacToShow.filter(function(v) {
          const reg = (ind.vacinas || []).find(function(x){ return x.nome === v.nome; });
          return reg && reg.doses && reg.doses.some(function(d){ return d && d.data; });
        }).length;
        const cor = aplicadas === vacToShow.length ? 'var(--verde)' : aplicadas > 0 ? 'var(--amarelo)' : 'var(--vermelho)';
        // Guard: idadeMeses or idadeAnos may be null if nasc is missing/invalid
        const anosTxt  = idadeAnos  !== null ? idadeAnos  : '?';
        const mesesTxt = idadeMeses !== null ? Math.floor(idadeMeses % 12) : '?';
        infoEl.innerHTML = '<div style="display:flex;align-items:center;gap:var(--sp-3);flex-wrap:wrap">' +
          '<span>Idade: <strong>' + anosTxt + 'a ' + mesesTxt + 'm</strong></span>' +
          '<span style="color:' + cor + '">● ' + aplicadas + '/' + vacToShow.length + ' vacinas aplicadas</span>' +
          '</div>';
      }
    }

    if (!vacToShow.length) {
      calEl.innerHTML = '<div style="color:var(--slate-500);font-size:var(--text-sm);padding:var(--sp-4)">Nenhuma vacina aplicável para esta faixa etária.</div>';
      return;
    }

    function _doseLib(doseMeses) {
      if (!nascDate) return true;
      // FIX: adiciona meses pelo calendário (setMonth) em vez de média de 30.44 dias
      const dataMin = new Date(nascDate.getFullYear(), nascDate.getMonth() + doseMeses, nascDate.getDate());
      return now >= dataMin;
    }
    // Formata um objeto Date para string ISO 'YYYY-MM-DD' sem lançar RangeError
    // em datas inválidas (ex: nascDate corrompido no banco).
    function _safeISODate(d) {
      if (!d || isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    }

    calEl.innerHTML = vacToShow.map(function(vac) {
      const reg     = (ind.vacinas || []).find(function(x){ return x.nome === vac.nome; }) || { nome: vac.nome, doses: [] };
      const todasOk = vac.idades.every(function(_, di){ return reg.doses && reg.doses[di] && reg.doses[di].data; });
      const borda   = todasOk ? 'var(--verde)' : 'var(--cinza-300)';
      const bdrBox  = todasOk ? 'var(--verde-bdr)' : 'var(--cinza-200)';
      const dbInfo  = (typeof VAC_DB !== 'undefined' && VAC_DB[vac.nome]) || {};
      const icone   = dbInfo.icon || '💉';
      const nomeSafe = esc(vac.nome);
      const btnInfo = dbInfo.icon
        ? '<button class="vac-ibtn" onclick="event.stopPropagation();acsVacInfo(\'' + nomeSafe.replace(/'/g, "\\'") + '\')">ⓘ</button>'
        : '';

      const dosesHtml = vac.idades.map(function(idade, di) {
        const doseMesesMin = (vac.doseMeses && vac.doseMeses[di] != null) ? vac.doseMeses[di] : (vac.minMeses != null ? vac.minMeses : 0);
        const doseReg  = reg.doses && reg.doses[di];
        const aplicada = doseReg && doseReg.data;
        if (!_doseLib(doseMesesMin)) {
          const dp = new Date(nascDate.getFullYear(), nascDate.getMonth() + doseMesesMin, nascDate.getDate());
          return '<div style="padding:6px var(--sp-2);background:var(--surface-2);border:1px solid var(--bdr);border-radius:var(--r-xs);font-size:var(--text-xs);opacity:.65;cursor:not-allowed">' +
            '<div style="font-weight:600">D' + (di+1) + ': ' + idade + '</div>' +
            '<div style="color:var(--slate-500)">🔒 A partir de ' + (typeof formatData === 'function' ? formatData(_safeISODate(dp)) : _safeISODate(dp)) + '</div></div>';
        }
        const bg  = aplicada ? 'var(--verde-fraco)'  : 'var(--vermelho-fraco)';
        const bdr = aplicada ? 'var(--verde-claro)'  : 'var(--vermelho)';
        return '<div style="padding:6px var(--sp-2);background:' + bg + ';border:1px solid ' + bdr + ';border-radius:var(--r-xs);font-size:var(--text-xs);cursor:pointer;transition:opacity .15s"' +
          ' onclick="_toggleDoseModal(\'' + nomeSafe.replace(/'/g, "\\'") + '\',' + di + ')"' +
          ' title="Clique para marcar/desmarcar">' +
          '<div style="font-weight:600">D' + (di+1) + ': ' + idade + '</div>' +
          '<div>' + (aplicada ? ('✓ ' + (typeof formatData === 'function' ? formatData(doseReg.data) : doseReg.data)) : 'Pendente') + '</div></div>';
      }).join('');

      return '<div style="padding:10px var(--sp-3);background:var(--surface);border:1px solid ' + bdrBox + ';border-radius:var(--radius-sm);border-left:3px solid ' + borda + '">' +
        '<div class="vac-fix-hd">' +
        '<span style="font-size:var(--text-base);flex-shrink:0">' + icone + '</span>' +
        '<span class="vac-fix-nome" title="' + nomeSafe + '">' + (typeof vacAbrev === 'function' ? esc(vacAbrev(vac.nome)) : nomeSafe) + '</span>' +
        btnInfo +
        '<span class="vac-fix-badge">' + vac.doses + ' dose(s) · ' +
        (todasOk ? '<span style="color:var(--verde)">✓ Completa</span>' : '<span style="color:var(--amarelo)">Pendente</span>') +
        '</span></div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:var(--sp-1)">' + dosesHtml + '</div></div>';
    }).join('');
  }

  /* _toggleDoseModal — toggle de dose com save imediato e re-render sem sair do modal */
  window._toggleDoseModal = function(nomeVacina, doseIdx) {
    const ind = db.individuoById[_visIndId];
    if (!ind) return;
    if (!Array.isArray(ind.vacinas)) ind.vacinas = [];

    let reg = ind.vacinas.find(function(v){ return v.nome === nomeVacina; });
    if (!reg) { reg = { nome: nomeVacina, doses: [] }; ind.vacinas.push(reg); }
    if (!Array.isArray(reg.doses)) reg.doses = [];

    const dose = reg.doses[doseIdx];
    reg.doses[doseIdx] = (dose && dose.data) ? { data: null } : { data: _hoje() };

    save();
    _renderVacinasModal(ind);
    const marcada = reg.doses[doseIdx] && reg.doses[doseIdx].data;
    if (typeof toast === 'function') toast(marcada ? '💉 Vacina marcada como aplicada!' : 'Vacina desmarcada', marcada ? 'success' : 'info');
  };

  window._visInd = {
    open: function(famId, indId) {
      _visFamId = famId;
      _visIndId  = indId;
      _fichasSalvas = {};

      var ind = db.individuoById[indId];
      if (!ind) { toast('Indivíduo não encontrado', 'error'); return; }

      $id('vis-ind-nome-label').textContent =
        (ind.nome || 'Paciente') + (ind.vinculoResponsavel ? ' · ' + ind.vinculoResponsavel : '');
      var _idadeEl = $id('vis-ind-idade-label');
      if (_idadeEl) { try { var _ie = idadeExata(ind.nasc); _idadeEl.textContent = _ie ? '🎂 ' + _ie : ''; } catch(e) { _idadeEl.textContent = ''; } }
      $id('vis-ind-data').value  = _isoToBR(_hoje());
      $id('vis-ind-turno').value = new Date().getHours() < 12 ? 'manha' : 'tarde';

      _renderFichasList(ind, _fichasSalvas);
      $id('vis-ind-ficha-subform').innerHTML = '';

      _renderVacinasModal(ind);
      this._renderMeds(ind);

      this.tab(document.querySelector('.vis-ind-tab'), 'pane-fichas');
      if (typeof openModal === 'function') {
        openModal('modal-visita-ind');
      } else {
        var _el = $id('modal-visita-ind');
        _el.style.display = 'flex'; _el.scrollTop = 0;
      }
    },

    close: function() {
      if (typeof closeModal === 'function') {
        closeModal('modal-visita-ind');
      } else {
        $id('modal-visita-ind').style.display = 'none';
      }
      _visFamId = null; _visIndId = null; _fichasSalvas = {};
      // Reset hook para noop enquanto modal fechado (evita atualizar lista inexistente)
      window._notificarFichaSalva = function() {};
    },

    getIndId: function() { return _visIndId; },

    tab: function(btn, paneId) {
      document.querySelectorAll('.vis-ind-tab').forEach(function(t){ t.classList.remove('active'); });
      document.querySelectorAll('.vis-ind-pane').forEach(function(p){ p.classList.remove('active'); });
      btn.classList.add('active');
      $id(paneId).classList.add('active');
      if (paneId === 'pane-vacinas') {
        var ind = db.individuoById[_visIndId];
        if (ind) _renderVacinasModal(ind);
      }
    },

    abrirFicha: function(key) {
      var ind = db.individuoById[_visIndId];
      if (!ind) return;

      // Para tipos que têm ficha completa, renderizar inline no subform do modal
      var tiposAcomp = ['has','dm','gestante','consumoAlimentar','hans','acamado','prevencao'];
      if (tiposAcomp.indexOf(key) >= 0) {
        var renders = {
          has:             typeof renderFichaHAS              === 'function' ? renderFichaHAS              : null,
          dm:              typeof renderFichaDM               === 'function' ? renderFichaDM               : null,
          gestante:        typeof renderFichaGestante         === 'function' ? renderFichaGestante         : null,
          consumoAlimentar:typeof renderFichaConsumoAlimentar === 'function' ? renderFichaConsumoAlimentar : null,
          hans:            typeof renderFichaHans             === 'function' ? renderFichaHans             : null,
          acamado:         typeof renderFichaAcamado          === 'function' ? renderFichaAcamado          : null,
          prevencao:       typeof renderFichaPrevencao        === 'function' ? renderFichaPrevencao        : null,
        };
        var renderFn = renders[key];
        if (!renderFn) return;
        var fichaHtml = renderFn(_visIndId);
        var sub = $id('vis-ind-ficha-subform');
        if (!sub) return;
        var subEl = cloneTemplate('tpl-ficha-subform');
        subEl.querySelector('.fsw-titulo').textContent = key.charAt(0).toUpperCase() + key.slice(1);
        subEl.querySelector('.fsw-body').innerHTML = fichaHtml;
        subEl.querySelector('.fsw-fechar').addEventListener('click', function() { _visInd.fecharSubform(); });
        sub.innerHTML = '';
        sub.appendChild(subEl);
        sub.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }

      // Fichas extras (mental, tb, cancer, acamado) — inline
      var formFn = FICHA_FORMS[key];
      if (!formFn) return;
      var sub = $id('vis-ind-ficha-subform');
      var subEl2 = document.createElement('div');
      subEl2.className = 'ficha-subform';
      subEl2.innerHTML = formFn(ind);
      sub.innerHTML = '';
      sub.appendChild(subEl2);

      var prev = db.fichas && db.fichas.atual && db.fichas.atual[key] && db.fichas.atual[key][_visIndId];
      if (prev) {
        var _s = function(id, v) { var el = $id(id); if (el && v != null) el.value = v; };
        var _c = function(id, v) { var el = $id(id); if (el && v != null) el.checked = !!v; };
        if (key === 'mental') {
          _s('sf-mental-sit', prev.situacao); _c('sf-mental-adesao', prev.adesao); _c('sf-mental-caps', prev.acompanhaCaps);
          _c('sf-mental-familiar', prev.suporteFamiliar); _c('sf-mental-encam', prev.encaminhado); _s('sf-mental-obs', prev.obs);
        } else if (key === 'tb') {
          _s('sf-tb-fase', prev.fase); _s('sf-tb-dots', prev.dots);
          _c('sf-tb-adesao', prev.adesao); _c('sf-tb-reacoes', prev.reacoes); _c('sf-tb-contatos', prev.contatosInvestigados);
          _s('sf-tb-obs', prev.obs);
        } else if (key === 'cancer') {
          _s('sf-ca-fase', prev.fase); _c('sf-ca-adesao', prev.adesao); _c('sf-ca-dor', prev.dor);
          _c('sf-ca-oncol', prev.acompanhaOncologia); _c('sf-ca-suporte', prev.suporte); _s('sf-ca-obs', prev.obs);
        } else if (key === 'acamado') {
          _c('sf-ac-lesao', prev.lesaoPressao); _c('sf-ac-higiene', prev.higiene); _c('sf-ac-alim', prev.alimentacao);
          _c('sf-ac-cuidador', prev.cuidador); _c('sf-ac-fisio', prev.fisioterapia); _c('sf-ac-encam', prev.encaminhado);
          _s('sf-ac-obs', prev.obs);
        }
      }
      sub.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    fecharSubform: function() {
      $id('vis-ind-ficha-subform').innerHTML = '';
    },

    salvarFicha: function(key) {
      var ind = db.individuoById[_visIndId];
      if (!ind) return;
      var coletarFn = FICHA_COLETAR[key];
      if (!coletarFn) return;

      var dados = (key === 'has') ? coletarFn(ind) : coletarFn();
      dados._dataSalva = _hoje(); dados._salvoNaVisita = true;

      if (!db.fichas)            db.fichas            = { atual: {}, historico: {} };
      if (!db.fichas.atual)      db.fichas.atual      = {};
      if (!db.fichas.historico)  db.fichas.historico  = {};
      if (!db.fichas.atual[key]) db.fichas.atual[key] = {};
      db.fichas.atual[key][_visIndId] = dados;

      // ── Criar entrada no histórico (path B) ──────────────────────────────
      // Hans tem path próprio via salvarRastreioHans → excluído intencionalmente.
      if (key !== 'hans') {
        if (!db.fichas.historico[key])            db.fichas.historico[key]            = {};
        if (!db.fichas.historico[key][_visIndId]) db.fichas.historico[key][_visIndId] = [];
        var snapshot = Object.assign({}, dados);
        delete snapshot._dataSalva;
        delete snapshot._salvoNaVisita;
        db.fichas.historico[key][_visIndId].push({
          data:     _hoje(),
          dataHora: new Date().toISOString(),
          campos:   snapshot,
          obs:      '',
        });
      }

      save();

      _fichasSalvas[key] = true;
      this.fecharSubform();
      // Atualiza status na lista via hook centralizado
      if (typeof window._notificarFichaSalva === 'function') window._notificarFichaSalva(key);
      // Atualiza badge HANS e snapshot global imediatamente
      if (typeof DB !== 'undefined' && DB.invalidate) DB.invalidate();
      if (key === 'hans' && typeof atualizarBadgeHans === 'function') atualizarBadgeHans();
      if (typeof renderDashboard === 'function') renderDashboard();
      toast('\u2705 Ficha salva!', 'success');
    },

    salvar: function() {
      if (!_visFamId || !_visIndId) return;
      var data  = _brToISO($id('vis-ind-data').value);
      var turno = $id('vis-ind-turno').value;
      var obs   = '';
      if (!data) { toast('Informe a data da visita', 'error'); return; }

      var ind = db.individuoById[_visIndId];
      if (ind && _visIndMeds) ind.medicacoes = _visIndMeds.filter(function(m){ return m.nome && m.nome.trim(); });

      db.visitas.push({
        id: nextId('visita'), data: data, familiaId: _visFamId, turno: turno,
        escopo: 'individuo', membroId: _visIndId,
        tipo: 'Acompanhamento individual', desfecho: 'Visita realizada',
        vacina: 'nao-avaliado', encam: 'nao', obs: obs,
        cbo: (db.config && db.config.cbo) || '515105', dataRegistro: _hoje()
      });

      var fam = db.familiaById[_visFamId];
      if (fam && (!fam.ultimaVisita || data > fam.ultimaVisita)) fam.ultimaVisita = data;

      save();
      // Re-renderizar páginas afetadas imediatamente, antes de fechar o modal
      if (typeof DB !== 'undefined' && DB.invalidate) DB.invalidate();
      if (typeof renderFamilias  === 'function') renderFamilias();
      if (typeof renderVisitas   === 'function') renderVisitas();
      if (typeof renderDashboard === 'function') renderDashboard();
      if (typeof updateBadge     === 'function') updateBadge();
      toast('\u2705 Visita registrada!', 'success');
      this.close();
    },

    _renderMeds: function(ind) {
      var meds = (ind.medicacoes || []).map(function(m){ return Object.assign({}, m); });
      _visIndMeds = meds;
      var el = $id('lista-medicacoes-modal');
      if (!el) return;
      if (!meds.length) {
        el.replaceChildren(createEmptyState('💊', 'Nenhuma medica\u00e7\u00e3o cadastrada'));
        return;
      }
      var frag = document.createDocumentFragment();
      meds.forEach(function(m, idx) {
        var card = cloneTemplate('tpl-med-card');
        card.querySelector('.med-nome').textContent = m.nome || '\u2014';
        card.querySelector('.med-dose').textContent = (m.dose || '\u2014') + ' \u00b7 ' + (m.freq || '\u2014');
        var localEl = card.querySelector('.med-local');
        if (m.localAcesso) {
          localEl.textContent = '\uD83D\uDCCD ' + m.localAcesso;
          localEl.hidden = false;
        }
        (function(i) {
          card.querySelector('.med-remover').addEventListener('click', function() {
            _visInd._remMed(i);
          });
        })(idx);
        frag.appendChild(card);
      });
      el.innerHTML = '';
      el.appendChild(frag);
    },

    _addMed: function() {
      if (!_visIndMeds) _visIndMeds = [];
      var idx = _visIndMeds.length;
      _visIndMeds.push({ nome: '', freq: '1x/dia', localAcesso: '' });
      var el = $id('lista-medicacoes-modal');
      if (!el) return;

      var row = cloneTemplate('tpl-med-new-row');
      row.dataset.newMed = idx;

      var inputNome  = row.querySelector('.med-new-nome');
      var selectFreq = row.querySelector('.med-new-freq');
      var btnRem     = row.querySelector('.med-new-remover');

      // Persiste qualquer edição em ind.medicacoes imediatamente (sem precisar registrar visita)
      function _syncMeds() {
        var ind = db.individuoById[_visIndId];
        if (ind) {
          ind.medicacoes = _visIndMeds.filter(function(m){ return m.nome && m.nome.trim(); });
          save();
        }
      }

      inputNome.addEventListener('input', function() {
        if (_visIndMeds[idx]) _visIndMeds[idx].nome = inputNome.value;
        _syncMeds();
      });
      selectFreq.addEventListener('change', function() {
        if (_visIndMeds[idx]) _visIndMeds[idx].freq = selectFreq.value;
        _syncMeds();
      });
      btnRem.addEventListener('click', function() {
        row.remove();
        _visIndMeds.splice(idx, 1);
        _syncMeds();
      });

      el.appendChild(row);

      // Inicializa autocomplete de medicamentos no campo nome
      if (typeof AutocompleteMedicamento !== 'undefined') {
        new AutocompleteMedicamento(inputNome, {
          onSelect: function(nome) {
            if (_visIndMeds[idx]) _visIndMeds[idx].nome = nome;
            _syncMeds();
          }
        });
      }

      inputNome.focus();
    },

    _remMed: function(idx) {
      if (!_visIndMeds) return;
      _visIndMeds.splice(idx, 1);
      var ind = db.individuoById[_visIndId];
      if (ind) {
        // Persistir imediatamente — sem precisar registrar visita
        ind.medicacoes = _visIndMeds.filter(function(m){ return m.nome && m.nome.trim(); });
        save();
        this._renderMeds({ medicacoes: _visIndMeds });
      }
    },

    _salvarVacina: function() {
      var nomeEl = $id('add-vac-nome');
      var doseEl = $id('add-vac-dose');
      var dataEl = $id('add-vac-data');
      var nome = nomeEl && nomeEl.value;
      var dose = doseEl && doseEl.value;
      var data = dataEl && dataEl.value;
      if (!nome || !data) { toast('Preencha vacina e data', 'error'); return; }

      var ind = db.individuoById[_visIndId];
      if (!ind) return;
      if (!Array.isArray(ind.vacinas)) ind.vacinas = [];

      var reg = ind.vacinas.find(function(v){ return v.nome === nome; });
      if (!reg) { reg = { nome: nome, doses: [] }; ind.vacinas.push(reg); }
      if (!Array.isArray(reg.doses)) reg.doses = [];
      var doseIdx = isNaN(parseInt(dose)) ? reg.doses.length : (parseInt(dose) - 1);
      reg.doses[doseIdx] = { data: _brToISO(data) || data };

      save();
      _renderVacinasModal(ind);
      if (typeof closeModal === 'function') closeModal('modal-add-vacina');
      else $id('modal-add-vacina').style.display = 'none';
      toast('\uD83D\uDC89 Vacina registrada!', 'success');
    }
  };

  /* Estado local das medicações editáveis no modal de visita */
  var _visIndMeds = [];

  /* ── Override: clicar no membro em Domicílios abre o modal de visita ── */
  window.abrirDetalhesIndividuo = function(indOuId) {
    var id  = typeof indOuId === 'object' ? indOuId.idIndividuo : indOuId;
    var ind = db.individuoById[id];
    if (!ind) return;
    window._visInd.open(ind.familiaId, id);
  };

  /* ── Botão 👤 Visita Individual na página Indivíduos ── */
  window.registrarVisitaIndividuoRapida = function(famId, indId) {
    window._visInd.open(famId, indId);
  };

    /* ── abrirModalVacinas — chamado por renderAbaVacinas ── */
  window.abrirModalVacinas = function(indId) {
    _visIndId = _visIndId || indId; // manter contexto se já aberto
    // Popular select de vacinas a partir do calendário vacinal
    const sel = $id('add-vac-nome');
    if (sel && typeof CALENDARIO_VACINAL !== 'undefined') {
      sel.innerHTML = '';
      var vacFrag = document.createDocumentFragment();
      CALENDARIO_VACINAL.forEach(function(v) {
        var opt = document.createElement('option');
        opt.value       = v.nome;
        opt.textContent = v.nome;
        vacFrag.appendChild(opt);
      });
      sel.appendChild(vacFrag);
    }
    $id('add-vac-data').value = _isoToBR(_hoje());
    if (typeof openModal === 'function') {
      openModal('modal-add-vacina');
    } else {
      var _av = $id('modal-add-vacina');
      _av.style.display = 'flex'; _av.scrollTop = 0;
    }
  };

  /* ── Fechar modais ao clicar no overlay ── */
  $id('modal-visita-ind').addEventListener('click', function(e) {
    if (e.target === this) window._visInd.close();
  });
  $id('modal-add-vacina').addEventListener('click', function(e) {
    if (e.target === this) {
      if (typeof closeModal === 'function') closeModal('modal-add-vacina');
      else this.style.display = 'none';
    }
  });

})();
