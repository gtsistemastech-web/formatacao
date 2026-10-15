# FormatMail Pro - Formatador de Texto para o Gmail

Sistema desenvolvido para receber qualquer texto bruto desestruturado (copiado de despachos, processos, mensagens, planilhas ou anotações) e formatá-lo automaticamente no **padrão oficial de comunicação da Secretaria Executiva da Presidência do TJGO**, pronto para ser colado com **1 clique** diretamente no corpo do Gmail com:
- ✅ **Nome do(a) Juiz(a) em negrito e maiúsculas**
- ✅ **Assunto em negrito**
- ✅ **Texto do ofício perfeitamente justificado**
- ✅ **Fecho e assinatura institucional da Presidência**

---

## 🏛️ Modelo Oficial Padronizado

O sistema vem pré-configurado com a estrutura exata:

```text
A Sua Excelência a Senhora
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
23/3
```

---

## 🚀 Como Iniciar

1. Basta dar dois cliques no arquivo **`iniciar.bat`** (ou abrir o arquivo [`index.html`](file:///C:/Users/gctormin/.gemini/antigravity/scratch/formatador-gmail/index.html) no Chrome ou Edge).
2. O sistema funciona **100% offline**, rápido e salva todas as suas alterações no próprio navegador.

---

## 💡 Como Funciona

### 1. Colagem Livre de Qualquer Origem
Você pode colar dados em qualquer ordem ou formato:
- O texto completo do ofício.
- Uma anotação rápida (ex: `Juíza Rita de Cássia, 1ª Vara Cível de Aparecida, PROAD 202604000731916 evento 42 prazo 10 dias 23/3`).
- Dados separados por linhas ou campos.

### 2. Detecção Automática Especializada
O sistema identifica automaticamente:
- **Magistrado(a)**: reconhece o nome, converte em MAIÚSCULAS e aplica **negrito**.
- **Gênero / Pronome**: detecta se é Magistrada ou Magistrado e ajusta o tratamento (*A Sua Excelência a Senhora / Doutora / Senhora Juíza* ou *A Sua Excelência o Senhor / Doutor / Senhor Juiz*). Também há botões de 1 clique para alternar.
- **Vara e Comarca**: identifica a vara e preenche a cidade e UF.
- **Assunto**: detecta o tema e aplica **negrito**.
- **PROAD**: identifica a numeração de 15 dígitos.
- **Evento**: identifica o número do evento citado.
- **Prazo**: detecta o prazo e formata em extenso (ex: `10 (dez) dias`).
- **Código da Minuta**: identifica o código do redator (ex: `23/3`).

### 3. Cópia Perfeita para o Gmail
- Clique no botão verde: **`📋 COPIAR FORMATADO PARA O GMAIL`**.
- No Gmail, pressione **`Ctrl + V`** no corpo da mensagem: o texto será inserido com o nome em negrito, o assunto em negrito, o parágrafo justificado e a assinatura intacta.
