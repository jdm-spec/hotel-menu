/**
 * Public Digital Menu Client Module
 * Handles real-time Firebase subscriptions, category navigation,
 * instant search, dietary filtering, and accessible dish modals.
 */

import { isConfigured, initError } from "./firebase-init.js";
import { isPlaceholderConfig } from "./firebase-config.js";
import { subscribeRestaurantProfile, DEFAULT_RESTAURANT_PROFILE } from "./restaurant-service.js";
import { subscribeCategories } from "./category-service.js";
import { subscribeMenuItems } from "./menu-service.js";
import { 
  formatPrice, 
  escapeHtml, 
  debounce, 
  calculateRestaurantStatus, 
  handleImageFallback,
  getDietaryBadgeHtml,
  showToast 
} from "./utils.js";
import { SAMPLE_CATEGORIES, SAMPLE_MENU_ITEMS } from "./seed-data.js";

// Application State
const state = {
  restaurant: { ...DEFAULT_RESTAURANT_PROFILE },
  categories: {},
  menuItems: {},
  activeCategory: "all",
  activeDietFilter: "all",
  searchQuery: "",
  selectedDish: null
};

// DOM References
const elements = {
  setupBanner: document.getElementById("firebase-setup-banner"),
  btnQuickConfig: document.getElementById("btn-quick-config"),
  quickConfigModal: document.getElementById("quick-config-modal"),
  formQuickConfig: document.getElementById("form-quick-config"),
  btnCloseQuickConfig: document.getElementById("btn-close-quick-config"),
  btnCancelQuickConfig: document.getElementById("btn-cancel-quick-config"),

  restaurantNameHeader: document.getElementById("restaurant-name-header"),
  restaurantTaglineHeader: document.getElementById("restaurant-tagline-header"),
  restaurantLogoContainer: document.getElementById("restaurant-logo-container"),
  btnStatusBadge: document.getElementById("btn-status-badge"),
  statusIndicatorDot: document.getElementById("status-indicator-dot"),
  statusBadgeText: document.getElementById("status-badge-text"),
  btnOpenInfoModal: document.getElementById("btn-open-info-modal"),
  
  heroHeadline: document.getElementById("hero-headline"),
  heroDescription: document.getElementById("hero-description"),
  heroLocationText: document.getElementById("hero-location-text"),
  heroPhoneText: document.getElementById("hero-phone-text"),
  heroCoverImage: document.getElementById("hero-cover-image"),
  footerRestaurantName: document.getElementById("footer-restaurant-name"),

  dishSearchInput: document.getElementById("dish-search-input"),
  btnClearSearch: document.getElementById("btn-clear-search"),
  categoryNavBar: document.getElementById("category-nav-bar"),
  dietFilterButtons: document.querySelectorAll(".diet-filter-btn"),

  currentViewTitle: document.getElementById("current-view-title"),
  currentViewDescription: document.getElementById("current-view-description"),
  itemCountBadge: document.getElementById("item-count-badge"),
  loadingSkeletonGrid: document.getElementById("loading-skeleton-grid"),
  dishesContainer: document.getElementById("dishes-container"),
  emptySearchState: document.getElementById("empty-search-state"),
  emptyMenuState: document.getElementById("empty-menu-state"),
  btnResetFilters: document.getElementById("btn-reset-filters"),

  dishDetailModal: document.getElementById("dish-detail-modal"),
  modalDishImage: document.getElementById("modal-dish-image"),
  modalDishTitle: document.getElementById("modal-dish-title"),
  modalDishPrice: document.getElementById("modal-dish-price"),
  modalDishOriginalPrice: document.getElementById("modal-dish-original-price"),
  modalDishCategory: document.getElementById("modal-dish-category"),
  modalDishBadges: document.getElementById("modal-dish-badges"),
  modalDishDescription: document.getElementById("modal-dish-description"),
  modalDishNotesContainer: document.getElementById("modal-dish-notes-container"),
  modalDishNotes: document.getElementById("modal-dish-notes"),
  modalDishSoldoutBadge: document.getElementById("modal-dish-soldout-badge"),
  modalWhatsappLink: document.getElementById("modal-whatsapp-link"),
  btnCloseDishModal: document.getElementById("btn-close-dish-modal"),
  btnModalDismiss: document.getElementById("btn-modal-dismiss"),

  restaurantInfoModal: document.getElementById("restaurant-info-modal"),
  btnCloseInfoModal: document.getElementById("btn-close-info-modal"),
  infoAddressText: document.getElementById("info-address-text"),
  infoPhoneText: document.getElementById("info-phone-text"),
  infoHoursTable: document.getElementById("info-hours-table"),
  infoSocialLinks: document.getElementById("info-social-links")
};

