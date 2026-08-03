'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import { Estabelecimento, CapacidadePotencial, TipoSala } from '@/lib/types'
import { Plus, Pencil, Trash2, Download, Upload, Calculator, X } from 'lucide-react'
import SearchBar from '@/components/ui/SearchBar'
import ConfirmModal from '@/components/ui/ConfirmModal'
import * as XLSX from 'xlsx'

const TIPOS_SALA: TipoSala[] = ['Consultas', 'Exames', 'Procedimentos', 'Multifuncional']
const PAGE_SIZE = 15

const schema = z.object({
  estabelecimento_id: z.string().min(1, 'Selecione um estabelecimento'),
  tipo_sala: z.enum(['Consultas', 'Exames', 'Procedimentos', 'Multifuncional']),
  total_salas: z.coerce.number().int().min(1, 'Mínimo 1 sala'),
  horas_dia: z.coerce.number().min(0.1, 'Mínimo 0.1'),
  pacientes_hora: z.coerce.number().min(0.1, 'Mínimo 0.1'),
})

type FormData = z.infer<typeof schema>

interface Props {
  estabelecimentos: Estabelecimento[]
  initialData: CapacidadePotencial[]
}

export default function CapacidadePotencialClient({ estabelecimentos, initialData }: Props) {
  const supabase = createClient()
  const { toast } = useToast()

  const [records, setRecords] = useState<CapacidadePotencial[]>(initialData)
  const [search, setSearch] = useState('')
  const [filterEstab, setFilterEstab] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<CapacidadePotencial | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CapacidadePotencial | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo_sala: 'Consultas', total_salas: 1, horas_dia: 8, pacientes_hora: 2 },
  })

  const watchedValues = watch(['total_salas', 'horas_dia', 'pacientes_hora'])
  const previewCapPot = (() => {
    const [s, h, p] = watchedValues.map(v => parseFloat(String(v)) || 0)
    return s * h * p * 20
  })()

  // Filter + search
  const filtered = records.filter(r => {
    const nomeEstab = r.estabelecimento?.nome || ''
    if (filterEstab && nomeEstab !== filterEstab) return false
    if (filterTipo && r.tipo_sala !== filterTipo) return false
    if (search && !nomeEstab.toLowerCase().includes(search.toLowerCase()) && !r.tipo_sala.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [search, filterEstab, filterTipo])

  const openCreate = () => {
    setEditRecord(null)
    reset({ tipo_sala: 'Consultas', total_salas: 1, horas_dia: 8, pacientes_hora: 2, estabelecimento_id: '' })
    setIsModalOpen(true)
  }

  const openEdit = (r: CapacidadePotencial) => {
    setEditRecord(r)
    reset({
      estabelecimento_id: r.estabelecimento_id,
      tipo_sala: r.tipo_sala,
      total_salas: r.total_salas,
      horas_dia: r.horas_dia,
      pacientes_hora: r.pacientes_hora,
    })
    setIsModalOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    const payload = {
      estabelecimento_id: data.estabelecimento_id,
      tipo_sala: data.tipo_sala,
      total_salas: data.total_salas,
      horas_dia: data.horas_dia,
      pacientes_hora: data.pacientes_hora,
    }

    if (editRecord) {
      const { data: updated, error } = await supabase
        .from('capacidade_potencial')
        .update(payload)
        .eq('id', editRecord.id)
        .select('*, estabelecimento:estabelecimentos(nome, id)')
        .single()
      if (error) { toast('Erro ao atualizar registro.', 'error'); setSaving(false); return }
      setRecords(prev => prev.map(r => r.id === editRecord.id ? updated as CapacidadePotencial : r))
      toast('Registro atualizado com sucesso!', 'success')
    } else {
      const { data: created, error } = await supabase
        .from('capacidade_potencial')
        .insert(payload)
        .select('*, estabelecimento:estabelecimentos(nome, id)')
        .single()
      if (error) { toast('Erro ao criar registro.', 'error'); setSaving(false); return }
      setRecords(prev => [created as CapacidadePotencial, ...prev])
      toast('Registro criado com sucesso!', 'success')
    }

    setSaving(false)
    setIsModalOpen(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from('capacidade_potencial').delete().eq('id', deleteTarget.id)
    if (error) { toast('Erro ao excluir registro.', 'error'); setDeleting(false); return }
    setRecords(prev => prev.filter(r => r.id !== deleteTarget.id))
    toast('Registro excluído.', 'success')
    setDeleting(false)
    setDeleteTarget(null)
  }

  // Export
  const handleExport = () => {
    const rows = filtered.map(r => ({
      'Estabelecimento': r.estabelecimento?.nome || '',
      'Tipo de Sala': r.tipo_sala,
      'Total de Salas': r.total_salas,
      'Horas/Dia': r.horas_dia,
      'Pacientes/Hora': r.pacientes_hora,
      'Capacidade Potencial': r.capacidade_potencial,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Capacidade Potencial')
    XLSX.writeFile(wb, 'capacidade_potencial.xlsx')
    toast('Dados exportados com sucesso!', 'success')
  }

  // Download template
  const handleTemplate = () => {
    const rows = [{ 'Estabelecimento': 'Nome do Estabelecimento', 'Tipo de Sala': 'Consultas', 'Total de Salas': 1, 'Horas/Dia': 8, 'Pacientes/Hora': 2.5 }]
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'template_capacidade_potencial.xlsx')
    toast('Template baixado!', 'info')
  }

  // Import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

        let imported = 0
        for (const row of rows) {
          const estab = estabelecimentos.find(e => e.nome === row['Estabelecimento'])
          if (!estab) continue
          const payload = {
            estabelecimento_id: estab.id,
            tipo_sala: String(row['Tipo de Sala'] || 'Consultas'),
            total_salas: parseInt(String(row['Total de Salas'] || 1)),
            horas_dia: parseFloat(String(row['Horas/Dia'] || 8)),
            pacientes_hora: parseFloat(String(row['Pacientes/Hora'] || 2)),
          }
          await supabase.from('capacidade_potencial').insert(payload)
          imported++
        }

        // Reload
        const { data: refreshed } = await supabase
          .from('capacidade_potencial')
          .select('*, estabelecimento:estabelecimentos(nome, id)')
          .order('created_at', { ascending: false })
        if (refreshed) setRecords(refreshed as CapacidadePotencial[])
        toast(`${imported} registros importados com sucesso!`, 'success')
      } catch {
        toast('Erro ao importar arquivo. Verifique o formato.', 'error')
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Capacidade Potencial</h1>
          <p className="page-subtitle">Cadastro de capacidade potencial por estabelecimento e tipo de sala</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleTemplate}>
            <Download size={14} /> Template
          </button>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            <Upload size={14} /> Importar
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: 'none' }} />
          </label>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>
            <Download size={14} /> Exportar
          </button>
          <button className="btn btn-primary" onClick={openCreate} id="btn-novo-capot">
            <Plus size={16} /> Novo Registro
          </button>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="card card-md" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar estabelecimento ou tipo..." />
        <select className="form-select" style={{ width: 220 }} value={filterEstab} onChange={e => setFilterEstab(e.target.value)}>
          <option value="">Todos os Estabelecimentos</option>
          {estabelecimentos.map(e => <option key={e.id} value={e.nome}>{e.nome}</option>)}
        </select>
        <select className="form-select" style={{ width: 180 }} value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
          <option value="">Todos os Tipos</option>
          {TIPOS_SALA.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {(search || filterEstab || filterTipo) && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFilterEstab(''); setFilterTipo('') }}>
            Limpar
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Estabelecimento</th>
                <th>Tipo de Sala</th>
                <th>Total Salas</th>
                <th>Horas/Dia</th>
                <th>Pacientes/Hora</th>
                <th>Cap. Potencial</th>
                <th style={{ width: 80, textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <p style={{ color: 'var(--text-muted)' }}>Nenhum registro encontrado</p>
                    </div>
                  </td>
                </tr>
              ) : paginated.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.estabelecimento?.nome || '-'}</strong></td>
                  <td><span className="badge badge-brand">{r.tipo_sala}</span></td>
                  <td>{r.total_salas}</td>
                  <td>{r.horas_dia.toLocaleString('pt-BR')}</td>
                  <td>{r.pacientes_hora.toLocaleString('pt-BR')}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--brand-400)', fontSize: '0.875rem' }}>
                      {r.capacidade_potencial?.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button className="btn-icon" onClick={() => openEdit(r)} title="Editar"><Pencil size={14} /></button>
                      <button className="btn-icon" onClick={() => setDeleteTarget(r)} title="Excluir" style={{ color: 'var(--danger-400)' }}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <span className="pagination-info">
              Exibindo {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
            </span>
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !saving && setIsModalOpen(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editRecord ? 'Editar Registro' : 'Novo Registro'} — Capacidade Potencial
              </h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)} disabled={saving}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="modal-body">
                <div className="form-grid form-grid-2" style={{ gap: 16 }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label required">Estabelecimento</label>
                    <select className={`form-select ${errors.estabelecimento_id ? 'error' : ''}`} {...register('estabelecimento_id')}>
                      <option value="">Selecione...</option>
                      {estabelecimentos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                    {errors.estabelecimento_id && <span className="form-error">{errors.estabelecimento_id.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Tipo de Sala</label>
                    <select className={`form-select ${errors.tipo_sala ? 'error' : ''}`} {...register('tipo_sala')}>
                      {TIPOS_SALA.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {errors.tipo_sala && <span className="form-error">{errors.tipo_sala.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Total de Salas</label>
                    <input type="number" min={1} step={1} className={`form-input ${errors.total_salas ? 'error' : ''}`} {...register('total_salas')} />
                    {errors.total_salas && <span className="form-error">{errors.total_salas.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Horas/Dia</label>
                    <input type="number" min={0.1} step={0.5} className={`form-input ${errors.horas_dia ? 'error' : ''}`} {...register('horas_dia')} />
                    {errors.horas_dia && <span className="form-error">{errors.horas_dia.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Pacientes/Hora</label>
                    <input type="number" min={0.1} step={0.1} className={`form-input ${errors.pacientes_hora ? 'error' : ''}`} {...register('pacientes_hora')} placeholder="Ex: 2.5" />
                    {errors.pacientes_hora && <span className="form-error">{errors.pacientes_hora.message}</span>}
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calculator size={13} /> Capacidade Potencial (calculada automaticamente)
                    </label>
                    <div className="calc-field">
                      <Calculator size={14} />
                      <span style={{ fontSize: '1.125rem' }}>
                        {previewCapPot.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        = {watch('total_salas') || 0} × {watch('horas_dia') || 0} × {watch('pacientes_hora') || 0} × 20
                      </span>
                    </div>
                    <span className="form-hint">Fórmula: Total de Salas × Horas/Dia × Pacientes/Hora × 20</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving} id="btn-salvar-capot">
                  {saving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Salvando...</> : 'Salvar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Excluir Registro"
        message={`Tem certeza que deseja excluir este registro de capacidade potencial? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        confirmLabel="Excluir"
      />
    </>
  )
}
