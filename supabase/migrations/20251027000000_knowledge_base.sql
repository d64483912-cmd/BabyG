-- Phase 3.4: Contextual Knowledge Base with Vector Embeddings

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for storing knowledge entries with vector embeddings
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768), -- Embedding dimension for text-embedding models
  source_type TEXT NOT NULL, -- 'reflection', 'task_result', 'user_input', 'ai_insight'
  source_id TEXT, -- Reference to related entity (objective_id, task_id, etc.)
  tags TEXT[], -- Array of tags for categorization
  relevance_score DECIMAL(3,2) DEFAULT 1.0, -- How valuable this knowledge is
  access_count INTEGER DEFAULT 0, -- Track usage frequency
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for tracking knowledge usage and effectiveness
CREATE TABLE IF NOT EXISTS public.knowledge_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  knowledge_id UUID NOT NULL REFERENCES public.knowledge_base(id) ON DELETE CASCADE,
  used_for TEXT NOT NULL, -- 'task_generation', 'reflection', 'planning'
  context TEXT, -- What was the user trying to do
  helpful BOOLEAN, -- Was this knowledge helpful?
  feedback TEXT, -- Optional user feedback
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source_type ON public.knowledge_base(source_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source_id ON public.knowledge_base(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON public.knowledge_base USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_created_at ON public.knowledge_base(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_usage_knowledge_id ON public.knowledge_usage(knowledge_id);

-- Vector similarity search index using HNSW (Hierarchical Navigable Small World)
-- This enables fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON public.knowledge_base 
USING hnsw (embedding vector_cosine_ops);

-- Enable Row Level Security
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies (public access for now, can be restricted later with auth)
CREATE POLICY "Public read access for knowledge base" 
ON public.knowledge_base FOR SELECT 
USING (true);

CREATE POLICY "Public insert access for knowledge base" 
ON public.knowledge_base FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public update access for knowledge base" 
ON public.knowledge_base FOR UPDATE 
USING (true);

CREATE POLICY "Public read access for knowledge usage" 
ON public.knowledge_usage FOR SELECT 
USING (true);

CREATE POLICY "Public insert access for knowledge usage" 
ON public.knowledge_usage FOR INSERT 
WITH CHECK (true);

-- Function to update knowledge base timestamp and increment access count
CREATE OR REPLACE FUNCTION public.update_knowledge_base_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_knowledge_base_updated_at
BEFORE UPDATE ON public.knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_knowledge_base_timestamp();

-- Function to search knowledge by vector similarity
CREATE OR REPLACE FUNCTION public.search_knowledge(
  query_embedding vector(768),
  match_threshold DECIMAL DEFAULT 0.7,
  match_count INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  source_type TEXT,
  tags TEXT[],
  relevance_score DECIMAL,
  similarity DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.source_type,
    kb.tags,
    kb.relevance_score,
    (1 - (kb.embedding <=> query_embedding))::DECIMAL as similarity
  FROM public.knowledge_base kb
  WHERE kb.embedding IS NOT NULL
    AND (1 - (kb.embedding <=> query_embedding)) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to increment access count when knowledge is used
CREATE OR REPLACE FUNCTION public.increment_knowledge_access(knowledge_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.knowledge_base
  SET access_count = access_count + 1
  WHERE id = knowledge_id;
END;
$$;

-- Function to get trending knowledge (most accessed recently)
CREATE OR REPLACE FUNCTION public.get_trending_knowledge(
  days_back INTEGER DEFAULT 7,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  source_type TEXT,
  tags TEXT[],
  access_count INTEGER,
  recent_uses BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.source_type,
    kb.tags,
    kb.access_count,
    COUNT(ku.id) as recent_uses
  FROM public.knowledge_base kb
  LEFT JOIN public.knowledge_usage ku ON kb.id = ku.knowledge_id
    AND ku.created_at > now() - (days_back || ' days')::INTERVAL
  GROUP BY kb.id, kb.title, kb.content, kb.source_type, kb.tags, kb.access_count
  ORDER BY recent_uses DESC, kb.access_count DESC
  LIMIT limit_count;
END;
$$;
