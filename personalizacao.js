/* ═══════════════════════════════════════════════════════════════════
   ACS Neto — personalizacao.js  v1.0
   Injeção externa: <script src="personalizacao.js" defer></script>
   ─ Adiciona aba "Personalização" em Configurações
   ─ Controles: tema, fonte, escala, cores, layout, ícones
   ─ Mapa completo de ícones PNG + Emoji via icons_map.json
   ═══════════════════════════════════════════════════════════════════ */
(function (W) {
  'use strict';

  var SK  = 'acs_personalizacao';
  var MK  = 'acs_icones_custom';   // mapa de substituições de emoji→png

  /* ── 1. DEFAULTS ─────────────────────────────────────────────── */
  var DEF = {
    tema:           'light',
    fonte:          'Outfit',
    fonteDisplay:   'DM Sans',
    escala:         100,   // %
    densidadeUI:    'normal',
    raioCard:       16,    // px
    sidebarLargura: 240,   // px
    corPrimaria:    '#FF7533',
    corSecundaria:  '#8445CC',
  };

  /* ── 2. CATÁLOGO DE FONTES ───────────────────────────────────── */
  var FONTES = [
    { id:'Outfit',            label:'Outfit',              g:'Outfit:wght@400;500;600;700;800' },
    { id:'DM Sans',           label:'DM Sans',             g:'DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,700;0,9..40,800' },
    { id:'Plus Jakarta Sans', label:'Plus Jakarta Sans',   g:'Plus+Jakarta+Sans:wght@400;500;600;700;800;900' },
    { id:'Inter',             label:'Inter',               g:'Inter:wght@400;500;600;700;800' },
    { id:'Nunito',            label:'Nunito',              g:'Nunito:wght@400;600;700;800;900' },
    { id:'Poppins',           label:'Poppins',             g:'Poppins:wght@400;500;600;700;800' },
    { id:'Figtree',           label:'Figtree',             g:'Figtree:wght@400;500;600;700;800;900' },
    { id:'Lato',              label:'Lato',                g:'Lato:wght@400;700;900' },
    { id:'Source Sans 3',     label:'Source Sans 3',       g:'Source+Sans+3:wght@400;600;700;900' },
    { id:'Noto Sans',         label:'Noto Sans',           g:'Noto+Sans:wght@400;600;700;800' },
    { id:'Roboto',            label:'Roboto',              g:'Roboto:wght@400;500;700;900' },
    { id:'system-ui',         label:'Sistema (sem Google)', g:null },
  ];

  /* ── 3. PALETAS PRESET ──────────────────────────────────────── */
  var PALETAS = [
    { id:'padrao',  label:'Laranja (Padrão)',  p:'#FF7533', s:'#8445CC' },
    { id:'azul',    label:'Azul Médico',       p:'#0891b2', s:'#2563eb' },
    { id:'verde',   label:'Verde Saúde',       p:'#059669', s:'#0891b2' },
    { id:'roxo',    label:'Roxo',              p:'#7c3aed', s:'#e11d48' },
    { id:'rosa',    label:'Rosa Coral',        p:'#db2777', s:'#7c3aed' },
    { id:'indigo',  label:'Índigo',            p:'#4f46e5', s:'#0891b2' },
    { id:'teal',    label:'Teal',              p:'#0d9488', s:'#7c3aed' },
  ];

  /* ── 4. HELPER DE COR ───────────────────────────────────────── */
  function h2r(h){
    var r=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
    return r?{r:parseInt(r[1],16),g:parseInt(r[2],16),b:parseInt(r[3],16)}:null;
  }
  function r2h(r,g,b){
    return '#'+[r,g,b].map(function(v){
      return Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0');
    }).join('');
  }
  function lighten(h,a){
    var c=h2r(h); if(!c)return h;
    return r2h(c.r+(255-c.r)*a, c.g+(255-c.g)*a, c.b+(255-c.b)*a);
  }
  function rgba(h,a){
    var c=h2r(h); if(!c)return h;
    return 'rgba('+c.r+','+c.g+','+c.b+','+a+')';
  }

  /* ── 5. ESTADO ──────────────────────────────────────────────── */
  var cfg = {};
  var iconMap = null;
  var _fontLink = null;
  var _styleTag = null;

  function load(){
    try{ cfg=Object.assign({},DEF,JSON.parse(localStorage.getItem(SK)||'{}')); }
    catch(e){ cfg=Object.assign({},DEF); }
  }
  function save(){
    try{ localStorage.setItem(SK,JSON.stringify(cfg)); }catch(e){}
  }

  /* ── 6. APLICAR AO DOM ──────────────────────────────────────── */
  function apply(){
    var root = document.documentElement;
    var isTablet = root.getAttribute('data-modo') === 'tablet';

    // Tema
    root.setAttribute('data-theme', cfg.tema);

    // Escala tipográfica — em modo tablet os tokens vêm de styles-tablet.css
    if (!isTablet) {
      var s = cfg.escala/100;
      var sizes = {
        '--text-2xs': 11*s,
        '--text-xs':  13*s,
        '--text-sm':  14*s,
        '--text-base':16*s,
        '--text-md':  18*s,
        '--text-lg':  22*s,
        '--text-xl':  26*s,
        '--text-2xl': 34*s,
      };
      Object.keys(sizes).forEach(function(k){
        root.style.setProperty(k, sizes[k].toFixed(1)+'px');
      });

      // Densidade — apenas em PC
      var d = cfg.densidadeUI;
      var h = d==='compact'?{btn:'36px',inp:'34px',nav:'38px',sp:'14px',pad:'12px'}
             :d==='comfortable'?{btn:'52px',inp:'48px',nav:'52px',sp:'22px',pad:'22px'}
             :{btn:'44px',inp:'40px',nav:'44px',sp:'18px',pad:'18px'};
      root.style.setProperty('--h-btn',   h.btn);
      root.style.setProperty('--h-input', h.inp);
      root.style.setProperty('--h-nav',   h.nav);
      root.style.setProperty('--sp-4',    h.sp);
      root.style.setProperty('--p-card',  h.pad);

      // Raio — apenas em PC
      var r = cfg.raioCard;
      root.style.setProperty('--r-xs', Math.max(2,r-10)+'px');
      root.style.setProperty('--r-sm', Math.max(4,r-6)+'px');
      root.style.setProperty('--r-md', Math.max(6,r-2)+'px');
      root.style.setProperty('--r-lg', r+'px');
      root.style.setProperty('--r-xl', (r+8)+'px');
      root.style.setProperty('--radius-sm', Math.max(4,r-6)+'px');
      root.style.setProperty('--radius-md', Math.max(6,r-2)+'px');
      root.style.setProperty('--radius-lg', r+'px');
      root.style.setProperty('--radius-clean', Math.max(6,r-2)+'px');
    }

    // Sidebar — não sobrescreve em modo tablet (sidebar é overlay gerenciada por app-modo.js)
    if (document.documentElement.getAttribute('data-modo') !== 'tablet') {
      root.style.setProperty('--sidebar-w', cfg.sidebarLargura+'px');
    }

    // Cores primária
    var p = cfg.corPrimaria;
    [
      ['--orange-700',p],['--orange-600',p],['--orange-500',p],
      ['--orange-400',lighten(p,.2)],['--orange-300',lighten(p,.4)],
      ['--orange-bg',rgba(p,.12)],['--orange-bdr',rgba(p,.28)],
      ['--laranja',p],['--laranja-cl',lighten(p,.2)],
      ['--laranja-bg',rgba(p,.1)],['--laranja-fraco',rgba(p,.08)],
      ['--accent',p],['--amarelo',p],['--amarelo-cl',lighten(p,.2)],
      ['--amarelo-bg',rgba(p,.1)],['--amarelo-bdr',rgba(p,.22)],
      ['--amarelo-fraco',rgba(p,.08)],['--ciano',p],
      ['--ciano-bg',rgba(p,.1)],['--sh-orange','0 4px 18px '+rgba(p,.3)],
    ].forEach(function(x){ root.style.setProperty(x[0],x[1]); });

    // Cores secundária
    var sc = cfg.corSecundaria;
    [
      ['--violet-800',sc],['--violet-700',sc],['--violet-600',sc],
      ['--violet-500',lighten(sc,.15)],['--violet-400',lighten(sc,.3)],
      ['--violet-bg',rgba(sc,.12)],['--violet-bdr',rgba(sc,.28)],
      ['--azul',sc],['--azul-cl',lighten(sc,.3)],
      ['--azul-bg',rgba(sc,.12)],['--azul-bdr',rgba(sc,.28)],
      ['--azul-fraco',rgba(sc,.1)],['--azul-claro',lighten(sc,.3)],
      ['--roxo',sc],['--roxo-bg',rgba(sc,.12)],
      ['--sh-violet','0 4px 18px '+rgba(sc,.3)],
    ].forEach(function(x){ root.style.setProperty(x[0],x[1]); });

    // Fonte
    applyFonte(cfg.fonte, cfg.fonteDisplay);

    // Injetar CSS de substituição de emojis
    applyIconCSS();
  }

  function applyFonte(f, fd){
    var root = document.documentElement;
    root.style.setProperty('--font',         '"'+f+'","'+fd+'",system-ui,sans-serif');
    root.style.setProperty('--font-display', '"'+fd+'","'+f+'",system-ui,sans-serif');
    document.body && (document.body.style.fontFamily='"'+f+'",system-ui,sans-serif');

    var fo  = FONTES.find(function(x){return x.id===f;});
    var fdo = FONTES.find(function(x){return x.id===fd;});
    var load=[];
    if(fo  && fo.g)  load.push(fo.g);
    if(fdo && fdo.g && fdo.id!==f) load.push(fdo.g);
    if(load.length){
      var url='https://fonts.googleapis.com/css2?family='+load.join('&family=')+'&display=swap';
      if(!_fontLink){
        _fontLink=document.createElement('link');
        _fontLink.rel='stylesheet';
        document.head.appendChild(_fontLink);
      }
      if(_fontLink.href!==url) _fontLink.href=url;
    }
  }

  /* ── 7. CSS DE SUBSTITUIÇÃO DE ÍCONES EMOJI ─────────────────── */
  function applyIconCSS(){
    var overrides = {};
    try{ overrides=JSON.parse(localStorage.getItem(MK)||'{}'); }catch(e){}
    if(!_styleTag){
      _styleTag=document.createElement('style');
      _styleTag.id='acs-icon-overrides';
      document.head.appendChild(_styleTag);
    }
    // CSS que substitui text nodes com emojis via pseudo-content
    // Implementado via data-acs-icon: o JS de render já usa a função resolveIcon()
    _styleTag.textContent='/* icon overrides: '+Object.keys(overrides).length+' */';
  }

  /* resolveIcon(emoji) — retorna src PNG se substituído, ou null */
  function resolveIcon(emoji){
    var overrides={};
    try{ overrides=JSON.parse(localStorage.getItem(MK)||'{}'); }catch(e){}
    return overrides[emoji]||null;
  }
  W.acsResolveIcon = resolveIcon;

  /* ── 8. CARREGAR icons_map.json ─────────────────────────────── */
  function loadIconMap(cb){
    if(iconMap){cb(iconMap);return;}
    fetch('icones/icons.json')
      .then(function(r){return r.json();})
      .then(function(d){iconMap=d;cb(d);})
      .catch(function(){cb(null);});
  }

  /* ── 9. HTML DO PAINEL ──────────────────────────────────────── */
  function buildPanelHTML(){
    return (
      /* TEMA */
      '<div class="pers-block">' +
        '<div class="pers-block-title">🌗 Tema</div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
          ['light','dark'].map(function(t){
            return '<label class="pers-radio-card" style="min-width:120px">' +
              '<input type="radio" name="pers-tema" value="'+t+'" '+(cfg.tema===t?'checked':'')+' onchange="ACSPersonalizacao.set(\'tema\',this.value)">' +
              '<span class="pers-rc-inner">' +
                (t==='light'
                  ? '<span style="font-size:24px">☀️</span><strong>Claro</strong>'
                  : '<span style="font-size:24px">🌙</span><strong>Escuro</strong>') +
              '</span></label>';
          }).join('') +
        '</div>' +
      '</div>' +

      /* FONTE */
      '<div class="pers-block">' +
        '<div class="pers-block-title">🔤 Fonte do Sistema</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
          '<div class="form-group">' +
            '<label>Fonte Principal</label>' +
            '<select class="input" id="pers-fonte" onchange="ACSPersonalizacao.set(\'fonte\',this.value)">' +
              FONTES.map(function(f){
                return '<option value="'+f.id+'" '+(cfg.fonte===f.id?'selected':'')+' style="font-family:\''+f.id+'\'">'+f.label+'</option>';
              }).join('') +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Fonte de Títulos</label>' +
            '<select class="input" id="pers-fonte-display" onchange="ACSPersonalizacao.set(\'fonteDisplay\',this.value)">' +
              FONTES.map(function(f){
                return '<option value="'+f.id+'" '+(cfg.fonteDisplay===f.id?'selected':'')+' style="font-family:\''+f.id+'\'">'+f.label+'</option>';
              }).join('') +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div id="pers-fonte-preview" style="margin-top:10px;padding:12px 16px;border-radius:10px;background:var(--surface-2);border:1px solid var(--bdr)">' +
          '<div style="font-family:var(--font-display);font-size:20px;font-weight:800;color:var(--slate-900);margin-bottom:4px">ACS Neto — Título de Exemplo</div>' +
          '<div style="font-family:var(--font);font-size:14px;color:var(--slate-600)">Texto de corpo: paciente cadastrado com sucesso na microárea 09.</div>' +
        '</div>' +
      '</div>' +

      /* TAMANHO */
      '<div class="pers-block">' +
        '<div class="pers-block-title">🔡 Tamanho do Texto</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
          [[85,'Muito Pequeno'],[90,'Pequeno'],[95,'Médio-'],[100,'Normal'],[110,'Grande'],[120,'Muito Grande']].map(function(x){
            return '<label class="pers-radio-card">' +
              '<input type="radio" name="pers-escala" value="'+x[0]+'" '+(cfg.escala===x[0]?'checked':'')+' onchange="ACSPersonalizacao.set(\'escala\',+this.value)">' +
              '<span class="pers-rc-inner" style="min-width:72px;text-align:center">' +
                '<span style="font-size:'+Math.round(14*x[0]/100)+'px;font-weight:700">Aa</span>' +
                '<span style="font-size:11px;margin-top:2px">'+x[1]+'</span>' +
              '</span></label>';
          }).join('') +
        '</div>' +
        '<div style="font-size:11px;color:var(--slate-500)">Atual: <strong id="pers-escala-label">'+cfg.escala+'%</strong></div>' +
      '</div>' +

      /* CORES */
      '<div class="pers-block">' +
        '<div class="pers-block-title">🎨 Cores do Sistema</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px" id="pers-paletas">' +
          PALETAS.map(function(pl){
            var ativo=(cfg.corPrimaria===pl.p&&cfg.corSecundaria===pl.s);
            return '<button class="pers-paleta-btn'+(ativo?' pers-paleta-ativo':'')+'" '+
              'onclick="ACSPersonalizacao.aplicarPaleta(\''+pl.id+'\')" '+
              'style="--pp:'+pl.p+';--ps:'+pl.s+'">' +
              '<span class="pers-paleta-dot" style="background:'+pl.p+'"></span>' +
              '<span class="pers-paleta-dot" style="background:'+pl.s+'"></span>' +
              '<span>'+pl.label+'</span>' +
            '</button>';
          }).join('') +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
          '<div class="form-group">' +
            '<label>Cor Primária (botões, destaques)</label>' +
            '<div style="display:flex;gap:8px;align-items:center">' +
              '<input type="color" id="pers-cor-p" class="pers-color-input" value="'+cfg.corPrimaria+'" oninput="ACSPersonalizacao.set(\'corPrimaria\',this.value)">' +
              '<input type="text" class="input" id="pers-cor-p-hex" value="'+cfg.corPrimaria+'" placeholder="#FF7533" maxlength="7" oninput="ACSPersonalizacao.syncColorHex(\'p\',this.value)">' +
            '</div>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Cor Secundária (badges, tags)</label>' +
            '<div style="display:flex;gap:8px;align-items:center">' +
              '<input type="color" id="pers-cor-s" class="pers-color-input" value="'+cfg.corSecundaria+'" oninput="ACSPersonalizacao.set(\'corSecundaria\',this.value)">' +
              '<input type="text" class="input" id="pers-cor-s-hex" value="'+cfg.corSecundaria+'" placeholder="#8445CC" maxlength="7" oninput="ACSPersonalizacao.syncColorHex(\'s\',this.value)">' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div id="pers-cor-preview" style="margin-top:12px;padding:12px;border-radius:10px;background:var(--surface-2);border:1px solid var(--bdr);display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
          '<button class="btn btn-primary" style="pointer-events:none">Botão Primário</button>' +
          '<button class="btn btn-success" style="pointer-events:none">Botão Secundário</button>' +
          '<span style="padding:4px 12px;border-radius:99px;background:var(--orange-bg);color:var(--orange-600);font-size:12px;font-weight:700">Badge</span>' +
          '<span style="padding:4px 12px;border-radius:99px;background:var(--violet-bg);color:var(--violet-600);font-size:12px;font-weight:700">Tag</span>' +
          '<div class="nav-badge">5</div>' +
        '</div>' +
      '</div>' +

      /* LAYOUT */
      '<div class="pers-block">' +
        '<div class="pers-block-title">📐 Layout e Espaçamento</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">' +
          /* Densidade */
          '<div class="form-group">' +
            '<label>Densidade da Interface</label>' +
            '<select class="input" id="pers-densidade" onchange="ACSPersonalizacao.set(\'densidadeUI\',this.value)">' +
              [['compact','Compacta'],['normal','Normal'],['comfortable','Confortável']].map(function(x){
                return '<option value="'+x[0]+'" '+(cfg.densidadeUI===x[0]?'selected':'')+'>'+x[1]+'</option>';
              }).join('') +
            '</select>' +
          '</div>' +
          /* Raio */
          '<div class="form-group">' +
            '<label>Arredondamento dos Cards (<span id="pers-raio-val">'+cfg.raioCard+'</span>px)</label>' +
            '<input type="range" id="pers-raio" min="0" max="28" value="'+cfg.raioCard+'" style="width:100%;accent-color:var(--orange-500)" oninput="ACSPersonalizacao.set(\'raioCard\',+this.value);document.getElementById(\'pers-raio-val\').textContent=this.value">' +
          '</div>' +
          /* Sidebar */
          '<div class="form-group">' +
            '<label>Largura da Sidebar (<span id="pers-sw-val">'+cfg.sidebarLargura+'</span>px)</label>' +
            '<input type="range" id="pers-sw" min="180" max="320" value="'+cfg.sidebarLargura+'" style="width:100%;accent-color:var(--orange-500)" oninput="ACSPersonalizacao.set(\'sidebarLargura\',+this.value);document.getElementById(\'pers-sw-val\').textContent=this.value">' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* ÍCONES */
      '<div class="pers-block">' +
        '<div class="pers-block-title">🖼️ Ícones e Elementos Visuais</div>' +
        '<p style="font-size:12px;color:var(--slate-500);margin-bottom:10px">' +
          'Todos os ícones PNG e emojis usados no sistema. Para substituir um PNG, coloque o novo arquivo em <code>icons/</code> com o mesmo nome. ' +
          'Para substituir um emoji por imagem PNG, baixe o <code>icons_map.json</code> e coloque o PNG na pasta <code>icons/</code>.' +
        '</p>' +
        '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">' +
          '<button class="btn btn-secondary btn-sm" onclick="ACSPersonalizacao.showIconTab(\'png\')">🖼️ Ícones PNG</button>' +
          '<button class="btn btn-secondary btn-sm" onclick="ACSPersonalizacao.showIconTab(\'emoji\')">😀 Emojis</button>' +
          '<button class="btn btn-secondary btn-sm" onclick="ACSPersonalizacao.downloadIconMap()">⬇ Baixar icons.json</button>' +
        '</div>' +
        '<div id="pers-icon-container" style="max-height:340px;overflow-y:auto;border-radius:10px;border:1px solid var(--bdr);background:var(--surface-2);padding:10px">' +
          '<div style="color:var(--slate-500);font-size:13px;text-align:center;padding:20px">Clique em "Ícones PNG" ou "Emojis" para carregar a lista</div>' +
        '</div>' +
      '</div>' +

      /* AÇÕES */
      '<div class="pers-block" style="border:none;padding-top:0">' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
          '<button class="btn btn-primary" onclick="ACSPersonalizacao.salvar()">✓ Salvar Personalização</button>' +
          '<button class="btn btn-secondary" onclick="ACSPersonalizacao.resetar()">↺ Restaurar Padrões</button>' +
        '</div>' +
      '</div>'
    );
  }

  /* ── 10. INJETAR NA PÁGINA ──────────────────────────────────── */
  function inject(){
    // 10a. Injetar CSS do painel
    injectCSS();

    // 10b. Aguardar DOM + app carregado
    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      var cfgPage = document.getElementById('page-configuracoes');
      var cfgGrid = cfgPage && cfgPage.querySelector('.cfg-grid');
      var accSlot = document.getElementById('pers-accordion-slot');
      if(cfgGrid || accSlot || tries>40){
        clearInterval(timer);
        var currentTheme = document.documentElement.getAttribute('data-theme');
        if(currentTheme) cfg.tema = currentTheme;
        if(accSlot) injectPanel(null);
        else if(cfgGrid) injectPanel(cfgGrid);
        apply();
      }
    }, 200);
  }

  function injectPanel(cfgGrid){
    // Já injetado?
    if(document.getElementById('pers-panel')) return;

    // Tentar injetar no slot do acordeão (nova layout)
    var slot = document.getElementById('pers-accordion-slot');
    if(slot){
      slot.innerHTML = '<div id="pers-panel-body">' + buildPanelHTML() + '</div>';
      slot.id = 'pers-panel'; // reusa o id para guardar estado de "já injetado"
      return;
    }

    // Fallback: criar card no cfg-grid (layout legado)
    var card = document.createElement('div');
    card.className = 'card';
    card.id = 'pers-panel';
    card.style.cssText = 'grid-column:1/3';
    card.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">' +
        '<div class="card-title" style="margin:0">' +
          '<span style="font-size:22px">🎨</span> Personalização' +
        '</div>' +
        '<span style="font-size:11px;padding:3px 10px;border-radius:99px;background:var(--orange-bg);color:var(--orange-600);font-weight:700">NOVO</span>' +
      '</div>' +
      '<div id="pers-panel-body">' + buildPanelHTML() + '</div>';

    // Inserir antes do primeiro filho (topo do cfg-grid)
    cfgGrid.insertBefore(card, cfgGrid.firstChild);
  }

  function injectCSS(){
    if(document.getElementById('pers-styles')) return;
    var s = document.createElement('style');
    s.id = 'pers-styles';
    s.textContent = [
      '.pers-block{background:var(--surface-2);border:1px solid var(--bdr);border-radius:var(--r-md);padding:10px;margin-bottom:8px}',
      '.pers-block-title{font-size:14px;font-weight:800;color:var(--slate-900);margin-bottom:8px;display:flex;align-items:center;gap:8px}',
      '.pers-radio-card{cursor:pointer;display:inline-block}',
      '.pers-radio-card input{position:absolute;opacity:0;width:0;height:0}',
      '.pers-rc-inner{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 14px;border-radius:10px;border:2px solid var(--bdr);background:var(--surface);color:var(--slate-700);font-size:12px;transition:all .15s;min-width:64px;text-align:center}',
      '.pers-radio-card input:checked ~ .pers-rc-inner{border-color:var(--orange-500);background:var(--orange-bg);color:var(--orange-600)}',
      '.pers-rc-inner:hover{border-color:var(--orange-400);background:var(--orange-bg)}',
      '.pers-color-input{width:44px;height:40px;border:none;border-radius:8px;cursor:pointer;padding:2px;background:var(--surface-2)}',
      '.pers-paleta-btn{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:10px;border:2px solid var(--bdr);background:var(--surface);cursor:pointer;font-size:12px;font-weight:600;color:var(--slate-700);font-family:var(--font);transition:all .15s}',
      '.pers-paleta-btn:hover{border-color:var(--orange-400);transform:translateY(-1px)}',
      '.pers-paleta-ativo{border-color:var(--orange-500)!important;background:var(--orange-bg)!important;color:var(--orange-600)!important}',
      '.pers-paleta-dot{width:14px;height:14px;border-radius:50%;flex-shrink:0}',
      '.pers-icon-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px}',
      '.pers-icon-item{display:flex;flex-direction:column;align-items:center;gap:5px;padding:8px 4px;border-radius:8px;border:1px solid var(--bdr);background:var(--surface);cursor:default;transition:all .15s}',
      '.pers-icon-item:hover{border-color:var(--orange-400);transform:translateY(-1px)}',
      '.pers-icon-label{font-size:9px;color:var(--slate-500);text-align:center;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;max-width:84px}',
      '.pers-icon-name{font-size:9px;color:var(--slate-400);font-family:monospace;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%}',
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ── 11. API PÚBLICA ────────────────────────────────────────── */
  var API = {
    set: function(key, val){
      cfg[key] = val;
      apply();
      // Sync UI inputs
      var el;
      if(key==='corPrimaria'){
        el=document.getElementById('pers-cor-p'); if(el)el.value=val;
        el=document.getElementById('pers-cor-p-hex'); if(el)el.value=val;
      }
      if(key==='corSecundaria'){
        el=document.getElementById('pers-cor-s'); if(el)el.value=val;
        el=document.getElementById('pers-cor-s-hex'); if(el)el.value=val;
      }
      if(key==='raioCard'){
        el=document.getElementById('pers-raio'); if(el)el.value=val;
        el=document.getElementById('pers-raio-val'); if(el)el.textContent=val;
      }
      if(key==='sidebarLargura'){
        el=document.getElementById('pers-sw'); if(el)el.value=val;
        el=document.getElementById('pers-sw-val'); if(el)el.textContent=val;
      }
      if(key==='escala'){
        el=document.getElementById('pers-escala-label'); if(el)el.textContent=val+'%';
      }
    },

    syncColorHex: function(which, val){
      if(!/^#[0-9a-f]{6}$/i.test(val)) return;
      var key = which==='p'?'corPrimaria':'corSecundaria';
      cfg[key]=val;
      var picker=document.getElementById('pers-cor-'+(which==='p'?'p':'s'));
      if(picker) picker.value=val;
      apply();
    },

    aplicarPaleta: function(id){
      var pl=PALETAS.find(function(x){return x.id===id;});
      if(!pl) return;
      cfg.corPrimaria  = pl.p;
      cfg.corSecundaria= pl.s;
      apply();
      // Re-render painel para atualizar seleção
      var body=document.getElementById('pers-panel-body');
      if(body) body.innerHTML=buildPanelHTML();
    },

    salvar: function(){
      save();
      if(typeof window.toast==='function') toast('✓ Personalização salva!','success'); else alert('Personalização salva!');
    },

    resetar: function(){
      if(!confirm('Restaurar todas as configurações visuais para o padrão?')) return;
      cfg=Object.assign({},DEF);
      save();
      apply();
      var body=document.getElementById('pers-panel-body');
      if(body) body.innerHTML=buildPanelHTML();
      if(typeof window.toast==='function') toast('↺ Padrões restaurados','success'); },

    downloadIconMap: function(){
      fetch('icones/icons.json')
        .then(function(r){return r.blob();})
        .then(function(b){
          var url=URL.createObjectURL(b);
          var a=document.createElement('a');
          a.href=url; a.download='icons.json';
          document.body.appendChild(a); a.click();
          document.body.removeChild(a); URL.revokeObjectURL(url);
        })
        .catch(function(){alert('icons.json não encontrado na pasta icones/ do projeto.');});
    },

    showIconTab: function(tab){
      var container=document.getElementById('pers-icon-container');
      if(!container) return;
      container.innerHTML='<div style="text-align:center;padding:20px;color:var(--slate-500);font-size:12px">Carregando...</div>';

      loadIconMap(function(map){
        if(!map){
          container.innerHTML='<div style="color:var(--slate-500);font-size:12px;padding:16px;text-align:center">⚠️ icons_map.json não encontrado. Coloque o arquivo na pasta do projeto.</div>';
          return;
        }
        var html='<div class="pers-icon-grid">';
        // icons.json novo formato: grupos de objetos com pasta/arquivo/label/tipo
        var allItems = [];
        var allEmojis = [];
        Object.keys(map).forEach(function(groupKey) {
          if (groupKey === '_info') return;
          var group = map[groupKey];
          if (typeof group !== 'object' || Array.isArray(group)) return;
          Object.keys(group).forEach(function(itemKey) {
            if (itemKey === '_descricao') return;
            var it = group[itemKey];
            if (!it || typeof it !== 'object') return;
            if (it.tipo === 'png' && it.pasta && it.arquivo) {
              allItems.push(it);
            }
          });
        });
        // Emojis em uso vêm da seção emojis_em_uso
        if (map.emojis_em_uso) {
          Object.keys(map.emojis_em_uso).forEach(function(k) {
            if (k === '_descricao') return;
            var it = map.emojis_em_uso[k];
            if (it && it.emoji) allEmojis.push(it);
          });
        }
        if(tab==='png'){
          if (allItems.length === 0) {
            html += '<div style="color:var(--slate-500);font-size:12px;padding:16px;text-align:center">Nenhum ícone PNG encontrado no mapa.</div>';
          }
          allItems.forEach(function(it){
            html+=
              '<div class="pers-icon-item" title="'+it.label+'">' +
                '<img src="'+it.pasta+'/'+it.arquivo+'" style="width:36px;height:36px;object-fit:contain" onerror="this.style.opacity=\'.25\'">' +
                '<span class="pers-icon-label">'+it.label+'</span>' +
                '<span class="pers-icon-name" title="'+it.pasta+'/'+it.arquivo+'">'+it.arquivo+'</span>' +
              '</div>';
          });
        } else {
          if (allEmojis.length === 0) {
            html += '<div style="color:var(--slate-500);font-size:12px;padding:16px;text-align:center">Nenhum emoji encontrado no mapa.</div>';
          }
          allEmojis.forEach(function(it){
            html+=
              '<div class="pers-icon-item" title="'+it.label+'">' +
                '<span style="font-size:28px;line-height:1">'+it.emoji+'</span>' +
                '<span class="pers-icon-label">'+it.label+'</span>' +
                '<span class="pers-icon-name" style="font-size:8px">'+it.unicode+'</span>' +
              '</div>';
          });
        }
        html+='</div>';
        container.innerHTML=html;
      });
    },
  };

  W.ACSPersonalizacao = API;

  /* ── 12. INIT ───────────────────────────────────────────────── */
  load();
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

  // Re-aplicar ao trocar de tema pelo botão original
  var _origToggle = W.toggleTheme;
  W.toggleTheme = function(){
    if(typeof _origToggle==='function') _origToggle();
    // Sincroniza cfg.tema com o valor real do DOM após a troca
    cfg.tema = document.documentElement.getAttribute('data-theme') || 'light';
    // Persiste imediatamente para que o próximo reload use o tema correto
    save();
  };

}(window));
