// ACS Neto — app-crud.js  (refatorado)
// CRUD de domicílio, família, indivíduo, visita e pendência
// Depende de: app-core.js, app-utils.js, app-ui.js, app-render.js
//
// ◆ CAMADA DOM — helpers finos que isolam todo acesso direto ao DOM

/**
 * Valida um campo obrigatório: se vazio, aplica borda vermelha, rola até o campo
 * e exibe o erro inline sob ele. Retorna false se inválido.
 * @param {string} id  — id do input/select
 * @param {string} msg — mensagem de erro exibida sob o campo
 */
const MODAL_CHAIN_DELAY_MS = 350; // pausa entre fechar e abrir modal encadeado
function _validarCampo(id, msg) {
  const el = $id(id);
  if (!el) return true; // campo não existe nesta modal — ignora
  const val = el.tagName === 'SELECT' ? el.value : (el.value || '').trim();
  if (val) {
    // Limpa estado de erro anterior deste campo
    el.style.borderColor = '';
    el.style.boxShadow = '';
    const prev = el.parentNode?.querySelector('.campo-erro-msg');
    if (prev) prev.remove();
    return true;
  }
  // Marca campo com borda vermelha
  el.style.borderColor = 'var(--vermelho)';
  el.style.boxShadow   = '0 0 0 3px var(--vermelho-fraco)';
  // Mensagem inline sob o campo (evita remoção ao re-focar)
  let msgEl = el.parentNode?.querySelector('.campo-erro-msg');
  if (!msgEl) {
    msgEl = document.createElement('div');
    msgEl.className = 'campo-erro-msg';
    msgEl.style.cssText = 'font-size:var(--text-xs);color:var(--vermelho);margin-top:4px;font-weight:600';
    el.parentNode?.appendChild(msgEl);
  }
  msgEl.textContent = msg;
  // Scroll + foco no campo problemático
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.focus();
  // Remove marcação vermelha ao corrigir o campo
  const limpar = () => {
    el.style.borderColor = '';
    el.style.boxShadow   = '';
    const m = el.parentNode?.querySelector('.campo-erro-msg');
    if (m) m.remove();
    el.removeEventListener('input', limpar);
    el.removeEventListener('change', limpar);
  };
  el.addEventListener('input',  limpar, { once: true });
  el.addEventListener('change', limpar, { once: true });
  return false;
}
// Regra: código de negócio NÃO chama document.getElementById diretamente.
// Apenas as funções _form* (e os próprios helpers) fazem isso.

// $id, $val, $set, $check, $setCheck, $trim, $show, $hide, $text


/** Lê todos os campos do formulário de domicílio e devolve um objeto plano. */
function _formReadDomicilio() {
  const possuiAnimais = $val('dom-possui-animais', 'Não');
  const bairroSelect  = $val('dom-bairro');
  const bairroOutro   = $trim('dom-bairro-outro');

  return {
    // Endereço
    tipoLogradouro:  $val('dom-fk-logradouro', 'Rua'),
    logradouro:      $trim('dom-logradouro'),
    numero:          $trim('dom-numero'),
    complemento:     $trim('dom-complemento'),
    bairro:          bairroSelect === 'Outro' ? bairroOutro : bairroSelect,
    cep:             $trim('dom-cep'),
    referencia:      $trim('dom-referencia'),
    latitude:        $trim('dom-latitude'),
    longitude:       $trim('dom-longitude'),
    codMicroarea:    $trim('dom-cod-microarea') || (db.config?.microarea || ''),
    tipoAcesso:      $val('dom-tipo-acesso'),
    // Imóvel
    tipoImovel:      $val('dom-tipo-imovel'),
    tipoDom:         $val('dom-tipo-dom'),
    situacaoMoradia: $val('dom-situacao-moradia'),
    material:        $val('dom-material'),
    numeroComodos:   parseInt($val('dom-num-comodos', '0')) || 0,
    // Saneamento
    agua:            $val('dom-agua'),
    aguaConsumida:   $val('dom-agua-consumo'),
    esgoto:          $val('dom-esgoto'),
    lixo:            $val('dom-lixo'),
    energia:         $val('dom-energia'),
    // Animais
    possuiAnimais,
    numAnimais:      parseInt($val('dom-num-animais',  '0')) || 0,
    cachorros:       parseInt($val('dom-cachorros',    '0')) || 0,
    gatos:           parseInt($val('dom-gatos',        '0')) || 0,
    passaros:        parseInt($val('dom-passaros',     '0')) || 0,
    galinha:         parseInt($val('dom-galinhas',     '0')) || 0,
    outrosAnimais:   parseInt($val('dom-outros-animais','0')) || 0,
  };
}

/** Preenche o formulário de domicílio a partir de um objeto de dados. */
function _formWriteDomicilio(d) {
  // Campos de texto
  $set('dom-logradouro',    d.logradouro);
  $set('dom-numero',        d.numero);
  $set('dom-complemento',   d.complemento);
  $set('dom-cep',           d.cep);
  $set('dom-referencia',    d.referencia);
  $set('dom-latitude',      d.latitude);
  $set('dom-longitude',     d.longitude);
  // Aba 2 — condições
  $set('dom-num-comodos',   d.numeroComodos);
  // Aba 3 — animais
  $set('dom-num-animais',   d.numAnimais       || d.numeroDeAnimais || 0);
  $set('dom-cachorros',     d.cachorros        || 0);
  $set('dom-gatos',         d.gatos            || 0);
  $set('dom-passaros',      d.passaros         || 0);
  $set('dom-galinhas',      d.galinha          || 0);
  $set('dom-outros-animais',d.outrosAnimais    || 0);
  // Selects — aba 1
  $set('dom-fk-logradouro', d.tipoLogradouro   || d.fkLogradouro || 'Rua');
  $set('dom-bairro',        d.bairro);
  $set('dom-tipo-acesso',   d.tipoAcesso       || d.fkTipoAcessoDomicilio);
  $set('dom-tipo-imovel',   d.tipoImovel);
  $set('dom-tipo-dom',      d.tipoDom);
  // Selects — aba 2
  $set('dom-situacao-moradia', d.situacaoMoradia);
  $set('dom-material',      d.material);
  $set('dom-disp-agua',     (d.agua && d.agua !== 'Não') ? 'Sim' : 'Não');
  $set('dom-agua',          d.agua);
  $set('dom-agua-consumo',  d.aguaConsumida    || d.fkAguaConsumida);
  $set('dom-esgoto',        d.esgoto);
  $set('dom-lixo',          d.lixo);
  $set('dom-disp-energia',  (d.energia && d.energia !== 'Não') ? 'Sim' : 'Não');
  $set('dom-energia',       d.energia);
  // Selects — aba 3
  $set('dom-possui-animais',d.possuiAnimais    || 'Não');
  toggleAnimais(d.possuiAnimais || 'Não');
  // Status de geoloc — ocultar ao editar
  $hide('geoloc-status');
}


