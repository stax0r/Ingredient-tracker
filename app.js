import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDTQPUXzYr8UAawpvNce6wbXJC07-ZOmeo",
  authDomain: "alchemy-price-tracker.firebaseapp.com",
  databaseURL: "https://alchemy-price-tracker-default-rtdb.firebaseio.com",
  projectId: "alchemy-price-tracker",
  storageBucket: "alchemy-price-tracker.firebasestorage.app",
  messagingSenderId: "357962236614",
  appId: "1:357962236614:web:770c78966226a35f138dc7",
  measurementId: "G-J94V9BMR1Q"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let cachedRecipes = {};
let cachedIngredients = {};
let cachedLocations = {};
let cachedPrices = [];
let currentBatch = [];

// --- Email & Password Auth ---
window.handleLogin = async () => {
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;
    if (!email || !password) return alert("Please enter email and password.");

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Login failed:", error);
        alert("Authentication failed: " + error.message);
    }
};

window.handleSignOut = async () => {
    await signOut(auth);
};

onAuthStateChanged(auth, async (user) => {
    const loggedOutView = document.getElementById("logged-out-view");
    const loggedInView = document.getElementById("logged-in-view");
    const userDisplay = document.getElementById("user-display");
    const adminPanel = document.getElementById("admin-panel");

    if (user) {
        loggedOutView.classList.add("hidden");
        loggedInView.classList.remove("hidden");
        userDisplay.textContent = user.email;

        // Check if user has admin privileges from Firestore user profile document
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists() && userSnap.data().isAdmin === true) {
                adminPanel.classList.remove("hidden");
            } else {
                adminPanel.classList.add("hidden");
            }
        } catch (err) {
            console.error("Error checking admin status:", err);
            adminPanel.classList.add("hidden");
        }
    } else {
        loggedOutView.classList.remove("hidden");
        loggedInView.classList.add("hidden");
        adminPanel.classList.add("hidden");
    }
});

// --- Real-time Listeners ---
function initRealtimeListeners() {
    onSnapshot(collection(db, "locations"), (snapshot) => {
        cachedLocations = {};
        const locSelect = document.getElementById("price-location-select");
        if (locSelect) locSelect.innerHTML = '<option value="">Select Location...</option>';
        
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            cachedLocations[docSnap.id] = data;
            if (locSelect) {
                locSelect.innerHTML += `<option value="${docSnap.id}">${data.hold} > ${data.city} > ${data.storeName}</option>`;
            }
        });
        runOptimization();
    });

    onSnapshot(collection(db, "ingredients"), (snapshot) => {
        cachedIngredients = {};
        const ingSelect = document.getElementById("price-ingredient-select");
        if (ingSelect) ingSelect.innerHTML = '<option value="">Select Ingredient...</option>';

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            cachedIngredients[docSnap.id] = data;
            if (ingSelect) {
                ingSelect.innerHTML += `<option value="${docSnap.id}">${data.name} (${data.unit})</option>`;
            }
        });
        updateRecipeFormIngredientDropdowns();
        runOptimization();
    });

    onSnapshot(collection(db, "recipes"), (snapshot) => {
        cachedRecipes = {};
        const recipeSelect = document.getElementById("simulator-recipe-select");
        recipeSelect.innerHTML = '<option value="">Select a Potion Recipe...</option>';

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            cachedRecipes[docSnap.id] = data;
            recipeSelect.innerHTML += `<option value="${docSnap.id}">${data.name}</option>`;
        });
        runOptimization();
    });

    onSnapshot(collection(db, "ingredientPrices"), (snapshot) => {
        cachedPrices = [];
        snapshot.forEach((docSnap) => {
            cachedPrices.push({ id: docSnap.id, ...docSnap.data() });
        });
        runOptimization();
    });
}

// --- Admin Form Handlers ---
window.handleLocationSubmit = async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "locations"), {
            hold: document.getElementById("loc-hold").value.trim(),
            city: document.getElementById("loc-city").value.trim(),
            storeName: document.getElementById("loc-store").value.trim(),
            createdAt: new Date()
        });
        document.getElementById("location-form").reset();
        alert("Location added!");
    } catch (err) {
        alert("Error: " + err.message);
    }
};

window.handleIngredientSubmit = async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "ingredients"), {
            name: document.getElementById("ing-name").value.trim(),
            unit: document.getElementById("ing-unit").value.trim(),
            createdAt: new Date()
        });
        document.getElementById("ingredient-form").reset();
        alert("Ingredient added!");
    } catch (err) {
        alert("Error: " + err.message);
    }
};

window.addIngredientRowToRecipeForm = () => {
    const container = document.getElementById("recipe-ingredients-container");
    const rowId = "ing-row-" + Date.now();
    
    let optionsHtml = '<option value="">Select Ingredient...</option>';
    for (const [id, ing] of Object.entries(cachedIngredients)) {
        optionsHtml += `<option value="${id}">${ing.name}</option>`;
    }

    const div = document.createElement("div");
    div.id = rowId;
    div.className = "flex gap-2 items-center mt-1";
    div.innerHTML = `
        <select class="recipe-ing-select flex-1 bg-slate-900 border border-slate-700 rounded p-1 text-xs" required>${optionsHtml}</select>
        <input type="number" step="0.1" placeholder="Qty" class="recipe-ing-qty w-16 bg-slate-900 border border-slate-700 rounded p-1 text-xs" required>
        <button type="button" onclick="document.getElementById('${rowId}').remove()" class="text-rose-400 font-bold text-xs">X</button>
    `;
    container.appendChild(div);
};

