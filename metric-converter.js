// Utility functions to convert imperial measurements to metric

const imperialToMetric = {
  // Volume conversions (to ml)
  'cup': 240,
  'cups': 240,
  'tbsp': 15,
  'tablespoon': 15,
  'tablespoons': 15,
  'tsp': 5,
  'teaspoon': 5,
  'teaspoons': 5,
  'fl oz': 30,
  'fluid ounce': 30,
  'fluid ounces': 30,
  'pint': 473,
  'pints': 473,
  'quart': 946,
  'quarts': 946,
  'gallon': 3785,
  'gallons': 3785,
  
  // Weight conversions (to grams)
  'oz': 28.35,
  'ounce': 28.35,
  'ounces': 28.35,
  'lb': 453.6,
  'lbs': 453.6,
  'pound': 453.6,
  'pounds': 453.6
};

function convertIngredientToMetric(ingredient) {
  let convertedIngredient = ingredient;
  
  // Regex to find measurements like "1 cup", "2 tbsp", "1/2 tsp", etc.
  const measurementRegex = /(\d+(?:\/\d+)?)\s*(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|fl oz|fluid ounce|fluid ounces|pint|pints|quart|quarts|gallon|gallons|oz|ounce|ounces|lb|lbs|pound|pounds)\b/gi;
  
  convertedIngredient = convertedIngredient.replace(measurementRegex, (match, amount, unit) => {
    const unitLower = unit.toLowerCase();
    
    if (imperialToMetric[unitLower]) {
      // Convert fraction to decimal
      let numericAmount = amount;
      if (amount.includes('/')) {
        const [numerator, denominator] = amount.split('/');
        numericAmount = parseInt(numerator) / parseInt(denominator);
      } else {
        numericAmount = parseFloat(amount);
      }
      
      const conversionFactor = imperialToMetric[unitLower];
      const convertedAmount = Math.round(numericAmount * conversionFactor);
      
      // Determine appropriate metric unit
      let metricUnit, displayAmount;
      
      if (['cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons', 
           'fl oz', 'fluid ounce', 'fluid ounces', 'pint', 'pints', 'quart', 'quarts', 
           'gallon', 'gallons'].includes(unitLower)) {
        // Volume conversion
        if (convertedAmount >= 1000) {
          displayAmount = (convertedAmount / 1000).toFixed(1);
          metricUnit = 'L';
        } else {
          displayAmount = convertedAmount;
          metricUnit = 'ml';
        }
      } else {
        // Weight conversion
        if (convertedAmount >= 1000) {
          displayAmount = (convertedAmount / 1000).toFixed(1);
          metricUnit = 'kg';
        } else {
          displayAmount = convertedAmount;
          metricUnit = 'g';
        }
      }
      
      return `${displayAmount}${metricUnit}`;
    }
    
    return match; // Return original if no conversion found
  });
  
  return convertedIngredient;
}

function convertRecipeToMetric(recipe) {
  if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
    recipe.ingredients = recipe.ingredients.map(ingredient => 
      convertIngredientToMetric(ingredient)
    );
  }
  
  return recipe;
}

module.exports = {
  convertIngredientToMetric,
  convertRecipeToMetric,
  imperialToMetric
};