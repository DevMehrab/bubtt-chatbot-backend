// ============================================================================
// NourishAI Chatbot Frontend - Enhanced with User Accounts & Preferences
// ============================================================================

const API_BASE = "http://localhost:3000/api";
let currentUserId = "user123";
let currentUserData = null;

// ============================================================================
// DOM Elements
// ============================================================================

const chatMessages = document.getElementById("chatMessages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const userIdInput = document.getElementById("userIdInput");
const updateUserBtn = document.getElementById("updateUserBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const togglePrefsBtn = document.getElementById("togglePrefsBtn");
const savePrefsBtn = document.getElementById("savePrefsBtn");
const preferencesForm = document.getElementById("preferencesForm");
const budgetLevel = document.getElementById("budgetLevel");
const familySize = document.getElementById("familySize");
const dietaryPrefs = document.getElementById("dietaryPrefs");
const allergies = document.getElementById("allergies");
const navButtons = document.querySelectorAll(".nav-btn");
const contentSections = document.querySelectorAll(".content-section");
const spinner = document.getElementById("loadingSpinner");
const toast = document.getElementById("toast");

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
    loadUserAccount();
    startNewConversation();
    greetUser();
});

function setupEventListeners() {
    // Chat controls
    sendBtn.addEventListener("click", sendMessage);
    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    // User controls
    updateUserBtn.addEventListener("click", createOrLoadUser);
    clearHistoryBtn.addEventListener("click", clearChatHistory);
    togglePrefsBtn.addEventListener("click", togglePreferencesForm);
    savePrefsBtn.addEventListener("click", saveUserPreferences);

    // Navigation
    navButtons.forEach((btn) => {
        btn.addEventListener("click", handleNavigation);
    });

    // Analytics
    document.getElementById("loadAnalyticsBtn").addEventListener("click", loadAnalytics);
    document.getElementById("loadInventoryBtn").addEventListener("click", loadInventory);
    document.getElementById("addItemBtn").addEventListener("click", addInventoryItem);
    document.getElementById("generateMealBtn").addEventListener("click", generateMealPlan);
    document.getElementById("generateWeeklyBtn").addEventListener("click", generateWeeklyMealPlan);
    document.getElementById("loadSDGBtn").addEventListener("click", loadSDGProfile);
}

// ============================================================================
// User Account Management
// ============================================================================

async function loadUserAccount() {
    currentUserId = userIdInput.value.trim() || "user123";
    
    try {
        const response = await fetch(`${API_BASE}/user/${currentUserId}`);
        const data = await response.json();

        if (data.success) {
            currentUserData = data.user;
            updatePreferencesUI(currentUserData.preferences);
            await loadConversationHistory();
            showToast(`Welcome back, ${currentUserId}!`, "default");
        }
    } catch (error) {
        console.log("New user - creating account...");
    }
}

