# Refatoração v2 — Compartimentalização do código

## Escopo geral

O `codigo.gs` original (~700 linhas, arquivo único) foi compartimentalizado em 10 arquivos com responsabilidades isoladas. Nenhuma funcionalidade foi removida. Bugs foram corrigidos, dependências foram documentadas e código duplicado foi eliminado.

---

## Arquivos gerados

| Arquivo | Responsabilidade |
|---|---|
| `Config.gs` | Constantes, PropertiesService, inicialização de CONFIG |
| `WebApp.gs` | Roteamento HTTP (doGet/doPost), zero lógica de negócio |
| `QrCode.gs` | Fluxo de leitura do QR Code e páginas HTML relacionadas |
| `Forms.gs` | Recebimento e normalização de respostas do Forms, RAW_DATA |
| `Pdf.gs` | Geração de PDFs mensais, organização no Drive, trigger de último dia útil |
| `Utils.gs` | Funções utilitárias puras compartilhadas entre módulos |
| `Certificado.gs` | Certificado de aprovação, fluxo PCQI, páginas de verificação e aprovação |
| `Integridade.gs` | Hash SHA-256 e LOG_INTEGRIDADE |
| `Notificacoes.gs` | Alertas de completude e notificação de PDFs prontos |
| `Triggers.gs` | Criação e remoção de triggers automáticos |
| `Dev.gs` | Funções de teste e diagnóstico, sem impacto em produção |

---

## Bugs corrigidos

**`CONFIG` nunca era inicializado como variável global.**
O código original definia `getConfig()` mas nunca atribuía o retorno a `CONFIG`. Todas as chamadas `CONFIG.planilhaId`, `CONFIG.formUrl` etc. dependiam de uma variável inexistente no escopo global. Corrigido em `Config.gs` com `var CONFIG = getConfig()`.

**`gerarPdfCertificado_` aninhada dentro de `processarAprovacao_`.**
A função estava definida dentro do bloco `try/catch` de `processarAprovacao_`, tornando-a inacessível como função global. `gerarPDFsMensais` a chamava diretamente como se fosse global, o que funcionava por hoisting acidental do V8 mas era um bug latente. Corrigida em `Certificado.gs` como função global explícita.

**`notificarAprovacao_` duplicada.**
Havia duas definições: uma aninhada dentro de `gerarPDFsMensais` (nunca chamada) e uma no escopo global. A versão aninhada foi removida. Mantida apenas a versão global em `Notificacoes.gs`.

---

## Melhorias técnicas

**Leitura dupla de bytes em cálculo de hash eliminada.**
O original chamava `blob.getBytes()` duas vezes: uma dentro de `calcularHashPDF_` e outra para gravar `TAMANHO_BYTES`. Corrigido em `Integridade.gs`: bytes lidos uma única vez em `registrarIntegridade_` e reutilizados para hash e tamanho. `calcularHashPDF_` renomeada para `calcularHash_` e desacoplada do tipo Blob, recebendo bytes puros.

**Fonte de dados de `verificarCompletude_` migrada para RAW_DATA.**
O original lia "Respostas ao formulário 1" para checar registros do dia, quebrando a consistência com o resto do sistema que usa RAW_DATA como fonte canônica. Corrigido em `Notificacoes.gs`.

**`normalizarData_` extraída como função própria.**
No original, a lógica de conversão `yyyy-MM-dd → dd/MM/yyyy` estava inline dentro de `onFormSubmit` e duplicada em `corrigirRawDataCompleto`. Centralizada em `Utils.gs`.

**`buscarLocalEquipamento_` extraída como função auxiliar.**
O bloco de busca do local do equipamento na aba "Lista de Equips." estava duplicado em `doGetVerificacao` e `gerarPdfCertificado_`. Centralizado em `Certificado.gs`.

**`montarTabelaVerificacao_` extraída de `doGetVerificacao`.**
Reduz o tamanho da função principal e isola a construção do HTML da lógica de busca.

**`removerTriggersPorFuncao_` extraída como auxiliar privada.**
O loop de remoção de triggers estava duplicado nas três funções de configuração. Centralizado em `Triggers.gs`.

**Funções utilitárias centralizadas em `Utils.gs`.**
`formatarTs_`, `formatarData_`, `formatarHora_`, `parseDecimal_`, `normalizarDecimal_`, `normalizarNome_`, `normalizarData_`, `inferirSetor_`, `nomeMes_`, `mesFormatado_`, `nomeArquivoRelatorio_`, `nomeArquivoCertificado_`, `nomeSubpasta_` e `chaveMesAno_` saíram dos módulos onde estavam espalhadas e foram centralizadas.

**Nomes de arquivo e chaves de busca centralizados em `Utils.gs`.**
O padrão `ano + "-" + mesFormatado + "_" + cod + "_Monitoramento.pdf"` estava montado inline em três lugares diferentes. Centralizado em `nomeArquivoRelatorio_` e `nomeArquivoCertificado_`.

**`carregarFeriados_` extraída como função própria em `Pdf.gs`.**
Estava embutida dentro de `isUltimoDiaUtil_`. Extraída para reutilização futura pelo módulo de justificativas automáticas de FDS/feriado.

**`configurarTodosTriggers` adicionada em `Triggers.gs`.**
Ponto de entrada único para setup completo de ambiente, útil em deploy inicial ou reconstrução.

**`listarTriggers` e `removerTodosTriggers` adicionadas em `Triggers.gs`.**
Utilitários de diagnóstico e manutenção que não existiam no original.

**`diagnosticoSistema` adicionado em `Dev.gs`.**
Verifica estado das abas, triggers, PropertiesService e último registro RAW_DATA em uma única execução.

**`ALERTA.whatsappNumero` e `ALERTA.whatsappApiKey` movidos para PropertiesService.**
Credenciais que estavam hardcoded no código versionado. Movidas junto com `ALERTA_EMAIL` para o cofre do Apps Script.

**`COD-1043` e `COD-1049` mantidos fora de `ALERTA.equipamentosAtivos`.**
Confirmado via Drive que esses equipamentos estão inativos. Incluí-los geraria falso positivo diário nos alertas de completude.

**Rota legada de aprovação removida de `WebApp.gs`.**
A condição `params.acao || params.mes || params.ano` que redirecionava para aprovação foi removida. A rota correta é exclusivamente `?page=aprovacao`. Links antigos gerados no formato legado podem ser reativados em uma linha se necessário.

**`mergearPDFs_` marcada como legado em `Pdf.gs`.**
Não é chamada no fluxo atual. Mantida com comentário explícito para avaliação de remoção futura.

---

## Decisão técnica documentada

O Apps Script não suporta imports explícitos. Todas as funções globais são visíveis entre arquivos no mesmo projeto. Dependências entre módulos são documentadas no cabeçalho de cada arquivo (Opção B). Migração para namespace explícito por objeto (Opção A, ex: `PdfService.localizarOuCriarSubpasta`) planejada para quando o projeto entrar em fase de manutenção ou quando um segundo desenvolvedor ingressar no projeto.
