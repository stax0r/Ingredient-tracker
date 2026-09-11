import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- Firebase Configuration & Initialization ---
const firebaseConfig = {
  // Replace with your actual Firebase config object if needed
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// State Management
let currentIngredients = [];
let currentLocations = [];
let currentRecipes = [];
let currentPrices = [];
let batchQueue = [];

// DOM Elements
const authContainer = document.getElementById("auth-container");
const btnOpenLogin = document.getElementById("btn-open-login");
const loginModal = document.getElementById("login-modal");
const btnCloseLogin = document.getElementById("btn-close-login");
const authForm = document.getElementById("auth-form");
const loggedInView = document.getElementById("logged-in-view");
const userDisplay = document.getElementById("user-display");
const btnSignout = document.getElementById("btn-signout");
const adminToggles = document.getElementById("admin-toggles");
const priceLoggerSection = document.getElementById("price-logger-section");
const guestMissiveSection = document.getElementById("guest-missive-section");

const catalogContainer = document.getElementById("catalog-container");
const catalogSearch = document.getElementById("catalog-search");
const catalogLocationFilter = document.getElementById("catalog-location-filter");

const guestForm = document.getElementById("guest-form");
const guestContribType = document.getElementById("guest-contrib-type");
const guestPriceFields = document.getElementById("guest-price-fields");
const guestLocationFields = document.getElementById("guest-location-fields");
const guestLetterFields = document.getElementById("guest-letter-fields");

// Toast Notification Helper
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `p-3 rounded text-xs font-semibold text-white shadow-lg transition-all duration-300 pointer-events-auto ${
    type === "error" ? "bg-red-800 border border-red-600" : type === "success" ? "bg-emerald-800 border border-emerald-600" : "bg-zinc-800 border border-red-900"
  }`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Global Auth State Handler
onAuthStateChanged(auth, (user) => {
  if (user) {
    btnOpenLogin?.classList.add("hidden");
    loggedInView?.classList.remove("hidden");
    if (userDisplay) userDisplay.textContent = user.email;
    adminToggles?.classList.remove("hidden");
    priceLoggerSection?.classList.remove("hidden");
    
    // HIDE courier missive form when authenticated
    guestMissiveSection?.classList.add("hidden");
  } else {
    btnOpenLogin?.classList.remove("hidden");
    loggedInView?.classList.add("hidden");
    adminToggles?.classList.add("hidden");
    priceLoggerSection?.classList.add("hidden");
    
    // SHOW courier missive form when logged out
    guestMissiveSection?.classList.remove("hidden");
  }
});

// Login Modal Events
btnOpenLogin?.addEventListener("click", () => loginModal?.classList.remove("hidden"));
btnCloseLogin?.addEventListener("click", () => loginModal?.classList.add("hidden"));

authForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginModal?.classList.add("hidden");
    authForm.reset();
    showToast("Welcome back, Arch-Mage.", "success");
  } catch (err) {
    showToast("Authentication failed: " + err.message, "error");
  }
});

btnSignout?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    showToast("Signed out successfully.");
  } catch (err) {
    showToast("Error signing out.", "error");
  }
});

// Missive Form Field Switcher
function updateGuestFormFields() {
  const type = guestContribType.value;
  if (type === "price") {
    guestPriceFields?.classList.remove("hidden");
    guestLocationFields?.classList.add("hidden");
    guestLetterFields?.classList.add("hidden");
  } else if (type === "location") {
    guestPriceFields?.classList.add("hidden");
    guestLocationFields?.classList.remove("hidden");
    guestLetterFields?.classList.add("hidden");
  } else {
    guestPriceFields?.classList.add("hidden");
    guestLocationFields?.classList.add("hidden");
    guestLetterFields?.classList.remove("hidden");
  }
}

guestContribType?.addEventListener("change", updateGuestFormFields);

// Guest Courier Missive Submission Handler
guestForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const type = guestContribType.value;
  const author = document.getElementById("guest-author").value || "Wandering Alchemist";

  let payload = {
    type,
    author,
    timestamp: new Date().toISOString()
  };

  if (type === "price") {
    payload.ingredient = document.getElementById("guest-ingredient-select").value;
    payload.location = document.getElementById("guest-location-select").value;
    payload.price = parseFloat(document.getElementById("guest-price-amount").value);
    if (!payload.ingredient || !payload.location || isNaN(payload.price)) {
      showToast("Please fill in all valuation details.", "error");
      return;
    }
  } else if (type === "location") {
    payload.hold = document.getElementById("guest-loc-hold").value;
    payload.town = document.getElementById("guest-loc-town").value;
    if (!payload.hold || !payload.town) {
      showToast("Please specify Hold and Settlement names.", "error");
      return;
    }
  } else {
    payload.letter = document.getElementById("guest-letter-content").value;
    if (!payload.letter) {
      showToast("Please pen your message before sending.", "error");
      return;
    }
  }

  // Simulated Webhook Dispatch / Local Log
  try {
    showToast("Courier missive dispatched!", "success");
    guestForm.reset();
    updateGuestFormFields();
  } catch (err) {
    showToast("Courier dispatch failed.", "error");
  }
});

