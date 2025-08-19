import React, { useState, useEffect } from 'react';
import { themealdbApi } from '../utils/themealdbApi';

const TheMealDBBrowser = ({ onAddRecipe }) => {
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  // Remove activeSource since we only have TheMealDB now
  // const [activeSource, setActiveSource] = useState('themealdb');

  useEffect(() => {
    loadCategories();
    loadRandomRecipes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCategories = async () => {
    const categoryData = await themealdbApi.getCategories();
    setCategories(categoryData);
  };

  const loadRandomRecipes = async () => {
    setLoading(true);
    const randomRecipes = await themealdbApi.getRandomRecipes(12);
    setRecipes(randomRecipes);
    setLoading(false);
  };

  const handleCategoryChange = async (category) => {
    setSelectedCategory(category);
    if (!category) {
      loadRandomRecipes();
      return;
    }
    
    setLoading(true);
    const filteredRecipes = await themealdbApi.filterByCategory(category);
    setRecipes(filteredRecipes);
    setLoading(false);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      loadRandomRecipes();
      return;
    }
    
    setLoading(true);
    const searchResults = await themealdbApi.searchByName(searchTerm);
    setRecipes(searchResults);
    setLoading(false);
  };

  const handleAddRecipe = async (recipe) => {
    try {
      await onAddRecipe(recipe);
      alert('Recipe added to your collection!');
    } catch (error) {
      alert('Error adding recipe. Please try again.');
    }
  };

  const RecipeModal = ({ recipe, onClose }) => {
    if (!recipe) return null;

    return (
      <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-content themealdb-modal">
          <div className="modal-header">
            <h2>{recipe.name}</h2>
            <div className="modal-actions">
              <button 
                className="add-recipe-btn" 
                onClick={() => {
                  handleAddRecipe(recipe);
                  onClose();
                }}
              >
                ➕ Add to My Recipes
              </button>
              <button className="modal-close" onClick={onClose}>×</button>
            </div>
          </div>
          
          <div className="modal-body">
            <div className="recipe-image-section">
              {recipe.image && (
                <img src={recipe.image} alt={recipe.name} className="recipe-image" />
              )}
              <div className="recipe-meta-badges">
                <span className={`badge source-badge ${recipe.source.toLowerCase()}`}>
                  {recipe.source}
                </span>
                {recipe.category && <span className="badge category-badge">{recipe.category}</span>}
                {recipe.area && <span className="badge area-badge">{recipe.area}</span>}
                {recipe.cuisine && <span className="badge cuisine-badge">{recipe.cuisine}</span>}
                <span className="badge protein-badge">{recipe.protein_type}</span>
                {recipe.calories && <span className="badge calories-badge">{recipe.calories} cal</span>}
                {recipe.cook_time_total && <span className="badge time-badge">{recipe.cook_time_total} min</span>}
              </div>
            </div>
            
            <div className="recipe-content">
              <div className="ingredients-section">
                <h3>Ingredients</h3>
                <ul className="ingredients-list">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="ingredient-item">
                      <span className="ingredient-bullet">✓</span>
                      <span className="ingredient-text">{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="instructions-section">
                <h3>Instructions</h3>
                <div className="instructions-content">
                  {recipe.instructions.split('\n').filter(step => step.trim()).map((step, index) => (
                    <div key={index} className="instruction-step">
                      <span className="step-number">{index + 1}</span>
                      <p>{step.trim()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {(recipe.youtube || recipe.source_url) && (
              <div className="recipe-links">
                {recipe.youtube && (
                  <a href={recipe.youtube} target="_blank" rel="noopener noreferrer" className="youtube-link">
                    📺 Watch Video
                  </a>
                )}
                {recipe.source_url && (
                  <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="source-link">
                    🔗 Original Recipe
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="themealdb-browser">
      <div className="browser-header">
        <h2>Discover Recipes</h2>
        <p>Browse thousands of recipes from TheMealDB</p>
      </div>


      <div className="browser-controls">
        <form onSubmit={handleSearch} className="search-form">
          <input
            id="recipe-search-input"
            name="recipeSearch"
            type="text"
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">Search</button>
        </form>

        <div className="category-filter">
          <select
            id="category-select"
            name="category"
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="category-select"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.idCategory} value={category.strCategory}>
                {category.strCategory}
              </option>
            ))}
          </select>
        </div>

        <button onClick={loadRandomRecipes} className="random-btn">
          🎲 Random Recipes
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading delicious recipes...</p>
        </div>
      ) : (
        <div className="recipes-grid">
          {recipes.map(recipe => (
            <div 
              key={recipe.id} 
              className="recipe-card themealdb-recipe-card"
              onClick={() => setSelectedRecipe(recipe)}
            >
              {recipe.image && (
                <div className="recipe-card-image">
                  <img src={recipe.image} alt={recipe.name} />
                  <div className="recipe-card-overlay">
                    <span className="view-recipe">View Recipe</span>
                  </div>
                </div>
              )}
              
              <div className="recipe-card-content">
                <h3>{recipe.name}</h3>
                <div className="recipe-card-meta">
                  <span className={`source-badge ${recipe.source.toLowerCase()}`}>
                    {recipe.source}
                  </span>
                  {recipe.category && <span className="category">{recipe.category}</span>}
                  {recipe.area && <span className="area">{recipe.area}</span>}
                  {recipe.cuisine && <span className="cuisine">{recipe.cuisine}</span>}
                  {recipe.calories && <span className="calories">{recipe.calories} cal</span>}
                </div>
                <div className="recipe-card-tags">
                  {recipe.dietary_tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {recipes.length === 0 && !loading && (
        <div className="no-results">
          <p>No recipes found. Try a different search term or category.</p>
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

export default TheMealDBBrowser;