/**
 * NourishAI Chatbot Server - Enhanced with User Accounts & Conversation Persistence
 * Express API with Gemini 2.0 Flash, user profiles, and conversation history
 */

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini API
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || "AIzaSyDaB12Xx2tqyV2g0VcKZlwx1_EvZM52y8g";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Import services
const UserManager = require("./services/userManager");
const PromptChainBuilder = require("./services/promptChainBuilder");
const bangladeshFoodDatabase = require("./services/bangladeshFoodDatabase");
const {
  getUserContext,
  buildSystemPrompt,
  detectIntent,
  buildUserMessage,
} = require("./services/chatbotService");
const {
  calculateWasteMetrics,
  calculateSDGScore,
  formatMetricsForDisplay,
  generateCompleteSDGProfile,
  calculateNutritionScore,
} = require("./services/analyticsService");
const {
  generateMealPlan,
  generateWeeklyMealPlan,
  getRecipeDetails,
  getRecipesByIngredient,
} = require("./services/mealPlanningService");
const {
  processImageForInventory,
  batchProcessImages,
} = require("./services/visionService");

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: "https://devmehrab.github.io/bubt-chatbot-frontend/",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); // Serve static files from public folder

// ============================================================================
// ROOT & HEALTH CHECK
// ============================================================================

app.get("/", (req, res) => {
  res.json({
    name: "🌿 NourishAI Chatbot API",
    version: "1.0.0",
    status: "✅ Running",
    description: "AI-powered food waste reduction chatbot",
    baseUrl: "https://dashboard.render.com/web/srv-d4g80sali9vc73d35vm0",
    documentation: {
      chat: "POST /api/chat - Send message to chatbot",
      analytics: "GET /api/user/:userId/analytics - Get sustainability metrics",
      sdgProfile:
        "GET /api/user/:userId/sdg-profile - Complete SDG impact scoring with insights",
      sdgInsights: "POST /api/user/:userId/sdg-insights - Weekly AI insights",
      inventory: "GET /api/user/:userId/inventory - View current inventory",
      mealPlan: "GET /api/user/:userId/meal-plan - Generate meal plan",
      health: "GET /health - Health check",
    },
    endpoints: [
      "POST   /api/chat",
      "GET    /api/health",
      "GET    /api/user/:userId/analytics",
      "GET    /api/user/:userId/sdg-profile  (NEW! Enhanced SDG scoring)",
      "POST   /api/user/:userId/sdg-insights (NEW! Weekly insights)",
      "GET    /api/user/:userId/inventory",
      "POST   /api/user/:userId/inventory",
      "POST   /api/user/:userId/log",
      "GET    /api/user/:userId/logs",
      "GET    /api/user/:userId",
      "GET    /api/user/:userId/meal-plan",
      "GET    /api/user/:userId/weekly-meal-plan",
      "GET    /api/recipe/:recipeName",
      "GET    /api/recipes/by-ingredient/:ingredient",
      "POST   /api/user/:userId/analyze-image",
      "POST   /api/user/:userId/analyze-images",
    ],
    sdgFeatures: {
      personalSDGScore: "0-100 scale based on waste reduction & nutrition",
      nutritionTracking:
        "Analyzes dietary variety (fruits, veggies, proteins, grains, dairy)",
      weeklyInsights: "Compares progress week-over-week with AI commentary",
      actionableRecommendations:
        "Specific steps to improve score (e.g., +10% for focusing on veggies)",
      unGoals: [
        "Goal #2: Zero Hunger",
        "Goal #12: Responsible Consumption & Production",
      ],
    },
    timestamp: new Date(),
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "✅ NourishAI Chatbot is running",
    timestamp: new Date(),
  });
});

// ============================================================================
// CHATBOT ENDPOINTS
// ============================================================================

/**
 * POST /api/chat
 * Send a message and get a response using Gemini API with user context
 *
 * Request body:
 * {
 *   "userId": "user123",
 *   "message": "What should I cook?",
 *   "preferences": { "budget": "low", "familySize": 4 } // Optional: set user preferences
 * }
 */
