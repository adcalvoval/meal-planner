const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const axios = require('axios');
const cheerio = require('cheerio');
const pdf = require('pdf-parse');
const { generateOptimizedMealPlan, generateShoppingList, addSampleRecipes } = require('./meal-planning-engine');
const { convertRecipeToMetric } = require('./metric-converter');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

// For Vercel deployment, use in-memory database or environment-specific path
const dbPath = process.env.NODE_ENV === 'production' ? ':memory:' : './meal_planner.db';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ingredients TEXT NOT NULL,
    instructions TEXT NOT NULL,
    prep_time INTEGER,
    cook_time INTEGER,
    servings INTEGER,
    meal_type TEXT,
    dietary_tags TEXT,
    weather_preference TEXT,
    protein_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS meal_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start_date DATE,
    day_of_week INTEGER,
    meal_type TEXT,
    recipe_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS family_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_name TEXT,
    dietary_restrictions TEXT,
    age_group TEXT,
    preferences TEXT
  )`);
  
  // Always add sample recipes in production (in-memory database)
  if (process.env.NODE_ENV === 'production') {
    console.log('Production mode: Adding sample recipes...');
    addSampleRecipes(db);
  } else {
    db.get("SELECT COUNT(*) as count FROM recipes", (err, row) => {
      if (!err && row.count === 0) {
        console.log('Adding sample recipes...');
        addSampleRecipes(db);
      } else if (!err) {
        // Check if we need to update to metric
        db.get("SELECT ingredients FROM recipes WHERE name = 'Scrambled Eggs with Toast'", (err, recipe) => {
          if (!err && recipe) {
            const ingredients = JSON.parse(recipe.ingredients);
            // Check if this recipe still has imperial measurements
            if (ingredients.some(ing => ing.includes('tbsp'))) {
              console.log('Updating recipes to metric system...');
              db.run("DELETE FROM recipes", (err) => {
                if (!err) {
                  addSampleRecipes(db);
                }
              });
            }
          }
        });
      }
    });
  }
});

// For Vercel deployment, use memory storage instead of disk storage
const storage = process.env.NODE_ENV === 'production' 
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, 'uploads/');
      },
      filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
      }
    });

const upload = multer({ storage: storage });

app.post('/api/recipes', (req, res) => {
  const { name, ingredients, instructions, prep_time, cook_time, servings, meal_type, dietary_tags, weather_preference, protein_type } = req.body;
  
  db.run(
    `INSERT INTO recipes (name, ingredients, instructions, prep_time, cook_time, servings, meal_type, dietary_tags, weather_preference, protein_type) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, JSON.stringify(ingredients), instructions, prep_time, cook_time, servings, meal_type, JSON.stringify(dietary_tags), weather_preference, protein_type],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

app.get('/api/recipes', (req, res) => {
  db.all("SELECT * FROM recipes ORDER BY created_at DESC", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const recipes = rows.map(row => ({
      ...row,
      ingredients: JSON.parse(row.ingredients),
      dietary_tags: JSON.parse(row.dietary_tags)
    }));
    res.json(recipes);
  });
});

// Update recipe endpoint
app.put('/api/recipes/:id', (req, res) => {
  const { id } = req.params;
  const { name, ingredients, instructions, prep_time, cook_time, servings, meal_type, dietary_tags, weather_preference, protein_type } = req.body;
  
  db.run(
    `UPDATE recipes SET 
     name = ?, ingredients = ?, instructions = ?, prep_time = ?, cook_time = ?, 
     servings = ?, meal_type = ?, dietary_tags = ?, weather_preference = ?, protein_type = ? 
     WHERE id = ?`,
    [name, JSON.stringify(ingredients), instructions, prep_time, cook_time, servings, meal_type, JSON.stringify(dietary_tags), weather_preference, protein_type, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Recipe not found' });
        return;
      }
      res.json({ message: 'Recipe updated successfully', changes: this.changes });
    }
  );
});

// Delete recipe endpoint
app.delete('/api/recipes/:id', (req, res) => {
  const { id } = req.params;
  
  db.run("DELETE FROM recipes WHERE id = ?", [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Recipe not found' });
      return;
    }
    res.json({ message: 'Recipe deleted successfully', changes: this.changes });
  });
});

