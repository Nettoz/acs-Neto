// ACS Neto — app-config.js
// Configurações do ACS, data/hora personalizada e máscaras de formulário
// Depende de: app-core.js, app-ui.js

// ── Valores-padrão de microárea — aplicados APENAS quando o campo está vazio.
// Diferente do comportamento anterior (que sobrescrevia sempre), agora o usuário
// pode editar esses campos e as alterações são preservadas.
const _CONFIG_DEFAULTS = {
  microarea: '09',
  esf:       'ESF Maria Heleny Matos Brandão',
  bairro:    'Santo Sátiro',
  municipio: 'Maracanaú',
  ibge:      '2307650',
  cnes:      '6900704',
};

function _preencherConfigDefaults() {
  let alterado = false;
  for (const [campo, valor] of Object.entries(_CONFIG_DEFAULTS)) {
    if (!db.config[campo]) { db.config[campo] = valor; alterado = true; }
  }
  // Atualiza o indicador de área na barra de topo
  const el = $id('acs-area');
  if (el) el.textContent = `Microárea ${db.config.microarea} · ${db.config.esf}`;
  return alterado;
}

function renderConfig() {
  const c = db.config;
  _preencherConfigDefaults();
  // Preencher inputs (compatibilidade com salvarConfig)
  const set = (id, val) => { const el = $id(id); if (el) el.value = val || ''; };
  set('cfg-nome',      c.nome);
  set('cfg-cpf',       c.cpf);
  set('cfg-cns',       c.cns);
  set('cfg-cbo',       c.cbo      || '515105');
  set('cfg-ine',       c.ine);
  set('cfg-esf',       c.esf);
  set('cfg-microarea', c.microarea);
  set('cfg-municipio', c.municipio);
  set('cfg-bairro',    c.bairro);
  set('cfg-cnes',      c.cnes);

  // Preencher card de visualização do perfil — esc() em todos os campos do usuário
  const view = $id('cfg-perfil-view');
  if (view) {
    const campos = [
      ['Nome', c.nome], ['CPF', c.cpf], ['CNS', c.cns],
      ['CBO', c.cbo || '515105'], ['INE', c.ine],
      ['ESF / UBS', c.esf], ['Microárea', c.microarea],
      ['Município', c.municipio],
      ['Bairro', c.bairro], ['CNES', c.cnes]
    ];
    view.innerHTML = campos.map(([label, val]) =>
      `<div style="min-width:0">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--slate-400);margin-bottom:2px">${esc(label)}</div>
        <div style="font-size:13px;font-weight:600;color:var(--slate-800);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${val ? esc(val) : '<span style="color:var(--slate-400);font-weight:400">—</span>'}</div>
      </div>`
    ).join('');
  }
  // Atualizar card de sistema — async, fire-and-forget intencional
  if (typeof _cfgAtualizarSistema === 'function') _cfgAtualizarSistema();
}

function abrirModalEditarPerfil() {
  const c = db.config;
  const d = _CONFIG_DEFAULTS;
  const set = (id, val) => { const el = $id(id); if (el) el.value = val || ''; };
  set('mp-nome',      c.nome);
  set('mp-cpf',       c.cpf);
  set('mp-cns',       c.cns);
  set('mp-cbo',       c.cbo      || '515105');
  set('mp-ine',       c.ine);
  set('mp-esf',       c.esf      || d.esf);
  set('mp-microarea', c.microarea|| d.microarea);
  set('mp-municipio', c.municipio|| d.municipio);
  set('mp-bairro',    c.bairro   || d.bairro);
  set('mp-cnes',      c.cnes     || d.cnes);
  openModal('modal-editar-perfil');
}

function salvarPerfilModal() {
  const get = id => ($id(id)?.value || '').trim();
  db.config.nome      = get('mp-nome');
  db.config.cpf       = get('mp-cpf');
  db.config.cns       = get('mp-cns');
  db.config.cbo       = get('mp-cbo') || '515105';
  db.config.ine       = get('mp-ine');
  db.config.esf       = get('mp-esf');
  db.config.microarea = get('mp-microarea');
  db.config.municipio = get('mp-municipio');
  db.config.bairro    = get('mp-bairro');
  db.config.cnes      = get('mp-cnes');
  // Sync hidden inputs
  const sync = (cfg, mp) => { const el = $id(cfg); if (el) el.value = $id(mp)?.value || ''; };
  sync('cfg-nome','mp-nome'); sync('cfg-cpf','mp-cpf'); sync('cfg-cns','mp-cns');
  sync('cfg-cbo','mp-cbo');   sync('cfg-ine','mp-ine'); sync('cfg-esf','mp-esf');
  sync('cfg-microarea','mp-microarea'); sync('cfg-municipio','mp-municipio');
  sync('cfg-bairro','mp-bairro'); sync('cfg-cnes','mp-cnes');
  save();
  // Atualizar view e identificadores na UI
  renderConfig();
  const nomeEl = $id('acs-nome');
  if (nomeEl) nomeEl.textContent = db.config.nome || 'ACS';
  const areaEl = $id('acs-area');
  if (areaEl) areaEl.textContent = `Microárea ${db.config.microarea} · ${db.config.esf}`;
  const dashNome = $id('dash-acs-nome');
  if (dashNome) dashNome.textContent = db.config.nome || 'ACS';
  closeModal('modal-editar-perfil');
  toast('✓ Perfil atualizado com sucesso!', 'success');
}
function salvarConfig() {
  const get = id => ($id(id)?.value || '').trim();
  db.config.nome      = get('cfg-nome');
  db.config.cpf       = get('cfg-cpf');
  db.config.cns       = get('cfg-cns');
  db.config.cbo       = get('cfg-cbo')      || '515105';
  db.config.ine       = get('cfg-ine');
  db.config.esf       = get('cfg-esf');
  db.config.microarea = get('cfg-microarea');
  db.config.municipio = get('cfg-municipio');
  db.config.bairro    = get('cfg-bairro');
  db.config.cnes      = get('cfg-cnes');
  save();
  const st = $id('cfg-save-status');
  if (st) { st.style.display = 'inline'; setTimeout(() => { st.style.display = 'none'; }, 2000); }
  toast('✓ Dados do ACS salvos com sucesso!', 'success');
}