app.post("/api/chat", async (req, res) => {
  try {
    const { userId, message, preferences } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        error: "Missing userId or message",
      });
    }

    // Create/get user account
    let user = UserManager.createUser(userId, preferences);

    // Update preferences if provided
    if (preferences) {
      user = UserManager.updateUserPreferences(userId, preferences);
    }

    // Get user context
    const userContext = UserManager.getUserContext(userId);

    // Detect intent
    const intent = PromptChainBuilder.detectIntent(message);

    // Build comprehensive system prompt
    const systemPrompt = PromptChainBuilder.buildContextualPrompt(
      intent,
      userContext,
      message
    );

    // Build conversation history for Gemini (fix conversation history format)
    const conversationHistory = UserManager.getConversationHistory(userId, 5);
    const geminiHistory = [];

    // Build proper alternating history
    for (let i = 0; i < conversationHistory.length; i++) {
      const conv = conversationHistory[i];

      // Add user message
      geminiHistory.push({
        role: "user",
        parts: [{ text: conv.userMessage }],
      });

      // Add bot response
      geminiHistory.push({
        role: "model",
        parts: [{ text: conv.botResponse }],
      });
    }

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Start chat with history (exclude current message which will be sent next)
    const chat = model.startChat({
      history: geminiHistory,
    });

    // Send message with enhanced prompt
    const fullPrompt = `${systemPrompt}\n\nUser: ${message}`;
    const result = await chat.sendMessage(fullPrompt);
    const botResponse = result.response.text();

    // Save conversation to user history
    UserManager.saveConversation(userId, message, botResponse, intent);

    // Return response with full user context
    res.json({
      success: true,
      message: botResponse,
      intent: intent,
      userId: userId,
      userContext: {
        budget: user.preferences.budget,
        familySize: user.preferences.familySize,
        sdgScore: user.statistics.sdgScore,
      },
      metadata: {
        timestamp: new Date(),
        conversationCount: user.statistics.messagesCount,
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      error: "Failed to generate response",
      message: error.message,
    });
  }
});

/**
 * GET /api/chat/history/:conversationId
 * Get chat history for a conversation (DEPRECATED - use /api/user/:userId/conversations)
 */
app.get("/api/chat/history/:conversationId", (req, res) => {
  try {
    res.status(404).json({
      error: "Endpoint deprecated",
      message: "Please use /api/user/:userId/conversations instead",
      helpText: "This endpoint has been moved to use the user account system",
    });
  } catch (error) {
    console.error("History error:", error);
    res.status(500).json({
      error: "Failed to fetch history",
      message: error.message,
    });
  }
});

// ============================================================================
// USER ACCOUNT ENDPOINTS
// ============================================================================

/**
 * POST /api/user/create
 * Create a new user account with preferences
 */
app.post("/api/user/create", (req, res) => {
  try {
    const { userId, budget, familySize, dietaryPreferences, allergies } =
      req.body;

    if (!userId) {
      return res.status(400).json({
        error: "Missing userId",
      });
    }

    const user = UserManager.createUser(userId, {
      budget,
      familySize,
      dietaryPreferences,
      allergies,
    });

    res.json({
      success: true,
      message: "User account created successfully",
      user: {
        userId: user.userId,
        preferences: user.preferences,
        statistics: user.statistics,
      },
    });
  } catch (error) {
    console.error("User creation error:", error);
    res.status(500).json({
      error: "Failed to create user",
      message: error.message,
    });
  }
});

/**
 * GET /api/user/:userId
 * Get user account details
 */
app.get("/api/user/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const user = UserManager.getUserData(userId);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      success: true,
      user: {
        userId: user.userId,
        createdAt: user.createdAt,
        lastActive: user.lastActive,
        preferences: user.preferences,
        statistics: user.statistics,
      },
    });
  } catch (error) {
    console.error("User retrieval error:", error);
    res.status(500).json({
      error: "Failed to retrieve user",
      message: error.message,
    });
  }
});

/**
 * PUT /api/user/:userId/preferences
 * Update user preferences
 */
app.put("/api/user/:userId/preferences", (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = req.body;

    const updatedUser = UserManager.updateUserPreferences(userId, preferences);

    if (!updatedUser) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Preferences updated successfully",
      preferences: updatedUser.preferences,
    });
  } catch (error) {
    console.error("Preference update error:", error);
    res.status(500).json({
      error: "Failed to update preferences",
      message: error.message,
    });
  }
});

