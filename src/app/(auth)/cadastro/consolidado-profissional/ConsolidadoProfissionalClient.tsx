'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import {
  Estabelecimento, Especialidade, Profissional, Procedimento,
  ConsolidadoProfissional, TipoAtendimento
} from '@/lib/types'
import { Plus, Pencil, Trash2, Download, Upload, Calculator, X, Info } from 'lucide-react'
import SearchBar from '@/components/ui/SearchBar'
import ConfirmModal from '@/components/ui/ConfirmModal'
import * as XLSX from 'xlsx'

const TIPOS: TipoAtendimento[] = ['Consulta', 'Exame']
const PAGE_SIZE = 15

const schema = z.object({
  estabelecimento_id: z.string().min(1, 'Obrigatório'),
  especialidade_id: z.string().min(1, 'Obrigatório'),
  profissional_id: z.string().min(1, 'Obrigatório'),
  tipo: z.enum(['Consulta', 'Exame']),
  procedimento_id: z.string().optional(),
  carga_horaria_semanal: z.coerce.number().min(0, 'Mínimo 0'),
  carga_horaria_agendamento: z.coerce.number().min(0, 'Mínimo 0'),
  pacientes_hora: z.coerce.number().min(0).optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

interface Props {
  estabelecimentos: Estabelecimento[]
  especialidades: Especialidade[]
  profissionais: Profissional[]
  procedimentos: Procedimento[]
  initialData: ConsolidadoProfissional[]
}

export default function ConsolidadoProfissionalClient({
  estabelecimentos, especialidades, profissionais, procedimentos, initialData
}: Props) {
  const supabase = createClient()
  const { toast } = useToast()

  const [records, setRecords] = useState<ConsolidadoProfissional[]>(initialData)
  const [search, setSearch] = useState('')
  const [filterEstab, setFilterEstab] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterEspec, setFilterEspec] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<ConsolidadoProfissional | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ConsolidadoProfissional | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'Consulta', carga_horaria_semanal: 0, carga_horaria_agendamento: 0 },
  })

  const watchChAgend = parseFloat(String(watch('carga_horaria_agendamento') || 0)) || 0
  const watchPacHora = parseFloat(String(watch('pacientes_hora') || '')) || null
  const previewAtend = watchPacHora !== null ? watchChAgend * watchPacHora : null
  const previewCapInst = watchPacHora === null
    ? watchChAgend
    : (previewAtend! * 4)

  // Filters
  const filtered = records.filter(r => {
    if (filterEstab && r.estabelecimento?.nome !== filterEstab) return false
    if (filterTipo && r.tipo !== filterTipo) return false
    if (filterEspec && r.especialidade?.nome !== filterEspec) return false
    if (search) {
      const s = search.toLowerCase()
      const match =
        r.profissional?.nome?.toLowerCase().includes(s) ||
        r.especialidade?.nome?.toLowerCase().includes(s) ||
        r.estabelecimento?.nome?.toLowerCase().includes(s)
      if (!match) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [search, filterEstab, filterTipo, filterEspec])

  const openCreate = () => {
    setEditRecord(null)
    reset({ tipo: 'Consulta', carga_horaria_semanal: 0, carga_horaria_agendamento: 0, estabelecimento_id: '', especialidade_id: '', profissional_id: '' })
    setIsModalOpen(true)
  }

  const openEdit = (r: ConsolidadoProfissional) => {
    setEditRecord(r)
    reset({
      estabelecimento_id: r.estabelecimento_id,
      especialidade_id: r.especialidade_id,
      profissional_id: r.profissional_id,
      tipo: r.tipo,
      procedimento_id: r.procedimento_id || '',
      carga_horaria_semanal: r.carga_horaria_semanal,
      carga_horaria_agendamento: r.carga_horaria_agendamento,
      pacientes_hora: r.pacientes_hora ?? '',
    })
    setIsModalOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    const pacHora = data.pacientes_hora === '' || data.pacientes_hora === undefined || isNaN(Number(data.pacientes_hora))
      ? null
      : Number(data.pacientes_hora)

    const payload = {
      estabelecimento_id: data.estabelecimento_id,
      especialidade_id: data.especialidade_id,
      profissional_id: data.profissional_id,
      tipo: data.tipo,
      procedimento_id: data.procedimento_id || null,
      carga_horaria_semanal: data.carga_horaria_semanal,
      carga_horaria_agendamento: data.carga_horaria_agendamento,
      pacientes_hora: pacHora,
    }

    const selectQuery = '*, estabelecimento:estabelecimentos(nome, id), especialidade:especialidades(nome, id), profissional:profissionais(nome, id), procedimento:procedimentos(nome, id)'

    if (editRecord) {
      const { data: updated, error } = await supabase
        .from('consolidado_profissional')
        .update(payload)
        .eq('id', editRecord.id)
        .select(selectQuery)
        .single()
      if (error) { toast('Erro ao atualizar.', 'error'); setSaving(false); return }
      setRecords(prev => prev.map(r => r.id === editRecord.id ? updated as ConsolidadoProfissional : r))
      toast('Registro atualizado!', 'success')
    } else {
      const { data: created, error } = await supabase
        .from('consolidado_profissional')
        .insert(payload)
        .select(selectQuery)
        .single()
      if (error) { toast('Erro ao criar.', 'error'); setSaving(false); return }
      setRecords(prev => [created as ConsolidadoProfissional, ...prev])
      toast('Registro criado!', 'success')
    }

    setSaving(false)
    setIsModalOpen(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from('consolidado_profissional').delete().eq('id', deleteTarget.id)
    if (error) { toast('Erro ao excluir.', 'error'); setDeleting(false); return }
    setRecords(prev => prev.filter(r => r.id !== deleteTarget.id))
    toast('Registro excluído.', 'success')
    setDeleting(false)
    setDeleteTarget(null)
  }

  const handleExport = () => {
    const rows = filtered.map(r => ({
      'Estabelecimento': r.estabelecimento?.nome || '',
      'Especialidade': r.especialidade?.nome || '',
      'Profissional': r.profissional?.nome || '',
      'Tipo': r.tipo,
      'Procedimento': r.procedimento?.nome || '',
      'CH Semanal': r.carga_horaria_semanal,
      'CH Agendamento': r.carga_horaria_agendamento,
      'Pacientes/Hora': r.pacientes_hora ?? '',
      'Atendimentos Semanais': r.atendimentos_semanais ?? '',
      'Capacidade Instalada': r.capacidade_instalada,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Consolidado')
    XLSX.writeFile(wb, 'consolidado_profissional.xlsx')
    toast('Dados exportados!', 'success')
  }

  const handleTemplate = () => {
    const rows = [{
      'Estabelecimento': 'Nome do Estabelecimento',
      'Especialidade': 'Nome da Especialidade',
      'Profissional': 'Nome do Profissional',
      'Tipo': 'Consulta',
      'Procedimento': 'Nome do Procedimento',
      'CH Semanal': 40,
      'CH Agendamento': 32,
      'Pacientes/Hora': 2.5,
    }]
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'template_consolidado_profissional.xlsx')
    toast('Template baixado!', 'info')
  }

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

        const payloads = []
        for (const row of rows) {
          const estab = estabelecimentos.find(e => e.nome === row['Estabelecimento'])
          const espec = especialidades.find(e => e.nome === row['Especialidade'])
          const prof = profissionais.find(p => p.nome === row['Profissional'])
          if (!estab || !espec || !prof) continue
          const proc = procedimentos.find(p => p.nome === row['Procedimento'])
          const getNum = (val: unknown, fallback: number | null) => {
            if (val === undefined || val === null || val === '') return fallback
            const num = Number(val)
            return isNaN(num) ? fallback : num
          }

          payloads.push({
            estabelecimento_id: estab.id,
            especialidade_id: espec.id,
            profissional_id: prof.id,
            tipo: String(row['Tipo'] || 'Consulta'),
            procedimento_id: proc?.id || null,
            carga_horaria_semanal: getNum(row['CH Semanal'], 0),
            carga_horaria_agendamento: getNum(row['CH Agendamento'], 0),
            pacientes_hora: getNum(row['Pacientes/Hora'], null),
          })
        }

        let imported = 0
        const CHUNK_SIZE = 100
        for (let i = 0; i < payloads.length; i += CHUNK_SIZE) {
          const chunk = payloads.slice(i, i + CHUNK_SIZE)
          const { error } = await supabase.from('consolidado_profissional').insert(chunk)
          if (!error) imported += chunk.length
        }

        const selectQ = '*, estabelecimento:estabelecimentos(nome, id), especialidade:especialidades(nome, id), profissional:profissionais(nome, id), procedimento:procedimentos(nome, id)'
        const { data: refreshed } = await supabase.from('consolidado_profissional').select(selectQ).order('created_at', { ascending: false })
        if (refreshed) setRecords(refreshed as ConsolidadoProfissional[])
        toast(`${imported} registros importados!`, 'success')
      } catch {
        toast('Erro ao importar arquivo.', 'error')
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Consolidado por Profissional</h1>
          <p className="page-subtitle">Cadastro da capacidade instalada por profissional, especialidade e estabelecimento</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleTemplate}><Download size={14} /> Template</button>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            <Upload size={14} /> Importar
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: 'none' }} />
          </label>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}><Download size={14} /> Exportar</button>
          <button className="btn btn-primary" onClick={openCreate} id="btn-novo-consol">
            <Plus size={16} /> Novo Registro
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card card-md" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar profissional, especialidade..." />
        <select className="form-select" style={{ width: 200 }} value={filterEstab} onChange={e => setFilterEstab(e.target.value)}>
          <option value="">Todos os Estabelecimentos</option>
          {estabelecimentos.map(e => <option key={e.id} value={e.nome}>{e.nome}</option>)}
        </select>
        <select className="form-select" style={{ width: 200 }} value={filterEspec} onChange={e => setFilterEspec(e.target.value)}>
          <option value="">Todas as Especialidades</option>
          {especialidades.map(e => <option key={e.id} value={e.nome}>{e.nome}</option>)}
        </select>
        <select className="form-select" style={{ width: 150 }} value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
          <option value="">Todos os Tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {(search || filterEstab || filterTipo || filterEspec) && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFilterEstab(''); setFilterTipo(''); setFilterEspec('') }}>Limpar</button>
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
                <th>Especialidade</th>
                <th>Profissional</th>
                <th>Tipo</th>
                <th>CH Semanal</th>
                <th>CH Agendamento</th>
                <th>Pac./Hora</th>
                <th>Atend. Semanais</th>
                <th>Cap. Instalada</th>
                <th style={{ width: 80, textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={10}>
                  <div className="empty-state"><p style={{ color: 'var(--text-muted)' }}>Nenhum registro encontrado</p></div>
                </td></tr>
              ) : paginated.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.estabelecimento?.nome || '-'}</strong></td>
                  <td>{r.especialidade?.nome || '-'}</td>
                  <td>{r.profissional?.nome || '-'}</td>
                  <td><span className={`badge ${r.tipo === 'Consulta' ? 'badge-brand' : 'badge-success'}`}>{r.tipo}</span></td>
                  <td>{r.carga_horaria_semanal}</td>
                  <td>{r.carga_horaria_agendamento}</td>
                  <td>{r.pacientes_hora != null ? r.pacientes_hora.toLocaleString('pt-BR') : <span className="text-muted">—</span>}</td>
                  <td>{r.atendimentos_semanais != null ? r.atendimentos_semanais.toLocaleString('pt-BR') : <span className="text-muted">—</span>}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--accent-400)', fontSize: '0.875rem' }}>
                      {r.capacidade_instalada?.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
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

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !saving && setIsModalOpen(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editRecord ? 'Editar' : 'Novo'} Registro — Consolidado por Profissional</h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)} disabled={saving}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="modal-body">
                <div className="form-grid form-grid-2" style={{ gap: 16 }}>

                  <div className="form-group">
                    <label className="form-label required">Estabelecimento</label>
                    <select className={`form-select ${errors.estabelecimento_id ? 'error' : ''}`} {...register('estabelecimento_id')}>
                      <option value="">Selecione...</option>
                      {estabelecimentos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                    {errors.estabelecimento_id && <span className="form-error">{errors.estabelecimento_id.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Especialidade</label>
                    <select className={`form-select ${errors.especialidade_id ? 'error' : ''}`} {...register('especialidade_id')}>
                      <option value="">Selecione...</option>
                      {especialidades.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                    {errors.especialidade_id && <span className="form-error">{errors.especialidade_id.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Profissional</label>
                    <select className={`form-select ${errors.profissional_id ? 'error' : ''}`} {...register('profissional_id')}>
                      <option value="">Selecione...</option>
                      {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                    {errors.profissional_id && <span className="form-error">{errors.profissional_id.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Tipo</label>
                    <select className="form-select" {...register('tipo')}>
                      {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Procedimento</label>
                    <select className="form-select" {...register('procedimento_id')}>
                      <option value="">Nenhum</option>
                      {procedimentos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Carga Horária Semanal</label>
                    <input type="number" min={0} step={0.5} className={`form-input ${errors.carga_horaria_semanal ? 'error' : ''}`} {...register('carga_horaria_semanal')} />
                    {errors.carga_horaria_semanal && <span className="form-error">{errors.carga_horaria_semanal.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Carga Horária Agendamento</label>
                    <input type="number" min={0} step={0.5} className={`form-input ${errors.carga_horaria_agendamento ? 'error' : ''}`} {...register('carga_horaria_agendamento')} />
                    {errors.carga_horaria_agendamento && <span className="form-error">{errors.carga_horaria_agendamento.message}</span>}
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Pacientes/Hora
                      <span data-tooltip="Aceita casas decimais (ex: 2,5). Deixe vazio se não aplicável." style={{ cursor: 'help' }}>
                        <Info size={12} color="var(--text-muted)" />
                      </span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      className="form-input"
                      placeholder="Ex: 2.5 (opcional)"
                      {...register('pacientes_hora')}
                    />
                    <span className="form-hint">Deixe vazio caso não se aplique</span>
                  </div>

                  {/* Calculated fields */}
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calculator size={13} /> Atendimentos Semanais
                    </label>
                    <div className="calc-field">
                      <Calculator size={14} />
                      {previewAtend !== null
                        ? <span style={{ fontSize: '1rem', fontWeight: 700 }}>{previewAtend.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
                        : <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.875rem' }}>— (Pac./Hora não preenchido)</span>
                      }
                    </div>
                    <span className="form-hint">= CH Agendamento × Pacientes/Hora</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calculator size={13} /> Capacidade Instalada
                    </label>
                    <div className="calc-field" style={{ background: 'linear-gradient(135deg, rgba(52,211,153,.08), rgba(16,185,129,.05))', borderColor: 'rgba(52,211,153,.25)' }}>
                      <Calculator size={14} color="var(--accent-400)" />
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-400)' }}>
                        {previewCapInst.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <span className="form-hint">
                      {watchPacHora === null
                        ? 'Pac./Hora vazio → = CH Agendamento'
                        : '= Atendimentos Semanais × 4'
                      }
                    </span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving} id="btn-salvar-consol">
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
        message="Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        confirmLabel="Excluir"
      />
    </>
  )
}
