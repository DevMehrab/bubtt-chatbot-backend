/**
 * User Account & Conversation History Service
 * Manages user accounts, preferences, and conversation history persistence
 */

const fs = require("fs");
const path = require("path");

// Directory to store user data
const USER_DATA_DIR = path.join(__dirname, "../data/users");

// Ensure data directory exists
if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

class UserManager {
  /**
   * Create or get user account
   */
  static createUser(userId, userData = {}) {
    const userFile = path.join(USER_DATA_DIR, `${userId}.json`);

    // If user exists, return existing data
    if (fs.existsSync(userFile)) {
      return this.getUserData(userId);
    }

    // Create new user
    const defaultUser = {
      userId,
      createdAt: new Date(),
      lastActive: new Date(),
      preferences: {
        language: "English",
        budget: userData.budget || "moderate", // low, moderate, high
        dietaryPreferences: userData.dietaryPreferences || [],
        familySize: userData.familySize || 1,
        allergies: userData.allergies || [],
        location: userData.location || "Bangladesh",
      },
      inventory: [],
      conversationHistory: [],
      statistics: {
        totalWasteReduced: 0,
        mealsPlanedCount: 0,
        messagesCount: 0,
        sdgScore: 50,
      },
    };

    fs.writeFileSync(userFile, JSON.stringify(defaultUser, null, 2));
    return defaultUser;
  }

  /**
   * Get user data
   */
  static getUserData(userId) {
    const userFile = path.join(USER_DATA_DIR, `${userId}.json`);

    if (!fs.existsSync(userFile)) {
      return this.createUser(userId);
    }

    try {
      const data = fs.readFileSync(userFile, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading user data for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Update user preferences
   */
  static updateUserPreferences(userId, preferences) {
    const user = this.getUserData(userId);
    if (!user) return null;

    user.preferences = {
      ...user.preferences,
      ...preferences,
    };
    user.lastActive = new Date();

    const userFile = path.join(USER_DATA_DIR, `${userId}.json`);
    fs.writeFileSync(userFile, JSON.stringify(user, null, 2));

    return user;
  }

  /**
   * Save conversation to history
   */
  static saveConversation(userId, message, response, intent = "general") {
    const user = this.getUserData(userId);
    if (!user) return null;

    const conversation = {
      id: `msg_${Date.now()}`,
      timestamp: new Date(),
      userMessage: message,
      botResponse: response,
      intent,
      userPreferences: user.preferences,
    };

    user.conversationHistory.push(conversation);
    user.statistics.messagesCount += 1;
    user.lastActive = new Date();

    // Keep only last 100 conversations per session
    if (user.conversationHistory.length > 100) {
      user.conversationHistory = user.conversationHistory.slice(-100);
    }

    const userFile = path.join(USER_DATA_DIR, `${userId}.json`);
    fs.writeFileSync(userFile, JSON.stringify(user, null, 2));

    return conversation;
  }

  /**
   * Get conversation history
   */
  static getConversationHistory(userId, limit = 20) {
    const user = this.getUserData(userId);
    if (!user) return [];

    return user.conversationHistory.slice(-limit);
  }

  /**
   * Get user context for prompt
   */
  static getUserContext(userId) {
    const user = this.getUserData(userId);
    if (!user) return null;

    return {
      userId,
      preferences: user.preferences,
      inventory: user.inventory,
      statistics: user.statistics,
      recentConversations: user.conversationHistory.slice(-5),
    };
  }

  /**
   * Update user inventory
   */
  static updateInventory(userId, item) {
    const user = this.getUserData(userId);
    if (!user) return null;

    user.inventory.push({
      id: `item_${Date.now()}`,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit || "kg",
      expiryDate: item.expiryDate,
      addedDate: new Date(),
      category: item.category,
    });

    user.lastActive = new Date();

    const userFile = path.join(USER_DATA_DIR, `${userId}.json`);
    fs.writeFileSync(userFile, JSON.stringify(user, null, 2));

    return user.inventory;
  }

  /**
   * Get user inventory
   */
  static getInventory(userId) {
    const user = this.getUserData(userId);
    if (!user) return [];

    return user.inventory;
  }

  /**
   * Update SDG score
   */
  static updateSDGScore(userId, newScore) {
    const user = this.getUserData(userId);
    if (!user) return null;

    user.statistics.sdgScore = Math.min(100, Math.max(0, newScore));
    user.lastActive = new Date();

    const userFile = path.join(USER_DATA_DIR, `${userId}.json`);
    fs.writeFileSync(userFile, JSON.stringify(user, null, 2));

    return user.statistics.sdgScore;
  }

  /**
   * Get all users (for analytics)
   */
  static getAllUsers() {
    const files = fs.readdirSync(USER_DATA_DIR);
    return files.map((file) => {
      try {
        const data = fs.readFileSync(path.join(USER_DATA_DIR, file), "utf-8");
        return JSON.parse(data);
      } catch (error) {
        console.error(`Error reading ${file}:`, error);
        return null;
      }
    });
  }

  /**
   * Delete user account
   */
  static deleteUser(userId) {
    const userFile = path.join(USER_DATA_DIR, `${userId}.json`);
    if (fs.existsSync(userFile)) {
      fs.unlinkSync(userFile);
      return true;
    }
    return false;
  }

  /**
   * Export user data
   */
  static exportUserData(userId) {
    return this.getUserData(userId);
  }
}

module.exports = UserManager;
