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

  const totalCapPotencial = capPot.reduce((s: number, r: { capacidade_potencial?: number }) => s + (r.capacidade_potencial || 0), 0)
  const totalCapInstalada = consol.reduce((s: number, r: { capacidade_instalada?: number }) => s + (r.capacidade_instalada || 0), 0)
  const percOcupacao = totalCapPotencial > 0
    ? ((totalCapInstalada / totalCapPotencial) * 100).toFixed(1)
    : '0.0'

  const kpis = [
    {
      label: 'Capacidade Potencial',
      value: totalCapPotencial.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
      icon: TrendingUp,
      color: '#6366f1',
      bg: 'rgba(99,102,241,.1)',
      desc: 'Total de capacidade potencial',
    },
    {
      label: 'Capacidade Instalada',
      value: totalCapInstalada.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
      icon: Activity,
      color: '#34d399',
      bg: 'rgba(52,211,153,.1)',
      desc: 'Total de capacidade instalada',
    },
    {
      label: 'Índice de Ocupação',
      value: `${percOcupacao}%`,
      icon: BarChart3,
      color: '#fbbf24',
      bg: 'rgba(251,191,36,.1)',
      desc: 'Instalada / Potencial',
    },
    {
      label: 'Profissionais',
      value: totalProfissionais.toString(),
      icon: Users,
      color: '#818cf8',
      bg: 'rgba(129,140,248,.1)',
      desc: 'Profissionais cadastrados',
    },
  ]

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão consolidada da capacidade instalada e potencial</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="kpi-card">
              <div className="kpi-icon" style={{ background: kpi.bg }}>
                <Icon size={20} color={kpi.color} />
              </div>
              <div className="kpi-value">{kpi.value}</div>
              <div className="kpi-label">{kpi.label}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{kpi.desc}</div>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <DashboardCharts
        capPot={capPot}
        consol={consol}
        estabelecimentos={estabelecimentos}
      />
    </>
  )
}
