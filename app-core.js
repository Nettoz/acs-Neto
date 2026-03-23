// ACS Neto — app-core.js
// Banco de dados, persistência, migrações e acessores
// Deve ser carregado ANTES de todos os outros módulos

// Stubs de compatibilidade para acsDbg* (debug console externo)
window.acsDbg     = function(msg)  { console.log('[ACS]',  msg); };
window.acsDbgOk   = function(msg)  { console.log('[ACS✓]', msg); };
window.acsDbgWarn = function(msg)  { console.warn('[ACS⚠]', msg); };
window.acsDbgErr  = function(msg)  { console.error('[ACS✗]', msg); };
window.acsDbgClear= function()     {};
// ── Bootstrap e configuração inicial ─────────────────────────────────────────

// ── Configuração padrão — aplicada apenas a bancos novos (sem localStorage) ──
const DEFAULT_CONFIG = {
  nome: 'José Neto', cpf: '', cns: '', cbo: '515105',
  esf: 'ESF Maria Heleny Matos Brandão', microarea: '09',
  municipio: 'Maracanaú', cnes: '6900704', ine: '',
  bairro: 'Santo Sátiro', ibge: '2307650', ruas: '',
};

const db = {
  config: Object.assign({}, DEFAULT_CONFIG),
  domicilioById: {},
  familiaById: {},
  individuoById: {},
  visitas: [],
  agenda: [],
  pendencias: [],
  _nextId: { domicilio:1, familia:1, individuo:1, visita:1, agenda:1, pendencia:1 },
  // ── fichas de acompanhamento ─────────────────────────────────────────────
  // atual[tipo][indId]         → snapshot dos campos do último preenchimento
  // historico[tipo][indId]     → array cronológico de snapshots { data, campos, obs }
  fichas: {
    atual:    { has:{}, dm:{}, gestante:{}, consumoAlimentar:{}, hans:{}, acamado:{}, prevencao:{} },
    historico:{ has:{}, dm:{}, gestante:{}, consumoAlimentar:{}, hans:{}, acamado:{}, prevencao:{} },
  },
};

// ── _mergeDbFromBackup — muta db sem reatribuir a referência ─────────────────
// Usado por loadBootstrap, load() e confirmarRestaurar() para garantir que
// closures capturadas antes da restauração continuem apontando para o mesmo objeto.
// NUNCA fazer db = {...} — use sempre esta função.
function _mergeDbFromBackup(src) {
  // 1. Apaga todas as propriedades próprias do objeto vivo
  for (const k of Object.keys(db)) delete db[k];
  // 2. Copia com sanitização mínima (backups corrompidos podem ter entradas null)
  db.config          = src.config          || {};
  db.domicilioById   = src.domicilioById   || {};
  db.familiaById     = src.familiaById     || {};
  db.individuoById   = src.individuoById   || {};
  db.visitas         = (src.visitas    || []).filter(v => v && typeof v === 'object');
  db.agenda          = (src.agenda     || []).filter(a => a && typeof a === 'object');
  db.pendencias      = (src.pendencias || []).filter(p => p && typeof p === 'object');
  db.metas           = src.metas           || {};
  db.metasAjustes    = src.metasAjustes    || {};
  db.metasExtras     = src.metasExtras     || {};
  db.metasRealizadas = src.metasRealizadas || {};
  db._nextId         = src._nextId         || {};
  db.fichas          = src.fichas          || null;
  // Garante estrutura mínima de fichas após qualquer merge — callers não precisam lembrar
  if (typeof _garantirFichas === 'function') _garantirFichas();
}

// familiasCount / lastFamiliaSelectsUpdate são gerenciados internamente pelo DB
// Aliases globais mantidos para compatibilidade com código legado que os lê diretamente
let familiasCount = 0;
let lastFamiliaSelectsUpdate = 0;
// ── loadBootstrap() — pré-popula db de localStorage de forma SÍNCRONA ────────
// Roda imediatamente ao carregar app-core.js, antes de qualquer outro script
// top-level (ex: app-metas.js) executar. Garante que o dashboard inicial não
// pisce com dados zerados. O load() assíncrono em DOMContentLoaded sincroniza
// depois com o IDB e re-renderiza se necessário.
(function loadBootstrap() {
  try {
    const s = localStorage.getItem('acs_db_v5');
    if (s) {
      _mergeDbFromBackup(JSON.parse(s));
      normalizarIds();
      _garantirFichas();
    }
  } catch(e) {
    console.warn('[ACS] Bootstrap localStorage falhou:', e);
  }
})();


