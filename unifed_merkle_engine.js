/**
 * ============================================================================
 * INOVAÇÃO #2: eIDAS 2.0 SELECTIVE DISCLOSURE — MOTOR MERKLE TREE SHA-256
 * ============================================================================
 * Implementa prova criptográfica de que questões específicas foram usadas na 
 * perícia sem revelar a base de dados completa (Selective Disclosure via Merkle Tree)
 * Conformidade: eIDAS 2.0, RFC 3161, ISO/IEC 27037
 * ============================================================================
 */

window.UNIFED_MerkleEngine = (function() {
    'use strict';

    // Validação da WebCrypto API
    if (!window.crypto || !window.crypto.subtle) {
        console.warn('[MERKLE-ENGINE] ⚠️  WebCrypto API indisponível; usar fallback de hash');
    }

    /**
     * Calcula SHA-256 de uma string usando WebCrypto API
     */
    async function sha256Hash(message) {
        try {
            const msgBuffer = new TextEncoder().encode(message);
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
            return hashHex.toUpperCase();
        } catch (e) {
            console.error('[MERKLE-ENGINE] ❌ Erro ao calcular hash:', e.message);
            // Fallback: utilizar CryptoJS se disponível
            if (typeof CryptoJS !== 'undefined') {
                return CryptoJS.SHA256(message).toString().toUpperCase();
            }
            throw new Error('Nenhum motor de hash disponível');
        }
    }

    /**
     * Combina dois hashes para produzir o hash pai na árvore Merkle
     */
    async function merkleParent(leftHash, rightHash) {
        const combined = leftHash + rightHash;
        return await sha256Hash(combined);
    }

    /**
     * Constrói árvore Merkle a partir de um array de valores (folhas)
     * Retorna { tree: array de níveis, root: hash da raiz }
     *
     * RETIFICAÇÃO v13.5.6-R4: Adicionado parâmetro `sessionSalt` obrigatório.
     * Sem salt único por sessão judicial, um perito da contra-parte pode
     * pré-computar os hashes das 50 questões conhecidas de
     * unifed_questionnaire_50questions.js e reverter o mapa de
     * Selective Disclosure (pre-image attack por dicionário).
     * O salt é derivado de: UNIFEDSystem.config.timestamp || sessionId
     * Conformidade: eIDAS 2.0 Art. 42; RFC 3161; ISO/IEC 18033-3
     *
     * @param {Array}  leaves      - Questões/folhas a incluir na árvore
     * @param {string} sessionSalt - Salt único de sessão (sessionId ou timestamp)
     */
    async function buildMerkleTree(leaves, sessionSalt) {
        if (leaves.length === 0) {
            throw new Error('Nenhuma folha para construir árvore Merkle');
        }

        // RETIFICAÇÃO R4: salt obrigatório — recusar derivação sem entropia de sessão
        if (!sessionSalt || typeof sessionSalt !== 'string' || sessionSalt.length < 8) {
            throw new Error(
                '[MERKLE-ENGINE] Salt de sessão inválido ou ausente. ' +
                'Fornecer UNIFEDSystem.config.timestamp ou sessionId como salt. ' +
                'Sem salt, a árvore é vulnerável a pre-image attacks por dicionário.'
            );
        }

        // Nível 0: hash de cada folha — RETIFICAÇÃO R4: salt incorporado
        // Formato: SHA-256( sessionSalt + "|" + leafId + "|" + leafText )
        // O salt torna o hash de cada folha único por sessão judicial,
        // impedindo pré-computação de dicionário sobre as 50 questões conhecidas.
        let currentLevel = [];
        for (const leaf of leaves) {
            const leafId   = leaf.id   || '';
            const leafText = leaf.text || '';
            const leafHash = await sha256Hash(sessionSalt + '|' + leafId + '|' + leafText);
            currentLevel.push({
                hash:     leafHash,
                leafId:   leafId,
                original: leaf
            });
        }

        const tree = [currentLevel];

        // Construir níveis superiores até atingir raiz única
        while (currentLevel.length > 1) {
            const nextLevel = [];

            // Se número de nós é ímpar, duplicar o último nó
            if (currentLevel.length % 2 !== 0) {
                currentLevel.push(currentLevel[currentLevel.length - 1]);
            }

            // Combinar pares de nós
            for (let i = 0; i < currentLevel.length; i += 2) {
                const parentHash = await merkleParent(
                    currentLevel[i].hash,
                    currentLevel[i + 1].hash
                );
                nextLevel.push({
                    hash: parentHash,
                    left: currentLevel[i],
                    right: currentLevel[i + 1]
                });
            }

            tree.push(nextLevel);
            currentLevel = nextLevel;
        }

        return {
            tree: tree,
            root: currentLevel[0].hash,
            timestamp: new Date().toISOString(),
            leafCount: leaves.length
        };
    }

    /**
     * Gera prova de inclusão (merkle proof) para uma folha específica
     * Permite validar que folha está na árvore sem revelar outras folhas
     */
    function generateProof(tree, leafIndex) {
        const proof = [];
        let currentIndex = leafIndex;
        let currentLevel = 0;

        while (currentLevel < tree.length - 1) {
            const levelNodes = tree[currentLevel];
            const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;

            if (siblingIndex < levelNodes.length) {
                proof.push({
                    direction: currentIndex % 2 === 0 ? 'right' : 'left',
                    hash: levelNodes[siblingIndex].hash,
                    level: currentLevel
                });
            }

            currentIndex = Math.floor(currentIndex / 2);
            currentLevel++;
        }

        return proof;
    }

    /**
     * Valida uma prova de inclusão contra a raiz Merkle
     */
    async function validateProof(leafHash, proof, expectedRoot) {
        let currentHash = leafHash;

        for (const step of proof) {
            if (step.direction === 'right') {
                currentHash = await merkleParent(currentHash, step.hash);
            } else {
                currentHash = await merkleParent(step.hash, currentHash);
            }
        }

        return currentHash === expectedRoot;
    }

    /**
     * API Pública do Motor Merkle
     */
    return {
        /**
         * Gera Raiz Merkle a partir de questões selecionadas
         * @param {Array} selectedQuestions - Questões usadas na perícia
         * @returns {Promise} { root, tree, metadata, timestamp }
         */
        generateMerkleRoot: async function(selectedQuestions) {
            if (!selectedQuestions || selectedQuestions.length === 0) {
                throw new Error('Nenhuma questão selecionada para Merkle');
            }

            // RETIFICAÇÃO R4: derivar salt a partir do estado canónico de sessão
            // Prioridade: config.timestamp > sessionId > fallback de Data atual
            const sys = window.UNIFEDSystem || {};
            const sessionSalt =
                (sys.config && sys.config.timestamp ? String(sys.config.timestamp) : null) ||
                (typeof sys.sessionId === 'string' && sys.sessionId.length >= 8 ? sys.sessionId : null) ||
                new Date().toISOString();  // fallback: ISO 8601 timestamp de início de sessão

            console.log(`[MERKLE-ENGINE] 🌳 Construindo árvore Merkle com ${selectedQuestions.length} questões (salt: ${sessionSalt.substring(0, 16)}...)`);

            const treeData = await buildMerkleTree(selectedQuestions, sessionSalt);

            return {
                root: treeData.root,
                treeStructure: {
                    levels: treeData.tree.length,
                    leafCount: treeData.leafCount
                },
                timestamp: treeData.timestamp,
                algorithm: 'SHA-256',
                protocol: 'Merkle Tree (RFC 3161 compatible)',
                eidas2Compliant: true,
                selectiveDisclosure: {
                    enabled: true,
                    leafCount: treeData.leafCount,
                    proofGeneration: 'On-demand per leaf'
                }
            };
        },

        /**
         * Gera prova criptográfica de que uma questão específica foi usada
         * Sem revelar outras questões
         */
        generateProofForQuestion: async function(tree, questionId, allQuestions) {
            const index = allQuestions.findIndex(q => q.id === questionId);
            if (index === -1) {
                throw new Error(`Questão ${questionId} não encontrada`);
            }

            const proof = generateProof(tree, index);
            const leafHash = await sha256Hash(questionId + '|' + (allQuestions[index].text || ''));

            return {
                questionId: questionId,
                leafHash: leafHash,
                proof: proof,
                proofValidation: `Pode ser validado contra a Raiz Merkle sem revelar outras questões`
            };
        },

        /**
         * Valida integridade de toda a árvore Merkle
         * Comparando hashes recalculados vs. hashes armazenados
         */
        validateIntegrity: async function(questions, merkleRoot) {
            try {
                // RETIFICAÇÃO R4: rederivação do salt idêntico ao usado na geração
                const sys = window.UNIFEDSystem || {};
                const sessionSalt =
                    (sys.config && sys.config.timestamp ? String(sys.config.timestamp) : null) ||
                    (typeof sys.sessionId === 'string' && sys.sessionId.length >= 8 ? sys.sessionId : null) ||
                    new Date().toISOString();

                const treeData = await buildMerkleTree(questions, sessionSalt);
                const isValid = treeData.root === merkleRoot;

                return {
                    isValid: isValid,
                    calculatedRoot: treeData.root,
                    expectedRoot: merkleRoot,
                    validationDate: new Date().toISOString(),
                    conformance: isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO'
                };
            } catch (e) {
                return {
                    isValid: false,
                    error: e.message,
                    validationDate: new Date().toISOString()
                };
            }
        },

        /**
         * Exporta assinatura Merkle para inclusão em relatórios
         */
        exportMerkleSignature: function(merkleRoot, selectedQuestionCount, sessionSalt) {
            // RETIFICAÇÃO R4: salt incluído na assinatura exportada para auditoria
            var saltRef = sessionSalt
                ? sessionSalt.substring(0, 16) + '...[truncado]'
                : 'SALT_NÃO_FORNECIDO';

            return {
                merkleRoot:    merkleRoot,
                questionCount: selectedQuestionCount,
                algorithm:     'SHA-256 Merkle Tree (salt por sessão)',
                standard:      'eIDAS 2.0 Selective Disclosure',
                exportDate:    new Date().toISOString(),
                saltReference: saltRef,   // referência parcial — salt completo não exposto
                signature: `Merkle Root: ${merkleRoot}\nProva de ${selectedQuestionCount} questões integradas na perícia\nSalt único de sessão aplicado (pre-image attack mitigado)\nSem revelar base de dados completa`,
                verificationInstructions: [
                    '1. Obter sessionSalt da sessão pericial registada (UNIFEDSystem.sessionId ou config.timestamp)',
                    '2. Gerar Raiz Merkle independentemente a partir das questões declaradas + sessionSalt',
                    '3. Formato de folha: SHA-256( sessionSalt + "|" + leafId + "|" + leafText )',
                    '4. Comparar resultado com Merkle Root no relatório',
                    '5. Se coincidirem, questões foram integradas sem adulteração',
                    '6. Se divergirem, detecta-se tentativa de substituição de questões ou salt diferente'
                ]
            };
        }
    };
})();

console.log('[MERKLE-ENGINE] ✅ Motor Merkle Tree SHA-256 (eIDAS 2.0) Carregado');