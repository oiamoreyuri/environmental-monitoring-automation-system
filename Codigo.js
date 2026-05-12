// ============================================================
// CONFIGURAÇÕES — edite apenas esta seção
// ============================================================
var CONFIG = {
  formUrl:     "YOUR_GOOGLE_FORM_URL",
  fusoHorario: "America/Sao_Paulo",
  planilhaId:  "YOUR_SPREADSHEET_ID",
    entries: {
    id:   "YOUR_ENTRY_ID_EQUIPMENT",
    data: "YOUR_ENTRY_ID_DATE",
    hora: "YOUR_ENTRY_ID_TIME"
  },
  equipamentosValidos: [
    "COD-1040","COD-1041","COD-1042","COD-1043",
    "COD-1044","COD-1045","COD-1046","COD-1047",
    "COD-1048","COD-1049"
  ],
  abaLog:           "LOG_ACESSO",
  responsavelNome:  "YOUR_NAME",
  responsavelCargo: "YOUR_ROLE",
  responsavelEmail: "YOUR_EMAIL",
  empresa:          "YOUR_COMPANY_NAME",
  assinaturaId: "YOUR_SIGNATURE_FILE_ID",
  urlAprovacao: "https://script.google.com/macros/s/YOUR_WEBAPP_URL" 
};

// ============================================================
// ENDPOINT PRINCIPAL — QR Code
// ============================================================
function doGet(e) {
  var params = e ? e.parameter : {};
  var page   = params.page || "";

  // Rota verificação de hash
  if (page === "verify") return doGetVerificacao(e);

  // Rota aprovação
  if (page === "aprovacao" || params.acao || params.mes || params.ano) {
    return doGetAprovacao(e);
  }

  // Rota QR Code
  var equipamentoId = params.id || "";
  if (!equipamentoId) {
    return HtmlService.createHtmlOutput(
      "<h2>Acesso direto não permitido</h2>" +
      "<p>Use o QR Code afixado no equipamento ou acesse " +
      "<a href='" + CONFIG.urlAprovacao + "?page=aprovacao'>a página de aprovação</a>.</p>"
    );
  }
  if (CONFIG.equipamentosValidos.indexOf(equipamentoId) === -1) {
    return paginaErro(equipamentoId);
  }

  var agora         = new Date();
  var dataFormatada = Utilities.formatDate(agora, CONFIG.fusoHorario, "yyyy-MM-dd");
  var horaFormatada = Utilities.formatDate(agora, CONFIG.fusoHorario, "HH:mm");
  var urlFinal = CONFIG.formUrl
    + "?usp=pp_url"
    + "&entry." + CONFIG.entries.id   + "=" + encodeURIComponent(equipamentoId)
    + "&entry." + CONFIG.entries.data + "=" + encodeURIComponent(dataFormatada)
    + "&entry." + CONFIG.entries.hora + "=" + encodeURIComponent(horaFormatada);
  registrarLog(equipamentoId, dataFormatada, horaFormatada);
  return paginaConfirmacao(urlFinal, equipamentoId, horaFormatada);
}

function doGetVerificacao(e) {
  var params = e ? e.parameter : {};
  var hash   = params.hash || "";
  var cod    = params.cod  || "";
  var mes    = parseInt(params.mes)  || 0;
  var ano    = parseInt(params.ano)  || 0;

  // Parâmetros obrigatórios
  if (!hash || !cod || !mes || !ano) {
    return HtmlService.createHtmlOutput(
      "<h2 style='color:red'>QR Code inválido</h2>" +
      "<p>Parâmetros de verificação ausentes.</p>"
    ).setTitle("Verificação — Docefruta");
  }

  var mesFormatado = mes < 10 ? "0" + mes : String(mes);
  var nomeMes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][mes - 1];

  // Busca na LOG_INTEGRIDADE
  var ss       = SpreadsheetApp.openById(CONFIG.planilhaId);
  var abaLog   = ss.getSheetByName(ABA_LOG_INTEGRIDADE);
  var logDados = abaLog.getDataRange().getValues();
  var registro = null;

  for (var i = 1; i < logDados.length; i++) {
    var mesAnoCell = logDados[i][2];
    var mesAnoStr  = (mesAnoCell instanceof Date)
      ? Utilities.formatDate(mesAnoCell, CONFIG.fusoHorario, "MM/yyyy")
      : String(mesAnoCell).trim();
    if (logDados[i][4] === hash &&
        String(logDados[i][3]).trim() === cod &&
        mesAnoStr === mesFormatado + "/" + ano) {
      registro = logDados[i];
      break;
    }
  }

  // Busca local do equipamento
  var localEquip = "";
  var abaEquip   = ss.getSheetByName("Lista de Equips.");
  if (abaEquip) {
    var equips = abaEquip.getDataRange().getValues();
    for (var j = 1; j < equips.length; j++) {
      if (equips[j][0] === cod) { localEquip = equips[j][1]; break; }
    }
  }

  // Monta página de resultado
  var autêntico  = registro !== null;
  var aprovado   = autêntico && registro[8] === true;
  var corStatus  = autêntico ? "#2e7d32" : "#c62828";
  var iconStatus = autêntico ? "✅" : "❌";
  var txtStatus  = autêntico ? "DOCUMENTO AUTÊNTICO" : "DOCUMENTO NÃO VERIFICADO";

  var blocoRegistro = autêntico ? (
    '<table style="width:100%;border-collapse:collapse;margin-top:16px;">' +
    '<tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:bold;background:#f5f5f5;width:36%;">Arquivo</td>' +
    '<td style="padding:6px 10px;border:1px solid #ddd;">' + registro[1] + '</td></tr>' +
    '<tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:bold;background:#f5f5f5;">Equipamento</td>' +
    '<td style="padding:6px 10px;border:1px solid #ddd;">' + cod + (localEquip ? ' — ' + localEquip : '') + '</td></tr>' +
    '<tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:bold;background:#f5f5f5;">Período</td>' +
    '<td style="padding:6px 10px;border:1px solid #ddd;">' + nomeMes + ' de ' + ano + '</td></tr>' +
    '<tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:bold;background:#f5f5f5;">Data de geração</td>' +
    '<td style="padding:6px 10px;border:1px solid #ddd;">' + Utilities.formatDate(new Date(registro[0]), CONFIG.fusoHorario, "dd/MM/yyyy 'às' HH:mm:ss") + '</td></tr>' +
    '<tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:bold;background:#f5f5f5;">Gerado por</td>' +
    '<td style="padding:6px 10px;border:1px solid #ddd;">' + CONFIG.responsavelNome + '</td></tr>' +
    '<tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:bold;background:#f5f5f5;">Tamanho</td>' +
    '<td style="padding:6px 10px;border:1px solid #ddd;">' + registro[5] + ' bytes</td></tr>' +
    '<tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:bold;background:#f5f5f5;">Hash SHA-256</td>' +
    '<td style="padding:6px 10px;border:1px solid #ddd;font-family:monospace;font-size:10px;word-break:break-all;">' + hash + '</td></tr>' +
    '<tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:bold;background:#f5f5f5;">Aprovação PCQI</td>' +
    '<td style="padding:6px 10px;border:1px solid #ddd;">' +
      (aprovado
        ? '<span style="color:#2e7d32;font-weight:bold;">✔ Aprovado</span> — ' + registro[9] + ' por ' + CONFIG.responsavelNome
        : '<span style="color:#e65100;">⏳ Pendente de aprovação</span>') +
    '</td></tr>' +
    '</table>'
  ) : (
    '<p style="color:#555;margin-top:16px;">O hash informado não foi encontrado nos registros do sistema. ' +
    'O documento pode ter sido adulterado ou o QR Code é inválido.</p>'
  );

  var html =
    '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>' +
    'body{font-family:Arial,sans-serif;margin:0;padding:20px;background:#f5f5f5;color:#222;font-size:13px;}' +
    '.card{background:white;border-radius:10px;padding:24px;max-width:640px;margin:0 auto;box-shadow:0 2px 8px rgba(0,0,0,0.1);}' +
    '.header{border-bottom:2px solid ' + corStatus + ';padding-bottom:12px;margin-bottom:16px;}' +
    '.logo{font-size:20px;font-weight:bold;color:#2e7d32;letter-spacing:2px;}' +
    '.status{font-size:22px;font-weight:bold;color:' + corStatus + ';margin:12px 0 4px;}' +
    '.rodape{margin-top:20px;font-size:10px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:10px;}' +
    '</style></head><body><div class="card">' +
    '<div class="header">' +
    '<div class="logo">DOCEFRUTA</div>' +
    '<div style="font-size:11px;color:#666;">' + CONFIG.empresa + '</div>' +
    '</div>' +
    '<div class="status">' + iconStatus + ' ' + txtStatus + '</div>' +
    '<div style="font-size:11px;color:#666;">Verificação realizada em: ' +
    Utilities.formatDate(new Date(), CONFIG.fusoHorario, "dd/MM/yyyy 'às' HH:mm:ss") + '</div>' +
    blocoRegistro +
    '<div class="rodape">Sistema de Monitoramento Ambiental — Docefruta | Verificação SHA-256</div>' +
    '</div></body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle("Verificação de Autenticidade — Docefruta")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================
