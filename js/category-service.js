/**
 * Category Service
 * Handles CRUD operations for menu categories in Firebase Realtime Database
 */

import { db, ref, get, set, update, remove, push, onValue, off } from "./firebase-init.js";

/**
 * Fetch all categories once
 */
export async function getCategories() {
  if (!db) return {};
  try {
    const categoriesRef = ref(db, "categories");
    const snapshot = await get(categoriesRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return {};
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    throw error;
  }
}

/**
 * Subscribe to category updates in real time
 */
export function subscribeCategories(callback) {
  if (!db) {
    callback({});
    return () => {};
  }

  const categoriesRef = ref(db, "categories");
  onValue(
    categoriesRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback({});
      }
    },
    (error) => {
      console.error("Categories listener error:", error);
    }
  );

  return () => {
    off(categoriesRef);
  };
}

/**
 * Add a new category
 */
export async function addCategory(categoryData) {
  if (!db) throw new Error("Firebase is not initialized.");
  try {
    const categoriesRef = ref(db, "categories");
    const newCategoryRef = push(categoriesRef);
    
    const payload = {
      name: categoryData.name.trim(),
      description: categoryData.description ? categoryData.description.trim() : "",
      sortOrder: Number(categoryData.sortOrder) || 1,
      active: categoryData.active !== undefined ? Boolean(categoryData.active) : true,
      createdAt: Date.now()
    };

    await set(newCategoryRef, payload);
    return newCategoryRef.key;
  } catch (error) {
    console.error("Failed to add category:", error);
    throw error;
  }
}

/**
 * Update an existing category
 */
export async function updateCategory(id, categoryData) {
  if (!db) throw new Error("Firebase is not initialized.");
  try {
    const categoryRef = ref(db, `categories/${id}`);
    const payload = {
      name: categoryData.name.trim(),
      description: categoryData.description ? categoryData.description.trim() : "",
      sortOrder: Number(categoryData.sortOrder) || 1,
      active: Boolean(categoryData.active),
      updatedAt: Date.now()
    };

    await update(categoryRef, payload);
    return true;
  } catch (error) {
    console.error(`Failed to update category ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a category
 */
export async function deleteCategory(id) {
  if (!db) throw new Error("Firebase is not initialized.");
  try {
    const categoryRef = ref(db, `categories/${id}`);
    await remove(categoryRef);
    return true;
  } catch (error) {
    console.error(`Failed to delete category ${id}:`, error);
    throw error;
  }
}

