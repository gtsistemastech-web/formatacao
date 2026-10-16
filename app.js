/**
 * FormatMail Pro - Sistema de Formatação para Gmail
 * Especializado no Padrão de Comunicação e Ofícios do TJGO
 */

// Chaves de armazenamento local (versão 5: renderização dinâmica sem mistura de texto anterior)
const STORAGE_KEY_TEMPLATES = 'formatmail_templates_v5';
const STORAGE_KEY_ACTIVE_TEMPLATE = 'formatmail_active_template_id_v5';
const STORAGE_KEY_LAST_RAW = 'formatmail_last_raw_text';

// Modelos padrão pré-configurados
const DEFAULT_TEMPLATES = [
  {
    id: 'tpl_oficio_tjgo_universal',
    name: 'Ofício / Comunicação TJGO (Universal)',
    desc: 'Formata qualquer ofício ou fragmento (Presidência, Desembargadores, Juízes, CNJ, Gestores e Servidores)',
    subject: '{assunto_email}',
    recipientVar: 'nome_destinatario',
    bodyHtml: `{conteudo_formatado_html}`
  }
];

// Estado global da aplicação
let templates = [];
let activeTemplateId = null;
let currentValues = {};
let editingTemplate = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  loadTemplates();
  initActiveTemplate();
  renderTemplateSelector();
  renderTemplateManager();
  
  const savedRaw = localStorage.getItem(STORAGE_KEY_LAST_RAW);
  if (savedRaw && savedRaw.trim()) {
    document.getElementById('rawTextInput').value = savedRaw;
    processRawInput();
  } else {
    loadSampleText();
  }
});

function loadTemplates() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    if (saved) {
      templates = JSON.parse(saved);
      if (!Array.isArray(templates) || templates.length === 0) {
        templates = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
        saveTemplates();
      }
    } else {
      templates = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
      saveTemplates();
    }
  } catch (e) {
    console.error('Erro ao carregar templates:', e);
    templates = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
  }
}

function saveTemplates() {
  localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
}

function initActiveTemplate() {
  const savedActive = localStorage.getItem(STORAGE_KEY_ACTIVE_TEMPLATE);
  if (savedActive && templates.some(t => t.id === savedActive)) {
    activeTemplateId = savedActive;
  } else if (templates.length > 0) {
    activeTemplateId = templates[0].id;
  }
}

function getActiveTemplate() {
  return templates.find(t => t.id === activeTemplateId) || templates[0];
}

function switchTab(tab) {
  const viewFormat = document.getElementById('viewFormat');
  const viewManage = document.getElementById('viewManage');
  const btnFormat = document.getElementById('tabFormatBtn');
  const btnManage = document.getElementById('tabManageBtn');

  if (tab === 'format') {
    viewFormat.style.display = 'block';
    viewManage.style.display = 'none';
    btnFormat.classList.add('active');
    btnManage.classList.remove('active');
    renderTemplateSelector();
    processRawInput();
  } else {
    viewFormat.style.display = 'none';
    viewManage.style.display = 'block';
    btnFormat.classList.remove('active');
    btnManage.classList.add('active');
    renderTemplateManager();
  }
}

