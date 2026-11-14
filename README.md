# L'Olivier & Sel — Premium Digital Restaurant Menu Application

A production-ready, human-designed digital restaurant menu and management portal built with **Vanilla JavaScript (ES6+)**, **HTML5**, **CSS3**, **Tailwind CSS (Play CDN)**, and **Firebase Realtime Database & Authentication**.

No frameworks, no bundlers, no Node.js runtime required.

---

## 🍽️ Key Features

### 1. Customer-Facing Digital Menu (`index.html`)
- **Visual Aesthetic:** Editorial, warm, artisanal dining identity with typography (`Playfair Display`, `Cinzel`, `Plus Jakarta Sans`) and restrained color palette.
- **Dynamic Restaurant Header:** Live status calculation ("Open Today until 22:30" / "Closed"), address, phone, and hours modal.
- **Instant Search:** Debounced instant dish search across titles, descriptions, and ingredients.
- **Course Categorization:** Horizontally scrollable tabs synchronized in real-time with Firebase.
- **Dietary Badges & Filtering:** Veg, Non-Veg, Vegan, Egg, Spice levels (1–3), and Chef's Special badges.
- **Accessible Modal / Bottom Sheet:** Large photography, full ingredients, allergens/notes, and optional WhatsApp ordering link with pre-filled message.
- **Zero Account Requirement:** Fast access via QR code or shared link without sign-up.

### 2. Secure Restaurant Management Portal (`admin.html`)
- **Firebase Authentication:** Secure email/password login with automatic role verification.
- **Role-Based Authorization:** Validates that user UID exists in `/admins/{uid}` with `active === true`.
- **First-Time Bootstrap:** Automatically initializes the first authenticated user as the primary restaurant owner when `/admins` is empty.
- **Live Metrics Dashboard:** Real-time counters for total categories, dishes, available items, sold out items, and chef's specials.
- **Category Management:** Create, reorder, edit, and safely delete categories (warns if dishes are currently assigned).
- **Dish CRUD:** Full create, read, update, delete workflows with instant image preview and 1-click availability toggles.
- **Restaurant Settings:** Brand identity, phone, address, currency, weekly service hours schedule, and social media links.
- **Seed Menu Tool:** One-click utility to populate the database with boutique sample dishes if blank.

---

## 📁 Project Architecture

```
digital-menu/
├── index.html                   # Public customer menu
├── admin.html                   # Restaurant administrator portal
├── css/
│   └── styles.css               # Bespoke editorial styling & responsive rules
├── js/
│   ├── firebase-config.js       # Firebase project credentials
│   ├── firebase-init.js         # Official Firebase v10 modular SDK initialization
│   ├── utils.js                 # Currency format, XSS sanitizer, toasts, status helper
│   ├── validation.js            # Validation rules for dishes, categories, and settings
│   ├── restaurant-service.js    # Firebase service for /restaurant node
│   ├── category-service.js      # Firebase service for /categories node
│   ├── menu-service.js          # Firebase service for /menuItems node
│   ├── seed-data.js             # High quality boutique seed menu dataset
│   ├── admin-auth.js            # Firebase Auth & Realtime Database authorization guard
│   ├── admin-dashboard.js       # Administrative controller & UI handlers
│   └── public-menu.js           # Public customer menu controller & UI handlers
├── assets/
│   └── images/
│       └── placeholder.svg      # SVG image fallback for missing/broken URLs
├── database.rules.json          # Production Realtime Database Security Rules
├── firebase.json                # Firebase Hosting & Database configuration
└── README.md                    # Setup and deployment documentation
```

---

## 🚀 Quick Start: Running Locally

Because this project uses official ES Modules, it must be served through an HTTP server rather than opening `file:///` directly in the browser.

