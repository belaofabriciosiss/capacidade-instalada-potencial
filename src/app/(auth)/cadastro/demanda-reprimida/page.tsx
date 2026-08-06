import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DemandaReprimidaClient from './DemandaReprimidaClient'

export const metadata = { title: 'Demanda Reprimida — Painel BI' }

export default async function DemandaReprimidaPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('perfil').eq('id', user.id).single()
  if (!profile || profile.perfil !== 'admin') redirect('/dashboard')

  const [{ data: procedimentos }, { data: records }] = await Promise.all([
    supabase.from('procedimentos').select('*').eq('ativo', true).order('nome'),
    supabase.from('demanda_reprimida')
      .select('*, procedimento:procedimentos(nome, id)')
      .order('created_at', { ascending: false }),
  ])

  return (
    <DemandaReprimidaClient
      procedimentos={procedimentos || []}
      initialData={records || []}
    />
  )
}