function renderTemplateSelector() {
  const select = document.getElementById('templateSelect');
  select.innerHTML = '';
  
  templates.forEach(tpl => {
    const opt = document.createElement('option');
    opt.value = tpl.id;
    opt.textContent = tpl.name;
    if (tpl.id === activeTemplateId) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

function onTemplateChange() {
  const select = document.getElementById('templateSelect');
  activeTemplateId = select.value;
  localStorage.setItem(STORAGE_KEY_ACTIVE_TEMPLATE, activeTemplateId);
  processRawInput();
  showToast(`Modelo alterado para: ${getActiveTemplate().name}`, 'info');
}

// Verifica se uma linha representa localidade/cidade/UF ou NESTA
function isLocalidade(str) {
  if (!str) return false;
  return /[-–—\/]\s*[A-Z]{2}$/i.test(str) ||
         /\b(?:GO|DF|SP|RJ|MG|PR|SC|RS|BA)\b/i.test(str) ||
         /^\s*N\s*E\s*S\s*T\s*A\s*$/i.test(str) ||
         /^\s*Nesta\s+Comarca\s*$/i.test(str) ||
         /^\s*Nesta\s*$/i.test(str);
}

// Padrões de Fecho em Correspondências Oficiais (TJGO / Judiciário)
const FECHO_PATTERNS = [
  /^(?:Respeitosamente|Atenciosamente|Cordialmente|Saudações\s+cordiais|Com\s+(?:elevado\s+)?apreço|Com\s+(?:protestos\s+de\s+)?estima\s+e\s+consideração)[,]?$/i,
  /^(?:Colho\s+(?:a\s+oportunidade|o\s+ensejo)|Aproveito\s+(?:a\s+oportunidade|o\s+ensejo)|Renovo\s+(?:a\s+Vossa|os\s+protestos)|Reitero\s+(?:a\s+Vossa|os\s+protestos)|Na\s+oportunidade,?\s*(?:renovo|reitero|apresento)|Sem\s+mais\s+(?:para\s+o\s+momento)?|Sendo\s+(?:o\s+que|apenas\s+o\s+que)\s+(?:se\s+apresenta|para\s+o\s+momento)|Certo\s+de\s+contar)/i
];

function isFechoLine(line) {
  if (!line) return false;
  return FECHO_PATTERNS.some(pat => pat.test(line.trim()));
}

// ========================================================
// PARSER INTELIGENTE: EXTRAI APENAS O QUE FOI COLADO
// NUNCA mistura campos de textos anteriores!
// ========================================================
function parseDocumentText(rawText) {
  if (!rawText || !rawText.trim()) return {};
  
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawSplit = normalized.split('\n');
  const lineObjs = [];
  let hadBlank = false;
  for (let i = 0; i < rawSplit.length; i++) {
    const trimmed = rawSplit[i].trim();
    if (!trimmed) {
      hadBlank = true;
    } else {
      lineObjs.push({ text: trimmed, blankBefore: hadBlank });
      hadBlank = false;
    }
  }
  const lines = lineObjs.map(o => o.text);
  
  const result = {
    cabecalho_oficio: '',
    local_data: '',
    tratamento_inicio: '',
    nome_destinatario: '',
    cargo_orgao: '',
    comarca_uf: '',
    assunto: '',
    vocativo_saudacao: '',
    corpo_formatado_html: '',
    fecho: '',
    assinatura_html: '',
    proad: ''
  };

  if (lines.length === 0) return result;

  // 1. PROAD
  const proadM = normalized.match(/PROAD\s*(?:nº|n°|num)?\s*[:]?\s*(\b20\d{13}\b|\b\d{15}\b)/i) ||
                 normalized.match(/\b(20\d{13}|\d{15})\b/);
  if (proadM) result.proad = proadM[1];

  let currentIdx = 0;

  // 2. Número de Ofício e Data no início (se houver)
  if (currentIdx < lines.length && /^(?:OFÍCIO|MEMORANDO|CIRCULAR|DESPACHO)\s+(?:N[º°o]?\.?\s*)?/i.test(lines[currentIdx])) {
    result.cabecalho_oficio = lines[currentIdx];
    currentIdx++;
  }
  if (currentIdx < lines.length && /^[A-Za-zÀ-ÿ\s]+,\s*\d{1,2}\s+de\s+[a-zç]+\s+de\s+\d{4}\.?/i.test(lines[currentIdx])) {
    result.local_data = lines[currentIdx];
    currentIdx++;
  }

  // 3. Tratamento (A Sua Excelência...)
  let tratamentoIdx = -1;
  for (let i = currentIdx; i < lines.length; i++) {
    if (/^(?:A[oàs]?\s+(?:Sua|Vossa)\s+(?:Excelência|Senhoria|Magnificência)|Aos?\s+Senhor(?:es)?|Às?\s+Senhora(?:s)?|Ilm[oa]s?|Exm[oa]s?|Às?\s+Excelentíssim[oa]s?|Aos?\s+Excelentíssim[oa]s?)/i.test(lines[i])) {
      tratamentoIdx = i;
      break;
    }
  }

  // 4. Assunto
  let assuntoIdx = -1;
  for (let i = currentIdx; i < lines.length; i++) {
    if (/^(?:Assunto|Tema|Objeto)\s*[:\-–—]/i.test(lines[i])) {
      assuntoIdx = i;
      break;
    }
  }

  // 5. Vocativo (linha curta após assunto que termina com vírgula)
  let vocativoIdx = -1;
  if (assuntoIdx !== -1) {
    for (let i = assuntoIdx + 1; i < lines.length; i++) {
      const l = lines[i];
      if (l.endsWith(',') && (l.startsWith('Senhor') || l.startsWith('Prezado') || l.startsWith('Doutor') || l.startsWith('Juiz') || l.startsWith('Desembargador') || l.length <= 60)) {
        vocativoIdx = i;
        break;
      }
    }
  }

  // 6. Bloco de Endereçamento (Tratamento, Nome, Cargo, Cidade)
  let endAddrIdx = currentIdx;
  if (assuntoIdx !== -1) {
    endAddrIdx = assuntoIdx;
  } else if (vocativoIdx !== -1) {
    endAddrIdx = vocativoIdx;
  } else if (tratamentoIdx !== -1) {
    // Se há tratamento, mas não há assunto nem vocativo, o endereçamento tem no máximo 4 linhas
    endAddrIdx = Math.min(lines.length, tratamentoIdx + 4);
  }

  if (tratamentoIdx !== -1) {
    result.tratamento_inicio = lines[tratamentoIdx];
    const addrLines = lines.slice(tratamentoIdx + 1, endAddrIdx);
    
    if (addrLines.length >= 1) {
      result.nome_destinatario = addrLines[0]; // Nome do destinatário (sempre em negrito)
    }
    if (addrLines.length >= 2) {
      const remaining = addrLines.slice(1);
      const lastLine = remaining[remaining.length - 1];
      if (isLocalidade(lastLine)) {
        result.comarca_uf = lastLine.replace(/[–—]/g, '-').trim();
        const middle = remaining.slice(0, remaining.length - 1);
        if (middle.length > 0) result.cargo_orgao = middle.join('<br>');
      } else {
        result.cargo_orgao = remaining.join('<br>');
      }
    }
  } else if (assuntoIdx !== -1 && endAddrIdx > currentIdx) {
    const addrLines = lines.slice(currentIdx, endAddrIdx);
    result.nome_destinatario = addrLines[0];
    if (addrLines.length >= 2) {
      const remaining = addrLines.slice(1);
      const lastLine = remaining[remaining.length - 1];
      if (isLocalidade(lastLine)) {
        result.comarca_uf = lastLine.replace(/[–—]/g, '-').trim();
        result.cargo_orgao = remaining.slice(0, remaining.length - 1).join('<br>');
      } else {
        result.cargo_orgao = remaining.join('<br>');
      }
    }
  }

  // 7. Extrai o Assunto (se houver)
  if (assuntoIdx !== -1) {
    const endAssuntoIdx = vocativoIdx !== -1 ? vocativoIdx : (assuntoIdx + 1);
    const assuntoLines = lines.slice(assuntoIdx, endAssuntoIdx);
    let fullAssunto = assuntoLines.join(' ');
    fullAssunto = fullAssunto.replace(/^(?:Assunto|Tema|Objeto)\s*[:\-–—]\s*/i, '').trim();
    result.assunto = fullAssunto;
  }

  if (vocativoIdx !== -1) {
    result.vocativo_saudacao = lines[vocativoIdx];
  }

  // 8. CORPO, FECHO E ASSINATURA
  const bodyStartIdx = vocativoIdx !== -1 ? vocativoIdx + 1 : (assuntoIdx !== -1 ? assuntoIdx + 1 : endAddrIdx);

  if (bodyStartIdx < lines.length) {
    let fechoIdx = -1;
    let fechoEndIdx = -1;
    let assinaturaStartIdx = -1;

    // Procura fecho de trás para frente no documento
    for (let i = lines.length - 1; i >= bodyStartIdx; i--) {
      if (isFechoLine(lines[i])) {
        fechoIdx = i;
        break;
      }
    }

    if (fechoIdx !== -1) {
      // Se encontrou fecho, determina onde termina o fecho
      fechoEndIdx = fechoIdx + 1;
      while (fechoEndIdx < lines.length) {
        const nextL = lines[fechoEndIdx];
        // Se a próxima linha parece ser nome de assinatura (curta, sem ponto final, cargo ou maiúsculas), para
        if (fechoEndIdx > fechoIdx && (
          /^(?:Desembargador|Juiz|Presidente|Diretor|Secretári|Doutor|Dr\.)/i.test(nextL) ||
          /^[A-ZÁÀÂÃÉÈÊÍÏÓÒÔÕÚÜÇ\s.-]{4,}$/.test(nextL)
        )) {
          break;
        }
        fechoEndIdx++;
        if (lines[fechoEndIdx - 1].endsWith('.')) {
          break;
        }
      }

      result.fecho = lines.slice(fechoIdx, fechoEndIdx).join(' ');

      // Tudo após o fecho é a assinatura
      if (fechoEndIdx < lines.length) {
        assinaturaStartIdx = fechoEndIdx;
      }
    } else {
      // Sem fecho explícito: procura assinatura apenas nas últimas linhas (máx 4 linhas finais)
      const searchStart = Math.max(bodyStartIdx + 1, lines.length - 4);
      for (let i = searchStart; i < lines.length; i++) {
        const l = lines[i];
        const isShort = l.length <= 60;
        const noSentencePunct = !/[.!?;]$/.test(l);
        const isTitleOrCaps = /^(?:Desembargador|Juiz|Presidente|Secretári[ao]|Diretor|Doutor[a]?|Dr[a]?\.)/i.test(l) ||
                              /^[A-ZÁÀÂÃÉÈÊÍÏÓÒÔÕÚÜÇ\s.-]{4,}$/.test(l);
        if (isShort && noSentencePunct && isTitleOrCaps) {
          assinaturaStartIdx = i;
          break;
        }
      }
    }

    const bodyEndIdx = fechoIdx !== -1 ? fechoIdx : (assinaturaStartIdx !== -1 ? assinaturaStartIdx : lines.length);

    // Constrói parágrafos do corpo justificados
    if (bodyEndIdx > bodyStartIdx) {
      const rawBodyLineObjs = lineObjs.slice(bodyStartIdx, bodyEndIdx);
      const hasAnyBlank = rawBodyLineObjs.some((obj, idx) => idx > 0 && obj.blankBefore);

      // Agrupa linhas em parágrafos reais, removendo quebras duras de linha
      const paragraphs = [];
      let currentPara = [];

      for (let i = 0; i < rawBodyLineObjs.length; i++) {
        const obj = rawBodyLineObjs[i];
        const line = obj.text;

        if (currentPara.length === 0) {
          currentPara.push(line);
        } else {
          let isNewParaStart = false;
          if (hasAnyBlank) {
            // Se o usuário usou linhas em branco no corpo, respeita rigorosamente
            isNewParaStart = obj.blankBefore;
          } else {
            // Se o texto veio sem linhas em branco (ex: colado de PDF/PJe compactado)
            const prevLine = rawBodyLineObjs[i - 1].text;
            const prevEndsSentence = /[.:!?]$/.test(prevLine);
            isNewParaStart = prevEndsSentence && /^[A-ZÀ-Ú0-9(]/.test(line);
          }

          if (isNewParaStart) {
            paragraphs.push(currentPara.join(' '));
            currentPara = [line];
          } else {
            currentPara.push(line);
          }
        }
      }
      if (currentPara.length > 0) {
        paragraphs.push(currentPara.join(' '));
      }

      const pTags = paragraphs.map(pText => {
        let text = pText.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="mailto:$1" style="color: #1a73e8; text-decoration: underline; font-family: Verdana, Geneva, sans-serif;">$1</a>');
        return `<p class="corpo-paragrafo justificado" style="margin: 0 0 14px 0; font-family: Verdana, Geneva, sans-serif; font-size: 13px; line-height: 1.6; color: #202124; text-align: justify; text-justify: inter-word;">${text}</p>`;
      });

      result.corpo_formatado_html = pTags.join('\n');
    }

    if (assinaturaStartIdx !== -1 && assinaturaStartIdx < lines.length) {
      const assLines = lines.slice(assinaturaStartIdx);
      const nomeAss = assLines[0];
      const cargoAss = assLines.slice(1).join('<br>');
      result.assinatura_html = `<div style="margin-top: 22px; font-family: Verdana, Geneva, sans-serif; font-size: 13px; line-height: 1.4; color: #202124; text-align: left;">
  <p style="margin: 0 0 2px 0; font-family: Verdana, Geneva, sans-serif; font-weight: normal; text-align: left;">${escapeHtml(nomeAss)}</p>
  ${cargoAss ? `<p style="margin: 0 0 2px 0; font-family: Verdana, Geneva, sans-serif; font-weight: normal; text-align: left;">${cargoAss}</p>` : ''}
</div>`;
    }
  }

  return result;
}

// Constrói o HTML formatado limpo APENAS COM OS CAMPOS PRESENTES
// Configuração solicitada: Fonte Verdana, Assunto todo em negrito, nome do endereçamento em negrito e corpo justificado
function buildFormattedHtml(p) {
  let html = '';

  if (p.cabecalho_oficio) {
    html += `<p style="margin: 0 0 2px 0; font-family: Verdana, Geneva, sans-serif; font-size: 12px; font-weight: normal; color: #5f6368; text-align: left;">${escapeHtml(p.cabecalho_oficio)}</p>\n`;
  }
  if (p.local_data) {
    html += `<p style="margin: 0 0 16px 0; font-family: Verdana, Geneva, sans-serif; font-size: 13px; font-weight: normal; color: #5f6368; text-align: left;">${escapeHtml(p.local_data)}</p>\n`;
  }
  if (p.tratamento_inicio) {
    html += `<p style="margin: 0 0 4px 0; font-family: Verdana, Geneva, sans-serif; font-size: 13px; line-height: 1.5; font-weight: normal; color: #202124; text-align: left;">${escapeHtml(p.tratamento_inicio)}</p>\n`;
  }
  if (p.nome_destinatario) {
    html += `<p style="margin: 0 0 4px 0; font-family: Verdana, Geneva, sans-serif; font-size: 13px; line-height: 1.5; color: #202124; text-align: left;"><strong>${escapeHtml(p.nome_destinatario)}</strong></p>\n`;
  }
  if (p.cargo_orgao) {
    html += `<div style="margin: 0 0 4px 0; font-family: Verdana, Geneva, sans-serif; font-size: 13px; line-height: 1.5; font-weight: normal; color: #202124; text-align: left;">${p.cargo_orgao}</div>\n`;
  }
  if (p.comarca_uf) {
    html += `<p style="margin: 0 0 18px 0; font-family: Verdana, Geneva, sans-serif; font-size: 13px; line-height: 1.5; font-weight: normal; color: #202124; text-align: left;">${escapeHtml(p.comarca_uf)}</p>\n`;
  }
  if (p.assunto) {
    const cleanAssunto = p.assunto.replace(/^(?:Assunto|Tema|Objeto)\s*[:\-–—]\s*/i, '').trim();
    html += `<p style="margin: 0 0 18px 0; font-family: Verdana, Geneva, sans-serif; font-size: 13px; line-height: 1.5; color: #202124; text-align: left;"><strong>Assunto: ${escapeHtml(cleanAssunto)}</strong></p>\n`;
  }
  if (p.vocativo_saudacao) {
    html += `<p style="margin: 0 0 18px 0; font-family: Verdana, Geneva, sans-serif; font-size: 13px; line-height: 1.5; font-weight: normal; color: #202124; text-align: left;">${escapeHtml(p.vocativo_saudacao)}</p>\n`;
  }
  if (p.corpo_formatado_html) {
    html += `<div style="margin: 0 0 18px 0;">${p.corpo_formatado_html}</div>\n`;
  }
  if (p.fecho) {
    html += `<p class="fecho-paragrafo justificado" style="margin: 0 0 18px 0; font-family: Verdana, Geneva, sans-serif; font-size: 13px; line-height: 1.6; font-weight: normal; color: #202124; text-align: justify; text-justify: inter-word;">${escapeHtml(p.fecho)}</p>\n`;
  }
  if (p.assinatura_html) {
    html += `${p.assinatura_html}\n`;
  }

  return html;
}

// Disparado ao digitar ou colar no textarea
function onRawInputChanged() {
  const rawText = document.getElementById('rawTextInput').value;
  localStorage.setItem(STORAGE_KEY_LAST_RAW, rawText);
  processRawInput();
}

// Botão explícito "⚡ FORMATAR TEXTO AGORA"
function executeFormatting() {
  const rawText = document.getElementById('rawTextInput').value;
  if (!rawText || !rawText.trim()) {
    showToast('Por favor, cole algum texto no campo antes de formatar.', 'info');
    return;
  }
  processRawInput();
  showToast('✨ Formatado com sucesso! Confira na pré-visualização ao lado.', 'success');
}

function processRawInput() {
  const rawText = document.getElementById('rawTextInput').value;

  if (!rawText || !rawText.trim()) {
    currentValues = {};
    renderVariablesForm({});
    renderPreview({});
    return;
  }

  // Extração estrita do texto novo
  const parsed = parseDocumentText(rawText);
  currentValues = parsed;

  renderVariablesForm(parsed);
  renderPreview(parsed);
}

// Renderiza formulário dos campos identificados no texto atual
function renderVariablesForm(vals) {
  const container = document.getElementById('variablesFieldsGrid');
  const countBadge = document.getElementById('varsCountBadge');
  container.innerHTML = '';
  
  const fields = [
    { key: 'nome_destinatario', label: 'Nome do Destinatário (Negrito)' },
    { key: 'tratamento_inicio', label: 'Pronome de Tratamento' },
    { key: 'cargo_orgao', label: 'Cargo e Órgão / Lotação' },
    { key: 'comarca_uf', label: 'Comarca / Localidade' },
    { key: 'assunto', label: 'Assunto do Ofício (Negrito)' },
    { key: 'vocativo_saudacao', label: 'Vocativo Inicial' },
    { key: 'proad', label: 'Número do PROAD' }
  ];

  let detectedCount = 0;
  fields.forEach(f => {
    const val = vals[f.key] || '';
    if (val) detectedCount++;

    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'var-field';

    const isHighlight = ['nome_destinatario', 'assunto', 'proad'].includes(f.key);

    fieldDiv.innerHTML = `
      <div class="var-field-name" style="${isHighlight ? 'color: #1a73e8; font-weight: 700;' : ''}">
        <span>${f.label}</span>
      </div>
      <input 
        type="text" 
        class="var-input" 
        id="var_input_${f.key}"
        value="${escapeHtmlAttr(val)}" 
        placeholder="${val ? '' : '(Não detectado neste texto)'}"
        oninput="onVarInputChanged('${f.key}', this.value)"
      >
    `;
    container.appendChild(fieldDiv);
  });

  countBadge.textContent = `${detectedCount} campo(s) preenchido(s)`;
}

function onVarInputChanged(varName, value) {
  currentValues[varName] = value;
  renderPreview(currentValues);
}

// Renderiza a Pré-visualização do Gmail
function renderPreview(vals) {
  // Assunto do E-mail
  let subject = '';
  if (vals.proad && vals.assunto) {
    subject = `PROAD nº ${vals.proad} - ${vals.assunto}`;
  } else if (vals.cabecalho_oficio && vals.assunto) {
    subject = `${vals.cabecalho_oficio} - ${vals.assunto}`;
  } else if (vals.assunto) {
    subject = vals.assunto;
  } else if (vals.nome_destinatario) {
    subject = `Ofício - ${vals.nome_destinatario}`;
  } else {
    subject = '-';
  }
  document.getElementById('previewSubject').textContent = subject;

  // Destinatário
  const recipientVal = vals.nome_destinatario || '(Definido no Gmail)';
  document.getElementById('previewRecipient').textContent = recipientVal;

  // Corpo do E-mail renderizado
  const bodyHtml = buildFormattedHtml(vals);
  document.getElementById('gmailPreviewBody').innerHTML = bodyHtml;
}

// COPIAR PARA O GMAIL COM FORMATAÇÃO RICA (Clipboard API com text/html)
async function copyFormattedBodyToClipboard() {
  const previewBody = document.getElementById('gmailPreviewBody');
  const htmlContent = previewBody.innerHTML;
  const plainText = previewBody.innerText;

  if (!plainText || !plainText.trim()) {
    showToast('Nenhum texto para copiar. Cole o conteúdo primeiro!', 'info');
    return;
  }

  // Envolve explicitamente com Verdana e tamanho proporcional para o Gmail
  const gmailFormattedHtml = `<div style="font-family: Verdana, Geneva, sans-serif; font-size: 13px; line-height: 1.5; color: #202124;">${htmlContent}</div>`;

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const blobHtml = new Blob([gmailFormattedHtml], { type: 'text/html' });
      const blobText = new Blob([plainText], { type: 'text/plain' });
      const item = new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText
      });
      await navigator.clipboard.write([item]);
      showToast('🎉 Texto copiado em Verdana! Agora dê Ctrl + V no Gmail.', 'success');
      return;
    }
  } catch (err) {
    console.warn('ClipboardItem API falhou, tentando fallback...', err);
  }

  // Fallback tradicional
  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = gmailFormattedHtml;
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.contentEditable = 'true';
    document.body.appendChild(tempDiv);

    tempDiv.focus();
    const range = document.createRange();
    range.selectNodeContents(tempDiv);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const successful = document.execCommand('copy');
    document.body.removeChild(tempDiv);
    sel.removeAllRanges();

    if (successful) {
      showToast('🎉 Texto copiado em Verdana! Agora dê Ctrl + V no Gmail.', 'success');
    } else {
      showToast('⚠️ Selecione e copie manualmente o texto.', 'info');
    }
  } catch (e) {
    console.error('Erro no fallback de cópia:', e);
    showToast('Erro ao copiar para a área de transferência.', 'danger');
  }
}

