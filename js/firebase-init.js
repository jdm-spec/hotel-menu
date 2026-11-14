/**
 * Firebase Modular SDK Initialization
 * Uses the official Google Firebase v10 modular ES module distribution.
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  get, 
  set, 
  update, 
  remove, 
  push, 
  child, 
  onValue, 
  off 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { getActiveFirebaseConfig, isPlaceholderConfig } from "./firebase-config.js";

let app = null;
let db = null;
let auth = null;
let isConfigured = false;
let initError = null;

try {
  const activeConfig = getActiveFirebaseConfig();
  if (!isPlaceholderConfig(activeConfig)) {
    app = getApps().length > 0 ? getApp() : initializeApp(activeConfig);
    db = getDatabase(app);
    auth = getAuth(app);
    isConfigured = true;
  } else {
    isConfigured = false;
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
  initError = error;
  isConfigured = false;
}

export {
  app,
  db,
  auth,
  isConfigured,
  initError,
  // Database modular primitives
  ref,
  get,
  set,
  update,
  remove,
  push,
  child,
  onValue,
  off,
  // Auth modular primitives
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
};

