/**
 * Analytics Service
 * Calculates:
 * 1. Waste Estimation (Requirement 5)
 * 2. SDG Impact Score (Requirement 7)
 * 3. AI Insights via LLM prompt injection
 */

/**
 * STEP 1: Calculate Historical Waste & Risk Analysis
 * @param {Array} history - User's consumption history
 * @param {Array} inventory - Current inventory items
 * @param {String} todayString - Today's date (ISO format, e.g., "2025-11-21")
 * @returns {Object} { totalWastedMoney, riskValue, riskItems }
 */
function calculateWasteMetrics(history, inventory, todayString = "2025-11-21") {
  // 1. Calculate Historical Waste
  const totalWastedMoney = history
    .filter((item) => item.status === "wasted")
    .reduce((sum, item) => sum + item.price, 0);

  // 2. Predict Future Waste (Risk Analysis)
  const today = new Date(todayString);
  let riskValue = 0;
  const riskItems = [];

  for (const item of inventory) {
    const expiry = new Date(item.expiry);
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    // If expires in 2 days or less, it's High Risk
    if (daysLeft <= 2 && daysLeft > 0) {
      riskValue += item.price * item.quantity;
      riskItems.push({
        name: item.name || item.item,
        daysLeft,
        riskPrice: item.price * item.quantity,
      });
    }
  }

  return {
    totalWastedMoney: parseFloat(totalWastedMoney.toFixed(2)),
    riskValue: parseFloat(riskValue.toFixed(2)),
    riskItems,
    riskItemNames: riskItems.map((i) => i.name),
  };
}

/**
 * STEP 2: Calculate SDG Impact Score (0-100)
 * Formula: (Consumed Items / Total Items) * 100
 * @param {Array} history - User's consumption history
 * @returns {Object} { sdgScore, successRate, wastedCount, consumedCount }
 */
function calculateSDGScore(history) {
  if (!history || history.length === 0) {
    return {
      sdgScore: 50, // Baseline score
      successRate: 0,
      wastedCount: 0,
      consumedCount: 0,
      totalItems: 0,
    };
  }

  const wastedCount = history.filter((item) => item.status === "wasted").length;
  const consumedCount = history.filter(
    (item) => item.status === "consumed"
  ).length;
  const totalItems = history.length;

  // Calculate success rate (items consumed / total)
  const successRate = Math.round((consumedCount / totalItems) * 100);

  // Simple score: percentage of food saved (consumed)
  const sdgScore = successRate;

  return {
    sdgScore,
    successRate,
    wastedCount,
    consumedCount,
    totalItems,
  };
}

/**
 * STEP 3: Generate AI-powered Insights
 * This creates a prompt for the LLM (OpenAI, Anthropic, etc.)
 * @param {Object} metrics - { sdgScore, riskItems, totalWasted }
 * @returns {String} System prompt ready to send to LLM
 */
function generateInsightPrompt(metrics) {
  const { sdgScore, riskItems, totalWastedMoney, wastedCount, consumedCount } =
    metrics;

  return `
You are a helpful sustainability coach for food waste reduction. 

User Sustainability Profile:
- SDG Impact Score: ${sdgScore}/100
- Items Wasted This Week: ${wastedCount}
- Items Consumed This Week: ${consumedCount}
- Money Lost to Waste: $${totalWastedMoney}
- Items Expiring Soon (High Risk): ${riskItems.length > 0 ? riskItems.join(", ") : "None"}

Your task:
1. Give a 1-sentence comment on their SDG score (be honest but encouraging)
2. Provide 1 specific, actionable tip to save money or reduce waste
3. If there are expiring items, suggest a specific recipe or meal using them
4. Be brief, friendly, and motivating

Format your response as a chat message, not a list.
`;
}

/**
 * STEP 4: Format All Metrics for Display
 * @param {Object} wasteMetrics - Output from calculateWasteMetrics()
 * @param {Object} sdgMetrics - Output from calculateSDGScore()
 * @returns {Object} Combined metrics object
 */
function formatMetricsForDisplay(wasteMetrics, sdgMetrics) {
  return {
    sdgScore: sdgMetrics.sdgScore,
    totalWastedMoney: wasteMetrics.totalWastedMoney,
    riskValue: wasteMetrics.riskValue,
    riskItems: wasteMetrics.riskItems,
    wastedCount: sdgMetrics.wastedCount,
    consumedCount: sdgMetrics.consumedCount,
    totalLoggedItems: sdgMetrics.totalItems,
    successRate: sdgMetrics.successRate,
    scoreInterpretation: interpretSDGScore(sdgMetrics.sdgScore),
  };
}

/**
 * Helper: Interpret SDG Score
 */
function interpretSDGScore(score) {
  if (score >= 85) return "Excellent! You're a waste-fighting champion! 🌱";
  if (score >= 70) return "Great! You're doing well with food sustainability. 👍";
  if (score >= 50)
    return "Good effort! There's room to improve your waste habits. 💪";
  return "Time to make a change! Let's reduce that waste. 🎯";
}

