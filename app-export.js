// ACS Neto — app-export.js
// $id disponível globalmente via app-utils.js

// Exportação CSV, backup completo e restauração de dados
// Depende de: app-core.js, app-ui.js


// Exportação CSV: famílias, domicílios, indivíduos, visitas, risco, cr
// ✎ Alterar apenas se mudar colunas ou formato de exportação

function _exportFamiliasCsv(bom, q) {
  const h = 'id_familia,id_domicilio,Prontuario,Responsavel,CPF,CNS,TipoLogradouro,Logradouro,Numero,Bairro,Cidade,UF,CEP,Membros,Risco,UltimaVisita,AguaAbastecida,EscoamentoSanitario,DestinoLixo,SituacaoMoradia,TipoDomicilio,Observacoes\n';
  const rows = getFamilias().map(f => {
    const resp = f.responsavelId ? (getIndividuo(f.responsavelId)) : null;
    const d = getDomicilio(f.domicilioId);
    return [fmtId(f.idFamilia), fmtId(f.domicilioId), q(getFamiliaProntuario(f)), q(getFamiliaLabel(f.idFamilia)),
      q(resp?.cpf), q(resp?.cns), q(d?.tipoLogradouro||d?.fkLogradouro||'Rua'), q(d?.logradouro), q(d?.numero),
      q(d?.bairro), q(db.config?.municipio||'Maracanaú'), q('Ceará'), q(d?.cep),
      f.membros, q(f.risco), q(f.ultimaVisita),
      q(d?.agua), q(d?.esgoto),
      q(d?.lixo), q(d?.situacaoMoradia),
      q(d?.tipoDom), q(f.obs)].join(',');
  });
  return { content: bom + h + rows.join('\n'), filename: 'familias_acs.csv' };
}

function _exportDomiciliosCsv(bom, q) {
  const h = 'id_domicilio,TipoLogradouro,Logradouro,Numero,Complemento,Bairro,Cidade,UF,CEP,Referencia,Latitude,Longitude,CodMicroarea,TipoAcesso,TipoImovel,TipoDomicilio,SituacaoMoradia,MaterialConstrucao,NumComodos,AguaAbastecida,AguaConsumida,EscoamentoSanitario,DestinoLixo,TipoEnergia,PossuiAnimais,NumAnimais,Cachorros,Gatos,Passaros,Galinhas,OutrosAnimais,DataCadastro\n';
  const rows = getDomicilios().map(d => [
    fmtId(d.idDomicilio), q(d.tipoLogradouro||d.fkLogradouro||'Rua'), q(d.logradouro), q(d.numero), q(d.complemento),
    q(d.bairro), q(db.config?.municipio||'Maracanaú'), q('Ceará'), q(d.cep),
    q(d.referencia), q(d.latitude), q(d.longitude), q(d.codMicroarea),
    q(d.tipoAcesso||d.fkTipoAcessoDomicilio), q(d.tipoImovel), q(d.tipoDom),
    q(d.situacaoMoradia), q(d.material), d.numeroComodos||0,
    q(d.agua), q(d.aguaConsumida||d.fkAguaConsumida),
    q(d.esgoto), q(d.lixo),
    q(d.energia),
    q(d.possuiAnimais||'Não'), d.numAnimais||d.numeroDeAnimais||0,
    d.cachorros||0, d.gatos||0, d.passaros||0, d.galinha||0, d.outrosAnimais||0, q(d.dataCadastro)
  ].join(','));
  return { content: bom + h + rows.join('\n'), filename: 'domicilios_acs.csv' };
}

function _exportIndividuosCsv(bom, q) {
  const h = 'id_individuo,id_familia,id_domicilio,Nome,NomeSocial,Mae,Pai,CNS,CPF,Nascimento,Sexo,Raca,Escolaridade,Vinculo,HAS,DM,Gestante,Deficiencia,SaudeMental,TB,Cancer,Acamado,DataCadastro\n';
  const rows = getIndividuos().map(i => {
    const f = getFamilia(i.familiaId);
    return [fmtId(i.idIndividuo), fmtId(i.familiaId), fmtId(f?.domicilioId),
      q(i.nome), q(i.nomeSocial), q(i.mae), q(i.pai), q(i.cns), q(i.cpf),
      q(i.nasc), q(i.sexo), q(i.raca), q(i.escolaridade), q(i.vinculoResponsavel),
      q(i.has), q(i.dm), q(i.gestante), q(i.deficiencia), q(i.mental), q(i.tb),
      q(i.cancer||'nao'), q(i.acamado||'nao'), q(i.dataCadastro)].join(',');
  });
  return { content: bom + h + rows.join('\n'), filename: 'individuos_acs.csv' };
}

