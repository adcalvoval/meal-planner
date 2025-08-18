import React from 'react';

const RecipeModal = ({ recipe, onClose }) => {
  if (!recipe) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{recipe.name}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="recipe-details-grid">
            <div className="recipe-meta-detailed">
              <div className="meta-item">
                <span className="meta-label">Prep Time:</span>
                <span className="meta-value">{recipe.prep_time} mins</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Cook Time:</span>
                <span className="meta-value">{recipe.cook_time} mins</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Total Time:</span>
                <span className="meta-value">{recipe.prep_time + recipe.cook_time} mins</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Servings:</span>
                <span className="meta-value">{recipe.servings}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Meal Type:</span>
                <span className="meta-value meal-type-badge">{recipe.meal_type}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Protein:</span>
                <span className="meta-value">{recipe.protein_type}</span>
              </div>
            </div>
            
            {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
              <div className="dietary-tags-detailed">
                <h4>Tags:</h4>
                <div className="tags-container">
                  {recipe.dietary_tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="recipe-content">
            <div className="ingredients-section">
              <h3>Ingredients</h3>
              <ul className="ingredients-list">
                {recipe.ingredients && recipe.ingredients.map((ingredient, index) => (
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
                {recipe.instructions ? (
                  recipe.instructions.split('\n').map((step, index) => (
                    <div key={index} className="instruction-step">
                      <span className="step-number">{index + 1}</span>
                      <p>{step}</p>
                    </div>
                  ))
                ) : (
                  <p>No instructions provided.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeModal;