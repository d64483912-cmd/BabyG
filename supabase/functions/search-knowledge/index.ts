import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchKnowledgeRequest {
  query: string;
  matchThreshold?: number; // Minimum similarity score (0-1)
  matchCount?: number; // Number of results to return
  tags?: string[]; // Filter by tags
  sourceTypes?: string[]; // Filter by source types
  usageContext?: string; // Track what this search is being used for
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
        model: 'text-embedding-004',
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
      query,
      matchThreshold = 0.7,
      matchCount = 5,
      tags,
      sourceTypes,
      usageContext
    }: SearchKnowledgeRequest = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: query' }),
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

    console.log('Searching knowledge for query:', query);

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query, lovableApiKey);

    console.log('Query embedding generated, searching database...');

    // Use the database function for vector similarity search
    const { data: results, error } = await supabase
      .rpc('search_knowledge', {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount
      });

    if (error) {
      console.error('Database search error:', error);
      throw error;
    }

    // Apply additional filters if provided
    let filteredResults = results || [];

    if (tags && tags.length > 0) {
      filteredResults = filteredResults.filter((result: any) =>
        result.tags && result.tags.some((tag: string) => tags.includes(tag))
      );
    }

    if (sourceTypes && sourceTypes.length > 0) {
      filteredResults = filteredResults.filter((result: any) =>
        sourceTypes.includes(result.source_type)
      );
    }

    console.log(`Found ${filteredResults.length} relevant knowledge entries`);

    // Track knowledge usage for each result
    if (usageContext && filteredResults.length > 0) {
      const usageRecords = filteredResults.map((result: any) => ({
        knowledge_id: result.id,
        used_for: usageContext,
        context: query
      }));

      await supabase.from('knowledge_usage').insert(usageRecords);

      // Increment access count for each knowledge entry
      for (const result of filteredResults) {
        await supabase.rpc('increment_knowledge_access', {
          knowledge_id: result.id
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        query,
        results: filteredResults.map((result: any) => ({
          id: result.id,
          title: result.title,
          content: result.content,
          sourceType: result.source_type,
          tags: result.tags,
          relevanceScore: result.relevance_score,
          similarity: result.similarity
        })),
        count: filteredResults.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-knowledge:', error);
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