let unsubscribers = [];

/**
 * Initialize Public Menu Application
 */
function init() {
  checkSetupStatus();
  setupEventListeners();
  subscribeToDatabase();
}

/**
 * Display setup helper banner if Firebase credentials are blank/placeholders
 */
function checkSetupStatus() {
  if (isPlaceholderConfig() || !isConfigured) {
    if (elements.setupBanner) elements.setupBanner.classList.remove("hidden");
    // In preview mode before user sets their keys, load high quality fallback sample data
    state.categories = { ...SAMPLE_CATEGORIES };
    state.menuItems = { ...SAMPLE_MENU_ITEMS };
    renderCategories();
    renderDishes();
    updateRestaurantHeader(DEFAULT_RESTAURANT_PROFILE);
    if (elements.loadingSkeletonGrid) elements.loadingSkeletonGrid.classList.add("hidden");
    if (elements.dishesContainer) elements.dishesContainer.classList.remove("hidden");
  }
}

/**
 * Attach UI event listeners
 */
function setupEventListeners() {
  // Search input with debounce
  if (elements.dishSearchInput) {
    elements.dishSearchInput.addEventListener(
      "input",
      debounce((e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        if (state.searchQuery) {
          elements.btnClearSearch.classList.remove("hidden");
        } else {
          elements.btnClearSearch.classList.add("hidden");
        }
        renderDishes();
      }, 150)
    );
  }

  // Clear search button
  if (elements.btnClearSearch) {
    elements.btnClearSearch.addEventListener("click", () => {
      elements.dishSearchInput.value = "";
      state.searchQuery = "";
      elements.btnClearSearch.classList.add("hidden");
      elements.dishSearchInput.focus();
      renderDishes();
    });
  }

  // Dietary filter buttons
  elements.dietFilterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      elements.dietFilterButtons.forEach((b) => {
        b.classList.remove("active", "bg-terracotta", "text-white", "border-terracotta");
        b.classList.add("bg-white", "text-stone-700", "border-borderstone");
      });
      btn.classList.add("active", "bg-terracotta", "text-white", "border-terracotta");
      btn.classList.remove("bg-white", "text-stone-700", "border-borderstone");

      state.activeDietFilter = btn.dataset.dietFilter || "all";
      renderDishes();
    });
  });

  // Reset filters button
  if (elements.btnResetFilters) {
    elements.btnResetFilters.addEventListener("click", () => {
      state.searchQuery = "";
      state.activeDietFilter = "all";
      state.activeCategory = "all";
      if (elements.dishSearchInput) elements.dishSearchInput.value = "";
      if (elements.btnClearSearch) elements.btnClearSearch.classList.add("hidden");

      elements.dietFilterButtons.forEach((b) => {
        if (b.dataset.dietFilter === "all") {
          b.classList.add("active", "bg-terracotta", "text-white", "border-terracotta");
          b.classList.remove("bg-white", "text-stone-700", "border-borderstone");
        } else {
          b.classList.remove("active", "bg-terracotta", "text-white", "border-terracotta");
          b.classList.add("bg-white", "text-stone-700", "border-borderstone");
        }
      });

      renderCategories();
      renderDishes();
    });
  }

  // Modals event listeners
  if (elements.btnStatusBadge) {
    elements.btnStatusBadge.addEventListener("click", openInfoModal);
  }
  if (elements.btnOpenInfoModal) {
    elements.btnOpenInfoModal.addEventListener("click", openInfoModal);
  }
  if (elements.btnCloseInfoModal) {
    elements.btnCloseInfoModal.addEventListener("click", closeInfoModal);
  }
  if (elements.restaurantInfoModal) {
    elements.restaurantInfoModal.addEventListener("click", (e) => {
      if (e.target === elements.restaurantInfoModal) closeInfoModal();
    });
  }

  if (elements.btnCloseDishModal) {
    elements.btnCloseDishModal.addEventListener("click", closeDishModal);
  }
  if (elements.btnModalDismiss) {
    elements.btnModalDismiss.addEventListener("click", closeDishModal);
  }
  if (elements.dishDetailModal) {
    elements.dishDetailModal.addEventListener("click", (e) => {
      if (e.target === elements.dishDetailModal) closeDishModal();
    });
  }

  // Quick config modal listeners
  if (elements.btnQuickConfig) {
    elements.btnQuickConfig.addEventListener("click", () => {
      elements.quickConfigModal.classList.add("active");
    });
  }
  if (elements.btnCloseQuickConfig) {
    elements.btnCloseQuickConfig.addEventListener("click", () => {
      elements.quickConfigModal.classList.remove("active");
    });
  }
  if (elements.btnCancelQuickConfig) {
    elements.btnCancelQuickConfig.addEventListener("click", () => {
      elements.quickConfigModal.classList.remove("active");
    });
  }
  if (elements.formQuickConfig) {
    elements.formQuickConfig.addEventListener("submit", (e) => {
      e.preventDefault();
      const dbUrl = document.getElementById("config-db-url").value.trim();
      const apiKey = document.getElementById("config-api-key").value.trim();
      const projectId = document.getElementById("config-project-id").value.trim();

      if (!dbUrl || !apiKey || !projectId) {
        showToast("Please provide all required fields.", "error");
        return;
      }

      const customConfig = {
        apiKey,
        authDomain: `${projectId}.firebaseapp.com`,
        databaseURL: dbUrl,
        projectId,
        storageBucket: `${projectId}.appspot.com`,
        appId: "custom-web-app"
      };

      try {
        localStorage.setItem("digital_menu_firebase_config", JSON.stringify(customConfig));
        showToast("Configuration saved. Refreshing...", "success");
        setTimeout(() => window.location.reload(), 800);
      } catch (err) {
        showToast("Failed to save local configuration.", "error");
      }
    });
  }

  // Keyboard accessibility: ESC key closes open modals
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeDishModal();
      closeInfoModal();
      if (elements.quickConfigModal) elements.quickConfigModal.classList.remove("active");
    }
  });

  // Clean up listeners on page unload
  window.addEventListener("beforeunload", () => {
    unsubscribers.forEach((unsub) => {
      if (typeof unsub === "function") unsub();
    });
  });
}

