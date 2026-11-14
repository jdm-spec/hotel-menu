/**
 * Restaurant Admin Dashboard & Management Controller
 * Handles authentication guard, live database subscriptions, CRUD workflows,
 * metric calculations, and input validation.
 */

import { isConfigured, db } from "./firebase-init.js";
import { initAdminAuth, loginAdmin, logoutAdmin, resetAdminPassword } from "./admin-auth.js";
import { 
  getRestaurantProfile, 
  subscribeRestaurantProfile, 
  updateRestaurantProfile, 
  DEFAULT_RESTAURANT_PROFILE 
} from "./restaurant-service.js";
import { 
  getCategories, 
  subscribeCategories, 
  addCategory, 
  updateCategory, 
  deleteCategory 
} from "./category-service.js";
import { 
  getMenuItems, 
  subscribeMenuItems, 
  addMenuItem, 
  updateMenuItem, 
  toggleItemAvailability, 
  deleteMenuItem 
} from "./menu-service.js";
import { validateCategory, validateMenuItem, validateRestaurantProfile } from "./validation.js";
import { formatPrice, escapeHtml, showToast, handleImageFallback } from "./utils.js";
import { seedInitialData, SAMPLE_CATEGORIES, SAMPLE_MENU_ITEMS } from "./seed-data.js";

// State
const state = {
  adminUser: null,
  restaurant: { ...DEFAULT_RESTAURANT_PROFILE },
  categories: {},
  menuItems: {},
  activeTab: "dashboard",
  dishSearchQuery: "",
  dishCategoryFilter: "all",
  pendingDeleteAction: null // { type: 'dish' | 'category', id: string, name: string }
};

// DOM References
const elements = {
  authLoadingScreen: document.getElementById("auth-loading-screen"),
  loginView: document.getElementById("login-view"),
  adminAppView: document.getElementById("admin-app-view"),
  adminLoginForm: document.getElementById("admin-login-form"),
  loginEmailInput: document.getElementById("login-email"),
  loginPasswordInput: document.getElementById("login-password"),
  loginErrorAlert: document.getElementById("login-error-alert"),
  loginErrorText: document.getElementById("login-error-text"),
  btnLoginSubmit: document.getElementById("btn-login-submit"),
  btnForgotPassword: document.getElementById("btn-forgot-password"),
  btnShowHelp: document.getElementById("btn-show-firebase-setup-help"),
  firebaseHelpBox: document.getElementById("firebase-help-box"),
  btnCloseHelpBox: document.getElementById("btn-close-help-box"),
  btnAdminLogout: document.getElementById("btn-admin-logout"),

  adminTopbarRestaurantName: document.getElementById("admin-topbar-restaurant-name"),
  navTabs: document.querySelectorAll(".admin-nav-tab"),
  tabPanes: document.querySelectorAll(".admin-tab-pane"),

  // Dashboard Stats
  statTotalCategories: document.getElementById("stat-total-categories"),
  statTotalDishes: document.getElementById("stat-total-dishes"),
  statActiveDishes: document.getElementById("stat-active-dishes"),
  statSoldoutDishes: document.getElementById("stat-soldout-dishes"),
  statFeaturedDishes: document.getElementById("stat-featured-dishes"),
  dashboardRecentDishesTable: document.getElementById("dashboard-recent-dishes-table"),
  btnQuickAddDish: document.getElementById("btn-quick-add-dish"),
  btnQuickAddCategory: document.getElementById("btn-quick-add-category"),
  btnSeedSampleData: document.getElementById("btn-seed-sample-data"),

  // Dishes Tab
  adminDishSearch: document.getElementById("admin-dish-search"),
  adminDishCategoryFilter: document.getElementById("admin-dish-category-filter"),
  btnOpenAddDishModal: document.getElementById("btn-open-add-dish-modal"),
  adminDishesTableBody: document.getElementById("admin-dishes-table-body"),
  adminDishesEmptyMessage: document.getElementById("admin-dishes-empty-message"),

  // Categories Tab
  btnOpenAddCategoryModal: document.getElementById("btn-open-add-category-modal"),
  adminCategoriesTableBody: document.getElementById("admin-categories-table-body"),
  adminCategoriesEmptyMessage: document.getElementById("admin-categories-empty-message"),

  // Settings Tab
  formRestaurantSettings: document.getElementById("form-restaurant-settings"),
  settingName: document.getElementById("setting-name"),
  settingCurrency: document.getElementById("setting-currency"),
  settingTagline: document.getElementById("setting-tagline"),
  settingDescription: document.getElementById("setting-description"),
  settingPhone: document.getElementById("setting-phone"),
  settingWhatsapp: document.getElementById("setting-whatsapp"),
  settingAddress: document.getElementById("setting-address"),
  settingLogoUrl: document.getElementById("setting-logo-url"),
  settingCoverUrl: document.getElementById("setting-cover-url"),
  settingSocialInstagram: document.getElementById("setting-social-instagram"),
  settingSocialFacebook: document.getElementById("setting-social-facebook"),
  settingSocialMaps: document.getElementById("setting-social-maps"),
  settingsHoursContainer: document.getElementById("settings-hours-container"),

  // Dish Editor Modal
  modalDishEditor: document.getElementById("modal-dish-editor"),
  dishModalTitle: document.getElementById("dish-modal-title"),
  formDishEditor: document.getElementById("form-dish-editor"),
  dishEditId: document.getElementById("dish-edit-id"),
  dishFormName: document.getElementById("dish-form-name"),
  dishFormCategory: document.getElementById("dish-form-category"),
  dishFormFoodType: document.getElementById("dish-form-foodtype"),
  dishFormPrice: document.getElementById("dish-form-price"),
  dishFormOriginalPrice: document.getElementById("dish-form-original-price"),
  dishFormSpice: document.getElementById("dish-form-spice"),
  dishFormSort: document.getElementById("dish-form-sort"),
  dishFormImage: document.getElementById("dish-form-image"),
  dishImagePreviewContainer: document.getElementById("dish-image-preview-container"),
  dishImagePreview: document.getElementById("dish-image-preview"),
  dishFormDescription: document.getElementById("dish-form-description"),
  dishFormNotes: document.getElementById("dish-form-notes"),
  dishFormFeatured: document.getElementById("dish-form-featured"),
  dishFormAvailable: document.getElementById("dish-form-available"),
  btnCloseDishEditor: document.getElementById("btn-close-dish-editor"),
  btnCancelDishEditor: document.getElementById("btn-cancel-dish-editor"),

  // Category Editor Modal
  modalCategoryEditor: document.getElementById("modal-category-editor"),
  categoryModalTitle: document.getElementById("category-modal-title"),
  formCategoryEditor: document.getElementById("form-category-editor"),
  categoryEditId: document.getElementById("category-edit-id"),
  categoryFormName: document.getElementById("category-form-name"),
  categoryFormDescription: document.getElementById("category-form-description"),
  categoryFormSort: document.getElementById("category-form-sort"),
  categoryFormActive: document.getElementById("category-form-active"),
  btnCloseCategoryEditor: document.getElementById("btn-close-category-editor"),
  btnCancelCategoryEditor: document.getElementById("btn-cancel-category-editor"),

  // Delete Confirm Modal
  modalDeleteConfirm: document.getElementById("modal-delete-confirm"),
  deleteModalTitle: document.getElementById("delete-modal-title"),
  deleteModalMessage: document.getElementById("delete-modal-message"),
  btnCancelDelete: document.getElementById("btn-cancel-delete"),
  btnConfirmDelete: document.getElementById("btn-confirm-delete")
};