function _exportVisitasCsv(bom, q) {
  const h = 'id_visita,id_familia,id_domicilio,Data,Turno,Escopo,Tipo,Desfecho,Vacina,Encaminhamento,CNS_ACS,CBO,Observacoes\n';
  const rows = db.visitas.map(v => {
    const f = getFamilia(v.familiaId);
    return [fmtId(v.id), fmtId(v.familiaId), fmtId(f?.domicilioId),
      q(v.data), q(v.turno), q(v.escopo), q(v.tipo), q(v.desfecho),
      q(v.vacina), q(v.encam), q(db.config.cns), q(db.config.cbo||'515105'), q(v.obs)].join(',');
  });
  return { content: bom + h + rows.join('\n'), filename: 'visitas_acs.csv' };
}

function _exportRiscoCsv(bom, q) {
  const h = 'id_familia,id_domicilio,Prontuario,Responsavel,Risco,FatoresRisco,UltimaAvaliacao\n';
  const rows = getFamilias().map(f => {
    const inds = getIndividuos().filter(i => i.familiaId === f.idFamilia);
    const fat  = [];
    if (inds.some(i=>i.has==='sim'))       fat.push('HAS');
    if (inds.some(i=>i.dm==='sim'))        fat.push('DM');
    if (inds.some(i=>i.gestante==='sim'))  fat.push('Gestante');
    if (f.vulnerabilidade==='sim')         fat.push('Vulnerabilidade');
    return [fmtId(f.idFamilia), fmtId(f.domicilioId), q(getFamiliaProntuario(f)), q(getFamiliaLabel(f.idFamilia)),
      q(f.risco), q(fat.join(';')), q(hoje())].join(',');
  });
  return { content: bom + h + rows.join('\n'), filename: 'estratificacao_risco.csv' };
}

function _exportCronicosCsv(bom, q) {
  const h    = 'id_individuo,id_familia,Nome,CNS,CPF,Nascimento,Sexo,HAS,DM,Gestante,SaudeMental,TB,Deficiencia,Cancer,Acamado,Familia\n';
  const cron = getIndividuos().filter(i => i.has==='sim'||i.dm==='sim'||i.gestante==='sim'||i.mental==='sim'||i.tb!=='nao'||i.cancer==='sim'||i.acamado==='sim');
  const rows = cron.map(i => {
    const f = getFamilia(i.familiaId);
    return [fmtId(i.idIndividuo), fmtId(i.familiaId), q(i.nome), q(i.cns), q(i.cpf),
      q(i.nasc), q(i.sexo), q(i.has), q(i.dm), q(i.gestante),
      q(i.mental), q(i.tb), q(i.deficiencia), q(i.cancer||'nao'), q(i.acamado||'nao'),
      q(f?getFamiliaLabel(f.idFamilia):'')].join(',');
  });
  return { content: bom + h + rows.join('\n'), filename: 'condicoes_cronicas.csv' };
}

function _exportPendenciasCsv(bom, q) {
  const h    = 'id_pendencia,id_familia,Titulo,Tipo,Prioridade,Responsavel,Prazo,Status,Observacoes\n';
  const rows = db.pendencias.map(p =>
    [fmtId(p.id), fmtId(p.familiaId), q(p.titulo), q(p.tipo), q(p.prioridade),
     q(getFamiliaLabel(p.familiaId)), q(p.prazo), q(p.done?'Resolvida':'Aberta'), q(p.obs)].join(',')
  );
  return { content: bom + h + rows.join('\n'), filename: 'pendencias_acs.csv' };
}

function _exportProducaoCsv(bom, q) {
  const mesAtual = new Date().toISOString().slice(0,7);
  const h        = 'Competencia,ACS,CBO,CNS_ACS,CNES,Microarea,TotalVisitas,Cadastros,Encaminhamentos,Alto_Risco,Medio_Risco,Baixo_Risco\n';
  const visMes   = db.visitas.filter(v => v.data?.startsWith(mesAtual));
  const fams     = getFamilias();
  const row      = [q(mesAtual), q(db.config.nome), q(db.config.cbo||'515105'), q(db.config.cns), q(db.config.cnes), q(db.config.microarea),
    visMes.length, fams.filter(f=>f.dataCadastro?.startsWith(mesAtual)).length,
    visMes.filter(v=>v.encam==='sim').length,
    fams.filter(f=>f.risco==='alto').length, fams.filter(f=>f.risco==='medio').length, fams.filter(f=>f.risco==='baixo').length
  ].join(',');
  return { content: bom + h + row, filename: 'producao_mensal_acs.csv' };
}

