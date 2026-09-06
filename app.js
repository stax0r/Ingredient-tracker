// Import Firebase SDKs from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, onSnapshot, query } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// TODO: Replace with your actual Firebase project configuration credentials
const firebaseConfig = {
  apiKey: "AIzaSyDTQPUXzYr8UAawpvNce6wbXJC07-ZOmeo",
  authDomain: "alchemy-price-tracker.firebaseapp.com",
  projectId: "alchemy-price-tracker",
  storageBucket: "alchemy-price-tracker.firebasestorage.app",
  messagingSenderId: "357962236614",
  appId: "1:357962236614:web:770c78966226a35f138dc7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Global Application State Maps
let cachedRecipes = {};
let cachedIngredients = {};
let cachedLocations = {};
let cachedPrices = [];
let currentBatch = []; // Array of { recipeId, count }

// --- Authentication UI Controls ---
window.toggleAuth = async () => {
    if (auth.currentUser) {
        await signOut(auth);
    } else {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Auth failed:", error);
        }
    }
};

onAuthStateChanged(auth, (user) => {
    const display = document.getElementById("user-display");
    const btn = document.getElementById("auth-btn");
    if (user) {
        display.textContent = user.displayName;
        btn.textContent = "Sign Out";
        btn.className = "bg-rose-600 hover:bg-rose-500 px-4 py-1.5 rounded text-sm font-semibold transition";
    } else {
        display.textContent = "Not signed in";
        btn.textContent = "Sign In";
        btn.className = "bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 rounded text-sm font-semibold transition";
    }
});

// --- Data Listeners & Real-time Sync ---
function initRealtimeListeners() {
    // Listen to Locations
    onSnapshot(collection(db, "locations"), (snapshot) => {
        cachedLocations = {};
        const locSelect = document.getElementById("price-location-select");
        locSelect.innerHTML = '<option value="">Select Location...</option>';
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            cachedLocations[doc.id] = data;
            locSelect.innerHTML += `<option value="${doc.id}">${data.hold} > ${data.city} > ${data.storeName}</option>`;
        });
        runOptimization();
    });

    // Listen to Ingredients
    onSnapshot(collection(db, "ingredients"), (snapshot) => {
        cachedIngredients = {};
        const ingSelect = document.getElementById("price-ingredient-select");
        ingSelect.innerHTML = '<option value="">Select Ingredient...</option>';

        snapshot.forEach((doc) => {
            const data = doc.data();
            cachedIngredients[doc.id] = data;
            ingSelect.innerHTML += `<option value="${doc.id}">${data.name}</option>`;
        });
        runOptimization();
    });

    // Listen to Recipes
    onSnapshot(collection(db, "recipes"), (snapshot) => {
        cachedRecipes = {};
        const recipeSelect = document.getElementById("simulator-recipe-select");
        recipeSelect.innerHTML = '<option value="">Select a Potion Recipe...</option>';

        snapshot.forEach((doc) => {
            const data = doc.data();
            cachedRecipes[doc.id] = data;
            recipeSelect.innerHTML += `<option value="${doc.id}">${data.name}</option>`;
        });
    });

    // Listen to Prices
    onSnapshot(collection(db, "ingredientPrices"), (snapshot) => {
        cachedPrices = [];
        snapshot.forEach((doc) => {
            cachedPrices.push({ id: doc.id, ...doc.data() });
        });
        runOptimization();
    });
}

// --- Admin Data Handlers ---
window.handleLocationSubmit = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return alert("You must be signed in to add locations.");
    
    try {
        await addDoc(collection(db, "locations"), {
            hold: document.getElementById("loc-hold").value.trim(),
            city: document.getElementById("loc-city").value.trim(),
            storeName: document.getElementById("loc-store").value.trim(),
            createdAt: new Date()
        });
        document.getElementById("location-form").reset();
        alert("Location added successfully!");
    } catch (err) {
        console.error(err);
        alert("Error saving location.");
    }
};

window.handlePriceSubmit = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return alert("You must be signed in to log prices.");

    try {
        await addDoc(collection(db, "ingredientPrices"), {
            ingredientId: document.getElementById("price-ingredient-select").value,
            locationId: document.getElementById("price-location-select").value,
            price: parseFloat(document.getElementById("price-amount").value),
            updatedAt: new Date()
        });
        document.getElementById("price-form").reset();
        alert("Price point logged successfully!");
    } catch (err) {
        console.error(err);
        alert("Error logging price.");
    }
};

// --- Batch Simulator Engine ---
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
    // 1. Aggregate Demands
    const totalDemands = {};
    currentBatch.forEach(item => {
        const recipe = cachedRecipes[item.recipeId];
        if (!recipe || !recipe.ingredients) return;

        recipe.ingredients.forEach(ing => {
            totalDemands[ing.ingredientId] = (totalDemands[ing.ingredientId] || 0) + (ing.quantity * item.count);
        });
    });

    // 2. Find Best Prices across cachedPrices
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
        
        // Filter prices matching this ingredient
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

        // Sort ascending by unit price
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

// Start listeners on boot
initRealtimeListeners();
