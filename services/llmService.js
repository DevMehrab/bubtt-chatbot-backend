/**
 * LLM Service - Google Gemini Integration
 * Handles interaction with Google Gemini API
 * Falls back to mock responses if API is unavailable
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI
let genAI;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

/**
 * Mock LLM function for demo (when API is unavailable)
 * @param {String} systemPrompt - System instructions
 * @param {String} userMessage - User's message
 * @param {Object} context - User context
 * @returns {String} Bot response
 */
function mockLLMResponse(systemPrompt, userMessage, context) {
  const intent = detectIntentFromMessage(userMessage);

  // Generate contextual responses based on intent
  if (intent.includes("RECIPE")) {
    const expiring = context.inventory.filter((i) => i.daysLeft <= 3);
    if (expiring.length > 0) {
      return `Great question! I see you have ${expiring.map((i) => i.name).join(", ")} expiring soon. Here are some ideas:

**${expiring[0].name} Recipes:**
- Quick stir-fry with garlic and soy sauce
- Add to a salad or sandwich
- Blend into a smoothie or soup

Choose something you can make tonight! 🍳`;
    }
    return "I'd love to help you cook! What ingredients do you like? Check your fridge - let's use items that expire soon.";
  }

  if (intent.includes("ANALYTICS")) {
    const score = context.analytics.sdgScore;
    let feedback = "";
    if (score >= 80) {
      feedback = "Wow! You're a waste-fighting champion! 🌱";
    } else if (score >= 60) {
      feedback = "You're doing well! Keep up the good work. 👍";
    } else if (score >= 40) {
      feedback = "There's room to improve, but you're on the right track! 💪";
    } else {
      feedback = "Time to make a change! Small steps can make a big difference. 🎯";
    }

    return `📊 **Your Sustainability Score: ${score}/100**

${feedback}

This week you:
- Consumed ${context.recentActivity.consumed} items ✅
- Wasted ${context.recentActivity.wasted} items ❌
- Lost $${context.analytics.wastedMoney}

**Tip:** Focus on using items that expire soonest. Check your fridge!`;
  }

  if (intent.includes("ALERT")) {
    const expiring = context.inventory.filter((i) => i.daysLeft <= 2);
    if (expiring.length > 0) {
      return `⚠️ **ALERT!** Your ${expiring.map((i) => i.name).join(", ")} will expire soon!

Use them today or tomorrow before they go bad. Need recipe ideas? Just ask! 🔥`;
    }
    return "Your fridge looks good - no items expiring within 2 days! 🎉";
  }

  if (intent.includes("LOG")) {
    return `Got it! I've noted that. Keep up the tracking - every log helps me learn your patterns and give better suggestions! 📝`;
  }

  // Default response
  return `I'm here to help you reduce food waste and save money! You can ask me:
- "What should I cook?" - I'll suggest recipes based on what's expiring
- "How am I doing?" - See your sustainability score
- "What's expiring?" - Get alerts on items that need using
- Tell me what you ate or wasted - I track your progress

What would you like to do? 🌍`;
}

/**
 * Call Google Gemini API
 * @param {String} systemPrompt - System instruction
 * @param {String} userMessage - User message
 * @param {Object} context - User context for fallback
 * @returns {Promise<String>} Bot response
 */
async function callGeminiAPI(systemPrompt, userMessage, context) {
  try {
    // Check if API key is available
    if (!process.env.GEMINI_API_KEY || !genAI) {
      console.warn(
        "⚠️ No GEMINI_API_KEY found. Using mock responses. Set GEMINI_API_KEY env var to use Gemini API."
      );
      return null;
    }

    console.log("📡 Calling Gemini API...");

    // Try multiple model options
    const models = ["gemini-1.5-flash", "gemini-1.0-pro", "gemini-pro"];
    let model;
    let lastError;

    for (const modelName of models) {
      try {
        model = genAI.getGenerativeModel({ model: modelName });
        
        // Combine system prompt and user message
        const fullPrompt = `${systemPrompt}\n\nUser Message: ${userMessage}`;

        // Call Gemini API
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        console.log(`✅ Gemini API Response received (Model: ${modelName})`);

        return { text, modelUsed: modelName };
      } catch (error) {
        lastError = error;
        console.log(`⚠️ Model ${modelName} failed: ${error.message.substring(0, 100)}`);
        continue;
      }
    }

    // If all models failed, throw the last error
    if (lastError) {
      throw lastError;
    }
  } catch (error) {
    console.error("Gemini API Error:", error.message.substring(0, 200));
    console.warn("⚠️ Falling back to mock responses...");
    return null;
  }
}

/**
 * Helper: Detect message intent for mock responses
 * @param {String} message - User message
 * @returns {String[]} Intent categories
 */
function detectIntentFromMessage(message) {
  const lowerMsg = message.toLowerCase();
  const intents = [];

  if (
    lowerMsg.includes("recipe") ||
    lowerMsg.includes("cook") ||
    lowerMsg.includes("make") ||
    lowerMsg.includes("meal")
  ) {
    intents.push("RECIPE");
  }
  if (
    lowerMsg.includes("score") ||
    lowerMsg.includes("doing") ||
    lowerMsg.includes("wasting")
  ) {
    intents.push("ANALYTICS");
  }
  if (
    lowerMsg.includes("expire") ||
    lowerMsg.includes("alert") ||
    lowerMsg.includes("spoil")
  ) {
    intents.push("ALERT");
  }
  if (
    lowerMsg.includes("ate") ||
    lowerMsg.includes("consumed") ||
    lowerMsg.includes("wasted")
  ) {
    intents.push("LOG");
  }

  return intents.length > 0 ? intents : ["GENERAL"];
}

/**
 * Main function: Generate LLM response using Gemini
 * Falls back to mock if API is unavailable
 * @param {String} userMessage - User's message
 * @param {String} systemPrompt - System prompt
 * @param {Object} context - User context
 * @returns {Promise<Object>} Response object with message and metadata
 */
async function generateResponse(userMessage, systemPrompt, context) {
  try {
    // Try to use Gemini API
    const apiResponse = await callGeminiAPI(systemPrompt, userMessage, context);

    if (apiResponse) {
      return {
        message: apiResponse.text,
        metadata: {
          model: apiResponse.modelUsed,
          provider: "google",
          temperature: 0.7,
          usingMock: false,
        },
      };
    }
  } catch (error) {
    console.error("Error in generateResponse:", error.message);
  }

  // Fall back to mock response if API fails
  const mockResponse = mockLLMResponse(systemPrompt, userMessage, context);

  return {
    message: mockResponse,
    metadata: {
      model: "mock",
      provider: "local",
      temperature: 0.7,
      usingMock: true,
    },
  };
}

module.exports = {
  generateResponse,
  callGeminiAPI,
  mockLLMResponse,
  detectIntentFromMessage,
};
