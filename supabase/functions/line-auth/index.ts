import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LINE_CHANNEL_ID = Deno.env.get('LINE_CHANNEL_ID')!
const LINE_CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET')!

// This function's own URL is the LINE redirect URI
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/line-auth`
const APP_REDIRECT = 'sharetheimages://auth/callback'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  const url = new URL(req.url)
  const code = url.searchParams.get('code')

  // No code → called by the app to get LINE OAuth URL
  if (!code) {
    const lineUrl = new URL('https://access.line.me/oauth2/v2.1/authorize')
    lineUrl.searchParams.set('response_type', 'code')
    lineUrl.searchParams.set('client_id', LINE_CHANNEL_ID)
    lineUrl.searchParams.set('redirect_uri', CALLBACK_URL)
    lineUrl.searchParams.set('state', crypto.randomUUID())
    lineUrl.searchParams.set('scope', 'profile openid')

    return new Response(JSON.stringify({ url: lineUrl.toString() }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }

  // code present → LINE OAuth callback from browser
  try {
    // Exchange code for LINE access token
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: CALLBACK_URL,
        client_id: LINE_CHANNEL_ID,
        client_secret: LINE_CHANNEL_SECRET,
      }),
    })
    if (!tokenRes.ok) throw new Error('LINE token exchange failed')
    const { access_token } = await tokenRes.json()

    // Get LINE user profile
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    if (!profileRes.ok) throw new Error('LINE profile fetch failed')
    const { userId: lineUserId, displayName, pictureUrl } = await profileRes.json()

    // Find existing Supabase user by line_user_id
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('line_user_id', lineUserId)
      .maybeSingle()

    let userEmail: string

    if (existingProfile) {
      const { data: { user } } = await admin.auth.admin.getUserById(existingProfile.id)
      userEmail = user!.email!
    } else {
      // Create new Supabase user for this LINE account
      userEmail = `line_${lineUserId}@sharetheimages.line`
      const { data: newUser, error: createError } = await admin.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: {
          full_name: displayName,
          avatar_url: pictureUrl,
          provider: 'line',
        },
      })
      if (createError || !newUser.user) throw new Error('Failed to create user')

      // Write line_user_id to profile (trigger already created the row)
      await admin
        .from('profiles')
        .update({ line_user_id: lineUserId })
        .eq('id', newUser.user.id)
    }

    // Generate a magic link → Supabase will verify and redirect to APP_REDIRECT with tokens
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
      options: { redirectTo: APP_REDIRECT },
    })
    if (linkError || !linkData) throw new Error('Failed to generate session link')

    // Redirect browser through Supabase verify endpoint → app deep link
    return Response.redirect(linkData.properties.action_link)
  } catch (e) {
    console.error(e)
    const msg = e instanceof Error ? e.message : 'unknown'
    return Response.redirect(`${APP_REDIRECT}?error=${encodeURIComponent(msg)}`)
  }
})
