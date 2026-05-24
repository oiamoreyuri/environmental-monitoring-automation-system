// ============================================================
// Notificacoes.gs
// Responsabilidade: envio de alertas de completude de registros
// e notificação de geração de PDFs para aprovação.
//
// DEPENDÊNCIAS EXTERNAS:
//   Utils.gs   → nomeMes_
//   Config.gs  → CONFIG, ALERTA
//
// CANAIS DE SAÍDA:
//   - E-mail via GmailApp
//   - WhatsApp via CallMeBot API
//
// NOTAS:
//   - Nenhuma função aqui lê ou escreve na planilha principal.
//   - verificarCompletude_ lê apenas "Respostas ao formulário 1"
//     para checar registros do dia.
//   - Falhas de envio são logadas mas não propagadas — um erro
//     de notificação não deve interromper o fluxo principal.
// ============================================================

// ------------------------------------------------------------
// notificarAprovacao_(mes, ano, gerados, erros)
// Notifica o responsável PCQI que os PDFs mensais foram
// gerados e estão prontos para aprovação.
// Chamada por Pdf.gs ao final de gerarPDFsMensais.
// ------------------------------------------------------------
function notificarAprovacao_(mes, ano, gerados, erros) {
  var nomeMesStr   = nomeMes_(mes);
  var urlAprovacao = CONFIG.urlAprovacao + "?page=aprovacao";

  var msgTexto = "✅ Docefruta | Monitoramento Ambiental\n"
    + gerados + " relatórios de " + nomeMesStr + "/" + ano + " gerados.\n\n"
    + "Acesse para aprovação:\n" + urlAprovacao
    + (erros.length > 0 ? "\n\n⚠️ Erros: " + erros.join(", ") : "");

  var msgHtml = "<p>Olá, " + CONFIG.responsavelNome.split(" ")[0] + ".</p>"
    + "<p><strong>" + gerados + " relatórios de " + nomeMesStr + " de " + ano
    + "</strong> foram gerados e aguardam sua aprovação como PCQI.</p>"
    + "<p><a href='" + urlAprovacao + "' style='background:#2e7d32;color:white;"
    + "padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;'>"
    + "Acessar página de aprovação</a></p>"
    + (erros.length > 0
      ? "<p>⚠️ Equipamentos com erro: " + erros.join(", ") + "</p>"
      : "")
    + "<br><p><i>Sistema de Monitoramento Ambiental — Docefruta</i></p>";

  var assunto = "✅ [Monitoramento] Relatórios de "
    + nomeMesStr + "/" + ano + " prontos para aprovação";

  enviarEmail_(CONFIG.responsavelEmail, assunto, msgTexto, msgHtml);
  enviarWhatsApp_(msgTexto);
}

// ------------------------------------------------------------
// alertaTurnoManha() / alertaTurnoTarde()
// Entry points dos triggers de alerta de completude.
// Chamados às 9h e 15h por triggers configurados em Triggers.gs.
// ------------------------------------------------------------
function alertaTurnoManha() { verificarCompletude_("manhã",  0, 12); }
function alertaTurnoTarde() { verificarCompletude_("tarde", 12, 23); }

