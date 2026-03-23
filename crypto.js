// ╔══════════════════════════════════════════════════════════════╗
// ║  ACS Neto — CRYPTO.JS                                   ║
// ║  Criptografia AES-GCM 256-bit, PBKDF2, SHA-256              ║
// ╚══════════════════════════════════════════════════════════════╝
// ── inicializarUiPosLogin — ponto único para renders pós-login ───────────────
// Substitui o padrão repetido em 6 pontos de auth.js e crypto.js:
//   if (typeof renderDashboard === 'function') renderDashboard();
//   if (typeof renderFamilias  === 'function') renderFamilias();
//   atualizarBadgeHans(); // quando aplicável
function inicializarUiPosLogin(opcoes) {
  var cfg = Object.assign({ badge: true }, opcoes);
  if (typeof renderDashboard    === 'function') renderDashboard();
  if (typeof renderFamilias     === 'function') renderFamilias();
  if (cfg.badge) {
    if (typeof atualizarBadgeHans === 'function') atualizarBadgeHans();
  }
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('acs-theme', next); } catch(e) {}

  // Só re-renderiza se o usuário já está autenticado (evita chamar
  // inicializarUiPosLogin antes do login, o que poderia interferir
  // no estado da tela de login — especialmente no modo escuro)
  const logado = sessionStorage.getItem('acs_dev_autenticado') === '1';
  if (!logado) return;

  // Invalida snapshot para que o próximo render use dados frescos
  if (typeof DB !== 'undefined' && DB.invalidate) DB.invalidate();

  requestAnimationFrame(() => {
    inicializarUiPosLogin({ badge: false });
    // Em modo tablet, re-parenta overlays dinâmicos que o re-render
    // pode ter criado em document.body em vez de .app
    if (document.documentElement.getAttribute('data-modo') === 'tablet') {
      const app = document.querySelector('.app');
      if (app) {
        const ids = ['acsvi-overlay', 'toast-stack'];
        ids.forEach(id => {
          const el = document.getElementById(id);
          if (el && el.parentElement !== app) app.appendChild(el);
        });
        // Overlays sem id fixo: qualquer .modal-overlay appendado ao body
        document.querySelectorAll('body > .modal-overlay').forEach(el => app.appendChild(el));
      }
    }
  });
}
(function initTheme() {
  try {
    const saved = localStorage.getItem('acs-theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (saved === 'light' || !saved) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch(e) {}
})();

// ╔══════════════════════════════════════════════════════════════╗
// ║   ACS — SISTEMA DE AUTENTICAÇÃO + CRIPTOGRAFIA AES-GCM      ║
// ║   Senha: SHA-256 (hash) · Dados: AES-GCM 256-bit            ║
// ╚══════════════════════════════════════════════════════════════╝

const AUTH_KEY     = 'acs_auth_v1';
const RECOVER_KEY  = 'acs_recover_v1';
const DEFAULT_PASS = 'acs1234'; // Senha padrão inicial

// ── esc() — sanitização HTML obrigatória em template literals ──────────────
// Escapa os 5 caracteres especiais HTML antes de interpolar dados do usuário
// em innerHTML.  Regra: ${esc(x)} em vez de ${x} para qualquer dado livre.
function esc(v) {
  if (v == null) return '';
  return String(v)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

// ════════════════════════════════════════
// DARK MODE
// ════════════════════════════════════════


// ╔══════════════════════════════════════════════════════════════╗
// ║  CryptoModule — IIFE que isola a chave de sessão do escopo  ║
// ║  global. _sessionKey nunca é exposta em window.             ║
// ╚══════════════════════════════════════════════════════════════╝
const CryptoModule = (() => {
  let _sessionKey = null; // CryptoKey AES-GCM — nunca exposta globalmente

  // ── Utilitários de encoding ───────────────────────────────────
  const buf2hex = b => Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
  const hex2buf = h => {
    if (!h || typeof h !== 'string' || h.length % 2 !== 0) {
      console.warn('[ACS] hex2buf: entrada inválida', h);
      return new Uint8Array(0);
    }
    return new Uint8Array(h.match(/.{2}/g).map(x => parseInt(x, 16)));
  };
  const str2buf = s => new TextEncoder().encode(s);
  const buf2str = b => new TextDecoder().decode(b);

  // ── Hash SHA-256 ──────────────────────────────────────────────
  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', str2buf(text));
    return buf2hex(buf);
  }

  // ── Derivar CryptoKey AES-GCM via PBKDF2 ─────────────────────
  async function deriveKey(senha, salt) {
    const keyMaterial = await crypto.subtle.importKey(
      'raw', str2buf(senha), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // ── Criptografar texto ────────────────────────────────────────
  async function encryptText(plaintext) {
    if (!_sessionKey || !plaintext) return plaintext;
    try {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const enc = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, _sessionKey, str2buf(String(plaintext)));
      return 'ENC:' + buf2hex(iv) + ':' + buf2hex(enc);
    } catch(e) {
      console.warn('[ACS] Erro ao criptografar campo:', e);
      return plaintext; // retorna texto original — não perde o dado
    }
  }

  // ── Descriptografar texto ─────────────────────────────────────
  async function decryptText(ciphertext) {
    if (!_sessionKey || !ciphertext) return ciphertext;
    if (!String(ciphertext).startsWith('ENC:')) return ciphertext;
    try {
      const parts = ciphertext.split(':');
      // Formato esperado: ENC:<iv_hex>:<cipher_hex> — exige exatamente 3 partes não-vazias
      if (parts.length !== 3 || !parts[1] || !parts[2]) {
        console.warn('[ACS] decryptText: formato inválido, dado possivelmente corrompido');
        return '***';
      }
      const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: hex2buf(parts[1]) }, _sessionKey, hex2buf(parts[2]));
      return buf2str(dec);
    } catch(e) { console.warn('[ACS] Erro ao descriptografar:', e); return '***'; }
  }

  // ── Criptografar campos sensíveis de um indivíduo ─────────────
  async function encryptIndividuo(ind) {
    if (!_sessionKey) return ind;
    const out = { ...ind };
    if (out.nome)       out.nome       = await encryptText(out.nome);
    if (out.cpf)        out.cpf        = await encryptText(out.cpf);
    if (out.cns)        out.cns        = await encryptText(out.cns);
    if (out.nasc)       out.nasc       = await encryptText(out.nasc);
    if (out.mae)        out.mae        = await encryptText(out.mae);
    if (out.pai)        out.pai        = await encryptText(out.pai);
    if (out.nomeSocial) out.nomeSocial = await encryptText(out.nomeSocial);
    out._enc = true;
    return out;
  }

  // ── Descriptografar campos sensíveis de um indivíduo ──────────
  async function decryptIndividuo(ind) {
    if (!ind || !ind._enc) return ind;
    const out = { ...ind };
    out.nome       = await decryptText(out.nome);
    out.cpf        = await decryptText(out.cpf);
    out.cns        = await decryptText(out.cns);
    out.nasc       = await decryptText(out.nasc);
    out.mae        = await decryptText(out.mae);
    out.pai        = await decryptText(out.pai);
    out.nomeSocial = await decryptText(out.nomeSocial);
    out._enc = false;
    return out;
  }

  // ── Descriptografar db inteiro (em memória) ───────────────────
  async function decryptDb() {
    // const db é global mas não está em window — acessar diretamente
    const _db = (typeof db !== 'undefined' ? db : null);
    if (!_db) { console.error('[ACS] decryptDb: db nao definido'); return; }
    for (const id of Object.keys(_db.individuoById || {})) {
      const entry = _db.individuoById[id];
      if (!entry || typeof entry !== 'object') continue;
      if (entry._enc) _db.individuoById[id] = await decryptIndividuo(entry);
    }
    // Invalida o snapshot em cache para que o próximo render use os dados descriptografados
    if (typeof DB !== 'undefined' && DB.invalidate) DB.invalidate();
  }

  // ── Criptografar db inteiro (para salvar) ─────────────────────
  async function encryptDbForSave() {
    const _db = (typeof db !== 'undefined' ? db : null);
    if (!_db) { console.error('[ACS] encryptDbForSave: db nao definido'); return {}; }
    // structuredClone é mais rápido que JSON.parse/stringify para objetos grandes
    // e preserva tipos que JSON não suporta (Date, ArrayBuffer etc.)
    const clone = typeof structuredClone === 'function'
      ? structuredClone(_db)
      : JSON.parse(JSON.stringify(_db)); // fallback browsers antigos
    if (_sessionKey && clone.individuoById) {
      for (const id of Object.keys(clone.individuoById)) {
        const entry = clone.individuoById[id];
        if (!entry || typeof entry !== 'object') continue; // ignora entradas nulas
        if (!entry._enc) clone.individuoById[id] = await encryptIndividuo(entry);
      }
    }
    return clone;
  }

  return {
    sha256, deriveKey,
    encryptText, decryptText,
    encryptIndividuo, decryptIndividuo,
    decryptDb, encryptDbForSave,
    setKey:  k  => { _sessionKey = k; },
    hasKey:  () => !!_sessionKey,
    clearKey:() => { _sessionKey = null; }
  };
})();

// ── Compatibilidade: aliases globais para o restante do código ──────────────
// (permitem que as chamadas existentes funcionem sem refatoração completa)
const buf2hex = b => Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join(''); 
const hex2buf = h => { 
  if (!h || typeof h !== 'string' || h.length % 2 !== 0) {
    console.warn('[ACS] hex2buf: entrada inválida', h);
    return new Uint8Array(0);
  }
  return new Uint8Array(h.match(/.{2}/g).map(x => parseInt(x, 16)));
};
const str2buf = s => new TextEncoder().encode(s); 
const buf2str = b => new TextDecoder().decode(b); 
async function sha256(text)               { return CryptoModule.sha256(text); }
async function deriveKey(senha, salt)     { return CryptoModule.deriveKey(senha, salt); }
async function encryptText(p)             { return CryptoModule.encryptText(p); }
async function decryptText(c)             { return CryptoModule.decryptText(c); }
async function encryptIndividuo(ind)      { return CryptoModule.encryptIndividuo(ind); }
async function decryptIndividuo(ind)      { return CryptoModule.decryptIndividuo(ind); }
async function decryptDb()                { return CryptoModule.decryptDb(); }
async function encryptDbForSave()         { return CryptoModule.encryptDbForSave(); }

// ── saveSafe() — alias global para DB.saveSafe() ─────────────

