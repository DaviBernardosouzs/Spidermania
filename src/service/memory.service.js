import { GoogleGenAI } from '@google/genai';
import pg from 'pg';
import {
    IA_APIKEY,
    DATABASE_URL
} from '../config/env.js';

const { Pool } = pg;

export class MemoryManager {
    constructor() {
        this.ai = new GoogleGenAI({
            apiKey: process.env.IA_APIKEY
        });
        
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL
        });
    }

    async gerarEmbedding(texto) {
        const response = await this.ai.models.embedContent({
            model: 'gemini-embedding-001',
            contents: texto,
            config: {
                outputDimensionality: 1536
            }
        });

        return response.embeddings[0].values;
    }

    vetorParaPg(vector) {
        return `[${vector.join(',')}]`;
    }

    // Salvar Memoria 
    async salvarMemoria({
        userKey,
        categoria,
        contexto,
        confiabilidade = 1.0,
        explicitamenteSolicitada = false
    }) {
        const embedding = await this.gerarEmbedding(contexto);
        const vetor = this.vetorParaPg(embedding);

        // Primeiro procura se já existe uma memória muito parecida
        const existente = await this.pool.query(
            `
            SELECT
                id,
                context,
                1 - (embeddings <=> $1::vector) AS similaridade
            FROM context_memory
            WHERE user_key = $2
              AND ativa = TRUE
              AND embeddings IS NOT NULL
            ORDER BY embeddings <=> $1::vector
            LIMIT 1
            `,
            [vetor, userKey]
        );

        // Se encontrou uma memória praticamente igual (>= 90%), atualiza
        if (
            existente.rows.length > 0 &&
            Number(existente.rows[0].similaridade) >= 0.90
        ) {
            await this.pool.query(
                `
                UPDATE context_memory
                SET
                    context = $1,
                    categoria = $2,
                    confiabilidade = GREATEST(confiabilidade, $3),
                    confirmacoes = confirmacoes + 1,
                    explicitamente_solicitada = explicitamente_solicitada OR $4,
                    embeddings = $5::vector,
                    last_used_at = NOW(),
                    updated_at = NOW(),
                    ativa = TRUE
                WHERE id = $6
                `,
                [
                    contexto,
                    categoria,
                    confiabilidade,
                    explicitamenteSolicitada,
                    vetor,
                    existente.rows[0].id
                ]
            );

            console.log('🧠 Memória atualizada:', contexto);

            return {
                acao: 'atualizada',
                id: existente.rows[0].id
            };
        }

        // Caso seja uma memória nova
        const result = await this.pool.query(
            `
            INSERT INTO context_memory (
                categoria,
                user_key,
                context,
                embeddings,
                confiabilidade,
                confirmacoes,
                explicitamente_solicitada
            )
            VALUES (
                $1, $2, $3, $4::vector, $5, 1, $6
            )
            RETURNING id
            `,
            [
                categoria,
                userKey,
                contexto,
                vetor,
                confiabilidade,
                explicitamenteSolicitada
            ]
        );

        console.log('🧠 Nova memória:', contexto);

        return {
            acao: 'criada',
            id: result.rows[0].id
        };
    }

    // Buscar memorias relevantes 
    async buscarMemorias(userKey, mensagem, limite = 8) {
        const embedding = await this.gerarEmbedding(mensagem);
        const vetor = this.vetorParaPg(embedding);

        const result = await this.pool.query(
            `
            SELECT
                id,
                categoria,
                context,
                confiabilidade,
                explicitamente_solicitada,
                1 - (embeddings <=> $1::vector) AS similaridade
            FROM context_memory
            WHERE user_key = $2
              AND ativa = TRUE
              AND embeddings IS NOT NULL
            ORDER BY embeddings <=> $1::vector
            LIMIT $3
            `,
            [vetor, userKey, limite]
        );

        return result.rows;
    }

    // Esquecer Memoria
    async esquecerMemoria(userKey, texto) {
        const embedding = await this.gerarEmbedding(texto);
        const vetor = this.vetorParaPg(embedding);

        const result = await this.pool.query(
            `
            UPDATE context_memory
            SET
                ativa = FALSE,
                updated_at = NOW()
            WHERE id = (
                SELECT id
                FROM context_memory
                WHERE user_key = $2
                  AND ativa = TRUE
                  AND embeddings IS NOT NULL
                ORDER BY embeddings <=> $1::vector
                LIMIT 1
            )
            RETURNING context
            `,
            [vetor, userKey]
        );

        return result.rows[0] || null;
    }

    // Analisar se uma conversa deve gerar memória
    async analisarMemoria(textoUsuario, respostaIA) {
        const prompt = `
Analise a conversa abaixo e determine se existe alguma informação
RELEVANTE E PERSISTENTE que a IA deveria lembrar sobre o usuário.

Não salve:
- perguntas comuns;
- informações temporárias;
- coisas óbvias;
- conversa casual;
- informações que só servem para esta conversa.

Considere salvar:
- preferências;
- instruções permanentes;
- correções de comportamento;
- hábitos;
- informações pessoais relevantes;
- regras sobre como a IA deve responder;
- decisões importantes de projetos;
- coisas que o usuário claramente espera que a IA lembre.

Se existir algo relevante, responda SOMENTE neste JSON:
{
    "deveSalvar": true,
    "categoria": "preferencia",
    "memoria": "descrição objetiva da informação",
    "confiabilidade": 0.9
}

Se não existir:
{
    "deveSalvar": false
}

MENSAGEM DO USUÁRIO:
${textoUsuario}

RESPOSTA DA IA:
${respostaIA}
`;

        const response = await this.ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        try {
            return JSON.parse(response.text);
        } catch {
            return {
                deveSalvar: false
            };
        }
    }
}