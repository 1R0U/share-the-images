import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3'
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')!
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')!
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')!
const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME')!
const R2_PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

const EXT_CONTENT_TYPE: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  gif: 'image/gif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('認証が必要です')

    // Client scoped to the caller's own JWT, so RLS decides what they can see.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('認証が必要です')

    const { room_id, ext } = await req.json()
    if (!room_id || typeof room_id !== 'string') throw new Error('room_id が必要です')

    const safeExt = typeof ext === 'string' && /^[a-zA-Z0-9]{1,10}$/.test(ext) ? ext.toLowerCase() : 'jpg'

    // Only members of the room may upload media into it (mirrors the
    // media_insert RLS policy, since this function bypasses RLS via the
    // R2 credentials rather than a Postgres write).
    const { data: membership } = await supabase
      .from('room_members')
      .select('room_id')
      .eq('room_id', room_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership) throw new Error('このルームへのアップロード権限がありません')

    const key = `${room_id}/${user.id}/${Date.now()}-${crypto.randomUUID()}.${safeExt}`
    const contentType = EXT_CONTENT_TYPE[safeExt] ?? 'application/octet-stream'

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, ContentType: contentType }),
      { expiresIn: 300 }
    )

    const publicUrl = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`

    return new Response(JSON.stringify({ uploadUrl, publicUrl, key, contentType }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }
})