// ------------------------------------------------------------
// verificarCompletude_(turno, horaInicio, horaFim)
// Verifica se todos os equipamentos ativos têm registro
// no turno especificado para o dia atual.
// Não executa em finais de semana.
// Dispara alerta apenas se houver equipamentos sem registro.
// ------------------------------------------------------------
// ------------------------------------------------------------
// verificarCompletude_(turno, horaInicio, horaFim)
// Verifica se todos os equipamentos ativos têm registro
// na RAW_DATA dentro da janela de horário do turno para
// o dia atual.
// RAW_DATA é a fonte canônica de verdade do sistema.
// Não executa em finais de semana.
// ------------------------------------------------------------
function verificarCompletude_(turno, horaInicio, horaFim) {
  var hoje = new Date();
  if (hoje.getDay() === 0 || hoje.getDay() === 6) return;

  var ss       = SpreadsheetApp.openById(CONFIG.planilhaId);
  var abaRaw   = ss.getSheetByName(ABA_RAW);
  if (!abaRaw) {
    Logger.log("❌ RAW_DATA não encontrada — alerta cancelado.");
    return;
  }

  var dados    = abaRaw.getDataRange().getValues();
  var dataHoje = Utilities.formatDate(hoje, CONFIG.fusoHorario, "dd/MM/yyyy");

  var registrados = {};
  ALERTA.equipamentosAtivos.forEach(function(cod) {
    registrados[cod] = false;
  });

  // Colunas RAW_DATA: B=DEVICE_ID, C=DATA_MEDICAO, D=HORA_MEDICAO
  for (var i = 1; i < dados.length; i++) {
    var cod   = String(dados[i][1] || "").trim();
    var dataL = dados[i][2];
    var horaL = dados[i][3];
    if (!dataL || !cod) continue;

    var dataF = dataL instanceof Date
      ? Utilities.formatDate(dataL, CONFIG.fusoHorario, "dd/MM/yyyy")
      : String(dataL).trim();
    if (dataF !== dataHoje) continue;

    var h = 0;
    if (horaL instanceof Date)          { h = horaL.getHours(); }
    else if (typeof horaL === "string") { h = parseInt(horaL.split(":")[0]); }

    if (h >= horaInicio && h < horaFim && registrados.hasOwnProperty(cod)) {
      registrados[cod] = true;
    }
  }

  var pendentes = ALERTA.equipamentosAtivos.filter(function(cod) {
    return !registrados[cod];
  });

  if (pendentes.length === 0) {
    Logger.log("✅ Turno " + turno + " — todos os equipamentos registrados.");
    return;
  }

  var msg = "⚠️ Docefruta | Monitoramento Temperatura\n"
    + "Turno: " + turno.toUpperCase() + " | " + dataHoje + "\n\n"
    + "Equipamentos SEM registro:\n" + pendentes.join("\n") + "\n\n"
    + "Verifique e regularize o registro.";

  var assunto = "⚠️ [Monitoramento] Registros pendentes — turno "
    + turno + " | " + dataHoje;

  var corpo = "<p>Olá,</p>"
    + "<p>Os seguintes equipamentos <strong>não possuem registro</strong>"
    + " no turno da <strong>" + turno + "</strong>"
    + " de <strong>" + dataHoje + "</strong>:</p>"
    + "<ul>" + pendentes.map(function(c) {
        return "<li>" + c + "</li>";
      }).join("") + "</ul>"
    + "<p>Por favor, verifique e regularize o registro.</p>"
    + "<br><p><i>Monitoramento Ambiental — Docefruta</i></p>";

  enviarEmail_(ALERTA.emailDestino, assunto, msg, corpo);
  enviarWhatsApp_(msg);
  Logger.log("⚠️ Alerta enviado — turno " + turno
    + " — pendentes: " + pendentes.join(", "));
}

// ------------------------------------------------------------
// enviarEmail_(destinatario, assunto, textoPlano, htmlBody)
// Envia e-mail via GmailApp.
// Falhas são logadas sem propagar exceção.
// ------------------------------------------------------------
function enviarEmail_(destinatario, assunto, textoPlano, htmlBody) {
  try {
    GmailApp.sendEmail(destinatario, assunto, textoPlano, { htmlBody: htmlBody });
    Logger.log("✅ E-mail enviado para " + destinatario);
  } catch (err) {
    Logger.log("❌ Erro e-mail: " + err.message);
  }
}

// ------------------------------------------------------------
// enviarWhatsApp_(mensagem)
// Envia mensagem via CallMeBot API.
// Falhas são logadas sem propagar exceção.
// ------------------------------------------------------------
function enviarWhatsApp_(mensagem) {
  try {
    var url = "https://api.callmebot.com/whatsapp.php"
      + "?phone="  + ALERTA.whatsappNumero
      + "&text="   + encodeURIComponent(mensagem)
      + "&apikey=" + ALERTA.whatsappApiKey;
    UrlFetchApp.fetch(url);
    Logger.log("✅ WhatsApp enviado.");
  } catch (err) {
    Logger.log("❌ Erro WhatsApp: " + err.message);
  }
}