// Firestore Realtime Subscriptions
function initDataListeners() {
  onSnapshot(collection(db, "ingredients"), (snap) => {
    currentIngredients = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    populateDropdowns();
    renderCatalog();
  });

  onSnapshot(collection(db, "locations"), (snap) => {
    currentLocations = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    populateDropdowns();
    renderCatalog();
  });

  onSnapshot(collection(db, "prices"), (snap) => {
    currentPrices = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderCatalog();
  });

  onSnapshot(collection(db, "recipes"), (snap) => {
    currentRecipes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    populateRecipeDropdown();
  });
}

// Dynamic Option Population
function populateDropdowns() {
  const ingSelects = [
    document.getElementById("price-ingredient-select"),
    document.getElementById("guest-ingredient-select")
  ];
  const locSelects = [
    document.getElementById("price-location-select"),
    document.getElementById("guest-location-select"),
    catalogLocationFilter
  ];

  ingSelects.forEach(sel => {
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = `<option value="">Select Ingredient...</option>` +
      currentIngredients.map(i => `<option value="${i.id}">${i.name}</option>`).join("");
    sel.value = currentVal;
  });

  locSelects.forEach(sel => {
    if (!sel) return;
    const isFilter = sel === catalogLocationFilter;
    const currentVal = sel.value;
    sel.innerHTML = (isFilter ? `<option value="">Filter by Location (All)</option>` : `<option value="">Select Location...</option>`) +
      currentLocations.map(l => `<option value="${l.id}">${l.town ? `${l.town} (${l.hold})` : l.hold}</option>`).join("");
    sel.value = currentVal;
  });
}

function populateRecipeDropdown() {
  const sel = document.getElementById("simulator-recipe-select");
  if (!sel) return;
  sel.innerHTML = `<option value="">Select a Potion Recipe...</option>` +
    currentRecipes.map(r => `<option value="${r.id}">${r.name}</option>`).join("");
}

// Catalog Renderer
function renderCatalog() {
  if (!catalogContainer) return;
  const searchFilter = catalogSearch?.value.toLowerCase() || "";
  const locFilter = catalogLocationFilter?.value || "";

  let filtered = currentIngredients.filter(i => i.name.toLowerCase().includes(searchFilter));

  if (filtered.length === 0) {
    catalogContainer.innerHTML = `<p class="col-span-full text-center text-xs text-red-400 py-8">No ingredients found matching criteria.</p>`;
    return;
  }

  catalogContainer.innerHTML = filtered.map(ing => {
    let ingPrices = currentPrices.filter(p => p.ingredientId === ing.id);
    if (locFilter) {
      ingPrices = ingPrices.filter(p => p.locationId === locFilter);
    }

    const priceListHtml = ingPrices.length === 0
      ? `<p class="text-[11px] text-zinc-500 italic">No price records found.</p>`
      : ingPrices.map(p => {
          const loc = currentLocations.find(l => l.id === p.locationId);
          const locName = loc ? (loc.town ? `${loc.town}, ${loc.hold}` : loc.hold) : "Unknown Hold";
          return `<div class="flex justify-between items-center text-xs py-1 border-b border-zinc-800">
            <span class="text-red-200/80">${locName}</span>
            <span class="font-mono text-red-400 font-bold">${p.amount} Gold</span>
          </div>`;
        }).join("");

    return `
      <div class="bg-zinc-950/60 border border-red-950/80 rounded-lg p-4 space-y-2 shadow">
        <h3 class="text-sm font-bold text-red-100">${ing.name}</h3>
        <div class="space-y-1">${priceListHtml}</div>
      </div>
    `;
  }).join("");
}

catalogSearch?.addEventListener("input", renderCatalog);
catalogLocationFilter?.addEventListener("change", renderCatalog);

// Direct Price Logger Form Submission (Admin/User)
document.getElementById("direct-price-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const ingredientId = document.getElementById("price-ingredient-select").value;
  const locationId = document.getElementById("price-location-select").value;
  const amount = parseFloat(document.getElementById("price-amount").value);

  try {
    await addDoc(collection(db, "prices"), {
      ingredientId,
      locationId,
      amount,
      updatedAt: serverTimestamp()
    });
    showToast("Price valuation logged.", "success");
    e.target.reset();
  } catch (err) {
    showToast("Failed to log price.", "error");
  }
});

// Initialize listeners on module load
initDataListeners();
updateGuestFormFields();