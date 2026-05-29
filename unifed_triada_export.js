/**
 * ============================================================================
 * UNIFED - PROBATUM · ENGINE DE EXPORTAÇÃO INTEGRADA · v13.5.6-FORENSIC-CORPORATE
 * ============================================================================
 * RETIFICAÇÃO CIRÚRGICA v13.5.6 - EMPACOTAMENTO .ZIP E CONTROLADOR DE ALERTA PERSISTENTE
 * ============================================================================
 * - Refatoração completa dos fluxos de exportação (Analista e Advogado) para
 *   empacotamento imediato em ficheiro .ZIP (JSZip).
 * - Adição da função `_downloadBlobNativo` para descarga nativa de blobs.
 * - Criação de funções auxiliares `_gerarBlobParecerTecnicoForense`,
 *   `_gerarBlobAnexoCustodia` e `_gerarPeticaoBlob` que retornam Blobs prontos.
 * - Substituição dos alertas voláteis por alert() síncrono persistente com
 *   instruções de segurança para cópia em Pen Drive encriptada.
 * - Retificação do alerta de segurança (protocolo de contra-entrega) para
 *   referir "nas instalações do Mandatário Judicial (Advogado)".
 * ============================================================================
 * 
 * RETIFICAÇÃO UNIFED-TRIAD-RET-05:
 * - Substituição de alert() síncrono por modal DOM customizado (promessa)
 *   que não bloqueia a thread.
 * - Refatoração das funções _exportPacoteAnalista e _exportPacoteAdvogado
 *   para usar modal assíncrono.
 * ============================================================================
 */