let unsubscribers = [];

/**
 * Initialize Admin App
 */
function init() {
  setupUIEventListeners();
  setupAuthObserver();
}

/**
 * Configure Firebase Auth State Observer
 */
function setupAuthObserver() {
  initAdminAuth({
    onAuthenticated: (user, profile, bootstrapped) => {
      state.adminUser = user;
      elements.authLoadingScreen.classList.add("hidden");
      elements.loginView.classList.add("hidden");
      elements.adminAppView.classList.remove("hidden");

      if (bootstrapped) {
        showToast("Welcome! Initialized your account as primary restaurant administrator.", "success", 5000);
      } else {
        showToast(`Authenticated as ${user.email}`, "success");
      }

      startDatabaseSync();
    },
    onUnauthenticated: (_, errorMessage) => {
      state.adminUser = null;
      elements.authLoadingScreen.classList.add("hidden");
      elements.adminAppView.classList.add("hidden");
      elements.loginView.classList.remove("hidden");

      if (errorMessage) {
        showLoginError(errorMessage);
      }
    },
    onError: (err) => {
      elements.authLoadingScreen.classList.add("hidden");
      elements.adminAppView.classList.add("hidden");
      elements.loginView.classList.remove("hidden");
      showLoginError(err.message || "Failed to verify administrator authentication.");
    }
  });
}

/**
 * Subscribe to real-time database changes while authenticated
 */
function startDatabaseSync() {
  // Clear any existing subscriptions
  unsubscribers.forEach((u) => typeof u === "function" && u());
  unsubscribers = [];

  // Restaurant Profile
  const unsubProfile = subscribeRestaurantProfile((profile) => {
    state.restaurant = profile;
    if (elements.adminTopbarRestaurantName) elements.adminTopbarRestaurantName.textContent = profile.name || "L'Olivier & Sel";
    populateSettingsForm(profile);
  });
  unsubscribers.push(unsubProfile);

  // Categories
  const unsubCategories = subscribeCategories((categories) => {
    state.categories = categories || {};
    populateCategoryDropdowns();
    renderCategoriesTable();
    updateDashboardMetrics();
    renderDishesTable();
  });
  unsubscribers.push(uncategoriesListenerWrapper(unsubCategories));

  // Menu Items
  const unsubMenuItems = subscribeMenuItems((items) => {
    state.menuItems = items || {};
    updateDashboardMetrics();
    renderRecentDishes();
    renderDishesTable();
  });
  unsubscribers.push(unsubMenuItems);
}

function uncategoriesListenerWrapper(fn) {
  return fn;
}

