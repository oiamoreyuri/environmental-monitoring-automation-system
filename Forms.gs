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
    
    var umidade, responsavel, observacoes;

    // Identificação dinâmica da estrutura da resposta.
    // O formulário sem umidade possui 9 elementos em e.values (Timestamp + 8 respostas).
    // O formulário original com umidade possui 10 elementos em e.values.
    if (vals.length >= 10) {
      umidade     = normalizarDecimal_(vals[7]);
      responsavel = normalizarNome_(vals[8] || "");
      observacoes = normalizarObservacoes_(vals[9] || "");
    } else {
      umidade     = ""; // Grava em branco na RAW_DATA para sensores sem higrômetro
      responsavel = normalizarNome_(vals[7] || "");
      observacoes = normalizarObservacoes_(vals[8] || "");
    }

    abaRaw.appendRow([
      timestampForms, deviceId, dataMedicao, horaMedicao,
      tempAtual, tempMax, tempMin, umidade,
      responsavel, observacoes, "forms", new Date()
    ]);

    Logger.log("✅ RAW_DATA: " + deviceId + " | " + dataMedicao + " " + horaMedicao
      + " | " + responsavel + " | umid: '" + umidade + "' | obs: " + observacoes);

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
  var ss    = SpreadsheetApp.openById(CONFIG.planilhaId);
  var agora = new Date();

  // Coleta dados de todas as abas que contêm respostas de formulários no projeto
  var abas = ss.getSheets();
  var todasAsRespostas = [];
  
  abas.forEach(function(aba) {
    var nome = aba.getName();
    // Identifica abas que começam com o prefixo padrão do Forms no Sheets
    if (nome.indexOf("Respostas ao formulário") === 0) {
      var dados = aba.getDataRange().getValues();
      if (dados.length > 1) {
        todasAsRespostas.push({
          nomeAba: nome,
          dados: dados
        });
      }
    }
  });

  // Remove a aba existente antes de recriar
  var abaExistente = ss.getSheetByName(ABA_RAW);
  if (abaExistente) ss.deleteSheet(abaExistente);

  var abaRaw = ss.insertSheet(ABA_RAW);
  abaRaw.appendRow(HEADER_RAW);
  abaRaw.getRange(1, 1, 1, HEADER_RAW.length).setFontWeight("bold");
  abaRaw.setFrozenRows(1);
  abaRaw.getRange("E:H").setNumberFormat("0.0##");

  var novasLinhas = [];
  
  todasAsRespostas.forEach(function(item) {
    var dados = item.dados;
    var header = dados[0];
    
    // Inspeciona os cabeçalhos para detectar dinamicamente a presença da pergunta de Umidade
    var temUmidade = false;
    var idxUmidade = -1;
    for (var col = 0; col < header.length; col++) {
      if (header[col].toString().toLowerCase().indexOf("umidade") !== -1) {
        temUmidade = true;
        idxUmidade = col;
        break;
      }
    }
    
    for (var i = 1; i < dados.length; i++) {
      var linha = dados[i];
      if (!linha[0] || !linha[1]) continue;

      var dataF = linha[2] instanceof Date
        ? Utilities.formatDate(linha[2], CONFIG.fusoHorario, "dd/MM/yyyy")
        : normalizarData_(linha[2].toString());

      var horaF = linha[3] instanceof Date
        ? Utilities.formatDate(linha[3], CONFIG.fusoHorario, "HH:mm")
        : linha[3].toString().substring(0, 5);

      var tempAtual = parseFloat(linha[4]) || "";
      var tempMax   = parseFloat(linha[5]) || "";
      var tempMin   = parseFloat(linha[6]) || "";
      
      // Mapeamento dinâmico baseado na existência de higrômetro no form desta aba
      var umidade = temUmidade && idxUmidade !== -1 ? (parseFloat(linha[idxUmidade]) || "") : "";
      var responsavelVal = temUmidade ? linha[8] : linha[7];
      var observacoesVal = temUmidade ? linha[9] : linha[8];

      novasLinhas.push([
        linha[0],
        linha[1].toString().trim(),
        dataF,
        horaF,
        tempAtual,
        tempMax,
        tempMin,
        umidade,
        normalizarNome_(responsavelVal),
        observacoesVal || "",
        "forms",
        agora
      ]);
    }
  });

  // Ordena cronologicamente por Timestamp do Forms para manter a coesão histórica na RAW_DATA
  novasLinhas.sort(function(a, b) {
    return new Date(a[0]).getTime() - new Date(b[0]).getTime();
  });

  if (novasLinhas.length > 0) {
    abaRaw.getRange(2, 1, novasLinhas.length, HEADER_RAW.length).setValues(novasLinhas);
  }

  Logger.log("✅ RAW_DATA recriada de todas as fontes: " + novasLinhas.length + " registros.");
}