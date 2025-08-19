import { convertRecipeToMetric } from './metricConverter';

const EDAMAM_BASE_URL = 'https://api.edamam.com/api/recipes/v2';

// Configuration for Edamam API
const EDAMAM_CONFIG = {
  app_id: process.env.REACT_APP_EDAMAM_APP_ID || '',
  app_key: process.env.REACT_APP_EDAMAM_APP_KEY || '',
  // Fallback to demo credentials if available (users can set their own)
  isConfigured: function() {
    console.log('🔍 Edamam Config Check:', {
      app_id: this.app_id,
      app_key: this.app_key ? 'SET' : 'NOT SET',
      result: !!(this.app_id && this.app_key)
    });
    return !!(this.app_id && this.app_key);
  }
};

// Transform Edamam recipe to our app's format
const transformEdamamRecipe = (edamamRecipe) => {
  const recipe = edamamRecipe.recipe;
  
  // Extract ingredients from Edamam format
  const ingredients = recipe.ingredientLines || [];
  
  // Determine meal type based on meal type array
  let meal_type = 'dinner';
  if (recipe.mealType && recipe.mealType.length > 0) {
    const mealTypes = recipe.mealType.map(type => type.toLowerCase());
    if (mealTypes.includes('breakfast')) {
      meal_type = 'breakfast';
    } else if (mealTypes.includes('lunch')) {
      meal_type = 'dinner'; // Map lunch to dinner in our system
    }
  }

  // Determine protein type based on health and diet labels
  let protein_type = 'meat';
  const healthLabels = (recipe.healthLabels || []).map(label => label.toLowerCase());
  const dietLabels = (recipe.dietLabels || []).map(label => label.toLowerCase());
  
  if (healthLabels.includes('vegan') || dietLabels.includes('vegan')) {
    protein_type = 'vegan';
  } else if (healthLabels.includes('vegetarian') || dietLabels.includes('vegetarian')) {
    protein_type = 'vegetarian';
  } else if (healthLabels.includes('pescatarian') || dietLabels.includes('pescatarian')) {
    protein_type = 'fish';
  }

  // Extract dietary tags from health and diet labels
  const dietary_tags = [];
  const allLabels = [...healthLabels, ...dietLabels];
  
  if (allLabels.includes('vegetarian')) dietary_tags.push('vegetarian');
  if (allLabels.includes('gluten-free')) dietary_tags.push('healthy');
  if (allLabels.includes('low-sodium')) dietary_tags.push('healthy');
  if (allLabels.includes('high-protein')) dietary_tags.push('healthy');
  if (recipe.totalTime && recipe.totalTime <= 30) dietary_tags.push('quick');

  // Calculate prep and cook times
  let prep_time = 15; // Default
  let cook_time = 30; // Default
  if (recipe.totalTime) {
    if (recipe.totalTime <= 30) {
      prep_time = Math.max(5, Math.floor(recipe.totalTime * 0.3));
      cook_time = recipe.totalTime - prep_time;
    } else {
      prep_time = Math.min(30, Math.floor(recipe.totalTime * 0.4));
      cook_time = recipe.totalTime - prep_time;
    }
  }

  const transformedRecipe = {
    id: `edamam-${recipe.uri.split('#')[1] || Math.random()}`,
    name: recipe.label,
    ingredients: ingredients,
    instructions: 'Visit the source link for complete cooking instructions.', // Edamam doesn't provide instructions
    prep_time: prep_time,
    cook_time: cook_time,
    servings: recipe.yield || 4,
    meal_type: meal_type,
    dietary_tags: dietary_tags,
    weather_preference: 'any',
    protein_type: protein_type,
    image: recipe.image,
    source: 'Edamam',
    external_id: recipe.uri,
    cuisine: recipe.cuisineType ? recipe.cuisineType[0] : 'International',
    calories: recipe.calories ? Math.round(recipe.calories) : null,
    source_url: recipe.url,
    cook_time_total: recipe.totalTime || (prep_time + cook_time),
    health_labels: recipe.healthLabels || [],
    diet_labels: recipe.dietLabels || []
  };

  // Convert imperial measurements to metric
  return convertRecipeToMetric(transformedRecipe);
};

// Build query parameters for Edamam API
const buildQueryParams = (params = {}) => {
  const {
    q = '',
    diet = '',
    health = '',
    cuisineType = '',
    mealType = '',
    dishType = '',
    calories = '',
    time = '',
    imageSize = 'REGULAR',
    from = 0,
    to = 20
  } = params;

  const queryParams = new URLSearchParams({
    type: 'public',
    app_id: EDAMAM_CONFIG.app_id,
    app_key: EDAMAM_CONFIG.app_key,
    imageSize,
    from: from.toString(),
    to: to.toString()
  });

  if (q) queryParams.append('q', q);
  if (diet) queryParams.append('diet', diet);
  if (health) queryParams.append('health', health);
  if (cuisineType) queryParams.append('cuisineType', cuisineType);
  if (mealType) queryParams.append('mealType', mealType);
  if (dishType) queryParams.append('dishType', dishType);
  if (calories) queryParams.append('calories', calories);
  if (time) queryParams.append('time', time);

  return queryParams.toString();
};