/**
 * ENHANCED: Calculate Nutrition Score based on consumed items
 * Analyzes variety and nutritional diversity
 * @param {Array} history - User's consumption history
 * @returns {Object} { nutritionScore, categories, suggestions }
 */
function calculateNutritionScore(history) {
  if (!history || history.length === 0) {
    return {
      nutritionScore: 50,
      categories: { fruits: 0, vegetables: 0, proteins: 0, grains: 0, dairy: 0 },
      totalConsumed: 0,
      suggestions: ["Add more vegetables", "Include proteins", "Eat whole grains"],
    };
  }

  const consumedItems = history.filter((item) => item.status === "consumed");

  // Categorize foods
  const categories = {
    fruits: 0,
    vegetables: 0,
    proteins: 0,
    grains: 0,
    dairy: 0,
  };

  const fruitKeywords = ["apple", "orange", "banana", "berries", "mango", "grape"];
  const vegKeywords = ["carrot", "lettuce", "broccoli", "spinach", "tomato", "cucumber"];
  const proteinKeywords = ["egg", "chicken", "fish", "meat", "tofu", "bean", "lentil"];
  const grainKeywords = ["bread", "rice", "wheat", "oat", "pasta", "cereal"];
  const dairyKeywords = ["milk", "cheese", "yogurt", "butter"];

  for (const item of consumedItems) {
    const itemName = (item.name || item.item || "").toLowerCase();

    if (fruitKeywords.some((k) => itemName.includes(k))) {
      categories.fruits++;
    } else if (vegKeywords.some((k) => itemName.includes(k))) {
      categories.vegetables++;
    } else if (proteinKeywords.some((k) => itemName.includes(k))) {
      categories.proteins++;
    } else if (grainKeywords.some((k) => itemName.includes(k))) {
      categories.grains++;
    } else if (dairyKeywords.some((k) => itemName.includes(k))) {
      categories.dairy++;
    }
  }

  // Calculate nutrition score (0-100)
  // Ideal: 20% each category
  const maxPerCategory = Math.ceil(consumedItems.length / 5);
  let nutritionScore = 0;

  Object.values(categories).forEach((count) => {
    const categoryScore = Math.min((count / maxPerCategory) * 100, 100);
    nutritionScore += categoryScore / 5;
  });

  nutritionScore = Math.round(nutritionScore);

  // Generate suggestions
  const suggestions = [];
  if (categories.vegetables < maxPerCategory / 2)
    suggestions.push("Boost vegetables to 25% of meals");
  if (categories.fruits < maxPerCategory / 2)
    suggestions.push("Add more fruits for vitamins");
  if (categories.proteins < maxPerCategory / 2)
    suggestions.push("Include proteins in every meal");
  if (categories.grains < maxPerCategory / 2)
    suggestions.push("Choose whole grains");
  if (categories.dairy < maxPerCategory / 3)
    suggestions.push("Add dairy for calcium");

  return {
    nutritionScore,
    categories,
    totalConsumed: consumedItems.length,
    suggestions: suggestions.length > 0 ? suggestions : ["Great variety! Keep it up!"],
  };
}

/**
 * ENHANCED: Generate Weekly Insights
 * Compares this week with previous weeks and provides insights
 * @param {Array} history - Complete consumption history
 * @param {Object} currentMetrics - Current week's metrics
 * @returns {Object} { weeklyChange, insights, improvements }
 */
function generateWeeklyInsights(history, currentMetrics) {
  const { sdgScore, wastedCount, consumedCount } = currentMetrics;

  // Split history into weeks (simplified: last 2 weeks)
  const twoWeeksAgo = history.slice(0, Math.ceil(history.length / 2));
  const thisWeek = history.slice(Math.ceil(history.length / 2));

  // Calculate previous week metrics
  const prevMetrics = calculateSDGScore(twoWeeksAgo);
  const scoreImprovement = sdgScore - prevMetrics.sdgScore;

  // Waste trend
  const prevWasted = twoWeeksAgo.filter((i) => i.status === "wasted").length;
  const wasteReduction = prevWasted - wastedCount;

  // Generate insights
  const insights = [];

  if (scoreImprovement > 0) {
    insights.push(`🎉 Great job! Your score improved by ${scoreImprovement}% this week!`);
  } else if (scoreImprovement < 0) {
    insights.push(`⚠️ Your score dropped by ${Math.abs(scoreImprovement)}%. Let's improve!`);
  } else {
    insights.push(`📊 Your score remained stable this week.`);
  }

  if (wasteReduction > 0) {
    insights.push(`✅ You wasted ${wasteReduction} fewer items than last week!`);
  } else if (wasteReduction < 0) {
    insights.push(`❌ You wasted ${Math.abs(wasteReduction)} more items. Let's focus on reducing waste.`);
  }

  if (consumedCount > prevMetrics.consumedCount) {
    insights.push(
      `💪 You consumed ${consumedCount - prevMetrics.consumedCount} more items this week!`
    );
  }

  return {
    weeklyChange: scoreImprovement,
    wasteReduction,
    insights,
    previousScore: prevMetrics.sdgScore,
    currentScore: sdgScore,
  };
}

