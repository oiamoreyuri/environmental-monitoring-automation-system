// ============================================================
// Certificado.gs
// Responsabilidade: geração do PDF de certificado de aprovação,
// fluxo de aprovação PCQI e páginas HTML relacionadas.
//
// REGRAS:
//   - processarAprovacao_ é a função central deste módulo.
//   - gerarPdfCertificado_ é global (corrige bug do original
//     onde estava aninhada dentro de processarAprovacao_).
//   - doGetVerificacao e doGetAprovacao são chamadas por
//     WebApp.gs — não chamá-las diretamente.
// ============================================================

// ------------------------------------------------------------
// doGetVerificacao(e)
// Renderiza a página de verificação de autenticidade SHA-256.
// Recebe: ?page=verify&hash=HASH&cod=COD&mes=MM&ano=AAAA
// ------------------------------------------------------------
function doGetVerificacao(e) {
  var params       = e ? e.parameter : {};
  var hash         = params.hash || "";
  var cod          = params.cod  || "";
  var mes          = parseInt(params.mes) || 0;
  var ano          = parseInt(params.ano) || 0;

  if (!hash || !cod || !mes || !ano) {
    return HtmlService.createHtmlOutput(
      "<h2 style='color:red'>QR Code inválido</h2>" +
      "<p>Parâmetros de verificação ausentes.</p>"
    ).setTitle("Verificação — Docefruta");
  }

  var mf       = mesFormatado_(mes);
  var nomeMes  = nomeMes_(mes);
  var ss       = SpreadsheetApp.openById(CONFIG.planilhaId);
  var abaLog   = ss.getSheetByName(ABA_LOG_INTEGRIDADE);
  var logDados = abaLog.getDataRange().getValues();
  var registro = null;
  var chave    = chaveMesAno_(mes, ano);

  // Busca o registro na LOG_INTEGRIDADE pelo hash, cod e mês/ano.
  for (var i = 1; i < logDados.length; i++) {
    var mesAnoCell = logDados[i][2];
    var mesAnoStr  = (mesAnoCell instanceof Date)
      ? Utilities.formatDate(mesAnoCell, CONFIG.fusoHorario, "MM/yyyy")
      : String(mesAnoCell).trim();
    if (logDados[i][4] === hash &&
        String(logDados[i][3]).trim() === cod &&
        mesAnoStr === chave) {
      registro = logDados[i];
      break;
    }
  }

  // Busca o local do equipamento na aba de cadastro.
  var localEquip = buscarLocalEquipamento_(ss, cod);

  var autentico  = registro !== null;
  var aprovado   = autentico && registro[8] === true;
  var corStatus  = autentico ? "#2e7d32" : "#c62828";
  var iconStatus = autentico ? "✅" : "❌";
  var txtStatus  = autentico ? "DOCUMENTO AUTÊNTICO" : "DOCUMENTO NÃO VERIFICADO";

  var blocoRegistro = autentico
    ? montarTabelaVerificacao_(registro, cod, localEquip, hash, aprovado, nomeMes, ano)
    : "<p style='color:#555;margin-top:16px;'>O hash informado não foi encontrado nos " +
      "registros do sistema. O documento pode ter sido adulterado ou o QR Code é inválido.</p>";

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

// ------------------------------------------------------------
// doGetAprovacao(e)
// Roteador da página de aprovação PCQI.
// Ação "aprovar": processa aprovação e exibe confirmação.
// Sem ação: exibe lista de relatórios pendentes/aprovados.
// ------------------------------------------------------------
function doGetAprovacao(e) {
  try {
    var params = e ? e.parameter : {};
    var acao   = params.acao || "";
    var cod    = params.cod  || "";
    var mes    = parseInt(params.mes) || 0;
    var ano    = parseInt(params.ano) || 0;

    if (acao === "aprovar" && cod && mes && ano) {
      var resultado = processarAprovacao_(cod, mes, ano);
      return HtmlService.createHtmlOutput(
        paginaConfirmacaoAprovacao_(cod, mes, ano, resultado)
      ).setTitle("Aprovação — " + cod);
    }

    return paginaListaAprovacao_(mes, ano);

  } catch (err) {
    return HtmlService.createHtmlOutput(
      "<h2 style='color:red'>Erro</h2><pre>" + err.toString() + "\n\n" + err.stack + "</pre>"
    );
  }
}

// ------------------------------------------------------------
// processarAprovacao_(cod, mes, ano)
// Localiza o registro na LOG_INTEGRIDADE, regenera o
// certificado com bloco de aprovação preenchido, substitui
// o arquivo no Drive e atualiza APROVADO e DATA_APROVACAO.
// Retorna true em caso de sucesso, false em caso de erro.
// ------------------------------------------------------------
function processarAprovacao_(cod, mes, ano) {
  try {
    mes = parseInt(mes);
    ano = parseInt(ano);

    var nomeArquivo   = nomeArquivoRelatorio_(mes, ano, cod);
    var nomeCert      = nomeArquivoCertificado_(mes, ano, cod);
    var dataAprovacao = Utilities.formatDate(
      new Date(), CONFIG.fusoHorario, "dd/MM/yyyy 'às' HH:mm:ss"
    );
    var chave = chaveMesAno_(mes, ano);

    var ss       = SpreadsheetApp.openById(CONFIG.planilhaId);
    var abaLog   = ss.getSheetByName(ABA_LOG_INTEGRIDADE);
    var logDados = abaLog.getDataRange().getValues();

    // Localiza a linha mais recente do equipamento no período.
    var linhaLog = -1;
    var hash = "", tamanho = 0;
    for (var i = 1; i < logDados.length; i++) {
      var mesAnoCell = logDados[i][2];
      var mesAnoStr  = (mesAnoCell instanceof Date)
        ? Utilities.formatDate(mesAnoCell, CONFIG.fusoHorario, "MM/yyyy")
        : String(mesAnoCell).trim();
      if (String(logDados[i][3]).trim() === cod && mesAnoStr === chave) {
        hash     = logDados[i][4];
        tamanho  = logDados[i][5];
        linhaLog = i + 1;
      }
    }

    if (linhaLog < 0) {
      throw new Error("Registro não encontrado para " + cod + " | " + chave);
    }

    // Regenera e substitui o certificado com bloco de aprovação.
    var pdfCert = gerarPdfCertificado_(
      nomeArquivo, hash, mes, ano, cod, tamanho, true, dataAprovacao
    );
    pdfCert.setName(nomeCert);

    var pasta      = localizarOuCriarSubpasta_(mes, ano);
    var existentes = pasta.getFilesByName(nomeCert);
    while (existentes.hasNext()) existentes.next().setTrashed(true);
    pasta.createFile(pdfCert);

    // Atualiza colunas APROVADO (col 9) e DATA_APROVACAO (col 10).
    abaLog.getRange(linhaLog, 9).setValue(true);
    abaLog.getRange(linhaLog, 10).setValue(dataAprovacao);

    Logger.log("✅ Aprovado: " + cod + " | " + chave);
    return true;

  } catch (err) {
    Logger.log("❌ Erro processarAprovacao_: " + err.message);
    return false;
  }
}

// ------------------------------------------------------------
// aprovarRelatorio(cod, mes, ano)
// Wrapper público chamado pelo google.script.run no HTML
// da página de aprovação (aprovacao.html).
// ------------------------------------------------------------
function aprovarRelatorio(cod, mes, ano) {
  Logger.log("aprovarRelatorio: " + cod + " | " + mes + " | " + ano);
  return processarAprovacao_(cod, mes, ano);
}

// ------------------------------------------------------------
// gerarPdfCertificado_(nomeArquivo, hash, mes, ano, cod,
//                      tamanho, aprovado, dataAprovacao)
// Gera o blob do PDF do certificado de aprovação de registro.
// Quando aprovado=true, inclui bloco com assinatura e data.
// Usa Drive.Files.insert para conversão HTML → PDF via API.
// ------------------------------------------------------------
function gerarPdfCertificado_(nomeArquivo, hash, mes, ano, cod, tamanho, aprovado, dataAprovacao) {
  var ss         = SpreadsheetApp.openById(CONFIG.planilhaId);
  var localEquip = buscarLocalEquipamento_(ss, cod);
  var nomeMesStr = nomeMes_(mes);
  var dataGeracao = Utilities.formatDate(
    new Date(), CONFIG.fusoHorario, "dd/MM/yyyy 'às' HH:mm:ss"
  );

  // QR Code aponta para a página de verificação do certificado.
  var urlVerificacao = CONFIG.urlAprovacao
    + "?page=verify&hash=" + hash
    + "&cod=" + cod
    + "&mes=" + mes
    + "&ano=" + ano;
  var qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=90x90&data="
    + encodeURIComponent(urlVerificacao);

  // Carrega assinatura do Drive em base64.
  var assinaturaBase64 = "";
  try {
    var assinaturaBlob = DriveApp.getFileById(CONFIG.assinaturaId).getBlob();
    assinaturaBase64   = Utilities.base64Encode(assinaturaBlob.getBytes());
  } catch (err) {
    Logger.log("⚠️ Assinatura não carregada: " + err.message);
  }

  // Bloco de aprovação: preenchido ou pendente.
  var blocoAprovacao = aprovado
    ? '<div style="border-top:1px solid #ccc;margin-top:12px;padding-top:10px;">' +
      '<div style="font-weight:bold;font-size:11px;margin-bottom:6px;color:#2e7d32;">' +
      '✔ DOCUMENTO APROVADO PELO RESPONSÁVEL PELA QUALIDADE</div>' +
      '<table style="width:100%;border-collapse:collapse;">' +
      '<tr><td style="padding:5px 10px;border:1px solid #ccc;font-weight:bold;background:#f5f5f5;width:32%;">Aprovado por</td>' +
      '<td style="padding:5px 10px;border:1px solid #ccc;">' + CONFIG.responsavelNome + ' — ' + CONFIG.responsavelCargo + '</td></tr>' +
      '<tr><td style="padding:5px 10px;border:1px solid #ccc;font-weight:bold;background:#f5f5f5;">Data/hora aprovação</td>' +
      '<td style="padding:5px 10px;border:1px solid #ccc;">' + dataAprovacao + '</td></tr>' +
      '</table>' +
      (assinaturaBase64
        ? '<div style="margin-top:8px;"><img src="data:image/jpeg;base64,' + assinaturaBase64 +
          '" style="height:40px;" alt="Assinatura"></div>'
        : '') +
      '</div>'
    : '<div style="border-top:1px solid #ccc;margin-top:12px;padding-top:10px;' +
      'background:#fff8e1;padding:8px 12px;font-size:10px;color:#888;">' +
      '⏳ Aguardando aprovação pelo Responsável pela Qualidade.</div>';

  var html =
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
    '@page{size:A4;margin:15mm;}' +
    'body{font-family:Arial,sans-serif;color:#222;font-size:11px;line-height:1.4;margin:0;}' +
    '.header{border-bottom:2px solid #2e7d32;padding-bottom:6px;margin-bottom:10px;' +
    '        display:flex;justify-content:space-between;align-items:flex-end;}' +
    '.logo{font-size:18px;font-weight:bold;color:#2e7d32;letter-spacing:2px;}' +
    '.subtitulo{font-size:10px;color:#666;margin-top:1px;}' +
    '.badge{display:inline-block;background:#2e7d32;color:white;font-size:9px;' +
    '       padding:2px 8px;border-radius:3px;letter-spacing:1px;}' +
    'h1{font-size:13px;text-align:center;color:#2e7d32;margin:8px 0 2px;}' +
    '.subdoc{text-align:center;font-size:10px;color:#666;margin-bottom:10px;font-style:italic;}' +
    'table{width:100%;border-collapse:collapse;margin-bottom:10px;}' +
    'td{padding:5px 10px;border:1px solid #ccc;vertical-align:top;}' +
    'td:first-child{font-weight:bold;background:#f5f5f5;width:32%;}' +
    '.hash-label{font-weight:bold;font-size:11px;margin-bottom:3px;}' +
    '.hash-box{background:#f9f9f9;border:1px solid #ccc;border-radius:3px;padding:8px 10px;' +
    '          font-family:Courier New,monospace;font-size:10px;word-break:break-all;' +
    '          margin-bottom:10px;letter-spacing:0.5px;color:#1a1a1a;}' +
    '.verificacao{display:flex;gap:16px;align-items:flex-start;margin-bottom:10px;}' +
    '.instr{background:#e8f5e9;border-left:3px solid #2e7d32;padding:8px 12px;font-size:10px;flex:1;}' +
    '.instr ol{margin:4px 0 0 16px;padding:0;}' +
    '.instr li{margin-bottom:2px;}' +
    '.qrcode{text-align:center;min-width:90px;}' +
    '.qrcode img{width:90px;height:90px;border:1px solid #ccc;border-radius:3px;display:block;}' +
    '.qrcode p{font-size:9px;color:#666;margin:3px 0 0;}' +
    '.rodape{margin-top:12px;font-size:9px;color:#999;text-align:center;' +
    '        border-top:1px solid #eee;padding-top:6px;}' +
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
    '<tr><td>Período monitorado</td><td>' + nomeMesStr + ' de ' + ano + '</td></tr>' +
    '<tr><td>Data de geração</td><td>' + dataGeracao + '</td></tr>' +
    '<tr><td>Responsável</td><td>' + CONFIG.responsavelNome + '</td></tr>' +
    '<tr><td>Cargo</td><td>' + CONFIG.responsavelCargo + '</td></tr>' +
    '<tr><td>E-mail</td><td>' + CONFIG.responsavelEmail + '</td></tr>' +
    '<tr><td>Tamanho do arquivo</td><td>' + tamanho + ' bytes</td></tr>' +
    '</table>' +
    '<div class="hash-label">Código de verificação SHA-256:</div>' +
    '<div class="hash-box">' + hash + '</div>' +
    '<div class="verificacao">' +
    '<div class="instr"><strong>Como verificar a autenticidade deste documento:</strong>' +
    '<ol>' +
    '<li>Escaneie o QR Code ao lado <strong>ou</strong> acesse:<br>' +
    '<strong>https://emn178.github.io/online-tools/sha256_checksum.html</strong></li>' +
    '<li>Clique em "Choose File" e selecione o arquivo<br><strong>' + nomeArquivo + '</strong></li>' +
    '<li>Compare o código gerado com o SHA-256 acima</li>' +
    '<li>Códigos idênticos confirmam que o documento <strong>não foi alterado</strong> desde sua geração</li>' +
    '</ol></div>' +
    '<div class="qrcode"><img src="' + qrUrl + '" alt="QR Code verificação">' +
    '<p>Escanear para<br>verificar</p></div>' +
    '</div>' +
    blocoAprovacao +
    '<div class="rodape">Documento gerado automaticamente pelo Sistema de Monitoramento Ambiental da Docefruta. | ' +
    'FOR.IT.PS.PRO. 08-04 | Rev. 00 | ' + CONFIG.empresa + '</div>' +
    '</body></html>';

  // Conversão HTML → PDF via API avançada do Drive.
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

// ------------------------------------------------------------
// paginaListaAprovacao_(mes, ano)
// Renderiza a lista de relatórios do mês com status de
// aprovação e botões de ação. Usa o template aprovacao.html.
// ------------------------------------------------------------
function paginaListaAprovacao_(mes, ano) {
  var ss     = SpreadsheetApp.openById(CONFIG.planilhaId);
  var abaRel = ss.getSheetByName(ABA_RELATORIO);

  if (!mes) mes = abaRel.getRange(CELULA_MES).getValue();
  if (!ano) ano = abaRel.getRange(CELULA_ANO).getValue();

  var mf      = mesFormatado_(mes);
  var nomeMes = nomeMes_(mes);
  var chave   = chaveMesAno_(mes, ano);

  // Lê status de aprovação da LOG_INTEGRIDADE.
  var aprovados = {};
  var abaLog    = ss.getSheetByName(ABA_LOG_INTEGRIDADE);
  if (abaLog) {
    var logDados = abaLog.getDataRange().getValues();
    for (var i = 1; i < logDados.length; i++) {
      var mesAnoCell = logDados[i][2];
      var mesAnoStr  = (mesAnoCell instanceof Date)
        ? Utilities.formatDate(mesAnoCell, CONFIG.fusoHorario, "MM/yyyy")
        : String(mesAnoCell).trim();
      if (mesAnoStr === chave) {
        aprovados[logDados[i][3]] = {
          aprovado:      logDados[i][8] === true,
          dataAprovacao: logDados[i][9] || ""
        };
      }
    }
  }

  // Lê URLs dos PDFs de relatório na subpasta do mês.
  var urlsRelatorios = {};
  try {
    var pasta    = localizarOuCriarSubpasta_(mes, ano);
    var arquivos = pasta.getFiles();
    while (arquivos.hasNext()) {
      var arq  = arquivos.next();
      var nome = arq.getName();
      if (nome.indexOf("_Monitoramento.pdf") !== -1) {
        var cod = nome.replace(ano + "-" + mf + "_", "").replace("_Monitoramento.pdf", "");
        urlsRelatorios[cod] = arq.getUrl();
      }
    }
  } catch (err) {
    Logger.log("⚠️ Erro ao listar PDFs: " + err.message);
  }

  // Lê locais dos equipamentos.
  var locais   = {};
  var abaEquip = ss.getSheetByName("Lista de Equips.");
  if (abaEquip) {
    var equips = abaEquip.getDataRange().getValues();
    for (var j = 1; j < equips.length; j++) locais[equips[j][0]] = equips[j][1] || "";
  }

  // Monta linhas HTML da tabela.
  var linhas = "";
  for (var k = 0; k < EQUIPAMENTOS_PDF.length; k++) {
    var c      = EQUIPAMENTOS_PDF[k];
    var status = aprovados[c] || { aprovado: false, dataAprovacao: "" };
    var urlRel = urlsRelatorios[c] || "";
    linhas +=
      '<tr>' +
      '<td>' + c + '</td>' +
      '<td>' + (locais[c] || "") + '</td>' +
      '<td>' + (urlRel
        ? '<a href="' + urlRel + '" target="_blank">📄 Abrir PDF</a>'
        : '<span style="color:#aaa;">—</span>') + '</td>' +
      '<td>' + (status.aprovado
        ? '<span style="color:#2e7d32;font-weight:bold;">✔ Aprovado</span>' +
          '<br><small>' + status.dataAprovacao + '</small>'
        : '<span style="color:#e65100;">⏳ Pendente</span>') + '</td>' +
      '<td>' + (status.aprovado
        ? '<span style="color:#aaa;font-size:11px;">—</span>'
        : '<button class="btn" onclick="aprovar(\'' + c + '\',' + mes + ',' + ano + ',this)">Aprovar</button>') +
      '</td></tr>';
  }

  var t     = HtmlService.createTemplateFromFile('aprovacao');
  t.nomeMes = nomeMes;
  t.ano     = ano;
  t.linhas  = linhas;
  t.empresa = CONFIG.empresa;
  return t.evaluate()
    .setTitle("Aprovação de Relatórios")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ------------------------------------------------------------
// paginaConfirmacaoAprovacao_(cod, mes, ano, sucesso)
// Página exibida após tentativa de aprovação individual.
// ------------------------------------------------------------
function paginaConfirmacaoAprovacao_(cod, mes, ano, sucesso) {
  var nomeMes  = nomeMes_(mes);
  var urlLista = ScriptApp.getService().getUrl() + '?mes=' + mes + '&ano=' + ano;
  return '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;' +
    'align-items:center;min-height:100vh;margin:0;background:#f0f2f5;}' +
    '.card{background:white;border-radius:12px;padding:32px 24px;max-width:400px;' +
    'width:90%;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.15);}' +
    'h2{color:#2e7d32;font-size:16px;}' +
    'a{display:inline-block;margin-top:16px;padding:10px 24px;background:#2e7d32;' +
    'color:white;text-decoration:none;border-radius:6px;font-size:13px;}' +
    '</style></head><body><div class="card">' +
    (sucesso
      ? '<div style="font-size:40px;">✅</div><h2>Aprovado com sucesso</h2>' +
        '<p style="color:#555;font-size:12px;">' + cod + ' — ' + nomeMes + ' de ' + ano +
        '<br>Certificado atualizado com sua assinatura.</p>'
      : '<div style="font-size:40px;">⚠️</div><h2>Erro ao aprovar</h2>' +
        '<p style="color:#555;font-size:12px;">Tente novamente ou verifique o log do Apps Script.</p>') +
    '<a href="' + urlLista + '">← Voltar à lista</a>' +
    '</div></body></html>';
}

// ------------------------------------------------------------
// buscarLocalEquipamento_(ss, cod)
// Retorna o local (área) de um equipamento a partir do
// cadastro na aba "Lista de Equips.". Retorna "" se não encontrado.
// Função auxiliar privada deste módulo.
// ------------------------------------------------------------
function buscarLocalEquipamento_(ss, cod) {
  var abaEquip = ss.getSheetByName("Lista de Equips.");
  if (!abaEquip) return "";
  var equips = abaEquip.getDataRange().getValues();
  for (var i = 1; i < equips.length; i++) {
    if (equips[i][0] === cod) return equips[i][1] || "";
  }
  return "";
}

// ------------------------------------------------------------
// montarTabelaVerificacao_(registro, cod, localEquip, hash,
//                          aprovado, nomeMes, ano)
// Monta o HTML da tabela de detalhes exibida na página de
// verificação quando o documento é autêntico.
// Extraída de doGetVerificacao para legibilidade.
// ------------------------------------------------------------
function montarTabelaVerificacao_(registro, cod, localEquip, hash, aprovado, nomeMes, ano) {
  var tdStyle  = "padding:6px 10px;border:1px solid #ddd;";
  var thStyle  = tdStyle + "font-weight:bold;background:#f5f5f5;width:36%;";
  function linha(label, valor) {
    return '<tr><td style="' + thStyle + '">' + label + '</td>' +
           '<td style="' + tdStyle + '">' + valor + '</td></tr>';
  }
  return '<table style="width:100%;border-collapse:collapse;margin-top:16px;">' +
    linha("Arquivo", registro[1]) +
    linha("Equipamento", cod + (localEquip ? ' — ' + localEquip : '')) +
    linha("Período", nomeMes + " de " + ano) +
    linha("Data de geração",
      Utilities.formatDate(new Date(registro[0]), CONFIG.fusoHorario, "dd/MM/yyyy 'às' HH:mm:ss")) +
    linha("Gerado por", CONFIG.responsavelNome) +
    linha("Tamanho", registro[5] + " bytes") +
    linha("Hash SHA-256",
      '<span style="font-family:monospace;font-size:10px;word-break:break-all;">' + hash + '</span>') +
    linha("Aprovação PCQI", aprovado
      ? '<span style="color:#2e7d32;font-weight:bold;">✔ Aprovado</span> — ' +
        registro[9] + ' por ' + CONFIG.responsavelNome
      : '<span style="color:#e65100;">⏳ Pendente de aprovação</span>') +
    '</table>';
}

// ------------------------------------------------------------
// buscarAnosDisponiveis()
// Retorna array de anos únicos com registros na LOG_INTEGRIDADE,
// ordenados do mais recente para o mais antigo.
// Chamada pelo cliente via google.script.run para popular
// o seletor de ano na página de aprovação.
// ------------------------------------------------------------
function buscarAnosDisponiveis() {
  var ss     = SpreadsheetApp.openById(CONFIG.planilhaId);
  var abaLog = ss.getSheetByName(ABA_LOG_INTEGRIDADE);
  if (!abaLog) return [];

  var dados = abaLog.getDataRange().getValues();
  var anos  = {};

  for (var i = 1; i < dados.length; i++) {
    if (!dados[i][1]) continue;
    var mesAno = dados[i][2];
    var str = (mesAno instanceof Date)
      ? Utilities.formatDate(mesAno, CONFIG.fusoHorario, "MM/yyyy")
      : String(mesAno).trim();
    // Extrai o ano da string "MM/yyyy"
    var partes = str.split("/");
    if (partes.length === 2 && partes[1]) {
      anos[partes[1]] = true;
    }
  }

  return Object.keys(anos).map(Number).sort(function(a, b) {
    return b - a; // mais recente primeiro
  });
}

// ------------------------------------------------------------
// carregarTabelaAprovacao(mes, ano)
// Retorna o HTML da tabela de relatórios para o período
// solicitado. Chamada pelo cliente via google.script.run
// para atualizar a tabela sem recarregar a página inteira.
// ------------------------------------------------------------
function carregarTabelaAprovacao(mes, ano) {
  var ss  = SpreadsheetApp.openById(CONFIG.planilhaId);
  var mf  = mesFormatado_(mes);
  var chave = chaveMesAno_(mes, ano);

  // Lê status de aprovação da LOG_INTEGRIDADE
  var aprovados = {};
  var abaLog    = ss.getSheetByName(ABA_LOG_INTEGRIDADE);
  if (abaLog) {
    var logDados = abaLog.getDataRange().getValues();
    for (var i = 1; i < logDados.length; i++) {
      var mesAnoCell = logDados[i][2];
      var mesAnoStr  = (mesAnoCell instanceof Date)
        ? Utilities.formatDate(mesAnoCell, CONFIG.fusoHorario, "MM/yyyy")
        : String(mesAnoCell).trim();
      if (mesAnoStr === chave) {
        aprovados[logDados[i][3]] = {
          aprovado:      logDados[i][8] === true,
          dataAprovacao: logDados[i][9] || ""
        };
      }
    }
  }

  // Lê URLs dos PDFs na subpasta do mês
  var urlsRelatorios = {};
  try {
    var pasta    = localizarOuCriarSubpasta_(mes, ano);
    var arquivos = pasta.getFiles();
    while (arquivos.hasNext()) {
      var arq  = arquivos.next();
      var nome = arq.getName();
      if (nome.indexOf("_Monitoramento.pdf") !== -1) {
        var cod = nome
          .replace(ano + "-" + mf + "_", "")
          .replace("_Monitoramento.pdf", "");
        urlsRelatorios[cod] = arq.getUrl();
      }
    }
  } catch (err) {
    Logger.log("⚠️ Erro ao listar PDFs: " + err.message);
  }

  // Lê locais dos equipamentos
  var locais   = {};
  var abaEquip = ss.getSheetByName("Lista de Equips.");
  if (abaEquip) {
    var equips = abaEquip.getDataRange().getValues();
    for (var j = 1; j < equips.length; j++) {
      locais[equips[j][0]] = equips[j][1] || "";
    }
  }

  // Monta HTML da tabela
  var html = '<table>'
    + '<tr><th>Equipamento</th><th>Local</th><th>Relatório</th>'
    + '<th>Status</th><th>Ação</th></tr>';

  for (var k = 0; k < EQUIPAMENTOS_PDF.length; k++) {
    var c      = EQUIPAMENTOS_PDF[k];
    var status = aprovados[c] || { aprovado: false, dataAprovacao: "" };
    var urlRel = urlsRelatorios[c] || "";
    html +=
      '<tr>' +
      '<td>' + c + '</td>' +
      '<td>' + (locais[c] || "") + '</td>' +
      '<td>' + (urlRel
        ? '<a href="' + urlRel + '" target="_blank">📄 Abrir PDF</a>'
        : '<span style="color:#aaa;">—</span>') + '</td>' +
      '<td>' + (status.aprovado
        ? '<span style="color:#2e7d32;font-weight:bold;">✔ Aprovado</span>' +
          '<br><small>' + status.dataAprovacao + '</small>'
        : '<span style="color:#e65100;">⏳ Pendente</span>') + '</td>' +
      '<td>' + (status.aprovado
        ? '<span style="color:#aaa;font-size:11px;">—</span>'
        : '<button class="btn" onclick="aprovar(\'' + c + '\',' +
          mes + ',' + ano + ',this)">Aprovar</button>') +
      '</td></tr>';
  }

  html += '</table>';
  return html;
}