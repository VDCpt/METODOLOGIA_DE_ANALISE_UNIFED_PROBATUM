/**
 * ============================================================================
 * UNIFED-PROBATUM · TRANSLATIONS MODULE v13.5.6-NACIONALIZADO
 * ============================================================================
 * Dicionário Bilíngue Completo: PT-PT ↔ EN-US
 * 190+ Chaves para Interface, Tríade Pericial, Cadeia de Custódia, Frota, I18N
 *
 * RETIFICAÇÕES APLICADAS (v13.5.6-NACIONALIZADO):
 * REQ-04a: Nacionalização Jurisprudencial – termos PT-PT alinhados com DL 28/2019,
 *          RGIT, Código de Processo Penal (arts. 125.º e 327.º).
 * REQ-04b: Encapsulamento do Inglês – idioma padrão = 'pt', tradução EN relegada
 *          a espelho passivo, activável apenas via flag manual na UI.
 * REQ-04c: deepTreeWalkSanitizePlatforms optimizada – parâmetro 'inPlace' evita
 *          deep clone desnecessário; sanitização ocorre apenas no momento da
 *          exportação do JSON, eliminando qualquer gargalo na UI.
 * UNIFED-TRANS-RET-10: Redução do throttle do MutationObserver de 300ms para 50ms.
 *                       Adição da função forceTranslateUI para tradução síncrona.
 * ============================================================================
 */

window.UNIFED_TRANSLATIONS = window.UNIFED_TRANSLATIONS || {};

