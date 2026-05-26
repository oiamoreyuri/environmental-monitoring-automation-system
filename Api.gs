// ============================================================
// Api.gs
// Responsabilidade: endpoints da API JSON consumidos pelo
// painel gerencial externo.
//
// DEPENDÊNCIAS EXTERNAS:
//   Config.gs       → CONFIG, ALERTA, EQUIPAMENTOS_PDF,
//                     ABA_RAW, ABA_LOG_INTEGRIDADE,
//                     NOMES_VALIDOS
//   Utils.gs        → formatarTs_, formatarData_,
//                     formatarHora_, parseDecimal_,
//                     normalizarDecimal_, normalizarNome_,
//                     inferirSetor_
//   Forms.gs        → garantirAbaRaw_
//   Integridade.gs  → (nenhuma dependência direta)
//
// ROTAS GET  (?api=<action>):
//   dashboard    → todos os dados em uma chamada
//   equipamentos → cadastro de equipamentos com limites
//   registros    → conteúdo completo da RAW_DATA
//   integridade  → conteúdo do LOG_INTEGRIDADE
//   acessos      → conteúdo do LOG_ACESSO
//   responsaveis → lista de nomes canônicos
//
// ROTAS POST (?api=<action>):
//   registrar → grava nova leitura em RAW_DATA
//   aprovar   → processa aprovação PCQI
//
// NOTAS:
//   - Todas as funções retornam JSON via jsonResp_.
//   - Erros são capturados e retornados como JSON,
//     nunca propagados como exceção HTTP.
//   - A API não tem autenticação própria — depende do
//     controle de acesso do web app (executeAs/access
//     definidos em appsscript.json).
// ============================================================

// ------------------------------------------------------------
// jsonResp_(obj)
// Serializa um objeto como JSON e retorna ContentService
// com MIME type correto.
// Ponto único de saída de todos os endpoints da API.
// ------------------------------------------------------------
function jsonResp_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------
// apiDashboard_()
// Agrega todos os dados em uma única chamada para reduzir
// round-trips do painel gerencial.
// Ordem de leitura: equipamentos → registros → responsaveis
// → integridade (do mais estável ao mais volátil).
// ------------------------------------------------------------
function apiDashboard_() {
  var equipamentos = JSON.parse(apiEquipamentos_().getContent());
  var registros    = JSON.parse(apiRegistros_().getContent());
  var responsaveis = JSON.parse(apiResponsaveis_().getContent());
  var integridade  = JSON.parse(apiIntegridade_().getContent());

  return jsonResp_({
    equipamentos: equipamentos,
    registros:    registros,
    responsaveis: responsaveis,
    integridade:  integridade,
    config: {
      empresa: CONFIG.empresa,
      responsavelQualidade: {
        nome:  CONFIG.responsavelNome,
        cargo: CONFIG.responsavelCargo,
        email: CONFIG.responsavelEmail
      },
      equipamentosAtivosAlerta: ALERTA.equipamentosAtivos,
      turnos: {
        manha: { inicio: 0,  fim: 12 },
        tarde: { inicio: 12, fim: 23 }
      }
    }
  });
}

// ------------------------------------------------------------
// apiEquipamentos_()
// Retorna o cadastro completo de equipamentos com limites
// nominais de temperatura e umidade.
//
// Fonte de dados: aba SETTINGS (via carregarSettings_).
// Colunas mapeadas: CODIGO, LOCAL, EQUIPAMENTO, FABRICANTE,
// MODELO, TEMP_MIN, TEMP_MAX, UMID_MIN, UMID_MAX,
// SEM_UMIDADE, DOCUMENTO.
// ------------------------------------------------------------
function apiEquipamentos_() {
  var settings = carregarSettings_();
  var out = [];

  for (var i = 0; i < settings.length; i++) {
    var item = settings[i];
    out.push({
      codigo:      item.codigo,
      area:        item.local,
      setor:       inferirSetor_(item.local),
      equipamento: item.equipamento,
      fabricante:  item.fabricante,
      modelo:      item.modelo,
      tempMin:     item.tempMin !== null ? item.tempMin : 18,
      tempMax:     item.tempMax !== null ? item.tempMax : 28,
      umidMin:     item.umidMin !== null ? item.umidMin : 30,
      umidMax:     item.umidMax !== null ? item.umidMax : 65,
      semUmidade:  item.semUmidade,
      documento:   item.documento
    });
  }

  return jsonResp_(out);
}

// ------------------------------------------------------------
// apiRegistros_()
// Retorna o conteúdo completo da RAW_DATA normalizado.
// Decimais convertidos para float (padrão JSON).
// ------------------------------------------------------------
function apiRegistros_() {
  var ss  = SpreadsheetApp.openById(CONFIG.planilhaId);
  var aba = ss.getSheetByName(ABA_RAW);
  if (!aba) return jsonResp_([]);

  var dados = aba.getDataRange().getValues();
  var out   = [];

  for (var i = 1; i < dados.length; i++) {
    var r = dados[i];
    if (!r[1]) continue;
    out.push({
      ts:     formatarTs_(r[0]),
      codigo: String(r[1]).trim(),
      data:   formatarData_(r[2]),
      hora:   formatarHora_(r[3]),
      atual:  parseDecimal_(r[4]),
      max:    parseDecimal_(r[5]),
      min:    parseDecimal_(r[6]),
      umid:   parseDecimal_(r[7]),
      resp:   r[8] || "",
      obs:    r[9] || ""
    });
  }

  return jsonResp_(out);
}