async function createOrLoadUser() {
    const newUserId = userIdInput.value.trim();

    if (!newUserId) {
        showToast("Please enter a User ID", "warning");
        return;
    }

    currentUserId = newUserId;
    showSpinner(true);

    try {
        // Try to create/load user with preferences
        const response = await fetch(`${API_BASE}/user/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userId: newUserId,
                budget: "moderate",
                familySize: 1,
                dietaryPreferences: [],
                allergies: [],
            }),
        });

        const data = await response.json();

        if (data.success) {
            currentUserData = data.user;
            updatePreferencesUI(data.user.preferences);
            startNewConversation();
            greetUser();
            
            // Load conversation history after greeting
            await loadConversationHistory();
            
            showToast(`Account loaded: ${newUserId}`, "default");
        }
    } catch (error) {
        console.error("Error creating user:", error);
        showToast("Error creating user account", "error");
    } finally {
        showSpinner(false);
    }
}

function togglePreferencesForm() {
    preferencesForm.style.display =
        preferencesForm.style.display === "none" ? "block" : "none";
}

async function saveUserPreferences() {
    const preferences = {
        budget: budgetLevel.value,
        familySize: parseInt(familySize.value),
        dietaryPreferences: dietaryPrefs.value.split(",").map((p) => p.trim()),
        allergies: allergies.value.split(",").map((a) => a.trim()),
    };

    showSpinner(true);

    try {
        const response = await fetch(
            `${API_BASE}/user/${currentUserId}/preferences`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(preferences),
            }
        );

        const data = await response.json();

        if (data.success) {
            currentUserData.preferences = data.preferences;
            showToast("Preferences saved successfully!", "default");
            preferencesForm.style.display = "none";
        }
    } catch (error) {
        console.error("Error saving preferences:", error);
        showToast("Failed to save preferences", "error");
    } finally {
        showSpinner(false);
    }
}

function updatePreferencesUI(preferences) {
    budgetLevel.value = preferences.budget || "moderate";
    familySize.value = preferences.familySize || 1;
    dietaryPrefs.value = (preferences.dietaryPreferences || []).join(", ");
    allergies.value = (preferences.allergies || []).join(", ");
}

async function loadConversationHistory() {
    try {
        const response = await fetch(`${API_BASE}/user/${currentUserId}/conversations?limit=50`);
        const data = await response.json();
        
        if (data.success && data.conversations && data.conversations.length > 0) {
            // Clear existing messages except welcome
            const messages = document.querySelectorAll(".message");
            messages.forEach((msg, idx) => {
                if (idx > 0) msg.remove(); // Keep welcome message
            });
            
            // Load all conversations into chat
            data.conversations.forEach((conv) => {
                addMessageToChat(conv.userMessage, "user");
                addMessageToChat(conv.botResponse, "bot");
            });
            
            showToast(`Loaded ${data.conversations.length} previous messages`, "default");
            console.log("✅ Loaded conversation history:", data.conversations.length, "messages");
        }
    } catch (error) {
        console.error("Error loading conversation history:", error);
    }
}

// ============================================================================
// Chat Functions
// ============================================================================

async function sendMessage() {
    const message = chatInput.value.trim();

    if (!message) return;

    // Add user message to chat
    addMessageToChat(message, "user");
    chatInput.value = "";
    chatInput.focus();

    showSpinner(true);

    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userId: currentUserId,
                message: message,
                preferences: currentUserData?.preferences || {
                    budget: "moderate",
                    familySize: 1,
                    dietaryPreferences: [],
                    allergies: [],
                },
            }),
        });

        const data = await response.json();

        if (data.success) {
            addMessageToChat(data.message, "bot");
            showToast("Response from NourishAI ✨", "default");
        } else {
            showToast("Error: " + data.error, "error");
            addMessageToChat("Sorry, I encountered an error. Please try again.", "bot");
        }
    } catch (error) {
        console.error("Chat error:", error);
        showToast("Failed to send message", "error");
        addMessageToChat("Sorry, I'm having trouble connecting. Please try again.", "bot");
    } finally {
        showSpinner(false);
    }
}

function addMessageToChat(message, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}-message`;

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";

    // Convert URLs to links
    let formattedMessage = message.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" style="color: inherit; text-decoration: underline;">$1</a>'
    );

    contentDiv.innerHTML = formattedMessage;

    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function startNewConversation() {
    chatMessages.innerHTML = `
        <div class="message bot-message">
            <div class="message-content">
                <p>👋 হ্যালো! I'm NourishAI, আপনার খাদ্য বর্জ্য হ্রাস সহায়ক (Your food waste reduction assistant).</p>
                <p>🇧🇩 <strong>Bangladesh-Specific Support:</strong></p>
                <ul style="margin-left: 20px; margin-top: 5px; font-size: 13px;">
                    <li>Food waste reduction advice</li>
                    <li>Budget meal planning (100-400 BDT/day)</li>
                    <li>Nutrition balancing with local foods</li>
                    <li>Leftover transformation recipes</li>
                    <li>Food sharing network guidance</li>
                    <li>Environmental impact education</li>
                </ul>
                <p style="margin-top: 10px;"><strong>Try asking:</strong></p>
                <small>"What can I make?", "Reduce food waste tips", "Budget meal plan", "Show my SDG score"</small>
            </div>
        </div>
    `;
}

function greetUser() {
    const hour = new Date().getHours();
    let greeting;

    if (hour < 12) greeting = "শুভ প্রভাত (Good morning)";
    else if (hour < 18) greeting = "শুভ অপরাহ্ন (Good afternoon)";
    else greeting = "শুভ সন্ধ্যা (Good evening)";

    addMessageToChat(
        `${greeting}! 👋 স্বাগতম NourishAI-তে। আমি আপনাকে খাদ্য বর্জ্য কমাতে এবং স্মার্ট খাবারের পছন্দ করতে সাহায্য করছি। আজ আপনি কী করতে চান?`,
        "bot"
    );
}

function clearChatHistory() {
    if (confirm("আপনি কি চ্যাট ইতিহাস সাফ করতে নিশ্চিত? (Clear chat history?)")) {
        startNewConversation();
        showToast("Chat history cleared", "default");
    }
}

// ============================================================================
// Analytics Functions
// ============================================================================

async function loadAnalytics() {
    showSpinner(true);

    try {
        const response = await fetch(`${API_BASE}/user/${currentUserId}/sdg-profile`);
        const data = await response.json();

        if (data.success) {
            // Update SDG Score
            document.getElementById("sdgScoreDisplay").innerHTML = `
                <div class="score-number">${data.personalSDGScore}</div>
                <div class="score-label">/100</div>
            `;

            // Update stats
            document.getElementById("wasteReduction").textContent =
                data.waste.wastePercentage + "%";
            document.getElementById("nutritionScore").textContent =
                data.nutrition.nutritionScore + "%";
            document.getElementById("improvementPotential").textContent =
                "+" + (data.estimatedNewScore - data.personalSDGScore) + "%";

            // Update details
            let detailsHTML = `
                <div>
                    <h4>🎯 Current Score: ${data.personalSDGScore}/100</h4>
                    <p>${data.scoreInterpretation}</p>
                </div>
                <div style="margin-top: 15px;">
                    <h4>♻️ Waste Analysis</h4>
                    <p><strong>Waste Percentage:</strong> ${data.waste.wastePercentage}%</p>
                    <p><strong>Consumed Items:</strong> ${data.waste.consumedCount}</p>
                    <p><strong>Wasted Items:</strong> ${data.waste.wastedCount}</p>
                </div>
                <div style="margin-top: 15px;">
                    <h4>🥗 Nutrition Score</h4>
                    <p><strong>Score:</strong> ${data.nutrition.nutritionScore}%</p>
                    <p><strong>Variety:</strong> ${data.nutrition.varietyScore}%</p>
                </div>
                <div style="margin-top: 15px;">
                    <h4>💡 Recommendations</h4>
                    <ul style="margin-left: 20px; margin-top: 10px;">
                        ${data.recommendations.map((r) => `<li>${r}</li>`).join("")}
                    </ul>
                </div>
            `;

            document.getElementById("analyticsDetails").innerHTML = detailsHTML;
            showToast("Analytics loaded successfully", "default");
        } else {
            showToast("Error loading analytics", "error");
        }
    } catch (error) {
        console.error("Analytics error:", error);
        showToast("Failed to load analytics", "error");
    } finally {
        showSpinner(false);
    }
}

// ============================================================================
// Inventory Functions
// ============================================================================

async function loadInventory() {
    showSpinner(true);

    try {
        const response = await fetch(`${API_BASE}/user/${currentUserId}/inventory`);
        const data = await response.json();

        if (data.success) {
            const inventoryList = document.getElementById("inventoryList");

            if (data.inventory.length === 0) {
                inventoryList.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No items in inventory</p>';
            } else {
                inventoryList.innerHTML = data.inventory
                    .map(
                        (item) => `
                    <div class="inventory-item">
                        <div class="item-info">
                            <div class="item-name">${item.name}</div>
                            <div class="item-details">
                                Qty: ${item.quantity} ${item.unit} • Category: ${item.category}
                            </div>
                        </div>
                        <div class="item-expiry">
                            ${item.daysLeft > 0 ? `${item.daysLeft} days left` : "EXPIRED"}
                        </div>
                    </div>
                `
                    )
                    .join("");
            }

            showToast(`Loaded ${data.count} items`, "default");
        } else {
            showToast("Error loading inventory", "error");
        }
    } catch (error) {
        console.error("Inventory error:", error);
        showToast("Failed to load inventory", "error");
    } finally {
        showSpinner(false);
    }
}

async function addInventoryItem() {
    const name = document.getElementById("itemName").value.trim();
    const quantity = document.getElementById("itemQuantity").value.trim();
    const expiry = document.getElementById("itemExpiry").value;

    if (!name || !quantity || !expiry) {
        showToast("Please fill in all fields", "warning");
        return;
    }

    showSpinner(true);

    try {
        const response = await fetch(`${API_BASE}/user/${currentUserId}/inventory`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                customName: name,
                quantity: parseInt(quantity),
                unit: "piece",
                expirationDate: expiry,
            }),
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById("itemName").value = "";
            document.getElementById("itemQuantity").value = "";
            document.getElementById("itemExpiry").value = "";
            showToast(`Added ${name} to inventory`, "default");
            loadInventory();
        } else {
            showToast("Error adding item", "error");
        }
    } catch (error) {
        console.error("Add item error:", error);
        showToast("Failed to add item", "error");
    } finally {
        showSpinner(false);
    }
}

