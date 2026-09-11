'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function EditRecipe() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [meal, setMeal] = useState('Breakfast')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [creator, setCreator] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [ingredientsText, setIngredientsText] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: recipe, error: loadError } = await supabase
        .from('recipes')
        .select('*, recipe_ingredients(ingredient:ingredients(name))')
        .eq('id', id)
        .single()

      if (loadError || !recipe) {
        setError('Could not load recipe.')
        setLoading(false)
        return
      }

      setName(recipe.name ?? '')
      setMeal(recipe.meal ?? 'Breakfast')
      setCalories(String(recipe.calories ?? ''))
      setProtein(String(recipe.protein ?? ''))
      setCarbs(recipe.carbs != null ? String(recipe.carbs) : '')
      setFat(recipe.fat != null ? String(recipe.fat) : '')
      setCreator(recipe.creator ?? '')
      setInstagramUrl(recipe.instagram_url ?? '')
      setExistingPhotoUrl(recipe.photo_url ?? null)

      const names = (recipe.recipe_ingredients ?? [])
        .map((ri: any) => ri.ingredient?.name)
        .filter(Boolean)
      setIngredientsText(names.join(', '))

      setLoading(false)
    }
    load()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    let photo_url = existingPhotoUrl

    if (photoFile) {
      const fileExt = photoFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('recipe-photos')
        .upload(fileName, photoFile)

      if (uploadError) {
        setError('Photo upload failed: ' + uploadError.message)
        setSaving(false)
        return
      }

      const { data: urlData } = supabase.storage.from('recipe-photos').getPublicUrl(fileName)
      photo_url = urlData.publicUrl
    }

    const { error: updateError } = await supabase
      .from('recipes')
      .update({
        name,
        meal,
        calories: Number(calories),
        protein: Number(protein),
        carbs: carbs ? Number(carbs) : null,
        fat: fat ? Number(fat) : null,
        creator: creator || null,
        instagram_url: instagramUrl || null,
        photo_url,
      })
      .eq('id', id)

    if (updateError) {
      setError('Save failed: ' + updateError.message)
      setSaving(false)
      return
    }

    await supabase.from('recipe_ingredients').delete().eq('recipe_id', id)

    const ingredientNames = ingredientsText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    for (const ingredientName of ingredientNames) {
      const { data: existing } = await supabase
        .from('ingredients')
        .select('id')
        .ilike('name', ingredientName)
        .maybeSingle()

      let ingredientId = existing?.id

      if (!ingredientId) {
        const { data: created, error: createError } = await supabase
          .from('ingredients')
          .insert({ name: ingredientName })
          .select()
          .single()

        if (createError) {
          setError('Ingredient save failed: ' + createError.message)
          setSaving(false)
          return
        }
        ingredientId = created.id
      }

      await supabase.from('recipe_ingredients').insert({
        recipe_id: id,
        ingredient_id: ingredientId,
      })
    }

    setSaving(false)
    router.push(`/recipes/${id}`)
  }

  if (loading) {
    return <main className="p-8 max-w-md mx-auto">Loading...</main>
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Edit recipe</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input placeholder="Recipe name" value={name} onChange={(e) => setName(e.target.value)} required className="border rounded-lg px-3 py-2" />
        <select value={meal} onChange={(e) => setMeal(e.target.value)} className="border rounded-lg px-3 py-2">
          <option>Breakfast</option>
          <option>Lunch/Dinner</option>
          <option>Snack</option>
          <option>Dessert</option>
        </select>
        <input placeholder="Calories" type="number" value={calories} onChange={(e) => setCalories(e.target.value)} required className="border rounded-lg px-3 py-2" />
        <input placeholder="Protein (g)" type="number" value={protein} onChange={(e) => setProtein(e.target.value)} required className="border rounded-lg px-3 py-2" />
        <input placeholder="Carbs (g)" type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="border rounded-lg px-3 py-2" />
        <input placeholder="Fat (g)" type="number" value={fat} onChange={(e) => setFat(e.target.value)} className="border rounded-lg px-3 py-2" />
        <input placeholder="Creator (e.g. @username)" value={creator} onChange={(e) => setCreator(e.target.value)} className="border rounded-lg px-3 py-2" />
        <input placeholder="Instagram link" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} className="border rounded-lg px-3 py-2" />

        <label className="text-sm text-gray-600">
          Ingredients (comma separated)
          <input
            value={ingredientsText}
            onChange={(e) => setIngredientsText(e.target.value)}
            placeholder="mozzarella, chicken breast, basil"
            className="border rounded-lg px-3 py-2 w-full mt-1"
          />
        </label>

        {existingPhotoUrl && !photoFile && (
          <div>
            <p className="text-sm text-gray-600 mb-1">Current photo</p>
            <img src={existingPhotoUrl} alt={name} className="w-full h-40 object-cover rounded-lg" />
          </div>
        )}

        <label className="text-sm text-gray-600">
          Replace photo (optional)
          <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} className="block mt-1" />
        </label>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button type="submit" disabled={saving} className="bg-black text-white rounded-lg py-2.5 mt-2 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </main>
  )
}