/**
 * Set up DOM event listeners
 */
function setupUIEventListeners() {
  // Login form submit
  if (elements.adminLoginForm) {
    elements.adminLoginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = elements.loginEmailInput.value.trim();
      const password = elements.loginPasswordInput.value;

      elements.loginErrorAlert.classList.add("hidden");
      elements.btnLoginSubmit.disabled = true;
      elements.btnLoginSubmit.innerHTML = `<span class="inline-block animate-spin mr-2">&#9696;</span> Verifying...`;

      try {
        await loginAdmin(email, password);
        // Auth observer handles success transition
      } catch (error) {
        let message = "Invalid email or password.";
        const errStr = ((error.message || "") + " " + (error.code || "")).toUpperCase();
        if (errStr.includes("CONFIGURATION_NOT_FOUND") || error.code === "auth/configuration-not-found") {
          message = "Firebase Authentication is not enabled yet in project 'digitalmenuksa'. Please visit Firebase Console > Build > Authentication, click 'Get started', and enable the 'Email/Password' provider.";
        } else if (error.code === "auth/operation-not-allowed") {
          message = "Email/Password sign-in provider is disabled. Please enable it in Firebase Console > Authentication > Sign-in method.";
        } else if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
          message = "Incorrect credentials. Please verify your email and password.";
        } else if (error.code === "auth/user-not-found") {
          message = "No administrator user found with this email. Create the user in Firebase Console > Authentication > Users first.";
        } else if (error.code === "auth/too-many-requests") {
          message = "Too many failed attempts. Access temporarily restricted. Try again later.";
        } else if (error.code === "auth/network-request-failed") {
          message = "Network error. Please check your internet connection.";
        } else if (error.message) {
          message = error.message;
        }
        showLoginError(message);
      } finally {
        elements.btnLoginSubmit.disabled = false;
        elements.btnLoginSubmit.innerHTML = "<span>Sign In to Admin Console</span>";
      }
    });
  }

  // Forgot password
  if (elements.btnForgotPassword) {
    elements.btnForgotPassword.addEventListener("click", async () => {
      const email = elements.loginEmailInput.value.trim();
      if (!email) {
        showLoginError("Please enter your email address in the field above to reset password.");
        elements.loginEmailInput.focus();
        return;
      }
      try {
        await resetAdminPassword(email);
        showToast("Password reset link sent to your email address.", "info", 5000);
      } catch (err) {
        showLoginError("Failed to dispatch password reset email. Check email address.");
      }
    });
  }

  // Help box toggles
  if (elements.btnShowHelp) {
    elements.btnShowHelp.addEventListener("click", () => {
      elements.firebaseHelpBox.classList.toggle("hidden");
    });
  }
  if (elements.btnCloseHelpBox) {
    elements.btnCloseHelpBox.addEventListener("click", () => {
      elements.firebaseHelpBox.classList.add("hidden");
    });
  }

  // Logout button
  if (elements.btnAdminLogout) {
    elements.btnAdminLogout.addEventListener("click", async () => {
      await logoutAdmin();
      showToast("Logged out successfully.", "info");
    });
  }

  // Tab switching
  elements.navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      switchTab(tab.dataset.tab);
    });
  });

  // Jump from dashboard table trigger
  document.querySelectorAll("[data-tab-trigger]").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tabTrigger);
    });
  });

  // Quick Action Buttons
  if (elements.btnQuickAddDish) {
    elements.btnQuickAddDish.addEventListener("click", openAddDishModal);
  }
  if (elements.btnQuickAddCategory) {
    elements.btnQuickAddCategory.addEventListener("click", openAddCategoryModal);
  }
  if (elements.btnOpenAddDishModal) {
    elements.btnOpenAddDishModal.addEventListener("click", openAddDishModal);
  }
  if (elements.btnOpenAddCategoryModal) {
    elements.btnOpenAddCategoryModal.addEventListener("click", openAddCategoryModal);
  }

  // Seed sample database button
  if (elements.btnSeedSampleData) {
    elements.btnSeedSampleData.addEventListener("click", async () => {
      const hasData = Object.keys(state.categories).length > 0 || Object.keys(state.menuItems).length > 0;
      if (hasData) {
        const confirmOverwrite = confirm(
          "Your database already contains existing categories or dishes. Seeding sample data will supplement with boutique sample items. Do you wish to proceed?"
        );
        if (!confirmOverwrite) return;
      }
      try {
        elements.btnSeedSampleData.disabled = true;
        elements.btnSeedSampleData.textContent = "Seeding data...";
        await seedInitialData(db, true);
        showToast("Sample menu data successfully seeded into Firebase!", "success", 4000);
      } catch (err) {
        console.error("Seeding error:", err);
        showToast(`Seeding failed: ${err.message}`, "error");
      } finally {
        elements.btnSeedSampleData.disabled = false;
        elements.btnSeedSampleData.innerHTML = "<span>🌱 Seed Sample Menu</span>";
      }
    });
  }

  // Dish Table Search & Category Filter
  if (elements.adminDishSearch) {
    elements.adminDishSearch.addEventListener("input", (e) => {
      state.dishSearchQuery = e.target.value.trim().toLowerCase();
      renderDishesTable();
    });
  }
  if (elements.adminDishCategoryFilter) {
    elements.adminDishCategoryFilter.addEventListener("change", (e) => {
      state.dishCategoryFilter = e.target.value;
      renderDishesTable();
    });
  }

  // Dish Editor Image URL Live Preview
  if (elements.dishFormImage) {
    elements.dishFormImage.addEventListener("input", (e) => {
      const url = e.target.value.trim();
      if (url) {
        elements.dishImagePreview.src = url;
        elements.dishImagePreviewContainer.classList.remove("hidden");
        elements.dishImagePreview.onerror = () => {
          elements.dishImagePreview.src = "assets/images/placeholder.svg";
        };
      } else {
        elements.dishImagePreviewContainer.classList.add("hidden");
      }
    });
  }

  // Dish Editor Form Submit
  if (elements.formDishEditor) {
    elements.formDishEditor.addEventListener("submit", handleSaveDish);
  }
  if (elements.btnCloseDishEditor) elements.btnCloseDishEditor.addEventListener("click", closeDishModal);
  if (elements.btnCancelDishEditor) elements.btnCancelDishEditor.addEventListener("click", closeDishModal);

  // Category Editor Form Submit
  if (elements.formCategoryEditor) {
    elements.formCategoryEditor.addEventListener("submit", handleSaveCategory);
  }
  if (elements.btnCloseCategoryEditor) elements.btnCloseCategoryEditor.addEventListener("click", closeCategoryModal);
  if (elements.btnCancelCategoryEditor) elements.btnCancelCategoryEditor.addEventListener("click", closeCategoryModal);

  // Restaurant Settings Form Submit
  if (elements.formRestaurantSettings) {
    elements.formRestaurantSettings.addEventListener("submit", handleSaveSettings);
  }

  // Delete Confirm Modal
  if (elements.btnCancelDelete) elements.btnCancelDelete.addEventListener("click", closeDeleteModal);
  if (elements.btnConfirmDelete) elements.btnConfirmDelete.addEventListener("click", executePendingDelete);

  // Keyboard shortcut: ESC to dismiss modals
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDishModal();
      closeCategoryModal();
      closeDeleteModal();
    }
  });
}

