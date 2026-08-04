'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import SearchBar from '@/components/ui/SearchBar'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { Plus, Pencil, Trash2, X, Check, XCircle, Download, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Item {
  id: string
  nome: string
  ativo: boolean
  created_at: string
}

interface Props {
  tableName: string
  label: string
  labelPlural: string
  initialData: Item[]
}

const PAGE_SIZE = 20

export default function MasterCrudClient({ tableName, label, labelPlural, initialData }: Props) {
  const supabase = createClient()
  const { toast } = useToast()

  const [items, setItems] = useState<Item[]>(initialData)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)
  const [nome, setNome] = useState('')
  const [nomeError, setNomeError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = items.filter(i => i.nome.toLowerCase().includes(search.toLowerCase()))
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openCreate = () => { setEditItem(null); setNome(''); setNomeError(''); setIsModalOpen(true) }
  const openEdit = (item: Item) => { setEditItem(item); setNome(item.nome); setNomeError(''); setIsModalOpen(true) }

  const handleSave = async () => {
    if (!nome.trim()) { setNomeError('Nome é obrigatório'); return }
    setSaving(true)
    if (editItem) {
      const { data, error } = await supabase.from(tableName).update({ nome: nome.trim() }).eq('id', editItem.id).select().single()
      if (error) { toast(`Erro ao atualizar ${label}.`, 'error'); setSaving(false); return }
      setItems(prev => prev.map(i => i.id === editItem.id ? data as Item : i))
      toast(`${label} atualizado(a)!`, 'success')
    } else {
      const { data, error } = await supabase.from(tableName).insert({ nome: nome.trim() }).select().single()
      if (error) {
        if (error.code === '23505') { toast(`Já existe um(a) ${label} com este nome.`, 'error') }
        else { toast(`Erro ao criar ${label}.`, 'error') }
        setSaving(false); return
      }
      setItems(prev => [data as Item, ...prev])
      toast(`${label} criado(a)!`, 'success')
    }
    setSaving(false)
    setIsModalOpen(false)
  }

  const handleToggleActive = async (item: Item) => {
    const { data, error } = await supabase.from(tableName).update({ ativo: !item.ativo }).eq('id', item.id).select().single()
    if (error) { toast('Erro ao alterar status.', 'error'); return }
    setItems(prev => prev.map(i => i.id === item.id ? data as Item : i))
    toast(data.ativo ? `${label} ativado(a).` : `${label} desativado(a).`, 'info')
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from(tableName).delete().eq('id', deleteTarget.id)
    if (error) {
      toast('Não é possível excluir — registro em uso.', 'error')
      setDeleting(false); return
    }
    setItems(prev => prev.filter(i => i.id !== deleteTarget.id))
    toast(`${label} excluído(a).`, 'success')
    setDeleting(false)
    setDeleteTarget(null)
  }

  const handleTemplate = () => {
    const rows = [{ 'Nome': `Exemplo de ${label}` }]
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Template')
    XLSX.writeFile(wb, `template_importacao_${tableName}.xlsx`)
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

        let imported = 0
        let duplicated = 0

        for (const row of rows) {
          const rawNome = row['Nome'] || row['nome'] || Object.values(row)[0]
          if (!rawNome) continue
          const cleanNome = String(rawNome).trim()
          if (!cleanNome) continue

          const { error } = await supabase.from(tableName).insert({ nome: cleanNome })
          if (error && error.code === '23505') {
            duplicated++
          } else if (!error) {
            imported++
          }
        }

        const { data: refreshed } = await supabase.from(tableName).select('*').order('nome')
        if (refreshed) setItems(refreshed as Item[])
        
        if (imported > 0) {
          toast(`${imported} ${labelPlural.toLowerCase()} importados com sucesso! ${duplicated > 0 ? `(${duplicated} ignorados pois já existiam)` : ''}`, 'success')
        } else if (duplicated > 0) {
          toast(`Nenhum registro novo. ${duplicated} já existiam.`, 'info')
        } else {
          toast('Nenhum dado válido encontrado na planilha.', 'warn')
        }
      } catch (err) {
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
          <h1 className="page-title">{labelPlural}</h1>
          <p className="page-subtitle">Gerencie os {labelPlural.toLowerCase()} cadastrados no sistema</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleTemplate}>
            <Download size={14} /> Template
          </button>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            <Upload size={14} /> Importar
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: 'none' }} />
          </label>
          <button className="btn btn-primary" onClick={openCreate} id={`btn-novo-${tableName}`}>
            <Plus size={16} /> Novo(a) {label}
          </button>
        </div>
      </div>

      <div className="card card-md" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder={`Buscar ${label.toLowerCase()}...`} />
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Status</th>
                <th>Cadastrado em</th>
                <th style={{ width: 100, textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={4}>
                  <div className="empty-state">
                    <p style={{ color: 'var(--text-muted)' }}>Nenhum {label.toLowerCase()} encontrado</p>
                  </div>
                </td></tr>
              ) : paginated.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.nome}</strong></td>
                  <td>
                    <span className={`badge ${item.ativo ? 'badge-success' : 'badge-muted'}`}>
                      {item.ativo ? <><Check size={10} /> Ativo</> : <><XCircle size={10} /> Inativo</>}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button className="btn-icon" onClick={() => openEdit(item)} title="Editar"><Pencil size={14} /></button>
                      <button
                        className="btn-icon"
                        onClick={() => handleToggleActive(item)}
                        title={item.ativo ? 'Desativar' : 'Ativar'}
                        style={{ color: item.ativo ? 'var(--warn-400)' : 'var(--accent-400)' }}
                      >
                        {item.ativo ? <XCircle size={14} /> : <Check size={14} />}
                      </button>
                      <button className="btn-icon" onClick={() => setDeleteTarget(item)} title="Excluir" style={{ color: 'var(--danger-400)' }}>
                        <Trash2 size={14} />
                      </button>
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
              {Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–{Math.min(page*PAGE_SIZE, filtered.length)} de {filtered.length}
            </span>
            <button className="page-btn" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i+1).map(p => (
              <button key={p} className={`page-btn ${page===p?'active':''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}>›</button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !saving && setIsModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editItem ? `Editar` : `Novo(a)`} {label}</h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)} disabled={saving}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label required">Nome</label>
                <input
                  type="text"
                  className={`form-input ${nomeError ? 'error' : ''}`}
                  value={nome}
                  onChange={e => { setNome(e.target.value); setNomeError('') }}
                  placeholder={`Nome do(a) ${label.toLowerCase()}...`}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  id={`input-nome-${tableName}`}
                />
                {nomeError && <span className="form-error">{nomeError}</span>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} id={`btn-salvar-${tableName}`}>
                {saving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Salvando...</> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title={`Excluir ${label}`}
        message={`Tem certeza que deseja excluir "${deleteTarget?.nome}"? Se o registro estiver em uso, a exclusão será bloqueada.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
        confirmLabel="Excluir"
      />
    </>
  )
}
