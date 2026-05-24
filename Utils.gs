// ============================================================
// Utils.gs
// Responsabilidade: funções utilitárias compartilhadas entre
// todos os módulos do sistema.
//
// REGRAS:
//   - Nenhuma função aqui acessa a planilha diretamente.
//   - Nenhuma função aqui depende de CONFIG ou de outro módulo.
//   - Funções puras: entrada → transformação → saída.
//   - Se uma função precisar de CONFIG ou Spreadsheet, ela
//     não pertence aqui.
// ============================================================

// ------------------------------------------------------------
// nomeMes_(mes)
// Retorna o nome do mês em português para um inteiro 1-12.
// Usada em Pdf.gs, Certificado.gs, Notificacoes.gs e Api.gs.
// ------------------------------------------------------------
function nomeMes_(mes) {
  return [
    "Janeiro", "Fevereiro", "Março",    "Abril",
    "Maio",    "Junho",     "Julho",    "Agosto",
    "Setembro","Outubro",   "Novembro", "Dezembro"
  ][mes - 1];
}

// ------------------------------------------------------------
// mesFormatado_(mes)
// Retorna o mês com zero à esquerda para uso em nomes de
// arquivo e chaves de busca. Ex: 5 → "05", 12 → "12".
// ------------------------------------------------------------
function mesFormatado_(mes) {
  return mes < 10 ? "0" + mes : String(mes);
}

// ------------------------------------------------------------
// nomeArquivoRelatorio_(mes, ano, cod)
// Retorna o nome canônico do PDF de relatório mensal.
// Centralizado aqui para garantir consistência entre geração,
// busca e verificação de integridade.
// Ex: "2026-05_COD-1040_Monitoramento.pdf"
// ------------------------------------------------------------
function nomeArquivoRelatorio_(mes, ano, cod) {
  return ano + "-" + mesFormatado_(mes) + "_" + cod + "_Monitoramento.pdf";
}

// ------------------------------------------------------------
// nomeArquivoCertificado_(mes, ano, cod)
// Retorna o nome canônico do PDF de certificado de aprovação.
// Ex: "2026-05_COD-1040_Certificado_de_Aprovacao.pdf"
// ------------------------------------------------------------
function nomeArquivoCertificado_(mes, ano, cod) {
  return ano + "-" + mesFormatado_(mes) + "_" + cod + "_Certificado_de_Aprovacao.pdf";
}

// ------------------------------------------------------------
// nomeSubpasta_(mes, ano)
// Retorna o nome canônico da subpasta mensal no Drive.
// Ex: "2026-05 — Maio"
// ------------------------------------------------------------
function nomeSubpasta_(mes, ano) {
  return ano + "-" + mesFormatado_(mes) + " \u2014 " + nomeMes_(mes);
}

// ------------------------------------------------------------
// chavesMesAno_(mes, ano)
// Retorna a string de chave usada na LOG_INTEGRIDADE.
// Ex: mes=5, ano=2026 → "05/2026"
// ------------------------------------------------------------
function chaveMesAno_(mes, ano) {
  return mesFormatado_(mes) + "/" + ano;
}

// ------------------------------------------------------------
// formatarTs_(v)
// Formata um valor Date ou string como timestamp legível.
// Padrão: "dd/MM/yyyy HH:mm:ss"
// Usada pela API JSON (Api.gs).
// ------------------------------------------------------------
function formatarTs_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, CONFIG.fusoHorario, "dd/MM/yyyy HH:mm:ss");
  }
  return String(v || "");
}

// ------------------------------------------------------------
// formatarData_(v)
// Normaliza um valor Date ou string para "dd/MM/yyyy".
// Converte yyyy-MM-dd → dd/MM/yyyy se necessário.
// Usada pela API JSON (Api.gs).
// ------------------------------------------------------------
function formatarData_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, CONFIG.fusoHorario, "dd/MM/yyyy");
  }
  var s = String(v || "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    var p = s.split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }
  return s;
}

// ------------------------------------------------------------
// formatarHora_(v)
// Normaliza um valor Date ou string para "HH:mm:ss".
// Completa com ":00" se o valor tiver apenas "HH:mm".
// Usada pela API JSON (Api.gs).
// ------------------------------------------------------------
function formatarHora_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, CONFIG.fusoHorario, "HH:mm:ss");
  }
  var s = String(v || "");
  if (s.length === 5) return s + ":00";
  return s;
}

// ------------------------------------------------------------
// parseDecimal_(v)
// Converte valor numérico armazenado com vírgula ou ponto
// para float. Retorna 0 para valores vazios ou inválidos.
// Usada pela API JSON (Api.gs).
// ------------------------------------------------------------
function parseDecimal_(v) {
  if (v === "" || v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  return parseFloat(String(v).replace(",", ".")) || 0;
}

// ------------------------------------------------------------
// normalizarDecimal_(val)
// Converte separador decimal de ponto para vírgula.
// Padrão brasileiro para gravação em RAW_DATA.
// Usada por Forms.gs e Api.gs.
// ------------------------------------------------------------
function normalizarDecimal_(val) {
  if (!val) return "";
  return String(val).trim().replace(".", ",");
}

// ------------------------------------------------------------
// normalizarNome_(nome)
// Aplica mapeamento NOMES_VALIDOS para padronizar variações
// de digitação do nome do responsável.
// Usada por Forms.gs e Api.gs.
// ------------------------------------------------------------
function normalizarNome_(nome) {
  if (!nome) return "";
  var chave = nome.toString().toLowerCase().trim();
  return NOMES_VALIDOS[chave] || nome.toString().trim();
}

// ------------------------------------------------------------
// normalizarData_(valor)
// Converte data de yyyy-MM-dd para dd/MM/yyyy.
// Retorna o valor original se já estiver em outro formato.
// Usada por Forms.gs.
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
// inferirSetor_(local)
// Deriva o setor a partir do nome do local do equipamento.
// Usada por Api.gs para enriquecer o retorno de equipamentos.
// ------------------------------------------------------------
function inferirSetor_(local) {
  var l = String(local).toLowerCase();
  if (l.indexOf("mistura")   === 0) return "Mistura";
  if (l.indexOf("envase")    === 0) return "Envase";
  if (l.indexOf("armazém")   === 0 ||
      l.indexOf("armazem")   === 0) return "Armazém";
  if (l.indexOf("amostras")  === 0) return "Qualidade";
  if (l.indexOf("homogen")   === 0) return "Mistura";
  return "Outros";
}