function showLoginError(msg) {
  if (elements.loginErrorText) elements.loginErrorText.textContent = msg;
  if (elements.loginErrorAlert) elements.loginErrorAlert.classList.remove("hidden");
}

/**
 * Switch Active Nav Tab
 */
function switchTab(tabKey) {
  state.activeTab = tabKey;

  elements.navTabs.forEach((tab) => {
    if (tab.dataset.tab === tabKey) {
      tab.className = "admin-nav-tab active px-4 py-2.5 border-b-2 border-terracotta text-terracotta font-semibold whitespace-nowrap";
    } else {
      tab.className = "admin-nav-tab px-4 py-2.5 border-b-2 border-transparent text-stone-600 hover:text-charcoal whitespace-nowrap";
    }
  });

  elements.tabPanes.forEach((pane) => {
    if (pane.id === `tab-${tabKey}`) {
      pane.classList.remove("hidden");
    } else {
      pane.classList.add("hidden");
    }
  });
}

/**
 * Update Dashboard Summary Numbers
 */
function updateDashboardMetrics() {
  const categoriesList = Object.values(state.categories);
  const itemsList = Object.values(state.menuItems);

  const totalCategories = categoriesList.length;
  const totalDishes = itemsList.length;
  const activeDishes = itemsList.filter((i) => i.available !== false).length;
  const soldOutDishes = itemsList.filter((i) => i.available === false).length;
  const featuredDishes = itemsList.filter((i) => Boolean(i.featured)).length;

  if (elements.statTotalCategories) elements.statTotalCategories.textContent = totalCategories;
  if (elements.statTotalDishes) elements.statTotalDishes.textContent = totalDishes;
  if (elements.statActiveDishes) elements.statActiveDishes.textContent = activeDishes;
  if (elements.statSoldoutDishes) elements.statSoldoutDishes.textContent = soldOutDishes;
  if (elements.statFeaturedDishes) elements.statFeaturedDishes.textContent = featuredDishes;
}

/**
 * Render Recent Dishes in Dashboard overview
 */
