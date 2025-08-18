// Client-side metric converter for external recipe sources

const imperialToMetric = {
  // Volume conversions (to ml)
  'cup': 240,
  'cups': 240,
  'c': 240,
  'tbsp': 15,
  'tablespoon': 15,
  'tablespoons': 15,
  'tbsps': 15,
  'tbs': 15,
  'tsp': 5,
  'teaspoon': 5,
  'teaspoons': 5,
  'tsps': 5,
  'ts': 5,
  'fl oz': 30,
  'fl. oz': 30,
  'fluid ounce': 30,
  'fluid ounces': 30,
  'floz': 30,
  'pint': 473,
  'pints': 473,
  'pt': 473,
  'quart': 946,
  'quarts': 946,
  'qt': 946,
  'gallon': 3785,
  'gallons': 3785,
  'gal': 3785,
  
  // Weight conversions (to grams)
  'oz': 28.35,
  'ounce': 28.35,
  'ounces': 28.35,
  'ozs': 28.35,
  'lb': 453.6,
  'lbs': 453.6,
  'pound': 453.6,
  'pounds': 453.6,
  'lbm': 453.6,
  
  // Additional common measurements
  'stick': 113, // stick of butter (grams)
  'sticks': 113,
  'packet': 7, // typical packet size (grams)
  'packets': 7,
  'envelope': 7,
  'envelopes': 7
};

// Common ingredient-specific conversions (when no weight/volume specified)
const ingredientDefaults = {
  'large egg': '60g',
  'medium egg': '50g', 
  'small egg': '40g',
  'egg': '50g',
  'large onion': '200g',
  'medium onion': '150g',
  'small onion': '100g',
  'onion': '150g',
  'large carrot': '100g',
  'medium carrot': '75g',
  'small carrot': '50g',
  'carrot': '75g',
  'large potato': '300g',
  'medium potato': '200g',
  'small potato': '100g',
  'potato': '200g',
  'large apple': '200g',
  'medium apple': '150g',
  'small apple': '100g',
  'apple': '150g',
  'clove garlic': '3g',
  'garlic clove': '3g',
  'clove of garlic': '3g'
};

export function convertIngredientToMetric(ingredient) {
  let convertedIngredient = ingredient.trim();
  
  // Handle special ingredient-specific conversions first
  for (const [key, value] of Object.entries(ingredientDefaults)) {
    const regex = new RegExp(`\\b\\d+\\s+${key}\\b`, 'gi');
    convertedIngredient = convertedIngredient.replace(regex, (match) => {
      const amount = match.match(/\d+/)[0];
      const totalWeight = parseInt(amount) * parseInt(value);
      return `${totalWeight}g ${key.split(' ').pop()}`; // Keep the main ingredient name
    });
  }
  
  // Enhanced regex to find measurements with more variations
  const measurementRegex = /(\d+(?:[.,]\d+)?(?:\/\d+)?|\d+\s*-\s*\d+)\s*(cup|cups|c|tbsp|tablespoon|tablespoons|tbsps|tbs|tsp|teaspoon|teaspoons|tsps|ts|fl\.?\s*oz|fluid\s*ounce|fluid\s*ounces|floz|pint|pints|pt|quart|quarts|qt|gallon|gallons|gal|oz|ounce|ounces|ozs|lb|lbs|pound|pounds|lbm|stick|sticks|packet|packets|envelope|envelopes)\b/gi;
  
  convertedIngredient = convertedIngredient.replace(measurementRegex, (match, amount, unit) => {
    const unitLower = unit.toLowerCase().replace(/\s+/g, ' ').replace(/\./g, '');
    
    if (imperialToMetric[unitLower]) {
      // Handle range amounts (e.g., "2-3 cups")
      let numericAmount;
      if (amount.includes('-')) {
        const [min, max] = amount.split('-').map(num => parseFloat(num.trim()));
        numericAmount = (min + max) / 2; // Use average
      } else if (amount.includes('/')) {
        // Convert fraction to decimal
        const parts = amount.split('/');
        if (parts.length === 2) {
          numericAmount = parseFloat(parts[0]) / parseFloat(parts[1]);
        } else {
          // Handle mixed numbers like "1 1/2"
          const wholePart = amount.includes(' ') ? parseFloat(amount.split(' ')[0]) : 0;
          const fractionPart = amount.split(' ').pop();
          const [numerator, denominator] = fractionPart.split('/');
          numericAmount = wholePart + (parseFloat(numerator) / parseFloat(denominator));
        }
      } else {
        numericAmount = parseFloat(amount.replace(',', '.'));
      }
      
      const conversionFactor = imperialToMetric[unitLower];
      let convertedAmount = numericAmount * conversionFactor;
      
      // Determine appropriate metric unit and round appropriately
      let metricUnit, displayAmount;
      
      // Volume units
      if (['cup', 'cups', 'c', 'tbsp', 'tablespoon', 'tablespoons', 'tbsps', 'tbs', 
           'tsp', 'teaspoon', 'teaspoons', 'tsps', 'ts', 'fl oz', 'fl. oz', 
           'fluid ounce', 'fluid ounces', 'floz', 'pint', 'pints', 'pt', 
           'quart', 'quarts', 'qt', 'gallon', 'gallons', 'gal'].includes(unitLower)) {
        if (convertedAmount >= 1000) {
          displayAmount = (convertedAmount / 1000);
          // Round to 1 decimal place for liters
          displayAmount = Math.round(displayAmount * 10) / 10;
          metricUnit = 'L';
        } else {
          // Round to nearest 5ml for small amounts, nearest ml for larger
          if (convertedAmount < 50) {
            displayAmount = Math.round(convertedAmount / 5) * 5;
          } else {
            displayAmount = Math.round(convertedAmount);
          }
          metricUnit = 'ml';
        }
      } else {
        // Weight units
        if (convertedAmount >= 1000) {
          displayAmount = (convertedAmount / 1000);
          // Round to 1 decimal place for kg
          displayAmount = Math.round(displayAmount * 10) / 10;
          metricUnit = 'kg';
        } else {
          // Round to nearest 5g for small amounts, nearest g for larger
          if (convertedAmount < 50) {
            displayAmount = Math.round(convertedAmount / 5) * 5;
          } else {
            displayAmount = Math.round(convertedAmount);
          }
          metricUnit = 'g';
        }
      }
      
      return `${displayAmount}${metricUnit}`;
    }
    
    return match; // Return original if no conversion found
  });
  
  // Clean up any double spaces that might have been created
  convertedIngredient = convertedIngredient.replace(/\s+/g, ' ').trim();
  
  return convertedIngredient;
}

export function convertRecipeToMetric(recipe) {
  if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
    recipe.ingredients = recipe.ingredients.map(ingredient => 
      convertIngredientToMetric(ingredient)
    );
  }
  
  return recipe;
}

const metricConverter = {
  convertIngredientToMetric,
  convertRecipeToMetric,
  imperialToMetric
};

export default metricConverter;