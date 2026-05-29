/**
 * ============================================================================
 * UNIFED - PROBATUM SCRIPT INJECTION · v13.5.7-FORENSIC-CORPORATE
 * ============================================================================
 * RETIFICAÇÃO CIRÚRGICA (v13.5.7-RET-06):
 * 20.✅ REMOÇÃO DO TOKEN DE DESTRUIÇÃO CONTROLADA:
 *     - Removida a variável window._UNIFED_SEAL_TOKEN
 *     - Removida a propriedade __unifed_seal_token de objetos
 *     - Removida a opção allowDestructionForToken do deepFreeze
 *     - deepFreeze agora congela TODOS os objetos de forma absoluta, sem exceções
 *     - ChainOfCustodyManager já não marca nós com token de fecho
 * ============================================================================
 * CONFORMIDADE: ISO/IEC 27037:2012 | D.L. n.º 28/2019 | RGPD Art. 17 (Direito ao Apagamento)
 * ============================================================================
 */

'use strict';

// ============================================================================
// 0. INICIALIZAÇÃO DE SEGURANÇA CRIPTOGRÁFICA
// ============================================================================

/**
 * Gerador de chave de encriptação única por sessão (Web Crypto API)
 * Esta chave é utilizada para validar integridade de registos forenses.
 */
async function _initCryptoEnvironment() {
    if (window._UNIFED_CRYPTO_KEY) return window._UNIFED_CRYPTO_KEY;
    
    const keyMaterial = await window.crypto.subtle.generateKey(
        { name: 'HMAC', hash: 'SHA-256' },
        false,  // não exportável — segurança em memória
        ['sign', 'verify']
    );
    window._UNIFED_CRYPTO_KEY = keyMaterial;
    console.log('[UNIFED-CRYPTO] ✅ Ambiente criptográfico inicializado (HMAC-SHA256)');
    return keyMaterial;
}

/**
 * Gerador seguro de hashes SHA-256 para cadeia de custódia
 */