// ============================================================
// VARIÁVEIS GLOBAIS
// ============================================================
// ── UI constants — used by app-ui.js; defined here for load-order convenience ──
const pageTitles = {
  dashboard:'Painel de Controle', familias:'Domicílios', individuos:'Indivíduos', pendencias:'Pendências',
  agenda:'Agenda / Visitas',
  condicoes:'Condições Crônicas', visitas:'',
  vacinas:'Vacinas Infantis',
  metas:'Metas de Visitas', exportar:'Exportar Dados', configuracoes:'Configurações', acompanhamento:'Fichas de Acompanhamento',
  municipio:'🏙️ Meu Município — Maracanaú/CE'
};
// handler: referência direta a função — elimina setAttribute('onclick', string)
// que era incompatível com CSP e impossível de testar/analisar.
const pageActions = {
  familias:   { label:'+ Novo Domicílio',   handler: function() { openNovoDomicilio(); } },
  individuos: { label:'+ Novo Indivíduo',   handler: function() { openNovoIndividuo(); } },
  pendencias: { label:'+ Nova Pendência',   handler: function() { openNovaPendencia(); } },
  visitas:    { label:'+ Registrar Visita', handler: function() { openNovaVisita(); } },
  agenda:     { label:'+ Registrar Visita', handler: function() { openNovaVisita(); } },
};
const _notifIcons = { success:'✅', error:'❌', warn:'⚠️', info:'ℹ️', '':'🔔' };
const _notifTitles = { success:'Sucesso', error:'Erro', warn:'Atenção', info:'Informação', '':'Aviso' };
let _notifUnread = 0;
let _notifHistory = [];
let isUpdatingSelects = false;
const selectIds = ['vis-familia', 'pend-familia', 'agenda-familia'];
// ruasAbertas movido para Render._ruasAbertas (privado)
let currentIndividuoId = null;
let editFamiliaId = null;
let editDomicilioId = null;
let _famDomicilioId = null;
let editIndId = null;
let _indFamiliaId = null;
let _backupParaRestaurar = null;
const DOM_FIELDS_TEXT = ['dom-logradouro','dom-numero','dom-complemento','dom-cep','dom-referencia',
  'dom-latitude','dom-longitude','dom-num-comodos'];
const DOM_FIELDS_SELECT = ['dom-fk-logradouro','dom-bairro','dom-tipo-imovel','dom-tipo-dom',
  'dom-situacao-moradia','dom-material','dom-disp-agua','dom-agua','dom-agua-consumo',
  'dom-esgoto','dom-lixo','dom-disp-energia','dom-energia','dom-tipo-acesso','dom-possui-animais'];
const DOM_FIELDS_NUM = ['dom-num-animais','dom-cachorros','dom-gatos','dom-passaros','dom-galinhas','dom-outros-animais'];
const BACKUP_HISTORY_KEY = 'acs_backup_history';
let metasMesOffset = 0;
let medicamentosDict = [];
let activeAutocomplete = null;
// fichasAcompanhamento — alias de compatibilidade que delega para db.fichas.atual
// historicoFichas      — alias que delega para db.fichas.historico
// Todo o armazenamento passou para db → um único save() cobre tudo.
Object.defineProperty(window, 'fichasAcompanhamento', {
  get()  { return db.fichas.atual; },
  set(v) { db.fichas.atual = v;    },
  configurable: true,
});
Object.defineProperty(window, 'historicoFichas', {
  get()  { return db.fichas.historico; },
  set(v) { db.fichas.historico = v;    },
  configurable: true,
});
const _tiposFichaLabel = {
  has: 'Acompanhamento HAS',
  dm: 'Acompanhamento DM',
  gestante: 'Acompanhamento Pré-natal',
  consumoAlimentar: 'Consumo Alimentar (e-SUS)',
  acamado: 'Acompanhamento Domiciliar',
  prevencao: 'Prevenção — Saúde da Mulher',
};

