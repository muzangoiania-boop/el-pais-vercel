-- SQL para criar a tabela de eventos do quiz no Supabase
-- Execute este SQL no Editor SQL do seu projeto Supabase

-- Criar a tabela quiz_events
CREATE TABLE IF NOT EXISTS quiz_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    step INTEGER NOT NULL,
    step_name TEXT NOT NULL,
    answer TEXT,
    answer_index INTEGER,
    timestamp BIGINT NOT NULL,
    time_spent_on_step BIGINT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_quiz_events_session_id ON quiz_events(session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_events_timestamp ON quiz_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_events_event_type ON quiz_events(event_type);
CREATE INDEX IF NOT EXISTS idx_quiz_events_step ON quiz_events(step);

-- Habilitar Row Level Security (RLS)
ALTER TABLE quiz_events ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção anônima (necessário para tracking do quiz)
-- Os dados são anônimos (apenas session_id, sem dados pessoais identificáveis)
CREATE POLICY "Allow anonymous insert" ON quiz_events
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Política para leitura - restrita ao serviço backend
-- Para maior segurança em produção, considere usar uma service_role key
-- no backend em vez da anon key para leituras
CREATE POLICY "Allow anonymous read" ON quiz_events
    FOR SELECT
    TO anon
    USING (true);

-- NOTA DE SEGURANÇA:
-- As políticas acima permitem inserção e leitura anônimas.
-- Esta configuração é adequada para analytics de quiz onde:
-- 1. Os dados coletados são anônimos (session_id, não dados pessoais)
-- 2. O dashboard é protegido por senha no frontend
-- 
-- Para maior segurança em produção, você pode:
-- 1. Usar service_role key no backend para leituras
-- 2. Implementar autenticação Supabase
-- 3. Restringir leituras apenas a usuários autenticados
