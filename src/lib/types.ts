export type Perfil = 'admin' | 'consultor'

export interface Profile {
  id: string
  nome: string
  email: string
  perfil: Perfil
  ativo: boolean
  created_at: string
  created_by: string | null
}

export interface Estabelecimento {
  id: string
  nome: string
  ativo: boolean
  created_at: string
  created_by: string | null
}

export interface Especialidade {
  id: string
  nome: string
  ativo: boolean
  created_at: string
  created_by: string | null
}

export interface Procedimento {
  id: string
  nome: string
  ativo: boolean
  created_at: string
  created_by: string | null
}

export interface Profissional {
  id: string
  nome: string
  ativo: boolean
  created_at: string
  created_by: string | null
}

export type TipoSala = 'Consultas' | 'Exames' | 'Procedimentos' | 'Multifuncional'

export interface CapacidadePotencial {
  id: string
  estabelecimento_id: string
  estabelecimento?: Estabelecimento
  tipo_sala: TipoSala
  total_salas: number
  horas_dia: number
  pacientes_hora: number
  capacidade_potencial: number
  created_at: string
  created_by: string | null
  updated_at: string | null
  updated_by: string | null
}

export type TipoAtendimento = 'Consulta' | 'Exame'

export interface ConsolidadoProfissional {
  id: string
  estabelecimento_id: string
  estabelecimento?: Estabelecimento
  especialidade_id: string
  especialidade?: Especialidade
  profissional_id: string
  profissional?: Profissional
  tipo: TipoAtendimento
  procedimento_id: string | null
  procedimento?: Procedimento | null
  carga_horaria_semanal: number
  carga_horaria_agendamento: number
  pacientes_hora: number | null
  atendimentos_semanais: number | null
  capacidade_instalada: number
  created_at: string
  created_by: string | null
  updated_at: string | null
  updated_by: string | null
}
