'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { Profile } from '@/lib/types'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, Building2, Stethoscope, ClipboardList,
  UserCheck, BarChart3, ClipboardPlus, LogOut, Moon, Sun, Activity,
  ChevronRight, ChevronLeft, Settings
} from 'lucide-react'

interface SidebarProps {
  profile: Profile
}

const adminNavItems = [
  {
    section: 'Painel',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Cadastros',
    items: [
      { label: 'Capacidade Potencial', href: '/cadastro/capacidade-potencial', icon: BarChart3 },
      { label: 'Capacidade Instalada', href: '/cadastro/consolidado-profissional', icon: ClipboardPlus },
    ],
  },
  {
    section: 'Administração',
    items: [
      { label: 'Usuários', href: '/admin/usuarios', icon: Users },
      { label: 'Estabelecimentos', href: '/admin/estabelecimentos', icon: Building2 },
      { label: 'Especialidades', href: '/admin/especialidades', icon: Stethoscope },
      { label: 'Procedimentos', href: '/admin/procedimentos', icon: ClipboardList },
      { label: 'Profissionais', href: '/admin/profissionais', icon: UserCheck },
    ],
  },
]

const consultorNavItems = [
  {
    section: 'Painel',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
]

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { theme, toggleTheme } = useTheme()
  const { toast } = useToast()

  const [collapsed, setCollapsed] = useState(false)

  // Persist and restore collapsed state
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    const isCollapsed = saved === 'true'
    setCollapsed(isCollapsed)
    document.querySelector('.main-content')?.classList.toggle('sidebar-collapsed', isCollapsed)
  }, [])

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
    document.querySelector('.main-content')?.classList.toggle('sidebar-collapsed', next)
  }

  const navItems = profile.perfil === 'admin' ? adminNavItems : consultorNavItems

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast('Você saiu do sistema.', 'info')
    router.push('/login')
    router.refresh()
  }

  const initials = profile.nome
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Collapse toggle button */}
      <button
        className="sidebar-collapse-btn"
        onClick={toggleCollapsed}
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        <ChevronLeft size={13} />
      </button>

      <div className="sidebar-inner">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ flexShrink: 0 }}>
            <Activity size={18} color="white" />
          </div>
          <div className="sidebar-text">
            <div className="sidebar-logo-text">Cap. Instalada</div>
            <div className="sidebar-logo-sub">&amp; Potencial</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((group) => (
            <div key={group.section}>
              <div className="sidebar-section-label sidebar-text">{group.section}</div>
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    title={collapsed ? item.label : ''}
                  >
                    <Icon size={16} style={{ flexShrink: 0 }} />
                    <span className="sidebar-text">{item.label}</span>
                    {isActive && !collapsed && <ChevronRight size={12} style={{ marginLeft: 'auto' }} />}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <button
              onClick={toggleTheme}
              className="btn-icon"
              style={{ flex: 1, justifyContent: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)', height: 32 }}
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              <span className="sidebar-text">{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
            </button>
            <button
              onClick={handleLogout}
              className="btn-icon"
              title="Sair"
              style={{ color: 'var(--danger-400)' }}
            >
              <LogOut size={15} />
            </button>
          </div>

          <div className="user-info">
            <div className="user-avatar" style={{ flexShrink: 0 }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }} className="sidebar-text">
              <div className="user-name truncate">{profile.nome}</div>
              <div className="user-role">
                {profile.perfil === 'admin' ? 'Administrador' : 'Consultor'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