/** Lê os campos do formulário de família. */
function _formReadFamilia() {
  return {
    prontuario:            $trim('fam-prontuario') || gerarProximoProntuario(),
    dataInicio:            $val('fam-data-inicio'),
    rendaSalariosMinimos:  parseFloat($val('fam-renda', '1.0')) || 1.0,
    risco:                 $val('fam-risco', 'baixo'),
    obs:                   $val('fam-obs'),
  };
}

/** Preenche o formulário de família a partir de um objeto de dados. */
function _formWriteFamilia(f) {
  $set('fam-prontuario',   f.prontuario   || getFamiliaProntuario(f));
  $set('fam-data-inicio',  f.dataInicio   || f.dataCadastro?.slice(0, 7) || '');
  $set('fam-renda',        f.rendaSalariosMinimos || f.renda || '1.0');
  $set('fam-risco',        f.risco        || 'baixo');
  $set('fam-obs',          f.obs          || f.observacoes || '');
}

/** Limpa o formulário de família para um novo cadastro. */
function _formClearFamilia(domicilioId) {
  $set('fam-prontuario',  gerarProximoProntuario());
  $set('fam-data-inicio', new Date().toISOString().slice(0, 7));
  $set('fam-renda',       '1.0');
  $set('fam-risco',       'baixo');
  $set('fam-obs',         '');
}


/** Lê todos os campos do formulário de indivíduo.
 *  @param {string} nascISO — data de nascimento já convertida para ISO (YYYY-MM-DD)
 */
function _formReadIndividuo(nascISO) {
  return {
    nome:              sanitizeInput($trim('ind-nome')),
    familiaId:         parseInt($val('ind-familia-id')),
    vinculoResponsavel:$val('ind-vinculo'),
    mae:               $val('ind-mae'),
    pai:               $val('ind-pai'),
    cpf:               $trim('ind-cpf'),
    cns:               $trim('ind-cns'),
    nomeSocial:        $trim('ind-nome-social'),
    trabalho:          $val('ind-trabalho', 'Não se aplica'),
    nasc:              nascISO,
    sexo:              $val('ind-sexo',        'F'),
    raca:              $val('ind-raca',        'Parda'),
    escolaridade:      $val('ind-escolaridade','Fundamental incompleto'),
    // Condições de saúde
    has:               $val('ind-has',      'nao'),
    dm:                $val('ind-dm',       'nao'),
    gestante:          $val('ind-gestante', 'nao'),
    deficiencia:       $val('ind-deficiencia','nao'),
    mental:            $val('ind-mental',   'nao'),
    tb:                $val('ind-tb',       'nao'),
    cancer:            $val('ind-cancer',   'nao'),
    acamado:           $val('ind-acamado',  'nao'),
    tea:               $val('ind-tea',      'nao'),
    alcool:            $val('ind-alcool',   'nao'),
    drogas:            $val('ind-drogas',   'nao'),
    avc:               $val('ind-avc',      'nao'),
    infarto:           $val('ind-infarto',  'nao'),
    outras:            $val('ind-outras'),
    alergias:          $val('ind-alergias'),
    // Exames preventivos
    papanicolau:       _brToISO($val('ind-papanicolau', '')) || '',
    mamografia:        _brToISO($val('ind-mamografia',  '')) || '',
    odonto:            { dataAvaliacao: _brToISO($val('ind-odonto-data', '')) || '' },
    // Social
    bolsaFamilia:      $check('ind-bolsa-familia'),
    bolsaPesagem:      _brToISO($val('ind-bolsa-pesagem', '')) || '',
    bpcLoas:           $check('ind-bpc-loas'),
    recebeFraldas:     $check('ind-recebe-fraldas'),
    recebeFitas:       $check('ind-recebe-fitas'),
    // Listas
    medicacoes:        coletarMedicacoes(),
    vacinas:           coletarVacinas(),
  };
}

/** Preenche o formulário de indivíduo a partir de um objeto de dados. */
function _formWriteIndividuo(i) {
  $set('ind-familia-id',    i.familiaId);
  // Sincroniza o select de vínculo com o estado real do responsável na família
  const _fWrite = getFamilia(i.familiaId);
  const _isResp = _fWrite && _fWrite.responsavelId == i.idIndividuo;
  $set('ind-vinculo', _isResp ? 'Responsável' : (i.vinculoResponsavel || 'Outro parente'));
  $set('ind-nome',          i.nome);
  $set('ind-nome-social',   i.nomeSocial);
  $set('ind-mae',           i.mae);
  $set('ind-pai',           i.pai);
  $set('ind-nasc',          _isoToBR(i.nasc) || '');
  $set('ind-sexo',          i.sexo      || 'F');
  $set('ind-raca',          i.raca      || 'Parda');
  $set('ind-escolaridade',  i.escolaridade || 'Fundamental incompleto');
  $set('ind-cpf',           i.cpf);
  $set('ind-cns',           i.cns);
  $set('ind-trabalho',      i.trabalho  || 'Não se aplica');
  // Condições de saúde
  $set('ind-has',           i.has       || 'nao');
  $set('ind-dm',            i.dm        || 'nao');
  $set('ind-gestante',      i.gestante  || 'nao');
  $set('ind-deficiencia',   i.deficiencia || 'nao');
  $set('ind-mental',        i.mental    || 'nao');
  $set('ind-tb',            i.tb        || 'nao');
  $set('ind-cancer',        i.cancer    || 'nao');
  $set('ind-acamado',       i.acamado   || 'nao');
  $set('ind-tea',           i.tea       || 'nao');
  $set('ind-alcool',        i.alcool    || 'nao');
  $set('ind-drogas',        i.drogas    || 'nao');
  $set('ind-avc',           i.avc       || 'nao');
  $set('ind-infarto',       i.infarto   || 'nao');
  $set('ind-outras',        i.outras);
  // Social
  $setCheck('ind-bolsa-familia', i.bolsaFamilia);
  toggleBolsaPesagem();
  $set('ind-bolsa-pesagem', _isoToBR(i.bolsaPesagem) || '');
  $setCheck('ind-bpc-loas',        i.bpcLoas);
  $setCheck('ind-recebe-fraldas',  i.recebeFraldas);
  $setCheck('ind-recebe-fitas',    i.recebeFitas);
  $set('ind-alergias',      i.alergias);
  // Exames preventivos
  $set('ind-papanicolau',   _isoToBR(i.papanicolau) || '');
  $set('ind-mamografia',    _isoToBR(i.mamografia)  || '');
  $set('ind-odonto-data',   _isoToBR((i.odonto && i.odonto.dataAvaliacao) || '') || '');
  toggleExamesFemininos();
  toggleOdontoField();
  // (ind-is-responsavel não existe no HTML — vínculo sincronizado via ind-vinculo acima)
}