/**
 * GET /api/user/:userId/conversations
 * Get all conversations for a user (PERSISTED)
 */
app.get("/api/user/:userId/conversations", (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;

    const conversations = UserManager.getConversationHistory(
      userId,
      parseInt(limit)
    );

    res.json({
      success: true,
      userId,
      conversations: conversations,
      count: conversations.length,
      message: "Persisted conversations from user account",
    });
  } catch (error) {
    console.error("Conversations error:", error);
    res.status(500).json({
      error: "Failed to fetch conversations",
      message: error.message,
    });
  }
});

/**
 * GET /api/user/:userId/context
 * Get user's full context for chatbot (user data, inventory, conversation history)
 */
app.get("/api/user/:userId/context", (req, res) => {
  try {
    const { userId } = req.params;
    const context = UserManager.getUserContext(userId);

    if (!context) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      success: true,
      context: context,
      message: "User context for chatbot personalization",
    });
  } catch (error) {
    console.error("Context error:", error);
    res.status(500).json({
      error: "Failed to fetch context",
      message: error.message,
    });
  }
});

/**
 * POST /api/user/:userId/inventory
 * Add item to user's inventory
 */
app.post("/api/user/:userId/inventory", (req, res) => {
  try {
    const { userId } = req.params;
    const { name, quantity, unit, expiryDate, category } = req.body;

    if (!name || !quantity || !expiryDate) {
      return res.status(400).json({
        error: "Missing required fields: name, quantity, expiryDate",
      });
    }

    const inventory = UserManager.updateInventory(userId, {
      name,
      quantity,
      unit: unit || "kg",
      expiryDate,
      category: category || "General",
    });

    res.json({
      success: true,
      message: "Item added to inventory",
      inventory: inventory,
    });
  } catch (error) {
    console.error("Inventory add error:", error);
    res.status(500).json({
      error: "Failed to add inventory item",
      message: error.message,
    });
  }
});

/**
 * GET /api/user/:userId/inventory
 * Get user's current inventory
 */
app.get("/api/user/:userId/inventory", (req, res) => {
  try {
    const { userId } = req.params;
    const inventory = UserManager.getInventory(userId);

    res.json({
      success: true,
      userId,
      inventory: inventory,
      count: inventory.length,
    });
  } catch (error) {
    console.error("Inventory fetch error:", error);
    res.status(500).json({
      error: "Failed to fetch inventory",
      message: error.message,
    });
  }
});

/**
 * DELETE /api/user/:userId
 * Delete user account (with all data)
 */
app.delete("/api/user/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const deleted = UserManager.deleteUser(userId);

    if (!deleted) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User account deleted successfully",
      userId: userId,
    });
  } catch (error) {
    console.error("User deletion error:", error);
    res.status(500).json({
      error: "Failed to delete user",
      message: error.message,
    });
  }
});

/**
 * GET /api/data/bangladesh
 * Get Bangladesh food dataset and context
 */
app.get("/api/data/bangladesh", (req, res) => {
  try {
    res.json({
      success: true,
      data: bangladeshFoodDatabase,
      message: "Bangladesh-specific food data and recipes",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch data",
      message: error.message,
    });
  }
});

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/user/:userId/analytics
 * Get user's current analytics (waste, SDG score, etc.)
 */
app.get("/api/user/:userId/analytics", async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch data
    const logs = await prisma.consumptionLog.findMany({
      where: { userId: userId },
      orderBy: { logDate: "desc" },
      take: 30,
    });

    const inventory = await prisma.inventory.findMany({
      where: { userId: userId, quantity: { gt: 0 } },
      include: { foodItem: true },
    });

    // Calculate metrics
    const wasteMetrics = calculateWasteMetrics(logs, inventory);
    const sdgMetrics = calculateSDGScore(logs);
    const displayMetrics = formatMetricsForDisplay(wasteMetrics, sdgMetrics);

    res.json({
      success: true,
      analytics: displayMetrics,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({
      error: "Failed to fetch analytics",
      message: error.message,
    });
  }
});

