import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MasterCrudClient from '@/components/admin/MasterCrudClient'

export const metadata = { title: 'Estabelecimentos — Painel BI' }

export default async function EstabelecimentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('perfil').eq('id', user.id).single()
  if (!profile || profile.perfil !== 'admin') redirect('/dashboard')
  const { data } = await supabase.from('estabelecimentos').select('*').order('nome')
  return <MasterCrudClient tableName="estabelecimentos" label="Estabelecimento" labelPlural="Estabelecimentos" initialData={data || []} />
}
