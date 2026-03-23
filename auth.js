// ╔══════════════════════════════════════════════════════════════╗
// ║  ACS Neto — AUTH.JS                                     ║
// ║  Autenticação, login, troca de senha, recuperação           ║
// ║  Depende de: crypto.js                                      ║
// ╚══════════════════════════════════════════════════════════════╝
// Usado por recriptografarTudo() e chamadas diretas ao método criptografado
const _a$ = id => document.getElementById(id);

// ── Comparação de hashes constant-time (mitiga timing attacks) ────────────
function _safeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── Re-criptografar todos os dados com a chave atual ──────────
async function recriptografarTudo() {
  if (db.individuoById) {
    // 1. Criptografar em clone separado — NÃO modifica db em memória
    const cloneEnc = await CryptoModule.encryptDbForSave();
    const payload   = JSON.stringify(cloneEnc);
    // 2. Persistir no IDB (primário) + localStorage (backup)
    await DB.idbPut('db', payload);
    try { localStorage.setItem('acs_db_v5', payload); } catch(_) {}
    // 3. Invalidar snapshot para forçar reconstrução com dados em claro
    DB.invalidate();
  }
}

// ═══════════════════════════════════════════════════════════════
// AUTENTICAÇÃO
// ═══════════════════════════════════════════════════════════════

// Verifica se ainda usa a senha padrão

// ── Verifica se o registro de auth salvo é válido (tem hash e salt) ──────────
function _authDataValida(raw) {
  try {
    const d = JSON.parse(raw);
    return d && typeof d.hash === 'string' && d.hash.length === 64 &&
           typeof d.salt === 'string' && d.salt.length > 0;
  } catch(e) { return false; }
}

// ── Inicializar conta padrão se não existir ou estiver corrompida ─────────────
async function inicializarContaPadrao() {
  const raw = localStorage.getItem(AUTH_KEY);
  // Se já existe E é válido, não recria
  if (raw && _authDataValida(raw)) return;
  // Sem dados ou corrompido: cria conta padrão do zero
  if (raw) {
    console.warn('[ACS] Auth inválido/corrompido — recriando conta padrão.');
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(RECOVER_KEY);
  }
  try {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await sha256(DEFAULT_PASS + buf2hex(salt));
    // Código de recuperação gerado aleatoriamente — nunca hardcoded no fonte.
    // Exibido UMA vez na tela de troca de senha obrigatória para que o usuário anote.
    const recoverRaw = buf2hex(crypto.getRandomValues(new Uint8Array(6))).toUpperCase();
    const recoverHash = await sha256(recoverRaw + buf2hex(salt));
    localStorage.setItem(AUTH_KEY,    JSON.stringify({ hash, salt: buf2hex(salt), isDefault: true }));
    localStorage.setItem(RECOVER_KEY, JSON.stringify({ hash: recoverHash, salt: buf2hex(salt), isDefaultRecover: true }));
    // Guarda em sessionStorage para exibir na tela de troca obrigatória
    sessionStorage.setItem('acs_recover_hint', recoverRaw);
  } catch (err) {
    console.error('[ACS] Falha ao inicializar conta padrão (Web Crypto indisponível?):', err);
    const errEl = _a$('login-erro');
    if (errEl) {
      errEl.textContent = 'Erro de segurança: não foi possível inicializar a autenticação. Tente recarregar a página.';
      errEl.classList.add('show');
    }
  }
}

// ── Tela de login ─────────────────────────────────────────────
// ── Proteção contra brute force ───────────────────────────────
const _BF_KEY     = 'acs_login_attempts';
const _BF_MAX     = 5;
const _BF_LOCKOUT = 5 * 60 * 1000;

function _bfGetState() {
  try { return JSON.parse(sessionStorage.getItem(_BF_KEY) || '{}'); } catch(e) { return {}; }
}
function _bfSave(state) {
  try { sessionStorage.setItem(_BF_KEY, JSON.stringify(state)); } catch(e) {}
}
function _bfIsLocked() {
  const s = _bfGetState();
  if (!s.lockedAt) return false;
  if (Date.now() - s.lockedAt < _BF_LOCKOUT) return true;
  _bfSave({});
  return false;
}
function _bfRegisterFail() {
  const s = _bfGetState();
  s.count = (s.count || 0) + 1;
  if (s.count >= _BF_MAX) s.lockedAt = Date.now();
  _bfSave(s);
  return s.count;
}
function _bfReset() { _bfSave({}); }
function _bfMinutosRestantes() {
  const s = _bfGetState();
  if (!s.lockedAt) return 0;
  return Math.ceil((_BF_LOCKOUT - (Date.now() - s.lockedAt)) / 60000);
}

