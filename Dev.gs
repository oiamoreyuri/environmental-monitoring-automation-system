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

// ------------------------------------------------------------
// criarAbaSettings()
// Cria a aba SETTINGS na planilha caso não exista e a popula
// com as configurações dos equipamentos atuais e novos.
// Use para migração de estrutura operacional sem perda de dados.
// Executar manualmente a partir do editor do Apps Script.
// ------------------------------------------------------------
function criarAbaSettings() {
  Logger.log("=== INICIANDO CRIAÇÃO DA ABA SETTINGS ===");
  
  var ss = SpreadsheetApp.openById(CONFIG.planilhaId);
  var aba = ss.getSheetByName("SETTINGS");
  
  if (aba) {
    Logger.log("⚠️ Aba SETTINGS já existe. Nenhuma nova aba criada.");
  } else {
    aba = ss.insertSheet("SETTINGS");
    Logger.log("✅ Aba SETTINGS criada com sucesso.");
  }
  
  // Define cabeçalho estrutural
  var headers = [
    "CODIGO", "NOME", "AREA", "DOCUMENTO", "SEM_UMIDADE",
    "TEMP_MIN", "TEMP_MAX", "UMID_MIN", "UMID_MAX", "ALERTA_ATIVO", "FORMS_ID"
  ];
  aba.clear();
  aba.appendRow(headers);
  aba.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  aba.setFrozenRows(1);
  
  // Tenta buscar informações de NOME e AREA dos equipamentos atuais da aba "Lista de Equips."
  var locaisExistentes = {};
  var abaEquip = ss.getSheetByName("Lista de Equips.");
  if (abaEquip) {
    var dadosEquip = abaEquip.getDataRange().getValues();
    for (var i = 1; i < dadosEquip.length; i++) {
      var cod = String(dadosEquip[i][0]).trim();
      var local = String(dadosEquip[i][1]).trim();
      locaisExistentes[cod] = local;
    }
  }
  
  // Dados dos equipamentos atuais (temperatura + umidade)
  var equipsAtuais = [
    { cod: "COD-1040", doc: "FOR.IT.PS.PRO. 08-04", alerta: true },
    { cod: "COD-1041", doc: "FOR.IT.PS.PRO. 08-04", alerta: true },
    { cod: "COD-1042", doc: "FOR.IT.PS.PRO. 08-04", alerta: true },
    { cod: "COD-1043", doc: "FOR.IT.PS.PRO. 08-04", alerta: false }, // Inativo
    { cod: "COD-1044", doc: "FOR.IT.PS.PRO. 08-04", alerta: true },
    { cod: "COD-1045", doc: "FOR.IT.PS.PRO. 08-04", alerta: true },
    { cod: "COD-1046", doc: "FOR.IT.PS.PRO. 08-04", alerta: true },
    { cod: "COD-1047", doc: "FOR.IT.PS.PRO. 08-04", alerta: true },
    { cod: "COD-1048", doc: "FOR.IT.PS.PRO. 08-04", alerta: true },
    { cod: "COD-1049", doc: "FOR.IT.PS.PRO. 08-04", alerta: false }  // Inativo
  ];
  
  equipsAtuais.forEach(function(item) {
    var area = locaisExistentes[item.cod] || "";
    var nome = area; // Por padrão, nome amigável assume a área até confirmação
    aba.appendRow([
      item.cod,       // CODIGO
      nome,           // NOME
      area,           // AREA
      item.doc,       // DOCUMENTO
      false,          // SEM_UMIDADE
      18,             // TEMP_MIN
      28,             // TEMP_MAX
      30,             // UMID_MIN
      65,             // UMID_MAX
      item.alerta,    // ALERTA_ATIVO
      ""              // FORMS_ID
    ]);
  });
  
  // Dados dos equipamentos novos do laboratório (somente temperatura, SEM umidade)
  // Deixaremos TEMP_MIN e TEMP_MAX como vazios ou placeholders até confirmação
  var equipsLab = [
    { cod: "COD-0911", nome: "Estufa Mesófilos", area: "Lab. Microbiologia", doc: "FOR.PS.LAB. 03-02", tempMin: 34, tempMax: 36 },
    { cod: "COD-0912", nome: "Estufa Bolores e Leveduras", area: "Lab. Microbiologia", doc: "FOR.PS.LAB. 03-02", tempMin: 24, tempMax: 26 },
    { cod: "COD-0913", nome: "Estufa Entero/Staph/E.coli", area: "Lab. Microbiologia", doc: "FOR.PS.LAB. 03-02", tempMin: 34, tempMax: 36 },
    { cod: "COD-0914", nome: "Estufa Salmonella", area: "Lab. Microbiologia", doc: "FOR.PS.LAB. 03-02", tempMin: 40.5, tempMax: 42.5 },
    { cod: "COD-0917", nome: "Estufa Coliformes termotolerantes", area: "Lab. Microbiologia", doc: "FOR.PS.LAB. 03-02", tempMin: 44, tempMax: 46 },
    { cod: "COD-1130", nome: "Geladeira", area: "Lab. Microbiologia", doc: "FOR.PS.LAB. 03-02", tempMin: 2, tempMax: 8 },
    { cod: "COD-1131", nome: "Ar Ambiente", area: "Lab. Microbiologia", doc: "FOR.PS.LAB. 03-02", tempMin: 16, tempMax: 22 }
  ];
  
  equipsLab.forEach(function(item) {
    aba.appendRow([
      item.cod,       // CODIGO
      item.nome,      // NOME
      item.area,      // AREA
      item.doc,       // DOCUMENTO
      true,           // SEM_UMIDADE
      item.tempMin,   // TEMP_MIN
      item.tempMax,   // TEMP_MAX
      "",             // UMID_MIN
      "",             // UMID_MAX
      true,           // ALERTA_ATIVO
      ""              // FORMS_ID
    ]);
  });
  
  // Formatação visual das colunas da aba SETTINGS
  aba.setColumnWidth(1, 100);  // CODIGO
  aba.setColumnWidth(2, 200);  // NOME
  aba.setColumnWidth(3, 180);  // AREA
  aba.setColumnWidth(4, 180);  // DOCUMENTO
  aba.setColumnWidth(5, 120);  // SEM_UMIDADE
  aba.setColumnWidth(6, 90);   // TEMP_MIN
  aba.setColumnWidth(7, 90);   // TEMP_MAX
  aba.setColumnWidth(8, 90);   // UMID_MIN
  aba.setColumnWidth(9, 90);   // UMID_MAX
  aba.setColumnWidth(10, 110); // ALERTA_ATIVO
  aba.setColumnWidth(11, 250); // FORMS_ID
  
  Logger.log("✅ População da aba SETTINGS finalizada com sucesso!");
  Logger.log("=== FIM DA EXECUÇÃO ===");
}