// ============================================================
// FUNÇÕES DE UTILIDADE
// ============================================================

window.debounce = function(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
};

// hoje() definida no bloco de data/hora personalizada (configuracoes)

// ACCESSORS CANÔNICOS — Normalização de tipo de IDs
// Regra de tipos canônicos (aplicada aqui e no load()):
// domicílio → String  padStart(3,'0')  ex: "001", "012"
// família   → Number                   ex: 1, 42
// indivíduo → Number                   ex: 1, 99
// Estes accessors aceitam qualquer tipo recebido e
// convertem internamente — o restante do código não precisa
// usar `?? f.id`, `|| String(id)`, ou `==` para IDs.

function getDomicilio(id) {
  if (id == null) return null;
  return db.domicilioById[String(id).padStart(3, '0')] || null;
}

function getDomicilios() { return Object.values(db.domicilioById || {}); }

function getFamilia(id) {
  if (id == null) return null;
  return db.familiaById[Number(id)] || null;
}

function getIndividuo(id) {
  if (id == null) return null;
  return db.individuoById[Number(id)] || null;
}

// ── normalizarIds() — Garante tipos canônicos em todas as chaves dos dicionários.
//
// Problema: JSON.parse() sempre devolve chaves de objeto como String, mas parte
// do código grava chaves como Number (nextId retorna Number para família/indivíduo).
// Isso causava lookups silenciosamente falhos: familiaById[1] !== familiaById["1"].
//
// Regra canônica aplicada aqui e nos accessors (getDomicilio/getFamilia/getIndividuo):
//   domicílio  → String padStart(3,'0')   ex: "001", "042"
//   família    → Number                   ex: 1, 42
//   indivíduo  → Number                   ex: 1, 99
//
// Além das chaves dos dicionários, também normaliza os campos de referência cruzada
// (domicilioId, responsavelId, familiaId) para o mesmo tipo, e os arrays de visitas
// e agenda para que `===` funcione em toda comparação de ID.
function normalizarIds() {
  // domicílios: chave → string padStart(3,'0')
  const domNorm = {};
  for (const k of Object.keys(db.domicilioById || {})) {
    const rec = db.domicilioById[k];
    if (!rec || typeof rec !== 'object') continue; // descarta entradas nulas
    const normKey = String(k).padStart(3, '0');
    rec.idDomicilio = normKey;
    domNorm[normKey] = rec;
  }
  db.domicilioById = domNorm;

  // famílias: chave → Number
  const famNorm = {};
  for (const k of Object.keys(db.familiaById || {})) {
    const rec = db.familiaById[k];
    if (!rec || typeof rec !== 'object') continue; // descarta entradas nulas
    const normKey = Number(k);
    rec.idFamilia = normKey;
    rec.id        = normKey;
    if (rec.domicilioId   != null) rec.domicilioId   = String(rec.domicilioId).padStart(3, '0');
    if (rec.responsavelId != null) rec.responsavelId = Number(rec.responsavelId);
    // Normaliza ultimaVisita legada de BR (dd/mm/aaaa) para ISO (yyyy-mm-dd)
    if (rec.ultimaVisita && rec.ultimaVisita.includes('/')) {
      const p = rec.ultimaVisita.split('/'); // [dd, mm, yyyy]
      if (p.length === 3) rec.ultimaVisita = p[2] + '-' + p[1] + '-' + p[0];
    }
    famNorm[normKey] = rec;
  }
  db.familiaById = famNorm;

  // indivíduos: chave → Number
  const individuosNorm = {};
  for (const k of Object.keys(db.individuoById || {})) {
    const individuo = db.individuoById[k];
    if (!individuo || typeof individuo !== 'object') continue; // descarta entradas nulas
    const normKey  = Number(k);
    individuo.idIndividuo = normKey;
    individuo.id          = normKey;
    if (individuo.familiaId != null) individuo.familiaId = Number(individuo.familiaId);
    individuosNorm[normKey] = individuo;
  }
  db.individuoById = individuosNorm;

  // Normalizar familiaId/individuoId nas listas de visitas e agenda
  for (const v of (db.visitas || [])) {
    if (!v || typeof v !== 'object') continue; // ignora entradas nulas/corrompidas
    if (v.familiaId   != null) v.familiaId   = Number(v.familiaId);
    if (v.individuoId != null) v.individuoId = Number(v.individuoId);
    if (v.membroId    != null) v.membroId    = Number(v.membroId);
  }
  // Remover entradas nulas da array de visitas após normalização
  db.visitas = (db.visitas || []).filter(v => v && typeof v === 'object');

  for (const a of (db.agenda || [])) {
    if (!a || typeof a !== 'object') continue;
    if (a.familiaId != null) a.familiaId = Number(a.familiaId);
  }
  db.agenda = (db.agenda || []).filter(a => a && typeof a === 'object');
}