async function tentarLogin() {
  const senha = _a$('login-senha').value;
  const errEl = _a$('login-erro');
  errEl.classList.remove('show');

  // Verificar lockout por brute force
  if (_bfIsLocked()) {
    errEl.textContent = `Muitas tentativas incorretas. Aguarde ${_bfMinutosRestantes()} minuto(s).`;
    errEl.classList.add('show');
    return;
  }

  if (!senha) { errEl.textContent = 'Digite sua senha.'; errEl.classList.add('show'); return; }

  try {
    const raw = localStorage.getItem(AUTH_KEY);
    // Se auth corrompido, força reinicialização e avisa o usuário
    if (!_authDataValida(raw)) {
      await inicializarContaPadrao();
      errEl.textContent = 'Sessão reiniciada. Use a senha inicial configurada pelo administrador.';
      errEl.classList.add('show');
      return;
    }
    const authData = JSON.parse(raw);

    // Tenta hash normal: senha + salt (formato atual)
    const hashTentativa = await sha256(senha + authData.salt);

    if (!_safeEqual(hashTentativa, authData.hash)) {
      const tentativas = _bfRegisterFail();
      const restantes  = _BF_MAX - tentativas;
      errEl.textContent = restantes > 0
        ? `Senha incorreta. Tente novamente. (${restantes} tentativa${restantes !== 1 ? 's' : ''} restante${restantes !== 1 ? 's' : ''})`
        : `Muitas tentativas incorretas. Aguarde ${_bfMinutosRestantes()} minuto(s).`;
      errEl.classList.add('show');
      _a$('login-senha').value = '';
      _a$('login-senha').focus();
      return;
    }

    // Login bem-sucedido — zerar contador de tentativas
    _bfReset();

    // Autenticado — derivar chave de sessão (armazenada apenas no CryptoModule)
    const derivedKey = await CryptoModule.deriveKey(senha, hex2buf(authData.salt));
    CryptoModule.setKey(derivedKey);
    // Exporta a chave derivada para sessionStorage (persiste no reload, some ao fechar o browser)
    const rawKey = await crypto.subtle.exportKey('raw', derivedKey);
    sessionStorage.setItem('acs_session_key', buf2hex(rawKey));
    sessionStorage.setItem('acs_session_salt', authData.salt);
    await decryptDb();
    // Após autenticação: ativa modo criptografado no SaveManager (único ponto)
    SaveManager.setMode('encrypted');
    // Salva flag de sessão (sem armazenar a senha em texto claro)
    sessionStorage.setItem('acs_dev_autenticado', '1');
    // Nota: não persiste em localStorage — sessionStorage é suficiente (expira ao fechar o browser)

    if (authData.isDefault) {
      // Senha padrão: forçar troca antes de entrar
      mostrarTrocaObrigatoria();
    } else {
      entrarNoApp();
    }
  } catch(e) {
    console.error('[ACS] Erro na autenticação:', e);
    errEl.textContent = 'Erro ao autenticar. Tente novamente.';
    errEl.classList.add('show');
  }
}

// ── Tela de troca obrigatória de senha ────────────────────────
function mostrarTrocaObrigatoria() {
  _a$('login-form-normal').style.display = 'none';
  _a$('login-form-troca').style.display = 'block';
  _a$('login-subtitle').textContent = '🔒 Troque sua senha padrão';
  _a$('login-first-msg').style.display = 'block';
  // Exibir código de recuperação gerado aleatoriamente para o usuário anotar
  const hint = sessionStorage.getItem('acs_recover_hint');
  if (hint) {
    const hintEl = _a$('troca-recover-code');
    if (hintEl && !hintEl.value) {
      hintEl.value = hint;
      const infoEl = _a$('troca-recover-hint');
      if (infoEl) {
        infoEl.textContent = '⚠️ Anote este código antes de continuar — ele não será exibido novamente.';
        infoEl.style.display = 'block';
      }
    }
    sessionStorage.removeItem('acs_recover_hint');
  }
  setTimeout(() => _a$('troca-nova-senha').focus(), 100);
}