// LOG DE ACESSO AO QR CODE
// ============================================================
function registrarLog(equipamentoId, data, hora) {
  try {
    var ss  = SpreadsheetApp.openById(CONFIG.planilhaId);
    var aba = ss.getSheetByName(CONFIG.abaLog);
    if (!aba) {
      aba = ss.insertSheet(CONFIG.abaLog);
      aba.appendRow(["TIMESTAMP_SERVIDOR","EQUIPAMENTO","DATA_LEITURA","HORA_LEITURA","STATUS"]);
      aba.getRange(1, 1, 1, 5).setFontWeight("bold");
    }
    aba.appendRow([new Date(), equipamentoId, data, hora, "QR_ESCANEADO"]);
  } catch(err) {
    console.error("Erro ao registrar log: " + err.message);
  }
}

// ============================================================
// PÁGINAS HTML
// ============================================================
function paginaConfirmacao(urlFinal, equipamentoId, hora) {
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
  return HtmlService.createHtmlOutput(html).setTitle("Monitoramento — " + equipamentoId);
}

function paginaErro(idRecebido) {
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
  return HtmlService.createHtmlOutput(html).setTitle("Erro — QR Code inválido");
}

function testeLog() {
  registrarLog("COD-1040", "2026-05-06", "14:30");
}

// ============================================================
// GERAÇÃO DE PDFs MENSAIS
// ============================================================

var EQUIPAMENTOS_PDF = [
  "COD-1040","COD-1041","COD-1042","COD-1043","COD-1044",
  "COD-1045","COD-1046","COD-1047","COD-1048","COD-1049"
];

var ABA_RELATORIO  = "Relatório Mensal";
var CELULA_COD     = "B5";
var CELULA_MES     = "I5";
var CELULA_ANO     = "I6";
var PASTA_PDF_NOME = "Relatórios de Temperatura PDF";

function gerarPDFsMensais() {
  var ss  = SpreadsheetApp.openById(CONFIG.planilhaId);
  var aba = ss.getSheetByName(ABA_RELATORIO);
  var mes = aba.getRange(CELULA_MES).getValue();
  var ano = aba.getRange(CELULA_ANO).getValue();

  if (!mes || !ano) {
    Logger.log("Defina o mês (I5) e o ano (I6) antes de gerar os PDFs.");
    return;
  }

  var pasta   = localizarOuCriarSubpasta_(mes, ano);
  var erros   = [];
  var gerados = 0;

  for (var i = 0; i < EQUIPAMENTOS_PDF.length; i++) {
    var cod = EQUIPAMENTOS_PDF[i];
    try {
      aba.getRange(CELULA_COD).setValue(cod);
      SpreadsheetApp.flush();
      Utilities.sleep(4000);

      var mesFormatado = mes < 10 ? "0" + mes : String(mes);
      var nomeArquivo  = ano + "-" + mesFormatado + "_" + cod + "_Monitoramento.pdf";

      // 1. Gera PDF do relatório
      var pdfRelatorio = exportarAbaPDF_(ss, aba);
      var hash         = calcularHashPDF_(pdfRelatorio);
      var tamanho      = pdfRelatorio.getBytes().length;

      // 2. Salva PDF do relatório
      var existentesRel = pasta.getFilesByName(nomeArquivo);
      while (existentesRel.hasNext()) existentesRel.next().setTrashed(true);
      var arquivoRel = pasta.createFile(pdfRelatorio.setName(nomeArquivo));
      registrarIntegridade_(ss, nomeArquivo, mes, ano, cod, pdfRelatorio, arquivoRel.getId());

      // 3. Gera e salva PDF do certificado
      var nomeCert = ano + "-" + mesFormatado + "_" + cod + "_Certificado_de_Aprovação.pdf";
      var pdfCert  = gerarPdfCertificado_(nomeArquivo, hash, mes, ano, cod, tamanho);
      var existentesCert = pasta.getFilesByName(nomeCert);
      while (existentesCert.hasNext()) existentesCert.next().setTrashed(true);
      pasta.createFile(pdfCert.setName(nomeCert));

      gerados++;
      Logger.log("✅ Gerado: " + nomeArquivo + " | SHA-256: " + hash);

    } catch(err) {
      if (err.message.indexOf("429") !== -1) {
        Logger.log("⏳ Rate limit em " + cod + " — aguardando 10s...");
        Utilities.sleep(10000);
        i--;
      } else {
        erros.push(cod + ": " + err.message);
        Logger.log("❌ Erro em " + cod + ": " + err.message);
      }
    }
  }

function notificarAprovacao_(mes, ano, gerados, erros) {
  var nomeMes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][mes - 1];
  var urlAprovacao = CONFIG.urlAprovacao + "?page=aprovacao";
  var dataHoje = Utilities.formatDate(new Date(), CONFIG.fusoHorario, "dd/MM/yyyy");

  var msg = "✅ Docefruta | Monitoramento Ambiental\n"
    + gerados + " relatórios de " + nomeMes + "/" + ano + " gerados.\n\n"
    + "Acesse para aprovação:\n" + urlAprovacao
    + (erros.length > 0 ? "\n\n⚠️ Erros: " + erros.join(", ") : "");

  // E-mail
  var corpo = "<p>Olá, Yuri.</p>"
    + "<p><strong>" + gerados + " relatórios de " + nomeMes + " de " + ano
    + "</strong> foram gerados e aguardam sua aprovação como PCQI.</p>"
    + "<p><a href='" + urlAprovacao + "' style='background:#2e7d32;color:white;"
    + "padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;'>"
    + "Acessar página de aprovação</a></p>"
    + (erros.length > 0 ? "<p>⚠️ Equipamentos com erro: " + erros.join(", ") + "</p>" : "")
    + "<br><p><i>Sistema de Monitoramento Ambiental — Docefruta</i></p>";

  try {
    GmailApp.sendEmail(
      CONFIG.responsavelEmail,
      "✅ [Monitoramento] Relatórios de " + nomeMes + "/" + ano + " prontos para aprovação",
      msg,
      { htmlBody: corpo }
    );
    Logger.log("✅ E-mail de notificação enviado.");
  } catch(e) {
    Logger.log("❌ Erro e-mail notificação: " + e.message);
  }

  // WhatsApp
  try {
    var url = "https://api.callmebot.com/whatsapp.php"
      + "?phone="  + ALERTA.whatsappNumero
      + "&text="   + encodeURIComponent(msg)
      + "&apikey=" + ALERTA.whatsappApiKey;
    UrlFetchApp.fetch(url);
    Logger.log("✅ WhatsApp de notificação enviado.");
  } catch(e) {
    Logger.log("❌ Erro WhatsApp notificação: " + e.message);
  }
}

  aba.getRange(CELULA_COD).setValue(EQUIPAMENTOS_PDF[0]);
  Logger.log("=== RESULTADO: " + gerados + "/10 PDFs gerados ===");
  if (erros.length > 0) Logger.log("Erros: " + erros.join(" | "));

  // Notifica responsável para aprovação
  if (gerados > 0) notificarAprovacao_(mes, ano, gerados, erros);
}

