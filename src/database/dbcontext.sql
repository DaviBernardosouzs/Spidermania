    -- Habilita a extensão pgvector
    CREATE EXTENSION IF NOT EXISTS vector;

    -- Criação da tabela
    CREATE TABLE IF NOT EXISTS context_memory (
        id SERIAL PRIMARY KEY,
        user_key VARCHAR(255) NOT NULL,
        categoria VARCHAR(100),
        context TEXT NOT NULL,
        embeddings vector(1536),
        confiabilidade NUMERIC(3, 2) DEFAULT 1.0,
        confirmacoes INTEGER DEFAULT 1,
        explicitamente_solicitada BOOLEAN DEFAULT false,
        ativa BOOLEAN DEFAULT true,
        last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        memory_scope VARCHAR(30) NOT NULL DEFAULT 'user',
        source VARCHAR(30) NOT NULL DEFAULT 'conversation',
        visibility VARCHAR(30)[] NOT NULL DEFAULT ARRAY['peter'],
        target_agent_id VARCHAR(100),
        feedback_status VARCHAR(30) NOT NULL DEFAULT 'active'
    );

    -- Índice HNSW para busca vetorial muito mais rápida (otimizado para similaridade por cosseno)
    CREATE INDEX ON context_memory USING hnsw (embeddings vector_cosine_ops);