// PDF Upload endpoint for recipe extraction
app.post('/api/upload-pdf-recipe', upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded' });
  }

  try {
    // Extract text from PDF
    const pdfBuffer = req.file.buffer || require('fs').readFileSync(req.file.path);
    const pdfData = await pdf(pdfBuffer);
    const extractedText = pdfData.text;

    // Parse the extracted text to find recipe components
    const parsedRecipe = parseRecipeFromText(extractedText);
    
    // Convert to metric if needed
    const convertedRecipe = convertRecipeToMetric(parsedRecipe);
    
    res.json(convertedRecipe);
  } catch (error) {
    console.error('PDF parsing error:', error);
    res.status(500).json({ error: 'Failed to extract recipe from PDF: ' + error.message });
  }
});

// Helper function to parse recipe from extracted text
function parseRecipeFromText(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let recipe = {
    name: '',
    ingredients: [],
    instructions: '',
    prep_time: 0,
    cook_time: 0,
    servings: 4
  };

  // Try to extract recipe name (usually first line or a prominent heading)
  if (lines.length > 0) {
    recipe.name = lines[0].replace(/^(recipe|Recipe):?\s*/i, '').trim() || 'PDF Recipe';
  }

  // Look for ingredients section
  let inIngredientsSection = false;
  let inInstructionsSection = false;
  let ingredientsStart = -1;
  let instructionsStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    // Detect ingredients section
    if (line.includes('ingredients') || line.includes('what you need')) {
      inIngredientsSection = true;
      inInstructionsSection = false;
      ingredientsStart = i + 1;
      continue;
    }
    
    // Detect instructions section
    if (line.includes('instructions') || line.includes('method') || line.includes('directions') || 
        line.includes('steps') || line.includes('preparation')) {
      inIngredientsSection = false;
      inInstructionsSection = true;
      instructionsStart = i + 1;
      continue;
    }

    // Extract time information
    const timeMatch = line.match(/(\d+)\s*(min|minute|hour|hr)/i);
    if (timeMatch) {
      const minutes = parseInt(timeMatch[1]) * (timeMatch[2].toLowerCase().includes('hour') || timeMatch[2].toLowerCase().includes('hr') ? 60 : 1);
      if (line.includes('prep') || line.includes('preparation')) {
        recipe.prep_time = minutes;
      } else if (line.includes('cook') || line.includes('bake')) {
        recipe.cook_time = minutes;
      }
    }

    // Extract servings
    const servingMatch = line.match(/serves?\s*(\d+)|(\d+)\s*servings?/i);
    if (servingMatch) {
      recipe.servings = parseInt(servingMatch[1] || servingMatch[2]);
    }

    // Collect ingredients
    if (inIngredientsSection && !inInstructionsSection && i >= ingredientsStart) {
      // Look for lines that seem like ingredients (contain measurements, food items)
      if (line.match(/\d+/) || line.match(/cup|tbsp|tsp|gram|kg|ml|liter|oz|pound|lb/i)) {
        recipe.ingredients.push(lines[i]);
      }
    }
  }

  // Collect instructions (everything after instructions section)
  if (instructionsStart > -1) {
    const instructionLines = lines.slice(instructionsStart);
    recipe.instructions = instructionLines.join('\n').trim();
  }

  // Fallback: if no specific sections found, try to extract ingredients by pattern
  if (recipe.ingredients.length === 0) {
    for (const line of lines) {
      if (line.match(/^\d+/) || line.match(/cup|tbsp|tsp|gram|kg|ml|liter|oz|pound|lb/i)) {
        recipe.ingredients.push(line);
      }
    }
  }

  // Fallback: use remaining text as instructions if none found
  if (!recipe.instructions && lines.length > recipe.ingredients.length + 2) {
    const remainingLines = lines.filter(line => 
      !recipe.ingredients.includes(line) && 
      line !== recipe.name &&
      !line.toLowerCase().includes('ingredients') &&
      !line.toLowerCase().includes('instructions')
    );
    recipe.instructions = remainingLines.join('\n').trim();
  }

  return recipe;
}

