import { convertRecipeToMetric } from './metricConverter';

const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com';

// Configuration for Spoonacular API
const SPOONACULAR_CONFIG = {
  api_key: process.env.REACT_APP_SPOONACULAR_API_KEY || '',
  isConfigured: function() {
    console.log('🍴 Spoonacular Config Check:', {
      api_key: this.api_key ? `${this.api_key.substring(0, 8)}...` : 'NOT SET',
      api_key_length: this.api_key ? this.api_key.length : 0,
      result: !!this.api_key
    });
    return !!this.api_key;
  }
};

// Transform Spoonacular recipe to our app's format
const transformSpoonacularRecipe = (spoonacularRecipe, detailedInfo = null) => {
  // Use detailed info if available, otherwise use basic recipe data
  const recipe = detailedInfo || spoonacularRecipe;
  
  // Extract ingredients from different possible formats
  let ingredients = [];
  if (recipe.extendedIngredients) {
    // Detailed recipe format
    ingredients = recipe.extendedIngredients.map(ing => 
      `${ing.amount || ''} ${ing.unit || ''} ${ing.name}`.trim()
    );
  } else if (recipe.ingredients) {
    // Simple ingredients list
    ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  } else {
    // Fallback to empty array
    ingredients = [];
  }

  // Determine meal type based on dish types
  let meal_type = 'dinner';
  const dishTypes = recipe.dishTypes || [];
  if (dishTypes.some(type => type.includes('breakfast'))) {
    meal_type = 'breakfast';
  } else if (dishTypes.some(type => type.includes('lunch'))) {
    meal_type = 'dinner'; // Map lunch to dinner in our system
  }

  // Determine protein type based on diet labels
  let protein_type = 'meat';
  const diets = recipe.diets || [];
  if (diets.includes('vegan')) {
    protein_type = 'vegan';
  } else if (diets.includes('vegetarian')) {
    protein_type = 'vegetarian';
  } else if (diets.includes('pescatarian')) {
    protein_type = 'fish';
  }

  // Extract dietary tags
  const dietary_tags = [];
  if (diets.includes('vegetarian')) dietary_tags.push('vegetarian');
  if (diets.includes('vegan')) dietary_tags.push('vegetarian');
  if (diets.includes('gluten free')) dietary_tags.push('healthy');
  if (recipe.veryHealthy) dietary_tags.push('healthy');
  if (recipe.readyInMinutes && recipe.readyInMinutes <= 30) dietary_tags.push('quick');
  if (recipe.spoonacularScore && recipe.spoonacularScore > 80) dietary_tags.push('healthy');

  // Extract instructions
  let instructions = 'Visit the source link for complete cooking instructions.';
  if (recipe.instructions) {
    instructions = recipe.instructions;
  } else if (recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0) {
    instructions = recipe.analyzedInstructions[0].steps
      .map((step, index) => `${index + 1}. ${step.step}`)
      .join('\n');
  }

  // Calculate prep and cook times
  const totalTime = recipe.readyInMinutes || 30;
  const prep_time = Math.floor(totalTime * 0.3);
  const cook_time = totalTime - prep_time;

  const transformedRecipe = {
    id: `spoonacular-${recipe.id}`,
    name: recipe.title,
    ingredients: ingredients,
    instructions: instructions,
    prep_time: prep_time,
    cook_time: cook_time,
    servings: recipe.servings || 4,
    meal_type: meal_type,
    dietary_tags: dietary_tags,
    weather_preference: 'any',
    protein_type: protein_type,
    image: recipe.image,
    source: 'Spoonacular',
    external_id: recipe.id,
    cuisine: recipe.cuisines && recipe.cuisines.length > 0 ? recipe.cuisines[0] : 'International',
    calories: recipe.nutrition?.nutrients?.find(n => n.name === 'Calories')?.amount || null,
    source_url: recipe.sourceUrl || recipe.spoonacularSourceUrl,
    cook_time_total: totalTime,
    health_score: recipe.healthScore || null,
    spoonacular_score: recipe.spoonacularScore || null,
    price_per_serving: recipe.pricePerServing || null
  };

  // Convert imperial measurements to metric
  return convertRecipeToMetric(transformedRecipe);
};

// Build query parameters for Spoonacular API
const buildSearchParams = (params = {}) => {
  const {
    query = '',
    cuisine = '',
    diet = '',
    intolerances = '',
    type = '',
    number = 20,
    offset = 0,
    sort = 'popularity',
    sortDirection = 'desc'
  } = params;

  const searchParams = new URLSearchParams({
    apiKey: SPOONACULAR_CONFIG.api_key,
    number: number.toString(),
    offset: offset.toString(),
    sort,
    sortDirection,
    addRecipeInformation: 'true',
    fillIngredients: 'true'
  });

  if (query) searchParams.append('query', query);
  if (cuisine) searchParams.append('cuisine', cuisine);
  if (diet) searchParams.append('diet', diet);
  if (intolerances) searchParams.append('intolerances', intolerances);
  if (type) searchParams.append('type', type);

  return searchParams.toString();
};