// ============================================================================
// Meal Plan Functions
// ============================================================================

async function generateMealPlan() {
    showSpinner(true);

    try {
        const response = await fetch(`${API_BASE}/user/${currentUserId}/meal-plan`);
        const data = await response.json();

        if (data.success) {
            const content = document.getElementById("mealPlanContent");

            let mealHTML = "<div>";
            if (data.mealPlan.meals && data.mealPlan.meals.length > 0) {
                mealHTML += data.mealPlan.meals
                    .map(
                        (meal) => `
                    <div class="meal-item">
                        <div class="meal-time">🍽️ ${meal.mealType || "Meal"}</div>
                        <div class="meal-recipe"><strong>${meal.name || meal.recipe}</strong></div>
                        <div class="meal-ingredients">
                            <strong>Ingredients:</strong> ${
                                meal.ingredients ? meal.ingredients.join(", ") : "N/A"
                            }
                        </div>
                        <div class="meal-ingredients" style="margin-top: 8px;">
                            <strong>Benefits:</strong> ${
                                meal.benefits || "Balanced nutrition"
                            }
                        </div>
                    </div>
                `
                    )
                    .join("");
            } else {
                mealHTML += '<p>No meals could be generated. Add items to your inventory!</p>';
            }
            mealHTML += "</div>";

            content.innerHTML = mealHTML;
            showToast("Meal plan generated!", "default");
        } else {
            showToast("Error generating meal plan", "error");
        }
    } catch (error) {
        console.error("Meal plan error:", error);
        showToast("Failed to generate meal plan", "error");
    } finally {
        showSpinner(false);
    }
}

