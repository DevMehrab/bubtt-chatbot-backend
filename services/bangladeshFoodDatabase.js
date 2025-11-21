/**
 * Bangladesh Food Dataset & Context
 * Culturally relevant, locally-specific food waste reduction tips
 */

const bangladeshFoodDatabase = {
  // Local Bangladeshi foods
  commonFoods: {
    rice: {
      name: "চাল (Chal)",
      bengaliName: "Rice",
      storageTime: "3-4 months",
      tips: "Keep in airtight container to prevent moisture and insects",
      wasteReduction: "Use leftover rice for fried rice, rice pudding, or puffed rice snacks",
      nutrients: "Carbohydrates, energy",
      budget: "Very affordable - 50-80 BDT/kg",
      environmental: "Reduces waste; rice water can be used for plants"
    },
    dal: {
      name: "ডাল (Dal)",
      bengaliName: "Lentils",
      storageTime: "1 year",
      tips: "Store in cool, dry place in sealed containers",
      wasteReduction: "Use for dal curry, dal vada, mixed vegetable curry",
      nutrients: "Protein, fiber, iron - essential for vegetarians",
      budget: "50-120 BDT/kg depending on type",
      environmental: "High protein alternatives reduce meat consumption"
    },
    eggplant: {
      name: "বেগুন (Begun)",
      bengaliName: "Eggplant",
      storageTime: "4-5 days",
      tips: "Store at room temperature or refrigerate for longer life",
      wasteReduction: "Begun barta, fried begun, curry, pickle",
      nutrients: "Low calorie, fiber, antioxidants",
      budget: "30-50 BDT/kg, seasonal",
      environmental: "Local, seasonal produce reduces carbon footprint"
    },
    pumpkin: {
      name: "কুমড়া (Kumra)",
      bengaliName: "Pumpkin",
      storageTime: "2-3 weeks",
      tips: "Store in cool, dark place",
      wasteReduction: "Use seeds for snacks, leaves in curry, flesh in various dishes",
      nutrients: "Beta-carotene, vitamin C, fiber",
      budget: "20-40 BDT/kg",
      environmental: "High yield crop, minimal waste"
    },
    spinach: {
      name: "পালং শাক (Palong Shak)",
      bengaliName: "Spinach",
      storageTime: "3-4 days",
      tips: "Keep in refrigerator, wash before use",
      wasteReduction: "Fresh salad, cooked curry, smoothies, store excess as freeze-dried",
      nutrients: "Iron, calcium, antioxidants",
      budget: "30-60 BDT/bunch",
      environmental: "Highly nutritious, minimal processing needed"
    },
    chicken: {
      name: "মুরগি (Murgi)",
      bengaliName: "Chicken",
      storageTime: "2-3 days fresh, months if frozen",
      tips: "Keep refrigerated or frozen immediately after purchase",
      wasteReduction: "Use bones for stock, liver for curry, every part utilizable",
      nutrients: "High protein, B vitamins",
      budget: "250-350 BDT/kg",
      environmental: "Use whole chicken - less packaging, no waste"
    },
    fish: {
      name: "মাছ (Mach)",
      bengaliName: "Fish",
      storageTime: "1-2 days fresh, months if frozen",
      tips: "Buy fresh from local markets, keep on ice",
      wasteReduction: "Use head/bones for broth, every part edible",
      nutrients: "Omega-3, high protein, calcium",
      budget: "150-400 BDT/kg depending on type",
      environmental: "Seasonal fish preferred, supports local fisheries"
    }
  },

  // Local Bangladeshi Recipes & Leftovers
  leftoverRecipes: {
    staleRice: [
      {
        recipe: "খিচুড়ি (Khichuri)",
        description: "Mixed rice and lentils comfort food",
        ingredients: "Stale rice, dal, vegetables, spices",
        carbonEmission: "Low - single pot cooking",
        timeToPrepare: "30 minutes"
      },
      {
        recipe: "ভাত ভাজা (Rice Fry)",
        description: "Fried rice with vegetables",
        ingredients: "Stale rice, eggs, vegetables, soy sauce",
        carbonEmission: "Low - quick cooking",
        timeToPrepare: "15 minutes"
      },
      {
        recipe: "মুড়ি (Muri) - Puffed Rice",
        description: "Crispy snack from old rice",
        ingredients: "Old rice, salt, oil",
        carbonEmission: "Low - traditional drying",
        timeToPrepare: "Variable"
      },
      {
        recipe: "পায়েস (Payesh)",
        description: "Traditional rice pudding dessert",
        ingredients: "Stale rice, milk, sugar, dates, raisins",
        carbonEmission: "Medium - milk-based",
        timeToPrepare: "45 minutes"
      }
    ],
    staleBread: [
      {
        recipe: "পাউরুটির ভুনো (Bread Pudding)",
        description: "Bengali-style bread pudding",
        ingredients: "Stale bread, eggs, milk, jaggery",
        carbonEmission: "Low",
        timeToPrepare: "40 minutes"
      }
    ],
    vegetableScraps: [
      {
        recipe: "সবজির ঝোল (Vegetable Broth)",
        description: "Nutritious vegetable stock",
        ingredients: "Vegetable scraps, spices, water",
        carbonEmission: "Very low",
        timeToPrepare: "30 minutes"
      }
    ]
  },

  // Food Sharing Networks in Bangladesh
  foodSharingPlatforms: [
    {
      name: "খাদ্য শেয়ার নেটওয়ার্ক",
      description: "Local food sharing communities",
      cities: ["Dhaka", "Chittagong", "Sylhet", "Khulna"],
      benefits: "Community connection, reduce waste, help underprivileged",
      howToJoin: "Contact local NGOs or community centers"
    },
    {
      name: "বাজার কালচার",
      description: "Market culture communities sharing excess",
      cities: ["All major cities"],
      benefits: "Support local vendors, reduce market waste",
      howToJoin: "Coordinate with local market associations"
    }
  ],

  // Environmental Impact Education
  environmentalImpact: {
    foodWaste: {
      stats: "In Bangladesh, ~5-10 million tons of food wasted annually",
      impact: "Methane emission, landfill space, water pollution",
      reduction: "Even 10% reduction saves 500,000+ tons annually",
      personalImpact: "Reducing 1kg food waste = 2.5kg CO2 prevented"
    },
    seasonalProduction: {
      description: "Bangladesh has rich seasonal produce cycles",
      benefit: "Eating seasonal reduces transportation, costs, waste",
      summer: ["Mango", "Watermelon", "Cucumber", "Pumpkin"],
      winter: ["Spinach", "Cabbage", "Carrot", "Cauliflower"],
      monsoon: ["Fish", "Rice", "Green vegetables"]
    },
    budgetImpact: {
      description: "Food waste directly affects household budget",
      averageWaste: "5-15% of monthly food budget wasted",
      savingPotential: "Proper planning saves 2000-5000 BDT monthly",
      beneficiaries: "Low-income families, large households"
    }
  },

  // Budget-Friendly Meal Plans (Bangladesh context)
  budgetMealPlans: {
    veryLowBudget: {
      dailyBudget: "100-150 BDT",
      meals: ["Rice + Dal + Salt", "Rice + Vegetable + Spices"],
      tips: "Buy from local markets, bulk seasonal produce",
      nutrition: "Meets basic caloric needs"
    },
    lowBudget: {
      dailyBudget: "150-250 BDT",
      meals: [
        "Rice + Dal + Vegetable",
        "Rice + Fish/Egg + Vegetable",
        "Khichuri with vegetables"
      ],
      tips: "Mix proteins, use seasonal vegetables",
      nutrition: "Balanced nutrition, diverse diet"
    },
    moderateBudget: {
      dailyBudget: "250-400 BDT",
      meals: [
        "Chicken/Meat curry with rice",
        "Fish with vegetable",
        "Mixed pulse dishes"
      ],
      tips: "Include lean proteins, seasonal variety",
      nutrition: "High protein, micronutrient-rich"
    }
  },

  // Nutrition Balancing Tips (Bangladesh specific)
  nutritionTips: {
    proteinSources: [
      { source: "Dal", cost: "Lowest", type: "Plant-based" },
      { source: "Fish", cost: "Low-Medium", type: "Omega-3 rich" },
      { source: "Eggs", cost: "Low", type: "Complete protein" },
      { source: "Chicken", cost: "Medium", type: "Lean protein" }
    ],
    vegetableVariety: {
      tips: "Rotate seasonal vegetables for different nutrients",
      example: "Mon: Spinach, Tue: Eggplant, Wed: Pumpkin, Thu: Cabbage"
    },
    deficiencyPrevention: {
      iron: "Use spinach, dal, fish - especially for women",
      calcium: "Milk, fish with bones, leafy greens",
      vitaminA: "Pumpkin, carrots, dark leafy greens",
      iodine: "Use iodized salt consistently"
    }
  }
};

module.exports = bangladeshFoodDatabase;