function notificarAprovacao_(mes, ano, gerados, erros) {
  var nomeMes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][mes - 1];
  var urlAprovacao = "https://script.google.com/macros/s/YOUR_WEBAPP_URL_QR?page=aprovacao";

  var msg = "✅ Docefruta | Monitoramento Ambiental\n"
    + gerados + " relatórios de " + nomeMes + "/" + ano + " gerados.\n\n"
    + "Acesse para aprovação:\n" + urlAprovacao
    + (erros.length > 0 ? "\n\n⚠️ Erros: " + erros.join(", ") : "");

  var corpo = "<p>Olá, Yuri.</p>"
    + "<p><strong>" + gerados + " relatórios de " + nomeMes + " de " + ano
    + "</strong> foram gerados e aguardam sua aprovação como PCQI.</p>"
    + "<p><a href='" + urlAprovacao + "' style='background:#2e7d32;color:white;"
    + "padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;'>"
    + "Acessar página de aprovação</a></p>"
    + (erros.length > 0 ? "<p>⚠️ Equipamentos com erro: " + erros.join(", ") + "</p>" : "")
    + "<br><p><i>Sistema de Monitoramento Ambiental — Docefruta</i></p>";

  try {
    GmailApp.sendEmail(
      CONFIG.responsavelEmail,
      "✅ [Monitoramento] Relatórios de " + nomeMes + "/" + ano + " prontos para aprovação",
      msg,
      { htmlBody: corpo }
    );
    Logger.log("✅ E-mail de notificação enviado.");
  } catch(e) {
    Logger.log("❌ Erro e-mail notificação: " + e.message);
  }

  try {
    var url = "https://api.callmebot.com/whatsapp.php"
      + "?phone="  + ALERTA.whatsappNumero
      + "&text="   + encodeURIComponent(msg)
      + "&apikey=" + ALERTA.whatsappApiKey;
    UrlFetchApp.fetch(url);
    Logger.log("✅ WhatsApp de notificação enviado.");
  } catch(e) {
    Logger.log("❌ Erro WhatsApp notificação: " + e.message);
  }
}

function testeNotificacaoAprovacao() {
  notificarAprovacao_(4, 2026, 10, []);
}

// ============================================================
// FUNÇÕES AUXILIARES DE PDF
// ============================================================

// Exporta apenas o Relatório Mensal — preserva formatação original
function exportarAbaPDF_(ss, aba) {
  var url = "https://docs.google.com/spreadsheets/d/" + ss.getId() + "/export"
    + "?format=pdf&size=A4&portrait=true&fitw=true"
    + "&sheetnames=false&printtitle=false&pagenumbers=false"
    + "&gridlines=false&fzr=false&gid=" + aba.getSheetId();
  var response = UrlFetchApp.fetch(url, {
    headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() }
  });
  return response.getBlob().setContentType("application/pdf");
}

function localizarOuCriarPasta_(nomePasta) {
  var pastas = DriveApp.getFoldersByName(nomePasta);
  if (pastas.hasNext()) return pastas.next();
  return DriveApp.createFolder(nomePasta);
}

function localizarOuCriarSubpasta_(mes, ano) {
  var mesFormatado  = mes < 10 ? "0" + mes : String(mes);
  var nomeMes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][mes - 1];
  var nomeSubpasta  = ano + "-" + mesFormatado + " — " + nomeMes;
  var pastaPrincipal = localizarOuCriarPasta_(PASTA_PDF_NOME);

  var subpastas = pastaPrincipal.getFoldersByName(nomeSubpasta);
  if (subpastas.hasNext()) return subpastas.next();
  return pastaPrincipal.createFolder(nomeSubpasta);
}

// ============================================================
// CERTIFICADO DE APROVAÇÃO DE REGITRO — gerado como PDF separado
// ============================================================

function processarAprovacao_(cod, mes, ano) {
  try {
    mes = parseInt(mes);
    ano = parseInt(ano);
    var mesFormatado  = mes < 10 ? "0" + mes : String(mes);
    var nomeArquivo   = ano + "-" + mesFormatado + "_" + cod + "_Monitoramento.pdf";
    var nomeCert      = ano + "-" + mesFormatado + "_" + cod + "_Certificado_de_Aprovacao.pdf";
    var dataAprovacao = Utilities.formatDate(new Date(), CONFIG.fusoHorario, "dd/MM/yyyy 'às' HH:mm:ss");

    var ss     = SpreadsheetApp.openById(CONFIG.planilhaId);
    var abaLog = ss.getSheetByName(ABA_LOG_INTEGRIDADE);
    var logDados = abaLog.getDataRange().getValues();

    var linhaLog = -1;
    var hash = "", tamanho = 0;
    var chave = mesFormatado + "/" + ano;

    for (var i = 1; i < logDados.length; i++) {
      var mesAnoCell = logDados[i][2];
      var mesAnoStr = (mesAnoCell instanceof Date)
        ? Utilities.formatDate(mesAnoCell, CONFIG.fusoHorario, "MM/yyyy")
        : String(mesAnoCell).trim();
      if (String(logDados[i][3]).trim() === cod && mesAnoStr === chave) {
        hash     = logDados[i][4];
        tamanho  = logDados[i][5];
        linhaLog = i + 1;
      }
    }

    if (linhaLog < 0) throw new Error("Registro não encontrado para " + cod + " | " + chave);

    // Regenera certificado com bloco de aprovação
    var pdfCert = gerarPdfCertificado_(nomeArquivo, hash, mes, ano, cod, tamanho, true, dataAprovacao);
    pdfCert.setName(nomeCert);

    // Substitui certificado na pasta
    var pasta = localizarOuCriarSubpasta_(mes, ano);
    var existentes = pasta.getFilesByName(nomeCert);
    while (existentes.hasNext()) existentes.next().setTrashed(true);
    pasta.createFile(pdfCert);

    // Atualiza LOG_INTEGRIDADE
    abaLog.getRange(linhaLog, 9).setValue(true);
    abaLog.getRange(linhaLog, 10).setValue(dataAprovacao);

    Logger.log("✅ Aprovado: " + cod + " | " + chave);
    return true;

  } catch(e) {
    Logger.log("❌ Erro: " + e.message);
    return false;
  }
}

