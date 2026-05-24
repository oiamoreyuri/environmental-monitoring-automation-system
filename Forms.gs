// ============================================================
// Forms.gs
// Responsabilidade: recebimento e normalização dos dados
// vindos do Google Forms, gravação na RAW_DATA e utilitários
// de manutenção da aba.
//
// REGRAS:
//   - onFormSubmit é o único entry point de escrita via Forms.
//   - Toda normalização de dados passa por funções auxiliares
//     privadas deste módulo.
//   - corrigirRawDataCompleto é utilitário de manutenção —
//     nunca chamado por trigger automático.
// ============================================================

// ------------------------------------------------------------
// onFormSubmit(e)
// Trigger disparado pelo Forms a cada nova resposta.
// Lê os valores brutos, normaliza e grava em RAW_DATA.
//
// Mapeamento de colunas do Forms (e.values):
//   [0] Carimbo data/hora
//   [1] Código equipamento
//   [2] Data da medição
//   [3] Horário da medição
//   [4] Temperatura atual (°C)
//   [5] Temperatura máxima (°C)
//   [6] Temperatura mínima (°C)
//   [7] Umidade (%)
//   [8] Responsável
//   [9] Observações
// ------------------------------------------------------------
// ------------------------------------------------------------
// onFormSubmit(e)
// Mapeamento de colunas do Forms (e.values):
//   [0] Carimbo data/hora
//   [1] Código equipamento
//   [2] Data da medição
//   [3] Horário da medição
//   [4] Temperatura atual (°C)
//   [5] Temperatura máxima (°C)
//   [6] Temperatura mínima (°C)
//   [7] Umidade (%)
//   [8] Responsável
//   [9] Observações (múltipla escolha — retorna string separada por vírgula)
// ------------------------------------------------------------
function onFormSubmit(e) {
  try {
    var ss     = SpreadsheetApp.openById(CONFIG.planilhaId);
    var abaRaw = garantirAbaRaw_(ss);
    var vals   = e.values;

    var timestampForms = new Date(vals[0]);
    var deviceId       = vals[1] ? vals[1].toString().trim() : "";
    var dataMedicao    = normalizarData_(vals[2] ? vals[2].toString() : "");
    var horaMedicao    = vals[3] ? vals[3].toString().substring(0, 5) : "";
    var tempAtual      = normalizarDecimal_(vals[4]);
    var tempMax        = normalizarDecimal_(vals[5]);
    var tempMin        = normalizarDecimal_(vals[6]);
    var umidade        = normalizarDecimal_(vals[7]);
    var responsavel    = normalizarNome_(vals[8] || "");

    // Múltipla escolha: normaliza a string retornada pelo Forms,
    // removendo espaços extras e padronizando o separador.
    var observacoes    = normalizarObservacoes_(vals[9] || "");

    abaRaw.appendRow([
      timestampForms, deviceId, dataMedicao, horaMedicao,
      tempAtual, tempMax, tempMin, umidade,
      responsavel, observacoes, "forms", new Date()
    ]);

    Logger.log("✅ RAW_DATA: " + deviceId + " | " + dataMedicao + " " + horaMedicao
      + " | " + responsavel + " | obs: " + observacoes);

  } catch (err) {
    Logger.log("❌ Erro onFormSubmit: " + err.message);
  }
}

// ------------------------------------------------------------
// normalizarObservacoes_(valor)
// Trata o retorno de campo de múltipla escolha do Forms.
// O Forms retorna as opções selecionadas como string única
// separada por ", " (vírgula + espaço).
// Esta função padroniza o separador e remove espaços extras,
// garantindo consistência na RAW_DATA independente de
// variações no retorno do Forms.
// Exemplo entrada:  "Equipamento em manutenção, Equipamento em calibração"
// Exemplo saída:    "Equipamento em manutenção; Equipamento em calibração"
// ------------------------------------------------------------
function normalizarObservacoes_(valor) {
  if (!valor) return "";
  return valor
    .split(",")
    .map(function(s) { return s.trim(); })
    .filter(function(s) { return s.length > 0; })
    .join("; ");
}

