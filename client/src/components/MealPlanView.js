import React, { useState } from 'react';
import RecipeModal from './RecipeModal';

const MealPlanView = ({ mealPlanData, onGeneratePlan, loading }) => {
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const { mealPlan, shoppingList, weather } = mealPlanData;

  return (
    <div className="meal-plan-view">
      <div className="meal-plan-header">
        <div>
          <h2>Weekly Meal Plan</h2>
          {weather && (
            <div className="weather-info">
              🌡️ {weather.temperature}°C - {weather.isHot ? 'Hot' : weather.isCold ? 'Cold' : 'Moderate'} weather
            </div>
          )}
        </div>
        <div className="header-buttons">
          <button 
            onClick={onGeneratePlan} 
            disabled={loading}
            className="generate-btn"
          >
            {loading ? 'Generating...' : 'Generate New Plan'}
          </button>
          {shoppingList && shoppingList.length > 0 && (
            <button 
              onClick={() => setShowShoppingList(!showShoppingList)}
              className="shopping-list-btn"
            >
              {showShoppingList ? 'Hide' : 'Show'} Shopping List
            </button>
          )}
        </div>
      </div>
      
      {showShoppingList && shoppingList && (
        <div className="shopping-list">
          <h3>Shopping List</h3>
          <div className="shopping-items">
            {shoppingList.map((item, index) => (
              <div key={index} className="shopping-item">
                <span className="ingredient">{item.ingredient}</span>
                <span className="frequency">({item.frequency} recipes)</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {!mealPlan || mealPlan.length === 0 ? (
        <div className="empty-meal-plan">
          <p>No meal plan generated yet. Click "Generate New Plan" to get started!</p>
          <p>The app includes sample recipes to get you started, or add your own recipes first!</p>
        </div>
      ) : (
        <div className="meal-plan-grid">
          {mealPlan.map((dayPlan, index) => (
            <div key={index} className="day-card">
              <h3>{dayPlan.day}</h3>
              
              <div className="meal">
                {dayPlan.dinner ? (
                  <div 
                    className="recipe-card clickable-recipe" 
                    onClick={() => setSelectedRecipe(dayPlan.dinner)}
                  >
                    <h5>{dayPlan.dinner.name}</h5>
                    <p className="prep-time">
                      {dayPlan.dinner.prep_time + dayPlan.dinner.cook_time} mins
                    </p>
                    <p className="servings">Serves {dayPlan.dinner.servings}</p>
                    {dayPlan.dinner.dietary_tags && (
                      <div className="dietary-tags">
                        {dayPlan.dinner.dietary_tags.map((tag, i) => (
                          <span key={i} className="tag">{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="click-hint">Click for details</div>
                  </div>
                ) : (
                  <p>No dinner planned</p>
                )}
              </div>
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

export default MealPlanView;