/**
 * GET /api/user/:userId/sdg-profile
 * Enhanced SDG Impact Scoring Engine with weekly insights & recommendations
 * Returns: Personal SDG Score, nutrition analysis, weekly insights, actionable recommendations
 */
app.get("/api/user/:userId/sdg-profile", async (req, res) => {
  try {
    const { userId } = req.params;

    // Get mock or real user data
    const mockHistory = [
      { name: "Apple", status: "consumed", price: 2.5 },
      { name: "Yogurt", status: "wasted", price: 3.0 },
      { name: "Carrot", status: "consumed", price: 1.5 },
      { name: "Bread", status: "consumed", price: 2.0 },
      { name: "Spinach", status: "wasted", price: 1.0 },
      { name: "Eggs", status: "consumed", price: 2.5 },
      { name: "Milk", status: "consumed", price: 3.0 },
    ];

    const mockInventory = [
      {
        name: "Yogurt",
        expiry: "2025-11-22",
        quantity: 1,
        price: 3.0,
      },
      {
        name: "Apples",
        expiry: "2025-11-26",
        quantity: 3,
        price: 2.5,
      },
      {
        name: "Carrots",
        expiry: "2025-12-05",
        quantity: 5,
        price: 1.5,
      },
      {
        name: "Bread",
        expiry: "2025-11-24",
        quantity: 1,
        price: 2.0,
      },
    ];

    // Generate comprehensive SDG profile
    const sdgProfile = generateCompleteSDGProfile(
      mockHistory,
      mockInventory,
      "2025-11-21"
    );

    res.json({
      success: true,
      userId,
      personalSDGScore: sdgProfile.personalSDGScore,
      scoreInterpretation: sdgProfile.scoreInterpretation,
      waste: sdgProfile.waste,
      nutrition: sdgProfile.nutrition,
      weeklyInsights: sdgProfile.weeklyInsights,
      recommendations: sdgProfile.recommendations,
      potentialImprovement: sdgProfile.potentialImprovement,
      estimatedNewScore: sdgProfile.estimatedNewScore,
      metrics: sdgProfile.metrics,
      sdgGoals: {
        goal2: "Zero Hunger - Reduce food waste",
        goal12: "Responsible Consumption & Production",
        goal13: "Climate Action - Less methane from landfills",
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("SDG profile error:", error);
    res.status(500).json({
      error: "Failed to fetch SDG profile",
      message: error.message,
    });
  }
});

/**
 * POST /api/user/:userId/sdg-insights
 * Generate AI-powered weekly insights (future LLM integration)
 */
app.post("/api/user/:userId/sdg-insights", async (req, res) => {
  try {
    const { userId } = req.params;

    // Mock insights
    const mockHistory = [
      { name: "Apple", status: "consumed", price: 2.5 },
      { name: "Yogurt", status: "wasted", price: 3.0 },
      { name: "Carrot", status: "consumed", price: 1.5 },
      { name: "Bread", status: "consumed", price: 2.0 },
      { name: "Spinach", status: "wasted", price: 1.0 },
      { name: "Eggs", status: "consumed", price: 2.5 },
      { name: "Milk", status: "consumed", price: 3.0 },
    ];

    const mockInventory = [
      {
        name: "Yogurt",
        expiry: "2025-11-22",
        quantity: 1,
        price: 3.0,
      },
      {
        name: "Apples",
        expiry: "2025-11-26",
        quantity: 3,
        price: 2.5,
      },
    ];

    const sdgMetrics = calculateSDGScore(mockHistory);
    const nutritionMetrics = calculateNutritionScore(mockHistory);

    res.json({
      success: true,
      userId,
      weeklyInsights: {
        performanceScore: sdgMetrics.sdgScore,
        nutritionScore: nutritionMetrics.nutritionScore,
        message: `You're making progress! Your SDG score is ${sdgMetrics.sdgScore}/100. Keep focusing on reducing waste!`,
        highlights: [
          `✅ Consumed ${sdgMetrics.consumedCount} items successfully`,
          `⚠️  ${sdgMetrics.wastedCount} items went to waste`,
          `📊 Nutrition variety: ${nutritionMetrics.nutritionScore}/100`,
        ],
        areasToImprove: nutritionMetrics.suggestions,
      },
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("SDG insights error:", error);
    res.status(500).json({
      error: "Failed to generate insights",
      message: error.message,
    });
  }
});

// ============================================================================
// INVENTORY ENDPOINTS
// ============================================================================

/**
 * GET /api/user/:userId/inventory
 * Get user's current inventory
 */
app.get("/api/user/:userId/inventory", async (req, res) => {
  try {
    const { userId } = req.params;

    const inventory = await prisma.inventory.findMany({
      where: { userId: userId, quantity: { gt: 0 } },
      include: { foodItem: true },
      orderBy: { expirationDate: "asc" },
    });

    const formattedInventory = inventory.map((item) => ({
      id: item.id,
      name: item.customName,
      quantity: item.quantity,
      unit: item.unit,
      expiry: item.expirationDate,
      daysLeft: Math.ceil(
        (item.expirationDate - new Date()) / (1000 * 60 * 60 * 24)
      ),
      category: item.foodItem?.category || "Unknown",
    }));

    res.json({
      success: true,
      inventory: formattedInventory,
      count: formattedInventory.length,
    });
  } catch (error) {
    console.error("Inventory error:", error);
    res.status(500).json({
      error: "Failed to fetch inventory",
      message: error.message,
    });
  }
});

/**
 * POST /api/user/:userId/inventory
 * Add an item to inventory
 */
app.post("/api/user/:userId/inventory", async (req, res) => {
  try {
    const { userId } = req.params;
    const { customName, quantity, unit, expirationDate, foodItemId } = req.body;

    if (!customName || !quantity || !unit || !expirationDate) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    const newItem = await prisma.inventory.create({
      data: {
        userId,
        customName,
        quantity,
        unit,
        purchaseDate: new Date(),
        expirationDate: new Date(expirationDate),
        foodItemId: foodItemId || null,
      },
    });

    res.json({
      success: true,
      item: newItem,
      message: "Item added to inventory",
    });
  } catch (error) {
    console.error("Add inventory error:", error);
    res.status(500).json({
      error: "Failed to add item",
      message: error.message,
    });
  }
});

// ============================================================================
// CONSUMPTION LOG ENDPOINTS
// ============================================================================

/**
 * POST /api/user/:userId/log
 * Log a consumption action (consumed, wasted, donated)
 */
app.post("/api/user/:userId/log", async (req, res) => {
  try {
    const { userId } = req.params;
    const { foodName, actionType, quantity, reasonForWaste } = req.body;

    if (!foodName || !actionType || !quantity) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    const log = await prisma.consumptionLog.create({
      data: {
        userId,
        foodName,
        actionType, // CONSUMED, WASTED, DONATED
        quantity,
        reasonForWaste: reasonForWaste || null,
      },
    });

    res.json({
      success: true,
      log: log,
      message: `Logged: ${quantity} ${foodName} (${actionType})`,
    });
  } catch (error) {
    console.error("Log error:", error);
    res.status(500).json({
      error: "Failed to log action",
      message: error.message,
    });
  }
});

/**
 * GET /api/user/:userId/logs
 * Get consumption history
 */
app.get("/api/user/:userId/logs", async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, actionType } = req.query;

    const where = { userId };
    if (actionType) {
      where.actionType = actionType;
    }

    const logs = await prisma.consumptionLog.findMany({
      where,
      orderBy: { logDate: "desc" },
      take: parseInt(limit),
    });

    res.json({
      success: true,
      logs: logs,
      count: logs.length,
    });
  } catch (error) {
    console.error("Logs error:", error);
    res.status(500).json({
      error: "Failed to fetch logs",
      message: error.message,
    });
  }
});

// ============================================================================
// USER ENDPOINTS
// ============================================================================

/**
 * GET /api/user/:userId
 * Get user profile
 */
app.get("/api/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        householdSize: true,
        dietaryPreferences: true,
        location: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    res.json({
      success: true,
      user: user,
    });
  } catch (error) {
    console.error("User error:", error);
    res.status(500).json({
      error: "Failed to fetch user",
      message: error.message,
    });
  }
});

