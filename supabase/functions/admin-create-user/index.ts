// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from the JWT token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if the user is admin or gestor
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !['admin', 'gestor'].includes(userProfile?.role)) {
      throw new Error('Forbidden: Only admins and gestores can create users')
    }

    // Get request body
    const { email, role = 'corretor', company_id = null } = await req.json()

    if (!email) {
      throw new Error('Email is required')
    }

    // Gestor só pode criar corretores e gestores
    if (userProfile?.role === 'gestor' && !['corretor', 'gestor'].includes(role)) {
      throw new Error('Gestores podem criar apenas usuários com role corretor ou gestor')
    }

    // Check if user already exists in auth.users
    const { data: existingUser, error: existingError } = await supabaseClient.auth.admin.getUserByEmail(email)
    
    if (existingError || !existingUser.user) {
      throw new Error('User not found in auth.users. Please create the user in Authentication first.')
    }

    // Insert or update user profile
    const { data: profileData, error: insertError } = await supabaseClient
      .from('user_profiles')
      .upsert({
        user_id: existingUser.user.id,
        email: email,
        role: role,
        company_id: company_id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to create user profile: ${insertError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User profile created/updated successfully',
        data: profileData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})


