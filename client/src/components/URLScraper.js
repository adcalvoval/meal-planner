import React, { useState } from 'react';
import { convertRecipeToMetric } from '../utils/metricConverter';

const URLScraper = ({ onAddRecipe }) => {
  const [url, setUrl] = useState('');
  const [scrapedRecipe, setScrapedRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const scrapeRecipe = async () => {
    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/scrape-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to scrape recipe');
      }

      let recipe = await response.json();
      
      if (!recipe.name) {
        setError('Could not extract recipe from this URL. Try a different recipe URL or add it manually.');
        return;
      }

      // Apply additional metric conversion on client side as backup
      recipe = convertRecipeToMetric(recipe);

      setScrapedRecipe({
        ...recipe,
        meal_type: 'dinner',
        dietary_tags: [],
        weather_preference: 'any',
        protein_type: 'meat'
      });
      
    } catch (error) {
      setError('Error scraping recipe. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecipeChange = (field, value) => {
    setScrapedRecipe(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleIngredientChange = (index, value) => {
    const newIngredients = [...scrapedRecipe.ingredients];
    newIngredients[index] = value;
    setScrapedRecipe(prev => ({
      ...prev,
      ingredients: newIngredients
    }));
  };

  const addIngredient = () => {
    setScrapedRecipe(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, '']
    }));
  };

  const removeIngredient = (index) => {
    const newIngredients = scrapedRecipe.ingredients.filter((_, i) => i !== index);
    setScrapedRecipe(prev => ({
      ...prev,
      ingredients: newIngredients
    }));
  };

  const handleDietaryTagChange = (tag) => {
    const newTags = scrapedRecipe.dietary_tags.includes(tag)
      ? scrapedRecipe.dietary_tags.filter(t => t !== tag)
      : [...scrapedRecipe.dietary_tags, tag];
    
    setScrapedRecipe(prev => ({
      ...prev,
      dietary_tags: newTags
    }));
  };

  const saveRecipe = async () => {
    const filteredIngredients = scrapedRecipe.ingredients.filter(ing => ing.trim() !== '');
    const recipeToSubmit = {
      ...scrapedRecipe,
      ingredients: filteredIngredients,
      prep_time: parseInt(scrapedRecipe.prep_time) || 0,
      cook_time: parseInt(scrapedRecipe.cook_time) || 0,
      servings: parseInt(scrapedRecipe.servings) || 4
    };
    
    await onAddRecipe(recipeToSubmit);
    setScrapedRecipe(null);
    setUrl('');
  };

  const dietaryOptions = ['vegetarian', 'pescatarian', 'kid-friendly', 'quick', 'healthy', 'comfort'];

  return (
    <div className="url-scraper">
      <h2>Import Recipe from URL</h2>
      
      <div className="url-input-section">
        <p>Paste a recipe URL (works best with BBC Good Food recipes). Imperial measurements will be automatically converted to metric:</p>
        <div className="url-input-group">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.bbcgoodfood.com/recipes/..."
            className="url-input"
          />
          <button 
            onClick={scrapeRecipe} 
            disabled={loading}
            className="scrape-btn"
          >
            {loading ? 'Scraping...' : 'Import Recipe'}
          </button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
      </div>

      {scrapedRecipe && (
        <div className="scraped-recipe">
          <h3>Review and Edit Recipe</h3>
          
          <div className="form-group">
            <label htmlFor="scraped-name">Recipe Name:</label>
            <input
              type="text"
              id="scraped-name"
              value={scrapedRecipe.name}
              onChange={(e) => handleRecipeChange('name', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Ingredients:</label>
            {scrapedRecipe.ingredients.map((ingredient, index) => (
              <div key={index} className="ingredient-input">
                <input
                  type="text"
                  value={ingredient}
                  onChange={(e) => handleIngredientChange(index, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  disabled={scrapedRecipe.ingredients.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
            <button type="button" onClick={addIngredient}>Add Ingredient</button>
          </div>

          <div className="form-group">
            <label htmlFor="scraped-instructions">Instructions:</label>
            <textarea
              id="scraped-instructions"
              value={scrapedRecipe.instructions}
              onChange={(e) => handleRecipeChange('instructions', e.target.value)}
              rows={6}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="scraped-prep-time">Prep Time (minutes):</label>
              <input
                type="number"
                id="scraped-prep-time"
                value={scrapedRecipe.prep_time}
                onChange={(e) => handleRecipeChange('prep_time', e.target.value)}
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="scraped-cook-time">Cook Time (minutes):</label>
              <input
                type="number"
                id="scraped-cook-time"
                value={scrapedRecipe.cook_time}
                onChange={(e) => handleRecipeChange('cook_time', e.target.value)}
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="scraped-servings">Servings:</label>
              <input
                type="number"
                id="scraped-servings"
                value={scrapedRecipe.servings}
                onChange={(e) => handleRecipeChange('servings', e.target.value)}
                min="1"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="scraped-meal-type">Meal Type:</label>
              <select
                id="scraped-meal-type"
                value={scrapedRecipe.meal_type}
                onChange={(e) => handleRecipeChange('meal_type', e.target.value)}
              >
                <option value="breakfast">Breakfast</option>
                <option value="dinner">Dinner</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="scraped-protein-type">Protein Type:</label>
              <select
                id="scraped-protein-type"
                value={scrapedRecipe.protein_type}
                onChange={(e) => handleRecipeChange('protein_type', e.target.value)}
              >
                <option value="meat">Meat</option>
                <option value="fish">Fish</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="scraped-weather-preference">Weather Preference:</label>
              <select
                id="scraped-weather-preference"
                value={scrapedRecipe.weather_preference}
                onChange={(e) => handleRecipeChange('weather_preference', e.target.value)}
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
                    checked={scrapedRecipe.dietary_tags.includes(tag)}
                    onChange={() => handleDietaryTagChange(tag)}
                  />
                  {tag}
                </label>
              ))}
            </div>
          </div>

          <div className="recipe-actions">
            <button onClick={saveRecipe} className="save-btn">
              Save Recipe
            </button>
            <button 
              onClick={() => setScrapedRecipe(null)} 
              className="cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default URLScraper;