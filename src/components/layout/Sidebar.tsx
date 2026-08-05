'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { Profile } from '@/lib/types'
import {
  LayoutDashboard, Users, Building2, Stethoscope, ClipboardList,
  UserCheck, BarChart3, ClipboardPlus, LogOut, Moon, Sun, Activity,
  ChevronRight, Settings
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
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Activity size={18} color="white" />
        </div>
        <div>
          <div className="sidebar-logo-text">Cap. Instalada</div>
          <div className="sidebar-logo-sub">& Potencial</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((group) => (
          <div key={group.section}>
            <div className="sidebar-section-label">{group.section}</div>
            {group.items.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  {item.label}
                  {isActive && <ChevronRight size={12} style={{ marginLeft: 'auto' }} />}
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
            {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
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
          <div className="user-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name truncate">{profile.nome}</div>
            <div className="user-role">
              {profile.perfil === 'admin' ? 'Administrador' : 'Consultor'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
