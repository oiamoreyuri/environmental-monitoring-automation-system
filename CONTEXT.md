# CONTEXT.md — Briefing para o agente Claude Code

Este arquivo é o briefing completo do projeto para o agente de IA.
Leia integralmente antes de propor qualquer alteração.
Nunca tome decisões que contradizem o que está documentado aqui.

---

## 1. Sobre o projeto

Sistema operacional de monitoramento ambiental de temperatura e umidade
desenvolvido para a Docefruta Indústria e Comércio de Produtos Alimentícios Ltda,
certificada FSSC 22000. Substitui processo manual em papel por fluxo digital
integrado. Stack: Google Apps Script (JavaScript), Google Sheets, Google Forms,
Google Drive, Gmail, GitHub.

**Repositório:** https://github.com/oiamoreyuri/environmental-monitoring-automation-system

---

## 2. Regras de trabalho — OBRIGATÓRIAS

1. Fluxo de alteração: editar local no VS Code → `clasp push` → testar no
   Apps Script → `git commit` → `git push` GitHub. Nunca editar diretamente
   no editor do Apps Script.
2. Trabalhar etapa por etapa. A cada item finalizado e testado pelo usuário,
   avançar para o próximo. Nunca antecipar etapas sem confirmação.
3. Antes de gerar código, explicar a abordagem — quais estruturas serão usadas
   e por quê.
4. Todo código gerado deve ter comentários por bloco lógico.
5. Após gerar código, fazer 2-3 perguntas de verificação antes de avançar.
6. Não inventar valores, IDs ou configurações que não foram fornecidos.
7. Se faltar informação crítica, perguntar antes de prosseguir.

---

## 3. Estrutura do projeto

### 3.1 Arquivos .gs (módulos do Apps Script)

| Arquivo | Responsabilidade |
|---|---|
| `Config.gs` | Constantes globais, PropertiesService, inicialização de CONFIG e ALERTA |
| `WebApp.gs` | Roteamento HTTP (doGet/doPost), zero lógica de negócio |
| `QrCode.gs` | Fluxo de leitura do QR Code, registro de acesso, páginas HTML |
| `Forms.gs` | Recebimento e normalização de respostas do Forms, gravação em RAW_DATA |
| `Pdf.gs` | Geração de PDFs mensais, organização no Drive, trigger de último dia útil |
| `Utils.gs` | Funções utilitárias puras — sem I/O, sem acesso à planilha |
| `Certificado.gs` | Certificado de aprovação, fluxo PCQI, páginas de verificação e aprovação |
| `Integridade.gs` | Hash SHA-256, LOG_INTEGRIDADE |
| `Notificacoes.gs` | Alertas de completude, notificação de PDFs prontos para aprovação |
| `Triggers.gs` | Criação e remoção de triggers automáticos |
| `Dev.gs` | Funções de teste e diagnóstico — não chamadas por trigger |

### 3.2 Outros arquivos

| Arquivo | Descrição |
|---|---|
| `aprovacao.html` | Template HTML da página de aprovação PCQI |
| `appsscript.json` | Manifesto do projeto Apps Script |
| `.env.example` | Variáveis de configuração necessárias |
| `docs/` | Documentação técnica do projeto |

### 3.3 Abas da planilha Google Sheets

| Aba | Descrição |
|---|---|
| `Respostas ao formulário 1` | Respostas brutas do Google Forms |
| `RAW_DATA` | Dados normalizados, fonte canônica do sistema |
| `Relatório Mensal` | Template dinâmico gerado por fórmulas FILTER |
| `LOG_INTEGRIDADE` | Hash SHA-256, metadados dos PDFs, status de aprovação |
| `LOG_ACESSO` | Registro de escaneamentos de QR Code |
| `Lista de Equips.` | Cadastro de equipamentos com limites nominais |
| `Feriados` | Feriados cadastrados para cálculo de último dia útil |

---

## 4. IDs e URLs importantes

