# Family Meal Planner

A comprehensive web application designed to help families plan their weekly meals efficiently, taking into account dietary restrictions, weather conditions, and family composition.

## Features

### 🍽️ Smart Meal Planning
- Generates balanced weekly meal plans for breakfast and dinner
- Considers family composition (2 adults, 1 pescatarian, 1 six-year-old, 2 one-year-old twins)
- Weather-appropriate meal suggestions
- Focuses on meals that take 45 minutes or less to prepare
- Optimizes ingredient usage across multiple meals

### 👨‍👩‍👧‍👦 Family-Focused Design
- **Adult meals**: Balanced nutrition with protein, vegetables, and carbs
- **Pescatarian options**: Fish and vegetarian alternatives
- **Kid-friendly meals**: Simple, appealing dishes for children
- **Quick weekday options**: Fast meals for busy school nights
- **Weekend flexibility**: More elaborate meals when time permits

### 🌤️ Weather Integration
- Suggests hot meals for cold weather (soups, stews, comfort food)
- Recommends lighter, fresher meals for hot weather
- Adapts meal planning based on current conditions

### 📱 Recipe Management
- **Add your own recipes**: Upload custom family recipes
- **Import from URLs**: Scrape recipes from BBC Good Food and other sites
- **Categorization**: Tag recipes by meal type, dietary requirements, and weather preference
- **Sample recipes included**: Get started immediately with pre-loaded recipes

### 🛒 Smart Shopping Lists
- Automatically generates shopping lists from meal plans
- Groups ingredients by frequency of use
- Optimizes grocery shopping efficiency

## Quick Start

1. **Installation**
   ```bash
   cd meal-planner
   npm install
   cd client && npm install && cd ..
   ```

2. **Start the Application**
   ```bash
   npm start
   ```
   The app will be available at http://localhost:4006

3. **Generate Your First Meal Plan**
   - Click "Generate New Plan" to create a week's worth of meals
   - View the shopping list by clicking "Show Shopping List"
   - Add your own recipes using "Add Recipe" or "Import from URL"

## How It Works

### Meal Planning Algorithm
The app uses an intelligent algorithm that considers:
- **Protein variety**: Alternates between meat, fish, and vegetarian options
- **Preparation time**: Prioritizes quick meals on weekdays
- **Weather conditions**: Suggests appropriate meals for current weather
- **Dietary restrictions**: Ensures pescatarian options are included
- **Kid-friendly options**: Includes familiar, appealing meals for children
- **Ingredient efficiency**: Reuses ingredients across multiple meals

### Family Composition Considered
- **2 Adults**: Full variety of meals including complex flavors
- **1 Pescatarian Adult**: Fish and vegetarian options included
- **6-year-old**: Kid-friendly, simple meals prioritized
- **Twin 1-year-olds**: Soft, simple foods that can be adapted from family meals

### Recipe Categories
- **Meal Type**: Breakfast, Dinner
- **Protein Type**: Meat, Fish, Vegetarian, Vegan
- **Dietary Tags**: Quick, Kid-friendly, Healthy, Comfort, Pescatarian
- **Weather Preference**: Hot weather, Cold weather, Any weather

## Sample Recipes Included

The app comes with 7 sample recipes to get you started:
- **Breakfast**: Scrambled Eggs with Toast, Overnight Oats
- **Dinner**: Fish and Chips, Chicken Stir Fry, Vegetable Pasta, Salmon with Sweet Potato, Chicken Soup

## Adding Your Own Recipes

### Manual Entry
1. Click "Add Recipe"
2. Fill in recipe details including ingredients, instructions, timing
3. Set meal type, dietary tags, and weather preferences
4. Save to your recipe collection

### URL Import
1. Click "Import from URL"
2. Paste a recipe URL (works best with BBC Good Food)
3. Review and edit the scraped recipe details
4. Customize tags and preferences before saving

## Future Enhancements

- Real weather API integration (currently uses simulated data)
- Lunch meal planning
- Nutritional analysis
- Meal prep suggestions
- Family preference learning
- Grocery store integration
- Recipe scaling based on family size

## Technology Stack

- **Backend**: Node.js, Express, SQLite
- **Frontend**: React, CSS3
- **Recipe Scraping**: Cheerio for web scraping
- **Database**: SQLite for local data storage

## Family-Specific Features

This app is specifically designed for your family setup:
- Plans for 5 people (2 adults + 3 children)
- Accounts for one pescatarian adult
- Prioritizes simple, quick meals for busy weekdays
- Includes weather-appropriate suggestions
- Focuses on 45-minute max preparation time
- Optimizes shopping with ingredient reuse

Start planning your family's meals efficiently today!