// ------------------------------------------------------------
// apiIntegridade_()
// Retorna o conteúdo do LOG_INTEGRIDADE normalizado.
// MES_ANO convertido de Date para string "MM/yyyy" se necessário.
// ------------------------------------------------------------
function apiIntegridade_() {
  var ss  = SpreadsheetApp.openById(CONFIG.planilhaId);
  var aba = ss.getSheetByName(ABA_LOG_INTEGRIDADE);
  if (!aba) return jsonResp_([]);

  var dados = aba.getDataRange().getValues();
  var out   = [];

  for (var i = 1; i < dados.length; i++) {
    if (!dados[i][1]) continue;
    var mesAno = dados[i][2];
    if (mesAno instanceof Date) {
      mesAno = Utilities.formatDate(mesAno, CONFIG.fusoHorario, "MM/yyyy");
    }
    out.push({
      ts:            formatarTs_(dados[i][0]),
      nomeArquivo:   dados[i][1],
      mesAno:        String(mesAno).trim(),
      equipamento:   dados[i][3],
      hash:          dados[i][4],
      tamanho:       parseFloat(dados[i][5]) || 0,
      geradoPor:     dados[i][6],
      driveId:       dados[i][7],
      aprovado:      dados[i][8] === true,
      dataAprovacao: dados[i][9] || ""
    });
  }

  return jsonResp_(out);
}

// ------------------------------------------------------------
// apiAcessos_()
// Retorna o conteúdo do LOG_ACESSO (escaneamentos de QR Code).
// ------------------------------------------------------------
function apiAcessos_() {
  var ss  = SpreadsheetApp.openById(CONFIG.planilhaId);
  var aba = ss.getSheetByName(CONFIG.abaLog);
  if (!aba) return jsonResp_([]);

  var dados = aba.getDataRange().getValues();
  var out   = [];

  for (var i = 1; i < dados.length; i++) {
    if (!dados[i][1]) continue;
    out.push({
      ts:          formatarTs_(dados[i][0]),
      equipamento: dados[i][1],
      dataLeitura: formatarData_(dados[i][2]),
      horaLeitura: formatarHora_(dados[i][3]),
      status:      dados[i][4]
    });
  }

  return jsonResp_(out);
}

// ------------------------------------------------------------
// apiResponsaveis_()
// Retorna a lista ordenada de nomes canônicos de responsáveis
// extraídos de NOMES_VALIDOS (Config.gs).
// ------------------------------------------------------------
function apiResponsaveis_() {
  var nomes = {};
  for (var k in NOMES_VALIDOS) {
    if (NOMES_VALIDOS.hasOwnProperty(k)) {
      nomes[NOMES_VALIDOS[k]] = true;
    }
  }
  return jsonResp_(Object.keys(nomes).sort());
}

// ------------------------------------------------------------
// apiRegistrar_(e)
// POST ?api=registrar
// Valida os campos obrigatórios, normaliza e grava uma nova
// leitura diretamente em RAW_DATA com fonte="painel".
//
// Parâmetros obrigatórios: codigo, data, hora, atual, umid, resp
// Parâmetros opcionais:    max, min, obs
// ------------------------------------------------------------
function apiRegistrar_(e) {
  var p = e.parameter;

  if (!p.codigo || !p.data || !p.hora || !p.atual || !p.umid || !p.resp) {
    return jsonResp_({ ok: false, erro: "campos obrigatórios faltando" });
  }
  if (CONFIG.equipamentosValidos.indexOf(p.codigo) === -1) {
    return jsonResp_({ ok: false, erro: "codigo inválido: " + p.codigo });
  }

  var ss    = SpreadsheetApp.openById(CONFIG.planilhaId);
  var aba   = garantirAbaRaw_(ss);
  var agora = new Date();

  aba.appendRow([
    agora,
    String(p.codigo).trim(),
    p.data,
    p.hora.length === 5 ? p.hora : p.hora.substring(0, 5),
    normalizarDecimal_(p.atual),
    normalizarDecimal_(p.max  || p.atual),
    normalizarDecimal_(p.min  || p.atual),
    normalizarDecimal_(p.umid),
    normalizarNome_(p.resp),
    p.obs || "",
    "painel",
    new Date()
  ]);

  return jsonResp_({
    ok: true,
    ts: formatarTs_(agora)
  });
}

// ------------------------------------------------------------
// apiAprovar_(e)
// POST ?api=aprovar
// Delega para processarAprovacao_ em Certificado.gs.
//
// Parâmetros obrigatórios: codigo, mes, ano
// ------------------------------------------------------------
function apiAprovar_(e) {
  var p = e.parameter;

  if (!p.codigo || !p.mes || !p.ano) {
    return jsonResp_({ ok: false, erro: "codigo, mes e ano são obrigatórios" });
  }

  var ok = processarAprovacao_(p.codigo, p.mes, p.ano);

  return jsonResp_({
    ok:            ok,
    codigo:        p.codigo,
    dataAprovacao: formatarTs_(new Date())
  });
}