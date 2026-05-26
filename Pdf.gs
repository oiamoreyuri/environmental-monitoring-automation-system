// ============================================================
// Pdf.gs
// Responsabilidade: geração dos PDFs mensais de monitoramento,
// organização em pastas no Drive e trigger de último dia útil.
//
// REGRAS:
//   - gerarPDFsMensais é a função principal — chamada pelo
//     trigger automático ou manualmente pelo operador.
//   - Funções de pasta e exportação são privadas do módulo.
//   - mergearPDFs_ mantido por compatibilidade mas não é
//     chamado no fluxo atual. Marcado como legado.
// ============================================================

// ------------------------------------------------------------
// gerarPDFsMensais()
// Itera sobre todos os equipamentos, gera o PDF do relatório
// mensal e o certificado de integridade SHA-256 para cada um,
// salva no Drive e notifica o responsável para aprovação.
//
// Pré-condição: células I5 (mês) e I6 (ano) da aba
// "Relatório Mensal" devem estar preenchidas antes da chamada.
// Em execução via trigger, são preenchidas por verificarEGerarPDFs.
// ------------------------------------------------------------
function gerarPDFsMensais() {
  var ss  = SpreadsheetApp.openById(CONFIG.planilhaId);
  var aba = ss.getSheetByName(ABA_RELATORIO);
  var mes = aba.getRange(CELULA_MES).getValue();
  var ano = aba.getRange(CELULA_ANO).getValue();

  if (!mes || !ano) {
    Logger.log("❌ Defina o mês (I5) e o ano (I6) antes de gerar os PDFs.");
    return;
  }

  var pasta   = localizarOuCriarSubpasta_(mes, ano);
  var erros   = [];
  var gerados = 0;

  for (var i = 0; i < EQUIPAMENTOS_PDF.length; i++) {
    var cod = EQUIPAMENTOS_PDF[i];
    try {
      // Aponta o relatório para o equipamento atual e aguarda
      // recálculo das fórmulas antes de exportar.
      aba.getRange(CELULA_COD).setValue(cod);
      SpreadsheetApp.flush();
      Utilities.sleep(4000);

      var mesFormatado = mes < 10 ? "0" + mes : String(mes);
      var nomeArquivo  = ano + "-" + mesFormatado + "_" + cod + "_Monitoramento.pdf";

      // Gera o blob do PDF do relatório e calcula o hash antes
      // de salvar — o hash deve ser do arquivo final no Drive.
      var pdfRelatorio = exportarAbaPDF_(ss, aba);
      var tamanho      = pdfRelatorio.getBytes().length;

      // Substitui versão anterior se existir, salva e registra
      // o hash SHA-256 na LOG_INTEGRIDADE.
      var existentesRel = pasta.getFilesByName(nomeArquivo);
      while (existentesRel.hasNext()) existentesRel.next().setTrashed(true);
      var arquivoRel = pasta.createFile(pdfRelatorio.setName(nomeArquivo));
      var hash = registrarIntegridade_(ss, nomeArquivo, mes, ano, cod, pdfRelatorio, arquivoRel.getId());

      // Gera e salva o certificado de integridade (sem aprovação
      // ainda — aprovação ocorre via página de aprovação PCQI).
      var nomeCert     = ano + "-" + mesFormatado + "_" + cod + "_Certificado_de_Aprovacao.pdf";
      var pdfCert      = gerarPdfCertificado_(nomeArquivo, hash, mes, ano, cod, tamanho);
      var existentesCert = pasta.getFilesByName(nomeCert);
      while (existentesCert.hasNext()) existentesCert.next().setTrashed(true);
      pasta.createFile(pdfCert.setName(nomeCert));

      gerados++;
      Logger.log("✅ " + nomeArquivo + " | SHA-256: " + hash);

    } catch (err) {
      // Rate limit da API do Drive: aguarda e retenta o mesmo
      // equipamento antes de registrar como erro.
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

  // Restaura o relatório para o primeiro equipamento da lista
  // para evitar deixar a aba apontada para o último cod processado.
  aba.getRange(CELULA_COD).setValue(EQUIPAMENTOS_PDF[0]);
  Logger.log("=== RESULTADO: " + gerados + "/" + EQUIPAMENTOS_PDF.length + " PDFs gerados ===");
  if (erros.length > 0) Logger.log("Erros: " + erros.join(" | "));

  if (gerados > 0) notificarAprovacao_(mes, ano, gerados, erros);
}

// ------------------------------------------------------------
// verificarEGerarPDFs()
// Chamada diariamente pelo trigger às 18h.
// Verifica se hoje é o último dia útil do mês e, se for,
// preenche as células de mês/ano e aciona gerarPDFsMensais.
// ------------------------------------------------------------
function verificarEGerarPDFs() {
  var hoje = new Date();
  if (!isUltimoDiaUtil_(hoje)) {
    Logger.log("Hoje não é o último dia útil do mês — nenhuma ação.");
    return;
  }
  var mes = hoje.getMonth() + 1;
  var ano = hoje.getFullYear();
  var ss  = SpreadsheetApp.openById(CONFIG.planilhaId);
  var aba = ss.getSheetByName(ABA_RELATORIO);
  aba.getRange(CELULA_MES).setValue(mes);
  aba.getRange(CELULA_ANO).setValue(ano);
  SpreadsheetApp.flush();
  Logger.log("Último dia útil — gerando PDFs para " + mes + "/" + ano);
  gerarPDFsMensais();
}

// ------------------------------------------------------------
// isUltimoDiaUtil_(data)
// Retorna true se 'data' for um dia útil e o próximo dia útil
// cair em mês diferente (ou seja, é o último do mês corrente).
// Lê a aba "Feriados" para considerar feriados cadastrados.
// ------------------------------------------------------------
function isUltimoDiaUtil_(data) {
  var feriados = carregarFeriados_();
  if (!isDiaUtil_(data, feriados)) return false;
  var proximo = new Date(data);
  proximo.setDate(proximo.getDate() + 1);
  while (!isDiaUtil_(proximo, feriados)) proximo.setDate(proximo.getDate() + 1);
  return proximo.getMonth() !== data.getMonth();
}

// ------------------------------------------------------------
// isDiaUtil_(data, feriados)
// Retorna true se 'data' não for sábado, domingo nem feriado.
// 'feriados' é um array de strings no formato "AAAA-M-D".
// ------------------------------------------------------------
function isDiaUtil_(data, feriados) {
  var dia = data.getDay();
  if (dia === 0 || dia === 6) return false;
  var chave = data.getFullYear() + "-" + (data.getMonth() + 1) + "-" + data.getDate();
  return feriados.indexOf(chave) === -1;
}

// ------------------------------------------------------------
// carregarFeriados_()
// Lê a aba "Feriados" e retorna array de strings "AAAA-M-D".
// Extraído de isUltimoDiaUtil_ para reutilização futura
// (ex.: módulo de justificativas automáticas de FDS/feriado).
// ------------------------------------------------------------
function carregarFeriados_() {
  var ss     = SpreadsheetApp.openById(CONFIG.planilhaId);
  var abaFer = ss.getSheetByName("Feriados");
  var feriados = [];
  if (!abaFer) return feriados;
  var dados = abaFer.getDataRange().getValues();
  for (var i = 1; i < dados.length; i++) {
    if (dados[i][0]) {
      var d = new Date(dados[i][0]);
      feriados.push(d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate());
    }
  }
  return feriados;
}

// ------------------------------------------------------------
// exportarAbaPDF_(ss, aba)
// Exporta a aba do relatório mensal como PDF via API do Sheets.
// Preserva formatação original (tamanho A4, retrato, sem grades).
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// localizarOuCriarPasta_(nomePasta)
// Localiza uma pasta no Drive pelo nome ou a cria se não existir.
// ------------------------------------------------------------
function localizarOuCriarPasta_(nomePasta) {
  var pastas = DriveApp.getFoldersByName(nomePasta);
  if (pastas.hasNext()) return pastas.next();
  return DriveApp.createFolder(nomePasta);
}

// ------------------------------------------------------------
// localizarOuCriarSubpasta_(mes, ano)
// Localiza ou cria a subpasta mensal dentro da pasta principal
// de PDFs. Formato: "AAAA-MM — NomeMes" (ex: "2026-05 — Maio").
// ------------------------------------------------------------
function localizarOuCriarSubpasta_(mes, ano) {
  var mesFormatado   = mes < 10 ? "0" + mes : String(mes);
  var nomeMes        = nomeMes_(mes);
  var nomeSubpasta   = ano + "-" + mesFormatado + " \u2014 " + nomeMes;
  var pastaPrincipal = localizarOuCriarPasta_(PASTA_PDF_NOME);
  var subpastas      = pastaPrincipal.getFoldersByName(nomeSubpasta);
  if (subpastas.hasNext()) return subpastas.next();
  return pastaPrincipal.createFolder(nomeSubpasta);
}

// ------------------------------------------------------------
// corrigirMapeamentoColunas()
// Utilitário de manutenção: reescreve todas as fórmulas do
// Relatório Mensal apontando para RAW_DATA.
// Use apenas após alterações estruturais na planilha.
// ------------------------------------------------------------
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

  // Colunas de temperatura: D=TempAtual, E=TempMax, F=TempMin (RAW_DATA cols E,F,G)
  // Coluna de umidade: I (RAW_DATA col H) — tratada separadamente para N/A
  var colMapTemp = [[2,"D"],[3,"E"],[4,"F"],[5,"G"]];
  var colUmidade = [6,"H"]; // Coluna 6 do Relatório (G) ← RAW_DATA col H

  var refK = [
    "$K9","$K10","$K11","$K12","$K13","$K14","$K15","$K16","$K17","$K18",
    "$K19","$K20","$K21","$K22","$K23","$K24","$K25","$K26","$K27","$K28",
    "$K29","$K30","$K31","$K32","$K33","$K34","$K35","$K36","$K37","$K38",
    "$K39","$K40","$K41","$K42","$K43","$K44","$K45","$K46",
    "$K54","$K55","$K56","$K57","$K58","$K59","$K60","$K61","$K62","$K63",
    "$K64","$K65","$K66","$K67","$K68","$K69","$K70","$K71","$K72","$K73",
    "$K74","$K75","$K76","$K77"
  ];

  // Fórmula para colunas numéricas (temperatura)
  function fNumerico(colRaw, refDia, turno) {
    var crit = turno === "m"
      ? "VALUE(LEFT(RAW_DATA!D:D;2))<12"
      : "VALUE(LEFT(RAW_DATA!D:D;2))>=12";
    return "=IFERROR(ARRAY_CONSTRAIN(FILTER(RAW_DATA!" + colRaw + ":" + colRaw + ";"
      + "DAY(DATEVALUE(RAW_DATA!C:C))=VALUE(" + refDia + ");"
      + "MONTH(DATEVALUE(RAW_DATA!C:C))=$I$5;"
      + "YEAR(DATEVALUE(RAW_DATA!C:C))=$I$6;"
      + "RAW_DATA!B:B=$B$5;" + crit + ");1;1))";
  }

  // Fórmula para coluna de umidade — exibe "N/A" se SEM_UMIDADE=TRUE na SETTINGS
  function fUmidade(colRaw, refDia, turno) {
    var crit = turno === "m"
      ? "VALUE(LEFT(RAW_DATA!D:D;2))<12"
      : "VALUE(LEFT(RAW_DATA!D:D;2))>=12";
    var filtro = "IFERROR(ARRAY_CONSTRAIN(FILTER(RAW_DATA!" + colRaw + ":" + colRaw + ";"
      + "DAY(DATEVALUE(RAW_DATA!C:C))=VALUE(" + refDia + ");"
      + "MONTH(DATEVALUE(RAW_DATA!C:C))=$I$5;"
      + "YEAR(DATEVALUE(RAW_DATA!C:C))=$I$6;"
      + "RAW_DATA!B:B=$B$5;" + crit + ");1;1))";
    return "=IF(IFERROR(VLOOKUP($B$5;SETTINGS!A:E;5;FALSE);FALSE)=TRUE;\"N/A\";" + filtro + ")";
  }

  // Fórmula para coluna de observações com detecção de FDS
  function fObservacao(refDia, turno, refKCell) {
    var crit = turno === "m"
      ? "VALUE(LEFT(RAW_DATA!D:D;2))<12"
      : "VALUE(LEFT(RAW_DATA!D:D;2))>=12";
    var obs = "IFERROR(ARRAY_CONSTRAIN(FILTER(RAW_DATA!J:J;"
      + "DAY(DATEVALUE(RAW_DATA!C:C))=VALUE(" + refDia + ");"
      + "MONTH(DATEVALUE(RAW_DATA!C:C))=$I$5;"
      + "YEAR(DATEVALUE(RAW_DATA!C:C))=$I$6;"
      + "RAW_DATA!B:B=$B$5;" + crit + ");1;1);\"\")";
    return "=IF(WEEKDAY(" + refKCell + ")=1;\"DOMINGO\";"
      + "IF(WEEKDAY(" + refKCell + ")=7;\"SÁBADO\";" + obs + "))";
  }

  var count = 0;
  for (var d = 0; d < dias.length; d++) {
    var lm = dias[d][0], lt = dias[d][1], ref = dias[d][2];
    var km = refK[d * 2], kt = refK[d * 2 + 1];
    // Colunas de temperatura
    for (var c = 0; c < colMapTemp.length; c++) {
      aba.getRange(lm, colMapTemp[c][0]).setFormula(fNumerico(colMapTemp[c][1], ref, "m"));
      aba.getRange(lt, colMapTemp[c][0]).setFormula(fNumerico(colMapTemp[c][1], ref, "t"));
      count += 2;
    }
    // Coluna de umidade — com verificação N/A
    aba.getRange(lm, colUmidade[0]).setFormula(fUmidade(colUmidade[1], ref, "m"));
    aba.getRange(lt, colUmidade[0]).setFormula(fUmidade(colUmidade[1], ref, "t"));
    count += 2;
    // Coluna de observações
    aba.getRange(lm, 8).setFormula(fObservacao(ref, "m", km));
    aba.getRange(lt, 8).setFormula(fObservacao(ref, "t", kt));
    count += 2;
  }

  SpreadsheetApp.flush();
  Logger.log("✅ " + count + " fórmulas corrigidas.");
}

// ------------------------------------------------------------
// nomeMes_(mes)
// Retorna o nome do mês em português para um número 1-12.
// Função utilitária compartilhada dentro deste módulo.
// Será movida para Utils.gs quando esse módulo for criado.
// ------------------------------------------------------------
function nomeMes_(mes) {
  return ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
          "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][mes - 1];
}

// ------------------------------------------------------------
// mergearPDFs_() — LEGADO
// Função de merge de PDFs via pdf-lib. Não utilizada no fluxo
// atual de geração. Mantida por compatibilidade com possível
// uso futuro. Avaliar remoção em próxima revisão.
// ------------------------------------------------------------
function mergearPDFs_(pdf1, pdf2) {
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