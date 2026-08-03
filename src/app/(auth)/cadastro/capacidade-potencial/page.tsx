import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CapacidadePotencialClient from './CapacidadePotencialClient'

export const metadata = { title: 'Capacidade Potencial — Painel BI' }

export default async function CapacidadePotencialPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('perfil').eq('id', user.id).single()
  if (!profile || profile.perfil !== 'admin') redirect('/dashboard')

  const [{ data: estabelecimentos }, { data: records }] = await Promise.all([
    supabase.from('estabelecimentos').select('*').eq('ativo', true).order('nome'),
    supabase.from('capacidade_potencial')
      .select('*, estabelecimento:estabelecimentos(nome, id)')
      .order('created_at', { ascending: false }),
  ])

  return (
    <CapacidadePotencialClient
      estabelecimentos={estabelecimentos || []}
      initialData={records || []}
    />
  )
}
