/**
 * Meal Planning Service
 * Generates meal plans and recipes based on user's inventory and preferences
 * Requirement 2: Meal Optimization
 */

/**
 * STEP 1: Recipe Database (Mock - can integrate with real API later)
 * Maps ingredients to potential recipes
 */
const recipeDatabase = {
  // Dairy recipes
  yogurt: [
    {
      name: "Yogurt Parfait",
      ingredients: ["yogurt", "granola", "berries"],
      time: "5 min",
      difficulty: "Easy",
      instructions: "Layer yogurt, granola, and berries in a bowl",
    },
    {
      name: "Yogurt Smoothie",
      ingredients: ["yogurt", "banana", "berries", "milk"],
      time: "10 min",
      difficulty: "Easy",
      instructions: "Blend all ingredients until smooth",
    },
    {
      name: "Tzatziki Sauce",
      ingredients: ["yogurt", "cucumber", "garlic", "dill"],
      time: "15 min",
      difficulty: "Easy",
      instructions: "Mix yogurt with grated cucumber, garlic, and dill",
    },
  ],

  // Vegetable recipes
  carrots: [
    {
      name: "Carrot Stir Fry",
      ingredients: ["carrots", "oil", "garlic", "soy sauce"],
      time: "15 min",
      difficulty: "Easy",
      instructions: "Stir fry sliced carrots with garlic and soy sauce",
    },
    {
      name: "Carrot Soup",
      ingredients: ["carrots", "onion", "vegetable broth", "cream"],
      time: "30 min",
      difficulty: "Medium",
      instructions: "Boil carrots and onion, blend with broth and cream",
    },
    {
      name: "Raw Carrot Salad",
      ingredients: ["carrots", "apple", "lemon juice", "oil"],
      time: "10 min",
      difficulty: "Easy",
      instructions: "Shred carrots and apples, dress with lemon and oil",
    },
  ],

  // Grain recipes
  rice: [
    {
      name: "Vegetable Fried Rice",
      ingredients: ["rice", "carrots", "peas", "eggs", "soy sauce"],
      time: "20 min",
      difficulty: "Easy",
      instructions: "Stir fry cooked rice with vegetables and soy sauce",
    },
    {
      name: "Rice Bowl",
      ingredients: ["rice", "vegetables", "protein", "sauce"],
      time: "25 min",
      difficulty: "Easy",
      instructions: "Serve rice topped with vegetables and protein",
    },
  ],

  // Fruit recipes
  apples: [
    {
      name: "Apple Crisp",
      ingredients: ["apples", "oats", "butter", "cinnamon"],
      time: "30 min",
      difficulty: "Medium",
      instructions: "Bake sliced apples with oat topping",
    },
    {
      name: "Apple Smoothie",
      ingredients: ["apples", "yogurt", "honey"],
      time: "10 min",
      difficulty: "Easy",
      instructions: "Blend apple with yogurt and honey",
    },
  ],
};

/**
 * STEP 2: Score Recipes by Inventory Match
 * Higher score = more ingredients available
 */
function scoreRecipeMatch(recipe, userInventory) {
  const inventoryNames = userInventory.map((item) =>
    item.name.toLowerCase()
  );

  const matchedIngredients = recipe.ingredients.filter((ing) =>
    inventoryNames.some((inv) => inv.includes(ing.toLowerCase()))
  );

  const matchScore = (matchedIngredients.length / recipe.ingredients.length) * 100;

  return {
    recipe: recipe.name,
    matchScore: Math.round(matchScore),
    matchedIngredients,
    missingIngredients: recipe.ingredients.filter(
      (ing) =>
        !inventoryNames.some((inv) => inv.includes(ing.toLowerCase()))
    ),
    ...recipe,
  };
}

/**
 * STEP 3: Generate Meal Plan
 * Creates a prioritized meal plan based on expiring items
 */