// ============================================================
// MERGE DE PDFs via PDF-LIB
// ============================================================

function mergearPDFs_(pdf1, pdf2) {
  // Carrega PDF-LIB do CDN
  var pdfLibSrc = UrlFetchApp.fetch(
    "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"
  ).getContentText();
  eval(pdfLibSrc);

  var bytes1 = new Uint8Array(pdf1.getBytes());
  var bytes2 = new Uint8Array(pdf2.getBytes());

  var resultBytes = null;
  var error       = null;

  PDFLib.PDFDocument.create().then(function(mergedPdf) {
    return PDFLib.PDFDocument.load(bytes1).then(function(doc1) {
      return mergedPdf.copyPages(doc1, doc1.getPageIndices()).then(function(pages1) {
        pages1.forEach(function(p) { mergedPdf.addPage(p); });
        return PDFLib.PDFDocument.load(bytes2).then(function(doc2) {
          return mergedPdf.copyPages(doc2, doc2.getPageIndices()).then(function(pages2) {
            pages2.forEach(function(p) { mergedPdf.addPage(p); });
            return mergedPdf.save();
          });
        });
      });
    });
  }).then(function(bytes) {
    resultBytes = bytes;
  }).catch(function(e) {
    error = e;
  });

  // Aguarda conclusão da promise (Apps Script é síncrono)
  var maxWait = 30000;
  var waited  = 0;
  while (resultBytes === null && error === null && waited < maxWait) {
    Utilities.sleep(100);
    waited += 100;
  }

  if (error) throw new Error("Erro no merge de PDFs: " + (error.message || error));
  if (!resultBytes) throw new Error("Timeout no merge de PDFs");

  return Utilities.newBlob(resultBytes, "application/pdf");
}

// ============================================================
// TRIGGERS — último dia útil
// ============================================================

function configurarTriggerMensal() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "verificarEGerarPDFs") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("verificarEGerarPDFs")
    .timeBased().atHour(18).everyDays(1).create();
  Logger.log("✅ Trigger mensal configurado — verificação diária às 18h.");
}

function verificarEGerarPDFs() {
  var hoje = new Date();
  var mes  = hoje.getMonth() + 1;
  var ano  = hoje.getFullYear();
  if (!isUltimoDiaUtil_(hoje)) {
    Logger.log("Hoje não é o último dia útil do mês — nenhuma ação.");
    return;
  }
  var ss  = SpreadsheetApp.openById(CONFIG.planilhaId);
  var aba = ss.getSheetByName(ABA_RELATORIO);
  aba.getRange(CELULA_MES).setValue(mes);
  aba.getRange(CELULA_ANO).setValue(ano);
  SpreadsheetApp.flush();
  Logger.log("Último dia útil do mês — gerando PDFs para " + mes + "/" + ano);
  gerarPDFsMensais();
}

function isUltimoDiaUtil_(data) {
  var ss       = SpreadsheetApp.openById(CONFIG.planilhaId);
  var abaFer   = ss.getSheetByName("Feriados");
  var feriados = [];
  if (abaFer) {
    var dados = abaFer.getDataRange().getValues();
    for (var i = 1; i < dados.length; i++) {
      if (dados[i][0]) {
        var d = new Date(dados[i][0]);
        feriados.push(d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate());
      }
    }
  }
  if (!isDiaUtil_(data, feriados)) return false;
  var proximo = new Date(data);
  proximo.setDate(proximo.getDate() + 1);
  while (!isDiaUtil_(proximo, feriados)) proximo.setDate(proximo.getDate() + 1);
  return proximo.getMonth() !== data.getMonth();
}

function isDiaUtil_(data, feriados) {
  var dia = data.getDay();
  if (dia === 0 || dia === 6) return false;
  var chave = data.getFullYear() + "-" + (data.getMonth()+1) + "-" + data.getDate();
  return feriados.indexOf(chave) === -1;
}

// ============================================================
// ALERTAS DE COMPLETUDE
// ============================================================

var ALERTA = {
  emailDestino:    "YOUR_EMAIL",
  whatsappNumero:  "YOUR_WHATSAPP_NUMBER",
  whatsappApiKey:  "YOUR_CALLMEBOT_API_KEY",
  equipamentosAtivos: [
    "COD-1040","COD-1041","COD-1042",
    "COD-1044","COD-1045","COD-1046","COD-1047","COD-1048"
  ]
};

function configurarTriggerAlerta() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var fn = triggers[i].getHandlerFunction();
    if (fn === "alertaTurnoManha" || fn === "alertaTurnoTarde") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("alertaTurnoManha").timeBased().atHour(9).everyDays(1).create();
  ScriptApp.newTrigger("alertaTurnoTarde").timeBased().atHour(15).everyDays(1).create();
  Logger.log("✅ Triggers de alerta configurados — 9h e 15h.");
}

function alertaTurnoManha() { verificarCompletude_("manhã", 0, 12); }
function alertaTurnoTarde() { verificarCompletude_("tarde", 12, 23); }

function verificarCompletude_(turno, horaInicio, horaFim) {
  var hoje = new Date();
  if (hoje.getDay() === 0 || hoje.getDay() === 6) return;
  var ss       = SpreadsheetApp.openById(CONFIG.planilhaId);
  var abaResp  = ss.getSheetByName("Respostas ao formulário 1");
  var dados    = abaResp.getDataRange().getValues();
  var dataHoje = Utilities.formatDate(hoje, CONFIG.fusoHorario, "dd/MM/yyyy");
  var registrados = {};
  ALERTA.equipamentosAtivos.forEach(function(cod) { registrados[cod] = false; });
  for (var i = 1; i < dados.length; i++) {
    var linha = dados[i];
    var cod   = linha[1];
    var dataL = linha[2];
    var horaL = linha[3];
    if (!dataL || !cod) continue;
    var dataF = Utilities.formatDate(new Date(dataL), CONFIG.fusoHorario, "dd/MM/yyyy");
    if (dataF !== dataHoje) continue;
    var h = 0;
    if (horaL instanceof Date) { h = horaL.getHours(); }
    else if (typeof horaL === "string") { h = parseInt(horaL.split(":")[0]); }
    if (h >= horaInicio && h < horaFim && registrados.hasOwnProperty(cod)) {
      registrados[cod] = true;
    }
  }
  var pendentes = ALERTA.equipamentosAtivos.filter(function(cod) { return !registrados[cod]; });
  if (pendentes.length === 0) {
    Logger.log("✅ Turno " + turno + " — todos os equipamentos registrados.");
    return;
  }
  var msg = "⚠️ Docefruta | Monitoramento Temperatura\n"
    + "Turno: " + turno.toUpperCase() + " | " + dataHoje + "\n\n"
    + "Equipamentos SEM registro:\n" + pendentes.join("\n") + "\n\n"
    + "Verifique e regularize o registro.";
  enviarEmail_(msg, turno, dataHoje, pendentes);
  enviarWhatsApp_(msg);
  Logger.log("⚠️ Alerta enviado — turno " + turno + " — pendentes: " + pendentes.join(", "));
}