function renderRecentDishes() {
  if (!elements.dashboardRecentDishesTable) return;
  elements.dashboardRecentDishesTable.innerHTML = "";

  const items = Object.entries(state.menuItems).slice(0, 5);
  const currency = state.restaurant.currency || "$";

  if (items.length === 0) {
    elements.dashboardRecentDishesTable.innerHTML = `
      <tr>
        <td colspan="5" class="py-6 text-center text-stone-400">No dishes created yet. Click "+ Add New Dish" above.</td>
      </tr>
    `;
    return;
  }

  items.forEach(([id, item]) => {
    const cat = state.categories[item.categoryId];
    const isAvail = item.available !== false;
    const tr = document.createElement("tr");
    tr.className = "hover:bg-stonecream/40 transition-colors";

    tr.innerHTML = `
      <td class="py-3 px-4 font-semibold text-charcoal">
        <div class="flex items-center gap-2">
          <span>${escapeHtml(item.name)}</span>
          ${item.featured ? '<span class="text-amber-500 text-xs">★</span>' : ""}
        </div>
      </td>
      <td class="py-3 px-4 text-stone-600">${escapeHtml(cat ? cat.name : "Uncategorized")}</td>
      <td class="py-3 px-4 font-mono font-bold text-terracotta">${formatPrice(item.price, currency)}</td>
      <td class="py-3 px-4">
        <button type="button" data-toggle-id="${id}" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
          isAvail ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
        }">
          <span class="w-1.5 h-1.5 rounded-full ${isAvail ? "bg-emerald-500" : "bg-rose-500"}"></span>
          <span>${isAvail ? "Available" : "Sold Out"}</span>
        </button>
      </td>
      <td class="py-3 px-4 text-right">
        <button type="button" data-edit-id="${id}" class="text-stone-600 hover:text-terracotta font-medium mr-2">Edit</button>
      </td>
    `;

    // Fast toggle listener
    tr.querySelector("[data-toggle-id]").addEventListener("click", () => handleQuickAvailabilityToggle(id, isAvail));
    tr.querySelector("[data-edit-id]").addEventListener("click", () => openEditDishModal(id, item));

    elements.dashboardRecentDishesTable.appendChild(tr);
  });
}

/**
 * Populate Category Dropdowns
 */
function populateCategoryDropdowns() {
  const options = Object.entries(state.categories)
    .sort((a, b) => (Number(a[1].sortOrder) || 0) - (Number(b[1].sortOrder) || 0))
    .map(([id, cat]) => `<option value="${id}">${escapeHtml(cat.name)}</option>`)
    .join("");

  // In dish filter
  if (elements.adminDishCategoryFilter) {
    elements.adminDishCategoryFilter.innerHTML = `<option value="all">All Categories</option>${options}`;
    elements.adminDishCategoryFilter.value = state.dishCategoryFilter;
  }

  // In dish form
  if (elements.dishFormCategory) {
    elements.dishFormCategory.innerHTML = options || '<option value="">No categories available</option>';
  }
}

/**
 * Render Categories Table
 */
function renderCategoriesTable() {
  if (!elements.adminCategoriesTableBody) return;
  elements.adminCategoriesTableBody.innerHTML = "";

  const categories = Object.entries(state.categories).sort(
    (a, b) => (Number(a[1].sortOrder) || 0) - (Number(b[1].sortOrder) || 0)
  );

  if (categories.length === 0) {
    elements.adminCategoriesEmptyMessage.classList.remove("hidden");
    return;
  }
  elements.adminCategoriesEmptyMessage.classList.add("hidden");

  // Count dishes per category
  const dishCounts = {};
  Object.values(state.menuItems).forEach((item) => {
    if (item.categoryId) dishCounts[item.categoryId] = (dishCounts[item.categoryId] || 0) + 1;
  });

  categories.forEach(([id, cat]) => {
    const count = dishCounts[id] || 0;
    const tr = document.createElement("tr");
    tr.className = "hover:bg-stonecream/40 transition-colors";

    tr.innerHTML = `
      <td class="py-3 px-4 font-mono text-stone-500 font-semibold">${cat.sortOrder || 1}</td>
      <td class="py-3 px-4 font-bold text-charcoal">${escapeHtml(cat.name)}</td>
      <td class="py-3 px-4 text-stone-600 max-w-xs truncate">${escapeHtml(cat.description || "—")}</td>
      <td class="py-3 px-4">
        <span class="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[11px] font-medium border border-borderstone">
          ${count} ${count === 1 ? "dish" : "dishes"}
        </span>
      </td>
      <td class="py-3 px-4">
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
          cat.active !== false ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-500"
        }">
          <span class="w-1.5 h-1.5 rounded-full ${cat.active !== false ? "bg-emerald-500" : "bg-stone-400"}"></span>
          <span>${cat.active !== false ? "Active" : "Hidden"}</span>
        </span>
      </td>
      <td class="py-3 px-4 text-right space-x-2">
        <button type="button" data-edit-cat="${id}" class="text-stone-600 hover:text-terracotta font-medium">Edit</button>
        <button type="button" data-delete-cat="${id}" class="text-rose-600 hover:text-rose-800 font-medium">Delete</button>
      </td>
    `;

    tr.querySelector("[data-edit-cat]").addEventListener("click", () => openEditCategoryModal(id, cat));
    tr.querySelector("[data-delete-cat]").addEventListener("click", () => promptDeleteCategory(id, cat, count));

    elements.adminCategoriesTableBody.appendChild(tr);
  });
}

/**
 * Render Dishes Table
 */
