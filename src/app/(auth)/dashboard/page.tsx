import { createClient } from '@/lib/supabase/server'
import { BarChart3, Users, Building2, TrendingUp, Activity } from 'lucide-react'
import DashboardCharts from './DashboardCharts'

async function getDashboardData(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [capPot, consol, estabelecimentos, profissionais] = await Promise.all([
    supabase.from('capacidade_potencial').select('*, estabelecimento:estabelecimentos(nome), tipo_sala, capacidade_potencial'),
    supabase.from('consolidado_profissional').select('*, estabelecimento:estabelecimentos(nome), tipo, capacidade_instalada'),
    supabase.from('estabelecimentos').select('id, nome').eq('ativo', true),
    supabase.from('profissionais').select('id').eq('ativo', true),
  ])
  return {
    capPot: capPot.data || [],
    consol: consol.data || [],
    estabelecimentos: estabelecimentos.data || [],
    totalProfissionais: profissionais.data?.length || 0,
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { capPot, consol, estabelecimentos, totalProfissionais } = await getDashboardData(supabase)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão consolidada da capacidade instalada e potencial</p>
        </div>
      </div>

      {/* Charts & KPIs (Client side) */}
      <DashboardCharts
        capPot={capPot}
        consol={consol}
        estabelecimentos={estabelecimentos}
        totalProfissionais={totalProfissionais}
      />
    </>
  )
}
