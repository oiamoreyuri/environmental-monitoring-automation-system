// ============================================================
// WebApp.gs
// Responsabilidade: roteamento de requisições HTTP (GET/POST).
//
// REGRAS:
//   - Nenhuma lógica de negócio aqui. Apenas despacho.
//   - Toda rota desconhecida retorna resposta de erro explícita.
//   - doGet e doPost são os únicos entry points do web app.
// ============================================================

// ------------------------------------------------------------
// doGet(e)
// Entry point para requisições GET. Roteia por parâmetro:
//
//   ?api=<action>        → API JSON (doGetApi_)
//   ?page=verify         → Verificação de hash (Certificado.gs)
//   ?page=aprovacao      → Painel de aprovação PCQI (Certificado.gs)
//   ?acao= | ?mes= | ?ano= → Também roteia para aprovação
//   ?id=<COD-XXXX>       → Fluxo do QR Code (QrCode.gs)
//   (sem parâmetros)     → Página de acesso direto negado
// ------------------------------------------------------------
function doGet(e) {
  var params = e ? e.parameter : {};

  // Rota da API JSON — tem prioridade sobre as demais
  if (params.api) return doGetApi_(e);

  var page = params.page || "";

  // Rota de verificação de autenticidade de documento
  if (page === "verify") return doGetVerificacao(e);

  // Rota do painel de aprovação PCQI
  if (page === "aprovacao" || params.acao || params.mes || params.ano) {
    return doGetAprovacao(e);
  }

  // Rota do QR Code — requer parâmetro ?id=
  var equipamentoId = params.id || "";
  if (!equipamentoId) {
    return HtmlService.createHtmlOutput(
      "<h2>Acesso direto não permitido</h2>" +
      "<p>Use o QR Code afixado no equipamento ou acesse " +
      "<a href='" + CONFIG.urlAprovacao + "?page=aprovacao'>a página de aprovação</a>.</p>"
    );
  }

  return rotearQrCode_(equipamentoId);
}

// ------------------------------------------------------------
// doPost(e)
// Entry point para requisições POST.
// Usado exclusivamente pela API JSON.
//
//   ?api=registrar  → Registra nova leitura via painel
//   ?api=aprovar    → Processa aprovação PCQI via painel
// ------------------------------------------------------------
function doPost(e) {
  try {
    var params = e.parameter || {};
    if (params.api === "registrar") return apiRegistrar_(e);
    if (params.api === "aprovar")   return apiAprovar_(e);
    return jsonResp_({ ok: false, erro: "api desconhecida: " + (params.api || "(vazio)") });
  } catch (err) {
    return jsonResp_({ ok: false, erro: err.message });
  }
}

// ------------------------------------------------------------
// doGetApi_(e)
// Roteador interno da API JSON.
// Cada action despacha para o handler correspondente em Api.gs.
// ------------------------------------------------------------
function doGetApi_(e) {
  try {
    var action = e.parameter.api;
    if (action === "dashboard")    return apiDashboard_();
    if (action === "equipamentos") return apiEquipamentos_();
    if (action === "registros")    return apiRegistros_();
    if (action === "integridade")  return apiIntegridade_();
    if (action === "acessos")      return apiAcessos_();
    if (action === "responsaveis") return apiResponsaveis_();
    return jsonResp_({ ok: false, erro: "api desconhecida: " + action });
  } catch (err) {
    return jsonResp_({ ok: false, erro: err.message, stack: err.stack });
  }
}