// API Functions
export const edamamApi = {
  // Check if API is configured
  isConfigured: () => EDAMAM_CONFIG.isConfigured(),

  // Search recipes by query
  searchRecipes: async (query, params = {}) => {
    console.log('🔍 Edamam searchRecipes called with:', { query, params });
    if (!EDAMAM_CONFIG.isConfigured()) {
      console.warn('Edamam API not configured. Please set REACT_APP_EDAMAM_APP_ID and REACT_APP_EDAMAM_APP_KEY');
      return [];
    }

    try {
      const queryParams = buildQueryParams({
        q: query,
        ...params
      });

      const response = await fetch(`${EDAMAM_BASE_URL}?${queryParams}`, {
        headers: {
          'Edamam-Account-User': 'demo-user'
        }
      });

      console.log('🔍 Edamam API response status:', response.status);

      if (!response.ok) {
        console.error('🔍 Edamam API error response:', response.status, response.statusText);
        if (response.status === 401) {
          throw new Error('Invalid Edamam API credentials');
        } else if (response.status === 429) {
          throw new Error('Edamam API rate limit exceeded');
        }
        throw new Error(`Edamam API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('🔍 Edamam API returned', data.hits?.length || 0, 'recipes');
      const transformedRecipes = (data.hits || []).map(transformEdamamRecipe);
      console.log('🔍 Transformed to', transformedRecipes.length, 'recipes');
      return transformedRecipes;
    } catch (error) {
      console.error('Error searching Edamam recipes:', error);
      return [];
    }
  },

  // Get recipes by cuisine
  getRecipesByCuisine: async (cuisine, limit = 20) => {
    return await edamamApi.searchRecipes('', {
      cuisineType: cuisine,
      to: limit
    });
  },

  // Get recipes by diet type
  getRecipesByDiet: async (diet, limit = 20) => {
    return await edamamApi.searchRecipes('', {
      diet: diet,
      to: limit
    });
  },

  // Get recipes by meal type
  getRecipesByMealType: async (mealType, limit = 20) => {
    return await edamamApi.searchRecipes('', {
      mealType: mealType,
      to: limit
    });
  },

  // Get healthy recipes
  getHealthyRecipes: async (healthLabel = 'low-sodium', limit = 20) => {
    return await edamamApi.searchRecipes('', {
      health: healthLabel,
      to: limit
    });
  },

  // Get quick recipes (under 30 minutes)
  getQuickRecipes: async (limit = 20) => {
    return await edamamApi.searchRecipes('', {
      time: '1-30',
      to: limit
    });
  },

  // Get random recipes (search with popular ingredients)
  getRandomRecipes: async (count = 20) => {
    console.log('🔍 Edamam getRandomRecipes called with count:', count);
    const popularIngredients = ['chicken', 'pasta', 'beef', 'salmon', 'vegetables', 'rice'];
    const randomIngredient = popularIngredients[Math.floor(Math.random() * popularIngredients.length)];
    
    console.log('🔍 Using random ingredient:', randomIngredient);
    return await edamamApi.searchRecipes(randomIngredient, {
      to: count,
      from: Math.floor(Math.random() * 50) // Start from random position for variety
    });
  },

  // Get recommendations based on preferences
  getRecommendations: async (preferences = {}) => {
    const { 
      cuisine, 
      diet, 
      health, 
      mealType, 
      query = '', 
      count = 20 
    } = preferences;
    
    try {
      return await edamamApi.searchRecipes(query, {
        cuisineType: cuisine,
        diet: diet,
        health: health,
        mealType: mealType,
        to: count
      });
    } catch (error) {
      console.error('Error getting Edamam recommendations:', error);
      return [];
    }
  },

  // Get available diet options
  getDietOptions: () => [
    'balanced', 'high-fiber', 'high-protein', 'low-carb', 'low-fat', 'low-sodium'
  ],

  // Get available health label options
  getHealthOptions: () => [
    'vegan', 'vegetarian', 'pescatarian', 'gluten-free', 'dairy-free', 
    'egg-free', 'fish-free', 'shellfish-free', 'tree-nut-free', 'soy-free'
  ],

  // Get available cuisine options
  getCuisineOptions: () => [
    'american', 'asian', 'british', 'caribbean', 'central europe', 'chinese',
    'eastern europe', 'french', 'indian', 'italian', 'japanese', 'kosher',
    'mediterranean', 'mexican', 'middle eastern', 'nordic', 'south american', 'south east asian'
  ]
};

export default edamamApi;