window.UNIFED_TRANSLATIONS.DICTIONARY = {
    // ════════════════════════════════════════════════════════════════════════
    // BOTÕES PRINCIPAIS
    // ════════════════════════════════════════════════════════════════════════
    'btn_start_analysis': { 'pt': 'INICIAR PERÍCIA v13.5.6', 'en': 'START FORENSIC ANALYSIS v13.5.6' },
    'ui_btn_execute_forensics': { 'pt': 'EXECUTAR ANÁLISE FORENSE', 'en': 'EXECUTE FORENSIC ANALYSIS' },

    // ════════════════════════════════════════════════════════════════════════
    // BOTÕES PRINCIPAIS (PACOTES PERICIAIS)
    // ════════════════════════════════════════════════════════════════════════
    'btn_export_lawyer_pack': {
        'pt': 'Exportar Pacote Advogado (Parecer, Petição, Anexo de Custódia + JSON)',
        'en': 'Export Lawyer Package (Opinion, Petition, Custody Annex + JSON)'
    },
    'btn_export_analyst_pack': {
        'pt': 'Exportar Pacote Analista (Parecer Técnico Forense + JSON)',
        'en': 'Export Analyst Package (Forensic Technical Opinion + JSON)'
    },
    'btn_export_architecture': { 'pt': 'Exportar Relatório de Arquitectura (HTML)', 'en': 'Export Architecture Report (HTML)' },
    'btn_clear_console': { 'pt': 'Limpar Consola', 'en': 'Clear Console' },
    'btn_regenerate_top3': { 'pt': '🔄 Regenerar TOP 3 (Automático)', 'en': '🔄 Regenerate TOP 3 (Automatic)' },
    'btn_accept_top3': { 'pt': '✓ Aceitar & Prosseguir', 'en': '✓ Accept & Proceed' },

    // ════════════════════════════════════════════════════════════════════════
    // PAINEL DO ADVOGADO (TOP 3)
    // ════════════════════════════════════════════════════════════════════════
    'panel_lawyer_title': { 'pt': '⚖️ PAINEL DO ADVOGADO: CONTRADITÓRIO DINÂMICO', 'en': '⚖️ LAWYER PANEL: DYNAMIC CONTRADICTION' },
    'panel_lawyer_subtitle': { 'pt': 'Motor Recomenda TOP 3 Questões Automáticas (Heurística Forense)', 'en': 'Engine Recommends TOP 3 Automatic Questions (Forensic Heuristics)' },
    'panel_lawyer_instructions': { 'pt': '✓ Instruções do Advogado: Cada questão abaixo pode ser editada, revista ou rectificada antes de gerar o pacote final. O sistema recalcula a assinatura digital (Merkle Root) em tempo real após edições.', 'en': '✓ Lawyer Instructions: Each question below can be edited, reviewed, or corrected before generating the final package. The system recalculates the digital signature (Merkle Root) in real-time after edits.' },

    // ════════════════════════════════════════════════════════════════════════
    // CARDS TOP 3 - RÓTULOS
    // ════════════════════════════════════════════════════════════════════════
    'top3_question_label': { 'pt': '📋 Pergunta', 'en': '📋 Question' },
    'top3_norma_label': { 'pt': '📋 Norma Jurídica', 'en': '📋 Legal Norm' },
    'top3_implicacao_label': { 'pt': '⚡ Implicação Técnico‑Jurídica', 'en': '⚡ Technical/Legal Implication' },
    'top3_defesa_label': { 'pt': '🛡️ Estratégia de Defesa', 'en': '🛡️ Defense Strategy' },
    'top3_score_label': { 'pt': 'Pontuação', 'en': 'Score' },
    'top3_axis_label': { 'pt': 'Eixo', 'en': 'Axis' },

    // ════════════════════════════════════════════════════════════════════════
    // EIXOS DO QUESTIONÁRIO (alinhados com RGIT e CPP)
    // ════════════════════════════════════════════════════════════════════════
    'questionnaire_axis_a': { 'pt': 'Eixo A: Cadeia de Custódia (art. 327.º CPP e ISO 27037)', 'en': 'Axis A: Chain of Custody (CPP art. 327 & ISO 27037)' },
    'questionnaire_axis_b': { 'pt': 'Eixo B: Triangulação DAC7 vs SAF-T (DL 28/2019)', 'en': 'Axis B: DAC7 vs SAF-T Triangulation (DL 28/2019)' },
    'questionnaire_axis_c': { 'pt': 'Eixo C: Nexus‑Zero / Apropriação Indevida (art. 125.º CPP)', 'en': 'Axis C: Nexus‑Zero / Undue Appropriation (CPP art. 125)' },
    'questionnaire_axis_d': { 'pt': 'Eixo D: Algoritmo & Falibilidade (RGIT)', 'en': 'Axis D: Algorithm & Fallibility (RGIT)' },
    'questionnaire_axis_e': { 'pt': 'Eixo E: Responsabilidade Tributária (RGIT/LGT)', 'en': 'Axis E: Tax Liability (RGIT/LGT)' },

    // ════════════════════════════════════════════════════════════════════════
    // MERKLE TREE & eIDAS
    // ════════════════════════════════════════════════════════════════════════
    'merkle_root_label': { 'pt': 'Raiz Merkle (eIDAS 2.0)', 'en': 'Merkle Root (eIDAS 2.0)' },
    'merkle_selective_disclosure': { 'pt': 'Divulgação Selectiva: Prova sem Revelar Base Completa', 'en': 'Selective Disclosure: Proof Without Revealing Full Database' },
    'merkle_proof_validation': { 'pt': 'Validação da Prova de Inclusão', 'en': 'Proof of Inclusion Validation' },
    'merkle_hash_prefix': { 'pt': 'Hash de Sessão:', 'en': 'Session Hash:' },

    // ════════════════════════════════════════════════════════════════════════
    // MOTOR COGNITIVO & HEURÍSTICA
    // ════════════════════════════════════════════════════════════════════════
    'cognitive_engine_title': { 'pt': 'Motor Analítico Cognitivo', 'en': 'Cognitive Analytics Engine' },
    'cognitive_heuristic_mode': { 'pt': 'Modo: Heurística Forense Automática (TOP 3 Dinâmico)', 'en': 'Mode: Automatic Forensic Heuristics (Dynamic TOP 3)' },
    'cognitive_top3_computing': { 'pt': '🧠 A calcular TOP 3 (Pontuação de Relevância Causal)...', 'en': '🧠 Computing TOP 3 (Causal Relevance Score)...' },
    'cognitive_top3_ready': { 'pt': '✅ TOP 3 Pronto — Reveja no Painel do Advogado', 'en': '✅ TOP 3 Ready — Review in Lawyer Panel' },

    // ════════════════════════════════════════════════════════════════════════
    // MOTOR BTOR & FROTAS
    // ════════════════════════════════════════════════════════════════════════
    'btor_engine_status': { 'pt': 'Motor BTOR: Reconciliação Bancária Activa', 'en': 'BTOR Engine: Bank Reconciliation Active' },
    'btor_cumulative_base': { 'pt': 'Base Tributável Cumulativa (|BTOR-BTF|)', 'en': 'Cumulative Tax Base (|BTOR-BTF|)' },
    'btor_iva_omitted': { 'pt': 'IVA Omitido (23% × Base)', 'en': 'Omitted VAT (23% × Base)' },
    'fleet_active_drivers': { 'pt': 'Condutores Activos', 'en': 'Active Drivers' },
    'fleet_active_vehicles': { 'pt': 'Viaturas Activas', 'en': 'Active Vehicles' },
    'fleet_unique_operators': { 'pt': 'Operadores Únicos', 'en': 'Unique Operators' },
    'fleet_registry_title': { 'pt': 'Registo de Frota', 'en': 'Fleet Registry' },

    // ════════════════════════════════════════════════════════════════════════
    // HISTÓRICO PLURIANUAL
    // ════════════════════════════════════════════════════════════════════════
    'historical_earliest_period': { 'pt': 'Período Mais Antigo', 'en': 'Earliest Period' },
    'historical_latest_period': { 'pt': 'Período Mais Recente', 'en': 'Latest Period' },
    'historical_periods_covered': { 'pt': 'Períodos Abrangidos', 'en': 'Periods Covered' },
    'historical_total_records': { 'pt': 'Total de Registos Cumulativos', 'en': 'Total Cumulative Records' },
    'historical_years_spanned': { 'pt': 'Anos Abrangidos', 'en': 'Years Spanned' },

    // ════════════════════════════════════════════════════════════════════════
    // CADUCIDADE (LGT Art. 45º)
    // ════════════════════════════════════════════════════════════════════════
    'lgt_cadducity_title': { 'pt': 'Conformidade com o art. 45.º da LGT (Caducidade)', 'en': 'LGT Art. 45 Compliance (Statute of Limitation)' },
    'lgt_years_elapsed': { 'pt': 'Anos Decorridos', 'en': 'Years Elapsed' },
    'lgt_cadducity_valid': { 'pt': 'Válido para Auditoria', 'en': 'Valid for Audit' },
    'lgt_cadducity_expiring': { 'pt': 'Caducidade Iminente', 'en': 'Imminent Expiry' },
    'lgt_cadducity_expired': { 'pt': 'Caducado (4 Anos)', 'en': 'Expired (4 Years)' },
    'lgt_note_manifest': { 'pt': 'Nota: Manifesta Ocultação ou Crime = Imprescritível (art. 327.º CPP)', 'en': 'Note: Manifest Concealment or Crime = Imprescriptible (CPP art. 327)' },

    // ════════════════════════════════════════════════════════════════════════
    // ARQUITECTURA & RELATÓRIO
    // ════════════════════════════════════════════════════════════════════════
    'architecture_report_title': { 'pt': 'Relatório de Arquitectura do Sistema', 'en': 'System Architecture Report' },
    'architecture_offline_mode': { 'pt': 'Modo Offline: Motor Forense Executa Localmente', 'en': 'Offline Mode: Forensic Engine Runs Locally' },
    'architecture_readonly_access': { 'pt': 'Acesso Apenas de Leitura: Sem Mutação de Dados', 'en': 'Read-Only Access: No Data Mutation' },
    'architecture_eidas_ready': { 'pt': 'Pronto para eIDAS 2.0 (Merkle + Divulgação Selectiva)', 'en': 'eIDAS 2.0 Ready (Merkle + Selective Disclosure)' },

    // ════════════════════════════════════════════════════════════════════════
    // TRÍADE PERICIAL — PACOTES DE EXPORTAÇÃO
    // ════════════════════════════════════════════════════════════════════════
    'triada_analyst_pack_title': { 'pt': 'Pacote do Analista Forense — Tríade Pericial', 'en': 'Forensic Analyst Package — Triadic Opinion' },
    'triada_lawyer_pack_title': { 'pt': 'Pacote do Advogado — Tríade Pericial + Custódia', 'en': 'Lawyer Package — Triadic Opinion + Custody' },
    'triada_custody_annex_title': { 'pt': 'Anexo de Cadeia de Custódia (ISO/IEC 27037)', 'en': 'Evidence Custody Annex (ISO/IEC 27037)' },
    'triada_export_analyst_label': { 'pt': 'Exportar Pacote Analista (Parecer Técnico + JSON)', 'en': 'Export Analyst Package (Technical Opinion + JSON)' },
    'triada_export_lawyer_label': { 'pt': 'Exportar Pacote Advogado (Parecer, Petição, Custódia + JSON)', 'en': 'Export Lawyer Package (Opinion, Petition, Custody + JSON)' },
    'triada_doc_count_analyst': { 'pt': '{{count}} documentos periciais + JSON', 'en': '{{count}} forensic documents + JSON' },
    'triada_doc_count_lawyer': { 'pt': '{{count}} peças processuais + Anexo de Custódia + JSON', 'en': '{{count}} procedural documents + Custody Annex + JSON' },
    'triada_merkle_root_label': { 'pt': 'Raiz Merkle (eIDAS 2.0 – Divulgação Selectiva)', 'en': 'Merkle Root (eIDAS 2.0 Selective Disclosure)' },
    'triada_merkle_salt_label': { 'pt': 'Salt de Sessão (referência parcial)', 'en': 'Session Salt (partial reference)' },
    'triada_session_id_label': { 'pt': 'ID de Sessão Pericial', 'en': 'Forensic Session ID' },
    'triada_period_label': { 'pt': 'Período Fiscal em Análise', 'en': 'Fiscal Period Under Analysis' },
    'triada_verdict_label': { 'pt': 'Veredito de Risco Pericial', 'en': 'Forensic Risk Verdict' },
    'triada_master_hash_label': { 'pt': 'Master Hash SHA-256 do Lote', 'en': 'Batch SHA-256 Master Hash' },
    'triada_tsa_mock_warning': { 'pt': '⚠️ Timestamp: Simulação RFC 3161 em ambiente isolado. Volte a selar com TSA acreditada para submissão judicial.', 'en': '⚠️ Timestamp: Air-Gapped RFC 3161 Mock. Re-seal with accredited TSA for judicial submission.' },
    'triada_seal_type_label': { 'pt': 'Tipo de Selagem', 'en': 'Seal Type' },
    'triada_omission_pct_label': { 'pt': 'Taxa de Omissão (%)', 'en': 'Omission Rate (%)' },
    'triada_gap_btor_btf_label': { 'pt': 'Desvio BTOR-BTF (Base Tributável |BTOR-BTF|)', 'en': 'BTOR-BTF Gap (Tax Base |BTOR-BTF|)' },
    'triada_iva_23_label': { 'pt': 'IVA em Falta (taxa de 23%)', 'en': 'Missing VAT (23% rate)' },
    'triada_iva_6_label': { 'pt': 'IVA em Falta (taxa de 6%)', 'en': 'Missing VAT (6% rate)' },
    'triada_disclosure_selective': { 'pt': 'Divulgação Selectiva: prova de integridade sem exposição da base completa', 'en': 'Selective Disclosure: integrity proof without exposing the full question database' },

    // ════════════════════════════════════════════════════════════════════════
    // CADEIA DE CUSTÓDIA — LABELS DINÂMICOS (art. 327.º CPP)
    // ════════════════════════════════════════════════════════════════════════
    'custody_chain_title': { 'pt': 'Cadeia de Custódia da Prova Digital (art. 327.º CPP)', 'en': 'Digital Evidence Chain of Custody (CPP art. 327)' },
    'custody_entry_timestamp': { 'pt': 'Data/Hora de Registo', 'en': 'Registration Timestamp' },
    'custody_entry_action':    { 'pt': 'Acção Forense',        'en': 'Forensic Action'         },
    'custody_entry_hash':      { 'pt': 'Hash SHA-256',         'en': 'SHA-256 Hash'             },
    'custody_entry_source':    { 'pt': 'Fonte de Evidência',   'en': 'Evidence Source'          },
    'custody_entry_operator':  { 'pt': 'Operador/Sistema',     'en': 'Operator/System'          },
    'custody_status_sealed':   { 'pt': 'SELADO',               'en': 'SEALED'                   },
    'custody_status_open':     { 'pt': 'EM ABERTO',            'en': 'OPEN'                     },
    'custody_iso_ref': { 'pt': 'Conformidade: ISO/IEC 27037:2012 § 8.3 — Preservação de Evidências', 'en': 'Compliance: ISO/IEC 27037:2012 § 8.3 — Evidence Preservation' },

    // ════════════════════════════════════════════════════════════════════════
    // VEREDICTOS & ESTADOS
    // ════════════════════════════════════════════════════════════════════════
    'verdict_critical': { 'pt': 'RISCO CRÍTICO',  'en': 'CRITICAL RISK'  },
    'verdict_high':     { 'pt': 'RISCO ELEVADO',  'en': 'HIGH RISK'      },
    'verdict_medium':   { 'pt': 'RISCO MÉDIO',    'en': 'MEDIUM RISK'    },
    'verdict_low':      { 'pt': 'RISCO BAIXO',    'en': 'LOW RISK'       },
    'verdict_unknown':  { 'pt': 'INDETERMINADO',  'en': 'UNDETERMINED'   },

    // ════════════════════════════════════════════════════════════════════════
    // MENSAGENS DE SUCESSO
    // ════════════════════════════════════════════════════════════════════════
    'success_analysis_complete': { 'pt': '✅ Análise Completa', 'en': '✅ Analysis Complete' },
    'success_top3_computed': { 'pt': '✅ TOP 3 Calculado com Sucesso', 'en': '✅ TOP 3 Computed Successfully' },
    'success_merkle_generated': { 'pt': '✅ Raiz Merkle Gerada', 'en': '✅ Merkle Root Generated' },
    'success_export_ready': { 'pt': '✅ Pronto para Exportar', 'en': '✅ Ready to Export' },

    // ════════════════════════════════════════════════════════════════════════
    // MENSAGENS DE ERRO
    // ════════════════════════════════════════════════════════════════════════
    'error_data_missing': { 'pt': '❌ Dados Insuficientes', 'en': '❌ Insufficient Data' },
    'error_merkle_failed': { 'pt': '❌ Erro ao Gerar Árvore de Merkle', 'en': '❌ Error Generating Merkle Tree' },
    'error_export_failed': { 'pt': '❌ Erro na Exportação', 'en': '❌ Export Error' },
    'error_validation_failed': { 'pt': '❌ Validação Falhou', 'en': '❌ Validation Failed' }
};

