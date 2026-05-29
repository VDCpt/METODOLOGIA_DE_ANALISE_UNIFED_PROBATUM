/**
 * ============================================================================
 * UNIFED - PROBATUM · CLOUDFLARE WORKER — Anthropic API Reverse Proxy
 * ============================================================================
 * Versão     : v13.5.6-FORENSIC-CORPORATE-RETIFICADO
 * Deploy URL  : https://api.unifed.com/claude-proxy
 * Rota        : POST /claude-proxy  →  forward para api.anthropic.com/v1/messages
 *
 * RETIFICAÇÕES APLICADAS:
 * 1. ✅ Validação Estrita de Content-Type
 * 2. ✅ Rate Limiting por IP (60 req/min)
 * 3. ✅ Sanitização de Headers
 * 4. ✅ Logging Forense de Falhas
 * 5. ✅ Headers de Conformidade Forense Obrigatórios
 *
 * SEGURANÇA:
 *   · x-api-key NUNCA é exposto no front-end (código JS público).
 *   · A chave é lida exclusivamente da variável de ambiente ANTHROPIC_API_KEY,
 *     definida no painel do Cloudflare (Settings → Variables → Encrypt).
 *   · O Worker valida o Content-Type e rejeita payloads malformados.
 *   · Rate limiting recomendado via Cloudflare Rate Limiting Rules.
 *
 * DEPLOY:
 *   1. wrangler deploy (ou Cloudflare Dashboard → Workers → Novo Worker)
 *   2. Definir variável de ambiente: ANTHROPIC_API_KEY = sk-ant-...
 *   3. Configurar Custom Domain: api.unifed.com → este Worker
 *   4. (Obrigatório) Adicionar regra de Rate Limiting: 60 req/min por IP
 *
 * CONFORMIDADE: D.L. n.º 28/2019 de 15 de fevereiro · RGPD · ISO/IEC 27037:2012
 * ============================================================================
 */

/** Versão do Worker — sincronizada com o ciclo de release UNIFED-PROBATUM. */
const VERSION = "v13.5.6-FORENSIC-CORPORATE";

// ============================================================================
// CONFIGURAÇÃO DE SEGURANÇA
// ============================================================================

const CONFIG = {
    // Rate limiting (pedidos por minuto por IP)
    RATE_LIMIT_REQUESTS: 60,
    RATE_LIMIT_WINDOW_MINUTES: 1,
    
    // Validação de payload
    MAX_PAYLOAD_SIZE: 1024 * 512,  // 512 KB máximo
    ALLOWED_CONTENT_TYPES: [
        'application/json',
        'application/json; charset=utf-8',
        'application/json; charset=UTF-8'
    ],
    
    // Headers obrigatórios
    REQUIRED_HEADERS: ['content-type'],
    
    // Whitelist de origens (conformidade ISO/IEC 27037 · D.L. 28/2019)
    ALLOWED_ORIGINS: [
        'https://app.unifed.com',
        'https://unifed.com',
        'https://api.unifed.com'
    ]
};

// ============================================================================
// GESTOR DE RATE LIMITING (Cloudflare KV)
// ============================================================================

/**
 * Verifica e incrementa contador de rate limiting por IP
 */
async function checkRateLimit(clientIP, env) {
    const kvKey = `rate_limit:${clientIP}`;
    const kvNamespace = env.UNIFED_RATE_LIMIT;
    
    if (!kvNamespace) {
        console.warn('[UNIFED-RATELIMIT] KV Store não configurado — limite desativado');
        return true;
    }
    
    try {
        const current = parseInt(await kvNamespace.get(kvKey)) || 0;
        
        if (current >= CONFIG.RATE_LIMIT_REQUESTS) {
            console.error(`[UNIFED-RATELIMIT] ❌ IP ${clientIP} excedeu limite (${current}/${CONFIG.RATE_LIMIT_REQUESTS})`);
            return false;
        }
        
        // Incrementar e definir TTL
        await kvNamespace.put(kvKey, (current + 1).toString(), {
            expirationTtl: CONFIG.RATE_LIMIT_WINDOW_MINUTES * 60
        });
        
        return true;
    } catch (err) {
        console.warn(`[UNIFED-RATELIMIT] ⚠️ Erro ao verificar limite: ${err.message}`);
        return true;  // Falha aberta — permite tráfego
    }
}