// hoje() — retorna data atual do dispositivo em formato ISO (YYYY-MM-DD)
function hoje() {
  return new Date().toISOString().split('T')[0];
}

// ===== DOMICÍLIO =====

function gerarProximoProntuario() {
  const numeros = getFamilias()
    .map(f => { const m = (f.prontuario || '').match(/\d+/); return m ? parseInt(m[0]) : 0; })
    .filter(n => !isNaN(n));
  const proximo = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
  return 'FAM-' + proximo.toString().padStart(3, '0');
}

// ── Máscaras de formatação CPF e CNS ──────────────────────────────
function mascaraCPF(v) {
  v = v.replace(/\D/g,'').substring(0,11);
  if (v.length > 9) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/,'$1.$2.$3-$4');
  if (v.length > 6) return v.replace(/(\d{3})(\d{3})(\d{1,3})/,'$1.$2.$3');
  if (v.length > 3) return v.replace(/(\d{3})(\d{1,3})/,'$1.$2');
  return v;
}
function mascaraCNS(v) {
  return v.replace(/\D/g,'').substring(0,15);
}
function ativarMascarasFormulario() {
  const cpfEl = $id('ind-cpf');
  const cnsEl = $id('ind-cns');
  if (cpfEl && !cpfEl._maskActive) {
    cpfEl.addEventListener('input', function() { const c = this.selectionStart; this.value = mascaraCPF(this.value); });
    cpfEl._maskActive = true;
  }
  if (cnsEl && !cnsEl._maskActive) {
    cnsEl.addEventListener('input', function() { this.value = mascaraCNS(this.value); });
    cnsEl._maskActive = true;
  }
}
function mascaraCEP(input) {
  let v = input.value.replace(/\D/g, '');
  if (v.length > 5) v = v.substring(0, 5) + '-' + v.substring(5, 8);
  input.value = v;
}


// ── Card de sistema em Configurações ──────────────────────────────────────────
async function _cfgAtualizarSistema() {
  const $s = id => document.getElementById(id);

  // Estimar tamanho do banco via IndexedDB (ou fallback localStorage)
  let usedKB = 0;
  let storageLabel = 'IndexedDB';
  try {
    const raw = await DB.idbGet('db');
    if (raw) {
      usedKB = Math.round(new Blob([raw]).size / 1024);
    } else {
      // Fallback: medir pelo localStorage se IDB ainda não tem o banco
      const ls = localStorage.getItem('acs_db_v5') || '';
      usedKB = Math.round(new Blob([ls]).size / 1024);
      storageLabel = 'localStorage';
    }
  } catch(e) {
    try {
      const ls = localStorage.getItem('acs_db_v5') || '';
      usedKB = Math.round(new Blob([ls]).size / 1024);
      storageLabel = 'localStorage';
    } catch(_) {}
  }

  // Para IDB não há limite fixo de 5 MB; mostrar apenas o tamanho usado
  if ($s('cfg-ls-usado'))  $s('cfg-ls-usado').textContent  = usedKB + ' KB (' + storageLabel + ')';
  if ($s('cfg-ls-pct'))    $s('cfg-ls-pct').textContent    = '–';
  if ($s('cfg-ls-bar')) {
    $s('cfg-ls-bar').style.width      = '0%';
    $s('cfg-ls-bar').style.background = 'var(--emerald-500)';
  }

  // Contagens
  if ($s('cfg-ct-familias'))  $s('cfg-ct-familias').textContent  = Object.keys(db.familiaById||{}).length;
  if ($s('cfg-ct-individuos')) $s('cfg-ct-individuos').textContent = Object.keys(db.individuoById||{}).length;
  if ($s('cfg-ct-visitas'))   $s('cfg-ct-visitas').textContent   = (db.visitas||[]).length;
  if ($s('cfg-ct-pendencias')) {
    const abertas = (db.pendencias||[]).filter(p => !p.done).length;
    $s('cfg-ct-pendencias').textContent = abertas;
  }

  // Device info
  const devEl = $s('cfg-device-info');
  if (devEl) {
    const nav = navigator;
    const dpr = window.devicePixelRatio ? window.devicePixelRatio.toFixed(2) : '–';
    const mem = nav.deviceMemory ? nav.deviceMemory + ' GB' : '–';
    const cores = nav.hardwareConcurrency || '–';
    const vw = window.innerWidth + '×' + window.innerHeight + ' px';
    const ua = nav.userAgent.match(/Chrome\/([\d.]+)/);
    const chrome = ua ? 'Chrome ' + ua[1].split('.')[0] : '–';
    const android = nav.userAgent.match(/Android ([\d.]+)/);
    const andVer = android ? 'Android ' + android[1] : (nav.platform || '–');
    devEl.innerHTML = [
      ['Viewport', vw],
      ['Pixel Ratio', dpr],
      ['RAM', mem],
      ['CPU cores', cores],
      ['Navegador', chrome],
      ['Sistema', andVer],
    ].map(([k,v]) => `<span style="color:var(--slate-600);font-weight:600">${k}:</span><span>${v}</span>`).join('');
  }
}

