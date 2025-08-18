const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const axios = require('axios');
const cheerio = require('cheerio');
const { generateOptimizedMealPlan, generateShoppingList, addSampleRecipes } = require('./meal-planning-engine');
const { convertRecipeToMetric } = require('./metric-converter');

const app = express();
const PORT = process.env.PORT || 4006;

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
    
    db.all("SELECT * FROM recipes", (err, recipes) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      const parsedRecipes = recipes.map(row => ({
        ...row,
        ingredients: JSON.parse(row.ingredients),
        dietary_tags: JSON.parse(row.dietary_tags)
      }));
      
      const mealPlan = generateOptimizedMealPlan(parsedRecipes, weatherData);
      const shoppingList = generateShoppingList(mealPlan);
      
      db.run("DELETE FROM meal_plans WHERE week_start_date = ?", [weekStartDate], (err) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        const insertPromises = [];
        mealPlan.forEach((day, dayIndex) => {
          ['breakfast', 'dinner'].forEach(mealType => {
            if (day[mealType]) {
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
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate meal plan' });
  }
});


app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});