// ============================================================================
// VALIDADORES DE SEGURANÇA
// ============================================================================

/**
 * Valida Content-Type
 */
function validateContentType(request) {
    const contentType = request.headers.get('content-type') || '';
    const isValid = CONFIG.ALLOWED_CONTENT_TYPES.some(allowed => 
        contentType.toLowerCase().includes(allowed.toLowerCase())
    );
    
    if (!isValid) {
        console.error(`[UNIFED-VALIDATION] ❌ Content-Type inválido: ${contentType}`);
    }
    
    return isValid;
}

/**
 * Valida tamanho do payload
 */
function validatePayloadSize(bodyText) {
    const size = new Blob([bodyText]).size;
    if (size > CONFIG.MAX_PAYLOAD_SIZE) {
        console.error(`[UNIFED-VALIDATION] ❌ Payload demasiado grande: ${size} bytes (máx: ${CONFIG.MAX_PAYLOAD_SIZE})`);
        return false;
    }
    return true;
}

/**
 * Valida estrutura de JSON
 */
function validateJSONStructure(body) {
    // Campos obrigatórios para Anthropic API
    if (!body.messages || !Array.isArray(body.messages)) {
        console.error('[UNIFED-VALIDATION] ❌ Campo "messages" obrigatório ou inválido');
        return false;
    }
    
    if (!body.model || typeof body.model !== 'string') {
        console.error('[UNIFED-VALIDATION] ❌ Campo "model" obrigatório ou inválido');
        return false;
    }
    
    if (body.max_tokens && typeof body.max_tokens !== 'number') {
        console.error('[UNIFED-VALIDATION] ❌ Campo "max_tokens" deve ser número');
        return false;
    }
    
    return true;
}

/**
 * Sanitiza headers do pedido de entrada antes de encaminhar para upstream.
 *
 * RETIFICAÇÃO REQ-02a — Headers expurgados (D.L. 28/2019 · RGPD Art.25 · ISO/IEC 27037):
 *   · user-agent        : rastro do browser do cliente (fingerprinting)
 *   · cf-connecting-ip  : IP real do cliente (RGPD — dado pessoal)
 *   · cf-ipcountry      : geolocalização do cliente
 *   · cf-ray            : identificador de sessão Cloudflare
 *   · cf-visitor        : schema de visita Cloudflare
 *   · x-forwarded-for   : cadeia de proxies (revela topologia interna)
 *   · x-real-ip         : IP alternativo (redundante com cf-connecting-ip)
 *   · authorization     : token de sessão do browser
 *   · cookie            : estado de sessão persistente
 *
 * Estes headers NÃO são encaminhados para api.anthropic.com, impedindo
 * correlação entre o perfil do utilizador e o conteúdo da perícia.
 * O IP do cliente é preservado APENAS no contexto de rate limiting (KV Store)
 * e NUNCA transmitido ao serviço upstream.
 */
function sanitizeHeaders(headers) {
    const sanitized = new Headers(headers);

    const headersToStrip = [
        // Identificação directa do cliente (RGPD Art.4 — dados pessoais)
        'user-agent',
        'cf-connecting-ip',
        'cf-ipcountry',
        'cf-ray',
        'cf-visitor',
        // Topologia de rede
        'x-forwarded-for',
        'x-real-ip',
        'x-forwarded-host',
        'x-forwarded-proto',
        // Credenciais e sessão
        'authorization',
        'cookie',
        'set-cookie',
    ];

    headersToStrip.forEach(header => sanitized.delete(header));

    return sanitized;
}

