# PROJECT_CONTEXT.md
> Arquivo de contexto do projeto. Referencie este arquivo no início de cada sessão de desenvolvimento.

---

## Objetivo

Plataforma de automação de compliance para monitoramento de temperatura e umidade em indústria alimentícia certificada FSSC 22000. Substitui processo manual em papel por fluxo digital integrado, da coleta via QR Code até aprovação e verificação de integridade dos registros mensais.

---

## Stack

- **Backend:** Google Apps Script (JavaScript)
- **Armazenamento:** Google Sheets (RAW_DATA, LOG_INTEGRIDADE, LOG_ACESSO)
- **Coleta de dados:** Google Forms com QR Code pré-preenchido
- **Armazenamento de documentos:** Google Drive
- **Notificações:** Gmail API (e-mail) + CallMeBot API (WhatsApp)
- **Integridade:** SHA-256 via Utilities.computeDigest
- **Etiquetas:** ZPL (Zebra Programming Language) para impressora Zebra GC420t 203 DPI
- **Versionamento:** Git + GitHub (clasp para sync local)
- **Ambiente local:** Linux, zsh, ~/monitoramento-ambiental

---

## Estrutura do projeto

```
monitoramento-ambiental/
├── Codigo.js              # Script principal — toda a lógica backend
├── aprovacao.html         # Template HTML da página de aprovação
├── appsscript.json        # Manifest do Apps Script
├── .env.example           # Variáveis de configuração necessárias
├── .gitignore
├── README.md
└── docs/
    ├── architecture.md
    ├── business-impact.md
    ├── technical-challenges.md
    ├── future-roadmap.md
    ├── engineering-role.md
    ├── screenshots.md
    └── images/            # 9 screenshots operacionais
```

---

## IDs críticos (não commitar)

```
Planilha:          1-afpK9G2CnET4Cz4b8RSyhqODcljQgU7QqwvY3gllXw
Script:            1Kx934SdYGO77r9lWuVnuicN0X2Za6lhjjKzQCBPjhGkcJSjPxfrLcPmk
Assinatura Drive:  1fSTtPWaRCOUD6ldftL8jmBIUB7rzkjHt
URL QR/Aprovação:  https://script.google.com/macros/s/AKfycbxQNrEsV0fK9FjLx7K9_jsPBolmqHQXDnE2WZ_ahpYKTWqC6wSQHQ4cwZBi6VcT6KTmRA/exec
```

---

## Abas da planilha

| Aba | Função |
|---|---|
| Respostas ao formulário 1 | Dados brutos do Google Forms |
| RAW_DATA | Schema fixo 12 colunas — fonte única de verdade |
| Relatório Mensal | Dinâmico por COD (B5), mês (I5), ano (I6) |
| LOG_INTEGRIDADE | Hash SHA-256, aprovação, metadados dos PDFs |
| LOG_ACESSO | Registro de scans de QR code |
| Lista de Equips. | Cadastro COD, local, fabricante, modelo |
| Feriados | Calendário 2026 para cálculo último dia útil |

---

## Schema RAW_DATA (12 colunas fixas)

```
TIMESTAMP_FORMS | DEVICE_ID | DATA_MEDICAO | HORA_MEDICAO |
TEMP_ATUAL | TEMP_MAX | TEMP_MIN | UMIDADE |
RESPONSAVEL | OBSERVACOES | FONTE | TIMESTAMP_PROCESSAMENTO
```

---

## Equipamentos monitorados

| COD | Local | Alerta completude |
|---|---|---|
| COD-1040 | Mistura SD1 | Sim |
| COD-1041 | Mistura SD2 | Sim |
| COD-1042 | Mistura SD3 | Sim |
| COD-1043 | Envase SD2 | Não |
| COD-1044 | Amostras de Retenção | Sim |
| COD-1045 | Armazém Matéria Prima 1 | Sim |
| COD-1046 | Armazém Matéria Prima 2 | Sim |
| COD-1047 | Armazém Produto Acabado 1 | Sim |
| COD-1048 | Armazém Produto Acabado 2 | Sim |
| COD-1049 | Homogeneização | Não |

---

## Regras de negócio

- **Frequência de coleta:** 2x por dia (turno manhã antes das 12h, turno tarde a partir das 12h)
- **Dias úteis apenas:** alertas não disparam sábado e domingo
- **Alertas de completude:** disparam às 9h e 15h via e-mail e WhatsApp se equipamentos ativos não tiverem registro no turno
- **Geração de PDFs:** automática no último dia útil do mês às 18h via trigger
- **Aprovação:** PCQI (Yuri) revisa e aprova via interface web após geração
- **Integridade:** cada PDF recebe hash SHA-256 gravado em LOG_INTEGRIDADE
- **Certificado:** gerado na aprovação com hash, assinatura e timestamp
- **Verificação:** QR code no certificado aponta para página de verificação em tempo real
- **Limites de temperatura:** monitoramento de temperatura ambiente — sem limites críticos definidos atualmente (planejado para implementação futura via aba SETTINGS)
- **Separador decimal:** normalizado para vírgula no onFormSubmit independente do locale do dispositivo

---

