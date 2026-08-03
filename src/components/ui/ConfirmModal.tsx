'use client'

import { AlertTriangle, X } from 'lucide-react'

interface Props {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
  confirmLabel?: string
}

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, loading, confirmLabel = 'Confirmar' }: Props) {
  if (!isOpen) return null
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={18} color="var(--danger-400)" />
            </div>
            <h3 className="modal-title">{title}</h3>
          </div>
          <button className="btn-icon" onClick={onCancel}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancelar</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Excluindo...</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
