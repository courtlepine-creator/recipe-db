'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AddRecipe() {
  const router = useRouter()
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
  const [sourcePhotoFile, setSourcePhotoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setUploading(true)
    setError('')

    let photo_url = null

    if (photoFile) {
      const fileExt = photoFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('recipe-photos')
        .upload(fileName, photoFile)

      if (uploadError) {
        setError('Photo upload failed: ' + uploadError.message)
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('recipe-photos')
        .getPublicUrl(fileName)

      photo_url = urlData.publicUrl
    }

    let source_photo_url = null

    if (sourcePhotoFile) {
      const fileExt = sourcePhotoFile.name.split('.').pop()
      const fileName = `source-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('recipe-photos')
        .upload(fileName, sourcePhotoFile)

      if (uploadError) {
        setError('Source photo upload failed: ' + uploadError.message)
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage
        .from('recipe-photos')
        .getPublicUrl(fileName)

      source_photo_url = urlData.publicUrl
    }

    const { data: newRecipe, error: insertError } = await supabase
      .from('recipes')
      .insert({
        name,
        meal,
        calories: Number(calories),
        protein: Number(protein),
        carbs: carbs ? Number(carbs) : null,
        fat: fat ? Number(fat) : null,
        creator: creator || null,
        instagram_url: instagramUrl || null,
        photo_url,
        source_photo_url,
      })
      .select()
      .single()

    if (insertError || !newRecipe) {
      setError('Save failed: ' + insertError?.message)
      setUploading(false)
      return
    }

    // Handle ingredients: split on commas, find-or-create each one, link to this recipe
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
          setUploading(false)
          return
        }
        ingredientId = created.id
      }

      await supabase.from('recipe_ingredients').insert({
        recipe_id: newRecipe.id,
        ingredient_id: ingredientId,
      })
    }

    setUploading(false)
    router.push('/')
  }

  return (
    <main className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Add a recipe</h1>
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
          Ingredients (comma separated — e.g. "mozzarella, chicken breast, basil")
          <input
            value={ingredientsText}
            onChange={(e) => setIngredientsText(e.target.value)}
            placeholder="mozzarella, chicken breast, basil"
            className="border rounded-lg px-3 py-2 w-full mt-1"
          />
        </label>
        <label className="text-sm text-gray-600">
          Photo (choose from your phone/computer)
          <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} className="block mt-1" />
        </label>
        <label className="text-sm text-gray-600">
          Recipe source screenshot (for cookbook recipes instead of Instagram)
          <input type="file" accept="image/*" onChange={(e) => setSourcePhotoFile(e.target.files?.[0] || null)} className="block mt-1" />
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={uploading} className="bg-black text-white rounded-lg py-2.5 mt-2 disabled:opacity-50">
          {uploading ? 'Saving...' : 'Save recipe'}
        </button>
      </form>
    </main>
  )
}