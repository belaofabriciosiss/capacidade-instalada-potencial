import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UsuariosClient from './UsuariosClient'

export const metadata = { title: 'Usuários — Painel BI' }

export default async function UsuariosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('perfil').eq('id', user.id).single()
  if (!profile || profile.perfil !== 'admin') redirect('/dashboard')

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <UsuariosClient
      initialData={users || []}
      currentUserId={user.id}
    />
  )
}