/** Zera todos os campos do formulário de indivíduo para um novo cadastro. */
function _formClearIndividuo(famId) {
  const COND_IDS = ['ind-has','ind-dm','ind-gestante','ind-deficiencia',
    'ind-mental','ind-tb','ind-cancer','ind-acamado','ind-tea','ind-alcool',
    'ind-drogas','ind-avc','ind-infarto'];

  $set('ind-familia-id', famId);
  ['ind-nome','ind-nome-social','ind-mae','ind-pai','ind-cpf','ind-cns','ind-outras']
    .forEach(id => $set(id, ''));
  $set('ind-nasc',         '');
  $set('ind-sexo',         'F');
  $set('ind-raca',         'Parda');
  $set('ind-escolaridade', 'Fundamental incompleto');
  $set('ind-trabalho',     'Não se aplica');
  $set('ind-alergias',     '');
  $set('ind-papanicolau',  '');
  $set('ind-mamografia',   '');
  $set('ind-odonto-data',  '');
  COND_IDS.forEach(id => $set(id, 'nao'));
  $setCheck('ind-bolsa-familia',   false);
  $setCheck('ind-bpc-loas',        false);
  $setCheck('ind-recebe-fraldas',  false);
  $setCheck('ind-recebe-fitas',    false);
  $hide('ind-exame-odonto');

}


/** Lê os campos do formulário de visita. */
function _formReadVisita() {
  const escopo   = document.querySelector('input[name="vis-escopo"]:checked')?.value || 'familia';
  const membroId = escopo === 'individuo' ? parseInt($val('vis-membro')) : null;
  return {
    dataBR:     $val('vis-data'),
    data:       _brToISO($val('vis-data')),
    famId:      parseInt($val('vis-familia')),
    turno:      $val('vis-turno'),
    escopo,
    membroId,
    tipo:       $val('vis-tipo'),
    desfecho:   $val('vis-desfecho'),
    vacina:     $val('vis-vacina'),
    encam:      $val('vis-encam'),
    obs:        '',
    pendTxt:    $trim('vis-pendencia'),
  };
}

/** Preenche campos padrão do formulário de visita (data/turno/obs). */
function _formClearVisita() {
  $set('vis-data',      _isoToBR(hoje()));
  $set('vis-turno',     new Date().getHours() < 12 ? 'manha' : 'tarde');
  $set('vis-pendencia', '');
}


/** Lê os campos do formulário de pendência. */
function _formReadPendencia() {
  return {
    titulo:     $trim('pend-titulo'),
    tipo:       $val('pend-tipo'),
    prioridade: $val('pend-prioridade'),
    familiaId:  parseInt($val('pend-familia')) || null,
    prazo:      _brToISO($val('pend-prazo')) || '',
    obs:        '',
  };
}


function openNovoDomicilioNaRua(logradouroPreencher) {
  openNovoDomicilio();
  setTimeout(() => $set('dom-logradouro', logradouroPreencher), 50);
}

let _domTabAtual = 1;

function domSwitchTab(num) {
  _domTabAtual = num;
  [1, 2, 3].forEach(n => {
    const pane = $id('dom-tab-' + n);
    const btn  = $id('dom-tab-btn-' + n);
    if (!pane || !btn) return;
    const ativo = n === num;
    pane.style.display = ativo ? 'block' : 'none';
    btn.style.borderBottomColor = ativo ? 'var(--violet-600)' : 'transparent';
    btn.style.color      = ativo ? 'var(--violet-600)' : 'var(--slate-500)';
    btn.style.fontWeight = ativo ? '700' : '600';
  });
  const prev = $id('dom-btn-prev');
  const next = $id('dom-btn-next');
  if (prev) prev.style.display = num > 1 ? 'inline-flex' : 'none';
  if (next) next.style.display = num < 3 ? 'inline-flex' : 'none';
}

function domNavTab(delta) {
  domSwitchTab(Math.max(1, Math.min(3, _domTabAtual + delta)));
}

function toggleAnimais(val) {
  const temAnimais = val === 'Sim';
  $id('dom-animais-detalhes') && ($id('dom-animais-detalhes').style.display = temAnimais ? 'block' : 'none');
  $id('dom-animais-vazio')    && ($id('dom-animais-vazio').style.display    = temAnimais ? 'none'  : 'block');
}

function _domAbrir() {
  domSwitchTab(1);
  openModal('modal-domicilio');
}

function openNovoDomicilio() {
  editDomicilioId = null;
  $text('modal-domicilio-titulo', '🏠 Novo Domicílio');
  DOM_FIELDS_TEXT.forEach(id   => $set(id, ''));
  DOM_FIELDS_SELECT.forEach(id => { const el = $id(id); if (el) el.selectedIndex = 0; });
  DOM_FIELDS_NUM.forEach(id    => $set(id, '0'));
  toggleAnimais('Não');
  _domAbrir();
}

function editarDomicilio(domId) {
  const d = getDomicilio(domId);
  if (!d) return;
  editDomicilioId = domId;
  $text('modal-domicilio-titulo', '🏠 Editar Domicílio');
  _formWriteDomicilio(d);
  _domAbrir();
}

function salvarDomicilio() {
  const dados = _formReadDomicilio();
  if (!_validarCampo('dom-logradouro', 'Logradouro é obrigatório')) return;

  if (editDomicilioId) {
    Object.assign(db.domicilioById[editDomicilioId], dados);
    toast('Domicílio atualizado!', 'success');
  } else {
    const domId = nextId('domicilio');
    db.domicilioById[domId] = {
      idDomicilio: domId, familias: [], dataCadastro: hoje(), ...dados,
    };
    toast('Domicílio cadastrado! Agora adicione uma família. 🏡', 'success');
  }
  save();
  closeModal('modal-domicilio');
  // Render adiado para não bloquear a UI no Android logo após o save
  DB.invalidate();
  if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
  editDomicilioId = null;
}

function excluirDomicilio(domId) {
  const d = getDomicilio(domId);
  if (!d) return;
  const nFamilias = (d.familias || []).length;
  const msg = nFamilias > 0
    ? `Este domicílio tem ${nFamilias} família(s). Excluir também os membros?`
    : 'Excluir este domicílio?';

  customConfirm(msg, function () {
    (d.familias || []).forEach(famId => {
      Object.keys(db.individuoById || {}).forEach(k => {
        if (db.individuoById[k]?.familiaId === famId) delete db.individuoById[k];
      });
      delete db.familiaById[Number(famId)];
    });
    delete db.domicilioById[domId];
    delete db.domicilioById[String(domId)];
    save();
    DB.invalidate();
    invalidateFamiliaSelects();
    if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
    toast('Domicílio excluído 🗑', 'warn');
  });
}


function openNovaFamilia() {
  const doms = getDomicilios();
  if (doms.length === 0) {
    toast('Cadastre um domicílio primeiro!', 'error');
    setTimeout(() => openNovoDomicilio(), MODAL_CHAIN_DELAY_MS);
    return;
  }
  if (doms.length === 1) {
    openNovaFamiliaNoDomicilio(doms[0].idDomicilio ?? doms[0].id);
    return;
  }
  // Picker rápido quando há mais de um domicílio
  const opts = doms.map(d =>
    `<option value="${d.idDomicilio}">${esc(d.logradouro)} ${d.numero ? 'nº ' + esc(d.numero) : ''} - ${esc(d.bairro || '')}</option>`
  ).join('');
  const div = _criarPickerModal(
    '🏠 Selecione o Domicílio',
    `<select class="input" id="sel-dom-quick">${opts}</select>`,
    function(modal) {
      const v = modal.querySelector('#sel-dom-quick').value;
      modal.remove();
      openNovaFamiliaNoDomicilio(v);
    }
  );
  _getOverlayRoot().appendChild(div);
}