// ── DB — módulo de persistência e cache ─────────────────────────────────────
const DB = (() => {
  let _snap = null;

  function invalidate() { _snap = null; }

  function getSnapshot() {
    if (_snap) return _snap;
    // Filtra entradas null/undefined que podem existir em backups corrompidos
    const familias   = Object.values(db.familiaById   || {}).filter(f => f != null);
    const individuos = Object.values(db.individuoById || {}).filter(i => i != null);

    // ── Índice indivíduos por família (Number key) ───────────────
    const indsByFam = {};
    for (const individuo of individuos) {
      const fid = individuo.familiaId; // já é Number após normalizarIds()
      if (!indsByFam[fid]) indsByFam[fid] = [];
      indsByFam[fid].push(individuo);
    }

    // ── Índice visitas por família no mês corrente (Set<familiaId>) ──
    // Construído UMA vez por ciclo de render, elimina as 18 varreduras
    // de db.visitas espalhadas pelas funções de render.
    // Formato: visitasByFam.has(familiaId:Number) → boolean
    const mesAtual      = new Date().toISOString().slice(0, 7);
    const visitasByFam  = new Set();
    const ultimaVisita  = {}; // familiaId → data ISO mais recente
    for (const v of (db.visitas || [])) {
      if (v.familiaId == null) continue;
      const fid = v.familiaId; // já é Number após normalizarIds()
      if ((v.data || '').startsWith(mesAtual)) visitasByFam.add(fid);
      if (!ultimaVisita[fid] || (v.data || '') > ultimaVisita[fid])
        ultimaVisita[fid] = v.data;
    }

    const visitasMesCount = (db.visitas || []).filter(v => (v.data || '').startsWith(mesAtual)).length;

    // ── Índice de vacinas atrasadas (Set<idIndividuo>) — P2-1 ───────────────
    // Construído UMA vez por ciclo de render usando temVacinaAtrasada().
    // _dashAlertas e outros consumidores consultam em O(1) em vez de
    // re-executar o loop O(n × vacinas × doses) a cada abertura do dashboard.
    // Invalida junto com o restante do snapshot via DB.invalidate().
    const vacinasAtrasadasIdx = new Set();
    for (const ind of individuos) {
      if (typeof temVacinaAtrasada === 'function' && temVacinaAtrasada(ind)) {
        vacinasAtrasadasIdx.add(ind.idIndividuo);
      }
    }

    _snap = { familias, individuos, indsByFam, visitasByFam, ultimaVisita, mesAtual, visitasMesCount, vacinasAtrasadasIdx };
    return _snap;
  }

  function _afterSave(payload) {
    const n = getSnapshot().familias.length;
    if (n !== familiasCount) { familiasCount = n; lastFamiliaSelectsUpdate = 0; }
    // Expõe tamanho do último payload para getStorageUsageKB() em app-export.js
    if (payload) window._lastSavedBytes = new Blob([payload]).size;
  }

  function _onSaveError(e, label) {
    console.error('[ACS] Erro ao salvar' + (label ? ' (' + label + ')' : '') + ':', e);
    if (e.name === 'QuotaExceededError' || e.code === 22)
      setTimeout(() => toast('⚠️ Armazenamento cheio! Faça um backup agora e limpe dados antigos.', 'error'), 100);
  }

  // ── IndexedDB — armazenamento principal (sem limite de 5 MB) ──────────────
  // DB: 'acs_idb_v1'  |  Store: 'main'  |  Key: 'db'  |  Value: JSON string
  // localStorage é mantido como escrita de backup (fallback rápido para IDB indisponível).
  const _IDB_NAME    = 'acs_idb_v1';
  const _IDB_STORE   = 'main';
  let   _idbConn     = null; // IDBDatabase cached após abertura

  function _idbOpen() {
    if (_idbConn) return Promise.resolve(_idbConn);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(_IDB_NAME, 1);
      req.onupgradeneeded = e => {
        const idb = e.target.result;
        if (!idb.objectStoreNames.contains(_IDB_STORE)) idb.createObjectStore(_IDB_STORE);
      };
      req.onsuccess = e => { _idbConn = e.target.result; resolve(_idbConn); };
      req.onerror   = e => reject(e.target.error);
    });
  }

  function _idbGet(key) {
    return _idbOpen().then(idb => new Promise((resolve, reject) => {
      const tx  = idb.transaction(_IDB_STORE, 'readonly');
      const req = tx.objectStore(_IDB_STORE).get(key);
      req.onsuccess = e => resolve(e.target.result ?? null);
      req.onerror   = e => reject(e.target.error);
    }));
  }

  function _idbPut(key, value) {
    return _idbOpen().then(idb => new Promise((resolve, reject) => {
      const tx  = idb.transaction(_IDB_STORE, 'readwrite');
      const req = tx.objectStore(_IDB_STORE).put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror   = e => reject(e.target.error);
    }));
  }

  // ── Quota: avisos para uso elevado (IDB suporta dezenas de MB) ───────────
  const _IDB_WARN_BYTES  = 50  * 1024 * 1024; // aviso em 50 MB
  const _IDB_BLOCK_BYTES = 490 * 1024 * 1024; // hard-block em 490 MB (margem conservadora)

  function _checkQuota(payload) {
    const bytes = new Blob([payload]).size;
    if (bytes >= _IDB_BLOCK_BYTES) {
      setTimeout(() => toast(
        `⛔ Banco de dados muito grande (${Math.round(bytes/1024/1024)} MB). ` +
        'Faça um backup e limpe dados antigos antes de continuar.', 'error'), 100);
      return false;
    }
    if (bytes >= _IDB_WARN_BYTES) {
      setTimeout(() => toast(
        `⚠️ Banco em ${Math.round(bytes/1024/1024)} MB. Considere fazer um backup.`, 'warn'), 100);
    }
    return true;
  }

  // ── saveSync — grava no IDB (Promise) + localStorage backup ──────────────
  // Retorna Promise<boolean>. O indicador visual só acende após a gravação real.
  function saveSync() {
    return new Promise(resolve => {
      const _doSave = async () => {
        try {
          invalidate();
          const payload = JSON.stringify(db);
          if (!_checkQuota(payload)) { resolve(false); return; }
          // Escrita primária no IndexedDB
          await _idbPut('db', payload);
          // Backup no localStorage — adiado via setTimeout para não bloquear a UI no Android.
          // localStorage.setItem é SÍNCRONO e pode travar a thread principal por centenas de ms
          // com payloads grandes, impedindo mudança de aba/janela no Chrome Android.
          setTimeout(() => { try { localStorage.setItem('acs_db_v5', payload); } catch(_) {} }, 0);
          _afterSave(payload);
          resolve(true);
        } catch(e) { _onSaveError(e); resolve(false); }
      };
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => _doSave(), { timeout: 2000 });
      } else {
        _doSave();
      }
    });
  }

  // ── saveSafe — versão criptografada com rollback ───────────────────────────
  async function saveSafe() {
    try {
      invalidate();
      const payload = JSON.stringify(await CryptoModule.encryptDbForSave());
      if (!_checkQuota(payload)) return false;
      // Rollback: lê versão atual do IDB antes de sobrescrever
      let _prev = null;
      try { _prev = await _idbGet('db'); } catch(_) {}
      try {
        await _idbPut('db', payload);
        // Backup localStorage — adiado para não bloquear UI no Android
        setTimeout(() => { try { localStorage.setItem('acs_db_v5', payload); } catch(_) {} }, 0);
      } catch(writeErr) {
        // Tenta restaurar a versão anterior se a escrita falhou
        if (_prev !== null) { try { await _idbPut('db', _prev); } catch(_) {} }
        throw writeErr;
      }
      _afterSave(payload);
      return true;
    } catch(e) { _onSaveError(e, 'safe'); return false; }
  }

  // ── Local storage helpers — para auth, settings e flags (não para o db principal) ──
  const _LS_KEYS = {
    db:               'acs_db_v5',
    notifLog:         'acs_notif_log',
    backupHistory:    'acs_backup_history',
    backupDismiss:    'acs_backup_reminder_dismissed',
    purgeV2:          'acs_purge_v2',
  };

  function getLocal(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
    catch(e) { return fallback; }
  }
  function setLocal(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch(e) { _onSaveError(e, key); return false; }
  }
  function removeLocal(key) {
    try { localStorage.removeItem(key); } catch(e) {}
  }
  function getRawLocal(key, fallback = null) {
    try { return localStorage.getItem(key) ?? fallback; }
    catch(e) { return fallback; }
  }
  function setRawLocal(key, value) {
    try { localStorage.setItem(key, value); return true; }
    catch(e) { _onSaveError(e, key); return false; }
  }

  return { getSnapshot, invalidate, saveSync, saveSafe,
           getLocal, setLocal, removeLocal, getRawLocal, setRawLocal,
           idbGet: _idbGet, idbPut: _idbPut, LS: _LS_KEYS };
})();

