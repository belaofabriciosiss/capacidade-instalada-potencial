'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import { Profile } from '@/lib/types'
import SearchBar from '@/components/ui/SearchBar'
import ConfirmModal from '@/components/ui/ConfirmModal'
import {
  Plus, Pencil, X, Check, XCircle, ShieldCheck, User, Eye, EyeOff, UserCog
} from 'lucide-react'

const PAGE_SIZE = 20

interface Props {
  initialData: Profile[]
  currentUserId: string
}

interface FormState {
  nome: string
  email: string
  perfil: 'admin' | 'consultor'
  senha: string
}

const defaultForm: FormState = { nome: '', email: '', perfil: 'consultor', senha: '' }

export default function UsuariosClient({ initialData, currentUserId }: Props) {
  const supabase = createClient()
  const { toast } = useToast()

  const [users, setUsers] = useState<Profile[]>(initialData)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [formErrors, setFormErrors] = useState<Partial<FormState>>({})
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<Profile | null>(null)
  const [toggling, setToggling] = useState(false)

  const filtered = users.filter(u => {
    if (!search) return true
    const s = search.toLowerCase()
    return u.nome.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openCreate = () => {
    setEditUser(null)
    setForm(defaultForm)
    setFormErrors({})
    setShowPass(false)
    setIsModalOpen(true)
  }

  const openEdit = (u: Profile) => {
    setEditUser(u)
    setForm({ nome: u.nome, email: u.email, perfil: u.perfil, senha: '' })
    setFormErrors({})
    setShowPass(false)
    setIsModalOpen(true)
  }

  const validate = () => {
    const errs: Partial<FormState> = {}
    if (!form.nome.trim()) errs.nome = 'Nome é obrigatório'
    if (!form.email.trim()) errs.email = 'Email é obrigatório'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Email inválido'
    if (!editUser && !form.senha) errs.senha = 'Senha é obrigatória'
    if (form.senha && form.senha.length < 6) errs.senha = 'Mínimo 6 caracteres'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)

    if (editUser) {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ nome: form.nome.trim(), perfil: form.perfil })
        .eq('id', editUser.id)

      if (profileError) {
        toast('Erro ao atualizar usuário.', 'error')
        setSaving(false)
        return
      }

      setUsers(prev => prev.map(u =>
        u.id === editUser.id ? { ...u, nome: form.nome.trim(), perfil: form.perfil } : u
      ))
      toast('Usuário atualizado!', 'success')
    } else {
      // Create new user via Supabase Admin API route
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.senha,
          nome: form.nome.trim(),
          perfil: form.perfil,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        toast(result.error || 'Erro ao criar usuário.', 'error')
        setSaving(false)
        return
      }

      setUsers(prev => [result.user as Profile, ...prev])
      toast('Usuário criado com sucesso!', 'success')
    }

    setSaving(false)
    setIsModalOpen(false)
  }

  const handleToggleActive = async () => {
    if (!deactivateTarget) return
    setToggling(true)
    const { error } = await supabase
      .from('profiles')
      .update({ ativo: !deactivateTarget.ativo })
      .eq('id', deactivateTarget.id)

    if (error) {
      toast('Erro ao alterar status do usuário.', 'error')
      setToggling(false)
      return
    }

    setUsers(prev => prev.map(u =>
      u.id === deactivateTarget.id ? { ...u, ativo: !deactivateTarget.ativo } : u
    ))
    toast(
      !deactivateTarget.ativo ? 'Usuário ativado.' : 'Usuário desativado.',
      'info'
    )
    setToggling(false)
    setDeactivateTarget(null)
  }

  const setField = (field: keyof FormState, value: string) => {
    setForm(p => ({ ...p, [field]: value }))
    setFormErrors(p => ({ ...p, [field]: undefined }))
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="page-subtitle">Gerencie os usuários e perfis de acesso ao sistema</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} id="btn-novo-usuario">
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total de Usuários', value: users.length, icon: UserCog, color: '#6366f1', bg: 'rgba(99,102,241,.1)' },
          { label: 'Administradores', value: users.filter(u => u.perfil === 'admin').length, icon: ShieldCheck, color: '#fbbf24', bg: 'rgba(251,191,36,.1)' },
          { label: 'Consultores', value: users.filter(u => u.perfil === 'consultor').length, icon: User, color: '#34d399', bg: 'rgba(52,211,153,.1)' },
        ].map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="kpi-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={card.color} />
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{card.value}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{card.label}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card card-md" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1) }} placeholder="Buscar usuário ou email..." />
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {filtered.length} usuário{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Email</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Cadastrado em</th>
                <th style={{ width: 100, textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <p style={{ color: 'var(--text-muted)' }}>Nenhum usuário encontrado</p>
                  </div>
                </td></tr>
              ) : paginated.map(u => {
                const initials = u.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
                const isCurrentUser = u.id === currentUserId
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1, #4338ca)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.7rem', fontWeight: 700, color: 'white', flexShrink: 0,
                        }}>{initials}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{u.nome}</div>
                          {isCurrentUser && <div style={{ fontSize: '0.65rem', color: 'var(--brand-400)' }}>Você</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{u.email}</td>
                    <td>
                      <span className={`badge ${u.perfil === 'admin' ? 'badge-warn' : 'badge-brand'}`}>
                        {u.perfil === 'admin' ? <><ShieldCheck size={10} /> Admin</> : <><User size={10} /> Consultor</>}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.ativo ? 'badge-success' : 'badge-muted'}`}>
                        {u.ativo ? <><Check size={10} /> Ativo</> : <><XCircle size={10} /> Inativo</>}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button className="btn-icon" onClick={() => openEdit(u)} title="Editar"><Pencil size={14} /></button>
                        {!isCurrentUser && (
                          <button
                            className="btn-icon"
                            onClick={() => setDeactivateTarget(u)}
                            title={u.ativo ? 'Desativar' : 'Ativar'}
                            style={{ color: u.ativo ? 'var(--warn-400)' : 'var(--accent-400)' }}
                          >
                            {u.ativo ? <XCircle size={14} /> : <Check size={14} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pagination">
            <span className="pagination-info">{Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–{Math.min(page*PAGE_SIZE, filtered.length)} de {filtered.length}</span>
            <button className="page-btn" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_,i) => i+1).map(p => (
              <button key={p} className={`page-btn ${page===p?'active':''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}>›</button>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !saving && setIsModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)} disabled={saving}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label required">Nome completo</label>
                <input
                  type="text"
                  className={`form-input ${formErrors.nome ? 'error' : ''}`}
                  value={form.nome}
                  onChange={e => setField('nome', e.target.value)}
                  placeholder="Nome do usuário"
                  id="input-nome-usuario"
                />
                {formErrors.nome && <span className="form-error">{formErrors.nome}</span>}
              </div>

              <div className="form-group">
                <label className="form-label required">Email</label>
                <input
                  type="email"
                  className={`form-input ${formErrors.email ? 'error' : ''}`}
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  placeholder="email@exemplo.com"
                  disabled={!!editUser}
                  id="input-email-usuario"
                />
                {editUser && <span className="form-hint">O email não pode ser alterado.</span>}
                {formErrors.email && <span className="form-error">{formErrors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label required">Perfil de Acesso</label>
                <select
                  className="form-select"
                  value={form.perfil}
                  onChange={e => setField('perfil', e.target.value)}
                  id="select-perfil-usuario"
                >
                  <option value="consultor">Consultor — Acesso apenas ao Dashboard</option>
                  <option value="admin">Administrador — Acesso completo ao sistema</option>
                </select>
              </div>

              {!editUser && (
                <div className="form-group">
                  <label className="form-label required">Senha inicial</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      className={`form-input ${formErrors.senha ? 'error' : ''}`}
                      value={form.senha}
                      onChange={e => setField('senha', e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      style={{ paddingRight: 44 }}
                      id="input-senha-usuario"
                    />
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => setShowPass(p => !p)}
                      style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {formErrors.senha && <span className="form-error">{formErrors.senha}</span>}
                  <span className="form-hint">O usuário poderá alterar a senha após o primeiro acesso.</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} id="btn-salvar-usuario">
                {saving ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Salvando...</> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deactivateTarget}
        title={deactivateTarget?.ativo ? 'Desativar Usuário' : 'Ativar Usuário'}
        message={
          deactivateTarget?.ativo
            ? `Deseja desativar o usuário "${deactivateTarget?.nome}"? Ele não conseguirá mais fazer login.`
            : `Deseja ativar o usuário "${deactivateTarget?.nome}"? Ele voltará a ter acesso ao sistema.`
        }
        onConfirm={handleToggleActive}
        onCancel={() => setDeactivateTarget(null)}
        loading={toggling}
        confirmLabel={deactivateTarget?.ativo ? 'Desativar' : 'Ativar'}
      />
    </>
  )
}