async function generateWeeklyMealPlan() {
    showSpinner(true);

    try {
        const response = await fetch(`${API_BASE}/user/${currentUserId}/weekly-meal-plan`);
        const data = await response.json();

        if (data.success) {
            const content = document.getElementById("mealPlanContent");

            let weeklyHTML = "<div>";
            if (data.weeklyPlan.mealPlan && data.weeklyPlan.mealPlan.length > 0) {
                weeklyHTML += data.weeklyPlan.mealPlan
                    .map(
                        (day, index) => `
                    <div class="meal-item">
                        <div class="meal-time">📅 Day ${index + 1}</div>
                        <div class="meal-recipe"><strong>${day.name || day.recipe}</strong></div>
                        <div class="meal-ingredients">
                            <strong>Ingredients:</strong> ${
                                day.ingredients ? day.ingredients.join(", ") : "N/A"
                            }
                        </div>
                    </div>
                `
                    )
                    .join("");
            } else {
                weeklyHTML += '<p>No weekly plan could be generated. Add items to your inventory!</p>';
            }
            weeklyHTML += "</div>";

            content.innerHTML = weeklyHTML;
            showToast("Weekly meal plan generated!", "default");
        } else {
            showToast("Error generating weekly plan", "error");
        }
    } catch (error) {
        console.error("Weekly meal plan error:", error);
        showToast("Failed to generate weekly plan", "error");
    } finally {
        showSpinner(false);
    }
}