app.post('/api/scrape-recipe', async (req, res) => {
  const { url } = req.body;
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(response.data);
    
    let recipe = {
      name: '',
      ingredients: [],
      instructions: '',
      prep_time: 0,
      cook_time: 0,
      servings: 0
    };

    // BBC Good Food specific scraping using proven selectors
    if (url.includes('bbcgoodfood.com')) {
      // Recipe title - using h1 as primary selector
      recipe.name = $('h1').first().text().trim();
      
      // Try modern BBC Good Food selectors first
      const ingredientSelectors = [
        'section[data-testid="ingredients-section"] li',
        '[data-testid="ingredients-section"] li',
        '[data-testid="ingredients"] li',
        '.recipe-ingredients__list li',
        '.ingredients-section__list li',
        '.ingredients ul li',
        'ul li[data-testid*="ingredient"]',
        'li[class*="ingredient"]'
      ];
      
      // Try each selector until we find ingredients
      for (const selector of ingredientSelectors) {
        if (recipe.ingredients.length === 0) {
          $(selector).each((i, el) => {
            let ingredient = $(el).text().trim();
            if (ingredient.includes('\n')) {
              ingredient = ingredient.split('\n')[0].trim();
            }
            if (ingredient && ingredient.length > 2) {
              recipe.ingredients.push(ingredient);
            }
          });
          if (recipe.ingredients.length > 0) {
            break;
          }
        }
      }
      
      // Instructions/Method - try modern selectors
      const instructionSelectors = [
        'section[data-testid="method-section"] li',
        '[data-testid="method-section"] li',
        '[data-testid="method"] li',
        '[data-testid="instructions"] li',
        '.recipe-method__list li',
        '.method-section__list li',
        '.method ul li',
        'ol li[data-testid*="method"]',
        'li[class*="method"]',
        'section:contains("Method") li',
        'section:contains("Instructions") li'
      ];
      
      
      // Try each instruction selector
      let instructions = [];
      for (const selector of instructionSelectors) {
        if (instructions.length === 0) {
          $(selector).each((i, el) => {
            let step = $(el).text().trim();
            if (step && step.length > 10) {
              // Clean up step formatting
              step = step.replace(/^step\s*\d+\s*/i, ''); // Remove "step 1", "step 2" etc.
              step = step.replace(/^\d+\s*\.?\s*/, ''); // Remove "1.", "2." etc.
              step = step.replace(/^method\s*step\s*\d+\s*/i, ''); // Remove "method step 1" etc.
              step = step.replace(/^\d+\s*of\s*\d+\s*/i, ''); // Remove "1 of 6" etc.
              
              // Capitalize first letter if it's not already
              if (step.length > 0) {
                step = step.charAt(0).toUpperCase() + step.slice(1);
              }
              
              step = step.trim();
              if (step.length > 5) { // Make sure we still have meaningful content
                instructions.push(step);
              }
            }
          });
          if (instructions.length > 0) {
            break;
          }
        }
      }
      recipe.instructions = instructions.join('\n');
      
      // Time selectors - try modern patterns
      const timeSelectors = [
        '[data-testid*="prep-time"]',
        '[data-testid*="cook-time"]', 
        '[data-testid*="time"]',
        '.recipe-details time',
        '.cook-prep-time time',
        '.timing time',
        'time[datetime]'
      ];
      
      
      // Try to find prep and cook times
      $('time').each((i, el) => {
        const text = $(el).text().toLowerCase();
        const timeMatch = text.match(/(\d+)/);
        if (timeMatch) {
          const minutes = parseInt(timeMatch[1]);
          if (text.includes('prep') && recipe.prep_time === 0) {
            recipe.prep_time = minutes;
          } else if (text.includes('cook') && recipe.cook_time === 0) {
            recipe.cook_time = minutes;
          }
        }
      });
      
      // Servings - try modern selectors
      const servingSelectors = [
        '[data-testid*="serves"]',
        '[data-testid*="serving"]',
        '.serves',
        '.servings',
        '.recipe-details .serves'
      ];
      
      
      // Try to find servings
      $('*').each((i, el) => {
        const text = $(el).text().toLowerCase();
        if (text.includes('serves') || text.includes('serving')) {
          const servingMatch = text.match(/(\d+)/);
          if (servingMatch && recipe.servings === 0) {
            recipe.servings = parseInt(servingMatch[1]);
            return false; // break
          }
        }
      });
      
      // Fallback selectors for older BBC Good Food layouts
      if (!recipe.name) {
        recipe.name = $('.recipe-header__title').text().trim() || 
                     $('[data-testid="recipe-title"]').text().trim();
      }
      
      if (recipe.ingredients.length === 0) {
        // Try fallback ingredient selectors
        const fallbackIngredientSelectors = [
          '.recipe-ingredients__list-item',
          '.ingredients li',
          '[data-testid="ingredients-list"] li'
        ];
        
        fallbackIngredientSelectors.forEach(selector => {
          if (recipe.ingredients.length === 0) {
            $(selector).each((i, el) => {
              const ingredient = $(el).text().trim();
              if (ingredient) {
                recipe.ingredients.push(ingredient);
              }
            });
          }
        });
      }
      
      if (!recipe.instructions) {
        // Try fallback instruction selectors
        const fallbackInstructionSelectors = [
          '.recipe-method__list-item',
          '.method li',
          '[data-testid="method-steps"] li'
        ];
        
        let instructions = [];
        fallbackInstructionSelectors.forEach(selector => {
          if (instructions.length === 0) {
            $(selector).each((i, el) => {
              const step = $(el).text().trim();
              if (step) {
                instructions.push(step);
              }
            });
          }
        });
        recipe.instructions = instructions.join('\n');
      }
      
    } else {
      // Generic recipe scraping for other websites
      recipe.name = $('h1').first().text().trim() || 
                   $('.recipe-title').text().trim() ||
                   $('[itemProp="name"]').text().trim();
      
      // Generic ingredient scraping - prioritize metric units
      $('li').each((i, el) => {
        const text = $(el).text().trim();
        if (text && (text.includes('g ') || text.includes('gram') || text.includes('kg') || 
                     text.includes('ml') || text.includes('litre') || text.includes('L ') ||
                     text.includes('cup') || text.includes('tbsp') || text.includes('tsp') || 
                     text.includes('oz') || /^\d/.test(text))) {
          recipe.ingredients.push(text);
        }
      });
      
      // Generic instruction scraping
      const instructionElements = $('.instructions li, .method li, .directions li, ol li');
      const instructions = [];
      instructionElements.each((i, el) => {
        const step = $(el).text().trim();
        if (step && step.length > 10) {
          instructions.push(step);
        }
      });
      recipe.instructions = instructions.join('\n');
    }
    
    // Set default values if nothing was found
    if (!recipe.name) {
      recipe.name = 'Imported Recipe';
    }
    if (recipe.ingredients.length === 0) {
      recipe.ingredients = ['Please add ingredients manually'];
    }
    if (!recipe.instructions) {
      recipe.instructions = 'Please add instructions manually';
    }
    if (recipe.servings === 0) {
      recipe.servings = 4;
    }
    
    // Convert imperial measurements to metric
    recipe = convertRecipeToMetric(recipe);
    
    res.json(recipe);
  } catch (error) {
    console.error('Scraping error:', error.message);
    res.status(500).json({ error: 'Failed to scrape recipe: ' + error.message });
  }
});

