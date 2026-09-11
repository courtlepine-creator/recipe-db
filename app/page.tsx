import { supabase } from '@/lib/supabase'
export const dynamic = 'force-dynamic'
import RecipeList from '@/components/RecipeList'

export default async function Home() {
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('*, recipe_ingredients(ingredient:ingredients(name))')

  if (error) {
    return <div className="p-8">Error loading recipes: {error.message}</div>
  }

  return <RecipeList recipes={recipes ?? []} />
}
