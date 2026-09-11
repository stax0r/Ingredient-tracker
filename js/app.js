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
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDTQPUXzYr8UAawpvNce6wbXJC07-ZOmeo",
  authDomain: "AIzaSyDTQPUXzYr8UAawpvNce6wbXJC07-ZOmeo",
  projectId: "alchemy-price-tracker",
  storageBucket: "alchemy-price-tracker.firebasestorage.app",
  messagingSenderId: "357962236614",
  appId: "1:357962236614:web:770c78966226a35f138dc7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// State Management
let currentUser = null;
let ingredients = [];
let locations = [];
let recipes = [];
let prices = [];
let batchQueue = [];

// DOM Elements
const priceLoggerSection = document.getElementById("price-logger-section");
const guestMissiveSection = document.getElementById("guest-missive-section");
const adminToggles = document.getElementById("admin-toggles");
const btnOpenLogin = document.getElementById("btn-open-login");
const loggedInView = document.getElementById("logged-in-view");
const userDisplay = document.getElementById("user-display");
const btnSignout = document.getElementById("btn-signout");
const loginModal = document.getElementById("login-modal");
const btnCloseLogin = document.getElementById("btn-close-login");
const authForm = document.getElementById("auth-form");

const adminModal = document.getElementById("admin-modal");
const adminModalTitle = document.getElementById("admin-modal-title");
const adminModalContent = document.getElementById("admin-modal-content");
const btnCloseAdmin = document.getElementById("btn-close-admin");

const catalogContainer = document.getElementById("catalog-container");
const catalogSearch = document.getElementById("catalog-search");
const catalogLocationFilter = document.getElementById("catalog-location-filter");

const guestForm = document.getElementById("guest-form");
const guestContribType = document.getElementById("guest-contrib-type");
const guestPriceFields = document.getElementById("guest-price-fields");
const guestLocationFields = document.getElementById("guest-location-fields");
const guestLetterFields = document.getElementById("guest-letter-fields");

// Authentication Listener
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    userDisplay.textContent = user.email;
    btnOpenLogin.classList.add("hidden");
    loggedInView.classList.remove("hidden");
    adminToggles.classList.remove("hidden");
    priceLoggerSection.classList.remove("hidden");

    // Hide guest missive section when logged in
    guestMissiveSection?.classList.add("hidden");
  } else {
    btnOpenLogin.classList.remove("hidden");
    loggedInView.classList.add("hidden");
    adminToggles.classList.add("hidden");
    priceLoggerSection.classList.add("hidden");

    // Show guest missive section when logged out
    guestMissiveSection?.classList.remove("hidden");
  }
  loadData();
});