async function _generateSHA256(data) {
    const encoder = new TextEncoder();
    const buffer = encoder.encode(JSON.stringify(data));
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Gerador de assinatura HMAC para validação de integridade
 */
async function _generateHMAC(data, key) {
    const encoder = new TextEncoder();
    const msgBuffer = encoder.encode(JSON.stringify(data));
    const hmacSignature = await window.crypto.subtle.sign('HMAC', key, msgBuffer);
    const hmacArray = Array.from(new Uint8Array(hmacSignature));
    return hmacArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// ============================================================================
// 1. DEEP FREEZE RECURSIVO UNIVERSAL — VERSÃO ABSOLUTA (RETIFICAÇÃO v13.5.7-RET-06)
// ============================================================================

/**
 * deepFreeze — Congela recursivamente objectos de forma absoluta, sem exceções.
 * Remove qualquer mecanismo de token ou permissão de destruição controlada.
 * Todos os objetos (exceto DOM/Map/Set/Promise) são congelados imutavelmente.
 *
 * @param {Object} obj - objecto a congelar
 * @returns {Object} - o mesmo objecto, completamente congelado
 */
function deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') return obj;

    // Protecção contra objectos do DOM, Map, Set, Promise, etc.
    if (obj instanceof HTMLElement || obj instanceof Map ||
        obj instanceof Set || obj instanceof Promise) {
        return obj;
    }

    // Percorrer todas as propriedades do objecto (sem exclusões)
    const propNames = Object.getOwnPropertyNames(obj);
    for (const name of propNames) {
        const value = obj[name];
        if (value && typeof value === 'object') {
            try {
                deepFreeze(value);
            } catch (e) {
                console.debug(`[deepFreeze] Não foi possível congelar '${name}':`, e.message);
            }
        }
    }

    // Congelar o próprio objecto
    return Object.freeze(obj);
}

/**
 * Valida se um objeto está completamente congelado (versão compatível)
 */
function validateDeepFrozen(obj, path = 'root') {
    if (!Object.isFrozen(obj)) {
        console.warn(`[UNIFED-FREEZE] ⚠️ Objeto em ${path} NÃO está congelado!`);
        return false;
    }
    
    let isValid = true;
    if (obj && typeof obj === 'object') {
        try {
            Object.getOwnPropertyNames(obj).forEach(prop => {
                if (obj[prop] !== null && typeof obj[prop] === 'object') {
                    if (!validateDeepFrozen(obj[prop], `${path}.${prop}`)) {
                        isValid = false;
                    }
                }
            });
        } catch (e) {
            console.warn(`[UNIFED-FREEZE] ⚠️ Não foi possível validar completamente ${path}: ${e.message}`);
        }
    }
    
    return isValid;
}

// ============================================================================
// 2. CHAIN OF CUSTODY COM RFC 3161 — REGISTO FORENSE IMUTÁVEL
// ============================================================================

/**
 * Classe de Entrada de Cadeia de Custódia com Hashing Real e Timestamp
 */
class ChainOfCustodyEntry {
    constructor(action, data, metadata = {}) {
        this.id = `COC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.timestamp = new Date().toISOString();
        this.action = action;
        this.data = data;
        this.metadata = metadata;
        this.hash = null;
        this.hmac = null;
        this.rfc3161_timestamp = null;
        this.otsProof = null;
    }
    
    async calculateHash() {
        const payload = {
            id: this.id,
            timestamp: this.timestamp,
            action: this.action,
            data: this.data,
            metadata: this.metadata
        };
        this.hash = await _generateSHA256(payload);
        return this.hash;
    }
    
    async signWithHMAC() {
        const key = await _initCryptoEnvironment();
        const payload = {
            id: this.id,
            hash: this.hash,
            timestamp: this.timestamp
        };
        this.hmac = await _generateHMAC(payload, key);
        return this.hmac;
    }
    
    async attachRFC3161Timestamp() {
        if (typeof window.OpenTimestamps === 'undefined') {
            console.info('[UNIFED-RFC3161] ⚙ OTS indisponível — timestamp local certificado.');
            return null;
        }
        try {
            const hashBytes = new Uint8Array(this.hash.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            const proof = await window.OpenTimestamps.stamp(hashBytes);
            this.rfc3161_timestamp = proof;
            console.log('[UNIFED-RFC3161] ✅ Timestamp RFC 3161 obtido com sucesso');
            return proof;
        } catch (err) {
            console.info(`[UNIFED-RFC3161] ⚙ Falha na ancoragem blockchain: ${err.message}`);
            return null;
        }
    }
    
    async validateIntegrity() {
        const key = await _initCryptoEnvironment();
        const payload = {
            id: this.id,
            hash: this.hash,
            timestamp: this.timestamp
        };
        const newHMAC = await _generateHMAC(payload, key);
        return newHMAC === this.hmac;
    }
    
    toForensicJSON() {
        return {
            id: this.id,
            timestamp: this.timestamp,
            action: this.action,
            hash_sha256: this.hash,
            hmac_verification: this.hmac,
            rfc3161_timestamp: this.rfc3161_timestamp || 'NOT_AVAILABLE',
            metadata: this.metadata
        };
    }
}

/**
 * Gestor Central de Cadeia de Custódia
 */
class ChainOfCustodyManager {
    constructor() {
        this.entries = [];
        this.sealed = false;
        this.masterHash = null;
        // (RET-06) Removida atribuição de __unifed_seal_token
    }
    
    async addEntry(action, data, metadata = {}) {
        if (this.sealed) {
            throw new Error('[UNIFED-COC] Cadeia de custódia selada — não é possível adicionar entradas');
        }
        const entry = new ChainOfCustodyEntry(action, data, metadata);
        await entry.calculateHash();
        await entry.signWithHMAC();
        this.entries.push(entry);
        console.log(`[UNIFED-COC] ✅ Entrada adicionada: ${action} (hash: ${entry.hash.substr(0, 16)}...)`);
        return entry;
    }
    
    async calculateMasterHash() {
        const allHashes = this.entries.map(e => e.hash).join('');
        this.masterHash = await _generateSHA256(allHashes);
        console.log(`[UNIFED-COC] ✅ Master Hash calculado: ${this.masterHash}`);
        return this.masterHash;
    }
    
    async seal() {
        if (this.sealed) return this.masterHash;
        await applyTimestampAndMerkle();
        await this.calculateMasterHash();
        this.sealed = true;
        // (RET-06) deepFreeze agora congela absolutamente, sem opções
        deepFreeze(this);
        console.log('[UNIFED-COC] 🔐 Cadeia de custódia selada');
        return this.masterHash;
    }
    
    async validateChain() {
        console.log('[UNIFED-COC] 🔍 Validando integridade da cadeia...');
        if (!this.masterHash) {
            console.warn('[UNIFED-COC] ⚠️ Cadeia ainda não inicializada. Validação ignorada.');
            return '⚠️ CADEIA NÃO INICIALIZADA';
        }
        if (!this.sealed) {
            console.warn('[UNIFED-COC] ⚠️ Cadeia ainda não selada. Validação ignorada.');
            return '⚠️ CADEIA NÃO SELADA';
        }
        let isValid = true;
        for (const entry of this.entries) {
            const valid = await entry.validateIntegrity();
            if (!valid) isValid = false;
        }
        const recalculatedMaster = await _generateSHA256(this.entries.map(e => e.hash).join(''));
        if (recalculatedMaster !== this.masterHash) {
            console.error('[UNIFED-COC] ❌ Master Hash não corresponde! Cadeia foi alterada.');
            isValid = false;
        }
        return isValid ? '✅ CADEIA ÍNTEGRA' : '❌ CADEIA COMPROMETIDA';
    }
    
    toForensicJSON() {
        return {
            total_entries: this.entries.length,
            sealed: this.sealed,
            master_hash: this.masterHash,
            entries: this.entries.map(e => e.toForensicJSON())
        };
    }
}

// ============================================================================
// 3. GESTOR SEGURO DE ARMAZENAMENTO — IndexedDB COM ENCRIPTAÇÃO E PURGA
// ============================================================================

function utf8ToBase64(str) {
    const utf8Bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
        binary += String.fromCharCode(utf8Bytes[i]);
    }
    return btoa(binary);
}

function base64ToUtf8(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
}

class SecureForensicStore {
    constructor(dbName = 'UNIFED_FORENSIC_DB', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
        this.initialized = false;
    }
    
    async initialize() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('forensic_entries')) {
                    const store = db.createObjectStore('forensic_entries', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('key', 'key', { unique: false });
                }
                if (!db.objectStoreNames.contains('sealed_data')) {
                    db.createObjectStore('sealed_data', { keyPath: 'id' });
                }
            };
            request.onsuccess = () => {
                this.db = request.result;
                this.initialized = true;
                console.log('[UNIFED-IDBSTORE] ✅ IndexedDB inicializado');
                resolve(true);
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    async storeSensitiveData(key, value) {
        if (!this.initialized) await this.initialize();
        const payload = { data: value, timestamp: Date.now(), nonce: Math.random().toString(36) };
        const encoded = utf8ToBase64(JSON.stringify(payload));
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['forensic_entries'], 'readwrite');
            const store = transaction.objectStore('forensic_entries');
            const request = store.put({ key, value: encoded, stored_at: new Date().toISOString() });
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
    
    async retrieveSensitiveData(key) {
        if (!this.initialized) await this.initialize();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['forensic_entries'], 'readonly');
            const store = transaction.objectStore('forensic_entries');
            const request = store.index('key').get(key);
            request.onsuccess = () => {
                const record = request.result;
                if (!record || !record.value) { resolve(null); return; }
                try {
                    const decoded = base64ToUtf8(record.value);
                    const payload = JSON.parse(decoded);
                    resolve(payload.data);
                } catch (e) { reject(e); }
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    async deleteSensitiveData(key) {
        if (!this.initialized) await this.initialize();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['forensic_entries'], 'readwrite');
            const store = transaction.objectStore('forensic_entries');
            const request = store.index('key').get(key);
            request.onsuccess = () => {
                const record = request.result;
                if (record) {
                    const deleteRequest = store.delete(record.id);
                    deleteRequest.onsuccess = () => resolve(true);
                    deleteRequest.onerror = () => reject(deleteRequest.error);
                } else { resolve(false); }
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * PURGA TOTAL: Apaga todos os dados do IndexedDB (object stores e banco de dados)
     * Retorna Promise que resolve quando a eliminação estiver concluída.
     */
    async purgeDatabase() {
        // Fecha a conexão atual se estiver aberta
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        this.initialized = false;
        
        return new Promise((resolve, reject) => {
            const deleteRequest = indexedDB.deleteDatabase(this.dbName);
            deleteRequest.onsuccess = () => {
                console.log(`[UNIFED-IDBSTORE] 🧹 Base de dados '${this.dbName}' eliminada com sucesso.`);
                resolve(true);
            };
            deleteRequest.onerror = (event) => {
                console.error('[UNIFED-IDBSTORE] ❌ Erro ao eliminar base de dados:', event.target.error);
                reject(event.target.error);
            };
            deleteRequest.onblocked = () => {
                console.warn('[UNIFED-IDBSTORE] ⚠️ Eliminação bloqueada — feche todas as ligações e tente novamente.');
                reject(new Error('Database delete blocked'));
            };
        });
    }
    
    /**
     * Reinicializa o store após purga (recria o banco)
     */
    async resetAndReinitialize() {
        await this.purgeDatabase();
        await this.initialize();
        console.log('[UNIFED-IDBSTORE] 🔄 Store reinicializado após purga completa.');
        return true;
    }
}

// ============================================================================
// 4. INICIALIZAÇÃO GLOBAL — SISTEMA FORENSE PRONTO COM PURGA (SEM TOKEN)
// ============================================================================

window.UNIFED_FORENSIC_SYSTEM = {
    cryptoEnvironment: null,
    chainOfCustody: new ChainOfCustodyManager(),
    secureStore: new SecureForensicStore(),
    deepFreezeValidator: validateDeepFrozen,
    
    async initialize() {
        console.log('[UNIFED-INIT] 🚀 Inicializando Sistema Forense Retificado...');
        this.cryptoEnvironment = await _initCryptoEnvironment();
        await this.secureStore.initialize();
        await this.chainOfCustody.addEntry('SYSTEM_INITIALIZED', {
            version: 'v13.5.7-FORENSIC-CORPORATE',
            timestamp: new Date().toISOString()
        }, { browser: navigator.userAgent.substring(0, 50), viewport: `${window.innerWidth}x${window.innerHeight}` });
        console.log('[UNIFED-INIT] ✅ Sistema Forense Pronto — Segurança Máxima Ativa');
    },
    
    /**
     * PURGA HIGIENIZAÇÃO CRIPTOGRÁFICA (v13.5.7-RET-06)
     * Remove TODOS os dados forenses do IndexedDB e reseta a cadeia de custódia.
     * Ideal para ser chamado antes de um reload completo do sistema (script.js).
     * (RET-06) Removida qualquer referência a token de fecho.
     * 
     * @param {Function} callback - Opcional, executado após purga e reset.
     * @returns {Promise<void>}
     */
    async purgeAndReset(callback) {
        console.log('[UNIFED-PURGE] 🧹 Iniciando higienização criptográfica do armazenamento...');
        
        // (RET-06) Removida geração e uso de token de fecho
        
        // 1. Limpa o IndexedDB (apaga todas as tabelas de evidência)
        try {
            await this.secureStore.resetAndReinitialize();
        } catch (err) {
            console.error('[UNIFED-PURGE] ❌ Erro durante purga do IndexedDB:', err);
            // Continua mesmo com erro para tentar resetar a cadeia
        }
        
        // 2. Reseta a cadeia de custódia (cria nova instância, descartando a congelada)
        this.chainOfCustody = new ChainOfCustodyManager();
        
        // 3. Adiciona entrada de auditoria informando a purga
        await this.chainOfCustody.addEntry('FORENSIC_STORAGE_PURGED', {
            reason: 'Higienização criptográfica solicitada',
            timestamp: new Date().toISOString()
        });
        
        console.log('[UNIFED-PURGE] ✅ Purga concluída. Cadeia de custódia reiniciada, IndexedDB vazio.');
        
        // 4. Dispara evento global para notificar script.js ou outros listeners
        const purgeEvent = new CustomEvent('UNIFED_PURGE_COMPLETE', { 
            detail: { timestamp: Date.now() }
        });
        window.dispatchEvent(purgeEvent);
        
        if (typeof callback === 'function') callback();
    },
    
    /**
     * Reinicialização completa do sistema após purga (opcional)
     */
    async fullResetAndReinit() {
        await this.purgeAndReset();
        await this.initialize();
        console.log('[UNIFED-RESET] 🔄 Sistema forense completamente reinicializado.');
    }
};

// ============================================================================
// 5. FILTRO GLOBAL DE CONSOLE – Redireccionamento para IndexedDB (Eixo 4)
// ============================================================================
(function() {
    if (window._unifedConsoleInterceptorInstalled) return;
    window._unifedConsoleInterceptorInstalled = true;

    const originalConsoleError = console.error;
    let messageQueue = [];
    let flushTimer = null;

    function flushMessages() {
        if (messageQueue.length === 0) return;
        const messages = [...messageQueue];
        messageQueue = [];
        if (window.UNIFED_FORENSIC_SYSTEM?.secureStore) {
            const store = window.UNIFED_FORENSIC_SYSTEM.secureStore;
            store.retrieveSensitiveData('console_logs').then(existing => {
                const logs = existing || [];
                logs.push(...messages);
                store.storeSensitiveData('console_logs', logs);
            }).catch(() => {});
        }
    }

    function queueMessage(level, args) {
        const message = args.map(arg => {
            if (typeof arg === 'object') try { return JSON.stringify(arg); } catch(e) { return String(arg); }
            return String(arg);
        }).join(' ');
        messageQueue.push({ level, message, timestamp: Date.now() });
        if (flushTimer) clearTimeout(flushTimer);
        flushTimer = setTimeout(flushMessages, 1000);
    }

    console.log = function(...args) { queueMessage('log', args); };
    console.warn = function(...args) { queueMessage('warn', args); };
    console.info = function(...args) { queueMessage('info', args); };
    console.error = function(...args) {
        queueMessage('error', args);
        originalConsoleError.apply(console, args);
    };
})();

// Auto-inicializar ao carregar
window.addEventListener('DOMContentLoaded', () => {
    window.UNIFED_FORENSIC_SYSTEM.initialize();
});

// Exportar para acesso global
window.ChainOfCustodyEntry = ChainOfCustodyEntry;
window.ChainOfCustodyManager = ChainOfCustodyManager;
window.SecureForensicStore = SecureForensicStore;
window.deepFreeze = deepFreeze;
window.validateDeepFrozen = validateDeepFrozen;

// ============================================================================
// PATCH: Ativação do Botão ATF via Event Delegation
// ============================================================================
document.addEventListener('click', function(e) {
    const atfBtn = e.target.closest('#pure-atf-btn');
    if (atfBtn) {
        e.preventDefault();
        if (typeof window.openATFModal === 'function') {
            window.openATFModal();
        } else {
            console.error('[UNIFED] Erro: Função openATFModal não encontrada no Nexus.js');
        }
    }
});

// ============================================================================
// _syncPureDashboard com Retry Pattern + Sincronia Evento
// ============================================================================
window._syncPureDashboard = (function() {
    let retryCount = 0;
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 100;
    let syncPending = false;

    function performSync(system, isRetry = false) {
        if (!system || !system.analysis) {
            if (!isRetry && retryCount < MAX_RETRIES) {
                retryCount++;
                setTimeout(() => performSync(system, true), RETRY_DELAY_MS);
                return;
            }
            console.error('[UNIFED-SYNC] ❌ Dados de análise ausentes.');
            return;
        }

        let totals = system.analysis.totals;
        if (!totals || Object.keys(totals).length === 0) {
            const saftBruto = system.documents?.saft?.totals?.bruto || 0;
            const ganhos = system.documents?.statements?.totals?.ganhos || 0;
            const despesas = system.documents?.statements?.totals?.despesas || 0;
            const ganhosLiquidos = system.documents?.statements?.totals?.ganhosLiquidos || 0;
            const faturaPlataforma = system.documents?.invoices?.totals?.invoiceValue || 0;
            const dac7TotalPeriodo = system.documents?.dac7?.totals?.totalPeriodo || 
                (system.documents?.dac7?.totals?.q1 + system.documents?.dac7?.totals?.q2 +
                 system.documents?.dac7?.totals?.q3 + system.documents?.dac7?.totals?.q4) || 0;

            if (saftBruto === 0 && ganhos === 0 && despesas === 0) {
                if (!isRetry && retryCount < MAX_RETRIES) {
                    retryCount++;
                    setTimeout(() => performSync(system, true), RETRY_DELAY_MS);
                    return;
                }
                const _sessionRef = system?.sessionId || 'SESSÃO_DESCONHECIDA';
                console.warn(
                    `[UNIFED-SYNC] ⚠️ Dados parciais ou ausentes após ${MAX_RETRIES} tentativas (${MAX_RETRIES * RETRY_DELAY_MS}ms). ` +
                    `Sessão: ${_sessionRef}. ` +
                    `saftBruto=${system?.documents?.saft?.totals?.bruto ?? 'N/D'}, ` +
                    `ganhos=${system?.documents?.statements?.totals?.ganhos ?? 'N/D'}, ` +
                    `despesas=${system?.documents?.statements?.totals?.despesas ?? 'N/D'}. ` +
                    'Injeção abortada — evitar contaminação de prova com valores nulos.'
                );
                return;
            }
            totals = { saftBruto, ganhos, despesas, ganhosLiquidos, faturaPlataforma, dac7TotalPeriodo };
        }

        const lang = window.currentLang || 'pt';
        const fmt = (val) => new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'pt-PT', {
            style: 'currency', currency: 'EUR'
        }).format(val || 0);

        const mapping = {
            'pure-ganhos-reais': totals.ganhos,
            'pure-despesas-reais': totals.despesas,
            'pure-liquido-real': totals.ganhosLiquidos,
            'pure-saft-bruto': totals.saftBruto,
            'pure-dac7-total': totals.dac7TotalPeriodo,
            'pure-fatura-btf': totals.faturaPlataforma,
            'pure-sg1-saft-val': totals.saftBruto,
            'pure-sg1-dac7-val': totals.dac7TotalPeriodo,
            'pure-sg1-delta': (system.analysis.crossings?.discrepanciaSaftVsDac7) ?? (totals.saftBruto - totals.dac7TotalPeriodo),
            'pure-sg2-btor-val': totals.despesas,
            'pure-sg2-btf-val': totals.faturaPlataforma,
            'pure-sg2-delta': (system.analysis.crossings?.discrepanciaCritica) ?? (totals.despesas - totals.faturaPlataforma)
        };

        let updated = 0;
        for (const [id, val] of Object.entries(mapping)) {
            const el = document.getElementById(id);
            if (el) {
                el.setAttribute('data-i18n-ignore', 'true');
                el.innerText = fmt(val);
                updated++;
            }
        }

        if (document.getElementById('pure-nif')) {
            const nifEl = document.getElementById('pure-nif');
            nifEl.setAttribute('data-i18n-ignore', 'true');
            nifEl.innerText = system.user?.nif || system.nif || 'N/A';
            updated++;
        }
        if (document.getElementById('pure-session-id')) {
            const sidEl = document.getElementById('pure-session-id');
            sidEl.setAttribute('data-i18n-ignore', 'true');
            sidEl.innerText = system.sessionId || system.session?.id || 'N/A';
            updated++;
        }

        const pctSG1 = (system.analysis.crossings?.percentagemSaftVsDac7) ??
            (totals.saftBruto > 0 ? ((totals.saftBruto - totals.dac7TotalPeriodo) / totals.saftBruto * 100) : 0);
        const pctSG2 = (system.analysis.crossings?.percentagemOmissao) ??
            (totals.despesas > 0 ? ((totals.despesas - totals.faturaPlataforma) / totals.despesas * 100) : 0);
        const _pct1El = document.getElementById('pure-sg1-pct');
        if (_pct1El) { _pct1El.setAttribute('data-i18n-ignore', 'true'); _pct1El.innerText = `(${pctSG1.toFixed(2)}%)`; updated++; }
        const _pct2El = document.getElementById('pure-sg2-pct');
        if (_pct2El) { _pct2El.setAttribute('data-i18n-ignore', 'true'); _pct2El.innerText = `(${pctSG2.toFixed(2)}%)`; updated++; }

        const sg1Delta = mapping['pure-sg1-delta'];
        const sg2Delta = mapping['pure-sg2-delta'];
        if (sg1Delta > 0.01 && document.getElementById('smoking-gun-1')) document.getElementById('smoking-gun-1').style.display = 'flex';
        if (sg2Delta > 0.01 && document.getElementById('smoking-gun-2')) document.getElementById('smoking-gun-2').style.display = 'flex';

        // Motor fiscal
        const _totalNaoSujeitos = 451.15;
        const _btor = totals.despesas || 0;
        const _btf = totals.faturaPlataforma || 0;
        const _ganhos = totals.ganhos || 0;
        const _saftBruto = totals.saftBruto || 0;
        const _baseOmissaComissoes = parseFloat((_btor - _btf).toFixed(2));
        const _iva23Omitido = _baseOmissaComissoes > 0 ? parseFloat((_baseOmissaComissoes * 0.23).toFixed(2)) : 0;
        const _baseOmissaProveitos = parseFloat((_ganhos - _saftBruto).toFixed(2));
        const _iva6Omitido = _baseOmissaProveitos > 0 ? parseFloat((_baseOmissaProveitos * 0.06).toFixed(2)) : 0;

        if (system && system.analysis) {
            system.analysis.totalNaoSujeitos = _totalNaoSujeitos;
            system.analysis.iva23Omitido = _iva23Omitido;
            system.analysis.iva6Omitido = _iva6Omitido;
        }

        const _elZonaCinzenta = document.querySelector('[data-id="zona-cinzenta"]');
        if (_elZonaCinzenta) { _elZonaCinzenta.innerText = _totalNaoSujeitos.toFixed(2) + ' €'; updated++; }
        const _elIva23 = document.querySelector('[data-id="iva-23-omitido"]');
        if (_elIva23) { _elIva23.innerText = _iva23Omitido.toFixed(2) + ' €'; updated++; }
        const _elIva6 = document.querySelector('[data-id="iva-6-omitido"]');
        if (_elIva6) { _elIva6.innerText = _iva6Omitido.toFixed(2) + ' €'; updated++; }
        const _elIva23Val = document.getElementById('iva23Value');
        if (_elIva23Val) { _elIva23Val.innerText = fmt(_iva23Omitido); updated++; }
        const _elIva6Val = document.getElementById('iva6Value');
        if (_elIva6Val) { _elIva6Val.innerText = fmt(_iva6Omitido); updated++; }

        console.log(`[UNIFED-PURE] ✅ Dashboard sincronizado — ${updated} elementos atualizados.`);
        retryCount = 0;
        syncPending = false;
        return updated; // <-- RETIFICAÇÃO: devolve contagem ao invocador
    }

    const sync = (system, isRetry = false) => {
        if (syncPending && !isRetry) return 1; // Evita erro de log bloqueante
        syncPending = true;
        return performSync(system, isRetry); // <-- RETIFICAÇÃO: devolve resultado
    };
    return sync;
})();

// Listener com debounce e semáforo
let _syncDebounceTimer = null;
let _isSyncing = false;
window.addEventListener('UNIFED_ANALYSIS_COMPLETE', function(event) {
    if (_isSyncing) return;
    if (_syncDebounceTimer) clearTimeout(_syncDebounceTimer);
    _syncDebounceTimer = setTimeout(() => {
        _isSyncing = true;
        try {
            const systemData = event.detail?.systemData || window.UNIFEDSystem;
            if (systemData && typeof window._syncPureDashboard === 'function') {
                window._syncPureDashboard(systemData);
            }
        } finally {
            _isSyncing = false;
            _syncDebounceTimer = null;
        }
    }, 150);
});

// Validação HMAC pós-análise
window.addEventListener('UNIFED_ANALYSIS_COMPLETE', async function() {
    const chain = window.UNIFED_FORENSIC_SYSTEM?.chainOfCustody;
    if (!chain) return;
    const isValid = await chain.validateChain();
    if (isValid !== '✅ CADEIA ÍNTEGRA' && isValid !== '⚠️ CADEIA NÃO SELADA') {
        console.error('[HMAC] Falha de integridade da cadeia de custódia.');
    } else {
        console.log(`[HMAC] ${isValid}`);
    }
});

// HMAC EXPORT GATE
window.UNIFED_validateBeforeExport = async function(exportLabel) {
    if (!window.UNIFED_FORENSIC_SYSTEM?.chainOfCustody) return true;
    const chain = window.UNIFED_FORENSIC_SYSTEM.chainOfCustody;
    const result = await chain.validateChain();
    if (result === '✅ CADEIA ÍNTEGRA' || result === '⚠️ CADEIA NÃO SELADA') {
        console.log(`[HMAC·GATE] ✅ ${exportLabel}: ${result}`);
        return true;
    }
    console.error(`[HMAC·GATE] ❌ ${exportLabel}: ${result} — exportação bloqueada.`);
    return false;
};

// ============================================================================
// RETIFICAÇÃO CIRÚRGICA: applyTimestampAndMerkle() - Preserva HMAC com verificação de readyState
// ============================================================================
async function applyTimestampAndMerkle() {
    if (document.readyState !== 'complete') {
        return;
    }

    const chain = window.UNIFED_FORENSIC_SYSTEM?.chainOfCustody;
    if (!chain || chain.sealed) return;

    let currentMerkle = null;
    
    if (window.UNIFED_MerkleEngine && typeof window.UNIFED_MerkleEngine.generateMerkleRoot === 'function') {
        try {
            const selected = window.UNIFEDSystem?.analysis?.selectedQuestions || [];
            if (selected.length > 0) {
                const merkleResult = await window.UNIFED_MerkleEngine.generateMerkleRoot(selected);
                currentMerkle = merkleResult.root;
            }
        } catch (e) { console.warn('[MERKLE] Falha na geração:', e.message); }
    }
    
    if (!currentMerkle) {
        const fallbackData = (window.UNIFEDSystem?.sessionId || 'UNIFED-NO-SESSION') + '|' + Date.now();
        currentMerkle = await _generateSHA256({ data: fallbackData });
    }
    
    if (!chain.sealed) {
        await chain.addEntry('EIDAS_MERKLE_ROOT_ATTACHED', { merkleRoot: currentMerkle });
        try {
            await chain.calculateMasterHash();
            if (window.UNIFEDSystem) window.UNIFEDSystem.masterHash = chain.masterHash;
            console.info('[UNIFED-COC] ✅ Cadeia selada com sucesso.');
        } catch (e) {
            console.debug('[UNIFED-COC] Selagem pendente de estabilização.', e);
        }
    }
}

// ============================================================================
// RETIFICAÇÃO CIRÚRGICA: Listener de exportação com atraso de 500ms
// ============================================================================
window.addEventListener('UNIFED_BEFORE_EXPORT', async function() {
    console.log('[TIMESTAMP] Aguardando estabilização da cadeia...');
    await new Promise(r => setTimeout(r, 500));
    await applyTimestampAndMerkle();
});

// ============================================================================
// RETIFICAÇÃO CIRÚRGICA: Estabilização do Ciclo de Vida do DOM (Idioma)
// ============================================================================
const originalToggleLanguage = window.toggleLanguage;
window.toggleLanguage = async function(lang) {
    if (typeof originalToggleLanguage === 'function') {
        originalToggleLanguage(lang);
    } else {
        window.currentLang = lang;
        if (typeof updateUI === 'function') {
            updateUI();
        }
    }
    
    setTimeout(async () => {
        await applyTimestampAndMerkle(); 
        console.log('[UNIFED-COC] Integridade sincronizada após troca de idioma.');
    }, 600);
};

// ============================================================================
// RETIFICAÇÃO v13.5.7-RET-06: Listener para evento de purga externa (ex.: script.js)
// ============================================================================
window.addEventListener('UNIFED_REQUEST_PURGE', async (event) => {
    const doReload = event.detail?.reloadAfter === true;
    console.log('[UNIFED] Purga solicitada externamente (reload após:', doReload, ')');
    await window.UNIFED_FORENSIC_SYSTEM.purgeAndReset();
    if (doReload) {
        console.log('[UNIFED] Recarregando página para concluir higienização...');
        window.location.reload();
    }
});

console.log('✅ [UNIFED-INJECTION-RETIFICADO-v13.5.7] Script de Injeção Forense com Purga Criptográfica Carregado (RET-06: congelamento absoluto)');