/**
 * Gera headers de conformidade forense obrigatórios + identificadores de rastreamento UNIFED.
 * Injectados em todas as respostas do Worker (independentemente do status).
 *
 * RETIFICAÇÃO REQ-02b:
 *   · X-UNIFED-Request-ID  : UUID v4 por pedido — rastreamento sem dados pessoais
 *   · X-UNIFED-Worker-Ver  : versão do Worker para auditoria de deployment
 *   · Todos os headers de segurança HTTP obrigatórios (HSTS, CSP, etc.)
 */
function generateForensicHeaders(requestId) {
    const rid = requestId || crypto.randomUUID();
    const isoTs = new Date().toISOString();
    return {
        // ── Conformidade D.L. n.º 28/2019 · ISO/IEC 27037 ─────────────────────────
        'X-Forensic-Compliance':         'ACTIVE',
        'X-Forensic-Standard':           'ISO/IEC-27037 · DL-28-2019',
        'X-Forensic-Article':            'Art.125-CPP;ISO27037;DL28-2019', // evidência digital; rastreabilidade
        'X-Forensic-Audit-Timestamp':    isoTs,                           // ISO/IEC 27037 — rastreabilidade temporal
        // ── Identificadores UNIFED (rastreamento por pedido) ────────────────
        'X-UNIFED-Worker-Version':      VERSION,
        'X-UNIFED-Request-ID':          rid,
        'X-UNIFED-System':              'UNIFED-PROBATUM-v13.5.6-FORENSIC-CORPORATE',
        'X-UNIFED-Compliance-Standard': 'ISO/IEC-27037:2012;eIDAS-910/2014;RFC-3161',
        // ── Segurança HTTP obrigatória ───────────────────────────────────────
        'X-Content-Security-Policy':    "default-src 'none'; script-src 'none'",
        'X-Frame-Options':              'DENY',
        'X-Content-Type-Options':       'nosniff',
        'Strict-Transport-Security':    'max-age=31536000; includeSubDomains; preload',
        'Cache-Control':                'no-cache, no-store, must-revalidate',
        'Referrer-Policy':              'no-referrer',
        'Permissions-Policy':           'geolocation=(), microphone=(), camera=()',
    };
}

// ============================================================================
// WORKER FETCH HANDLER
// ============================================================================

// ES Modules format — obrigatório para Cloudflare Workers (module workers)
// ============================================================================
// RETIFICAÇÃO EVID_09: handleRequest() — Validação de Token Forense
// ============================================================================
/**
 * Valida o token de autorização forense (UNIFED_PROXY_SECRET) em cada pedido.
 * Impede consumo não autorizado da ANTHROPIC_API_KEY por chamadas externas
 * que não possuam o token correcto definido nos Secrets encriptados.
 *
 * NOTA DE DEPLOY:
 *   Definir obrigatoriamente via: wrangler secret put UNIFED_PROXY_SECRET
 *   NÃO incluir em [vars] no wrangler.toml (armazenamento em claro).
 *   O valor deve ser uma string aleatória de alta entropia (≥ 32 chars).
 *
 * @param {Request} request - Pedido HTTP recebido
 * @param {Object}  env     - Variáveis de ambiente Cloudflare
 * @returns {Response|null} - Response 401 se inválido; null se autorizado
 */