function openNovaFamiliaNoDomicilio(domicilioId) {
  editFamiliaId = null;
  _famDomicilioId = domicilioId;
  const d = getDomicilio(domicilioId);
  $text('modal-familia-titulo', '👪 Nova Família');
  _atualizarEnderecoModal('modal-familia-endereco', d);
  _formClearFamilia();
  const btnExcluir = $id('btn-excluir-familia');
  if (btnExcluir) btnExcluir.style.display = 'none';
  openModal('modal-familia');
}

function editarFamilia(id) {
  const f = getFamilia(id);
  if (!f) return;
  editFamiliaId     = id;
  _famDomicilioId   = f.domicilioId;
  const d = getDomicilio(f.domicilioId);
  $text('modal-familia-titulo', '👪 Editar Família');
  _atualizarEnderecoModal('modal-familia-endereco', d);
  _formWriteFamilia(f);
  const btnExcluir = $id('btn-excluir-familia');
  if (btnExcluir) {
    btnExcluir.style.display = 'inline-flex';
    btnExcluir.dataset.famId = id;
  }
  openModal('modal-familia');
}

function excluirFamiliaDoModal() {
  const btn = $id('btn-excluir-familia');
  const id  = btn ? parseInt(btn.dataset.famId) : null;
  if (!id) return;
  closeModal('modal-familia');
  excluirFamilia(id);
}

function salvarFamilia() {
  const dados = _formReadFamilia();
  if (!_validarCampo('fam-data-inicio', 'Data de início é obrigatória')) return;

  let _pendingOpenIndFamId = null;   // será preenchido ao criar nova família

  if (editFamiliaId) {
    Object.assign(db.familiaById[editFamiliaId], dados);
    toast('Família atualizada!', 'success');
  } else {
    if (!_famDomicilioId) { toast('Domicílio não identificado', 'error'); return; }
    const d = getDomicilio(_famDomicilioId);
    if (!d)              { toast('Domicílio não encontrado',   'error'); return; }
    // Limite: 1 família por domicílio
    if ((d.familias || []).find(fId => getFamilia(fId))) {
      toast('⚠️ Este domicílio já possui uma família cadastrada. Edite a família existente ou crie um novo domicílio.', 'warn');
      return;
    }
    const famId    = nextId('familia');
    const novaFam  = {
      id: famId, domicilioId: _famDomicilioId,
      responsavelId: null, membros: 0, ultimaVisita: null,
      dataCadastro: hoje(), individuos: [], ...dados,
    };
    db.familiaById[famId] = novaFam;
    if (!d.familias) d.familias = [];
    if (!d.familias.includes(famId)) d.familias.push(famId);
    toast('Família cadastrada! Adicione os membros. 👪', 'success');
    _pendingOpenIndFamId = famId;   // agenda abertura do próximo modal
  }
  save();
  invalidateFamiliaSelects();
  closeModal('modal-familia');   // fecha ANTES de agendar o próximo modal
  DB.invalidate();
  if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
  editFamiliaId = null;
  // Abre modal de novo indivíduo somente após closeModal ter executado
  if (typeof _pendingOpenIndFamId !== 'undefined' && _pendingOpenIndFamId !== null) {
    const _fid = _pendingOpenIndFamId;
    _pendingOpenIndFamId = null;
    setTimeout(() => openNovoIndividuoNaFamilia(_fid), MODAL_CHAIN_DELAY_MS);
  }
}

function excluirFamilia(id) {
  customConfirm('Excluir esta família e seus membros?', function () {
    const f = getFamilia(id);
    Object.keys(db.individuoById || {}).forEach(k => {
      const ind = db.individuoById[k];
      if (ind && ind.familiaId === id) delete db.individuoById[k];
    });
    if (f && f.domicilioId) {
      const d = getDomicilio(f.domicilioId);
      if (d && d.familias) d.familias = d.familias.filter(fid => fid != id);
    }
    delete db.familiaById[Number(id)];
    save();
    DB.invalidate();
    invalidateFamiliaSelects();
    if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
    toast('Família excluída 🗑', 'warn');
  });
}


function toggleExamesFemininos() {
  const sexo = $val('ind-sexo');
  const wrap = $id('ind-exames-femininos');
  if (wrap) wrap.style.display = sexo === 'F' ? '' : 'none';
  if (sexo === 'F') verificarExamesAtrasados();
}

function verificarExamesAtrasados() {
  const nascBR = $val('ind-nasc');
  const nasc   = _brToISO(nascBR) || nascBR;
  const sexo   = $val('ind-sexo');
  if (sexo !== 'F') return;

  const hoje      = new Date();
  const idadeAnos = getIdadeEmAnos(nasc);

  _verificarPapanicolau(idadeAnos, hoje);
  _verificarMamografia(idadeAnos, hoje);
}

function _verificarPapanicolau(idadeAnos, hoje) {
  const papWrap   = $id('ind-papanicolau-wrap');  // container do campo (input + status)
  const papEl     = $id('ind-papanicolau');
  const papStatus = $id('ind-papanicolau-status');
  const papInfo   = $id('ind-papanicolau-info');
  if (!papStatus || !papInfo) return;

  // papData comes from the input which shows dd/mm/yyyy (BR format via _isoToBR)
  // Must convert to ISO before Date construction and formatData()
  const papDataBR  = papEl?.value || '';
  const papData    = papDataBR.includes('/') ? _brToISO(papDataBR) : papDataBR;  // ensure ISO
  const faixaOk = idadeAnos !== null && idadeAnos >= 25 && idadeAnos <= 64;

  // Oculta o campo inteiro quando fora da faixa elegível (25–64 anos)
  if (papWrap) papWrap.style.display = (!faixaOk && idadeAnos !== null) ? 'none' : '';

  if (!faixaOk && idadeAnos !== null) {
    papStatus.textContent      = '—';
    papStatus.style.background = 'var(--cinza-100)';
    papStatus.style.color      = 'var(--cinza-600)';
    papInfo.textContent        = `Rastreamento recomendado para mulheres de 25 a 64 anos (idade atual: ${Math.floor(idadeAnos)} anos).`;
    return;
  }
  if (!papData) {
    papStatus.textContent      = faixaOk ? '⚠️ Sem registro' : '—';
    papStatus.style.background = faixaOk ? 'var(--amarelo-bg)' : 'var(--cinza-100)';
    papStatus.style.color      = faixaOk ? 'var(--amarelo)'    : 'var(--cinza-600)';
    papInfo.textContent        = faixaOk ? 'Nenhuma data informada. Agendar exame.' : 'Preencha a data do último exame.';
    return;
  }
  const papDate    = new Date(papData + 'T00:00:00');
  if (isNaN(papDate)) { papInfo.textContent = 'Data inválida.'; return; }
  const vencDate   = new Date(papDate);
  vencDate.setFullYear(vencDate.getFullYear() + 1);
  const proximaStr = vencDate.toLocaleDateString('pt-BR');
  const atrasado   = hoje >= vencDate;

  if (atrasado) {
    papStatus.textContent      = '🔴 Atrasado';
    papStatus.style.background = 'var(--vermelho-bg)';
    papStatus.style.color      = 'var(--vermelho)';
    papInfo.textContent        = `Último exame: ${formatData(papData)}. Venceu em ${proximaStr}. Reagendar urgente!`;
  } else {
    papStatus.textContent      = '🟢 Em dia';
    papStatus.style.background = 'var(--verde-bg)';
    papStatus.style.color      = 'var(--verde)';
    papInfo.textContent        = `Último exame: ${formatData(papData)}. Próximo exame até: ${proximaStr}.`;
  }
}

