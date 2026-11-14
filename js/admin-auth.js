/**
 * Admin Authentication & Authorization Module
 * Integrates Firebase Auth with Realtime Database Role Validation
 */

import { 
  auth, 
  db, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  ref,
  get,
  set
} from "./firebase-init.js";

let currentAdminUser = null;
let currentAdminProfile = null;

/**
 * Check if the given user UID is authorized in the `/admins` table
 */
export async function verifyAdminStatus(uid, userEmail = "") {
  if (!db) {
    throw new Error("Database is not connected.");
  }

  const adminRef = ref(db, `admins/${uid}`);
  let snapshot;
  try {
    snapshot = await get(adminRef);
  } catch (err) {
    console.error("Database read error:", err);
    throw new Error(
      "Realtime Database Permission Denied. Please ensure you have pasted and Published the security rules in Firebase Console > Build > Realtime Database > Rules tab."
    );
  }

  if (snapshot.exists()) {
    const adminData = snapshot.val();
    if (adminData.active === true) {
      return { authorized: true, profile: adminData };
    } else {
      return { authorized: false, reason: "Your administrator account has been deactivated." };
    }
  }

  // Attempt initial setup bootstrap if no admins exist yet
  try {
    const initialAdminData = {
      email: userEmail,
      role: "owner",
      active: true,
      createdAt: Date.now()
    };
    await set(adminRef, initialAdminData);
    console.info("Bootstrapped first admin user:", uid);
    return { authorized: true, profile: initialAdminData, bootstrapped: true };
  } catch (writeErr) {
    console.warn("Bootstrap write rejected:", writeErr);
    return { 
      authorized: false, 
      reason: "Your Firebase account is not registered in the restaurant administrator registry." 
    };
  }
}

/**
 * Initialize Admin Auth state listener
 */
export function initAdminAuth(callbacks = {}) {
  const { onAuthenticated, onUnauthenticated, onError } = callbacks;

  if (!auth) {
    if (onUnauthenticated) onUnauthenticated(null, "Firebase Authentication not initialized. Please configure credentials.");
    return () => {};
  }

  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const result = await verifyAdminStatus(user.uid, user.email);
        if (result.authorized) {
          currentAdminUser = user;
          currentAdminProfile = result.profile;
          if (onAuthenticated) {
            onAuthenticated(user, result.profile, result.bootstrapped);
          }
        } else {
          // Valid credentials, but not in admin directory
          await signOut(auth);
          currentAdminUser = null;
          currentAdminProfile = null;
          if (onUnauthenticated) {
            onUnauthenticated(null, result.reason || "Unauthorized access.");
          }
        }
      } catch (err) {
        console.error("Authorization check error:", err);
        await signOut(auth);
        currentAdminUser = null;
        currentAdminProfile = null;
        if (onError) onError(err);
      }
    } else {
      currentAdminUser = null;
      currentAdminProfile = null;
      if (onUnauthenticated) {
        onUnauthenticated(null);
      }
    }
  });

  return unsubscribe;
}

/**
 * Log in with email and password
 */
export async function loginAdmin(email, password) {
  if (!auth) {
    throw new Error("Firebase Authentication is not available. Check your configuration.");
  }
  const cleanEmail = email.trim();
  const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
  return credential.user;
}

/**
 * Log out
 */
export async function logoutAdmin() {
  if (!auth) return;
  await signOut(auth);
  currentAdminUser = null;
  currentAdminProfile = null;
}

/**
 * Send password reset email
 */
export async function resetAdminPassword(email) {
  if (!auth) {
    throw new Error("Firebase Authentication is not available.");
  }
  return await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Get current admin user
 */
export function getCurrentAdmin() {
  return {
    user: currentAdminUser,
    profile: currentAdminProfile
  };
}

