// ============================================================
// Config.gs
// Responsabilidade: constantes globais, setup do PropertiesService
// e inicialização do objeto CONFIG.
//
// Cabeçalho de Dependência:
//   - Sem dependências de I/O de outros módulos do Apps Script.
//   - Consumido de forma global por todas as demais rotinas (.gs).
// ============================================================

// Nomes de abas e chaves de controle da planilha principal.
var ABA_RAW             = "RAW_DATA";
var ABA_LOG_INTEGRIDADE = "LOG_INTEGRIDADE";
var ABA_RELATORIO       = "Relatório Mensal";
var CELULA_COD          = "B5";
var CELULA_MES          = "I5";
var CELULA_ANO          = "I6";

// Células do template de relatório para assinatura.
var CELULA_APROVADO_POR = "D38";
var CELULA_CARGO        = "D39";
var CELULA_DATA         = "D40";
var CELULA_HASH         = "D41";
var CELULA_QR_CODE      = "I37";

// Mapeamento de normalização de nomes de responsáveis.
// Chave: variação digitada (lowercase, com ou sem espaço).
// Valor: forma canônica gravada em RAW_DATA.
var NOMES_VALIDOS = {
  "yuri":     "Yuri",
  "yuru":     "Yuri",
  "samara":   "Samara",
  "samara ":  "Samara",
  "mariana":  "Mariana",
  "mariana ": "Mariana",
  "yara":     "Yara",
  "yara ":    "Yara",
  "ana":      "Ana"
};

// ------------------------------------------------------------
// getConfig()
// Lê propriedades sensíveis do PropertiesService e retorna
// o objeto de configuração do sistema.
// Nunca exponha valores reais em código versionado.
// ------------------------------------------------------------
function getConfig() {
  var props = PropertiesService.getScriptProperties().getProperties();
  return {
    formUrl:          props.FORM_URL,
    fusoHorario:      "America/Sao_Paulo",
    planilhaId:       props.PLANILHA_ID,
    entries: {
      id:   props.ENTRY_ID,
      data: props.ENTRY_DATA,
      hora: props.ENTRY_HORA
    },
    // Inicializado como vazio, será preenchido programaticamente
    equipamentosValidos: [],
    abaLog:           "LOG_ACESSO",
    responsavelNome:  props.RESPONSAVEL_NOME,
    responsavelCargo: props.RESPONSAVEL_CARGO,
    responsavelEmail: props.RESPONSAVEL_EMAIL,
    empresa:          props.EMPRESA,
    assinaturaId:     props.ASSINATURA_ID,
    urlAprovacao:     props.URL_APROVACAO,
    urlVerificacao:   props.URL_VERIFICACAO,
    alerta: {
      emailDestino:   props.ALERTA_EMAIL,
      whatsappNumero: props.WHATSAPP_NUMERO,
      whatsappApiKey: props.WHATSAPP_API_KEY
    }
  };
}

// CONFIG — variável global única, inicializada uma vez por invocação do runtime.
var CONFIG = getConfig();

// ------------------------------------------------------------
// carregarSettings_()
// Lê a aba SETTINGS e retorna array de objetos com a configuração
// de cada equipamento. Cacheado em memória para evitar leituras repetidas.
// ------------------------------------------------------------
var _cacheSettings = null;

function carregarSettings_() {
  // Retorna cache em memória local se já carregado nesta execução
  if (_cacheSettings) return _cacheSettings;
  
  try {
    var ss = SpreadsheetApp.openById(CONFIG.planilhaId);
    var aba = ss.getSheetByName("SETTINGS");
    if (!aba) {
      Logger.log("⚠️ Aba SETTINGS não encontrada! Utilizando fallbacks.");
      return [];
    }
    
    var dados = aba.getDataRange().getValues();
    var lista = [];
    
    // Pula a primeira linha (cabeçalho estrutural)
    for (var i = 1; i < dados.length; i++) {
      var row = dados[i];
      if (!row[0]) continue; // Ignora linhas em branco
      
      lista.push({
        codigo:       String(row[0]).trim(),
        nome:         String(row[1] || row[0]).trim(),
        area:         String(row[2] || "").trim(),
        documento:    String(row[3] || "").trim(),
        semUmidade:   row[4] === true || String(row[4]).toLowerCase() === "true",
        tempMin:      row[5] !== "" ? Number(row[5]) : null,
        tempMax:      row[6] !== "" ? Number(row[6]) : null,
        umidMin:      row[7] !== "" ? Number(row[7]) : null,
        umidMax:      row[8] !== "" ? Number(row[8]) : null,
        alertaAtivo:  row[9] === true || String(row[9]).toLowerCase() === "true",
        formsId:      String(row[10] || "").trim()
      });
    }
    
    _cacheSettings = lista;
    return _cacheSettings;
  } catch (err) {
    Logger.log("❌ Erro carregarSettings_: " + err.message);
    return [];
  }
}