// ============================================================================
// MEAL PLANNING ENDPOINTS
// ============================================================================

/**
 * GET /api/user/:userId/meal-plan
 * Generate meal plan based on current inventory
 */
app.get("/api/user/:userId/meal-plan", async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dietaryPreferences: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch inventory
    const inventory = await prisma.inventory.findMany({
      where: { userId: userId, quantity: { gt: 0 } },
      include: { foodItem: true },
      orderBy: { expirationDate: "asc" },
    });

    // Format inventory for meal planning
    const formattedInventory = inventory.map((item) => ({
      name: item.customName,
      quantity: item.quantity,
      unit: item.unit,
      expiry: item.expirationDate,
      daysLeft: Math.ceil(
        (item.expirationDate - new Date()) / (1000 * 60 * 60 * 24)
      ),
    }));

    // Generate meal plan
    const preferences = JSON.parse(user.dietaryPreferences || "[]");
    const mealPlan = generateMealPlan(formattedInventory, preferences);

    res.json({
      success: true,
      mealPlan: mealPlan,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Meal plan error:", error);
    res.status(500).json({
      error: "Failed to generate meal plan",
      message: error.message,
    });
  }
});

/**
 * GET /api/user/:userId/weekly-meal-plan
 * Generate a full 7-day meal plan with shopping list
 */
