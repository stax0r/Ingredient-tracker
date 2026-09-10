import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db, state } from "./firebase-config.js";
import { initAuth } from "./auth.js";
import { initAdminGlobalHandlers } from "./admin.js";
import { renderCatalog } from "./catalog.js";
import { runOptimization, initBatchHandlers } from "./batch.js";

function populateDropdowns() {
    // Populate Ingredients Selects
    const ingSelects = [
        document.getElementById("price-ingredient-select"),
        document.getElementById("guest-ingredient-select")
    ];
    ingSelects.forEach(select => {
        if (!select) return;
        const val = select.value;
        select.innerHTML = '<option value="">Select Ingredient...</option>' +
            Object.entries(state.cachedIngredients)
                .map(([id, ing]) => `<option value="${id}">${ing.name}</option>`)
                .join("");
        select.value = val;
    });

    // Populate Location Selects
    const locSelects = [
        document.getElementById("price-location-select"),
        document.getElementById("guest-location-select"),
        document.getElementById("catalog-location-filter")
    ];
    locSelects.forEach(select => {
        if (!select) return;
        const val = select.value;
        const isFilter = select.id === "catalog-location-filter";
        select.innerHTML = `<option value="">${isFilter ? 'Filter by Location (All)' : 'Select Location...'}</option>` +
            Object.entries(state.cachedLocations)
                .map(([id, loc]) => `<option value="${id}">${loc.hold} / ${loc.town}</option>`)
                .join("");
        select.value = val;
    });

    // Populate Recipe Select
    const recipeSelect = document.getElementById("simulator-recipe-select");
    if (recipeSelect) {
        const val = recipeSelect.value;
        recipeSelect.innerHTML = '<option value="">Select a Potion Recipe...</option>' +
            Object.entries(state.cachedRecipes)
                .map(([id, rec]) => `<option value="${id}">${rec.name}</option>`)
                .join("");
        recipeSelect.value = val;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initAuth();
    initAdminGlobalHandlers();
    initBatchHandlers();

    document.getElementById("catalog-search")?.addEventListener("input", renderCatalog);
    document.getElementById("catalog-location-filter")?.addEventListener("change", renderCatalog);

    // Database Listeners
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
        runOptimization();
    });

    onValue(ref(db, 'prices'), (snapshot) => {
        state.cachedPrices = snapshot.val() || {};
        renderCatalog();
        runOptimization();
    });
});