function _verificarMamografia(idadeAnos, hoje) {
  const mamWrap       = $id('ind-mamografia-wrap');
  const mamStatusWrap = $id('ind-mamografia-status-wrap');
  const mamEl         = $id('ind-mamografia');
  const mamStatus     = $id('ind-mamografia-status');
  const mamInfo       = $id('ind-mamografia-info');

  const mostrar = idadeAnos === null || idadeAnos >= 40;
  if (mamWrap)       mamWrap.style.display       = mostrar ? '' : 'none';
  if (mamStatusWrap) mamStatusWrap.style.display = mostrar ? '' : 'none';
  if (!mamStatus || !mamInfo) return;

  const faixaOk = idadeAnos !== null && idadeAnos >= 40;
  // mamData comes from input in dd/mm/yyyy; convert to ISO for Date parsing
  const mamDataBR = mamEl?.value || '';
  const mamData   = mamDataBR.includes('/') ? _brToISO(mamDataBR) : mamDataBR;

  if (idadeAnos !== null && idadeAnos < 40) return; // oculto
  if (!mamData) {
    mamStatus.textContent      = faixaOk ? '⚠️ Sem registro' : '—';
    mamStatus.style.background = faixaOk ? 'var(--amarelo-bg)' : 'var(--cinza-100)';
    mamStatus.style.color      = faixaOk ? 'var(--amarelo)' : 'var(--cinza-600)';
    mamInfo.textContent        = faixaOk
      ? 'Nenhuma data informada. Agendar mamografia.'
      : `Recomendado a partir dos 55 anos${idadeAnos !== null ? ' (idade atual: ' + Math.floor(idadeAnos) + ' anos)' : ''}.`;
    return;
  }
  const mamDate  = new Date(mamData + 'T00:00:00');
  if (isNaN(mamDate)) { mamInfo.textContent = 'Data inválida.'; return; }
  const vencDate = new Date(mamDate);
  vencDate.setFullYear(vencDate.getFullYear() + 2);
  const proximaStr = vencDate.toLocaleDateString('pt-BR');
  const atrasadaMamo = faixaOk && hoje >= vencDate;

  if (atrasadaMamo) {
    mamStatus.textContent      = '🔴 Atrasado';
    mamStatus.style.background = 'var(--vermelho-bg)';
    mamStatus.style.color      = 'var(--vermelho)';
    mamInfo.textContent        = `Último exame: ${formatData(mamData)}. Venceu em ${proximaStr}. Reagendar urgente!`;
  } else if (faixaOk) {
    mamStatus.textContent      = '🟢 Em dia';
    mamStatus.style.background = 'var(--verde-bg)';
    mamStatus.style.color      = 'var(--verde)';
    mamInfo.textContent        = `Último exame: ${formatData(mamData)}. Próxima mamografia até: ${proximaStr}.`;
  } else {
    mamStatus.textContent      = 'Registrado';
    mamStatus.style.background = 'var(--cinza-100)';
    mamStatus.style.color      = 'var(--cinza-700)';
    mamInfo.textContent        = `Exame registrado em ${formatData(mamData)}. Rastreamento recomendado a partir dos 55 anos.`;
  }
}