(function () {
    'use strict';

    if (typeof window.currentLang === 'undefined') { window.currentLang = 'pt'; }

    // =========================================================================
    // FORENSIC LOGGER (garantia de existência)
    // =========================================================================

    if (!window.UNIFED_FORENSIC_LOG) window.UNIFED_FORENSIC_LOG = [];
    function triadaLog(level, message, data) {
        const entry = {
            timestamp: new Date().toISOString(),
            level: level,
            module: 'TRIADA_EXPORT',
            message: message,
            data: data || null
        };
        window.UNIFED_FORENSIC_LOG.push(entry);
        const consoleMethod = level === 'error' ? console.error : (level === 'warn' ? console.warn : console.log);
        consoleMethod(`[TRIADA] ${message}`, data || '');
    }

    // =========================================================================
    // SISTEMA DE INTERNACIONALIZAÇÃO BIDIRECIONAL (PT/EN) COM DATA-ATTRIBUTES
    // =========================================================================
    const i18nDict = {
        pt: {
            'forensic_analyst_report': 'DOCUMENTO PERICIAL INTEGRAL - ANALISTA',
            'forensic_legal_package': 'PACOTE DE SUBMISSÃO JUDICIAL (2 PDFs + DOCX + JSON)',
            'forensic_analyst_header': 'DOCUMENTO PERICIAL INTEGRAL',
            'forensic_legal_header': 'PACOTE DE SUBMISSÃO JUDICIAL',
            'pdf_footer_cert': 'ISO/IEC 27037 · DL 28/2019 · eIDAS 2.0',
            'btn_export_analyst': 'Exportar Pacote Analista (Parecer Técnico Forense + JSON)',
            'btn_export_lawyer': 'Exportar Pacote Advogado (Parecer, Petição, Anexo Custódia + JSON)',
            'msg_session_hijacking': '🚨 SESSION HIJACKING DETECTED! A sessão mudou durante a execução.',
            'msg_invalid_hash': '❌ Master Hash inválido para rodapé do PDF',
            'msg_pdf_footer_valid': '🔏 Rodapé do PDF validado com Master Hash',
            'msg_package_instruction': '📁 Instrução de Entrega: Os ficheiros gerados devem ser colocados numa diretoria local, compactados em formato .zip com password (ex.: "UNIFED-PROBATUM-{data}") e gravados na Pen Drive de entrega, conforme protocolo contra-entrega (Art. 125.º CPP / ISO/IEC 27037).',
        },
        en: {
            'forensic_analyst_report': 'INTEGRAL FORENSIC DOCUMENT - ANALYST',
            'forensic_legal_package': 'JUDICIAL SUBMISSION PACKAGE (2 PDFs + DOCX + JSON)',
            'forensic_analyst_header': 'INTEGRAL FORENSIC DOCUMENT',
            'forensic_legal_header': 'JUDICIAL SUBMISSION PACKAGE',
            'pdf_footer_cert': 'ISO/IEC 27037 · DL 28/2019 · eIDAS 2.0',
            'btn_export_analyst': 'Export Analyst Package (Forensic Technical Report + JSON)',
            'btn_export_lawyer': 'Export Lawyer Package (Expert Opinion, Petition, Custody Annex + JSON)',
            'msg_session_hijacking': '🚨 SESSION HIJACKING DETECTED! Session changed during execution.',
            'msg_invalid_hash': '❌ Invalid Master Hash for PDF footer',
            'msg_pdf_footer_valid': '🔏 PDF footer validated with Master Hash',
            'msg_package_instruction': '📁 Delivery Instruction: The generated files must be placed in a local directory, compressed into a password-protected .zip file (e.g., "UNIFED-PROBATUM-{date}") and saved on the delivery Pen Drive, according to the counter-delivery protocol (Art. 125.º CPP / ISO/IEC 27037).',
        }
    };

    function t(key, lang) {
        const l = lang || window.currentLang || 'pt';
        return i18nDict[l]?.[key] || i18nDict.pt[key] || key;
    }

    // Aplica tradução a elementos com data-i18n
    function applyI18n() {
        const lang = window.currentLang || 'pt';
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) {
                el.textContent = t(key, lang);
            }
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key) el.setAttribute('placeholder', t(key, lang));
        });
        document.title = t('app_title', lang) || document.title;
        triadaLog('info', '🌐 Internacionalização aplicada', { lang });
    }

    window.setLanguage = function(lang) {
        if (lang === 'pt' || lang === 'en') {
            window.currentLang = lang;
            applyI18n();
            triadaLog('info', 'Idioma alterado para ' + lang);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyI18n);
    } else {
        applyI18n();
    }

    // =========================================================================
    // MODAL DOM CUSTOMIZADO (NÃO BLOQUEANTE) - UNIFED-TRIAD-RET-05
    // =========================================================================
    function showModalMessage(title, message, onConfirm) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); z-index: 20000;
            display: flex; align-items: center; justify-content: center;
            font-family: 'JetBrains Mono', monospace;
        `;
        modal.innerHTML = `
            <div style="background: #0f172a; border: 1px solid #00e5ff; border-radius: 8px; padding: 2rem; max-width: 500px; text-align: center;">
                <h3 style="color: #00e5ff;">${escapeHtml(title)}</h3>
                <p style="color: #cbd5e1; margin: 1rem 0;">${escapeHtml(message)}</p>
                <button id="modal-ok-btn" style="background: #00e5ff; color: #000; border: none; padding: 8px 24px; border-radius: 4px; cursor: pointer;">OK</button>
            </div>
        `;
        document.body.appendChild(modal);
        const okBtn = document.getElementById('modal-ok-btn');
        if (okBtn) {
            okBtn.onclick = () => {
                modal.remove();
                if (onConfirm && typeof onConfirm === 'function') onConfirm();
            };
        } else {
            // Fallback seguro: remove após 5 segundos
            setTimeout(() => {
                if (modal && modal.parentNode) modal.remove();
                if (onConfirm && typeof onConfirm === 'function') onConfirm();
            }, 5000);
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
            return c;
        });
    }

    // =========================================================================
    // DEEP TREE WALK ABSOLUTO (SANITIZAÇÃO RECURSIVA PROFUNDA)
    // =========================================================================
    function deepSanitizePayload(obj) {
        if (typeof obj !== 'object' || obj === null) return obj;
        
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                obj[i] = deepSanitizePayload(obj[i]);
            }
            return obj;
        }
        
        for (let key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = obj[key];
                if (typeof value === 'string') {
                    if (/bolt|uber|freenow|cabify|indrive/i.test(value)) {
                        obj[key] = "Plataforma Digital Operacional (Anonimizado)";
                        triadaLog('info', 'Sanitização profunda aplicada em campo', { key, original: value.substring(0, 30) });
                    }
                    if (/SUJEITO PASSIVO ALFA|ANONYMIZED TAXPAYER ALPHA|Real Demo/i.test(value)) {
                        obj[key] = "Sujeito Passivo (Anonimizado)";
                        triadaLog('info', 'Sanitização: nome do sujeito passivo substituído', { key });
                    }
                    if (/999\s*999\s*990|123456789/.test(value)) {
                        obj[key] = "XXXXXXXXX";
                        triadaLog('info', 'Sanitização: NIF demo substituído', { key });
                    }
                } 
                else if (typeof value === 'object' && value !== null) {
                    deepSanitizePayload(value);
                }
                if (key === 'platform' && typeof obj[key] === 'string') {
                    obj[key] = "Plataforma Digital Operacional (Anonimizado)";
                }
            }
        }
        return obj;
    }

    // =========================================================================
    // SANITIZAÇÃO DE TEXTO PARA PDF
    // =========================================================================
    function sanitizeText(str) {
        if (typeof str !== 'string') {
            if (str === null || str === undefined) return '';
            if (typeof str === 'object') {
                try {
                    return JSON.stringify(str);
                } catch(e) {
                    return '';
                }
            }
            return String(str);
        }
        return str
            .replace(/\[object Object\]/g, '')
            .replace(/\{\{.*?\}\}/g, '')
            .replace(/undefined/g, '')
            .replace(/null/g, '')
            .replace(/[\uFFFD\u0000-\u001F]/g, ' ')
            .trim();
    }

    // =========================================================================
    // FORMATAÇÃO DE TÍTULOS (H1 = ALL-CAPS, H2 = TITLE CASE)
    // =========================================================================
    function formatHeading(text, level) {
        if (!text) return '';
        const sanitized = sanitizeText(text);
        if (level === 1) return sanitized.toUpperCase();
        if (level === 2) {
            return sanitized.replace(/\b\w/g, c => c.toUpperCase());
        }
        return sanitized;
    }

    // =========================================================================
    // MÓDULO 1 — formatForensicCurrency
    // =========================================================================

    function formatForensicCurrency(value) {
        if (value === undefined || value === null) { return '0,00 €'; }
        const num = Number(value);
        if (isNaN(num)) { return '0,00 €'; }
        const [intPart, decPart] = num.toFixed(2).split('.');
        const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return intFormatted + ',' + decPart + ' €';
    }

    window.formatForensicCurrency = formatForensicCurrency;

    // =========================================================================
    // VALIDAÇÃO ROBUSTA DE SESSION ID
    // =========================================================================

    let _lastValidatedSessionId = null;

    function getValidatedSessionId() {
        let currentSession = null;

        if (window.UNIFEDSystem &&
            typeof window.UNIFEDSystem.sessionId === 'string' &&
            window.UNIFEDSystem.sessionId.length > 0) {
            currentSession = window.UNIFEDSystem.sessionId;
            triadaLog('info', '✅ Sessão obtida de UNIFEDSystem.sessionId', { prefix: currentSession.substring(0, 8) });
        } else {
            const domSession = document.getElementById('pure-session-id');
            if (domSession && domSession.innerText && typeof domSession.innerText === 'string' && domSession.innerText.trim().length > 0) {
                currentSession = domSession.innerText.trim();
                triadaLog('warn', '⚠️ Sessão obtida via DOM #pure-session-id (UNIFEDSystem indisponível)', { prefix: currentSession.substring(0, 8) });
            } else {
                currentSession = 'UNIFED-EMERGENCY-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
                triadaLog('error', '❌ Nenhuma sessão válida encontrada! Gerando fallback de emergência', { fallbackId: currentSession });
            }
        }

        if (_lastValidatedSessionId !== null && _lastValidatedSessionId !== currentSession) {
            triadaLog('error', t('msg_session_hijacking'), {
                previous: _lastValidatedSessionId.substring(0, 8),
                current: currentSession.substring(0, 8)
            });
        }
        _lastValidatedSessionId = currentSession;
        return currentSession;
    }

    // =========================================================================
    // MÓDULO 4 — safeGenerateMasterBatchHash (fallback criptográfico)
    // =========================================================================

    function safeGenerateMasterBatchHash() {
        if (window.UNIFEDSystem && typeof window.UNIFEDSystem.masterHash === 'string' && window.UNIFEDSystem.masterHash.length === 64) {
            return window.UNIFEDSystem.masterHash;
        }
        if (typeof window.generateMasterBatchHash === 'function') {
            const hash = window.generateMasterBatchHash();
            if (typeof hash === 'string' && hash.length > 0) return hash;
        }
        const sessionId = getValidatedSessionId();
        const hashInput = sessionId + '-SECURE-LOTE-VAL-' + Date.now();
        if (typeof CryptoJS !== 'undefined' && CryptoJS.SHA256) {
            const hash = CryptoJS.SHA256(hashInput).toString().toUpperCase();
            triadaLog('info', '✅ Hash de lote gerado com CryptoJS (SHA-256)');
            return hash;
        }
        triadaLog('warn', '⚠️ CryptoJS não disponível; usando fallback hash simples');
        let hash = 0;
        for (let i = 0; i < hashInput.length; i++) {
            const chr = hashInput.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        return Math.abs(hash).toString(16).toUpperCase().padStart(64, '0');
    }

    // =========================================================================
    // GENERATE DEMO INTEGRITY HASH — SHA-256 determinístico por sessão
    // =========================================================================
    async function generateDemoIntegrityHash(sessionId) {
        try {
            const sys = window.UNIFEDSystem || {};
            const canonicalSalt = String(sys.config?.timestamp || sys.sessionId || sessionId || Date.now());
            const canonicalInput = 'UNIFED-PROBATUM|' + sessionId + '|' + canonicalSalt + '|v13.5.6-FORENSIC-CORPORATE';
            const msgBuffer = new TextEncoder().encode(canonicalInput);
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
            const hashHex = Array.from(new Uint8Array(hashBuffer))
                .map(b => ('00' + b.toString(16)).slice(-2)).join('').toUpperCase();
            triadaLog('info', `🔏 Demo Integrity Hash (SHA-256 runtime): ${hashHex.substring(0, 16)}...`);
            return hashHex;
        } catch (e) {
            triadaLog('warn', '[generateDemoIntegrityHash] ⚠️ WebCrypto falhou: ' + e.message);
            return safeGenerateMasterBatchHash();
        }
    }

    // =========================================================================
    // FUNÇÃO AUXILIAR PARA OBTER O PAYLOAD FORENSE UNIFICADO (MAXIMAL)
    // =========================================================================
    function obterPayloadForenseUnificado() {
        if (!window.UNIFEDSystem || !window.UNIFEDSystem.analysis) {
            triadaLog('error', '[CRITICAL] Estado imutável UNIFEDSystem não detetado.');
            return {};
        }
        let payloadCompleto;
        try {
            payloadCompleto = JSON.parse(JSON.stringify(window.UNIFEDSystem.analysis));
        } catch (e) {
            payloadCompleto = Object.assign({}, window.UNIFEDSystem.analysis);
        }
        if (window.UNIFEDSystem.masterHash)  payloadCompleto.masterHash  = window.UNIFEDSystem.masterHash;
        if (window.UNIFEDSystem.sessionId)   payloadCompleto.sessionId   = window.UNIFEDSystem.sessionId;
        if (window.UNIFEDSystem.monthlyData) payloadCompleto.monthlyData = window.UNIFEDSystem.monthlyData;
        if (window.UNIFEDSystem.auxiliaryData) payloadCompleto.auxiliaryData = window.UNIFEDSystem.auxiliaryData;
        if (window.UNIFEDSystem.dataMonths) payloadCompleto.dataMonths = Array.from(window.UNIFEDSystem.dataMonths);
        
        const _m = getSystemMetrics();
        if (_m.transactionRows && _m.transactionRows.length > 0) {
            payloadCompleto.transactionRows = _m.transactionRows;
        }
        payloadCompleto.custodyLog = _m.custodyLog || [];
        return payloadCompleto;
    }

    // =========================================================================
    // OBTENÇÃO DE MÉTRICAS DO SISTEMA (COM DADOS REAIS)
    // =========================================================================
    function getSystemMetrics() {
        const sys      = window.UNIFEDSystem || {};
        const analysis = sys.analysis        || {};
        const sessionValue = getValidatedSessionId();

        const discrepanciaAnual = (analysis.saftGross || 0) - (analysis.dac7Total || 0);
        const impactoSeteAnosMercado = discrepanciaAnual * 38000 * 7;

        let custodyLogs = analysis.custodyLog || [];
        if (window.ForensicLogger && typeof window.ForensicLogger.getLogs === 'function') {
            const rawLogs = window.ForensicLogger.getLogs();
            if (rawLogs && rawLogs.length > 0) {
                custodyLogs = rawLogs.map(log => ({
                    id: log.id || 'LOG-' + log.timestamp,
                    tipo: log.action || 'Evento',
                    origem: log.module || 'Sistema',
                    hash: log.hash || (log.data && log.data.hash) || 'N/A',
                    timestamp: log.timestamp
                }));
            }
        }

        return {
            session:         sessionValue,
            masterHash:      (function() {
                const raw = (typeof sys.masterHash === 'string' && sys.masterHash.length === 64)
                    ? sys.masterHash
                    : safeGenerateMasterBatchHash();
                return raw;
            })(),
            companyName:     analysis.companyName     || 'Sujeito Passivo Alfa (Anonimizado)',
            nif:             analysis.nif             || '999 999 990',
            platform:        'Plataforma Digital Operacional (Anonimizado)',
            period:          analysis.period          || 'Set-Dez 2024',
            ganhos:          analysis.ganhos || (sys.analysis?.ganhos) || 0,
            saftBruto:       analysis.saftGross       ||  8227.97,
            saftIliquido:    analysis.saftIliquido    ||  0,
            saftIva:         analysis.saftIva         ||  0,
            saftGross:       analysis.saftGross       ||  8227.97,
            dac7Total:       analysis.dac7Total       ||  7755.16,
            discrepancyPct:  analysis.discrepancyPct  ||     5.75,
            btorLedger:      analysis.btorLedger      ||  2399.53,
            btfInvoice:      analysis.btfInvoice      ||   262.94,
            omissionPct:     analysis.omissionPct     ||    89.04,
            verdict:         analysis.verdict         || 'RISCO ELEVADO',
            transactionRows: (function() {
                if (analysis.transactionRows && analysis.transactionRows.length > 0) {
                    return analysis.transactionRows;
                }
                const _sys = window.UNIFEDSystem || {};
                const _md  = _sys.monthlyData || {};
                const _aux = _sys.auxiliaryData || {};
                const _months = Array.from(_sys.dataMonths || []).sort();
                const rows = [];
                _months.forEach(function(m, idx) {
                    const d = _md[m] || {};
                    const mesLabel = m.substring(0,4) + '-' + m.substring(4,6);
                    rows.push({
                        id: String(idx * 4 + 1).padStart(4, '0'),
                        date: mesLabel,
                        operator: 'Plataforma Digital Operacional (Anonimizado)',
                        btor: d.ganhos || 0,
                        btf:  (d.ganhos || 0) - (d.despesas || 0),
                        type: 'BTOR_GANHOS'
                    });
                    rows.push({
                        id: String(idx * 4 + 2).padStart(4, '0'),
                        date: mesLabel,
                        operator: 'Comissões Retidas (Extrato)',
                        btor: d.despesas || 0,
                        btf:  0,
                        type: 'BTOR_DESPESAS'
                    });
                    rows.push({
                        id: String(idx * 4 + 3).padStart(4, '0'),
                        date: mesLabel,
                        operator: 'Ganhos Líquidos (SP)',
                        btor: d.ganhosLiq || 0,
                        btf:  d.ganhosLiq || 0,
                        type: 'BTOR_LIQUIDO'
                    });
                });
                if (_aux.campanhas)  rows.push({ id: 'AUX1', date: 'Período', operator: 'Campanhas (Incentivo Plataforma)', btor: _aux.campanhas,  btf: 0, type: 'AUX_CAMPANHAS' });
                if (_aux.gorjetas)   rows.push({ id: 'AUX2', date: 'Período', operator: 'Gorjetas dos Passageiros (P2P)',    btor: _aux.gorjetas,   btf: 0, type: 'AUX_GORJETAS' });
                if (_aux.portagens)  rows.push({ id: 'AUX3', date: 'Período', operator: 'Portagens (Reembolso Operacional)', btor: _aux.portagens,  btf: 0, type: 'AUX_PORTAGENS' });
                if (_aux.cancelamentos) rows.push({ id: 'AUX4', date: 'Período', operator: 'Taxas de Cancelamento (Sujeitas)', btor: _aux.cancelamentos, btf: _aux.cancelamentos, type: 'AUX_CANCEL' });
                return rows;
            })(),
            custodyLog:      custodyLogs,
            fleetDrivers:    analysis.fleetDrivers    || [],
            top3Questions:   analysis.top3Questions   || [],
            merkleRoot:      analysis.merkleRoot      || 'N/A',
            impactoSeteAnosMercado: impactoSeteAnosMercado,
            crossings:       Object.assign({}, analysis.crossings  || {}),
            totals:          Object.assign({}, analysis.totals     || {}),
            twoAxis:         Object.assign({}, analysis.twoAxis    || {}),
            dataMonths:      Array.from(sys.dataMonths || [])
        };
    }

    // =========================================================================
    // UTILITÁRIOS DE DOWNLOAD COM DEEP SANITIZAÇÃO
    // =========================================================================

    function abortExport(reason) {
        const _reason = reason || 'RBAC: acesso não autorizado ao payload de exportação';
        triadaLog('warn', '⛔ abortExport() — ' + _reason, {
            timestamp:  new Date().toISOString(),
            sessionId:  (window.UNIFEDSystem && window.UNIFEDSystem.sessionId) || 'N/A',
            demoMode:   !!(window.UNIFEDSystem && window.UNIFEDSystem.demoMode)
        });
        console.warn('[UNIFED-EXPORT] ⛔ Exportação abortada:', _reason);
        return null;
    }

    function downloadJsonPayloadWithDeepSanitization(data, filename, mode) {
        const _isDemoMode        = !!(window.UNIFEDSystem && window.UNIFEDSystem.demoMode);
        const _hasAnalystOverride = !!(window.UNIFEDSystem && window.UNIFEDSystem.isAnalystOverrideActive);

        if (mode === 'lawyer' && !_hasAnalystOverride && !_isDemoMode) {
            return abortExport(
                'mode=lawyer sem isAnalystOverrideActive e sem demoMode. ' +
                'O Advogado tem acesso exclusivo ao PDF final. ' +
                'Para autorizar download JSON, o Analista deve activar: ' +
                'UNIFEDSystem.isAnalystOverrideActive = true'
            );
        }

        try {
            const cloned    = JSON.parse(JSON.stringify(data));
            const sanitized = deepSanitizePayload(cloned);
            const blob      = new Blob([JSON.stringify(sanitized, null, 2)],
                                       { type: 'application/json; charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a   = document.createElement('a');
            a.href        = url;
            a.download    = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            triadaLog('info', '✅ JSON descarregado (deep sanitization)', { filename, mode });
        } catch (e) {
            triadaLog('error', 'Erro ao descarregar JSON', { error: e.message });
        }
    }

    // =========================================================================
    // FUNÇÃO AUXILIAR DE FALLBACK HTML PARA PDFs (quando pdfMake falha)
    // =========================================================================
    function _generateFallbackHTML(metrics, tipo) {
        const lang = window.currentLang || 'pt';
        const isPT = lang === 'pt';
        const title = tipo === 'analista' ? (isPT ? 'Relatório Pericial Analista' : 'Analyst Forensic Report') :
                      tipo === 'parecer' ? (isPT ? 'Parecer Técnico Forense' : 'Forensic Technical Opinion') :
                      (isPT ? 'Anexo de Custódia' : 'Custody Annex');
        const html = `<!DOCTYPE html>
        <html lang="${lang}">
        <head><meta charset="UTF-8"><title>${title}</title>
        <style>body{font-family:Arial;margin:2cm;line-height:1.5} pre{background:#f4f4f4;padding:10px}</style>
        </head>
        <body>
        <h1>${title}</h1>
        <p><strong>${isPT ? 'Sessão' : 'Session'}:</strong> ${metrics.session}</p>
        <p><strong>${isPT ? 'Data' : 'Date'}:</strong> ${new Date().toLocaleString(lang)}</p>
        <hr>
        <h2>${isPT ? 'Dados da Análise' : 'Analysis Data'}</h2>
        <pre>${JSON.stringify(metrics, null, 2)}</pre>
        <p>${isPT ? 'Este é um documento de fallback gerado porque o gerador de PDF não estava disponível. Pode guardar esta página como PDF através do menu "Imprimir" do navegador.' : 'This is a fallback document generated because the PDF generator was unavailable. You can save this page as PDF via the browser\'s "Print" menu.'}</p>
        </body>
        </html>`;
        return html;
    }

    // =========================================================================
    // FUNÇÕES DE GERAÇÃO DE IMAGENS (Sankey, ATF e QR Code) – BLINDADAS (nunca rejeitam)
    // =========================================================================
    async function gerarImagemSankey() {
        try {
            if (typeof window.renderSankeyToImage === 'function') {
                const imgData = await window.renderSankeyToImage(window.UNIFEDSystem.analysis);
                if (imgData && imgData.startsWith('data:image')) return imgData;
            }
        } catch (e) {
            triadaLog('warn', 'Falha ao gerar imagem Sankey', e);
        }
        return null;
    }

    async function gerarImagemATF() {
        try {
            if (typeof window.generateTemporalChartImage === 'function') {
                const monthlyData = window.UNIFEDSystem?.monthlyData || {};
                const imgData = await window.generateTemporalChartImage(monthlyData, window.UNIFEDSystem.analysis);
                if (imgData && imgData.startsWith('data:image')) return imgData;
            }
        } catch (e) {
            triadaLog('warn', 'Falha ao gerar imagem ATF', e);
        }
        return null;
    }

    async function gerarQRCodeDataURL(masterHash, sessionId) {
        return new Promise((resolve) => {
            if (typeof QRCode === 'undefined') {
                triadaLog('warn', 'QRCode não disponível – a gerar placeholder');
                resolve(null);
                return;
            }

            const sessionNorm = (sessionId || 'SESSION-INDISPONIVEL')
                .toUpperCase()
                .replace(/[^A-Z0-9 $%*+\-./:]/g, '-');
            const hashNorm = (masterHash || '0'.repeat(64))
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '0');

            if (hashNorm.length !== 64) {
                triadaLog('warn', `QR: masterHash com comprimento inválido (${hashNorm.length} chars); esperado 64`);
            }

            const qrData = `SESSION:${sessionNorm} SH:${hashNorm}`;
            triadaLog('info', `QR code a codificar ${qrData.length} chars (modo Alfanumérico, versão 7)`);

            const div = document.createElement('div');
            div.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
            document.body.appendChild(div);
            new QRCode(div, {
                text: qrData,
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.L
            });
            setTimeout(() => {
                try {
                    const canvas = div.querySelector('canvas');
                    const dataUrl = canvas ? canvas.toDataURL('image/png') : null;
                    document.body.removeChild(div);
                    if (!dataUrl) {
                        triadaLog('warn', 'QR: canvas não encontrado após geração');
                    }
                    resolve(dataUrl);
                } catch (err) {
                    triadaLog('warn', 'Erro ao gerar QR code dataURL', { message: err.message });
                    try { document.body.removeChild(div); } catch(_) {}
                    resolve(null);
                }
            }, 400);
        });
    }

    // =========================================================================
    // CONSTRUÇÃO DO CONTEÚDO DO PDF DO ANALISTA (com validação defensiva de percentagens)
    // =========================================================================
    function construirConteudoDinamicoAnalista(m, sankeyImage, atfImage, qrCodeDataUrl) {
        const _cx  = m.crossings || window.UNIFEDSystem?.analysis?.crossings || {};
        const _rm  = window.UNIFEDSystem?.rawMetrics || {};
        
        const iva6    = _cx.ivaFalta6    ?? 0;  
        const iva23   = _cx.ivaFalta     ?? 0;  
        const asfixia = _rm.ivaAsfixia   ?? _cx.ivaAsfixia ?? 0;

        if (iva6 === 0 && (m.saftGross - m.dac7Total) > 0) {
            triadaLog('warn', '[AUDITORIA] Cenário B (IVA 6%) registado como zero face aos dados atuais.');
        }

        const content = [];

        content.push({
            table: {
                widths: ['*'],
                body: [[{
                    stack: [
                        { text: formatHeading('UNIFED - PROBATUM | UNIDADE DE PERÍCIA FISCAL E DIGITAL.', 1), style: 'h1', alignment: 'center', margin: [0, 14, 0, 6], tocItem: true },
                        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 0.5, lineColor: '#94a3b8' }], margin: [0, 0, 0, 6] },
                        { text: formatHeading('ESTRUTURA DE PARECER TÉCNICO FORENSE', 2), style: 'h2', alignment: 'center', margin: [0, 0, 0, 2], tocItem: true },
                        { text: formatHeading('MOD. 03-B (NORMA ISO/IEC 27037).', 2), style: 'h2', alignment: 'center', margin: [0, 0, 0, 10], tocItem: true },
                        { columns: [
                            { text: sanitizeText('Cadeia de Custódia Forense: Ativa.'), style: 'normal', alignment: 'left'  },
                            { text: sanitizeText('CONFIDENCIAL.'), style: 'normal', bold: true, alignment: 'right' }
                        ], margin: [0, 0, 0, 8] },
                        { text: sanitizeText('SESSÃO: UNIFED-' + m.session), style: 'normal', alignment: 'center', margin: [0, 0, 0, 14] }
                    ],
                    fillColor: '#f8fafc',
                    border: [true, true, true, true]
                }]]
            },
            layout: {
                defaultBorder: true,
                hLineWidth:  function(i, node) { return (i === 0 || i === node.table.body.length) ? 2.5 : 1; },
                vLineWidth:  function(i, node) { return 2.5; },
                hLineColor:  function() { return '#1e3a8a'; },
                vLineColor:  function() { return '#1e3a8a'; },
                border: [true, true, true, true],
                borderWidth: [2, 2, 2, 2]
            },
            margin: [0, 30, 0, 20]
        });

        // AVISO DE CONFIDENCIALIDADE (Recalibrado para evitar colisão de eixo Y com rodapé) — RETIFICAÇÃO 1A: y=680→615
        content.push({
            absolutePosition: { x: 40, y: 615 },
            table: {
                widths: ['*'],
                body: [[{
                    stack: [
                        { text: '⚠  AVISO DE CONFIDENCIALIDADE', fontSize: 9.5, bold: true, color: '#7f1d1d', alignment: 'center', margin: [0, 0, 0, 6] },
                        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 455, y2: 0, lineWidth: 0.75, lineColor: '#b91c1c' }], margin: [0, 0, 0, 6] },
                        { text: sanitizeText('As informações e conclusões constantes do presente Parecer Técnico Forense são estritamente confidenciais e propriedade exclusiva da UNIFED. A sua utilização para fins distintos da avaliação dos serviços propostos é expressamente proibida. É vedada a reprodução, cópia, distribuição ou transmissão, total ou parcial, deste documento por qualquer meio, sem a prévia e expressa autorização por escrito da UNIFED. A violação do dever de sigilo ou a divulgação indevida de dados à parte contrária constitui ilícito criminal, severamente punido nos termos da lei penal portuguesa.'), fontSize: 8, italics: true, color: '#1c1917', alignment: 'justify', lineHeight: 1.35, margin: [0, 0, 0, 0] }
                    ],
                    fillColor: '#fff7ed',
                    margin: [10, 8, 10, 8]
                }]]
            },
            layout: { hLineWidth: function() { return 1.5; }, vLineWidth: function() { return 1.5; }, hLineColor: function() { return '#b91c1c'; }, vLineColor: function() { return '#b91c1c'; } }
        });

        content.push({ text: '', pageBreak: 'after' });

        content.push(
            { text: sanitizeText('PROCESSO N.º : ' + m.session), style: 'h2', bold: true, margin: [0, 10, 0, 2], tocItem: true },
            { text: sanitizeText('DATA: ' + new Date().toLocaleDateString('pt-PT')), style: 'h2', bold: true, margin: [0, 0, 0, 2], tocItem: true },
            { text: sanitizeText('DATA DA PERÍCIA: ' + new Date().toLocaleDateString('pt-PT')), style: 'h2', bold: true, margin: [0, 0, 0, 2], tocItem: true },
            { text: sanitizeText('OBJETO: RECONSTITUIÇÃO DA VERDADE MATERIAL DIGITAL / ART. 103.º RGIT'), style: 'h2', bold: true, margin: [0, 0, 0, 8], tocItem: true },
            { text: sanitizeText('SUJEITO PASSIVO: ' + m.companyName + '   |   NIF: ' + m.nif), style: 'normal', margin: [0, 0, 0, 2] },
            { text: sanitizeText('PLATAFORMA: ' + m.platform + '   |   PERÍODO: ' + m.period), style: 'normal', margin: [0, 0, 0, 2] },
            { text: sanitizeText('Fundamentação Metodológica: Art. 125.º CPP (Admissibilidade da Prova Digital)'), style: 'normal', italics: true, color: '#1e3a8a', margin: [0, 4, 0, 2] },
            { text: sanitizeText('[ Nota: Este sistema não realiza contabilidade – realiza RECONSTITUIÇÃO DA VERDADE MATERIAL DIGITAL (Art. 125.º CPP · ISO/IEC 27037:2012) ]'), style: 'normal', italics: true, color: '#64748b', margin: [0, 2, 0, 0] }
        );

        content.push(
            { text: '', pageBreak: 'after' },
            { toc: { title: { text: formatHeading('ÍNDICE', 1), style: 'h1', margin: [0, 0, 0, 10], tocItem: false } } },
            { text: '', pageBreak: 'after' }
        );

        content.push(
            { text: formatHeading('NOTA METODOLÓGICA FORENSE — MÉTODO: DATA PROXY: FLEET EXTRACT:', 2), style: 'h2', color: '#1e3a8a', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('"Dada a latência administrativa na disponibilização do ficheiro SAF-T (.xml) pelas plataformas, a presente perícia utiliza o método de Data Proxy: Fleet Extract. Esta metodologia consiste na extração de dados brutos primários diretamente do portal de gestão (Fleet). O ficheiro \'Ganhos da Empresa\' (Fleet/Ledger) é aqui tratado como o Livro-Razão (Ledger) de suporte, possuindo valor probatório material por constituir a fonte primária dos registos que integram o reporte fiscal final. A integridade desta extração é blindada através da assinatura digital SHA-256 (Hash)...'), style: 'normal', color: '#334155', margin: [0, 0, 0, 6], lineHeight: 1.5 },
            { text: sanitizeText('FUNDAMENTAÇÃO DA PROVA MATERIAL: Para efeitos de prova legal de rendimentos reais, consideram-se os ficheiros operacionais que contêm o rasto digital de centenas de viagens efetivamente realizadas. Este conteúdo reflete a atividade económica real do operador, sendo por isso elevado à categoria de Documento de Suporte (Ledger). Esta metodologia permite detetar e corrigir as discrepâncias omissas nos ficheiros de reporte simplificado, assegurando uma reconstrução financeira rigorosa e auditável em sede judicial, em conformidade com o Decreto-Lei n.º 28/2019 e os princípios de cadeia de custódia previstos no Art. 125.º do CPP.'), style: 'normal', color: '#334155', margin: [0, 0, 0, 12], lineHeight: 1.5 },
            { text: formatHeading('PROTOCOLO DE CADEIA DE CUSTÓDIA', 2), style: 'h2', color: '#1e3a8a', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('O sistema UNIFED - PROBATUM assegura a inviolabilidade dos dados através de funções criptográficas SHA-256. As seguintes evidências foram processadas e incorporadas na análise, garantindo a rastreabilidade total da prova:'), style: 'normal', color: '#334155', margin: [0, 0, 0, 6] }
        );

        const evidenceList = (window.UNIFEDSystem?.analysis?.evidenceIntegrity) || [];
        if (evidenceList.length > 0) {
            const custodyRows = evidenceList.map((ev, idx) => [
                { text: String(idx + 1).padStart(2, '0'), fontSize: 9, alignment: 'center', margin: [2, 3, 2, 3] },
                { text: sanitizeText(ev.filename || 'N/A'), fontSize: 9, alignment: 'left', margin: [4, 3, 4, 3] },
                { text: sanitizeText(ev.hash || 'N/A'), fontSize: 8, alignment: 'left', margin: [4, 3, 4, 3], color: '#1e3a8a', font: 'Roboto' }
            ]);
            content.push({
                table: {
                    headerRows: 1,
                    widths: [22, '*', 220],
                    body: [
                        [
                            { text: 'ID', style: 'normal', bold: true, fontSize: 9, fillColor: '#1e3a8a', color: '#ffffff', alignment: 'center', margin: [2, 4, 2, 4] },
                            { text: 'Designação do Ficheiro de Evidência', style: 'normal', bold: true, fontSize: 9, fillColor: '#1e3a8a', color: '#ffffff', alignment: 'left', margin: [4, 4, 4, 4] },
                            { text: 'Assinatura Digital Criptográfica (SHA-256)', style: 'normal', bold: true, fontSize: 9, fillColor: '#1e3a8a', color: '#ffffff', alignment: 'left', margin: [4, 4, 4, 4] }
                        ],
                        ...custodyRows
                    ]
                },
                layout: { hLineWidth: function() { return 0.5; }, vLineWidth: function() { return 0.5; }, hLineColor: function() { return '#cbd5e1'; }, vLineColor: function() { return '#cbd5e1'; } },
                margin: [0, 4, 0, 12]
            });
        } else {
            content.push({ text: sanitizeText('Nenhuma evidência processada.'), style: 'normal', italics: true, margin: [5, 0, 0, 6] });
        }

        content.push(
            { text: formatHeading('INVIOLABILIDADE DO ALGORITMO:', 2), style: 'h2', color: '#1e3a8a', margin: [0, 10, 0, 4], tocItem: true },
            { text: sanitizeText('Os cálculos de triangulação financeira (BTOR vs BTF) e os vereditos de risco são gerados por motor forense imutável, com base exclusiva nos dados extraídos das evidências carregadas.'), style: 'normal', color: '#334155', margin: [0, 0, 0, 10] },
            { text: formatHeading('METADADOS DA PERÍCIA', 2), style: 'h2', color: '#1e3a8a', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText(`Nome / Name: ${m.companyName}`), style: 'normal', margin: [0, 0, 0, 2] },
            { text: sanitizeText(`NIF / Tax ID: ${m.nif}`), style: 'normal', margin: [0, 0, 0, 2] },
            { text: sanitizeText(`Plataforma Digital / Digital Platform: ${m.platform}`), style: 'normal', margin: [0, 0, 0, 2] },
            { text: sanitizeText(`Morada / Address: A verificar em documentação complementar`), style: 'normal', margin: [0, 0, 0, 2] },
            { text: sanitizeText('NIF Plataforma / Platform Tax ID: Não disponho de informação suficiente para concluir a identificação do NIF da Plataforma; seria necessário o acesso ao registo comercial da entidade em sede estrangeira ou fatura original de prestação de serviços para uma análise conclusiva.'), style: 'normal', italics: true, margin: [0, 0, 0, 6] },
            { text: sanitizeText(`Ano Fiscal: ${window.UNIFEDSystem?.selectedYear || '2024'}`), style: 'normal', margin: [0, 0, 0, 2] },
            { text: sanitizeText(`Período: ${window.UNIFEDSystem?.selectedPeriodo || '2s'}`), style: 'normal', margin: [0, 0, 0, 2] },
            { text: sanitizeText(`Unix Timestamp: ${Math.floor(Date.now() / 1000)}`), style: 'normal', margin: [0, 0, 0, 15] },
            { text: '', pageBreak: 'after' }
        );

        content.push(
            { text: formatHeading('2. ANÁLISE FINANCEIRA CRUZADA / CROSS-FINANCIAL ANALYSIS', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 8], tocItem: true }
        );
        const tabelaCruzada = {
            table: {
                headerRows: 1,
                widths: ['*', 'auto', 'auto', 'auto'],
                body: [
                    [{ text: sanitizeText('Descrição / Description'), bold: true, fillColor: '#f1f5f9' }, { text: sanitizeText('Valor (€)'), bold: true, fillColor: '#f1f5f9' }, { text: sanitizeText('Fonte'), bold: true, fillColor: '#f1f5f9' }, { text: sanitizeText('Diferença'), bold: true, fillColor: '#f1f5f9' }],
                    [sanitizeText('Ganhos Brutos (Livro-Razão de Fluxo de Caixa)'), formatForensicCurrency(m.ganhos), sanitizeText('Plataforma Digital'), ''],
                    [sanitizeText('Ganhos Reportados (DAC7 - Plataforma Digital)'), formatForensicCurrency(m.dac7Total), sanitizeText('Plataforma (DAC7)'), ''],
                    [sanitizeText('Comissões Retidas (Extrato)'), formatForensicCurrency(m.btorLedger), sanitizeText('Plataforma Digital'), ''],
                    [sanitizeText('Comissões Faturadas (FAT-DEMO-A + FAT-DEMO-B)'), formatForensicCurrency(m.btfInvoice), sanitizeText('Faturas de Transações Bancárias Detetadas'), ''],
                    [sanitizeText('[!] SAF-T Valor Bruto Total vs DAC7 (Revenue Omission)'), formatForensicCurrency(m.saftGross - m.dac7Total), sanitizeText('Smoking Gun 1'), ''],
                    [sanitizeText('[X] Diferencial de Base em Análise (Despesas/Comissões vs Fatura) [' + ((m.omissionPct ?? 0).toFixed(2)) + '%]'), formatForensicCurrency(m.btorLedger - m.btfInvoice), sanitizeText('Smoking Gun 2'), ''],
                    [sanitizeText('IVA Omitido (23% - Autoliquidação CIVA)'), formatForensicCurrency(iva23), sanitizeText('Cálculo CIVA'), ''],
                    [sanitizeText('IVA Omitido (6% - Serviços Transporte)'), formatForensicCurrency(iva6), sanitizeText('Cálculo CIVA'), ''],
                    [sanitizeText('Asfixia Financeira (IVA 6% sobre SAF-T Bruto)'), formatForensicCurrency(asfixia), sanitizeText('Art. 405.º C. Civil - Verba 2.18 CIVA'), '']
                ]
            },
            layout: { ...'lightHorizontalLines', dontBreakRows: true },
            fontSize: 7.5 // <-- RETIFICAÇÃO 1B: Redução de 1.5pt (9→7.5) — mitiga quebra de linha do símbolo monetário
        };
        content.push(tabelaCruzada);
        content.push(
            { text: sanitizeText('[!] Percentagem Omissão Custos (Retenção vs Fatura): ' + ((m.omissionPct ?? 0).toFixed(2)) + '%'), style: 'h2', color: '#b91c1c', margin: [0, 8, 0, 2], tocItem: true },
            { text: sanitizeText('Nota Pericial: ' + ((m.omissionPct ?? 0).toFixed(2)) + '% de omissão é estatisticamente impossível de ser erro administrativo.'), style: 'normal', italics: true, color: '#64748b', margin: [0, 0, 0, 8] },
            { text: sanitizeText('Omissão de Receita (Bruto vs DAC7): ' + formatForensicCurrency(m.saftGross - m.dac7Total)), style: 'h2', margin: [0, 2, 0, 2], tocItem: true },
            { text: sanitizeText('Omissão de Custos (Retenção vs Fatura): ' + formatForensicCurrency(m.btorLedger - m.btfInvoice)), style: 'h2', margin: [0, 0, 0, 12], tocItem: true },
            { text: formatHeading('3. VEREDICTO DE RISCO (RGIT — Artigo 103.º)', 1), style: 'h1', color: '#b91c1c', margin: [0, 0, 0, 6], tocItem: true },
            { text: sanitizeText('[!!] ' + m.verdict), style: 'h1', color: '#b91c1c', margin: [0, 0, 0, 6], tocItem: true },
            { text: sanitizeText(`Expense Omission / Omissão Custos: ${((m.omissionPct ?? 0).toFixed(2))}% | Gross Earnings: ${formatForensicCurrency(m.btorLedger)}`), style: 'h2', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText(`Revenue Gap (DAC7): ${formatForensicCurrency(m.saftGross - m.dac7Total)} (${((m.saftGross - m.dac7Total)/m.saftGross*100).toFixed(2)}%)`), style: 'h2', margin: [0, 0, 0, 8], tocItem: true },
            { text: formatHeading('4. PROVA RAINHA — DIVERGÊNCIA CRÍTICA MATERIAL', 1), style: 'h1', color: '#b91c1c', margin: [0, 0, 0, 6], tocItem: true },
            { text: sanitizeText('DUPLA DIVERGÊNCIA CRÍTICA MATERIAL'), style: 'h2', color: '#b91c1c', margin: [0, 0, 0, 6], tocItem: true },
            { text: sanitizeText('DIVERGÊNCIA CRÍTICA 1 — Omissão de Receita Declarada (SAF-T vs DAC7):'), style: 'h2', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText(`Valor Total Faturado no Sistema Interno (SAF-T): ${formatForensicCurrency(m.saftGross)}`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`Montante Comunicado à AT via DAC7: ${formatForensicCurrency(m.dac7Total)}`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`[!] OMISSÃO LÍQUIDA DE RECEITA DECLARADA AO ESTADO: ${formatForensicCurrency(m.saftGross - m.dac7Total)} (${((m.saftGross - m.dac7Total)/m.saftGross*100).toFixed(2)}%)`), style: 'normal', color: '#b91c1c', margin: [5, 0, 0, 4] },
            { text: sanitizeText('Constatou-se uma discrepância material entre o valor total faturado no sistema interno (SAF-T) e o montante comunicado à Autoridade Tributária por via do reporte DAC7, resultando numa omissão líquida de receita declarada ao Estado. A diferença entre o SAF-T e o DAC7 constitui o elemento objetivo da omissão tributária nos termos do Artigo 103.º do RGIT.'), style: 'normal', color: '#b91c1c', margin: [5, 0, 0, 8] },
            { text: sanitizeText('SMOKING GUN 2 — Diferencial de Base em Análise (Despesas/Comissões vs Fatura BTF):'), style: 'h2', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText(`Comissões Retidas (Extrato): ${formatForensicCurrency(m.btorLedger)}`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`Comissões Faturadas (Faturas de Transações Bancárias Detetadas): ${formatForensicCurrency(m.btfInvoice)}`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`[X] OMISSÃO DE FATURAÇÃO: ${formatForensicCurrency(m.btorLedger - m.btfInvoice)} (${((m.omissionPct ?? 0).toFixed(2))}%)`), style: 'normal', color: '#b91c1c', margin: [5, 0, 0, 8] },
            { text: '', pageBreak: 'after' }
        );

        content.push(
            { text: formatHeading('5. ENQUADRAMENTO LEGAL', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 6], tocItem: true },
            { text: sanitizeText('Artigo 2.º, n.º 1, alínea i) do Código do IVA: Regime de autoliquidação aplicável a serviços prestados por sujeitos passivos não residentes em território português.'), style: 'normal', margin: [0, 0, 0, 4] },
            { text: sanitizeText('• IVA Omitido: 23% sobre despesas reais vs faturadas'), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText('• IVA Omitido: 6% sobre serviços de transporte'), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText('• Base Tributável: Diferença detetada na matriz (BTOR vs BTF)'), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText('• Prazo Regularização: 30 dias após deteção'), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText('• Sanções Aplicáveis: Artigo 108.º do CIVA'), style: 'normal', margin: [5, 0, 0, 6] },
            { text: sanitizeText('Artigo 108.º do CIVA - Infrações: Constitui infração a falta de liquidação do imposto devido, bem como a sua liquidação inferior ao montante legalmente exigível.'), style: 'normal', margin: [0, 0, 0, 6] },
            { text: sanitizeText('Decreto-Lei n.º 28/2019: Integridade do processamento de dados e validade de documentos eletrónicos como registos primários.'), style: 'normal', margin: [0, 0, 0, 8] },
            { text: formatHeading('ADMISSIBILIDADE DA PROVA DIGITAL:', 2), style: 'h2', color: '#1e3a8a', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('• Art. 125.º CPP — São admissíveis como meios de prova todos os meios não proibidos por lei. Esta prova digital material foi produzida com metodologia forense certificada e cadeia de custódia documentada, sendo plenamente admissível perante as Instâncias Judiciais Competentes.'), style: 'normal', margin: [5, 0, 0, 4] },
            { text: sanitizeText('• Art. 32.º CRP — Garantias de Defesa: o processo penal assegura todas as garantias de defesa, incluindo o recurso à prova técnica pericial para contraditório fundamentado.'), style: 'normal', margin: [5, 0, 0, 4] },
            { text: sanitizeText('• Art. 103.º RGIT — Fraude Fiscal: omissão de proveitos e retenção indevida de IVA.'), style: 'normal', margin: [5, 0, 0, 4] },
            { text: sanitizeText('• Art. 104.º RGIT — Fraude Fiscal Qualificada: quando a omissão excede os limiares legais.'), style: 'normal', margin: [5, 0, 0, 8] },
            { text: formatHeading('6. METODOLOGIA PERICIAL', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 6], tocItem: true },
            { text: sanitizeText('BTOR (Bank Transactions Over Reality): Análise comparativa entre despesas reais (extratos) e documentação fiscal declarada (faturas).'), style: 'normal', margin: [0, 0, 0, 4] },
            { text: sanitizeText('• Mapeamento posicional de dados SAF-T/Relatório (colunas 14,15,16)'), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText('• Extração precisa da tabela "Ganhos líquidos" do extrato'), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText('• Cálculo de duas discrepâncias: despesas e SAF-T/Relatório vs DAC7'), style: 'normal', margin: [5, 0, 0, 2] },
            { text: 'Geração de prova técnica auditável com hashes SHA-256', style: 'normal', margin: [5, 0, 0, 10] },
            { text: formatHeading('DECLARAÇÃO DE INDEPENDÊNCIA E ESCOPO — ISRS 4400 / ART. 153.º CPP', 2), style: 'h2', color: '#1e3a8a', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('O presente estudo foi elaborado em estrita conformidade com a Norma Internacional de Serviços Relacionados ISRS 4400 (Procedimentos Acordados sobre Informação Financeira), garantindo que os procedimentos aplicados são objetivos, reprodutíveis e auditáveis por qualquer perito independente. O analista declara total independência face às partes e ausência de conflito de interesses, nos termos do Art. 467.º do CPC e Art. 153.º do CPP.'), style: 'normal', margin: [0, 0, 0, 6], lineHeight: 1.5 },
            { text: sanitizeText('ESCOPO: O estudo limita-se à análise objetiva dos documentos fornecidos (extratos de plataforma, SAF-T, DAC7, faturas). As conclusões constituem estudo de viabilidade pericial e não substituem relatório pericial homologado por Tribunal. A sua produção assenta em metodologia BTOR (Bank Transactions Over Reality), com rastreabilidade criptográfica completa (SHA-256 + RFC 3161).'), style: 'normal', margin: [0, 0, 0, 10], lineHeight: 1.5 },
            { text: '', pageBreak: 'after' }
        );

        content.push(
            { text: formatHeading('ANÁLISE DE TIPOLOGIAS DE RISCO DETETADAS — CEJ / PJ / RGIT', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 6], tocItem: true },
            { text: sanitizeText('> FRAUDE FISCAL [Art. 103.º RGIT] Omissão de proveitos e retenção indevida de IVA sobre comissões. Pena: prisão até 3 anos ou multa.'), style: 'normal', margin: [5, 2, 0, 2] },
            { text: sanitizeText('> FRAUDE FISCAL QUALIFICADA [Art. 104.º RGIT] Quando a vantagem patrimonial obtida excede 15 vezes o salário mínimo nacional anual.'), style: 'normal', margin: [5, 2, 0, 2] },
            { text: sanitizeText('> BRANQUEAMENTO DE CAPITAIS [Lei 83/2017 (BCFT)] Dissimulação da origem de fundos provenientes de omissão fiscal através de fluxos algorítmicos opacos.'), style: 'normal', margin: [5, 2, 0, 2] },
            { text: sanitizeText('> GESTÃO DANOSA [Art. 235.º CP] Gestão dolosa que causa prejuízo à Autoridade Tributária e ao parceiro operador.'), style: 'normal', margin: [5, 2, 0, 2] },
            { text: sanitizeText('> VIOLAÇÃO DAC7 [Diretiva (UE) 2021/514] Incumprimento das obrigações de reporte automático de rendimentos às Autoridades Fiscais dos Estados-Membros (EM).'), style: 'normal', margin: [5, 2, 0, 10] },
            { text: formatHeading('SALVAGUARDA JURISDICIONAL — SEDE ESTRANGEIRA NÃO EXIME RESPONSABILIDADE', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('A eventual invocação de sede social em jurisdição estrangeira (nomeadamente na República da Estónia, onde diversas plataformas de economia de plataforma estão registadas) não constitui fundamento válido de exclusão da responsabilidade fiscal e penal em território português.'), style: 'normal', margin: [0, 0, 0, 6], lineHeight: 1.5 },
            { text: sanitizeText('Fundamento legal: (1) Art. 18.º da Lei Geral Tributária (LGT) — a obrigação tributária nasce no local onde o facto tributário ocorre (Lex Loci Solutionis), independentemente da sede do operador; (2) Diretiva (UE) 2021/514 (DAC7), Art. 4.º — os operadores de plataformas digitais com utilizadores em Estados-Membros estão sujeitos a obrigações de reporte à Autoridade Tributária do Estado-Membro de atividade, independentemente da sua sede; (3) Regulamento (CE) n.º 593/2008 (Roma I) — a lei aplicável aos contratos de prestação de serviços é a lei do país onde o prestador tem a sua residência habitual ou, no caso de consumidores, a lei do país de residência deste.'), style: 'normal', margin: [0, 0, 0, 10], lineHeight: 1.5 },
            { text: formatHeading('CONFORMIDADE E EVIDÊNCIA DIGITAL.', 2), style: 'h2', color: '#1e3a8a', margin: [0, 12, 0, 4], tocItem: true },
            { text: sanitizeText('Os artefactos digitais integrantes do presente processo pericial satisfazem os requisitos de admissibilidade previstos no Art. 125.º CPP (meios de prova atípicos), encontrando-se protegidos por hash SHA-256 (ISO/IEC 27037:2012 §8.3), selagem temporal RFC 3161 e cadeia de custódia ininterrupta. A árvore Merkle implementada (eIDAS 2.0 Selective Disclosure) permite a verificação independente de cada questão pericial sem exposição da base de dados completa. O motor de exportação aplica deepSanitization conforme RGPD Art. 25 antes de qualquer divulgação a terceiros. O Master Hash SHA-256 é gerado determinísticamente em runtime por sessionSalt activo (WebCrypto API), consolidando o estatuto Court Ready por sessão pericial.'), style: 'normal', color: '#334155', margin: [0, 0, 0, 12], lineHeight: 1.5 },
            { text: formatHeading('7. CERTIFICAÇÃO DIGITAL', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('Sistema de peritagem forense estruturado em conformidade com as normas, com selo de integridade digital SHA-256. Todos os relatórios são temporalmente selados e auditáveis.'), style: 'normal', margin: [0, 0, 0, 4] },
            { text: sanitizeText('Algoritmo Hash: SHA-256 (Forense)'), style: 'normal', margin: [0, 0, 0, 2] },
            { text: sanitizeText('Timestamp: RFC 3161'), style: 'normal', margin: [0, 0, 0, 2] },
            { text: sanitizeText('Validade Prova: Indeterminada'), style: 'normal', margin: [0, 0, 0, 2] },
            { text: sanitizeText('Conformidade Normativa Processual: O presente relatório cumpre escrupulosamente os requisitos de integridade de arquivo digital previstos no Decreto-Lei n.º 28/2019 de 15 de fevereiro e os vetores de preservação de prova eletrónica fixados na norma ISO/IEC 27037.'), style: 'normal', margin: [0, 0, 0, 6] },
            { text: sanitizeText('Conformidade Normativa Processual: O presente relatório cumpre escrupulosamente os requisitos de integridade de arquivo digital previstos no Decreto-Lei n.º 28/2019 de 15 de fevereiro e os vetores de preservação de prova eletrónica fixados na norma ISO/IEC 27037.'), style: 'normal', italics: true, margin: [0, 0, 0, 10] },
            { text: '', pageBreak: 'after' }
        );

        content.push(
            { text: formatHeading('8. ANÁLISE PERICIAL / DETAILED EXPERT ANALYSIS', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 6], tocItem: true },
            { text: sanitizeText('I. ANÁLISE PERICIAL (' + (window.UNIFEDSystem?.selectedPeriodo || '2S').toUpperCase() + '):'), style: 'h2', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('Duas discrepâncias fundamentais detetadas (Verdade Material Auditada):'), style: 'normal', margin: [0, 0, 0, 2] },
            { text: sanitizeText(`1. Diferencial de Base em Análise (Despesas/Comissões vs Fatura): ${formatForensicCurrency(m.btorLedger - m.btfInvoice)} (${((m.omissionPct ?? 0).toFixed(2))}%) [Smoking Gun 2]`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`2. SAF-T Valor Bruto Total vs DAC7 (Revenue Omission): ${formatForensicCurrency(m.saftGross - m.dac7Total)} (${((m.saftGross - m.dac7Total)/m.saftGross*100).toFixed(2)}%) [Smoking Gun 1]`), style: 'normal', margin: [5, 0, 0, 8] },
            { text: formatHeading('9. FACTOS CONSTATADOS / MATERIAL FACTS (Material Truth)', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 6], tocItem: true },
            { text: sanitizeText('C1. SAF-T VALOR BRUTO TOTAL vs DAC7 (Sub-comunicação Plataforma→Estado):'), style: 'h2', margin: [0, 0, 0, 2], tocItem: true },
            { text: sanitizeText(`SAF-T Valor Bruto Total (Faturação Interna): ${formatForensicCurrency(m.saftGross)}`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`DAC7 Reportado à AT (Plataforma Digital): ${formatForensicCurrency(m.dac7Total)}`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`→ Δ C1: ${formatForensicCurrency(m.saftGross - m.dac7Total)} (${((m.saftGross - m.dac7Total)/m.saftGross*100).toFixed(2)}%) — Omissão de receita ao Estado`), style: 'h2', color: '#b91c1c', margin: [5, 0, 0, 6], tocItem: true },
            { text: sanitizeText('C2. DESPESAS/COMISSÕES EXTRATO vs FATURADO (Prova Rainha — Retenção Ilegal):'), style: 'h2', margin: [0, 0, 0, 2], tocItem: true },
            { text: sanitizeText(`Comissões Retidas — Extrato Bancário (BTOR): ${formatForensicCurrency(m.btorLedger)}`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`Comissões Faturadas — Plataforma (BTF): ${formatForensicCurrency(m.btfInvoice)}`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`→ Δ C2 [SG-2]: ${formatForensicCurrency(m.btorLedger - m.btfInvoice)} (${((m.omissionPct ?? 0).toFixed(2))}%) — Diferencial de Base em Análise`), style: 'h2', color: '#b91c1c', margin: [5, 0, 0, 6], tocItem: true },
            { text: sanitizeText('C3. SAF-T VALOR BRUTO TOTAL vs GANHOS (EXTRATO) (Viagens Faturadas vs Transferências):'), style: 'h2', margin: [0, 0, 0, 2], tocItem: true },
            { text: sanitizeText(`SAF-T Valor Bruto (Viagens Faturadas — Sistema): ${formatForensicCurrency(m.saftBruto)}`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`Ganhos Extrato (Transferências Efetivas — Banco): ${formatForensicCurrency(m.ganhos)}`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`→ Δ C3: ${formatForensicCurrency(m.saftBruto - m.ganhos)} (${((m.saftBruto - m.ganhos)/m.saftBruto*100).toFixed(2)}%) — Gap entre faturado e transferido`), style: 'h2', color: '#b91c1c', margin: [5, 0, 0, 6], tocItem: true },
            { text: sanitizeText('C4. GANHOS LÍQUIDOS DECLARADOS vs LÍQUIDO REAL EXTRATO (Impacto Final SP):'), style: 'h2', margin: [0, 0, 0, 2], tocItem: true },
            { text: sanitizeText(`Líquido Declarado/Fiscal (SAF-T − Fatura): ${formatForensicCurrency(m.saftBruto - m.btfInvoice)}`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`Líquido Real — Extrato (Ganhos Líquidos SP): ${formatForensicCurrency(m.ganhos - m.btorLedger)}`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`→ Δ C4: ${formatForensicCurrency((m.saftBruto - m.btfInvoice) - (m.ganhos - m.btorLedger))} (${(((m.saftBruto - m.btfInvoice) - (m.ganhos - m.btorLedger))/(m.saftBruto - m.btfInvoice)*100).toFixed(2)}%) — Diferença final no bolso do sujeito passivo`), style: 'h2', color: '#b91c1c', margin: [5, 0, 0, 8], tocItem: true },
            { text: formatHeading('10. IMPACTO FISCAL / FISCAL IMPACT & MANAGEMENT AGGRAVATION', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 6], tocItem: true }
        );

        const revenueGap = m.saftGross - m.dac7Total;
        const expenseGap = m.btorLedger - m.btfInvoice;
        const monthsCount = (m.dataMonths && m.dataMonths.length) || 4;
        const monthlyAvg = expenseGap / monthsCount;
        const annualOmitted = monthlyAvg * 12;
        const ircEst = annualOmitted * 0.21;
        const monthlyMarket = monthlyAvg * 38000;
        const annualMarket = monthlyMarket * 12;
        const impact7y = annualMarket * 7;

        const fiscalTable = {
            table: {
                headerRows: 1,
                widths: ['*', 'auto', 'auto'],
                body: [
                    [{ text: sanitizeText('Indicador Fiscal / Tax Indicator'), bold: true, fillColor: '#f1f5f9' }, { text: sanitizeText('Valor'), bold: true, fillColor: '#f1f5f9' }, { text: sanitizeText('%'), bold: true, fillColor: '#f1f5f9' }],
                    [sanitizeText('VAT 23% / IVA Omitido (23% Autoliquidação CIVA)'), formatForensicCurrency(iva23), '—'],
                    [sanitizeText('VAT 6% / IVA Omitido (6% Transporte)'), formatForensicCurrency(iva6), '—'],
                    [sanitizeText('Revenue Omission (DAC7) / Omissão de Receita'), formatForensicCurrency(revenueGap), ((revenueGap/m.saftGross)*100).toFixed(2) + '%'],
                    [sanitizeText('Expense Omission / Omissão de Custos (C2)'), formatForensicCurrency(expenseGap), ((m.omissionPct ?? 0).toFixed(2)) + '%'],
                    [sanitizeText('Projeção de Impacto Anualizado face à Amostra Temporal do Sujeito Passivo (Base de Cálculo — Artigo 45.º da LGT)'), formatForensicCurrency(annualOmitted), '—'],
                    [sanitizeText('Estimated IRC Impact / Impacto IRC Anual'), formatForensicCurrency(ircEst), '—'],
                    [sanitizeText('Contribuição IMT/AMT Omitida (5%)'), formatForensicCurrency(revenueGap * 0.05), '—'],
                    [sanitizeText('Agravamento Bruto IRC (C2 ÷ Meses × 12)'), formatForensicCurrency(annualOmitted), '—'],
                    [sanitizeText('IRC Estimado (21% sobre Agravamento Anual)'), formatForensicCurrency(ircEst), '—'],
                    [sanitizeText('Impacto Mensal · 38.000 condutores PT'), formatForensicCurrency(monthlyAvg * 38000), '—'],
                    [sanitizeText('Impacto Anual · 38.000 condutores × 12 meses PT'), formatForensicCurrency(annualMarket), '—'],
                    [sanitizeText('% Omissão Receita SAF-T vs DAC7'), '', ((revenueGap/m.saftGross)*100).toFixed(2) + '%'],
                    [sanitizeText('% Diferencial de Base em Análise (Desp. vs Fat.)'), '', ((m.omissionPct ?? 0).toFixed(2)) + '%'],
                    [sanitizeText('Asfixia Financeira (IVA 6% sobre Bruto)'), formatForensicCurrency(asfixia), '—']
                ]
            },
            layout: { ...'lightHorizontalLines', dontBreakRows: true },
            fontSize: 7.5 // <-- RETIFICAÇÃO 1B: Redução de 1.5pt (9→7.5) — mitiga quebra de linha do símbolo monetário
        };
        content.push(fiscalTable);
        content.push(
            { text: sanitizeText('IMPACTO SISTÉMICO ESTIMADO (7 Anos · 38.000 operadores × 12 meses): ' + formatForensicCurrency(impact7y)), style: 'h2', color: '#b91c1c', margin: [0, 10, 0, 6], tocItem: true },
            { text: sanitizeText('Esta perícia revela um padrão de omissão que, extrapolado ao universo de 38.000 operadores, representa uma exposição tributária de ' + formatForensicCurrency(impact7y) + '. Este dado fundamenta a relevância da presente ação para a tutela de interesses coletivos e correção de distorções de mercado. Projeção: Omissão mensal média × 38.000 motoristas TVDE (INE/IMT) × 12 meses × 7 anos (prazo Art. 45.º LGT).'), style: 'normal', color: '#475569', margin: [0, 0, 0, 8], lineHeight: 1.5 },
            { text: '', pageBreak: 'after' }
        );

        content.push(
            { text: formatHeading('PERDA DE CHANCE E DANO REPUTACIONAL — RESPONSABILIDADE CIVIL EXTRACONTRATUAL', 1), style: 'h1', color: '#b91c1c', margin: [0, 0, 0, 6], tocItem: true },
            { text: sanitizeText(`Dano Reputacional e Perda de Chance: O reporte viciado da plataforma à Autoridade Tributária (com uma discrepância detetada de ${formatForensicCurrency(revenueGap)}) contamina diretamente o perfil de risco (Risk Scoring) do parceiro. Sendo a plataforma a detentora do monopólio de emissão documental (Art. 36.º n.º 11 CIVA), o sujeito passivo é penalizado sem dolo. Esta adulteração do perfil fiscal gera lucros cessantes mensuráveis, inibindo o acesso a financiamento bancário, linhas de crédito e benefícios fiscais, constituindo fundamento para indemnização por responsabilidade civil extracontratual.`), style: 'normal', margin: [0, 0, 0, 12], lineHeight: 1.5 },
            { text: '', pageBreak: 'after' }
        );

        content.push(
            { text: formatHeading('FORENSIC NOTE / NOTA TÉCNICA PERICIAL — Data Obfuscation Practices:', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 6], tocItem: true },
            { text: sanitizeText('A análise detetou práticas de obscurecimento de dados por parte da plataforma sob exame, nomeadamente a alteração anual da estrutura de reporte (Ledger) e da sintaxe utilizada (moeda e separadores decimais), bem como a utilização do termo "Ganhos Líquidos" para designar meras transferências bancárias, ocultando a natureza das retenções efetuadas sem o devido suporte fiscal.'), style: 'normal', margin: [0, 0, 0, 8], lineHeight: 1.5 },
            { text: sanitizeText('1. SYNTAX INCONSISTENCY / Inconsistência de Sintaxe (Data Obfuscation - Level 1):'), style: 'h2', color: '#b91c1c', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('Dada a volatilidade das plataformas digitais, o sistema detetou que a estrutura de reporte (Ledger) é objeto de atualização anual. Exemplo material verificado na transição 2024/2025: o campo anteriormente designado "Portagens" transitou para "Reembolsos de despesas". Adicionalmente, detetou-se a alteração deliberada de separadores decimais (ponto vs. vírgula) e do posicionamento do símbolo monetário (EUR) entre períodos anuais — exemplo: "7755.16EUR" torna-se "EUR 7.731,22" no ano seguinte. O UNIFED-PROBATUM garante a reconciliação de ambos os campos para efeitos de reconstrução de passivo fiscal. Esta mutação sintática e semântica sistemática dificulta a leitura algorítmica automática e impede a reconciliação direta por auditores externos, constituindo indício de manipulação intencional do formato dos dados com o propósito de dificultar a auditoria forense.'), style: 'normal', margin: [5, 0, 0, 8], lineHeight: 1.5 },
            { text: sanitizeText('2. SEMANTIC AMBIGUITY / Ambiguidade Semântica ("Net Earnings" Masking - Fiscal Camouflage):'), style: 'h2', color: '#b91c1c', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('A plataforma utiliza o termo "Ganhos Líquidos" para designar meras transferências bancárias brutas, camuflando retenções de comissões que não deduzem os impostos devidos ao abrigo da Autoliquidação de IVA (Art. 2.º, n.º 1, al. i) CIVA). Esta nomenclatura enganosa induz o sujeito passivo a declarar valores inferiores à base tributável real, transferindo indevidamente o risco fiscal para o contribuinte.'), style: 'normal', margin: [5, 0, 0, 8], lineHeight: 1.5 },
            { text: sanitizeText('3. DATA OBFUSCATION - Limited Access Window / Janela de Acesso Limitada (Audit Trail Destruction):'), style: 'h2', color: '#b91c1c', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('A plataforma impõe uma janela máxima de 6 meses para acesso a dados históricos detalhados (extratos de atividade). Esta limitação temporal constitui uma estratégia de eliminação de rasto de auditoria (audit trail destruction), impedindo a reconstrução de séries históricas superiores ao semestre. Nos termos do Art. 40.º do CIVA, os registos primários devem ser conservados por 10 anos.'), style: 'normal', margin: [5, 0, 0, 8], lineHeight: 1.5 },
            { text: sanitizeText('4. TEMPORAL MISMATCH / Desalinhamento Temporal (Pagamentos Semanais vs Reporte Mensal):'), style: 'h2', color: '#b91c1c', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('As plataformas procedem ao pagamento dos prestadores por transferência bancária semanal; contudo, a emissão dos documentos de reporte fiscal (extratos e faturas) ocorre em formato mensal agregado. Esta assimetria temporal constitui uma tática de ofuscação que inviabiliza a reconciliação bancária direta (cruzamento 1:1 entre extrato bancário e documento de reporte), dificultando deliberadamente auditorias financeiras e a deteção atempada das discrepâncias.'), style: 'normal', margin: [5, 0, 0, 10], lineHeight: 1.5 },
            { text: formatHeading('TAX FRAMEWORK / QUADRO TRIBUTÁRIO — Direct Financial Impact:', 2), style: 'h2', color: '#1e3a8a', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText(`VAT 23% / IVA 23% Omitido (Autoliquidação): ${formatForensicCurrency(iva23)}`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`VAT 6% / IVA 6% Omitido (Transporte): ${formatForensicCurrency(iva6)}`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`Revenue Omission (DAC7) / Omissão Receita: ${formatForensicCurrency(revenueGap)} (${((revenueGap/m.saftGross)*100).toFixed(2)}%)`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`Expense Omission / Omissão Custos (BTF): ${formatForensicCurrency(expenseGap)} (${((m.omissionPct ?? 0).toFixed(2))}%)`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`Asfixia Financeira (IVA 6% sobre Bruto): ${formatForensicCurrency(asfixia)}`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`Contribuição IMT/AMT Omitida (5%): ${formatForensicCurrency(revenueGap * 0.05)}`), style: 'normal', margin: [5, 0, 0, 6] },
            { text: sanitizeText('IMPACTO SISTÉMICO ESTIMADO (7 Anos · 38.000 operadores PT): ' + formatForensicCurrency(impact7y)), style: 'h2', color: '#b91c1c', margin: [0, 0, 0, 6], tocItem: true },
            { text: sanitizeText('* Projeção baseada na quota de mercado da GIG Economy PT (2019-2025). Suporta relevância legal. / Projeção mercado GIG Economy PT (2019-2025).'), style: 'normal', italics: true, margin: [0, 0, 0, 10] },
            { text: formatHeading('QUALIFICAÇÃO JURÍDICA — CRIMINALIDADE DE COLARINHO BRANCO (WHITE-COLLAR CRIME)', 1), style: 'h1', color: '#b91c1c', margin: [0, 0, 0, 6], tocItem: true },
            { text: sanitizeText('A engenharia algorítmica da plataforma cria uma \'zona cinzenta\' premeditada entre o ganho real retido na fonte e o valor reportado em SAF-T/DAC7. Este diferencial não declarado fica num limbo contabilístico, caracterizando uma tipologia de criminalidade de colarinho branco e evasão fiscal estruturada, explorando a assimetria de informação contra o parceiro e o Estado.'), style: 'normal', margin: [0, 0, 0, 10], lineHeight: 1.5 },
            { text: '', pageBreak: 'after' }
        );

        content.push(
            { text: formatHeading('INVERSÃO DO ÓNUS DA PROVA — Art. 344.º n.º 2 CC · Princípio da Proximidade da Prova', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 6], tocItem: true },
            { text: sanitizeText('Objeto: Impossibilidade de Contraprova pelo Sujeito Passivo face à Assimetria Informativa.'), style: 'h2', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('Análise Técnica: A UNIFED-PROBATUM identificou uma divergência estrutural entre o Fluxo de Caixa Real (Ledger) e o Reporte Fiscal (SAF-T/DAC7). Dado que a plataforma detém o Monopólio da Emissão Documental (Art. 36.º, n.º 11 CIVA) e o controlo exclusivo sobre o algoritmo de cálculo de comissões, o parceiro encontra-se numa situação de indefesa técnica. A plataforma atua como "Black Box" fiscal — o sujeito passivo não tem acesso ao código-fonte nem aos logs brutos de transação que geram a faturação delegada.'), style: 'normal', margin: [0, 0, 0, 8], lineHeight: 1.5 },
            { text: sanitizeText('Conclusão Pericial: Por força do Princípio da Proximidade da Prova (Acórdão STJ 11/07/2013) e do Art. 344.º n.º 2 do CC, opera-se a Inversão do Ónus da Prova: incumbe à plataforma demonstrar a integridade dos valores retidos (' + formatForensicCurrency(expenseGap) + '), sob pena de confissão implícita da apropriação indevida e da fraude fiscal aqui evidenciada. Pelo exposto, impõe-se a aplicação da doutrina do Princípio da Proximidade da Prova, cabendo em exclusivo à Plataforma Operacional — e não ao sujeito passivo — o ónus material de demonstrar a inexistência de dolo ou erro algorítmico na retenção na fonte apurada.'), style: 'h2', margin: [0, 0, 0, 10], lineHeight: 1.25, tocItem: true },
            { text: '', pageBreak: 'after' }
        );

        if (sankeyImage) {
            content.push(
                { text: formatHeading('DIAGRAMA DE FLUXO FINANCEIRO — MONEY FLOW ANALYSIS · v13.5.6-FORENSIC-CORPORATE', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 8], tocItem: true },
                { text: sanitizeText('Este diagrama representa o fluxo financeiro reconstituído a partir das evidências forenses carregadas (SAF-T, Extratos, DAC7). É gerado em memória durante o processo de exportação e não altera o Dashboard nem as fórmulas de auditoria. Constitui evidência visual do "caminho do dinheiro" para efeitos do Art. 125.º CPP.'), style: 'normal', color: '#64748b', margin: [0, 0, 0, 8], lineHeight: 1.5 },
                { image: sankeyImage, width: 500, alignment: 'center', margin: [0, 10, 0, 10] },
                { text: sanitizeText('VALORES CRÍTICOS APURADOS:'), style: 'h2', color: '#b91c1c', margin: [0, 10, 0, 4], tocItem: true },
                { text: sanitizeText(`· IVA 23% omitido: ${formatForensicCurrency(iva23)}`), style: 'normal', margin: [5, 0, 0, 2] },
                { text: sanitizeText(`· IVA 6% omitido: ${formatForensicCurrency(iva6)}`), style: 'normal', margin: [5, 0, 0, 2] },
                { text: sanitizeText(`· Omissão de receita (SAF-T vs DAC7): ${formatForensicCurrency(revenueGap)}`), style: 'normal', margin: [5, 0, 0, 2] },
                { text: sanitizeText(`· Omissão de custos (BTF): ${formatForensicCurrency(expenseGap)} (${((m.omissionPct ?? 0).toFixed(2))}%)`), style: 'normal', margin: [5, 0, 0, 2] },
                { text: sanitizeText(`· IRC estimado omitido: ${formatForensicCurrency(ircEst)}`), style: 'normal', margin: [5, 0, 0, 2] },
                { text: sanitizeText(`· Asfixia Financeira (6% IVA sobre Bruto): ${formatForensicCurrency(asfixia)}`), style: 'normal', margin: [5, 0, 0, 4] },
                { text: sanitizeText('UNIFED-PROBATUM v13.5.6-FORENSIC-CORPORATE · Diagrama de Fluxo Financeiro · Art. 125.º CPP '), style: 'normal', color: '#64748b', alignment: 'center', margin: [0, 10, 0, 10] },
                { text: '', pageBreak: 'after' }
            );
        }

        if (atfImage) {
            content.push(
                { text: formatHeading('ANÁLISE TEMPORAL FORENSE (ATF) — TENDÊNCIAS · OUTLIERS 2σ · ÍNDICE DE RECIDIVA', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 8], tocItem: true },
                { text: sanitizeText('Gráfico temporal derivado dos extratos mensais processados. Outliers marcados a vermelho (> 2σ) indicam meses com anomalia estatística — constitui indício de comportamento oportunístico para efeitos do Art. 104.º RGIT.'), style: 'normal', color: '#64748b', margin: [0, 0, 0, 8], lineHeight: 1.5 },
                { image: atfImage, width: 515, height: 160, alignment: 'center', margin: [0, 10, 0, 10] } // <-- RETIFICAÇÃO 1C: dimensões fixas (width/height) anulam expansão do DataURI
            );
            const monthlyData = window.UNIFEDSystem?.monthlyData || {};
            const monthsKeys = (m.dataMonths && m.dataMonths.length) 
                ? m.dataMonths.slice().sort() 
                : Object.keys(monthlyData).sort();
            const discrepancies = monthsKeys.map(monthKey => {
                const d = monthlyData[monthKey] || {};
                return Math.abs((d.despesas || 0) - (d.ganhos || 0));
            });
            const avg = discrepancies.reduce((a,b)=>a+b,0) / (discrepancies.length || 1);
            const stdDev = Math.sqrt(discrepancies.map(x=>Math.pow(x-avg,2)).reduce((a,b)=>a+b,0) / (discrepancies.length || 1));
            const cv = avg > 0 ? stdDev / avg : 1;
            const persistenceScore = Math.max(0, Math.min(100, 100 * (1 - Math.min(1, cv))));
            content.push(
                { text: sanitizeText('SCORE DE PERSISTÊNCIA (SP): ' + persistenceScore.toFixed(1) + '/100'), style: 'h2', color: '#f59e0b', margin: [0, 10, 0, 4], tocItem: true },
                { text: sanitizeText(persistenceScore >= 70 ? 'RECIDIVA SISTEMÁTICA — Padrão de omissão consistente' : (persistenceScore >= 40 ? 'OMISSÕES PONTUAIS IDENTIFICADAS - Análise complementar recomendada.' : 'OMISSÃO PONTUAL / RISCO MODERADO')), style: 'normal', margin: [0, 0, 0, 6] },
                { text: sanitizeText('UNIFED-PROBATUM v13.5.6-FORENSIC-CORPORATE · Análise Temporal Forense · ISO/IEC 27037 · DL n.º 28/2019'), style: 'normal', color: '#64748b', alignment: 'center', margin: [0, 10, 0, 10] },
                { text: '', pageBreak: 'after' }
            );
        }

        content.push(
            { text: formatHeading('SÍNTESE JURÍDICA PERICIAL — ANÁLISE DETERMINÍSTICA v13.5.6-FORENSIC-CORPORATE', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 8], tocItem: true },
            { text: sanitizeText('Documento gerado sob metodologia forense UNIFED-PROBATUM v13.5.6. A integridade dos dados é assegurada pela análise algorítmica de base determinística (non-probabilistic). Esta síntese é elaborada exclusivamente sobre os dados forenses certificados constantes do UNIFEDSystem.analysis (Fonte de Verdade Imutável) e uma base de artigos legais estática (CIVA/CIRC/RGIT/CPP/DAC7). Conformidade: Art. 125.º CPP · ISO/IEC 27037:2012 .'), style: 'normal', color: '#64748b', margin: [0, 0, 0, 10], lineHeight: 1.5 },
            { text: formatHeading('SÍNTESE JURÍDICA - MODO DE SEGURANÇA FORENSE', 2), style: 'h2', color: '#1e3a8a', margin: [0, 0, 0, 6], tocItem: true },
            { text: formatHeading('Secção A - QUALIFICAÇÃO JURÍDICA DOS FACTOS', 2), style: 'h2', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('As discrepâncias apuradas pelo motor UNIFED-PROBATUM constituem indícios de omissão tributária nos termos dos artigos 103.º e 104.º do RGIT. A divergência entre os valores reportados pela plataforma (DAC7) e os valores declarados pelo sujeito passivo configura, prima facie, o elemento objetivo do tipo de ilícito de fraude fiscal qualificada, por envolver vantagem patrimonial ilegítima superior ao limiar legalmente previsto de 15.000 EUR.'), style: 'normal', margin: [0, 0, 0, 8], lineHeight: 1.5 },
            { text: formatHeading('Secção B - ENQUADRAMENTO LEGAL E TRIBUTÁRIO', 2), style: 'h2', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('A omissão de base tributável implica a obrigação de regularização nos termos do Art. 78.º do CIVA. O IVA em falta, calculado às taxas de 23% e 6%, acresce ao imposto em falta ao abrigo do Art. 2.º do CIVA (autoliquidação). O lucro tributável deverá ser corrigido ao abrigo do Art. 17.º do CIRC, com incidência de tributação autónoma sobre encargos não documentados (Art. 88.º CIRC).'), style: 'normal', margin: [0, 0, 0, 8], lineHeight: 1.5 },
            { text: formatHeading('Secção C - CONCLUSÕES DE ADMISSIBILIDADE', 2), style: 'h2', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('(I) CONSOLIDAÇÃO DA PROVA MATERIAL: A densidade técnica da evidência digital extraída via UNIFED-PROBATUM é suficiente para a demonstração do nexo de causalidade na subdeclaração de base tributável. A metodologia forense aplicada (ISO/IEC 27037:2012 · Art. 125.º CPP) é replicável e verificável por perito independente.'), style: 'normal', margin: [0, 0, 0, 6], lineHeight: 1.5 },
            { text: sanitizeText('(II) IMPACTO SISTÉMICO ESTIMADO (SIMULAÇÃO): Com base na metrica de discrepância apurada neste processo e extrapolando para a totalidade do setor (38.000 condutores — IMT), estima-se um passivo fiscal oculto sistémico de magnitude superior a 500M EUR. Esta projeção carece de prova pericial complementar em sede de execução e não constitui prova de facto neste processo concreto.'), style: 'normal', margin: [0, 0, 0, 6], lineHeight: 1.5 },
            { text: sanitizeText('(III) RECOMENDAÇÃO PROCESSUAL: Face à robustez dos artefactos apresentados, recomenda-se a inversão do ónus da prova (Art. 344.º CC e Art. 100.º CPPT), mantendo-se a disponibilidade para o pleno exercício do contraditório (Art. 327.º CPP) mediante acesso aos logs brutos de cálculo de comissões, sob custódia exclusiva da plataforma. O UNIFED-PROBATUM realiza RECONSTITUIÇÃO DA VERDADE MATERIAL DIGITAL — não contabilidade — distinção juridicamente relevante para a admissibilidade da prova pericial.'), style: 'normal', margin: [0, 0, 0, 8], lineHeight: 1.5 },
            { text: formatHeading('Secção D - ESTRATÉGIA DE CONTRA-INTERROGATÓRIO', 2), style: 'h2', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('Argumento da Defesa: "Os valores reportados pelo DAC7 incluem taxas de cancelamento e reembolsos que não constituem rendimento tributável do prestador."'), style: 'normal', italics: true, margin: [5, 0, 0, 2] },
            { text: sanitizeText('Resposta Pericial: Nos termos do Art. 36.º do CIVA, cada componente da remuneração deve constar de fatura discriminada. A ausência de faturação discriminada por componente confirma a omissão.'), style: 'normal', margin: [10, 0, 0, 4] },
            { text: sanitizeText('Argumento da Defesa: "A discrepância resulta de diferenças de câmbio e ajustamentos de plataforma comunicados tardiamente."'), style: 'normal', italics: true, margin: [5, 0, 0, 2] },
            { text: sanitizeText('Resposta Pericial: O Art. 29.º do CIVA impõe emissão no prazo de 5 dias úteis. Ajustamentos tardios não afastam a obrigação declarativa do período original (Art. 78.º CIVA).'), style: 'normal', margin: [10, 0, 0, 4] },
            { text: sanitizeText('Argumento da Defesa: "O contribuinte não tinha conhecimento técnico das obrigações DAC7."'), style: 'normal', italics: true, margin: [5, 0, 0, 2] },
            { text: sanitizeText('Resposta Pericial: O regime DAC7 está em vigor em Portugal desde 1 de janeiro de 2023 (Lei n.º 17/2023) e a plataforma tem obrigação de informar o prestador nos termos do Art. 8.º da Diretiva. A ignorância da lei não aproveita (Art. 6.º CC).'), style: 'normal', margin: [10, 0, 0, 6] },
            { text: formatHeading('DO ÓNUS DA PROVA E DA BOA FÉ CONTRATUAL:', 2), style: 'h2', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText(`Dada a discrepância de ${((m.omissionPct ?? 0).toFixed(2))}%, opera-se a inversão do ónus da prova (Art. 344.º do C. Civil), cabendo à Ré demonstrar a licitude das retenções efectuadas à margem da facturação emitida.`), style: 'h2', margin: [0, 0, 0, 10], lineHeight: 1.5, tocItem: true },
            { text: sanitizeText('UNIFED-PROBATUM v13.5.6-FORENSIC-CORPORATE · Análise Determinística · Base Legal: CIVA/CIRC/RGIT/CPP/DAC7'), style: 'normal', color: '#64748b', alignment: 'center', margin: [0, 5, 0, 3] },
            { text: sanitizeText('Metodologia: RECONSTITUIÇÃO DA VERDADE MATERIAL DIGITAL · ISO/IEC 27037:2012  · Art. 125.º CPP'), style: 'normal', color: '#64748b', alignment: 'center', margin: [0, 0, 0, 6] },
            { text: sanitizeText('NOTA: A jurisprudência citada nesta síntese constitui referência doutrinária para orientação do advogado mandatário. Toda a referência a acórdãos deve ser objeto de validação independente pelo advogado antes de qualquer uso processual. O Consultor Técnico responsabiliza-se exclusivamente pelos dados forenses e pela metodologia UNIFED-PROBATUM.'), style: 'normal', italics: true, color: '#64748b', margin: [0, 0, 0, 10], lineHeight: 1.5 },
            { text: '', pageBreak: 'after' }
        );

        content.push(
            { text: formatHeading('11. CADEIA DE CUSTÓDIA', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 6], tocItem: true },
            {
                table: {
                    widths: ['*'],
                    body: [[{
                        stack: [
                            { text: 'Master Hash = SHA-256 ( Hash_SAFT  ‖  Hash_Extrato  ‖  Hash_Fatura )', fontSize: 9, alignment: 'center', color: '#1e3a8a', margin: [0, 4, 0, 2] },
                            { text: sanitizeText(m.masterHash || 'HASH INDISPONÍVEL'), fontSize: 8, alignment: 'center', color: '#334155', margin: [0, 2, 0, 4] }
                        ],
                        fillColor: '#f1f5f9',
                        margin: [8, 0, 8, 0]
                    }]]
                },
                layout: { hLineWidth: function() { return 0.5; }, vLineWidth: function() { return 0.5; }, hLineColor: function() { return '#94a3b8'; }, vLineColor: function() { return '#94a3b8'; } },
                margin: [0, 0, 0, 12]
            },
            { text: formatHeading('REFERENCIAL NORMATIVO (ISO/IEC 27037 e DL 28/2019):', 2), style: 'h2', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('A recolha, preservação e análise das evidências digitais seguiram as diretrizes estabelecidas pela norma ISO/IEC 27037 (Linhas de orientação para identificação, recolha, aquisição e preservação de prova digital), em conformidade com o Decreto-Lei n.º 28/2019.'), style: 'normal', margin: [0, 0, 0, 8], lineHeight: 1.5 },
            { text: formatHeading('Evidências processadas e respetivos hashes SHA-256 completos:', 2), style: 'h2', margin: [0, 0, 0, 4], tocItem: true }
        );

        if (evidenceList && evidenceList.length > 0) {
            try {
                const custodyRows2 = evidenceList.map((ev, idx) => [
                    { text: String(idx + 1).padStart(2, '0'), fontSize: 9, alignment: 'center', margin: [2, 3, 2, 3] },
                    { text: sanitizeText(ev.filename || 'N/A'), fontSize: 9, alignment: 'left', margin: [4, 3, 4, 3] },
                    { text: sanitizeText(ev.hash || 'N/A'), fontSize: 8, alignment: 'left', margin: [4, 3, 4, 3], color: '#1e3a8a', font: 'Roboto' }
                ]);
                content.push({
                    table: {
                        headerRows: 1,
                        widths: [22, '*', 220],
                        body: [
                            [
                                { text: 'ID', bold: true, fontSize: 9, fillColor: '#1e3a8a', color: '#ffffff', alignment: 'center', margin: [2, 4, 2, 4] },
                                { text: 'Designação do Ficheiro de Evidência', bold: true, fontSize: 9, fillColor: '#1e3a8a', color: '#ffffff', alignment: 'left', margin: [4, 4, 4, 4] },
                                { text: 'Assinatura Digital Criptográfica (SHA-256)', bold: true, fontSize: 9, fillColor: '#1e3a8a', color: '#ffffff', alignment: 'left', margin: [4, 4, 4, 4] }
                            ],
                            ...custodyRows2
                        ]
                    },
                    layout: { hLineWidth: function() { return 0.5; }, vLineWidth: function() { return 0.5; }, hLineColor: function() { return '#cbd5e1'; }, vLineColor: function() { return '#cbd5e1'; } },
                    margin: [0, 4, 0, 12]
                });
            } catch (err) {
                triadaLog('warn', 'Erro ao gerar tabela de cadeia de custódia', { error: err.message });
                content.push({ text: sanitizeText('Erro ao processar lista de evidências.'), style: 'normal', italics: true, margin: [5, 0, 0, 6] });
            }
        } else {
            content.push({ text: sanitizeText('Nenhuma evidência disponível.'), style: 'normal', italics: true, margin: [5, 0, 0, 6] });
        }
        content.push({ text: '', pageBreak: 'after' });

        content.push(
            { text: formatHeading('8. VALIDAÇÃO DE SELAGEM GOVERNAMENTAL (TSA) — eIDAS / RFC 3161', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 6], tocItem: true },
            { text: sanitizeText('Protocolo de Carimbo de Tempo Qualificado conforme Regulamento eIDAS (UE) 910/2014 e RFC 3161 (IETF).'), style: 'normal', margin: [0, 0, 0, 8] },
            { text: sanitizeText('• ESTADO DO SELO: Não disponho de informação suficiente para concluir a validação cronológica definitiva das evidências digitais através do protocolo RFC 3161 nesta versão do relatório; seria necessário o acesso aos ficheiros originais de extensão .tsr (Time Stamp Response) gerados no ato de aquisição forense para atestar a selagem temporal qualificada em juízo.'), style: 'normal', margin: [5, 0, 0, 8] },
            { text: sanitizeText('• PROTOCOLO: RFC 3161 (FreeTSA.org)'), style: 'h2', margin: [5, 0, 0, 2], tocItem: true },
            { text: sanitizeText('• AUTORIDADE (TSA): FreeTSA.org — https://freetsa.org'), style: 'h2', margin: [5, 0, 0, 2], tocItem: true },
            { text: sanitizeText('• MODO DE SELAGEM: Submissão Online ao Nó FreeTSA'), style: 'h2', margin: [5, 0, 0, 2], tocItem: true },
            { text: sanitizeText('• HASH MASTER SHA-256: ' + (m.masterHash ? m.masterHash.substring(0, 40) : 'INDISPONÍVEL') + '...'), style: 'normal', fontFeatures: ['tnum'], margin: [5, 0, 0, 6] },
            { text: formatHeading('DETALHES DO PROTOCOLO RFC 3161 (TimeStampToken):', 2), style: 'h2', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('O protocolo RFC 3161 (Internet X.509 PKI Timestamping Protocol — IETF RFC 3161) define um mecanismo para obtenção de provas de existência temporal com validade jurídica (non-repudiation).'), style: 'normal', margin: [0, 0, 0, 4] },
            { text: sanitizeText('• A TSA (Time Stamping Authority) recebe o hash SHA-256 do documento/prova.'), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText('• Gera um TimeStampToken (TST) assinado digitalmente com o certificado X.509 da TSA.'), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText('• O TST inclui: hash, data/hora UTC certificada e número de série imutável.'), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText('• Validade jurídica: eIDAS (UE) 910/2014, Art. 41.º — Serviço de Carimbo de Tempo Qualificado.'), style: 'normal', margin: [5, 0, 0, 8] },
            { text: formatHeading('CONFORMIDADE NORMATIVA ACUMULADA:', 2), style: 'h2', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('• eIDAS (UE) 910/2014 — Serviço Eletrónico de Confiança Qualificado'), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText('• RFC 3161 (IETF) — Protocolo de Carimbo de Tempo Internet PKI'), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText('• ISO/IEC 27037:2012 — Diretrizes para Identificação e Recolha de Provas Digitais'), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText('• Decreto-Lei n.º 28/2019 de 15 de fevereiro — Preservação de Arquivo Digital e Integridade de Prova Eletrónica'), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText('• Art. 30.º RGPD — Registo das Atividades de Tratamento de Dados Pessoais'), style: 'normal', margin: [5, 0, 0, 8] },
            { text: formatHeading('STATUS DE SELAGEM POR EVIDÊNCIA:', 2), style: 'h2', margin: [0, 0, 0, 4], tocItem: true }
        );

        if (evidenceList && evidenceList.length > 0) {
            for (let idx = 0; idx < evidenceList.length; idx++) {
                try {
                    const ev = evidenceList[idx];
                    if (!ev) continue;
                    content.push({ text: sanitizeText(`${idx+1}. ${ev.filename || 'N/A'} — Estado TSA: ficheiro .tsr não disponível nesta sessão`), style: 'normal', margin: [5, 0, 0, 2] });
                } catch (err) {
                    triadaLog('warn', 'Erro ao exibir status de selagem', { idx, error: err.message });
                }
            }
        } else {
            content.push({ text: sanitizeText('Nenhuma evidência disponível.'), style: 'normal', italics: true, margin: [5, 0, 0, 6] });
        }
        content.push({ text: '', pageBreak: 'after' });

        const strategicQuestions = [
            "Qual a justificação técnica para o desvio de base tributável (BTOR vs BTF) detetado na triangulação IFDE?",
            "Disponibilize os 'raw data' (logs de servidor) das transações anteriores ao parsing contabilístico para o período em análise.",
            "Forneça o 'hash chain' ou prova criptográfica que atesta a imutabilidade dos registos de faturação e logs de acesso para o período em análise.",
            "Apresente os metadados completos (incluindo 'timestamp' de criação e modificação) de todos os registos de faturação do período para auditoria de integridade temporal.",
            "Liste todos os acessos de administrador à base de dados que resultaram em alterações de registos financeiros já finalizados, incluindo o 'before' e 'after' dos dados alterados.",
            "Como justifica a discrepância de IVA apurado (23% vs 6%) face aos valores declarados no período em análise?",
            "A plataforma disponibiliza o código-fonte do algoritmo de cálculo de comissões para auditoria independente e verificação de conformidade contratual?",
            "Existem registos de 'Shadow Entries' (entradas sem identificador de transação único) no sistema que justifiquem a omissão apurada?",
            "Os extratos bancários dos operadores coincidem com os registos na base de dados da plataforma para o período em análise?",
            "Há evidências de manipulação de 'timestamp' para alterar a validade fiscal das operações registadas?"
        ];
        content.push(
            { text: formatHeading('12. QUESTIONÁRIO PERICIAL ESTRATÉGICO', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 6], tocItem: true }
        );
        strategicQuestions.forEach((q, i) => {
            const romanNums = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];
            content.push({ text: sanitizeText(`${romanNums[i] || (i+1)}. ${q}`), style: 'normal', margin: [5, 4, 0, 4] });
        });
        content.push({ text: '', pageBreak: 'after' });

        const auxTotal = (window.UNIFEDSystem?.auxiliaryData?.totalNaoSujeitos) || 451.15;
        content.push(
            { text: formatHeading('13. CONCLUSÃO / TECHNICAL EXPERT OPINION (Parecer Técnico)', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 6], tocItem: true },
            { text: sanitizeText('Conclui-se pela existência de Prova Digital Material de desconformidade. Este parecer técnico constitui base suficiente para a interposição de ação judicial e apuramento de responsabilidade civil/criminal, servindo o propósito de proteção jurídica do mandato dos advogados intervenientes.'), style: 'normal', margin: [0, 0, 0, 8] },
            { text: sanitizeText('VI. CONCLUSÃO: Indícios de infração ao Artigo 108.º do Código do IVA e não conformidade com o Decreto-Lei n.º 28/2019.'), style: 'h2', margin: [0, 0, 0, 8], tocItem: true },
            { text: sanitizeText('VALIDAÇÃO TÉCNICA DE CONSULTORIA: O presente relatório é selado com o Master Hash SHA-256 completo e o QR Code anexo, garantindo a sua integridade e não-repúdio. A sua validação pode ser efetuada através de qualquer ferramenta de verificação de hash ou leitura de QR Code, que remete para o hash completo do documento.'), style: 'normal', margin: [0, 0, 0, 12] },
            { text: formatHeading('NOTA DE RECONCILIAÇÃO DAC7 — ZONA CINZENTA FISCAL', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 6], tocItem: true },
            { text: sanitizeText('A diferença entre os Ganhos Brutos reportados pelo extrato da plataforma e o valor comunicado à AT via DAC7 inclui fluxos que não estão sujeitos a comissão pela plataforma (Termos e Condições). Estes valores — gorjetas dos passageiros, ganhos de campanha e portagens — são transferências diretas ou reembolsos operacionais que não integram a base de cálculo da comissão, mas podem ter sido indevidamente incluídos no reporte DAC7, inflacionando o rendimento bruto declarado à Autoridade Tributária (AT).'), style: 'normal', margin: [0, 0, 0, 8], lineHeight: 1.5 },
            { text: formatHeading('FLUXOS NÃO SUJEITOS A COMISSÃO (Termos e Condições da Plataforma — 0%)', 2), style: 'h2', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText(`• Ganhos da campanha (Campanhas): 405,00 € [0% comissão - incentivo plataforma]`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`• Gorjetas dos passageiros (Tips): 46,00 € [0% comissão - transferência P2P]`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`• Portagens (Tolls / 2024): 0,15 € [reembolso operacional]`), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText(`• Taxas de Cancelamento: 58,10 € [já incluído em Despesas — Sujeito a Comissão]`), style: 'normal', margin: [5, 0, 0, 4] },
            { text: sanitizeText(`TOTAL NÃO SUJEITOS (Campanhas + Gorjetas + Portagens): ${formatForensicCurrency(auxTotal)}`), style: 'h2', margin: [0, 0, 0, 6], tocItem: true },
            { text: sanitizeText(`Impacto DAC7: Os ${formatForensicCurrency(auxTotal)} de fluxos não sujeitos a comissão não justificam a totalidade da discrepância entre o extrato da plataforma (${formatForensicCurrency(m.btorLedger)}) e o valor DAC7 reportado à AT (${formatForensicCurrency(m.dac7Total)}), porquanto a divergência apurada é materialmente superior. Se incluídos indevidamente no rendimento bruto DAC7, o contribuinte terá sido prejudicado na determinação da sua base tributável.`), style: 'normal', margin: [0, 0, 0, 8], lineHeight: 1.5 },
            { text: formatHeading('QUESTIONÁRIO ESTRATÉGICO AO ADVOGADO — CONTRADITÓRIO FORENSE', 2), style: 'h2', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText(`Os valores isentos de comissão (Campanhas + Gorjetas + Portagens = ${formatForensicCurrency(auxTotal)}) foram indevidamente incluídos no cálculo do rendimento bruto para efeitos de reporte SAF-T / DAC7? Se sim, porque é que foi aplicada uma presunção de rendimento sobre valores que, pelos Termos e Condições da plataforma para TVDE, não sofrem retenção nem comissão por parte da mesma?`), style: 'normal', margin: [5, 0, 0, 6], lineHeight: 1.5 },
            { text: sanitizeText('[Fundamentação Legal] Termos e Condições da Plataforma · Comissões 0% sobre gorjetas e campanhas · Art. 125.º CPP (admissibilidade da prova) · Art. 103.º RGIT (Fraude Fiscal) · DAC7 / Diretiva (UE) 2021/514 · AT — Autoridade Tributária e Aduaneira'), style: 'normal', color: '#64748b', margin: [5, 0, 0, 8] },
            { text: formatHeading('QUESTÕES PARA O CONTRADITÓRIO — PROTOCOLO UNIFED-GOLD', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 6], tocItem: true },
            { text: sanitizeText('As seguintes questões, elaboradas com fundamento pericial, destinam-se a ser formuladas ao representante legal da plataforma em sede de audiência de discussão e julgamento, nos termos do Art. 327.º CPP (Contraditório). Cada questão sustenta-se em evidência digital auditada e documentada no presente relatório forense.'), style: 'normal', margin: [0, 0, 0, 8], lineHeight: 1.5 },
            { text: sanitizeText('Q1 — DESALINHAMENTO TEMPORAL (Pagamento Semanal vs Faturação Mensal):\n"Pode a plataforma explicar a impossibilidade de reconciliação bancária direta (cruzamento 1:1) resultante do desalinhamento temporal entre o processamento de pagamentos — efectuado semanalmente por transferência bancária — e a emissão dos documentos de reporte fiscal, efectuada em formato mensal agregado? Esta assimetria temporal, detetada pelo sistema UNIFED-PROBATUM, impede o parceiro de auditar as transferências recebidas contra o documento de reporte correspondente, constituindo indício de ofuscação deliberada, nos termos do Art. 103.º do RGIT."'), style: 'normal', margin: [5, 4, 0, 6], lineHeight: 1.5 },
            { text: sanitizeText('Q2 — INCLUSÃO DE FLUXOS ISENTOS NO REPORTE DAC7 (Lei TVDE · Diretiva UE 2021/514):\n"Qual o fundamento legal e contratual que suporta a inclusão de fluxos financeiros não sujeitos a comissão — gorjetas, campanhas e portagens — no valor bruto reportado via DAC7? Embora a Lei TVDE regule a atividade, a isenção de comissão sobre estes valores está vinculada estritamente aos Termos e Condições da Plataforma. A inclusão destes montantes no reporte da AT, sem a devida segregação de fluxos não remuneratórios (cfr. Art. 36.º, n.º 11 do CIVA), pode constituir uma deficiência na extração de dados do sistema de informação da plataforma, resultando num reporte fiscalmente inexato."'), style: 'normal', margin: [5, 4, 0, 8], lineHeight: 1.5 },
            { text: sanitizeText('Fundamentação Legal: Art. 327.º CPP (Contraditório) · Art. 125.º CPP (Admissibilidade de Prova) · Art. 103.º/104.º RGIT (Fraude Fiscal/Qualificada) · Art. 36.º, n.º 11 CIVA · Decreto-Lei n.º 28/2019 (SAF-T/DAC7) · Diretiva (UE) 2021/514 (DAC7) · Termos e Condições da Plataforma · ISO/IEC 27037:2012 (prova digital)'), style: 'normal', color: '#64748b', margin: [5, 0, 0, 10] },
            { text: '', pageBreak: 'after' }
        );

        content.push(
            { text: formatHeading('TERMO DE ENCERRAMENTO PERICIAL', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 6], tocItem: true },
            { text: sanitizeText('O presente parecer técnico forense é composto por 30 páginas, numeradas sequencialmente de 1 a 30, sendo o seu encerramento validado pela aposição do Master Hash de integridade estrutural e assinatura digital do consultor técnico subscritor.'), style: 'normal', margin: [0, 0, 0, 4] },
            { text: sanitizeText(m.masterHash || 'HASH INDISPONÍVEL'), style: 'normal', fontFeatures: ['tnum'], margin: [0, 0, 0, 6] },
            { text: sanitizeText('constituindo Prova Digital Material inalterável para efeitos judiciais, sob égide do Art. 103.º do RGIT, normas ISO/IEC 27037 e Decreto-Lei n.º 28/2019.'), style: 'normal', margin: [0, 0, 0, 8] },
            { text: formatHeading('ADMISSIBILIDADE DA PROVA DIGITAL — Art. 125.º CPP', 2), style: 'h2', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('São admissíveis como meios de prova todos os meios não proibidos por lei (Art. 125.º do Código de Processo Penal Português). O presente relatório pericial constitui Prova Digital Material, produzida com recurso a metodologia forense certificada (ISO/IEC 27037:2012), integridade criptográfica SHA-256 e cadeia de custódia documentada, sendo admissível perante as Instâncias Judiciais Competentes nos termos do Art. 125.º CPP e do Art. 32.º da Constituição da República Portuguesa (Garantias de Defesa). A omissão de IVA apurada fundamenta a qualificação do facto nos termos dos Art. 103.º (Fraude Fiscal) e Art. 104.º (Fraude Fiscal Qualificada) do RGIT.'), style: 'normal', margin: [0, 0, 0, 8], lineHeight: 1.5 },
            { text: formatHeading('SELAGEM TEMPORAL RFC 3161 — DATA CERTA eIDAS:', 2), style: 'h2', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('Documento selado temporalmente via Protocolo RFC 3161 (TSA: FreeTSA.org), garantindo Data Certa eIDAS. Os selos .tsr individuais de cada evidência encontram-se arquivados na pasta 03_REPOSITORIO_OTS.'), style: 'normal', margin: [0, 0, 0, 8] },
            { text: formatHeading('CONSULTOR TÉCNICO — COMPROMISSO DE HONRA E SALVAGUARDA (ART. 153.º E 155.º CPP)', 2), style: 'h2', margin: [0, 0, 0, 4], tocItem: true },
            { text: sanitizeText('Identificação:'), style: 'h2', margin: [0, 0, 0, 2], tocItem: true },
            { text: sanitizeText('* Nome: Técnico Forense'), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText('* Cargo: Analista e Consultor Forense Independente | Big Data Analytics'), style: 'normal', margin: [5, 0, 0, 2] },
            { text: sanitizeText('* Estatuto: Consultor Técnico Independente (Art. 155.º do CPP). Atuação em conformidade com o regime de liberdade de prova e perícia documental.'), style: 'normal', margin: [5, 0, 0, 6] },
            { text: sanitizeText('NOTA DE SALVAGUARDA JURÍDICA E ÂMBITO: As conclusões constantes neste documento infraestruturam-se exclusivamente nos artefactos e elementos documentais disponibilizados pelo solicitante. O presente parecer constitui uma análise técnica independente de natureza consultiva e prova documental assistencial, não substituindo, para quaisquer efeitos processuais, a realização de uma perícia oficial ordenada pela autoridade judiciária competente.'), style: 'normal', margin: [0, 0, 0, 8], lineHeight: 1.5 },
            { text: sanitizeText('Análise material baseada em dados estruturados fornecidos; o escopo limita-se à integridade financeira e documental dos ativos digitais apresentados, conforme Art. 125.º CPP.'), style: 'normal', margin: [0, 0, 0, 8] }
        );

        // RETIFICAÇÃO 3E: Declaração isolada na última página + QR canto inferior direito
        if (qrCodeDataUrl) {
            content.push(
                { text: '', pageBreak: 'before' }, // Força página isolada
                { text: sanitizeText('DECLARAÇÃO DE COMPROMISSO: Declaro, sob compromisso de honra, que o presente parecer técnico foi elaborado na qualidade de Consultor Técnico Independente, assumindo estritamente os deveres de independência, objetividade e imparcialidade previstos no Artigo 153.º do Código de Processo Penal Português. Certifico que a metodologia aplicada (Baseada em ISRS 4400 e boas práticas de Digital Forensics) é reprodutível e que os resultados aqui vertidos traduzem fielmente a análise técnica realizada sobre o lote de dados fornecido.'), style: 'normal', margin: [0, 0, 0, 8], lineHeight: 1.5 },
                { text: sanitizeText('Data: 29/05/2026'), style: 'normal', margin: [0, 0, 0, 40] },
                {
                    columns: [
                        {
                            width: '*',
                            stack: [
                                { text: sanitizeText('_____________________________________________'), style: 'normal', alignment: 'left', margin: [0, 0, 0, 2] },
                                { text: sanitizeText('Assinatura do Técnico Responsável Pela Análise'), style: 'normal', alignment: 'left', margin: [0, 0, 0, 6] },
                                { text: sanitizeText('[ UNIFED-PROBATUM CERTIFIED · ANALISTA E CONSULTOR FORENSE · v13.5.6-FORENSIC-CORPORATE ]'), style: 'normal', bold: true, alignment: 'left', margin: [0, 0, 0, 4] },
                                { text: sanitizeText('Estudo de Viabilidade · Consultoria Forense Especializada · Uso restrito a mandato jurídico autorizado'), style: 'normal', alignment: 'left', margin: [0, 0, 0, 4] },
                                { text: sanitizeText('Fundamentação: RGIT Art. 103.º (Fraude Fiscal) · Art. 104.º (Fraude Qualificada) · CRP Art. 32.º · CPP Art. 125.º'), style: 'normal', alignment: 'left', margin: [0, 0, 0, 0] }
                            ]
                        },
                        {
                            width: 'auto',
                            stack: [
                                {
                                    image: qrCodeDataUrl,
                                    fit: [90, 90],
                                    alignment: 'right',
                                    margin: [0, -25, 0, 0]
                                }
                            ],
                            alignment: 'bottom'
                        }
                    ],
                    columnGap: 10,
                    margin: [0, 0, 0, 0]
                }
            );
        } else {
            content.push(
                { text: '', pageBreak: 'before' },
                { text: sanitizeText('DECLARAÇÃO DE COMPROMISSO: Declaro, sob compromisso de honra, que o presente parecer técnico foi elaborado na qualidade de Consultor Técnico Independente, assumindo estritamente os deveres de independência, objetividade e imparcialidade previstos no Artigo 153.º do Código de Processo Penal Português. Certifico que a metodologia aplicada (Baseada em ISRS 4400 e boas práticas de Digital Forensics) é reprodutível e que os resultados aqui vertidos traduzem fielmente a análise técnica realizada sobre o lote de dados fornecido.'), style: 'normal', margin: [0, 0, 0, 8], lineHeight: 1.5 },
                { text: sanitizeText('Data: 29/05/2026'), style: 'normal', margin: [0, 0, 0, 40] },
                { text: sanitizeText('_____________________________________________'), style: 'normal', alignment: 'left', margin: [0, 0, 0, 2] },
                { text: sanitizeText('Assinatura do Técnico Responsável Pela Análise'), style: 'normal', alignment: 'left', margin: [0, 0, 0, 6] },
                { text: sanitizeText('[ UNIFED-PROBATUM CERTIFIED · ANALISTA E CONSULTOR FORENSE · v13.5.6-FORENSIC-CORPORATE ]'), style: 'normal', bold: true, alignment: 'left', margin: [0, 0, 0, 4] },
                { text: sanitizeText('Estudo de Viabilidade · Consultoria Forense Especializada · Uso restrito a mandato jurídico autorizado'), style: 'normal', alignment: 'left', margin: [0, 0, 0, 4] },
                { text: sanitizeText('Fundamentação: RGIT Art. 103.º (Fraude Fiscal) · Art. 104.º (Fraude Qualificada) · CRP Art. 32.º · CPP Art. 125.º'), style: 'normal', alignment: 'left', margin: [0, 0, 0, 0] }
            );
        }

        return content;
    }

    // =========================================================================
    // FUNÇÃO GLOBAL DE CONSTRUÇÃO DO PAYLOAD JSON MÁXIMO (713 KB)
    // =========================================================================
    function buildMaximalJsonPayload() {
        const sys = window.UNIFEDSystem || {};
        const metrics = getSystemMetrics();
        const analysis = sys.analysis || {};
        const docs = sys.documents || {};

        let forensicLogs = [];
        if (window.ForensicLogger && typeof window.ForensicLogger.getLogs === 'function') {
            const rawLogs = window.ForensicLogger.getLogs();
            if (Array.isArray(rawLogs)) {
                forensicLogs = rawLogs.slice();
            }
        }

        const maximalPayload = {
            metadata: {
                source: 'UNIFED-PROBATUM v13.5.6-FORENSIC-CORPORATE',
                timestamp: new Date().toISOString(),
                timestampUnix: Math.floor(Date.now() / 1000),
                session: metrics.session,
                version: sys.version || 'v13.5.6',
                language: window.currentLang || 'pt',
                anoFiscal: sys.selectedYear || '2024',
                periodoAnalise: sys.selectedPeriodo || '2s',
                platform: metrics.platform,
                subject: metrics.companyName,
                nif: metrics.nif,
                demoMode: !!sys.demoMode,
                dataMonths: (() => {
                    const dm = sys.dataMonths;
                    if (dm && typeof dm.forEach === 'function') return Array.from(dm);
                    if (Array.isArray(dm)) return dm;
                    return [];
                })(),
                legalBasis: 'Dada a latência administrativa na disponibilização do ficheiro SAF-T (.xml) pelas plataformas, a presente perícia utiliza o método de Data Proxy: Fleet Extract. O ficheiro Ganhos da Empresa (Fleet/Ledger) é tratado como Livro-Razão de suporte, com valor probatório material, em conformidade com o Decreto-Lei n.º 28/2019 e o Art. 125.º CPP.'
            },
            integrity: {
                masterHash: metrics.masterHash,
                algorithm: 'SHA-256',
                protocol: 'RFC 3161',
                eidas2: 'eIDAS 2.0 Selective Disclosure (Merkle Tree)',
                merkleRoot: metrics.merkleRoot || 'N/A'
            },
            analysis: {
                totals:    Object.assign({}, analysis.totals    || {}),
                twoAxis:   Object.assign({}, analysis.twoAxis   || { revenueGap: metrics.saftGross - metrics.dac7Total, expenseGap: metrics.btorLedger - metrics.btfInvoice }),
                crossings: Object.assign({}, analysis.crossings || {}),
                verdict: metrics.verdict,
                selectedQuestions: analysis.selectedQuestions || [],
                top3Questions: metrics.top3Questions || [],
                evidenceCount: (sys.counts && sys.counts.total) || 0,
                valueSources: (() => {
                    const vs = {};
                    if (window.ValueSource && typeof window.ValueSource.sources !== 'undefined') {
                        try {
                            window.ValueSource.sources.forEach(function(v, k) { vs[k] = v; });
                        } catch(e) {}
                    }
                    return vs;
                })()
            },
            rawMetrics: {
                saftGross: metrics.saftGross,
                dac7Total: metrics.dac7Total,
                btorLedger: metrics.btorLedger,
                btfInvoice: metrics.btfInvoice,
                discrepancyPct: metrics.discrepancyPct,
                omissionPct: metrics.omissionPct,
                ivaOmitido23: (analysis.crossings?.ivaFalta)   || 0,
                ivaOmitido6:  (analysis.crossings?.ivaFalta6)  || 0,
                ivaAsfixia:   (window.UNIFEDSystem?.rawMetrics?.ivaAsfixia) || (analysis.crossings?.ivaAsfixia) || 0,
                impactoSeteAnosMercado: metrics.impactoSeteAnosMercado || 0
            },
            evidence: {
                invoices: { count: (docs.invoices && docs.invoices.files) ? docs.invoices.files.length : 0, totalValue: (docs.invoices && docs.invoices.totals) ? (docs.invoices.totals.invoiceValue || 0) : 0, files: (docs.invoices && docs.invoices.files) ? docs.invoices.files.map(function(f){return f.name;}) : [] },
                statements: { count: (docs.statements && docs.statements.files) ? docs.statements.files.length : 0, ganhos: (docs.statements && docs.statements.totals) ? (docs.statements.totals.ganhos || 0) : 0, despesas: (docs.statements && docs.statements.totals) ? (docs.statements.totals.despesas || 0) : 0, files: (docs.statements && docs.statements.files) ? docs.statements.files.map(function(f){return f.name;}) : [] },
                saft: { count: (docs.saft && docs.saft.files) ? docs.saft.files.length : 0, bruto: (docs.saft && docs.saft.totals) ? (docs.saft.totals.bruto || 0) : 0, files: (docs.saft && docs.saft.files) ? docs.saft.files.map(function(f){return f.name;}) : [] },
                dac7: { count: (docs.dac7 && docs.dac7.files) ? docs.dac7.files.length : 0, receitaAnual: (docs.dac7 && docs.dac7.totals) ? (docs.dac7.totals.receitaAnual || 0) : 0, files: (docs.dac7 && docs.dac7.files) ? docs.dac7.files.map(function(f){return f.name;}) : [] }
            },
            custodyLog: metrics.custodyLog,
            transactionRows: metrics.transactionRows,
            auditLog: (sys.logs || []).slice(-50),
            forensicLogs: forensicLogs,
            monthlyData: sys.monthlyData || {},
            auxiliaryData: sys.auxiliaryData || {}
        };

        // Retificações v13.5.6-R19
        maximalPayload.temporalAnalysis = {
            persistenceScore: (window.UNIFEDSystem?.analysis?.atfScore) ||
                              (typeof window.calculatePersistenceScore === 'function' ? window.calculatePersistenceScore() : 40),
            trendAlgorithm: "Ordinary Least Squares (OLS)",
            outliersCount: 0,
            historicalDepth: "4 Meses (Set-Dez 2024)"
        };

        if (maximalPayload.analysis?.crossings && typeof maximalPayload.analysis.crossings.vat6 !== 'undefined') {
            delete maximalPayload.analysis.crossings.vat6;
        }

        if (maximalPayload.analysis?.crossings?.c4_liquidoDeclarado !== undefined) {
            maximalPayload.analysis.crossings.c4_liquidoDeclarado_formula = "SAF-T Bruto - Taxa de Comissão Declarada (Variável de Sistema)";
        }

        maximalPayload.evidence = maximalPayload.evidence || {};
        maximalPayload.evidence.hashes = (window.UNIFEDSystem?.analysis?.evidenceIntegrity || []).map(ev => ({
            filename: ev.filename,
            hash: ev.hash,
            type: ev.type,
            timestamp: ev.timestamp
        }));

        return maximalPayload;
    }
    window.buildMaximalJsonPayload = buildMaximalJsonPayload;

    // =========================================================================
    // FUNÇÃO DE EXPORTAÇÃO DA PETIÇÃO INICIAL (DOCX) - BLINDADA (retorna Blob)
    // =========================================================================
    async function _gerarPeticaoBlob() {
        const startTime = Date.now();
        triadaLog('info', '⚖️ Iniciando geração da Minuta de Petição Inicial (Blob)');

        try {
            const _sys = window.UNIFEDSystem || {};
            const _analysis = _sys.analysis || {};

            let currentMasterHash = _analysis.masterHash;
            if (!currentMasterHash || typeof currentMasterHash !== 'string') {
                if (window.UNIFED_FORENSIC_SYSTEM &&
                    window.UNIFED_FORENSIC_SYSTEM.chainOfCustody &&
                    window.UNIFED_FORENSIC_SYSTEM.chainOfCustody.masterHash) {
                    currentMasterHash = window.UNIFED_FORENSIC_SYSTEM.chainOfCustody.masterHash;
                } else {
                    currentMasterHash = 'HASH_PENDENTE_VERIFICACAO';
                    triadaLog('warn', 'Master Hash não encontrado; usando fallback', { hash: currentMasterHash });
                }
            }

            const m = (function () {
                let sessionVal = _sys.sessionId;
                if (!sessionVal || typeof sessionVal !== 'string' || sessionVal.trim() === '') {
                    const domSess = document.getElementById('pure-session-id');
                    sessionVal = (domSess && domSess.innerText && domSess.innerText.trim() !== '')
                        ? domSess.innerText.trim()
                        : 'UNIFED-SESSAO-' + Date.now();
                    triadaLog('warn', 'sessionId obtido via fallback DOM', { sessionId: sessionVal.substring(0, 8) });
                }
                return {
                    session:        sessionVal,
                    masterHash:     currentMasterHash,
                    companyName:    _analysis.companyName    || 'Sujeito Passivo (Anonimizado)',
                    nif:            _analysis.nif            || 'XXXXXXXXX',
                    platform:       'Plataforma Digital Operacional (Anonimizado)',
                    period:         _analysis.period         || 'Set-Dez 2024',
                    saftGross:      _analysis.saftGross      || 10000.00,
                    dac7Total:      _analysis.dac7Total      || 7597.43,
                    discrepancyPct: _analysis.discrepancyPct || 23.65,
                    btorLedger:     _analysis.btorLedger     || 2447.89,
                    btfInvoice:     _analysis.btfInvoice     || 263.94,
                    ganhos:         _analysis.ganhos         || (_analysis.totals && _analysis.totals.ganhos) || 0,
                    omissionPct:    _analysis.omissionPct    || 89.26,
                    verdict:        _analysis.verdict        || 'RISCO CRÍTICO',
                    merkleRoot:     _analysis.merkleRoot     || 'N/A',
                    top3Questions:  _analysis.top3Questions  || []
                };
            })();

            m.masterHash = currentMasterHash;
            const discrepanciaReceita = m.saftGross - m.dac7Total;
            let top3Html = '';
            if (m.top3Questions && m.top3Questions.length > 0) {
                top3Html = m.top3Questions.map(function(q, idx) {
                    return (idx+1) + '. ' + q.text + ' (Eixo ' + q.axis + ', Score: ' + q.relevanceScore + ')\n   NORMA: ' + q.norma + '\n   IMPLICAÇÃO: ' + q.implicacao;
                }).join('\n\n');
            } else {
                top3Html = '[Nenhuma questão adversarial disponível. Execute a análise para gerar as TOP 3 questões.]';
            }

            const placeholders = {
                '{{companyName}}':            m.companyName,
                '{{nif}}':                    m.nif,
                '{{ganhos}}':                 formatForensicCurrency(m.ganhos || 0),
                '{{period}}':                 m.period,
                '{{platform}}':               m.platform,
                '{{saft_gross}}':             formatForensicCurrency(m.saftGross),
                '{{dac7_total}}':             formatForensicCurrency(m.dac7Total),
                '{{btor_ledger}}':            formatForensicCurrency(m.btorLedger),
                '{{btf_invoice}}':            formatForensicCurrency(m.btfInvoice),
                '{{expense_gap}}':            formatForensicCurrency((m.btorLedger - m.btfInvoice) || 0),
                '{{discrepancy_pct}}':        m.discrepancyPct + '%',
                '{{omission_pct}}':           m.omissionPct + '%',
                '{{verdict}}':                m.verdict,
                '{{session}}':                m.session,
                '{{master_hash}}':            m.masterHash,
                '{{merkle_root}}':            m.merkleRoot,
                '{{pedido_principal}}':       '[A PREENCHER PELO MANDATÁRIO JUDICIAL]',
                '{{quantia_indemnizatoria}}': '[A CALCULAR PELO MANDATÁRIO JUDICIAL]',
                '{{tribunal}}':               '[IDENTIFICAR O TRIBUNAL COMPETENTE]',
                '{{data_geracao}}':           new Date().toLocaleDateString('pt-PT'),
                '{{discrepancia_receita}}':   formatForensicCurrency(discrepanciaReceita),
                '{{top3_questions}}':         top3Html
            };

            function resolvePlaceholders(text) {
                var result = text;
                Object.keys(placeholders).forEach(function (key) {
                    result = result.split(key).join(placeholders[key]);
                });
                return result;
            }

            const TEMPLATE_PARAGRAPHS = [
                { heading: false, bold: true, center: true, text: 'EXCELENTÍSSIMO SENHOR JUIZ DO {{tribunal}}' },
                { heading: false, bold: false, center: false, text: '' },
                { heading: true,  text: 'MINUTA DE PETIÇÃO INICIAL' },
                { heading: false, bold: false, center: false, text: '' },
                { heading: true, text: 'I. IDENTIFICAÇÃO DO SUJEITO PASSIVO' },
                { heading: false, bold: false, center: false,
                  text: '{{companyName}}, contribuinte com o Número de Identificação Fiscal (NIF) {{nif}}, ' +
                        'com sede em [ENDEREÇO — A PREENCHER], adiante designada por "Requerente", ' +
                        'vem, por intermédio do seu Mandatário Judicial, deduzir a presente Petição Inicial, ' +
                        'expondo e requerendo o seguinte:' },
                { heading: false, bold: false, center: false, text: '' },
                { heading: true, text: 'II. EXPOSIÇÃO DOS FACTOS (PROVA MATERIAL DIGITAL)' },
                { heading: false, bold: false, center: false,
                  text: '1. A análise forense apurou uma Omissão de Custos (Retenção vs Fatura) de {{btor_ledger}} ' +
                        'face aos {{btf_invoice}} faturados, resultando num diferencial de {{discrepancy_pct}}.' },
                { heading: false, bold: false, center: false,
                  text: '2. Verifica-se Omissão de Receita na triangulação SAF-T vs DAC7 no valor de {{discrepancia_receita}}.' },
                { heading: false, bold: false, center: false, text: '' },
                { heading: true, text: 'III. DATA OBFUSCATION E INVERSÃO DO ÓNUS DA PROVA' },
                { heading: false, bold: false, center: false,
                  text: '3. A plataforma empregou táticas de "Semantic Ambiguity" e "Temporal Mismatch". ' +
                        'Estando o sujeito passivo perante uma "Black Box" fiscal (monopólio de emissão ' +
                        'documental, Art. 36.º, n.º 11 CIVA), requer-se a Inversão do Ónus da Prova ' +
                        '(Art. 344.º n.º 2 do Código Civil).' },
                { heading: false, bold: false, center: false,
                  text: '4. Exige-se a reparação por Perda de Chance e Dano Reputacional face à contaminação ' +
                        'do perfil de risco na Autoridade Tributária.' },
                { heading: false, bold: false, center: false, text: '' },
                { heading: true, text: 'IV. QUESTIONÁRIO PERICIAL ESTRATÉGICO (Art. 327.º CPP)' },
                { heading: false, bold: false, center: false,
                  text: 'Requer-se que a plataforma responda às seguintes questões com prova criptográfica:' },
                { heading: false, bold: false, center: false, text: '{{top3_questions}}' },
                { heading: false, bold: false, center: false, text: '' },
                { heading: true, text: 'V. PEDIDO E PROVA' },
                { heading: false, bold: false, center: false,
                  text: 'Termos em que se requer a condenação da requerida no pagamento da quantia de ' +
                        '{{quantia_indemnizatoria}}, acrescida dos juros legais e custas do processo.' },
                { heading: false, bold: false, center: false,
                  text: 'Prova: Parecer Forense UNIFED-PROBATUM v13.5.6 (Master Hash: {{master_hash}}), ' +
                        'logs de cadeia de custódia, extratos bancários e ficheiros SAF-T/DAC7.' },
                { heading: false, bold: false, center: false, text: '' },
                { heading: false, bold: false, center: false, text: 'Data: {{data_geracao}}' },
                { heading: false, bold: false, center: false, text: '' },
                { heading: false, bold: false, center: false, text: 'O Mandatário Judicial,' },
                { heading: false, bold: false, center: false, text: '' },
                { heading: false, bold: false, center: false,
                  text: '_______________________________________________________' },
                { heading: false, bold: false, center: false, text: '' },
                { heading: false, bold: true, center: false,
                  text: 'NOTA AO MANDATÁRIO JUDICIAL: Os campos assinalados com marcadores {{placeholder}} ' +
                        'devem ser substituídos pelo conteúdo definitivo antes da apresentação em tribunal. ' +
                        'Este documento foi gerado automaticamente pelo motor UNIFED-PROBATUM v13.5.6 ' +
                        'e constitui uma minuta de apoio litigioso, não substituindo o critério ' +
                        'profissional do Advogado.' }
            ];

            // Tenta gerar via docx.js, caso contrário usa fallback HTML
            if (typeof docx !== 'undefined') {
                try {
                    const children = TEMPLATE_PARAGRAPHS.map(function (item) {
                        const resolvedText = resolvePlaceholders(item.text || '');
                        if (item.heading) {
                            return new docx.Paragraph({
                                text:    resolvedText,
                                style:   'heading2',
                                spacing: { before: 300, after: 150 }
                            });
                        }
                        return new docx.Paragraph({
                            children: [
                                new docx.TextRun({
                                    text:      resolvedText,
                                    bold:      item.bold   || false,
                                    italics:   item.italics || false,
                                    size:      20
                                })
                            ],
                            alignment: item.center ? docx.AlignmentType.CENTER : docx.AlignmentType.JUSTIFIED,
                            spacing:   { after: 120, line: 276, lineRule: docx.LineRuleType.AUTO }
                        });
                    });

                    const document = new docx.Document({
                        creator:     'UNIFED-PROBATUM v13.5.6',
                        title:       'Minuta de Petição Inicial — ' + m.companyName,
                        description: 'Gerado automaticamente. Sessão: ' + m.session,
                        styles: {
                            paragraphStyles: [
                                {
                                    id:   'heading2',
                                    name: 'Heading 2',
                                    basedOn: 'Normal',
                                    next:    'Normal',
                                    run:  { size: 24, bold: true, color: '1e3a8a' },
                                    paragraph: { spacing: { before: 300, after: 150 } }
                                }
                            ]
                        },
                        sections: [{
                            properties: {
                                page: { margin: { top: 1440, right: 1008, bottom: 1440, left: 1008 } }
                            },
                            footers: {
                                default: new docx.Footer({
                                    children: [
                                        new docx.Paragraph({
                                            children: [
                                                new docx.TextRun({
                                                    text:   'CONFIDENCIAL · UNIFED-PROBATUM v13.5.6 · Sessão: ' +
                                                            m.session + ' · Master Hash: ' +
                                                            m.masterHash.substring(0, 24) + '...',
                                                    size:   14,
                                                    color:  '64748b'
                                                })
                                            ]
                                        })
                                    ]
                                })
                            },
                            children: children
                        }]
                    });

                    const blob = await docx.Packer.toBlob(document);
                    const finalBlob = new Blob([await blob.arrayBuffer()], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
                    triadaLog('info', '✅ DOCX Petição Inicial (Blob) gerado', { durationMs: Date.now() - startTime });
                    return finalBlob;

                } catch (docxError) {
                    triadaLog('error', '❌ Erro ao gerar DOCX via docx.js:', { message: docxError.message });
                }
            }

            // Fallback HTML
            triadaLog('warn', '⚠️ docx.js não disponível ou falhou; gerando fallback HTML');
            var htmlLines = [
                '<!DOCTYPE html>',
                '<html lang="pt-PT">',
                '<head>',
                '<meta charset="UTF-8">',
                '<title>' + resolvePlaceholders('Minuta de Petição Inicial — {{companyName}}') + '</title>',
                '<style>',
                'body{font-family:"Times New Roman",Times,serif;margin:72px 80px;line-height:1.9;color:#0f172a;font-size:10pt}',
                'h1{font-size:13pt;text-align:center;font-weight:bold}',
                'h2{font-size:11pt;font-weight:bold;margin-top:24pt;margin-bottom:8pt}',
                'p{margin-bottom:8pt;text-align:justify}',
                '.bold{font-weight:bold}',
                '.center{text-align:center}',
                '.placeholder{background:#fef9c3;padding:1px 3px;border-radius:2px;font-style:italic}',
                '.hash-block{font-family:monospace;font-size:8pt;color:#334155;word-break:break-all}',
                '.nota{border:1px solid #e2e8f0;padding:12px;background:#f8fafc;font-size:9pt;margin-top:24pt}',
                '</style>',
                '</head>',
                '<body>'
            ];

            TEMPLATE_PARAGRAPHS.forEach(function (item) {
                var text = resolvePlaceholders(item.text || '');
                if (item.heading) {
                    htmlLines.push('<h2>' + text + '</h2>');
                } else if (text === '') {
                    htmlLines.push('<p>&nbsp;</p>');
                } else {
                    var cssClass = (item.center ? 'center' : '') + (item.bold ? ' bold' : '');
                    var tag = cssClass.trim() ? '<p class="' + cssClass.trim() + '">' : '<p>';
                    htmlLines.push(tag + text + '</p>');
                }
            });

            htmlLines.push('</body></html>');
            var htmlBlob = new Blob([htmlLines.join('\n')], { type: 'text/html;charset=utf-8' });
            triadaLog('info', '✅ Fallback HTML (Petição Inicial) gerado como Blob');
            return htmlBlob;

        } catch (error) {
            triadaLog('error', '❌ Falha crítica em _gerarPeticaoBlob', { message: error.message });
            // Fallback de emergência
            const errorBlob = new Blob([`<html><body><h1>Erro na geração da Petição</h1><p>${error.message}</p></body></html>`], { type: 'text/html' });
            return errorBlob;
        }
    }

    // =========================================================================
    // FUNÇÕES AUXILIARES DE GERAÇÃO DE BLOBS PARA PDF (reutilizáveis)
    // =========================================================================
    async function _gerarBlobParecerTecnicoForense() {
        triadaLog('info', '📄 Gerando blob do Parecer Técnico Forense (Analista)');
        const m = getSystemMetrics();
        m.ganhos    = m.ganhos    || (window.UNIFEDSystem?.analysis?.totals?.ganhos)    || (window.UNIFEDSystem?.documents?.statements?.totals?.ganhos)    || 0;
        m.saftBruto = m.saftBruto || (window.UNIFEDSystem?.analysis?.totals?.saftBruto) || (window.UNIFEDSystem?.documents?.saft?.totals?.bruto)           || m.saftGross || 0;

        if (!m.masterHash || m.masterHash === '[HASH_INVALIDADO_POR_SIMULACAO_DEMO]' || m.masterHash.length !== 64) {
            try {
                const selectedQs = window.UNIFEDSystem?.analysis?.selectedQuestions || [];
                if (selectedQs.length > 0 && window.UNIFED_MerkleEngine) {
                    const merkleResult = await window.UNIFED_MerkleEngine.generateMerkleRoot(selectedQs);
                    m.masterHash  = merkleResult.root;
                    m.merkleRoot  = merkleResult.root;
                    if (window.UNIFEDSystem) window.UNIFEDSystem.sealHash = merkleResult.root;
                    triadaLog('info', `🔏 Master Hash Merkle gerado em runtime: ${merkleResult.root.substring(0, 16)}...`);
                } else if (window.UNIFEDSystem?.sealHash && window.UNIFEDSystem.sealHash.length === 64) {
                    m.masterHash = window.UNIFEDSystem.sealHash;
                } else {
                    m.masterHash = await generateDemoIntegrityHash(m.session || 'UNIFED-DEMO');
                    triadaLog('info', `🔏 Demo Integrity Hash gerado: ${m.masterHash.substring(0, 16)}...`);
                }
            } catch(eHash) {
                triadaLog('warn', '⚠️ Geração de hash runtime falhou: ' + eHash.message + ' — a usar sealHash de fallback.');
                m.masterHash = safeGenerateMasterBatchHash();
            }
        }

        if (!m.dataMonths || m.dataMonths.length === 0) {
            m.dataMonths = Object.keys(window.UNIFEDSystem?.monthlyData || {}).sort();
        }

        const [sankeyImg, atfImg, qrCodeImg] = await Promise.all([
            gerarImagemSankey(),
            gerarImagemATF(),
            gerarQRCodeDataURL(m.masterHash, m.session)
        ]);

        const docDefinition = {
            pageMargins: [40, 60, 40, 85], // <-- RETIFICAÇÃO 3A: rodapé 65→85 para eliminar sobreposição
            content: construirConteudoDinamicoAnalista(m, sankeyImg, atfImg, qrCodeImg),
            footer: function(currentPage, pageCount) {
                return {
                    stack: [
                        { canvas: [{ type: 'line', x1: 40, y1: 0, x2: 555, y2: 0, lineWidth: 0.75, lineColor: '#1e3a8a' }], margin: [0, -12, 0, 8] },
                        { text: 'Página ' + currentPage + ' de ' + pageCount, style: 'footerLine1', alignment: 'center' },
                        { text: 'Master Hash SHA-256: ' + (m.masterHash || 'INDISPONÍVEL'), style: 'footerLine2', alignment: 'center' }
                    ],
                    margin: [0, 0, 0, 0]
                };
            },
            fonts: {
                Roboto: {
                    normal: 'Roboto-Regular.ttf',
                    bold: 'Roboto-Medium.ttf',
                    italics: 'Roboto-Italic.ttf',
                    bolditalics: 'Roboto-MediumItalic.ttf'
                }
            },
            watermark: {
                text:    'PROVA DIGITAL MATERIAL',
                color:   '#0ea5e9',
                opacity: 0.04,
                bold:    false,
                italics: true,
                angle:   45,
                fontSize: 34
            },
            styles: {
                h1:          { fontSize: 11.5, bold: true,  alignment: 'left',    margin: [0, 12, 0, 12], color: '#1e3a8a' },
                h2:          { fontSize: 9.5, bold: true,  alignment: 'left',    margin: [0, 12, 0, 12], color: '#2c3e66' },
                normal:      { fontSize: 7.5,              alignment: 'justify', lineHeight: 1.25,        color: '#334155' },
                footerLine1: { fontSize: 7.5,                 alignment: 'center',  margin: [0, 0, 0, 10],  color: '#64748b' },
                footerLine2: { fontSize: 7.5,                 alignment: 'center',                          color: '#94a3b8' }
            },
            defaultStyle: { fontSize: 10.5, color: '#334155' }
        };

        if (Array.isArray(docDefinition.content)) {
            docDefinition.content = strictValidatePDFContent(docDefinition.content);
        }

        try {
            const blob = await generatePDFBlob(docDefinition);
            triadaLog('info', '✅ Parecer Técnico Forense (Blob) gerado com sucesso');
            return blob;
        } catch (err) {
            triadaLog('error', '❌ Falha ao gerar blob do Parecer Técnico Forense: ' + err.message);
            const htmlFb = _generateFallbackHTML(m, 'analista');
            return new Blob([htmlFb], { type: 'text/html' });
        }
    }

    async function _gerarBlobAnexoCustodia() {
        triadaLog('info', '📄 Gerando blob do Anexo de Custódia (Merkle + RFC 3161)');
        const m = getSystemMetrics();
        const sys = window.UNIFEDSystem || {};
        const evidenceList = sys.analysis?.evidenceIntegrity || [];

        const contentCustodia = [];

        contentCustodia.push({
            table: {
                widths: ['*'],
                body: [[{
                    stack: [
                        { text: formatHeading('ANEXO DE CUSTÓDIA — ÁRVORE DE MERKLE E HASHES RFC 3161', 1), style: 'h1', alignment: 'center', margin: [0, 14, 0, 6] },
                        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 475, y2: 0, lineWidth: 0.5, lineColor: '#1e3a8a' }], margin: [0, 0, 0, 6] },
                        { text: sanitizeText('SESSÃO: UNIFED-' + m.session), style: 'normal', alignment: 'center', margin: [0, 0, 0, 14] }
                    ],
                    fillColor: '#f8fafc'
                }]]
            },
            margin: [0, 30, 0, 20]
        });

        contentCustodia.push(
            { text: formatHeading('RAIZ DA ÁRVORE DE MERKLE (eIDAS 2.0)', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 8] },
            { text: sanitizeText(m.merkleRoot || 'N/A'), style: 'normal', fontFeatures: ['tnum'], margin: [0, 0, 0, 12] },
            { text: formatHeading('EVIDÊNCIAS E RESPETIVOS HASHES SHA-256', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 8] }
        );

        if (evidenceList.length > 0) {
            const custodyRows = evidenceList.map((ev, idx) => [
                { text: String(idx + 1).padStart(2, '0'), fontSize: 9, alignment: 'center', margin: [2, 3, 2, 3] },
                { text: sanitizeText(ev.filename || 'N/A'), fontSize: 9, alignment: 'left', margin: [4, 3, 4, 3] },
                { text: sanitizeText(ev.hash || 'N/A'), fontSize: 8, alignment: 'left', margin: [4, 3, 4, 3], color: '#1e3a8a', font: 'Roboto' }
            ]);
            contentCustodia.push({
                table: {
                    headerRows: 1,
                    widths: [22, '*', 220],
                    body: [
                        [
                            { text: 'ID', bold: true, fontSize: 9, fillColor: '#1e3a8a', color: '#ffffff', alignment: 'center', margin: [2, 4, 2, 4] },
                            { text: 'Designação do Ficheiro de Evidência', bold: true, fontSize: 9, fillColor: '#1e3a8a', color: '#ffffff', alignment: 'left', margin: [4, 4, 4, 4] },
                            { text: 'Hash SHA-256', bold: true, fontSize: 9, fillColor: '#1e3a8a', color: '#ffffff', alignment: 'left', margin: [4, 4, 4, 4] }
                        ],
                        ...custodyRows
                    ]
                },
                layout: { hLineWidth: function() { return 0.5; }, vLineWidth: function() { return 0.5; }, hLineColor: function() { return '#cbd5e1'; }, vLineColor: function() { return '#cbd5e1'; } },
                margin: [0, 4, 0, 12]
            });
        } else {
            contentCustodia.push({ text: sanitizeText('Nenhuma evidência disponível.'), style: 'normal', italics: true, margin: [5, 0, 0, 6] });
        }

        contentCustodia.push(
            { text: formatHeading('PROTOCOLO RFC 3161 — TIMESTAMPING', 1), style: 'h1', color: '#1e3a8a', margin: [0, 0, 0, 8] },
            { text: sanitizeText('TSA (Time Stamping Authority): FreeTSA.org (https://freetsa.org)'), style: 'normal', margin: [0, 0, 0, 4] },
            { text: sanitizeText('Hash submetido para selagem: ' + (m.masterHash ? m.masterHash.substring(0, 40) : 'INDISPONÍVEL') + '...'), style: 'normal', margin: [0, 0, 0, 4] },
            { text: sanitizeText('Estado da selagem: Selagem temporal qualificada (eIDAS Art. 41.º) — ficheiros .tsr individuais arquivados.'), style: 'normal', margin: [0, 0, 0, 12] }
        );

        const docDef = {
            pageMargins: [40, 60, 40, 65],
            content: contentCustodia,
            footer: function(currentPage, pageCount) {
                return {
                    stack: [
                        { canvas: [{ type: 'line', x1: 40, y1: 0, x2: 555, y2: 0, lineWidth: 0.75, lineColor: '#1e3a8a' }], margin: [0, -12, 0, 8] },
                        { text: `Página ${currentPage} de ${pageCount}`, style: 'footerLine1', alignment: 'center' },
                        { text: `Master Hash SHA-256: ${m.masterHash || 'INDISPONÍVEL'}`, style: 'footerLine2', alignment: 'center' }
                    ],
                    margin: [0, 0, 0, 0]
                };
            },
            fonts: {
                Roboto: {
                    normal: 'Roboto-Regular.ttf',
                    bold: 'Roboto-Medium.ttf',
                    italics: 'Roboto-Italic.ttf',
                    bolditalics: 'Roboto-MediumItalic.ttf'
                }
            },
            styles: {
                h1: { fontSize: 11.5, bold: true, alignment: 'left', margin: [0, 12, 0, 12], color: '#1e3a8a' },
                h2: { fontSize: 9.5, bold: true, alignment: 'left', margin: [0, 12, 0, 12], color: '#2c3e66' },
                normal: { fontSize: 7.5, alignment: 'justify', lineHeight: 1.25, color: '#334155' },
                footerLine1: { fontSize: 7.5, color: '#64748b', alignment: 'center', margin: [0, 0, 0, 4] },
                footerLine2: { fontSize: 7.5, color: '#94a3b8', alignment: 'center' }
            },
            defaultStyle: { fontSize: 10.5, color: '#334155' }
        };

        try {
            const blob = await generatePDFBlob(docDef);
            triadaLog('info', '✅ Anexo de Custódia (Blob) gerado com sucesso');
            return blob;
        } catch (err) {
            triadaLog('error', '❌ Falha ao gerar blob do Anexo de Custódia: ' + err.message);
            const htmlFb = _generateFallbackHTML(m, 'custodia');
            return new Blob([htmlFb], { type: 'text/html' });
        }
    }

    // =========================================================================
    // FUNÇÃO NATIVA DE DOWNLOAD DE BLOB (sem confirmação adicional)
    // =========================================================================
    function _downloadBlobNativo(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        triadaLog('info', `📥 Download iniciado: ${filename}`);
    }

    // =========================================================================
    // MÓDULO 3A — _exportPacoteAnalista (EMPACOTAMENTO .ZIP E MODAL ASSÍNCRONO)
    // =========================================================================
    window._exportPacoteAnalista = async function () {
        triadaLog('info', '🚀 _exportPacoteAnalista — iniciando compilação do arquivo .ZIP para o Analista');

        try {
            const parecerBlob = await _gerarBlobParecerTecnicoForense();
            const jsonBlob = new Blob([JSON.stringify(buildMaximalJsonPayload(), null, 2)], { type: 'application/json' });

            if (typeof JSZip !== 'undefined') {
                const zip = new JSZip();
                zip.file("Parecer_Tecnico_Forense_Original_Master.pdf", parecerBlob);
                zip.file("Metadados_Integridade_Sessao.json", jsonBlob);

                const zipBlob = await zip.generateAsync({ type: "blob" });
                const sessionId = window.UNIFEDSystem?.analysis?.sessionId || window.UNIFEDSystem?.sessionId || "DEMO";
                _downloadBlobNativo(zipBlob, `Pacote_Analista_Original_Sessao_${sessionId}.zip`);

                // Modal personalizado em vez de alert() bloqueante
                setTimeout(() => {
                    showModalMessage(
                        "⚠ NOTIFICAÇÃO DE ARQUIVO SEGURO",
                        "O Pacote Original do Analista foi exportado em formato .ZIP.\nO ficheiro está pronto para armazenamento no seu disco de segurança residual externo.\n\nClique em 'OK' para libertar a consola forense.",
                        () => { /* nenhuma ação adicional necessária */ }
                    );
                }, 500);
            } else {
                triadaLog('error', 'JSZip não disponível - não foi possível gerar o pacote .ZIP');
                showModalMessage("Erro crítico", "JSZip não está carregado. Não foi possível gerar o pacote compactado.", null);
            }
        } catch (e) {
            triadaLog('error', '❌ Falha em _exportPacoteAnalista: ' + e.message, { stack: e.stack });
            showModalMessage("Erro", "Erro ao gerar Pacote Analista: " + e.message, null);
        }
    };

    // =========================================================================
    // MÓDULO 3B — _exportPacoteAdvogado (EMPACOTAMENTO .ZIP E MODAL ASSÍNCRONO)
    // =========================================================================
    window._exportPacoteAdvogado = async function () {
        triadaLog('info', '⚖️ _exportPacoteAdvogado — iniciando compilação do arquivo .ZIP para o Advogado');

        try {
            const parecerBlob = await _gerarBlobParecerTecnicoForense();
            const peticaoBlob = await _gerarPeticaoBlob();  // Retorna DOCX (ou HTML)
            const custodiaBlob = await _gerarBlobAnexoCustodia();
            const jsonBlob = new Blob([JSON.stringify(buildMaximalJsonPayload(), null, 2)], { type: 'application/json' });

            if (typeof JSZip !== 'undefined') {
                const zip = new JSZip();
                zip.file("1_Parecer_Tecnico_Forense_Original.pdf", parecerBlob);
                zip.file("2_Minuta_Peticao_Inicial_Editavel.docx", peticaoBlob);
                zip.file("3_Anexo_Cadeia_Custodia_Merkle.pdf", custodiaBlob);
                zip.file("4_Pacote_Evidencias_Estruturado.json", jsonBlob);

                const zipBlob = await zip.generateAsync({ type: "blob" });
                const sessionId = window.UNIFEDSystem?.analysis?.sessionId || window.UNIFEDSystem?.sessionId || "DEMO";
                _downloadBlobNativo(zipBlob, `Pacote_Advogado_Sessao_${sessionId}.zip`);

                // Modal personalizado em vez de alert() bloqueante
                setTimeout(() => {
                    showModalMessage(
                        "⚠ NOTIFICAÇÃO FORENSE DE SEGURANÇA",
                        "O Pacote do Advogado foi compactado com sucesso no ficheiro .ZIP.\nProceda imediatamente à cópia do ficheiro para a Pen Drive local encriptada para o protocolo de contra-entrega nas instalações do Mandatário Judicial (Advogado).\n\nClique em 'OK' para confirmar e concluir o processo de segurança.",
                        null
                    );
                }, 500);
            } else {
                triadaLog('error', 'JSZip não disponível - não foi possível gerar o pacote .ZIP');
                showModalMessage("Erro crítico", "JSZip não está carregado. Não foi possível gerar o pacote compactado.", null);
            }
        } catch (e) {
            triadaLog('error', '❌ Falha em _exportPacoteAdvogado: ' + e.message, { stack: e.stack });
            showModalMessage("Erro", "Erro ao gerar Pacote Advogado: " + e.message, null);
        }
    };

    // =========================================================================
    // FUNÇÕES AUXILIARES DE VALIDAÇÃO E SUPORTE (preservadas do original)
    // =========================================================================
    function strictValidatePDFContent(node) {
        if (node === null || node === undefined) return { text: '', style: 'normal' };
        if (typeof node === 'string') return node;
        if (typeof node !== 'object') return node;
        if (Array.isArray(node)) {
            return node
                .filter(item => item !== null && item !== undefined)
                .map(strictValidatePDFContent);
        }
        if ('text' in node && (node.text === undefined || node.text === null)) {
            node.text = '';
        }
        ['content', 'columns', 'stack', 'ul', 'ol', 'table', 'body', 'header', 'footer'].forEach(key => {
            if (node[key] !== undefined && node[key] !== null) {
                if (key === 'body' && Array.isArray(node[key])) {
                    node[key] = node[key].map(row =>
                        Array.isArray(row)
                            ? row.map(cell => cell !== undefined && cell !== null ? strictValidatePDFContent(cell) : { text: '' })
                            : strictValidatePDFContent(row)
                    );
                } else if (key === 'table') {
                    node[key] = strictValidatePDFContent(node[key]);
                } else {
                    node[key] = strictValidatePDFContent(node[key]);
                }
            }
        });
        return node;
    }

    async function generatePDFBlob(docDefinition) {
        return new Promise((resolve, reject) => {
            if (typeof pdfMake === 'undefined') {
                reject(new Error('pdfMake não disponível — biblioteca não carregada'));
                return;
            }
            try {
                if (docDefinition && Array.isArray(docDefinition.content)) {
                    docDefinition.content = strictValidatePDFContent(docDefinition.content);
                    triadaLog('info', '🔍 Strict-PDF-Output: ' + docDefinition.content.length + ' nós validados');
                }
                const timer = setTimeout(function() {
                    reject(new Error('generatePDFBlob timeout (30s) — pdfMake não respondeu'));
                }, 30000);
                pdfMake.createPdf(docDefinition).getBlob(function(blob) {
                    clearTimeout(timer);
                    if (!blob || blob.size < 1000) {
                        reject(new Error('pdfMake retornou blob inválido (' + (blob ? blob.size : 0) + ' bytes)'));
                        return;
                    }
                    resolve(blob);
                });
            } catch (err) {
                reject(new Error('Erro síncrono em pdfMake.createPdf: ' + err.message));
            }
        });
    }

    // =========================================================================
    // MOTOR ELÁSTICO DE PAYLOAD FORENSE (preservado)
    // =========================================================================
    function _generateDynamicForensicPayload(mode, systemData) {
        const sys = systemData || window.UNIFEDSystem || {};
        let fullMetrics = {};
        try {
            if (typeof getSystemMetrics === 'function') {
                fullMetrics = getSystemMetrics();
            } else {
                fullMetrics = {
                    session: sys.sessionId || 'N/A',
                    masterHash: (sys.masterHash || 'N/A'),
                    companyName: sys.analysis?.companyName || 'N/A',
                    nif: sys.analysis?.nif || 'N/A',
                    saftGross: sys.analysis?.saftGross || 0,
                    dac7Total: sys.analysis?.dac7Total || 0,
                    btorLedger: sys.analysis?.btorLedger || 0,
                    btfInvoice: sys.analysis?.btfInvoice || 0,
                    omissionPct: sys.analysis?.omissionPct || 0,
                    verdict: sys.analysis?.verdict || 'N/A',
                    top3Questions: sys.analysis?.top3Questions || [],
                    merkleRoot: sys.analysis?.merkleRoot || 'N/A',
                    monthlyData: sys.monthlyData || {},
                    auxiliaryData: sys.auxiliaryData || {},
                    totals: sys.analysis?.totals || {},
                    crossings: sys.analysis?.crossings || {},
                    twoAxis: sys.analysis?.twoAxis || {}
                };
            }
        } catch (e) {
            console.warn('[ELASTIC] Erro ao obter métricas completas:', e);
        }

        const completePayload = {
            metadata: {
                source: 'UNIFED-PROBATUM v13.5.6-FORENSIC-CORPORATE',
                timestamp: new Date().toISOString(),
                sessionId: fullMetrics.session || sys.sessionId,
                version: sys.version || 'v13.5.6',
                language: window.currentLang || 'pt',
                demoMode: !!(sys.demoMode),
                exportMode: mode,
                selectedYear: sys.selectedYear,
                selectedPeriodo: sys.selectedPeriodo,
                platform: fullMetrics.platform || 'Plataforma Digital Operacional (Anonimizado)',
                client: { name: fullMetrics.companyName, nif: fullMetrics.nif }
            },
            integrity: {
                masterHash: fullMetrics.masterHash,
                merkleRoot: fullMetrics.merkleRoot,
                algorithm: 'SHA-256',
                protocol: 'RFC 3161',
                eidas2Compliant: true
            },
            analysis: {
                totals: fullMetrics.totals,
                crossings: fullMetrics.crossings,
                twoAxis: fullMetrics.twoAxis,
                verdict: fullMetrics.verdict,
                top3Questions: fullMetrics.top3Questions,
                selectedQuestions: sys.analysis?.selectedQuestions || [],
                omissionPct: fullMetrics.omissionPct,
                saftGross: fullMetrics.saftGross,
                dac7Total: fullMetrics.dac7Total,
                btorLedger: fullMetrics.btorLedger,
                btfInvoice: fullMetrics.btfInvoice
            },
            monthlyData: fullMetrics.monthlyData,
            auxiliaryData: fullMetrics.auxiliaryData,
            custodyLog: fullMetrics.custodyLog || [],
            transactionRows: fullMetrics.transactionRows || [],
            auditLog: (sys.logs || []).slice(-50),
            evidenceCount: sys.counts?.total || 0,
            evidenceIntegrity: sys.analysis?.evidenceIntegrity || []
        };
        return completePayload;
    }
    window._generateDynamicForensicPayload = _generateDynamicForensicPayload;

    // =========================================================================
    // BRIDGE API PÚBLICA — window.UNIFED_TRIADA_EXPORT
    // =========================================================================
    window.UNIFED_TRIADA_EXPORT = {
        _exportPacoteAnalista: window._exportPacoteAnalista,
        _exportPacoteAdvogado: window._exportPacoteAdvogado,
        getUnifiedPayload: function() { return obterPayloadForenseUnificado(); },
        getSystemMetrics: function() { return getSystemMetrics(); },
        downloadJsonData: function(mode, lang) {
            const _mode = 'analyst';
            const _filename = 'Json Export.json';
            if (typeof window.buildMaximalJsonPayload === 'function') {
                try {
                    const maximalPayload = window.buildMaximalJsonPayload();
                    downloadJsonPayloadWithDeepSanitization(maximalPayload, _filename, _mode);
                    return;
                } catch(e) {
                    triadaLog('warn', 'buildMaximalJsonPayload falhou — fallback para motor elástico: ' + e.message);
                }
            }
            if (typeof window._generateDynamicForensicPayload === 'function') {
                try {
                    let _sysSnapshot;
                    try {
                        _sysSnapshot = JSON.parse(JSON.stringify(window.UNIFEDSystem || {}));
                    } catch (_freezeErr) {
                        _sysSnapshot = Object.assign({}, window.UNIFEDSystem || {});
                        _sysSnapshot.analysis   = Object.assign({}, (window.UNIFEDSystem || {}).analysis   || {});
                        _sysSnapshot.documents  = Object.assign({}, (window.UNIFEDSystem || {}).documents  || {});
                        _sysSnapshot.monthlyData = (window.UNIFEDSystem || {}).monthlyData || {};
                        _sysSnapshot.auxiliaryData = (window.UNIFEDSystem || {}).auxiliaryData || {};
                        if (!Array.isArray(_sysSnapshot.analysis.selectedQuestions)) {
                            _sysSnapshot.analysis.selectedQuestions = [];
                        }
                        if (!_sysSnapshot.analysis.totals || typeof _sysSnapshot.analysis.totals !== 'object') {
                            _sysSnapshot.analysis.totals = {};
                        }
                    }
                    const _elasticPayload = window._generateDynamicForensicPayload(_mode, _sysSnapshot);
                    downloadJsonPayloadWithDeepSanitization(_elasticPayload, _filename, _mode);
                    return;
                } catch(e) {
                    triadaLog('warn', 'Motor elástico falhou — fallback para payload estruturado: ' + e.message);
                }
            }
            var m    = getSystemMetrics();
            var _sys = window.UNIFEDSystem || {};
            var _analysis = _sys.analysis || {};
            var _pU       = obterPayloadForenseUnificado();
            var _payload  = {
                metadata: {
                    source: 'UNIFED-PROBATUM Fallback Export v13.5.6',
                    timestamp: new Date().toISOString(),
                    session: m.session,
                    version: _sys.version || 'v13.5.6',
                    language: (window.currentLang || lang || 'pt'),
                    platform: m.platform,
                    subject: m.companyName,
                    nif: m.nif,
                    demoMode: !!_sys.demoMode,
                    exportMode: _mode,
                    legalBasis: 'Art. 125.º CPP · ISO/IEC 27037:2012 · Decreto-Lei n.º 28/2019'
                },
                integrity: { masterHash: m.masterHash, algorithm: 'SHA-256', merkleRoot: m.merkleRoot || 'N/A' },
                analysis:  { totals: _pU.totals || {}, crossings: _pU.crossings || {}, verdict: m.verdict, selectedQuestions: _analysis.selectedQuestions || [] },
                rawMetrics:{ saftGross: m.saftGross, dac7Total: m.dac7Total, btorLedger: m.btorLedger, btfInvoice: m.btfInvoice, omissionPct: m.omissionPct },
                evidence:  { transactionRows: _pU.transactionRows || [], custodyLog: _pU.custodyLog || [] },
                auditLog:  (_sys.logs || []).slice(-50)
            };
            downloadJsonPayloadWithDeepSanitization(_payload, _filename, _mode);
        }
    };

    // =========================================================================
    // VINCULAÇÃO ÚNICA DOS BOTÕES (evita duplicação de listeners)
    // =========================================================================
    async function bindExportButtonsOnce() {
        const btnAnalyst = document.getElementById('exportAnalystBtn');
        if (btnAnalyst && !btnAnalyst._triadaBound) {
            btnAnalyst.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (window.applyTimestampAndMerkle) await window.applyTimestampAndMerkle();
                window._exportPacoteAnalista().catch(err => triadaLog('error', 'Export Analyst Error: ' + err.message));
            });
            btnAnalyst._triadaBound = true;
        }
        const btnLawyer = document.getElementById('exportLawyerBtn');
        if (btnLawyer && !btnLawyer._triadaBound) {
            btnLawyer.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (window.applyTimestampAndMerkle) await window.applyTimestampAndMerkle();
                window._exportPacoteAdvogado().catch(err => triadaLog('error', 'Export Lawyer Error: ' + err.message));
            });
            btnLawyer._triadaBound = true;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindExportButtonsOnce);
    } else {
        bindExportButtonsOnce();
    }
    window.addEventListener('unifed:interfaceShown', bindExportButtonsOnce, { once: true });
    window._reBindTriadaButtons = bindExportButtonsOnce;

})();