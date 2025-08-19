const { convertIngredientToMetric } = require('./metric-converter');

const familyComposition = {
  adults: 2,
  pescatarianAdult: 1,
  child6: 1,
  twins1: 2
};

const weatherBasedPreferences = {
  hot: ['cold', 'light', 'fresh', 'salad', 'grilled'],
  cold: ['warm', 'hearty', 'soup', 'stew', 'comfort'],
  moderate: ['any']
};

const nutritionalBalance = {
  proteins: ['chicken', 'fish', 'eggs', 'beans', 'lentils', 'tofu'],
  vegetables: ['broccoli', 'carrots', 'spinach', 'bell peppers', 'zucchini', 'tomatoes'],
  carbs: ['rice', 'pasta', 'potatoes', 'bread', 'quinoa']
};

function generateOptimizedMealPlan(recipes, weather = { isHot: false, isCold: false }) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const mealPlan = [];
  
  // Only dinner recipes - breakfast removed from meal planning
  const dinnerRecipes = recipes.filter(r => r.meal_type === 'dinner');
  
  // Create tracking for used recipes
  const usedDinnerIds = new Set();
  const proteinBalance = { meat: 0, fish: 0, vegetarian: 0 };
  
  // Categorize dinner recipes with no overlap
  const pescatarianDinners = dinnerRecipes.filter(r => 
    r.protein_type === 'fish' || r.protein_type === 'vegetarian' || r.protein_type === 'vegan'
  );
  const meatDinners = dinnerRecipes.filter(r => r.protein_type === 'meat');
  const quickMeals = dinnerRecipes.filter(r => 
    r.dietary_tags && r.dietary_tags.includes('quick') && 
    (r.prep_time + r.cook_time) <= 30
  );
  const kidFriendlyMeals = dinnerRecipes.filter(r => 
    r.dietary_tags && r.dietary_tags.includes('kid-friendly')
  );
  const comfortMeals = dinnerRecipes.filter(r =>
    r.dietary_tags && r.dietary_tags.includes('comfort')
  );
  
  const weatherAppropriate = dinnerRecipes.filter(r => {
    if (weather.isHot && r.weather_preference === 'hot') return true;
    if (weather.isCold && r.weather_preference === 'cold') return true;
    if (r.weather_preference === 'any') return true;
    return false;
  });

  // Helper function to select a recipe ensuring variety
  function selectRecipeWithVariety(candidateRecipes, usedIds, fallbackRecipes = []) {
    // First try: unused recipes from candidates
    let available = candidateRecipes.filter(r => !usedIds.has(r.id));
    
    if (available.length === 0 && fallbackRecipes.length > 0) {
      // Second try: unused recipes from fallback
      available = fallbackRecipes.filter(r => !usedIds.has(r.id));
    }
    
    if (available.length === 0) {
      // Third try: any unused recipe
      available = [...candidateRecipes, ...fallbackRecipes].filter(r => !usedIds.has(r.id));
    }
    
    if (available.length === 0) {
      // Last resort: any recipe (reset variety)
      available = candidateRecipes.length > 0 ? candidateRecipes : fallbackRecipes;
      if (available.length === 0) return null;
    }
    
    // Select randomly from available options
    return available[Math.floor(Math.random() * available.length)];
  }

  days.forEach((day, index) => {
    const dayPlan = { day: day };
    
    // No breakfast planning - dinner only
    
    // DINNER SELECTION with strategic variety
    if (dinnerRecipes.length > 0) {
      let selectedDinner = null;
      let candidateRecipes = [];
      
      // Determine the best protein type for balance
      const totalMeals = Math.max(1, proteinBalance.meat + proteinBalance.fish + proteinBalance.vegetarian);
      const meatRatio = proteinBalance.meat / totalMeals;
      const fishRatio = proteinBalance.fish / totalMeals;
      const vegRatio = proteinBalance.vegetarian / totalMeals;
      
      // Strategy based on day and current balance
      if (index === 0 || index === 6) { // Weekends - more flexibility
        if (weather.isCold) {
          candidateRecipes = [...comfortMeals, ...weatherAppropriate];
        } else {
          candidateRecipes = weatherAppropriate.length > 0 ? weatherAppropriate : dinnerRecipes;
        }
      } else if (index >= 1 && index <= 3) { // Early weekdays - quick & kid-friendly
        candidateRecipes = [...quickMeals, ...kidFriendlyMeals];
      } else { // Later weekdays - balanced nutrition
        if (vegRatio < 0.3) { // Need more vegetarian
          candidateRecipes = pescatarianDinners;
        } else if (fishRatio < 0.2) { // Need more fish
          candidateRecipes = dinnerRecipes.filter(r => r.protein_type === 'fish');
        } else { // Can have meat or variety
          candidateRecipes = dinnerRecipes;
        }
      }
      
      // Select dinner with variety
      selectedDinner = selectRecipeWithVariety(candidateRecipes, usedDinnerIds, dinnerRecipes);
      
      if (selectedDinner) {
        dayPlan.dinner = selectedDinner;
        usedDinnerIds.add(selectedDinner.id);
        
        // Track protein balance
        if (selectedDinner.protein_type === 'meat') {
          proteinBalance.meat++;
        } else if (selectedDinner.protein_type === 'fish') {
          proteinBalance.fish++;
        } else {
          proteinBalance.vegetarian++;
        }
        
        // Reset dinner variety if we've used most recipes (80% threshold)
        if (usedDinnerIds.size >= Math.floor(dinnerRecipes.length * 0.8)) {
          usedDinnerIds.clear();
        }
      }
    }
    
    mealPlan.push(dayPlan);
  });
  
  return mealPlan;
}