```
Planilha ID:     1-afpK9G2CnET4Cz4b8RSyhqODcljQgU7QqwvY3gllXw
Web App URL:     https://script.google.com/macros/s/AKfycbxQNrEsV0fK9FjLx7K9_jsPBolmqHQXDnE2WZ_ahpYKTWqC6wSQHQ4cwZBi6VcT6KTmRA/exec
```

---

## 5. Configuração atual (Config.gs)

### 5.1 Equipamentos cadastrados

| Código | Status no alerta |
|---|---|
| COD-1040 | Ativo |
| COD-1041 | Ativo |
| COD-1042 | Ativo |
| COD-1043 | Inativo (equipamento fora de uso) |
| COD-1044 | Ativo |
| COD-1045 | Ativo |
| COD-1046 | Ativo |
| COD-1047 | Ativo |
| COD-1048 | Ativo |
| COD-1049 | Inativo (equipamento fora de uso) |

Todos medem temperatura E umidade. Documento de referência: `FOR.IT.PS.PRO. 08-04`.

### 5.2 Credenciais

Todas as credenciais estão no PropertiesService do Apps Script.
Nunca hardcodar credenciais no código. As chaves existentes são:

```
FORM_URL, PLANILHA_ID, ASSINATURA_ID, URL_APROVACAO, URL_VERIFICACAO,
ENTRY_ID, ENTRY_DATA, ENTRY_HORA, RESPONSAVEL_NOME, RESPONSAVEL_CARGO,
RESPONSAVEL_EMAIL, EMPRESA, ALERTA_EMAIL, WHATSAPP_NUMERO, WHATSAPP_API_KEY
```

### 5.3 ALERTA (objeto em Config.gs)

```javascript
var ALERTA = {
  equipamentosAtivos: [
    "COD-1040","COD-1041","COD-1042",
    "COD-1044","COD-1045","COD-1046","COD-1047","COD-1048"
  ],
  get emailDestino()   { return CONFIG.alerta.emailDestino;   },
  get whatsappNumero() { return CONFIG.alerta.whatsappNumero; },
  get whatsappApiKey() { return CONFIG.alerta.whatsappApiKey; }
};
```

---

## 6. Decisões técnicas já tomadas — NÃO REVERTER

- `CONFIG` é inicializado como variável global em `Config.gs` via
  `var CONFIG = getConfig()`. Não remover nem mover.
- `gerarPdfCertificado_` é função global em `Certificado.gs`.
  Não aninhá-la dentro de nenhuma outra função.
- `notificarAprovacao_` existe apenas em `Notificacoes.gs`. Não duplicar.
- `calcularHash_` em `Integridade.gs` recebe bytes puros, não blob.
- `verificarCompletude_` lê exclusivamente de `RAW_DATA`, nunca de
  "Respostas ao formulário 1".
- Dependências entre módulos são documentadas no cabeçalho de cada arquivo
  (Opção B). Não criar namespace explícito por objeto agora.
- Todas as funções utilitárias puras ficam em `Utils.gs`.
- Padrão de nomenclatura: funções internas com underscore no final (ex:
  `processarAprovacao_`). Funções públicas sem underscore.
- Rota legada `?acao=` removida de `WebApp.gs`. Não reintroduzir.

---

## 7. Próximas etapas — implementar NESTA ORDEM

### ETAPA 1 — Aba SETTINGS na planilha Google Sheets

**Objetivo:** externalizar configuração operacional para que adição de
equipamentos, mudança de limites e troca de e-mail não exijam edição de
código.

**Estrutura da aba SETTINGS:**

| Coluna | Header | Tipo | Exemplo |
|---|---|---|---|
| A | CODIGO | String | COD-1040 |
| B | NOME | String | Mistura 1 |
| C | AREA | String | Produção |
| D | DOCUMENTO | String | FOR.IT.PS.PRO. 08-04 |
| E | SEM_UMIDADE | Boolean | FALSE |
| F | TEMP_MIN | Number | 18 |
| G | TEMP_MAX | Number | 28 |
| H | UMID_MIN | Number | 30 |
| I | UMID_MAX | Number | 65 |
| J | ALERTA_ATIVO | Boolean | TRUE |
| K | FORMS_ID | String | (ID do Google Forms vinculado) |