function updateRecipeFormIngredientDropdowns() {
    // Keeps dynamic ingredient lists updated in recipe builder if needed
}

window.handleRecipeSubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById("recipe-name").value.trim();
    const rows = document.querySelectorAll("#recipe-ingredients-container > div");
    
    const ingredients = [];
    rows.forEach(row => {
        const ingId = row.querySelector(".recipe-ing-select").value;
        const qty = parseFloat(row.querySelector(".recipe-ing-qty").value);
        if (ingId && qty) {
            ingredients.push({ ingredientId: ingId, quantity: qty });
        }
    });

    if (ingredients.length === 0) return alert("Add at least one ingredient requirement for the recipe.");

    try {
        await addDoc(collection(db, "recipes"), { name, ingredients, createdAt: new Date() });
        document.getElementById("recipe-form").reset();
        document.getElementById("recipe-ingredients-container.innerHTML").innerHTML = '';
        alert("Recipe saved successfully!");
    } catch (err) {
        alert("Error saving recipe: " + err.message);
    }
};

window.handlePriceSubmit = async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "ingredientPrices"), {
            ingredientId: document.getElementById("price-ingredient-select").value,
            locationId: document.getElementById("price-location-select").value,
            price: parseFloat(document.getElementById("price-amount").value),
            updatedAt: new Date()
        });
        document.getElementById("price-form").reset();
        alert("Price recorded!");
    } catch (err) {
        alert("Error logging price: " + err.message);
    }
};

// --- Simulator Logic ---
window.addRecipeToBatch = () => {
    const recipeId = document.getElementById("simulator-recipe-select").value;
    const count = parseInt(document.getElementById("simulator-qty").value);
    if (!recipeId || !count) return;

    currentBatch.push({ recipeId, count });
    renderBatchQueue();
    runOptimization();
};

function renderBatchQueue() {
    const container = document.getElementById("batch-queue-list");
    if (currentBatch.length === 0) {
        container.innerHTML = '<p class="text-sm text-slate-500 italic">No potions added to batch yet.</p>';
        return;
    }

    container.innerHTML = currentBatch.map((item, idx) => {
        const recipe = cachedRecipes[item.recipeId] || { name: "Unknown Potion" };
        return `
            <div class="flex justify-between items-center bg-slate-800/80 px-3 py-2 rounded text-sm">
                <span>${recipe.name} $\times$ ${item.count}</span>
                <button onclick="removeBatchItem(${idx})" class="text-rose-400 hover:text-rose-300 text-xs font-bold">Remove</button>
            </div>
        `;
    }).join("");
}

window.removeBatchItem = (index) => {
    currentBatch.splice(index, 1);
    renderBatchQueue();
    runOptimization();
};

function runOptimization() {
    const totalDemands = {};
    currentBatch.forEach(item => {
        const recipe = cachedRecipes[item.recipeId];
        if (!recipe || !recipe.ingredients) return;

        recipe.ingredients.forEach(ing => {
            totalDemands[ing.ingredientId] = (totalDemands[ing.ingredientId] || 0) + (ing.quantity * item.count);
        });
    });

    const resultsBody = document.getElementById("optimization-results-body");
    const totalCostDisplay = document.getElementById("total-batch-cost");
    
    if (Object.keys(totalDemands).length === 0) {
        resultsBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500 italic">Configure batch to calculate optimal prices.</td></tr>`;
        totalCostDisplay.textContent = "Total: 0 Gold";
        return;
    }

    let overallTotal = 0;
    let htmlOutput = "";

    for (const [ingId, neededQty] of Object.entries(totalDemands)) {
        const ingredientMeta = cachedIngredients[ingId] || { name: "Unknown Ingredient" };
        const availableOffers = cachedPrices.filter(p => p.ingredientId === ingId);

        if (availableOffers.length === 0) {
            htmlOutput += `
                <tr>
                    <td class="p-2 font-medium">${ingredientMeta.name}</td>
                    <td class="p-2">${neededQty}</td>
                    <td colspan="2" class="p-2 text-amber-400 italic">No store pricing available</td>
                    <td class="p-2 text-right">0 Gold</td>
                </tr>
            `;
            continue;
        }

        availableOffers.sort((a, b) => a.price - b.price);
        const bestOffer = availableOffers[0];
        const locationMeta = cachedLocations[bestOffer.locationId] || { hold: "", city: "", storeName: "Unknown" };
        const subtotal = bestOffer.price * neededQty;
        overallTotal += subtotal;

        htmlOutput += `
            <tr>
                <td class="p-2 font-medium">${ingredientMeta.name}</td>
                <td class="p-2">${neededQty}</td>
                <td class="p-2 text-emerald-300">${locationMeta.storeName}</td>
                <td class="p-2 text-xs text-slate-400">${locationMeta.hold} / ${locationMeta.city}</td>
                <td class="p-2 text-right font-semibold">${subtotal.toFixed(2)} Gold</td>
            </tr>
        `;
    }

    resultsBody.innerHTML = htmlOutput;
    totalCostDisplay.textContent = `Total: ${overallTotal.toFixed(2)} Gold`;
}

initRealtimeListeners();