function generateShoppingList(mealPlan) {
  const ingredients = new Map();
  
  mealPlan.forEach(day => {
    // Only process dinner recipes now
    if (day.dinner && day.dinner.ingredients) {
      day.dinner.ingredients.forEach(ingredient => {
        // Convert to metric if needed
        const metricIngredient = convertIngredientToMetric(ingredient);
        const normalizedIngredient = metricIngredient.toLowerCase().trim();
        if (ingredients.has(normalizedIngredient)) {
          ingredients.set(normalizedIngredient, ingredients.get(normalizedIngredient) + 1);
        } else {
          ingredients.set(normalizedIngredient, 1);
        }
      });
    }
  });
  
  return Array.from(ingredients.entries()).map(([ingredient, count]) => ({
    ingredient,
    frequency: count
  }));
}

function addSampleRecipes(db) {
  const sampleRecipes = [
    {
      name: "Fish and Chips",
      ingredients: ["4 fish fillets (600g)", "800g potatoes", "oil for frying", "100g flour", "beer batter"],
      instructions: "Cut potatoes, fry until golden. Batter fish, fry until crispy. Serve with mushy peas.",
      prep_time: 15,
      cook_time: 25,
      servings: 4,
      meal_type: "dinner",
      dietary_tags: ["kid-friendly", "comfort"],
      weather_preference: "cold",
      protein_type: "fish"
    },
    {
      name: "Chicken Stir Fry",
      ingredients: ["500g chicken breasts", "300g mixed vegetables", "30ml soy sauce", "10g ginger", "3 garlic cloves", "200g rice"],
      instructions: "Cut chicken, stir fry with vegetables. Season with soy sauce, ginger, garlic. Serve over rice.",
      prep_time: 10,
      cook_time: 15,
      servings: 4,
      meal_type: "dinner",
      dietary_tags: ["quick", "healthy"],
      weather_preference: "any",
      protein_type: "meat"
    },
    {
      name: "Vegetable Pasta",
      ingredients: ["300g pasta", "1 zucchini", "2 bell peppers", "400g tomatoes", "30ml olive oil", "fresh basil", "50g parmesan"],
      instructions: "Cook pasta. Sauté vegetables in olive oil. Combine with pasta, add basil and parmesan.",
      prep_time: 10,
      cook_time: 20,
      servings: 4,
      meal_type: "dinner",
      dietary_tags: ["vegetarian", "kid-friendly"],
      weather_preference: "any",
      protein_type: "vegetarian"
    },
    {
      name: "Salmon with Sweet Potato",
      ingredients: ["600g salmon fillets", "600g sweet potatoes", "300g broccoli", "30ml olive oil", "1 lemon"],
      instructions: "Roast sweet potatoes and broccoli. Pan fry salmon. Serve with lemon.",
      prep_time: 10,
      cook_time: 25,
      servings: 4,
      meal_type: "dinner",
      dietary_tags: ["healthy", "pescatarian"],
      weather_preference: "any",
      protein_type: "fish"
    },
    {
      name: "Chicken Soup",
      ingredients: ["800g chicken thighs", "200g carrots", "150g celery", "1 onion", "1.5L chicken stock", "150g noodles"],
      instructions: "Simmer chicken with vegetables in stock. Add noodles in last 10 minutes.",
      prep_time: 15,
      cook_time: 45,
      servings: 6,
      meal_type: "dinner",
      dietary_tags: ["comfort", "healthy"],
      weather_preference: "cold",
      protein_type: "meat"
    }
  ];

  sampleRecipes.forEach(recipe => {
    db.run(
      `INSERT INTO recipes (name, ingredients, instructions, prep_time, cook_time, servings, meal_type, dietary_tags, weather_preference, protein_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recipe.name, 
        JSON.stringify(recipe.ingredients), 
        recipe.instructions, 
        recipe.prep_time, 
        recipe.cook_time, 
        recipe.servings, 
        recipe.meal_type, 
        JSON.stringify(recipe.dietary_tags), 
        recipe.weather_preference, 
        recipe.protein_type
      ],
      (err) => {
        if (err) {
          console.error('Error inserting sample recipe:', recipe.name, err.message);
        } else {
          console.log('Added sample recipe:', recipe.name);
        }
      }
    );
  });
}

module.exports = {
  generateOptimizedMealPlan,
  generateShoppingList,
  addSampleRecipes,
  familyComposition
};