**Linha 1:** cabeçalho com os headers acima, negrito.
**A partir da linha 2:** um equipamento por linha.

**Equipamentos que devem ser cadastrados na SETTINGS:**

Equipamentos atuais (temperatura + umidade):
| CODIGO | NOME | AREA | DOCUMENTO | SEM_UMIDADE | TEMP_MIN | TEMP_MAX | UMID_MIN | UMID_MAX | ALERTA_ATIVO |
|---|---|---|---|---|---|---|---|---|---|
| COD-1040 | (confirmar com usuário) | (confirmar) | FOR.IT.PS.PRO. 08-04 | FALSE | 18 | 28 | 30 | 65 | TRUE |
| COD-1041 | (confirmar) | (confirmar) | FOR.IT.PS.PRO. 08-04 | FALSE | 18 | 28 | 30 | 65 | TRUE |
| COD-1042 | (confirmar) | (confirmar) | FOR.IT.PS.PRO. 08-04 | FALSE | 18 | 28 | 30 | 65 | TRUE |
| COD-1043 | (confirmar) | (confirmar) | FOR.IT.PS.PRO. 08-04 | FALSE | 18 | 28 | 30 | 65 | FALSE |
| COD-1044 | (confirmar) | (confirmar) | FOR.IT.PS.PRO. 08-04 | FALSE | 18 | 28 | 30 | 65 | TRUE |
| COD-1045 | (confirmar) | (confirmar) | FOR.IT.PS.PRO. 08-04 | FALSE | 18 | 28 | 30 | 65 | TRUE |
| COD-1046 | (confirmar) | (confirmar) | FOR.IT.PS.PRO. 08-04 | FALSE | 18 | 28 | 30 | 65 | TRUE |
| COD-1047 | (confirmar) | (confirmar) | FOR.IT.PS.PRO. 08-04 | FALSE | 18 | 28 | 30 | 65 | TRUE |
| COD-1048 | (confirmar) | (confirmar) | FOR.IT.PS.PRO. 08-04 | FALSE | 18 | 28 | 30 | 65 | TRUE |
| COD-1049 | (confirmar) | (confirmar) | FOR.IT.PS.PRO. 08-04 | FALSE | 18 | 28 | 30 | 65 | FALSE |

Equipamentos novos do laboratório (somente temperatura, SEM umidade):
| CODIGO | NOME | AREA | DOCUMENTO | SEM_UMIDADE | TEMP_MIN | TEMP_MAX | UMID_MIN | UMID_MAX | ALERTA_ATIVO |
|---|---|---|---|---|---|---|---|---|---|
| COD-0911 | Estufa Mesófilos | Lab. Microbiologia | FOR.PS.LAB. 03-02 | TRUE | (confirmar) | (confirmar) | — | — | TRUE |
| COD-0912 | Estufa Bolores e Leveduras | Lab. Microbiologia | FOR.PS.LAB. 03-02 | TRUE | (confirmar) | (confirmar) | — | — | TRUE |
| COD-0913 | Estufa Entero/Staph/E.coli | Lab. Microbiologia | FOR.PS.LAB. 03-02 | TRUE | (confirmar) | (confirmar) | — | — | TRUE |
| COD-0914 | Estufa Salmonella | Lab. Microbiologia | FOR.PS.LAB. 03-02 | TRUE | (confirmar) | (confirmar) | — | — | TRUE |
| COD-0917 | Estufa Coliformes termotolerantes | Lab. Microbiologia | FOR.PS.LAB. 03-02 | TRUE | (confirmar) | (confirmar) | — | — | TRUE |
| COD-1130 | Geladeira | Lab. Microbiologia | FOR.PS.LAB. 03-02 | TRUE | (confirmar) | (confirmar) | — | — | TRUE |
| COD-1131 | Ar Ambiente | Lab. Microbiologia | FOR.PS.LAB. 03-02 | TRUE | (confirmar) | (confirmar) | — | — | TRUE |

