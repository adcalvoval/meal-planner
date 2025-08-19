import React, { useState } from 'react';
import RecipeModal from './RecipeModal';

const MealPlanView = ({ mealPlanData, onGeneratePlan, loading }) => {
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const { mealPlan, shoppingList, weather } = mealPlanData;

  // Function to export shopping list to Google Keep
  const exportToGoogleKeep = () => {
    if (!shoppingList || shoppingList.length === 0) {
      alert('No shopping list to export. Generate a meal plan first!');
      return;
    }

    try {
      // Create the shopping list text optimized for easy conversion to checklist
      const currentDate = new Date().toLocaleDateString();
      const title = `Shopping List ${currentDate}`;
      
      // Create a simple list format that's easy to convert to checkboxes
      // Each item on a new line without bullet points (Google Keep adds checkboxes easier this way)
      let listItems = shoppingList.map(item => {
        const ingredient = item.ingredient;
        const note = item.frequency > 1 ? ` (${item.frequency}x)` : '';
        return ingredient + note;
      }).join('\n');
      
      // Add helpful instruction at the top
      const instructions = 'Tip: Click the checkbox icon in Google Keep to convert this to a checklist!\n\n';
      listItems = instructions + listItems;
      
      // Create Google Keep URL with pre-filled content
      const googleKeepUrl = `https://keep.google.com/u/0/#NOTE/new?title=${encodeURIComponent(title)}&text=${encodeURIComponent(listItems)}`;
      
      // Open Google Keep in a new tab
      window.open(googleKeepUrl, '_blank', 'noopener,noreferrer');
      
      // Show user instruction
      setTimeout(() => {
        alert('📝 Google Keep opened!\n\nTo create a checklist:\n1. Click the checklist icon (☑️) at the bottom of the note\n2. Your ingredients will become checkable items\n3. Save the note');
      }, 1000);
      
    } catch (error) {
      console.error('Error exporting to Google Keep:', error);
      alert('Failed to export to Google Keep. Please try again.');
    }
  };

  // Function to copy shopping list to clipboard for easy pasting
  const copyToClipboard = async () => {
    if (!shoppingList || shoppingList.length === 0) {
      alert('No shopping list to copy. Generate a meal plan first!');
      return;
    }

    try {
      const listText = shoppingList.map(item => {
        const ingredient = item.ingredient;
        const note = item.frequency > 1 ? ` (${item.frequency}x)` : '';
        return ingredient + note;
      }).join('\n');

      await navigator.clipboard.writeText(listText);
      alert('✅ Shopping list copied to clipboard!\n\nYou can now paste it into any app:\n• Google Keep\n• Notes app\n• Text message\n• Email');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = listText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('✅ Shopping list copied to clipboard!');
    }
  };

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
          <div className="shopping-list-header">
            <h3>Shopping List</h3>
            <div className="export-buttons">
              <button 
                onClick={copyToClipboard}
                className="copy-btn"
                title="Copy to clipboard"
              >
                📋 Copy
              </button>
              <button 
                onClick={exportToGoogleKeep}
                className="google-keep-btn"
                title="Export to Google Keep (with checklist instructions)"
              >
                📝 Google Keep
              </button>
            </div>
          </div>
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