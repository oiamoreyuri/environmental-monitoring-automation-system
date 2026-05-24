// ============================================================
// Config.gs
// Responsabilidade: constantes globais, leitura de propriedades
// e inicialização do objeto CONFIG consumido por todos os módulos.
//
// REGRAS:
//   - Este é o único arquivo que declara CONFIG.
//   - Nenhum outro módulo redeclara ou sobrescreve CONFIG.
//   - Credenciais e dados operacionais sensíveis ficam no
//     PropertiesService, nunca em código versionado.
// ============================================================

// ------------------------------------------------------------
// Constantes de estrutura da planilha
// Centralizadas aqui para que renomeações de aba ou célula
// exijam alteração em um único ponto.
// ------------------------------------------------------------
var ABA_RAW             = "RAW_DATA";
var ABA_LOG_INTEGRIDADE = "LOG_INTEGRIDADE";
var ABA_RELATORIO       = "Relatório Mensal";
var CELULA_COD          = "B5";
var CELULA_MES          = "I5";
var CELULA_ANO          = "I6";
var PASTA_PDF_NOME      = "Relatórios de Temperatura PDF";

var HEADER_RAW = [
  "TIMESTAMP_FORMS", "DEVICE_ID", "DATA_MEDICAO", "HORA_MEDICAO",
  "TEMP_ATUAL", "TEMP_MAX", "TEMP_MIN", "UMIDADE",
  "RESPONSAVEL", "OBSERVACOES", "FONTE", "TIMESTAMP_PROCESSAMENTO"
];

// Lista canônica de equipamentos monitorados.
// Usada em validações de entrada, geração de PDFs e alertas.
// COD-1043 e COD-1049 estão na lista de PDFs mas fora dos
// alertas de completude — ver ALERTA.equipamentosAtivos abaixo.
var EQUIPAMENTOS_PDF = [
  "COD-1040", "COD-1041", "COD-1042", "COD-1043", "COD-1044",
  "COD-1045", "COD-1046", "COD-1047", "COD-1048", "COD-1049"
];

// Mapeamento de normalização de nomes de responsáveis.
// Chave: variação digitada (lowercase, com ou sem espaço).
// Valor: forma canônica gravada em RAW_DATA.
// Nomes já padronizados no Forms — manter para retrocompatibilidade
// com registros históricos.
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
    // Reutiliza EQUIPAMENTOS_PDF para evitar duplicação.
    equipamentosValidos: EQUIPAMENTOS_PDF,
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

// ------------------------------------------------------------
// CONFIG — variável global única, inicializada uma vez por
// invocação do runtime do Apps Script.
// Todos os módulos consomem CONFIG diretamente.
// ------------------------------------------------------------
var CONFIG = getConfig();

// ------------------------------------------------------------
// ALERTA — configuração operacional de alertas de completude.
// Credenciais lidas de CONFIG (que vem do PropertiesService).
// equipamentosAtivos é configuração estrutural, não sensível,
// e fica aqui para edição direta quando o parque de
// equipamentos mudar.
// ------------------------------------------------------------
var ALERTA = {
  equipamentosAtivos: [
    "COD-1040", "COD-1041", "COD-1042", "COD-1043",
    "COD-1044", "COD-1045", "COD-1046", "COD-1047", "COD-1048", "COD-1049"
  ],
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