function exportarDados(tipo) {
  const bom  = '\uFEFF';
  const q    = v => `"${String(v||'').replace(/"/g,'""')}"`;
  const mime = tipo === 'json-backup' ? 'application/json' : 'text/csv;charset=utf-8;';

  const generators = {
    'familias-csv':    () => _exportFamiliasCsv(bom, q),
    'domicilios-csv':  () => _exportDomiciliosCsv(bom, q),
    'individuos-csv':  () => _exportIndividuosCsv(bom, q),
    'visitas-csv':     () => _exportVisitasCsv(bom, q),
    'risco-csv':       () => _exportRiscoCsv(bom, q),
    'cronicos-csv':    () => _exportCronicosCsv(bom, q),
    'pendencias-csv':  () => _exportPendenciasCsv(bom, q),
    'producao-csv':    () => _exportProducaoCsv(bom, q),
    'json-backup':     () => ({ content: JSON.stringify(db, null, 2), filename: `backup_acs_${hoje()}.json` }),
  };

  const gen = generators[tipo];
  if (!gen) { console.warn('[ACS] exportarDados: tipo desconhecido:', tipo); return; }

  const { content, filename } = gen();
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  toast(`Exportado: ${filename}`, 'success');
}

// Backup completo, restauração, histórico, template JSON, importação
// ✎ Alterar apenas se mudar formato de backup/restore
// SISTEMA DE BACKUP COMPLETO

// Chave do histórico de backups

// Monta o objeto completo de backup incluindo todos os dados do sistema
function montarBackupCompleto() {
  // ── Coleta anotações individuais do localStorage ──────────────────────────
  const anotacoes = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('acs_anotacoes_ind_')) {
        const raw = localStorage.getItem(key);
        if (raw) anotacoes[key] = raw;
      }
    }
  } catch(e) { /* localStorage bloqueado — continua sem anotações */ }

  // ── Checksum SHA-256 simples para integridade (calculado no export) ──
  return {
    _meta: {
      versao: 'acs_backup_v3',
      geradoEm: new Date().toISOString(),
      sistema: 'ACS Neto — Sistema do Agente Comunitário',
      acs: db.config?.nome || '',
      microarea: db.config?.microarea || '',
      esf: db.config?.esf || '',
      totalDomicilios: Object.keys(db.domicilioById || {}).length,
      totalFamilias: Object.keys(db.familiaById || {}).length,
      totalIndividuos: Object.keys(db.individuoById || {}).length,
      totalVisitas: (db.visitas || []).length,
      totalPendencias: (db.pendencias || []).length,
      totalAgenda: (db.agenda || []).length,
    },
    config:        db.config        || {},
    domicilioById: db.domicilioById || {},
    familiaById:   db.familiaById   || {},
    individuoById: db.individuoById || {},
    visitas:       db.visitas       || [],
    agenda:        db.agenda        || [],
    pendencias:    db.pendencias    || [],
    metas:         db.metas         || {},
    metasAjustes:   db.metasAjustes   || {},
    metasExtras:    db.metasExtras    || {},
    metasRealizadas:db.metasRealizadas|| {},
    _nextId:       db._nextId       || {},
    fichas:        db.fichas        || { atual:{}, historico:{} },
    anotacoes,   // ← anotações individuais (localStorage acs_anotacoes_ind_*)
  };
}

// Gera e baixa o backup completo em JSON
function gerarBackupCompleto() {
  const backup = montarBackupCompleto();
  // Checksum de integridade — usa chaves ordenadas para hash estável
  // (re-serializar o mesmo objeto sempre produz o mesmo hash)
  const _sortedReplacer = (_, val) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.keys(val).sort().reduce((o, k) => { o[k] = val[k]; return o; }, {})
      : val;
  const _payload = JSON.stringify(backup, _sortedReplacer);
  let _h = 0;
  for (let i = 0; i < _payload.length; i++) { _h = (Math.imul(31, _h) + _payload.charCodeAt(i)) | 0; }
  backup._meta.checksum = (_h >>> 0).toString(16).padStart(8, '0');
  backup._meta.totalBytes = _payload.length;
  const json = JSON.stringify(backup, null, 2);
  const filename = `backup_acs_${db.config?.microarea || 'micro'}_${hoje()}.json`;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);

  // Registrar no histórico
  try {
    const hist = DB.getLocal(DB.LS.backupHistory, []);
    hist.unshift({
      data: new Date().toISOString(),
      filename,
      totalFamilias:   backup._meta.totalFamilias,
      totalIndividuos: backup._meta.totalIndividuos,
      totalVisitas:    backup._meta.totalVisitas,
      tamanhoKb: Math.round(json.length / 1024),
    });
    DB.setLocal(DB.LS.backupHistory, hist.slice(0, 20));
  } catch(e) { console.warn('[ACS] Erro ao registrar histórico de backup:', e); }

  // Patch 02: remove banner de lembrete + limpa dismiss para recomeçar contagem
  const reminderBanner = document.getElementById('dash-backup-reminder');
  if (reminderBanner) reminderBanner.remove();
  DB.removeLocal(DB.LS.backupDismiss);

  toast(`Backup gerado: ${filename}`, 'success');
  renderHistoricoBackups();
  renderBackupStats();
}

// Renderiza os contadores de stats na página
let _lastSavedBytes = 0; // sincronizado via window._lastSavedBytes pelo app-core.js