function renderDishesTable() {
  if (!elements.adminDishesTableBody) return;
  elements.adminDishesTableBody.innerHTML = "";

  const allItems = Object.entries(state.menuItems);

  // Filter
  const filtered = allItems.filter(([id, item]) => {
    if (state.dishCategoryFilter !== "all" && item.categoryId !== state.dishCategoryFilter) return false;
    if (state.dishSearchQuery) {
      const q = state.dishSearchQuery;
      const matchName = (item.name || "").toLowerCase().includes(q);
      const matchDesc = (item.description || "").toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  // Sort
  filtered.sort((a, b) => (Number(a[1].sortOrder) || 1) - (Number(b[1].sortOrder) || 1));

  if (filtered.length === 0) {
    elements.adminDishesEmptyMessage.classList.remove("hidden");
    return;
  }
  elements.adminDishesEmptyMessage.classList.add("hidden");

  const currency = state.restaurant.currency || "$";

  filtered.forEach(([id, item]) => {
    const cat = state.categories[item.categoryId];
    const isAvail = item.available !== false;
    const imgSrc = item.imageUrl || "assets/images/placeholder.svg";

    const tr = document.createElement("tr");
    tr.className = `hover:bg-stonecream/40 transition-colors ${!isAvail ? "opacity-75" : ""}`;

    tr.innerHTML = `
      <td class="py-3 px-4">
        <img src="${escapeHtml(imgSrc)}" alt="" class="w-10 h-10 rounded-lg object-cover border border-borderstone bg-stone-100">
      </td>
      <td class="py-3 px-4">
        <div class="font-bold text-charcoal flex items-center gap-1.5">
          <span>${escapeHtml(item.name)}</span>
          ${item.featured ? '<span class="text-amber-500 text-xs" title="Chef\'s Special">★</span>' : ""}
        </div>
        <p class="text-[11px] text-stone-500 line-clamp-1 max-w-xs mt-0.5">${escapeHtml(item.description || "—")}</p>
      </td>
      <td class="py-3 px-4 text-stone-700">${escapeHtml(cat ? cat.name : "Uncategorized")}</td>
      <td class="py-3 px-4">
        <span class="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded border ${
          item.foodType === "veg" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
          item.foodType === "vegan" ? "bg-teal-50 text-teal-800 border-teal-200" :
          "bg-rose-50 text-rose-800 border-rose-200"
        }">
          ${item.foodType || "veg"}
        </span>
      </td>
      <td class="py-3 px-4 font-mono font-bold text-terracotta">
        ${formatPrice(item.price, currency)}
      </td>
      <td class="py-3 px-4">
        <button type="button" data-toggle-dish="${id}" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
          isAvail ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
        }">
          <span class="w-1.5 h-1.5 rounded-full ${isAvail ? "bg-emerald-500" : "bg-rose-500"}"></span>
          <span>${isAvail ? "Available" : "Sold Out"}</span>
        </button>
      </td>
      <td class="py-3 px-4 text-right space-x-2">
        <button type="button" data-edit-dish="${id}" class="text-stone-600 hover:text-terracotta font-medium">Edit</button>
        <button type="button" data-delete-dish="${id}" class="text-rose-600 hover:text-rose-800 font-medium">Delete</button>
      </td>
    `;

    const img = tr.querySelector("img");
    img.onerror = () => handleImageFallback(img);

    tr.querySelector("[data-toggle-dish]").addEventListener("click", () => handleQuickAvailabilityToggle(id, isAvail));
    tr.querySelector("[data-edit-dish]").addEventListener("click", () => openEditDishModal(id, item));
    tr.querySelector("[data-delete-dish]").addEventListener("click", () => promptDeleteDish(id, item));

    elements.adminDishesTableBody.appendChild(tr);
  });
}

/**
 * Fast Toggle Availability
 */
async function handleQuickAvailabilityToggle(id, currentStatus) {
  try {
    await toggleItemAvailability(id, currentStatus);
    showToast(`Updated dish status to: ${!currentStatus ? "Available" : "Sold Out"}`, "success");
  } catch (err) {
    showToast(`Failed to update status: ${err.message}`, "error");
  }
}

/**
 * Dish Modal Openers
 */
function openAddDishModal() {
  elements.dishModalTitle.textContent = "Add New Dish";
  elements.dishEditId.value = "";
  elements.formDishEditor.reset();
  elements.dishFormSort.value = Object.keys(state.menuItems).length + 1;
  elements.dishFormAvailable.checked = true;
  elements.dishImagePreviewContainer.classList.add("hidden");
  elements.modalDishEditor.classList.add("active");
  elements.dishFormName.focus();
}

function openEditDishModal(id, item) {
  elements.dishModalTitle.textContent = "Edit Dish";
  elements.dishEditId.value = id;
  elements.dishFormName.value = item.name || "";
  elements.dishFormCategory.value = item.categoryId || "";
  elements.dishFormFoodType.value = item.foodType || "veg";
  elements.dishFormPrice.value = item.price !== undefined ? item.price : "";
  elements.dishFormOriginalPrice.value = item.originalPrice !== null && item.originalPrice !== undefined ? item.originalPrice : "";
  elements.dishFormSpice.value = item.spiceLevel || 0;
  elements.dishFormSort.value = item.sortOrder || 1;
  elements.dishFormImage.value = item.imageUrl || "";
  elements.dishFormDescription.value = item.description || "";
  elements.dishFormNotes.value = item.notes || "";
  elements.dishFormFeatured.checked = Boolean(item.featured);
  elements.dishFormAvailable.checked = item.available !== false;

  if (item.imageUrl) {
    elements.dishImagePreview.src = item.imageUrl;
    elements.dishImagePreviewContainer.classList.remove("hidden");
  } else {
    elements.dishImagePreviewContainer.classList.add("hidden");
  }

  elements.modalDishEditor.classList.add("active");
}

function closeDishModal() {
  elements.modalDishEditor.classList.remove("active");
}

/**
 * Save Dish (Create or Update)
 */
async function handleSaveDish(e) {
  e.preventDefault();
  const id = elements.dishEditId.value;

  const payload = {
    name: elements.dishFormName.value.trim(),
    categoryId: elements.dishFormCategory.value,
    foodType: elements.dishFormFoodType.value,
    price: parseFloat(elements.dishFormPrice.value),
    originalPrice: elements.dishFormOriginalPrice.value ? parseFloat(elements.dishFormOriginalPrice.value) : null,
    spiceLevel: parseInt(elements.dishFormSpice.value, 10),
    sortOrder: parseInt(elements.dishFormSort.value, 10) || 1,
    imageUrl: elements.dishFormImage.value.trim(),
    description: elements.dishFormDescription.value.trim(),
    notes: elements.dishFormNotes.value.trim(),
    featured: elements.dishFormFeatured.checked,
    available: elements.dishFormAvailable.checked
  };

  // Validation
  const validation = validateMenuItem(payload, state.categories);
  if (!validation.isValid) {
    showToast(validation.errors[0], "error");
    return;
  }

  try {
    if (id) {
      await updateMenuItem(id, payload);
      showToast("Dish updated successfully.", "success");
    } else {
      await addMenuItem(payload);
      showToast("New dish added to menu.", "success");
    }
    closeDishModal();
  } catch (err) {
    showToast(`Failed to save dish: ${err.message}`, "error");
  }
}

/**
 * Category Modal Openers
 */
function openAddCategoryModal() {
  elements.categoryModalTitle.textContent = "Create Category";
  elements.categoryEditId.value = "";
  elements.formCategoryEditor.reset();
  elements.categoryFormSort.value = Object.keys(state.categories).length + 1;
  elements.categoryFormActive.checked = true;
  elements.modalCategoryEditor.classList.add("active");
  elements.categoryFormName.focus();
}

function openEditCategoryModal(id, cat) {
  elements.categoryModalTitle.textContent = "Edit Category";
  elements.categoryEditId.value = id;
  elements.categoryFormName.value = cat.name || "";
  elements.categoryFormDescription.value = cat.description || "";
  elements.categoryFormSort.value = cat.sortOrder || 1;
  elements.categoryFormActive.checked = cat.active !== false;
  elements.modalCategoryEditor.classList.add("active");
}

function closeCategoryModal() {
  elements.modalCategoryEditor.classList.remove("active");
}

/**
 * Save Category
 */
async function handleSaveCategory(e) {
  e.preventDefault();
  const id = elements.categoryEditId.value;

  const payload = {
    name: elements.categoryFormName.value.trim(),
    description: elements.categoryFormDescription.value.trim(),
    sortOrder: parseInt(elements.categoryFormSort.value, 10) || 1,
    active: elements.categoryFormActive.checked
  };

  const validation = validateCategory(payload);
  if (!validation.isValid) {
    showToast(validation.errors[0], "error");
    return;
  }

  try {
    if (id) {
      await updateCategory(id, payload);
      showToast("Category updated successfully.", "success");
    } else {
      await addCategory(payload);
      showToast("Category created successfully.", "success");
    }
    closeCategoryModal();
  } catch (err) {
    showToast(`Failed to save category: ${err.message}`, "error");
  }
}

/**
 * Prompt Category Deletion with Safety Warning
 */
function promptDeleteCategory(id, cat, dishCount) {
  let warning = `Are you sure you want to permanently delete "${cat.name}"?`;
  if (dishCount > 0) {
    warning += ` WARNING: There are ${dishCount} dishes currently assigned to this category. Deleting it will leave these dishes uncategorized.`;
  }

  state.pendingDeleteAction = {
    type: "category",
    id,
    name: cat.name
  };

  elements.deleteModalTitle.textContent = "Delete Category";
  elements.deleteModalMessage.textContent = warning;
  elements.modalDeleteConfirm.classList.add("active");
}

/**
 * Prompt Dish Deletion
 */
function promptDeleteDish(id, item) {
  state.pendingDeleteAction = {
    type: "dish",
    id,
    name: item.name
  };

  elements.deleteModalTitle.textContent = "Delete Dish";
  elements.deleteModalMessage.textContent = `Are you sure you want to delete "${item.name}" from the menu?`;
  elements.modalDeleteConfirm.classList.add("active");
}

function closeDeleteModal() {
  elements.modalDeleteConfirm.classList.remove("active");
  state.pendingDeleteAction = null;
}

/**
 * Execute Confirmed Delete Action
 */
async function executePendingDelete() {
  if (!state.pendingDeleteAction) return;
  const { type, id, name } = state.pendingDeleteAction;

  try {
    if (type === "dish") {
      await deleteMenuItem(id);
      showToast(`Deleted "${name}".`, "success");
    } else if (type === "category") {
      await deleteCategory(id);
      showToast(`Deleted category "${name}".`, "success");
    }
    closeDeleteModal();
  } catch (err) {
    showToast(`Delete failed: ${err.message}`, "error");
  }
}

/**
 * Populate Settings Form
 */
function populateSettingsForm(profile) {
  if (!elements.formRestaurantSettings) return;

  elements.settingName.value = profile.name || "";
  elements.settingCurrency.value = profile.currency || "$";
  elements.settingTagline.value = profile.tagline || "";
  elements.settingDescription.value = profile.description || "";
  elements.settingPhone.value = profile.phone || "";
  elements.settingWhatsapp.value = profile.whatsappNumber || "";
  elements.settingAddress.value = profile.address || "";
  elements.settingLogoUrl.value = profile.logoUrl || "";
  elements.settingCoverUrl.value = profile.coverImageUrl || "";

  if (profile.socialLinks) {
    elements.settingSocialInstagram.value = profile.socialLinks.instagram || "";
    elements.settingSocialFacebook.value = profile.socialLinks.facebook || "";
    elements.settingSocialMaps.value = profile.socialLinks.googleMaps || "";
  }

  // Render weekly hours rows
  renderHoursEditor(profile.openingHours);
}

/**
 * Render Opening Hours Editor in Settings
 */
function renderHoursEditor(openingHours = {}) {
  if (!elements.settingsHoursContainer) return;
  elements.settingsHoursContainer.innerHTML = "";

  const days = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" }
  ];

  days.forEach(({ key, label }) => {
    const schedule = openingHours[key] || { open: "11:00", close: "22:00", closed: false };
    const div = document.createElement("div");
    div.className = "flex flex-wrap items-center justify-between gap-2 p-2 bg-white rounded-xl border border-borderstone text-xs";

    div.innerHTML = `
      <span class="w-24 font-semibold text-stone-700">${label}</span>
      <div class="flex items-center gap-2">
        <label class="text-[11px] text-stone-500">Open:</label>
        <input type="time" data-hour-day="${key}" data-hour-type="open" value="${schedule.open || "11:00"}" class="px-2 py-1 rounded border border-borderstone font-mono text-xs">
        <span class="text-stone-400">&ndash;</span>
        <label class="text-[11px] text-stone-500">Close:</label>
        <input type="time" data-hour-day="${key}" data-hour-type="close" value="${schedule.close || "22:00"}" class="px-2 py-1 rounded border border-borderstone font-mono text-xs">
      </div>
      <label class="flex items-center gap-1.5 cursor-pointer text-[11px] text-stone-600">
        <input type="checkbox" data-hour-day="${key}" data-hour-type="closed" ${schedule.closed ? "checked" : ""} class="rounded text-terracotta">
        <span>Closed for the day</span>
      </label>
    `;

    elements.settingsHoursContainer.appendChild(div);
  });
}

/**
 * Save Restaurant Settings
 */
async function handleSaveSettings(e) {
  e.preventDefault();

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const openingHours = {};

  days.forEach((day) => {
    const openInput = document.querySelector(`[data-hour-day="${day}"][data-hour-type="open"]`);
    const closeInput = document.querySelector(`[data-hour-day="${day}"][data-hour-type="close"]`);
    const closedInput = document.querySelector(`[data-hour-day="${day}"][data-hour-type="closed"]`);

    openingHours[day] = {
      open: openInput ? openInput.value : "11:00",
      close: closeInput ? closeInput.value : "22:00",
      closed: closedInput ? closedInput.checked : false
    };
  });

  const payload = {
    name: elements.settingName.value.trim(),
    currency: elements.settingCurrency.value.trim(),
    tagline: elements.settingTagline.value.trim(),
    description: elements.settingDescription.value.trim(),
    phone: elements.settingPhone.value.trim(),
    whatsappNumber: elements.settingWhatsapp.value.trim(),
    address: elements.settingAddress.value.trim(),
    logoUrl: elements.settingLogoUrl.value.trim(),
    coverImageUrl: elements.settingCoverUrl.value.trim(),
    socialLinks: {
      instagram: elements.settingSocialInstagram.value.trim(),
      facebook: elements.settingSocialFacebook.value.trim(),
      googleMaps: elements.settingSocialMaps.value.trim()
    },
    openingHours,
    updatedAt: Date.now()
  };

  const validation = validateRestaurantProfile(payload);
  if (!validation.isValid) {
    showToast(validation.errors[0], "error");
    return;
  }

  try {
    await updateRestaurantProfile(payload);
    showToast("Restaurant settings successfully updated.", "success");
  } catch (err) {
    showToast(`Failed to update settings: ${err.message}`, "error");
  }
}

// Kickoff
document.addEventListener("DOMContentLoaded", init);