function copySubjectToClipboard() {
  const subject = document.getElementById('previewSubject').textContent;
  if (!subject || subject === '-') {
    showToast('Nenhum assunto definido para copiar.', 'info');
    return;
  }

  try {
    navigator.clipboard.writeText(subject);
    showToast(`📋 Assunto copiado: "${subject}"`, 'success');
  } catch (e) {
    showToast('Erro ao copiar assunto.', 'danger');
  }
}

function openDirectlyInGmail() {
  const subject = document.getElementById('previewSubject').textContent;
  const recipient = document.getElementById('previewRecipient').textContent;
  const to = recipient.includes('@') ? recipient : '';
  const plainText = document.getElementById('gmailPreviewBody').innerText;

  const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainText)}`;
  window.open(url, '_blank');
}

function loadSampleText() {
  const sample = `A Sua Excelência a Senhora
Doutora RITA DE CÁSSIA ROCHA COSTA
Juíza de Direito da 1ª Vara Cível da Comarca de Aparecida de Goiânia
Aparecida de Goiânia - GO

Assunto: Pedido de reconsideração de decisão quanto à remarcação de 15 (quinze) dias de férias para o exercício de 2027.

Senhora Juíza de Direito,

De ordem do Presidente deste egrégio Tribunal de Justiça, Desembargador Leandro Crispim, encaminho a Vossa Excelência o inteiro teor do Despacho/Ofício proferido nos autos do PROAD nº 202604000731916, para manifestação no prazo de 10 (dez) dias, devendo a resposta ser enviada pelo malote digital ou por e-mail (secexecpres@tjgo.jus.br), fazendo-se referência ao evento 42 deste procedimento administrativo.

