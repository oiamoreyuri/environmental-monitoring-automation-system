// ============================================================
// Integridade.gs
// Responsabilidade: cálculo de hash SHA-256, registro e
// manutenção da aba LOG_INTEGRIDADE.
//
// DEPENDÊNCIAS EXTERNAS:
//   Utils.gs → chaveMesAno_, mesFormatado_
//
// NOTAS:
//   - Nenhuma função aqui gera ou manipula PDFs.
//   - registrarIntegridade_ é chamada por Pdf.gs após salvar
//     o arquivo no Drive.
//   - calcularHashPDF_ opera sobre o blob em memória, antes
//     do arquivo ser salvo — o hash é do conteúdo do PDF,
//     não do arquivo no Drive.
// ============================================================

// ------------------------------------------------------------
// calcularHashPDF_(blob)
// Calcula o digest SHA-256 de um blob e retorna a string
// hexadecimal de 64 caracteres.
// Operação puramente sobre bytes em memória — sem I/O.
// ------------------------------------------------------------
function calcularHashPDF_(blob) {
  var bytes  = blob.getBytes();
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, bytes
  );
  return digest.map(function(b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

// ------------------------------------------------------------
// registrarIntegridade_(ss, nomeArquivo, mes, ano, cod,
//                       blob, fileId)
// Grava uma linha na LOG_INTEGRIDADE com os metadados do PDF
// gerado. Calcula o hash internamente a partir do blob.
// Retorna o hash calculado para uso imediato pelo chamador
// (Pdf.gs usa o hash para gerar o certificado no mesmo ciclo).
// ------------------------------------------------------------
function registrarIntegridade_(ss, nomeArquivo, mes, ano, cod, blob, fileId) {
  var aba          = garantirAbaIntegridade_(ss);
  var hash         = calcularHashPDF_(blob);
  var chave        = chaveMesAno_(mes, ano);

  aba.appendRow([
    new Date(),               // TIMESTAMP_GERACAO
    nomeArquivo,              // NOME_ARQUIVO
    chave,                    // MES_ANO  (ex: "05/2026")
    cod,                      // EQUIPAMENTO
    hash,                     // HASH_SHA256
    blob.getBytes().length,   // TAMANHO_BYTES
    CONFIG.responsavelEmail,  // GERADO_POR
    fileId                    // ID_DRIVE
    // APROVADO e DATA_APROVACAO ficam vazios — preenchidos
    // por processarAprovacao_ em Certificado.gs
  ]);

  return hash;
}

// ------------------------------------------------------------
// garantirAbaIntegridade_(ss)
// Retorna a aba LOG_INTEGRIDADE, criando-a com cabeçalho,
// formatação e larguras de coluna padrão caso não exista.
// ------------------------------------------------------------
function garantirAbaIntegridade_(ss) {
  var aba = ss.getSheetByName(ABA_LOG_INTEGRIDADE);
  if (!aba) {
    aba = ss.insertSheet(ABA_LOG_INTEGRIDADE);
    aba.appendRow([
      "TIMESTAMP_GERACAO", "NOME_ARQUIVO", "MES_ANO",
      "EQUIPAMENTO",       "HASH_SHA256",  "TAMANHO_BYTES",
      "GERADO_POR",        "ID_DRIVE",     "APROVADO",
      "DATA_APROVACAO"
    ]);
    aba.getRange(1, 1, 1, 10).setFontWeight("bold");
    aba.setFrozenRows(1);
    aba.setColumnWidth(1, 160);
    aba.setColumnWidth(2, 220);
    aba.setColumnWidth(5, 280);
    aba.setColumnWidth(8, 200);
    aba.setColumnWidth(10, 160);
    Logger.log("ℹ️ Aba LOG_INTEGRIDADE criada.");
  }
  return aba;
}

// ------------------------------------------------------------
// atualizarCabecalhoLog()
// Utilitário de manutenção: garante que as colunas APROVADO
// e DATA_APROVACAO existam no cabeçalho da LOG_INTEGRIDADE.
// Use apenas em planilhas criadas antes da adição dessas
// colunas — não é necessário em instalações novas.
// ------------------------------------------------------------
function atualizarCabecalhoLog() {
  var ss  = SpreadsheetApp.openById(CONFIG.planilhaId);
  var aba = ss.getSheetByName(ABA_LOG_INTEGRIDADE);
  if (!aba) {
    Logger.log("⚠️ Aba LOG_INTEGRIDADE não encontrada.");
    return;
  }
  var header = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  if (header.indexOf("APROVADO") === -1) {
    aba.getRange(1, 9).setValue("APROVADO");
    aba.getRange(1, 10).setValue("DATA_APROVACAO");
    aba.getRange(1, 9, 1, 2).setFontWeight("bold");
    aba.setColumnWidth(10, 160);
    Logger.log("✅ Colunas APROVADO e DATA_APROVACAO adicionadas.");
  } else {
    Logger.log("ℹ️ Cabeçalho já atualizado — nenhuma ação necessária.");
  }
}