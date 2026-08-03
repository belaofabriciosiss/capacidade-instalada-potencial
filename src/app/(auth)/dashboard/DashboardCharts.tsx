'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts'
import { useState, useMemo } from 'react'
import { Building2, Filter } from 'lucide-react'

interface Props {
  capPot: Array<{ estabelecimento?: { nome: string }; tipo_sala: string; capacidade_potencial: number }>
  consol: Array<{ estabelecimento?: { nome: string }; tipo: string; capacidade_instalada: number }>
  estabelecimentos: Array<{ id: string; nome: string }>
}

const COLORS_PIE = ['#6366f1', '#34d399', '#fbbf24', '#f87171']
const TIPOS_SALA = ['Consultas', 'Exames', 'Procedimentos', 'Multifuncional']

export default function DashboardCharts({ capPot, consol, estabelecimentos }: Props) {
  const [filterEstab, setFilterEstab] = useState('')
  const [filterTipo, setFilterTipo] = useState('')

  const filteredCapPot = useMemo(() => {
    return capPot.filter(r => {
      if (filterEstab && r.estabelecimento?.nome !== filterEstab) return false
      if (filterTipo && r.tipo_sala !== filterTipo) return false
      return true
    })
  }, [capPot, filterEstab, filterTipo])

  const filteredConsol = useMemo(() => {
    return consol.filter(r => {
      if (filterEstab && r.estabelecimento?.nome !== filterEstab) return false
      if (filterTipo && r.tipo !== filterTipo) return false
      return true
    })
  }, [consol, filterEstab, filterTipo])

  // Bar chart data: por estabelecimento
  const barData = useMemo(() => {
    const map: Record<string, { potencial: number; instalada: number }> = {}
    filteredCapPot.forEach(r => {
      const nome = r.estabelecimento?.nome || 'N/A'
      if (!map[nome]) map[nome] = { potencial: 0, instalada: 0 }
      map[nome].potencial += r.capacidade_potencial || 0
    })
    filteredConsol.forEach(r => {
      const nome = r.estabelecimento?.nome || 'N/A'
      if (!map[nome]) map[nome] = { potencial: 0, instalada: 0 }
      map[nome].instalada += r.capacidade_instalada || 0
    })
    return Object.entries(map).map(([nome, vals]) => ({
      nome: nome.length > 18 ? nome.slice(0, 18) + '...' : nome,
      'Cap. Potencial': Math.round(vals.potencial),
      'Cap. Instalada': Math.round(vals.instalada),
    }))
  }, [filteredCapPot, filteredConsol])

  // Pie chart: por tipo de sala
  const pieData = useMemo(() => {
    const map: Record<string, number> = {}
    filteredCapPot.forEach(r => {
      const t = r.tipo_sala
      map[t] = (map[t] || 0) + (r.capacidade_potencial || 0)
    })
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
  }, [filteredCapPot])

  const tooltipStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '0.8125rem',
  }

  return (
    <>
      {/* Filters */}
      <div className="card card-md" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>
          <Filter size={14} /> Filtros
        </div>
        <select
          className="form-select"
          style={{ width: 220 }}
          value={filterEstab}
          onChange={e => setFilterEstab(e.target.value)}
        >
          <option value="">Todos os Estabelecimentos</option>
          {estabelecimentos.map(e => (
            <option key={e.id} value={e.nome}>{e.nome}</option>
          ))}
        </select>
        <select
          className="form-select"
          style={{ width: 200 }}
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value)}
        >
          <option value="">Todos os Tipos</option>
          {TIPOS_SALA.map(t => <option key={t} value={t}>{t}</option>)}
          <option value="Consulta">Consulta (Prof.)</option>
          <option value="Exame">Exame (Prof.)</option>
        </select>
        {(filterEstab || filterTipo) && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setFilterEstab(''); setFilterTipo('') }}
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {/* Charts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>
        {/* Bar Chart */}
        <div className="card card-md">
          <h3 style={{ marginBottom: 20, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={16} color="var(--brand-400)" />
            Capacidade por Estabelecimento
          </h3>
          {barData.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sem dados para exibir</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="nome"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  angle={-20}
                  textAnchor="end"
                  interval={0}
                  height={48}
                />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                <Bar dataKey="Cap. Potencial" fill="#6366f1" radius={[4,4,0,0]} />
                <Bar dataKey="Cap. Instalada" fill="#34d399" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart */}
        <div className="card card-md">
          <h3 style={{ marginBottom: 20, fontSize: '1rem' }}>Distribuição por Tipo de Sala</h3>
          {pieData.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sem dados</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => typeof v === 'number' ? v.toLocaleString('pt-BR') : String(v ?? '')} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {pieData.map((item, i) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS_PIE[i % COLORS_PIE.length], flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flex: 1 }}>{item.name}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.value.toLocaleString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