function enviarEmail_(msg, turno, data, pendentes) {
  var assunto = "⚠️ [Monitoramento] Registros pendentes — turno " + turno + " | " + data;
  var corpo =
    "<p>Olá,</p>" +
    "<p>Os seguintes equipamentos <strong>não possuem registro</strong> no turno da " +
    "<strong>" + turno + "</strong> de <strong>" + data + "</strong>:</p>" +
    "<ul>" + pendentes.map(function(c){ return "<li>" + c + "</li>"; }).join("") + "</ul>" +
    "<p>Por favor, verifique e regularize o registro.</p>" +
    "<br><p><i>Monitoramento Ambiental — Docefruta</i></p>";
  GmailApp.sendEmail(ALERTA.emailDestino, assunto, msg, { htmlBody: corpo });
}

function enviarWhatsApp_(mensagem) {
  try {
    var url = "https://api.callmebot.com/whatsapp.php"
      + "?phone="  + ALERTA.whatsappNumero
      + "&text="   + encodeURIComponent(mensagem)
      + "&apikey=" + ALERTA.whatsappApiKey;
    UrlFetchApp.fetch(url);
    Logger.log("✅ WhatsApp enviado.");
  } catch(err) {
    Logger.log("❌ Erro WhatsApp: " + err.message);
  }
}

function testeAlerta() { verificarCompletude_("manhã", 0, 12); }

// ============================================================
// RAW_DATA
// ============================================================

var ABA_RAW    = "RAW_DATA";
var HEADER_RAW = [
  "TIMESTAMP_FORMS","DEVICE_ID","DATA_MEDICAO","HORA_MEDICAO",
  "TEMP_ATUAL","TEMP_MAX","TEMP_MIN","UMIDADE",
  "RESPONSAVEL","OBSERVACOES","FONTE","TIMESTAMP_PROCESSAMENTO"
];

var NOMES_VALIDOS = {
  "yuri":"Yuri","yuru":"Yuri",
  "samara":"Samara","samara ":"Samara",
  "mariana":"Mariana","mariana ":"Mariana",
  "yara":"Yara","yara ":"Yara",
  "ana":"Ana"
};

function normalizarNome_(nome) {
  if (!nome) return "";
  var chave = nome.toString().toLowerCase().trim();
  return NOMES_VALIDOS[chave] || nome.toString().trim();
}

function garantirAbaRaw_(ss) {
  var aba = ss.getSheetByName(ABA_RAW);
  if (!aba) {
    aba = ss.insertSheet(ABA_RAW);
    aba.appendRow(HEADER_RAW);
    aba.getRange(1, 1, 1, HEADER_RAW.length).setFontWeight("bold");
    aba.setFrozenRows(1);
  }
  return aba;
}

function normalizarDecimal_(val) {
  if (!val) return "";
  return String(val).trim().replace(".", ",");
}

function onFormSubmit(e) {
  try {
    var ss     = SpreadsheetApp.openById(CONFIG.planilhaId);
    var abaRaw = garantirAbaRaw_(ss);
    var vals   = e.values;
    var timestampForms = new Date(vals[0]);
    var deviceId       = vals[1] ? vals[1].toString().trim() : "";
    var dataMedicao    = vals[2] ? vals[2].toString() : "";
    var horaMedicao    = vals[3] ? vals[3].toString().substring(0, 5) : "";
    var tempAtual      = normalizarDecimal_(vals[4]);
    var tempMax        = normalizarDecimal_(vals[5]);
    var tempMin        = normalizarDecimal_(vals[6]);
    var umidade        = normalizarDecimal_(vals[7]);
    var responsavel    = vals[8] || "";
    var observacoes    = vals[9] || "";
    if (dataMedicao.indexOf("-") !== -1) {
      var partes = dataMedicao.split("-");
      if (partes.length === 3) dataMedicao = partes[2] + "/" + partes[1] + "/" + partes[0];
    }
    abaRaw.appendRow([
      timestampForms, deviceId, dataMedicao, horaMedicao,
      tempAtual, tempMax, tempMin, umidade,
      normalizarNome_(responsavel), observacoes, "forms", new Date()
    ]);
    Logger.log("✅ RAW_DATA atualizada: " + deviceId + " — " + dataMedicao + " " + horaMedicao);
  } catch(err) {
    Logger.log("❌ Erro onFormSubmit: " + err.message);
  }
}

function configurarTriggerForms() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "onFormSubmit") ScriptApp.deleteTrigger(triggers[i]);
  }
  var ss = SpreadsheetApp.openById(CONFIG.planilhaId);
  ScriptApp.newTrigger("onFormSubmit").forSpreadsheet(ss).onFormSubmit().create();
  Logger.log("✅ Trigger de Forms configurado.");
}

function corrigirRawDataCompleto() {
  var ss      = SpreadsheetApp.openById(CONFIG.planilhaId);
  var abaResp = ss.getSheetByName("Respostas ao formulário 1");
  var dados   = abaResp.getDataRange().getValues();
  var agora   = new Date();
  var abaRawExistente = ss.getSheetByName("RAW_DATA");
  if (abaRawExistente) ss.deleteSheet(abaRawExistente);
  var abaRaw = ss.insertSheet("RAW_DATA");
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
      : linha[2].toString();
    var horaF = linha[3] instanceof Date
      ? Utilities.formatDate(linha[3], CONFIG.fusoHorario, "HH:mm")
      : linha[3].toString().substring(0, 5);
    novasLinhas.push([
      linha[0], linha[1].toString().trim(), dataF, horaF,
      parseFloat(linha[4]) || "", parseFloat(linha[5]) || "",
      parseFloat(linha[6]) || "", parseFloat(linha[7]) || "",
      normalizarNome_(linha[8]), linha[9] || "", "forms", agora
    ]);
  }
  if (novasLinhas.length > 0) {
    abaRaw.getRange(2, 1, novasLinhas.length, HEADER_RAW.length).setValues(novasLinhas);
  }
  Logger.log("✅ RAW_DATA recriada com " + novasLinhas.length + " registros.");
}

// ============================================================
// FÓRMULAS DO RELATÓRIO MENSAL
// ============================================================