// ============================================================================
// SDG Profile Functions
// ============================================================================

async function loadSDGProfile() {
    showSpinner(true);

    try {
        const response = await fetch(`${API_BASE}/user/${currentUserId}/sdg-profile`);
        const data = await response.json();

        if (data.success) {
            // Update main score
            document.getElementById("personalSDGScore").textContent =
                data.personalSDGScore;
            document.getElementById("scoreInterpretation").textContent =
                data.scoreInterpretation;

            // Update waste analysis
            let wasteHTML = `
                <p><strong>Waste Percentage:</strong> ${data.waste.wastePercentage}%</p>
                <p><strong>Consumed:</strong> ${data.waste.consumedCount} items</p>
                <p><strong>Wasted:</strong> ${data.waste.wastedCount} items</p>
                <p><strong>Impact:</strong> ${data.waste.impactMessage}</p>
            `;
            document.getElementById("wasteAnalysis").innerHTML = wasteHTML;

            // Update nutrition analysis
            let nutritionHTML = `
                <p><strong>Nutrition Score:</strong> ${data.nutrition.nutritionScore}%</p>
                <p><strong>Variety Score:</strong> ${data.nutrition.varietyScore}%</p>
                <p><strong>Suggestions:</strong></p>
                <ul style="margin-left: 20px;">
                    ${data.nutrition.suggestions.map((s) => `<li>${s}</li>`).join("")}
                </ul>
            `;
            document.getElementById("nutritionAnalysis").innerHTML = nutritionHTML;

            // Update recommendations
            const recommendationsHTML = data.recommendations
                .map((r) => `<li>${r}</li>`)
                .join("");
            document.getElementById("recommendations").innerHTML =
                recommendationsHTML;

            showToast("SDG Profile loaded!", "default");
        } else {
            showToast("Error loading SDG profile", "error");
        }
    } catch (error) {
        console.error("SDG profile error:", error);
        showToast("Failed to load SDG profile", "error");
    } finally {
        showSpinner(false);
    }
}

// ============================================================================
// Navigation
// ============================================================================

function handleNavigation(e) {
    const section = e.target.dataset.section;

    // Update active button
    navButtons.forEach((btn) => btn.classList.remove("active"));
    e.target.classList.add("active");

    // Update active section
    contentSections.forEach((sec) => sec.classList.remove("active"));
    document.getElementById(`${section}-section`).classList.add("active");
}

// ============================================================================
// Utility Functions
// ============================================================================

function showSpinner(show) {
    if (show) {
        spinner.classList.remove("hidden");
    } else {
        spinner.classList.add("hidden");
    }
}

function showToast(message, type = "default") {
    toast.textContent = message;
    toast.className = "toast show";

    if (type === "error") {
        toast.classList.add("error");
    } else if (type === "warning") {
        toast.classList.add("warning");
    }

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// ============================================================================
// Auto-save conversation to localStorage
// ============================================================================

window.addEventListener("beforeunload", () => {
    if (currentConversationId) {
        localStorage.setItem(
            "lastConversationId",
            JSON.stringify({
                conversationId: currentConversationId,
                userId: currentUserId,
            })
        );
    }
});

// Load last conversation if available
window.addEventListener("load", () => {
    const lastConv = localStorage.getItem("lastConversationId");
    if (lastConv) {
        try {
            const { conversationId } = JSON.parse(lastConv);
            currentConversationId = conversationId;
        } catch (e) {
            console.log("Could not restore last conversation");
        }
    }
});
