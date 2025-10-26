import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StoreKnowledgeRequest {
  title: string;
  content: string;
  sourceType: 'reflection' | 'task_result' | 'user_input' | 'ai_insight';
  sourceId?: string;
  tags?: string[];
  relevanceScore?: number;
}

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-004', // Google's text embedding model
        input: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Embedding API error:', response.status, errorText);
      throw new Error(`Failed to generate embedding: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      title,
      content,
      sourceType,
      sourceId,
      tags = [],
      relevanceScore = 1.0
    }: StoreKnowledgeRequest = await req.json();

    if (!title || !content || !sourceType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, content, sourceType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Generating embedding for knowledge:', title);

    // Combine title and content for better semantic representation
    const textToEmbed = `${title}\n\n${content}`;
    const embedding = await generateEmbedding(textToEmbed, lovableApiKey);

    console.log('Embedding generated, storing in database...');

    // Store knowledge with embedding
    const { data: knowledge, error } = await supabase
      .from('knowledge_base')
      .insert({
        title,
        content,
        embedding,
        source_type: sourceType,
        source_id: sourceId,
        tags,
        relevance_score: relevanceScore
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Knowledge stored successfully:', knowledge.id);

    return new Response(
      JSON.stringify({
        success: true,
        knowledge: {
          id: knowledge.id,
          title: knowledge.title,
          content: knowledge.content,
          sourceType: knowledge.source_type,
          tags: knowledge.tags,
          createdAt: knowledge.created_at
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in store-knowledge:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
