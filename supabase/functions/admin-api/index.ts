// Admin API for n8n Insiders Platform
// Manages users and access for both Chrome Extension (is_lifetime) and Templates (is_insiders)
// API Key authentication required

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const adminApiKey = Deno.env.get('ADMIN_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  action: 'create_user' | 'grant_pro' | 'revoke_pro' | 'grant_insiders' | 'revoke_insiders' | 'get_user' | 'list_users'
  email?: string
  password?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Verify API key
    const authHeader = req.headers.get('Authorization')
    const apiKey = authHeader?.replace('Bearer ', '')

    if (!apiKey || apiKey !== adminApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: RequestBody = await req.json()
    const { action, email, password } = body

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing action parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Handle actions
    switch (action) {
      case 'create_user': {
        if (!email || !password) {
          return new Response(
            JSON.stringify({ success: false, error: 'Email and password required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Validate email format
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
        if (!emailRegex.test(email)) {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid email format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create user with admin API
        const { data: userData, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Skip email verification
        })

        if (createError) {
          console.error('Error creating user:', createError)
          return new Response(
            JSON.stringify({ success: false, error: createError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('User created:', email)
        return new Response(
          JSON.stringify({
            success: true,
            message: 'User created successfully',
            data: {
              id: userData.user.id,
              email: userData.user.email,
            },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'grant_pro': {
        if (!email) {
          return new Response(
            JSON.stringify({ success: false, error: 'Email required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase
          .from('profiles')
          .update({
            is_lifetime: true,
            updated_at: new Date().toISOString(),
          })
          .eq('email', email)
          .select()

        if (error) {
          console.error('Error granting Pro:', error)
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!data || data.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('Pro access granted:', email)
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Pro access granted',
            data: data[0],
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'revoke_pro': {
        if (!email) {
          return new Response(
            JSON.stringify({ success: false, error: 'Email required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase
          .from('profiles')
          .update({
            is_lifetime: false,
            updated_at: new Date().toISOString(),
          })
          .eq('email', email)
          .select()

        if (error) {
          console.error('Error revoking Pro:', error)
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!data || data.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('Pro access revoked:', email)
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Pro access revoked',
            data: data[0],
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'grant_insiders': {
        if (!email) {
          return new Response(
            JSON.stringify({ success: false, error: 'Email required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase
          .from('profiles')
          .update({
            is_insiders: true,
            updated_at: new Date().toISOString(),
          })
          .eq('email', email)
          .select()

        if (error) {
          console.error('Error granting Insiders:', error)
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!data || data.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('Insiders access granted:', email)
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Insiders access granted (Templates)',
            data: data[0],
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'revoke_insiders': {
        if (!email) {
          return new Response(
            JSON.stringify({ success: false, error: 'Email required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase
          .from('profiles')
          .update({
            is_insiders: false,
            updated_at: new Date().toISOString(),
          })
          .eq('email', email)
          .select()

        if (error) {
          console.error('Error revoking Insiders:', error)
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!data || data.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('Insiders access revoked:', email)
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Insiders access revoked',
            data: data[0],
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_user': {
        if (!email) {
          return new Response(
            JSON.stringify({ success: false, error: 'Email required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, is_lifetime, is_insiders, subscription_status, subscription_end_date, credits_balance, created_at, updated_at')
          .eq('email', email)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            return new Response(
              JSON.stringify({ success: false, error: 'User not found' }),
              { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          console.error('Error getting user:', error)
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            data,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'list_users': {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, is_lifetime, is_insiders, subscription_status, subscription_end_date, credits_balance, created_at')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error listing users:', error)
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            data,
            count: data.length,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Admin API error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
