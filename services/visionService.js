/**
 * Vision & OCR Service
 * Handles image-based food item recognition
 * Requirement 3: Vision Input
 *
 * This service provides:
 * 1. Mock vision API (for demo without API keys)
 * 2. OpenAI Vision API integration (optional)
 * 3. Receipt OCR parsing
 * 4. Food image analysis
 */

/**
 * STEP 1: Mock Vision Analysis
 * Simulates food recognition from images without API calls
 * Detects items by filename or mock analysis
 */
function mockVisionAnalysis(imageUrl, imageFile = null) {
  // Extract filename if available
  const filename = imageFile || imageUrl.split("/").pop().toLowerCase();

  // Mock detection based on filename or random
  const mockDetections = {
    milk: {
      item: "Milk",
      confidence: 0.95,
      quantity: 1,
      expiry_estimate: 7,
      brand: "Generic",
      type: "Dairy",
    },
    yogurt: {
      item: "Yogurt",
      confidence: 0.92,
      quantity: 1,
      expiry_estimate: 5,
      brand: "Generic",
      type: "Dairy",
    },
    bread: {
      item: "Bread",
      confidence: 0.98,
      quantity: 1,
      expiry_estimate: 3,
      brand: "Generic",
      type: "Grains",
    },
    carrot: {
      item: "Carrots",
      confidence: 0.90,
      quantity: 1,
      expiry_estimate: 14,
      brand: "Generic",
      type: "Vegetables",
    },
    apple: {
      item: "Apples",
      confidence: 0.93,
      quantity: 1,
      expiry_estimate: 14,
      brand: "Generic",
      type: "Fruits",
    },
    egg: {
      item: "Eggs",
      confidence: 0.94,
      quantity: 1,
      expiry_estimate: 21,
      brand: "Generic",
      type: "Proteins",
    },
    rice: {
      item: "Rice",
      confidence: 0.91,
      quantity: 1,
      expiry_estimate: 365,
      brand: "Generic",
      type: "Grains",
    },
  };

  // Try to match filename
  for (const [key, detection] of Object.entries(mockDetections)) {
    if (filename.includes(key)) {
      return {
        success: true,
        method: "mock",
        detections: [detection],
        raw_image_url: imageUrl,
      };
    }
  }

  // Default detection
  return {
    success: true,
    method: "mock",
    detections: [
      {
        item: "Generic Food Item",
        confidence: 0.5,
        quantity: 1,
        expiry_estimate: 7,
        brand: "Unknown",
        type: "Other",
      },
    ],
    raw_image_url: imageUrl,
    note: "Could not identify item from filename. Manual entry recommended.",
  };
}

/**
 * STEP 2: OpenAI Vision API Integration (Optional)
 * Real image recognition using GPT-4 Vision
 */
async function callVisionAPI(imageUrl, apiKey = null) {
  // Check if API key is available
  if (!apiKey || !process.env.OPENAI_API_KEY) {
    return null; // Fall back to mock
  }

  try {
    // This would use the real OpenAI Vision API
    // For now, return null to trigger mock fallback
    // In production, implement actual API call:
    /*
    const { OpenAI } = require("openai");
    const client = new OpenAI({ apiKey });

    const response = await client.vision.analyze({
      imageUrl: imageUrl,
      prompt: "Identify the food item in this image. Return JSON: {item, confidence, expiry_estimate, brand}",
    });

    return {
      success: true,
      method: "openai-vision",
      detections: [response],
      raw_image_url: imageUrl,
    };
    */

    return null;
  } catch (error) {
    console.error("Vision API error:", error);
    return null;
  }
}

/**
 * STEP 3: Parse Receipt OCR
 * Extracts food items from receipt images
 */
function parseReceiptOCR(ocrText) {
  // Simple regex-based parsing of receipt text
  const itemRegex = /([a-zA-Z\s]+)\s+(\d+\.?\d*)\s+([a-zA-Z]{0,3})/gi;
  const items = [];

  let match;
  while ((match = itemRegex.exec(ocrText)) !== null) {
    const [, itemName, quantity, unit] = match;

    items.push({
      item: itemName.trim(),
      quantity: parseFloat(quantity),
      unit: unit || "unit",
      source: "receipt_ocr",
      confidence: 0.7, // Lower confidence for OCR
    });
  }

  return {
    success: items.length > 0,
    items: items,
    raw_text: ocrText,
  };
}

/**
 * STEP 4: Format Vision Data for Database
 * Converts vision output to inventory format
 */
function formatVisionDataForDB(visionResult, userId) {
  if (!visionResult.success || !visionResult.detections) {
    return null;
  }

  return visionResult.detections.map((detection) => ({
    userId: userId,
    customName: detection.item,
    quantity: detection.quantity || 1,
    unit: "unit",
    purchaseDate: new Date(),
    expirationDate: new Date(
      new Date().setDate(new Date().getDate() + detection.expiry_estimate)
    ),
    aiMetadata: {
      source: visionResult.method || "mock",
      confidence: detection.confidence,
      brand: detection.brand,
      type: detection.type,
      original_url: visionResult.raw_image_url,
    },
  }));
}

/**
 * STEP 5: Main Vision Handler
 * Orchestrates image processing pipeline
 */
async function processImageForInventory(imageUrl, userId, filename = null) {
  // Step 1: Try real API first
  let visionResult = await callVisionAPI(imageUrl);

  // Step 2: Fall back to mock if API unavailable
  if (!visionResult) {
    visionResult = mockVisionAnalysis(imageUrl, filename);
  }

  // Step 3: Format for database
  if (visionResult.success) {
    const inventoryItems = formatVisionDataForDB(visionResult, userId);
    return {
      success: true,
      method: visionResult.method,
      items: inventoryItems,
      detections: visionResult.detections,
    };
  }

  return {
    success: false,
    error: "Failed to process image",
  };
}

/**
 * STEP 6: Batch Process Multiple Images
 * Handles multiple receipt/food images at once
 */
async function batchProcessImages(imageUrls, userId) {
  const results = [];

  for (const imageUrl of imageUrls) {
    const result = await processImageForInventory(imageUrl, userId);
    results.push({
      imageUrl,
      ...result,
    });
  }

  // Aggregate results
  const totalItems = results.reduce(
    (sum, r) => sum + (r.items ? r.items.length : 0),
    0
  );

  return {
    success: true,
    totalImages: imageUrls.length,
    totalItemsDetected: totalItems,
    details: results,
  };
}

/**
 * STEP 7: Validate Vision Confidence
 * Checks if detected items are reliable
 */
function validateDetectionConfidence(detection, minConfidence = 0.7) {
  if (!detection.confidence) {
    return {
      valid: false,
      reason: "No confidence score",
    };
  }

  if (detection.confidence < minConfidence) {
    return {
      valid: false,
      reason: `Low confidence: ${detection.confidence} < ${minConfidence}`,
    };
  }

  return {
    valid: true,
    confidence: detection.confidence,
  };
}

module.exports = {
  mockVisionAnalysis,
  callVisionAPI,
  parseReceiptOCR,
  formatVisionDataForDB,
  processImageForInventory,
  batchProcessImages,
  validateDetectionConfidence,
};
