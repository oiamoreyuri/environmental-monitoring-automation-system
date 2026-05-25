# Changelog — Environmental Monitoring Automation System

Este arquivo registra de forma técnica, cronológica e robusta todas as alterações de engenharia realizadas no projeto. As entradas são ordenadas da mais recente para a mais antiga.

---

## [2026-05-25 13:00] — Roteamento de Forms do Laboratório: Passo 4 (Etiquetas ZPL)

### 🎯 Objetivo da Alteração
Gerar os arquivos de programação de etiquetas Zebra (ZPL) com a formatação industrial e URLs pré-programadas para os 7 equipamentos do laboratório de microbiologia, assegurando a implantação física impecável.

### 📝 Descrição Técnica das Alterações

#### 1. Geração de Templates Zebra (`.zpl`)
*   **Arquivos Gerados**:
    *   `assets/zpl/cod-0911.zpl` | Estufa Mesófilos
    *   `assets/zpl/cod-0912.zpl` | Estufa Bolores e Leveduras
    *   `assets/zpl/cod-0913.zpl` | Estufa Entero/Staph/E.coli
    *   `assets/zpl/cod-0914.zpl` | Estufa Salmonella
    *   `assets/zpl/cod-0917.zpl` | Estufa Coliformes termotolerantes
    *   `assets/zpl/cod-1130.zpl` | Geladeira
    *   `assets/zpl/cod-1131.zpl` | Ar Ambiente
*   **Detalhamento do Layout de Emissão**:
    *   Medidas: 800px de largura por 638px de comprimento, compatíveis com rolos industriais padrão Zebra.
    *   QR Code configurado com bloco de dados `QA` apontando dinamicamente para o Web App do Apps Script (`https://script.google.com/macros/.../exec?id=COD-XXXX`).
    *   Textos de cabeçalho com nome do equipamento e rodapé com instruções de escaneamento estruturados com fontes limpas e redimensionadas para máxima nitidez de impressão.

### 🧪 Verificação e Validação
*   **Armazenamento**: Criada a pasta `assets/zpl/` local e os 7 arquivos foram comitados com sucesso no Git.

---

## [2026-05-25 12:50] — Roteamento de Forms do Laboratório: Passo 3 (QrCode.gs)

### 🎯 Objetivo da Alteração
Implementar o redirecionamento inteligente na leitura do QR Code, enviando os equipamentos do laboratório para o novo formulário sem umidade e mantendo os de produção no formulário clássico.

### 📝 Descrição Técnica das Alterações

