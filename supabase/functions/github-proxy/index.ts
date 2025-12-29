// GitHub API Proxy Edge Function
// Proxies requests to GitHub API to avoid CORS issues in production

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GITHUB_API_BASE = 'https://api.github.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-github-token',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the GitHub token from the request header
    const githubToken = req.headers.get('x-github-token')

    if (!githubToken) {
      return new Response(
        JSON.stringify({ error: 'GitHub token required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the endpoint from the URL
    const url = new URL(req.url)
    const endpoint = url.searchParams.get('endpoint')

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Endpoint parameter required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Build the GitHub API URL
    const githubUrl = `${GITHUB_API_BASE}${endpoint}`

    // Forward the request to GitHub
    const githubResponse = await fetch(githubUrl, {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Proflow-App',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    })

    // Get the response data
    const data = await githubResponse.json()

    // Return the response with CORS headers
    return new Response(
      JSON.stringify(data),
      {
        status: githubResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          // Forward rate limit headers
          'X-RateLimit-Limit': githubResponse.headers.get('X-RateLimit-Limit') || '',
          'X-RateLimit-Remaining': githubResponse.headers.get('X-RateLimit-Remaining') || '',
          'X-RateLimit-Reset': githubResponse.headers.get('X-RateLimit-Reset') || '',
        },
      }
    )
  } catch (error) {
    console.error('GitHub proxy error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
