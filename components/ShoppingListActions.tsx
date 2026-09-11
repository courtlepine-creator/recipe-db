'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ShoppingListActions({
  ingredientNames,
  colorBg,
  colorText,
}: {
  ingredientNames: string[]
  colorBg: string
  colorText: string
}) {
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [allAdded, setAllAdded] = useState(false)

  async function getUserId() {
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  }

  async function addOne(name: string) {
    const userId = await getUserId()
    if (!userId) {
      alert('Sign in on the Meal plan page first to use the shopping list.')
      return
    }
    const { error } = await supabase.from('shopping_list_items').insert({ name, user_id: userId })
    if (error) {
      alert('Failed to add: ' + error.message)
      return
    }
    setAdded((prev) => new Set(prev).add(name))
  }

  async function addAll() {
    const userId = await getUserId()
    if (!userId) {
      alert('Sign in on the Meal plan page first to use the shopping list.')
      return
    }
    const { error } = await supabase
      .from('shopping_list_items')
      .insert(ingredientNames.map((name) => ({ name, user_id: userId })))
    if (error) {
      alert('Failed to add: ' + error.message)
      return
    }
    setAdded(new Set(ingredientNames))
    setAllAdded(true)
  }

  return (
    <div>
      <button
        onClick={addAll}
        disabled={allAdded}
        style={{
          fontSize: '12px',
          fontWeight: 500,
          padding: '5px 12px',
          borderRadius: '999px',
          border: 'none',
          backgroundColor: allAdded ? '#E8E2D4' : colorText,
          color: allAdded ? '#8A7F6C' : '#fff',
          marginBottom: '8px',
        }}
      >
        {allAdded ? '✓ Added to list' : '+ Add whole recipe to list'}
      </button>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {ingredientNames.map((name) => {
          const isAdded = added.has(name)
          return (
            <button
              key={name}
              onClick={() => addOne(name)}
              disabled={isAdded}
              style={{
                fontSize: '12.5px',
                backgroundColor: isAdded ? '#E8E2D4' : colorBg,
                color: isAdded ? '#8A7F6C' : colorText,
                borderRadius: '999px',
                padding: '4px 12px',
              }}
            >
              {isAdded ? `✓ ${name}` : `+ ${name}`}
            </button>
          )
        })}
      </div>
    </div>
  )
}