// Toast Notification
function showToast(message, type = "info") {
  const toastContainer = document.getElementById("toast-container");
  const toast = document.createElement("div");
  const bgClass = type === "error" ? "bg-red-950 border-red-700 text-red-200" :
    type === "success" ? "bg-zinc-900 border-red-600 text-red-100" :
      "bg-zinc-900 border-red-900 text-red-300";
  toast.className = `p-3 rounded-lg border shadow-xl text-xs flex items-center justify-between gap-4 transition-all duration-300 transform translate-y-2 pointer-events-auto ${bgClass}`;
  toast.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()" class="text-red-400 hover:text-white font-bold">✕</button>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("opacity-0", "-translate-y-2");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Data Fetching
async function loadData() {
  try {
    const [ingSnap, locSnap, recSnap, priceSnap] = await Promise.all([
      getDocs(collection(db, "ingredients")),
      getDocs(collection(db, "locations")),
      getDocs(collection(db, "recipes")),
      getDocs(collection(db, "prices"))
    ]);

    ingredients = ingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    locations = locSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    recipes = recSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    prices = priceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    populateSelects();
    renderCatalog();
    renderBatchBrewing();
  } catch (err) {
    console.error("Error loading data:", err);
    showToast("Failed to load market data.", "error");
  }
}

// Populate Dropdowns
function populateSelects() {
  const ingredientSelects = [
    document.getElementById("price-ingredient-select"),
    document.getElementById("guest-ingredient-select")
  ];
  const locationSelects = [
    document.getElementById("price-location-select"),
    document.getElementById("guest-location-select"),
    catalogLocationFilter
  ];
  const recipeSelect = document.getElementById("simulator-recipe-select");

  ingredientSelects.forEach(select => {
    if (!select) return;
    const val = select.value;
    select.innerHTML = `<option value="">Select Ingredient...</option>` +
      ingredients.map(i => `<option value="${i.id}">${i.name}</option>`).join("");
    select.value = val;
  });

  locationSelects.forEach(select => {
    if (!select) return;
    const val = select.value;
    const isFilter = select === catalogLocationFilter;
    select.innerHTML = `<option value="">${isFilter ? "Filter by Location (All)" : "Select Location..."}</option>` +
      locations.map(l => `<option value="${l.id}">${l.hold} - ${l.town}</option>`).join("");
    select.value = val;
  });

  if (recipeSelect) {
    const val = recipeSelect.value;
    recipeSelect.innerHTML = `<option value="">Select a Potion Recipe...</option>` +
      recipes.map(r => `<option value="${r.id}">${r.name}</option>`).join("");
    recipeSelect.value = val;
  }
}

// Render Catalog
function renderCatalog() {
  if (!catalogContainer) return;

  const searchTerm = catalogSearch?.value.toLowerCase() || "";
  const filterLoc = catalogLocationFilter?.value || "";

  const filtered = ingredients.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(searchTerm);
    if (!matchesSearch) return false;

    if (filterLoc) {
      const hasPriceInLoc = prices.some(p => p.ingredientId === ing.id && p.locationId === filterLoc);
      return hasPriceInLoc;
    }
    return true;
  });

  if (filtered.length === 0) {
    catalogContainer.innerHTML = `<p class="text-xs text-red-400 italic col-span-full">No ingredients match your criteria.</p>`;
    return;
  }

  catalogContainer.innerHTML = filtered.map(ing => {
    let ingPrices = prices.filter(p => p.ingredientId === ing.id);
    if (filterLoc) {
      ingPrices = ingPrices.filter(p => p.locationId === filterLoc);
    }

    const priceList = ingPrices.length > 0 ? ingPrices.map(p => {
      const loc = locations.find(l => l.id === p.locationId);
      const locName = loc ? `${loc.hold} (${loc.town})` : "Unknown Location";
      return `<div class="flex justify-between items-center text-xs py-1 border-b border-red-950/50">
                <span class="text-red-300/80">${locName}</span>
                <span class="font-semibold text-red-200">${p.amount.toFixed(2)} Gold</span>
            </div>`;
    }).join("") : `<p class="text-[11px] text-zinc-500 italic">No price data recorded.</p>`;

    return `<div class="bg-zinc-950 border border-red-950 rounded-lg p-4 space-y-2 shadow">
            <h3 class="font-bold text-red-200 text-sm flex justify-between items-center">
                <span>${ing.name}</span>
            </h3>
            <div class="space-y-1">${priceList}</div>
        </div>`;
  }).join("");
}

// Guest Missive Logic
if (guestContribType) {
  guestContribType.addEventListener("change", updateGuestFormFields);
}

function updateGuestFormFields() {
  const type = guestContribType.value;
  guestPriceFields.classList.toggle("hidden", type !== "price");
  guestLocationFields.classList.toggle("hidden", type !== "location");
  guestLetterFields.classList.toggle("hidden", type !== "letter");
}

if (guestForm) {
  guestForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = guestContribType.value;
    const author = document.getElementById("guest-author").value || "Anonymous";

    try {
      if (type === "price") {
        const ingredientId = document.getElementById("guest-ingredient-select").value;
        const locationId = document.getElementById("guest-location-select").value;
        const amount = parseFloat(document.getElementById("guest-price-amount").value);

        if (!ingredientId || !locationId || isNaN(amount)) {
          showToast("Please fill all price fields.", "error");
          return;
        }

        await addDoc(collection(db, "guest_submissions"), {
          type: "price",
          ingredientId,
          locationId,
          amount,
          author,
          createdAt: serverTimestamp()
        });
      } else if (type === "location") {
        const hold = document.getElementById("guest-loc-hold").value;
        const town = document.getElementById("guest-loc-town").value;

        if (!hold || !town) {
          showToast("Please specify hold and town.", "error");
          return;
        }

        await addDoc(collection(db, "guest_submissions"), {
          type: "location",
          hold,
          town,
          author,
          createdAt: serverTimestamp()
        });
      } else if (type === "letter") {
        const content = document.getElementById("guest-letter-content").value;
        if (!content) {
          showToast("Please write a message.", "error");
          return;
        }

        await addDoc(collection(db, "guest_submissions"), {
          type: "letter",
          content,
          author,
          createdAt: serverTimestamp()
        });
      }

      showToast("Missive dispatched successfully!", "success");
      guestForm.reset();
      updateGuestFormFields();
    } catch (err) {
      console.error("Submission error:", err);
      showToast("Failed to dispatch missive.", "error");
    }
  });
}