app.get('/api/weather', async (req, res) => {
  try {
    const response = await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=London&appid=YOUR_API_KEY&units=metric`);
    res.json({
      temperature: response.data.main.temp,
      description: response.data.weather[0].description,
      isHot: response.data.main.temp > 20,
      isCold: response.data.main.temp < 10
    });
  } catch (error) {
    res.json({
      temperature: 15,
      description: 'moderate',
      isHot: false,
      isCold: false
    });
  }
});

// TheMealDB API functions
async function fetchTheMealDBRecipes(count = 20) {
  const recipes = [];
  const promises = [];
  
  for (let i = 0; i < count; i++) {
    promises.push(
      fetch('https://www.themealdb.com/api/json/v1/1/random.php')
        .then(response => response.json())
        .then(data => data.meals ? transformMealDBRecipe(data.meals[0]) : null)
        .catch(() => null)
    );
  }
  
  const results = await Promise.all(promises);
  return results.filter(recipe => recipe !== null);
}

function transformMealDBRecipe(mealDBRecipe) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = mealDBRecipe[`strIngredient${i}`];
    const measure = mealDBRecipe[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      ingredients.push(`${measure ? measure.trim() + ' ' : ''}${ingredient.trim()}`);
    }
  }

  // All recipes are dinner only
  let meal_type = 'dinner';
  const category = mealDBRecipe.strCategory?.toLowerCase() || '';
  const tags = mealDBRecipe.strTags?.toLowerCase() || '';

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

  const dietary_tags = [];
  if (category.includes('vegetarian')) dietary_tags.push('vegetarian');
  if (tags && (tags.includes('quick') || tags.includes('easy'))) dietary_tags.push('quick');
  if (tags && tags.includes('healthy')) dietary_tags.push('healthy');
  if (tags && tags.includes('comfort')) dietary_tags.push('comfort');
  
  return {
    id: `themealdb-${mealDBRecipe.idMeal}`,
    name: mealDBRecipe.strMeal,
    ingredients: ingredients,
    instructions: mealDBRecipe.strInstructions,
    prep_time: 15,
    cook_time: 30,
    servings: 4,
    meal_type: meal_type,
    dietary_tags: dietary_tags,
    weather_preference: 'any',
    protein_type: protein_type,
    source: 'TheMealDB'
  };
}

app.post('/api/generate-meal-plan', async (req, res) => {
  const weekStartDate = new Date().toISOString().split('T')[0];
  
  try {
    let weatherData = {
      isHot: false,
      isCold: false,
      temperature: 15
    };
    
    try {
      const weatherResponse = await axios.get(`http://api.openweathermap.org/data/2.5/weather?q=London&appid=YOUR_API_KEY&units=metric`);
      weatherData = {
        temperature: weatherResponse.data.main.temp,
        isHot: weatherResponse.data.main.temp > 20,
        isCold: weatherResponse.data.main.temp < 10
      };
    } catch (weatherError) {
      console.log('Using default weather data');
    }
    
    // Get both user recipes and TheMealDB recipes
    const userRecipesPromise = new Promise((resolve, reject) => {
      db.all("SELECT * FROM recipes", (err, recipes) => {
        if (err) reject(err);
        else {
          const parsedRecipes = recipes.map(row => ({
            ...row,
            ingredients: JSON.parse(row.ingredients),
            dietary_tags: JSON.parse(row.dietary_tags)
          }));
          resolve(parsedRecipes);
        }
      });
    });

    const [userRecipes, themealdbRecipes] = await Promise.all([
      userRecipesPromise,
      fetchTheMealDBRecipes(30)
    ]);

    // Combine user recipes with TheMealDB recipes
    const allRecipes = [...userRecipes, ...themealdbRecipes];
    console.log(`Using ${userRecipes.length} user recipes and ${themealdbRecipes.length} TheMealDB recipes for meal planning`);
    
    const mealPlan = generateOptimizedMealPlan(allRecipes, weatherData);
    const shoppingList = generateShoppingList(mealPlan);
    
    // Only save user recipes to meal_plans table (not TheMealDB recipes)
    db.run("DELETE FROM meal_plans WHERE week_start_date = ?", [weekStartDate], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      const insertPromises = [];
      mealPlan.forEach((day, dayIndex) => {
        ['dinner'].forEach(mealType => {
          if (day[mealType] && !day[mealType].id.toString().startsWith('themealdb-')) {
            insertPromises.push(new Promise((resolve, reject) => {
              db.run(
                "INSERT INTO meal_plans (week_start_date, day_of_week, meal_type, recipe_id) VALUES (?, ?, ?, ?)",
                [weekStartDate, dayIndex, mealType, day[mealType].id],
                (err) => err ? reject(err) : resolve()
              );
            }));
          }
        });
      });
      
      Promise.all(insertPromises)
        .then(() => res.json({ mealPlan, shoppingList, weather: weatherData }))
        .catch(err => res.status(500).json({ error: err.message }));
    });
  } catch (error) {
    console.error('Error generating meal plan:', error);
    res.status(500).json({ error: 'Failed to generate meal plan' });
  }
});


app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});