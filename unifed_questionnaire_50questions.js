/**
 * ============================================================================
 * INOVAÇÃO #1: MULTI-AXIS ADVERSARIAL QUESTIONNAIRE (50 QUESTÕES)
 * ============================================================================
 * Base de Questões para Admissibilidade Pericial (Nível Tribunal)
 * Estruturadas em 5 Eixos: Cadeia Custódia, DAC7 vs SAF-T, Nexus-Zero, 
 * Algoritmo e Responsabilidade RGIT
 * ============================================================================
 */

window.UNIFED_QUESTIONNAIRE = {
    metadata: {
        version: '1.0',
        totalQuestions: 50,
        axes: 5,
        lastUpdated: new Date().toISOString(),
        compliance: ['ISO/IEC 27037:2012', 'NIST SP 800-86', 'Art. 327º CPP']
    },

    questions: [
        // ────────────────────────────────────────────────────────────────────
        // EIXO A: CADEIA DE CUSTÓDIA ISO 27037 (Q1-Q10)
        // ────────────────────────────────────────────────────────────────────
        {
            id: 'A001',
            axis: 'A',
            title: 'Cadeia de Custódia ISO 27037',
            text: 'A origem dos dados (Extrato Bancário, SAF-T PT, DAC7) foi documentada com identificação temporal precisa (timestamp RFC 3161)?',
            norma: 'ISO/IEC 27037:2012 § 5.3 (Identificação e Documentação de Evidência Digital)',
            implicacao: 'Sem documentação temporal rigorosa, a admissibilidade da prova pericial fica comprometida.',
            defesa: 'O perito deve produzir certificado de timestamp autenticado para cada ficheiro de entrada.'
        },
        {
            id: 'A002',
            axis: 'A',
            title: 'Cadeia de Custódia ISO 27037',
            text: 'Os ficheiros originais foram preservados em ambiente de apenas leitura (read-only) durante toda a análise?',
            norma: 'ISO/IEC 27037:2012 § 5.1 (Preservação de Integridade)',
            implicacao: 'Modificações accidentais ou intencionais durante análise invalidam a cadeia de custódia.',
            defesa: 'Demonstrar isolamento em contentor forense ou ambiente virtualizado com restrições de escrita.'
        },
        {
            id: 'A003',
            axis: 'A',
            title: 'Cadeia de Custódia ISO 27037',
            text: 'O hash SHA-256 original de cada ficheiro foi calculado e armazenado antes de qualquer processamento?',
            norma: 'ISO/IEC 27037:2012 § 5.2 (Integridade Criptográfica)',
            implicacao: 'Sem hash inicial, não há prova de não-corrupção do arquivo.',
            defesa: 'Fornecer manifesto SHA-256 com assinatura digital do perito e timestamp.'
        },
        {
            id: 'A004',
            axis: 'A',
            title: 'Cadeia de Custódia ISO 27037',
            text: 'Existe registro de quem acedeu aos dados, em que altura e com que privilégios de leitura/escrita?',
            norma: 'ISO/IEC 27037:2012 § 5.4 (Auditoria de Acesso)',
            implicacao: 'Sem logs de acesso, não é possível refutar alegações de manipulação posterior.',
            defesa: 'Exportar ForensicLogger completo com timestamps de cada operação realizada.'
        },
        {
            id: 'A005',
            axis: 'A',
            title: 'Cadeia de Custódia ISO 27037',
            text: 'Os dados foram processados num ambiente isolado (offline ou rede separada) sem contacto com internet pública?',
            norma: 'ISO/IEC 27037:2012 § 4.1 (Isolamento de Ambiente)',
            implicacao: 'Sem isolamento, existem riscos de contaminação ou interferência externa.',
            defesa: 'Demonstrar que o motor UNIFED roda offline localmente, sem sincronização em nuvem.'
        },
        {
            id: 'A006',
            axis: 'A',
            title: 'Cadeia de Custódia ISO 27037',
            text: 'O perito tem competência certificada em ferramentas forenses digitais (ex: ISO/IEC 27037, NIST)?',
            norma: 'NIST SP 800-86 § 2 (Qualificação do Investigador)',
            implicacao: 'Falta de competência técnica pode levar à exclusão do testemunho pericial.',
            defesa: 'Fornecer curriculum vitae com certificações forenses e experiência comprovada.'
        },
        {
            id: 'A007',
            axis: 'A',
            title: 'Cadeia de Custódia ISO 27037',
            text: 'Existe cadeia de custódia documentada entre a obtenção dos dados e a análise (ex: quem recebeu, assinou, quando)?',
            norma: 'Art. 125º CPP (Obrigações do Perito)',
            implicacao: 'Sem cadeia de custódia, a prova pode ser declarada ilegal e inadmissível.',
            defesa: 'Produzir formulários de transferência assinados ou declarações de custódia.'
        },
        {
            id: 'A008',
            axis: 'A',
            title: 'Cadeia de Custódia ISO 27037',
            text: 'Foram utilizadas ferramentas de análise validadas e com rastreabilidade forense (não modificadas, com checksums)?',
            norma: 'ISO/IEC 27037:2012 § 6 (Ferramentas Forenses Validadas)',
            implicacao: 'Ferramentas não validadas comprometem a fiabilidade dos resultados.',
            defesa: 'Documentar versão exata das ferramentas, hashes de binários, e certificações.'
        },
        {
            id: 'A009',
            axis: 'A',
            title: 'Cadeia de Custódia ISO 27037',
            text: 'O motor de análise (UNIFED) está documentado com fluxogramas, pseudocódigo e argumentos técnicos que justifiquem cada cálculo?',
            norma: 'Art. 125º, al. a) CPP (Fundamentação Técnica Obrigatória)',
            implicacao: 'Sem documentação, o tribunal não consegue avaliar a metodologia e pode rejeitar a perícia.',
            defesa: 'Produzir Relatório Técnico com Anexos de Metodologia, Algoritmos, e Validação.'
        },
        {
            id: 'A010',
            axis: 'A',
            title: 'Cadeia de Custódia ISO 27037',
            text: 'Todos os dados intermediários (buffers, caches, ficheiros temporários) foram eliminados após processamento ou arquivados em custódia?',
            norma: 'ISO/IEC 27037:2012 § 7 (Limpeza e Retenção)',
            implicacao: 'Deixar ficheiros temporários pode levar a remoção/corrupção involuntária.',
            defesa: 'Demonstrar protocolo de eliminação segura de dados intermediários (ex: shred com múltiplas passagens).'
        },

        // ────────────────────────────────────────────────────────────────────
        // EIXO B: TRIANGULAÇÃO DAC7 vs SAF-T (Q11-Q20)
        // ────────────────────────────────────────────────────────────────────
        {
            id: 'B001',
            axis: 'B',
            title: 'Triangulação DAC7 vs SAF-T',
            text: 'Os dados DAC7 (relato de operador) estão desagregados a nível de transação unitária, permitindo mapeamento 1:1 com linhas SAF-T?',
            norma: 'Diretiva UE 2021/514 (DAC7) § 8 (Granularidade de Dados)',
            implicacao: 'Sem granularidade, é impossível validar discrepâncias específicas.',
            defesa: 'Produzir tabela de mapeamento com transação SAF-T ↔ transação DAC7 lado-a-lado.'
        },
        {
            id: 'B002',
            axis: 'B',
            title: 'Triangulação DAC7 vs SAF-T',
            text: 'Foram identificadas omissões de faturação (faturas em extrato bancário mas não em SAF-T)?',
            norma: 'Art. 78º CIVA (Obrigação de Faturação)',
            implicacao: 'Omissões são indicadores de sonegação fiscal intencional (Art. 108º CIVA — Sanções).',
            defesa: 'Listar explicitamente cada fatura omitida, valor, data e NIF cliente.'
        },
        {
            id: 'B003',
            axis: 'B',
            title: 'Triangulação DAC7 vs SAF-T',
            text: 'Foram identificadas subfaturações (fatura em SAF-T com valor menor do que em extrato bancário)?',
            norma: 'Art. 108º CIVA (Subdeclaração)',
            implicacao: 'Subfaturações indicam manipulação intencional de registos contabilísticos.',
            defesa: 'Calcular diferença de valor (€ e %), itemizar por período e cliente.'
        },
        {
            id: 'B004',
            axis: 'B',
            title: 'Triangulação DAC7 vs SAF-T',
            text: 'Os períodos de reporte DAC7 (geralmente trimestral) foram desagregados em períodos SAF-T diários ou mensais para máxima precisão?',
            norma: 'D.L. n.º 28/2019 de 15 de fevereiro § 3.1.2 (Granularidade Temporal)',
            implicacao: 'Granularidade insuficiente mascara omissões dentro do mesmo trimestre.',
            defesa: 'Demonstrar análise diária ou semanal além de análise trimestral agregada.'
        },
        {
            id: 'B005',
            axis: 'B',
            title: 'Triangulação DAC7 vs SAF-T',
            text: 'Foi realizada reconciliação de IVA entre SAF-T (IVA faturado) e DAC7 (IVA declarado)?',
            norma: 'Art. 2º, n.º 1, al. i) CIVA (Autoliquidação Reversa)',
            implicacao: 'Divergências de IVA indicam potencial evasão (IVA Omitido × 23%).',
            defesa: 'Tabela comparativa: IVA em SAF-T vs IVA em DAC7, com cálculo de diferença.'
        },
        {
            id: 'B006',
            axis: 'B',
            title: 'Triangulação DAC7 vs SAF-T',
            text: 'Foram comparados os períodos de liquidação (datas de pagamento) entre SAF-T e extrato bancário para detectar atrasos anormais?',
            norma: 'NIST SP 800-86 § 3.5 (Análise Temporal)',
            implicacao: 'Liquidações atrasadas ou fora de padrão sugerem manipulação deliberada.',
            defesa: 'Gráfico de distribuição de atrasos de pagamento (dias entre fatura e crédito).'
        },
        {
            id: 'B007',
            axis: 'B',
            title: 'Triangulação DAC7 vs SAF-T',
            text: 'Os números de série de fatura foram validados para continuidade e ausência de lacunas (ex: fatura 001, 002, 004 — falta 003)?',
            norma: 'Art. 103º, n.º 2 RGIT (Sequência de Faturação)',
            implicacao: 'Lacunas na sequência indicam omissões deliberadas.',
            defesa: 'Listar lacunas detectadas, períodos afetados e quantificação de faturas omitidas.'
        },
        {
            id: 'B008',
            axis: 'B',
            title: 'Triangulação DAC7 vs SAF-T',
            text: 'Foram analisados os operadores/clientes (NIFs) em SAF-T vs DAC7 para identificar contas fantasma ou remoções?',
            norma: 'Art. 78º CIVA § 3 (Contrapartes Válidas)',
            implicacao: 'Operadores não registados ou removidos indicam manipulação intencional.',
            defesa: 'Lista de diferenças de NIFs entre bases de dados, com explicações.'
        },
        {
            id: 'B009',
            axis: 'B',
            title: 'Triangulação DAC7 vs SAF-T',
            text: 'Foi realizada análise de moedas (EUR vs estrangeiras) para validar conversão e potencial manipulação cambial?',
            norma: 'Art. 78º CIVA § 1, al. b) (Moeda e Conversão)',
            implicacao: 'Conversão incorreta pode servir como máscara para subdeclaração.',
            defesa: 'Tabela de conversões, taxas usadas, e reconciliação posterior.'
        },
        {
            id: 'B010',
            axis: 'B',
            title: 'Triangulação DAC7 vs SAF-T',
            text: 'Foram identificadas reversões (créditos) anormais que poderiam servir para cancele de facturas declaradas?',
            norma: 'Art. 80º CIVA (Notas de Crédito)',
            implicacao: 'Reversões em massa sugerem tentativa de dissimular omissões anteriores.',
            defesa: 'Análise de padrões de reversão: frequência, valores, NIFs afetados.'
        },

        // ────────────────────────────────────────────────────────────────────
        // EIXO C: NEXUS-ZERO / APROPRIAÇÃO INDEVIDA (Q21-Q30)
        // ────────────────────────────────────────────────────────────────────
        {
            id: 'C001',
            axis: 'C',
            title: 'Nexus-Zero / Apropriação Indevida',
            text: 'A plataforma digital (ex: BOLT, Uber) declara ter remuneração zero sobre as comissões retidas (Nexus-Zero)?',
            norma: 'Art. 2º, n.º 1, al. i) CIVA (Operações Zero-Rated)',
            implicacao: 'Se verdadeiro, não há IVA devido. Se falso, constitui fraude fiscal.',
            defesa: 'Validar documentação contratual e comunicação da plataforma sobre modelo de comissão.'
        },
        {
            id: 'C002',
            axis: 'C',
            title: 'Nexus-Zero / Apropriação Indevida',
            text: 'A diferença entre comissão declarada (SAF-T) e comissão real (Extrato Bancário) é material (>5%)?',
            norma: 'Art. 36º, n.º 11 CIVA (Zona Cinzenta — Valores Retidos)',
            implicacao: 'Diferenças materiais sugerem apropriação indevida de valores pela plataforma.',
            defesa: 'Cálculo de % omissão, análise de tendência mensal, projeção anual.'
        },
        {
            id: 'C003',
            axis: 'C',
            title: 'Nexus-Zero / Apropriação Indevida',
            text: 'Existe evidência de que a plataforma retém valores mas não os declara ao operador em extracto detalhado (discriminação)?',
            norma: 'Art. 78º CIVA (Faturação com Discriminação)',
            implicacao: 'Sem discriminação clara, o operador não consegue validar legitimidade das retenções.',
            defesa: 'Solicitar extracts detalhados à plataforma ou comprovar recusa de fornecer.'
        },
        {
            id: 'C004',
            axis: 'C',
            title: 'Nexus-Zero / Apropriação Indevida',
            text: 'As comissões retidas foram remuneração legítima da plataforma (2-25%) ou representam roubo de valores (>50% em casos extremos)?',
            norma: 'Art. 36º CIVA (Limites de Comissão Permitida)',
            implicacao: 'Comissões excessivas não justificadas representam enriquecimento ilícito.',
            defesa: 'Comparar % de comissão com padrão de mercado (benchmarking internacional).'
        },
        {
            id: 'C005',
            axis: 'C',
            title: 'Nexus-Zero / Apropriação Indevida',
            text: 'Foram rastreadas transferências internas da plataforma (ex: de conta de retenção para conta operacional) sem justificativa contabilística?',
            norma: 'NIST SP 800-86 § 3.3 (Rastreamento de Fundos)',
            implicacao: 'Transferências sem justificativa indicam transferência de responsabilidade.',
            defesa: 'Solicitar extracts bancários da plataforma ou demonstração de impossibilidade.'
        },
        {
            id: 'C006',
            axis: 'C',
            title: 'Nexus-Zero / Apropriação Indevida',
            text: 'Existe evidência de que a plataforma utiliza valores retidos para fins próprios (cash flow interno) sem remuneração ao operador?',
            norma: 'Art. 108º CIVA (Apropriação Indevida de Meios)',
            implicacao: 'Utilização de valores sem consentimento expresso constitui desvio de bens.',
            defesa: 'Análise de saídas de caixa da plataforma comparadas com depósitos de retenção.'
        },
        {
            id: 'C007',
            axis: 'C',
            title: 'Nexus-Zero / Apropriação Indevida',
            text: 'A plataforma ofereceu incentivos monetários temporários (ex: bónus) que depois foram deduzidos tacitamente das futuras comissões?',
            norma: 'Art. 36º CIVA § 5 (Descontos e Incentivos)',
            implicacao: 'Deduções tacitas sem consentimento prévio constituem fraude.',
            defesa: 'Cronologia de incentivos vs. cronologia de reduções em comissão futura.'
        },
        {
            id: 'C008',
            axis: 'C',
            title: 'Nexus-Zero / Apropriação Indevida',
            text: 'Houve alteração unilateral do contrato (ex: aumento de comissão retenção de 10% para 30%) sem consentimento do operador?',
            norma: 'Art. 36º, n.º 7 CIVA (Modificação de Termos Contratuais)',
            implicacao: 'Alterações unilaterais sem consentimento são nulas contratualmente.',
            defesa: 'Datas de mudanças contratuais, notificações ao operador, aceite/rejeite.'
        },
        {
            id: 'C009',
            axis: 'C',
            title: 'Nexus-Zero / Apropriação Indevida',
            text: 'A retenção ocorre em moeda estrangeira com conversão adversa (ex: USD→EUR a taxa acima do mercado) beneficiando a plataforma?',
            norma: 'Art. 80º CIVA (Conversão Cambial Legítima)',
            implicacao: 'Conversão adversa com margem não divulgada representa apropriação.',
            defesa: 'Comparar taxas aplicadas com taxas do BCE no mesmo dia.'
        },
        {
            id: 'C010',
            axis: 'C',
            title: 'Nexus-Zero / Apropriação Indevida',
            text: 'O sistema de retenção é automático (algoritmo) ou manual (revisão humana), e há possibilidade de erro ou manipulação?',
            norma: 'Art. 125º CPP § 1 (Metodologia Transparente)',
            implicacao: 'Sem transparência, não há como refutar alegações de manipulação deliberada.',
            defesa: 'Documentação do algoritmo, logs de cada operação de retenção, auditoria.'
        },

        // ────────────────────────────────────────────────────────────────────
        // EIXO D: ALGORITMO & FALIBILIDADE (Q31-Q40)
        // ────────────────────────────────────────────────────────────────────
        {
            id: 'D001',
            axis: 'D',
            title: 'Algoritmo & Falibilidade',
            text: 'O motor de análise (UNIFED) passou em validação independente (ex: auditoria de terceiros) comprovando ausência de viés?',
            norma: 'NIST SP 800-86 § 2.3 (Validação de Ferramentas)',
            implicacao: 'Sem validação, a ferramenta pode ser contestada como parcial.',
            defesa: 'Produzir relatório de auditoria independente ou certificação de uso legítimo.'
        },
        {
            id: 'D002',
            axis: 'D',
            title: 'Algoritmo & Falibilidade',
            text: 'O algoritmo foi testado com dados conhecidos (ex: testes de regressão) para validar outputs?',
            norma: 'ISO/IEC 27037:2012 § 6.1 (Validação de Outputs)',
            implicacao: 'Sem testes conhecidos, não há prova de que o algoritmo funciona.',
            defesa: 'Fornecer casos de teste documentados (inputs, outputs esperados, outputs reais).'
        },
        {
            id: 'D003',
            axis: 'D',
            title: 'Algoritmo & Falibilidade',
            text: 'O algoritmo foi testado com dados adversariais (ex: tentativas de bypassing) para provar robustez?',
            norma: 'NIST SP 800-86 § 3.7 (Testes de Resiliência)',
            implicacao: 'Sem testes adversariais, o algoritmo pode ser facilmente contornado.',
            defesa: 'Documentação de testes de resistência (fuzzing, edge cases, limites).'
        },
        {
            id: 'D004',
            axis: 'D',
            title: 'Algoritmo & Falibilidade',
            text: 'A precisão do algoritmo foi quantificada (ex: taxa de falsos positivos/negativos < 1%)?',
            norma: 'Art. 125º CPP (Precisão Técnica Obrigatória)',
            implicacao: 'Sem quantificação, o tribunal não consegue avaliar fiabilidade.',
            defesa: 'Fornecer matriz de confusão, precisão, recall, F1-score.'
        },
        {
            id: 'D005',
            axis: 'D',
            title: 'Algoritmo & Falibilidade',
            text: 'O algoritmo foi comparado com métodos alternativos (ex: análise manual vs. automatizada) e demonstra superioridade ou equivalência?',
            norma: 'NIST SP 800-86 § 2.2 (Comparação de Métodos)',
            implicacao: 'Sem comparação, não há prova de que o método escolhido é o melhor.',
            defesa: 'Tabela comparativa de métodos com análise de pros/contras.'
        },
        {
            id: 'D006',
            axis: 'D',
            title: 'Algoritmo & Falibilidade',
            text: 'O algoritmo é determinístico (mesmos inputs sempre geram mesmos outputs) ou estocástico (com elemento aleatório)?',
            norma: 'ISO/IEC 27037:2012 § 5.5 (Reprodutibilidade)',
            implicacao: 'Algoritmos estocásticos são difíceis de reproduzir em contradita.',
            defesa: 'Documentar seeds de aleatoriedade e garantir reprodutibilidade total.'
        },
        {
            id: 'D007',
            axis: 'D',
            title: 'Algoritmo & Falibilidade',
            text: 'O código-fonte do algoritmo foi disponibilizado para revisão técnica da defesa (open-source ou under NDA)?',
            norma: 'Art. 327º CPP (Direito ao Contraditório)',
            implicacao: 'Sem acesso ao código, a defesa não consegue validar metodologia.',
            defesa: 'Fornecer código sob NDA, passando por revisão do tribunal.'
        },
        {
            id: 'D008',
            axis: 'D',
            title: 'Algoritmo & Falibilidade',
            text: 'Foram documentados todos os pressupostos do algoritmo (ex: assume que SAF-T é fidedigno) e validados antes de usar?',
            norma: 'Art. 125º, al. a) CPP (Pressupostos Técnicos)',
            implicacao: 'Pressupostos não validados são ponto de ataque da defesa.',
            defesa: 'Lista de pressupostos com validação de cada um (ex: "SAF-T é fidedigno porque X").'
        },
        {
            id: 'D009',
            axis: 'D',
            title: 'Algoritmo & Falibilidade',
            text: 'O algoritmo produz outputs explicáveis (ex: "omissão detectada porque fatura X não aparece em SAF-T") ou é caixa-preta?',
            norma: 'NIST SP 800-86 § 4.1 (Explicabilidade)',
            implicacao: 'Algoritmos caixa-preta são menos credíveis em tribunal.',
            defesa: 'Fornecer explicação legível para cada finding/recomendação do algoritmo.'
        },
        {
            id: 'D010',
            axis: 'D',
            title: 'Algoritmo & Falibilidade',
            text: 'Existe documentação de limites conhecidos do algoritmo (ex: "não detecta omissões <€100") e recomendações de uso?',
            norma: 'ISO/IEC 27037:2012 § 6.2 (Limitações Documentadas)',
            implicacao: 'Sem documentação de limites, o tribunal pode desconfiar de findings nos limites.',
            defesa: 'Manual de utilizador com seção "Limitações Conhecidas".'
        },

        // ────────────────────────────────────────────────────────────────────
        // EIXO E: RESPONSABILIDADE RGIT (Q41-Q50)
        // ────────────────────────────────────────────────────────────────────
        {
            id: 'E001',
            axis: 'E',
            title: 'Responsabilidade RGIT',
            text: 'O operador cumpriu a obrigação de declaração ao RGIT (Registo Geral de Imposto sobre o Rendimento) dentro do prazo legal?',
            norma: 'Art. 114º RGIT (Prazos de Entrega)',
            implicacao: 'Falta de declaração dentro do prazo é infração autónoma.',
            defesa: 'Verificar data de entrega oficial da declaração vs. data limite (31 Maio do ano seguinte).'
        },
        {
            id: 'E002',
            axis: 'E',
            title: 'Responsabilidade RGIT',
            text: 'A omissão de rendimentos detectada é intencional (dolosa) ou resultado de erro administrativo (culpa)?',
            norma: 'Art. 108º CIVA (Graus de Culpabilidade)',
            implicacao: 'Intenção agrava significativamente as sanções (até 150% vs. 15% por engano).',
            defesa: 'Análise de padrões: se a omissão é sistemática, sugere intenção; se pontual, sugere erro.'
        },
        {
            id: 'E003',
            axis: 'E',
            title: 'Responsabilidade RGIT',
            text: 'O operador realizou diligência devida para validar as retenções da plataforma (ex: solicitando esclarecimentos)?',
            norma: 'Art. 78º CIVA § 2 (Dever de Validação)',
            implicacao: 'Negligência do operador em validar não elimina responsabilidade da plataforma.',
            defesa: 'Cronologia de contactos do operador com plataforma solicitando esclarecimentos.'
        },
        {
            id: 'E004',
            axis: 'E',
            title: 'Responsabilidade RGIT',
            text: 'A plataforma agiu de boa fé ao reter valores (ex: cumprindo legislação local) ou com intenção deliberada de sonegar?',
            norma: 'Art. 36º CIVA (Princípio da Boa Fé)',
            implicacao: 'Boa fé reduz culpabilidade; intenção deliberada agrava sanções.',
            defesa: 'Documentação de comunicação com autoridades sobre conformidade.'
        },
        {
            id: 'E005',
            axis: 'E',
            title: 'Responsabilidade RGIT',
            text: 'O imposto evadido durante a omissão foi posteriormente regularizado (ex: após descoberta) ou mantém-se em aberto?',
            norma: 'Art. 108º, n.º 5 CIVA (Regularização Espontânea)',
            implicacao: 'Regularização espontânea reduz sanções; falta de regularização agrava.',
            defesa: 'Data de regularização, valor regularizado, juros e multas pagas.'
        },
        {
            id: 'E006',
            axis: 'E',
            title: 'Responsabilidade RGIT',
            text: 'A plataforma era obrigada a emitir fatura (ex: pelo montante da retenção) ou estava isenta por legislação local?',
            norma: 'Art. 78º CIVA (Obrigação de Faturação)',
            implicacao: 'Isenção legal elimina responsabilidade; obrigação não cumprida constitui infração.',
            defesa: 'Documentação da legislação local aplicável (ex: país de residência da plataforma).'
        },
        {
            id: 'E007',
            axis: 'E',
            title: 'Responsabilidade RGIT',
            text: 'A retenção de valores pela plataforma ocorreu em território português (sujeita a RGIT) ou em país estrangeiro?',
            norma: 'Art. 2º, n.º 1, al. i) CIVA (Territorialidade)',
            implicacao: 'Se em estrangeiro, a responsabilidade pode ser dividida (Art. 32.º RGPD / D.L. n.º 28/2019).',
            defesa: 'Domicílio fiscal da plataforma, local de residência do operador, ponto de execução.'
        },
        {
            id: 'E008',
            axis: 'E',
            title: 'Responsabilidade RGIT',
            text: 'O operador tinha direito de dedução de IVA sobre as comissões realmente remuneradas ou sobre as comissões declaradas em SAF-T?',
            norma: 'Art. 98º CIVA (Direito de Dedução)',
            implicacao: 'Dedução excessiva baseada em valores inflacionados também constitui infração.',
            defesa: 'Reconciliação de deduções reclamadas vs. valores realmente despendidos.'
        },
        {
            id: 'E009',
            axis: 'E',
            title: 'Responsabilidade RGIT',
            text: 'A plataforma beneficiou-se de regime fiscal especial (ex: isenção startup) que poderia justificar a retenção sem declaração?',
            norma: 'Art. 36º CIVA § 6 (Regimes Especiais)',
            implicacao: 'Regime especial pode eliminar responsabilidade, mas deve ser legalmente comprovado.',
            defesa: 'Documentação de aprovação de regime especial pela autoridade tributária.'
        },
        {
            id: 'E010',
            axis: 'E',
            title: 'Responsabilidade RGIT',
            text: 'Qual é a quota de responsabilidade entre operador (submissão de SAF-T) e plataforma (retenção e não-declaração)?',
            norma: 'Art. 125º CPP (Análise de Causalidade)',
            implicacao: 'Tribunal pode distribuir responsabilidade de forma proporcional.',
            defesa: 'Análise de causalidade: quem originou a omissão, quem poderia ter evitado.'
        }
    ],

    getQuestionsByAxis: function(axis) {
        return this.questions.filter(q => q.axis === axis);
    },

    /**
     * HEURÍSTICA FORENSE: Score de Relevância Causal Automático
     * Calcula o TOP 3 dinâmico baseado nas métricas de análise
     * Determinístico: mesmas métricas = mesmo TOP 3
     * @param {Object} analysisMetrics - Métricas da análise (omissão, frota, caducidade, risco, revenueGap, expenseGap, saftGross, etc.)
     * @returns {Array} Top 3 questões ordenadas por relevância causal
     */
    computeTopQuestions: function(analysisMetrics) {
        console.log('[QUESTIONNAIRE-HEURISTIC] 🧠 Computando TOP 3 Dinâmico (Ponderação Estática por Eixos de Discrepância)...');

        const metrics = analysisMetrics || {
            omissionPct: 0,
            frotaSize: 0,
            periodsCovered: 0,
            cadducityYears: 0,
            verdict: 'RISCO_BAIXO',
            ivaOmitted: 0,
            btorDivergence: 0,
            revenueGap: 0,
            expenseGap: 0,
            saftGross: 0
        };

        // Pesos base por eixo (ajustados dinamicamente conforme as discrepâncias)
        let weights = { A: 0, B: 0, C: 0, D: 0, E: 0 };

        // --- REGRA 1: Gap de Despesas/Comissões (Expense Gap) ---
        if (metrics.expenseGap > 0 && metrics.omissionPct > 50) {
            weights.C += 40;  // Eixo C: Nexus-Zero / Apropriação Indevida
            weights.B += 20;  // Triangulação DAC7 vs SAF-T
        } else if (metrics.expenseGap > 0) {
            weights.C += 20;
        }

        // --- REGRA 2: Gap de Receita (SAF-T vs DAC7) ---
        if (metrics.revenueGap > 0 && metrics.saftGross && (metrics.revenueGap / metrics.saftGross) > 0.15) {
            weights.B += 40;  // Eixo B prioritário
            weights.E += 20;  // Responsabilidade RGIT
        } else if (metrics.revenueGap > 0) {
            weights.B += 20;
        }

        // --- REGRA 3: Omissão de IVA elevada ---
        if (metrics.ivaOmitted > 5000) {
            weights.B += 30;
            weights.E += 20;
        }

        // --- REGRA 4: Frota grande → cadeia de custódia e responsabilidade ---
        if (metrics.frotaSize > 50) {
            weights.A += 35;
            weights.E += 25;
        } else if (metrics.frotaSize > 10) {
            weights.A += 20;
            weights.E += 15;
        }

        // --- REGRA 5: Períodos plurianuais → caducidade e custódia ---
        if (metrics.periodsCovered >= 24) {
            weights.A += 25;
            weights.E += 20;
        }

        // --- REGRA 6: Verdict crítico → algoritmo e triangulação ---
        if (metrics.verdict === 'RISCO_CRÍTICO' || metrics.verdict === 'CRITICAL RISK') {
            weights.D += 35;
            weights.B += 30;
        } else if (metrics.verdict === 'RISCO_ALTO' || metrics.verdict === 'HIGH RISK') {
            weights.D += 20;
            weights.B += 20;
        }

        // --- REGRA 7: Caducidade iminente ---
        if (metrics.cadducityYears >= 3) {
            weights.E += 30;
        }

        console.log('[HEURISTIC] ⚖️ Weights Finais: A=' + weights.A + ', B=' + weights.B + ', C=' + weights.C + ', D=' + weights.D + ', E=' + weights.E);

        // Calcular score para cada questão (sem random, apenas pesos + ID como desempate determinístico)
        const scoredQuestions = this.questions.map(function(q) {
            const axisWeight = weights[q.axis] || 0;
            // Desempate determinístico baseado no ID (apenas para ordenação, sem influência no peso real)
            const idHash = q.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const deterministicModifier = (idHash % 1000) / 10000; // mínimo, apenas para quebrar empates
            const relevanceScore = axisWeight + deterministicModifier;
            return { question: q, score: relevanceScore };
        });

        scoredQuestions.sort((a, b) => b.score - a.score);
        const top3 = scoredQuestions.slice(0, 3).map(sq => ({
            id: sq.question.id,
            axis: sq.question.axis,
            text: sq.question.text,
            norma: sq.question.norma,
            implicacao: sq.question.implicacao,
            defesa: sq.question.defesa,
            relevanceScore: sq.score.toFixed(2)
        }));

        console.log('[QUESTIONNAIRE-HEURISTIC] ✅ TOP 3 Computado (estático por eixos de discrepância)');
        top3.forEach((q, i) => {
            console.log('  ' + (i+1) + '. ' + q.id + ' (Eixo ' + q.axis + ') — Score: ' + q.relevanceScore);
        });
        return top3;
    },

    exportAsJSON: function() {
        return {
            metadata: this.metadata,
            questions: this.questions,
            exportDate: new Date().toISOString()
        };
    }
};

console.log('[UNIFED-QUESTIONNAIRE] ✅ Multi-Axis Adversarial Questionnaire Loaded (50 Q, 5 Axes)');