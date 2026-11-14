/**
 * UI & Helper Utilities for Digital Menu Application
 */

/**
 * Escape HTML to prevent injection when rendering text
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Format currency price
 */
export function formatPrice(price, currency = "$") {
  const num = Number(price);
  if (isNaN(num)) return `${currency}0.00`;
  
  // If currency is INR or has no decimals standard, format appropriately
  if (currency === "₹") {
    return `${currency}${num.toLocaleString("en-IN")}`;
  }
  return `${currency}${num.toFixed(2)}`;
}

/**
 * Debounce a function call
 */
export function debounce(func, wait = 250) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Toast Notification System
 */
export function showToast(message, type = "info", duration = 3500) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `pointer-events-auto p-4 rounded-xl shadow-lg border text-sm flex items-center justify-between gap-3 transform transition-all duration-300 translate-y-4 opacity-0`;

  let bgClass = "bg-stone-900 text-stone-100 border-stone-800";
  let iconSvg = `<svg class="w-5 h-5 flex-shrink-0 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

  if (type === "success") {
    bgClass = "bg-[#2A3B2C] text-[#E8F0E9] border-[#3F5441]";
    iconSvg = `<svg class="w-5 h-5 flex-shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
  } else if (type === "error") {
    bgClass = "bg-[#3D1A1A] text-[#FDE8E8] border-[#5E2B2B]";
    iconSvg = `<svg class="w-5 h-5 flex-shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
  } else if (type === "warning") {
    bgClass = "bg-[#382D16] text-[#FEF3C7] border-[#5B4822]";
    iconSvg = `<svg class="w-5 h-5 flex-shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
  }

  toast.className += ` ${bgClass}`;
  toast.innerHTML = `
    <div class="flex items-center gap-2.5">
      ${iconSvg}
      <span class="font-medium text-xs md:text-sm">${escapeHtml(message)}</span>
    </div>
    <button type="button" class="text-stone-400 hover:text-white transition-colors" aria-label="Dismiss">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
    </button>
  `;

  const dismissBtn = toast.querySelector("button");
  const dismiss = () => {
    toast.classList.add("opacity-0", "translate-y-2");
    setTimeout(() => toast.remove(), 300);
  };
  dismissBtn.addEventListener("click", dismiss);

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove("opacity-0", "translate-y-4");
  });

  setTimeout(dismiss, duration);
}

/**
 * Determine if restaurant is currently open based on opening hours object
 */
export function calculateRestaurantStatus(openingHours) {
  if (!openingHours || typeof openingHours !== "object" || Object.keys(openingHours).length === 0) {
    return { isOpen: true, statusText: "Open Today", badgeClass: "bg-emerald-900/20 text-emerald-700 border-emerald-800/30" };
  }

  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const now = new Date();
  const currentDayName = days[now.getDay()];
  const todaySchedule = openingHours[currentDayName];

  if (!todaySchedule || todaySchedule.closed) {
    return { isOpen: false, statusText: "Closed Today", badgeClass: "bg-stone-200 text-stone-700 border-stone-300" };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parseTime = (timeStr) => {
    if (!timeStr) return null;
    const parts = timeStr.split(":");
    if (parts.length < 2) return null;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  const openMinutes = parseTime(todaySchedule.open);
  const closeMinutes = parseTime(todaySchedule.close);

  if (openMinutes === null || closeMinutes === null) {
    return { isOpen: true, statusText: "Open Today", badgeClass: "bg-emerald-900/20 text-emerald-700 border-emerald-800/30" };
  }

  if (currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
    return {
      isOpen: true,
      statusText: `Open until ${todaySchedule.close}`,
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200/80"
    };
  } else if (currentMinutes < openMinutes) {
    return {
      isOpen: false,
      statusText: `Closed • Opens at ${todaySchedule.open}`,
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80"
    };
  } else {
    return {
      isOpen: false,
      statusText: "Closed for the day",
      badgeClass: "bg-stone-100 text-stone-600 border-stone-200"
    };
  }
}

/**
 * Fallback image placeholder
 */
export const DEFAULT_PLACEHOLDER_IMAGE = "assets/images/placeholder.svg";

export function handleImageFallback(imgElement) {
  if (!imgElement) return;
  imgElement.onerror = null;
  imgElement.src = DEFAULT_PLACEHOLDER_IMAGE;
}

/**
 * Returns clean dietary tag badges
 */
export function getDietaryBadgeHtml(item) {
  let badges = "";

  // Food type badge (Veg / Non-Veg / Vegan / Egg)
  if (item.foodType === "veg") {
    badges += `
      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide border border-emerald-600/40 bg-emerald-50 text-emerald-800" title="Vegetarian">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Veg
      </span>
    `;
  } else if (item.foodType === "non-veg") {
    badges += `
      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide border border-rose-800/40 bg-rose-50 text-rose-900" title="Non-Vegetarian">
        <span class="w-1.5 h-1.5 rounded-full bg-rose-700"></span> Non-Veg
      </span>
    `;
  } else if (item.foodType === "vegan") {
    badges += `
      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide border border-teal-700/40 bg-teal-50 text-teal-800" title="100% Plant-Based Vegan">
        <span class="w-1.5 h-1.5 rounded-full bg-teal-600"></span> Vegan
      </span>
    `;
  } else if (item.foodType === "egg") {
    badges += `
      <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide border border-amber-700/40 bg-amber-50 text-amber-900" title="Contains Egg">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-600"></span> Egg
      </span>
    `;
  }

  // Dietary labels array
  if (Array.isArray(item.dietaryLabels)) {
    item.dietaryLabels.forEach((label) => {
      const cleanLabel = escapeHtml(label).trim();
      if (!cleanLabel) return;
      badges += `
        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wide bg-stone-100 text-stone-600 border border-stone-200">
          ${cleanLabel}
        </span>
      `;
    });
  }

  // Spice level dots
  if (item.spiceLevel && item.spiceLevel > 0) {
    const dots = Math.min(Math.max(item.spiceLevel, 1), 3);
    const peppers = Array(dots).fill("🌶️").join("");
    badges += `
      <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-800 border border-orange-200" title="Spice Level: ${dots}/3">
        ${peppers}
      </span>
    `;
  }

  return badges;
}