async function confirmarTrocaSenha() {
  const nova    = _a$('troca-nova-senha').value;
  const confirm = _a$('troca-confirm-senha').value;
  const recover = _a$('troca-recover-code').value.trim();
  const errEl   = _a$('troca-erro');
  errEl.classList.remove('show');

  if (!nova || nova.length < 8) {
    errEl.textContent = 'Senha deve ter pelo menos 8 caracteres.'; errEl.classList.add('show'); return;
  }
  if (!/[a-zA-Z]/.test(nova) || !/[0-9]/.test(nova)) {
    errEl.textContent = 'Senha deve conter letras e números.'; errEl.classList.add('show'); return;
  }
  if (nova === DEFAULT_PASS) {
    errEl.textContent = 'Não use a senha padrão. Crie uma senha pessoal.'; errEl.classList.add('show'); return;
  }
  if (nova !== confirm) {
    errEl.textContent = 'As senhas não coincidem.'; errEl.classList.add('show'); return;
  }
  if (!recover || recover.length < 3) {
    errEl.textContent = 'Informe um código de recuperação (mín. 3 caracteres).'; errEl.classList.add('show'); return;
  }

  try {
    const newSalt       = crypto.getRandomValues(new Uint8Array(16));
    const newHash       = await sha256(nova + buf2hex(newSalt));
    const recoverHash   = await sha256(recover + buf2hex(newSalt));

    localStorage.setItem(AUTH_KEY,    JSON.stringify({ hash: newHash, salt: buf2hex(newSalt), isDefault: false }));
    localStorage.setItem(RECOVER_KEY, JSON.stringify({ hash: recoverHash, salt: buf2hex(newSalt) }));

    // Nova chave de sessão com a Nova Senha
    const newKey = await CryptoModule.deriveKey(nova, newSalt);
    CryptoModule.setKey(newKey);
    const rawKey = await crypto.subtle.exportKey('raw', newKey);
    sessionStorage.setItem('acs_session_key', buf2hex(rawKey));
    sessionStorage.setItem('acs_session_salt', buf2hex(newSalt));
    await recriptografarTudo();
    entrarNoApp();
    setTimeout(() => toast('✅ Senha criada com sucesso! Bem-vindo ao ACS Neto.', 'success'), 500);
  } catch(e) {
    errEl.textContent = 'Erro ao salvar Nova Senha.'; errEl.classList.add('show');
  }
}


// ╔======================================================================╗
// ║  ◆ FIM BLOCO: CRIPTO_AUTH                                              ║
// ╚======================================================================╝

// ── Helpers de UI da tela de login ───────────────────────────
function _mostrarFormularios(usuarios, subtitle, normal, troca) {
  const show = (id, v) => { const el = _a$(id); if (el) el.style.display = v; };
  show('login-form-usuarios', usuarios ? 'block' : 'none');
  const sub = _a$('login-subtitle');
  if (sub) sub.style.display = subtitle ? 'block' : 'none';
  show('login-form-normal', normal  ? 'block' : 'none');
  show('login-form-troca',  troca   ? 'block' : 'none');
}

function voltarUsuarios() {
  _mostrarFormularios(true, false, false, false);
  const errEl = _a$('login-erro');
  if (errEl) errEl.classList.remove('show');
  const senhaEl = _a$('login-senha');
  if (senhaEl) senhaEl.value = '';
}

// ── Seleção de perfil ─────────────────────────────────────────
function selecionarUsuario(perfil) {
  if (perfil === 'demo') {
    _entrarDemo();
  } else {
    // Neto: mostra campo de senha
    _mostrarFormularios(false, true, true, false);
    const sub = _a$('login-subtitle');
    if (sub) sub.textContent = 'Bem-vindo, Neto 👋';
    setTimeout(() => _a$('login-senha').focus(), 100);
  }
}

function _entrarDemo() {
  // Conta Demo: sem senha, sem cripto, save em localStorage simples
  sessionStorage.setItem('acs_perfil', 'demo');
  sessionStorage.setItem('acs_dev_autenticado', '1');
  // Conta Demo: sem cripto — save() usa modo plain
  SaveManager.setMode('plain');
  _a$('login-screen').classList.add('hidden');
  inicializarUiPosLogin({ badge: false }); // badge virá após decryptDb
}

function entrarNoApp() {
  // Conta Neto: cripto ativa
  sessionStorage.setItem('acs_perfil', 'neto');
  sessionStorage.setItem('acs_dev_autenticado', '1');
  _a$('login-screen').classList.add('hidden');
  inicializarUiPosLogin({ badge: false }); // badge virá após decryptDb
}

