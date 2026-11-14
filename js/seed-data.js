/**
 * Seed Menu Data for Initial Setup
 * Provides a curated, restaurant-quality menu for boutique dining.
 * Only applied deliberately through admin setup; never overwrites existing production data automatically.
 */

import { DEFAULT_RESTAURANT_PROFILE } from "./restaurant-service.js";
import { ref, get, set, child } from "./firebase-init.js";

export const SAMPLE_CATEGORIES = {
  cat_starters: {
    name: "Starters & Crudo",
    description: "Light, vibrant small plates featuring seasonal harvest and coastal delicacies.",
    sortOrder: 1,
    active: true
  },
  cat_pasta: {
    name: "Artisanal Pasta & Hearth",
    description: "Hand-rolled daily pasta and slow-braised comforting specialties.",
    sortOrder: 2,
    active: true
  },
  cat_mains: {
    name: "Wood-Fired Mains",
    description: "Prime cuts and market fish seared over cherry oak and aromatic vine wood.",
    sortOrder: 3,
    active: true
  },
  cat_pizza: {
    name: "Stone-Baked Pinsa",
    description: "72-hour fermented sourdough crust with San Marzano tomatoes and fior di latte.",
    sortOrder: 4,
    active: true
  },
  cat_desserts: {
    name: "Desserts & Pâtisserie",
    description: "Exquisite confections crafted with single-origin chocolate and farm berries.",
    sortOrder: 5,
    active: true
  },
  cat_beverages: {
    name: "Botanical Elixirs & Wine",
    description: "Artisanal infusions, non-alcoholic craft sodas, and sommelier selections.",
    sortOrder: 6,
    active: true
  }
};