function generateMealPlan(userInventory, preferences = []) {
  // Step 1: Prioritize items by expiration
  const sortedByExpiry = [...userInventory].sort(
    (a, b) => new Date(a.expiry) - new Date(b.expiry)
  );

  // Step 2: Find recipes using high-priority items
  const recommendedMeals = [];

  for (const item of sortedByExpiry) {
    const itemRecipes = recipeDatabase[item.name.toLowerCase()] || [];

    for (const recipe of itemRecipes) {
      const scoredRecipe = scoreRecipeMatch(recipe, userInventory);

      // Only recommend if at least 50% of ingredients match
      if (scoredRecipe.matchScore >= 50) {
        recommendedMeals.push({
          ...scoredRecipe,
          urgency: calculateUrgency(item.daysLeft),
          focusItem: item.name,
        });
      }
    }
  }

  // Step 3: Sort by urgency and match score
  recommendedMeals.sort((a, b) => {
    if (a.urgency !== b.urgency) {
      return b.urgency - a.urgency; // Higher urgency first
    }
    return b.matchScore - a.matchScore; // Higher match second
  });

  // Step 4: Filter by dietary preferences
  const filteredMeals = recommendedMeals.filter((meal) => {
    // If no preferences, include all
    if (preferences.length === 0) return true;

    // Check if meal fits preferences
    const vegetarian = preferences.includes("Vegetarian");
    const vegan = preferences.includes("Vegan");
    const glutenFree = preferences.includes("Gluten-Free");

    // Simple heuristic checks
    if (vegetarian && meal.ingredients.includes("meat")) return false;
    if (vegan && (meal.ingredients.includes("dairy") || meal.ingredients.includes("meat"))) {
      return false;
    }

    return true;
  });

  return {
    totalRecommendations: filteredMeals.length,
    mealPlan: filteredMeals.slice(0, 5), // Top 5 recommendations
    summary: `Found ${filteredMeals.length} recipes to use your expiring items`,
  };
}

/**
 * STEP 4: Calculate Urgency Score
 * Items expiring sooner = higher urgency
 */
function calculateUrgency(daysLeft) {
  if (daysLeft <= 1) return 100; // Use today!
  if (daysLeft <= 2) return 80; // Use tomorrow
  if (daysLeft <= 3) return 60; // Use this week
  if (daysLeft <= 7) return 40; // Use soon
  return 20; // Low priority
}

/**
 * STEP 5: Generate Weekly Meal Plan
 * Creates a 7-day plan with shopping list
 */
function generateWeeklyMealPlan(userInventory, mealCount = 7) {
  const mealPlan = generateMealPlan(userInventory);
  const selectedMeals = mealPlan.mealPlan.slice(0, mealCount);

  // Generate shopping list for missing ingredients
  const shoppingList = {};

  selectedMeals.forEach((meal) => {
    meal.missingIngredients.forEach((ingredient) => {
      if (shoppingList[ingredient]) {
        shoppingList[ingredient]++;
      } else {
        shoppingList[ingredient] = 1;
      }
    });
  });

  return {
    weeklyPlan: selectedMeals.map((meal, index) => ({
      day: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][
        index
      ],
      meal: meal.recipe,
      time: meal.time,
      difficulty: meal.difficulty,
      focusItem: meal.focusItem,
    })),
    shoppingList: Object.entries(shoppingList).map(([item, count]) => ({
      item,
      quantity: count,
    })),
    totalMeals: selectedMeals.length,
  };
}

/**
 * STEP 6: Get Recipe Details
 * Full recipe information for a specific meal
 */
function getRecipeDetails(mealName) {
  for (const categoryRecipes of Object.values(recipeDatabase)) {
    const recipe = categoryRecipes.find(
      (r) => r.name.toLowerCase() === mealName.toLowerCase()
    );
    if (recipe) {
      return {
        success: true,
        recipe: recipe,
      };
    }
  }

  return {
    success: false,
    message: `Recipe for "${mealName}" not found`,
  };
}

/**
 * STEP 7: Get Recipes by Ingredient
 * Find all recipes that use a specific ingredient
 */
function getRecipesByIngredient(ingredient) {
  const recipes = [];

  for (const [, categoryRecipes] of Object.entries(recipeDatabase)) {
    categoryRecipes.forEach((recipe) => {
      if (
        recipe.ingredients.some((ing) =>
          ing.toLowerCase().includes(ingredient.toLowerCase())
        )
      ) {
        recipes.push(recipe);
      }
    });
  }

  return {
    ingredient,
    count: recipes.length,
    recipes: recipes,
  };
}

module.exports = {
  generateMealPlan,
  generateWeeklyMealPlan,
  getRecipeDetails,
  getRecipesByIngredient,
  scoreRecipeMatch,
  calculateUrgency,
};