function getStorageUsageKB() {
  // Preferir o tamanho cacheado do payload salvo (IDB ou localStorage)
  const saved = window._lastSavedBytes || _lastSavedBytes;
  if (saved > 0) return Math.round(saved / 1024);
  // Fallback: medir localStorage (pode ser 0 se já migrou para IDB)
  let total = 0;
  try {
    for (let k in localStorage) {
      if (localStorage.hasOwnProperty(k)) {
        total += new Blob([localStorage[k]]).size + new Blob([k]).size;
      }
    }
  } catch(e) {}
  return Math.round(total / 1024);
}
function getStoragePct() {
  // Com IDB não há limite fixo de 5 MB — retorna 0 para suprimir alertas de quota
  if (window._lastSavedBytes > 0) return 0;
  return Math.min(100, Math.round(getStorageUsageKB() / 5120 * 100));
}

function renderBackupStats() {
  const el = $id('backup-stats');
  if (!el) return;
  // Mirror element in page-configuracoes (different ID to avoid duplicate)
  const elCfg = $id('backup-stats-cfg');
  const stats = [
    { label: 'Domicílios',  value: Object.keys(db.domicilioById || {}).length, color: 'var(--azul)' },
    { label: 'Famílias',    value: Object.keys(db.familiaById   || {}).length, color: 'var(--verde)' },
    { label: 'Indivíduos',  value: Object.keys(db.individuoById || {}).length, color: 'var(--laranja)' },
    { label: 'Visitas',     value: (db.visitas    || []).length, color: 'var(--cinza-700)' },
    { label: 'Pendências',  value: (db.pendencias || []).length, color: 'var(--vermelho)' },
    { label: 'Agenda',      value: (db.agenda     || []).length, color: 'var(--amarelo)' },
  ];
  const usedKB = getStorageUsageKB();
  const pct = getStoragePct();
  const isAlert  = pct >= 90;
  const isWarn   = pct >= 80;
  const barColor = isAlert ? 'var(--vermelho)' : isWarn ? 'var(--laranja-cl)' : 'var(--verde)';
  const bgColor  = isAlert ? 'var(--rose-bg)'  : isWarn ? 'var(--orange-bg)'  : 'var(--verde-fraco)';
  el.innerHTML = stats.map(s => `
    <div style="text-align:center;padding:8px;background:var(--surface);border-radius:var(--radius-sm)">
      <div style="font-size:var(--text-lg);font-weight:700;color:${s.color}">${s.value}</div>
      <div style="font-size:var(--text-2xs);color:var(--cinza-500);margin-top:2px">${s.label}</div>
    </div>`).join('') + `
    <div style="grid-column:1/-1;padding:10px 12px;margin-top:4px;background:${bgColor};border-radius:8px;border:1px solid ${barColor}33">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:var(--text-xs);font-weight:600;color:var(--slate-600)">💾 Armazenamento local</span>
        <span style="font-size:var(--text-xs);font-weight:700;color:${barColor}">${usedKB} KB / 5120 KB · ${pct}%</span>
      </div>
      <div style="background:var(--cinza-200);border-radius:99px;height:8px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${barColor};border-radius:99px;transition:width .4s cubic-bezier(.4,0,.2,1)"></div>
      </div>
      ${isWarn ? `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;gap:8px">
          <span style="font-size:var(--text-xs);color:${barColor};font-weight:600">
            ${isAlert ? '⛔ Armazenamento crítico — faça backup imediatamente!' : '⚠️ Armazenamento quase cheio — faça backup em breve.'}
          </span>
          <button onclick="gerarBackupCompleto()"
            style="flex-shrink:0;padding:5px 12px;font-size:var(--text-xs);font-weight:700;background:${barColor};color:#fff;border:none;border-radius:6px;cursor:pointer">
            Backup agora
          </button>
        </div>` : ''}
    </div>`;
  if (elCfg) elCfg.innerHTML = el.innerHTML;
}