// ── Aliases globais — compatibilidade com onclick e código legado ─────────
function getSnapshot()   { return DB.getSnapshot();   }
function getFamilias()   { return DB.getSnapshot().familias;   }
function getIndividuos() { return DB.getSnapshot().individuos; }

function getFamiliaLabel(id) { const f = getFamilia(id); if (!f) return '–'; const r = f.responsavelId ? (getIndividuo(f.responsavelId)) : null; if (r) return esc(r.nome); return esc(f.responsavel) || f.prontuario || '–'; }

function getFamiliaProntuario(f) { return f.prontuario || 'FAM-' + (f.idFamilia || '').toString().padStart(3,'0'); }

function getDomicilioLabel(id) { const d = getDomicilio(id); return d ? `${esc(d.logradouro||'')} ${esc(d.numero||'')}`.trim() || d.idDomicilio : '–'; }

window.save = window.debounce(function() { DB.saveSync(); }, 1000);

// ── load() — Carrega o banco do IndexedDB (primário) ou localStorage (fallback/migração).
//
// Fluxo:
//   1. Tenta ler de IndexedDB ('acs_idb_v1' / store 'main' / key 'db')
//   2. Se não encontrar, tenta localStorage 'acs_db_v5' e migra para IDB
//   3. Após carregar, chama normalizarIds() e _garantirFichas()
//   4. Inicializa a estrutura mínima do db (metas, _nextId)
//
// Deve ser chamado com await no DOMContentLoaded (auth.js) antes de qualquer render.
async function load() {
  let raw = null;
  let migradoDoLocalStorage = false;

  try {
    raw = await DB.idbGet('db');
  } catch(e) {
    console.warn('[ACS] IndexedDB indisponível, tentando localStorage:', e);
  }

  if (!raw) {
    // Fallback / migração: lê do localStorage
    try { raw = localStorage.getItem('acs_db_v5'); } catch(_) {}
    if (raw) migradoDoLocalStorage = true;
  }

  if (raw) {
    try {
      _mergeDbFromBackup(JSON.parse(raw));
      normalizarIds();
      _garantirFichas();
      // Migração: escreve no IDB e remove do localStorage
      if (migradoDoLocalStorage) {
        try {
          await DB.idbPut('db', raw);
          localStorage.removeItem('acs_db_v5');
          acsDbgOk('[ACS] Banco migrado de localStorage → IndexedDB.');
        } catch(e) {
          console.warn('[ACS] Falha ao migrar para IndexedDB — mantendo localStorage:', e);
        }
      }
    } catch(e) {
      console.error('[ACS] Erro ao parsear dados salvos:', e);
      setTimeout(() =>
        toast('⚠️ Erro ao carregar dados salvos. O sistema iniciou com dados vazios. Use um backup para restaurar.', 'error'),
        500
      );
    }
  } else {
    // Detectar chaves legadas órfãs
    for (const legacyKey of ['acs_db_v6', 'acs_db_v4', 'acs_db_v3']) {
      if (localStorage.getItem(legacyKey) !== null) {
        console.error('[ACS] Chave legada encontrada sem banco v5/IDB:', legacyKey,
          '— restaure um backup recente ou entre em contato com o suporte.');
        break;
      }
    }
  }

  // Dados novos (sem storage) — garantir estrutura
  _garantirFichas();
  _initDbStructure();
}