## Rotas do WebApp

| Rota | Função |
|---|---|
| ?id=COD-XXXX | QR code — abre confirmação e redireciona para Forms |
| ?page=aprovacao | Interface de aprovação mensal |
| ?page=aprovacao&mes=MM&ano=AAAA | Aprovação de mês específico |
| ?page=verify&hash=H&cod=C&mes=M&ano=A | Verificação de autenticidade |

---

## Funções principais no Codigo.js

| Função | Descrição |
|---|---|
| doGet(e) | Roteamento principal do WebApp |
| onFormSubmit(e) | Trigger — normaliza e grava na RAW_DATA |
| gerarPDFsMensais() | Gera PDFs para todos os equipamentos |
| processarAprovacao_(cod, mes, ano) | Aprova e gera certificado |
| gerarPdfCertificado_(...) | Gera PDF do certificado via HTML→Drive API |
| aprovarRelatorio(cod, mes, ano) | Wrapper público para google.script.run |
| doGetAprovacao(e) | Serve a página de aprovação |
| doGetVerificacao(e) | Serve a página de verificação de hash |
| notificarAprovacao_(mes, ano, ...) | Envia e-mail e WhatsApp pós-geração |
| verificarCompletude_(turno, ...) | Verifica e alerta registros faltantes |
| calcularHashPDF_(blob) | SHA-256 do blob PDF |
| registrarIntegridade_(...) | Grava na LOG_INTEGRIDADE |
| normalizarDecimal_(val) | Troca ponto por vírgula nos valores numéricos |

---

## Estado atual (20/05/2026)

**Funcionando em produção:**
- QR code com confirmação e redirect para Forms
- Coleta via Google Forms com campos pré-preenchidos
- RAW_DATA com normalização automática no onFormSubmit
- Alertas de completude às 9h e 15h (e-mail + WhatsApp)
- Geração automática de PDFs no último dia útil
- Hash SHA-256 e LOG_INTEGRIDADE
- Página de aprovação web com google.script.run
- Certificado de Aprovação PDF com assinatura
- Página de verificação de hash em tempo real
- Notificação automática pós-geração com link de aprovação
- Etiquetas ZPL para impressora Zebra
- Git + GitHub com código sanitizado

**Pendente:**
- Corrigir status "Pendente" na verificação de hash (duplicatas na LOG_INTEGRIDADE de testes anteriores)
- Aba SETTINGS para externalizar CONFIG da planilha
- Spinner/feedback visual na aprovação
- Validação de range de temperatura no onFormSubmit
- Migração para conta Google institucional
- IT/PS de documentação formal no padrão Docefruta

---

## Decisões técnicas relevantes

- `google.script.run` em vez de fetch — contorna bloqueio cross-origin do iframe googleusercontent.com
- `instanceof Date` na comparação de MES_ANO — Sheets converte string "04/2026" para Date silenciosamente
- Wrapper público `aprovarRelatorio()` — funções com underscore são privadas e invisíveis ao google.script.run
- `normalizarDecimal_()` no onFormSubmit — dispositivos com locale não-BR enviam ponto como separador decimal
- ZPL nativo em vez de PNG — imagens raster degradam em impressoras térmicas a 203 DPI
- Retry com `i--` no loop de PDFs — Drive API retorna 429 em chamadas sequenciais rápidas

---

## Como usar este projeto com IA

1. **Inicie a sessão** dizendo: "continua o projeto de monitoramento ambiental"
2. **Referencie este arquivo** colando o conteúdo ou dizendo "leia o PROJECT_CONTEXT.md"
3. **Trabalhe por função** — nunca envie o Codigo.js inteiro de uma vez
4. **Ao modificar código** — sempre confirme qual função está sendo alterada antes de aplicar
5. **Ao final de cada sessão** — atualize o resumo no Drive com o estado atual
6. **Para commitar** — sempre rodar `clasp pull` + sanitização dos dados sensíveis antes do `git push`

---

## Sanitização antes do git push

```bash
sed -i 's|URL_DO_FORMS|YOUR_GOOGLE_FORM_URL|g' Codigo.js
sed -i 's|ID_DA_PLANILHA|YOUR_SPREADSHEET_ID|g' Codigo.js
sed -i 's|Yuri de Carvalho Oiamoré|YOUR_NAME|g' Codigo.js
sed -i 's|Supervisor de Controle de Qualidade|YOUR_ROLE|g' Codigo.js
sed -i 's|controledequalidade@docefruta.ind.br|YOUR_EMAIL|g' Codigo.js
sed -i 's|Docefruta Ind. e Com. de Alimentos Ltda.|YOUR_COMPANY_NAME|g' Codigo.js
sed -i 's|ID_ASSINATURA|YOUR_SIGNATURE_FILE_ID|g' Codigo.js
sed -i 's|URL_WEBAPP|YOUR_WEBAPP_URL|g' Codigo.js
sed -i 's|NUMERO_WHATSAPP|YOUR_WHATSAPP_NUMBER|g' Codigo.js
sed -i 's|API_KEY_CALLMEBOT|YOUR_CALLMEBOT_API_KEY|g' Codigo.js
```