app.get("/api/user/:userId/weekly-meal-plan", async (req, res) => {
  try {
    const { userId } = req.params;
    const { mealCount = 7 } = req.query;

    // Fetch inventory
    const inventory = await prisma.inventory.findMany({
      where: { userId: userId, quantity: { gt: 0 } },
      include: { foodItem: true },
      orderBy: { expirationDate: "asc" },
    });

    // Format inventory
    const formattedInventory = inventory.map((item) => ({
      name: item.customName,
      quantity: item.quantity,
      unit: item.unit,
      expiry: item.expirationDate,
      daysLeft: Math.ceil(
        (item.expirationDate - new Date()) / (1000 * 60 * 60 * 24)
      ),
    }));

    // Generate weekly plan
    const weeklyPlan = generateWeeklyMealPlan(
      formattedInventory,
      parseInt(mealCount)
    );

    res.json({
      success: true,
      weeklyPlan: weeklyPlan,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Weekly meal plan error:", error);
    res.status(500).json({
      error: "Failed to generate weekly meal plan",
      message: error.message,
    });
  }
});

/**
 * GET /api/recipe/:recipeName
 * Get detailed recipe information
 */
app.get("/api/recipe/:recipeName", (req, res) => {
  try {
    const { recipeName } = req.params;
    const recipeDetails = getRecipeDetails(recipeName);

    if (!recipeDetails.success) {
      return res.status(404).json(recipeDetails);
    }

    res.json({
      success: true,
      recipe: recipeDetails.recipe,
    });
  } catch (error) {
    console.error("Recipe error:", error);
    res.status(500).json({
      error: "Failed to fetch recipe",
      message: error.message,
    });
  }
});

/**
 * GET /api/recipes/by-ingredient/:ingredient
 * Get all recipes that use a specific ingredient
 */
app.get("/api/recipes/by-ingredient/:ingredient", (req, res) => {
  try {
    const { ingredient } = req.params;
    const recipes = getRecipesByIngredient(ingredient);

    res.json({
      success: true,
      ...recipes,
    });
  } catch (error) {
    console.error("Ingredient recipes error:", error);
    res.status(500).json({
      error: "Failed to fetch recipes",
      message: error.message,
    });
  }
});

// ============================================================================
// VISION & IMAGE ENDPOINTS
// ============================================================================

/**
 * POST /api/user/:userId/analyze-image
 * Upload an image (URL) for food recognition
 *
 * Request body:
 * {
 *   "imageUrl": "https://...",
 *   "filename": "optional_filename"
 * }
 */
app.post("/api/user/:userId/analyze-image", async (req, res) => {
  try {
    const { userId } = req.params;
    const { imageUrl, filename } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        error: "Missing imageUrl",
      });
    }

    // Process image
    const result = await processImageForInventory(imageUrl, userId, filename);

    if (!result.success) {
      return res.status(400).json({
        error: "Failed to analyze image",
        message: result.error,
      });
    }

    // Optionally save to database
    if (result.items && result.items.length > 0) {
      try {
        await prisma.inventory.createMany({
          data: result.items,
          skipDuplicates: true,
        });
      } catch (dbError) {
        console.warn("Failed to save items to DB:", dbError.message);
        // Still return the detected items even if DB save fails
      }
    }

    res.json({
      success: true,
      method: result.method,
      detectedItems: result.detections,
      savedToInventory: result.items,
      message: `Detected ${result.detections.length} item(s)`,
    });
  } catch (error) {
    console.error("Image analysis error:", error);
    res.status(500).json({
      error: "Failed to analyze image",
      message: error.message,
    });
  }
});