// Renderiza o histórico de backups
function renderHistoricoBackups() {
  const el = $id('historico-backups');
  if (!el) return;
  const elCfg = $id('historico-backups-cfg');
  // FIX: usa DB.getLocal para consistência com gerarBackupCompleto (evita divergência de chave)
  const hist = DB.getLocal(DB.LS.backupHistory, []);
  if (hist.length === 0) {
    el.innerHTML = '<p style="font-size:var(--text-sm);color:var(--cinza-400);padding:8px 0">Nenhum backup realizado ainda.</p>';
    if (elCfg) elCfg.innerHTML = el.innerHTML;
    return;
  }
  el.innerHTML = hist.map((h, i) => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--cinza-100);border-radius:var(--radius-sm);margin-bottom:6px">
      <div style="font-size:var(--text-lg)">💾</div>
      <div style="flex:1">
        <div style="font-size:var(--text-sm);font-weight:600;color:var(--cinza-800)">${esc(h.filename)}</div>
        <div style="font-size:var(--text-xs);color:var(--cinza-500);margin-top:2px">
          ${new Date(h.data).toLocaleString('pt-BR')} · ${h.totalFamilias} famílias · ${h.totalIndividuos} indivíduos · ${h.totalVisitas} visitas · ${h.tamanhoKb} KB
        </div>
      </div>
      <span style="font-size:var(--text-2xs);background:var(--verde-fraco);color:var(--verde);padding:2px 8px;border-radius:10px;font-weight:600">${i === 0 ? 'Mais recente' : ''}</span>
    </div>`).join('');
  if (elCfg) elCfg.innerHTML = el.innerHTML;
}

// Limpa o histórico de backups
function limparHistoricoBackups() {
  customConfirm('Limpar o histórico de backups?', () => {
    // FIX: usa DB.setLocal para consistência com gerarBackupCompleto
    DB.setLocal(DB.LS.backupHistory, []);
    renderHistoricoBackups();
    toast('Histórico limpo', 'success');
  });
}

// Variável temporária para o dado do backup em processo de restauração

// Abre o arquivo JSON e mostra o modal de confirmação antes de restaurar
function importarBackupCompleto(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';

  const reader = new FileReader();
  reader.onload = e => {
    try {
      let data = JSON.parse(e.target.result);
      // Aceita formato aninhado externo {domicilios:{}} — converte para flat na restauração
      if (data.domicilios) {
        data = migrarAninhadoParaFlat(data);
      } else if (!data.familiaById && !data.domicilioById && !data.individuoById) {
        toast('Arquivo inválido — estrutura de backup não reconhecida', 'error');
        return;
      }
      _backupParaRestaurar = data;

      // Preencher preview
      const meta = data._meta || {};
      const preview = $id('restore-preview');
      if (preview) {
        const geradoEm = meta.geradoEm ? new Date(meta.geradoEm).toLocaleString('pt-BR') : '–';
        preview.innerHTML = `
          <div style="font-weight:600;margin-bottom:8px">📋 Dados do arquivo: <span style="color:var(--azul)">${esc(file.name)}</span></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
            <div>📅 Gerado em: <strong>${geradoEm}</strong></div>
            <div>👤 ACS: <strong>${esc(meta.acs || '–')}</strong></div>
            <div>🏘 Microárea: <strong>${esc(meta.microarea || '–')}</strong></div>
            <div>🏥 ESF: <strong>${esc(meta.esf || '–')}</strong></div>
            <div>🏠 Domicílios: <strong>${Object.keys(data.domicilioById||{}).length}</strong></div>
            <div>👨‍👩‍👧 Famílias: <strong>${Object.keys(data.familiaById||{}).length}</strong></div>
            <div>👤 Indivíduos: <strong>${Object.keys(data.individuoById||{}).length}</strong></div>
            <div>🚶 Visitas: <strong>${meta.totalVisitas ?? (data.visitas||[]).length}</strong></div>
          </div>`;
      }

      openModal('modal-confirm-restore');
    } catch(err) {
      console.error(err);
      toast('Erro ao ler arquivo — JSON inválido ou corrompido', 'error');
    }
  };
  reader.readAsText(file);
}

// ── migrarParaEstruturaESus — normaliza campos legados de um backup flat
// Espelha o que purgeObsoleteFields faz no primeiro load pós-restauração,
// mas é necessária aqui porque confirmarRestaurar() sobrescreve db antes
// que purgeObsoleteFields rode novamente.
function migrarParaEstruturaESus(data) {
  const DOM_ALIASES_LOCAL = {
    fkBairro:'bairro', pontoReferencia:'referencia',
    fkTipoImovel:'tipoImovel', fkTipoDomicilio:'tipoDom',
    fkSituacaoMoradia:'situacaoMoradia', fkMaterialConstrucao:'material',
    fkAguaAbastecida:'agua', fkEscoamentoSanitario:'esgoto',
    fkDestinoLixo:'lixo', fkTipoEnergiaEletrica:'energia',
    fkTipoAcessoDomicilio:'tipoAcesso', fkLogradouro:'tipoLogradouro',
    numeroDeAnimais:'numAnimais', fkAguaConsumida:'aguaConsumida',
  };
  const DOM_OBSOLETE_LOCAL = ['fkCidade','fkUf','bairroOutro',
    'disponibilidaDeAgua','disponibilidaDeEnergia','alterado'];
  const FAM_REMOVE_LOCAL = ['logradouro','numero','complemento','bairro','cep'];

  Object.values(data.domicilioById || {}).forEach(function(d) {
    if (!d || typeof d !== 'object') return;
    for (const alias in DOM_ALIASES_LOCAL) {
      if (alias in d) {
        const canon = DOM_ALIASES_LOCAL[alias];
        if (!d[canon]) d[canon] = d[alias];
        delete d[alias];
      }
    }
    if ('fkAguaConsumida' in d) {
      if (!d.aguaConsumida) d.aguaConsumida = d.fkAguaConsumida;
      delete d.fkAguaConsumida;
    }
    DOM_OBSOLETE_LOCAL.forEach(function(f) { if (f in d) delete d[f]; });
  });

  Object.values(data.familiaById || {}).forEach(function(f) {
    if (!f || typeof f !== 'object') return;
    FAM_REMOVE_LOCAL.forEach(function(campo) { if (campo in f) delete f[campo]; });
    if ('observacoes' in f) {
      if (!f.obs) f.obs = f.observacoes;
      delete f.observacoes;
    }
  });
}

// Executa a restauração após confirmação
function confirmarRestaurar() {
  if (!_backupParaRestaurar) return;
  showLoading("Restaurando backup...");
  // B3: requestIdleCallback com timeout garante pintura do spinner antes do
  // trabalho pesado sem acionar o watchdog de slow-script do Android.
  // Fallback para setTimeout em browsers sem suporte (< 5% dos casos).
  const _ricOrTimeout = (cb) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(cb, { timeout: 800 });
    } else {
      setTimeout(cb, 32);
    }
  };
  _ricOrTimeout(async function() { try {
    let data = _backupParaRestaurar;
    // Pulado em dispositivos touch (Android): JSON.stringify de 1MB custa ~300ms
    // sincrono dentro de setTimeout, acionando o watchdog de slow-script do Android.
    // O checksum e puramente informacional — nunca bloqueia a restauracao.
    var _isTouchDevice = window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (!_isTouchDevice && data._meta && data._meta.checksum) {
      const metaSaved = data._meta;
      const dataCopy = Object.assign({}, data);
      delete dataCopy._meta;
      dataCopy._meta = Object.assign({}, metaSaved);
      delete dataCopy._meta.checksum;
      delete dataCopy._meta.totalBytes;
      const _sortedStringify = obj => JSON.stringify(obj, Object.keys(obj).sort());
      const _payload = _sortedStringify(dataCopy);
      let _h = 0;
      for (let i = 0; i < _payload.length; i++) { _h = (Math.imul(31, _h) + _payload.charCodeAt(i)) | 0; }
      const computed = (_h >>> 0).toString(16).padStart(8, '0');
      if (computed !== metaSaved.checksum) {
        console.warn('[ACS] Checksum diverge (backup de versao anterior ou editado manualmente).');
      }
    }
    _backupParaRestaurar = null;
    closeModal('modal-confirm-restore');

    // Migrar formatos antigos se necessário
    if (data.familias && data.individuos && !data.domicilioById) {
      data = migrarV3ParaESus(data);
    } else {
      migrarParaEstruturaESus(data);
    }

    // Substituir banco principal — muta db sem reatribuir a referência (B2)
    // Preserva db.config atual como fallback caso o backup não traga config
    const _fallbackConfig = db.config;
    _mergeDbFromBackup(data);
    if (!db.config || !Object.keys(db.config).length) db.config = _fallbackConfig;
    // Garantir estrutura + migrar campos legados do backup
    _garantirFichas();
    // Normalizar tipos de chave (String→Number para família/indivíduo,
    // String padStart(3,'0') para domicílio) — obrigatório após JSON.parse()
    normalizarIds();
    // Absorver fichasAcompanhamento/historicoFichas do backup legado se presentes
    if (!data.fichas && data.fichasAcompanhamento) {
      const tipos = ['has','dm','gestante','consumoAlimentar','hans'];
      const fa = data.fichasAcompanhamento;
      if (fa && typeof fa === 'object') {
        for (const t of tipos) {
          if (fa[t]) Object.assign(db.fichas.atual[t], fa[t]);
        }
      }
    }
    if (!data.fichas && data.historicoFichas) {
      const hf = data.historicoFichas;
      if (hf && Array.isArray(hf.hans)) {
        for (const entrada of hf.hans) {
          if (!entrada) continue;
          if (!Array.isArray(db.fichas.historico.hans)) db.fichas.historico.hans = [];
          db.fichas.historico.hans.push(entrada);
        }
      }
    }

    // Garantir completude dos campos críticos
    if (!db.metas) db.metas = {};
    if (db.metas.manha   == null) db.metas.manha   = 5;
    if (db.metas.tarde   == null) db.metas.tarde   = 5;
    if (db.metas.sabado  == null) db.metas.sabado  = 'nao';
    if (db.metas.domingo == null) db.metas.domingo = 'nao';
    if (!db.metasAjustes)    db.metasAjustes    = {};
if (!db.metasExtras)     db.metasExtras     = {};
if (!db.metasRealizadas) db.metasRealizadas = {};
    if (!db._nextId) db._nextId = {};
    (function(){
      var nd = db._nextId;
      var maxKeys = function(obj){ return Object.keys(obj||{}).map(function(k){return parseInt(k,10)||0;}); };
      var maxVals = function(arr,f){ return (arr||[]).map(function(v){return Number(v[f])||0;}); };
      var maxDom = Math.max.apply(null,[0].concat(maxKeys(db.domicilioById)));
      var maxFam = Math.max.apply(null,[0].concat(maxVals(Object.values(db.familiaById||{}),'id')));
      var maxInd = Math.max.apply(null,[0].concat(maxVals(Object.values(db.individuoById||{}),'id')));
      var maxVis = Math.max.apply(null,[0].concat(maxVals(db.visitas,'id')));
      var maxAge = Math.max.apply(null,[0].concat(maxVals(db.agenda,'id')));
      var maxPen = Math.max.apply(null,[0].concat(maxVals(db.pendencias,'id')));
      if (!nd.domicilio || Number(nd.domicilio) <= maxDom) nd.domicilio = maxDom + 1;
      if (!nd.familia   || Number(nd.familia)   <= maxFam) nd.familia   = maxFam + 1;
      if (!nd.individuo || Number(nd.individuo) <= maxInd) nd.individuo = maxInd + 1;
      if (!nd.visita    || Number(nd.visita)    <= maxVis) nd.visita    = maxVis + 1;
      if (!nd.agenda    || Number(nd.agenda)    <= maxAge) nd.agenda    = maxAge + 1;
      if (!nd.pendencia || Number(nd.pendencia) <= maxPen) nd.pendencia = maxPen + 1;
    })();

    // Restauracao usa save() — agora retorna Promise; aguardar antes de atualizar a UI
    // para garantir que os dados foram gravados no IDB antes de mostrar "sucesso".
    await DB.saveSync();

    // Restaurar anotações individuais (acs_anotacoes_ind_*) do backup
    if (data.anotacoes && typeof data.anotacoes === 'object') {
      try {
        // Limpa anotações antigas antes de restaurar para evitar mistura
        const keysAntigas = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('acs_anotacoes_ind_')) keysAntigas.push(k);
        }
        keysAntigas.forEach(k => localStorage.removeItem(k));
        // Grava as do backup
        Object.entries(data.anotacoes).forEach(function([k, v]) {
          if (k.startsWith('acs_anotacoes_ind_') && v) localStorage.setItem(k, v);
        });
      } catch(e) { console.warn('[ACS] Erro ao restaurar anotações:', e); }
    }

    // Atualizar UI
    const paginaAtual = document.querySelector('.page.active')?.id?.replace('page-','') || 'dashboard';
    renderPage(paginaAtual);
    updateBadge();
    atualizarBadgeHans();
    $id('acs-nome').textContent = db.config?.nome || 'ACS';
    $id('acs-area').textContent = `Microárea ${db.config?.microarea || '09'} · ${db.config?.esf || 'ESF'}`;

    hideLoading();
    toast('✅ Backup restaurado com sucesso!', 'success');
    renderBackupStats();
    renderHistoricoBackups();

  } catch(err) {
    console.error('Erro ao restaurar backup:', err);
    toast('Erro ao restaurar backup — arquivo corrompido', 'error');
  } finally {
    hideLoading();
  }
  }); // fim do requestIdleCallback
}

// Mantém compatibilidade com o input antigo (caso ainda referenciado)

function gerarTemplateJson() {
  return {
  "_meta": {
    "versao": "acs_backup_v2",
    "geradoEm": "2025-01-01T00:00:00.000Z",
    "sistema": "ACS Neto - Sistema do Agente Comunitario",
    "acs": "Nome do ACS",
    "microarea": "09",
    "esf": "ESF Acaracuzinho",
    "totalDomicilios": 1,
    "totalFamilias": 1,
    "totalIndividuos": 2,
    "totalVisitas": 1,
    "totalPendencias": 0,
    "totalAgenda": 0
  },
  "config": {
    "nome": "Maria da Silva",
    "cpf": "000.000.000-00",
    "cns": "000000000000000",
    "cbo": "515105",
    "esf": "ESF Acaracuzinho",
    "microarea": "09",
    "municipio": "Maracanáu",
    "cnes": "0000000",
    "ine": "0000000000",
    "bairro": "Acaracuzinho",
    "ruas": "Rua Principal"
  },
  "domicilioById": {
    "001": {
      "idDomicilio": "001",
      "dataCadastro": "2025-01-01",
      "familias": [
        1
      ],
      "tipoLogradouro": "Rua",
      "logradouro": "QUADRA 154 BLOCO 02",
      "numero": "103",
      "complemento": "",
      "bairro": "Acaracuzinho",
      "cep": "61900-000",
      "referencia": "Próximo ao campo de futebol",
      "latitude": "-3.845707",
      "longitude": "-38.622579",
      "codMicroarea": "09",
      "tipoAcesso": "Rua Pavimentada",
      "tipoImovel": "Domicílio",
      "tipoDom": "Casa",
      "situacaoMoradia": "Próprio",
      "material": "Alvenaria",
      "numeroComodos": 5,
      "agua": "Rede encanada",
      "aguaConsumida": "Filtrada",
      "esgoto": "Rede de Esgoto",
      "lixo": "Coletado",
      "energia": "Concessionária",
      "possuiAnimais": "Não",
      "numAnimais": 0,
      "cachorros": 0,
      "gatos": 0,
      "passaros": 0,
      "galinha": 0,
      "outrosAnimais": 0
    }
  },
  "familiaById": {
    "1": {
      "idFamilia": 1,
      "domicilioId": "001",
      "prontuario": "FAM-001",
      "responsavelId": 1,
      "responsavel": "João da Silva",
      "membros": 2,
      "ultimaVisita": "2025-01-15",
      "dataCadastro": "2025-01-01",
      "dataInicio": "2020-01",
      "rendaSalariosMinimos": 2.0,
      "risco": "baixo",
      "vulnerabilidade": "nao",
      "obs": "",
      "individuos": [
        1,
        2
      ]
    }
  },
  "individuoById": {
    "1": {
      "idIndividuo": 1,
      "nome": "João da Silva",
      "nomeSocial": "",
      "mae": "Maria da Silva",
      "pai": "José da Silva",
      "nasc": "1980-05-15",
      "sexo": "M",
      "raca": "Parda",
      "nacional": "Brasileira",
      "cpf": "000.000.000-00",
      "cns": "000000000000000",
      "escolaridade": "Fundamental completo",
      "trabalho": "Agricultor",
      "familiaId": 1,
      "vinculoResponsavel": "Responsável",
      "dataCadastro": "2025-01-01",
      "has": "nao",
      "dm": "nao",
      "gestante": "nao",
      "deficiencia": "nao",
      "mental": "nao",
      "tb": "nao",
      "cancer": "nao",
      "acamado": "nao",
      "outras": "",
      "medicacoes": [],
      "vacinas": []
    },
    "2": {
      "idIndividuo": 2,
      "nome": "Ana da Silva",
      "nomeSocial": "",
      "mae": "Maria da Silva",
      "pai": "José da Silva",
      "nasc": "2010-03-20",
      "sexo": "F",
      "raca": "Parda",
      "nacional": "Brasileira",
      "cpf": "",
      "cns": "",
      "escolaridade": "Fundamental incompleto",
      "trabalho": "",
      "familiaId": 1,
      "vinculoResponsavel": "Filho(a)",
      "dataCadastro": "2025-01-01",
      "has": "nao",
      "dm": "nao",
      "gestante": "nao",
      "deficiencia": "nao",
      "mental": "nao",
      "tb": "nao",
      "cancer": "nao",
      "acamado": "nao",
      "outras": "",
      "medicacoes": [
        {
          "nome": "Amoxicilina 500MG",
          "freq": "3x",
          "localAcesso": "USF"
        }
      ],
      "vacinas": []
    }
  },
  "visitas": [
    {
      "idVisita": 1,
      "data": "2025-01-15",
      "familiaId": 1,
      "individuoId": null,
      "turno": "manha",
      "escopo": "familia",
      "membroId": null,
      "tipo": "Visita domiciliar",
      "desfecho": "Visita realizada",
      "vacina": "nao-avaliado",
      "encam": "nao",
      "obs": "",
      "cbo": "515105",
      "dataRegistro": "2025-01-15"
    }
  ],
  "agenda": [],
  "pendencias": [],
  "metas": {
    "manha": 5,
    "tarde": 5,
    "sabado": "nao",
    "domingo": "nao"
  },
  "metasAjustes": {},
  "_nextId": {
    "domicilio": 2,
    "familia": 2,
    "individuo": 3,
    "visita": 2,
    "agenda": 1,
    "pendencia": 1
  },
  "fichas": {
    "atual":    { "has":{}, "dm":{}, "gestante":{}, "consumoAlimentar":{}, "hans":{}, "acamado":{}, "prevencao":{} },
    "historico":{ "has":[], "dm":[], "gestante":[], "consumoAlimentar":[], "hans":[], "acamado":[], "prevencao":[] }
  }
};
}

function abrirTemplateBackup() {
  const template = gerarTemplateJson();
  const pre = $id('template-json-content');
  if (pre) pre.textContent = JSON.stringify(template, null, 2);
  openModal('modal-template-json');
}

function copiarTemplate() {
  const pre = $id('template-json-content');
  if (!pre) return;
  navigator.clipboard.writeText(pre.textContent)
    .then(() => toast('Template copiado!', 'success'))
    .catch(() => toast('Não foi possível copiar', 'error'));
}

function baixarTemplate() {
  const template = gerarTemplateJson();
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'template_backup_acs.json'; a.click();
  URL.revokeObjectURL(url);
  toast('Template baixado!', 'success');
}

async function limparTudo() {
  db.domicilioById = {}; db.familiaById = {}; db.individuoById = {}; db.visitas = []; db.agenda = []; db.pendencias = [];
  db._nextId = { domicilio:1, familia:1, individuo:1, visita:1, agenda:1, pendencia:1 };
  await DB.saveSync(); renderDashboard(); toast('Todos os dados apagados', '');
}