**ATENÇÃO:** Os campos marcados como "(confirmar)" devem ser perguntados
ao usuário antes de preencher. Não inventar valores.

**O que fazer nesta etapa:**
1. Criar a aba SETTINGS na planilha com a estrutura acima
2. Preencher os dados que já estão confirmados
3. Perguntar ao usuário os valores faltantes antes de avançar
4. NÃO alterar Config.gs ainda — isso é a Etapa 2

---

### ETAPA 2 — Adaptar Config.gs para ler da aba SETTINGS

**Objetivo:** `Config.gs` passa a ler equipamentos, limites e configurações
operacionais da aba SETTINGS em vez de tê-los hardcoded.

**O que muda em Config.gs:**
- `EQUIPAMENTOS_PDF` deixa de ser array fixo e passa a ser lido da SETTINGS
- `ALERTA.equipamentosAtivos` passa a ser lido da coluna ALERTA_ATIVO da SETTINGS
- Os limites nominais por equipamento passam a vir da SETTINGS
- `CONFIG` e `PropertiesService` permanecem inalterados — credenciais
  continuam no cofre

**Nova função a criar em Config.gs:**
```javascript
// Lê a aba SETTINGS e retorna array de objetos com configuração
// de cada equipamento. Chamada uma vez por invocação.
function carregarSettings_() { ... }
```

**IMPORTANTE:** A estrutura modular existente não muda. Apenas
`Config.gs` é alterado. Nenhum outro módulo precisa ser modificado
nesta etapa.

---

### ETAPA 3 — Google Forms separado para equipamentos do laboratório

**Objetivo:** criar um Forms sem campo de umidade, vinculado à mesma
RAW_DATA da planilha principal.

**Campos do novo Forms (na mesma ordem do Forms atual):**
1. Código do equipamento (lista suspensa com COD-0911 a COD-1131)
2. Data da medição
3. Horário
4. Temperatura atual (°C)
5. Temperatura máxima (°C)
6. Temperatura mínima (°C)
7. ~~Umidade (%%)~~ — NÃO incluir
8. Responsável
9. Observações (lista suspensa com os status padronizados)

**onFormSubmit:** o trigger existente em `Forms.gs` deve funcionar
para os dois formulários. O campo de umidade chegará vazio — gravar
string vazia em RAW_DATA, sem erro.

**Após criar o Forms:**
- Atualizar SETTINGS coluna FORMS_ID com o ID do novo Forms
- Gerar QR Codes novos para cada equipamento do lab
- Imprimir etiquetas ZPL

---

### ETAPA 4 — Adaptar Certificado.gs para usar DOCUMENTO da SETTINGS

**Objetivo:** o PDF do certificado e o rodapé do relatório devem exibir
o código do documento correto por equipamento, lido da SETTINGS.

**O que muda em Certificado.gs:**
- `gerarPdfCertificado_` recebe o código do documento como parâmetro
  em vez de usar string hardcoded
- Quem chama `gerarPdfCertificado_` (em `Pdf.gs`) passa o valor
  correto lido da SETTINGS

**Rodapé atual hardcoded em gerarPdfCertificado_:**
```javascript
'FOR.IT.PS.PRO. 08-04 | Rev. 00 | ' + CONFIG.empresa
```

**Deve virar:**
```javascript
documento + ' | Rev. 00 | ' + CONFIG.empresa
```

Onde `documento` é o valor da coluna DOCUMENTO da SETTINGS para o
equipamento sendo processado.

---

## 8. O que NÃO fazer

- Não alterar `RAW_DATA` — schema fixo de 12 colunas, não adicionar colunas
- Não alterar `aprovacao.html` ou `appsscript.json` sem instrução explícita
- Não criar novos módulos `.gs` sem instrução explícita
- Não mover funções entre módulos sem instrução explícita
- Não alterar o fluxo de geração de PDF, hash ou aprovação
- Não remover `mergearPDFs_` de `Pdf.gs` (marcada como legado, mantida)
- Não hardcodar credenciais no código
- Não fazer deploy sem o usuário confirmar que o teste passou
