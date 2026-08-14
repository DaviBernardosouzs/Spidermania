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
    );

    -- Índice HNSW para busca vetorial muito mais rápida (otimizado para similaridade por cosseno)
    CREATE INDEX ON context_memory USING hnsw (embeddings vector_cosine_ops);