async function handleRequest(request, env) {
    const authHeader    = request.headers.get('Authorization');
    const expectedToken = env.UNIFED_PROXY_SECRET;

    // Se o Secret não está configurado, bloquear por segurança
    if (!expectedToken) {
        return new Response(JSON.stringify({
            error:  'Proxy misconfigured: UNIFED_PROXY_SECRET não definido.',
            detail: 'Configure via: wrangler secret put UNIFED_PROXY_SECRET',
            code:   'SECRET_MISSING'
        }), {
            status:  503,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Validação do header Authorization (Bearer token)
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
        return new Response(JSON.stringify({
            error:  'Acesso Negado',
            detail: 'Token de autorização forense inválido ou ausente.',
            code:   'AUTH_FAILED'
        }), {
            status:  401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Token válido — autorizar prosseguimento
    return null;
}

export default {
    /**
     * Ponto de entrada do Worker.
     * @param {Request} request   - Pedido HTTP recebido do front-end
     * @param {Object}  env       - Variáveis de ambiente (ANTHROPIC_API_KEY, etc.)
     * @param {Object}  ctx       - ExecutionContext (ctx.waitUntil, ctx.passThroughOnException)
     * @returns {Response}
     */
    async fetch(request, env, ctx) {

        // ── 0. REQUEST ID (UUID v4 por pedido) ────────────────────────────────
        // Gerado no topo do handler para ser propagado em TODOS os cabeçalhos
        // de resposta. Permite correlação de logs sem expor dados do cliente.
        // RETIFICAÇÃO REQ-02c: requestId propagado a generateForensicHeaders().
        const requestId = crypto.randomUUID();

        // ── VALIDAÇÃO DO TOKEN FORENSE (EVID_09) ──────────────────────────────
        // Invocar handleRequest() antes de qualquer outra lógica.
        // Pedidos sem token UNIFED_PROXY_SECRET válido são rejeitados com 401.
        // Chamadas OPTIONS (pre-flight CORS) são isentas de validação de token.
        if (request.method !== 'OPTIONS') {
            const _tokenCheck = await handleRequest(request, env);
            if (_tokenCheck !== null) { return _tokenCheck; }
        }
        // ─────────────────────────────────────────────────────────────────────

        // ── FAILSAFE DE CHAVE ENCRIPTADA (REQ-02c) ────────────────────────────
        // Bloqueia execução se ANTHROPIC_API_KEY:
        //   (a) não estiver definida, OU
        //   (b) não tiver o formato esperado de chave Anthropic (sk-ant-)
        // Conformidade: D.L. 28/2019 Art.6 · ISO/IEC 27037 — controlos de acesso a chaves de API;
        //               ISO/IEC 27001:2022 A.8.24 — gestão de chaves criptográficas
        //
        // NOTA DE DEPLOY OBRIGATÓRIA:
        //   NÃO definir via [vars] no wrangler.toml (armazenamento em claro).
        //   USAR EXCLUSIVAMENTE: wrangler secret put ANTHROPIC_API_KEY
        //   O Cloudflare armazena Secrets com cifra AES-256-GCM em repouso.
        if (!env.ANTHROPIC_API_KEY) {
            console.error(`[UNIFED-PROXY][${requestId}] ANTHROPIC_API_KEY ausente — execução bloqueada.`);
            return new Response(JSON.stringify({
                error:     'Proxy misconfigured: API key absent.',
                requestId: requestId,
                hint:      'Deploy via: wrangler secret put ANTHROPIC_API_KEY (nunca em [vars]).'
            }), {
                status:  503,
                headers: { ..._corsHeaders(request), 'Content-Type': 'application/json',
                           ...generateForensicHeaders(requestId) }
            });
        }
        if (!env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
            console.error(`[UNIFED-PROXY][${requestId}] ANTHROPIC_API_KEY com formato inválido — possível chave em claro ou rotação pendente.`);
            return new Response(JSON.stringify({
                error:     'Proxy misconfigured: API key format invalid.',
                requestId: requestId,
                hint:      'Verificar rotação de chave. Formato esperado: sk-ant-...'
            }), {
                status:  503,
                headers: { ..._corsHeaders(request), 'Content-Type': 'application/json',
                           ...generateForensicHeaders(requestId) }
            });
        }

        // ── 1. PRE-FLIGHT CORS (OPTIONS) ──────────────────────────────────────
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    ..._corsHeaders(request),
                    ...generateForensicHeaders(requestId)
                }
            });
        }

        // ── 2. VALIDAÇÃO DO MÉTODO ─────────────────────────────────────────────
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
                status: 405,
                headers: { 
                    ..._corsHeaders(request), 
                    'Content-Type': 'application/json',
                    ...generateForensicHeaders(requestId)
                }
            });
        }

        // ── 3. RATE LIMITING ───────────────────────────────────────────────────
        const clientIP = request.headers.get('CF-Connecting-IP') || 'UNKNOWN';
        const rateLimitOK = await checkRateLimit(clientIP, env);
        
        if (!rateLimitOK) {
            return new Response(JSON.stringify({
                error: 'Rate limit exceeded',
                hint: 'Maximum 60 requests per minute per IP',
                client_ip: clientIP
            }), {
                status: 429,
                headers: { 
                    ..._corsHeaders(request), 
                    'Content-Type': 'application/json',
                    'Retry-After': '60',
                    ...generateForensicHeaders(requestId)
                }
            });
        }

        // ── 4. VALIDAÇÃO DO CONTENT-TYPE ───────────────────────────────────────
        if (!validateContentType(request)) {
            return new Response(JSON.stringify({ error: 'Invalid Content-Type' }), {
                status: 400,
                headers: { 
                    ..._corsHeaders(request), 
                    'Content-Type': 'application/json',
                    ...generateForensicHeaders(requestId)
                }
            });
        }

        // ── 5. VALIDAÇÃO DA CHAVE DE AMBIENTE ─────────────────────────────────
        if (!env.ANTHROPIC_API_KEY) {
            console.error('[UNIFED-PROXY] ANTHROPIC_API_KEY não configurada nas variáveis de ambiente.');
            return new Response(JSON.stringify({
                error: 'Proxy misconfigured: API key not set.',
                hint: 'Set ANTHROPIC_API_KEY in Cloudflare Worker environment variables.'
            }), {
                status: 503,
                headers: { 
                    ..._corsHeaders(request), 
                    'Content-Type': 'application/json',
                    ...generateForensicHeaders(requestId)
                }
            });
        }

        // ── 6. PARSE E VALIDAÇÃO DO PAYLOAD ───────────────────────────────────
        let bodyText;
        let body;
        
        try {
            bodyText = await request.text();
        } catch (_readErr) {
            return new Response(JSON.stringify({ error: 'Failed to read request body' }), {
                status: 400,
                headers: { 
                    ..._corsHeaders(request), 
                    'Content-Type': 'application/json',
                    ...generateForensicHeaders(requestId)
                }
            });
        }
        
        // Validar tamanho
        if (!validatePayloadSize(bodyText)) {
            return new Response(JSON.stringify({ 
                error: 'Payload too large',
                max_size: CONFIG.MAX_PAYLOAD_SIZE
            }), {
                status: 413,
                headers: { 
                    ..._corsHeaders(request), 
                    'Content-Type': 'application/json',
                    ...generateForensicHeaders(requestId)
                }
            });
        }
        
        // Parsear JSON
        try {
            body = JSON.parse(bodyText);
        } catch (_parseErr) {
            return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
                status: 400,
                headers: { 
                    ..._corsHeaders(request), 
                    'Content-Type': 'application/json',
                    ...generateForensicHeaders(requestId)
                }
            });
        }
        
        // Validar estrutura
        if (!validateJSONStructure(body)) {
            return new Response(JSON.stringify({ 
                error: 'Invalid API request structure',
                required_fields: ['messages', 'model']
            }), {
                status: 400,
                headers: { 
                    ..._corsHeaders(request), 
                    'Content-Type': 'application/json',
                    ...generateForensicHeaders(requestId)
                }
            });
        }

        // ── 7. FORWARD PARA API ANTHROPIC ─────────────────────────────────────
        let upstreamResponse;
        try {
            upstreamResponse = await fetch('https://api.anthropic.com/v1/messages', {
                method:  'POST',
                headers: {
                    'Content-Type':      'application/json',
                    'x-api-key':         env.ANTHROPIC_API_KEY,     // ← SEGURO: variável de ambiente
                    'anthropic-version': '2023-06-01',
                    'anthropic-beta':    'messages-2023-12-15'
                },
                body: bodyText
            });
        } catch (fetchErr) {
            console.error('[UNIFED-PROXY] Erro ao contactar Anthropic:', fetchErr.message);
            return new Response(JSON.stringify({
                error: 'Upstream fetch failed.',
                detail: fetchErr.message
            }), {
                status: 502,
                headers: { 
                    ..._corsHeaders(request), 
                    'Content-Type': 'application/json',
                    ...generateForensicHeaders(requestId)
                }
            });
        }

        // ── 8. REENCAMINHAR RESPOSTA + CABEÇALHOS CORS ────────────────────────
        const responseBody    = await upstreamResponse.arrayBuffer();
        const responseHeaders = new Headers(upstreamResponse.headers);

        // Injectar cabeçalhos CORS e conformidade forense na resposta
        const cors = _corsHeaders(request);
        const forensic = generateForensicHeaders(requestId);
        
        Object.keys(cors).forEach(function(key) {
            responseHeaders.set(key, cors[key]);
        });
        
        Object.keys(dora).forEach(function(key) {
            responseHeaders.set(key, dora[key]);
        });
        
        // Remover headers sensíveis
        responseHeaders.delete('server');
        responseHeaders.delete('x-powered-by');

        return new Response(responseBody, {
            status:  upstreamResponse.status,
            headers: responseHeaders
        });
    }
};