export const SAMPLE_MENU_ITEMS = {
  item_burrata: {
    name: "Heirloom Burrata Pugliese",
    description: "Creamy artisanal burrata, roasted baby heirloom tomatoes, basil oil, and aged Modena balsamic reduction on toasted sourdough.",
    price: 18.00,
    originalPrice: 21.00,
    imageUrl: "https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=800&q=80",
    categoryId: "cat_starters",
    foodType: "veg",
    spiceLevel: 0,
    dietaryLabels: ["Vegetarian", "Chef's Special"],
    featured: true,
    available: true,
    notes: "Contains dairy and gluten. Gluten-free crostini available upon request.",
    sortOrder: 1
  },
  item_carpaccio: {
    name: "Wild Hamachi Crudo",
    description: "Thinly sliced Pacific hamachi, blood orange supreme, pickled shallots, white truffle ponzu, and micro shiso.",
    price: 22.00,
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80",
    categoryId: "cat_starters",
    foodType: "non-veg",
    spiceLevel: 1,
    dietaryLabels: ["Gluten-Free", "Bestseller"],
    featured: true,
    available: true,
    notes: "Raw fish warning: responsibly sourced sashimi-grade yellowtail.",
    sortOrder: 2
  },
  item_risotto: {
    name: "Carnaroli Saffron & Morels Risotto",
    description: "Slow-simmered Acquerello rice with Iranian saffron threads, foraged pine morels, and 24-month Parmigiano-Reggiano foam.",
    price: 28.00,
    originalPrice: 32.00,
    imageUrl: "https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=800&q=80",
    categoryId: "cat_pasta",
    foodType: "veg",
    spiceLevel: 0,
    dietaryLabels: ["Vegetarian", "Gluten-Free", "Chef's Special"],
    featured: true,
    available: true,
    notes: "Slow prepared to order. Allow 15 minutes.",
    sortOrder: 1
  },
  item_tagliatelle: {
    name: "Handmade Truffle Tagliatelle",
    description: "Rich yolk pasta ribbon tossed in French Normandy cultured butter, wild chanterelles, and shaved black Perigord truffles.",
    price: 31.00,
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1556761223-4c4282c73f77?auto=format&fit=crop&w=800&q=80",
    categoryId: "cat_pasta",
    foodType: "veg",
    spiceLevel: 0,
    dietaryLabels: ["Vegetarian", "Bestseller"],
    featured: true,
    available: true,
    notes: "Fresh handmade pasta prepared every morning.",
    sortOrder: 2
  },
  item_seabass: {
    name: "Pan-Roasted Mediterranean Branzino",
    description: "Crispy skin sea bass fillet, artichoke barigoule, saffron-fennel emulsion, charred Meyer lemon, and caperberry relish.",
    price: 36.00,
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80",
    categoryId: "cat_mains",
    foodType: "non-veg",
    spiceLevel: 0,
    dietaryLabels: ["Gluten-Free", "Chef's Special"],
    featured: true,
    available: true,
    notes: "Wild caught, sustainably sourced.",
    sortOrder: 1
  },
  item_ribeye: {
    name: "Wood-Fired Prime Ribeye (12 oz)",
    description: "Charcoal-grilled USDA Prime Black Angus ribeye, roasted bone marrow butter, blistered vine tomatoes, and rosemary sea salt.",
    price: 46.00,
    originalPrice: 52.00,
    imageUrl: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=800&q=80",
    categoryId: "cat_mains",
    foodType: "non-veg",
    spiceLevel: 0,
    dietaryLabels: ["Gluten-Free"],
    featured: true,
    available: true,
    notes: "Served medium-rare unless requested otherwise.",
    sortOrder: 2
  },
  item_truffle_pizza: {
    name: "Tartufo & Fior di Latte Pinsa",
    description: "White sourdough base, aged fontina, Fior di latte mozzarella, caramelized cipollini onions, roasted cremini, and white truffle essence.",
    price: 24.00,
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
    categoryId: "cat_pizza",
    foodType: "veg",
    spiceLevel: 0,
    dietaryLabels: ["Vegetarian", "Bestseller"],
    featured: true,
    available: true,
    notes: "Light and airy pinsa dough, naturally low gluten.",
    sortOrder: 1
  },
  item_margherita_pinsa: {
    name: "Vesuvio Margherita D.O.P.",
    description: "San Marzano D.O.P. crushed tomatoes, buffalo mozzarella from Campania, fresh Genovese basil, and Sicilian cold-pressed olive oil.",
    price: 20.00,
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80",
    categoryId: "cat_pizza",
    foodType: "veg",
    spiceLevel: 0,
    dietaryLabels: ["Vegetarian"],
    featured: false,
    available: true,
    notes: "Classic Neapolitan heritage recipe.",
    sortOrder: 2
  },
  item_tiramisu: {
    name: "Espresso & Mascarpone Tiramisu",
    description: "Savoiardi sponge soaked in single-estate Ethiopian espresso, velvety zabaione mascarpone mousse, and Valrhona cocoa dust.",
    price: 13.00,
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80",
    categoryId: "cat_desserts",
    foodType: "veg",
    spiceLevel: 0,
    dietaryLabels: ["Vegetarian", "Chef's Special"],
    featured: true,
    available: true,
    notes: "Contains pasteurized egg yolk and dairy.",
    sortOrder: 1
  },
  item_citrus_tart: {
    name: "Amalfi Lemon & Basil Meringue",
    description: "Shortbread crust, tart Meyer lemon curd, lightly torched Swiss meringue, and candied zest with crystallized basil crystals.",
    price: 12.00,
    originalPrice: 14.00,
    imageUrl: "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&w=800&q=80",
    categoryId: "cat_desserts",
    foodType: "veg",
    spiceLevel: 0,
    dietaryLabels: ["Vegetarian"],
    featured: false,
    available: true,
    notes: "House signature pastry.",
    sortOrder: 2
  },
  item_lavender_spritz: {
    name: "Provençal Lavender & Pear Spritz",
    description: "Poached Bartlett pear reduction, French organic lavender distillate, sparkling mineral water, and dehydrated lemon wheel.",
    price: 10.00,
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80",
    categoryId: "cat_beverages",
    foodType: "vegan",
    spiceLevel: 0,
    dietaryLabels: ["Vegan", "Gluten-Free"],
    featured: true,
    available: true,
    notes: "Zero-proof artisanal botanical refresher.",
    sortOrder: 1
  },
  item_smoked_rosemary: {
    name: "Smoked Rosemary Old Fashioned",
    description: "Barrel-aged small batch bourbon, demerara sugar syrup, aromatic Angostura & orange bitters, smoked rosemary plume.",
    price: 16.00,
    originalPrice: null,
    imageUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80",
    categoryId: "cat_beverages",
    foodType: "vegan",
    spiceLevel: 0,
    dietaryLabels: ["Vegan", "Gluten-Free", "Bestseller"],
    featured: true,
    available: true,
    notes: "Contains alcohol (21+).",
    sortOrder: 2
  }
};

/**
 * Seed the database if it is empty
 */
export async function seedInitialData(database, force = false) {
  if (!database) throw new Error("Firebase database instance is not available.");

  // Check if categories or menuItems already exist
  if (!force) {
    const categoriesSnapshot = await get(ref(database, "categories"));
    if (categoriesSnapshot.exists() && Object.keys(categoriesSnapshot.val() || {}).length > 0) {
      throw new Error("Database already has categories. Seeding aborted to preserve existing data.");
    }
  }

  // Write restaurant profile
  await set(ref(database, "restaurant"), DEFAULT_RESTAURANT_PROFILE);

  // Write categories
  await set(ref(database, "categories"), SAMPLE_CATEGORIES);

  // Write menu items
  await set(ref(database, "menuItems"), SAMPLE_MENU_ITEMS);

  return true;
}