Respeitosamente,

ANDRYA FERREIRA BORGES QUEIROZ
Secretária Executiva da Presidência
Tribunal de Justiça do Estado de Goiás
23/3`;

  document.getElementById('rawTextInput').value = sample;
  onRawInputChanged();
  showToast('Exemplo oficial carregado com sucesso!', 'info');
}

function clearInputText() {
  document.getElementById('rawTextInput').value = '';
  localStorage.removeItem(STORAGE_KEY_LAST_RAW);
  currentValues = {};
  processRawInput();
  showToast('Entrada limpa. Cole seu texto novo e clique em Formatar!', 'info');
}

// Gerenciador de modelos
function renderTemplateManager() {
  const listContainer = document.getElementById('templatesListContainer');
  listContainer.innerHTML = '';

  templates.forEach(tpl => {
    const item = document.createElement('div');
    item.className = `template-list-item ${tpl.id === activeTemplateId ? 'active' : ''}`;
    item.onclick = () => selectTemplateForEditing(tpl.id);

    item.innerHTML = `
      <div>
        <div class="template-item-title">${escapeHtml(tpl.name)}</div>
        <div class="template-item-desc">${escapeHtml(tpl.desc || '')}</div>
      </div>
      <span class="material-symbols-outlined" style="font-size: 18px; color: var(--gray-500);">chevron_right</span>
    `;

    listContainer.appendChild(item);
  });

  const cur = getActiveTemplate();
  selectTemplateForEditing(cur.id);
}

function selectTemplateForEditing(tplId) {
  const tpl = templates.find(t => t.id === tplId);
  if (!tpl) return;

  editingTemplate = JSON.parse(JSON.stringify(tpl));

  const items = document.querySelectorAll('.template-list-item');
  items.forEach((it, idx) => {
    if (templates[idx] && templates[idx].id === tplId) {
      it.classList.add('active');
    } else {
      it.classList.remove('active');
    }
  });

  document.getElementById('editingModelTitle').textContent = `Editar: ${tpl.name}`;
  document.getElementById('editTemplateName').value = tpl.name || '';
  document.getElementById('editTemplateDesc').value = tpl.desc || '';
  document.getElementById('editTemplateSubject').value = tpl.subject || '';
  document.getElementById('templateBodyEditor').innerHTML = tpl.bodyHtml || '';
}

function saveCurrentTemplate() {
  if (!editingTemplate) return;

  const name = document.getElementById('editTemplateName').value.trim();
  if (!name) {
    alert('Por favor, informe um nome para o modelo.');
    return;
  }

  editingTemplate.name = name;
  editingTemplate.desc = document.getElementById('editTemplateDesc').value.trim();
  editingTemplate.subject = document.getElementById('editTemplateSubject').value.trim();
  editingTemplate.bodyHtml = document.getElementById('templateBodyEditor').innerHTML;

  const idx = templates.findIndex(t => t.id === editingTemplate.id);
  if (idx !== -1) {
    templates[idx] = JSON.parse(JSON.stringify(editingTemplate));
  } else {
    templates.push(JSON.parse(JSON.stringify(editingTemplate)));
    activeTemplateId = editingTemplate.id;
  }

  saveTemplates();
  renderTemplateSelector();
  renderTemplateManager();
  showToast(`✅ Modelo "${name}" salvo com sucesso!`, 'success');
}

function resetDefaultTemplates() {
  if (confirm('Deseja restaurar os modelos padrão de fábrica?')) {
    templates = JSON.parse(JSON.stringify(DEFAULT_TEMPLATES));
    activeTemplateId = templates[0].id;
    saveTemplates();
    renderTemplateSelector();
    renderTemplateManager();
    showToast('Modelos padrão restaurados com sucesso!', 'success');
  }
}

// Backup JSON
function exportData() {
  const data = {
    version: '5.0',
    exportDate: new Date().toISOString(),
    templates: templates
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `formatmail_modelos_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Modelos exportados em arquivo JSON!', 'success');
}

