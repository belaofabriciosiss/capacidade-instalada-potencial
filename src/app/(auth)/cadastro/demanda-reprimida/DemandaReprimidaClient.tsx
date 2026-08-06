'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import { Procedimento, DemandaReprimida } from '@/lib/types'
import { Plus, Pencil, Trash2, Download, Upload, X, CheckSquare, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import SearchBar from '@/components/ui/SearchBar'
import ConfirmModal from '@/components/ui/ConfirmModal'
import * as XLSX from 'xlsx'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

interface Props {
  procedimentos: Procedimento[]
  initialData: DemandaReprimida[]
}

const PAGE_SIZE = 15

const schema = z.object({
  procedimento_id: z.string().min(1, 'Procedimento é obrigatório'),
  media_solicitacoes: z.coerce.number().min(0, 'Deve ser maior ou igual a zero'),
  demanda_reprimida: z.coerce.number().min(0, 'Deve ser maior ou igual a zero'),
})
type FormData = z.infer<typeof schema>

export default function DemandaReprimidaClient({ procedimentos: initProc, initialData }: Props) {
  const supabase = createClient()
  const { toast } = useToast()
  
  const [records, setRecords] = useState(initialData)
  const [procedimentos, setProcedimentos] = useState(initProc)
  
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<DemandaReprimida | null>(null)
  const [saving, setSaving] = useState(false)
  
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const [sortKey, setSortKey] = useState<string>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { media_solicitacoes: 0, demanda_reprimida: 0, procedimento_id: '' }
  })

  // Filter + search
  const filtered = records.filter(r => {
    const nomeProc = r.procedimento?.nome || ''
    if (search && !nomeProc.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    let aVal: any, bVal: any
    switch (sortKey) {
      case 'procedimento': aVal = a.procedimento?.nome || ''; bVal = b.procedimento?.nome || ''; break
      case 'media_solicitacoes': aVal = a.media_solicitacoes; bVal = b.media_solicitacoes; break
      case 'demanda_reprimida': aVal = a.demanda_reprimida; bVal = b.demanda_reprimida; break
      default: aVal = a.created_at; bVal = b.created_at
    }
    if (aVal === bVal) return 0
    const cmp = aVal < bVal ? -1 : 1
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [search])

  const isAllPageSelected = paginated.length > 0 && paginated.every(r => selectedIds.has(r.id))
  const isAllGlobalSelected = sorted.length > 0 && sorted.every(r => selectedIds.has(r.id))

  const toggleSelectAll = () => {
    if (isAllGlobalSelected) {
      setSelectedIds(new Set())
    } else if (isAllPageSelected) {
      setSelectedIds(new Set(sorted.map(r => r.id)))
    } else {
      const next = new Set(selectedIds)
      paginated.forEach(r => next.add(r.id))
      setSelectedIds(next)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openCreate = () => {
    setEditRecord(null)
    reset({ media_solicitacoes: 0, demanda_reprimida: 0, procedimento_id: '' })
    setIsModalOpen(true)
  }

  const openEdit = (r: DemandaReprimida) => {
    setEditRecord(r)
    reset({
      procedimento_id: r.procedimento_id || '',
      media_solicitacoes: r.media_solicitacoes,
      demanda_reprimida: r.demanda_reprimida,
    })
    setIsModalOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    const payload = {
      procedimento_id: data.procedimento_id,
      media_solicitacoes: data.media_solicitacoes,
      demanda_reprimida: data.demanda_reprimida,
    }

    let error
    if (editRecord) {
      const res = await supabase.from('demanda_reprimida').update(payload).eq('id', editRecord.id)
      error = res.error
    } else {
      const res = await supabase.from('demanda_reprimida').insert([payload])
      error = res.error
    }

    setSaving(false)
    if (error) {
      toast('Erro ao salvar registro.', 'error')
    } else {
      toast('Registro salvo com sucesso!', 'success')
      setIsModalOpen(false)
      refreshData()
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    const { error } = await supabase.from('demanda_reprimida').delete().eq('id', deleteId)
    setDeleting(false)
    if (error) {
      toast('Erro ao excluir registro.', 'error')
    } else {
      toast('Registro excluído!', 'success')
      setDeleteId(null)
      refreshData()
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    const ids = Array.from(selectedIds)
    
    const CHUNK_SIZE = 100
    let errors = []
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const chunk = ids.slice(i, i + CHUNK_SIZE)
      const { error } = await supabase.from('demanda_reprimida').delete().in('id', chunk)
      if (error) errors.push(error)
    }

    if (errors.length > 0) {
      toast(`Erro ao excluir alguns registros.`, 'error')
    } else {
      toast(`${ids.length} registros excluídos.`, 'success')
      setSelectedIds(new Set())
    }
    setBulkDeleting(false)
    setShowBulkDeleteModal(false)
    refreshData()
  }

  const refreshData = async () => {
    const { data } = await supabase.from('demanda_reprimida')
      .select('*, procedimento:procedimentos(nome, id)')
      .order('created_at', { ascending: false })
    if (data) setRecords(data as DemandaReprimida[])
  }

  // Export
  const handleExport = () => {
    const rows = filtered.map(r => ({
      'Procedimento': r.procedimento?.nome || '',
      'Média de Solicitações': r.media_solicitacoes,
      'Demanda Reprimida': r.demanda_reprimida,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Demanda Reprimida')
    XLSX.writeFile(wb, 'demanda_reprimida.xlsx')
    toast('Dados exportados com sucesso!', 'success')
  }

  // Download template
  const handleTemplate = () => {
    const rows = [{ 'Procedimento': 'Nome do Procedimento', 'Média de Solicitações': 50, 'Demanda Reprimida': 120 }]
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, 'template_demanda_reprimida.xlsx')
    toast('Template baixado!', 'info')
  }

  // Import
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsImporting(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

        const payloads = []
        let skipped = 0
        
        // 1. Pre-pass: Identificar procedimentos faltando
        const missingProc = new Map<string, string>()

        for (const row of rows) {
          const rawProcStr = String(row['Procedimento'] || row['PROCEDIMENTO'] || '').trim()
          if (rawProcStr) {
            const rawProc = rawProcStr.toLowerCase()
            if (!procedimentos.some(p => p.nome.toLowerCase().trim() === rawProc)) {
              missingProc.set(rawProc, rawProcStr)
            }
          }
        }

        // 2. Inserir procedimentos faltando
        let currProcedimentos = [...procedimentos]
        if (missingProc.size > 0) {
          const toInsert = Array.from(missingProc.values()).map(nome => ({ nome, ativo: true }))
          const { data, error } = await supabase.from('procedimentos').insert(toInsert).select()
          if (!error && data) {
            currProcedimentos = [...currProcedimentos, ...data]
            setProcedimentos(currProcedimentos)
          } else {
            console.error('Erro ao criar procedimentos:', error)
          }
        }

        // 3. Construir payloads
        for (const row of rows) {
          const rawProcStr = String(row['Procedimento'] || row['PROCEDIMENTO'] || '').toLowerCase().trim()
          
          if (!rawProcStr) {
            skipped++
            continue
          }

          const proc = currProcedimentos.find(p => p.nome.toLowerCase().trim() === rawProcStr)
          
          if (!proc) {
            skipped++
            continue
          }

          const getNum = (val: unknown, fallback: number) => {
            if (val === undefined || val === null || val === '') return fallback
            const num = Number(val)
            return isNaN(num) ? fallback : num
          }

          payloads.push({
            procedimento_id: proc.id,
            media_solicitacoes: getNum(row['Média de Solicitações'] ?? row['MEDIA DE SOLICITACOES'] ?? row['Média De Solicitações'] ?? row['Média de Solicitaçoes'], 0),
            demanda_reprimida: getNum(row['Demanda Reprimida'] ?? row['DEMANDA REPRIMIDA'] ?? row['Demanda reprimida'], 0),
          })
        }

        let imported = 0
        const CHUNK_SIZE = 100
        let lastError = null
        for (let i = 0; i < payloads.length; i += CHUNK_SIZE) {
          const chunk = payloads.slice(i, i + CHUNK_SIZE)
          const { error } = await supabase.from('demanda_reprimida').insert(chunk)
          if (!error) {
            imported += chunk.length
          } else {
            console.error('Erro no chunk', i, error)
            lastError = error
          }
        }

        refreshData()
        
        if (lastError) {
          toast(`Erro na importação: ${lastError.message || JSON.stringify(lastError)}`, 'error')
        } else if (skipped > 0) {
          toast(`${imported} importados. ${skipped} ignorados (linhas em branco).`, 'error')
        } else {
          toast(`${imported} registros importados com sucesso!`, 'success')
        }
      } catch (err: any) {
        toast(`Erro interno ao importar arquivo. ${err.message}`, 'error')
      } finally {
        setIsImporting(false)
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Demanda Reprimida</h1>
          <p className="page-subtitle">Cadastro e acompanhamento de demanda reprimida por procedimento</p>
        </div>
        <div className="page-actions">
          {selectedIds.size > 0 && (
            <button className="btn btn-sm" style={{ background: 'var(--danger-500)', color: '#fff', gap: 6 }} onClick={() => setShowBulkDeleteModal(true)}>
              <Trash2 size={14} /> Excluir {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleTemplate}>
            <Download size={14} /> Template
          </button>
          <label className="btn btn-secondary btn-sm" style={{ cursor: isImporting ? 'wait' : 'pointer', opacity: isImporting ? 0.7 : 1 }}>
            {isImporting ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Upload size={14} />}
            {isImporting ? 'Importando...' : 'Importar'}
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: 'none' }} disabled={isImporting} />
          </label>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}><Download size={14} /> Exportar</button>
          <button className="btn btn-primary" onClick={openCreate} id="btn-novo-demanda">
            <Plus size={16} /> Novo Registro
          </button>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="card card-md" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar procedimento..." />
        {search && (
          <button className="btn btn-secondary btn-sm" onClick={() => setSearch('')}>
            Limpar
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Select-all global banner */}
      {isAllPageSelected && !isAllGlobalSelected && sorted.length > PAGE_SIZE && (
        <div style={{
          background: 'rgba(99,102,241,.1)',
          border: '1px solid rgba(99,102,241,.25)',
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: '0.8375rem',
          color: 'var(--text-primary)',
        }}>
          <span>Os {paginated.length} registros desta página estão selecionados.</span>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--brand-500)', color: '#fff', padding: '4px 12px' }}
            onClick={() => setSelectedIds(new Set(sorted.map(r => r.id)))}
          >
            Selecionar todos os {sorted.length} registros
          </button>
        </div>
      )}
      {isAllGlobalSelected && sorted.length > PAGE_SIZE && (
        <div style={{
          background: 'rgba(52,211,153,.1)',
          border: '1px solid rgba(52,211,153,.25)',
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: '0.8375rem',
          color: 'var(--text-primary)',
        }}>
          <span>✅ Todos os <strong>{sorted.length}</strong> registros filtrados estão selecionados.</span>
          <button
            className="btn btn-sm btn-secondary"
            style={{ padding: '4px 12px' }}
            onClick={() => setSelectedIds(new Set())}
          >
            Cancelar seleção
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 36, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                {([
                  { key: 'procedimento', label: 'Procedimento' },
                  { key: 'media_solicitacoes', label: 'Média de Solicitações' },
                  { key: 'demanda_reprimida', label: 'Demanda Reprimida' },
                ] as const).map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {label}
                      {sortKey === key
                        ? sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                        : <ArrowUpDown size={11} style={{ opacity: 0.35 }} />}
                    </span>
                  </th>
                ))}
                <th style={{ width: 80, textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                paginated.map(r => (
                  <tr key={r.id} className={selectedIds.has(r.id) ? 'selected' : ''}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td>{r.procedimento?.nome || 'N/A'}</td>
                    <td>{r.media_solicitacoes}</td>
                    <td>{r.demanda_reprimida}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <button className="action-btn" title="Editar" onClick={() => openEdit(r)}><Pencil size={15} /></button>
                        <button className="action-btn" title="Excluir" onClick={() => setDeleteId(r.id)}><Trash2 size={15} color="var(--danger-500)" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Anterior
            </button>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Página {page} de {totalPages}
            </span>
            <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Próxima
            </button>
          </div>
        )}
      </div>

      {/* Modal CRUD */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editRecord ? 'Editar Registro' : 'Novo Registro'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <form id="demanda-form" onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                <div className="form-group">
                  <label className="form-label">Procedimento</label>
                  <select className="form-select" {...register('procedimento_id')} autoFocus>
                    <option value="">Selecione...</option>
                    {procedimentos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                  {errors.procedimento_id && <span className="form-error">{errors.procedimento_id.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Média de Solicitações</label>
                  <input type="number" step="1" className="form-input" {...register('media_solicitacoes')} />
                  {errors.media_solicitacoes && <span className="form-error">{errors.media_solicitacoes.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Demanda Reprimida</label>
                  <input type="number" step="1" className="form-input" {...register('demanda_reprimida')} />
                  {errors.demanda_reprimida && <span className="form-error">{errors.demanda_reprimida.message}</span>}
                </div>

              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button form="demanda-form" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Single */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="Excluir Registro"
        message="Tem certeza que deseja excluir este registro?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />

      {/* Confirm Bulk Delete */}
      <ConfirmModal
        isOpen={showBulkDeleteModal}
        title="Excluir Registros"
        message={`Tem certeza que deseja excluir os ${selectedIds.size} registros selecionados?`}
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteModal(false)}
        loading={bulkDeleting}
      />
    </>
  )
}