/**
 * ENHANCED: Generate Actionable Recommendations
 * Provides specific steps to improve SDG score
 * @param {Object} sdgMetrics - SDG metrics
 * @param {Object} nutritionMetrics - Nutrition metrics
 * @returns {Object} { recommendations, potentialImprovement }
 */
function generateActionableRecommendations(sdgMetrics, nutritionMetrics) {
  const recommendations = [];
  const { sdgScore } = sdgMetrics;
  const { nutritionScore, categories, suggestions } = nutritionMetrics;

  let potentialImprovement = 0;

  // Focus on waste reduction (biggest impact)
  const wasteReductionPotential = Math.min(
    (sdgMetrics.wastedCount * 10),
    100 - sdgScore
  );
  if (wasteReductionPotential > 0) {
    recommendations.push({
      action: "Focus on waste reduction",
      description: `Reduce waste by 25% to boost your score by ${Math.round(
        wasteReductionPotential * 0.25
      )}%`,
      impact: Math.round(wasteReductionPotential * 0.25),
      priority: "HIGH",
      steps: [
        "Check fridge daily for expiring items",
        "Plan meals with expiring items first",
        "Use NOURISHBOT's meal suggestions",
      ],
    });
    potentialImprovement += wasteReductionPotential * 0.25;
  }

  // Nutrition improvement
  const nutritionPotential = 100 - nutritionScore;
  if (nutritionPotential > 15) {
    recommendations.push({
      action: "Improve nutrition diversity",
      description: `${suggestions[0]} to boost nutrition score by ${Math.round(
        nutritionPotential * 0.3
      )}%`,
      impact: Math.round(nutritionPotential * 0.3),
      priority: "MEDIUM",
      steps: suggestions.slice(0, 2),
    });
    potentialImprovement += nutritionPotential * 0.15;
  }

  // Category-specific recommendations
  if (categories.vegetables < 2) {
    recommendations.push({
      action: "Add more vegetables",
      description: "Boost SDG score by 10% with vegetable-based meals",
      impact: 10,
      priority: "HIGH",
      steps: [
        "Try carrot salad",
        "Make veggie stir-fry",
        "Add veggies to every meal",
      ],
    });
    potentialImprovement += 10;
  }

  if (categories.proteins < 2) {
    recommendations.push({
      action: "Include more proteins",
      description: "Protein-rich meals reduce waste by 15%",
      impact: 15,
      priority: "MEDIUM",
      steps: [
        "Add eggs to breakfast",
        "Include beans in lunch",
        "Choose protein for dinner",
      ],
    });
    potentialImprovement += 5;
  }

  // Cap potential improvement at realistic level
  potentialImprovement = Math.min(potentialImprovement, 30);

  return {
    recommendations: recommendations.slice(0, 3), // Top 3 recommendations
    potentialImprovement: Math.round(potentialImprovement),
    estimatedNewScore: Math.min(sdgScore + Math.round(potentialImprovement), 100),
  };
}

/**
 * ENHANCED: Complete SDG Profile
 * Combines all metrics into comprehensive profile
 * @param {Array} history - User's consumption history
 * @param {Array} inventory - Current inventory
 * @returns {Object} Complete SDG profile
 */
function generateCompleteSDGProfile(history, inventory, todayString = "2025-11-21") {
  const wasteMetrics = calculateWasteMetrics(history, inventory, todayString);
  const sdgMetrics = calculateSDGScore(history);
  const nutritionMetrics = calculateNutritionScore(history);
  const weeklyInsights = generateWeeklyInsights(history, sdgMetrics);
  const recommendations = generateActionableRecommendations(
    sdgMetrics,
    nutritionMetrics
  );

  return {
    personalSDGScore: sdgMetrics.sdgScore,
    scoreInterpretation: interpretSDGScore(sdgMetrics.sdgScore),
    waste: {
      totalWastedMoney: wasteMetrics.totalWastedMoney,
      riskValue: wasteMetrics.riskValue,
      riskItems: wasteMetrics.riskItems,
      successRate: sdgMetrics.successRate,
    },
    nutrition: {
      score: nutritionMetrics.nutritionScore,
      breakdown: nutritionMetrics.categories,
      suggestions: nutritionMetrics.suggestions,
    },
    weeklyInsights: {
      change: weeklyInsights.weeklyChange,
      insights: weeklyInsights.insights,
      wasteReduction: weeklyInsights.wasteReduction,
    },
    recommendations: recommendations.recommendations,
    potentialImprovement: recommendations.potentialImprovement,
    estimatedNewScore: recommendations.estimatedNewScore,
    metrics: {
      itemsConsumed: sdgMetrics.consumedCount,
      itemsWasted: sdgMetrics.wastedCount,
      totalItems: sdgMetrics.totalItems,
    },
  };
}

module.exports = {
  calculateWasteMetrics,
  calculateSDGScore,
  calculateNutritionScore,
  generateInsightPrompt,
  formatMetricsForDisplay,
  interpretSDGScore,
  generateWeeklyInsights,
  generateActionableRecommendations,
  generateCompleteSDGProfile,
};
