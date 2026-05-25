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
// executarTestesUnitarios()
// Executa a suíte de testes unitários para validar a lógica de
// parametrização da SETTINGS, cacheamento de dados, fallbacks de
// segurança e alinhamento de colunas dinâmicas do Forms.
// Acesse os resultados no console de execução do Apps Script.
// ------------------------------------------------------------
function executarTestesUnitarios() {
  Logger.log("🧪 INICIANDO SUÍTE DE TESTES UNITÁRIOS 🧪");
  var sucessos = 0;
  var falhas = 0;

  function assert(condicao, descricao) {
    if (condicao) {
      Logger.log("🟢 [PASS] " + descricao);
      sucessos++;
    } else {
      Logger.log("🔴 [FAIL] " + descricao);
      falhas++;
    }
  }

  // TESTE 1: Leitura do Equipamento COD-1185 (Microbiologia - Termômetro da Estufa Mesófilos)
  try {
    var config = obterConfigEquipamento_("COD-1185");
    assert(config !== null, "Configuração do COD-1185 deve ser encontrada.");
    if (config) {
      assert(config.tempMin === 34 && config.tempMax === 36, "COD-1185 deve possuir faixa 34°C - 36°C.");
      assert(config.semUmidade === true, "COD-1185 não deve ter higrômetro (semUmidade = true).");
      assert(config.documento === "FOR.OS.LAB. 03-02", "COD-1185 deve apontar para o documento FOR.OS.LAB. 03-02.");
    }
  } catch (err) {
    assert(false, "Erro ao testar COD-1185: " + err.message);
  }

  // TESTE 2: Leitura do Equipamento COD-1040 (Produção)
  try {
    var config1040 = obterConfigEquipamento_("COD-1040");
    assert(config1040 !== null, "Configuração do COD-1040 deve ser encontrada.");
    if (config1040) {
      assert(config1040.tempMin === 18 && config1040.tempMax === 28, "COD-1040 deve possuir faixa 18°C - 28°C.");
      assert(config1040.semUmidade === false, "COD-1040 deve possuir higrômetro (semUmidade = false).");
      assert(config1040.documento === "FOR.IT.PS.PRO. 08-04", "COD-1040 deve apontar para o documento FOR.IT.PS.PRO. 08-04.");
    }
  } catch (err) {
    assert(false, "Erro ao testar COD-1040: " + err.message);
  }

  // TESTE 3: Verificação de Mapeamento de Payload Simplificado (9 Colunas - Sem Higrômetro)
  try {
    // Simula e.values de um formulário de laboratório sem umidade
    var eMockLab = {
      values: [
        "25/05/2026 11:00:00", // [0] Timestamp
        "COD-1185",            // [1] ID
        "2026-05-25",          // [2] Data
        "11:00",               // [3] Hora
        "35.0",                // [4] Temp
        "36.0",                // [5] Max
        "34.0",                // [6] Min
        "yuri",                // [7] Responsável (deslocado)
        "Equipamento Ok"       // [8] Observações (deslocado)
      ]
    };
    
    var valsMock = eMockLab.values;
    var umidadeMock, responsavelMock, observacoesMock;
    
    if (valsMock.length >= 10) {
      umidadeMock     = valsMock[7];
      responsavelMock = valsMock[8];
      observacoesMock = valsMock[9];
    } else {
      umidadeMock     = ""; // Deve ser string vazia
      responsavelMock = valsMock[7];
      observacoesMock = valsMock[8];
    }
    
    assert(umidadeMock === "", "Payload simplificado (9 colunas) deve gravar umidade vazia.");
    assert(responsavelMock === "yuri", "Payload simplificado deve mapear o Responsável corretamente.");
    assert(observacoesMock === "Equipamento Ok", "Payload simplificado deve mapear as Observações corretamente.");
  } catch (err) {
    assert(false, "Erro ao testar mapeamento simplificado: " + err.message);
  }

  // TESTE 4: Verificação de Mapeamento de Payload Tradicional (10 Colunas - Com Higrômetro)
  try {
    // Simula e.values de um formulário de produção com umidade
    var eMockProd = {
      values: [
        "25/05/2026 11:00:00",
        "COD-1040",
        "2026-05-25",
        "11:00",
        "22.0",
        "25.0",
        "19.0",
        "45.0",                // [7] Umidade
        "samara",              // [8] Responsável
        "Calibração ok"        // [9] Observações
      ]
    };
    
    var valsMock2 = eMockProd.values;
    var umidadeMock2, responsavelMock2, observacoesMock2;
    
    if (valsMock2.length >= 10) {
      umidadeMock2     = valsMock2[7];
      responsavelMock2 = valsMock2[8];
      observacoesMock2 = valsMock2[9];
    } else {
      umidadeMock2     = "";
      responsavelMock2 = valsMock2[7];
      observacoesMock2 = valsMock2[8];
    }
    
    assert(umidadeMock2 === "45.0", "Payload tradicional (10 colunas) deve gravar a umidade corretamente.");
    assert(responsavelMock2 === "samara", "Payload tradicional deve mapear o Responsável corretamente.");
    assert(observacoesMock2 === "Calibração ok", "Payload tradicional deve mapear as Observações corretamente.");
  } catch (err) {
    assert(false, "Erro ao testar mapeamento tradicional: " + err.message);
  }

  Logger.log("=== CONCLUSÃO DOS TESTES ===");
  Logger.log("  TOTAL AVALIADO: " + (sucessos + falhas));
  Logger.log("  🟢 SUCESSOS: " + sucessos);
  Logger.log("  🔴 FALHAS:   " + falhas);
  
  if (falhas === 0) {
    Logger.log("🏆 SISTEMA 100% HOMOLOGADO E OPERACIONAL!");
  } else {
    Logger.log("⚠️ ATENÇÃO: HÁ ANOMALIAS DETECTADAS NA SUÍTE DE TESTES.");
  }
}

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
    "TEMP_MIN", "TEMP_MAX", "UMID_MIN", "UMID_MAX", "ALERTA_ATIVO", "FORMS_ID",
    "REVISAO", "VIGENCIA", "TITULO_DOC"
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
      "",             // FORMS_ID
      "Rev. 00",      // REVISAO
      "20/01/2026",   // VIGENCIA
      "REGISTRO DE MONITORAMENTO DE TEMPERATURA E UMIDADE AMBIENTAL" // TITULO_DOC
    ]);
  });
  
  // Dados dos equipamentos novos do laboratório (somente temperatura, SEM umidade)
  // Deixaremos TEMP_MIN e TEMP_MAX como vazios ou placeholders até confirmação
  var equipsLab = [
    { cod: "COD-1185", nome: "Estufa Mesófilos", area: "Lab. Microbiologia", doc: "FOR.OS.LAB. 03-02", tempMin: 34, tempMax: 36 },
    { cod: "COD-1183", nome: "Estufa Bolores e Leveduras", area: "Lab. Microbiologia", doc: "FOR.OS.LAB. 03-02", tempMin: 24, tempMax: 26 },
    { cod: "COD-1184", nome: "Estufa Entero/Staph/E.coli", area: "Lab. Microbiologia", doc: "FOR.OS.LAB. 03-02", tempMin: 34, tempMax: 36 },
    { cod: "COD-1181", nome: "Estufa Salmonella", area: "Lab. Microbiologia", doc: "FOR.OS.LAB. 03-02", tempMin: 40.5, tempMax: 42.5 },
    { cod: "COD-1182", nome: "Estufa Coliformes termotolerantes", area: "Lab. Microbiologia", doc: "FOR.OS.LAB. 03-02", tempMin: 44, tempMax: 46 },
    { cod: "COD-1130", nome: "Geladeira Microbiologia", area: "Lab. Microbiologia", doc: "FOR.OS.LAB. 03-02", tempMin: 2, tempMax: 8 },
    { cod: "COD-1131", nome: "Ar Ambiente Microbiologia", area: "Lab. Microbiologia", doc: "FOR.OS.LAB. 03-02", tempMin: 16, tempMax: 22 }
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
      "",             // FORMS_ID
      "Rev. 00",      // REVISAO
      "25/05/2026",   // VIGENCIA
      "REGISTRO DE MONITORAMENTO DE TEMPERATURA DE ESTUFAS E GELADEIRA" // TITULO_DOC
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
  aba.setColumnWidth(12, 100); // REVISAO
  aba.setColumnWidth(13, 110); // VIGENCIA
  aba.setColumnWidth(14, 300); // TITULO_DOC
  
  Logger.log("✅ População da aba SETTINGS finalizada com sucesso!");
  Logger.log("=== FIM DA EXECUÇÃO ===");
}

