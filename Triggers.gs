// ============================================================
// Triggers.gs
// Responsabilidade: criação e remoção dos triggers automáticos
// do projeto. Funções de setup de infraestrutura.
//
// DEPENDÊNCIAS EXTERNAS:
//   Config.gs  → CONFIG
//   Pdf.gs     → verificarEGerarPDFs
//   Notificacoes.gs → alertaTurnoManha, alertaTurnoTarde
//   Forms.gs   → onFormSubmit
//
// NOTAS:
//   - Nenhuma função aqui executa lógica de negócio.
//   - Todas as funções de configurarTrigger* são idempotentes:
//     removem triggers existentes antes de criar novos,
//     evitando duplicatas.
//   - Execute cada função UMA VEZ após deploy. Não são
//     chamadas automaticamente.
// ============================================================

// ------------------------------------------------------------
// configurarTriggerMensal()
// Cria trigger diário às 18h para verificarEGerarPDFs.
// A função verificarEGerarPDFs só age no último dia útil
// do mês — o trigger diário é o mecanismo de polling.
// ------------------------------------------------------------
function configurarTriggerMensal() {
  removerTriggersPorFuncao_("verificarEGerarPDFs");
  ScriptApp.newTrigger("verificarEGerarPDFs")
    .timeBased()
    .atHour(18)
    .everyDays(1)
    .create();
  Logger.log("✅ Trigger mensal configurado — verificação diária às 18h.");
}

// ------------------------------------------------------------
// configurarTriggerAlerta()
// Cria triggers às 9h (manhã) e 15h (tarde) para alertas
// de completude de registros.
// ------------------------------------------------------------
function configurarTriggerAlerta() {
  removerTriggersPorFuncao_("alertaTurnoManha");
  removerTriggersPorFuncao_("alertaTurnoTarde");
  ScriptApp.newTrigger("alertaTurnoManha")
    .timeBased().atHour(9).everyDays(1).create();
  ScriptApp.newTrigger("alertaTurnoTarde")
    .timeBased().atHour(15).everyDays(1).create();
  Logger.log("✅ Triggers de alerta configurados — 9h e 15h.");
}

// ------------------------------------------------------------
// configurarTriggerForms()
// Cria trigger onFormSubmit vinculado à planilha principal.
// Necessário após qualquer republish do web app ou
// recriação da planilha.
// ------------------------------------------------------------
function configurarTriggerForms() {
  removerTriggersPorFuncao_("onFormSubmit");
  var ss = SpreadsheetApp.openById(CONFIG.planilhaId);
  ScriptApp.newTrigger("onFormSubmit")
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();
  Logger.log("✅ Trigger de Forms configurado.");
}

// ------------------------------------------------------------
// configurarTodosTriggers()
// Configura todos os triggers do projeto em uma única chamada.
// Use após deploy inicial ou reconstrução do ambiente.
// ------------------------------------------------------------
function configurarTodosTriggers() {
  configurarTriggerForms();
  configurarTriggerAlerta();
  configurarTriggerMensal();
  Logger.log("✅ Todos os triggers configurados.");
}

// ------------------------------------------------------------
// listarTriggers()
// Utilitário de diagnóstico: lista todos os triggers ativos
// do projeto no log do Apps Script.
// ------------------------------------------------------------
function listarTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  if (triggers.length === 0) {
    Logger.log("ℹ️ Nenhum trigger ativo.");
    return;
  }
  triggers.forEach(function(t) {
    Logger.log("• " + t.getHandlerFunction()
      + " | tipo: " + t.getEventType()
      + " | fonte: " + t.getTriggerSource());
  });
}

// ------------------------------------------------------------
// removerTodosTriggers()
// Remove todos os triggers do projeto.
// Use com cautela — desativa completamente a automação.
// ------------------------------------------------------------
function removerTodosTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) { ScriptApp.deleteTrigger(t); });
  Logger.log("✅ Todos os triggers removidos (" + triggers.length + ").");
}

// ------------------------------------------------------------
// removerTriggersPorFuncao_(nomeFuncao)
// Remove todos os triggers associados a uma função específica.
// Chamada internamente pelas funções de configuração para
// garantir idempotência.
// ------------------------------------------------------------
function removerTriggersPorFuncao_(nomeFuncao) {
  var triggers = ScriptApp.getProjectTriggers();
  var removidos = 0;
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === nomeFuncao) {
      ScriptApp.deleteTrigger(t);
      removidos++;
    }
  });
  if (removidos > 0) {
    Logger.log("ℹ️ " + removidos + " trigger(s) de " + nomeFuncao + " removido(s).");
  }
}