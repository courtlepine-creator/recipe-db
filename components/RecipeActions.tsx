'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function RecipeActions({
  id,
  initialFavorite,
  initialMade,
}: {
  id: string
  initialFavorite: boolean
  initialMade: boolean
}) {
  const router = useRouter()
  const [favorite, setFavorite] = useState(initialFavorite)
  const [made, setMade] = useState(initialMade)
  const [saving, setSaving] = useState(false)

  async function toggleFavorite() {
    const next = !favorite
    setFavorite(next)
    setSaving(true)
    await supabase.from('recipes').update({ favorite: next }).eq('id', id)
    setSaving(false)
    router.refresh()
  }

  async function toggleMade() {
    const next = !made
    setMade(next)
    setSaving(true)
    await supabase.from('recipes').update({ made: next }).eq('id', id)
    setSaving(false)
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
      <button
        onClick={toggleFavorite}
        disabled={saving}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontWeight: 500,
          padding: '7px 14px',
          borderRadius: '999px',
          border: '1px solid #EADFCB',
          backgroundColor: favorite ? '#B25A45' : '#fff',
          color: favorite ? '#fff' : '#7A6F5C',
        }}
      >
        {favorite ? '★ Favorited' : '☆ Favorite'}
      </button>

      <button
        onClick={toggleMade}
        disabled={saving}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          fontWeight: 500,
          padding: '7px 14px',
          borderRadius: '999px',
          border: '1px solid #EADFCB',
          backgroundColor: made ? '#5C6B4B' : '#fff',
          color: made ? '#fff' : '#7A6F5C',
        }}
      >
        {made ? '✓ Made it' : 'Mark as made'}
      </button>
    </div>
  )
}