// ── _initDbStructure — estrutura mínima (metas, _nextId) ────────────────────
// Extraído do bloco top-level para que load() possa chamar após parsear o banco.
function _initDbStructure() {
  if (!db.metas) db.metas = {};
  if (db.metas.manha   == null) db.metas.manha   = 5;
  if (db.metas.tarde   == null) db.metas.tarde   = 5;
  if (db.metas.sabado  == null) db.metas.sabado  = 'nao';
  if (db.metas.domingo == null) db.metas.domingo = 'nao';
  if (!db.metasAjustes)    db.metasAjustes    = {};
  if (!db.metasExtras)     db.metasExtras     = {};
  if (!db.metasRealizadas) db.metasRealizadas = {};
  if (!db._nextId) db._nextId = {};
  const nd = db._nextId;
  // reduce com valor inicial 1 — seguro em arrays vazios (Math.max(...[]) = -Infinity)
  const maxKeys = obj => Object.keys(obj||{}).reduce((m,k) => Math.max(m, parseInt(k,10)||0), 1);
  const maxVals = (arr, f) => (arr||[]).reduce((m,v) => Math.max(m, Number(v[f])||0), 1);
  if (!nd.domicilio) nd.domicilio = maxKeys(db.domicilioById) + 1;
  if (!nd.familia)   nd.familia   = maxVals(Object.values(db.familiaById||{}), 'idFamilia') + 1;
  if (!nd.individuo) nd.individuo = maxVals(Object.values(db.individuoById||{}), 'idIndividuo') + 1;
  if (!nd.visita)    nd.visita    = maxVals(db.visitas||[], 'id') + 1;
  if (!nd.agenda)    nd.agenda    = maxVals(db.agenda||[], 'id') + 1;
  if (!nd.pendencia) nd.pendencia = maxVals(db.pendencias||[], 'id') + 1;
}