// ------------------------------------------------------------
// obterCodigosEquipamentos_()
// Retorna array simples com todos os códigos de equipamentos.
// Fornece um array fixo clássico em caso de pane geral de I/O.
// ------------------------------------------------------------
function obterCodigosEquipamentos_() {
  var settings = carregarSettings_();
  if (settings.length === 0) {
    // Fallback estrutural estático de segurança
    return [
      "COD-1040", "COD-1041", "COD-1042", "COD-1043", "COD-1044",
      "COD-1045", "COD-1046", "COD-1047", "COD-1048", "COD-1049"
    ];
  }
  return settings.map(function(item) { return item.codigo; });
}

// ------------------------------------------------------------
// obterConfigEquipamento_(cod)
// Retorna o objeto de configuração de um equipamento específico.
// ------------------------------------------------------------
function obterConfigEquipamento_(cod) {
  var settings = carregarSettings_();
  for (var i = 0; i < settings.length; i++) {
    if (settings[i].codigo === cod) return settings[i];
  }
  return null;
}

// Lista canônica de equipamentos monitorados (derivada dinamicamente).
var EQUIPAMENTOS_PDF = obterCodigosEquipamentos_();

// Acopla a lista de equipamentos válidos ao CONFIG global.
CONFIG.equipamentosValidos = EQUIPAMENTOS_PDF;

// ------------------------------------------------------------
// ALERTA — configuração operacional de alertas de completude.
// Lê dinamicamente os sensores marcados com ALERTA_ATIVO = true.
// ------------------------------------------------------------
var ALERTA = {
  get equipamentosAtivos() {
    var settings = carregarSettings_();
    if (settings.length === 0) {
      // Fallback de contingência
      return [
        "COD-1040", "COD-1041", "COD-1042",
        "COD-1044", "COD-1045", "COD-1046", "COD-1047", "COD-1048"
      ];
    }
    return settings
      .filter(function(item) { return item.alertaAtivo; })
      .map(function(item) { return item.codigo; });
  },
  get emailDestino()   { return CONFIG.alerta.emailDestino;   },
  get whatsappNumero() { return CONFIG.alerta.whatsappNumero; },
  get whatsappApiKey() { return CONFIG.alerta.whatsappApiKey; }
};

// ------------------------------------------------------------
// setupPropriedades()
// Utilitário de setup de ambiente.
// Rode UMA VEZ após clasp push para popular o PropertiesService.
// Preencha os valores reais antes de executar.
// NUNCA commite este arquivo com valores reais.
// ------------------------------------------------------------
function setupPropriedades() {
  var props = {
    FORM_URL:           "COLE_AQUI",
    PLANILHA_ID:        "COLE_AQUI",
    ASSINATURA_ID:      "COLE_AQUI",
    URL_APROVACAO:      "COLE_AQUI",
    URL_VERIFICACAO:    "COLE_AQUI",
    ENTRY_ID:           "COLE_AQUI",
    ENTRY_DATA:         "COLE_AQUI",
    ENTRY_HORA:         "COLE_AQUI",
    RESPONSAVEL_NOME:   "COLE_AQUI",
    RESPONSAVEL_CARGO:  "COLE_AQUI",
    RESPONSAVEL_EMAIL:  "COLE_AQUI",
    EMPRESA:            "COLE_AQUI",
    ALERTA_EMAIL:       "COLE_AQUI",   // e-mail destino dos alertas de completude
    WHATSAPP_NUMERO:    "COLE_AQUI",
    WHATSAPP_API_KEY:   "COLE_AQUI"
  };
  PropertiesService.getScriptProperties().setProperties(props);
  Logger.log("Propriedades configuradas com sucesso.");
}