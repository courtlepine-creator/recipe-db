'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type Recipe = {
  id: string
  name: string
  meal: string
  calories: number
  protein: number
  carbs: number | null
  fat: number | null
}

type PlanEntry = {
  planId?: string
  type: 'recipe' | 'quick'
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servings?: number
}

const SLOTS = ['Preworkout', 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert']
const SERVING_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3]

function slotMatchesRecipeMeal(slot: string, recipeMeal: string) {
  if (slot === 'Breakfast') return recipeMeal === 'Breakfast'
  if (slot === 'Snack') return recipeMeal === 'Snack'
  if (slot === 'Dessert') return recipeMeal === 'Dessert'
  if (slot === 'Lunch' || slot === 'Dinner') return recipeMeal === 'Lunch/Dinner'
  return true
}

function getWeekDates(weekOffset: number) {
  const today = new Date()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - today.getDay() + weekOffset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return d
  })
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function dayLabel(d: Date) {
  const isToday = toDateStr(d) === toDateStr(new Date())
  const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  return isToday ? `${label} (Today)` : label
}

function weekRangeLabel(dates: Date[]) {
  const start = dates[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const end = dates[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${start} – ${end}`
}

export default function CalendarPage() {
  const router = useRouter()
  const [weekOffset, setWeekOffset] = useState(0)
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const [user, setUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [plan, setPlan] = useState<Record<string, Record<string, PlanEntry>>>({})
  const [expandedDay, setExpandedDay] = useState<string>(toDateStr(weekDates[0]))
  const [activeSlot, setActiveSlot] = useState<{ date: string; slot: string } | null>(null)
  const [pendingRecipe, setPendingRecipe] = useState<Recipe | null>(null)
  const [servings, setServings] = useState(1)
  const [quickName, setQuickName] = useState('')
  const [quickCal, setQuickCal] = useState('')
  const [quickProtein, setQuickProtein] = useState('')
  const [quickCarbs, setQuickCarbs] = useState('')
  const [quickFat, setQuickFat] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/login')
        return
      }
      setUser(data.user)
      setAuthChecked(true)
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (!user) return

    async function load() {
      setLoading(true)
      const { data: recipeData } = await supabase
        .from('recipes')
        .select('id, name, meal, calories, protein, carbs, fat')

      setRecipes(recipeData ?? [])

      const startStr = toDateStr(weekDates[0])
      const endStr = toDateStr(weekDates[6])

      const { data: planData } = await supabase
        .from('planned_meals')
        .select('*, recipe:recipes(name, calories, protein, carbs, fat)')
        .gte('day', startStr)
        .lte('day', endStr)

      const nextPlan: Record<string, Record<string, PlanEntry>> = {}
      ;(planData ?? []).forEach((row: any) => {
        if (!nextPlan[row.day]) nextPlan[row.day] = {}
        const mult = row.servings ?? 1
        if (row.recipe_id && row.recipe) {
          nextPlan[row.day][row.meal_slot] = {
            planId: row.id,
            type: 'recipe',
            name: row.recipe.name,
            calories: Math.round(row.recipe.calories * mult),
            protein: Math.round(row.recipe.protein * mult * 10) / 10,
            carbs: row.recipe.carbs != null ? Math.round(row.recipe.carbs * mult * 10) / 10 : 0,
            fat: row.recipe.fat != null ? Math.round(row.recipe.fat * mult * 10) / 10 : 0,
            servings: mult,
          }
        } else {
          nextPlan[row.day][row.meal_slot] = {
            planId: row.id,
            type: 'quick',
            name: row.quick_name,
            calories: row.quick_calories ?? 0,
            protein: row.quick_protein ?? 0,
            carbs: row.quick_carbs ?? 0,
            fat: row.quick_fat ?? 0,
          }
        }
      })
      setPlan(nextPlan)
      setExpandedDay(toDateStr(weekDates[0]))
      setLoading(false)
    }
    load()
  }, [user, weekDates])

  async function confirmAssignRecipe(date: string, slot: string) {
    if (!pendingRecipe || !user) return
    const existing = plan[date]?.[slot]
    if (existing?.planId) {
      await supabase.from('planned_meals').delete().eq('id', existing.planId)
    }
    const { data } = await supabase
      .from('planned_meals')
      .insert({ day: date, meal_slot: slot, recipe_id: pendingRecipe.id, servings, user_id: user.id })
      .select()
      .single()

    setPlan((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [slot]: {
          planId: data?.id,
          type: 'recipe',
          name: pendingRecipe.name,
          calories: Math.round(pendingRecipe.calories * servings),
          protein: Math.round(pendingRecipe.protein * servings * 10) / 10,
          carbs: pendingRecipe.carbs != null ? Math.round(pendingRecipe.carbs * servings * 10) / 10 : 0,
          fat: pendingRecipe.fat != null ? Math.round(pendingRecipe.fat * servings * 10) / 10 : 0,
          servings,
        },
      },
    }))
    setPendingRecipe(null)
    setServings(1)
    setActiveSlot(null)
  }

  async function assignQuick(date: string, slot: string) {
    if (!quickName.trim() || !user) return
    const existing = plan[date]?.[slot]
    if (existing?.planId) {
      await supabase.from('planned_meals').delete().eq('id', existing.planId)
    }
    const calories = Number(quickCal) || 0
    const protein = Number(quickProtein) || 0
    const carbs = Number(quickCarbs) || 0
    const fat = Number(quickFat) || 0

    const { data } = await supabase
      .from('planned_meals')
      .insert({
        day: date,
        meal_slot: slot,
        quick_name: quickName,
        quick_calories: calories,
        quick_protein: protein,
        quick_carbs: carbs,
        quick_fat: fat,
        user_id: user.id,
      })
      .select()
      .single()

    setPlan((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [slot]: { planId: data?.id, type: 'quick', name: quickName, calories, protein, carbs, fat },
      },
    }))
    setQuickName('')
    setQuickCal('')
    setQuickProtein('')
    setQuickCarbs('')
    setQuickFat('')
    setActiveSlot(null)
  }

  async function clearSlot(date: string, slot: string) {
    const existing = plan[date]?.[slot]
    if (existing?.planId) {
      await supabase.from('planned_meals').delete().eq('id', existing.planId)
    }
    setPlan((prev) => {
      const next = { ...prev, [date]: { ...prev[date] } }
      delete next[date][slot]
      return next
    })
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function dayTotals(date: string) {
    const slots = plan[date] || {}
    return Object.values(slots).reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        protein: acc.protein + e.protein,
        carbs: acc.carbs + e.carbs,
        fat: acc.fat + e.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )
  }

  if (!authChecked || loading) {
    return (
      <div style={{ backgroundColor: '#FDF9F3', minHeight: '100vh', padding: '24px' }}>
        Loading...
      </div>
    )
  }

  return (
    <>
      <div style={{ backgroundColor: '#FDF9F3', minHeight: '100vh' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 20px 64px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <Link href="/" style={{ fontSize: '13px', color: '#7A6F5C' }}>
              ← Recipes
            </Link>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#2B2620', margin: 0 }}>Meal plan</h1>
            <button onClick={handleSignOut} style={{ fontSize: '12px', color: '#8A7F6C' }}>
              Sign out
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              style={{ fontSize: '13px', color: '#5C5240', backgroundColor: '#fff', border: '1px solid #EADFCB', borderRadius: '999px', padding: '6px 12px' }}
            >
              ← Prev
            </button>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#2B2620' }}>{weekRangeLabel(weekDates)}</span>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  style={{ display: 'block', fontSize: '11px', color: '#7C4DFF', margin: '2px auto 0' }}
                >
                  Back to this week
                </button>
              )}
            </div>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              style={{ fontSize: '13px', color: '#5C5240', backgroundColor: '#fff', border: '1px solid #EADFCB', borderRadius: '999px', padding: '6px 12px' }}
            >
              Next →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {weekDates.map((d) => {
              const dateStr = toDateStr(d)
              const isOpen = expandedDay === dateStr
              const totals = dayTotals(dateStr)
              return (
                <div
                  key={dateStr}
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #EFE6D3',
                    borderRadius: '14px',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => setExpandedDay(isOpen ? '' : dateStr)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '12px 16px',
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#2B2620' }}>{dayLabel(d)}</span>
                    <span style={{ fontSize: '12px', color: '#8A7F6C', marginTop: '2px' }}>
                      {totals.calories > 0
                        ? `${totals.calories} cal · ${totals.protein}g protein · ${totals.carbs}g carbs · ${totals.fat}g fat`
                        : 'Nothing planned'}
                    </span>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '0 16px 12px', borderTop: '1px solid #F0EADB' }}>
                      {SLOTS.map((slot) => {
                        const entry = plan[dateStr]?.[slot]
                        return (
                          <div
                            key={slot}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F5F0E5' }}
                          >
                            <span style={{ fontSize: '11.5px', color: '#8A7F6C', width: '80px', flexShrink: 0 }}>{slot}</span>
                            {entry ? (
                              <button
                                onClick={() => clearSlot(dateStr, slot)}
                                style={{ flex: 1, display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#2B2620', textAlign: 'left' }}
                              >
                                <span>
                                  {entry.name}
                                  {entry.servings && entry.servings !== 1 ? ` (${entry.servings}x)` : ''}
                                </span>
                                <span style={{ fontSize: '11px', color: '#B3A78F' }}>{entry.calories} cal ✕</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setActiveSlot({ date: dateStr, slot })}
                                style={{ flex: 1, textAlign: 'left', fontSize: '13px', color: '#B3A78F' }}
                              >
                                + Add
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {activeSlot && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 10 }}>
          <div style={{ backgroundColor: '#FDF9F3', width: '100%', maxWidth: '640px', borderRadius: '20px 20px 0 0', padding: '20px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>
                {activeSlot.slot} — {new Date(activeSlot.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </h3>
              <button
                onClick={() => {
                  setActiveSlot(null)
                  setPendingRecipe(null)
                  setServings(1)
                }}
                style={{ fontSize: '14px', color: '#8A7F6C' }}
              >
                ✕
              </button>
            </div>

            {pendingRecipe ? (
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{pendingRecipe.name}</p>
                <p style={{ fontSize: '12px', color: '#8A7F6C', marginBottom: '12px' }}>
                  Base: {pendingRecipe.calories} cal · {pendingRecipe.protein}g protein
                </p>
                <p style={{ fontSize: '12px', color: '#5C5240', marginBottom: '6px' }}>How many servings?</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                  {SERVING_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setServings(s)}
                      style={{
                        fontSize: '13px',
                        padding: '6px 12px',
                        borderRadius: '999px',
                        border: '1px solid #EADFCB',
                        backgroundColor: servings === s ? '#2B2620' : '#fff',
                        color: servings === s ? '#fff' : '#5C5240',
                      }}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '12px', color: '#8A7F6C', marginBottom: '14px' }}>
                  At {servings}x: {Math.round(pendingRecipe.calories * servings)} cal ·{' '}
                  {Math.round(pendingRecipe.protein * servings * 10) / 10}g protein
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setPendingRecipe(null)}
                    style={{ flex: 1, fontSize: '13.5px', padding: '10px', borderRadius: '10px', border: '1px solid #EADFCB', color: '#7A6F5C' }}
                  >
                    Back
                  </button>
                  <button
                    onClick={() => confirmAssignRecipe(activeSlot.date, activeSlot.slot)}
                    style={{ flex: 2, fontSize: '13.5px', padding: '10px', borderRadius: '10px', backgroundColor: '#2B2620', color: '#fff' }}
                  >
                    Add to {activeSlot.slot.toLowerCase()}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '11px', color: '#8A7F6C', marginBottom: '8px' }}>From your recipe box</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                  {recipes
                    .filter((r) => slotMatchesRecipeMeal(activeSlot.slot, r.meal))
                    .map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setPendingRecipe(r)
                          setServings(1)
                        }}
                        style={{ textAlign: 'left', backgroundColor: '#fff', border: '1px solid #EFE6D3', borderRadius: '10px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}
                      >
                        <span>{r.name}</span>
                        <span style={{ fontSize: '11px', color: '#8A7F6C' }}>{r.calories} cal</span>
                      </button>
                    ))}
                  {recipes.filter((r) => slotMatchesRecipeMeal(activeSlot.slot, r.meal)).length === 0 && (
                    <p style={{ fontSize: '12.5px', color: '#B3A78F', fontStyle: 'italic' }}>
                      No {activeSlot.slot.toLowerCase()} recipes yet.
                    </p>
                  )}
                </div>

                <p style={{ fontSize: '11px', color: '#8A7F6C', marginBottom: '8px' }}>
                  Or a quick entry (like a rice krispie treat — no full recipe needed)
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    value={quickName}
                    onChange={(e) => setQuickName(e.target.value)}
                    placeholder="Name"
                    style={{ backgroundColor: '#fff', border: '1px solid #EADFCB', borderRadius: '10px', padding: '9px 12px', fontSize: '13.5px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      value={quickCal}
                      onChange={(e) => setQuickCal(e.target.value)}
                      placeholder="Calories"
                      inputMode="numeric"
                      style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #EADFCB', borderRadius: '10px', padding: '9px 12px', fontSize: '13.5px' }}
                    />
                    <input
                      value={quickProtein}
                      onChange={(e) => setQuickProtein(e.target.value)}
                      placeholder="Protein (g)"
                      inputMode="numeric"
                      style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #EADFCB', borderRadius: '10px', padding: '9px 12px', fontSize: '13.5px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      value={quickCarbs}
                      onChange={(e) => setQuickCarbs(e.target.value)}
                      placeholder="Carbs (g)"
                      inputMode="numeric"
                      style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #EADFCB', borderRadius: '10px', padding: '9px 12px', fontSize: '13.5px' }}
                    />
                    <input
                      value={quickFat}
                      onChange={(e) => setQuickFat(e.target.value)}
                      placeholder="Fat (g)"
                      inputMode="numeric"
                      style={{ flex: 1, backgroundColor: '#fff', border: '1px solid #EADFCB', borderRadius: '10px', padding: '9px 12px', fontSize: '13.5px' }}
                    />
                  </div>
                  <button
                    onClick={() => assignQuick(activeSlot.date, activeSlot.slot)}
                    style={{ backgroundColor: '#2B2620', color: '#fff', borderRadius: '10px', padding: '10px', fontSize: '13.5px', marginTop: '4px' }}
                  >
                    Add to {activeSlot.slot.toLowerCase()}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}