// ============================================================================
// FUNÇÃO HELPER: OBTER TRADUÇÃO (fallback seguro, padrão = 'pt')
// ============================================================================
window.getTranslation = function(key, lang) {
    lang = lang || window.currentLang || 'pt';
    if (window.UNIFED_TRANSLATIONS.DICTIONARY[key]) {
        return window.UNIFED_TRANSLATIONS.DICTIONARY[key][lang] || window.UNIFED_TRANSLATIONS.DICTIONARY[key]['pt'];
    }
    console.warn('[TRANSLATIONS] ⚠️ Chave não encontrada: ' + key + ' (' + lang + ')');
    return key;
};

// ============================================================================
// DEEP TREE WALK OTIMIZADA (para exportação final apenas)
// RETIFICAÇÃO REQ-04c: parâmetro 'inPlace' evita deep clone desnecessário
// ============================================================================
const PLATFORM_TERMS_REGEX = /\b(bolt|uber|freenow|free\s+now|cabify|indrive|in\s+drive|lyft|didi|taxify|yango|heetch|splyt|ola\b(?!\s+vez|\s+mais|\s+que|\s+como|\s+vez))/gi;

/**
 * Sanitiza nomes de plataformas digitais em valores string de um objecto,
 * opcionalmente in‑place (sem clonagem profunda) para máxima performance.
 * Deve ser chamada APENAS no momento da montagem do JSON final para os advogados.
 *
 * @param {Object} payload    - Objecto a sanitizar (será mutado se inPlace = true)
 * @param {string} targetPath - Caminho alvo (ex: 'metadata.client')
 * @param {boolean} inPlace   - Se true, modifica o objecto original; se false, retorna um clone (comportamento legado)
 * @returns {Object} O objecto (possivelmente modificado) para encadeamento
 */
