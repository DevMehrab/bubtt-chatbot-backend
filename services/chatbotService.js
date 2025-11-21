/**
 * Chatbot Service
 * Handles:
 * 1. Context injection (inventory, preferences, waste history)
 * 2. Message processing and intent detection
 * 3. LLM interaction for personalized responses
 * 4. Analytics integration (waste metrics, SDG scores)
 */

const {
  calculateWasteMetrics,
  calculateSDGScore,
  generateInsightPrompt,
  formatMetricsForDisplay,
} = require("./analyticsService");

/**
 * STEP 1: Fetch User Context from Database or Mock Data
 * This creates a rich "knowledge base" for the chatbot about the user
 * @param {String|Object} prismaOrUserId - Prisma client or userId string
 * @param {String} userId - User ID (optional if first param is userId)
 * @returns {Object} User context object
 */
async function getUserContext(prismaOrUserId, userId) {
  try {
    // Handle both old API (prisma, userId) and new API (userId only)
    let actualUserId = userId || prismaOrUserId;
    const useMock = typeof prismaOrUserId === "string";

    if (useMock) {
      // Use mock data when called with just userId
      return getMockUserContext(actualUserId);
    }

    // Original prisma-based code (if needed in future)
    const prisma = prismaOrUserId;
    // 1. Fetch active inventory (what do I have?)
    const inventory = await prisma.inventory.findMany({
      where: { userId: actualUserId, quantity: { gt: 0 } },
      include: { foodItem: true },
      orderBy: { expirationDate: "asc" }, // Prioritize expiring items
    });

    // 2. Fetch recent consumption logs (what have I eaten/wasted?)
    const recentLogs = await prisma.consumptionLog.findMany({
      where: { userId: actualUserId },
      orderBy: { logDate: "desc" },
      take: 30, // Last 30 items
    });

    // 3. Fetch user preferences
    const user = await prisma.user.findUnique({
      where: { id: actualUserId },
      select: {
        fullName: true,
        householdSize: true,
        dietaryPreferences: true,
        location: true,
      },
    });

    // 4. Calculate analytics
    const wasteMetrics = calculateWasteMetrics(recentLogs, inventory);
    const sdgMetrics = calculateSDGScore(recentLogs);

    // 5. Format context for LLM
    return {
      user: {
        name: user.fullName,
        householdSize: user.householdSize,
        location: user.location,
        preferences: JSON.parse(user.dietaryPreferences || "[]"),
      },
      inventory: inventory.map((item) => ({
        name: item.customName,
        quantity: item.quantity,
        unit: item.unit,
        expiry: item.expirationDate,
        daysLeft: Math.ceil(
          (item.expirationDate - new Date()) / (1000 * 60 * 60 * 24)
        ),
        category: item.foodItem?.category || "Unknown",
      })),
      recentActivity: {
        consumed: recentLogs.filter((l) => l.actionType === "CONSUMED").length,
        wasted: recentLogs.filter((l) => l.actionType === "WASTED").length,
        total: recentLogs.length,
      },
      analytics: {
        sdgScore: sdgMetrics.sdgScore,
        wastedMoney: wasteMetrics.totalWastedMoney,
        riskItems: wasteMetrics.riskItemNames,
      },
    };
  } catch (error) {
    console.error("Error fetching user context:", error);
    throw error;
  }
}

/**
 * Mock user context for testing without database
 */
function getMockUserContext(userId) {
  return {
    user: {
      id: userId,
      name: "Alex",
      householdSize: 2,
      location: "Dhaka",
      preferences: ["Vegetarian"],
    },
    inventory: [
      {
        name: "Yogurt",
        quantity: 200,
        unit: "g",
        expiry: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        daysLeft: 1,
        category: "Dairy",
      },
      {
        name: "Apples",
        quantity: 3,
        unit: "units",
        expiry: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        daysLeft: 5,
        category: "Fruit",
      },
      {
        name: "Carrots",
        quantity: 1,
        unit: "kg",
        expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        daysLeft: 14,
        category: "Vegetable",
      },
      {
        name: "Bread",
        quantity: 1,
        unit: "loaf",
        expiry: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        daysLeft: 3,
        category: "Grains",
      },
    ],
    recentActivity: {
      consumed: 3,
      wasted: 3,
      total: 6,
    },
    analytics: {
      sdgScore: 50,
      wastedMoney: 7.2,
      riskItems: ["Yogurt"],
    },
  };
}

/**
 * STEP 2: Build System Prompt with Context
 * This is the "instructions" for the LLM about the user's situation
 * @param {Object} context - User context
 * @returns {String} System prompt
 */
