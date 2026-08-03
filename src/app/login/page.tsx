'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Eye, EyeOff, Activity, Moon, Sun } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const { theme, toggleTheme } = useTheme()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const validate = () => {
    const e: typeof errors = {}
    if (!email) e.email = 'Email é obrigatório'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email inválido'
    if (!password) e.password = 'Senha é obrigatória'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast(
        error.message === 'Invalid login credentials'
          ? 'Email ou senha incorretos.'
          : 'Erro ao fazer login. Tente novamente.',
        'error'
      )
      setLoading(false)
      return
    }

    toast('Login realizado com sucesso!', 'success')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={styles.page}>
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="btn-icon"
        style={styles.themeBtn}
        aria-label="Alternar tema"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Left panel — branding */}
      <div style={styles.leftPanel}>
        <div style={styles.brandContent}>
          <div style={styles.brandIcon}>
            <Activity size={32} color="white" />
          </div>
          <h1 style={styles.brandTitle}>Capacidade Instalada</h1>
          <p style={styles.brandSubtitle}>& Potencial</p>
          <p style={styles.brandDesc}>
            Gerencie e analise a capacidade de atendimento dos seus estabelecimentos de saúde com dados precisos e visualizações intuitivas.
          </p>

          <div style={styles.featureList}>
            {[
              'Cadastro de Capacidade Potencial',
              'Consolidado por Profissional',
              'Painel de BI Interativo',
              'Importação e Exportação de Dados',
            ].map((f, i) => (
              <div key={i} style={styles.featureItem}>
                <div style={styles.featureDot} />
                <span style={styles.featureText}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.gradientOrb1} />
        <div style={styles.gradientOrb2} />
      </div>

      {/* Right panel — form */}
      <div style={styles.rightPanel}>
        <div style={styles.formCard}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={styles.formTitle}>Bem-vindo de volta</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Faça login para acessar o sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label required" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="seu@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: undefined })) }}
                autoComplete="email"
                disabled={loading}
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label required" htmlFor="login-password">Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: undefined })) }}
                  autoComplete="current-password"
                  disabled={loading}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="btn-icon"
                  style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 4 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Entrando...
                </>
              ) : 'Entrar'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 24 }}>
            Não tem acesso? Solicite ao administrador do sistema.
          </p>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    position: 'relative',
  },
  themeBtn: {
    position: 'fixed',
    top: 20,
    right: 20,
    zIndex: 50,
  },
  leftPanel: {
    flex: 1,
    background: 'linear-gradient(135deg, #0a0b14 0%, #1a1d35 50%, #0e1022 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 48px',
    position: 'relative',
    overflow: 'hidden',
  },
  brandContent: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 420,
  },
  brandIcon: {
    width: 72,
    height: 72,
    borderRadius: 'var(--radius-xl)',
    background: 'linear-gradient(135deg, #6366f1, #4338ca)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    boxShadow: '0 0 40px rgba(99,102,241,.4)',
  },
  brandTitle: {
    fontSize: '2rem',
    fontWeight: 800,
    color: '#f0f1ff',
    lineHeight: 1.2,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: '1.5rem',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #818cf8, #34d399)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: 20,
  },
  brandDesc: {
    color: '#a5a8c8',
    fontSize: '0.9375rem',
    lineHeight: 1.7,
    marginBottom: 32,
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #34d399)',
    flexShrink: 0,
  },
  featureText: {
    color: '#c7d2fe',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  gradientOrb1: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,.12) 0%, transparent 70%)',
    top: -100,
    right: -100,
    pointerEvents: 'none',
  },
  gradientOrb2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(52,211,153,.08) 0%, transparent 70%)',
    bottom: -80,
    left: -80,
    pointerEvents: 'none',
  },
  rightPanel: {
    width: 480,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 40px',
    background: 'var(--bg-base)',
  },
  formCard: {
    width: '100%',
    maxWidth: 380,
  },
  formTitle: {
    fontSize: '1.625rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: 6,
  },
}
