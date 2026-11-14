/**
 * Firebase Configuration File
 * -------------------------------------------------------------
 * Replace the placeholder values below with your actual Firebase project
 * configuration found in the Firebase Console:
 * Project Settings -> General -> Your apps -> Web app -> Config
 * 
 * Note: Firebase web config values (apiKey, authDomain, databaseURL, etc.)
 * are public identifiers for browser clients, not secret server keys.
 * Security is enforced via Firebase Realtime Database Security Rules
 * and Firebase Authentication.
 */

export const firebaseConfig = {
  apiKey: "AIzaSyCUBp9dUz8MFuvQwfnEJh3pxAkRamxwVK8",
  authDomain: "digitalmenuksa.firebaseapp.com",
  databaseURL: "https://digitalmenuksa-default-rtdb.firebaseio.com",
  projectId: "digitalmenuksa",
  storageBucket: "digitalmenuksa.firebasestorage.app",
  messagingSenderId: "183134619567",
  appId: "1:183134619567:web:9bcaea978326e555bcd15a"
};

/**
 * Returns active configuration, allowing local overrides if configured
 * via the in-app setup assistant.
 */
export function getActiveFirebaseConfig() {
  try {
    const saved = localStorage.getItem("digital_menu_firebase_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.databaseURL && parsed.apiKey && parsed.apiKey !== "YOUR_FIREBASE_API_KEY") {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Unable to parse local config override:", e);
  }
  return firebaseConfig;
}

/**
 * Checks whether the configuration is still using default placeholders
 */
export function isPlaceholderConfig(config = getActiveFirebaseConfig()) {
  return (
    !config.apiKey ||
    config.apiKey === "YOUR_FIREBASE_API_KEY" ||
    !config.databaseURL ||
    config.databaseURL.includes("YOUR_PROJECT_ID")
  );
}