/**
 * Setup Realtime Database subscriptions
 */
function subscribeToDatabase() {
  if (!isConfigured) return;

  // 1. Restaurant Profile
  const unsubProfile = subscribeRestaurantProfile((profile) => {
    state.restaurant = profile;
    updateRestaurantHeader(profile);
  });
  unsubscribers.push(unsubProfile);

  // 2. Categories
  const unsubCategories = subscribeCategories((categories) => {
    state.categories = categories || {};
    renderCategories();
    renderDishes();
  });
  unsubscribers.push(unsubCategories);

  // 3. Menu Items
  const unsubMenuItems = subscribeMenuItems((items) => {
    state.menuItems = items || {};
    if (elements.loadingSkeletonGrid) elements.loadingSkeletonGrid.classList.add("hidden");
    if (elements.dishesContainer) elements.dishesContainer.classList.remove("hidden");
    renderDishes();
  });
  unsubscribers.push(unsubMenuItems);
}

/**
 * Update Restaurant Branding & Information
 */
function updateRestaurantHeader(profile) {
  if (!profile) return;

  if (elements.restaurantNameHeader) elements.restaurantNameHeader.textContent = profile.name || "L'Olivier & Sel";
  if (elements.restaurantTaglineHeader) elements.restaurantTaglineHeader.textContent = profile.tagline || "";
  if (elements.footerRestaurantName) elements.footerRestaurantName.textContent = profile.name || "L'Olivier & Sel";

  if (elements.heroHeadline && profile.tagline) {
    elements.heroHeadline.textContent = profile.tagline;
  }
  if (elements.heroDescription && profile.description) {
    elements.heroDescription.textContent = profile.description;
  }
  if (elements.heroLocationText && profile.address) {
    elements.heroLocationText.textContent = profile.address;
  }
  if (elements.heroPhoneText && profile.phone) {
    elements.heroPhoneText.textContent = profile.phone;
  }
  if (elements.heroCoverImage && profile.coverImageUrl) {
    elements.heroCoverImage.src = profile.coverImageUrl;
  }

  // Logo rendering
  if (elements.restaurantLogoContainer) {
    if (profile.logoUrl && profile.logoUrl.trim() !== "") {
      elements.restaurantLogoContainer.innerHTML = `<img src="${escapeHtml(profile.logoUrl)}" alt="${escapeHtml(profile.name)}" class="w-full h-full object-cover">`;
      const img = elements.restaurantLogoContainer.querySelector("img");
      img.onerror = () => {
        elements.restaurantLogoContainer.innerHTML = `<span class="font-display font-bold text-terracotta text-sm">${(profile.name || "OS").substring(0, 2).toUpperCase()}</span>`;
      };
    } else {
      const initials = (profile.name || "OS").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
      elements.restaurantLogoContainer.innerHTML = `<span class="font-display font-bold text-terracotta text-sm">${initials}</span>`;
    }
  }

  // Calculate live opening status
  const status = calculateRestaurantStatus(profile.openingHours);
  if (elements.statusBadgeText) elements.statusBadgeText.textContent = status.statusText;
  if (elements.statusIndicatorDot) {
    elements.statusIndicatorDot.className = `w-2 h-2 rounded-full ${status.isOpen ? "bg-emerald-500" : "bg-stone-400"}`;
  }
}

