import React, { useState } from 'react';

const RecipeUpload = ({ onAddRecipe }) => {
  const [recipe, setRecipe] = useState({
    name: '',
    ingredients: [''],
    instructions: '',
    prep_time: 0,
    cook_time: 0,
    servings: 4,
    meal_type: 'dinner',
    dietary_tags: [],
    weather_preference: 'any',
    protein_type: 'meat'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRecipe(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleIngredientChange = (index, value) => {
    const newIngredients = [...recipe.ingredients];
    newIngredients[index] = value;
    setRecipe(prev => ({
      ...prev,
      ingredients: newIngredients
    }));
  };

  const addIngredient = () => {
    setRecipe(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, '']
    }));
  };

  const removeIngredient = (index) => {
    const newIngredients = recipe.ingredients.filter((_, i) => i !== index);
    setRecipe(prev => ({
      ...prev,
      ingredients: newIngredients
    }));
  };

  const handleDietaryTagChange = (tag) => {
    const newTags = recipe.dietary_tags.includes(tag)
      ? recipe.dietary_tags.filter(t => t !== tag)
      : [...recipe.dietary_tags, tag];
    
    setRecipe(prev => ({
      ...prev,
      dietary_tags: newTags
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const filteredIngredients = recipe.ingredients.filter(ing => ing.trim() !== '');
    const recipeToSubmit = {
      ...recipe,
      ingredients: filteredIngredients,
      prep_time: parseInt(recipe.prep_time),
      cook_time: parseInt(recipe.cook_time),
      servings: parseInt(recipe.servings)
    };
    
    await onAddRecipe(recipeToSubmit);
    
    setRecipe({
      name: '',
      ingredients: [''],
      instructions: '',
      prep_time: 0,
      cook_time: 0,
      servings: 4,
      meal_type: 'dinner',
      dietary_tags: [],
      weather_preference: 'any',
      protein_type: 'meat'
    });
  };

  const dietaryOptions = ['vegetarian', 'pescatarian', 'kid-friendly', 'quick', 'healthy', 'comfort'];

  return (
    <div className="recipe-upload">
      <h2>Add New Recipe</h2>
      <form onSubmit={handleSubmit} className="recipe-form">
        <div className="form-group">
          <label htmlFor="name">Recipe Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={recipe.name}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Ingredients:</label>
          {recipe.ingredients.map((ingredient, index) => (
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
                disabled={recipe.ingredients.length === 1}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" onClick={addIngredient}>Add Ingredient</button>
        </div>

        <div className="form-group">
          <label htmlFor="instructions">Instructions:</label>
          <textarea
            id="instructions"
            name="instructions"
            value={recipe.instructions}
            onChange={handleInputChange}
            rows={6}
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
              value={recipe.prep_time}
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
              value={recipe.cook_time}
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
              value={recipe.servings}
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
              value={recipe.meal_type}
              onChange={handleInputChange}
            >
              <option value="breakfast">Breakfast</option>
              <option value="dinner">Dinner</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="protein_type">Protein Type:</label>
            <select
              id="protein_type"
              name="protein_type"
              value={recipe.protein_type}
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
              value={recipe.weather_preference}
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
                  checked={recipe.dietary_tags.includes(tag)}
                  onChange={() => handleDietaryTagChange(tag)}
                />
                {tag}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className="submit-btn">Add Recipe</button>
      </form>
    </div>
  );
};

export default RecipeUpload;