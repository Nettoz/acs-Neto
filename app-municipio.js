// ACS Neto — app-municipio.js
// Página Meu Município — dados de Maracanaú/CE
// Depende de: app-ui.js

// Cores das equipes AVISA (I–VI) — altere aqui para mudar todas as referências
const AVISA_CORES = {
  I:   'var(--emerald-500)',   // verde    — AVISA I
  II:  'var(--violet-500)',    // azul     — AVISA II
  III: 'var(--violet-600)',    // violeta  — AVISA III
  IV:  'var(--orange-400)',    // âmbar    — AVISA IV
  V:   'var(--rose-500)',      // vermelho — AVISA V
  VI:  'var(--orange-300)',    // ciano    — AVISA VI
};

// Cores de acento por seção de conteúdo
const SECTION_CORES = {
  emergencia:  AVISA_CORES.V,    // vermelho — Defesa Civil/CVV
  servicos:    AVISA_CORES.IV,   // âmbar   — DETRAN/Cemitérios
  ouvidoria:   AVISA_CORES.III,  // violeta — Ouvidoria/Cagece
  ubs:         AVISA_CORES.I,    // verde   — UBS
  espacos:     AVISA_CORES.II,   // azul    — Espaços públicos
};


function renderMunicipio() {
  const el = $id('municipio-content');
  if (!el) return;

  if (!renderMunicipio._open) renderMunicipio._open = {};
  const _open = renderMunicipio._open;

  function section(id, emoji, title, subtitle, color, bodyHtml) {
    const open = !!_open[id];
    return `
    <div class="mun-accordion-item" id="mun-sec-${id}" style="border-left:3px solid ${color}">
      <button class="mun-accordion-header" onclick="renderMunicipio._toggle('${id}')">
        <span class="mun-accordion-icon" style="background:${color}22;color:${color}">${emoji}</span>
        <div class="mun-accordion-title">
          <span>${title}</span>
          <span class="mun-accordion-sub">${subtitle}</span>
        </div>
        <span class="mun-accordion-chevron" style="transform:rotate(${open ? 180 : 0}deg)">▼</span>
      </button>
      ${open ? `<div class="mun-accordion-body">${bodyHtml}</div>` : ''}
    </div>`;
  }

  function phoneRow(label, num, desc) {
    return `<div class="mun-phone-row">
      <span style="font-size:var(--text-base)">📞</span>
      <div><span class="mun-phone-label">${label}</span>
      <span class="mun-phone-num">${num}${desc ? ` <span style="font-weight:400;color:var(--slate-500);font-size:var(--text-xs)">· ${desc}</span>` : ''}</span></div>
    </div>`;
  }

  function infoRow(emoji, text) {
    return `<div class="mun-info-row"><span class="mun-icon">${emoji}</span><span>${text}</span></div>`;
  }

  function cardWrap(iconEmoji, iconBg, title, subtitle, body) {
    return `<div class="mun-card" style="margin-bottom:12px">
      <div class="mun-card-header">
        <div class="mun-card-icon" style="background:${iconBg}">${iconEmoji}</div>
        <div><div class="mun-card-title">${title}</div><div class="mun-card-subtitle">${subtitle}</div></div>
      </div>
      <div class="mun-card-body">${body}</div>
    </div>`;
  }

  const emergBody = `<div class="mun-phones-table">
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--rose-bg)">🚨</div><div class="mun-phones-item-info"><span class="label">SAMU</span><span class="number">192</span></div></div>
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--rose-bg)">🔥</div><div class="mun-phones-item-info"><span class="label">Bombeiros</span><span class="number">193</span></div></div>
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--violet-bg)">👮</div><div class="mun-phones-item-info"><span class="label">Polícia Militar</span><span class="number">190</span></div></div>
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--violet-bg)">🛡️</div><div class="mun-phones-item-info"><span class="label">Guarda Civil Municipal</span><span class="number">153</span></div></div>
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--orange-bg)">🏚️</div><div class="mun-phones-item-info"><span class="label">Defesa Civil</span><span class="number">199</span></div></div>
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--rose-bg)">🆘</div><div class="mun-phones-item-info"><span class="label">CVV (suicídio)</span><span class="number">188</span></div></div>
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--emerald-bg)">👶</div><div class="mun-phones-item-info"><span class="label">Conselho Tutelar</span><span class="number">(85) 3383-6530</span></div></div>
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--violet-bg)">📞</div><div class="mun-phones-item-info"><span class="label">Disk Denúncia</span><span class="number">181</span></div></div>
  </div>`;

  const servicosBody = `<div class="mun-phones-table">
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--rose-bg)">🦟</div><div class="mun-phones-item-info"><span class="label">Alô Dengue</span><span class="number">3521-6505</span></div></div>
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--orange-bg)">💡</div><div class="mun-phones-item-info"><span class="label">Iluminação Pública</span><span class="number">0800 006 1636</span></div></div>
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--bdr)">🪨</div><div class="mun-phones-item-info"><span class="label">Retirada de Entulhos</span><span class="number">3182-5421</span></div></div>
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--emerald-bg)">🧹</div><div class="mun-phones-item-info"><span class="label">Limpeza Pública</span><span class="number">3521-5146 / 3521-5163</span></div></div>
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--emerald-bg)">🌳</div><div class="mun-phones-item-info"><span class="label">Poda de Árvores</span><span class="number">3521-5191</span></div></div>
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--emerald-bg)">🌿</div><div class="mun-phones-item-info"><span class="label">Disque Denúncia Ambiental</span><span class="number">3521-5143</span></div></div>
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--violet-bg)">🚦</div><div class="mun-phones-item-info"><span class="label">DEMUTRAN</span><span class="number">3521-5882</span></div></div>
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--violet-bg)">⚰️</div><div class="mun-phones-item-info"><span class="label">Plantão dos Cemitérios</span><span class="number">(85) 9 9781-3772</span></div></div>
  </div>`;

  const ouvidoriaBody = `<div class="mun-phones-table">
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--emerald-bg)">🏛️</div><div class="mun-phones-item-info"><span class="label">Ouvidoria Geral</span><span class="number">3521-5891</span></div></div>
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--violet-bg)">📚</div><div class="mun-phones-item-info"><span class="label">Ouvidoria da Educação</span><span class="number">3521-5684</span></div></div>
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--rose-bg)">🏥</div><div class="mun-phones-item-info"><span class="label">Ouvidoria da Saúde</span><span class="number">3521-6527 / 136</span></div></div>
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--orange-bg)">⚡</div><div class="mun-phones-item-info"><span class="label">Enel (luz)</span><span class="number">0800 285 0196</span></div></div>
    <div class="mun-phones-item"><div class="mun-phones-item-icon" style="background:var(--violet-bg)">💧</div><div class="mun-phones-item-info"><span class="label">Cagece (água)</span><span class="number">0800 275 0195</span></div></div>
  </div>`;

  function ubsGroup(name, color, units) {
    return `<div style="margin-bottom:18px">
      <div style="font-size:var(--text-xs);font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;padding:4px 10px;background:${color}18;border-radius:6px;display:inline-block">${name}</div>
      <div class="mun-ubs-list">
        ${units.map(u => `<div class="mun-ubs-item" style="border-left-color:${color}">
          <div class="mun-ubs-info">
            <span class="name">${u.nome} <span style="font-weight:400;color:var(--slate-500);font-size:var(--text-xs)">(${u.bairro})</span></span>
            <span class="addr">📍 ${u.end}</span>
            ${u.fone ? `<span class="hours">📞 ${u.fone}</span>` : ''}
            ${u.cep ? `<span class="hours" style="color:var(--slate-400)">CEP: ${u.cep}</span>` : ''}
          </div>
        </div>`).join('')}
      </div>
    </div>`;
  }

  const ubsBody = `
    <div style="margin-bottom:12px;font-size:var(--text-xs);color:var(--slate-500);padding:8px 10px;background:var(--surface-2);border-radius:8px">
      🕐 Horário geral: <strong>8h às 16h</strong> · Seg. a Sex.
    </div>
    ${ubsGroup('AVISA I', AVISA_CORES.I, [
      { nome: 'João Pereira de Andrade (JPA)',                     bairro: 'Boa Vista',        end: 'Rua Capitão Valdemar de Lima, 362',                        fone: '(85) 3383-6558', cep: '61.901-570' },
      { nome: 'Joaquina Vieira',                                   bairro: 'Horto',            end: 'Rua Prof. José Henrique da Silva, 5544',                   fone: '',               cep: '61909-100'  },
      { nome: 'Luiza Targino da Silva (Olho D\'Água)',             bairro: 'Olho D\'Água',     end: 'Rua Jaime Vasconcelos, S/N',                               fone: '(85) 3383-6564', cep: '61.908-050' },
      { nome: 'Manuel Celestino dos Anjos (Alto da Mangueira)',    bairro: 'Alto da Mangueira',end: 'Rua Luís Girão, S/N',                                      fone: '(85) 3383-6467', cep: '61.905-010' },
      { nome: 'Pólo Indígena Pitaguary',                          bairro: 'Santo Antônio',    end: 'Rua Prof. José Henrique da Silva, 9000',                   fone: '',               cep: '61909-100'  },
      { nome: 'Raimundo Martins de Sousa (Colônia Antônio Justa)',bairro: 'Antônio Justa',    end: 'Av. Desembargador Faustino de Albuquerque, 60',             fone: '(85) 3383-6567', cep: '61.905-990' },
      { nome: 'Vicente Severino (Horto)',                          bairro: 'Horto',            end: 'Rua Manoel Pereira, 5359',                                 fone: '(85) 3383-6600', cep: '61.909-100' },
    ])}
    ${ubsGroup('AVISA II', AVISA_CORES.II, [
      { nome: 'Almir Dutra (Timbó)',                               bairro: 'Timbó',            end: 'Rua 125, 396',                                             fone: '(85) 3383-6450', cep: '61936-280'  },
      { nome: 'Carlos Antônio Costa Pessoa Martins',               bairro: 'Jereissati II',    end: 'Avenida Quarto de Julho, S/N',                             fone: '(85) 3383-6457', cep: '61.901-095' },
      { nome: 'Elias Boutala Salomão',                             bairro: 'Jereissati',       end: 'Av. III, S/N',                                             fone: '(85) 3383-6453', cep: '61900-360'  },
    ])}
    ${ubsGroup('AVISA III', AVISA_CORES.III, [
      { nome: 'Anastácio Soares Lima (Pajuçara)',                  bairro: 'Pajuçara',         end: 'Rua Justino de Sousa, S/N',                                fone: '(85) 3383-6459', cep: '61.932-230' },
      { nome: 'João Batista dos Santos (Boa Esperança)',           bairro: 'Pajuçara',         end: 'Rua Paulo Batista, S/N',                                   fone: '(85) 3383-6482', cep: '61.932-160' },
      { nome: 'Maria das Graças Maximiano de Queiroz (Jd. Bandeirante)', bairro: 'Jardim Bandeirantes', end: 'Rua Osvaldo Risato, S/N',                        fone: '(85) 3383-6570', cep: '61934-280'  },
      { nome: 'Maria Nazaré de Oliveira Silva',                    bairro: 'Pajuçara',         end: 'Rua Pedro Batista, 1105',                                  fone: '(85) 3383-6574', cep: '61935-135'  },
    ])}
    ${ubsGroup('AVISA IV', AVISA_CORES.IV, [
      { nome: 'Enfª Isabel Bonfim (Alto Alegre II)',                bairro: 'Alto Alegre II',   end: 'Travessa Dez, S/N',                                        fone: '(85) 3383-6576', cep: '61921-515'  },
      { nome: 'Luís de Queiroz Uchoa (Alto Alegre I)',             bairro: 'Alto Alegre I',    end: 'Rua Paulo Afonso, 1861',                                   fone: '(85) 3383-6489', cep: '61922-165'  },
      { nome: 'Parceiros do Bem (Cidade Nova)',                     bairro: 'Cidade Nova',      end: 'Rua Novo Amanhecer, 670-B',                                fone: '(85) 3383-6580', cep: '61.930-285' },
      { nome: 'Senador Fernandes Távora (Industrial)',              bairro: 'Industrial',       end: 'Av. Contorno Sul, S/N',                                    fone: '(85) 3383-6486', cep: '61925-210'  },
    ])}
    ${ubsGroup('AVISA V', AVISA_CORES.V, [
      { nome: 'Aparício Bezerra (Novo Maracanaú)',                  bairro: 'Novo Maracanaú',   end: 'Rua 13, 300',                                              fone: '(85) 3383-6585', cep: '61905-560'  },
      { nome: 'Engelberto Moura Cavalcante (Maracanauzinho)',       bairro: 'Maracanauzinho',   end: 'Rua A, S/N',                                               fone: '(85) 3383-6588', cep: '61910-300'  },
      { nome: 'Flávio Belisário de Sousa (Piratininga)',            bairro: 'Piratininga',      end: 'Rua Belém, 450',                                           fone: '(85) 3383-6492', cep: '61905-210'  },
      { nome: 'Juarez Izaías Araújo (Novo Oriente)',                bairro: 'Novo Oriente',     end: 'Av. Central, 130',                                         fone: '(85) 3383-6582', cep: '61.921-240' },
      { nome: 'Maria Heleny Matos Brandão',                        bairro: 'Santo Sátiro',     end: 'Rua 02, 101',                                              fone: '(85) 3383-6594', cep: '61919-000'  },
      { nome: 'Maria José Carvalho de Andrade',                    bairro: 'Acaracuzinho',     end: 'Av. José Antenor Pinheiro (Lateral Norte), S/N',           fone: '(85) 3383-6591', cep: '61920-690'  },
    ])}
    ${ubsGroup('AVISA VI', AVISA_CORES.VI, [
      { nome: 'Alarico Leite (Parque São João)',                    bairro: 'Siqueira',         end: 'Rua Patativa do Assaré, S/N',                              fone: '(85) 3383-6463', cep: '61.932-805' },
      { nome: 'Francisca Fátima da Rocha Freitas',                 bairro: 'Mucunã',           end: 'Rua Wauvires Valentim, S/N',                               fone: '(85) 3383-6494', cep: '61914-076'  },
      { nome: 'Ivaldo Silva (Cágado)',                              bairro: 'Cágado',           end: 'Rodovia Senador Almir Pinto, CE-065, S/N',                  fone: '(85) 3383-6497', cep: '61.910-005' },
      { nome: 'José Teodósio',                                     bairro: 'Jari',             end: 'Rua João Francisco Cavalcante, S/N',                       fone: '(85) 3383-6550', cep: '61.916-230' },
      { nome: 'Narcélio Mesquita Mota',                            bairro: 'Luzardo Viana',    end: 'Avenida Luiz Pereira Lima, S/N',                           fone: '',               cep: ''            },
      { nome: 'Swell Angelin Cavalcante Alves (Jaçanaú)',          bairro: 'Jaçanaú',          end: 'Rodovia Senador Almir Pinto, CE-065, S/N',                  fone: '(85) 3383-6597', cep: '61.915-000' },
    ])}`;

  const urgenciaBody =
    cardWrap('🏥','var(--rose-bg)','UPA 24 Horas — Pajuçara','Urgência e emergência · Aberta 24h · 7 dias',
      phoneRow('UPA Pajuçara', '(85) 2180-9160', '24h') +
      infoRow('🚑', 'SAMU: 192 · Bombeiros: 193')
    ) +
    cardWrap('🌙','var(--violet-bg)','Atendimento em 3º Turno','Onde encontrar atendimento estendido nos postos',
      infoRow('🏠', '<strong>Postos com 3º turno:</strong>') +
      infoRow('→', 'Anastácio Soares Lima (Pajuçara)') +
      infoRow('→', 'Elias Boutala (Jereissati)') +
      infoRow('→', 'Flávio Belisário de Sousa (Piratininga)') +
      infoRow('→', 'João Pereira de Andrade – JPA') +
      infoRow('→', 'Juarez Izaías Araújo (Novo Oriente)') +
      infoRow('🕐', '<strong>Seg. a Qui:</strong> 16h às 20h') +
      infoRow('🕐', '<strong>Sexta-feira:</strong> 14h às 20h') +
      infoRow('🕐', '<strong>Fins de semana e feriados</strong> (Jereissati e Novo Oriente): 8h às 16h') +
      infoRow('🩺', '<strong>Serviços disponíveis:</strong> Consultas médicas e de enfermagem · Aferição de PA · Glicemia, peso e altura · Medicamentos · Curativos · Testes rápidos') +
      infoRow('📋', '<strong>O que levar:</strong> Cartão do Posto · Documento com foto · Cartão do SUS · Cartão de Vacinação e Certidão de Nascimento (crianças até 10 anos)')
    );

  const espBody =
    cardWrap('🦷','var(--violet-bg)','CEO — Centro de Especialidades Odontológicas','Referência das ESB · acesso por encaminhamento',
      infoRow('📍', 'Rua João Conrado, S/N — Pajuçara') +
      infoRow('🕐', 'Seg. a Sex.: 8h às 20h') +
      phoneRow('Agendamento / WhatsApp', '(85) 3383-6473 / 9 8106-1321') +
      infoRow('📋', 'Periodontia · Endodontia · Cirurgia · Diagnóstico Bucal')
    ) +
    cardWrap('🐕','var(--emerald-bg)','CCZ — Centro de Controle de Zoonoses','Vigilância em saúde animal',
      infoRow('📍', 'Rua Prof. José Henrique da Silva, 5801 — Olho D\'Água') +
      infoRow('🕐', 'Seg. a Qui: 8h–12h e 13h–16h · Sex: 8h–14h') +
      phoneRow('CCZ', '(85) 3383-6480') +
      infoRow('💉', 'Vacinação antirrábica · controle de vetores, roedores e animais peçonhentos')
    ) +
    cardWrap('♿','var(--violet-bg)','CIRM — Centro Integrado de Reabilitação','Reabilitação física, auditiva, visual, intelectual e múltipla',
      infoRow('📍', 'Avenida X, 159 — Jereissati I') +
      infoRow('🕐', 'Seg. a Sex.: 7h às 19h · Acesso via encaminhamento das UBASF') +
      phoneRow('CIRM', '(85) 3383-6470 / 3383-6471') +
      infoRow('🩺', 'Fisioterapia (respiratória, neurológica, neuropediatria) · Terapia Ocupacional · Fonoaudiologia · Psicologia · Psicomotricidade · Estimulação Precoce · Serviço Social · Odontologia Especializada · Ortopedia · Otorrinolaringologia · Próteses e Órteses · Facilitador Esportivo')
    );

  const capsBody =
    cardWrap('🧠','var(--violet-bg)','CAPS Geral','Saúde Mental adulto',
      infoRow('📍', 'Rua Capitão Valdemar de Lima, s/n — Boa Vista (Antigo Posto JPA I)') +
      phoneRow('CAPS Geral', '(85) 9 8105-9806')
    ) +
    cardWrap('💊','var(--orange-bg)','CAPS Álcool e Drogas','Atenção a álcool e substâncias',
      infoRow('📍', 'Rua Sinfrônio Peixoto, S/N — Boa Esperança / Pajuçara') +
      phoneRow('CAPSad', '(85) 3383-6468')
    ) +
    cardWrap('🧒','var(--emerald-bg)','CAPS Infantil (CAPSi)','Saúde Mental infantojuvenil',
      infoRow('📍', 'Rua Francisco Firmino, 120 — Centro') +
      phoneRow('CAPSi', '(85) 3383-6552')
    );

  const farmaciaBody = cardWrap('💊','var(--emerald-bg)','Farmácia Polo','Medicamentos básicos e controlados',
    infoRow('📍', 'Rua Capitão Valdemar de Lima, 71 — Centro · CEP 61901-570') +
    `<div style="margin:10px 0 6px;font-size:var(--text-xs);font-weight:600;color:var(--text)">🕐 Horário de funcionamento</div>
    <div style="font-size:var(--text-xs);color:var(--slate-600);line-height:2;background:var(--surface-2);border-radius:8px;padding:10px 12px">
      <div style="display:flex;justify-content:space-between"><span>Seg a Qui</span><span><strong>8h às 16h</strong> <span style="color:var(--slate-400);font-size:var(--text-xs)">(senhas até 15h30)</span></span></div>
      <div style="display:flex;justify-content:space-between"><span>Sexta-feira</span><span><strong>8h às 14h</strong> <span style="color:var(--slate-400);font-size:var(--text-xs)">(senhas até 13h30)</span></span></div>
    </div>` +
    `<div style="margin-top:12px;font-size:var(--text-xs);font-weight:600;color:var(--text)">📋 Documentos necessários — Controlados</div>
    <div style="font-size:var(--text-xs);color:var(--slate-600);line-height:1.8;margin-top:6px">
      <div>✅ Documento de identidade <strong>original</strong> com foto</div>
      <div>✅ Cartão do Posto de Saúde (original)</div>
      <div>✅ Cartão do SUS</div>
      <div>✅ Receita médica original dentro do prazo (30 dias) — <em>cópia não tem validade</em></div>
    </div>
    <div style="margin-top:10px;font-size:var(--text-xs);color:var(--slate-600);background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:8px;padding:10px 12px;line-height:1.7">
      ⚠️ <strong>Retirada por terceiros:</strong> o representante deve estar incluído no Cartão do Posto (mesmo endereço) ou apresentar <em>Declaração Autorizadora</em> assinada pelo paciente, além de documento oficial com foto e a receita original.
    </div>`
  );

  el.innerHTML = `
  <style>
    .mun-accordion-item{background:var(--surface);border-radius:12px;margin-bottom:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.07)}
    .mun-accordion-header{width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;background:none;border:none;cursor:pointer;text-align:left;transition:background .15s}
    .mun-accordion-header:hover{background:var(--surface-2)}
    .mun-accordion-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:var(--text-md);flex-shrink:0}
    .mun-accordion-title{flex:1;display:flex;flex-direction:column;gap:2px}
    .mun-accordion-title>span:first-child{font-size:var(--text-sm);font-weight:700;color:var(--text)}
    .mun-accordion-sub{font-size:var(--text-xs);color:var(--slate-500)}
    .mun-accordion-chevron{font-size:var(--text-xs);color:var(--slate-400);transition:transform .2s;flex-shrink:0}
    .mun-accordion-body{padding:0 16px 16px}
    .mun-phone-num{font-size:var(--text-sm);font-weight:600;color:var(--text);margin-left:6px}
  </style>

  <div class="mun-hero" style="margin-bottom:16px">
    <div class="mun-hero-seal">🏙️</div>
    <div class="mun-hero-info">
      <h1>Maracanaú — CE</h1>
      <p>Região Metropolitana de Fortaleza · 3ª Coordenadoria Regional de Saúde</p>
      <div class="mun-hero-chips">
        <span class="mun-hero-chip">🏥 Rede SUS Municipal</span>
        <span class="mun-hero-chip">📍 IBGE 2307650</span>
        <span class="mun-hero-chip">☎ DDD 85</span>
        <span class="mun-hero-chip">👨‍⚕️ CRES-3</span>
      </div>
    </div>
  </div>

  ${section('emerg',    '🚨', 'Emergência',                      'SAMU · Bombeiros · Polícia · Defesa Civil · CVV',             SECTION_CORES.emergencia, emergBody)}
  ${section('servicos', '🏛️', 'Serviços Municipais',             'Dengue · Limpeza · Iluminação · DEMUTRAN · Cemitérios',        SECTION_CORES.servicos, servicosBody)}
  ${section('ouvidoria','📣', 'Ouvidorias & Concessionárias',    'Geral · Saúde · Educação · Enel · Cagece',                    SECTION_CORES.ouvidoria, ouvidoriaBody)}
  ${section('ubs',      '🏥', 'Postos de Saúde — UBS/USF por AVISA','26 unidades · AVISA I ao VI · 8h–16h',                    SECTION_CORES.ubs, ubsBody)}
  ${section('urgencia', '🚑', 'Urgência & 3º Turno',  'UPA 24h · Atendimento estendido nos postos',                               'var(--rose-600)', urgenciaBody)}
  ${section('esp',      '🦷', 'Especialidades & Vigilância',     'CEO Odontológico · CCZ · CIRM',                               SECTION_CORES.espacos, espBody)}
  ${section('caps',     '🧠', 'CAPS — Saúde Mental',             'CAPS Geral · Álcool e Drogas · Infantil',                     SECTION_CORES.ouvidoria, capsBody)}
  ${section('farmacia', '💊', 'Farmácia Polo',                   'Medicamentos básicos e controlados · Centro',                  SECTION_CORES.ubs, farmaciaBody)}

  <div class="mun-footer-note">
    ⚠️ Dados baseados na Secretaria de Saúde de Maracanaú · Confirme horários e endereços diretamente com a unidade antes do encaminhamento.
    <br>📅 Referência: 2025 · Fonte: SESA Maracanaú / portais municipais
  </div>`;
}

renderMunicipio._open = {};
renderMunicipio._toggle = function(id) {
  renderMunicipio._open[id] = !renderMunicipio._open[id];
  renderMunicipio();
  if (renderMunicipio._open[id]) {
    setTimeout(() => {
      const sec = $id('mun-sec-' + id);
      if (!sec) return;
      // Rola apenas o container .content (overflow-y: auto) para não
      // empurrar a topbar para fora da tela no tablet.
      const scroller = sec.closest('.content') || sec.closest('[class*="content"]');
      if (scroller) {
        const secTop    = sec.getBoundingClientRect().top;
        const scrollTop = scroller.getBoundingClientRect().top;
        scroller.scrollBy({ top: secTop - scrollTop - 16, behavior: 'smooth' });
      }
    }, 60);
  }
};