// API Functions
export const spoonacularApi = {
  // Check if API is configured
  isConfigured: () => SPOONACULAR_CONFIG.isConfigured(),

  // Search recipes by query
  searchRecipes: async (query, params = {}) => {
    if (!SPOONACULAR_CONFIG.isConfigured()) {
      console.warn('Spoonacular API not configured. Please set REACT_APP_SPOONACULAR_API_KEY');
      return [];
    }

    console.log('🍴 Spoonacular searchRecipes called with:', { query, params });

    try {
      const searchParams = buildSearchParams({
        query: query,
        ...params
      });

      const response = await fetch(`${SPOONACULAR_BASE_URL}/recipes/complexSearch?${searchParams}`);

      console.log('🍴 Spoonacular API response status:', response.status);

      if (!response.ok) {
        console.error('🍴 Spoonacular API error response:', response.status, response.statusText);
        if (response.status === 401) {
          throw new Error('Invalid Spoonacular API key');
        } else if (response.status === 402) {
          throw new Error('Spoonacular API quota exceeded');
        }
        throw new Error(`Spoonacular API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('🍴 Spoonacular API returned', data.results?.length || 0, 'recipes');
      const transformedRecipes = (data.results || []).map(recipe => transformSpoonacularRecipe(recipe));
      console.log('🍴 Transformed to', transformedRecipes.length, 'recipes');
      return transformedRecipes;
    } catch (error) {
      console.error('Error searching Spoonacular recipes:', error);
      
      // Show user-friendly error for API issues
      if (error.message.includes('Invalid Spoonacular API key')) {
        console.warn('🚨 Spoonacular API key is invalid. Please check your API key.');
      } else if (error.message.includes('quota exceeded')) {
        console.warn('🚨 Spoonacular API quota exceeded. Check your usage limits.');
      }
      
      return [];
    }
  },

  // Get recipes by cuisine
  getRecipesByCuisine: async (cuisine, limit = 20) => {
    return await spoonacularApi.searchRecipes('', {
      cuisine: cuisine,
      number: limit
    });
  },

  // Get recipes by diet type
  getRecipesByDiet: async (diet, limit = 20) => {
    return await spoonacularApi.searchRecipes('', {
      diet: diet,
      number: limit
    });
  },

  // Get recipes by meal type
  getRecipesByType: async (type, limit = 20) => {
    return await spoonacularApi.searchRecipes('', {
      type: type,
      number: limit
    });
  },

  // Get random recipes
  getRandomRecipes: async (count = 20) => {
    console.log('🍴 Spoonacular getRandomRecipes called with count:', count);
    
    if (!SPOONACULAR_CONFIG.isConfigured()) {
      return [];
    }

    try {
      const response = await fetch(
        `${SPOONACULAR_BASE_URL}/recipes/random?apiKey=${SPOONACULAR_CONFIG.api_key}&number=${count}&tags=main course`
      );

      if (!response.ok) {
        throw new Error(`Spoonacular API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('🍴 Spoonacular random API returned', data.recipes?.length || 0, 'recipes');
      return (data.recipes || []).map(recipe => transformSpoonacularRecipe(recipe));
    } catch (error) {
      console.error('Error getting random Spoonacular recipes:', error);
      return [];
    }
  },

  // Get available cuisine options
  getCuisineOptions: () => [
    'african', 'american', 'british', 'cajun', 'caribbean', 'chinese',
    'eastern european', 'european', 'french', 'german', 'greek', 'indian',
    'irish', 'italian', 'japanese', 'jewish', 'korean', 'latin american',
    'mediterranean', 'mexican', 'middle eastern', 'nordic', 'southern',
    'spanish', 'thai', 'vietnamese'
  ],

  // Get available diet options
  getDietOptions: () => [
    'gluten free', 'ketogenic', 'vegetarian', 'lacto-vegetarian',
    'ovo-vegetarian', 'vegan', 'pescetarian', 'paleo', 'primal', 'whole30'
  ],

  // Get available intolerance options
  getIntoleranceOptions: () => [
    'dairy', 'egg', 'gluten', 'grain', 'peanut', 'seafood',
    'sesame', 'shellfish', 'soy', 'sulfite', 'tree nut', 'wheat'
  ],

  // Get available meal type options
  getTypeOptions: () => [
    'main course', 'side dish', 'dessert', 'appetizer', 'salad',
    'bread', 'breakfast', 'soup', 'beverage', 'sauce', 'marinade',
    'fingerfood', 'snack', 'drink'
  ]
};

export default spoonacularApi;