function corrigirMapeamentoColunas() {
  var ss  = SpreadsheetApp.openById(CONFIG.planilhaId);
  var aba = ss.getSheetByName(ABA_RELATORIO);
  var dias = [
    [9,10,"$A9"],[11,12,"$A11"],[13,14,"$A13"],[15,16,"$A15"],[17,18,"$A17"],
    [19,20,"$A19"],[21,22,"$A21"],[23,24,"$A23"],[25,26,"$A25"],[27,28,"$A27"],
    [29,30,"$A29"],[31,32,"$A31"],[33,34,"$A33"],[35,36,"$A35"],[37,38,"$A37"],
    [39,40,"$A39"],[41,42,"$A41"],[43,44,"$A43"],[45,46,"$A45"],[54,55,"$A54"],
    [56,57,"$A56"],[58,59,"$A58"],[60,61,"$A60"],[62,63,"$A62"],[64,65,"$A64"],
    [66,67,"$A66"],[68,69,"$A68"],[70,71,"$A70"],[72,73,"$A72"],[74,75,"$A74"],
    [76,77,"$A76"]
  ];
  var colMap = [[2,"D"],[3,"E"],[4,"F"],[5,"G"],[6,"H"],[7,"I"]];
  var refK = [
    "$K9","$K10","$K11","$K12","$K13","$K14","$K15","$K16","$K17","$K18",
    "$K19","$K20","$K21","$K22","$K23","$K24","$K25","$K26","$K27","$K28",
    "$K29","$K30","$K31","$K32","$K33","$K34","$K35","$K36","$K37","$K38",
    "$K39","$K40","$K41","$K42","$K43","$K44","$K45","$K46",
    "$K54","$K55","$K56","$K57","$K58","$K59","$K60","$K61","$K62","$K63",
    "$K64","$K65","$K66","$K67","$K68","$K69","$K70","$K71","$K72","$K73",
    "$K74","$K75","$K76","$K77"
  ];
  function f(colRaw, refDia, turno) {
    var crit = turno === "m"
      ? "VALUE(LEFT(RAW_DATA!D:D;2))<12"
      : "VALUE(LEFT(RAW_DATA!D:D;2))>=12";
    return "=IFERROR(ARRAY_CONSTRAIN(FILTER(RAW_DATA!" + colRaw + ":" + colRaw + ";"
      + "DAY(DATEVALUE(RAW_DATA!C:C))=VALUE(" + refDia + ");"
      + "MONTH(DATEVALUE(RAW_DATA!C:C))=$I$5;"
      + "YEAR(DATEVALUE(RAW_DATA!C:C))=$I$6;"
      + "RAW_DATA!B:B=$B$5;" + crit + ");1;1))";
  }
  function fObs(refDia, turno, refKCell) {
    var crit = turno === "m"
      ? "VALUE(LEFT(RAW_DATA!D:D;2))<12"
      : "VALUE(LEFT(RAW_DATA!D:D;2))>=12";
    var obs = "IFERROR(ARRAY_CONSTRAIN(FILTER(RAW_DATA!J:J;"
      + "DAY(DATEVALUE(RAW_DATA!C:C))=VALUE(" + refDia + ");"
      + "MONTH(DATEVALUE(RAW_DATA!C:C))=$I$5;"
      + "YEAR(DATEVALUE(RAW_DATA!C:C))=$I$6;"
      + "RAW_DATA!B:B=$B$5;" + crit + ");1;1);\"\")";
    return "=IF(WEEKDAY(" + refKCell + ")=1;\"DOMINGO\";IF(WEEKDAY(" + refKCell + ")=7;\"SÁBADO\";" + obs + "))";
  }
  var count = 0;
  for (var d = 0; d < dias.length; d++) {
    var lm = dias[d][0], lt = dias[d][1], ref = dias[d][2];
    var km = refK[d * 2], kt = refK[d * 2 + 1];
    for (var c = 0; c < colMap.length; c++) {
      aba.getRange(lm, colMap[c][0]).setFormula(f(colMap[c][1], ref, "m"));
      aba.getRange(lt, colMap[c][0]).setFormula(f(colMap[c][1], ref, "t"));
      count += 2;
    }
    aba.getRange(lm, 8).setFormula(fObs(ref, "m", km));
    aba.getRange(lt, 8).setFormula(fObs(ref, "t", kt));
    count += 2;
  }
  SpreadsheetApp.flush();
  Logger.log("✅ " + count + " fórmulas corrigidas.");
}

// ============================================================
// INTEGRIDADE — hash SHA-256 e LOG_INTEGRIDADE
// ============================================================

var ABA_LOG_INTEGRIDADE = "LOG_INTEGRIDADE";

function garantirAbaIntegridade_(ss) {
  var aba = ss.getSheetByName(ABA_LOG_INTEGRIDADE);
  if (!aba) {
    aba = ss.insertSheet(ABA_LOG_INTEGRIDADE);
    aba.appendRow([
      "TIMESTAMP_GERACAO","NOME_ARQUIVO","MES_ANO",
      "EQUIPAMENTO","HASH_SHA256","TAMANHO_BYTES",
      "GERADO_POR","ID_DRIVE","APROVADO","DATA_APROVACAO"
    ]);
    aba.getRange(1, 1, 1, 10).setFontWeight("bold");
    aba.setFrozenRows(1);
    aba.setColumnWidth(1, 160);
    aba.setColumnWidth(2, 220);
    aba.setColumnWidth(5, 280);
    aba.setColumnWidth(8, 200);
    aba.setColumnWidth(10, 160);
  }
  return aba;
}

function calcularHashPDF_(blob) {
  var bytes  = blob.getBytes();
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes);
  return digest.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

function registrarIntegridade_(ss, nomeArquivo, mes, ano, cod, blob, fileId) {
  var aba          = garantirAbaIntegridade_(ss);
  var hash         = calcularHashPDF_(blob);
  var mesFormatado = mes < 10 ? "0" + mes : String(mes);
  aba.appendRow([
    new Date(), nomeArquivo, mesFormatado + "/" + ano,
    cod, hash, blob.getBytes().length,
    CONFIG.responsavelEmail, fileId
  ]);
return hash;
}

function atualizarCabecalhoLog() {
  var ss  = SpreadsheetApp.openById(CONFIG.planilhaId);
  var aba = ss.getSheetByName(ABA_LOG_INTEGRIDADE);
  if (!aba) return;
  var header = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  if (header.indexOf("APROVADO") === -1) {
    aba.getRange(1, 9).setValue("APROVADO");
    aba.getRange(1, 10).setValue("DATA_APROVACAO");
    aba.getRange(1, 9, 1, 2).setFontWeight("bold");
    aba.setColumnWidth(10, 160);
  }
  Logger.log("✅ Cabeçalho do LOG_INTEGRIDADE atualizado.");
}

// ============================================================
// PÁGINA DE APROVAÇÃO
// ============================================================

function doGetAprovacao(e) {
  try {
    var params = e ? e.parameter : {};
    var acao   = params.acao || "";
    var cod    = params.cod  || "";
    var mes    = parseInt(params.mes) || 0;
    var ano    = parseInt(params.ano) || 0;

    if (acao === "aprovar" && cod && mes && ano) {
      var resultado = processarAprovacao_(cod, mes, ano);
      return HtmlService.createHtmlOutput(paginaConfirmacaoAprovacao_(cod, mes, ano, resultado))
        .setTitle("Aprovação — " + cod);
    }

    return paginaListaAprovacao_(mes, ano);

  } catch(err) {
    return HtmlService.createHtmlOutput(
      "<h2 style='color:red'>Erro</h2><pre>" + err.toString() + "\n\n" + err.stack + "</pre>"
    );
  }
}

function paginaListaAprovacao_(mes, ano) {
  var ss     = SpreadsheetApp.openById(CONFIG.planilhaId);
  var abaRel = ss.getSheetByName(ABA_RELATORIO);

  if (!mes) mes = abaRel.getRange(CELULA_MES).getValue();
  if (!ano) ano = abaRel.getRange(CELULA_ANO).getValue();

  var mesFormatado = mes < 10 ? "0" + mes : String(mes);
  var nomeMes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][mes - 1];

  // Aprovados
  var aprovados = {};
  var abaLog = ss.getSheetByName(ABA_LOG_INTEGRIDADE);