/**
 * Render Category Navigation Tabs
 */
function renderCategories() {
  if (!elements.categoryNavBar) return;

  // Clear existing buttons
  elements.categoryNavBar.innerHTML = "";

  // Sort categories by sortOrder
  const sortedCategories = Object.entries(state.categories)
    .filter(([_, cat]) => cat.active !== false)
    .sort((a, b) => (Number(a[1].sortOrder) || 0) - (Number(b[1].sortOrder) || 0));

  // Count items per category
  const itemCounts = { all: 0 };
  Object.values(state.menuItems).forEach((item) => {
    itemCounts.all++;
    if (item.categoryId) {
      itemCounts[item.categoryId] = (itemCounts[item.categoryId] || 0) + 1;
    }
  });

  // "All Items" tab button
  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.dataset.categoryId = "all";
  allBtn.className = `category-tab-btn px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shadow-2xs ${
    state.activeCategory === "all" ? "bg-charcoal text-white" : "bg-white text-stone-700 border border-borderstone hover:bg-stonecream"
  }`;
  allBtn.innerHTML = `All Courses <span class="ml-1 opacity-70 text-[10px] font-normal">(${itemCounts.all})</span>`;
  allBtn.addEventListener("click", () => selectCategory("all"));
  elements.categoryNavBar.appendChild(allBtn);

  // Each dynamic category button
  sortedCategories.forEach(([catId, cat]) => {
    const count = itemCounts[catId] || 0;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.categoryId = catId;
    btn.className = `category-tab-btn px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shadow-2xs ${
      state.activeCategory === catId ? "bg-charcoal text-white" : "bg-white text-stone-700 border border-borderstone hover:bg-stonecream"
    }`;
    btn.innerHTML = `${escapeHtml(cat.name)} <span class="ml-1 opacity-70 text-[10px] font-normal">(${count})</span>`;
    btn.addEventListener("click", () => selectCategory(catId));
    elements.categoryNavBar.appendChild(btn);
  });
}

