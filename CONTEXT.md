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
| `SETTINGS` | Cadastro unificado de equipamentos, limites, documentos e metadados regulatórios |
| `Lista de Equips.` | ~~Cadastro legado~~ — dados migrados para SETTINGS (pode ser removida) |
| `Feriados` | Feriados cadastrados para cálculo de último dia útil |

---

## 4. IDs e URLs importantes

```
Planilha ID:     1-afpK9G2CnET4Cz4b8RSyhqODcljQgU7QqwvY3gllXw
Web App URL:     https://script.google.com/macros/s/AKfycbxQNrEsV0fK9FjLx7K9_jsPBolmqHQXDnE2WZ_ahpYKTWqC6wSQHQ4cwZBi6VcT6KTmRA/exec
```

---

## 5. Configuração atual (Config.gs)

### 5.1 Equipamentos cadastrados (aba SETTINGS)

| Código | Local | Equipamento | Documento | Alerta |
|---|---|---|---|---|
| COD-1040 | (Produção) | (Produção) | FOR.IT.PS.PRO. 08-04 | Ativo |
| COD-1041 | (Produção) | (Produção) | FOR.IT.PS.PRO. 08-04 | Ativo |
| COD-1042 | (Produção) | (Produção) | FOR.IT.PS.PRO. 08-04 | Ativo |
| COD-1043 | (Produção) | (Produção) | FOR.IT.PS.PRO. 08-04 | Inativo |
| COD-1044 | (Produção) | (Produção) | FOR.IT.PS.PRO. 08-04 | Ativo |
| COD-1045 | (Produção) | (Produção) | FOR.IT.PS.PRO. 08-04 | Ativo |
| COD-1046 | (Produção) | (Produção) | FOR.IT.PS.PRO. 08-04 | Ativo |
| COD-1047 | (Produção) | (Produção) | FOR.IT.PS.PRO. 08-04 | Ativo |
| COD-1048 | (Produção) | (Produção) | FOR.IT.PS.PRO. 08-04 | Ativo |
| COD-1049 | (Produção) | (Produção) | FOR.IT.PS.PRO. 08-04 | Inativo |
| COD-1185 | Lab. Microbiologia | Estufa Mesófilos | FOR.OS.LAB. 03-02 | Ativo |
| COD-1183 | Lab. Microbiologia | Estufa Bolores e Leveduras | FOR.OS.LAB. 03-02 | Ativo |
| COD-1184 | Lab. Microbiologia | Estufa Entero/Staph/E.coli | FOR.OS.LAB. 03-02 | Ativo |
| COD-1181 | Lab. Microbiologia | Estufa Salmonella | FOR.OS.LAB. 03-02 | Ativo |
| COD-1182 | Lab. Microbiologia | Estufa Coliformes termotolerantes | FOR.OS.LAB. 03-02 | Ativo |
| COD-1130 | Lab. Microbiologia | Geladeira Microbiologia | FOR.OS.LAB. 03-02 | Ativo |
| COD-1131 | Lab. Microbiologia | Ar Ambiente Microbiologia | FOR.OS.LAB. 03-02 | Ativo |

Equipamentos de produção medem temperatura + umidade. Equipamentos de laboratório medem apenas temperatura (`SEM_UMIDADE = TRUE`; umidade gravada como `"N/A"`).

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

## 7. Etapas concluídas

### ✅ ETAPA 1 — Aba SETTINGS (concluída)
Aba criada com 16 colunas e 17 equipamentos cadastrados.

### ✅ ETAPA 2 — Config.gs lendo da SETTINGS (concluída)
`carregarSettings_()` com cache em memória. `EQUIPAMENTOS_PDF` e `ALERTA.equipamentosAtivos` lidos dinamicamente.

### ✅ ETAPA 3 — Google Forms do laboratório (concluída)
Forms sem umidade criado. `onFormSubmit` detecta 9 vs 10 colunas automaticamente. Umidade gravada como `"N/A"`.

### ✅ ETAPA 4 — Certificado.gs dinâmico (concluída)
Código do documento lido da SETTINGS via `obterConfigEquipamento_()`. Rodapé do certificado usa variável dinâmica.

### ✅ ETAPA 5 — Unificação SETTINGS ← Lista de Equips. (concluída)
Dados de FABRICANTE e MODELO migrados. Todas as referências à aba `Lista de Equips.` eliminadas do código. Aba obsoleta.

### ✅ ETAPA 6 — Conformidade N/A e SGSAQ (concluída)
- Coluna de umidade do Relatório Mensal exibe `"N/A"` para equipamentos sem higrômetro
- Cabeçalhos dinâmicos (I1, C1, D5, D6, G5, G6) via VLOOKUP na SETTINGS
- Colunas REVISAO, VIGENCIA e TITULO_DOC na SETTINGS

---

## 8. Estrutura atual da aba SETTINGS

| Coluna | Header | Tipo | Descrição |
|---|---|---|---|
| A | CODIGO | String | Código único do equipamento |
| B | LOCAL | String | Localização física (ex: Lab. Microbiologia) |
| C | EQUIPAMENTO | String | Nome do equipamento (ex: Estufa Mesófilos) |
| D | DOCUMENTO | String | Código regulatório SGSAQ |
| E | SEM_UMIDADE | Boolean | TRUE = sem higrômetro (lab) |
| F | TEMP_MIN | Number | Limite inferior de temperatura |
| G | TEMP_MAX | Number | Limite superior de temperatura |
| H | UMID_MIN | Number | Limite inferior de umidade |
| I | UMID_MAX | Number | Limite superior de umidade |
| J | ALERTA_ATIVO | Boolean | TRUE = equipamento recebe alertas |
| K | FORMS_ID | String | ID do Google Forms vinculado |
| L | REVISAO | String | Revisão do documento (ex: Rev. 00) |
| M | VIGENCIA | String | Data de vigência do documento |
| N | TITULO_DOC | String | Título completo do documento |
| O | FABRICANTE | String | Fabricante do equipamento |
| P | MODELO | String | Modelo do equipamento |

---

## 9. O que NÃO fazer

- Não alterar `RAW_DATA` — schema fixo de 12 colunas, não adicionar colunas
- Não alterar `aprovacao.html` ou `appsscript.json` sem instrução explícita
- Não criar novos módulos `.gs` sem instrução explícita
- Não mover funções entre módulos sem instrução explícita
- Não alterar o fluxo de geração de PDF, hash ou aprovação
- Não remover `mergearPDFs_` de `Pdf.gs` (marcada como legado, mantida)
- Não hardcodar credenciais no código
- Não fazer deploy sem o usuário confirmar que o teste passou