/**
 * POST /api/user/:userId/analyze-images
 * Batch process multiple images (e.g., receipt photos)
 *
 * Request body:
 * {
 *   "imageUrls": ["url1", "url2", "url3"]
 * }
 */
app.post("/api/user/:userId/analyze-images", async (req, res) => {
  try {
    const { userId } = req.params;
    const { imageUrls } = req.body;

    if (!imageUrls || !Array.isArray(imageUrls)) {
      return res.status(400).json({
        error: "Missing imageUrls array",
      });
    }

    // Batch process images
    const result = await batchProcessImages(imageUrls, userId);

    // Save all items to database
    if (result.totalItemsDetected > 0) {
      const allItems = result.details.flatMap((detail) => detail.items || []);

      try {
        await prisma.inventory.createMany({
          data: allItems,
          skipDuplicates: true,
        });
      } catch (dbError) {
        console.warn("Failed to save items to DB:", dbError.message);
      }
    }

    res.json({
      success: true,
      summary: {
        totalImages: result.totalImages,
        totalItemsDetected: result.totalItemsDetected,
        details: result.details.map((d) => ({
          imageUrl: d.imageUrl,
          itemsFound: d.detections ? d.detections.length : 0,
          method: d.method,
        })),
      },
    });
  } catch (error) {
    console.error("Batch image analysis error:", error);
    res.status(500).json({
      error: "Failed to analyze images",
      message: error.message,
    });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// 404 Handler - Show available endpoints
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.path,
    method: req.method,
    message: "This endpoint does not exist. Visit GET / for API documentation.",
    availableEndpoints: [
      "POST   /api/chat",
      "GET    /api/health",
      "GET    /api/user/:userId/analytics",
      "GET    /api/user/:userId/inventory",
      "POST   /api/user/:userId/inventory",
      "POST   /api/user/:userId/log",
      "GET    /api/user/:userId/logs",
      "GET    /api/user/:userId",
      "GET    /api/user/:userId/meal-plan",
      "GET    /api/user/:userId/weekly-meal-plan",
      "GET    /api/recipe/:recipeName",
      "GET    /api/recipes/by-ingredient/:ingredient",
      "POST   /api/user/:userId/analyze-image",
      "POST   /api/user/:userId/analyze-images",
    ],
  });
});

// ============================================================================
// START SERVER
// ============================================================================

async function start() {
  try {
    // Database ready (using mock data - no real DB required)
    console.log("✅ Database ready (Mock mode - no real DB required)");

    app.listen(PORT, () => {
      console.log(
        `\n🚀 NourishAI Chatbot Server running on http://localhost:${PORT}`
      );
      console.log(`📚 API Docs:`);
      console.log(`   POST   /api/chat - Send message to chatbot`);
      console.log(`   GET    /api/user/:userId/analytics - Get analytics`);
      console.log(`   GET    /api/user/:userId/inventory - Get inventory`);
      console.log(`   POST   /api/user/:userId/inventory - Add item`);
      console.log(`   POST   /api/user/:userId/log - Log action`);
      console.log(`   GET    /api/user/:userId/logs - Get history`);
      console.log(`   GET    /api/user/:userId - Get profile`);
      console.log(`   GET    /api/user/:userId/meal-plan - Generate meal plan`);
      console.log(`   GET    /api/user/:userId/weekly-meal-plan - Weekly plan`);
      console.log(`   GET    /api/recipe/:recipeName - Get recipe`);
      console.log(
        `   GET    /api/recipes/by-ingredient/:ingredient - Recipes\n`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();

module.exports = app;