### Option A: Using Python (Pre-installed on most systems)
```bash
# Python 3
python -m http.server 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

### Option B: Using VS Code Live Server
1. Open the `digital-menu` folder in VS Code.
2. Right click on `index.html` and choose **"Open with Live Server"**.

### Option C: Using any static server (e.g., npx serve)
```bash
npx serve .
```

---

## ⚙️ Connecting Your Firebase Project

### Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and give it a name (e.g. `la-carte-menu`).

### Step 2: Enable Firebase Authentication
1. In the Firebase console left sidebar, navigate to **Build > Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, click **Email/Password**.
4. Enable **Email/Password** and click **Save**.
5. Switch to the **Users** tab and click **Add user**.
   - Email: `admin@restaurant.com` (or your chosen email)
   - Password: Choose a strong password.

### Step 3: Create a Realtime Database
1. In the sidebar, navigate to **Build > Realtime Database**.
2. Click **Create Database**.
3. Select a location near your customers (e.g., `United States` or `Belgium`).
4. Select **Start in locked mode** and click **Enable**.

### Step 4: Publish Security Rules
1. In the Realtime Database page, go to the **Rules** tab.
2. Replace all existing contents with the rules from `database.rules.json`:

```json
{
  "rules": {
    "restaurant": {
      ".read": true,
      ".write": "auth != null && root.child('admins').child(auth.uid).child('active').val() === true"
    },
    "categories": {
      ".read": true,
      ".write": "auth != null && root.child('admins').child(auth.uid).child('active').val() === true",
      "$category_id": {
        ".validate": "newData.hasChildren(['name', 'sortOrder', 'active']) && newData.child('name').isString() && newData.child('name').val().length > 0 && newData.child('sortOrder').isNumber() && newData.child('active').isBoolean()"
      }
    },
    "menuItems": {
      ".read": true,
      ".write": "auth != null && root.child('admins').child(auth.uid).child('active').val() === true",
      "$item_id": {
        ".validate": "newData.hasChildren(['name', 'price', 'categoryId', 'available']) && newData.child('name').isString() && newData.child('name').val().length > 0 && newData.child('price').isNumber() && newData.child('price').val() >= 0 && newData.child('categoryId').isString() && newData.child('available').isBoolean()"
      }
    },
    "admins": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && (root.child('admins').child(auth.uid).child('active').val() === true || !data.exists() && !root.child('admins').exists())"
      }
    }
  }
}
```
3. Click **Publish**.

### Step 5: Copy Your Web App Config
1. In Firebase Console, click the ⚙️ gear icon next to **Project Overview** > **Project Settings**.
2. Under the **General** tab, scroll to **Your apps** and click the Web icon (`</>`).
3. Enter an app nickname (e.g. `Web Menu`) and register the app.
4. Copy the `firebaseConfig` object and update `js/firebase-config.js`:

```javascript
export const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project-id.firebaseapp.com",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

---

## 🔒 Security Architecture

1. **Authentication:** Uses Firebase Authentication tokens; passwords are never transmitted or stored in the database.
2. **Access Control:** Public visitors are granted read-only permissions for `/restaurant`, `/categories`, and `/menuItems`.
3. **Database Write Protection:** Only authenticated administrators whose `auth.uid` is recorded under `/admins/{uid}` with `active === true` can execute write operations.
4. **Data Validation:** Strict schema validation in `database.rules.json` enforces required fields, string lengths, positive numerical prices, and boolean availability.
5. **No Client Injections:** Text inputs are escaped and rendered via safe DOM methods to prevent Cross-Site Scripting (XSS).

---

## 🌐 Deploying to Firebase Hosting

1. Install the Firebase CLI (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```
2. Log in to Firebase:
   ```bash
   firebase login
   ```
3. Select your project:
   ```bash
   firebase use --add
   ```
4. Deploy the application:
   ```bash
   firebase deploy
   ```
5. Your menu will be live at:
   - Public Menu: `https://your-project.web.app`
   - Admin Portal: `https://your-project.web.app/admin`

---

## ❓ Troubleshooting

| Issue | Resolution |
| :--- | :--- |
| **"Failed to fetch" / CORS error** | Ensure you are serving the files via an HTTP server (e.g. `python -m http.server`), not by opening the file directly via `file://`. |
| **"PERMISSION_DENIED" on write** | Verify that you published `database.rules.json` in the Firebase Console Rules tab, and that your account was bootstrapped or added to the `/admins` table. |
| **"auth/invalid-credential"** | Check that you enabled Email/Password sign-in in Firebase Authentication and that the user was created. |
| **Images not loading** | The application automatically handles broken image URLs with a local SVG placeholder. Check if external image host permits cross-origin hotlinking (Unsplash URLs work reliably). |