function capturarGeolocalizacao() {
  const btn    = $id('btn-geoloc');
  const status = $id('geoloc-status');
  if (!navigator.geolocation) {
    if (status) {
      status.textContent  = '❌ Geolocalização não suportada neste dispositivo.';
      status.style.display = 'block';
      status.style.color   = 'var(--vermelho)';
    }
    return;
  }
  if (btn)    { btn.disabled = true; btn.textContent = '⏳ Obtendo localização...'; }
  if (status)   status.style.display = 'none';

  const _BTN_LABEL_PADRAO = '📍 Capturar Localização Atual do Dispositivo';

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude.toFixed(7);
      const lng = pos.coords.longitude.toFixed(7);
      const acc = Math.round(pos.coords.accuracy);
      $set('dom-latitude',  lat);
      $set('dom-longitude', lng);
      if (btn)    { btn.disabled = false; btn.textContent = _BTN_LABEL_PADRAO; }
      if (status) {
        status.textContent   = `✅ Localização capturada: ${lat}, ${lng} (precisão: ±${acc}m)`;
        status.style.color   = acc <= 30 ? 'var(--verde)' : acc <= 100 ? 'var(--amarelo)' : 'var(--vermelho)';
        status.style.display = 'block';
      }
    },
    err => {
      if (btn) { btn.disabled = false; btn.textContent = _BTN_LABEL_PADRAO; }
      const msgs = {
        1: 'Permissão negada. Autorize o acesso à localização nas configurações.',
        2: 'Localização indisponível no momento.',
        3: 'Tempo esgotado. Tente novamente.',
      };
      if (status) {
        status.textContent   = '❌ ' + (msgs[err.code] || 'Erro ao obter localização.');
        status.style.color   = 'var(--vermelho)';
        status.style.display = 'block';
      }
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

function openNovoIndividuoNaFamilia(famId) {
  ativarMascarasFormulario();
  editIndId = null;
  _indFamiliaId = famId;

  const f  = getFamilia(famId);
  const d  = f ? getDomicilio(f.domicilioId) : null;
  $text('modal-ind-titulo', 'Novo Indivíduo');
  _atualizarEnderecoModal('modal-ind-endereco', d);
  $text('modal-ind-idade', '');

  $hide('btn-excluir-individuo');
  _formClearIndividuo(famId);

  // Pré-selecionar vínculo: primeiro membro → Responsável
  const isPrimeiro = getIndividuos().filter(i => i.familiaId === famId).length === 0;
  $set('ind-vinculo', isPrimeiro ? 'Responsável' : 'Outro parente');
  // (ind-is-responsavel não existe no HTML — vínculo controlado pelo select acima)

  toggleExamesFemininos();
  renderMedicacoesList([]);
  renderVacinasList([]);
  const firstTab = document.querySelector('#modal-individuo .tab');
  if (firstTab) switchTab(firstTab, 'ind-tab-dados');
  openModal('modal-individuo');
}

function openNovoIndividuo() {
  const opts = getFamilias()
    .map(f => `<option value="${f.idFamilia}">${getFamiliaProntuario(f)} — ${getFamiliaLabel(f.idFamilia)}</option>`)
    .join('');
  if (!opts) { toast('Cadastre um domicílio primeiro!', 'error'); return; }

  const div = _criarPickerModal(
    '👤 Selecione a Família',
    `<select class="input" id="sel-familia-quick">${opts}</select>`,
    function(modal) {
      const v = parseInt(modal.querySelector('#sel-familia-quick').value);
      modal.remove();
      openNovoIndividuoNaFamilia(v);
    }
  );
  _getOverlayRoot().appendChild(div);
}

function editarIndividuo(id) {
  id = Number(id); // onclick passa string
  const i = getIndividuo(id);
  if (!i) return;
  editIndId = id;
  _indFamiliaId = i.familiaId;

  $text('modal-ind-titulo', i.nome || 'Editar Indivíduo');
  try {
    const ie = idadeExata(i.nasc);
    $text('modal-ind-idade', ie ? '🎂 ' + ie : '');
  } catch (e) {
    $text('modal-ind-idade', '');
  }
  const f = getFamilia(i.familiaId);
  const d = f ? getDomicilio(f.domicilioId) : null;
  _atualizarEnderecoModal('modal-ind-endereco', d);

  const btnExc = $id('btn-excluir-individuo');
  if (btnExc) { btnExc.style.display = 'inline-flex'; btnExc.dataset.indId = id; }

  _formWriteIndividuo(i);
  renderMedicacoesList(i.medicacoes || []);
  renderVacinasList(i.vacinas || [], i.nasc);

  const firstTab = document.querySelector('#modal-individuo .tab');
  if (firstTab) switchTab(firstTab, 'ind-tab-dados');

  // Abas de histórico: carregar só quando abertas
  const vc = $id('ind-visitas-content');
  if (vc) vc.replaceChildren(createEmptyState('', 'Abra a aba Histórico para carregar.'));
  const fc = $id('ind-fichas-content');
  if (fc) fc.replaceChildren(createEmptyState('', 'Abra a aba Histórico para carregar.'));

  carregarAnotacaoIndividuo(id);
  openModal('modal-individuo');
}

function toggleBolsaPesagem() {
  const checked = $check('ind-bolsa-familia');
  const wrap    = $id('ind-bolsa-pesagem-wrap');
  if (wrap) wrap.style.display = checked ? 'grid' : 'none';
}

function salvarIndividuo() {
  const nascVal  = $val('ind-nasc', '');
  const nascCheck = validarDataNasc(nascVal);
  if (!nascCheck.ok) { toast(nascCheck.msg, 'error'); return; }
  const nascISO = _brToISO(nascVal) || nascVal;

  const isResponsavel = $val('ind-vinculo') === 'Responsável';

  const obj = _formReadIndividuo(nascISO);
  if (!_validarCampo('ind-nome', 'Nome é obrigatório')) return;
  if (!obj.familiaId) { toast('Vincule a um domicílio', 'error'); return; }

  if (editIndId) {
    const existente = getIndividuo(editIndId);
    if (existente) db.individuoById[editIndId] = { ...existente, ...obj };
  } else {
    obj.idIndividuo  = nextId('individuo');
    obj.dataCadastro = hoje();
    db.individuoById[obj.idIndividuo] = obj;
  }

  const f = getFamilia(obj.familiaId);
  if (f) {
    const todosMembrosFam = getIndividuos().filter(i => i.familiaId === obj.familiaId);
    f.membros = todosMembrosFam.length;
    if (!f.individuos) f.individuos = [];
    const idSalvo = editIndId || obj.idIndividuo;
    if (!f.individuos.includes(idSalvo) && !f.individuos.includes(String(idSalvo))) {
      f.individuos.push(idSalvo);
    }
    if (isResponsavel) {
      f.responsavelId = idSalvo;
    } else if (!editIndId && todosMembrosFam.length === 1 && !f.responsavelId) {
      f.responsavelId = idSalvo;                              // primeiro membro: automático
    } else if (editIndId && f.responsavelId == editIndId && !isResponsavel) {
      f.responsavelId = null;                                 // removeu responsável
    }
  }

  save();
  DB.invalidate();
  invalidateFamiliaSelects();
  invalidarCachePendencias();
  if (window.membrosCache) window.membrosCache = {};
  closeModal('modal-individuo');

  // P2-3: render diferido da página ativa em vez de
  // renderFamilias() + renderIndividuos() simultâneos (100–400ms bloqueantes).
  // O toast aparece imediatamente; a lista atualiza no próximo frame ocioso.
  if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
  toast(
    editIndId
      ? `Indivíduo "${obj.nome}" atualizado com sucesso!`
      : `Indivíduo "${obj.nome}" cadastrado na família!`,
    'success'
  );
  editIndId = null;
}

function excluirIndividuoDoModal() {
  const btn = $id('btn-excluir-individuo');
  const id  = btn ? parseInt(btn.dataset.indId) : null;
  if (!id) return;
  closeModal('modal-individuo');
  excluirIndividuo(id);
}

function excluirIndividuo(id) {
  customConfirm('Excluir este membro?', function () {
    const i = getIndividuo(id);
    if (i) {
      delete db.individuoById[Number(i.idIndividuo)];
      const f = getFamilia(i.familiaId);
      if (f) {
        f.membros = getIndividuos().filter(x => x.familiaId === i.familiaId).length;
        if (f.individuos) {
          f.individuos = f.individuos.filter(x => x != i.idIndividuo && x != String(i.idIndividuo));
        }
        if (f.responsavelId == i.idIndividuo || f.responsavelId == String(i.idIndividuo)) {
          f.responsavelId = null;
        }
      }
    }
    save();
    invalidarCachePendencias();
    DB.invalidate();
    if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
  });
}


function renderIndVisitas() {
  const el = $id('ind-visitas-content');
  if (!el) return;
  const ind = editIndId ? getIndividuo(editIndId) : null;

  if (!ind) {
    el.replaceChildren(createEmptyState('', 'Salve o membro primeiro para ver o histórico.'));
    return;
  }

  const id      = ind.idIndividuo ?? editIndId;
  const famId   = ind.familiaId;
  const visitas = (db.visitas || []).filter(v =>
    v.membroId == id || v.membroId === String(id) ||
    v.individuoId == id || v.individuoId === String(id) ||
    (v.familiaId === famId && !v.membroId && !v.individuoId)
  ).sort((a, b) => (b.data || '').localeCompare(a.data || ''));

  if (!visitas.length) {
    el.replaceChildren(createEmptyState('🏠', 'Nenhuma visita registrada para este membro.'));
    return;
  }

  const wrapper = document.createElement('div');

  const count = document.createElement('div');
  count.className   = 'vhr-count';
  count.textContent = visitas.length + ' visita(s) encontrada(s)';
  wrapper.appendChild(count);

  const list = document.createElement('div');
  list.className = 'vhr-list';

  const frag = document.createDocumentFragment();
  visitas.forEach(function(v) {
    const row = cloneTemplate('tpl-visita-historico-row');
    row.querySelector('.vhr-data').textContent     = formatData(v.data);
    row.querySelector('.vhr-turno').textContent    = v.turno === 'manha' ? 'Manhã' : 'Tarde';
    row.querySelector('.vhr-tipo').textContent     = v.tipo || '–';
    row.querySelector('.vhr-desfecho').textContent = v.desfecho || '–';
    const obsEl = row.querySelector('.vhr-obs-wrap');
    if (v.obs) { obsEl.textContent = v.obs; obsEl.hidden = false; }
    frag.appendChild(row);
  });

  list.appendChild(frag);
  wrapper.appendChild(list);
  el.replaceChildren(wrapper);
}

function renderIndFichas() {
  const el = $id('ind-fichas-content');
  if (!el) return;
  const id = editIndId;

  if (!id) {
    el.replaceChildren(createEmptyState('', 'Salve o membro primeiro.'));
    return;
  }
  const ind = getIndividuo(id);
  if (!ind) {
    el.replaceChildren(createEmptyState('', 'Indivíduo não encontrado.'));
    return;
  }

  const fichas     = fichasAcompanhamento || {};
  const tiposLabel = {
    has: 'HAS — Hipertensão', dm: 'DM — Diabetes',
    gestante: 'Gestante / Pré-natal', consumoAlimentar: 'Consumo Alimentar', hans: 'Hanseníase',
  };

  const blocos = [];
  Object.entries(tiposLabel).forEach(function([tipo, label]) {
    const ficha  = (fichas[tipo] || {})[id] || (fichas[tipo] || {})[String(id)];
    if (!ficha || !Object.keys(ficha).length) return;
    const campos = Object.entries(ficha).filter(function([, v]) {
      return v !== '' && v !== null && v !== undefined && v !== false;
    });

    const bloco = cloneTemplate('tpl-ficha-acomp-bloco');
    bloco.querySelector('.fab-header').textContent = '📋 ' + label;

    const camposEl = bloco.querySelector('.fab-campos');
    const frag     = document.createDocumentFragment();
    campos.slice(0, 16).forEach(function([k, v]) {
      const campo = cloneTemplate('tpl-ficha-campo');
      campo.querySelector('.fab-campo-key').textContent = k + ':';
      campo.querySelector('.fab-campo-val').textContent = v === true ? '✓' : v;
      frag.appendChild(campo);
    });
    if (campos.length > 16) {
      const mais = document.createElement('div');
      mais.className   = 'fab-mais';
      mais.textContent = '…e mais ' + (campos.length - 16) + ' campos';
      frag.appendChild(mais);
    }
    camposEl.appendChild(frag);
    blocos.push(bloco);
  });

  if (!blocos.length) {
    el.replaceChildren(createEmptyState('📋', 'Nenhuma ficha de acompanhamento preenchida para este membro.'));
    return;
  }

  const scroll = document.createElement('div');
  scroll.className = 'fab-scroll';
  blocos.forEach(function(b) { scroll.appendChild(b); });
  el.replaceChildren(scroll);
}

function renderIndHistorico() {
  renderIndVisitas();
  renderIndFichas();
}


function _getAnotacoesKey(id) { return 'acs_anotacoes_ind_' + id; }

function carregarAnotacaoIndividuo(id) {
  const el   = $id('ind-anotacoes');
  const hist = $id('ind-anotacao-historico');
  if (!el) return;

  let data = { atual: '', historico: [] };
  try {
    const saved = DB.getRawLocal(_getAnotacoesKey(id));
    if (saved) data = JSON.parse(saved);
  } catch (e) { console.warn('[ACS] Erro ao carregar anotação do indivíduo:', e); }

  el.value          = data.atual || '';
  el.dataset.indId  = id;

  if (hist) {
    if (!data.historico?.length) { hist.innerHTML = ''; return; }

    const titulo = document.createElement('div');
    titulo.className   = 'u-section-label';
    titulo.textContent = '📜 Histórico de versões anteriores';

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;gap:6px;max-height:160px;overflow-y:auto';

    const frag = document.createDocumentFragment();
    data.historico.slice().reverse().forEach(function(h) {
      const item = document.createElement('div');
      item.className = 'anotacao-historico-item';
      const dataDiv = document.createElement('div');
      dataDiv.className   = 'anotacao-historico-data';
      dataDiv.textContent = h.data;
      const textoDiv = document.createElement('div');
      textoDiv.className   = 'anotacao-historico-texto';
      textoDiv.textContent = h.texto;
      item.appendChild(dataDiv);
      item.appendChild(textoDiv);
      frag.appendChild(item);
    });

    grid.appendChild(frag);
    hist.replaceChildren(titulo, grid);
  }
}

function salvarAnotacaoIndividuo() {
  const el = $id('ind-anotacoes');
  if (!el) return;
  const id = el.dataset.indId || editIndId;
  if (!id) { toast('Salve o membro primeiro', 'error'); return; }

  const key = _getAnotacoesKey(id);
  try {
    const saved = DB.getRawLocal(key);
    const data  = saved ? JSON.parse(saved) : { atual: '', historico: [] };
    if (data.atual && data.atual.trim() && data.atual !== el.value) {
      data.historico.push({ data: new Date().toLocaleString('pt-BR'), texto: data.atual });
      if (data.historico.length > 20) data.historico = data.historico.slice(-20);
    }
    data.atual = el.value;
    DB.setLocal(key, data);
  } catch (e) {
    console.warn('[ACS] Erro ao salvar anotação:', e);
    toast('Erro ao salvar anotação', 'error');
    return;
  }
  carregarAnotacaoIndividuo(id);
  toast('Anotação salva!', 'success');
}


// ── Aliases de vacinas (mantém compatibilidade com chamadas existentes no HTML) ─
function renderVacinasList(vacinasExist, nasc) { VacinaModule.render(vacinasExist, nasc); }
function toggleDoseVacina(regIdx, doseIdx)      { VacinaModule.toggleDose(regIdx, doseIdx); }
function atualizarVacinasPorIdade() {
  const v = $val('ind-nasc');
  VacinaModule.render(VacinaModule.coletar(), _brToISO(v) || v);
}
function coletarVacinas() { return VacinaModule.coletar(); }

function openNovaVisita() {
  const familias = getFamilias();
  if (!familias || familias.length === 0) {
    toast('Cadastre um domicílio primeiro!', 'warning');
    return;
  }
  populateFamiliaSelects();
  _formClearVisita();
  const familiaSelect = $id('vis-familia');
  if (familiaSelect && familiaSelect.options.length > 1) familiaSelect.selectedIndex = 1;
  const radioFamilia = document.querySelector('input[name="vis-escopo"][value="familia"]');
  if (radioFamilia) radioFamilia.checked = true;
  toggleVisitaEscopo();
  renderMembrosList();
  openModal('modal-visita');
}

function openNovaVisitaParaFamilia(famId) {
  openNovaVisita();
  if (!famId) return;
  populateFamiliaSelects();
  const familiaSelect = $id('vis-familia');
  if (familiaSelect) {
    familiaSelect.value = famId;
    if (!familiaSelect.value) familiaSelect.selectedIndex = 1;
  }
  renderMembrosList();
}

function toggleVisitaEscopo() {
  const escopo = document.querySelector('input[name="vis-escopo"]:checked')?.value;
  const wrap   = $id('vis-membro-wrap');
  if (wrap) wrap.style.display = escopo === 'individuo' ? '' : 'none';
}

function renderMembrosList() {
  const famId = parseInt($val('vis-familia'));
  const sel   = $id('vis-membro');
  if (!sel) return;

  sel.innerHTML = '';

  if (!famId || isNaN(famId)) {
    const opt = document.createElement('option');
    opt.value = ''; opt.textContent = 'Selecione um domicílio primeiro';
    sel.appendChild(opt);
    return;
  }

  const membros = getIndividuos().filter(i => i.familiaId === famId);
  const frag    = document.createDocumentFragment();

  if (membros.length) {
    membros.forEach(function(m) {
      const opt = document.createElement('option');
      opt.value       = m.idIndividuo;
      opt.textContent = m.nome + ' (' + calcIdade(m.nasc).texto + ')';
      frag.appendChild(opt);
    });
  } else {
    const opt = document.createElement('option');
    opt.value = ''; opt.textContent = 'Nenhum indivíduo cadastrado neste domicílio';
    frag.appendChild(opt);
  }

  sel.appendChild(frag);
}

function registrarVisitaRapida(famId) {
  const familia = getFamilia(famId);
  if (!familia) { toast('Família não encontrada!', 'error'); return; }
  populateFamiliaSelects();
  _formClearVisita();
  $set('vis-familia', famId);
  const radioFamilia = document.querySelector('input[name="vis-escopo"][value="familia"]');
  if (radioFamilia) radioFamilia.checked = true;
  toggleVisitaEscopo();
  renderMembrosList();
  $text('modal-vis-titulo', '🏠 Registrar Visita Familiar');
  openModal('modal-visita');
}

function registrarVisitaIndividuoRapida(famId, membroIdPreSel) {
  const familia = getFamilia(famId);
  if (!familia) { toast('Família não encontrada!', 'error'); return; }
  populateFamiliaSelects();
  _formClearVisita();
  $set('vis-familia', famId);
  const radioInd = document.querySelector('input[name="vis-escopo"][value="individuo"]');
  if (radioInd) radioInd.checked = true;
  toggleVisitaEscopo();
  renderMembrosList();
  if (membroIdPreSel) {
    setTimeout(() => $set('vis-membro', membroIdPreSel), 50);
  }
  $text('modal-vis-titulo', '👤 Registrar Visita Individual');
  openModal('modal-visita');
}

function salvarVisita() {
  const familiaSelect = $id('vis-familia');
  if (!familiaSelect || familiaSelect.options.length <= 1) populateFamiliaSelects();

  const v = _formReadVisita();
  if (!v.data)                { toast('Data da visita inválida (use dd/mm/aaaa)', 'error'); return; }
  if (!v.famId || isNaN(v.famId)) { toast('Selecione um domicílio válido', 'error'); return; }
  if (v.escopo === 'individuo' && (!v.membroId || isNaN(v.membroId))) {
    toast('Selecione um membro para a visita individual', 'error'); return;
  }

  db.visitas.push({
    id: nextId('visita'), data: v.data, familiaId: v.famId,
    turno: v.turno, escopo: v.escopo, membroId: v.membroId,
    tipo: v.tipo, desfecho: v.desfecho, vacina: v.vacina,
    encam: v.encam, obs: v.obs,
    cbo: db.config.cbo || '515105', dataRegistro: hoje(),
  });

  const familia = getFamilia(v.famId);
  if (familia && (!familia.ultimaVisita || v.data > familia.ultimaVisita)) {
    familia.ultimaVisita = v.data;
  }
  if (v.pendTxt) {
    db.pendencias.push({
      id: nextId('pendencia'), titulo: v.pendTxt, tipo: 'visita',
      prioridade: 'media', familiaId: v.famId, prazo: v.data,
      obs: 'Gerada durante visita domiciliar', done: false, criado: hoje(),
    });
  }
  save();
  closeModal('modal-visita');
  DB.invalidate();
  if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
  updateBadge();
  toast('Visita registrada com sucesso! 🏠', 'success');
}


function openNovaPendencia() {
  populateFamiliaSelects();
  $set('pend-titulo', '');
  $set('pend-prazo',  '');
  const pendFamilia = $id('pend-familia');
  if (pendFamilia) pendFamilia.selectedIndex = 0;
  openModal('modal-pendencia');
}

function salvarPendencia() {
  const dados = _formReadPendencia();
  if (!dados.titulo) { toast('Descreva a pendência', 'error'); return; }
  db.pendencias.push({ id: nextId('pendencia'), done: false, criado: hoje(), ...dados });
  save();
  closeModal('modal-pendencia');
  // Render adiado — evita freeze no Android
  DB.invalidate();
  if (typeof _safeRenderAtual === 'function') _safeRenderAtual();
  updateBadge();
  toast('Pendência criada!', 'success');
}

// ◆ PRIVADOS — Utilidades internas do módulo

/**
 * Cria um modal de seleção rápida (picker genérico).
 * @param {string}   titulo    — título do modal
 * @param {string}   bodyHtml  — HTML do corpo (ex: um <select> gerado internamente)
 * @param {Function} onConfirm — callback(modalEl) chamado ao confirmar; recebe o elemento modal
 *                               para que o callback possa lê-lo e removê-lo
 */
function _criarPickerModal(titulo, bodyHtml, onConfirm) {
  const div = cloneTemplate('tpl-picker-modal');
  div.style.display = 'flex';
  div.addEventListener('click', function(e) { if (e.target === div) div.remove(); });

  div.querySelector('.pm-titulo').textContent  = titulo;
  div.querySelector('.pm-body').innerHTML      = bodyHtml;  // bodyHtml é gerado internamente (selects/inputs)
  div.querySelector('.pm-fechar').addEventListener('click',    function() { div.remove(); });
  div.querySelector('.pm-cancelar').addEventListener('click',  function() { div.remove(); });
  div.querySelector('.pm-confirmar').addEventListener('click', function() {
    if (typeof onConfirm === 'function') {
      try { onConfirm(div); } catch(e) { console.error('[picker] onConfirm erro:', e); }
    }
  });

  return div;
}

/**
 * Atualiza o campo de endereço nos modais de família/indivíduo.
 * @param {string} elId — ID do elemento de texto
 * @param {Object|null} d — objeto domicílio
 */
function _atualizarEnderecoModal(elId, d) {
  const el = $id(elId);
  if (!el || !d) return;
  const partes = [d.logradouro, d.numero ? 'nº ' + d.numero : '', d.bairro].filter(Boolean);
  el.textContent = partes.length ? '📍 ' + partes.join(', ') : '';
}
