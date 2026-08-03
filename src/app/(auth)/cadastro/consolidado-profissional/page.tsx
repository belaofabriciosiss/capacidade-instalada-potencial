import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConsolidadoProfissionalClient from './ConsolidadoProfissionalClient'

export const metadata = { title: 'Consolidado por Profissional — Painel BI' }

export default async function ConsolidadoProfissionalPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('perfil').eq('id', user.id).single()
  if (!profile || profile.perfil !== 'admin') redirect('/dashboard')

  const [
    { data: estabelecimentos },
    { data: especialidades },
    { data: profissionais },
    { data: procedimentos },
    { data: records },
  ] = await Promise.all([
    supabase.from('estabelecimentos').select('*').eq('ativo', true).order('nome'),
    supabase.from('especialidades').select('*').eq('ativo', true).order('nome'),
    supabase.from('profissionais').select('*').eq('ativo', true).order('nome'),
    supabase.from('procedimentos').select('*').eq('ativo', true).order('nome'),
    supabase.from('consolidado_profissional')
      .select('*, estabelecimento:estabelecimentos(nome, id), especialidade:especialidades(nome, id), profissional:profissionais(nome, id), procedimento:procedimentos(nome, id)')
      .order('created_at', { ascending: false }),
  ])

  return (
    <ConsolidadoProfissionalClient
      estabelecimentos={estabelecimentos || []}
      especialidades={especialidades || []}
      profissionais={profissionais || []}
      procedimentos={procedimentos || []}
      initialData={records || []}
    />
  )
}
