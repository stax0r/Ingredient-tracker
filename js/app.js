import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const DISCORD_WEBHOOK_URL = "DISCORD_WEBHOOK_PLACEHOLDER";
const DEFAULT_BOT_NAME = "New Letter";

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
const db = getDatabase(app);

const state = {
    cachedRecipes: {},
    cachedIngredients: {},
    cachedLocations: {},
    cachedPrices: {},
    currentBatch: []
};

// Fixed Toast Implementation
function showToast(message, type = 'success') {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    const bgColors = {
        success: "toast-success",
        error: "toast-error",
        info: "toast-info"
    };

    toast.className = `toast-item ${bgColors[type] || bgColors.success}`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add("toast-show");
    });

    setTimeout(() => {
        toast.classList.remove("toast-show");
        toast.classList.add("toast-hide");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function populateDropdowns() {
    const ingSelects = [
        document.getElementById("price-ingredient-select"),
        document.getElementById("guest-ingredient-select")
    ];
    ingSelects.forEach(select => {
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="">Select Ingredient...</option>' +
            Object.entries(state.cachedIngredients)
                .map(([id, ing]) => `<option value="${id}">${ing.name}</option>`)
                .join("");
        select.value = currentVal;
    });

    const locSelects = [
        document.getElementById("price-location-select"),
        document.getElementById("guest-location-select"),
        document.getElementById("catalog-location-filter")
    ];
    locSelects.forEach(select => {
        if (!select) return;
        const currentVal = select.value;
        const isFilter = select.id === "catalog-location-filter";
        select.innerHTML = `<option value="">${isFilter ? 'Filter by Location (All)' : 'Select Location...'}</option>` +
            Object.entries(state.cachedLocations)
                .map(([id, loc]) => `<option value="${id}">${loc.hold} / ${loc.town}</option>`)
                .join("");
        select.value = currentVal;
    });

    const recipeSelect = document.getElementById("simulator-recipe-select");
    if (recipeSelect) {
        const currentVal = recipeSelect.value;
        recipeSelect.innerHTML = '<option value="">Select a Potion Recipe...</option>' +
            Object.entries(state.cachedRecipes)
                .map(([id, rec]) => `<option value="${id}">${rec.name}</option>`)
                .join("");
        recipeSelect.value = currentVal;
    }
}

function renderCatalog() {
    const container = document.getElementById("catalog-container");
    if (!container) return;

    const query = (document.getElementById("catalog-search")?.value || "").toLowerCase();
    const selectedLocFilter = document.getElementById("catalog-location-filter")?.value;

    const filteredIngredients = Object.entries(state.cachedIngredients).filter(([id, ing]) => {
        const matchesSearch = ing.name.toLowerCase().includes(query);
        if (!matchesSearch) return false;
        if (selectedLocFilter) {
            return Object.values(state.cachedPrices).some(p => p.ingredientId === id && p.locationId === selectedLocFilter);
        }
        return true;
    }).sort((a, b) => a[1].name.toLowerCase().localeCompare(b[1].name.toLowerCase()));

    if (filteredIngredients.length === 0) {
        container.innerHTML = '<p class="text-xs text-red-400 italic">No matching ingredients found.</p>';
        return;
    }

    container.innerHTML = filteredIngredients.map(([ingId, ing]) => {
        const offers = Object.values(state.cachedPrices)
            .filter(p => p.ingredientId === ingId && (!selectedLocFilter || p.locationId === selectedLocFilter))
            .sort((a, b) => a.price - b.price);

        const offersHtml = offers.length === 0
            ? '<p class="text-xs text-zinc-500 italic">No price records yet.</p>'
            : offers.map((offer, idx) => {
                const loc = state.cachedLocations[offer.locationId] || { hold: "Unknown", town: "Unknown" };

                // Format date as "Short Month Day" (e.g., "Oct 24")
                const updatedDate = offer.updatedAt
                    ? new Date(offer.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '';

                return `
                    <div class="flex justify-between items-center p-1.5 rounded text-xs ${idx === 0 ? 'bg-zinc-950 text-red-100 border border-red-900/80 font-medium' : 'bg-zinc-900/50 text-red-400'}">
                        <span>${loc.hold} / ${loc.town} ${idx === 0 ? '⭐' : ''}</span>
                        <div class="flex items-center gap-2">
                            ${updatedDate ? `<span class="text-[10px] text-zinc-500 font-normal">${updatedDate}</span>` : ''}
                            <span class="font-mono">${offer.price} Gold</span>
                        </div>
                    </div>`;
            }).join("");

        return `
        <div class="bg-zinc-950/60 border border-red-950 rounded-lg p-4 space-y-2 flex flex-col h-48">
        <div class="flex justify-between items-center border-b border-red-950 pb-1 flex-shrink-0">
            <h3 class="font-bold text-red-100 text-xs">${ing.name}</h3>
            ${ing.suggestedPrice !== undefined && ing.suggestedPrice !== null
                ? `<span class="text-[10px] text-zinc-400 font-mono bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded" title="Base Suggested Price">~${ing.suggestedPrice}g</span>`
                : ''}
        </div>
        <div class="space-y-1 overflow-y-auto pr-1 flex-1">${offersHtml}</div>
    </div>`;
    }).join("");
}

function runOptimization() {
    const totalDemands = {};
    state.currentBatch.forEach(item => {
        const rec = state.cachedRecipes[item.recipeId];
        if (!rec || !rec.ingredients) return;
        for (const [ingId, qty] of Object.entries(rec.ingredients)) {
            totalDemands[ingId] = (totalDemands[ingId] || 0) + (qty * item.count);
        }
    });

    const container = document.getElementById("detailed-breakdown-container");
    const totalCostDisplay = document.getElementById("total-batch-cost");

    if (!container) return;

    if (Object.keys(totalDemands).length === 0) {
        container.innerHTML = '<p class="text-xs text-red-400 italic">Add items to batch to view pricing breakdowns.</p>';
        if (totalCostDisplay) totalCostDisplay.textContent = "Total Optimal: 0 Gold";
        return;
    }

    let overallOptimalTotal = 0;
    let html = "";

    for (const [ingId, neededQty] of Object.entries(totalDemands)) {
        const ingMeta = state.cachedIngredients[ingId] || { name: "Unknown Ingredient" };
        const storeOffers = Object.values(state.cachedPrices)
            .filter(p => p.ingredientId === ingId)
            .sort((a, b) => a.price - b.price);

        if (storeOffers.length > 0) {
            const bestOffer = storeOffers[0];
            overallOptimalTotal += bestOffer.price * neededQty;
            const bestLoc = state.cachedLocations[bestOffer.locationId] || { hold: "Unknown", town: "Unknown" };

            html += `
        <div class="bg-zinc-950/40 border border-red-950 rounded-lg p-3">
            <div class="flex justify-between items-center mb-1">
                <span class="font-bold text-red-100 text-xs">${ingMeta.name}</span>
                <span class="text-xs bg-zinc-900 border border-red-950 px-2 py-0.5 rounded text-red-300">Needed: ${neededQty}</span>
            </div>
            <div class="text-xs text-red-400">
                Best Price: <span class="font-bold text-red-200 font-mono">${bestOffer.price} Gold</span> at ${bestLoc.hold} / ${bestLoc.town}
            </div>
        </div>`;
        } else {
            html += `
        <div class="bg-zinc-950/40 border border-red-950 rounded-lg p-3">
            <div class="flex justify-between items-center mb-1">
                <span class="font-bold text-red-100 text-xs">${ingMeta.name}</span>
                <span class="text-xs bg-zinc-900 border border-red-950 px-2 py-0.5 rounded text-red-300">Needed: ${neededQty}</span>
            </div>
            <div class="text-xs text-red-500 italic">No price records available</div>
        </div>`;
        }
    }

    container.innerHTML = html;
    if (totalCostDisplay) totalCostDisplay.textContent = `Total Optimal: ${overallOptimalTotal.toFixed(2)} Gold`;
}

function renderBatchQueue() {
    const container = document.getElementById("batch-queue-list");
    if (!container) return;

    if (state.currentBatch.length === 0) {
        container.innerHTML = '<p class="text-xs text-red-400 italic">No potions added to batch yet.</p>';
        return;
    }

    container.innerHTML = state.currentBatch.map((item, idx) => {
        const rec = state.cachedRecipes[item.recipeId] || { name: "Unknown" };
        return `
            <div class="flex items-center gap-2 bg-zinc-950 border border-red-950 px-3 py-1.5 rounded-full text-xs text-red-200">
                <span>${rec.name} <strong>x${item.count}</strong></span>
                <button data-remove-idx="${idx}" class="remove-batch-btn text-red-400 hover:text-white font-bold ml-1">×</button>
            </div>`;
    }).join("");

    container.querySelectorAll('.remove-batch-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-remove-idx'));
            state.currentBatch.splice(idx, 1);
            renderBatchQueue();
            runOptimization();
        });
    });
}