// ------------------------------------------------------------
// garantirAbaRaw_(ss)
// Retorna a aba RAW_DATA, criando-a com cabeçalho e
// formatação padrão caso não exista.
// Chamada por onFormSubmit e por apiRegistrar_ (Api.gs).
// ------------------------------------------------------------
function garantirAbaRaw_(ss) {
  var aba = ss.getSheetByName(ABA_RAW);
  if (!aba) {
    aba = ss.insertSheet(ABA_RAW);
    aba.appendRow(HEADER_RAW);
    aba.getRange(1, 1, 1, HEADER_RAW.length).setFontWeight("bold");
    aba.setFrozenRows(1);
    Logger.log("ℹ️ Aba RAW_DATA criada.");
  }
  return aba;
}

// ------------------------------------------------------------
// normalizarData_(valor)
// Converte data do formato yyyy-MM-dd (retornado pelo Forms)
// para dd/MM/yyyy (padrão interno da RAW_DATA).
// Retorna o valor original se já estiver em outro formato.
// ------------------------------------------------------------
function normalizarData_(valor) {
  if (!valor) return "";
  if (valor.indexOf("-") !== -1) {
    var partes = valor.split("-");
    if (partes.length === 3) return partes[2] + "/" + partes[1] + "/" + partes[0];
  }
  return valor;
}

// ------------------------------------------------------------
// normalizarDecimal_(val)
// Converte separador decimal de ponto para vírgula.
// Padrão brasileiro exigido para gravação em RAW_DATA.
// Retorna string vazia para valores nulos ou indefinidos.
// ------------------------------------------------------------
function normalizarDecimal_(val) {
  if (!val) return "";
  return String(val).trim().replace(".", ",");
}

// ------------------------------------------------------------
// normalizarNome_(nome)
// Aplica o mapeamento NOMES_VALIDOS (Config.gs) para
// padronizar variações de digitação do nome do responsável.
// Retorna o valor original com trim() se não houver mapeamento.
// ------------------------------------------------------------
function normalizarNome_(nome) {
  if (!nome) return "";
  var chave = nome.toString().toLowerCase().trim();
  return NOMES_VALIDOS[chave] || nome.toString().trim();
}

// ------------------------------------------------------------
// corrigirRawDataCompleto()
// Utilitário de manutenção: recria a RAW_DATA integralmente
// a partir das respostas brutas do Forms.
// Use apenas para correção pontual de inconsistências.
// ATENÇÃO: apaga e recria a aba — não execute em produção
// sem confirmar backup ou exportação prévia dos dados.
// ------------------------------------------------------------
function corrigirRawDataCompleto() {
  var ss      = SpreadsheetApp.openById(CONFIG.planilhaId);
  var abaResp = ss.getSheetByName("Respostas ao formulário 1");
  var dados   = abaResp.getDataRange().getValues();
  var agora   = new Date();

  // Remove a aba existente antes de recriar.
  var abaExistente = ss.getSheetByName(ABA_RAW);
  if (abaExistente) ss.deleteSheet(abaExistente);

  var abaRaw = ss.insertSheet(ABA_RAW);
  abaRaw.appendRow(HEADER_RAW);
  abaRaw.getRange(1, 1, 1, HEADER_RAW.length).setFontWeight("bold");
  abaRaw.setFrozenRows(1);
  abaRaw.getRange("E:H").setNumberFormat("0.0##");

  var novasLinhas = [];
  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    if (!linha[0] || !linha[1]) continue;

    var dataF = linha[2] instanceof Date
      ? Utilities.formatDate(linha[2], CONFIG.fusoHorario, "dd/MM/yyyy")
      : normalizarData_(linha[2].toString());

    var horaF = linha[3] instanceof Date
      ? Utilities.formatDate(linha[3], CONFIG.fusoHorario, "HH:mm")
      : linha[3].toString().substring(0, 5);

    novasLinhas.push([
      linha[0],
      linha[1].toString().trim(),
      dataF,
      horaF,
      parseFloat(linha[4]) || "",
      parseFloat(linha[5]) || "",
      parseFloat(linha[6]) || "",
      parseFloat(linha[7]) || "",
      normalizarNome_(linha[8]),
      linha[9] || "",
      "forms",
      agora
    ]);
  }

  if (novasLinhas.length > 0) {
    abaRaw.getRange(2, 1, novasLinhas.length, HEADER_RAW.length).setValues(novasLinhas);
  }

  Logger.log("✅ RAW_DATA recriada: " + novasLinhas.length + " registros.");
}