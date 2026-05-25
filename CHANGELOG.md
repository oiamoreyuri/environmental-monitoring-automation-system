# Changelog — Environmental Monitoring Automation System

Este arquivo registra de forma técnica, cronológica e robusta todas as alterações de engenharia realizadas no projeto. As entradas são ordenadas da mais recente para a mais antiga.

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
