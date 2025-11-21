/**
 * Mock Data for Hackathon Demo
 * Simulates User History & Current Inventory
 * So you can see waste metrics and SDG scores without waiting weeks
 */

// Simulated user history (past consumption & waste logs)
// These represent food items the user has already logged
const mockUserHistory = [
  { 
    foodName: "Spinach", 
    price: 2.50, 
    status: "wasted", 
    quantity: 1,
    date: "2025-11-10",
    reason: "Turned soggy"
  },
  { 
    foodName: "Milk", 
    price: 1.20, 
    status: "consumed", 
    quantity: 1,
    date: "2025-11-12"
  },
  { 
    foodName: "Chicken Breast", 
    price: 5.00, 
    status: "consumed", 
    quantity: 1,
    date: "2025-11-15"
  },
  { 
    foodName: "Bread", 
    price: 1.50, 
    status: "wasted", 
    quantity: 1,
    date: "2025-11-18",
    reason: "Got moldy"
  },
  { 
    foodName: "Tomatoes", 
    price: 1.80, 
    status: "consumed", 
    quantity: 1,
    date: "2025-11-19"
  },
  { 
    foodName: "Cheese", 
    price: 3.20, 
    status: "wasted", 
    quantity: 1,
    date: "2025-11-20",
    reason: "Expired unexpectedly"
  },
];

// Current items in the fridge (active inventory)
// Today is 2025-11-21
const mockCurrentInventory = [
  {
    itemId: "inv_001",
    item: "Yogurt",
    price: 1.00,
    quantity: 2,
    unit: "units",
    expiry: "2025-11-22", // Expiring tomorrow (HIGH RISK)
    status: "active",
    purchaseDate: "2025-11-18"
  },
  {
    itemId: "inv_002",
    item: "Carrots",
    price: 0.80,
    quantity: 1,
    unit: "kg",
    expiry: "2025-11-28", // 7 days left
    status: "active",
    purchaseDate: "2025-11-18"
  },
  {
    itemId: "inv_003",
    item: "Rice",
    price: 2.50,
    quantity: 5,
    unit: "kg",
    expiry: "2026-11-21", // Shelf stable
    status: "active",
    purchaseDate: "2025-10-01"
  },
  {
    itemId: "inv_004",
    item: "Apples",
    price: 1.50,
    quantity: 4,
    unit: "pieces",
    expiry: "2025-11-25", // 4 days left
    status: "active",
    purchaseDate: "2025-11-17"
  },
];

module.exports = {
  mockUserHistory,
  mockCurrentInventory,
};
