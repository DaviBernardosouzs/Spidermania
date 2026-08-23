-- Memória compartilhada de preferências e feedback de engenharia.
-- Execute esta migração depois de 001_context_memory.sql.

ALTER TABLE context_memory
    ADD COLUMN IF NOT EXISTS memory_scope VARCHAR(30) NOT NULL DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS source VARCHAR(30) NOT NULL DEFAULT 'conversation',
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(30)[] NOT NULL DEFAULT ARRAY['peter'],
    ADD COLUMN IF NOT EXISTS target_agent_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS feedback_status VARCHAR(30) NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS context_memory_team_feedback_idx
    ON context_memory (memory_scope, categoria, ativa)
    WHERE memory_scope = 'team';