// Record Price Form (Logged In)
const directPriceForm = document.getElementById("direct-price-form");
if (directPriceForm) {
  directPriceForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const ingredientId = document.getElementById("price-ingredient-select").value;
    const locationId = document.getElementById("price-location-select").value;
    const amount = parseFloat(document.getElementById("price-amount").value);

    if (!ingredientId || !locationId || isNaN(amount)) {
      showToast("Invalid price submission data.", "error");
      return;
    }

    try {
      const q = query(
        collection(db, "prices"),
        where("ingredientId", "==", ingredientId),
        where("locationId", "==", locationId)
      );
      const existing = await getDocs(q);

      if (!existing.empty) {
        const existingDoc = existing.docs[0];
        await updateDoc(doc(db, "prices", existingDoc.id), {
          amount,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, "prices"), {
          ingredientId,
          locationId,
          amount,
          updatedAt: serverTimestamp()
        });
      }

      showToast("Price recorded successfully!", "success");
      directPriceForm.reset();
      loadData();
    } catch (err) {
      console.error("Error recording price:", err);
      showToast("Failed to record price.", "error");
    }
  });
}

// Batch Brewing Logic
const batchAddForm = document.getElementById("batch-add-form");
if (batchAddForm) {
  batchAddForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const recipeId = document.getElementById("simulator-recipe-select").value;
    const qty = parseInt(document.getElementById("simulator-qty").value, 10);

    if (!recipeId || isNaN(qty) || qty < 1) return;

    const existing = batchQueue.find(item => item.recipeId === recipeId);
    if (existing) {
      existing.qty += qty;
    } else {
      batchQueue.push({ recipeId, qty });
    }

    renderBatchBrewing();
  });
}

function renderBatchBrewing() {
  const queueList = document.getElementById("batch-queue-list");
  const breakdownContainer = document.getElementById("detailed-breakdown-container");
  const totalCostEl = document.getElementById("total-batch-cost");

  if (!queueList || !breakdownContainer || !totalCostEl) return;

  if (batchQueue.length === 0) {
    queueList.innerHTML = `<p class="text-xs text-red-400/60 italic">No potions queued for brewing.</p>`;
    breakdownContainer.innerHTML = `<p class="text-xs text-red-400/60 italic">Select recipes to calculate sourcing routes.</p>`;
    totalCostEl.textContent = "Total Optimal: 0 Gold";
    return;
  }

  queueList.innerHTML = batchQueue.map(item => {
    const recipe = recipes.find(r => r.id === item.recipeId);
    return `<div class="bg-zinc-950 border border-red-950 px-3 py-1.5 rounded flex items-center gap-2 text-xs">
            <span class="text-red-200 font-semibold">${recipe ? recipe.name : "Unknown"}</span>
            <span class="text-red-400">x${item.qty}</span>
            <button onclick="removeFromBatch('${item.recipeId}')" class="text-red-500 hover:text-white font-bold ml-1">✕</button>
        </div>`;
  }).join("");

  const requiredIngredients = {};
  batchQueue.forEach(item => {
    const recipe = recipes.find(r => r.id === item.recipeId);
    if (recipe && recipe.ingredients) {
      recipe.ingredients.forEach(req => {
        requiredIngredients[req.ingredientId] = (requiredIngredients[req.ingredientId] || 0) + (req.amount * item.qty);
      });
    }
  });

  let overallTotal = 0;
  const breakdownItems = Object.entries(requiredIngredients).map(([ingId, neededQty]) => {
    const ing = ingredients.find(i => i.id === ingId);
    const ingPrices = prices.filter(p => p.ingredientId === ingId);

    let bestPrice = null;
    let bestLoc = null;

    ingPrices.forEach(p => {
      if (bestPrice === null || p.amount < bestPrice) {
        bestPrice = p.amount;
        bestLoc = locations.find(l => l.id === p.locationId);
      }
    });

    const subtotal = bestPrice !== null ? bestPrice * neededQty : 0;
    overallTotal += subtotal;

    const locText = bestLoc ? `${bestLoc.hold} (${bestLoc.town})` : "Unspecified";
    const priceText = bestPrice !== null ? `${bestPrice.toFixed(2)} Gold/ea` : "N/A";

    return `<div class="bg-zinc-950 border border-red-950 p-3 rounded text-xs space-y-1">
            <div class="flex justify-between font-semibold text-red-200">
                <span>${ing ? ing.name : "Unknown Ingredient"} x${neededQty}</span>
                <span>${subtotal > 0 ? `${subtotal.toFixed(2)} Gold` : "No Pricing"}</span>
            </div>
            <div class="flex justify-between text-[11px] text-red-400/80">
                <span>Optimal Source: ${locText}</span>
                <span>${priceText}</span>
            </div>
        </div>`;
  });

  breakdownContainer.innerHTML = breakdownItems.join("");
  totalCostEl.textContent = `Total Optimal: ${overallTotal.toFixed(2)} Gold`;
}