async function fazerLogout() {
  const perfil = sessionStorage.getItem('acs_perfil') || 'neto';
  const msg = perfil === 'demo'
    ? 'Deseja sair da conta Demo?'
    : 'Deseja sair da conta?\nVocê precisará digitar sua senha novamente para entrar.';

  // P1-D: customConfirm assíncrono — não bloqueia o event loop nem falha em Android PWA
  const confirmado = await customConfirm(msg);
  if (!confirmado) return;

  localStorage.removeItem('acs_dev_autenticado');
  sessionStorage.removeItem('acs_dev_autenticado');
  sessionStorage.removeItem('acs_session_key');
  sessionStorage.removeItem('acs_session_salt');
  sessionStorage.removeItem('acs_perfil');
  if (typeof CryptoModule !== 'undefined' && typeof CryptoModule.setKey === 'function') {
    CryptoModule.setKey(null);
  }

  // Volta para seleção de perfil
  const loginScreen = _a$('login-screen');
  if (loginScreen) loginScreen.classList.remove('hidden');
  _mostrarFormularios(true, false, false, false);
  const senhaEl = _a$('login-senha');
  if (senhaEl) senhaEl.value = '';
  const errEl = _a$('login-erro');
  if (errEl) errEl.classList.remove('show');
}

// ── RECUPERAÇÃO DE SENHA ───────────────────────────────────────
// B4: estado encapsulado em objeto — evita herdar step inconsistente em
// reaberturas consecutivas do modal (let solto no módulo não era resetado
// se fecharRecuperacao() fosse chamada sem reset explícito).
const RecoveryFlow = {
  step: 1,
  reset() {
    this.step = 1;
    const codigoEl = _a$('recover-codigo');
    if (codigoEl) { codigoEl.value = ''; codigoEl.disabled = false; }
    const errEl = _a$('recover-erro');
    if (errEl) errEl.classList.remove('show');
    const novaField    = _a$('recover-nova-field');
    const confirmField = _a$('recover-confirm-field');
    if (novaField)    novaField.style.display    = 'none';
    if (confirmField) confirmField.style.display = 'none';
  },
};

function abrirRecuperacao() {
  RecoveryFlow.reset();
  _a$('modal-recover').classList.add('open');
  setTimeout(() => _a$('recover-codigo').focus(), 100);
}

function fecharRecuperacao() {
  _a$('modal-recover').classList.remove('open');
}

async function confirmarRecuperacao() {
  const errEl = _a$('recover-erro');
  errEl.classList.remove('show');

  if (RecoveryFlow.step === 1) {
    const codigo = _a$('recover-codigo').value;
    if (!codigo) { errEl.textContent = 'Informe o código.'; errEl.classList.add('show'); return; }
    try {
      const recoverData = JSON.parse(localStorage.getItem(RECOVER_KEY) || '{}');
      const hashCodigo  = await sha256(codigo + recoverData.salt);
      if (!_safeEqual(hashCodigo, recoverData.hash)) {
        errEl.textContent = 'Código de recuperação inválido.'; errEl.classList.add('show'); return;
      }
      RecoveryFlow.step = 2;
      _a$('recover-nova-field').style.display = 'block';
      _a$('recover-confirm-field').style.display = 'block';
      _a$('recover-codigo').disabled = true;
    } catch(e) { errEl.textContent = 'Erro ao verificar código.'; errEl.classList.add('show'); }
    return;
  }

  if (RecoveryFlow.step === 2) {
    const novaSenha   = _a$('recover-nova-senha').value;
    const novaConfirm = _a$('recover-nova-confirm').value;
    if (!novaSenha || novaSenha.length < 8) { errEl.textContent = 'Senha deve ter pelo menos 8 caracteres.'; errEl.classList.add('show'); return; }
    if (!/[a-zA-Z]/.test(novaSenha) || !/[0-9]/.test(novaSenha)) { errEl.textContent = 'Senha deve conter letras e números.'; errEl.classList.add('show'); return; }
    if (novaSenha !== novaConfirm) { errEl.textContent = 'As senhas não coincidem.'; errEl.classList.add('show'); return; }
    try {
      const recoverData   = JSON.parse(localStorage.getItem(RECOVER_KEY));
      const newSalt       = crypto.getRandomValues(new Uint8Array(16));
      const newHash       = await sha256(novaSenha + buf2hex(newSalt));
      const newRecoverHash = await sha256(_a$('recover-codigo').value + buf2hex(newSalt));
      localStorage.setItem(AUTH_KEY,    JSON.stringify({ hash: newHash, salt: buf2hex(newSalt), isDefault: false }));
      localStorage.setItem(RECOVER_KEY, JSON.stringify({ hash: newRecoverHash, salt: buf2hex(newSalt) }));
      const recoveredKey = await CryptoModule.deriveKey(novaSenha, newSalt);
      CryptoModule.setKey(recoveredKey);
      const rawKey = await crypto.subtle.exportKey('raw', recoveredKey);
      sessionStorage.setItem('acs_session_key', buf2hex(rawKey));
      sessionStorage.setItem('acs_session_salt', buf2hex(newSalt));
      fecharRecuperacao();
      toast('✅ Senha redefinida! Entrando...', 'success');
      await recriptografarTudo();
      entrarNoApp();
    } catch(e) { errEl.textContent = 'Erro ao redefinir senha.'; errEl.classList.add('show'); }
  }
}