window.deepTreeWalkSanitizePlatforms = function(payload, targetPath, inPlace = false) {
    targetPath = targetPath || 'metadata.client';
    if (!payload || typeof payload !== 'object') return payload;

    const pathSegments = targetPath.split('.');

    function sanitizeString(str) {
        if (typeof str !== 'string') return str;
        const sanitized = str.replace(PLATFORM_TERMS_REGEX, function(match) {
            console.warn(`[SANITIZE·DTW] Termo de plataforma '${match}' encontrado e substituído por [REDACTED]`);
            return '[REDACTED]';
        });
        return sanitized;
    }

    function walkAndSanitize(obj, depth) {
        if (obj === null || typeof obj !== 'object') return obj;

        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                obj[i] = walkAndSanitize(obj[i], depth);
            }
            return obj;
        }

        const currentSegment = pathSegments[depth];
        const reachedTarget  = (depth >= pathSegments.length);

        for (const key of Object.keys(obj)) {
            const value = obj[key];

            if (reachedTarget) {
                // dentro do caminho alvo – sanitizar strings
                if (typeof value === 'string') {
                    obj[key] = sanitizeString(value);
                } else if (typeof value === 'object' && value !== null) {
                    obj[key] = walkAndSanitize(value, depth);
                }
                // primitivos não string permanecem inalterados
            } else if (key === currentSegment) {
                obj[key] = walkAndSanitize(value, depth + 1);
            } else if (typeof value === 'object' && value !== null) {
                obj[key] = walkAndSanitize(value, depth);
            }
        }
        return obj;
    }

    if (inPlace) {
        // Modifica directamente o objecto original – ZERO CLONE, máxima performance
        walkAndSanitize(payload, 0);
        return payload;
    } else {
        // Comportamento legado: deep clone (mais pesado, mas mantém pureza)
        function deepCloneAndSanitize(obj, depth) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (Array.isArray(obj)) {
                return obj.map(function(item) { return deepCloneAndSanitize(item, depth); });
            }
            const clone = {};
            const currentSegment = pathSegments[depth];
            const reachedTarget  = (depth >= pathSegments.length);

            for (const key of Object.keys(obj)) {
                const value = obj[key];
                if (reachedTarget) {
                    if (typeof value === 'string') {
                        clone[key] = sanitizeString(value);
                    } else if (typeof value === 'object' && value !== null) {
                        clone[key] = deepCloneAndSanitize(value, depth);
                    } else {
                        clone[key] = value;
                    }
                } else if (key === currentSegment) {
                    clone[key] = deepCloneAndSanitize(value, depth + 1);
                } else {
                    clone[key] = (typeof value === 'object' && value !== null)
                        ? deepCloneAndSanitize(value, depth)
                        : value;
                }
            }
            return clone;
        }
        return deepCloneAndSanitize(payload, 0);
    }
};

