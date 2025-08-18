import React, { useState } from 'react';
import RecipeModal from './RecipeModal';

const RecipeList = ({ recipes }) => {
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  return (
    <div className="recipe-list">
      <h2>My Recipes ({recipes.length})</h2>
      
      {recipes.length === 0 ? (
        <div className="empty-recipes">
          <p>No recipes added yet. Start by adding your favorite recipes!</p>
        </div>
      ) : (
        <div className="recipes-grid">
          {recipes.map(recipe => (
            <div 
              key={recipe.id} 
              className="recipe-card clickable-recipe" 
              onClick={() => setSelectedRecipe(recipe)}
            >
              <div className="recipe-header">
                <h3>{recipe.name}</h3>
                <span className="meal-type-badge">{recipe.meal_type}</span>
              </div>
              
              <div className="recipe-meta">
                <span className="time">
                  ⏱️ {recipe.prep_time + recipe.cook_time} mins
                </span>
                <span className="servings">
                  👥 Serves {recipe.servings}
                </span>
                <span className="protein">
                  🍽️ {recipe.protein_type}
                </span>
              </div>

              {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
                <div className="dietary-tags">
                  {recipe.dietary_tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              )}

              <div className="ingredients">
                <h4>Ingredients:</h4>
                <ul>
                  {recipe.ingredients.slice(0, 3).map((ingredient, index) => (
                    <li key={index}>{ingredient}</li>
                  ))}
                  {recipe.ingredients.length > 3 && (
                    <li>... and {recipe.ingredients.length - 3} more</li>
                  )}
                </ul>
              </div>

              <div className="instructions">
                <h4>Instructions:</h4>
                <p>
                  {recipe.instructions.length > 150 
                    ? `${recipe.instructions.substring(0, 150)}...`
                    : recipe.instructions
                  }
                </p>
              </div>

              <div className="recipe-footer">
                <small>Added: {new Date(recipe.created_at).toLocaleDateString()}</small>
                {recipe.weather_preference !== 'any' && (
                  <small className="weather-pref">
                    Best for: {recipe.weather_preference} weather
                  </small>
                )}
              </div>
              <div className="click-hint">Click for full recipe</div>
            </div>
          ))}
        </div>
      )}
      
      {selectedRecipe && (
        <RecipeModal 
          recipe={selectedRecipe} 
          onClose={() => setSelectedRecipe(null)} 
        />
      )}
    </div>
  );
};

export default RecipeList;