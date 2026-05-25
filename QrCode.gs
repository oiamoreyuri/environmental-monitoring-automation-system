// ============================================================
// QrCode.gs
// Responsabilidade: fluxo de leitura do QR Code afixado nos
// equipamentos — validação do ID, registro de acesso e
// renderização da página de redirecionamento ao Forms.
// ============================================================

// Lista de equipamentos do laboratório de microbiologia que usam forms próprio (sem umidade)
var EQUIPAMENTOS_LAB = [
  "COD-1181","COD-1182","COD-1183",
  "COD-1184","COD-1185","COD-1130","COD-1131"
];

// ------------------------------------------------------------
// rotearQrCode_(equipamentoId)
// Chamado por doGet (WebApp.gs) quando a rota contém ?id=.
// Valida o equipamento, registra o acesso e exibe a página
// de confirmação com link pré-preenchido para o Forms.
// ------------------------------------------------------------
function rotearQrCode_(equipamentoId) {
  if (CONFIG.equipamentosValidos.indexOf(equipamentoId) === -1) {
    return paginaErro_(equipamentoId);
  }

  var agora         = new Date();
  var dataFormatada = Utilities.formatDate(agora, CONFIG.fusoHorario, "yyyy-MM-dd");
  var horaFormatada = Utilities.formatDate(agora, CONFIG.fusoHorario, "HH:mm");

  // Roteamento inteligente de Forms:
  // Decide entre as credenciais do laboratório ou da produção
  var formUrl, entries;
  if (EQUIPAMENTOS_LAB.indexOf(equipamentoId) !== -1) {
    formUrl = CONFIG.formUrlLab;
    entries = CONFIG.entriesLab;
  } else {
    formUrl = CONFIG.formUrl;
    entries = CONFIG.entries;
  }

  // Monta URL do Forms com campos pré-preenchidos:
  // equipamento, data e hora da leitura.
  var urlFinal = formUrl
    + "?usp=pp_url"
    + "&entry." + entries.id   + "=" + encodeURIComponent(equipamentoId)
    + "&entry." + entries.data + "=" + encodeURIComponent(dataFormatada)
    + "&entry." + entries.hora + "=" + encodeURIComponent(horaFormatada);

  registrarAcessoQr_(equipamentoId, dataFormatada, horaFormatada);

  return paginaConfirmacaoQr_(urlFinal, equipamentoId, horaFormatada);
}

// ------------------------------------------------------------
// registrarAcessoQr_(equipamentoId, data, hora)
// Grava uma linha na aba LOG_ACESSO a cada leitura de QR Code.
// Falhas são logadas mas não propagadas — um erro de log
// não deve impedir o operador de acessar o Forms.
// ------------------------------------------------------------
function registrarAcessoQr_(equipamentoId, data, hora) {
  try {
    var ss  = SpreadsheetApp.openById(CONFIG.planilhaId);
    var aba = ss.getSheetByName(CONFIG.abaLog);

    // Cria a aba de log se não existir (primeira execução).
    if (!aba) {
      aba = ss.insertSheet(CONFIG.abaLog);
      aba.appendRow([
        "TIMESTAMP_SERVIDOR", "EQUIPAMENTO",
        "DATA_LEITURA", "HORA_LEITURA", "STATUS"
      ]);
      aba.getRange(1, 1, 1, 5).setFontWeight("bold");
    }

    aba.appendRow([new Date(), equipamentoId, data, hora, "QR_ESCANEADO"]);

  } catch (err) {
    console.error("Erro ao registrar acesso QR: " + err.message);
  }
}

// ------------------------------------------------------------
// paginaConfirmacaoQr_(urlFinal, equipamentoId, hora)
// Renderiza a página intermediária exibida ao operador após
// o escaneamento. Mostra o código do equipamento, horário
// da leitura e botão para abrir o Forms.
// Otimizada para uso mobile (toque fácil, fonte grande).
// ------------------------------------------------------------
function paginaConfirmacaoQr_(urlFinal, equipamentoId, hora) {
  var html =
    '<!DOCTYPE html><html><head>' +
    '<base target="_top">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<style>' +
    'body{font-family:Arial,sans-serif;display:flex;justify-content:center;' +
    '     align-items:center;min-height:100vh;margin:0;background:#f0f2f5;}' +
    '.card{background:white;border-radius:12px;padding:32px 24px;' +
    '      max-width:360px;width:90%;text-align:center;' +
    '      box-shadow:0 2px 8px rgba(0,0,0,0.15);}' +
    '.equip{font-size:22px;font-weight:bold;color:#2e7d32;margin:8px 0;}' +
    '.hora{font-size:16px;color:#555;margin-bottom:24px;}' +
    'a{display:block;padding:18px;font-size:20px;color:white;' +
    '  background:#2e7d32;text-decoration:none;border-radius:8px;font-weight:bold;}' +
    'a:active{background:#1b5e20;}' +
    '</style></head>' +
    '<body><div class="card">' +
    '<div class="equip">' + equipamentoId + '</div>' +
    '<div class="hora">Leitura: ' + hora + '</div>' +
    '<a href="' + urlFinal + '">Abrir Formulário</a>' +
    '</div></body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle("Monitoramento — " + equipamentoId);
}

// ------------------------------------------------------------
// paginaErro_(idRecebido)
// Renderiza página de erro quando o ID do equipamento não
// consta na lista de equipamentos válidos.
// ------------------------------------------------------------
function paginaErro_(idRecebido) {
  var msg = idRecebido
    ? "ID inválido: <strong>" + idRecebido + "</strong>"
    : "Nenhum equipamento identificado.";

  var html =
    '<!DOCTYPE html><html><head>' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<style>' +
    'body{font-family:Arial,sans-serif;display:flex;justify-content:center;' +
    '     align-items:center;min-height:100vh;margin:0;background:#f0f2f5;}' +
    '.card{background:white;border-radius:12px;padding:32px 24px;' +
    '      max-width:360px;width:90%;text-align:center;' +
    '      box-shadow:0 2px 8px rgba(0,0,0,0.15);}' +
    '.icon{font-size:48px;} p{color:#555;}' +
    '</style></head>' +
    '<body><div class="card">' +
    '<div class="icon">⚠️</div>' +
    '<h2>QR Code inválido</h2>' +
    '<p>' + msg + '</p>' +
    '<p>Use o QR Code afixado no equipamento.</p>' +
    '</div></body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle("Erro — QR Code inválido");
}