// Alias de compatibilidade retroactiva
window.deepTreeWalkSanitizeBolt = window.deepTreeWalkSanitizePlatforms;

// ============================================================================
// COMUTAÇÃO BIDIRECIONAL PT/EN (padrão = 'pt')
// ============================================================================
window.initLanguageSwitcher = function() {
    // Define idioma padrão como português (nacionalização)
    if (!window.currentLang) {
        window.currentLang = 'pt';
    }

    // Referência para a função updateUI (será usada pelo forceTranslateUI)
    let _updateUI = function() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            if (el.hasAttribute('data-i18n-ignore')) return;
            const key = el.getAttribute('data-i18n');
            const translation = window.getTranslation(key, window.currentLang);
            if (translation && el.textContent !== translation) {
                el.textContent = translation;
            }
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            if (el.hasAttribute('data-i18n-ignore')) return;
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = window.getTranslation(key, window.currentLang);
            if (translation && el.placeholder !== translation) {
                el.placeholder = translation;
            }
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            if (el.hasAttribute('data-i18n-ignore')) return;
            const key = el.getAttribute('data-i18n-title');
            const translation = window.getTranslation(key, window.currentLang);
            if (translation && el.title !== translation) {
                el.title = translation;
            }
        });
        document.querySelectorAll('[data-i18n-value]').forEach(el => {
            if (el.hasAttribute('data-i18n-ignore')) return;
            const key = el.getAttribute('data-i18n-value');
            const translation = window.getTranslation(key, window.currentLang);
            if (translation && el.value !== translation) {
                el.value = translation;
            }
        });
        console.log(`[I18N] Interface actualizada para: ${window.currentLang.toUpperCase()} (elementos com data-i18n-ignore foram excluídos)`);
    };

    window.toggleLanguage = function(lang) {
        if (lang && (lang === 'pt' || lang === 'en')) {
            window.currentLang = lang;
        } else {
            // alternância padrão: se veio sem argumento, muda para o outro
            window.currentLang = window.currentLang === 'pt' ? 'en' : 'pt';
        }
        if (window.localStorage) {
            localStorage.setItem('unifed_language', window.currentLang);
        }
        _updateUI();
        document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: window.currentLang } }));
    };

    // Recupera idioma salvo, mas mantém 'pt' como padrão (não forçar inglês)
    if (window.localStorage && localStorage.getItem('unifed_language')) {
        const savedLang = localStorage.getItem('unifed_language');
        if (savedLang === 'pt' || savedLang === 'en') {
            window.currentLang = savedLang;
        }
    }

    // Executa a actualização inicial
    _updateUI();

    // MutationObserver com throttle reduzido para 50ms (UNIFED-TRANS-RET-10)
    let _updateUITimer = null;
    const observer = new MutationObserver(function() {
        if (_updateUITimer) return;
        _updateUITimer = setTimeout(function() {
            _updateUITimer = null;
            _updateUI();
        }, 50);  // ← alterado de 300 para 50 (retificação cirúrgica)
    });

    const staticContainers = document.querySelectorAll('.pure-section-header, .pure-sidebar');
    if (staticContainers.length > 0) {
        staticContainers.forEach(container => {
            observer.observe(container, { childList: true, subtree: true });
        });
        console.log(`[I18N] MutationObserver activo em ${staticContainers.length} contentor(es) estático(s).`);
    } else {
        console.warn('[I18N] Nenhum contentor .pure-section-header ou .pure-sidebar encontrado. Fallback para document.body com throttle.');
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Expor função de tradução síncrona para uso externo (ex: após _syncPureDashboard)
    window.forceTranslateUI = function() {
        console.log('[I18N] Tradução forçada síncrona executada.');
        _updateUI();
    };

    console.log('[I18N] Language switcher inicializado. Use window.toggleLanguage("pt") ou "en" para mudar. Padrão: PT.');
};

// ============================================================================
// INICIALIZAÇÃO AUTOMÁTICA
// ============================================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.initLanguageSwitcher();
    });
} else {
    window.initLanguageSwitcher();
}

console.log('[UNIFED-TRANSLATIONS] ✅ Módulo v13.5.6-NACIONALIZADO carregado (190+ chaves · Jurisprudência PT-PT · Deep Tree Walk optimizada com inPlace · Throttle 50ms)');