// ── purgeObsoleteFields — Remove campos legados do banco (executa uma vez por versão).
// Agora é uma função async nomeada chamada explicitamente no DOMContentLoaded (auth.js).
async function purgeObsoleteFields() {
  const PURGE_VER = 'acs_purge_v2';
  if (localStorage.getItem(PURGE_VER)) return;

  let domFixed = 0, famFixed = 0, lsRemoved = 0;

  // ── 1. domicilioById: aliases fkXxx → canônicos ──────────────────────────
  const DOM_ALIASES = {
    fkBairro:              'bairro',
    pontoReferencia:       'referencia',
    fkTipoImovel:          'tipoImovel',
    fkTipoDomicilio:       'tipoDom',
    fkSituacaoMoradia:     'situacaoMoradia',
    fkMaterialConstrucao:  'material',
    fkAguaAbastecida:      'agua',
    fkEscoamentoSanitario: 'esgoto',
    fkDestinoLixo:         'lixo',
    fkTipoEnergiaEletrica: 'energia',
    fkTipoAcessoDomicilio: 'tipoAcesso',
    fkLogradouro:          'tipoLogradouro',
    numeroDeAnimais:       'numAnimais',
  };
  const DOM_OBSOLETE = ['fkCidade', 'fkUf', 'bairroOutro',
    'disponibilidaDeAgua', 'disponibilidaDeEnergia', 'alterado'];

  Object.values(db.domicilioById || {}).forEach(function(d) {
    for (const alias in DOM_ALIASES) {
      if (alias in d) {
        const canonical = DOM_ALIASES[alias];
        if (!d[canonical] && d[alias]) d[canonical] = d[alias];
        delete d[alias];
        domFixed++;
      }
    }
    if ('fkAguaConsumida' in d) {
      if (!d.aguaConsumida) d.aguaConsumida = d.fkAguaConsumida;
      delete d.fkAguaConsumida;
      domFixed++;
    }
    DOM_OBSOLETE.forEach(function(f) {
      if (f in d) { delete d[f]; domFixed++; }
    });
  });

  // ── 2. familiaById: remover campos de endereço (vivem no domicílio) ───────
  const FAM_REMOVE = ['logradouro', 'numero', 'complemento', 'bairro', 'cep'];
  Object.values(db.familiaById || {}).forEach(function(f) {
    FAM_REMOVE.forEach(function(field) {
      if (field in f) { delete f[field]; famFixed++; }
    });
    if ('observacoes' in f) {
      if (!f.obs && f.observacoes) f.obs = f.observacoes;
      delete f.observacoes;
      famFixed++;
    }
  });

  // ── 3. localStorage: apagar chaves de versões anteriores ao v5 ───────────
  const LS_LEGACY = [
    'acs_db_v3', 'acs_db_v4', 'acs_db_v6',
    'acs_fichas', 'acs_historico_fichas',
    'acs_import_individuos_v1', 'acs_import_individuos_v2',
    'acs_import_acaracuzinho_v1', 'acs_schema_acaracuzinho_v1',
    'acs_purge_v1',
  ];
  LS_LEGACY.forEach(function(key) {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      lsRemoved++;
    }
  });

  // ── 4. Persistir banco limpo e marcar execução ────────────────────────────
  await DB.saveSync();
  localStorage.setItem(PURGE_VER, '1');

  const total = domFixed + famFixed + lsRemoved;
  if (total > 0) {
    setTimeout(function() {
      if (typeof toast === 'function')
        toast('🧹 Banco otimizado: ' + total + ' campo(s) obsoleto(s) removido(s).', 'info');
    }, 2500);
  }
}

