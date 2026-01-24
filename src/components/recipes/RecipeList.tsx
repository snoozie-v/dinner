// src/components/recipes/RecipeList.tsx
import type { Recipe } from '../../types';
import RecipeCard from './RecipeCard';

interface RecipeListProps {
  recipes: Recipe[];
  onView: (recipe: Recipe) => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
  onDuplicate: (recipe: Recipe) => void;
  isCustomRecipe: (recipe: Recipe | null | undefined) => boolean;
}

const RecipeList = ({
  recipes,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  isCustomRecipe
}: RecipeListProps) => {
  if (recipes.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          isCustom={isCustomRecipe(recipe)}
        />
      ))}
    </div>
  );
};

export default RecipeList;
