// ACS Neto — app-import.js
// Importação de dados, migração de versões, carregamento de demo
// Depende de: app-core.js (db, save, load), app-fichas.js (_garantirFichas)

function importarDB(data) {
  // Migrar formatos antigos se necessário
  if (data.familias && data.individuos && !data.domicilioById) {
    data = migrarV3ParaESus(data);
  } else {
    migrarParaEstruturaESus(data);
  }

  const novoDb = {
    config:        data.config        || db.config,
    domicilioById: data.domicilioById || {},
    familiaById:   data.familiaById   || {},
    individuoById: data.individuoById || {},
    visitas:       data.visitas       || [],
    agenda:        data.agenda        || [],
    pendencias:    data.pendencias    || [],
    metas:         data.metas         || {},
    metasAjustes:  data.metasAjustes  || {},
    _nextId:       data._nextId       || {},
    fichas:        data.fichas        || null,
  };

  // Garantir estrutura de fichas
  db = novoDb;
  _garantirFichas();

  // Absorver fichas legadas se presentes
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

  // Garantir campos críticos de metas
  if (!db.metas) db.metas = {};
  if (db.metas.manha   == null) db.metas.manha   = 5;
  if (db.metas.tarde   == null) db.metas.tarde   = 5;
  if (db.metas.sabado  == null) db.metas.sabado  = 'nao';
  if (db.metas.domingo == null) db.metas.domingo = 'nao';
  if (!db.metasAjustes)    db.metasAjustes    = {};
  return db;
}

function carregarDadosDemo() {
  customConfirm(
    '⚠️ Carregar Dados Demo?\n\nTodos os dados atuais serão substituídos por 50 pacientes fictícios em 10 famílias.\n\nFaça um backup antes se necessário.',
    function() {
      showLoading('Carregando dados demo...');
      fetch('demo-db.json')
        .then(function(r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function(demoData) {
          db = importarDB(demoData);
          save();
          showPage('dashboard');
          renderFamilias();
          renderIndividuos();
          renderDashboard();
          populateFamiliaSelects();
          renderBackupStats();
          toast('✅ Dados demo carregados! 50 pacientes em 10 famílias · Santo Sátiro.', 'success');
        })
        .catch(function(e) {
          console.error('Erro ao carregar demo:', e);
          toast('Erro ao carregar banco demo: ' + e.message, 'error');
        })
        .finally(function() {
          hideLoading();
        });
    }
  );
}
