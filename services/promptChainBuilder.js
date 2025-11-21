/**
 * Enhanced Prompt System with Contextual Memory & Prompt Chaining
 * Builds context-aware prompts with conversation history and user data
 */

const bangladeshFoodDatabase = require("./bangladeshFoodDatabase");

class PromptChainBuilder {
  /**
   * Detect language from message
   */
  static detectLanguage(message) {
    // Bengali Unicode range check
    const bengaliPattern = /[\u0980-\u09FF]/;
    return bengaliPattern.test(message) ? "bengali" : "english";
  }

  /**
   * Build comprehensive system prompt with user context
   */
  static buildSystemPrompt(userContext, userMessage) {
    const language = this.detectLanguage(userMessage);
    const languageInstruction = language === "bengali" 
      ? "RESPOND ONLY IN BENGALI. Do not use any English words except BDT. No English phrases."
      : "RESPOND ONLY IN ENGLISH. Do not use Bengali words or transliteration. Keep it simple and clear.";
    const systemPrompt = `You are NourishAI, a food waste reduction chatbot specialized for Bangladesh.

⚠️  LANGUAGE REQUIREMENT (MOST IMPORTANT):
${languageInstruction}

YOUR CORE RESPONSIBILITIES:
1. Food Waste Reduction - Provide practical advice to minimize food waste
2. Nutrition Balancing - Help users eat balanced, affordable meals
3. Budget Meal Planning - Create cost-effective meal plans for all income levels
4. Leftover Transformation - Suggest creative recipes using leftovers
5. Local Food Sharing - Guide users to local food sharing networks
6. Environmental Impact Education - Explain food choices' environmental consequences

BANGLADESH CONTEXT:
- Use local food names and Bengali references
- Consider local markets, seasonal produce, and cultural preferences
- Provide prices in BDT (Bangladeshi Taka)
- Suggest recipes using locally available ingredients
- Include environmental impact specific to Bangladesh

USER PROFILE:
- Budget Level: ${userContext?.preferences?.budget || "moderate"}
- Family Size: ${userContext?.preferences?.familySize || 1}
- Dietary Preferences: ${userContext?.preferences?.dietaryPreferences?.join(", ") || "Omnivore"}
- Allergies: ${userContext?.preferences?.allergies?.join(", ") || "None"}
- Current SDG Score: ${userContext?.statistics?.sdgScore || 50}/100

CONVERSATION HISTORY (Last 3 messages):
${this._formatConversationHistory(userContext?.recentConversations || [])}

CURRENT INVENTORY:
${this._formatInventory(userContext?.inventory || [])}

RESPONSE GUIDELINES - CRITICAL:
1. SINGLE LANGUAGE ONLY: 
   - User used Bengali? → Respond ONLY in Bengali (NO English at all)
   - User used English? → Respond ONLY in English (NO Bengali at all)
   - NEVER mix languages in a single response

2. FORMATTING - VERY IMPORTANT:
   - Start with a greeting/acknowledgment (1 line)
   - Add ONE BLANK LINE after greeting
   - Then add main content with proper spacing:
     * Use bullet points with EACH on a NEW LINE
     * Add blank line between bullet points
     * Add blank line between paragraphs
   - End with actionable step (separate paragraph)

3. DIRECT ANSWERS (NOT ELABORATE):
   • Answer the ACTUAL question asked, don't over-explain
   • If they ask "how to store dal?" → just answer storage methods
   • Don't add unrelated suggestions unless asked
   • Be precise and to the point
   • NO unnecessary elaboration

4. USE CONVERSATION MEMORY:
   • Reference previous messages when relevant
   • Say "As you mentioned..." if they discussed something before
   • Build on previous context, don't repeat
   • Avoid asking things they already told you

5. CONCISENESS: Keep responses brief (100-140 words max)
   • Each bullet point on separate line
   • Include BDT prices when mentioning food/recipes
   • One actionable next step
   • One actionable next step

5. 6 CORE FEATURES (Reference when applicable):
   A) Food Waste Reduction - Storage tips, preventing spoilage
   B) Nutrition Balancing - Protein/iron/calcium sources
   C) Budget Meal Planning - Cost-effective meals
   D) Leftover Transformation - Creative recipes using leftovers
   E) Food Sharing Guidance - Local networks, NGOs in Bangladesh
   F) Environmental Impact - Carbon footprint, waste statistics

6. CONTENT RULES:
   • Only mention relevant feature for their question
   • Include BDT prices when discussing food
   • Reference their budget/family size if it matters
   • NO unnecessary elaboration on unrelated topics

CRITICAL FORMAT EXAMPLE FOR BENGALI:
আলাইকুম আস্সালাম! আপনার ভাত খুবই মূল্যবান।

• প্রধান পরামর্শ: ভাতের ভর্তা (খরচ: ২০ টাকা)
• বিকল্প ১: ভাজা ভাত (খরচ: ৩০ টাকা)
• বিকল্প ২: খিচুড়ি (খরচ: ৫০ টাকা)

পরবর্তী পদক্ষেপ: আজ রাতে ভর্তা বানিয়ে দেখুন।

CRITICAL FORMAT EXAMPLE FOR ENGLISH:
Great! You have lots of rice. Here are practical options:

• Main: Fried rice with eggs (30 BDT)
• Option 1: Rice porridge (20 BDT)
• Option 2: Rice cutlets (40 BDT)

Next step: Try fried rice tonight!

ABSOLUTE RULE: NO MIXING LANGUAGES!`;

    return systemPrompt;
  }

