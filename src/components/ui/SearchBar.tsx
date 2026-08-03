'use client'

import { Search } from 'lucide-react'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export default function SearchBar({ value, onChange, placeholder = 'Buscar...' }: Props) {
  return (
    <div className="search-bar">
      <Search size={15} />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        id="search-input"
      />
    </div>
  )
}