/**
 * Handle category tab click
 */
function selectCategory(categoryId) {
  state.activeCategory = categoryId;

  // Update tab styles
  const buttons = elements.categoryNavBar.querySelectorAll(".category-tab-btn");
  buttons.forEach((btn) => {
    if (btn.dataset.categoryId === categoryId) {
      btn.className = "category-tab-btn px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shadow-2xs bg-charcoal text-white";
    } else {
      btn.className = "category-tab-btn px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shadow-2xs bg-white text-stone-700 border border-borderstone hover:bg-stonecream";
    }
  });

  // Update heading and description
  if (categoryId === "all") {
    elements.currentViewTitle.textContent = "All Courses";
    elements.currentViewDescription.textContent = "Showing freshly prepared artisanal selections";
  } else {
    const cat = state.categories[categoryId];
    elements.currentViewTitle.textContent = cat ? cat.name : "Menu Selection";
    elements.currentViewDescription.textContent = cat && cat.description ? cat.description : "Crafted to order";
  }

  renderDishes();
}

/**
 * Filter and Render Food Item Cards
 */
function renderDishes() {
  if (!elements.dishesContainer) return;

  const allItems = Object.entries(state.menuItems);

  // If menu is completely empty
  if (allItems.length === 0) {
    elements.dishesContainer.classList.add("hidden");
    elements.emptySearchState.classList.add("hidden");
    elements.emptyMenuState.classList.remove("hidden");
    elements.itemCountBadge.textContent = "0 items";
    return;
  }

  elements.emptyMenuState.classList.add("hidden");

  // Filtering Logic
  const filtered = allItems.filter(([id, item]) => {
    // 1. Category Filter
    if (state.activeCategory !== "all" && item.categoryId !== state.activeCategory) {
      return false;
    }

    // 2. Dietary Filter
    if (state.activeDietFilter === "veg" && item.foodType !== "veg") return false;
    if (state.activeDietFilter === "non-veg" && item.foodType !== "non-veg") return false;
    if (state.activeDietFilter === "vegan" && item.foodType !== "vegan") return false;
    if (state.activeDietFilter === "featured" && !item.featured) return false;

    // 3. Search Query Filter (name and description)
    if (state.searchQuery) {
      const q = state.searchQuery;
      const nameMatch = (item.name || "").toLowerCase().includes(q);
      const descMatch = (item.description || "").toLowerCase().includes(q);
      const notesMatch = (item.notes || "").toLowerCase().includes(q);
      if (!nameMatch && !descMatch && !notesMatch) return false;
    }

    return true;
  });

  // Sort by item.sortOrder
  filtered.sort((a, b) => (Number(a[1].sortOrder) || 1) - (Number(b[1].sortOrder) || 1));

  // Update counter
  elements.itemCountBadge.textContent = `${filtered.length} ${filtered.length === 1 ? "dish" : "dishes"}`;

  // Handle empty search result
  if (filtered.length === 0) {
    elements.dishesContainer.classList.add("hidden");
    elements.emptySearchState.classList.remove("hidden");
    return;
  }

  elements.emptySearchState.classList.add("hidden");
  elements.dishesContainer.classList.remove("hidden");
  elements.dishesContainer.innerHTML = "";

  const currency = state.restaurant.currency || "$";

  // Build each dish card
  filtered.forEach(([id, item]) => {
    const isAvailable = item.available !== false;
    const card = document.createElement("article");
    card.className = `dish-card bg-white rounded-2xl border border-borderstone overflow-hidden flex flex-col cursor-pointer transition-all ${
      !isAvailable ? "dish-card-unavailable" : ""
    }`;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${item.name}, ${formatPrice(item.price, currency)}`);

    // Image URL with fallback
    const imgSrc = item.imageUrl && item.imageUrl.trim() !== "" ? item.imageUrl : "assets/images/placeholder.svg";

    // Badges HTML
    const badgesHtml = getDietaryBadgeHtml(item);

    // Bestseller / Chef's Special ribbon
    let specialBadge = "";
    if (item.featured) {
      specialBadge = `
        <div class="absolute top-3 left-3 bg-terracotta text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shadow-sm z-10 flex items-center gap-1">
          <span>★</span> Chef's Selection
        </div>
      `;
    }

    // Sold out badge
    let soldOutBadge = "";
    if (!isAvailable) {
      soldOutBadge = `
        <div class="absolute inset-0 bg-stone-900/40 backdrop-blur-[1px] flex items-center justify-center z-20">
          <span class="bg-stone-900/90 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-stone-700">
            Sold Out
          </span>
        </div>
      `;
    }

    // Original price strike-through
    let originalPriceHtml = "";
    if (item.originalPrice && item.originalPrice > item.price) {
      originalPriceHtml = `<span class="text-xs text-stone-400 line-through mr-1.5">${formatPrice(item.originalPrice, currency)}</span>`;
    }

    card.innerHTML = `
      <div class="dish-image-wrapper">
        ${specialBadge}
        ${soldOutBadge}
        <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(item.name)}" loading="lazy">
      </div>
      <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-1.5 mb-2 flex-wrap">
            ${badgesHtml}
          </div>
          <h4 class="font-serif font-bold text-base sm:text-lg text-charcoal leading-snug mb-1 group-hover:text-terracotta transition-colors">
            ${escapeHtml(item.name)}
          </h4>
          <p class="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-4">
            ${escapeHtml(item.description || "")}
          </p>
        </div>
        <div class="pt-3 border-t border-borderstone/80 flex items-baseline justify-between">
          <div class="flex items-baseline">
            ${originalPriceHtml}
            <span class="font-serif font-bold text-lg text-terracotta">
              ${formatPrice(item.price, currency)}
            </span>
          </div>
          <span class="text-[11px] font-semibold text-stone-500 hover:text-charcoal flex items-center gap-1">
            Details &rarr;
          </span>
        </div>
      </div>
    `;

    // Attach fallback to image
    const imgEl = card.querySelector("img");
    imgEl.onerror = () => handleImageFallback(imgEl);

    // Click handler to open detail modal
    card.addEventListener("click", () => openDishModal(id, item));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openDishModal(id, item);
      }
    });

    elements.dishesContainer.appendChild(card);
  });
}

/**
 * Open Dish Detail Modal
 */
function openDishModal(id, item) {
  state.selectedDish = { id, ...item };
  const currency = state.restaurant.currency || "$";

  elements.modalDishTitle.textContent = item.name;
  elements.modalDishPrice.textContent = formatPrice(item.price, currency);

  if (item.originalPrice && item.originalPrice > item.price) {
    elements.modalDishOriginalPrice.textContent = `Regular ${formatPrice(item.originalPrice, currency)}`;
    elements.modalDishOriginalPrice.classList.remove("hidden");
  } else {
    elements.modalDishOriginalPrice.classList.add("hidden");
  }

  // Category name
  const cat = state.categories[item.categoryId];
  elements.modalDishCategory.textContent = cat ? cat.name : "Artisanal Specialty";

  // Image
  const imgSrc = item.imageUrl && item.imageUrl.trim() !== "" ? item.imageUrl : "assets/images/placeholder.svg";
  elements.modalDishImage.src = imgSrc;
  elements.modalDishImage.alt = item.name;
  elements.modalDishImage.onerror = () => handleImageFallback(elements.modalDishImage);

  // Description
  elements.modalDishDescription.textContent = item.description || "Freshly crafted using seasonal market ingredients.";

  // Dietary badges
  elements.modalDishBadges.innerHTML = getDietaryBadgeHtml(item);

  // Notes / Allergens
  if (item.notes && item.notes.trim() !== "") {
    elements.modalDishNotes.textContent = item.notes;
    elements.modalDishNotesContainer.classList.remove("hidden");
  } else {
    elements.modalDishNotesContainer.classList.add("hidden");
  }

  // Sold out state
  if (item.available === false) {
    elements.modalDishSoldoutBadge.classList.remove("hidden");
  } else {
    elements.modalDishSoldoutBadge.classList.add("hidden");
  }

  // WhatsApp Order / Inquiry Link
  const phone = (state.restaurant.whatsappNumber || state.restaurant.phone || "").replace(/[^0-9]/g, "");
  if (state.restaurant.enableWhatsappOrders !== false && phone) {
    const message = encodeURIComponent(`Hello ${state.restaurant.name || "Chef"}, I would like to inquire about ordering: "${item.name}" (${formatPrice(item.price, currency)}).`);
    elements.modalWhatsappLink.href = `https://wa.me/${phone}?text=${message}`;
    elements.modalWhatsappLink.classList.remove("hidden");
  } else {
    elements.modalWhatsappLink.classList.add("hidden");
  }

  // Show modal
  elements.dishDetailModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

/**
 * Close Dish Detail Modal
 */
function closeDishModal() {
  if (!elements.dishDetailModal) return;
  elements.dishDetailModal.classList.remove("active");
  document.body.style.overflow = "";
}

/**
 * Open Restaurant Information Modal
 */
function openInfoModal() {
  const r = state.restaurant;
  if (elements.infoAddressText) elements.infoAddressText.textContent = r.address || "Available upon reservation";
  if (elements.infoPhoneText) elements.infoPhoneText.textContent = r.phone || "Available on site";

  // Render weekly hours
  if (elements.infoHoursTable && r.openingHours) {
    const days = [
      { key: "monday", label: "Monday" },
      { key: "tuesday", label: "Tuesday" },
      { key: "wednesday", label: "Wednesday" },
      { key: "thursday", label: "Thursday" },
      { key: "friday", label: "Friday" },
      { key: "saturday", label: "Saturday" },
      { key: "sunday", label: "Sunday" }
    ];

    const currentDayIdx = new Date().getDay();
    const dayMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const todayKey = dayMap[currentDayIdx];

    elements.infoHoursTable.innerHTML = days
      .map(({ key, label }) => {
        const schedule = r.openingHours[key];
        const isToday = key === todayKey;
        let timeText = "Closed";
        if (schedule && !schedule.closed) {
          timeText = `${schedule.open || "11:00"} - ${schedule.close || "22:00"}`;
        }
        return `
          <div class="flex items-center justify-between py-1 ${isToday ? "font-bold text-terracotta border-l-2 border-terracotta pl-2" : ""}">
            <span>${label} ${isToday ? "(Today)" : ""}</span>
            <span class="font-mono text-[11px]">${timeText}</span>
          </div>
        `;
      })
      .join("");
  }

  // Social Links
  if (elements.infoSocialLinks && r.socialLinks) {
    elements.infoSocialLinks.innerHTML = "";
    if (r.socialLinks.instagram) {
      elements.infoSocialLinks.innerHTML += `
        <a href="${escapeHtml(r.socialLinks.instagram)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg border border-borderstone bg-white hover:bg-stonecream text-stone-700 text-xs font-medium">
          Instagram
        </a>
      `;
    }
    if (r.socialLinks.facebook) {
      elements.infoSocialLinks.innerHTML += `
        <a href="${escapeHtml(r.socialLinks.facebook)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg border border-borderstone bg-white hover:bg-stonecream text-stone-700 text-xs font-medium">
          Facebook
        </a>
      `;
    }
    if (r.socialLinks.googleMaps) {
      elements.infoSocialLinks.innerHTML += `
        <a href="${escapeHtml(r.socialLinks.googleMaps)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg border border-borderstone bg-white hover:bg-stonecream text-stone-700 text-xs font-medium">
          Google Maps
        </a>
      `;
    }
  }

  elements.restaurantInfoModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

/**
 * Close Restaurant Information Modal
 */
function closeInfoModal() {
  if (!elements.restaurantInfoModal) return;
  elements.restaurantInfoModal.classList.remove("active");
  document.body.style.overflow = "";
}

// Kickoff application
document.addEventListener("DOMContentLoaded", init);