  /**
   * Format conversation history for context
   */
  static _formatConversationHistory(conversations) {
    if (!conversations || conversations.length === 0) {
      return "No previous conversations.";
    }

    return conversations
      .slice(-3)
      .map(
        (conv, idx) => `
Exchange ${idx + 1}:
User: ${conv.userMessage}
Bot: ${conv.botResponse}`
      )
      .join("\n");
  }

  /**
   * Format inventory for context
   */
  static _formatInventory(inventory) {
    if (!inventory || inventory.length === 0) {
      return "No items in inventory.";
    }

    return inventory
      .slice(-5)
      .map(
        (item) =>
          `- ${item.name} (${item.quantity} ${item.unit}), expires: ${item.expiryDate}`
      )
      .join("\n");
  }

  /**
   * Build contextual prompt for specific intent
   */
  static buildContextualPrompt(intent, userContext, userMessage) {
    const baseContext = this.buildSystemPrompt(userContext, userMessage);

    const intentPrompts = {
      wasteReduction: `
FEATURE: FOOD WASTE REDUCTION
Budget: ${userContext?.preferences?.budget}
Family Size: ${userContext?.preferences?.familySize}

ANSWER DIRECTLY - Just storage/prevention tips:
• Storage method (shelf life)

• ONE recipe to prevent waste (with BDT cost)

• Environmental benefit (1 line)

Format: Each bullet point on NEW LINE with blank line between.
NO elaboration. Direct answer only.
Max 100 words.
Question: ${userMessage}`,

      mealPlanning: `
FEATURE: BUDGET MEAL PLANNING
Budget: ${userContext?.preferences?.budget}
Family Size: ${userContext?.preferences?.familySize} people

ANSWER DIRECTLY - Provide meal plan ONLY:
• Main meal suggestion with BDT total cost

• ONE cheaper alternative

• Shopping tip (1 line)

Format: Each bullet point on NEW LINE with blank line between.
NO stories. Direct answer only.
Max 100 words.
Question: ${userMessage}`,

      nutritionBalance: `
FEATURE: NUTRITION BALANCING
Budget: ${userContext?.preferences?.budget}
Dietary: ${userContext?.preferences?.dietaryPreferences?.join(", ") || "Any"}

ANSWER DIRECTLY - Just nutrition advice:
• Which nutrient/food group to focus on

• TWO specific foods with prices (BDT)

• Why it matters (1 line)

Format: Each bullet point on NEW LINE with blank line between.
NO lengthy explanations. Direct advice only.
Max 100 words.
Question: ${userMessage}`,

      leftoverRecipes: `
FEATURE: LEFTOVER TRANSFORMATION
Leftovers: ${userContext?.inventory?.map((i) => i.name).join(", ") || "Not specified"}

ANSWER DIRECTLY - Just recipe ideas:
• ONE quick recipe (ingredients + BDT cost)

• ONE alternative recipe

• Cooking time (total)

Format: Each bullet point on NEW LINE with blank line between.
NO details. Quick, direct recipes only.
Max 100 words.
Question: ${userMessage}`,

      foodSharing: `
FEATURE: LOCAL FOOD SHARING
Location: Bangladesh (${userContext?.preferences?.location || "not specified"})

ANSWER DIRECTLY - Just sharing options:
• TWO local organizations or networks

• TWO steps to join/participate

• One benefit (1 line)

Format: Each bullet point on NEW LINE with blank line between.
NO lengthy instructions. Direct, practical only.
Max 100 words.
Question: ${userMessage}`,

      environmentalImpact: `
FEATURE: ENVIRONMENTAL IMPACT
Budget: ${userContext?.preferences?.budget}

ANSWER DIRECTLY - Environmental facts only:
• ONE fact about Bangladesh food waste

• TWO food choices impact comparison

• ONE actionable step (1 line)

Format: Each bullet point on NEW LINE with blank line between.
NO lengthy explanations. Facts + action only.
Max 100 words.
Question: ${userMessage}`,

      general: `
GENERAL FOOD QUESTION
Budget: ${userContext?.preferences?.budget}
Family: ${userContext?.preferences?.familySize} people
Previous Topics: ${userContext?.recentConversations?.map(c => c.intent).join(", ") || "None"}

ANSWER DIRECTLY:
• Answer the ACTUAL question (no elaboration)

• Reference previous talks if relevant

• ONE optional suggestion

Format: Each bullet point on NEW LINE with blank line between.
NO unnecessary details. Answer only what asked.
Max 100 words.
Question: ${userMessage}`,
    };

    return baseContext + "\n\n" + (intentPrompts[intent] || intentPrompts.general);
  }

