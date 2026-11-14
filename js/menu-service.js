/**
 * Menu Item Service
 * Handles CRUD operations for dishes/menu items in Firebase Realtime Database
 */

import { db, ref, get, set, update, remove, push, onValue, off } from "./firebase-init.js";

/**
 * Fetch all menu items once
 */
export async function getMenuItems() {
  if (!db) return {};
  try {
    const itemsRef = ref(db, "menuItems");
    const snapshot = await get(itemsRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return {};
  } catch (error) {
    console.error("Failed to fetch menu items:", error);
    throw error;
  }
}

/**
 * Subscribe to real-time menu item updates
 */
export function subscribeMenuItems(callback) {
  if (!db) {
    callback({});
    return () => {};
  }

  const itemsRef = ref(db, "menuItems");
  onValue(
    itemsRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback({});
      }
    },
    (error) => {
      console.error("Menu items listener error:", error);
    }
  );

  return () => {
    off(itemsRef);
  };
}

/**
 * Add a new menu item
 */
export async function addMenuItem(itemData) {
  if (!db) throw new Error("Firebase is not initialized.");
  try {
    const itemsRef = ref(db, "menuItems");
    const newItemRef = push(itemsRef);

    const payload = {
      name: itemData.name.trim(),
      description: itemData.description ? itemData.description.trim() : "",
      price: Number(itemData.price),
      originalPrice: itemData.originalPrice ? Number(itemData.originalPrice) : null,
      imageUrl: itemData.imageUrl ? itemData.imageUrl.trim() : "",
      categoryId: itemData.categoryId,
      foodType: itemData.foodType || "veg",
      spiceLevel: Number(itemData.spiceLevel) || 0,
      dietaryLabels: Array.isArray(itemData.dietaryLabels) ? itemData.dietaryLabels : [],
      featured: Boolean(itemData.featured),
      available: itemData.available !== undefined ? Boolean(itemData.available) : true,
      notes: itemData.notes ? itemData.notes.trim() : "",
      sortOrder: Number(itemData.sortOrder) || 1,
      createdAt: Date.now()
    };

    await set(newItemRef, payload);
    return newItemRef.key;
  } catch (error) {
    console.error("Failed to add menu item:", error);
    throw error;
  }
}

/**
 * Update an existing menu item
 */
export async function updateMenuItem(id, itemData) {
  if (!db) throw new Error("Firebase is not initialized.");
  try {
    const itemRef = ref(db, `menuItems/${id}`);

    const payload = {
      name: itemData.name.trim(),
      description: itemData.description ? itemData.description.trim() : "",
      price: Number(itemData.price),
      originalPrice: itemData.originalPrice ? Number(itemData.originalPrice) : null,
      imageUrl: itemData.imageUrl ? itemData.imageUrl.trim() : "",
      categoryId: itemData.categoryId,
      foodType: itemData.foodType || "veg",
      spiceLevel: Number(itemData.spiceLevel) || 0,
      dietaryLabels: Array.isArray(itemData.dietaryLabels) ? itemData.dietaryLabels : [],
      featured: Boolean(itemData.featured),
      available: Boolean(itemData.available),
      notes: itemData.notes ? itemData.notes.trim() : "",
      sortOrder: Number(itemData.sortOrder) || 1,
      updatedAt: Date.now()
    };

    await update(itemRef, payload);
    return true;
  } catch (error) {
    console.error(`Failed to update menu item ${id}:`, error);
    throw error;
  }
}

/**
 * Fast toggle of availability status
 */
export async function toggleItemAvailability(id, currentStatus) {
  if (!db) throw new Error("Firebase is not initialized.");
  try {
    const itemRef = ref(db, `menuItems/${id}`);
    await update(itemRef, {
      available: !currentStatus,
      updatedAt: Date.now()
    });
    return !currentStatus;
  } catch (error) {
    console.error(`Failed to toggle availability for item ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a menu item
 */
export async function deleteMenuItem(id) {
  if (!db) throw new Error("Firebase is not initialized.");
  try {
    const itemRef = ref(db, `menuItems/${id}`);
    await remove(itemRef);
    return true;
  } catch (error) {
    console.error(`Failed to delete menu item ${id}:`, error);
    throw error;
  }
}

