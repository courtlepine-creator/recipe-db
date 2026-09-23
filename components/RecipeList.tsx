'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'

type Recipe = {
  id: string
  name: string
  meal: string
  calories: number
  protein: number
  carbs: number | null
  fat: number | null
  photo_url: string | null
  creator: string | null
  favorite: boolean | null
  made: boolean | null
  recipe_ingredients: { ingredient: { name: string } }[]
}

function proteinPct(recipe: Recipe) {
  if (!recipe.calories) return 0
  return Math.round(((recipe.protein * 4) / recipe.calories) * 100)
}

const MEALS = ['Breakfast', 'Lunch/Dinner', 'Snack', 'Dessert']
const PROTEIN_THRESHOLDS = [0, 30, 40, 50]
const CALORIE_RANGES: { label: string; value: [number, number] | null }[] = [
  { label: 'Any calories', value: null },
  { label: 'Under 300', value: [0, 300] },
  { label: '300–450', value: [300, 450] },
  { label: '450+', value: [450, Infinity] },
]

const SORT_OPTIONS = [
  { label: 'No sorting', value: '' },
  { label: 'Calories: Low to High', value: 'calories-asc' },
  { label: 'Calories: High to Low', value: 'calories-desc' },
  { label: 'Protein: Low to High', value: 'protein-asc' },
  { label: 'Protein: High to Low', value: 'protein-desc' },
  { label: 'Carbs: Low to High', value: 'carbs-asc' },
  { label: 'Carbs: High to Low', value: 'carbs-desc' },
  { label: 'Fat: Low to High', value: 'fat-asc' },
  { label: 'Fat: High to Low', value: 'fat-desc' },
]

const MEAL_COLORS: Record<string, { stripe: string; bg: string; text: string }> = {
  Breakfast: { stripe: '#6EC6E8', bg: '#E3F4FA', text: '#0C4763' },
  'Lunch/Dinner': { stripe: '#7C4DFF', bg: '#EDE7F6', text: '#5E35B1' },
  Snack: { stripe: '#43A047', bg: '#E8F5E9', text: '#2E7D32' },
  Dessert: { stripe: '#EC407A', bg: '#FCE4EC', text: '#AD1457' },
}