  /**
   * Detect user intent from message
   */
  static detectIntent(userMessage) {
    const message = userMessage.toLowerCase();

    if (
      message.includes("waste") ||
      message.includes("store") ||
      message.includes("spoil") ||
      message.includes("fresh") ||
      message.includes("preserve")
    ) {
      return "wasteReduction";
    }
    if (
      message.includes("meal") ||
      message.includes("plan") ||
      message.includes("cook") ||
      message.includes("recipe") ||
      message.includes("budget") ||
      message.includes("খরচ") ||
      message.includes("budget")
    ) {
      return "mealPlanning";
    }
    if (
      message.includes("nutrition") ||
      message.includes("healthy") ||
      message.includes("protein") ||
      message.includes("vitamin") ||
      message.includes("balanced") ||
      message.includes("deficiency")
    ) {
      return "nutritionBalance";
    }
    if (
      message.includes("leftover") ||
      message.includes("stale") ||
      message.includes("old") ||
      message.includes("extra") ||
      message.includes("transform")
    ) {
      return "leftoverRecipes";
    }
    if (
      message.includes("share") ||
      message.includes("donate") ||
      message.includes("community") ||
      message.includes("ngo") ||
      message.includes("network")
    ) {
      return "foodSharing";
    }
    if (
      message.includes("environment") ||
      message.includes("impact") ||
      message.includes("carbon") ||
      message.includes("sustainable") ||
      message.includes("sdg") ||
      message.includes("climate")
    ) {
      return "environmentalImpact";
    }

    return "general";
  }

  /**
   * Build multi-turn prompt chain
   */
  static buildPromptChain(userContext, conversationHistory) {
    // Extract key information from recent conversations
    const recentIntents = conversationHistory
      .slice(-5)
      .map((conv) => this.detectIntent(conv.userMessage));

    const topicProgression = this._detectTopicProgression(
      conversationHistory
    );

    const chainedPrompt = `
You are in a multi-turn conversation with a user interested in food sustainability.

CONVERSATION FLOW:
Recent topics discussed: ${recentIntents.join(" → ")}
Topic progression: ${topicProgression}

MAINTAIN CONTEXT:
1. Reference previous answers when relevant
2. Build on earlier suggestions
3. Avoid repeating information
4. Progress the conversation naturally
5. Remember user's preferences mentioned earlier

This helps create a coherent, natural conversation rather than isolated responses.`;

    return chainedPrompt;
  }

  /**
   * Detect topic progression pattern
   */
  static _detectTopicProgression(conversationHistory) {
    if (conversationHistory.length < 2) {
      return "New conversation";
    }

    const patterns = {
      "wasteReduction → mealPlanning": "Learning waste reduction → Practical meal ideas",
      "mealPlanning → nutritionBalance": "Meal planning → Nutritional concerns",
      "wastReduction → leftoverRecipes": "Waste awareness → Practical leftover use",
      "nutritionBalance → mealPlanning": "Nutrition goals → Creating meal plans",
    };

    const recent = conversationHistory
      .slice(-2)
      .map((c) => this.detectIntent(c.userMessage))
      .join(" → ");

    return patterns[recent] || "Multi-topic discussion";
  }

  /**
   * Add Bangladesh food context to prompt
   */
  static addBangladeshContext(userMessage) {
    return `
Bangladesh-specific food context available:
- Common local foods with storage & recipe suggestions
- Budget meal plans (100-400 BDT per day)
- Environmental statistics specific to Bangladesh
- Local food sharing networks and NGOs
- Seasonal produce calendar for Bangladesh

User's question: "${userMessage}"
Provide response using Bangladesh context when relevant.`;
  }
}

module.exports = PromptChainBuilder;
