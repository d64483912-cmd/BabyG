import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { taskTitle, taskDescription, objectiveContext, agentRole } = await req.json()

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Determine the system prompt based on agent role
    const rolePrompts: Record<string, string> = {
      developer: "You are a senior software developer executing a task. Provide detailed technical implementation steps, code snippets if relevant, and best practices.",
      designer: "You are an expert UX/UI designer executing a task. Provide design recommendations, user experience insights, and visual design suggestions.",
      researcher: "You are a thorough researcher executing a task. Provide comprehensive findings, data analysis, sources, and actionable insights.",
      manager: "You are an experienced project manager executing a task. Provide planning details, risk assessments, resource recommendations, and next steps.",
      analyst: "You are a data analyst executing a task. Provide metrics, data insights, visualizations suggestions, and strategic recommendations.",
      general: "You are a versatile AI assistant executing a task. Provide comprehensive, actionable results with clear next steps."
    }

    const systemPrompt = rolePrompts[agentRole || 'general'] || rolePrompts.general

    // Call OpenAI to execute the task
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `
Objective Context: ${objectiveContext}

Task: ${taskTitle}
${taskDescription ? `Description: ${taskDescription}` : ''}

Please execute this task and provide:
1. Key findings or results
2. Actionable outputs (data, recommendations, code, etc.)
3. Next steps or follow-up tasks if needed
4. Any relevant links, sources, or references

Be specific and practical in your response.
`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const data = await response.json()
    const result = data.choices[0]?.message?.content || 'Task execution failed'

    // Store the result in knowledge base
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      )

      await supabase.from('knowledge_base').insert({
        content: result,
        metadata: {
          taskTitle,
          objectiveContext,
          agentRole,
          executedAt: new Date().toISOString()
        },
        source: 'task_execution'
      })
    } catch (error) {
      console.error('Failed to store in knowledge base:', error)
      // Continue even if storage fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        tokensUsed: data.usage?.total_tokens || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Task execution error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to execute task',
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