window.removeFromBatch = function (recipeId) {
  batchQueue = batchQueue.filter(item => item.recipeId !== recipeId);
  renderBatchBrewing();
};

// Search & Filter Listeners
catalogSearch?.addEventListener("input", renderCatalog);
catalogLocationFilter?.addEventListener("change", renderCatalog);

// Authentication UI Actions
btnOpenLogin?.addEventListener("click", () => loginModal?.classList.remove("hidden"));
btnCloseLogin?.addEventListener("click", () => loginModal?.classList.add("hidden"));

authForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginModal.classList.add("hidden");
    authForm.reset();
    showToast("Signed in successfully!", "success");
  } catch (err) {
    console.error("Login error:", err);
    showToast("Invalid credentials.", "error");
  }
});

btnSignout?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    showToast("Signed out successfully.", "info");
  } catch (err) {
    console.error("Signout error:", err);
  }
});

// Admin Modals
btnCloseAdmin?.addEventListener("click", () => adminModal?.classList.add("hidden"));

document.getElementById("btn-admin-locations")?.addEventListener("click", () => openAdminModal("locations"));
document.getElementById("btn-admin-ingredients")?.addEventListener("click", () => openAdminModal("ingredients"));
document.getElementById("btn-admin-recipes")?.addEventListener("click", () => openAdminModal("recipes"));

function openAdminModal(type) {
  if (!currentUser) return;
  adminModal.classList.remove("hidden");

  if (type === "locations") {
    adminModalTitle.textContent = "Manage Locations";
    renderAdminLocations();
  } else if (type === "ingredients") {
    adminModalTitle.textContent = "Manage Ingredients";
    renderAdminIngredients();
  } else if (type === "recipes") {
    adminModalTitle.textContent = "Manage Recipes";
    renderAdminRecipes();
  }
}

function renderAdminLocations() {
  adminModalContent.innerHTML = `
        <form id="admin-add-loc" class="flex gap-2">
            <input type="text" id="admin-hold" placeholder="Hold" required class="flex-1 bg-zinc-950 border border-red-950 rounded p-2 text-xs text-red-100">
            <input type="text" id="admin-town" placeholder="Town" required class="flex-1 bg-zinc-950 border border-red-950 rounded p-2 text-xs text-red-100">
            <button type="submit" class="bg-red-900 border border-red-700 px-3 py-1.5 rounded text-xs text-white">Add</button>
        </form>
        <div class="space-y-2 max-h-64 overflow-y-auto">
            ${locations.map(l => `
                <div class="flex justify-between items-center bg-zinc-950 p-2 rounded border border-red-950 text-xs">
                    <span>${l.hold} - ${l.town}</span>
                    <button onclick="deleteLocation('${l.id}')" class="text-red-500 font-bold">Delete</button>
                </div>
            `).join("")}
        </div>
    `;

  document.getElementById("admin-add-loc").addEventListener("submit", async (e) => {
    e.preventDefault();
    const hold = document.getElementById("admin-hold").value;
    const town = document.getElementById("admin-town").value;
    await addDoc(collection(db, "locations"), { hold, town });
    loadData();
    openAdminModal("locations");
  });
}

