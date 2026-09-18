import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import RecipeActions from '@/components/RecipeActions'
import ShoppingListActions from '@/components/ShoppingListActions'

const MEAL_COLORS: Record<string, { stripe: string; bg: string; text: string }> = {
  Breakfast: { stripe: '#6EC6E8', bg: '#E3F4FA', text: '#0C4763' },
  'Lunch/Dinner': { stripe: '#7C4DFF', bg: '#EDE7F6', text: '#5E35B1' },
  Snack: { stripe: '#43A047', bg: '#E8F5E9', text: '#2E7D32' },
  Dessert: { stripe: '#EC407A', bg: '#FCE4EC', text: '#AD1457' },
}

export default async function RecipeDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('*, recipe_ingredients(ingredient:ingredients(name))')
    .eq('id', id)
    .single()

  if (error || !recipe) {
    return <div className="p-8">Recipe not found.</div>
  }

  const proteinPct = recipe.calories
    ? Math.round(((recipe.protein * 4) / recipe.calories) * 100)
    : 0

  const colors = MEAL_COLORS[recipe.meal] ?? MEAL_COLORS['Lunch/Dinner']

    const stats = [
    { label: 'calories', value: String(recipe.calories) },
    { label: 'protein', value: `${recipe.protein}g` },
    ...(recipe.carbs != null ? [{ label: 'carbs', value: `${recipe.carbs}g` }] : []),
    ...(recipe.fat != null ? [{ label: 'fat', value: `${recipe.fat}g` }] : []),
  ]

  return (
    <div style={{ backgroundColor: '#FDF9F3', minHeight: '100vh' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div style={{ position: 'relative', height: '340px', overflow: 'hidden' }}>
          {recipe.photo_url ? (
            <img
              src={recipe.photo_url}
              alt={recipe.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', backgroundColor: colors.bg }} />
          )}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 22%, transparent 55%, rgba(0,0,0,0.65) 100%)',
            }}
          />

          <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between' }}>
            <Link
              href="/"
              style={{ fontSize: '12.5px', color: '#5C5240', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: '999px', padding: '6px 14px' }}
            >
              ← Back
            </Link>
            <Link
              href={`/recipes/${id}/edit`}
              style={{ fontSize: '12.5px', color: colors.text, fontWeight: 500, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: '999px', padding: '6px 14px' }}
            >
              Edit
            </Link>
          </div>

          <div style={{ position: 'absolute', bottom: '32px', left: '20px', right: '20px' }}>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                backgroundColor: colors.stripe,
                color: '#fff',
                borderRadius: '999px',
                padding: '3px 11px',
              }}
            >
              {recipe.meal}
            </span>
            <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 700, margin: '8px 0 0', lineHeight: 1.25 }}>
              {recipe.name}
            </h1>
          </div>
        </div>

        <div style={{ padding: '0 20px 48px' }}>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '-28px',
              marginBottom: '18px',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {stats.map((s, i) => (
              <div
                key={s.label}
                style={{
                  flex: 1,
                  backgroundColor: i === 0 ? colors.stripe : colors.bg,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  borderRadius: '12px',
                  padding: '10px 4px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: 600, color: i === 0 ? '#fff' : colors.text }}>{s.value}</div>
                <div style={{ fontSize: '10px', color: i === 0 ? 'rgba(255,255,255,0.85)' : colors.text, opacity: i === 0 ? 1 : 0.75 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '13px', color: colors.text, marginBottom: '18px', marginTop: '-8px' }}>
  {proteinPct}% of calories from protein
</p>

          <RecipeActions id={id} initialFavorite={!!recipe.favorite} initialMade={!!recipe.made} />

          {recipe.recipe_ingredients?.length > 0 && (
            <div
              style={{
                marginTop: '18px',
                backgroundColor: colors.bg,
                borderRadius: '14px',
                padding: '14px 16px',
              }}
            >
              <h2 style={{ fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                Ingredients
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '12px' }}>
                {recipe.recipe_ingredients.map((ri: any, i: number) => (
                  <label
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '7px 0',
                      borderBottom: i < recipe.recipe_ingredients.length - 1 ? `1px solid ${colors.stripe}33` : 'none',
                      fontSize: '14px',
                      color: '#2B2620',
                      cursor: 'pointer',
                    }}
                  >
                    <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: colors.stripe }} />
                    {ri.ingredient.name}
                  </label>
                ))}
              </div>
              <ShoppingListActions
                ingredientNames={recipe.recipe_ingredients.map((ri: any) => ri.ingredient.name)}
                colorBg="#fff"
                colorText={colors.text}
              />
            </div>
          )}

          {(recipe.creator || recipe.instagram_url) && (
            <div style={{ marginTop: '18px', paddingTop: '18px', borderTop: `1px solid ${colors.stripe}33` }}>
              {recipe.creator && (
                <p style={{ fontSize: '13px', color: '#8A7F6C', margin: '0 0 4px' }}>By {recipe.creator}</p>
              )}
              {recipe.instagram_url && (
                <a href={recipe.instagram_url} style={{ fontSize: '13px', color: colors.text, fontWeight: 600 }}>
                  View on Instagram →
                </a>
              )}
            </div>
          )}

          {recipe.source_photo_url && (
            <div style={{ marginTop: '18px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                Recipe source
              </h2>
              <a href={recipe.source_photo_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={recipe.source_photo_url}
                  alt="Recipe source"
                  style={{ width: '100%', borderRadius: '12px', border: `1px solid ${colors.stripe}55`, display: 'block' }}
                />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}