if (abaLog) {
    var logDados = abaLog.getDataRange().getValues();
    for (var i = 1; i < logDados.length; i++) {
      var mesAnoCell = logDados[i][2];
      var mesAnoStr = (mesAnoCell instanceof Date)
        ? Utilities.formatDate(mesAnoCell, CONFIG.fusoHorario, "MM/yyyy")
        : String(mesAnoCell).trim();
      if (mesAnoStr === mesFormatado + "/" + ano) {
        aprovados[logDados[i][3]] = {
          aprovado: logDados[i][8] === true,
          dataAprovacao: logDados[i][9] || ""
        };
      }
    }
  }
  // URLs dos PDFs
  var urlsRelatorios = {};
  try {
    var pasta = localizarOuCriarSubpasta_(mes, ano);
    var arquivos = pasta.getFiles();
    while (arquivos.hasNext()) {
      var arq = arquivos.next();
      var nome = arq.getName();
      if (nome.indexOf("_Monitoramento.pdf") !== -1) {
        var cod = nome.replace(ano + "-" + mesFormatado + "_", "").replace("_Monitoramento.pdf", "");
        urlsRelatorios[cod] = arq.getUrl();
      }
    }
  } catch(e) {}

  // Locais
  var locais = {};
  var abaEquip = ss.getSheetByName("Lista de Equips.");
  if (abaEquip) {
    var equips = abaEquip.getDataRange().getValues();
    for (var j = 1; j < equips.length; j++) locais[equips[j][0]] = equips[j][1] || "";
  }

  // Monta linhas
  var linhas = "";
  for (var k = 0; k < EQUIPAMENTOS_PDF.length; k++) {
    var c      = EQUIPAMENTOS_PDF[k];
    var status = aprovados[c] || { aprovado: false, dataAprovacao: "" };
    var urlRel = urlsRelatorios[c] || "";
    linhas += '<tr>' +
      '<td>' + c + '</td>' +
      '<td>' + (locais[c] || "") + '</td>' +
      '<td>' + (urlRel ? '<a href="' + urlRel + '" target="_blank">📄 Abrir PDF</a>' : '<span style="color:#aaa;">—</span>') + '</td>' +
      '<td>' + (status.aprovado
        ? '<span style="color:#2e7d32;font-weight:bold;">✔ Aprovado</span><br><small>' + status.dataAprovacao + '</small>'
        : '<span style="color:#e65100;">⏳ Pendente</span>') + '</td>' +
      '<td>' + (status.aprovado
        ? '<span style="color:#aaa;font-size:11px;">—</span>'
        : '<button class="btn" onclick="aprovar(\'' + c + '\',' + mes + ',' + ano + ',this)">Aprovar</button>') +
      '</td></tr>';
  }

  var t = HtmlService.createTemplateFromFile('aprovacao');
  t.nomeMes = nomeMes;
  t.ano     = ano;
  t.linhas  = linhas;
  t.empresa = CONFIG.empresa;
  return t.evaluate()
    .setTitle("Aprovação de Relatórios")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function paginaConfirmacaoAprovacao_(cod, mes, ano, sucesso) {
  var nomeMes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][mes - 1];
  var urlLista = ScriptApp.getService().getUrl() + '?mes=' + mes + '&ano=' + ano;

  return '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f0f2f5;}' +
    '.card{background:white;border-radius:12px;padding:32px 24px;max-width:400px;width:90%;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.15);}' +
    'h2{color:#2e7d32;font-size:16px;}' +
    'a{display:inline-block;margin-top:16px;padding:10px 24px;background:#2e7d32;color:white;text-decoration:none;border-radius:6px;font-size:13px;}' +
    '</style></head><body><div class="card">' +
    (sucesso
      ? '<div style="font-size:40px;">✅</div><h2>Aprovado com sucesso</h2><p style="color:#555;font-size:12px;">' + cod + ' — ' + nomeMes + ' de ' + ano + '<br>Certificado atualizado com sua assinatura.</p>'
      : '<div style="font-size:40px;">⚠️</div><h2>Erro ao aprovar</h2><p style="color:#555;font-size:12px;">Tente novamente ou verifique o log do Apps Script.</p>') +
    '<a href="' + urlLista + '">← Voltar à lista</a>' +
    '</div></body></html>';
}

function aprovarRelatorio(cod, mes, ano) {
  Logger.log("aprovarRelatorio chamada: " + cod + " | " + mes + " | " + ano);
  return processarAprovacao_(cod, mes, ano);
}

