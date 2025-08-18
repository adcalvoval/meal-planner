import React, { useState } from 'react';

const PDFUpload = ({ onRecipeParsed, onCancel }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [parsedRecipe, setParsedRecipe] = useState(null);
  const [editedRecipe, setEditedRecipe] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setIsUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await fetch('/api/upload-pdf-recipe', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to parse PDF');
      }

      const recipe = await response.json();
      setParsedRecipe(recipe);
      setEditedRecipe({
        name: recipe.name || '',
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || '',
        prep_time: recipe.prep_time || 0,
        cook_time: recipe.cook_time || 0,
        servings: recipe.servings || 4,
        meal_type: 'dinner',
        dietary_tags: [],
        weather_preference: 'any',
        protein_type: 'meat'
      });
    } catch (err) {
      setError('Failed to extract recipe from PDF: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditedRecipe(prev => ({
      ...prev,
      [field]: value
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

  const handleDietaryTagChange = (tag, checked) => {
    const currentTags = editedRecipe.dietary_tags || [];
    if (checked) {
      setEditedRecipe(prev => ({
        ...prev,
        dietary_tags: [...currentTags, tag]
      }));
    } else {
      setEditedRecipe(prev => ({
        ...prev,
        dietary_tags: currentTags.filter(t => t !== tag)
      }));
    }
  };

  const handleSaveRecipe = () => {
    if (!editedRecipe.name || editedRecipe.ingredients.length === 0) {
      setError('Please provide at least a recipe name and ingredients');
      return;
    }
    onRecipeParsed(editedRecipe);
  };

  if (!parsedRecipe) {
    return (
      <div className="pdf-upload-section">
        <h2>Upload PDF Recipe</h2>
        <p>Upload a PDF file containing a recipe. We'll extract the text and help you organize it into a proper recipe format.</p>
        
        <div className="pdf-upload-area">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="pdf-file-input"
          />
          {isUploading && <div className="loading">Extracting recipe from PDF...</div>}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="pdf-upload-actions">
          <button className="cancel-btn" onClick={onCancel}>
            Back to Recipe Upload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-recipe-editor">
      <h2>Edit Extracted Recipe</h2>
      <p>Review and edit the recipe extracted from your PDF before adding it to your collection.</p>

      <div className="recipe-form">
        <div className="form-group">
          <label>Recipe Name</label>
          <input
            type="text"
            value={editedRecipe.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter recipe name"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Prep Time (minutes)</label>
            <input
              type="number"
              value={editedRecipe.prep_time}
              onChange={(e) => handleInputChange('prep_time', parseInt(e.target.value) || 0)}
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Cook Time (minutes)</label>
            <input
              type="number"
              value={editedRecipe.cook_time}
              onChange={(e) => handleInputChange('cook_time', parseInt(e.target.value) || 0)}
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Servings</label>
            <input
              type="number"
              value={editedRecipe.servings}
              onChange={(e) => handleInputChange('servings', parseInt(e.target.value) || 1)}
              min="1"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Meal Type</label>
            <select
              value={editedRecipe.meal_type}
              onChange={(e) => handleInputChange('meal_type', e.target.value)}
            >
              <option value="breakfast">Breakfast</option>
              <option value="dinner">Dinner</option>
            </select>
          </div>
          <div className="form-group">
            <label>Protein Type</label>
            <select
              value={editedRecipe.protein_type}
              onChange={(e) => handleInputChange('protein_type', e.target.value)}
            >
              <option value="meat">Meat</option>
              <option value="fish">Fish</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
            </select>
          </div>
          <div className="form-group">
            <label>Weather Preference</label>
            <select
              value={editedRecipe.weather_preference}
              onChange={(e) => handleInputChange('weather_preference', e.target.value)}
            >
              <option value="any">Any Weather</option>
              <option value="hot">Hot Weather</option>
              <option value="cold">Cold Weather</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Ingredients</label>
          {editedRecipe.ingredients.map((ingredient, index) => (
            <div key={index} className="ingredient-input">
              <input
                type="text"
                value={ingredient}
                onChange={(e) => handleIngredientChange(index, e.target.value)}
                placeholder={`Ingredient ${index + 1}`}
              />
              <button
                type="button"
                onClick={() => removeIngredient(index)}
                disabled={editedRecipe.ingredients.length <= 1}
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
          <label>Instructions</label>
          <textarea
            value={editedRecipe.instructions}
            onChange={(e) => handleInputChange('instructions', e.target.value)}
            placeholder="Enter cooking instructions..."
            rows="8"
          />
        </div>

        <div className="form-group">
          <label>Dietary Tags</label>
          <div className="dietary-tags-checkboxes">
            {['quick', 'healthy', 'kid-friendly', 'comfort', 'pescatarian', 'spicy'].map(tag => (
              <label key={tag} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={(editedRecipe.dietary_tags || []).includes(tag)}
                  onChange={(e) => handleDietaryTagChange(tag, e.target.checked)}
                />
                {tag.charAt(0).toUpperCase() + tag.slice(1)}
              </label>
            ))}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="pdf-recipe-actions">
          <button className="save-btn" onClick={handleSaveRecipe}>
            Add Recipe to Collection
          </button>
          <button className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFUpload;