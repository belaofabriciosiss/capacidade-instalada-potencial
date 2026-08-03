import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  // Verify the requesting user is an admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('perfil')
    .eq('id', user.id)
    .single()

  if (!profile || profile.perfil !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { email, password, nome, perfil } = await request.json()

  if (!email || !password || !nome || !perfil) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  // Use service role key for admin operations
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Create user in Supabase Auth
  const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome, perfil },
  })

  if (authError) {
    const msg = authError.message.includes('already registered')
      ? 'Este email já está cadastrado no sistema.'
      : authError.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // The trigger handle_new_user will create the profile automatically
  // But let's fetch it to return to client
  await new Promise(resolve => setTimeout(resolve, 500)) // wait for trigger

  const { data: createdProfile } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', newUser.user!.id)
    .single()

  return NextResponse.json({ user: createdProfile }, { status: 201 })
}
