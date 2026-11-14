/**
 * Restaurant Service
 * Handles reading and updating the restaurant profile in Firebase Realtime Database
 */

import { db, ref, get, set, update, onValue, off } from "./firebase-init.js";

export const DEFAULT_RESTAURANT_PROFILE = {
  name: "L'Olivier & Sel",
  tagline: "Contemporary Artisanal Cuisine & Botanical Bar",
  description: "Rooted in French Mediterranean traditions with modern culinary touches. Fresh farm-to-table ingredients, wood-fired hearth cooking, and handcrafted botanical cocktails.",
  address: "42 Provençal Avenue, Culinary District",
  phone: "+1 (555) 349-8201",
  currency: "$",
  logoUrl: "",
  coverImageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80",
  whatsappNumber: "+15553498201",
  enableWhatsappOrders: true,
  socialLinks: {
    instagram: "https://instagram.com",
    facebook: "https://facebook.com",
    googleMaps: "https://maps.google.com"
  },
  openingHours: {
    monday: { open: "11:30", close: "22:30", closed: false },
    tuesday: { open: "11:30", close: "22:30", closed: false },
    wednesday: { open: "11:30", close: "22:30", closed: false },
    thursday: { open: "11:30", close: "23:00", closed: false },
    friday: { open: "11:30", close: "23:30", closed: false },
    saturday: { open: "10:30", close: "23:30", closed: false },
    sunday: { open: "10:30", close: "22:00", closed: false }
  }
};

/**
 * Get restaurant profile once
 */
export async function getRestaurantProfile() {
  if (!db) return DEFAULT_RESTAURANT_PROFILE;
  try {
    const restaurantRef = ref(db, "restaurant");
    const snapshot = await get(restaurantRef);
    if (snapshot.exists()) {
      return { ...DEFAULT_RESTAURANT_PROFILE, ...snapshot.val() };
    }
    return DEFAULT_RESTAURANT_PROFILE;
  } catch (error) {
    console.error("Failed to read restaurant profile:", error);
    throw error;
  }
}

/**
 * Subscribe to real-time restaurant profile updates
 */
export function subscribeRestaurantProfile(callback) {
  if (!db) {
    callback(DEFAULT_RESTAURANT_PROFILE);
    return () => {};
  }

  const restaurantRef = ref(db, "restaurant");
  const unsubscribe = onValue(
    restaurantRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback({ ...DEFAULT_RESTAURANT_PROFILE, ...snapshot.val() });
      } else {
        callback(DEFAULT_RESTAURANT_PROFILE);
      }
    },
    (error) => {
      console.error("Restaurant listener error:", error);
    }
  );

  return () => {
    off(restaurantRef);
  };
}

/**
 * Update restaurant profile
 */
export async function updateRestaurantProfile(profileData) {
  if (!db) throw new Error("Firebase is not initialized.");
  try {
    const restaurantRef = ref(db, "restaurant");
    await update(restaurantRef, profileData);
    return true;
  } catch (error) {
    console.error("Failed to update restaurant profile:", error);
    throw error;
  }
}

