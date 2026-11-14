/**
 * Input Validation Module
 * Enforces data integrity before writes to Firebase Realtime Database
 */

export function isValidHttpUrl(string) {
  if (!string || typeof string !== "string") return false;
  // Allow relative asset paths such as assets/images/...
  if (string.startsWith("assets/") || string.startsWith("./") || string.startsWith("/")) {
    return true;
  }
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}

/**
 * Validate Category
 */
export function validateCategory(data) {
  const errors = [];

  if (!data || typeof data !== "object") {
    return { isValid: false, errors: ["Invalid category payload."] };
  }

  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name || name.length < 2) {
    errors.push("Category name must be at least 2 characters.");
  }
  if (name.length > 50) {
    errors.push("Category name cannot exceed 50 characters.");
  }

  const sortOrder = Number(data.sortOrder);
  if (isNaN(sortOrder) || sortOrder < 0) {
    errors.push("Sort order must be a valid non-negative number.");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate Menu Item
 */
export function validateMenuItem(data, existingCategories = {}) {
  const errors = [];

  if (!data || typeof data !== "object") {
    return { isValid: false, errors: ["Invalid menu item payload."] };
  }

  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name || name.length < 2) {
    errors.push("Dish name must be at least 2 characters.");
  }
  if (name.length > 100) {
    errors.push("Dish name cannot exceed 100 characters.");
  }

  const price = Number(data.price);
  if (isNaN(price) || price < 0) {
    errors.push("Price must be a valid non-negative number.");
  }

  if (data.originalPrice !== undefined && data.originalPrice !== null && data.originalPrice !== "") {
    const origPrice = Number(data.originalPrice);
    if (isNaN(origPrice) || origPrice < 0) {
      errors.push("Original price must be a valid non-negative number.");
    }
  }

  if (!data.categoryId || typeof data.categoryId !== "string") {
    errors.push("A valid category must be selected.");
  } else if (Object.keys(existingCategories).length > 0 && !existingCategories[data.categoryId]) {
    errors.push("The selected category does not exist.");
  }

  if (data.imageUrl && data.imageUrl.trim() !== "") {
    if (!isValidHttpUrl(data.imageUrl.trim())) {
      errors.push("Image URL must be a valid HTTP/HTTPS link or local asset path.");
    }
  }

  const allowedFoodTypes = ["veg", "non-veg", "vegan", "egg"];
  if (data.foodType && !allowedFoodTypes.includes(data.foodType)) {
    errors.push("Food type must be one of: veg, non-veg, vegan, egg.");
  }

  if (data.spiceLevel !== undefined && data.spiceLevel !== null) {
    const spice = Number(data.spiceLevel);
    if (isNaN(spice) || spice < 0 || spice > 3) {
      errors.push("Spice level must be between 0 and 3.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate Restaurant Profile
 */
export function validateRestaurantProfile(data) {
  const errors = [];

  if (!data || typeof data !== "object") {
    return { isValid: false, errors: ["Invalid restaurant settings payload."] };
  }

  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name || name.length < 2) {
    errors.push("Restaurant name is required.");
  }

  const currency = typeof data.currency === "string" ? data.currency.trim() : "";
  if (!currency || currency.length > 5) {
    errors.push("Currency symbol/code is required (e.g. $, ₹, €, £).");
  }

  if (data.logoUrl && data.logoUrl.trim() !== "" && !isValidHttpUrl(data.logoUrl.trim())) {
    errors.push("Logo URL must be a valid URL.");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

