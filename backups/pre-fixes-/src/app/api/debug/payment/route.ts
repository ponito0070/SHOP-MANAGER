import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const DEBUG_SECRET = process.env.DEBUG_TEST_SECRET || 'local-debug-secret'

if (!SUPABASE_URL || !SERVICE_ROLE) {
  // eslint-disable-next-line no-console
  console.warn('Service role key or URL not set for debug route')
}

export async function POST(request: Request) {
  try {
    const header = request.headers.get('x-debug-secret')
    if (header !== DEBUG_SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const body = await request.json()
    const { amount, note, party_type, party_id } = body
    if (!amount || !party_type || !party_id) return NextResponse.json({ error: 'missing fields' }, { status: 400 })

    const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE!)

    const { data, error } = await supabase.from('payments').insert([{ amount, note, party_type, party_id }])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