function processarAprovacao_(cod, mes, ano) {
  try {
    mes = parseInt(mes);
    ano = parseInt(ano);
    var mesFormatado  = mes < 10 ? "0" + mes : String(mes);
    var nomeArquivo   = ano + "-" + mesFormatado + "_" + cod + "_Monitoramento.pdf";
    var nomeCert      = ano + "-" + mesFormatado + "_" + cod + "_Certificado_de_Aprovacao.pdf";
    var dataAprovacao = Utilities.formatDate(new Date(), CONFIG.fusoHorario, "dd/MM/yyyy 'às' HH:mm:ss");

    var ss     = SpreadsheetApp.openById(CONFIG.planilhaId);
    var abaLog = ss.getSheetByName(ABA_LOG_INTEGRIDADE);
    var logDados = abaLog.getDataRange().getValues();
    var linhaLog = -1;
    var hash = "", tamanho = 0;
    var chave = mesFormatado + "/" + ano;

    for (var i = 1; i < logDados.length; i++) {
      var mesAnoCell = logDados[i][2];
      var mesAnoStr = (mesAnoCell instanceof Date)
        ? Utilities.formatDate(mesAnoCell, CONFIG.fusoHorario, "MM/yyyy")
        : String(mesAnoCell).trim();
      if (String(logDados[i][3]).trim() === cod && mesAnoStr === chave) {
        hash     = logDados[i][4];
        tamanho  = logDados[i][5];
        linhaLog = i + 1;
      }
    }

    if (linhaLog < 0) throw new Error("Registro não encontrado para " + cod + " | " + chave);

    // Gera certificado de aprovação
    var pdfCert = gerarPdfCertificado_(nomeArquivo, hash, mes, ano, cod, tamanho, true, dataAprovacao);
    pdfCert.setName(nomeCert);

    // Substitui na pasta
    var pasta = localizarOuCriarSubpasta_(mes, ano);
    var existentes = pasta.getFilesByName(nomeCert);
    while (existentes.hasNext()) existentes.next().setTrashed(true);
    pasta.createFile(pdfCert);

    // Atualiza LOG_INTEGRIDADE
    abaLog.getRange(linhaLog, 9).setValue(true);
    abaLog.getRange(linhaLog, 10).setValue(dataAprovacao);

    Logger.log("✅ Aprovado: " + cod + " | " + chave);
    return true;

  } catch(e) {
    Logger.log("❌ Erro: " + e.message);
    return false;
  }

function gerarPdfCertificado_(nomeArquivo, hash, mes, ano, cod, tamanho, aprovado, dataAprovacao) {
  var ss         = SpreadsheetApp.openById(CONFIG.planilhaId);
  var abaEquip   = ss.getSheetByName("Lista de Equips.");
  var localEquip = "";
  if (abaEquip) {
    var equips = abaEquip.getDataRange().getValues();
    for (var i = 1; i < equips.length; i++) {
      if (equips[i][0] === cod) { localEquip = equips[i][1]; break; }
    }
  }

  var nomeMes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][mes - 1];
  var dataGeracao = Utilities.formatDate(new Date(), CONFIG.fusoHorario, "dd/MM/yyyy 'às' HH:mm:ss");
  var qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=90x90&data="
  + encodeURIComponent(
      "https://script.google.com/macros/s/YOUR_WEBAPP_URL_QR"
      + "?page=verify&hash=" + hash
      + "&cod=" + cod
      + "&mes=" + mes
      + "&ano=" + ano
    );

  var assinaturaBase64 = "";
  try {
    var assinaturaBlob = DriveApp.getFileById(CONFIG.assinaturaId).getBlob();
    var bytes = assinaturaBlob.getBytes();
    assinaturaBase64 = Utilities.base64Encode(bytes);
  } catch(e) {
    Logger.log("⚠️ Não foi possível carregar a assinatura: " + e.message);
  }

  var blocoAprovacao = aprovado
    ? '<div style="border-top:1px solid #ccc;margin-top:12px;padding-top:10px;">' +
      '<div style="font-weight:bold;font-size:11px;margin-bottom:6px;color:#2e7d32;">✔ DOCUMENTO APROVADO PELO RESPONSÁVEL PELA QUALIDADE</div>' +
      '<table style="width:100%;border-collapse:collapse;">' +
      '<tr>' +
      '<td style="padding:5px 10px;border:1px solid #ccc;font-weight:bold;background:#f5f5f5;width:32%;">Aprovado por</td>' +
      '<td style="padding:5px 10px;border:1px solid #ccc;">' + CONFIG.responsavelNome + ' — ' + CONFIG.responsavelCargo + '</td>' +
      '</tr>' +
      '<tr>' +
      '<td style="padding:5px 10px;border:1px solid #ccc;font-weight:bold;background:#f5f5f5;">Data/hora aprovação</td>' +
      '<td style="padding:5px 10px;border:1px solid #ccc;">' + dataAprovacao + '</td>' +
      '</tr>' +
      '</table>' +
      (assinaturaBase64
        ? '<div style="margin-top:8px;"><img src="data:image/jpeg;base64,' + assinaturaBase64 + '" style="height:40px;" alt="Assinatura"></div>'
        : '') +
      '</div>'
    : '<div style="border-top:1px solid #ccc;margin-top:12px;padding-top:10px;background:#fff8e1;padding:8px 12px;font-size:10px;color:#888;">' +
      '⏳ Aguardando aprovação pelo Responsável pela Qualidade.' +
      '</div>';

  var html =
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
    '@page{size:A4;margin:15mm;}' +
    'body{font-family:Arial,sans-serif;color:#222;font-size:11px;line-height:1.4;margin:0;}' +
    '.header{border-bottom:2px solid #2e7d32;padding-bottom:6px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:flex-end;}' +
    '.logo{font-size:18px;font-weight:bold;color:#2e7d32;letter-spacing:2px;}' +
    '.subtitulo{font-size:10px;color:#666;margin-top:1px;}' +
    '.badge{display:inline-block;background:#2e7d32;color:white;font-size:9px;padding:2px 8px;border-radius:3px;letter-spacing:1px;}' +
    'h1{font-size:13px;text-align:center;color:#2e7d32;margin:8px 0 2px;}' +
    '.subdoc{text-align:center;font-size:10px;color:#666;margin-bottom:10px;font-style:italic;}' +
    'table{width:100%;border-collapse:collapse;margin-bottom:10px;}' +
    'td{padding:5px 10px;border:1px solid #ccc;vertical-align:top;}' +
    'td:first-child{font-weight:bold;background:#f5f5f5;width:32%;}' +
    '.hash-label{font-weight:bold;font-size:11px;margin-bottom:3px;}' +
    '.hash-box{background:#f9f9f9;border:1px solid #ccc;border-radius:3px;padding:8px 10px;font-family:Courier New,monospace;font-size:10px;word-break:break-all;margin-bottom:10px;letter-spacing:0.5px;color:#1a1a1a;}' +
    '.verificacao{display:flex;gap:16px;align-items:flex-start;margin-bottom:10px;}' +
    '.instr{background:#e8f5e9;border-left:3px solid #2e7d32;padding:8px 12px;font-size:10px;flex:1;}' +
    '.instr ol{margin:4px 0 0 16px;padding:0;}' +
    '.instr li{margin-bottom:2px;}' +
    '.qrcode{text-align:center;min-width:90px;}' +
    '.qrcode img{width:90px;height:90px;border:1px solid #ccc;border-radius:3px;display:block;}' +
    '.qrcode p{font-size:9px;color:#666;margin:3px 0 0;}' +
    '.rodape{margin-top:12px;font-size:9px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:6px;}' +
    '</style></head><body>' +
    '<div class="header">' +
    '<div><div class="logo">DOCEFRUTA</div>' +
    '<div class="subtitulo">' + CONFIG.empresa + '</div></div>' +
    '<div><span class="badge">VERIFICAÇÃO SHA-256</span></div>' +
    '</div>' +
    '<h1>CERTIFICADO DE APROVAÇÃO DE REGISTRO</h1>' +
    '<div class="subdoc">Documento gerado automaticamente pelo Sistema de Monitoramento Ambiental</div>' +
    '<table>' +
    '<tr><td>Documento</td><td>' + nomeArquivo + '</td></tr>' +
    '<tr><td>Equipamento</td><td>' + cod + (localEquip ? ' — ' + localEquip : '') + '</td></tr>' +
    '<tr><td>Período monitorado</td><td>' + nomeMes + ' de ' + ano + '</td></tr>' +
    '<tr><td>Data de geração</td><td>' + dataGeracao + '</td></tr>' +
    '<tr><td>Responsável</td><td>' + CONFIG.responsavelNome + '</td></tr>' +
    '<tr><td>Cargo</td><td>' + CONFIG.responsavelCargo + '</td></tr>' +
    '<tr><td>E-mail</td><td>' + CONFIG.responsavelEmail + '</td></tr>' +
    '<tr><td>Tamanho do arquivo</td><td>' + tamanho + ' bytes</td></tr>' +
    '</table>' +
    '<div class="hash-label">Código de verificação SHA-256:</div>' +
    '<div class="hash-box">' + hash + '</div>' +
    '<div class="verificacao">' +
    '<div class="instr">' +
    '<strong>Como verificar a autenticidade deste documento:</strong>' +
    '<ol>' +
    '<li>Escaneie o QR Code ao lado <strong>ou</strong> acesse:<br>' +
    '<strong>https://emn178.github.io/online-tools/sha256_checksum.html</strong></li>' +
    '<li>Clique em "Choose File" e selecione o arquivo<br><strong>' + nomeArquivo + '</strong></li>' +
    '<li>Compare o código gerado com o SHA-256 acima</li>' +
    '<li>Códigos idênticos confirmam que o documento <strong>não foi alterado</strong> desde sua geração</li>' +
    '</ol>' +
    '</div>' +
    '<div class="qrcode">' +
    '<img src="' + qrUrl + '" alt="QR Code verificação">' +
    '<p>Escanear para<br>verificar</p>' +
    '</div>' +
    '</div>' +
    blocoAprovacao +
    '<div class="rodape">' +
    'Documento gerado automaticamente pelo Sistema de Monitoramento Ambiental da Docefruta. | ' +
    'FOR.IT.PS.PRO. 08-04 | Rev. 00 | ' + CONFIG.empresa +
    '</div>' +
    '</body></html>';

  var blob     = Utilities.newBlob(html, 'text/html', 'cert.html');
  var tempFile = Drive.Files.insert(
    { title: 'cert_temp_' + cod + '_' + new Date().getTime(),
      mimeType: 'application/vnd.google-apps.document' },
    blob
  );
  var pdfBlob = DriveApp.getFileById(tempFile.id).getAs('application/pdf');
  DriveApp.getFileById(tempFile.id).setTrashed(true);
  return pdfBlob;
}

}