function triggerImport() {
  document.getElementById('importFileInput').click();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.templates && Array.isArray(parsed.templates)) {
        templates = parsed.templates;
        activeTemplateId = templates[0].id;
        saveTemplates();
        renderTemplateSelector();
        renderTemplateManager();
        processRawInput();
        showToast('Modelos importados com sucesso!', 'success');
      } else {
        alert('Formato de arquivo inválido. Deve conter uma lista de modelos.');
      }
    } catch (err) {
      alert('Erro ao ler o arquivo JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconName = type === 'success' ? 'check_circle' : (type === 'danger' ? 'error' : 'info');

  toast.innerHTML = `
    <span class="material-symbols-outlined" style="font-size: 20px;">${iconName}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeHtmlAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Funções de apoio da interface e editor de modelos
function onPreviewBodyEdited() {
  // Chamado quando o usuário digita diretamente na pré-visualização
}

function editCurrentTemplate() {
  switchTab('manage');
}

function createNewTemplateFromCurrent() {
  switchTab('manage');
  createNewTemplate();
}

function createNewTemplate() {
  const newId = 'tpl_' + Date.now();
  const newTpl = {
    id: newId,
    name: 'Novo Modelo',
    desc: 'Modelo personalizado',
    subject: '{assunto}',
    recipientVar: 'nome_destinatario',
    bodyHtml: '{conteudo_formatado_html}'
  };
  templates.push(newTpl);
  activeTemplateId = newId;
  saveTemplates();
  renderTemplateSelector();
  renderTemplateManager();
  selectTemplateForEditing(newId);
  showToast('Novo modelo criado!', 'success');
}

function duplicateCurrentTemplate() {
  const cur = getActiveTemplate();
  const copy = JSON.parse(JSON.stringify(cur));
  copy.id = 'tpl_' + Date.now();
  copy.name = `${cur.name} (Cópia)`;
  templates.push(copy);
  activeTemplateId = copy.id;
  saveTemplates();
  renderTemplateSelector();
  renderTemplateManager();
  selectTemplateForEditing(copy.id);
  showToast(`Modelo duplicado: "${copy.name}"`, 'success');
}

function deleteCurrentTemplate() {
  if (templates.length <= 1) {
    alert('Você não pode excluir o único modelo existente.');
    return;
  }
  const cur = getActiveTemplate();
  if (confirm(`Tem certeza que deseja excluir o modelo "${cur.name}"?`)) {
    templates = templates.filter(t => t.id !== cur.id);
    activeTemplateId = templates[0].id;
    saveTemplates();
    renderTemplateSelector();
    renderTemplateManager();
    showToast('Modelo excluído!', 'info');
  }
}

function execEditorCmd(cmd, val = null) {
  document.execCommand(cmd, false, val);
}

function insertGmailQuoteBox() {
  const html = `<div style="border-left: 4px solid #1a73e8; background-color: #f1f6fd; padding: 10px 14px; margin: 10px 0; font-family: Verdana, Geneva, sans-serif; font-size: 13px;">Destaque ou citação aqui</div><p></p>`;
  document.execCommand('insertHTML', false, html);
}

function insertGmailAlertBox() {
  const html = `<div style="border-left: 4px solid #f9ab00; background-color: #fef7e0; padding: 10px 14px; margin: 10px 0; font-family: Verdana, Geneva, sans-serif; font-size: 13px;">Aviso ou prazo importante aqui</div><p></p>`;
  document.execCommand('insertHTML', false, html);
}

function insertGmailTable() {
  const html = `<table style="border-collapse: collapse; width: 100%; margin: 12px 0; font-family: Verdana, Geneva, sans-serif; font-size: 13px;">
    <thead>
      <tr style="background-color: #f1f3f4;">
        <th style="border: 1px solid #dadce0; padding: 6px 10px; text-align: left;">Item</th>
        <th style="border: 1px solid #dadce0; padding: 6px 10px; text-align: left;">Descrição</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #dadce0; padding: 6px 10px;">01</td>
        <td style="border: 1px solid #dadce0; padding: 6px 10px;">Conteúdo</td>
      </tr>
    </tbody>
  </table><p></p>`;
  document.execCommand('insertHTML', false, html);
}

function insertGmailSignature() {
  const html = `<div style="margin-top: 22px; font-family: Verdana, Geneva, sans-serif; font-size: 13px; line-height: 1.4; color: #202124;">
  <p style="margin: 0 0 2px 0;">Nome do Signatário</p>
  <p style="margin: 0 0 2px 0;">Cargo / Unidade</p>
  <p style="margin: 0 0 2px 0;">Tribunal de Justiça do Estado de Goiás</p>
</div><p></p>`;
  document.execCommand('insertHTML', false, html);
}

function addCustomVariableTag() {
  const input = document.getElementById('newVarNameInput');
  const name = input.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  if (!name) return;
  document.execCommand('insertText', false, `{${name}}`);
  input.value = '';
}