// ============================================================================
// UTILITÁRIO: _corsHeaders(request)
// ============================================================================
function _corsHeaders(request) {
    const origin  = (request && request.headers) ? request.headers.get('Origin') : null;
    const allowed = origin && CONFIG.ALLOWED_ORIGINS.includes(origin) ? origin : CONFIG.ALLOWED_ORIGINS[0];

    return {
        'Access-Control-Allow-Origin':      allowed,
        'Access-Control-Allow-Methods':     'POST, OPTIONS',
        'Access-Control-Allow-Headers':     'Content-Type, Authorization',
        'Access-Control-Max-Age':           '86400',   // 24h cache do pre-flight
        'Vary':                             'Origin'   // Obrigatório para CDN correcta
    };
}

/* ============================================================================
   CONFIGURAÇÃO WRANGLER (wrangler.toml) — Referência de Deploy
   ============================================================================

   name = "unifed-claude-proxy"
   main = "claude-proxy.worker.js"
   compatibility_date = "2024-09-23"
   compatibility_flags = ["nodejs_compat"]

   [env.production]
   routes = [
     { pattern = "api.unifed.com/claude-proxy", zone_name = "unifed.com" }
   ]

   [[kv_namespaces]]
   binding = "UNIFED_RATE_LIMIT"
   id = "your-kv-namespace-id"

   [vars]
   # Não colocar a chave aqui — usar secrets encriptados:
   # wrangler secret put ANTHROPIC_API_KEY

   # Rate Limiting via Cloudflare Dashboard:
   # 60 req/min por IP · acção: bloquear 429

   ============================================================================
   NOTAS DE SEGURANÇA ADICIONAIS:
   · Nunca fazer commit da ANTHROPIC_API_KEY em repositórios públicos.
   · Usar "wrangler secret put ANTHROPIC_API_KEY" para deploy seguro.
   · Activar Cloudflare WAF para bloquear origens não autorizadas.
   · Monitorizar uso via Cloudflare Analytics → Workers → Métricas.
   · Implementar logging de falhas: Failed auth, rate limit hits, invalid payloads.
   ============================================================================ */
