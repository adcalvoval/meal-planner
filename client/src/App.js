import React, { useState, useEffect } from 'react';
import './App.css';
import MealPlanView from './components/MealPlanView';
import RecipeUpload from './components/RecipeUpload';
import RecipeList from './components/RecipeList';
import URLScraper from './components/URLScraper';
import RecipeEditForm from './components/RecipeEditForm';
import TheMealDBBrowser from './components/TheMealDBBrowser';

function App() {
  const [activeTab, setActiveTab] = useState('meal-plan');
  const [recipes, setRecipes] = useState([]);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [mealPlanData, setMealPlanData] = useState({
    mealPlan: [],
    shoppingList: [],
    weather: null
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes');
      const data = await response.json();
      setRecipes(data);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    }
  };

  const generateMealPlan = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate-meal-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setMealPlanData(data);
    } catch (error) {
      console.error('Error generating meal plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const addRecipe = async (recipe) => {
    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipe),
      });
      const newRecipe = await response.json();
      fetchRecipes();
      return newRecipe;
    } catch (error) {
      console.error('Error adding recipe:', error);
    }
  };

  const updateRecipe = async (recipeId, updatedRecipe) => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedRecipe),
      });
      
      if (response.ok) {
        fetchRecipes();
        setEditingRecipe(null);
        return true;
      } else {
        console.error('Failed to update recipe');
        return false;
      }
    } catch (error) {
      console.error('Error updating recipe:', error);
      return false;
    }
  };

  const deleteRecipe = async (recipeId) => {
    if (!window.confirm('Are you sure you want to delete this recipe?')) {
      return;
    }

    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchRecipes();
        return true;
      } else {
        console.error('Failed to delete recipe');
        return false;
      }
    } catch (error) {
      console.error('Error deleting recipe:', error);
      return false;
    }
  };

  const handleEditRecipe = (recipe) => {
    setEditingRecipe(recipe);
  };

  const handleSaveEdit = async (updatedRecipe) => {
    await updateRecipe(editingRecipe.id, updatedRecipe);
  };

  const handleCancelEdit = () => {
    setEditingRecipe(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Family Meal Planner</h1>
        <nav>
          <button 
            className={activeTab === 'meal-plan' ? 'active' : ''} 
            onClick={() => setActiveTab('meal-plan')}
          >
            Meal Plan
          </button>
          <button 
            className={activeTab === 'recipes' ? 'active' : ''} 
            onClick={() => setActiveTab('recipes')}
          >
            My Recipes
          </button>
          <button 
            className={activeTab === 'add-recipe' ? 'active' : ''} 
            onClick={() => setActiveTab('add-recipe')}
          >
            Add Recipe
          </button>
          <button 
            className={activeTab === 'scrape-url' ? 'active' : ''} 
            onClick={() => setActiveTab('scrape-url')}
          >
            Import from URL
          </button>
          <button 
            className={activeTab === 'discover' ? 'active' : ''} 
            onClick={() => setActiveTab('discover')}
          >
            Discover Recipes
          </button>
        </nav>
      </header>

      <main className="App-main">
        {activeTab === 'meal-plan' && (
          <MealPlanView 
            mealPlanData={mealPlanData} 
            onGeneratePlan={generateMealPlan} 
            loading={loading} 
          />
        )}
        {activeTab === 'recipes' && !editingRecipe && (
          <RecipeList 
            recipes={recipes} 
            onEditRecipe={handleEditRecipe}
            onDeleteRecipe={deleteRecipe}
          />
        )}
        {activeTab === 'recipes' && editingRecipe && (
          <RecipeEditForm
            recipe={editingRecipe}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
          />
        )}
        {activeTab === 'add-recipe' && (
          <RecipeUpload onAddRecipe={addRecipe} />
        )}
        {activeTab === 'scrape-url' && (
          <URLScraper onAddRecipe={addRecipe} />
        )}
        {activeTab === 'discover' && (
          <TheMealDBBrowser onAddRecipe={addRecipe} />
        )}
      </main>
    </div>
  );
}

export default App;
