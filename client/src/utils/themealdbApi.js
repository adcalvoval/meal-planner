import { convertRecipeToMetric } from './metricConverter';

const THEMEALDB_BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

// Transform TheMealDB recipe to our app's format
const transformMealDBRecipe = (mealDBRecipe) => {
  // Extract ingredients and measurements
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = mealDBRecipe[`strIngredient${i}`];
    const measure = mealDBRecipe[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      ingredients.push(`${measure ? measure.trim() + ' ' : ''}${ingredient.trim()}`);
    }
  }

  // Determine meal type based on category and tags
  let meal_type = 'dinner';
  const category = mealDBRecipe.strCategory?.toLowerCase() || '';
  const tags = mealDBRecipe.strTags?.toLowerCase() || '';
  
  if (category.includes('breakfast') || tags.includes('breakfast')) {
    meal_type = 'breakfast';
  }

  // Determine protein type
  let protein_type = 'meat';
  if (category.includes('vegetarian') || tags.includes('vegetarian')) {
    protein_type = 'vegetarian';
  } else if (category.includes('vegan') || tags.includes('vegan')) {
    protein_type = 'vegan';
  } else if (category.includes('seafood') || ingredients.some(ing => 
    ing.toLowerCase().includes('fish') || 
    ing.toLowerCase().includes('salmon') || 
    ing.toLowerCase().includes('tuna') || 
    ing.toLowerCase().includes('shrimp')
  )) {
    protein_type = 'fish';
  }

  // Extract dietary tags
  const dietary_tags = [];
  if (category.includes('vegetarian')) dietary_tags.push('vegetarian');
  if (tags.includes('quick') || tags.includes('easy')) dietary_tags.push('quick');
  if (tags.includes('healthy')) dietary_tags.push('healthy');
  if (tags.includes('comfort')) dietary_tags.push('comfort');
  
  const recipe = {
    id: `themealdb-${mealDBRecipe.idMeal}`,
    name: mealDBRecipe.strMeal,
    ingredients: ingredients,
    instructions: mealDBRecipe.strInstructions,
    prep_time: 15, // Default values since TheMealDB doesn't provide these
    cook_time: 30,
    servings: 4,
    meal_type: meal_type,
    dietary_tags: dietary_tags,
    weather_preference: 'any',
    protein_type: protein_type,
    image: mealDBRecipe.strMealThumb,
    source: 'TheMealDB',
    external_id: mealDBRecipe.idMeal,
    category: mealDBRecipe.strCategory,
    area: mealDBRecipe.strArea,
    youtube: mealDBRecipe.strYoutube,
    source_url: mealDBRecipe.strSource
  };

  // Convert imperial measurements to metric
  return convertRecipeToMetric(recipe);
};

// API Functions
export const themealdbApi = {
  // Get random recipe
  getRandomRecipe: async () => {
    try {
      const response = await fetch(`${THEMEALDB_BASE_URL}/random.php`);
      const data = await response.json();
      return data.meals ? transformMealDBRecipe(data.meals[0]) : null;
    } catch (error) {
      console.error('Error fetching random recipe:', error);
      return null;
    }
  },

  // Search recipes by name
  searchByName: async (name) => {
    try {
      const response = await fetch(`${THEMEALDB_BASE_URL}/search.php?s=${encodeURIComponent(name)}`);
      const data = await response.json();
      return data.meals ? data.meals.map(transformMealDBRecipe) : [];
    } catch (error) {
      console.error('Error searching recipes by name:', error);
      return [];
    }
  },

  // Get recipes by first letter
  getByFirstLetter: async (letter) => {
    try {
      const response = await fetch(`${THEMEALDB_BASE_URL}/search.php?f=${letter}`);
      const data = await response.json();
      return data.meals ? data.meals.map(transformMealDBRecipe) : [];
    } catch (error) {
      console.error('Error fetching recipes by letter:', error);
      return [];
    }
  },

  // Get all categories
  getCategories: async () => {
    try {
      const response = await fetch(`${THEMEALDB_BASE_URL}/categories.php`);
      const data = await response.json();
      return data.categories || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },

  // Filter by category
  filterByCategory: async (category) => {
    try {
      const response = await fetch(`${THEMEALDB_BASE_URL}/filter.php?c=${encodeURIComponent(category)}`);
      const data = await response.json();
      return data.meals ? data.meals.map(transformMealDBRecipe) : [];
    } catch (error) {
      console.error('Error filtering by category:', error);
      return [];
    }
  },

  // Filter by ingredient
  filterByIngredient: async (ingredient) => {
    try {
      const response = await fetch(`${THEMEALDB_BASE_URL}/filter.php?i=${encodeURIComponent(ingredient)}`);
      const data = await response.json();
      return data.meals ? data.meals.map(transformMealDBRecipe) : [];
    } catch (error) {
      console.error('Error filtering by ingredient:', error);
      return [];
    }
  },

  // Filter by area/cuisine
  filterByArea: async (area) => {
    try {
      const response = await fetch(`${THEMEALDB_BASE_URL}/filter.php?a=${encodeURIComponent(area)}`);
      const data = await response.json();
      return data.meals ? data.meals.map(transformMealDBRecipe) : [];
    } catch (error) {
      console.error('Error filtering by area:', error);
      return [];
    }
  },

  // Get recipe by ID
  getById: async (id) => {
    try {
      const response = await fetch(`${THEMEALDB_BASE_URL}/lookup.php?i=${id}`);
      const data = await response.json();
      return data.meals ? transformMealDBRecipe(data.meals[0]) : null;
    } catch (error) {
      console.error('Error fetching recipe by ID:', error);
      return null;
    }
  },

  // Get multiple random recipes for meal planning
  getRandomRecipes: async (count = 10) => {
    try {
      const promises = [];
      
      for (let i = 0; i < count; i++) {
        promises.push(themealdbApi.getRandomRecipe());
      }
      
      const results = await Promise.all(promises);
      return results.filter(recipe => recipe !== null);
    } catch (error) {
      console.error('Error fetching random recipes:', error);
      return [];
    }
  },

  // Get recommended recipes based on preferences
  getRecommendations: async (preferences = {}) => {
    const { category, area, ingredient, count = 10 } = preferences;
    
    try {
      let recipes;
      
      if (category) {
        recipes = await themealdbApi.filterByCategory(category);
      } else if (area) {
        recipes = await themealdbApi.filterByArea(area);
      } else if (ingredient) {
        recipes = await themealdbApi.filterByIngredient(ingredient);
      } else {
        recipes = await themealdbApi.getRandomRecipes(count);
      }
      
      // Shuffle and limit results
      const shuffled = recipes.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }
};

export default themealdbApi;