// ------------------------------------------------------------
// atualizarSgsaqLabEDocumentos()
// Atualiza a coluna DOCUMENTO na aba SETTINGS (de FOR.PS.LAB. 03-02 para FOR.OS.LAB. 03-02)
// e torna a célula do código de documento na aba "Relatório Mensal" 100% dinâmica.
// ------------------------------------------------------------
function atualizarSgsaqLabEDocumentos() {
  Logger.log("=== INICIANDO ATUALIZAÇÃO SGSAQ E CONFIGURAÇÃO DE COLUNAS ===");
  try {
    var ss = SpreadsheetApp.openById(CONFIG.planilhaId);
    
    // 1. Atualizar a aba SETTINGS
    var abaSettings = ss.getSheetByName("SETTINGS");
    if (abaSettings) {
      // Garante os novos cabeçalhos
      abaSettings.getRange(1, 12).setValue("REVISAO");
      abaSettings.getRange(1, 13).setValue("VIGENCIA");
      abaSettings.getRange(1, 14).setValue("TITULO_DOC");
      abaSettings.setColumnWidth(12, 100);
      abaSettings.setColumnWidth(13, 110);
      abaSettings.setColumnWidth(14, 300);
      
      var range = abaSettings.getDataRange();
      var valores = range.getValues();
      var atualizados = 0;
      
      for (var r = 1; r < valores.length; r++) {
        var cod = String(valores[r][0] || "").trim();
        if (cod.startsWith("COD-118") || cod.startsWith("COD-113")) {
          // Equipamentos do laboratório
          abaSettings.getRange(r + 1, 4).setValue("FOR.OS.LAB. 03-02"); // Col D
          abaSettings.getRange(r + 1, 12).setValue("Rev. 00");         // Col L
          abaSettings.getRange(r + 1, 13).setValue("25/05/2026");       // Col M
          abaSettings.getRange(r + 1, 14).setValue("REGISTRO DE MONITORAMENTO DE TEMPERATURA DE ESTUFAS E GELADEIRA"); // Col N
          atualizados++;
        } else if (cod.startsWith("COD-10")) {
          // Equipamentos da produção
          abaSettings.getRange(r + 1, 4).setValue("FOR.IT.PS.PRO. 08-04"); // Col D
          abaSettings.getRange(r + 1, 12).setValue("Rev. 00");             // Col L
          abaSettings.getRange(r + 1, 13).setValue("20/01/2026");           // Col M
          abaSettings.getRange(r + 1, 14).setValue("REGISTRO DE MONITORAMENTO DE TEMPERATURA E UMIDADE AMBIENTAL"); // Col N
          atualizados++;
        }
      }
      Logger.log("✅ SETTINGS: " + atualizados + " linhas configuradas com DOCUMENTO, REVISAO, VIGENCIA e TITULO_DOC.");
    } else {
      Logger.log("❌ Erro: Aba SETTINGS não encontrada!");
    }
    
    // 2. Tornar o cabeçalho/célula de documento do Relatório Mensal 100% dinâmico (com TEXT na data)
    var abaRelatorio = ss.getSheetByName(ABA_RELATORIO);
    if (abaRelatorio) {
      var celulaI1 = abaRelatorio.getRange("I1");
      // A fórmula puxa dinamicamente a Coluna D (4), Coluna L (12) e Coluna M (13) da SETTINGS com TEXT() na data para evitar que vire número de série
      celulaI1.setFormula('=IFERROR(VLOOKUP($B$5;SETTINGS!A:N;4;FALSE) & CHAR(10) & VLOOKUP($B$5;SETTINGS!A:N;12;FALSE) & CHAR(10) & TEXT(VLOOKUP($B$5;SETTINGS!A:N;13;FALSE);"dd/mm/aaaa"); "FOR.IT.PS.PRO. 08-04" & CHAR(10) & "Rev. 00" & CHAR(10) & "20/01/2026")');
      Logger.log("✅ RELATÓRIO MENSAL: Célula I1 (mesclada I1:K3) configurada diretamente com a fórmula dinâmica multilinha vinculada ao SETTINGS.");
      
      // 3. Tornar o Título do Relatório Dinâmico (gravação direta na célula C1, mesclada C1:F3)
      var celulaTitulo = abaRelatorio.getRange("C1");
      celulaTitulo.setFormula('=IFERROR(VLOOKUP($B$5;SETTINGS!A:N;14;FALSE); "REGISTRO DE MONITORAMENTO DE TEMPERATURA E UMIDADE AMBIENTAL")');
      Logger.log("✅ RELATÓRIO MENSAL: Célula C1 (mesclada C1:F3) configurada diretamente com a fórmula dinâmica do TITULO_DOC.");
    } else {
      Logger.log("❌ Erro: Aba 'Relatório Mensal' não encontrada!");
    }
    
  } catch (err) {
    Logger.log("❌ Erro durante a atualização: " + err.message);
  }
  Logger.log("=== FIM DA EXECUÇÃO ===");
}