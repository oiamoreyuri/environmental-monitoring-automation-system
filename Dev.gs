// ============================================================
// Dev.gs
// Responsabilidade: funções de desenvolvimento, teste e
// diagnóstico. Não contém lógica de produção.
//
// ATENÇÃO:
//   - Nenhuma função deste arquivo é chamada por trigger
//     automático ou pelo web app.
//   - Funções são executadas manualmente pelo desenvolvedor
//     no editor do Apps Script.
//   - Em ambiente de produção estável, este arquivo pode ser
//     removido do projeto sem impacto operacional.
// ============================================================

// ------------------------------------------------------------
// testeLog()
// Simula um escaneamento de QR Code gravando diretamente
// em LOG_ACESSO. Use para verificar se registrarAcessoQr_
// está funcionando corretamente.
// ------------------------------------------------------------
function testeLog() {
  registrarAcessoQr_("COD-1040", "2026-05-06", "14:30");
  Logger.log("testeLog executado — verifique a aba LOG_ACESSO.");
}

// ------------------------------------------------------------
// testeAlerta()
// Dispara manualmente o alerta do turno da manhã.
// Use para verificar envio de e-mail e WhatsApp sem
// aguardar o trigger das 9h.
// ------------------------------------------------------------
function testeAlerta() {
  verificarCompletude_("manhã", 0, 12);
}

// ------------------------------------------------------------
// testeNotificacaoAprovacao()
// Dispara manualmente a notificação de PDFs prontos para
// aprovação. Use para verificar o e-mail e WhatsApp sem
// aguardar a geração real do último dia útil.
// ------------------------------------------------------------
function testeNotificacaoAprovacao() {
  notificarAprovacao_(4, 2026, 10, []);
}

// ------------------------------------------------------------
// testeHashPDF()
// Calcula e loga o hash SHA-256 do primeiro PDF encontrado
// na pasta de relatórios do mês atual.
// Use para verificar se calcularHash_ está operacional.
// ------------------------------------------------------------
function testeHashPDF() {
  var ss      = SpreadsheetApp.openById(CONFIG.planilhaId);
  var abaRel  = ss.getSheetByName(ABA_RELATORIO);
  var mes     = abaRel.getRange(CELULA_MES).getValue();
  var ano     = abaRel.getRange(CELULA_ANO).getValue();

  if (!mes || !ano) {
    Logger.log("❌ Defina mês e ano na aba Relatório Mensal antes de testar.");
    return;
  }

  try {
    var pasta    = localizarOuCriarSubpasta_(mes, ano);
    var arquivos = pasta.getFiles();
    if (!arquivos.hasNext()) {
      Logger.log("❌ Nenhum arquivo encontrado na pasta " + nomeSubpasta_(mes, ano));
      return;
    }
    var arquivo = arquivos.next();
    var bytes   = arquivo.getBlob().getBytes();
    var hash    = calcularHash_(bytes);
    Logger.log("✅ Arquivo: " + arquivo.getName());
    Logger.log("   Hash SHA-256: " + hash);
  } catch (err) {
    Logger.log("❌ Erro testeHashPDF: " + err.message);
  }
}

// ------------------------------------------------------------
// diagnosticoSistema()
// Verifica o estado geral do sistema: abas, triggers ativos,
// PropertiesService e último registro em RAW_DATA.
// Use para diagnóstico rápido sem abrir a planilha.
// ------------------------------------------------------------
function diagnosticoSistema() {
  Logger.log("=== DIAGNÓSTICO DO SISTEMA ===");

  // Planilha e abas
  try {
    var ss   = SpreadsheetApp.openById(CONFIG.planilhaId);
    var abas = ["RAW_DATA", "LOG_INTEGRIDADE", "LOG_ACESSO",
                "Relatório Mensal", "Lista de Equips.", "Feriados"];
    abas.forEach(function(nome) {
      var aba = ss.getSheetByName(nome);
      Logger.log((aba ? "✅" : "❌") + " Aba: " + nome
        + (aba ? " (" + (aba.getLastRow() - 1) + " registros)" : " — NÃO ENCONTRADA"));
    });
  } catch (err) {
    Logger.log("❌ Erro ao acessar planilha: " + err.message);
  }

  // Triggers
  Logger.log("--- Triggers ativos ---");
  listarTriggers();

  // PropertiesService
  Logger.log("--- PropertiesService ---");
  var props = PropertiesService.getScriptProperties().getProperties();
  var chaves = Object.keys(props);
  Logger.log(chaves.length + " propriedade(s) configurada(s): " + chaves.join(", "));

  // Último registro RAW_DATA
  try {
    var abaRaw  = ss.getSheetByName(ABA_RAW);
    var lastRow = abaRaw ? abaRaw.getLastRow() : 0;
    if (lastRow > 1) {
      var ultimo = abaRaw.getRange(lastRow, 1, 1, 4).getValues()[0];
      Logger.log("--- Último registro RAW_DATA ---");
      Logger.log("  Timestamp: " + formatarTs_(ultimo[0]));
      Logger.log("  Equipamento: " + ultimo[1]);
      Logger.log("  Data: " + ultimo[2]);
      Logger.log("  Hora: " + ultimo[3]);
    }
  } catch (err) {
    Logger.log("❌ Erro ao ler RAW_DATA: " + err.message);
  }

  Logger.log("=== FIM DO DIAGNÓSTICO ===");
}