function updateGuestFormFields() {
    const type = document.getElementById("guest-contrib-type")?.value || "price";
    document.getElementById("guest-price-fields")?.classList.toggle("hidden", type !== "price");
    document.getElementById("guest-location-fields")?.classList.toggle("hidden", type !== "location");
    document.getElementById("guest-letter-fields")?.classList.toggle("hidden", type !== "letter");
}

function initApp() {
    const loginModal = document.getElementById("login-modal");
    const openLoginBtn = document.getElementById("btn-open-login");

    openLoginBtn?.addEventListener("click", () => loginModal?.classList.remove("hidden"));
    document.getElementById("btn-close-login")?.addEventListener("click", () => loginModal?.classList.add("hidden"));
    document.getElementById("btn-admin-suggested")?.addEventListener("click", () => openAdminModal("Suggested Price Management", "suggested"));
    onAuthStateChanged(auth, (user) => {
        const loggedInView = document.getElementById("logged-in-view");
        const adminToggles = document.getElementById("admin-toggles");
        const priceLoggerSection = document.getElementById("price-logger-section");
        const guestContribSection = document.getElementById("guest-contrib-section");

        const isLoggedIn = !!user;

        if (openLoginBtn) openLoginBtn.classList.toggle("hidden", isLoggedIn);
        if (loginModal && isLoggedIn) loginModal.classList.add("hidden");
        if (loggedInView) loggedInView.classList.toggle("hidden", !isLoggedIn);
        if (adminToggles) adminToggles.classList.toggle("hidden", !isLoggedIn);
        if (priceLoggerSection) priceLoggerSection.classList.toggle("hidden", !isLoggedIn);
        if (guestContribSection) guestContribSection.classList.toggle("hidden", isLoggedIn);

        if (isLoggedIn) {
            const userDisplay = document.getElementById("user-display");
            if (userDisplay) userDisplay.textContent = user.email;
        }
    });

    const adminModal = document.getElementById("admin-modal");
    const adminTitle = document.getElementById("admin-modal-title");
    const adminContent = document.getElementById("admin-modal-content");

    document.getElementById("btn-close-admin")?.addEventListener("click", () => {
        adminModal?.classList.add("hidden");
    });

    function openAdminModal(title, type) {
        if (!adminModal || !adminTitle || !adminContent) return;
        adminTitle.textContent = title;

        let fieldsHtml = "";
        if (type === "locations") {
            fieldsHtml = `
                <form id="admin-add-location-form" class="space-y-3 border-b border-red-950 pb-4">
                    <h3 class="text-xs font-bold text-red-200">Add New Location</h3>
                    <input type="text" id="admin-loc-hold" placeholder="Hold / Region" required class="w-full bg-zinc-950 border border-red-950 rounded px-3 py-2 text-xs text-red-100">
                    <input type="text" id="admin-loc-town" placeholder="Town / Settlement" required class="w-full bg-zinc-950 border border-red-950 rounded px-3 py-2 text-xs text-red-100">
                    <button type="submit" class="w-full bg-red-900 hover:bg-red-800 text-white p-2 rounded text-xs font-semibold transition">Save Location</button>
                </form>`;
        } else if (type === "ingredients") {
            fieldsHtml = `
                <form id="admin-add-ingredient-form" class="space-y-3 border-b border-red-950 pb-4">
                    <h3 class="text-xs font-bold text-red-200">Add New Ingredient</h3>
                    <input type="text" id="admin-ing-name" placeholder="Ingredient Name" required class="w-full bg-zinc-950 border border-red-950 rounded px-3 py-2 text-xs text-red-100">
                    <button type="submit" class="w-full bg-red-900 hover:bg-red-800 text-white p-2 rounded text-xs font-semibold transition">Save Ingredient</button>
                </form>`;
        } else if (type === "recipes") {
            fieldsHtml = `
    <form id="admin-add-recipe-form" class="space-y-3 border-b border-red-950 pb-4">
        <h3 class="text-xs font-bold text-red-200">Add New Potion Recipe</h3>
        <input type="text" id="admin-rec-name" placeholder="Potion Name" required class="w-full bg-zinc-950 border border-red-950 rounded px-3 py-2 text-xs text-red-100">

        <div class="space-y-2">
            <p class="text-xs text-red-300">Ingredients (up to 4):</p>
            ${[1, 2, 3, 4].map(i => `
                <div class="flex gap-2">
                    <select id="admin-rec-ing-${i}" class="w-2/3 bg-zinc-950 border border-red-950 rounded px-2 py-1.5 text-xs text-red-100">
                        <option value="">Select Ingredient ${i}...</option>
                        ${Object.entries(state.cachedIngredients).map(([id, ing]) => `<option value="${id}">${ing.name}</option>`).join('')}
                    </select>
                    <input type="number" id="admin-rec-qty-${i}" placeholder="Qty" min="1" value="1" class="w-1/3 bg-zinc-950 border border-red-950 rounded px-2 py-1.5 text-xs text-red-100">
                </div>
            `).join('')}
        </div>

        <button type="submit" class="w-full bg-red-900 hover:bg-red-800 text-white p-2 rounded text-xs font-semibold transition">Save Potion</button>
    </form>`;
        } else if (type === "suggested") {
            fieldsHtml = `
        <form id="admin-add-suggested-form" class="space-y-3 border-b border-red-950 pb-4">
            <h3 class="text-xs font-bold text-red-200">Set Ingredient Suggested Price</h3>
            <select id="admin-sug-ing" required class="w-full bg-zinc-950 border border-red-950 rounded px-3 py-2 text-xs text-red-100">
                <option value="">Select Ingredient...</option>
                ${Object.entries(state.cachedIngredients).map(([id, ing]) => `<option value="${id}">${ing.name}</option>`).join('')}
            </select>
            <input type="number" step="0.01" id="admin-sug-price" placeholder="Suggested Price (Gold)" required class="w-full bg-zinc-950 border border-red-950 rounded px-3 py-2 text-xs text-red-100">
            <button type="submit" class="w-full bg-red-900 hover:bg-red-800 text-white p-2 rounded text-xs font-semibold transition">Save Suggested Price</button>
        </form>`;
        }

        adminContent.innerHTML = fieldsHtml;
        adminModal.classList.remove("hidden");

        adminContent.querySelector("form")?.addEventListener("submit", (e) => {
            e.preventDefault();
            const id = Date.now().toString();
            let targetRef = "";
            let payload = {};

            if (type === "locations") {
                targetRef = `locations/${id}`;
                payload = { hold: document.getElementById("admin-loc-hold").value, town: document.getElementById("admin-loc-town").value };
            } else if (type === "ingredients") {
                targetRef = `ingredients/${id}`;
                payload = { name: document.getElementById("admin-ing-name").value };
            } else if (type === "recipes") {
                targetRef = `recipes/${id}`;
                const ingredients = {};
                for (let i = 1; i <= 4; i++) {
                    const ingId = document.getElementById(`admin-rec-ing-${i}`)?.value;
                    const qty = parseInt(document.getElementById(`admin-rec-qty-${i}`)?.value) || 1;
                    if (ingId) {
                        ingredients[ingId] = qty;
                    }
                }
                payload = { name: document.getElementById("admin-rec-name").value, ingredients };
            } else if (type === "suggested") {
                const ingId = document.getElementById("admin-sug-ing")?.value;
                const priceVal = parseFloat(document.getElementById("admin-sug-price")?.value);

                if (ingId) {
                    targetRef = `ingredients/${ingId}/suggestedPrice`;
                    payload = priceVal;
                }
            }

            set(ref(db, targetRef), payload)
                .then(() => {
                    showToast(`${title} item saved!`, "success");
                    adminModal.classList.add("hidden");
                })
                .catch(err => showToast("Error saving item: " + err.message, "error"));
        });
    }

    document.getElementById("btn-admin-locations")?.addEventListener("click", () => openAdminModal("Location Management", "locations"));
    document.getElementById("btn-admin-ingredients")?.addEventListener("click", () => openAdminModal("Ingredient Management", "ingredients"));
    document.getElementById("btn-admin-recipes")?.addEventListener("click", () => openAdminModal("Potion Management", "recipes"));

    document.getElementById("auth-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("auth-email").value;
        const password = document.getElementById("auth-password").value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
            showToast("Successfully signed in!", "success");
        } catch (err) {
            showToast("Login error: " + err.message, "error");
        }
    });

    document.getElementById("btn-signout")?.addEventListener("click", () => {
        signOut(auth);
        showToast("Signed out.", "info");
    });

    document.getElementById("guest-contrib-type")?.addEventListener("change", updateGuestFormFields);

    document.getElementById("guest-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const type = document.getElementById("guest-contrib-type").value;
        const author = document.getElementById("guest-author").value.trim() || "A Guild Member";
        let contentMessage = "";

        if (type === 'price') {
            const ingSelect = document.getElementById("guest-ingredient-select");
            const locSelect = document.getElementById("guest-location-select");
            const priceVal = document.getElementById("guest-price-amount").value;
            if (!ingSelect.value || !locSelect.value || !priceVal) return showToast("Fill all price fields.", "error");

            const ingText = ingSelect.options[ingSelect.selectedIndex].text;
            const locText = locSelect.options[locSelect.selectedIndex].text;
            contentMessage = `💰 **Price Update**\n• **By:** ${author}\n• **Ingredient:** ${ingText}\n• **Location:** ${locText}\n• **Price:** ${priceVal} Gold`;
        } else if (type === 'location') {
            const hold = document.getElementById("guest-loc-hold").value.trim();
            const town = document.getElementById("guest-loc-town").value.trim();
            if (!hold || !town) return showToast("Fill hold and town fields.", "error");
            contentMessage = `📍 **Location Request**\n• **By:** ${author}\n• **Location:** ${hold} / ${town}`;
        } else {
            const letter = document.getElementById("guest-letter-content").value.trim();
            if (!letter) return showToast("Write a missive first.", "error");
            contentMessage = `📜 **Sealed Letter**\n• **From:** ${author}\n\n"${letter}"`;
        }

        const isPlaceholder = !DISCORD_WEBHOOK_URL ||
            DISCORD_WEBHOOK_URL.trim() === "" ||
            DISCORD_WEBHOOK_URL.includes("DISCORD_WEBHOOK_PLACEHOLDER");

        if (isPlaceholder) {
            showToast("Missive recorded locally (Webhook URL omitted).", "info");
            document.getElementById("guest-form").reset();
            updateGuestFormFields();
            return;
        }

        try {
            const response = await fetch(DISCORD_WEBHOOK_URL.trim(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: DEFAULT_BOT_NAME,
                    content: contentMessage
                })
            });

            if (response.ok || response.status === 204) {
                showToast("Missive delivered successfully!", "success");
                document.getElementById("guest-form").reset();
                updateGuestFormFields();
            } else {
                const errData = await response.text();
                showToast(`Discord Error (${response.status}): ${errData}`, "error");
            }
        } catch (err) {
            showToast("Network Error: " + err.message, "error");
        }
    });

    document.getElementById("direct-price-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const ingredientId = document.getElementById("price-ingredient-select").value;
        const locationId = document.getElementById("price-location-select").value;
        const price = parseFloat(document.getElementById("price-amount").value);

        set(ref(db, `prices/${ingredientId}_${locationId}`), {
            ingredientId, locationId, price, updatedAt: new Date().toISOString()
        }).then(() => {
            showToast("Price recorded!", "success");
            e.target.reset();
        }).catch(err => showToast("Save failed: " + err.message, "error"));
    });

    document.getElementById("batch-add-form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const recipeId = document.getElementById("simulator-recipe-select").value;
        const count = parseInt(document.getElementById("simulator-qty").value) || 1;

        if (!recipeId) return;

        const existing = state.currentBatch.find(item => item.recipeId === recipeId);
        if (existing) {
            existing.count += count;
        } else {
            state.currentBatch.push({ recipeId, count });
        }
        renderBatchQueue();
        runOptimization();
    });

    document.getElementById("catalog-search")?.addEventListener("input", renderCatalog);
    document.getElementById("catalog-location-filter")?.addEventListener("change", renderCatalog);

    onValue(ref(db, 'locations'), (snapshot) => {
        state.cachedLocations = snapshot.val() || {};
        populateDropdowns();
        renderCatalog();
        runOptimization();
    });

    onValue(ref(db, 'ingredients'), (snapshot) => {
        state.cachedIngredients = snapshot.val() || {};
        populateDropdowns();
        renderCatalog();
        runOptimization();
    });

    onValue(ref(db, 'recipes'), (snapshot) => {
        state.cachedRecipes = snapshot.val() || {};
        populateDropdowns();
        renderCatalog();
        runOptimization();
    });

    onValue(ref(db, 'prices'), (snapshot) => {
        state.cachedPrices = snapshot.val() || {};
        renderCatalog();
        runOptimization();
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}