// ── Inicializar ao carregar ────────────────────────────────────

// ── Service Worker — cache offline ────────────────────────────────────────
// Ativa apenas quando servido via HTTP(S).
// Protocolos file://, blob: e null (origem opaca) não suportam SW.
if ('serviceWorker' in navigator &&
    (location.protocol === 'http:' || location.protocol === 'https:')) {
  navigator.serviceWorker.register('./sw.js').then(reg => {
    acsDbgOk('[ACS] ServiceWorker registrado: ' + reg.scope);
  }).catch(e => console.warn('[ACS] ServiceWorker não registrado:', e));
}

// ── SaveManager — Strategy Pattern para save() ───────────────────────────────
// Único ponto de controle do modo de persistência.
// Substitui as 4 reatribuições de window.save espalhadas pelo auth flow,
// que criavam race conditions quando save() era chamado durante a transição.
//
// Modos:
//   'plain'     — saveSync (sem cripto) — antes do login / modo demo
//   'encrypted' — saveSafe (AES-GCM)   — após login da conta Neto
//
// _dirty: true após qualquer save() bem-sucedido; false após flush do pagehide.
// Permite que o handler de pagehide (P1-E) pule a serialização síncrona
// se não houver dados novos para persistir — evita ~200ms de jank no Android.
//
// Uso interno:  SaveManager.setMode('encrypted');
// Uso externo:  save() → delega ao SaveManager (alias global mantido por compatibilidade)
const SaveManager = (() => {
  let _mode  = 'plain';
  let _dirty = false;   // P1-E: sinaliza que há dados não-flushed para o pagehide

  function _exec() {
    const p = _mode === 'encrypted'
      ? DB.saveSafe()
      : Promise.resolve(DB.saveSync());
    p.then(ok => {
      if (ok !== false) _dirty = true;
      showSaveIndicator(ok !== false);
    }).catch(() => showSaveIndicator(false));
    return p;
  }

  return {
    setMode(mode)    { _mode  = mode; },
    getMode()        { return _mode; },
    save()           { return _exec(); },
    isDirty()        { return _dirty; },
    clearDirty()     { _dirty = false; },
  };
})();

// Alias global — todo o código existente continua usando save() sem alteração
window.save = function() { return SaveManager.save(); };

// ── saveLazy() — save com debounce para edições inline (300ms) ─────
let _saveTimer = null;

// ── Spinner global ────────────────────────────────────────────────
function showLoading(msg) {
  try {
    const el = _a$('loading-overlay');
    const msgEl = _a$('loading-msg');
    if (msgEl) msgEl.textContent = msg || 'Aguarde...';
    if (el) {
      el.classList.add('show');
      clearTimeout(el._safetyTimer);
      el._safetyTimer = setTimeout(() => {
        el.classList.remove('show');
        console.warn('[ACS] hideLoading não foi chamado — timeout de segurança ativado (15s)');
      }, 15000);
    }
  } catch(e) { console.warn('[ACS] showLoading erro:', e); }
}
function hideLoading() {
  try {
    const el = _a$('loading-overlay');
    if (el) {
      clearTimeout(el._safetyTimer);
      el.classList.remove('show');
    }
  } catch(e) { console.warn('[ACS] hideLoading erro:', e); }
}

function saveLazy() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => save(), 300);
}

