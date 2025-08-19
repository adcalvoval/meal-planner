import React, { useState } from 'react';

const RecipeEditForm = ({ recipe, onSave, onCancel }) => {
  const [editedRecipe, setEditedRecipe] = useState({
    name: recipe.name || '',
    ingredients: recipe.ingredients || [''],
    instructions: recipe.instructions || '',
    prep_time: recipe.prep_time || 0,
    cook_time: recipe.cook_time || 0,
    servings: recipe.servings || 4,
    meal_type: recipe.meal_type || 'dinner',
    dietary_tags: recipe.dietary_tags || [],
    weather_preference: recipe.weather_preference || 'any',
    protein_type: recipe.protein_type || 'meat'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedRecipe(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleIngredientChange = (index, value) => {
    const newIngredients = [...editedRecipe.ingredients];
    newIngredients[index] = value;
    setEditedRecipe(prev => ({
      ...prev,
      ingredients: newIngredients
    }));
  };

  const addIngredient = () => {
    setEditedRecipe(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, '']
    }));
  };

  const removeIngredient = (index) => {
    const newIngredients = editedRecipe.ingredients.filter((_, i) => i !== index);
    setEditedRecipe(prev => ({
      ...prev,
      ingredients: newIngredients
    }));
  };

  const handleDietaryTagChange = (tag) => {
    const newTags = editedRecipe.dietary_tags.includes(tag)
      ? editedRecipe.dietary_tags.filter(t => t !== tag)
      : [...editedRecipe.dietary_tags, tag];
    
    setEditedRecipe(prev => ({
      ...prev,
      dietary_tags: newTags
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const filteredIngredients = editedRecipe.ingredients.filter(ing => ing.trim() !== '');
    const recipeToSubmit = {
      ...editedRecipe,
      ingredients: filteredIngredients,
      prep_time: parseInt(editedRecipe.prep_time),
      cook_time: parseInt(editedRecipe.cook_time),
      servings: parseInt(editedRecipe.servings)
    };
    
    await onSave(recipeToSubmit);
  };

  const dietaryOptions = ['vegetarian', 'pescatarian', 'kid-friendly', 'quick', 'healthy', 'comfort'];

  return (
    <div className="recipe-edit-form">
      <div className="edit-form-header">
        <h2>Edit Recipe</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="recipe-form">
        <div className="form-group">
          <label htmlFor="name">Recipe Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={editedRecipe.name}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Ingredients:</label>
          {editedRecipe.ingredients.map((ingredient, index) => (
            <div key={index} className="ingredient-input">
              <input
                type="text"
                value={ingredient}
                onChange={(e) => handleIngredientChange(index, e.target.value)}
                placeholder="e.g., 250g flour, 500ml milk"
              />
              <button
                type="button"
                onClick={() => removeIngredient(index)}
                disabled={editedRecipe.ingredients.length === 1}
                className="remove-btn"
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" onClick={addIngredient} className="add-ingredient-btn">
            Add Ingredient
          </button>
        </div>

        <div className="form-group">
          <label htmlFor="instructions">Instructions:</label>
          <textarea
            id="instructions"
            name="instructions"
            value={editedRecipe.instructions}
            onChange={handleInputChange}
            rows={8}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="prep_time">Prep Time (minutes):</label>
            <input
              type="number"
              id="prep_time"
              name="prep_time"
              value={editedRecipe.prep_time}
              onChange={handleInputChange}
              min="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="cook_time">Cook Time (minutes):</label>
            <input
              type="number"
              id="cook_time"
              name="cook_time"
              value={editedRecipe.cook_time}
              onChange={handleInputChange}
              min="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="servings">Servings:</label>
            <input
              type="number"
              id="servings"
              name="servings"
              value={editedRecipe.servings}
              onChange={handleInputChange}
              min="1"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="meal_type">Meal Type:</label>
            <select
              id="meal_type"
              name="meal_type"
              value={editedRecipe.meal_type}
              onChange={handleInputChange}
            >
              <option value="dinner">Dinner</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="protein_type">Protein Type:</label>
            <select
              id="protein_type"
              name="protein_type"
              value={editedRecipe.protein_type}
              onChange={handleInputChange}
            >
              <option value="meat">Meat</option>
              <option value="fish">Fish</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="weather_preference">Weather Preference:</label>
            <select
              id="weather_preference"
              name="weather_preference"
              value={editedRecipe.weather_preference}
              onChange={handleInputChange}
            >
              <option value="any">Any Weather</option>
              <option value="hot">Hot Weather</option>
              <option value="cold">Cold Weather</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Dietary Tags:</label>
          <div className="dietary-tags">
            {dietaryOptions.map(tag => (
              <label key={tag} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editedRecipe.dietary_tags.includes(tag)}
                  onChange={() => handleDietaryTagChange(tag)}
                />
                {tag}
              </label>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="save-btn">Save Changes</button>
          <button type="button" onClick={onCancel} className="cancel-btn">Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default RecipeEditForm;