function buildSystemPrompt(context) {
  const expiringItems =
    context.inventory
      .filter((i) => i.daysLeft <= 3 && i.daysLeft > 0)
      .map((i) => `${i.name} (${i.daysLeft} days)`)
      .join(", ") || "None";

  const dietaryNote = context.user.preferences.length
    ? `Dietary preferences: ${context.user.preferences.join(", ")}`
    : "No dietary restrictions.";

  return `You are NourishAI, a friendly and knowledgeable food sustainability chatbot. 

Your role is to help ${context.user.name} reduce food waste and save money through smart meal planning.

CURRENT USER PROFILE:
- Household size: ${context.user.householdSize} people
- Location: ${context.user.location || "Not specified"}
- ${dietaryNote}
- SDG Sustainability Score: ${context.analytics.sdgScore}/100
- Money wasted this week: $${context.analytics.wastedMoney}

CURRENT INVENTORY:
${context.inventory.length > 0 ? context.inventory.map((i) => `- ${i.name}: ${i.quantity} ${i.unit} (expires in ${i.daysLeft} days)`).join("\n") : "Empty fridge! Time to shop?"}

ITEMS EXPIRING SOON (HIGH PRIORITY):
${expiringItems}

YOUR INSTRUCTIONS:
1. If asked about meals/recipes, suggest dishes using items that expire soonest
2. If asked "How am I doing?", provide encouragement and one actionable tip
3. If an item expires tomorrow, alert the user immediately
4. Be conversational, friendly, and brief (1-2 sentences unless asked for details)
5. Avoid generic advice - always reference the user's specific inventory
6. If the user logs food (consumed/wasted), acknowledge it and ask why
7. Remember: Your goal is to reduce waste and help them save money

TONE: Supportive, practical, slightly humorous about sustainability.
`;
}

/**
 * STEP 3: Detect User Intent
 * Categorizes what the user is asking about
 * @param {String} message - User message
 * @returns {String} Intent type
 */
function detectIntent(message) {
  const lowerMsg = message.toLowerCase();

  if (
    lowerMsg.includes("recipe") ||
    lowerMsg.includes("cook") ||
    lowerMsg.includes("what should i make") ||
    lowerMsg.includes("meal")
  ) {
    return "RECIPE";
  }

  if (
    lowerMsg.includes("how am i doing") ||
    lowerMsg.includes("score") ||
    lowerMsg.includes("am i wasting") ||
    lowerMsg.includes("progress")
  ) {
    return "ANALYTICS";
  }

  if (
    lowerMsg.includes("alert") ||
    lowerMsg.includes("expire") ||
    lowerMsg.includes("spoil")
  ) {
    return "ALERTS";
  }

  if (
    lowerMsg.includes("wasted") ||
    lowerMsg.includes("ate") ||
    lowerMsg.includes("consumed") ||
    lowerMsg.includes("threw away")
  ) {
    return "LOG_ACTION";
  }

  return "GENERAL";
}

/**
 * STEP 4: Format Context as JSON for LLM
 * Some LLMs work better with structured data
 * @param {Object} context - User context
 * @returns {String} JSON string
 */
function formatContextAsJSON(context) {
  return JSON.stringify({
    user: context.user,
    current_inventory: context.inventory,
    analytics: context.analytics,
    items_expiring_soon: context.inventory
      .filter((i) => i.daysLeft <= 3 && i.daysLeft > 0)
      .map((i) => ({ name: i.name, daysLeft: i.daysLeft })),
  });
}

/**
 * STEP 5: Build User Message with Context
 * Provides the actual user query plus metadata
 * @param {String} userMessage - User's message
 * @param {String} intent - Detected intent
 * @param {Object} context - User context
 * @returns {Object} Formatted message for LLM
 */
function buildUserMessage(userMessage, intent, context) {
  // Add context hints based on intent
  let enrichedMessage = userMessage;

  if (intent === "RECIPE") {
    const expiring = context.inventory.filter((i) => i.daysLeft <= 3);
    if (expiring.length > 0) {
      enrichedMessage += `\n\n[HINT: User has items expiring soon: ${expiring.map((i) => i.name).join(", ")}. Suggest recipes using these first!]`;
    }
  }

  if (intent === "ANALYTICS") {
    enrichedMessage += `\n\n[CONTEXT: User's current SDG score is ${context.analytics.sdgScore}/100. They've wasted $${context.analytics.wastedMoney}.]`;
  }

  return {
    role: "user",
    content: enrichedMessage,
  };
}

module.exports = {
  getUserContext,
  buildSystemPrompt,
  detectIntent,
  formatContextAsJSON,
  buildUserMessage,
};