export default function RecipeList({ recipes }: { recipes: Recipe[] }) {
  const [query, setQuery] = useState('')
  const [meal, setMeal] = useState('')
  const [ingredient, setIngredient] = useState('')
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [creator, setCreator] = useState('')
  const [proteinMin, setProteinMin] = useState(0)
  const [calorieRange, setCalorieRange] = useState<[number, number] | null>(null)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [madeFilter, setMadeFilter] = useState<'' | 'made' | 'unmade'>('')
  const [sortBy, setSortBy] = useState('')

  const wrapperRef = useRef<HTMLDivElement>(null)

  const allIngredients = useMemo(() => {
    const names = new Set<string>()
    recipes.forEach((r) =>
      r.recipe_ingredients?.forEach((ri) => names.add(ri.ingredient.name))
    )
    return Array.from(names).sort()
  }, [recipes])

  const allCreators = useMemo(() => {
    const names = new Set<string>()
    recipes.forEach((r) => {
      if (r.creator) names.add(r.creator)
    })
    return Array.from(names).sort()
  }, [recipes])

  const ingredientSuggestions = useMemo(() => {
    if (!ingredientSearch.trim()) return []
    const q = ingredientSearch.toLowerCase()
    return allIngredients.filter((name) => name.toLowerCase().includes(q))
  }, [allIngredients, ingredientSearch])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = recipes.filter((r) => {
    if (meal && r.meal !== meal) return false
    if (proteinMin && r.protein < proteinMin) return false
    if (calorieRange && (r.calories < calorieRange[0] || r.calories >= calorieRange[1])) return false
    if (query && !r.name.toLowerCase().includes(query.toLowerCase())) return false
    if (creator && r.creator !== creator) return false
    if (favoritesOnly && !r.favorite) return false
    if (madeFilter === 'made' && !r.made) return false
    if (madeFilter === 'unmade' && r.made) return false
    if (
      ingredient &&
      !r.recipe_ingredients?.some((ri) => ri.ingredient.name === ingredient)
    )
      return false
    return true
  })

  const sorted = useMemo(() => {
    if (!sortBy) return filtered
    const [field, direction] = sortBy.split('-') as [
      'calories' | 'protein' | 'carbs' | 'fat',
      'asc' | 'desc'
    ]
    return [...filtered].sort((a, b) => {
      const aVal = a[field] ?? 0
      const bVal = b[field] ?? 0
      return direction === 'asc' ? aVal - bVal : bVal - aVal
    })
  }, [filtered, sortBy])

  const activeFilterCount =
    (meal ? 1 : 0) +
    (ingredient ? 1 : 0) +
    (creator ? 1 : 0) +
    (proteinMin ? 1 : 0) +
    (calorieRange ? 1 : 0) +
    (favoritesOnly ? 1 : 0) +
    (madeFilter ? 1 : 0)

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: '#FDF9F3' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 24px 64px' }}>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '4px' }}>
            <Link
              href="/calendar"
              className="shrink-0 font-medium rounded-full"
              style={{ fontSize: '12.5px', padding: '7px 14px', border: '1px solid #EADFCB', color: '#5C5240', backgroundColor: '#fff' }}
            >
              Meal plan
            </Link>
            <Link
              href="/shopping-list"
              className="shrink-0 font-medium rounded-full"
              style={{ fontSize: '12.5px', padding: '7px 14px', border: '1px solid #EADFCB', color: '#5C5240', backgroundColor: '#fff' }}
            >
              Shopping list
            </Link>
            <Link
              href="/add"
              className="shrink-0 bg-[#2B2620] text-white font-medium rounded-full hover:bg-[#463D30] transition-colors"
              style={{ fontSize: '12.5px', padding: '7px 14px' }}
            >
              + Add recipe
            </Link>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p className="text-[12px] tracking-wide text-[#B08D57] font-medium" style={{ margin: 0 }}>
              RECIPE BOX
            </p>
            <h1 className="text-[26px] leading-tight font-bold text-[#2B2620]" style={{ margin: 0 }}>
              My Recipes
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B3A78F]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="m20 20-3.5-3.5" />
            </svg>
            <input
              placeholder="Search recipes by name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white border border-[#EADFCB] rounded-lg placeholder:text-[#B3A78F] focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/20 focus:border-[#7C4DFF]"
              style={{ paddingLeft: '32px', paddingRight: '14px', paddingTop: '8px', paddingBottom: '8px', fontSize: '13.5px', color: '#2B2620' }}
            />
          </div>

          <div className="relative" ref={wrapperRef}>
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#B3A78F]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              style={{ zIndex: 1 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8 2 5 6 5 10c0 5 4 9 7 12 3-3 7-7 7-12 0-4-3-8-7-8Z" />
            </svg>

            {ingredient ? (
              <div
                className="w-full bg-white border rounded-lg flex items-center justify-between"
                style={{ borderColor: '#7C4DFF', paddingLeft: '32px', paddingRight: '10px', paddingTop: '8px', paddingBottom: '8px' }}
              >
                <span style={{ fontSize: '13.5px', color: '#2B2620' }}>Using up: {ingredient}</span>
                <button
                  onClick={() => {
                    setIngredient('')
                    setIngredientSearch('')
                  }}
                  style={{ fontSize: '13px', color: '#B3A78F', padding: '2px 6px' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <input
                placeholder="Have an ingredient to use up? Start typing..."
                value={ingredientSearch}
                onChange={(e) => {
                  setIngredientSearch(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full bg-white border border-[#EADFCB] rounded-lg placeholder:text-[#B3A78F] focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/20 focus:border-[#7C4DFF]"
                style={{ paddingLeft: '32px', paddingRight: '14px', paddingTop: '8px', paddingBottom: '8px', fontSize: '13.5px', color: '#2B2620' }}
              />
            )}

            {showSuggestions && !ingredient && ingredientSuggestions.length > 0 && (
              <div
                className="absolute w-full bg-white border border-[#EADFCB] rounded-lg shadow-md"
                style={{ top: 'calc(100% + 4px)', zIndex: 20, maxHeight: '220px', overflowY: 'auto' }}
              >
                {ingredientSuggestions.map((name) => (
                  <button
                    key={name}
                    onClick={() => {
                      setIngredient(name)
                      setIngredientSearch('')
                      setShowSuggestions(false)
                    }}
                    className="w-full text-left hover:bg-[#F4EFE4]"
                    style={{ padding: '9px 14px', fontSize: '13.5px', color: '#2B2620' }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            {showSuggestions && !ingredient && ingredientSearch.trim() && ingredientSuggestions.length === 0 && (
              <div
                className="absolute w-full bg-white border border-[#EADFCB] rounded-lg shadow-md"
                style={{ top: 'calc(100% + 4px)', zIndex: 20, padding: '10px 14px', fontSize: '13px', color: '#B3A78F' }}
              >
                No ingredients match "{ingredientSearch}"
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap" style={{ gap: '6px', marginBottom: '6px' }}>
          {MEALS.map((m) => {
            const c = MEAL_COLORS[m]
            const active = meal === m
            return (
              <button
                key={m}
                onClick={() => setMeal(active ? '' : m)}
                className="whitespace-nowrap font-medium rounded-full border transition-colors"
                style={{
                  fontSize: '12.5px',
                  padding: '6px 12px',
                  ...(active
                    ? { backgroundColor: c.stripe, borderColor: c.stripe, color: '#fff' }
                    : { backgroundColor: '#fff', borderColor: '#EADFCB', color: '#7A6F5C' }),
                }}
              >
                {m}
              </button>
            )
          })}

          <select
            value={proteinMin}
            onChange={(e) => setProteinMin(Number(e.target.value))}
            className="bg-white border border-[#EADFCB] rounded-full text-[#5C5240] focus:outline-none"
            style={{ fontSize: '12.5px', padding: '6px 12px' }}
          >
            {PROTEIN_THRESHOLDS.map((t) => (
              <option key={t} value={t}>
                {t === 0 ? 'Any protein' : `${t}g+ protein`}
              </option>
            ))}
          </select>

          <select
            value={calorieRange ? calorieRange.join('-') : ''}
            onChange={(e) => {
              const found = CALORIE_RANGES.find(
                (r) => (r.value ? r.value.join('-') : '') === e.target.value
              )
              setCalorieRange(found?.value ?? null)
            }}
            className="bg-white border border-[#EADFCB] rounded-full text-[#5C5240] focus:outline-none"
            style={{ fontSize: '12.5px', padding: '6px 12px' }}
          >
            {CALORIE_RANGES.map((r) => (
              <option key={r.label} value={r.value ? r.value.join('-') : ''}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap" style={{ gap: '6px', marginBottom: '6px' }}>
          <select
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
            className="bg-white border border-[#EADFCB] rounded-full text-[#5C5240] focus:outline-none"
            style={{ fontSize: '12.5px', padding: '6px 12px' }}
          >
            <option value="">Any creator</option>
            {allCreators.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            onClick={() => setFavoritesOnly((v) => !v)}
            className="whitespace-nowrap font-medium rounded-full border"
            style={{
              fontSize: '12.5px',
              padding: '6px 12px',
              backgroundColor: favoritesOnly ? '#B25A45' : '#fff',
              borderColor: favoritesOnly ? '#B25A45' : '#EADFCB',
              color: favoritesOnly ? '#fff' : '#7A6F5C',
            }}
          >
            {favoritesOnly ? '★ Favorites' : '☆ Favorites'}
          </button>

          <button
            onClick={() => setMadeFilter(madeFilter === 'made' ? '' : 'made')}
            className="whitespace-nowrap font-medium rounded-full border"
            style={{
              fontSize: '12.5px',
              padding: '6px 12px',
              backgroundColor: madeFilter === 'made' ? '#5C6B4B' : '#fff',
              borderColor: madeFilter === 'made' ? '#5C6B4B' : '#EADFCB',
              color: madeFilter === 'made' ? '#fff' : '#7A6F5C',
            }}
          >
            {madeFilter === 'made' ? '✓ Made it' : 'Made it'}
          </button>

          <button
            onClick={() => setMadeFilter(madeFilter === 'unmade' ? '' : 'unmade')}
            className="whitespace-nowrap font-medium rounded-full border"
            style={{
              fontSize: '12.5px',
              padding: '6px 12px',
              backgroundColor: madeFilter === 'unmade' ? '#8A7F6C' : '#fff',
              borderColor: madeFilter === 'unmade' ? '#8A7F6C' : '#EADFCB',
              color: madeFilter === 'unmade' ? '#fff' : '#7A6F5C',
            }}
          >
            Haven't made
          </button>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border border-[#EADFCB] rounded-full text-[#5C5240] focus:outline-none"
            style={{ fontSize: '12.5px', padding: '6px 12px' }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.value ? `Sort: ${o.label}` : o.label}
              </option>
            ))}
          </select>
        </div>

        {activeFilterCount > 0 && (
          <button
            onClick={() => {
              setMeal('')
              setIngredient('')
              setIngredientSearch('')
              setCreator('')
              setProteinMin(0)
              setCalorieRange(null)
              setFavoritesOnly(false)
              setMadeFilter('')
            }}
            className="text-[12.5px] text-[#7C4DFF] font-medium"
            style={{ marginBottom: '8px' }}
          >
            Clear {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
          </button>
        )}

        <p className="text-[12.5px] text-[#B3A78F]" style={{ marginBottom: '8px' }}>
          {sorted.length} recipe{sorted.length !== 1 ? 's' : ''}
        </p>

        <div className="flex flex-col" style={{ gap: '10px' }}>
          {sorted.map((recipe) => {
            const colors = MEAL_COLORS[recipe.meal] ?? MEAL_COLORS['Lunch/Dinner']
            return (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="group relative bg-white border border-[#EFE6D3] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                style={{ display: 'flex', alignItems: 'center', padding: '10px 16px 10px 14px' }}
              >
                <div
                  className="absolute left-0 top-0 bottom-0"
                  style={{ width: '6px', backgroundColor: colors.stripe }}
                />
                {recipe.photo_url ? (
                  <img
                    src={recipe.photo_url}
                    alt={recipe.name}
                    style={{ width: '84px', height: '84px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0, display: 'block' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '84px',
                      height: '84px',
                      borderRadius: '10px',
                      backgroundColor: '#F4EFE4',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#B3A78F',
                      fontSize: '11px',
                    }}
                  >
                    no photo
                  </div>
                )}
                <div style={{ minWidth: 0, flex: 1, marginLeft: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span
                      className="inline-block text-[10px] font-semibold rounded-full px-2.5 py-0.5 uppercase tracking-wide"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {recipe.meal}
                    </span>
                    {recipe.favorite && <span style={{ fontSize: '12px' }}>★</span>}
                    {recipe.made && <span style={{ fontSize: '12px' }}>✓</span>}
                  </div>
                  <h2 className="font-semibold text-[15px] text-[#2B2620] leading-snug" style={{ marginBottom: '4px' }}>
                    {recipe.name}
                  </h2>
                  <p className="text-[12.5px] text-[#8A7F6C]">
                    {recipe.calories} cal · {recipe.protein}g protein
                    {recipe.carbs != null && ` · ${recipe.carbs}g carbs`}
                    {recipe.fat != null && ` · ${recipe.fat}g fat`}
                    {` · ${proteinPct(recipe)}% of calories from protein`}
</p>
                </div>
              </Link>
            )
          })}

          {sorted.length === 0 && (
            <div className="text-center py-16 text-[#B3A78F] text-[14px]">
              No recipes match yet — try clearing a filter.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}