function _garantirFichas() {
  if (!db.fichas || typeof db.fichas !== 'object') db.fichas = {};
  if (!db.fichas.atual    || typeof db.fichas.atual    !== 'object') db.fichas.atual    = {};
  if (!db.fichas.historico|| typeof db.fichas.historico!== 'object') db.fichas.historico= {};

  const tiposObj = ['has','dm','gestante','consumoAlimentar','acamado','prevencao'];
  for (const t of tiposObj) {
    if (!db.fichas.atual[t]     || typeof db.fichas.atual[t]     !== 'object') db.fichas.atual[t]     = {};
    if (!db.fichas.historico[t] || typeof db.fichas.historico[t] !== 'object') db.fichas.historico[t] = {};
  }
  // hans é armazenado como array (não objeto), para compatibilidade com .filter()/.push()
  if (!db.fichas.atual.hans     || typeof db.fichas.atual.hans !== 'object')  db.fichas.atual.hans     = {};
  if (!Array.isArray(db.fichas.historico.hans)) {
    // Migrar objeto {id: [...]} para array plano, se necessário
    if (db.fichas.historico.hans && typeof db.fichas.historico.hans === 'object') {
      const arr = [];
      for (const entries of Object.values(db.fichas.historico.hans)) {
        if (Array.isArray(entries)) arr.push(...entries);
        else if (entries && typeof entries === 'object') arr.push(entries);
      }
      db.fichas.historico.hans = arr;
    } else {
      db.fichas.historico.hans = [];
    }
  }
  // Remover entradas nulas de todos os arrays que são iterados com .individuoId
  db.fichas.historico.hans = db.fichas.historico.hans.filter(f => f && typeof f === 'object');
  if (Array.isArray(db.visitas))    db.visitas    = db.visitas.filter(v => v && typeof v === 'object');
  if (Array.isArray(db.agenda))     db.agenda     = db.agenda.filter(a => a && typeof a === 'object');
  if (Array.isArray(db.pendencias)) db.pendencias = db.pendencias.filter(p => p && typeof p === 'object');

}

function nextId(type) {
  // Gerador de ID robusto com alta entropia para uso offline (sem colisões na sincronização)
  // Max safe JS integer é 16 dígitos, Date.now() (~13 dígitos) * 1000 + rand(1000) nos dá IDs garantidamente únicos na máquina
  const novoId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  if (type === 'domicilio') return String(novoId);
  return novoId;
}

// ── load(), purgeObsoleteFields() e _initDbStructure() são chamados
// de forma assíncrona no DOMContentLoaded em auth.js.