// ── Indicador visual de save ───────────────────────────────────────
let _saveIndTimer = null;
function showSaveIndicator(ok = true) {
  const el = _a$('save-indicator');
  if (!el) return;
  el.innerHTML = ok
    ? '<svg style="width:14px;height:14px;stroke:#4ade80;fill:none;stroke-width:2.5;flex-shrink:0" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Salvo'
    : '<svg style="width:14px;height:14px;stroke:#f87171;fill:none;stroke-width:2.5;flex-shrink:0" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Erro ao salvar';
  el.classList.toggle('error', !ok);
  el.classList.add('show');
  clearTimeout(_saveIndTimer);
  _saveIndTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

document.addEventListener('DOMContentLoaded', async () => {
  // Carregar banco de dados do IndexedDB (assíncrono) antes de qualquer render
  await load();
  await purgeObsoleteFields();

  familiasCount = getFamilias().length;

  // ── Confirmação antes de fechar/recarregar a aba ──────────────
  window.addEventListener('beforeunload', (e) => {
    window.membrosCache = null;
    const logado = sessionStorage.getItem('acs_dev_autenticado') === '1';
    if (logado) {
      e.preventDefault();
      e.returnValue = 'Você tem dados. Deseja realmente sair?';
      return e.returnValue;
    }
  });

  // pagehide é mais confiável no Android Chrome (beforeunload nem sempre dispara).
  // P1-E: só serializa se SaveManager marcou dados como dirty (houve save desde o último flush),
  // evitando JSON.stringify síncrono de até 1MB quando não há nada novo para gravar.
  window.addEventListener('pagehide', () => {
    if (!SaveManager.isDirty()) return;
    try {
      localStorage.setItem('acs_db_v5', JSON.stringify(db));
      SaveManager.clearDirty();
    } catch(e) { /* quota cheia — nada a fazer */ }
  });

  // ── Confirmação ao clicar em Voltar/Avançar do navegador ──────
  history.pushState({ acs: true }, '');
  window.addEventListener('popstate', () => {
    const logado = sessionStorage.getItem('acs_dev_autenticado') === '1';
    if (logado) {
      // P1-D: customConfirm assíncrono — pushState de volta imediato para
      // evitar que o browser navegue enquanto o usuário decide.
      history.pushState({ acs: true }, '');
      customConfirm('Deseja realmente sair do ACS Neto?').then(sair => {
        if (sair) {
          // Remove o estado extra que adicionamos e navega de volta
          history.go(-2);
        }
        // Se não, já estamos com o estado correto — nada a fazer
      });
    } else {
      history.pushState({ acs: true }, '');
    }
  });

  const searchEl = _a$('search-domicilio');
  if (searchEl) searchEl.addEventListener('input', Render.onSearchInput);

  await inicializarContaPadrao();

  // ── Auto-login ────────────────────────────────────────────────
  const _autFlag = sessionStorage.getItem('acs_dev_autenticado') === '1';

  if (_autFlag) {
    const perfil = sessionStorage.getItem('acs_perfil');

    // Demo: persiste enquanto sessionStorage existir (mesma aba / reload)
    if (perfil === 'demo') {
      // Demo no auto-login: mantém modo plain
      SaveManager.setMode('plain');
      _a$('login-screen').classList.add('hidden');
      inicializarUiPosLogin();
      return;
    }

    // Neto: tenta restaurar chave criptográfica do sessionStorage
    if (perfil === 'neto') {
      try {
        const keyHex = sessionStorage.getItem('acs_session_key');
        if (keyHex) {
          const restoredKey = await crypto.subtle.importKey(
            'raw', hex2buf(keyHex),
            { name: 'AES-GCM', length: 256 },
            true, ['encrypt', 'decrypt']
          );
          CryptoModule.setKey(restoredKey);
          await decryptDb();
          // Chave restaurada com sucesso: ativa modo criptografado
          SaveManager.setMode('encrypted');
          _a$('login-screen').classList.add('hidden');
          inicializarUiPosLogin();
          return;
        }
      } catch(e) {
        console.warn('[ACS] Auto-login Neto falhou:', e);
      }
    }

    // Sessão expirada ou chave perdida — limpa tudo e pede login
    localStorage.removeItem('acs_dev_autenticado');
    sessionStorage.removeItem('acs_dev_autenticado');
    sessionStorage.removeItem('acs_session_key');
    sessionStorage.removeItem('acs_session_salt');
    sessionStorage.removeItem('acs_perfil');
  }

  // Mostra seleção de perfil
  _mostrarFormularios(true, false, false, false);
  inicializarUiPosLogin({ badge: true });
});