#### 1. Roteamento Inteligente em `QrCode.gs`
*   **Arquivo Modificado**: [QrCode.gs](file:///home/yuri/Projetos/apps-script/environmental-monitoring-automation-system/QrCode.gs).
*   **Definição de EQUIPAMENTOS_LAB**:
    *   Mapeado o catálogo de códigos de laboratório no topo do módulo (`COD-0911` a `COD-1131`).
*   **Refatoração de `rotearQrCode_`**:
    *   Adicionada verificação de pertencimento ao laboratório.
    *   Em caso positivo, o script monta a URL pré-preenchida dinâmica para o Forms usando `CONFIG.formUrlLab` e o objeto de campos `CONFIG.entriesLab` (IDs do novo form).
    *   Caso contrário, utiliza as propriedades padrão de produção (`CONFIG.formUrl` e `CONFIG.entries`).
    *   Os registros de auditoria em `LOG_ACESSO` e o processamento visual da página permanecem inalterados.

### 🧪 Verificação e Validação
*   **Sync**: Sincronizado e compilado com sucesso via `clasp push`.

---

## [2026-05-25 12:45] — Roteamento de Forms do Laboratório: Passo 2 (Config.gs)

### 🎯 Objetivo da Alteração
Injetar de forma modular as novas propriedades de configuração do formulário do laboratório (`formUrlLab` e `entriesLab`) no objeto global `CONFIG` retornado por `getConfig()`.

### 📝 Descrição Técnica das Alterações

#### 1. Integração Modular em `Config.gs`
*   **Arquivo Modificado**: [Config.gs](file:///home/yuri/Projetos/apps-script/environmental-monitoring-automation-system/Config.gs).
*   **Mapeamento de Propriedades**:
    *   Acrescentados os atributos `formUrlLab` (URL pública do formulário de laboratório) e `entriesLab` (objeto aninhado contendo `id`, `data` e `hora`) extraídos do PropertiesService.
*   **Correção de Sintaxe em `Dev.gs`**:
    *   **Arquivo Modificado**: [Dev.gs](file:///home/yuri/Projetos/apps-script/environmental-monitoring-automation-system/Dev.gs).
    *   Removida com sucesso a função temporária de setup `adicionarPropriedadesLab()` e corrigida uma chave dupla residual no encerramento do arquivo para manter 100% da integridade sintática e compiladora do Apps Script.

### 🧪 Verificação e Validação
*   **Sync**: Sincronizado e validado via `clasp push`.

---

## [2026-05-25 12:40] — Roteamento de Forms do Laboratório: Passo 1 (PropertiesService)

### 🎯 Objetivo da Alteração
Configurar o ambiente no Google Cloud/Apps Script para armazenar com total segurança as chaves de configuração do novo Google Form de laboratório sem expor dados sensíveis no código de produção.

### 📝 Descrição Técnica das Alterações

#### 1. Inserção do Utilitário de Setup Temporário em `Dev.gs`
*   **Arquivo Modificado**: [Dev.gs](file:///home/yuri/Projetos/apps-script/environmental-monitoring-automation-system/Dev.gs).
*   **Criação de `adicionarPropriedadesLab()`**:
    *   Desenvolvida a função para injetar no `PropertiesService` do projeto as chaves de configuração `FORM_URL_LAB`, `ENTRY_ID_LAB`, `ENTRY_DATA_LAB` e `ENTRY_HORA_LAB` associadas ao formulário de laboratório sem higrômetro.
    *   Tratamento de erros estruturado com try-catch e logging de conformidade.

### 🧪 Verificação e Validação
*   **Sync**: Sincronizado com a nuvem do Google Apps Script com sucesso via `clasp push`.

---

## [2026-05-25 12:00] — Etapa 4: Dinamização de Documentos Regulatórios em Certificado.gs

### 🎯 Objetivo da Alteração
Garantir total rastreabilidade perante auditorias de qualidade (como a FSSC 22000) parametrizando os rodapés e metadados dos certificados digitais de conformidade emitidos, exibindo o respectivo código de documento de controle (`DOCUMENTO`) conforme configurado na aba `SETTINGS` para cada equipamento.

### 📝 Descrição Técnica das Alterações

#### 1. Integração Dinâmica em `Certificado.gs`
*   **Arquivo Modificado**: [Certificado.gs](file:///home/yuri/Projetos/apps-script/environmental-monitoring-automation-system/Certificado.gs).
*   **Mapeamento de Metadados Regulatórios**:
    *   No escopo da função principal de geração de PDF (`gerarPdfCertificado_`), passamos a carregar dinamicamente o objeto de configurações do equipamento sendo auditado através do helper `obterConfigEquipamento_(cod)`.
    *   Extraímos o valor da coluna `DOCUMENTO` correspondente.
*   **Eliminação do Rodapé Hardcoded (Zero Hardcoding)**:
    *   Substituímos o código de documento estático `'FOR.IT.PS.PRO. 08-04'` no HTML template do certificado pela variável de documento resolvida dinamicamente (`documento + ' | Rev. 00 | ' + CONFIG.empresa`).
    *   Caso ocorra falha de leitura no Sheets, o sistema adota `'FOR.IT.PS.PRO. 08-04'` como fallback de segurança, garantindo resiliência operacional contínua e sem riscos de travamento de threads.

### 🧪 Verificação e Validação
*   **Sync**: Sincronizado via `clasp push`.
*   **Diagnóstico**: Executado sem erros de escopo global ou de concorrência.

---

## [2026-05-25 11:45] — Etapa 3: Integração do Novo Formulário do Laboratório (Sem Higrômetro)

### 🎯 Objetivo da Alteração
Suportar a recepção automatizada de dados de medição térmica dos novos equipamentos do laboratório (estufas e geladeiras) que não realizam monitoramento de umidade relativa, mantendo a consolidação em uma única fonte de verdade (`RAW_DATA`).

### 📝 Descrição Técnica das Alterações

#### 1. Inteligência Adaptativa em `onFormSubmit`
*   **Arquivo Modificado**: [Forms.gs](file:///home/yuri/Projetos/apps-script/environmental-monitoring-automation-system/Forms.gs).
*   **Análise do Payload de Entrada (Dynamic Shape Detection)**:
    *   Para evitar a necessidade de gerenciar chaves rígidas de identificadores de formulário (Form IDs), o trigger agora inspeciona dinamicamente a dimensão de `e.values` (`vals.length`).
    *   Formulários contendo higrômetro enviam 10 parâmetros. Formulários simplificados (apenas temperatura) enviam 9 parâmetros.
    *   A lógica realoca automaticamente os ponteiros de arrays: caso `length === 9`, a umidade é gravada como string vazia (`""`) em `RAW_DATA` e os índices de "Responsável" e "Observações" são deslocados em 1 casa à esquerda para coincidir com a estrutura exata do novo Forms, eliminando qualquer corrupção de colunas.

#### 2. Reengenharia de Segurança em `corrigirRawDataCompleto`
*   **Arquivo Modificado**: [Forms.gs](file:///home/yuri/Projetos/apps-script/environmental-monitoring-automation-system/Forms.gs).
*   **Varredura Multi-Aba Dinâmica**:
    *   A função utilitária de manutenção foi completamente reescrita para varrer de forma automática *todas* as abas do Google Sheets que comecem com o prefixo `"Respostas ao formulário"`.
*   **Inspecção Dinâmica de Cabeçalho (Header Inspection)**:
    *   O script inspeciona a linha 0 de cada aba de resposta para identificar se a pergunta de "Umidade" está presente e em qual coluna ela se encontra.
    *   Mapeia e extrai os valores de temperatura, responsável e observações com segurança baseando-se no layout detectado de cada aba.
*   **Algoritmo de Ordenação Temporal (Chronological Sorting)**:
    *   Após coletar e processar todas as respostas de todos os formulários vinculados, o script ordena a lista inteira de forma cronológica com base no Timestamp de submissão do formulário, garantindo a integridade cronológica de `RAW_DATA`.

### 🧪 Verificação e Validação
*   **Sync**: Sincronizado via `clasp push`.
*   **Compilação**: Compilado na nuvem e validado localmente via diagnóstico sem nenhuma pendência.

---

## [2026-05-25 11:30] — Etapa 2: Parametrização Dinâmica de Config.gs via SETTINGS

### 🎯 Objetivo da Alteração
Desacoplar permanentemente o código-fonte das definições físicas e limites térmicos de equipamentos, habilitando o Apps Script a ler todas as constantes operacionais diretamente da aba `SETTINGS` de forma assíncrona.

### 📝 Descrição Técnica das Alterações

#### 1. Refatoração Estrutural de `Config.gs`
*   **Arquivo Modificado**: [Config.gs](file:///home/yuri/Projetos/apps-script/environmental-monitoring-automation-system/Config.gs).
*   **Implementação do Coletor Dinâmico**:
    *   Criada a função `carregarSettings_()` que abre a planilha, obtém os dados da aba `SETTINGS` e mapeia dinamicamente os valores de cada coluna para objetos estruturados em memória.
*   **Implementação de Cache Local em Nível de Módulo**:
    *   Adicionada a variável `_cacheSettings` para reter o objeto de configurações carregado. Isso evita requisições redundantes à planilha de dentro do mesmo ciclo de execução (evitando estouro de cota e eliminando gargalos de latência).
*   **Resolução de Conflito de Inicialização Global (Order of Execution)**:
    *   A variável global `EQUIPAMENTOS_PDF` dependia de `CONFIG.planilhaId` para carregar dados, mas `CONFIG` era declarada após ela. Corrigimos esta dependência estruturando a obtenção da lista dinâmica somente *após* a inicialização segura do `CONFIG = getConfig()`.
*   **Função Utilitária de Consulta**:
    *   Desenvolvida a função helper `obterConfigEquipamento_(cod)` para servir como ponte de leitura rápida de limites e metadados específicos para os demais módulos.
*   **Garantia contra Regressões de I/O (Fail-safe Fallbacks)**:
    *   Implementados arrays estáticos de contingência dentro de `obterCodigosEquipamentos_()` e no getter `ALERTA.equipamentosAtivos`. Caso ocorra alguma queda de conectividade da planilha ou exclusão acidental da aba `SETTINGS`, o sistema continuará operando com os equipamentos padrão e não sofrerá crash.

### 🧪 Verificação e Validação
*   **Sync**: Sincronizado via `clasp push`.
*   **Validação de Código**: O diagnóstico de sistema (`diagnosticoSistema` em `Dev.gs`) foi rodado e os módulos executaram sem nenhum conflito de compilação ou de escopo global.

---

## [2026-05-25 11:15] — Etapa 1: Criação e População da Aba SETTINGS

### 🎯 Objetivo da Alteração
Implementar a infraestrutura de dados para a parametrização do sistema, removendo o acoplamento rígido (*hardcoding*) dos equipamentos, limites operacionais e canais de comunicação diretamente no código do Apps Script.

### 📝 Descrição Técnica das Alterações

#### 1. Criação da Aba `SETTINGS` no Google Sheets
*   **Finalidade**: Atuar como a fonte canônica de configuração estrutural para o processamento de medições, relatórios e envio de alertas.
*   **Campos Estruturados**:
    *   `CODIGO` (ID único do equipamento).
    *   `NOME` (Identificador amigável do sensor/zona).
    *   `AREA` (Setor físico da indústria).
    *   `DOCUMENTO` (Documento de controle associado perante FSSC 22000).
    *   `SEM_UMIDADE` (Booleano indicando ausência de sensores higrométricos).
    *   `TEMP_MIN` / `TEMP_MAX` (Limites toleráveis de temperatura).
    *   `UMID_MIN` / `UMID_MAX` (Limites toleráveis de umidade relativa).
    *   `ALERTA_ATIVO` (Indica participação nas rotinas de completude de turno).
    *   `FORMS_ID` (Placeholder para os respectivos formulários de coleta).

#### 2. Implementação da Função de Migração em `Dev.gs`
*   **Arquivo Modificado**: [Dev.gs](file:///home/yuri/Projetos/apps-script/environmental-monitoring-automation-system/Dev.gs) (Inserção da função `criarAbaSettings()`).
*   **Lógica de Ingestão de Metadados Existentes**:
    *   O script faz uma busca dinâmica na aba `Lista de Equips.` para recuperar os setores físicos originais das zonas de medição atuais (`COD-1040` a `COD-1049`), prevenindo retrabalho de cadastro e erros humanos de digitação.
*   **Inserção das Novas Faixas Técnicas de Laboratório (Microbiologia)**:
    *   Configuração com `SEM_UMIDADE = true` e limites térmicos rigorosos conforme especificações operacionais:
        *   `COD-0911` (Estufa Mesófilos): 34°C - 36°C
        *   `COD-0912` (Estufa Bolores e Leveduras): 24°C - 26°C
        *   `COD-0913` (Estufa Entero/Staph/E.coli): 34°C - 36°C
        *   `COD-0914` (Estufa Salmonella): 40.5°C - 42.5°C
        *   `COD-0917` (Estufa Coliformes): 44°C - 46°C
        *   `COD-1130` (Geladeira): 2°C - 8°C
        *   `COD-1131` (Ar Ambiente): 16°C - 22°C
*   **Design & Formatação Visual Programática**:
    *   Uso da API do Apps Script para aplicar negrito nos cabeçalhos, fixar a primeira linha operacional (*Frozen Row*) e configurar larguras específicas para cada uma das 11 colunas de controle, assegurando legibilidade industrial imediata.

### 🧪 Verificação e Validação
*   **Sync**: Arquivos sincronizados local → nuvem via `clasp push`.
*   **Execução**: Função executada manualmente e com sucesso no Apps Script Web Editor na nuvem. A aba `SETTINGS` foi gerada na planilha principal com todos os 17 registros e formatação visual perfeitamente aplicados.
