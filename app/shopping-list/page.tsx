'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type Item = {
  id: string
  name: string
  checked: boolean
}

export default function ShoppingListPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [newItem, setNewItem] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/login')
        return
      }
      setUser(data.user)
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (!user) return
    async function load() {
      const { data } = await supabase
        .from('shopping_list_items')
        .select('*')
        .order('created_at', { ascending: true })
      setItems(data ?? [])
      setLoading(false)
    }
    load()
  }, [user])

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItem.trim() || !user) return
    const { data } = await supabase
      .from('shopping_list_items')
      .insert({ name: newItem.trim(), user_id: user.id })
      .select()
      .single()
    if (data) setItems((prev) => [...prev, data])
    setNewItem('')
  }

  async function toggleItem(item: Item) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)))
    await supabase.from('shopping_list_items').update({ checked: !item.checked }).eq('id', item.id)
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await supabase.from('shopping_list_items').delete().eq('id', id)
  }

  async function clearChecked() {
    const checkedIds = items.filter((i) => i.checked).map((i) => i.id)
    if (checkedIds.length === 0) return
    setItems((prev) => prev.filter((i) => !i.checked))
    await supabase.from('shopping_list_items').delete().in('id', checkedIds)
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: '#FDF9F3', minHeight: '100vh', padding: '24px' }}>
        Loading...
      </div>
    )
  }

  const uncheckedCount = items.filter((i) => !i.checked).length

  return (
    <div style={{ backgroundColor: '#FDF9F3', minHeight: '100vh' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 20px 64px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <Link href="/" style={{ fontSize: '13px', color: '#7A6F5C' }}>
            ← Recipes
          </Link>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#2B2620', margin: 0 }}>Shopping list</h1>
          <span style={{ width: '60px' }} />
        </div>

        <form onSubmit={addItem} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add an item..."
            style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #EADFCB', borderRadius: '10px', padding: '10px 14px', fontSize: '14px' }}
          />
          <button
            type="submit"
            style={{ backgroundColor: '#2B2620', color: '#fff', borderRadius: '10px', padding: '10px 16px', fontSize: '14px', fontWeight: 500 }}
          >
            Add
          </button>
        </form>

        <p style={{ fontSize: '12.5px', color: '#8A7F6C', marginBottom: '8px' }}>
          {uncheckedCount} item{uncheckedCount !== 1 ? 's' : ''} left
        </p>

        <div style={{ backgroundColor: '#fff', border: '1px solid #EFE6D3', borderRadius: '14px', overflow: 'hidden' }}>
          {items.length === 0 && (
            <p style={{ padding: '20px', textAlign: 'center', fontSize: '13.5px', color: '#B3A78F' }}>
              Your list is empty — add an item above, or add ingredients from a recipe.
            </p>
          )}
          {items.map((item, i) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderBottom: i < items.length - 1 ? '1px solid #F0EADB' : 'none',
              }}
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleItem(item)}
                style={{ width: '17px', height: '17px', accentColor: '#5C6B4B', flexShrink: 0 }}
              />
              <span
                style={{
                  flex: 1,
                  fontSize: '14.5px',
                  color: item.checked ? '#B3A78F' : '#2B2620',
                  textDecoration: item.checked ? 'line-through' : 'none',
                }}
              >
                {item.name}
              </span>
              <button onClick={() => deleteItem(item.id)} style={{ fontSize: '13px', color: '#B3A78F' }}>
                ✕
              </button>
            </div>
          ))}
        </div>

        {items.some((i) => i.checked) && (
          <button
            onClick={clearChecked}
            style={{ fontSize: '13px', color: '#7C4DFF', fontWeight: 500, marginTop: '12px' }}
          >
            Clear checked items
          </button>
        )}
      </div>
    </div>
  )
}