window.deleteLocation = async function (id) {
  await deleteDoc(doc(db, "locations", id));
  loadData();
  openAdminModal("locations");
};

function renderAdminIngredients() {
  adminModalContent.innerHTML = `
        <form id="admin-add-ing" class="flex gap-2">
            <input type="text" id="admin-ing-name" placeholder="Ingredient Name" required class="flex-1 bg-zinc-950 border border-red-950 rounded p-2 text-xs text-red-100">
            <button type="submit" class="bg-red-900 border border-red-700 px-3 py-1.5 rounded text-xs text-white">Add</button>
        </form>
        <div class="space-y-2 max-h-64 overflow-y-auto">
            ${ingredients.map(i => `
                <div class="flex justify-between items-center bg-zinc-950 p-2 rounded border border-red-950 text-xs">
                    <span>${i.name}</span>
                    <button onclick="deleteIngredient('${i.id}')" class="text-red-500 font-bold">Delete</button>
                </div>
            `).join("")}
        </div>
    `;

  document.getElementById("admin-add-ing").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("admin-ing-name").value;
    await addDoc(collection(db, "ingredients"), { name });
    loadData();
    openAdminModal("ingredients");
  });
}

window.deleteIngredient = async function (id) {
  await deleteDoc(doc(db, "ingredients", id));
  loadData();
  openAdminModal("ingredients");
};

function renderAdminRecipes() {
  adminModalContent.innerHTML = `
        <form id="admin-add-rec" class="space-y-2">
            <input type="text" id="admin-rec-name" placeholder="Potion Name" required class="w-full bg-zinc-950 border border-red-950 rounded p-2 text-xs text-red-100">
            <div id="recipe-ingredients-inputs" class="space-y-2">
                <div class="flex gap-2">
                    <select class="rec-ing-select flex-1 bg-zinc-950 border border-red-950 rounded p-2 text-xs text-red-100">
                        ${ingredients.map(i => `<option value="${i.id}">${i.name}</option>`).join("")}
                    </select>
                    <input type="number" min="1" value="1" class="rec-ing-qty w-16 bg-zinc-950 border border-red-950 rounded p-2 text-xs text-red-100">
                </div>
            </div>
            <button type="button" id="btn-add-ing-row" class="text-xs text-red-400 underline">+ Add Ingredient</button>
            <button type="submit" class="w-full bg-red-900 border border-red-700 py-2 rounded text-xs text-white">Save Recipe</button>
        </form>
        <div class="space-y-2 max-h-48 overflow-y-auto pt-2">
            ${recipes.map(r => `
                <div class="flex justify-between items-center bg-zinc-950 p-2 rounded border border-red-950 text-xs">
                    <span>${r.name}</span>
                    <button onclick="deleteRecipe('${r.id}')" class="text-red-500 font-bold">Delete</button>
                </div>
            `).join("")}
        </div>
    `;

  document.getElementById("btn-add-ing-row").addEventListener("click", () => {
    const container = document.getElementById("recipe-ingredients-inputs");
    const row = document.createElement("div");
    row.className = "flex gap-2";
    row.innerHTML = `
            <select class="rec-ing-select flex-1 bg-zinc-950 border border-red-950 rounded p-2 text-xs text-red-100">
                ${ingredients.map(i => `<option value="${i.id}">${i.name}</option>`).join("")}
            </select>
            <input type="number" min="1" value="1" class="rec-ing-qty w-16 bg-zinc-950 border border-red-950 rounded p-2 text-xs text-red-100">
        `;
    container.appendChild(row);
  });

  document.getElementById("admin-add-rec").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("admin-rec-name").value;
    const selects = document.querySelectorAll(".rec-ing-select");
    const qtys = document.querySelectorAll(".rec-ing-qty");

    const recipeIngredients = [];
    selects.forEach((select, idx) => {
      recipeIngredients.push({
        ingredientId: select.value,
        amount: parseInt(qtys[idx].value, 10) || 1
      });
    });

    await addDoc(collection(db, "recipes"), {
      name,
      ingredients: recipeIngredients
    });

    loadData();
    openAdminModal("recipes");
  });
}

window.deleteRecipe = async function (id) {
  await deleteDoc(doc(db, "recipes", id));
  loadData();
  openAdminModal("recipes");
};